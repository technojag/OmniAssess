import { Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider'
import { GuestOnly, RequireAdmin, RequireAuth } from './auth/RouteGuards'
import './i18n/auth'
import AdminImportPage from './pages/AdminImportPage'
import AdminQuestionEditPage from './pages/AdminQuestionEditPage'
import AdminQuestionsPage from './pages/AdminQuestionsPage'
import AttemptDonePage from './pages/AttemptDonePage'
import AttemptPage from './pages/AttemptPage'
import AttemptsHistoryPage from './pages/AttemptsHistoryPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import ExamPage from './pages/ExamPage'
import Home from './pages/Home'
import OnboardingPage from './pages/OnboardingPage'
import ResultAnalysisPage from './pages/ResultAnalysisPage'
import ResultReviewPage from './pages/ResultReviewPage'
import ResultSummaryPage from './pages/ResultSummaryPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
                <Route
          path="/attempts"
          element={
            <RequireAuth>
              <AttemptsHistoryPage />
            </RequireAuth>
          }
        />
        <Route
          path="/exams/:slug"
          element={
            <RequireAuth>
              <ExamPage />
            </RequireAuth>
          }
        />
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
        <Route
          path="/attempts/:id"
          element={
            <RequireAuth>
              <AttemptPage />
            </RequireAuth>
          }
        />
        <Route
          path="/attempts/:id/done"
          element={
            <RequireAuth>
              <AttemptDonePage />
            </RequireAuth>
          }
        />
        <Route
          path="/attempts/:id/result"
          element={
            <RequireAuth>
              <ResultSummaryPage />
            </RequireAuth>
          }
        />
        <Route
          path="/attempts/:id/analysis"
          element={
            <RequireAuth>
              <ResultAnalysisPage />
            </RequireAuth>
          }
        />
        <Route
          path="/attempts/:id/review"
          element={
            <RequireAuth>
              <ResultReviewPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/import"
          element={
            <RequireAdmin>
              <AdminImportPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/questions"
          element={
            <RequireAdmin>
              <AdminQuestionsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/questions/:id"
          element={
            <RequireAdmin>
              <AdminQuestionEditPage />
            </RequireAdmin>
          }
        />
      </Routes>
    </AuthProvider>
  )
}