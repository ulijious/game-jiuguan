/** 数值与文本格式化 —— 统一口径，避免各页面各写一套 */

const CNY = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 })

/** ¥128,400 ／ ¥128.4 万 */
export function money(n: number, opts: { compact?: boolean } = {}): string {
  const abs = Math.abs(n)
  if (opts.compact !== false && abs >= 10000) {
    return `${n < 0 ? '−' : ''}¥${(abs / 10000).toFixed(abs >= 1_000_000 ? 0 : 1)} 万`
  }
  return `${n < 0 ? '−' : ''}¥${CNY.format(abs)}`
}

export function num(n: number): string {
  return CNY.format(n)
}

export function pct(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`
}

/** 第 26 周 → 第 26 周（第 3 年 · 夏） */
export function weekLabel(week: number): string {
  const year = Math.floor((week - 1) / 48) + 1
  const w = ((week - 1) % 48) + 1
  return `第 ${year} 年 · 第 ${w} 周`
}

export function weekShort(week: number): string {
  const year = Math.floor((week - 1) / 48) + 1
  const w = ((week - 1) % 48) + 1
  return `Y${year} · W${w}`
}

/** 剩余周数 → "还有 9 周" / "已超期 2 周" */
export function dueLabel(deadlineWeek: number, currentWeek: number): string {
  const diff = deadlineWeek - currentWeek
  if (diff > 0) return `还有 ${diff} 周`
  if (diff === 0) return '本周截止'
  return `已超期 ${-diff} 周`
}

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n))
}

/** 由四维属性推导综合评级 */
export function gradeOf(avg: number): string {
  if (avg >= 88) return 'S'
  if (avg >= 78) return 'A'
  if (avg >= 68) return 'B'
  if (avg >= 56) return 'C'
  if (avg >= 44) return 'D'
  return 'E'
}

export function avgStats(s: { tech: number; creative: number; express: number; collab: number }): number {
  return (s.tech + s.creative + s.express + s.collab) / 4
}
