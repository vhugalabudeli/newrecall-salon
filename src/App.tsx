import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnly, RequireAuth, RequireEntitlement } from './components/RequireAuth'
import { ScreenWait } from './components/ScreenWait'
import { paths } from './lib/routes'

function lazyNamed<T extends Record<K, ComponentType>, K extends keyof T>(
  loader: () => Promise<T>,
  name: K,
) {
  return lazy(async () => ({ default: (await loader())[name] }))
}

const AppShell = lazyNamed(() => import('./components/AppShell'), 'AppShell')
const CalendarMonth = lazyNamed(() => import('./pages/CalendarMonth'), 'CalendarMonth')
const CalendarOutlook = lazyNamed(() => import('./pages/CalendarOutlook'), 'CalendarOutlook')
const Clients = lazyNamed(() => import('./pages/Clients'), 'Clients')
const Dashboard = lazyNamed(() => import('./pages/Dashboard'), 'Dashboard')
const Landing = lazyNamed(() => import('./pages/Landing'), 'Landing')
const Login = lazyNamed(() => import('./pages/Login'), 'Login')
const ResetPassword = lazyNamed(() => import('./pages/ResetPassword'), 'ResetPassword')
const Pricing = lazyNamed(() => import('./pages/Pricing'), 'Pricing')
const Privacy = lazyNamed(() => import('./pages/Privacy'), 'Privacy')
const Refunds = lazyNamed(() => import('./pages/Refunds'), 'Refunds')
const Register = lazyNamed(() => import('./pages/Register'), 'Register')
const InviteComplete = lazyNamed(() => import('./pages/InviteComplete'), 'InviteComplete')
const ServiceTypeDetail = lazyNamed(() => import('./pages/ServiceTypeDetail'), 'ServiceTypeDetail')
const ServiceTypes = lazyNamed(() => import('./pages/ServiceTypes'), 'ServiceTypes')
const Settings = lazyNamed(() => import('./pages/Settings'), 'Settings')
const Subscribe = lazyNamed(() => import('./pages/Subscribe'), 'Subscribe')
const Terms = lazyNamed(() => import('./pages/Terms'), 'Terms')
const ThankYou = lazyNamed(() => import('./pages/ThankYou'), 'ThankYou')
const Admin = lazyNamed(() => import('./pages/Admin'), 'Admin')

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<ScreenWait label="Loading…" />}>
      <Routes>
        <Route path={paths.landing} element={<Landing />} />
        <Route path={paths.thankYou} element={<ThankYou />} />
        <Route path={paths.terms} element={<Terms />} />
        <Route path={paths.privacy} element={<Privacy />} />
        <Route path={paths.refunds} element={<Refunds />} />
        <Route path={paths.pricing} element={<Pricing />} />
        <Route path={paths.admin} element={<Admin />} />
        <Route path={paths.inviteComplete} element={<InviteComplete />} />
        <Route path={paths.resetPassword} element={<ResetPassword />} />
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
      </Suspense>
    </BrowserRouter>
  )
}
