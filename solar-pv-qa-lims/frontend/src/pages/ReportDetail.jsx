import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, DocumentArrowDownIcon, CheckIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import StatusBadge from '../components/StatusBadge'
import { PageLoading } from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'
import { getReport, submitReport, reviewReport, issueReport, downloadReport } from '../utils/api'
import { formatDate, formatDateTime, reportStatusConfig, resultStatusConfig } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isManager } = useAuth()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReport()
  }, [id])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const response = await getReport(id)
      setReport(response.data)
    } catch (error) {
      toast.error('Failed to load report')
      navigate('/reports')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      await submitReport(id)
      toast.success('Report submitted for review')
      fetchReport()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit report')
    }
  }

  const handleApprove = async () => {
    try {
      await reviewReport(id, { approved: true })
      toast.success('Report approved')
      fetchReport()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve report')
    }
  }

  const handleReject = async () => {
    try {
      await reviewReport(id, { approved: false, notes: 'Returned for revision' })
      toast.success('Report returned for revision')
      fetchReport()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject report')
    }
  }

  const handleIssue = async () => {
    try {
      await issueReport(id)
      toast.success('Report issued')
      fetchReport()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to issue report')
    }
  }

  const handleDownload = async () => {
    try {
      const response = await downloadReport(id)
      // In production, this would download a PDF
      console.log('Report data:', response.data)
      toast.success('Report downloaded (check console for data)')
    } catch (error) {
      toast.error('Failed to download report')
    }
  }

  if (loading) return <PageLoading />
  if (!report) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/reports')} className="btn-secondary p-2">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.report_number}</h1>
            <p className="text-sm text-gray-500">{report.title}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <StatusBadge status={report.status} config={reportStatusConfig} />
          {report.overall_result && (
            <StatusBadge status={report.overall_result} config={resultStatusConfig} />
          )}
        </div>
      </div>

      {isAuthenticated && (
        <div className="flex flex-wrap gap-2">
          {report.status === 'draft' && (
            <button onClick={handleSubmit} className="btn-primary">
              <PaperAirplaneIcon className="-ml-1 mr-2 h-5 w-5" />Submit for Review
            </button>
          )}
          {report.status === 'review' && isManager && (
            <>
              <button onClick={handleApprove} className="btn-primary">
                <CheckIcon className="-ml-1 mr-2 h-5 w-5" />Approve
              </button>
              <button onClick={handleReject} className="btn-secondary">Return for Revision</button>
            </>
          )}
          {report.status === 'approved' && isManager && (
            <button onClick={handleIssue} className="btn-primary">Issue Report</button>
          )}
          <button onClick={handleDownload} className="btn-secondary">
            <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />Download
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Report Content</h3>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-6">
              {report.executive_summary && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Executive Summary</h4>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{report.executive_summary}</p>
                </div>
              )}
              {report.conclusions && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Conclusions</h4>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{report.conclusions}</p>
                </div>
              )}
              {report.recommendations && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Recommendations</h4>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{report.recommendations}</p>
                </div>
              )}
              {!report.executive_summary && !report.conclusions && !report.recommendations && (
                <p className="text-gray-500 text-center py-4">No content yet</p>
              )}
            </div>
          </div>

          {report.test_results?.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Test Results Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {report.test_results.map((result) => (
                      <tr key={result.id}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{result.test_name}</div>
                          <div className="text-xs text-gray-500">{result.test_code}</div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={result.status} config={resultStatusConfig} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{result.performed_by_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Report Details</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Report Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{report.report_type?.replace('_', ' ')}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Version</dt>
                  <dd className="mt-1 text-sm text-gray-900">{report.version}</dd>
                </div>
                {report.request_number && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Service Request</dt>
                    <dd className="mt-1 text-sm text-solar-600 cursor-pointer hover:underline" onClick={() => navigate(`/service-requests/${report.service_request_id}`)}>
                      {report.request_number}
                    </dd>
                  </div>
                )}
                {report.plan_number && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Test Plan</dt>
                    <dd className="mt-1 text-sm text-solar-600 cursor-pointer hover:underline" onClick={() => navigate(`/test-plans/${report.test_plan_id}`)}>
                      {report.plan_number}
                    </dd>
                  </div>
                )}
                {report.standard_code && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Standard</dt>
                    <dd className="mt-1 text-sm text-gray-900">{report.standard_code}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Approval Workflow</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Prepared By</dt>
                  <dd className="mt-1 text-sm text-gray-900">{report.prepared_by_name || '-'}</dd>
                </div>
                {report.reviewed_by_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Reviewed By</dt>
                    <dd className="mt-1 text-sm text-gray-900">{report.reviewed_by_name}</dd>
                    <dd className="text-xs text-gray-500">{formatDateTime(report.review_date)}</dd>
                  </div>
                )}
                {report.approved_by_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Approved By</dt>
                    <dd className="mt-1 text-sm text-gray-900">{report.approved_by_name}</dd>
                    <dd className="text-xs text-gray-500">{formatDateTime(report.approval_date)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(report.created_at)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
