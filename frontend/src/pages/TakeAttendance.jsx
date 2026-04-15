import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { takeAttendance, getSchedules } from '../api'

export default function TakeAttendance() {
  const navigate = useNavigate()
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [schedules, setSchedules] = useState([])
  const [scheduleId, setScheduleId] = useState('')

  useEffect(() => {
    getSchedules()
      .then(res => setSchedules(res.data))
      .catch(err => toast.error('Failed to load schedules'))
  }, [])

  const submit = async () => {
    if (!photo) return toast.error('Please select a group photo')

    const formData = new FormData()
    formData.append('group_photo', photo)
    if (scheduleId) {
      formData.append('schedule_id', scheduleId)
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
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Take Attendance</h1>
      
      {schedules.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Link Schedule (Optional)</label>
          <select 
            value={scheduleId} 
            onChange={e => setScheduleId(e.target.value)}
            className="w-full p-2 border rounded-lg bg-white"
          >
            <option value="">-- No Schedule --</option>
            {schedules.map(s => (
              <option key={s.id} value={s.id}>
                {s.subject} ({s.type}) - {s.day_of_week} {s.time}
              </option>
            ))}
          </select>
        </div>
      )}

      <label className="block border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white cursor-pointer">
        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setPhoto(file)
            setPreview(URL.createObjectURL(file))
          }
        }} />
        <p>Drag & drop or click to upload group photo</p>
      </label>
      {preview && <img src={preview} alt="group preview" className="rounded-lg" />}
      <button onClick={submit} disabled={loading} className="px-4 py-2 rounded-lg bg-green-500 text-white disabled:opacity-60">
        {loading ? 'Processing...' : 'Process Attendance'}
      </button>
    </div>
  )
}
