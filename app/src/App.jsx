import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { isSupabaseConfigured } from './lib/supabase'
import ConfigError from './components/ConfigError'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Toaster from './components/Toast'

import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Dashboard from './pages/dashboard/Dashboard'
import VolunteersList from './pages/volunteers/VolunteersList'
import VolunteerDetail from './pages/volunteers/VolunteerDetail'
import OrganisationsList from './pages/organisations/OrganisationsList'
import OrganisationDetail from './pages/organisations/OrganisationDetail'
import Deployments from './pages/deployments/Deployments'
import Reports from './pages/reports/Reports'
import Settings from './pages/settings/Settings'
import Surveys from './pages/surveys/Surveys'
import VolunteerSurvey from './pages/surveys/VolunteerSurvey'
import OrgSurvey from './pages/surveys/OrgSurvey'
import CustomSurvey from './pages/surveys/CustomSurvey'
import NotFound from './pages/NotFound'


export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  if (!isSupabaseConfigured) {
    return <ConfigError />
  }

  return (
    <>
      <Toaster />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/survey/volunteer/:token" element={<VolunteerSurvey />} />
        <Route path="/survey/org/:token" element={<OrgSurvey />} />
        <Route path="/survey/custom/:id" element={<CustomSurvey />} />

        {/* Authenticated app */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/volunteers" element={<VolunteersList />} />
          <Route path="/volunteers/:id" element={<VolunteerDetail />} />
          <Route path="/organisations" element={<OrganisationsList />} />
          <Route path="/organisations/:id" element={<OrganisationDetail />} />
          <Route path="/deployments" element={<Deployments />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/surveys" element={<Surveys />} />
          <Route path="/survey-test" element={<Navigate to="/surveys" replace />} />

          <Route
            path="/settings"
            element={
              <ProtectedRoute adminOnly>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
