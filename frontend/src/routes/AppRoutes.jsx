import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import DashboardLayout from '../components/layout/DashboardLayout'
import ProtectedRoute from './ProtectedRoute'

const AuthPage = lazy(() => import('../pages/AuthPage'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const LandingPage = lazy(() => import('../pages/LandingPage'))
const NotFound = lazy(() => import('../pages/NotFound'))
const ProfilePage = lazy(() => import('../pages/AccountPages').then((module) => ({ default: module.ProfilePage })))
const SettingsPage = lazy(() => import('../pages/AccountPages').then((module) => ({ default: module.SettingsPage })))
const StoragePage = lazy(() => import('../pages/StoragePage'))
const FoldersPage = lazy(() => import('../pages/FoldersPage'))
const WorkspacePage = lazy(() => import('../pages/WorkspacePage'))

function RouteFallback() {
  return <div className="route-loading" role="status" aria-label="Loading page"><span /></div>
}

function WorkspaceFrame() {
  return <DashboardLayout><Outlet /></DashboardLayout>
}

export default function AppRoutes() {
  return <Suspense fallback={<RouteFallback />}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<WorkspaceFrame />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/documents" element={<WorkspacePage mode="documents" />} />
        <Route path="/documents/:id" element={<WorkspacePage mode="detail" />} />
        <Route path="/search" element={<WorkspacePage mode="documents" />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/folders/:id" element={<WorkspacePage mode="folder" />} />
        <Route path="/recent" element={<WorkspacePage mode="recent" />} />
        <Route path="/favorites" element={<WorkspacePage mode="favorites" />} />
        <Route path="/shared" element={<WorkspacePage mode="shared" />} />
        <Route path="/trash" element={<WorkspacePage mode="trash" />} />
        <Route path="/storage" element={<StoragePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Route>
    <Route path="/not-found" element={<NotFound />} />
    <Route path="*" element={<Navigate to="/not-found" replace />} />
  </Routes></Suspense>
}
