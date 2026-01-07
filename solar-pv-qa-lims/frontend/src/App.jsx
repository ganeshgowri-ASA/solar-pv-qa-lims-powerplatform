import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ServiceRequests from './pages/ServiceRequests'
import ServiceRequestDetail from './pages/ServiceRequestDetail'
import SampleManagement from './pages/SampleManagement'
import SampleDetail from './pages/SampleDetail'
import TestPlanning from './pages/TestPlanning'
import TestPlanDetail from './pages/TestPlanDetail'
import Reports from './pages/Reports'
import ReportDetail from './pages/ReportDetail'
import Certifications from './pages/Certifications'
import LabFacilities from './pages/LabFacilities'
import Login from './pages/Login'

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="service-requests" element={<ServiceRequests />} />
          <Route path="service-requests/:id" element={<ServiceRequestDetail />} />
          <Route path="samples" element={<SampleManagement />} />
          <Route path="samples/:id" element={<SampleDetail />} />
          <Route path="test-plans" element={<TestPlanning />} />
          <Route path="test-plans/:id" element={<TestPlanDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="certifications" element={<Certifications />} />
          <Route path="labs" element={<LabFacilities />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
