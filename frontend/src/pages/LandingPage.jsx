import { Link } from 'react-router-dom'
import { GraduationCap, Users, LogIn, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center py-12 px-4 overflow-hidden">
      
      {/* Background Abstract Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-6 mb-16 animate-fade-up max-w-3xl mx-auto z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-semibold mb-2 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Live Student Attendance System
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Welcome to <br className="hidden md:block"/>
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">EduFace.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
          The next-generation facial recognition attendance platform. Select your portal to proceed.
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl z-10 mb-16">
        {/* Student Card */}
        <div className="group relative flex flex-col p-1 rounded-3xl bg-gradient-to-b from-blue-100 to-white shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
          <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-[22px] p-8 md:p-10 border border-white/50 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <GraduationCap size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Student Portal</h2>
            <p className="text-slate-500 mb-8 flex-1 leading-relaxed">
              Access your dashboard, view attendance analytics, track your streaks, and manage your face profile.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link
                to="/student-login"
                className="flex-1 inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 text-white font-semibold transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 active:scale-95"
              >
                <LogIn size={18} /> Log In
              </Link>
              <Link
                to="/register/student"
                className="flex-1 inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-50 text-blue-700 font-semibold transition-all hover:bg-blue-100 active:scale-95"
              >
                Register <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>

        {/* Teacher Card */}
        <div className="group relative flex flex-col p-1 rounded-3xl bg-gradient-to-b from-indigo-100 to-white shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
          <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-[22px] p-8 md:p-10 border border-white/50 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
              <Users size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Faculty Portal</h2>
            <p className="text-slate-500 mb-8 flex-1 leading-relaxed">
              Manage classes, take live face attendance, monitor student alerts, and generate reports.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link
                to="/teacher-login"
                className="flex-1 inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 active:scale-95"
              >
                <LogIn size={18} /> Log In
              </Link>
              <Link
                to="/register/teacher"
                className="flex-1 inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-50 text-indigo-700 font-semibold transition-all hover:bg-indigo-100 active:scale-95"
              >
                Register <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  )
}