import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import {
  Archive,
  AudioLines,
  BadgeDollarSign,
  Boxes,
  Bug,
  Building2,
  CalendarCheck,
  ChartNoAxesCombined,
  ClipboardList,
  Coffee,
  Coins,
  Cpu,
  Flame,
  Gauge,
  Handshake,
  HeartHandshake,
  Layers,
  MessageSquareQuote,
  Newspaper,
  Palette,
  PersonStanding,
  Ruler,
  ScrollText,
  Server,
  Settings2,
  Square,
  Star,
  Terminal,
  TrendingUp,
  Users,
  UsersRound,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'

/* --------------------------------------------------------------- 图标登记表
   显式登记（而非 index 整个 lucide）以保证 tree-shaking 与包体可控。
   供 PanelHead / Icon 以字符串键引用；未登记的键会回退为 Square。 */

export const ICONS: Record<string, LucideIcon> = {
  Archive,
  AudioLines,
  BadgeDollarSign,
  Boxes,
  Bug,
  Building2,
  CalendarCheck,
  ChartNoAxesCombined,
  ClipboardList,
  Coffee,
  Coins,
  Cpu,
  Flame,
  Gauge,
  Handshake,
  HeartHandshake,
  Layers,
  MessageSquareQuote,
  Newspaper,
  Palette,
  PersonStanding,
  Ruler,
  ScrollText,
  Server,
  Settings2,
  Square,
  Star,
  Terminal,
  TrendingUp,
  Users,
  UsersRound,
  Wrench,
}

export function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 2.2,
  decorative = true,
}: {
  name: string
  size?: number
  className?: string
  strokeWidth?: number
  decorative?: boolean
}) {
  const Cmp = ICONS[name] ?? Square
  return (
    <Cmp
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={decorative || undefined}
      focusable={false}
    />
  )
}

/* --------------------------------------------------------------- 版式元素 */

export function Kicker({
  children,
  className,
  tone = 'signal',
}: {
  children: ReactNode
  className?: string
  tone?: 'signal' | 'ink' | 'paper'
}) {
  const dot =
    tone === 'signal' ? 'bg-signal' : tone === 'ink' ? 'bg-ink' : 'bg-paper-warm'
  return (
    <p className={clsx('p5-kicker', tone === 'paper' && '!text-paper-warm/70', className)}>
      <span aria-hidden="true" className={clsx('inline-block h-[9px] w-[9px]', dot)} />
      {children}
    </p>
  )
}

export function PageHeader({
  kicker,
  title,
  latin,
  lede,
  actions,
}: {
  kicker: string
  title: string
  latin: string
  lede?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-8">
      <Kicker>{kicker}</Kicker>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] uppercase leading-[0.95] tracking-[-0.02em] text-ink">
            {title}
          </h1>
          <p
            lang="en"
            className="mt-1.5 font-mono text-[0.6875rem] font-700 uppercase tracking-[0.3em] text-signal"
          >
            {latin}
          </p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
      {lede && (
        <p className="mt-4 max-w-[62ch] border-l-[3px] border-signal pl-4 text-[0.9375rem] leading-relaxed text-ink/72">
          {lede}
        </p>
      )}
    </header>
  )
}

/** 斜切标题条 —— P5R 式的"贴纸条" */
export function Slab({
  children,
  tone = 'ink',
  className,
}: {
  children: ReactNode
  tone?: 'ink' | 'signal' | 'paper'
  className?: string
}) {
  return (
    <span
      className={clsx(
        'p5-skew inline-flex items-center gap-2 px-3 py-1.5',
        tone === 'ink' && 'bg-ink text-paper-warm',
        tone === 'signal' && 'bg-signal text-white',
        tone === 'paper' && 'border-2 border-ink bg-paper-warm text-ink',
        className,
      )}
    >
      <span className="p5-unskew font-head text-[0.8125rem] font-800 uppercase tracking-[0.06em]">
        {children}
      </span>
    </span>
  )
}

/* --------------------------------------------------------------- 面板 */

export function Panel({
  children,
  className,
  tone = 'paper',
  cut = 'tr',
  raised = true,
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode
  className?: string
  tone?: 'paper' | 'ink'
  cut?: 'tr' | 'bl' | 'both' | 'none'
  raised?: boolean
  as?: 'section' | 'article' | 'aside' | 'div'
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={clsx(
        'p5-noise relative border-[3px] border-ink',
        tone === 'paper' ? 'bg-paper-warm' : 'bg-ink text-paper-warm',
        cut === 'tr' && 'p5-cut-tr',
        cut === 'bl' && 'p5-cut-bl',
        cut === 'both' && 'p5-cut',
        raised && 'shadow-hard',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function PanelHead({
  icon,
  title,
  latin,
  right,
  tone = 'paper',
}: {
  icon?: string
  title: string
  latin?: string
  right?: ReactNode
  tone?: 'paper' | 'ink'
}) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-4 border-b-[3px] px-4 py-3',
        tone === 'paper' ? 'border-ink bg-paper-dim/70' : 'border-paper-warm/25 bg-ink-soft',
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span
            className={clsx(
              'grid h-7 w-7 shrink-0 place-items-center border-2',
              tone === 'paper' ? 'border-ink bg-paper-warm' : 'border-paper-warm/40 bg-ink',
            )}
          >
            <Icon name={icon} size={15} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-head text-[0.9375rem] font-800 tracking-[0.01em]">
            {title}
          </h2>
          {latin && (
            <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.22em] opacity-50">
              {latin}
            </p>
          )}
        </div>
      </div>
      {right}
    </div>
  )
}

/* --------------------------------------------------------------- 按钮 */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'paper' | 'signal' | 'ink' | 'ghost'
  size?: 'sm' | 'md'
  icon?: LucideIcon
  iconRight?: LucideIcon
}

export function Btn({
  variant = 'paper',
  size = 'md',
  icon: Ico,
  iconRight: IcoR,
  className,
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      type="button"
      className={clsx(
        'p5-btn',
        variant === 'signal' && 'p5-btn--signal',
        variant === 'ink' && 'p5-btn--ink',
        variant === 'ghost' && 'p5-btn--ghost',
        size === 'sm' && '!min-h-[36px] !px-3 !py-1.5 !text-[0.75rem]',
        className,
      )}
      {...rest}
    >
      {Ico && <Ico size={size === 'sm' ? 14 : 16} strokeWidth={2.4} aria-hidden="true" />}
      {children}
      {IcoR && <IcoR size={size === 'sm' ? 14 : 16} strokeWidth={2.4} aria-hidden="true" />}
    </button>
  )
}

/* --------------------------------------------------------------- 徽章 */

export function Tag({
  children,
  tone = 'paper',
  className,
}: {
  children: ReactNode
  tone?: 'paper' | 'ink' | 'signal' | 'royal' | 'ice' | 'jade' | 'pulse'
  className?: string
}) {
  const tones: Record<string, string> = {
    paper: 'bg-paper-warm text-ink border-ink',
    ink: 'bg-ink text-paper-warm border-ink',
    signal: 'bg-signal text-white border-ink',
    royal: 'bg-royal text-white border-ink',
    ice: 'bg-ice text-white border-ink',
    jade: 'bg-jade text-white border-ink',
    pulse: 'bg-pulse text-ink border-ink',
  }
  return <span className={clsx('p5-tag', tones[tone], className)}>{children}</span>
}

/* --------------------------------------------------------------- 计量条 */

export function Meter({
  value,
  max = 100,
  tone = 'ink',
  label,
  showValue = false,
  height = 12,
  id,
}: {
  value: number
  max?: number
  tone?: 'ink' | 'signal' | 'jade' | 'pulse' | 'ice' | 'royal'
  label?: string
  showValue?: boolean
  height?: number
  id?: string
}) {
  const p = Math.max(0, Math.min(100, (value / max) * 100))
  const fills: Record<string, string> = {
    ink: 'bg-ink',
    signal: 'bg-signal',
    jade: 'bg-jade',
    pulse: 'bg-pulse',
    ice: 'bg-ice',
    royal: 'bg-royal',
  }
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && (
            <span className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-current opacity-55">
              {label}
            </span>
          )}
          {showValue && (
            <span className="tabular font-mono text-[0.6875rem] font-700 text-current">
              {Math.round(value)}
            </span>
          )}
        </div>
      )}
      <div
        id={id}
        className="p5-meter"
        style={{ height }}
        role="meter"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? `${Math.round(value)} / ${max}`}
      >
        <div className={clsx('p5-meter__fill', fills[tone])} style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- 数据瓦片 */

export function StatTile({
  id,
  icon,
  label,
  value,
  unit,
  delta,
  tone = 'paper',
  hint,
}: {
  id: string
  icon: LucideIcon
  label: string
  value: string
  unit?: string
  delta?: { dir: 'up' | 'down'; text: string }
  tone?: 'paper' | 'signal' | 'ink'
  hint?: string
}) {
  const Ico = icon
  return (
    <article
      id={id}
      className={clsx(
        'p5-noise group relative overflow-hidden border-[3px] border-ink p-4 transition-transform duration-200 ease-snap hover:-translate-y-[3px]',
        tone === 'paper' && 'bg-paper-warm shadow-hard',
        tone === 'signal' && 'bg-signal text-white shadow-hard',
        tone === 'ink' && 'bg-ink text-paper-warm shadow-hard',
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'absolute right-0 top-0 h-14 w-14 rotate-45 translate-x-6 -translate-y-6',
          tone === 'signal' ? 'bg-ink/25' : 'bg-signal/12',
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <span
          className={clsx(
            'grid h-8 w-8 place-items-center border-2',
            tone === 'signal' ? 'border-white/70' : 'border-ink',
          )}
        >
          <Ico size={15} strokeWidth={2.5} aria-hidden="true" />
        </span>
        {delta && (
          <span
            className={clsx(
              'tabular font-mono text-[0.625rem] font-700',
              delta.dir === 'up' ? 'text-jade' : 'text-signal',
              tone === 'signal' && 'text-white',
            )}
          >
            {delta.dir === 'up' ? '▲' : '▼'} {delta.text}
          </span>
        )}
      </div>
      <p className="mt-3 font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] opacity-55">
        {label}
      </p>
      <p className="tabular mt-0.5 font-display text-[1.75rem] leading-none">
        {value}
        {unit && <span className="ml-1 font-head text-[0.8125rem] opacity-60">{unit}</span>}
      </p>
      {hint && <p className="mt-2 text-[0.75rem] leading-snug opacity-60">{hint}</p>}
    </article>
  )
}

/* --------------------------------------------------------------- 头像 */

const AVATAR_TONES = [
  'bg-signal text-white',
  'bg-ink text-paper-warm',
  'bg-royal text-white',
  'bg-ice text-white',
  'bg-pulse text-ink',
  'bg-jade text-white',
]

export function Avatar({
  name,
  size = 44,
  index = 0,
  className,
}: {
  name: string
  size?: number
  index?: number
  className?: string
}) {
  const tone = AVATAR_TONES[index % AVATAR_TONES.length]
  const initial = name.slice(0, 1)
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={clsx(
        'relative grid shrink-0 place-items-center overflow-hidden border-[3px] border-ink font-display leading-none',
        tone,
        className,
      )}
    >
      {initial}
      <span className="p5-halftone absolute inset-0 opacity-[0.14]" />
    </span>
  )
}

/* --------------------------------------------------------------- 标签页 */

/* Tabs 与 TabPanel 是兄弟节点，无法用 context 传递当前选中项，因此按 idPrefix
   建立一份极小的外部 store：Tabs 在 layout effect 中发布选中项并通知面板，
   面板据此隐藏自己。layout effect 在浏览器绘制前完成，因此不会出现闪烁。 */
interface TabStore {
  active: string
  listeners: Set<() => void>
}

const tabStores = new Map<string, TabStore>()

function getTabStore(prefix: string): TabStore {
  let store = tabStores.get(prefix)
  if (!store) {
    store = { active: '', listeners: new Set() }
    tabStores.set(prefix, store)
  }
  return store
}

function useTabStore(prefix: string, publish?: string): string {
  const store = getTabStore(prefix)
  const subscribe = useCallback(
    (cb: () => void) => {
      store.listeners.add(cb)
      return () => {
        store.listeners.delete(cb)
      }
    },
    [store],
  )
  const read = useCallback(() => store.active, [store])
  const active = useSyncExternalStore(subscribe, read, read)

  useLayoutEffect(() => {
    if (publish !== undefined && store.active !== publish) {
      store.active = publish
      store.listeners.forEach((l) => l())
    }
  }, [store, publish])

  return active
}

export interface TabItem {
  id: string
  label: string
  latin?: string
  count?: number
  icon?: LucideIcon
}

export function Tabs({
  items,
  active,
  onChange,
  idPrefix,
  tone = 'paper',
  className,
}: {
  items: TabItem[]
  active: string
  onChange: (id: string) => void
  idPrefix: string
  tone?: 'paper' | 'ink'
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  useTabStore(idPrefix, active)

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const last = items.length - 1
    let next = -1
    if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1
    else if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next >= 0) {
      e.preventDefault()
      refs.current[next]?.focus()
      onChange(items[next].id)
    }
  }

  return (
    <div
      role="tablist"
      aria-label="内容分区"
      className={clsx(
        'flex flex-wrap gap-0 border-b-[3px]',
        tone === 'paper' ? 'border-ink' : 'border-paper-warm/30',
        className,
      )}
    >
      {items.map((t, i) => {
        const on = t.id === active
        const Ico = t.icon
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={`${idPrefix}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={on}
            aria-controls={`${idPrefix}-panel-${t.id}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={clsx(
              'relative -mb-[3px] inline-flex items-center gap-2 border-[3px] border-b-0 px-3.5 py-2.5 font-head text-[0.8125rem] font-800 tracking-[0.02em] transition-colors duration-150',
              on
                ? tone === 'paper'
                  ? 'border-ink bg-signal text-white'
                  : 'border-paper-warm/30 bg-paper-warm text-ink'
                : tone === 'paper'
                  ? 'border-transparent text-ink/55 hover:border-ink hover:text-ink'
                  : 'border-transparent text-paper-warm/55 hover:text-paper-warm',
            )}
          >
            {Ico && <Ico size={14} strokeWidth={2.6} aria-hidden="true" />}
            {t.label}
            {t.latin && (
              <span className="hidden font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] opacity-55 sm:inline">
                {t.latin}
              </span>
            )}
            {typeof t.count === 'number' && (
              <span
                className={clsx(
                  'tabular grid h-4 min-w-4 place-items-center border px-1 font-mono text-[0.5625rem] font-700',
                  on ? 'border-white/60' : 'border-ink/40',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({
  idPrefix,
  id,
  children,
  className,
}: {
  idPrefix: string
  id: string
  children: ReactNode
  className?: string
}) {
  const current = useTabStore(idPrefix)
  // current 为空表示该分组还没有挂载 Tabs，此时保持可见以免内容整块消失
  const hidden = current !== '' && current !== id

  return (
    <div
      id={`${idPrefix}-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`${idPrefix}-tab-${id}`}
      tabIndex={0}
      hidden={hidden}
      className={clsx('focus-visible:outline-none', className)}
    >
      {children}
    </div>
  )
}

/* --------------------------------------------------------------- 模态框 */

export function Modal({
  open,
  onClose,
  title,
  latin,
  kicker,
  size = 'md',
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  latin?: string
  kicker?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
  footer?: ReactNode
}) {
  const titleId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const first = bodyRef.current?.querySelector<HTMLElement>(
        'input,select,textarea,button,[href],[tabindex]:not([tabindex="-1"])',
      )
      first?.focus()
    }, 40)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const nodes = bodyRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )
      if (!nodes || nodes.length === 0) return
      const list = Array.from(nodes)
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(focusTimer)
      document.body.style.overflow = prev
      restoreRef.current?.focus?.()
    }
  }, [open, onClose])

  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-3 sm:p-6 md:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/72 backdrop-blur-[3px]"
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: -18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99, transition: { duration: 0.14 } }}
            transition={{ duration: 0.3, ease: [0.85, 0, 0.15, 1] }}
            className={clsx(
              'p5-noise relative my-auto w-full border-[4px] border-ink bg-paper-warm shadow-hard-xl',
              widths[size],
            )}
          >
            <header className="relative flex items-start justify-between gap-4 border-b-[3px] border-ink bg-ink px-4 py-3.5 text-paper-warm sm:px-5">
              <div className="min-w-0">
                {kicker && (
                  <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.22em] text-signal-glow">
                    {kicker}
                  </p>
                )}
                <h2
                  id={titleId}
                  className="mt-0.5 font-display text-[1.25rem] uppercase leading-tight tracking-[-0.01em]"
                >
                  {title}
                </h2>
                {latin && (
                  <p className="mt-0.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.26em] text-paper-warm/45">
                    {latin}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={`关闭对话框：${title}`}
                className="grid h-9 w-9 shrink-0 place-items-center border-[3px] border-paper-warm/45 text-paper-warm transition-colors duration-150 hover:border-signal hover:bg-signal"
              >
                <X size={17} strokeWidth={3} aria-hidden="true" />
              </button>
            </header>

            <div
              ref={bodyRef}
              className="max-h-[calc(100vh-14rem)] overflow-y-auto px-4 py-5 sm:px-5"
            >
              {children}
            </div>

            {footer && (
              <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t-[3px] border-ink bg-paper-dim/60 px-4 py-3.5 sm:px-5">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* --------------------------------------------------------------- 空态 */

export function EmptyState({
  icon = Square,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon
  title: string
  hint?: string
  action?: ReactNode
}) {
  const Ico = icon
  return (
    <div className="flex flex-col items-center justify-center border-[3px] border-dashed border-ink/35 bg-paper/60 px-6 py-12 text-center">
      <span className="p5-halftone grid h-14 w-14 place-items-center border-[3px] border-ink bg-paper-warm">
        <Ico size={22} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <p className="mt-4 font-head text-[1rem] font-800">{title}</p>
      {hint && <p className="mt-1.5 max-w-[38ch] text-[0.8125rem] text-ink/60">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* --------------------------------------------------------------- 跑马灯 */

export function Marquee({
  items,
  speed = 'normal',
  tone = 'ink',
}: {
  items: string[]
  speed?: 'normal' | 'fast'
  tone?: 'ink' | 'signal'
}) {
  const doubled = [...items, ...items]
  return (
    <div
      className={clsx(
        'relative flex overflow-hidden border-y-[3px] border-ink py-2',
        tone === 'signal' ? 'bg-signal text-white' : 'bg-ink text-paper-warm',
      )}
      aria-hidden="true"
    >
      <div
        className={clsx(
          'flex shrink-0 items-center gap-8 whitespace-nowrap',
          speed === 'fast' ? 'animate-marquee-fast' : 'animate-marquee',
        )}
      >
        {doubled.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="flex items-center gap-8 font-mono text-[0.6875rem] font-700 uppercase tracking-[0.24em]"
          >
            {t}
            <span className="inline-block h-2 w-2 rotate-45 bg-current opacity-60" />
          </span>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- 迷你折线 */

export function Sparkline({
  points,
  width = 120,
  height = 34,
  tone = '#E4002B',
  label,
}: {
  points: number[]
  width?: number
  height?: number
  tone?: string
  label: string
}) {
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const span = max - min || 1
  const step = width / Math.max(1, points.length - 1)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - ((p - min) / span) * height).toFixed(1)}`)
    .join(' ')
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <path d={d} fill="none" stroke={tone} strokeWidth={2.5} strokeLinecap="square" />
      <path
        d={`${d} L${width},${height} L0,${height} Z`}
        fill={tone}
        opacity={0.13}
      />
    </svg>
  )
}
