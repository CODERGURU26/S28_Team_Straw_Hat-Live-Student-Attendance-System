import { useEffect, useState, useMemo } from 'react'
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from '../api'
import toast from 'react-hot-toast'
import { Calendar, Clock, MapPin, Plus, X, Edit2, Trash2 } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TYPES = ['Lecture', 'Lab', 'Tutorial']

export default function TeacherSchedule() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [formData, setFormData] = useState({
    subject: '',
    day_of_week: 'Monday',
    time: '10:00',
    room: '',
    type: 'Lecture'
  })

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      const res = await getSchedules()
      setSchedules(res.data)
    } catch {
      toast.error('Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (sched = null) => {
    if (sched) {
      setEditingId(sched.id)
      setFormData({
        subject: sched.subject,
        day_of_week: sched.day_of_week,
        time: sched.time,
        room: sched.room,
        type: sched.type
      })
    } else {
      setEditingId(null)
      setFormData({
        subject: '',
        day_of_week: 'Monday',
        time: '10:00',
        room: '',
        type: 'Lecture'
      })
    }
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await updateSchedule(editingId, formData)
        toast.success('Session updated')
      } else {
        await createSchedule(formData)
        toast.success('Session scheduled')
      }
      setModalOpen(false)
      fetchSchedules()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save session')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return
    try {
      await deleteSchedule(id)
      toast.success('Session cancelled')
      fetchSchedules()
    } catch {
      toast.error('Failed to delete session')
    }
  }

  // Group schedules by day for the grid
  const scheduleByDay = useMemo(() => {
    const map = {}
    DAYS.forEach(d => map[d] = [])
    schedules.forEach(s => {
      if (map[s.day_of_week]) {
        map[s.day_of_week].push(s)
      }
    })
    // Sort each day by time
    Object.keys(map).forEach(day => {
      map[day].sort((a, b) => a.time.localeCompare(b.time))
    })
    return map
  }, [schedules])

  if (loading) return <p className="p-8 text-slate-500">Loading schedule...</p>

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-indigo-600" /> Session Schedule
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage your weekly lectures and labs</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Schedule Session
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {DAYS.map(day => (
          <div key={day} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold text-slate-700">{day}</h2>
            </div>
            <div className="p-4 flex-1 space-y-3 bg-slate-50/30">
              {scheduleByDay[day].length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  No sessions scheduled
                </div>
              ) : (
                scheduleByDay[day].map(sched => (
                  <div key={sched.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group relative">
                    
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${
                        sched.type === 'Lecture' ? 'bg-blue-100 text-blue-700' :
                        sched.type === 'Lab' ? 'bg-amber-100 text-amber-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {sched.type}
                      </span>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button onClick={() => handleOpenModal(sched)} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(sched.id)} className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-800 text-sm mb-2 pr-10">{sched.subject}</h3>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center text-xs text-slate-500 gap-1.5">
                        <Clock size={12} /> {sched.time}
                      </div>
                      <div className="flex items-center text-xs text-slate-500 gap-1.5">
                        <MapPin size={12} /> {sched.room || 'TBD'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Session' : 'Schedule Session'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject / Course</label>
                <input
                  required
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Data Structures"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Day</label>
                  <select
                    value={formData.day_of_week}
                    onChange={e => setFormData({ ...formData, day_of_week: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    required
                    type="time"
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                  <input
                    required
                    type="text"
                    value={formData.room}
                    onChange={e => setFormData({ ...formData, room: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Lab 3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                >
                  {editingId ? 'Save Changes' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
