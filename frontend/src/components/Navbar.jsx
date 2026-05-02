import { Link, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { LayoutDashboard, Users, Camera, LogOut, Calendar, BarChart3, Mail, ScanFace } from 'lucide-react'

const navItems = [
  { to: '/teacher-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/teacher-schedule', label: 'Schedule', icon: Calendar },
  { to: '/take-attendance', label: 'Take Attendance', icon: Camera },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/analytics/monthly', label: 'Analytics', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: Calendar },
  { to: '/email-settings', label: 'Email Settings', icon: Mail },
]

export default function Navbar() {
  const navigate = useNavigate()
  const teacherStr = localStorage.getItem('teacher')
  
  if (!teacherStr) {
    return <Navigate to="/teacher-login" />
  }

  const handleLogout = () => {
    localStorage.removeItem('teacher')
    navigate('/teacher-login')
  }

  return (
    <aside className="w-full md:w-72 bg-slate-900 border-r border-slate-800 text-slate-300 min-h-screen flex flex-col justify-between shadow-2xl relative z-20">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-3 mb-10 group">
          <div className="bg-indigo-500 p-2 rounded-xl group-hover:bg-indigo-400 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-300">
            <ScanFace className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold text-white tracking-wide group-hover:text-indigo-50 transition-colors">EduFace</span>
        </Link>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">Menu</div>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 group relative overflow-hidden ${
                    isActive 
                      ? 'bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20 shadow-inner' 
                      : 'hover:bg-slate-800/50 hover:text-white border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                    )}
                    <Icon size={20} className={`transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>
      
      <div className="p-6 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-4 py-3 w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200 text-left group border border-transparent hover:border-rose-500/20"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}
