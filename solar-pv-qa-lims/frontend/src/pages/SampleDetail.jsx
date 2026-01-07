import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, MapPinIcon } from '@heroicons/react/24/outline'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { PageLoading } from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'
import { getSample, getSampleChainOfCustody, receiveSample, transferSample, updateSample } from '../utils/api'
import { formatDate, formatDateTime, sampleStatusConfig, resultStatusConfig } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function SampleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isTechnician } = useAuth()
  const [sample, setSample] = useState(null)
  const [chainOfCustody, setChainOfCustody] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReceive, setShowReceive] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [receiveForm, setReceiveForm] = useState({ receiving_condition: 'good', storage_location: '', condition_notes: '' })
  const [transferForm, setTransferForm] = useState({ to_location: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [sampleRes, cocRes] = await Promise.all([
        getSample(id),
        getSampleChainOfCustody(id),
      ])
      setSample(sampleRes.data)
      setChainOfCustody(cocRes.data.chain_of_custody)
    } catch (error) {
      toast.error('Failed to load sample')
      navigate('/samples')
    } finally {
      setLoading(false)
    }
  }

  const handleReceive = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await receiveSample(id, receiveForm)
      toast.success('Sample received successfully')
      setShowReceive(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to receive sample')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTransfer = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await transferSample(id, transferForm)
      toast.success('Sample transferred successfully')
      setShowTransfer(false)
      setTransferForm({ to_location: '', notes: '' })
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to transfer sample')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoading />
  if (!sample) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/samples')} className="btn-secondary p-2">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sample.sample_id}</h1>
            <p className="text-sm text-gray-500">{sample.description || sample.sample_type}</p>
          </div>
        </div>
        <StatusBadge status={sample.status} config={sampleStatusConfig} />
      </div>

      {/* Actions */}
      {isAuthenticated && isTechnician && (
        <div className="flex flex-wrap gap-2">
          {sample.status === 'registered' && (
            <button onClick={() => setShowReceive(true)} className="btn-primary">
              Receive Sample
            </button>
          )}
          {['received', 'in_testing', 'tested'].includes(sample.status) && (
            <button onClick={() => setShowTransfer(true)} className="btn-secondary">
              <MapPinIcon className="-ml-1 mr-2 h-5 w-5" />
              Transfer Location
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Sample Information</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Sample Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{sample.sample_type}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                  <dd className="mt-1 text-sm text-gray-900">{sample.quantity}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{sample.serial_number || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Batch Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{sample.batch_number || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Service Request</dt>
                  <dd className="mt-1 text-sm text-solar-600 cursor-pointer hover:underline" onClick={() => navigate(`/service-requests/${sample.service_request_id}`)}>
                    {sample.request_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Storage Location</dt>
                  <dd className="mt-1 text-sm text-gray-900">{sample.storage_location || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Receiving Condition</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{sample.receiving_condition || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Received By</dt>
                  <dd className="mt-1 text-sm text-gray-900">{sample.received_by_name || '-'}</dd>
                </div>
              </dl>
              {sample.condition_notes && (
                <div className="mt-6">
                  <dt className="text-sm font-medium text-gray-500">Condition Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">{sample.condition_notes}</dd>
                </div>
              )}
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Test Results</h3>
            </div>
            {sample.test_results?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sample.test_results.map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{result.test_name}</div>
                          <div className="text-xs text-gray-500">{result.test_code}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{result.plan_number}</td>
                        <td className="px-6 py-4"><StatusBadge status={result.status} config={resultStatusConfig} /></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(result.end_time)}</td>
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

        {/* Sidebar - Chain of Custody */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Chain of Custody</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {chainOfCustody.length > 0 ? (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {chainOfCustody.map((event, idx) => (
                      <li key={event.id}>
                        <div className="relative pb-8">
                          {idx !== chainOfCustody.length - 1 && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-solar-100 flex items-center justify-center ring-8 ring-white">
                                <MapPinIcon className="h-4 w-4 text-solar-600" />
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                              <div>
                                <p className="text-sm text-gray-900 capitalize font-medium">{event.action}</p>
                                {event.from_location && (
                                  <p className="text-xs text-gray-500">From: {event.from_location}</p>
                                )}
                                {event.to_location && (
                                  <p className="text-xs text-gray-500">To: {event.to_location}</p>
                                )}
                                {event.notes && (
                                  <p className="text-xs text-gray-500 mt-1">{event.notes}</p>
                                )}
                                <p className="text-xs text-gray-400">By: {event.performed_by_name}</p>
                              </div>
                              <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                                {formatDateTime(event.timestamp)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-gray-500 text-center">No custody events</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Timeline</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Registered</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(sample.created_at)}</dd>
                </div>
                {sample.received_date && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Received</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDateTime(sample.received_date)}</dd>
                  </div>
                )}
                {sample.manufacturing_date && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Manufacturing Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(sample.manufacturing_date)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Receive Modal */}
      <Modal isOpen={showReceive} onClose={() => setShowReceive(false)} title="Receive Sample">
        <form onSubmit={handleReceive} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Receiving Condition *</label>
            <select
              required
              value={receiveForm.receiving_condition}
              onChange={(e) => setReceiveForm({ ...receiveForm, receiving_condition: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            >
              <option value="good">Good</option>
              <option value="damaged">Damaged</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Storage Location *</label>
            <input
              type="text"
              required
              value={receiveForm.storage_location}
              onChange={(e) => setReceiveForm({ ...receiveForm, storage_location: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              placeholder="e.g., Lab A - Rack 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Condition Notes</label>
            <textarea
              rows={2}
              value={receiveForm.condition_notes}
              onChange={(e) => setReceiveForm({ ...receiveForm, condition_notes: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowReceive(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Receiving...' : 'Receive Sample'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={showTransfer} onClose={() => setShowTransfer(false)} title="Transfer Sample">
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Location</label>
            <p className="mt-1 text-sm text-gray-900">{sample.storage_location || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Location *</label>
            <input
              type="text"
              required
              value={transferForm.to_location}
              onChange={(e) => setTransferForm({ ...transferForm, to_location: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              placeholder="e.g., Testing Chamber 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={2}
              value={transferForm.notes}
              onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowTransfer(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Transferring...' : 'Transfer Sample'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
