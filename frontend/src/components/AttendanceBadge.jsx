function formatConfidence(confidence) {
  if (!Number.isFinite(confidence)) return '—'
  return `${confidence.toFixed(1)}%`
}

export default function AttendanceBadge({ status, confidence }) {
  const styles = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    unknown: 'bg-amber-100 text-amber-700',
  }

  const confidenceLabel = formatConfidence(confidence)

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[status]}`}>{status}</span>
      <span className="text-xs font-medium text-slate-500">{confidenceLabel}</span>
    </div>
  )
}
