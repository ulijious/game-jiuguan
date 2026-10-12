import clsx from 'clsx'
import type { Severity } from '../data/types'

const MAP: Record<Severity, { label: string; chip: string; dot: string }> = {
  info: { label: '情报', chip: 'bg-ice text-white', dot: 'bg-ice' },
  good: { label: '达成', chip: 'bg-jade text-white', dot: 'bg-jade' },
  warn: { label: '注意', chip: 'bg-pulse text-ink', dot: 'bg-pulse' },
  danger: { label: '警告', chip: 'bg-signal text-white', dot: 'bg-signal' },
}

export function SeverityMark({
  severity,
  withLabel = false,
}: {
  severity: Severity
  withLabel?: boolean
}) {
  const s = MAP[severity]
  if (!withLabel) {
    return (
      <span
        aria-hidden="true"
        className={clsx('inline-block h-3 w-3 shrink-0 border-2 border-ink', s.dot)}
      />
    )
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 border-2 border-ink px-1.5 py-0.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.12em]',
        s.chip,
      )}
    >
      <span aria-hidden="true" className="inline-block h-2 w-2 bg-current opacity-70" />
      {s.label}
    </span>
  )
}

export function severityLabel(s: Severity): string {
  return MAP[s].label
}
