import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Setup from './pages/Setup'
import Review from './pages/Review'
import Board from './pages/Board'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { Loader2 } from 'lucide-react'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            } />

            <Route path="/setup" element={
              <AuthGuard>
                <Setup />
              </AuthGuard>
            } />

            <Route path="/review" element={
              <AuthGuard>
                <Review />
              </AuthGuard>
            } />

            <Route path="/board/:profileId" element={
              <AuthGuard>
                <Board />
              </AuthGuard>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
