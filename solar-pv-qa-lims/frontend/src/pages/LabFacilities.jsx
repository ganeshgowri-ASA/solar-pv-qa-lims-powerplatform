import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, BuildingOfficeIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import { PageLoading } from '../components/LoadingSpinner'
import { getLabFacilities } from '../utils/api'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function LabFacilities() {
  const [labs, setLabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    fetchLabs()
  }, [search, typeFilter])

  const fetchLabs = async () => {
    try {
      setLoading(true)
      const response = await getLabFacilities({
        search: search || undefined,
        facility_type: typeFilter || undefined,
        is_active: true,
      })
      setLabs(response.data.data)
    } catch (error) {
      toast.error('Failed to load lab facilities')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lab Facilities</h1>
        <p className="mt-1 text-sm text-gray-500">View and manage laboratory facilities</p>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search labs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-solar-500 focus:ring-solar-500 sm:text-sm"
          >
            <option value="">All Types</option>
            <option value="internal">Internal</option>
            <option value="external">External</option>
            <option value="partner">Partner</option>
          </select>
          <button onClick={() => { setSearch(''); setTypeFilter('') }} className="btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <PageLoading />
      ) : labs.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
          No lab facilities found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {labs.map((lab) => (
            <div key={lab.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-8 w-8 text-solar-500 mr-3" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{lab.name}</h3>
                      <p className="text-sm text-gray-500">{lab.code}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    lab.facility_type === 'internal' ? 'bg-green-100 text-green-800' :
                    lab.facility_type === 'external' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {lab.facility_type}
                  </span>
                </div>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lab.city ? `${lab.city}, ${lab.country}` : lab.country || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Contact</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lab.contact_name || '-'}</dd>
                    <dd className="text-xs text-gray-500">{lab.contact_email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Accreditation</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lab.accreditation_number || '-'}</dd>
                    <dd className="text-xs text-gray-500">{lab.accreditation_body}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Accreditation Expiry</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(lab.accreditation_expiry) || '-'}</dd>
                  </div>
                </dl>

                {lab.capabilities && lab.capabilities.length > 0 && (
                  <div className="mt-4">
                    <dt className="text-sm font-medium text-gray-500 mb-2">Capabilities</dt>
                    <div className="flex flex-wrap gap-1">
                      {lab.capabilities.map((cap, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-500">Active Requests:</span>
                      <span className="ml-1 font-medium text-gray-900">{lab.active_requests || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Active Tests:</span>
                      <span className="ml-1 font-medium text-gray-900">{lab.active_tests || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
