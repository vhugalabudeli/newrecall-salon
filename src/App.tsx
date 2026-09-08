import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { GuestOnly, RequireAuth, RequireEntitlement } from './components/RequireAuth'
import { CalendarMonth } from './pages/CalendarMonth'
import { CalendarOutlook } from './pages/CalendarOutlook'
import { Clients } from './pages/Clients'
import { Dashboard } from './pages/Dashboard'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Pricing } from './pages/Pricing'
import { Privacy } from './pages/Privacy'
import { Refunds } from './pages/Refunds'
import { Register } from './pages/Register'
import { ServiceTypeDetail } from './pages/ServiceTypeDetail'
import { ServiceTypes } from './pages/ServiceTypes'
import { Settings } from './pages/Settings'
import { Subscribe } from './pages/Subscribe'
import { Terms } from './pages/Terms'
import { ThankYou } from './pages/ThankYou'
import { Admin } from './pages/Admin'
import { paths } from './lib/routes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={paths.landing} element={<Landing />} />
        <Route path={paths.thankYou} element={<ThankYou />} />
        <Route path={paths.terms} element={<Terms />} />
        <Route path={paths.privacy} element={<Privacy />} />
        <Route path={paths.refunds} element={<Refunds />} />
        <Route path={paths.pricing} element={<Pricing />} />
        <Route path={paths.admin} element={<Admin />} />
        <Route
          path={paths.login}
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
        <Route
          path={paths.register}
          element={
            <GuestOnly>
              <Register />
            </GuestOnly>
          }
        />
        <Route
          path={paths.subscribe}
          element={
            <RequireAuth>
              <Subscribe />
            </RequireAuth>
          }
        />
        <Route
          path={paths.dashboard}
          element={
            <RequireAuth>
              <RequireEntitlement>
                <AppShell />
              </RequireEntitlement>
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="calendar" element={<CalendarOutlook />} />
          <Route path="calendar/:offset" element={<CalendarMonth />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/service-types" element={<ServiceTypes />} />
          <Route
            path="settings/service-types/:typeId"
            element={<ServiceTypeDetail />}
          />
          <Route
            path="settings/message-template"
            element={<Navigate to={paths.settings} replace />}
          />
          <Route path="recalls" element={<Navigate to={paths.calendar} replace />} />
          <Route path="*" element={<Navigate to={paths.dashboard} replace />} />
        </Route>
        <Route path="*" element={<Navigate to={paths.landing} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
