import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, PlusIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { PageLoading } from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'
import { getReports, createReport, getServiceRequests, getTestPlans } from '../utils/api'
import { formatDate, reportStatusConfig, resultStatusConfig, truncate } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function Reports() {
  const navigate = useNavigate()
  const { isAuthenticated, isTechnician } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  const [showCreate, setShowCreate] = useState(false)
  const [serviceRequests, setServiceRequests] = useState([])
  const [testPlans, setTestPlans] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    report_type: 'test_report',
    service_request_id: '',
    test_plan_id: '',
    executive_summary: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [search, statusFilter, pagination.page])

  useEffect(() => {
    if (showCreate) {
      fetchFormData()
    }
  }, [showCreate])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await getReports({
        search: search || undefined,
        status: statusFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      })
      setReports(response.data.data)
      setPagination(prev => ({ ...prev, ...response.data.pagination }))
    } catch (error) {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const fetchFormData = async () => {
    try {
      const [srRes, tpRes] = await Promise.all([
        getServiceRequests({ status: 'in_progress', limit: 100 }),
        getTestPlans({ status: 'completed', limit: 100 }),
      ])
      setServiceRequests(srRes.data.data)
      setTestPlans(tpRes.data.data)
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const response = await createReport({
        ...formData,
        service_request_id: formData.service_request_id || undefined,
        test_plan_id: formData.test_plan_id || undefined,
      })
      toast.success('Report created successfully')
      setShowCreate(false)
      navigate(`/reports/${response.data.data.id}`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Generate and manage test reports</p>
        </div>
        {isAuthenticated && isTechnician && (
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 sm:mt-0">
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />Generate Report
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="review">In Review</option>
            <option value="approved">Approved</option>
            <option value="issued">Issued</option>
          </select>
          <button onClick={() => { setSearch(''); setStatusFilter('') }} className="btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8"><PageLoading /></div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No reports found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prepared By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/reports/${report.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-solar-600">{report.report_number}</div>
                      <div className="text-sm text-gray-900">{truncate(report.title, 35)}</div>
                      <div className="text-xs text-gray-500">{report.request_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {report.report_type?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={report.status} config={reportStatusConfig} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.overall_result && (
                        <StatusBadge status={report.overall_result} config={resultStatusConfig} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.prepared_by_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="text-sm text-gray-700">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn-secondary disabled:opacity-50"
              >Previous</button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary disabled:opacity-50"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Generate Report" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Report Type *</label>
            <select
              value={formData.report_type}
              onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            >
              <option value="test_report">Test Report</option>
              <option value="summary">Summary Report</option>
              <option value="calibration">Calibration Report</option>
              <option value="audit">Audit Report</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Service Request</label>
            <select
              value={formData.service_request_id}
              onChange={(e) => setFormData({ ...formData, service_request_id: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            >
              <option value="">Select service request...</option>
              {serviceRequests.map((sr) => (
                <option key={sr.id} value={sr.id}>{sr.request_number} - {sr.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Test Plan</label>
            <select
              value={formData.test_plan_id}
              onChange={(e) => setFormData({ ...formData, test_plan_id: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            >
              <option value="">Select test plan...</option>
              {testPlans.map((tp) => (
                <option key={tp.id} value={tp.id}>{tp.plan_number} - {tp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Executive Summary</label>
            <textarea
              rows={3}
              value={formData.executive_summary}
              onChange={(e) => setFormData({ ...formData, executive_summary: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
