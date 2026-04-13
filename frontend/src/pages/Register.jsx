import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { registerStudent, validateStudentPhoto } from '../api'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [faceValid, setFaceValid] = useState(null)

  const onPhotoChange = async (file) => {
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
    setFaceValid(null)

    const formData = new FormData()
    formData.append('photo', file)

    try {
      await validateStudentPhoto(formData)
      setFaceValid(true)
      toast.success('Face validation passed')
    } catch (err) {
      setFaceValid(false)
      toast.error(err.response?.data?.message || 'Face validation failed')
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!photo) return toast.error('Please upload photo')

    const formData = new FormData()
    formData.append('name', name)
    formData.append('roll_number', rollNumber)
    formData.append('photo', photo)

    try {
      setLoading(true)
      await registerStudent(formData)
      toast.success('Student registered successfully')
      navigate('/students')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Register Student</h1>
      <input className="w-full p-3 rounded-lg border" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="w-full p-3 rounded-lg border" placeholder="Roll Number" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required />
      <input type="file" accept="image/*" className="w-full p-3 rounded-lg border bg-white" onChange={(e) => e.target.files[0] && onPhotoChange(e.target.files[0])} required />

      {preview && (
        <div>
          <img src={preview} alt="preview" className="h-64 rounded-lg object-cover" />
          {faceValid === true && <p className="text-green-600 mt-2">Exactly one face detected ✅</p>}
          {faceValid === false && <p className="text-red-600 mt-2">Face validation failed ❌</p>}
        </div>
      )}

      <button disabled={loading} className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:opacity-60">
        {loading ? 'Registering...' : 'Register Student'}
      </button>
    </form>
  )
}
