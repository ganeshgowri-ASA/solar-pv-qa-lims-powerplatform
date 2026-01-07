import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, PlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { PageLoading } from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'
import { getCertifications, createCertification, getTestStandards } from '../utils/api'
import { formatDate, certStatusConfig, truncate } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function Certifications() {
  const navigate = useNavigate()
  const { isAuthenticated, isManager } = useAuth()
  const [certifications, setCertifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  const [showCreate, setShowCreate] = useState(false)
  const [standards, setStandards] = useState([])
  const [formData, setFormData] = useState({
    certificate_type: 'IEC',
    manufacturer: '',
    model_numbers: '',
    rated_power_range: '',
    standard_codes: [],
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCertifications()
  }, [search, statusFilter, pagination.page])

  useEffect(() => {
    if (showCreate) {
      fetchStandards()
    }
  }, [showCreate])

  const fetchCertifications = async () => {
    try {
      setLoading(true)
      const response = await getCertifications({
        search: search || undefined,
        status: statusFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      })
      setCertifications(response.data.data)
      setPagination(prev => ({ ...prev, ...response.data.pagination }))
    } catch (error) {
      toast.error('Failed to load certifications')
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

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createCertification({
        ...formData,
        model_numbers: formData.model_numbers ? formData.model_numbers.split(',').map(s => s.trim()) : [],
      })
      toast.success('Certification created successfully')
      setShowCreate(false)
      setFormData({ certificate_type: 'IEC', manufacturer: '', model_numbers: '', rated_power_range: '', standard_codes: [] })
      fetchCertifications()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create certification')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStandardChange = (code) => {
    setFormData(prev => ({
      ...prev,
      standard_codes: prev.standard_codes.includes(code)
        ? prev.standard_codes.filter(c => c !== code)
        : [...prev.standard_codes, code]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certifications</h1>
          <p className="mt-1 text-sm text-gray-500">Manage product certifications and certificates</p>
        </div>
        {isAuthenticated && isManager && (
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 sm:mt-0">
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />New Certification
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search certifications..."
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
            <option value="issued">Issued</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
          <button onClick={() => { setSearch(''); setStatusFilter('') }} className="btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8"><PageLoading /></div>
        ) : certifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No certifications found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {certifications.map((cert) => {
                  const isExpired = cert.expiry_date && new Date(cert.expiry_date) < new Date()
                  return (
                    <tr key={cert.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <ShieldCheckIcon className={`h-5 w-5 mr-2 ${cert.status === 'issued' && !isExpired ? 'text-green-500' : 'text-gray-400'}`} />
                          <div>
                            <div className="text-sm font-medium text-solar-600">{cert.certificate_number}</div>
                            <div className="text-xs text-gray-500">{cert.standard_codes?.join(', ')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{cert.manufacturer}</div>
                        <div className="text-xs text-gray-500">{cert.rated_power_range}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cert.certificate_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={isExpired ? 'expired' : cert.status} config={certStatusConfig} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(cert.issue_date) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${isExpired ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {formatDate(cert.expiry_date) || '-'}
                        </span>
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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Certification" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Certificate Type *</label>
              <select
                value={formData.certificate_type}
                onChange={(e) => setFormData({ ...formData, certificate_type: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              >
                <option value="IEC">IEC</option>
                <option value="UL">UL</option>
                <option value="TUV">TÜV</option>
                <option value="MCS">MCS</option>
                <option value="CEC">CEC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Manufacturer *</label>
              <input
                type="text"
                required
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Model Numbers (comma-separated)</label>
            <input
              type="text"
              value={formData.model_numbers}
              onChange={(e) => setFormData({ ...formData, model_numbers: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              placeholder="e.g., SP450M-72, SP400M-72"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Rated Power Range</label>
            <input
              type="text"
              value={formData.rated_power_range}
              onChange={(e) => setFormData({ ...formData, rated_power_range: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
              placeholder="e.g., 400W - 450W"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Standards *</label>
            <div className="grid grid-cols-2 gap-2">
              {standards.map((std) => (
                <label key={std.id} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.standard_codes.includes(std.standard_code)}
                    onChange={() => handleStandardChange(std.standard_code)}
                    className="rounded border-gray-300 text-solar-600 focus:ring-solar-500"
                  />
                  <span>{std.standard_code}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting || formData.standard_codes.length === 0} className="btn-primary disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Certification'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
