import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Register from './pages/Register'
import Students from './pages/Students'
import TakeAttendance from './pages/TakeAttendance'
import Results from './pages/Results'

export default function App() {
  return (
    <div className="md:flex min-h-screen bg-slate-100">
      <Navbar />
      <main className="flex-1 p-4 md:p-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/students" element={<Students />} />
          <Route path="/take-attendance" element={<TakeAttendance />} />
          <Route path="/results/:sessionId" element={<Results />} />
        </Routes>
      </main>
    </div>
  )
}
