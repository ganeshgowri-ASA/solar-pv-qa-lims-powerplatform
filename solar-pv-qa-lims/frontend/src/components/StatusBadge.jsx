import { getStatusDisplay } from '../utils/helpers'

export default function StatusBadge({ status, config }) {
  const display = getStatusDisplay(status, config)

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${display.bgClass}`}>
      {display.label}
    </span>
  )
}
