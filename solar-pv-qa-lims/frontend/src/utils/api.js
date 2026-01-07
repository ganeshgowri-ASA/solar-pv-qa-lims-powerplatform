import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password })
export const register = (data) => api.post('/auth/register', data)
export const getCurrentUser = () => api.get('/auth/me')

// Service Requests
export const getServiceRequests = (params) => api.get('/service-requests', { params })
export const getServiceRequest = (id) => api.get(`/service-requests/${id}`)
export const createServiceRequest = (data) => api.post('/service-requests', data)
export const updateServiceRequest = (id, data) => api.put(`/service-requests/${id}`, data)
export const deleteServiceRequest = (id) => api.delete(`/service-requests/${id}`)
export const submitServiceRequest = (id) => api.post(`/service-requests/${id}/submit`)
export const approveServiceRequest = (id) => api.post(`/service-requests/${id}/approve`)

// Samples
export const getSamples = (params) => api.get('/samples', { params })
export const getSample = (id) => api.get(`/samples/${id}`)
export const createSample = (data) => api.post('/samples', data)
export const updateSample = (id, data) => api.put(`/samples/${id}`, data)
export const deleteSample = (id) => api.delete(`/samples/${id}`)
export const receiveSample = (id, data) => api.post(`/samples/${id}/receive`, data)
export const transferSample = (id, data) => api.post(`/samples/${id}/transfer`, data)
export const getSampleChainOfCustody = (id) => api.get(`/samples/${id}/chain-of-custody`)

// Test Plans
export const getTestPlans = (params) => api.get('/test-plans', { params })
export const getTestPlan = (id) => api.get(`/test-plans/${id}`)
export const createTestPlan = (data) => api.post('/test-plans', data)
export const updateTestPlan = (id, data) => api.put(`/test-plans/${id}`, data)
export const deleteTestPlan = (id) => api.delete(`/test-plans/${id}`)
export const addTestResult = (planId, data) => api.post(`/test-plans/${planId}/results`, data)
export const updateTestResult = (planId, resultId, data) => api.put(`/test-plans/${planId}/results/${resultId}`, data)
export const verifyTestResult = (planId, resultId, data) => api.post(`/test-plans/${planId}/results/${resultId}/verify`, data)
export const completeTestPlan = (id) => api.post(`/test-plans/${id}/complete`)
export const getTestStandards = () => api.get('/test-plans/standards/list')

// Reports
export const getReports = (params) => api.get('/reports', { params })
export const getReport = (id) => api.get(`/reports/${id}`)
export const createReport = (data) => api.post('/reports', data)
export const updateReport = (id, data) => api.put(`/reports/${id}`, data)
export const deleteReport = (id) => api.delete(`/reports/${id}`)
export const submitReport = (id) => api.post(`/reports/${id}/submit`)
export const reviewReport = (id, data) => api.post(`/reports/${id}/review`, data)
export const issueReport = (id) => api.post(`/reports/${id}/issue`)
export const downloadReport = (id) => api.get(`/reports/${id}/download`)

// Certifications
export const getCertifications = (params) => api.get('/certifications', { params })
export const getCertification = (id) => api.get(`/certifications/${id}`)
export const createCertification = (data) => api.post('/certifications', data)
export const updateCertification = (id, data) => api.put(`/certifications/${id}`, data)
export const issueCertification = (id) => api.post(`/certifications/${id}/issue`)
export const revokeCertification = (id, reason) => api.post(`/certifications/${id}/revoke`, { reason })
export const verifyCertification = (certNumber) => api.get(`/certifications/verify/${certNumber}`)
export const downloadCertification = (id) => api.get(`/certifications/${id}/download`)

// Lab Facilities
export const getLabFacilities = (params) => api.get('/lab-facilities', { params })
export const getLabFacility = (id) => api.get(`/lab-facilities/${id}`)
export const createLabFacility = (data) => api.post('/lab-facilities', data)
export const updateLabFacility = (id, data) => api.put(`/lab-facilities/${id}`, data)
export const deleteLabFacility = (id) => api.delete(`/lab-facilities/${id}`)
export const getLabWorkload = (id) => api.get(`/lab-facilities/${id}/workload`)

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats')
export const getDashboardKPIs = (period) => api.get('/dashboard/kpis', { params: { period } })
export const getRecentActivity = (limit) => api.get('/dashboard/recent-activity', { params: { limit } })
export const getStandardsSummary = () => api.get('/dashboard/standards-summary')
export const getLabUtilization = () => api.get('/dashboard/lab-utilization')
export const getUpcomingDeadlines = (days) => api.get('/dashboard/upcoming-deadlines', { params: { days } })

export default api
