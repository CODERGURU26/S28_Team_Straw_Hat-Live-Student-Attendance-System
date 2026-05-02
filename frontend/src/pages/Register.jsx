import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, X, Camera, ArrowLeft, UploadCloud } from 'lucide-react'
import toast from 'react-hot-toast'
import { registerStudent, validateStudentPhoto } from '../api'

const MAX_PHOTOS = 5

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [slots, setSlots] = useState(Array.from({ length: MAX_PHOTOS }, () => ({ file: null, preview: '', status: 'idle', error: '' })))
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const selectedCount = useMemo(() => slots.filter((s) => s.file).length, [slots])

  const validatePhoto = async (file, index) => {
    const formData = new FormData()
    formData.append('photo', file)
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, status: 'validating', error: '' } : slot)))
    try {
      await validateStudentPhoto(formData)
      setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, status: 'valid' } : slot)))
    } catch (err) {
      setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, status: 'invalid', error: err.response?.data?.message || 'Validation failed' } : slot)))
    }
  }

  const assignPhotoToSlot = async (index, file) => {
    if (!file) return
    setSlots((prev) => prev.map((slot, i) => (i === index ? { file, preview: URL.createObjectURL(file), status: 'idle', error: '' } : slot)))
    await validatePhoto(file, index)
  }

  const removeSlotPhoto = (index) => {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { file: null, preview: '', status: 'idle', error: '' } : slot)))
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    const files = slots.filter((s) => s.file).map((s) => s.file)
    if (files.length === 0) return toast.error('Please add at least one photo')

    const invalid = slots.some((s) => s.file && s.status === 'invalid')
    if (invalid) return toast.error('Please fix invalid photos before submitting')

    if (!email.endsWith('@slrtce.in')) {
      return toast.error('Only @slrtce.in emails are allowed')
    }

    const formData = new FormData()
    formData.append('name', name)
    formData.append('email', email)
    formData.append('roll_number', rollNumber)
    if (parentEmail.trim()) {
      formData.append('parent_email', parentEmail.trim())
    }
    files.forEach((file) => formData.append('photos[]', file))

    try {
      setLoading(true)
      setProgress(15)
      const timer = setInterval(() => setProgress((p) => Math.min(p + 10, 90)), 250)
      const res = await registerStudent(formData)
      clearInterval(timer)
      setProgress(100)
      const studentData = {
        id: res?.data?.student_id,
        name,
        email,
        roll_number: rollNumber,
        photo_count: res?.data?.photo_count || files.length,
        registered_at: new Date().toISOString(),
      }
      localStorage.setItem('student', JSON.stringify(studentData))
      toast.success(`Registered with ${res?.data?.photo_count || files.length} photos`)
      navigate('/student-dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 400)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-8">
        <ArrowLeft size={16} className="mr-1" /> Back to home
      </Link>
      
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 px-8 py-10 relative overflow-hidden text-center sm:text-left">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/3"></div>
          <h1 className="text-3xl font-extrabold text-white mb-2 relative z-10">Student Registration</h1>
          <p className="text-blue-200 text-sm relative z-10">Create your account to access the attendance portal.</p>
        </div>

        <form onSubmit={onSubmit} className="p-8 sm:p-10 space-y-8">
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
              <input className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">College Email</label>
              <input type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="student@slrtce.in" value={email} onChange={(e) => setEmail(e.target.value)} required pattern=".*@slrtce\.in$" title="Please use your @slrtce.in email address" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Roll Number</label>
              <input className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="e.g. 21IT101" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Parent Email <span className="text-slate-400 font-normal">(Optional)</span></label>
              <input type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="parent@example.com" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Camera className="text-blue-500" size={20} />
              Face Registration Data
            </h3>
            <p className="text-slate-500 text-sm mb-6">Upload clear photos of your face from different angles for the AI recognition system.</p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {slots.map((slot, index) => (
                <div key={index} className="relative group bg-slate-50 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl h-40 flex items-center justify-center transition-colors overflow-hidden">
                  {!slot.file ? (
                    <label className="cursor-pointer text-center text-sm text-slate-500 w-full h-full flex flex-col items-center justify-center p-4">
                      <UploadCloud size={24} className="text-slate-400 mb-2 group-hover:text-blue-500 transition-colors" />
                      <span className="font-medium">Slot {index + 1}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => assignPhotoToSlot(index, e.target.files?.[0])}
                      />
                    </label>
                  ) : (
                    <>
                      <img src={slot.preview} alt={`slot-${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSlotPhoto(index)}
                        className="absolute top-2 right-2 bg-slate-900/60 hover:bg-rose-500 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors"
                      >
                        <X size={14} />
                      </button>
                      <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                        <div className="bg-white/95 backdrop-blur shadow-sm rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center">
                          {slot.status === 'validating' && <span className="text-slate-600 animate-pulse">Validating</span>}
                          {slot.status === 'valid' && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Valid</span>}
                          {slot.status === 'invalid' && <span className="text-rose-600 flex items-center gap-1"><XCircle size={12} /> Invalid</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-slate-500 mt-4 text-center">{selectedCount} / {MAX_PHOTOS} photos selected</p>
          </div>

          {loading && (
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Already have an account? <Link to="/student-login" className="text-blue-600 font-bold hover:underline">Log in</Link>
            </p>
            <button disabled={loading} className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-60 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 active:scale-[0.98]">
              {loading ? 'Processing...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
