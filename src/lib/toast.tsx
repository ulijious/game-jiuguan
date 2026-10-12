import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  BadgeCheck,
  Info,
  OctagonAlert,
  X,
} from 'lucide-react'
import type { Severity } from '../data/types'

/* --------------------------------------------------------------- 类型 */

export interface Toast {
  id: string
  severity: Severity
  title: string
  detail?: string
  /** 毫秒；0 表示不自动关闭 */
  duration: number
  action?: { label: string; run: () => void }
  /** 归属分组，同组只保留最新一条，避免刷屏 */
  group?: string
}

export type ToastInput = Omit<Toast, 'id' | 'duration' | 'severity'> & {
  severity?: Severity
  duration?: number
}

interface ToastApi {
  push: (t: ToastInput) => string
  dismiss: (id: string) => void
  clear: () => void
}

const ToastCtx = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast 必须在 <ToastProvider> 内使用')
  return ctx
}

/* --------------------------------------------------------------- 视觉映射 */

const SKIN: Record<
  Severity,
  { icon: typeof Info; bar: string; label: string; ink: string }
> = {
  info: { icon: Info, bar: 'bg-ice', label: '情报', ink: 'text-ink' },
  good: { icon: BadgeCheck, bar: 'bg-jade', label: '达成', ink: 'text-ink' },
  warn: { icon: AlertTriangle, bar: 'bg-pulse', label: '注意', ink: 'text-ink' },
  danger: { icon: OctagonAlert, bar: 'bg-signal', label: '警告', ink: 'text-ink' },
}

/* --------------------------------------------------------------- Provider */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const timers = useRef(new Map<string, number>())
  const seq = useRef(0)

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t !== undefined) {
      window.clearTimeout(t)
      timers.current.delete(id)
    }
    setItems((all) => all.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (input: ToastInput) => {
      seq.current += 1
      const id = `toast-${Date.now()}-${seq.current}`
      const next: Toast = {
        id,
        severity: input.severity ?? 'info',
        title: input.title,
        detail: input.detail,
        duration: input.duration ?? 5200,
        action: input.action,
        group: input.group,
      }
      setItems((all) => {
        const base = next.group
          ? all.filter((x) => x.group !== next.group)
          : all
        // 最多同时 4 条，超出挤掉最老的
        return [...base, next].slice(-4)
      })
      if (next.duration > 0) {
        const handle = window.setTimeout(() => dismiss(id), next.duration)
        timers.current.set(id, handle)
      }
      return id
    },
    [dismiss],
  )

  const clear = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current.clear()
    setItems([])
  }, [])

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => window.clearTimeout(t))
  }, [])

  const api = useMemo(() => ({ push, dismiss, clear }), [push, dismiss, clear])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

/* --------------------------------------------------------------- 视口 */

function ToastViewport({
  items,
  onDismiss,
}: {
  items: Toast[]
  onDismiss: (id: string) => void
}) {
  return (
    <div
      className="pointer-events-none fixed bottom-0 right-0 z-[90] flex w-full max-w-[26rem] flex-col gap-3 p-4 sm:p-6"
      aria-live="polite"
      aria-atomic="false"
      role="status"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  const skin = SKIN[toast.severity]
  const Icon = skin.icon
  const [paused, setPaused] = useState(false)

  return (
    <motion.article
      layout
      id={toast.id}
      initial={{ opacity: 0, x: 56, skewX: -6 }}
      animate={{ opacity: 1, x: 0, skewX: 0 }}
      exit={{ opacity: 0, x: 40, scale: 0.97, transition: { duration: 0.16 } }}
      transition={{ duration: 0.28, ease: [0.85, 0, 0.15, 1] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="p5-noise p5-cut-tr pointer-events-auto relative overflow-hidden border-[3px] border-ink bg-paper-warm shadow-hard-lg"
      role={toast.severity === 'danger' ? 'alert' : undefined}
    >
      {/* 左侧严重度色带 */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-[7px] ${skin.bar}`}
      />
      <div className="flex gap-3 pl-5 pr-3 py-3">
        <span
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-ink ${skin.bar}`}
        >
          <Icon size={18} strokeWidth={2.4} className="text-ink" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="p5-kicker mb-1 !text-[0.625rem] text-ink/55">
            {skin.label}
          </p>
          <h3 className="font-head text-[0.9375rem] font-800 leading-snug text-ink">
            {toast.title}
          </h3>
          {toast.detail && (
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink/70">
              {toast.detail}
            </p>
          )}
          {toast.action && (
            <button
              type="button"
              id={`${toast.id}-action`}
              onClick={() => {
                toast.action?.run()
                onDismiss(toast.id)
              }}
              className="p5-btn p5-btn--signal mt-2.5 !min-h-[34px] !px-3 !py-1 !text-[0.75rem]"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          type="button"
          id={`${toast.id}-dismiss`}
          onClick={() => onDismiss(toast.id)}
          aria-label={`关闭通知：${toast.title}`}
          className="grid h-7 w-7 shrink-0 place-items-center border-2 border-transparent text-ink/45 transition-colors hover:border-ink hover:bg-ink hover:text-paper-warm"
        >
          <X size={14} strokeWidth={3} aria-hidden="true" />
        </button>
      </div>

      {/* 倒计时进度 */}
      {toast.duration > 0 && (
        <motion.span
          aria-hidden="true"
          className={`absolute bottom-0 left-0 h-[3px] ${skin.bar}`}
          initial={{ width: '100%' }}
          animate={{ width: paused ? undefined : '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.article>
  )
}
