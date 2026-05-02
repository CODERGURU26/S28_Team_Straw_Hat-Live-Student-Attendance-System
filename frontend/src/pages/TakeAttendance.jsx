import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { takeAttendance, getSessionsMonth } from '../api'
import { Camera, ImagePlus, Link2, CalendarDays, Loader2, ArrowRight } from 'lucide-react'

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function TakeAttendance() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState([])
  const [previews, setPreviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [todaySessions, setTodaySessions] = useState([])
  const [allTodaySessions, setAllTodaySessions] = useState([])
  const [scheduleId, setScheduleId] = useState('')
  const today = formatLocalDate(new Date())
  const currentMonth = today.slice(0, 7)

  useEffect(() => {
    getSessionsMonth(currentMonth)
      .then((res) => {
        const allSessions = res.data.filter((session) => session.date === today)
        setAllTodaySessions(allSessions)
        const sessionsForToday = allSessions.filter((session) => !session.attendance_taken)
        setTodaySessions(sessionsForToday)
      })
      .catch(err => toast.error('Failed to load schedules'))
  }, [currentMonth, today])

  const formatScheduleOption = (schedule) => {
    return `${schedule.subject} — ${schedule.time} (${schedule.type})`
  }

  const submit = async () => {
    if (photos.length === 0) return toast.error('Please select at least one group photo')

    const formData = new FormData()
    photos.forEach((f) => formData.append('group_photos[]', f))
    formData.append('session_date', today)
    if (scheduleId) {
      formData.append('session_id', scheduleId)
    }

    try {
      setLoading(true)
      const res = await takeAttendance(formData)
      toast.success('Attendance completed')
      navigate(`/results/${res.data.session_id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Attendance failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl">
              <Camera size={28} />
            </div>
            Capture Attendance
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Upload classroom photos to automatically mark present students.</p>
        </div>
        <Link to="/analytics/monthly" className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all">
          <CalendarDays size={16} /> Monthly Analytics <ArrowRight size={16} />
        </Link>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden p-8 mb-8 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-8">
          
          {/* Schedule Selection */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Link2 size={16} className="text-slate-400" /> Link to Schedule
            </h3>
            
            {allTodaySessions.length > 0 ? (
              todaySessions.length > 0 ? (
                <div className="relative">
                  <select 
                    value={scheduleId} 
                    onChange={e => setScheduleId(e.target.value)}
                    className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none font-medium text-slate-700 transition-all cursor-pointer"
                  >
                    <option value="">-- Unlinked Ad-hoc Session --</option>
                    {todaySessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {formatScheduleOption(s)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-medium">
                  <div className="bg-emerald-100 p-1.5 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg></div>
                  All scheduled sessions for today are complete!
                </div>
              )
            ) : (
              <div className="flex items-center gap-3 p-4 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 font-medium text-sm">
                No classes scheduled for today. You can still record an ad-hoc session.
              </div>
            )}
          </div>

          {/* Photo Upload Area */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
              <ImagePlus size={16} className="text-slate-400" /> Upload Classroom Photos
            </h3>
            
            <label className="block w-full border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-10 bg-slate-50 hover:bg-indigo-50/30 cursor-pointer text-center transition-all group">
              <input type="file" multiple className="hidden" accept="image/*" onChange={(e) => {
                const files = Array.from(e.target.files || [])
                if (files.length > 0) {
                  setPhotos(files)
                  setPreviews(files.map((f) => URL.createObjectURL(f)))
                }
              }} />
              <div className="bg-white w-16 h-16 rounded-full shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                <ImagePlus size={28} className="text-indigo-500" />
              </div>
              <p className="font-bold text-lg text-slate-700">Click to browse or drag & drop</p>
              <p className="text-sm text-slate-500 mt-2 font-medium">Select multiple photos for wide classrooms to ensure all faces are visible</p>
            </label>
            
            {previews.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">{previews.length} photos selected</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                      <img src={src} alt={`Preview ${idx+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end border-t border-slate-200 pt-6">
        <button 
          onClick={submit} 
          disabled={loading || photos.length === 0} 
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-50 disabled:bg-slate-400 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all active:scale-95"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Analyzing Faces...</>
          ) : (
            <><Camera size={18} /> Process Attendance</>
          )}
        </button>
      </div>

    </div>
  )
}
