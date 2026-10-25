import { Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider'
import { GuestOnly, RequireAuth } from './auth/RouteGuards'
import './i18n/auth'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import ExamPage from './pages/ExamPage'
import Home from './pages/Home'
import OnboardingPage from './pages/OnboardingPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/exams/:slug" element={<ExamPage />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <AuthPage mode="login" />
            </GuestOnly>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestOnly>
              <AuthPage mode="signup" />
            </GuestOnly>
          }
        />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <OnboardingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  )
}