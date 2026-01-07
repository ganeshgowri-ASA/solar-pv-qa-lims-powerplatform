import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  DocumentTextIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatsCard from '../components/StatsCard'
import StatusBadge from '../components/StatusBadge'
import { PageLoading } from '../components/LoadingSpinner'
import {
  getDashboardStats,
  getDashboardKPIs,
  getRecentActivity,
  getUpcomingDeadlines,
  getLabUtilization,
} from '../utils/api'
import {
  formatDate,
  formatRelativeTime,
  requestStatusConfig,
  sampleStatusConfig,
  testStatusConfig,
  resultStatusConfig,
  formatPercentage,
} from '../utils/helpers'
import toast from 'react-hot-toast'

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [kpis, setKPIs] = useState(null)
  const [activity, setActivity] = useState([])
  const [deadlines, setDeadlines] = useState([])
  const [labUtilization, setLabUtilization] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, kpisRes, activityRes, deadlinesRes, labsRes] = await Promise.all([
        getDashboardStats(),
        getDashboardKPIs(30),
        getRecentActivity(10),
        getUpcomingDeadlines(14),
        getLabUtilization(),
      ])

      setStats(statsRes.data)
      setKPIs(kpisRes.data)
      setActivity(activityRes.data.activity)
      setDeadlines(deadlinesRes.data.deadlines)
      setLabUtilization(labsRes.data.labs)
    } catch (error) {
      toast.error('Failed to load dashboard data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <PageLoading />
  }

  const requestChartData = stats ? [
    { name: 'Draft', value: parseInt(stats.service_requests.draft) },
    { name: 'In Progress', value: parseInt(stats.service_requests.in_progress) },
    { name: 'Completed', value: parseInt(stats.service_requests.completed) },
    { name: 'Submitted', value: parseInt(stats.service_requests.submitted) },
  ].filter(d => d.value > 0) : []

  const testResultsData = stats ? [
    { name: 'Passed', value: parseInt(stats.test_results.passed), color: '#10b981' },
    { name: 'Failed', value: parseInt(stats.test_results.failed), color: '#ef4444' },
    { name: 'Pending', value: parseInt(stats.test_results.pending), color: '#9ca3af' },
  ].filter(d => d.value > 0) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Solar PV QA Laboratory Information Management System
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Requests"
          value={kpis?.current_workload?.active_requests || 0}
          icon={DocumentTextIcon}
          color="solar"
        />
        <StatsCard
          title="Test Pass Rate"
          value={formatPercentage(kpis?.kpis?.test_pass_rate)}
          icon={CheckCircleIcon}
          color="green"
        />
        <StatsCard
          title="Avg. Turnaround"
          value={`${kpis?.kpis?.avg_turnaround_days || 0} days`}
          icon={ClockIcon}
          color="blue"
        />
        <StatsCard
          title="Certificates Issued"
          value={kpis?.kpis?.certificates_issued || 0}
          subtitle="Last 30 days"
          icon={ShieldCheckIcon}
          color="indigo"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Request Status Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Service Requests by Status</h3>
          {requestChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={requestChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Test Results Pie Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results Distribution</h3>
          {testResultsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={testResultsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {testResultsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              No test results yet
            </div>
          )}
        </div>
      </div>

      {/* Activity and Deadlines */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Activity</h3>
          </div>
          <ul className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
            {activity.length > 0 ? activity.map((item, index) => (
              <li key={index} className="px-4 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {item.type === 'service_request' && <DocumentTextIcon className="h-5 w-5 text-gray-400" />}
                    {item.type === 'sample' && <BeakerIcon className="h-5 w-5 text-gray-400" />}
                    {item.type === 'test_result' && <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400" />}
                    {item.type === 'certification' && <ShieldCheckIcon className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-sm text-gray-500">{item.subtitle}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge
                      status={item.status}
                      config={
                        item.type === 'service_request' ? requestStatusConfig :
                        item.type === 'sample' ? sampleStatusConfig :
                        item.type === 'test_result' ? resultStatusConfig :
                        testStatusConfig
                      }
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-400">{formatRelativeTime(item.created_at)}</p>
              </li>
            )) : (
              <li className="px-4 py-8 text-center text-gray-500">No recent activity</li>
            )}
          </ul>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Upcoming Deadlines</h3>
          </div>
          <ul className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
            {deadlines.length > 0 ? deadlines.slice(0, 10).map((item, index) => {
              const daysUntil = Math.ceil((new Date(item.deadline) - new Date()) / (1000 * 60 * 60 * 24))
              const isUrgent = daysUntil <= 3

              return (
                <li key={index} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className={`flex-shrink-0 p-2 rounded-full ${isUrgent ? 'bg-red-100' : 'bg-yellow-100'}`}>
                      {isUrgent ? (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                      ) : (
                        <ClockIcon className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.title || item.reference}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">{item.type.replace('_', ' ')}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-sm font-medium ${isUrgent ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatDate(item.deadline)}
                      </p>
                      <p className={`text-xs ${isUrgent ? 'text-red-500' : 'text-gray-500'}`}>
                        {daysUntil <= 0 ? 'Overdue!' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`}
                      </p>
                    </div>
                  </div>
                </li>
              )
            }) : (
              <li className="px-4 py-8 text-center text-gray-500">No upcoming deadlines</li>
            )}
          </ul>
        </div>
      </div>

      {/* Lab Utilization */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Lab Utilization</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lab</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Requests</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Tests</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Samples</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {labUtilization.length > 0 ? labUtilization.map((lab) => (
                <tr key={lab.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lab.name}</div>
                    <div className="text-sm text-gray-500">{lab.code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      lab.facility_type === 'internal' ? 'bg-green-100 text-green-800' :
                      lab.facility_type === 'external' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {lab.facility_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lab.active_requests || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lab.active_test_plans || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lab.samples_in_lab || 0}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No lab facilities found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-solar-600">{stats?.service_requests?.total || 0}</p>
            <p className="text-sm text-gray-500">Total Requests</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{stats?.samples?.total || 0}</p>
            <p className="text-sm text-gray-500">Total Samples</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">{stats?.test_plans?.total || 0}</p>
            <p className="text-sm text-gray-500">Test Plans</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{stats?.test_results?.passed || 0}</p>
            <p className="text-sm text-gray-500">Tests Passed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{stats?.certifications?.issued || 0}</p>
            <p className="text-sm text-gray-500">Certificates</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">{stats?.labs?.active || 0}</p>
            <p className="text-sm text-gray-500">Active Labs</p>
          </div>
        </div>
      </div>
    </div>
  )
}
