import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { deleteStudent, getStudents } from '../api'
import StudentCard from '../components/StudentCard'

export default function Students() {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadStudents = async () => {
    try {
      const res = await getStudents()
      setStudents(res.data)
    } catch {
      toast.error('Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  const filtered = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [students, search],
  )

  const onDelete = async (student) => {
    if (!window.confirm(`Delete ${student.name}?`)) return
    try {
      await deleteStudent(student.id)
      toast.success('Student deleted')
      loadStudents()
    } catch {
      toast.error('Delete failed')
    }
  }

  if (loading) return <p>Loading students...</p>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Students</h1>
      <input className="w-full md:w-96 p-3 rounded-lg border" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((student) => <StudentCard key={student.id} student={student} onDelete={onDelete} />)}
      </div>
    </div>
  )
}
