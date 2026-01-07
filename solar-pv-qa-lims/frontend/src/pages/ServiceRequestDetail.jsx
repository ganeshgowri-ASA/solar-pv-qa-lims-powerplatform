import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { PageLoading } from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'
import {
  getServiceRequest,
  updateServiceRequest,
  deleteServiceRequest,
  submitServiceRequest,
  approveServiceRequest,
  createSample,
  createTestPlan,
  getTestStandards,
} from '../utils/api'
import { formatDate, formatDateTime, requestStatusConfig, priorityConfig, sampleStatusConfig, testStatusConfig } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function ServiceRequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isManager, isTechnician } = useAuth()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddSample, setShowAddSample] = useState(false)
  const [showAddTestPlan, setShowAddTestPlan] = useState(false)
  const [standards, setStandards] = useState([])
  const [sampleForm, setSampleForm] = useState({
    description: '',
    sample_type: 'module',
    quantity: 1,
    serial_number: '',
    batch_number: '',
  })
  const [testPlanForm, setTestPlanForm] = useState({
    name: '',
    description: '',
    test_standard_id: '',
    sample_id: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchRequest()
    fetchStandards()
  }, [id])

  const fetchRequest = async () => {
    try {
      setLoading(true)
      const response = await getServiceRequest(id)
      setRequest(response.data)
    } catch (error) {
      toast.error('Failed to load service request')
      navigate('/service-requests')
    } finally {
      setLoading(false)
    }
  }

  const fetchStandards = async () => {
    try {
      const response = await getTestStandards()
      setStandards(response.data.data)
    } catch (error) {
      console.error(error)
    }
  }

  const handleSubmit = async () => {
    try {
      await submitServiceRequest(id)
      toast.success('Request submitted for review')
      fetchRequest()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit request')
    }
  }

  const handleApprove = async () => {
    try {
      await approveServiceRequest(id)
      toast.success('Request approved')
      fetchRequest()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve request')
    }
  }

  const handleStartProgress = async () => {
    try {
      await updateServiceRequest(id, { status: 'in_progress' })
      toast.success('Request moved to in progress')
      fetchRequest()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update request')
    }
  }

  const handleComplete = async () => {
    try {
      await updateServiceRequest(id, { status: 'completed', actual_completion: new Date().toISOString() })
      toast.success('Request completed')
      fetchRequest()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to complete request')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this request?')) return
    try {
      await deleteServiceRequest(id)
      toast.success('Request deleted')
      navigate('/service-requests')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete request')
    }
  }

  const handleAddSample = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createSample({
        service_request_id: id,
        ...sampleForm,
        quantity: parseInt(sampleForm.quantity),
      })
      toast.success('Sample added successfully')
      setShowAddSample(false)
      setSampleForm({ description: '', sample_type: 'module', quantity: 1, serial_number: '', batch_number: '' })
      fetchRequest()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add sample')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddTestPlan = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createTestPlan({
        service_request_id: id,
        ...testPlanForm,
      })
      toast.success('Test plan created successfully')
      setShowAddTestPlan(false)
      setTestPlanForm({ name: '', description: '', test_standard_id: '', sample_id: '' })
      fetchRequest()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create test plan')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <PageLoading />
  }

  if (!request) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/service-requests')} className="btn-secondary p-2">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{request.request_number}</h1>
            <p className="text-sm text-gray-500">{request.title}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <StatusBadge status={request.status} config={requestStatusConfig} />
          <StatusBadge status={request.priority} config={priorityConfig} />
        </div>
      </div>

      {/* Action Buttons */}
      {isAuthenticated && (
        <div className="flex flex-wrap gap-2">
          {request.status === 'draft' && (
            <button onClick={handleSubmit} className="btn-primary">
              <CheckIcon className="-ml-1 mr-2 h-5 w-5" />
              Submit for Review
            </button>
          )}
          {['submitted', 'in_review'].includes(request.status) && isManager && (
            <button onClick={handleApprove} className="btn-primary">
              <CheckIcon className="-ml-1 mr-2 h-5 w-5" />
              Approve
            </button>
          )}
          {request.status === 'approved' && isTechnician && (
            <button onClick={handleStartProgress} className="btn-primary">
              Start Testing
            </button>
          )}
          {request.status === 'in_progress' && isManager && (
            <button onClick={handleComplete} className="btn-primary">
              Mark Complete
            </button>
          )}
          {['draft', 'submitted'].includes(request.status) && isManager && (
            <button onClick={handleDelete} className="btn-danger">
              <TrashIcon className="-ml-1 mr-2 h-5 w-5" />
              Delete
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Info */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Request Details</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Request Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{request.request_type}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Customer</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.company_name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Manufacturer</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.manufacturer || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Model Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.model_number || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Module Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.module_type || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Rated Power</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.rated_power_w ? `${request.rated_power_w}W` : '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned Lab</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.lab_name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.assigned_to_name || '-'}</dd>
                </div>
              </dl>
              {request.description && (
                <div className="mt-6">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{request.description}</dd>
                </div>
              )}
            </div>
          </div>

          {/* Samples */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Samples ({request.samples?.length || 0})</h3>
              {isAuthenticated && isTechnician && !['completed', 'cancelled'].includes(request.status) && (
                <button onClick={() => setShowAddSample(true)} className="btn-primary text-sm">
                  <PlusIcon className="-ml-1 mr-1 h-4 w-4" />
                  Add Sample
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              {request.samples?.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sample ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {request.samples.map((sample) => (
                      <tr key={sample.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/samples/${sample.id}`)}>
                        <td className="px-6 py-4 text-sm font-medium text-solar-600">{sample.sample_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 capitalize">{sample.sample_type}</td>
                        <td className="px-6 py-4"><StatusBadge status={sample.status} config={sampleStatusConfig} /></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{sample.serial_number || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">No samples registered</div>
              )}
            </div>
          </div>

          {/* Test Plans */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Test Plans ({request.test_plans?.length || 0})</h3>
              {isAuthenticated && isTechnician && !['draft', 'completed', 'cancelled'].includes(request.status) && (
                <button onClick={() => setShowAddTestPlan(true)} className="btn-primary text-sm">
                  <PlusIcon className="-ml-1 mr-1 h-4 w-4" />
                  Add Test Plan
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              {request.test_plans?.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Standard</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {request.test_plans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/test-plans/${plan.id}`)}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-solar-600">{plan.plan_number}</div>
                          <div className="text-sm text-gray-500">{plan.name}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{plan.standard_code || '-'}</td>
                        <td className="px-6 py-4"><StatusBadge status={plan.status} config={testStatusConfig} /></td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {plan.scheduled_start ? `${formatDate(plan.scheduled_start)} - ${formatDate(plan.scheduled_end)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">No test plans created</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Timeline</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(request.created_at)}</dd>
                  <dd className="text-xs text-gray-500">by {request.created_by_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Requested Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(request.requested_date) || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estimated Completion</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(request.estimated_completion) || '-'}</dd>
                </div>
                {request.actual_completion && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Actual Completion</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(request.actual_completion)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(request.updated_at)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Requested Standards */}
          {request.requested_standards_info?.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Requested Standards</h3>
              </div>
              <ul className="divide-y divide-gray-200">
                {request.requested_standards_info.map((std) => (
                  <li key={std.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{std.standard_code}</p>
                    <p className="text-xs text-gray-500">{std.name}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Financial Info */}
          {(request.quoted_price || request.po_number) && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Financial</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <dl className="space-y-4">
                  {request.quoted_price && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Quoted Price</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: request.currency || 'USD' }).format(request.quoted_price)}
                      </dd>
                    </div>
                  )}
                  {request.po_number && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">PO Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{request.po_number}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Sample Modal */}
      <Modal isOpen={showAddSample} onClose={() => setShowAddSample(false)} title="Add Sample">
        <form onSubmit={handleAddSample} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sample Type</label>
            <select
              value={sampleForm.sample_type}
              onChange={(e) => setSampleForm({ ...sampleForm, sample_type: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            >
              <option value="module">Module</option>
              <option value="cell">Cell</option>
              <option value="component">Component</option>
              <option value="material">Material</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={2}
              value={sampleForm.description}
              onChange={(e) => setSampleForm({ ...sampleForm, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Serial Number</label>
              <input
                type="text"
                value={sampleForm.serial_number}
                onChange={(e) => setSampleForm({ ...sampleForm, serial_number: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Number</label>
              <input
                type="text"
                value={sampleForm.batch_number}
                onChange={(e) => setSampleForm({ ...sampleForm, batch_number: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowAddSample(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Sample'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Test Plan Modal */}
      <Modal isOpen={showAddTestPlan} onClose={() => setShowAddTestPlan(false)} title="Create Test Plan">
        <form onSubmit={handleAddTestPlan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              required
              value={testPlanForm.name}
              onChange={(e) => setTestPlanForm({ ...testPlanForm, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              placeholder="e.g., IEC 61215 Performance Testing"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Test Standard</label>
            <select
              value={testPlanForm.test_standard_id}
              onChange={(e) => setTestPlanForm({ ...testPlanForm, test_standard_id: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            >
              <option value="">Select standard...</option>
              {standards.map((std) => (
                <option key={std.id} value={std.id}>{std.standard_code} - {std.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sample</label>
            <select
              value={testPlanForm.sample_id}
              onChange={(e) => setTestPlanForm({ ...testPlanForm, sample_id: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            >
              <option value="">Select sample...</option>
              {request.samples?.map((sample) => (
                <option key={sample.id} value={sample.id}>{sample.sample_id} - {sample.description || sample.sample_type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={2}
              value={testPlanForm.description}
              onChange={(e) => setTestPlanForm({ ...testPlanForm, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowAddTestPlan(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Test Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
