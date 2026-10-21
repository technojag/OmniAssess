import { Route, Routes } from 'react-router-dom'
import ExamPage from './pages/ExamPage'
import Home from './pages/Home'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/exams/:slug" element={<ExamPage />} />
    </Routes>
  )
}