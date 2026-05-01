import { useState } from 'react'
import { Plus, Trash2, Mail, Users, Pencil, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateStudentPartial } from '../api'

const API_BASE = import.meta.env.VITE_API_URL

export default function StudentCard({ student, onDelete, onAddPhotos, onParentEmailUpdated }) {
  const photoCount = student.photo_count || 1
  const badgeClass =
    photoCount >= 3
      ? 'bg-green-100 text-green-700'
      : 'bg-amber-100 text-amber-700'

  const [editingParent, setEditingParent] = useState(false)
  const [parentEmailDraft, setParentEmailDraft] = useState(student.parent_email || '')
  const [saving, setSaving] = useState(false)

  const handleSaveParentEmail = async () => {
    try {
      setSaving(true)
      await updateStudentPartial(student.id, { parent_email: parentEmailDraft.trim() })
      toast.success('Parent email updated')
      setEditingParent(false)
      onParentEmailUpdated?.(student.id, parentEmailDraft.trim())
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update parent email')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelParentEdit = () => {
    setParentEmailDraft(student.parent_email || '')
    setEditingParent(false)
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 border border-slate-200 flex flex-col">
      <div className="relative">
        <img
          src={
            student.photo_path?.startsWith('http')
              ? student.photo_path
              : `${API_BASE}/static/${student.photo_path}`
          }
          alt={student.name}
          className="h-44 w-full object-cover rounded-lg"
        />
        <span
          className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
        >
          {photoCount} photo{photoCount > 1 ? 's' : ''}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold">{student.name}</h3>
      <p className="text-slate-500 text-sm">Roll: {student.roll_number}</p>

      {/* Email info section */}
      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
        {/* Student email — read-only */}
        <div className="flex items-center gap-2 text-sm">
          <Mail size={14} className="text-slate-400 flex-shrink-0" />
          <span className="text-slate-600 truncate" title={student.email}>
            {student.email || '—'}
          </span>
        </div>

        {/* Parent email — editable */}
        <div className="flex items-start gap-2 text-sm">
          <Users size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
          {editingParent ? (
            <div className="flex-1 space-y-1">
              <input
                type="email"
                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-400"
                placeholder="parent@example.com"
                value={parentEmailDraft}
                onChange={(e) => setParentEmailDraft(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveParentEmail}
                  disabled={saving}
                  className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-60"
                >
                  <Check size={12} /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={handleCancelParentEdit}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs hover:bg-slate-300"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-slate-500 truncate italic text-xs" title={student.parent_email || ''}>
                {student.parent_email ? student.parent_email : 'No parent email'}
              </span>
              <button
                onClick={() => { setParentEmailDraft(student.parent_email || ''); setEditingParent(true) }}
                className="flex-shrink-0 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Edit parent email"
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 mt-auto">
        <button
          onClick={() => onAddPhotos(student)}
          className="flex items-center justify-center gap-2 bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 text-sm"
        >
          <Plus size={16} /> Add Photos
        </button>
        <button
          onClick={() => onDelete(student)}
          className="flex items-center justify-center gap-2 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 text-sm"
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>
    </div>
  )
}
