import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { RoleProvider, useRole } from './context/RoleContext'
import { WorkflowProvider } from './context/WorkflowContext'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DataProcessing from './pages/DataProcessing'
import MaintenanceRecords from './pages/MaintenanceRecords'
import BlockRequests from './pages/BlockRequests'
import BlockPlanner from './pages/BlockPlanner'
import TrainTimeline from './pages/TrainTimeline'
import Plans from './pages/Plans'
import WhatIfSimulator from './pages/WhatIfSimulator'
import Analytics from './pages/Analytics'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

function ProtectedLayout() {
  const { isAuthenticated, role } = useRole()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  const isEmployee = role?.category === 'employee'
  const employeeAllowed = ['/', '/maintenance-records']
  if (isEmployee && !employeeAllowed.includes(location.pathname)) {
    return <Navigate to="/" replace />
  }
  return <MainLayout />
}

export default function App() {
  return <RoleProvider><WorkflowProvider><Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedLayout />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/data-processing" element={<DataProcessing />} />
      <Route path="/maintenance-records" element={<MaintenanceRecords />} />
      <Route path="/block-requests" element={<BlockRequests />} />
      <Route path="/block-planner" element={<BlockPlanner />} />
      <Route path="/train-timeline" element={<TrainTimeline />} />
      <Route path="/plans" element={<Plans />} />
      <Route path="/simulator" element={<WhatIfSimulator />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/alerts" element={<Alerts />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></WorkflowProvider></RoleProvider>
}
