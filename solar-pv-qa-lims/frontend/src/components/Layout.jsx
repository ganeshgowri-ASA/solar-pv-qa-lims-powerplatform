import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  HomeIcon,
  DocumentTextIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Service Requests', href: '/service-requests', icon: DocumentTextIcon },
  { name: 'Samples', href: '/samples', icon: BeakerIcon },
  { name: 'Test Plans', href: '/test-plans', icon: ClipboardDocumentListIcon },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon },
  { name: 'Certifications', href: '/certifications', icon: ShieldCheckIcon },
  { name: 'Lab Facilities', href: '/labs', icon: BuildingOfficeIcon },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <Link to="/" className="flex items-center space-x-2">
              <SunIcon className="h-8 w-8 text-solar-500" />
              <span className="text-lg font-bold text-gray-900">Solar PV QA</span>
            </Link>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-solar-50 text-solar-700 border-r-2 border-solar-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow border-r border-gray-200 bg-white">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <Link to="/" className="flex items-center space-x-2">
              <SunIcon className="h-8 w-8 text-solar-500" />
              <span className="text-lg font-bold text-gray-900">Solar PV QA LIMS</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto py-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-solar-50 text-solar-700 border-r-2 border-solar-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
          {isAuthenticated && (
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-9 w-9 rounded-full bg-solar-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-solar-700">
                      {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate capitalize">
                    {user?.role?.replace('_', ' ')}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                  title="Sign out"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navbar for mobile */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex-1 text-center">
            <Link to="/" className="flex items-center justify-center space-x-2">
              <SunIcon className="h-6 w-6 text-solar-500" />
              <span className="font-bold text-gray-900">Solar PV QA</span>
            </Link>
          </div>
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            </button>
          ) : (
            <Link to="/login" className="p-2 text-gray-400 hover:text-gray-600">
              <UserCircleIcon className="h-6 w-6" />
            </Link>
          )}
        </div>

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
