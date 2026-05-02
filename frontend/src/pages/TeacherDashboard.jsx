import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSessions, getStudents, getStudentAttendanceStats, getEscalationAlerts, getLeaderboard, getMonthlyLeaderboard } from '../api'
import toast from 'react-hot-toast'
import { AlertTriangle, Mail, MessageSquare, Phone, History, Users, CalendarDays, Clock, TrendingUp, TrendingDown, ArrowRight, Activity, Camera, Star, Award } from 'lucide-react'
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
const teacher = (() => {
  try { return JSON.parse(localStorage.getItem('teacher') || '{}') } catch { return {} }
})()
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
    <div className="rounded-xl border border-slate-100 bg-white/90 backdrop-blur-md px-4 py-3 shadow-xl">
      <p className="text-sm font-bold text-slate-800 mb-1">{session.fullDate}</p>
      <p className="text-sm text-indigo-600 font-semibold">
        {session.present} present <span className="text-slate-400 font-normal">out of {session.total}</span>
      </p>
    </div>
  )
}

export default function TeacherDashboard() {
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState([])
  const [alerts, setAlerts] = useState([])
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([])
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [studentsRes, sessionsRes, statsRes, alertsRes, weeklyRes, monthlyRes] = await Promise.all([
          getStudents(),
          getSessions(),
          getStudentAttendanceStats(),
          getEscalationAlerts(),
          getLeaderboard(),
          getMonthlyLeaderboard()
        ])
        setStudents(studentsRes.data)
        setSessions(sessionsRes.data)
        setStats(statsRes.data)
        setAlerts(alertsRes.data)
        setWeeklyLeaderboard(weeklyRes.data)
        setMonthlyLeaderboard(monthlyRes.data)
      } catch (err) {
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
    if (percentage >= 75) return '#10b981' // emerald-500
    if (percentage >= 50) return '#f59e0b' // amber-500
    return '#f43f5e' // rose-500
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


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto animate-fade-in">

      {/* Header Section */}
      <div className="relative bg-white rounded-3xl p-8 shadow-sm overflow-hidden border border-slate-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back ,<b> {teacher.name || 'Faculty'}</b></h1>
            <p className="text-slate-500 mt-2">Here is what's happening with your class</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/take-attendance" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 text-white font-semibold active:scale-95">
              <Camera size={18} />
              Take Attendance
            </Link>
            <Link to="/register/student" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 text-white font-semibold active:scale-95">
              Register Student
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Enrolled"
            value={students.length}
            icon={<Users size={20} className="text-blue-500" />}
            bgColor="bg-blue-50"
          />
          <StatCard
            title="Sessions Taken"
            value={sessions.length}
            icon={<CalendarDays size={20} className="text-purple-500" />}
            bgColor="bg-purple-50"
          />
          <StatCard
            title="Last Session"
            value={lastSessionDate.split(',')[0]}
            subtitle={lastSessionDate.split(',')[1]}
            icon={<Clock size={20} className="text-emerald-500" />}
            bgColor="bg-emerald-50"
          />
        </div>
      </div>

      {/* Escalations Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="bg-rose-100 p-2 rounded-xl">
              <AlertTriangle className="text-rose-600" size={24} />
            </div>
            Attention Required
          </h2>
        </div>

        {alerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {alerts.map((alert) => (
              <div key={alert.student_id} className={`bg-white rounded-3xl p-6 shadow-sm border transition-all hover:shadow-lg relative overflow-hidden group ${alert.color === 'red' ? 'border-rose-200' :
                alert.color === 'orange' ? 'border-amber-200' :
                  'border-yellow-200'
                }`}>
                <div className={`absolute top-0 left-0 w-full h-1 ${alert.color === 'red' ? 'bg-rose-500' :
                  alert.color === 'orange' ? 'bg-amber-500' :
                    'bg-yellow-400'
                  }`}></div>

                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${alert.color === 'red' ? 'bg-rose-50 text-rose-600' :
                    alert.color === 'orange' ? 'bg-amber-50 text-amber-600' :
                      'bg-yellow-50 text-yellow-600'
                    }`}>
                    {alert.level === 'Call Required' ? <Phone size={24} /> :
                      alert.level === 'SMS' ? <MessageSquare size={24} /> :
                        <Mail size={24} />}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${alert.color === 'red' ? 'bg-rose-100 text-rose-700' :
                    alert.color === 'orange' ? 'bg-amber-100 text-amber-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                    {alert.action}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xl mb-1">{alert.name}</h4>
                  <p className="text-slate-500 text-sm mb-4">Roll: {alert.roll_number}</p>

                  <div className="bg-slate-50 rounded-xl p-3 mb-4">
                    <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <TrendingDown size={16} className="text-rose-500" />
                      Missed <span className="text-rose-600 font-bold">{alert.streak} sessions</span> in a row
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <History size={14} />
                    <span className="truncate" title={alert.history.map(d => new Date(d).toLocaleDateString()).join(', ')}>
                      Last absent: {new Date(alert.history[0]).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <div className="bg-emerald-100 p-4 rounded-full mb-4">
              <Activity className="text-emerald-600" size={32} />
            </div>
            <h3 className="text-emerald-800 font-bold text-lg mb-1">Clear Skies!</h3>
            <p className="text-emerald-600 font-medium">No students currently in the absence escalation loop.</p>
          </div>
        )}
      </div>

      {/* Analytics Overview */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Analytics Overview</h2>

        {sessionSummary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <AnalyticBadge
              title="Best Attended"
              value={`${sessionSummary.best.count}`}
              subtitle={sessionSummary.best.date}
              trend="up"
            />
            <AnalyticBadge
              title="Worst Attended"
              value={`${sessionSummary.worst.count}`}
              subtitle={sessionSummary.worst.date}
              trend="down"
            />
            <AnalyticBadge
              title="Most Absent"
              value={`${sessionSummary.absentStudent.missed}`}
              subtitle={sessionSummary.absentStudent.name}
              trend="down"
            />
            <AnalyticBadge
              title="Avg Attendance"
              value={`${sessionSummary.avgAttendance}%`}
              subtitle="All time"
              trend="neutral"
            />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Attendance Over Time</h3>
                <p className="text-sm text-slate-500 mt-1">Last 10 sessions</p>
              </div>
              <div className="bg-indigo-50 p-2 rounded-lg">
                <TrendingUp className="text-indigo-600" size={20} />
              </div>
            </div>
            {sessions.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      domain={[0, students.length]}
                    />
                    <Tooltip content={<AttendanceOverTimeTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4' }} />
                    <ReferenceLine
                      y={students.length}
                      stroke="#cbd5e1"
                      strokeDasharray="4 4"
                    />
                    <Line
                      type="monotone"
                      dataKey="present"
                      stroke="#4f46e5"
                      strokeWidth={4}
                      activeDot={{ r: 8, fill: '#4f46e5', stroke: '#fff', strokeWidth: 3 }}
                      dot={{ r: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-400 font-medium">Not enough data to display.</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Per Student Rate</h3>
                <p className="text-sm text-slate-500 mt-1">Individual performance</p>
              </div>
              <div className="bg-blue-50 p-2 rounded-lg">
                <Users className="text-blue-600" size={20} />
              </div>
            </div>
            {stats.length > 0 ? (
              <div className={stats.length > 8 ? 'max-h-[300px] overflow-y-auto pr-4 custom-scrollbar' : ''}>
                <div className="w-full" style={{ height: `${Math.max(280, stats.length * 48)}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barChartData}
                      layout="vertical"
                      margin={{ top: 0, right: 40, left: 20, bottom: 0 }}
                      barSize={20}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }}
                        width={130}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value, name, props) => {
                          return [`${value}% (${props.payload.present_count}/${props.payload.total_sessions} sessions)`, 'Attendance']
                        }}
                      />
                      <Bar dataKey="percentage" radius={[0, 10, 10, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
                        ))}
                        <LabelList dataKey="percentage" position="right" formatter={(val) => `${val}%`} fill="#64748b" fontSize={12} fontWeight={600} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-400 font-medium">No student data available yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Performers Section */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Weekly Leaderboard */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-100 p-3 rounded-2xl">
              <Star className="text-amber-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Weekly Top Performers</h2>
              <p className="text-slate-500 text-sm">Best attendance this week</p>
            </div>
          </div>
          <div className="space-y-3">
            {weeklyLeaderboard.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4 italic">No rankings available yet this week.</p>
            ) : (
              weeklyLeaderboard.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-bold ${
                      idx === 0 ? "bg-amber-100 text-amber-700" :
                      idx === 1 ? "bg-slate-200 text-slate-700" :
                      idx === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-base font-semibold text-slate-800">{entry.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{entry.percentage}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Monthly Leaderboard */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 p-3 rounded-2xl">
              <Award className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Monthly Top Performers</h2>
              <p className="text-slate-500 text-sm">Best attendance this month</p>
            </div>
          </div>
          <div className="space-y-3">
            {monthlyLeaderboard.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4 italic">No rankings available yet this month.</p>
            ) : (
              monthlyLeaderboard.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-bold ${
                      idx === 0 ? "bg-indigo-100 text-indigo-700" :
                      idx === 1 ? "bg-indigo-50 text-indigo-600" :
                      idx === 2 ? "bg-slate-100 text-slate-600" :
                      "bg-slate-50 text-slate-400"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-base font-semibold text-slate-800">{entry.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{entry.percentage}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon, bgColor }) {
  return (
    <div className="flex items-center gap-4 bg-white/50 border border-slate-100 rounded-2xl p-5 hover:bg-slate-50 transition-colors">
      <div className={`${bgColor} p-4 rounded-2xl`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function AnalyticBadge({ title, value, subtitle, trend }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
      <p className="text-sm font-semibold text-slate-500 mb-2">{title}</p>
      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-3xl font-extrabold text-slate-900">{value}</p>
      </div>
      <p className="text-sm text-slate-400 truncate">{subtitle}</p>
    </div>
  )
}
