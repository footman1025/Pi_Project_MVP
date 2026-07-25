import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { trackPageView } from './lib/analytics'
import LoadingSpinner from './components/LoadingSpinner'

import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import ProfilePage from './pages/ProfilePage'
import SignUpPage from './pages/auth/SignUpPage'
import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

import AppShell from './components/AppShell'
import AiAssistant from './components/AiAssistant'

import DashboardPage from './pages/DashboardPage'
import FeedPage from './pages/FeedPage'
import MatchmakingPage from './pages/MatchmakingPage'
import OpportunityPage from './pages/OpportunityPage'
import CreatorPage from './pages/CreatorPage'
import ProfessionalPage from './pages/ProfessionalPage'
import CommunityPage from './pages/CommunityPage'
import SearchPage from './pages/SearchPage'
import VisionPage from './pages/VisionPage'
import TransparencyPage from './pages/TransparencyPage'
import MessagingPage from './pages/MessagingPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfileEditPage from './pages/ProfileEditPage'
import InvestorDemoPage from './pages/InvestorDemoPage'
import InvestorDashboardPage from './pages/InvestorDashboardPage'
import DigitalTwinPage from './pages/DigitalTwinPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080d1a' }}>
        <LoadingSpinner size="lg" label="Loading Pi…" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

const ALWAYS_PUBLIC = [
  '/',
  '/onboarding',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/demo',
  '/investor',
]

export default function App() {
  const location = useLocation()
  const { session, loading: authLoading } = useAuth()
  const [assistantOpen, setAssistantOpen] = useState(false)

  const isProfilePath = location.pathname.startsWith('/p/')
  const isTransparencyPath = location.pathname === '/transparency'
  // Logged-in members see profiles / transparency inside AppShell. Guests get public layout.
  const isPublic =
    ALWAYS_PUBLIC.includes(location.pathname) ||
    ((isProfilePath || isTransparencyPath) && !session && !authLoading)

  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  useEffect(() => { trackPageView(location.pathname) }, [location.pathname])

  // Wait for auth before deciding public vs app shell for dual-mode URLs
  if ((isProfilePath || isTransparencyPath) && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <LoadingSpinner size="lg" label="Loading Pi…" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      {isPublic ? (
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/demo" element={<InvestorDemoPage />} />
          <Route path="/investor" element={<InvestorDashboardPage />} />
          <Route path="/transparency" element={<TransparencyPage />} />
          <Route path="/p/:username" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <ProtectedRoute>
          <AppShell onAssistantToggle={() => setAssistantOpen(o => !o)}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/match" element={<MatchmakingPage />} />
              <Route path="/opportunities" element={<OpportunityPage />} />
              <Route path="/creators" element={<CreatorPage />} />
              <Route path="/professionals" element={<ProfessionalPage />} />
              <Route path="/communities" element={<CommunityPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/vision" element={<VisionPage />} />
              <Route path="/transparency" element={<TransparencyPage />} />
              <Route path="/messages" element={<MessagingPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile/edit" element={<ProfileEditPage />} />
              <Route path="/twin" element={<DigitalTwinPage />} />
              <Route path="/p/:username" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AppShell>
          <AiAssistant open={assistantOpen} onClose={() => setAssistantOpen(false)} />
        </ProtectedRoute>
      )}
    </div>
  )
}
