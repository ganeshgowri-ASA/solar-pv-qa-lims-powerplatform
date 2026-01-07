import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlusIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { PageLoading } from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'
import { getServiceRequests, createServiceRequest, getLabFacilities, getTestStandards } from '../utils/api'
import { formatDate, requestStatusConfig, priorityConfig, truncate } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function ServiceRequests() {
  const navigate = useNavigate()
  const { isAuthenticated, isTechnician } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [labs, setLabs] = useState([])
  const [standards, setStandards] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    request_type: 'external',
    priority: 'normal',
    manufacturer: '',
    model_number: '',
    module_type: '',
    rated_power_w: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [search, statusFilter, typeFilter, pagination.page])

  useEffect(() => {
    if (showCreateModal) {
      fetchFormData()
    }
  }, [showCreateModal])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await getServiceRequests({
        search: search || undefined,
        status: statusFilter || undefined,
        request_type: typeFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      })
      setRequests(response.data.data)
      setPagination(prev => ({ ...prev, ...response.data.pagination }))
    } catch (error) {
      toast.error('Failed to load service requests')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFormData = async () => {
    try {
      const [labsRes, standardsRes] = await Promise.all([
        getLabFacilities({ is_active: true }),
        getTestStandards(),
      ])
      setLabs(labsRes.data.data)
      setStandards(standardsRes.data.data)
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const response = await createServiceRequest({
        ...formData,
        rated_power_w: formData.rated_power_w ? parseFloat(formData.rated_power_w) : undefined,
      })
      toast.success('Service request created successfully')
      setShowCreateModal(false)
      setFormData({
        title: '',
        description: '',
        request_type: 'external',
        priority: 'normal',
        manufacturer: '',
        model_number: '',
        module_type: '',
        rated_power_w: '',
      })
      navigate(`/service-requests/${response.data.data.id}`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create service request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage testing and certification requests
          </p>
        </div>
        {isAuthenticated && isTechnician && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary mt-4 sm:mt-0"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Request
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
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
            <option value="submitted">Submitted</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
          >
            <option value="">All Types</option>
            <option value="internal">Internal</option>
            <option value="external">External</option>
          </select>
          <button
            onClick={() => {
              setSearch('')
              setStatusFilter('')
              setTypeFilter('')
            }}
            className="btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8">
            <PageLoading />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No service requests found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lab</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/service-requests/${request.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-solar-600 hover:text-solar-800">
                        {request.request_number}
                      </div>
                      <div className="text-sm text-gray-900">{truncate(request.title, 40)}</div>
                      <div className="text-xs text-gray-500">{request.manufacturer}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.customer_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        request.request_type === 'internal' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {request.request_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={request.status} config={requestStatusConfig} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={request.priority} config={priorityConfig} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.lab_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Service Request"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              placeholder="e.g., IEC 61215 Certification - Module XYZ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Request Type *</label>
              <select
                value={formData.request_type}
                onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              >
                <option value="external">External (Customer)</option>
                <option value="internal">Internal (R&D)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Model Number</label>
              <input
                type="text"
                value={formData.model_number}
                onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Module Type</label>
              <select
                value={formData.module_type}
                onChange={(e) => setFormData({ ...formData, module_type: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              >
                <option value="">Select type...</option>
                <option value="mono-Si">Monocrystalline Silicon</option>
                <option value="poly-Si">Polycrystalline Silicon</option>
                <option value="thin-film">Thin Film</option>
                <option value="bifacial">Bifacial</option>
                <option value="HJT">Heterojunction (HJT)</option>
                <option value="TOPCon">TOPCon</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rated Power (W)</label>
              <input
                type="number"
                step="0.01"
                value={formData.rated_power_w}
                onChange={(e) => setFormData({ ...formData, rated_power_w: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
                placeholder="e.g., 450"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
