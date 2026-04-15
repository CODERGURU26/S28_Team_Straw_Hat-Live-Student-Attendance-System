import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getSessions, getSchedules } from '../api'
import toast from 'react-hot-toast'
import { Calendar, Users, Eye } from 'lucide-react'

export default function Reports() {
  const [sessions, setSessions] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [sessRes, schedRes] = await Promise.all([
          getSessions(),
          getSchedules()
        ])
        setSessions(sessRes.data)
        setSchedules(schedRes.data)
      } catch {
        toast.error('Failed to load reports')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getScheduleName = (scheduleId) => {
    if (!scheduleId) return 'Manual Log'
    const s = schedules.find(x => x.id === scheduleId)
    return s ? `${s.subject} (${s.type})` : 'Unknown Schedule'
  }

  if (loading) return <p>Loading reports...</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Attendance Reports</h1>
        <p className="text-slate-500 text-sm mt-1">View the history of all attendance sessions.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center">
          <p className="text-slate-500">No attendance records found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Class / Schedule</th>
                  <th className="px-6 py-4">Present</th>
                  <th className="px-6 py-4">Absent</th>
                  <th className="px-6 py-4">Unknown</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <tr key={session.session_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {new Date(session.timestamp).toLocaleString(undefined, {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {getScheduleName(session.schedule_id)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {session.present_count}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {session.absent_count}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {session.unknown_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/results/${session.session_id}`}
                        className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        <Eye size={16} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
