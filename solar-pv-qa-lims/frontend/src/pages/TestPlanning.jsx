import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import StatusBadge from '../components/StatusBadge'
import { PageLoading } from '../components/LoadingSpinner'
import { getTestPlans } from '../utils/api'
import { formatDate, testStatusConfig, truncate } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function TestPlanning() {
  const navigate = useNavigate()
  const [testPlans, setTestPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })

  useEffect(() => {
    fetchTestPlans()
  }, [search, statusFilter, pagination.page])

  const fetchTestPlans = async () => {
    try {
      setLoading(true)
      const response = await getTestPlans({
        search: search || undefined,
        status: statusFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      })
      setTestPlans(response.data.data)
      setPagination(prev => ({ ...prev, ...response.data.pagination }))
    } catch (error) {
      toast.error('Failed to load test plans')
    } finally {
      setLoading(false)
    }
  }

  const getProgressPercent = (plan) => {
    const total = parseInt(plan.total_tests) || 0
    const completed = (parseInt(plan.passed_tests) || 0) + (parseInt(plan.failed_tests) || 0)
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Test Plans</h1>
        <p className="mt-1 text-sm text-gray-500">Manage and track test plans and results</p>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search test plans..."
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
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <button onClick={() => { setSearch(''); setStatusFilter('') }} className="btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8"><PageLoading /></div>
        ) : testPlans.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No test plans found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Standard</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lab</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {testPlans.map((plan) => {
                  const progress = getProgressPercent(plan)
                  return (
                    <tr
                      key={plan.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/test-plans/${plan.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-solar-600">{plan.plan_number}</div>
                        <div className="text-sm text-gray-900">{truncate(plan.name, 35)}</div>
                        <div className="text-xs text-gray-500">{plan.request_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {plan.standard_code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={plan.status} config={testStatusConfig} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${plan.failed_tests > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{progress}%</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {plan.passed_tests || 0} passed, {plan.failed_tests || 0} failed of {plan.total_tests || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {plan.lab_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {plan.scheduled_start ? `${formatDate(plan.scheduled_start)} - ${formatDate(plan.scheduled_end)}` : '-'}
                      </td>
                    </tr>
                  )
                })}
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
    </div>
  )
}
