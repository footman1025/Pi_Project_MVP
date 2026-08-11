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
import SeoHead from './components/SeoHead'

import DashboardPage from './pages/DashboardPage'
import FeedPage from './pages/FeedPage'
import MatchmakingPage from './pages/MatchmakingPage'
import OpportunityPage from './pages/OpportunityPage'
import OpportunityPublicPage from './pages/OpportunityPublicPage'
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
import TractionPage from './pages/TractionPage'
import ConnectPage from './pages/ConnectPage'
import HandoffsPage from './pages/HandoffsPage'
import FeaturesHubPage from './pages/FeaturesHubPage'
import FeatureDetailPage from './pages/FeatureDetailPage'
import GrowPage from './pages/GrowPage'
import InviteLandingPage from './pages/InviteLandingPage'
import PartnersPage from './pages/PartnersPage'
import DiscussPage from './pages/DiscussPage'
import ExperienceSettingsPage from './pages/ExperienceSettingsPage'
import TrustSafetyPage from './pages/TrustSafetyPage'
import ModerationPage from './pages/ModerationPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080d1a' }}>
        <LoadingSpinner size="lg" label="Loading Pi…" />
      </div>
    )
  }
  // Prefer user OR session — brief restore windows can keep user while session rehydrates
  if (!session && !user) return <Navigate to="/login" replace />
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
  '/partners',
  '/discuss',
]

export default function App() {
  const location = useLocation()
  const { session, loading: authLoading } = useAuth()
  const [assistantOpen, setAssistantOpen] = useState(false)

  const isProfilePath = location.pathname.startsWith('/p/')
  const isTransparencyPath = location.pathname === '/transparency'
  const isTrustPath = location.pathname === '/trust'
  const isExperiencePath = location.pathname === '/experience'
  const isConnectPath = location.pathname === '/connect'
  const isFeaturesPath =
    location.pathname === '/features' || location.pathname.startsWith('/features/')
  const isInvitePath =
    location.pathname === '/invite' || location.pathname.startsWith('/invite/')
  const isGrowPath = location.pathname === '/grow'
  const isOppPublicPath = location.pathname.startsWith('/o/')
  // Logged-in members see profiles / transparency / connect / grow inside AppShell. Guests get public layout.
  // Features + investor + partners/discuss stay public for SEO even when signed in.
  const isPublic =
    ALWAYS_PUBLIC.includes(location.pathname) ||
    isFeaturesPath ||
    isInvitePath ||
    (isOppPublicPath && !session && !authLoading) ||
    (isGrowPath && !session && !authLoading) ||
    ((isProfilePath || isTransparencyPath || isTrustPath || isExperiencePath || isConnectPath) && !session && !authLoading)

  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  useEffect(() => { trackPageView(location.pathname) }, [location.pathname])

  // Wait for auth before deciding public vs app shell for dual-mode URLs
  if ((isProfilePath || isTransparencyPath || isTrustPath || isExperiencePath || isConnectPath || isGrowPath || isOppPublicPath) && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <LoadingSpinner size="lg" label="Loading Pi…" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <SeoHead />
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
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/transparency" element={<TransparencyPage />} />
          <Route path="/trust" element={<TrustSafetyPage />} />
          <Route path="/experience" element={<ExperienceSettingsPage />} />
          <Route path="/features" element={<FeaturesHubPage />} />
          <Route path="/features/:slug" element={<FeatureDetailPage />} />
          <Route path="/grow" element={<GrowPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/discuss" element={<DiscussPage />} />
          <Route path="/invite" element={<InviteLandingPage />} />
          <Route path="/invite/:code" element={<InviteLandingPage />} />
          <Route path="/p/:username" element={<ProfilePage />} />
          <Route path="/o/:slugOrId" element={<OpportunityPublicPage />} />
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
              <Route path="/o/:slugOrId" element={<OpportunityPublicPage />} />
              <Route path="/creators" element={<CreatorPage />} />
              <Route path="/professionals" element={<ProfessionalPage />} />
              <Route path="/communities" element={<CommunityPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/vision" element={<VisionPage />} />
              <Route path="/transparency" element={<TransparencyPage />} />
              <Route path="/trust" element={<TrustSafetyPage />} />
              <Route path="/moderation" element={<ModerationPage />} />
              <Route path="/experience" element={<ExperienceSettingsPage />} />
              <Route path="/messages" element={<MessagingPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile/edit" element={<ProfileEditPage />} />
              <Route path="/twin" element={<DigitalTwinPage />} />
              <Route path="/traction" element={<TractionPage />} />
              <Route path="/handoffs" element={<HandoffsPage />} />
              <Route path="/connect" element={<ConnectPage />} />
              <Route path="/grow" element={<GrowPage />} />
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
