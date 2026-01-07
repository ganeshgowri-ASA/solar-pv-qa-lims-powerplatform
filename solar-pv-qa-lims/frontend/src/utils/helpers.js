import { format, formatDistanceToNow, parseISO } from 'date-fns'

// Date formatting
export const formatDate = (date) => {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'MMM d, yyyy')
  } catch {
    return '-'
  }
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'MMM d, yyyy HH:mm')
  } catch {
    return '-'
  }
}

export const formatRelativeTime = (date) => {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return '-'
  }
}

// Status configurations
export const requestStatusConfig = {
  draft: { label: 'Draft', color: 'gray', bgClass: 'bg-gray-100 text-gray-800' },
  submitted: { label: 'Submitted', color: 'blue', bgClass: 'bg-blue-100 text-blue-800' },
  in_review: { label: 'In Review', color: 'yellow', bgClass: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', color: 'green', bgClass: 'bg-green-100 text-green-800' },
  in_progress: { label: 'In Progress', color: 'indigo', bgClass: 'bg-indigo-100 text-indigo-800' },
  completed: { label: 'Completed', color: 'emerald', bgClass: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', color: 'red', bgClass: 'bg-red-100 text-red-800' },
}

export const sampleStatusConfig = {
  registered: { label: 'Registered', color: 'gray', bgClass: 'bg-gray-100 text-gray-800' },
  received: { label: 'Received', color: 'blue', bgClass: 'bg-blue-100 text-blue-800' },
  in_testing: { label: 'In Testing', color: 'yellow', bgClass: 'bg-yellow-100 text-yellow-800' },
  tested: { label: 'Tested', color: 'green', bgClass: 'bg-green-100 text-green-800' },
  on_hold: { label: 'On Hold', color: 'orange', bgClass: 'bg-orange-100 text-orange-800' },
  disposed: { label: 'Disposed', color: 'gray', bgClass: 'bg-gray-100 text-gray-800' },
}

export const testStatusConfig = {
  pending: { label: 'Pending', color: 'gray', bgClass: 'bg-gray-100 text-gray-800' },
  scheduled: { label: 'Scheduled', color: 'blue', bgClass: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', color: 'yellow', bgClass: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', color: 'green', bgClass: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: 'red', bgClass: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', color: 'gray', bgClass: 'bg-gray-100 text-gray-800' },
}

export const resultStatusConfig = {
  pass: { label: 'Pass', color: 'green', bgClass: 'bg-green-100 text-green-800' },
  fail: { label: 'Fail', color: 'red', bgClass: 'bg-red-100 text-red-800' },
  conditional: { label: 'Conditional', color: 'yellow', bgClass: 'bg-yellow-100 text-yellow-800' },
  pending: { label: 'Pending', color: 'gray', bgClass: 'bg-gray-100 text-gray-800' },
}

export const priorityConfig = {
  low: { label: 'Low', color: 'gray', bgClass: 'bg-gray-100 text-gray-800' },
  normal: { label: 'Normal', color: 'blue', bgClass: 'bg-blue-100 text-blue-800' },
  high: { label: 'High', color: 'orange', bgClass: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'red', bgClass: 'bg-red-100 text-red-800' },
}

export const certStatusConfig = {
  draft: { label: 'Draft', color: 'gray', bgClass: 'bg-gray-100 text-gray-800' },
  issued: { label: 'Issued', color: 'green', bgClass: 'bg-green-100 text-green-800' },
  expired: { label: 'Expired', color: 'red', bgClass: 'bg-red-100 text-red-800' },
  revoked: { label: 'Revoked', color: 'red', bgClass: 'bg-red-100 text-red-800' },
}

export const reportStatusConfig = {
  draft: { label: 'Draft', color: 'gray', bgClass: 'bg-gray-100 text-gray-800' },
  review: { label: 'In Review', color: 'yellow', bgClass: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', color: 'blue', bgClass: 'bg-blue-100 text-blue-800' },
  issued: { label: 'Issued', color: 'green', bgClass: 'bg-green-100 text-green-800' },
}

// Helper to get status display
export const getStatusDisplay = (status, config) => {
  return config[status] || { label: status, bgClass: 'bg-gray-100 text-gray-800' }
}

// Number formatting
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined) return '-'
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: decimals })
}

export const formatPercentage = (num) => {
  if (num === null || num === undefined) return '-'
  return `${Number(num).toFixed(1)}%`
}

// Truncate text
export const truncate = (str, length = 50) => {
  if (!str) return ''
  if (str.length <= length) return str
  return str.substring(0, length) + '...'
}

// Generate initials from name
export const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return first + last || '??'
}

// Standard codes display
export const formatStandardCodes = (codes) => {
  if (!codes || codes.length === 0) return '-'
  return codes.join(', ')
}
