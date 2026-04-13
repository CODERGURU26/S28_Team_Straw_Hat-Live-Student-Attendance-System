import { Trash2 } from 'lucide-react'

export default function StudentCard({ student, onDelete }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 border border-slate-200">
      <img
        src={`http://localhost:5000/static/${student.photo_path}`}
        alt={student.name}
        className="h-44 w-full object-cover rounded-lg"
      />
      <h3 className="mt-3 text-lg font-semibold">{student.name}</h3>
      <p className="text-slate-500">Roll: {student.roll_number}</p>
      <button
        onClick={() => onDelete(student)}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
      >
        <Trash2 size={16} /> Delete
      </button>
    </div>
  )
}
