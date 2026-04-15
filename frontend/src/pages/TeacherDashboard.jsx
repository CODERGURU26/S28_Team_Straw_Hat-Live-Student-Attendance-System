import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSessions, getStudents, getStudentAttendanceStats, getEscalationAlerts } from '../api'
import toast from 'react-hot-toast'
import { AlertTriangle, Mail, MessageSquare, Phone, History, Info } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
  ReferenceLine
} from 'recharts'

function formatSessionDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function AttendanceOverTimeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const session = payload[0]?.payload
  if (!session) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">
        {session.fullDate} — {session.present} present out of {session.total}
      </p>
    </div>
  )
}

export default function TeacherDashboard() {
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [studentsRes, sessionsRes, statsRes, alertsRes] = await Promise.all([
          getStudents(),
          getSessions(),
          getStudentAttendanceStats(),
          getEscalationAlerts()
        ])
        setStudents(studentsRes.data)
        setSessions(sessionsRes.data)
        setStats(statsRes.data)
        setAlerts(alertsRes.data)
      } catch {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const lastSessionDate = useMemo(() => (sessions[0] ? new Date(sessions[0].timestamp).toLocaleString() : 'N/A'), [sessions])

  // --- CHART 1: Attendance Over Time ---
  const lineChartData = useMemo(() => {
    return sessions.slice(0, 10).reverse().map(s => ({
      date: formatSessionDate(s.date || s.timestamp),
      fullDate: new Date(s.date || s.timestamp).toLocaleDateString(),
      present: s.present_count,
      total: students.length,
    }))
  }, [sessions, students.length])

  // --- CHART 2: Per Student Attendance Rate ---
  const barChartData = useMemo(() => {
    return [...stats]
      .sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name))
      .map(s => ({
      name: s.name,
      percentage: s.percentage,
      present_count: s.present_count,
      total_sessions: s.total_sessions
    }))
  }, [stats])

  const getBarColor = (percentage) => {
    if (percentage >= 75) return '#22c55e'
    if (percentage >= 50) return '#f59e0b'
    return '#ef4444'
  }

  // --- CHART 3: Session Summary Stats ---
  const sessionSummary = useMemo(() => {
    if (sessions.length === 0) return null

    let bestSession = sessions[0]
    let worstSession = sessions[0]

    sessions.forEach(s => {
      if (s.present_count > bestSession.present_count) bestSession = s
      if (s.present_count < worstSession.present_count) worstSession = s
    })

    let mostAbsent = stats[0] || null
    stats.forEach(s => {
      if (!mostAbsent || (s.total_sessions - s.present_count) > (mostAbsent.total_sessions - mostAbsent.present_count)) {
        mostAbsent = s
      }
    })

    const totalPresent = stats.reduce((acc, curr) => acc + curr.present_count, 0)
    const expectedPresent = students.length * sessions.length
    const avgAttendance = expectedPresent > 0 ? ((totalPresent / expectedPresent) * 100).toFixed(1) : 0

    return {
      best: {
        date: new Date(bestSession.date || bestSession.timestamp).toLocaleDateString(),
        count: bestSession.present_count
      },
      worst: {
        date: new Date(worstSession.date || worstSession.timestamp).toLocaleDateString(),
        count: worstSession.present_count
      },
      absentStudent: {
        name: mostAbsent?.name || 'N/A',
        missed: mostAbsent ? (mostAbsent.total_sessions - mostAbsent.present_count) : 0
      },
      avgAttendance
    }
  }, [sessions, stats, students.length])


  if (loading) return <p>Loading dashboard...</p>

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <div className="mt-4 grid sm:grid-cols-3 gap-4">
          <StatCard title="Total Students" value={students.length} />
          <StatCard title="Sessions Taken" value={sessions.length} />
          <StatCard title="Last Session Date" value={lastSessionDate} />
        </div>
        <div className="flex gap-3 mt-4">
          <Link to="/take-attendance" className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 transition-colors text-white font-medium">Take Attendance</Link>
          <Link to="/register/student" className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 transition-colors text-white font-medium">Register Student</Link>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
           <AlertTriangle className="text-amber-500" size={24} /> 
           Student Absence Alerts & Escalations
        </h2>

        {alerts.length > 0 ? (
          <div className="grid gap-4 mb-8">
            {alerts.map((alert) => (
              <div key={alert.student_id} className={`bg-white border-l-4 rounded-xl shadow-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:shadow-md ${
                alert.color === 'red' ? 'border-red-500' :
                alert.color === 'orange' ? 'border-orange-500' :
                'border-yellow-400'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    alert.color === 'red' ? 'bg-red-50 text-red-600' :
                    alert.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                    'bg-yellow-50 text-yellow-600'
                  }`}>
                    {alert.level === 'Call Required' ? <Phone size={24} /> :
                     alert.level === 'SMS' ? <MessageSquare size={24} /> :
                     <Mail size={24} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{alert.name}</h4>
                    <p className="text-sm text-slate-500">Roll: {alert.roll_number} • Missed <span className="font-bold text-slate-700">{alert.streak} sessions</span> in a row</p>
                  </div>
                </div>

                <div className="flex flex-col md:items-end gap-2 w-full md:w-auto">
                   <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        alert.color === 'red' ? 'bg-red-100 text-red-700' :
                        alert.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {alert.action}
                      </span>
                   </div>
                   <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <History size={12} />
                      History: {alert.history.map(d => new Date(d).toLocaleDateString()).join(', ')}
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center mb-8">
             <p className="text-emerald-700 font-medium">Clear Skies! No students currently in the absence escalation loop.</p>
          </div>
        )}

        <h2 className="text-xl font-bold text-slate-800 mb-4">Attendance Analytics</h2>

        {sessionSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard 
              title="Best Attended Session" 
              value={`${sessionSummary.best.count} present`} 
              subtitle={sessionSummary.best.date} 
            />
            <StatCard 
              title="Worst Attended Session" 
              value={`${sessionSummary.worst.count} present`} 
              subtitle={sessionSummary.worst.date} 
            />
            <StatCard 
              title="Most Absent Student" 
              value={`${sessionSummary.absentStudent.missed} missed`} 
              subtitle={sessionSummary.absentStudent.name} 
            />
            <StatCard 
              title="Avg Attendance Rate" 
              value={`${sessionSummary.avgAttendance}%`} 
              subtitle="All time" 
            />
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-6">Attendance Over Time</h3>
            {sessions.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      domain={[0, students.length]}
                    />
                    <Tooltip
                      content={<AttendanceOverTimeTooltip />}
                    />
                    <ReferenceLine 
                      y={students.length} 
                      label={{ position: 'top', value: 'Full class', fill: '#94a3b8', fontSize: 12 }} 
                      stroke="#94a3b8" 
                      strokeDasharray="4 4" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="present" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      activeDot={{ r: 6, fill: '#1d4ed8' }}
                      dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-500 text-sm py-10 text-center">Not enough data to display.</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-6">Per Student Attendance Rate</h3>
            {stats.length > 0 ? (
              <div className={stats.length > 10 ? 'max-h-[480px] overflow-y-auto pr-2' : ''}>
                <div className="w-full" style={{ height: `${Math.max(320, stats.length * 44)}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={barChartData} 
                      layout="vertical" 
                      margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                      barCategoryGap={10}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis 
                        type="number" 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                        width={120}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value, name, props) => {
                          return [`${value}% (${props.payload.present_count}/${props.payload.total_sessions} sessions)`, 'Attendance']
                        }}
                      />
                      <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
                        ))}
                        <LabelList dataKey="percentage" position="right" formatter={(val) => `${val}%`} fill="#64748b" fontSize={12} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm py-10 text-center">No student data available yet.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
    </div>
  )
}
