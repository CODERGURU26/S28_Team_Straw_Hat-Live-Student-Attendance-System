import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import AttendanceBadge from '../components/AttendanceBadge'
import { exportSessionCsvUrl, getSession, getSchedules, updateAttendanceStatus } from '../api'

export default function Results() {
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [sessionRes, scheduleRes] = await Promise.all([
        getSession(sessionId),
        getSchedules()
      ])
      setSession(sessionRes.data)
      setSchedules(scheduleRes.data)
    } catch {
      toast.error('Could not load session')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [sessionId])

  const summary = useMemo(() => {
    if (!session) return { present: 0, unknown: 0, absent: 0 }
    return {
      present: session.results.filter((r) => r.status === 'present').length,
      unknown: session.results.filter((r) => r.status === 'unknown').length,
      absent: session.absent_students.length,
    }
  }, [session])

  const scheduleName = useMemo(() => {
    if (!session || !session.schedule_id) return 'No schedule linked'
    const s = schedules.find(x => x.id === session.schedule_id)
    return s ? `${s.subject} (${s.type})` : 'Unknown Schedule'
  }, [session, schedules])

  const toggleStatus = async (student, currentStatus) => {
    const newStatus = currentStatus === 'present' ? 'absent' : 'present'
    try {
      await updateAttendanceStatus(session.session_id, {
        student_id: student.student_id,
        status: newStatus,
        name: student.name,
        roll_number: student.roll_number
      })
      toast.success('Status updated')
      loadData()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  if (loading) return <p>Loading results...</p>
  if (!session) return <p>No session found.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Attendance Results</h1>
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-lg border">
        <div>
          <p className="text-sm font-semibold text-slate-500">Session ID</p>
          <p className="text-sm font-mono">{session.session_id}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">Schedule</p>
          <p className="text-sm">{scheduleName}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">Summary</p>
          <p className="text-sm text-slate-700">
            <span className="text-green-600 font-bold">{summary.present}</span> Present | <span className="text-amber-500 font-bold">{summary.unknown}</span> Unknown | <span className="text-red-500 font-bold">{summary.absent}</span> Absent
          </p>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <img src={`http://localhost:5000${session.annotated_image_url}`} alt="annotated" className="rounded-lg border bg-white" />
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {session.results.map((row, idx) => (
                <tr className="border-t" key={idx}>
                  <td className="p-2">
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.roll_number}</p>
                  </td>
                  <td className="p-2"><AttendanceBadge status={row.status} /></td>
                  <td className="p-2 text-right">
                    {row.status === 'present' && (
                      <button onClick={() => toggleStatus(row, 'present')} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
                        Mark Absent
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {session.absent_students.map((s) => (
                <tr className="border-t" key={s.student_id}>
                  <td className="p-2">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.roll_number}</p>
                  </td>
                  <td className="p-2"><AttendanceBadge status="absent" /></td>
                  <td className="p-2 text-right">
                    <button onClick={() => toggleStatus(s, 'absent')} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                      Mark Present
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <a href={exportSessionCsvUrl(sessionId)} className="px-4 py-2 rounded-lg bg-slate-900 text-white">Export CSV</a>
        <Link to="/take-attendance" className="px-4 py-2 rounded-lg bg-green-500 text-white">Take New Attendance</Link>
      </div>
    </div>
  )
}
