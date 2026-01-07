import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { PageLoading } from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'
import { getTestPlan, addTestResult, updateTestResult, completeTestPlan, updateTestPlan } from '../utils/api'
import { formatDate, formatDateTime, testStatusConfig, resultStatusConfig } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function TestPlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isTechnician, isManager } = useAuth()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddResult, setShowAddResult] = useState(false)
  const [resultForm, setResultForm] = useState({ test_name: '', test_code: '', status: 'pending', observations: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchPlan()
  }, [id])

  const fetchPlan = async () => {
    try {
      setLoading(true)
      const response = await getTestPlan(id)
      setPlan(response.data)
    } catch (error) {
      toast.error('Failed to load test plan')
      navigate('/test-plans')
    } finally {
      setLoading(false)
    }
  }

  const handleStartPlan = async () => {
    try {
      await updateTestPlan(id, { status: 'in_progress' })
      toast.success('Test plan started')
      fetchPlan()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start test plan')
    }
  }

  const handleCompletePlan = async () => {
    try {
      await completeTestPlan(id)
      toast.success('Test plan completed')
      fetchPlan()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to complete test plan')
    }
  }

  const handleAddResult = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await addTestResult(id, resultForm)
      toast.success('Test result added')
      setShowAddResult(false)
      setResultForm({ test_name: '', test_code: '', status: 'pending', observations: '' })
      fetchPlan()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add test result')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateResultStatus = async (resultId, status) => {
    try {
      await updateTestResult(id, resultId, { status })
      toast.success('Result updated')
      fetchPlan()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update result')
    }
  }

  if (loading) return <PageLoading />
  if (!plan) return null

  const totalTests = plan.test_results?.length || 0
  const passedTests = plan.test_results?.filter(r => r.status === 'pass').length || 0
  const failedTests = plan.test_results?.filter(r => r.status === 'fail').length || 0
  const pendingTests = plan.test_results?.filter(r => r.status === 'pending').length || 0
  const progress = totalTests > 0 ? Math.round(((passedTests + failedTests) / totalTests) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/test-plans')} className="btn-secondary p-2">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{plan.plan_number}</h1>
            <p className="text-sm text-gray-500">{plan.name}</p>
          </div>
        </div>
        <StatusBadge status={plan.status} config={testStatusConfig} />
      </div>

      {isAuthenticated && isTechnician && (
        <div className="flex flex-wrap gap-2">
          {plan.status === 'pending' && (
            <button onClick={handleStartPlan} className="btn-primary">Start Testing</button>
          )}
          {plan.status === 'in_progress' && (
            <>
              <button onClick={() => setShowAddResult(true)} className="btn-primary">
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />Add Test Result
              </button>
              {isManager && pendingTests === 0 && (
                <button onClick={handleCompletePlan} className="btn-secondary">
                  <CheckIcon className="-ml-1 mr-2 h-5 w-5" />Complete Plan
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Test Progress</h3>
            <div className="flex items-center mb-4">
              <div className="flex-1 bg-gray-200 rounded-full h-4 mr-4">
                <div
                  className={`h-4 rounded-full ${failedTests > 0 ? 'bg-gradient-to-r from-green-500 to-red-500' : 'bg-green-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-lg font-semibold">{progress}%</span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalTests}</p>
                <p className="text-sm text-gray-500">Total Tests</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{passedTests}</p>
                <p className="text-sm text-gray-500">Passed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{failedTests}</p>
                <p className="text-sm text-gray-500">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{pendingTests}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Test Results</h3>
            </div>
            {plan.test_results?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performed By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      {isAuthenticated && isTechnician && plan.status === 'in_progress' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {plan.test_results.map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{result.test_name}</div>
                          <div className="text-xs text-gray-500">{result.test_code}</div>
                          {result.observations && (
                            <div className="text-xs text-gray-400 mt-1">{result.observations}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={result.status} config={resultStatusConfig} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{result.performed_by_name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(result.end_time) || '-'}</td>
                        {isAuthenticated && isTechnician && plan.status === 'in_progress' && (
                          <td className="px-6 py-4">
                            {result.status === 'pending' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleUpdateResultStatus(result.id, 'pass')}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  title="Mark Pass"
                                >
                                  <CheckIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleUpdateResultStatus(result.id, 'fail')}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Mark Fail"
                                >
                                  <XMarkIcon className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">No test results yet</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Plan Details</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Standard</dt>
                  <dd className="mt-1 text-sm text-gray-900">{plan.standard_code || '-'}</dd>
                  <dd className="text-xs text-gray-500">{plan.standard_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Service Request</dt>
                  <dd className="mt-1 text-sm text-solar-600 cursor-pointer hover:underline" onClick={() => navigate(`/service-requests/${plan.service_request_id}`)}>
                    {plan.request_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Sample</dt>
                  <dd className="mt-1 text-sm text-gray-900">{plan.sample_number || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Lab</dt>
                  <dd className="mt-1 text-sm text-gray-900">{plan.lab_name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Lead Technician</dt>
                  <dd className="mt-1 text-sm text-gray-900">{plan.lead_technician_name || '-'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Schedule</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Scheduled Start</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(plan.scheduled_start) || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Scheduled End</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(plan.scheduled_end) || '-'}</dd>
                </div>
                {plan.actual_start && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Actual Start</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDateTime(plan.actual_start)}</dd>
                  </div>
                )}
                {plan.actual_end && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Actual End</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDateTime(plan.actual_end)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showAddResult} onClose={() => setShowAddResult(false)} title="Add Test Result">
        <form onSubmit={handleAddResult} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Test Name *</label>
            <input
              type="text"
              required
              value={resultForm.test_name}
              onChange={(e) => setResultForm({ ...resultForm, test_name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              placeholder="e.g., Visual Inspection"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Test Code</label>
            <input
              type="text"
              value={resultForm.test_code}
              onChange={(e) => setResultForm({ ...resultForm, test_code: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              placeholder="e.g., MQT 01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status *</label>
            <select
              value={resultForm.status}
              onChange={(e) => setResultForm({ ...resultForm, status: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            >
              <option value="pending">Pending</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="conditional">Conditional</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Observations</label>
            <textarea
              rows={2}
              value={resultForm.observations}
              onChange={(e) => setResultForm({ ...resultForm, observations: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowAddResult(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Result'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
