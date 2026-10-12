import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import {
  BadgeDollarSign,
  Bell,
  BookOpenText,
  Building2,
  CalendarPlus,
  ChartNoAxesCombined,
  ClipboardList,
  Gauge,
  Menu,
  Settings2,
  TriangleAlert,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useGame } from './lib/store'
import { money, weekLabel } from './lib/format'
import { Btn, Marquee, Tag } from './lib/ui'
import { useToast } from './lib/toast'
import { SeverityMark } from './components/SeverityMark'

import Dashboard from './pages/Dashboard'
import Studio from './pages/Studio'
import Staff from './pages/Staff'
import Projects from './pages/Projects'
import Development from './pages/Development'
import Narrative from './pages/Narrative'
import Market from './pages/Market'
import Finance from './pages/Finance'
import Settings from './pages/Settings'

interface NavItem {
  to: string
  label: string
  latin: string
  icon: LucideIcon
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: '总览', latin: 'Overview', icon: Gauge, end: true },
  { to: '/studio', label: '工作室', latin: 'Studio', icon: Building2 },
  { to: '/staff', label: '人员', latin: 'Personnel', icon: Users },
  { to: '/projects', label: '企划', latin: 'Projects', icon: ClipboardList },
  { to: '/development', label: '研发', latin: 'Pipeline', icon: Wrench },
  { to: '/narrative', label: '剧情工坊', latin: 'Narrative', icon: BookOpenText },
  { to: '/market', label: '市场', latin: 'Market', icon: ChartNoAxesCombined },
  { to: '/finance', label: '财务', latin: 'Finance', icon: BadgeDollarSign },
  { to: '/settings', label: '设置', latin: 'Settings', icon: Settings2 },
]

export default function App() {
  const { state, derived, advanceWeek } = useGame()
  const toast = useToast()
  const [navOpen, setNavOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  const alerts = useMemo(
    () => state.log.filter((l) => l.severity === 'danger' || l.severity === 'warn').length,
    [state.log],
  )

  const onAdvance = useCallback(() => {
    advanceWeek()
  }, [advanceWeek])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNavOpen(false)
        setLogOpen(false)
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setLogOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const ticker = useMemo(
    () => [
      `第 ${state.week} 周 · 现金 ${money(state.money)}`,
      `在研项目 ${state.projects.filter((p) => p.stage !== 'released').length} 个`,
      `在册 ${derived.headcount} 人 · 已分配 ${derived.assigned} 人`,
      `平均士气 ${derived.avgMorale}`,
      `设备平均完好度 ${derived.gearHealth}`,
      `每周固定支出 ${money(derived.weeklyBurn)}`,
      `声望 ${state.reputation}`,
      `粉丝 ${state.fans.toLocaleString('zh-CN')}`,
    ],
    [state, derived],
  )

  return (
    <div className="relative z-10 flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:border-[3px] focus:border-ink focus:bg-paper-warm focus:px-4 focus:py-2 focus:font-head focus:font-800"
      >
        跳到主要内容
      </a>

      <SideNav open={navOpen} onClose={() => setNavOpen(false)} alerts={alerts} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onOpenNav={() => setNavOpen(true)}
          onOpenLog={() => setLogOpen(true)}
          alerts={alerts}
          onAdvance={onAdvance}
          onNotify={() =>
            toast.push({
              severity: 'info',
              title: '通知中心已移至右上角',
              detail: '点击铃铛或按 Ctrl/⌘ + K 可随时打开事件日志。',
              group: 'hint',
            })
          }
        />

        <div className="hidden md:block">
          <Marquee items={ticker} />
        </div>

        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: [0.2, 0.9, 0.25, 1] }}
              className="mx-auto w-full max-w-[92rem]"
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/studio" element={<Studio />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/development" element={<Development />} />
                <Route path="/narrative" element={<Narrative />} />
                <Route path="/market" element={<Market />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="border-t-[3px] border-ink bg-paper-dim/60 px-4 py-4 sm:px-6 lg:px-10">
          <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.2em] text-ink/45">
            {state.studio.latin} · FRONT-END PROTOTYPE · NO BACKEND ATTACHED
          </p>
        </footer>
      </div>

      <LogDrawer open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  )
}

/* --------------------------------------------------------------- 侧栏 */

function SideNav({
  open,
  onClose,
  alerts,
}: {
  open: boolean
  onClose: () => void
  alerts: number
}) {
  const { state } = useGame()

  const body = (
    <nav aria-label="主导航" className="flex h-full flex-col">
      <div className="border-b-[3px] border-paper-warm/20 px-5 py-5">
        <NavLink to="/" className="block" aria-label="返回总览">
          <span className="p5-skew inline-block bg-signal px-2 py-1">
            <span className="p5-unskew block font-display text-[1.05rem] uppercase leading-none tracking-[-0.01em] text-white">
              酒馆
            </span>
          </span>
          <span className="mt-2 block font-display text-[1.3rem] uppercase leading-none tracking-[-0.01em] text-paper-warm">
            STUDIO
          </span>
          <span className="mt-1.5 block font-mono text-[0.5625rem] font-700 uppercase tracking-[0.24em] text-paper-warm/45">
            {state.studio.founded}
          </span>
        </NavLink>
      </div>

      <ul className="flex-1 overflow-y-auto py-3">
        {NAV.map((item) => {
          const Ico = item.icon
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'group relative flex items-center gap-3 px-5 py-2.5 transition-colors duration-150',
                    isActive
                      ? 'bg-signal text-white'
                      : 'text-paper-warm/62 hover:bg-paper-warm/8 hover:text-paper-warm',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'absolute left-0 top-0 h-full w-[5px] transition-transform duration-200 ease-snap',
                        isActive ? 'scale-y-100 bg-paper-warm' : 'scale-y-0 bg-signal group-hover:scale-y-100',
                      )}
                    />
                    <Ico size={17} strokeWidth={2.4} aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-head text-[0.875rem] font-800 leading-tight">
                        {item.label}
                      </span>
                      <span className="block font-mono text-[0.5625rem] font-700 uppercase tracking-[0.2em] opacity-55">
                        {item.latin}
                      </span>
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>

      <div className="border-t-[3px] border-paper-warm/20 px-5 py-4">
        {alerts > 0 && (
          <p className="mb-2 flex items-center gap-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-signal-glow">
            <TriangleAlert size={13} strokeWidth={2.6} aria-hidden="true" />
            {alerts} 条待处理
          </p>
        )}
        <p className="text-[0.6875rem] leading-relaxed text-paper-warm/50">
          {state.studio.motto}
        </p>
      </div>
    </nav>
  )

  return (
    <>
      {/* 桌面常驻 */}
      <aside className="sticky top-0 hidden h-screen w-[15.5rem] shrink-0 border-r-[3px] border-ink bg-ink lg:block">
        {body}
      </aside>

      {/* 移动端抽屉 */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[85] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-ink/70 backdrop-blur-[2px]"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.85, 0, 0.15, 1] }}
              className="absolute inset-y-0 left-0 w-[17rem] max-w-[86vw] border-r-[3px] border-ink bg-ink"
              role="dialog"
              aria-modal="true"
              aria-label="主导航"
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭导航"
                className="absolute right-3 top-4 grid h-9 w-9 place-items-center border-[3px] border-paper-warm/40 text-paper-warm transition-colors hover:border-signal hover:bg-signal"
              >
                <X size={16} strokeWidth={3} aria-hidden="true" />
              </button>
              {body}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

/* --------------------------------------------------------------- 顶栏 */

function TopBar({
  onOpenNav,
  onOpenLog,
  alerts,
  onAdvance,
  onNotify,
}: {
  onOpenNav: () => void
  onOpenLog: () => void
  alerts: number
  onAdvance: () => void
  onNotify: () => void
}) {
  const { state, derived } = useGame()

  const health =
    derived.avgStamina < 55 ? 'danger' : derived.avgMorale < 60 ? 'warn' : 'good'

  return (
    <header className="sticky top-0 z-[70] border-b-[3px] border-ink bg-paper/92 backdrop-blur-[6px]">
      <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <button
          type="button"
          id="btn-open-nav"
          onClick={onOpenNav}
          aria-label="打开导航"
          className="grid h-10 w-10 shrink-0 place-items-center border-[3px] border-ink bg-paper-warm transition-colors hover:bg-ink hover:text-paper-warm lg:hidden"
        >
          <Menu size={18} strokeWidth={2.6} aria-hidden="true" />
        </button>

        <div className="hidden min-w-0 shrink-0 items-center gap-2.5 sm:flex">
          <span
            aria-hidden="true"
            className={clsx(
              'relative h-2.5 w-2.5 shrink-0',
              health === 'good' && 'bg-jade',
              health === 'warn' && 'bg-pulse',
              health === 'danger' && 'bg-signal',
            )}
          >
            {health !== 'good' && (
              <span
                className={clsx(
                  'absolute inset-0 animate-pulse-ring',
                  health === 'warn' ? 'bg-pulse' : 'bg-signal',
                )}
              />
            )}
          </span>
          <span className="truncate font-mono text-[0.6875rem] font-700 uppercase tracking-[0.2em] text-ink/60">
            {weekLabel(state.week)}
          </span>
        </div>

        <dl className="ml-auto flex items-center gap-2 overflow-x-auto no-scrollbar sm:gap-3">
          <Metric label="现金" value={money(state.money)} id="topbar-cash" tone="ink" />
          <Metric label="声望" value={String(state.reputation)} id="topbar-reputation" tone="signal" />
          <Metric label="士气" value={String(derived.avgMorale)} id="topbar-morale" tone="jade" />
        </dl>

        <button
          type="button"
          id="btn-notifications"
          onClick={onOpenLog}
          className="relative grid h-10 w-10 shrink-0 place-items-center border-[3px] border-ink bg-paper-warm transition-colors hover:bg-ink hover:text-paper-warm"
          aria-label={`打开事件日志，${alerts} 条待处理`}
        >
          <Bell size={17} strokeWidth={2.5} aria-hidden="true" />
          {alerts > 0 && (
            <span className="tabular absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center border-2 border-ink bg-signal px-1 font-mono text-[0.5625rem] font-700 text-white">
              {alerts}
            </span>
          )}
        </button>

        <Btn
          id="btn-advance-week"
          variant="signal"
          icon={CalendarPlus}
          onClick={onAdvance}
          className="shrink-0"
        >
          <span className="hidden sm:inline">推进一周</span>
          <span className="sm:hidden">推进</span>
        </Btn>

        <button
          type="button"
          id="btn-topbar-hint"
          onClick={onNotify}
          className="hidden shrink-0 border-[3px] border-ink bg-paper-warm px-2 py-1 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/55 transition-colors hover:bg-ink hover:text-paper-warm xl:block"
          aria-label="关于通知的说明"
        >
          in-app notice
        </button>
      </div>
    </header>
  )
}

function Metric({
  label,
  value,
  id,
  tone,
}: {
  label: string
  value: string
  id: string
  tone: 'ink' | 'signal' | 'jade'
}) {
  return (
    <div
      id={id}
      className="flex shrink-0 items-baseline gap-1.5 border-l-[3px] border-ink/15 pl-2.5 first:border-l-0 first:pl-0 sm:pl-3"
    >
      <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
        {label}
      </dt>
      <dd
        className={clsx(
          'tabular font-head text-[0.875rem] font-800',
          tone === 'signal' && 'text-signal',
          tone === 'jade' && 'text-jade',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/* --------------------------------------------------------------- 事件日志抽屉 */

function LogDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useGame()

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[88]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-ink/70 backdrop-blur-[3px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.85, 0, 0.15, 1] }}
            className="p5-noise absolute inset-y-0 right-0 flex w-full max-w-[30rem] flex-col border-l-[4px] border-ink bg-paper-warm"
            role="dialog"
            aria-modal="true"
            aria-label="事件日志"
          >
            <header className="flex items-start justify-between gap-4 border-b-[3px] border-ink bg-ink px-5 py-4 text-paper-warm">
              <div>
                <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.22em] text-signal-glow">
                  Event Log
                </p>
                <h2 className="mt-0.5 font-display text-[1.25rem] uppercase">事件日志</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭事件日志"
                className="grid h-9 w-9 place-items-center border-[3px] border-paper-warm/45 transition-colors hover:border-signal hover:bg-signal"
              >
                <X size={16} strokeWidth={3} aria-hidden="true" />
              </button>
            </header>

            <div className="flex items-center gap-2 border-b-[3px] border-ink/12 px-5 py-2.5">
              <Tag tone="ink">{state.log.length} 条记录</Tag>
              <Tag tone="signal">
                {state.log.filter((l) => l.severity === 'danger').length} 条警告
              </Tag>
            </div>

            <ol className="flex-1 overflow-y-auto">
              {state.log.map((entry) => (
                <li
                  key={entry.id}
                  className="border-b-2 border-ink/10 px-5 py-4 transition-colors duration-150 hover:bg-paper-dim/50"
                >
                  <div className="flex items-center gap-2.5">
                    <SeverityMark severity={entry.severity} />
                    <span className="tabular font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
                      W{entry.week}
                    </span>
                  </div>
                  <h3 className="mt-2 font-head text-[0.9375rem] font-800 leading-snug">
                    {entry.title}
                  </h3>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink/65">
                    {entry.detail}
                  </p>
                </li>
              ))}
            </ol>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
