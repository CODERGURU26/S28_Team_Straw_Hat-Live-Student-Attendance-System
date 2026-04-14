import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
<<<<<<< Updated upstream
import { GraduationCap, Users } from 'lucide-react'
=======
import { GraduationCap, Users, LogIn, ArrowRight, Zap, Shield, Clock, ChevronRight } from 'lucide-react'
>>>>>>> Stashed changes

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [activeCard, setActiveCard] = useState(null)
  const [count, setCount] = useState({ students: 0, teachers: 0, sessions: 0 })
  const heroRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!heroRef.current) return
      const rect = heroRef.current.getBoundingClientRect()
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const targets = { students: 1240, teachers: 86, sessions: 9400 }
    const duration = 1800
    const steps = 60
    const interval = duration / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount({
        students: Math.floor(targets.students * ease),
        teachers: Math.floor(targets.teachers * ease),
        sessions: Math.floor(targets.sessions * ease),
      })
      if (step >= steps) clearInterval(timer)
    }, interval)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      ref={heroRef}
      className="relative min-h-screen bg-[#080810] text-white overflow-hidden flex flex-col"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Animated gradient orbs */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{
          background: `radial-gradient(800px circle at ${mousePos.x}% ${mousePos.y}%, rgba(99,102,241,0.12), transparent 50%)`,
        }}
      />
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />

      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-white tracking-tight">AttendX</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-white/40">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="#contact" className="hover:text-white transition-colors">Contact</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/student-login" className="text-sm text-white/50 hover:text-white transition-colors px-3 py-1.5">
            Sign in
          </Link>
          <Link
            to="/register/student"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 pt-20 pb-16 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          AI-powered attendance tracking
          <ChevronRight size={12} className="opacity-60" />
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-6 max-w-4xl">
          <span className="text-white">Smart attendance</span>
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #c084fc 100%)' }}
          >
            for modern schools
          </span>
        </h1>

        <p className="text-lg text-white/40 max-w-xl mb-12 leading-relaxed">
          Face-recognition powered system that makes attendance effortless for students and teachers alike.
        </p>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-4 w-full max-w-2xl mb-16">
          {[
            {
              id: 'student',
              to: '/register/student',
              icon: GraduationCap,
              label: 'Student',
              desc: 'Register with your @slrtce.in email and face photos for seamless check-ins.',
              accent: '#6366f1',
              accentBg: 'rgba(99,102,241,0.08)',
              accentBorder: 'rgba(99,102,241,0.25)',
              accentHover: 'rgba(99,102,241,0.15)',
              tag: 'Face ID enabled',
            },
            {
              id: 'teacher',
              to: '/register/teacher',
              icon: Users,
              label: 'Teacher',
              desc: 'Manage classrooms, track attendance in real-time, and generate smart reports.',
              accent: '#a78bfa',
              accentBg: 'rgba(167,139,250,0.08)',
              accentBorder: 'rgba(167,139,250,0.25)',
              accentHover: 'rgba(167,139,250,0.15)',
              tag: 'Analytics included',
            },
          ].map((card) => (
            <Link
              key={card.id}
              to={card.to}
              onMouseEnter={() => setActiveCard(card.id)}
              onMouseLeave={() => setActiveCard(null)}
              className="group relative text-left p-6 rounded-2xl border transition-all duration-300"
              style={{
                background: activeCard === card.id ? card.accentHover : card.accentBg,
                borderColor: activeCard === card.id ? card.accentBorder : 'rgba(255,255,255,0.06)',
                transform: activeCard === card.id ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: activeCard === card.id ? `0 20px 40px -12px ${card.accent}30` : 'none',
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${card.accent}20`, border: `1px solid ${card.accent}30` }}
                >
                  <card.icon size={22} style={{ color: card.accent }} />
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: `${card.accent}15`, color: card.accent }}
                >
                  {card.tag}
                </span>
              </div>

              <h2 className="text-xl font-semibold text-white mb-2">{card.label}</h2>
              <p className="text-sm text-white/40 leading-relaxed mb-5">{card.desc}</p>

              <div
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-all duration-200 group-hover:gap-2.5"
                style={{ color: card.accent }}
              >
                Register as {card.label}
                <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-8 mb-12">
          {[
            { value: count.students.toLocaleString(), label: 'Students enrolled' },
            { value: count.teachers, label: 'Teachers active' },
            { value: `${(count.sessions / 1000).toFixed(1)}k`, label: 'Sessions tracked' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/30 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Already registered */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/25">Already have an account?</span>
          <div className="flex gap-2">
            <Link
              to="/student-login"
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all duration-200"
            >
              <LogIn size={14} />
              Student login
            </Link>
            <Link
              to="/teacher-login"
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:border-violet-400/40 transition-all duration-200"
            >
              <LogIn size={14} />
              Teacher login
            </Link>
          </div>
        </div>
      </main>

      {/* Details Sections */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-24 space-y-32">
        {/* Features Section */}
        <section id="features" className="scroll-mt-24">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">Why choose AttendX?</h3>
            <p className="text-white/40 max-w-2xl mx-auto">Experience seamless attendance taking powered by modern AI technology.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Lightning Fast', desc: 'Process an entire classroom in under 5 seconds with bulk photo upload.', icon: Zap },
              { title: 'Highly Secure', desc: 'Enterprise-grade facial encoding ensures proxy attendance is impossible.', icon: Shield },
              { title: 'Detailed Analytics', desc: 'Generate complete CSV reports and track daily percentages instantly.', icon: Clock },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4">
                  <feature.icon size={20} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
                <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="scroll-mt-24 text-center">
          <h3 className="text-3xl font-bold text-white mb-6">About the System</h3>
          <div className="p-8 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 max-w-3xl mx-auto">
            <p className="text-white/60 leading-relaxed">
              Developed by <span className="text-indigo-400 font-medium">Team Straw Hat</span> for SLRTCE, 
              this platform modernizes traditional roll calls. By leveraging dlib and Flask, AttendX maps neural face encodings to securely verify student identities and automates record-keeping for faculty.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="scroll-mt-24 text-center pb-12">
          <h3 className="text-3xl font-bold text-white mb-4">Get in Touch</h3>
          <p className="text-white/40 mb-8 max-w-xl mx-auto">
            Need support with your account or have a feature request? Reach out to our technical team.
          </p>
          <a href="mailto:support@slrtce.in" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium border border-white/10 hover:border-white/20 transition-all">
            Contact Support
          </a>
        </section>
      </div>

<<<<<<< Updated upstream
      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl px-4">
        <Link 
          to="/register/student" 
          className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all group"
        >
          <div className="p-4 bg-blue-100 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-colors text-blue-600 mb-4">
            <GraduationCap size={48} />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Student</h2>
          <p className="text-center text-slate-500">Register with your @slrtce.in email and face photos.</p>
        </Link>

        <Link 
          to="/register/teacher" 
          className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all group"
        >
          <div className="p-4 bg-indigo-100 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition-colors text-indigo-600 mb-4">
            <Users size={48} />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Teacher</h2>
          <p className="text-center text-slate-500">Register to manage students and track attendance.</p>
        </Link>
=======
      {/* Bottom feature strip */}
      <div className="relative z-10 border-t border-white/5 px-8 py-4">
        <div className="flex flex-wrap justify-center gap-8">
          {[
            { icon: Shield, text: 'Secure face recognition' },
            { icon: Clock, text: 'Real-time tracking' },
            { icon: Zap, text: 'Instant reports' },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-white/25">
              <Icon size={13} className="text-indigo-400/60" />
              {text}
            </div>
          ))}
        </div>
>>>>>>> Stashed changes
      </div>
    </div>
  )
}