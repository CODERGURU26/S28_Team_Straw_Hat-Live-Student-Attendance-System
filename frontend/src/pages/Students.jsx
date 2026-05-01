import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { Upload, Download, X, CheckCircle2, AlertCircle } from 'lucide-react'
import api, { deleteStudent, getStudents, validateStudentPhoto, bulkUpdateParentEmails } from '../api'
import StudentCard from '../components/StudentCard'

const MAX_PHOTOS = 5

export default function Students() {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Photo modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [slots, setSlots] = useState(Array.from({ length: MAX_PHOTOS }, () => ({ file: null, preview: '', status: 'idle' })))
  const [saving, setSaving] = useState(false)

  // Bulk import modal state
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRows, setBulkRows] = useState([])   // parsed rows from XLSX
  const [bulkConfirming, setBulkConfirming] = useState(false)

  const loadStudents = async () => {
    try {
      const res = await getStudents()
      setStudents(res.data)
    } catch {
      toast.error('Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  const filtered = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [students, search],
  )

  const onDelete = async (student) => {
    if (!window.confirm(`Delete ${student.name}?`)) return
    try {
      await deleteStudent(student.id)
      toast.success('Student deleted')
      loadStudents()
    } catch {
      toast.error('Delete failed')
    }
  }

  const onAddPhotos = (student) => {
    setSelectedStudent(student)
    const existing = student.registration_photos || []
    const initialSlots = Array.from({ length: MAX_PHOTOS }, (_, i) => {
      if (i < existing.length) {
        return { file: 'existing', preview: existing[i], status: 'valid' }
      }
      return { file: null, preview: '', status: 'idle' }
    })
    setSlots(initialSlots)
    setModalOpen(true)
  }

  const onParentEmailUpdated = (studentId, newEmail) => {
    setStudents((prev) =>
      prev.map((s) => s.id === studentId ? { ...s, parent_email: newEmail } : s)
    )
  }

  const assignPhoto = async (index, file) => {
    if (!file) return
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, file, preview: URL.createObjectURL(file), status: 'validating' } : s)))
    const formData = new FormData()
    formData.append('photo', file)
    try {
      await validateStudentPhoto(formData)
      setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, status: 'valid' } : s)))
    } catch {
      setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, status: 'invalid' } : s)))
    }
  }

  const submitAdditionalPhotos = async () => {
    const files = slots.filter((s) => s.file && s.file !== 'existing').map((s) => s.file)
    if (!selectedStudent) return
    if (files.length === 0) return toast.error('Select at least one new photo')

    const formData = new FormData()
    files.forEach((f) => formData.append('photos[]', f))

    try {
      setSaving(true)
      const res = await api.post(`/api/students/${selectedStudent.id}/add-photos`, formData)
      toast.success(`Updated to ${res.data.photo_count} photos`)
      setModalOpen(false)
      loadStudents()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add photos')
    } finally {
      setSaving(false)
    }
  }

  // ─── Bulk import ────────────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const data = students.map((s) => ({
      'Roll Number': s.roll_number,
      'Student Name': s.name,
      'Parent Email': s.parent_email || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Parent Emails')
    XLSX.writeFile(wb, 'parent_emails_template.xlsx')
  }

  const handleBulkUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)

        const rollSet = new Set(students.map((s) => String(s.roll_number).trim()))

        const parsed = rows.map((row) => {
          const rn = String(row['Roll Number'] || '').trim()
          const name = row['Student Name'] || ''
          const pe = String(row['Parent Email'] || '').trim()
          const found = rollSet.has(rn)
          return {
            roll_number: rn,
            name,
            parent_email: pe,
            status: found ? 'will_update' : 'not_found',
          }
        }).filter((r) => r.roll_number)

        setBulkRows(parsed)
      } catch {
        toast.error('Failed to parse Excel file')
      }
    }
    reader.readAsBinaryString(file)
    // Reset file input so same file can be re-uploaded
    e.target.value = ''
  }

  const confirmBulkUpdate = async () => {
    const toUpdate = bulkRows
      .filter((r) => r.status === 'will_update' && r.parent_email)
      .map((r) => ({ roll_number: r.roll_number, parent_email: r.parent_email }))

    if (toUpdate.length === 0) {
      toast.error('No valid rows to update')
      return
    }

    try {
      setBulkConfirming(true)
      const res = await bulkUpdateParentEmails(toUpdate)
      toast.success(`Updated ${res.data.updated} parent emails successfully`)
      setBulkOpen(false)
      setBulkRows([])
      loadStudents()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk update failed')
    } finally {
      setBulkConfirming(false)
    }
  }

  if (loading) return <p>Loading students...</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <button
          onClick={() => { setBulkRows([]); setBulkOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Upload size={16} /> Import Parent Emails
        </button>
      </div>

      <input className="w-full md:w-96 p-3 rounded-lg border" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((student) => (
          <StudentCard
            key={student.id}
            student={student}
            onDelete={onDelete}
            onAddPhotos={onAddPhotos}
            onParentEmailUpdated={onParentEmailUpdated}
          />
        ))}
      </div>

      {/* ─── Photo modal ─────────────────────────────────────────────────── */}
      {modalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-20">
          <div className="bg-white rounded-xl p-4 w-full max-w-2xl space-y-3">
            <h2 className="text-lg font-semibold">Add More Photos — {selectedStudent.name}</h2>
            <p className="text-sm text-amber-600">Add photos from different angles for better accuracy.</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {slots.map((slot, index) => (
                <label key={index} className={`h-28 rounded border bg-slate-50 overflow-hidden text-xs flex items-center justify-center relative ${slot.file === 'existing' ? '' : 'cursor-pointer hover:bg-slate-100'}`}>
                  {slot.preview ? (
                    <>
                      <img src={slot.preview} alt="preview" className="h-full w-full object-cover" />
                      {slot.file === 'existing' && (
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white px-1.5 py-0.5 text-[10px] rounded backdrop-blur-sm">Existing</span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500">Upload {index + 1}</span>
                  )}
                  {slot.file !== 'existing' && (
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => assignPhoto(index, e.target.files?.[0])} />
                  )}
                </label>
              ))}
            </div>
            <div className="text-xs text-slate-600">
              {slots.filter((s) => s.status === 'valid').length} valid / {slots.filter((s) => s.status === 'invalid').length} invalid
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="px-3 py-2 rounded bg-slate-200">Cancel</button>
              <button onClick={submitAdditionalPhotos} disabled={saving} className="px-3 py-2 rounded bg-green-500 text-white disabled:opacity-60">
                {saving ? 'Saving...' : 'Add Photos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bulk import modal ───────────────────────────────────────────── */}
      {bulkOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-30">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Import Parent Emails</h2>
              <button onClick={() => { setBulkOpen(false); setBulkRows([]) }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step 1: download template */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-2">Step 1 — Download the template</p>
                <p className="text-xs text-slate-500 mb-3">
                  Pre-filled with all students' roll numbers and names. Fill in the Parent Email column and re-upload.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download size={15} /> Download Template (.xlsx)
                </button>
              </div>

              {/* Step 2: upload */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-2">Step 2 — Upload filled file</p>
                <label className="flex items-center gap-3 cursor-pointer px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                  <Upload size={18} className="text-indigo-500" />
                  <span className="text-sm text-slate-600">Click to choose your filled Excel file</span>
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkUpload} />
                </label>
              </div>

              {/* Preview table */}
              {bulkRows.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Preview ({bulkRows.length} rows)</p>
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Roll No</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Parent Email</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkRows.map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-mono text-xs">{row.roll_number}</td>
                            <td className="px-3 py-2 text-slate-700">{row.name}</td>
                            <td className="px-3 py-2 text-slate-600">{row.parent_email || '—'}</td>
                            <td className="px-3 py-2">
                              {row.status === 'will_update' ? (
                                <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                  <CheckCircle2 size={12} /> Will update
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                                  <AlertCircle size={12} /> Roll number not found
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => { setBulkOpen(false); setBulkRows([]) }}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300"
              >
                Cancel
              </button>
              {bulkRows.length > 0 && (
                <button
                  onClick={confirmBulkUpdate}
                  disabled={bulkConfirming || !bulkRows.some(r => r.status === 'will_update' && r.parent_email)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                >
                  {bulkConfirming ? 'Updating…' : `Confirm Update (${bulkRows.filter(r => r.status === 'will_update' && r.parent_email).length} rows)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
