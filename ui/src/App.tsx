import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Setup from './pages/Setup'
import Review from './pages/Review'
import Board from './pages/Board'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/setup" element={<Setup />} />
          <Route path="/review" element={<Review />} />
          <Route path="/board" element={<Board />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
