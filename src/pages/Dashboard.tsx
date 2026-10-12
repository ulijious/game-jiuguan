import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BatteryWarning,
  BookOpenText,
  Building2,
  CalendarClock,
  Coins,
  Flame,
  HeartHandshake,
  MoveRight,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useGame } from '../lib/store'
import { useToast } from '../lib/toast'
import { dueLabel, money, weekLabel } from '../lib/format'
import { GENRE_META, STAGE_META } from '../data/seed'
import type { Project } from '../data/types'
import {
  Avatar,
  Btn,
  Kicker,
  Marquee,
  Meter,
  Modal,
  PageHeader,
  Panel,
  PanelHead,
  Slab,
  Sparkline,
  StatTile,
  Tag,
} from '../lib/ui'
import { SeverityMark } from '../components/SeverityMark'

const UNITS_TREND = [980, 1420, 1180, 1640, 1310, 1720, 1480, 1210, 1060, 940, 880, 760]

export default function Dashboard() {
  const { state, derived, advanceWeek } = useGame()
  const toast = useToast()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<Project | null>(null)
  const [teamOpen, setTeamOpen] = useState(false)

  const active = useMemo(
    () => state.projects.filter((p) => p.stage !== 'released'),
    [state.projects],
  )
  const lead = active[0] ?? state.projects[0]
  const released = state.projects.find((p) => p.stage === 'released')

  const atRisk = useMemo(
    () =>
      state.staff
        .filter((s) => s.stamina < 55 || s.morale < 62)
        .sort((a, b) => a.stamina - b.stamina)
        .slice(0, 4),
    [state.staff],
  )

  const unassigned = useMemo(
    () => state.staff.filter((s) => !s.roomId),
    [state.staff],
  )

  return (
    <>
      <PageHeader
        kicker="总览"
        title="工作室概况"
        latin="OVERVIEW / STUDIO AT A GLANCE"
        lede={`${weekLabel(state.week)}。${state.studio.motto}当前有 ${active.length} 个在研项目、${derived.headcount} 名在册成员，其中 ${derived.assigned} 人已有固定工位。`}
        actions={
          <>
            <Btn
              id="dash-open-team"
              icon={Users}
              onClick={() => setTeamOpen(true)}
            >
              团队速览
            </Btn>
            <Btn
              id="dash-advance"
              variant="signal"
              icon={CalendarClock}
              onClick={() => advanceWeek()}
            >
              推进一周
            </Btn>
          </>
        }
      />

      {/* ---------------------------------------------------------- 名片主视觉 */}
      <section aria-labelledby="dash-identity" className="mb-6">
        <Panel as="article" cut="both" className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
            <div className="relative order-2 border-ink p-6 sm:p-8 lg:order-1">
              <span
                aria-hidden="true"
                className="p5-halftone-red absolute -right-6 -top-4 h-40 w-40 opacity-30"
              />
              <Kicker>Founded {state.studio.founded}</Kicker>
              <h2
                id="dash-identity"
                className="mt-3 font-display text-[clamp(2.2rem,6vw,4rem)] uppercase leading-[0.9] tracking-[-0.03em]"
              >
                {state.studio.name}
              </h2>
              <p
                lang="en"
                className="mt-2 font-display text-[0.9375rem] uppercase tracking-[0.34em] text-signal"
              >
                {state.studio.latin}
              </p>

              <p className="mt-5 max-w-[44ch] border-l-[3px] border-ink pl-4 text-[1rem] leading-relaxed text-ink/78">
                {state.studio.motto}
              </p>
              <p className="mt-1.5 pl-[19px] font-mono text-[0.625rem] font-700 uppercase tracking-[0.24em] text-ink/40">
                {state.studio.mottoEn}
              </p>

              <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat id="dash-mini-floor" label="楼层" value={String(state.floors.length)} unit="层" />
                <MiniStat id="dash-mini-room" label="功能房间" value={String(derived.roomCount)} unit="间" />
                <MiniStat id="dash-mini-head" label="在册" value={String(derived.headcount)} unit="人" />
                <MiniStat id="dash-mini-gear" label="设备完好" value={String(derived.gearHealth)} unit="%" />
              </dl>
            </div>

            <div className="order-1 flex flex-col justify-between gap-5 border-b-[3px] border-ink bg-ink p-6 text-paper-warm sm:p-8 lg:order-2 lg:border-b-0 lg:border-l-[3px]">
              <div>
                <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.24em] text-signal-glow">
                  Current Project
                </p>
                <h3 className="mt-2 font-display text-[1.75rem] uppercase leading-tight">
                  {lead.title}
                </h3>
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-paper-warm/65">
                  {lead.subtitle}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Tag tone="signal">{STAGE_META[lead.stage].label}</Tag>
                  {lead.genre.map((g) => (
                    <Tag key={g} tone="ink" className="!border-paper-warm/45 !bg-ink !text-paper-warm">
                      {GENRE_META[g].label}
                    </Tag>
                  ))}
                </div>
              </div>

              <div>
                <Meter
                  id="dash-lead-progress"
                  value={lead.progress}
                  tone="signal"
                  label="整体完成度"
                  showValue
                  height={14}
                />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="font-mono text-[0.6875rem] font-700 uppercase tracking-[0.16em] text-paper-warm/60">
                    {dueLabel(lead.deadlineWeek, state.week)}
                  </p>
                  <Btn
                    id={`dash-open-${lead.id}`}
                    size="sm"
                    onClick={() => setDetail(lead)}
                  >
                    项目详情
                    <MoveRight size={14} strokeWidth={2.6} aria-hidden="true" />
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <div className="mb-6">
        <Marquee
          items={[
            `第 ${state.week} 周经营中`,
            `${active.length} 个项目在研`,
            `每周固定支出 ${money(derived.weeklyBurn)}`,
            derived.runwayWeeks >= 99
              ? '现金充裕：发行分成已覆盖全部固定支出'
              : `现金可支撑 ${derived.runwayWeeks} 周`,
            `平均士气 ${derived.avgMorale}`,
            `未分配人员 ${unassigned.length} 人`,
          ]}
          tone="signal"
          speed="fast"
        />
      </div>

      {/* ---------------------------------------------------------- 关键指标 */}
      <section aria-labelledby="dash-kpi" className="mb-6">
        <h2 id="dash-kpi" className="sr-only">
          关键指标
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            id="kpi-cash"
            icon={Coins}
            label="账面现金"
            value={money(state.money)}
            delta={{ dir: 'up', text: '3.4%' }}
            tone="ink"
            hint={`每周净额受发行分成与固定支出共同影响`}
          />
          <StatTile
            id="kpi-reputation"
            icon={Star}
            label="行业声望"
            value={String(state.reputation)}
            unit="/100"
            delta={{ dir: 'up', text: '2' }}
            hint="声望决定发行商谈判额度与人才吸引力"
          />
          <StatTile
            id="kpi-fans"
            icon={Flame}
            label="累计粉丝"
            value={state.fans.toLocaleString('zh-CN')}
            delta={{ dir: 'down', text: '0.8%' }}
            hint="新作公布前，粉丝自然流失约为每周 0.3%"
          />
          <StatTile
            id="kpi-morale"
            icon={HeartHandshake}
            label="团队士气"
            value={String(derived.avgMorale)}
            unit="/100"
            delta={{ dir: derived.avgMorale >= 70 ? 'up' : 'down', text: '1' }}
            tone={derived.avgMorale < 60 ? 'signal' : 'paper'}
            hint={`平均体力 ${derived.avgStamina}，低于 55 将触发离职风险`}
          />
        </div>
      </section>

      {/* ---------------------------------------------------------- 三栏 */}
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        {/* 左栏 */}
        <div className="flex flex-col gap-5">
          <Panel cut="tr">
            <PanelHead
              icon="ScrollText"
              title="在研项目"
              latin="Projects in flight"
              right={
                <Link
                  to="/projects"
                  id="dash-link-projects"
                  className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-signal hover:underline"
                >
                  全部企划
                  <ArrowUpRight size={13} strokeWidth={2.8} aria-hidden="true" />
                </Link>
              }
            />
            <ul className="divide-y-[3px] divide-ink/10">
              {active.map((p) => (
                <li key={p.id} className="group">
                  <button
                    type="button"
                    id={`dash-project-${p.id}`}
                    onClick={() => setDetail(p)}
                    className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors duration-150 hover:bg-paper-dim/60 sm:flex-row sm:items-center sm:gap-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <Slab tone="ink">{STAGE_META[p.stage].label}</Slab>
                        <span className="truncate font-head text-[1rem] font-800">
                          {p.title}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-[0.8125rem] text-ink/60">
                        {p.theme} · 目标平台 {p.platform.join(' / ')}
                      </p>
                      <div className="mt-2.5">
                        <Meter
                          value={p.progress}
                          tone={p.stage === 'alpha' ? 'signal' : 'ink'}
                          label={`${p.title} 完成度`}
                          showValue
                          height={10}
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                      <span className="tabular font-display text-[1.5rem] leading-none text-signal">
                        {p.progress}%
                      </span>
                      <span className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/50">
                        {dueLabel(p.deadlineWeek, state.week)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel cut="tr">
            <PanelHead
              icon="Boxes"
              title="最新事件"
              latin="Event log"
              right={
                <Link
                  to="/studio"
                  id="dash-link-studio"
                  className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-signal hover:underline"
                >
                  进入工作室
                  <ArrowUpRight size={13} strokeWidth={2.8} aria-hidden="true" />
                </Link>
              }
            />
            <ol className="divide-y-[3px] divide-ink/10">
              {state.log.slice(0, 4).map((entry) => (
                <li key={entry.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <SeverityMark severity={entry.severity} />
                    <span className="tabular font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
                      W{entry.week}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-head text-[0.9375rem] font-800 leading-snug">
                    {entry.title}
                  </h3>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink/62">
                    {entry.detail}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        {/* 右栏 */}
        <div className="flex flex-col gap-5">
          <Panel tone="ink" cut="bl">
            <PanelHead
              tone="ink"
              icon="Boxes"
              title="已发行作品表现"
              latin={released?.title ?? 'No release'}
            />
            <div className="px-4 py-4">
              {released?.release ? (
                <>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.2em] text-paper-warm/50">
                        累计销量
                      </p>
                      <p className="tabular font-display text-[2.25rem] leading-none">
                        {(released.release.units / 10000).toFixed(2)}
                        <span className="ml-1.5 font-head text-[0.875rem] text-paper-warm/60">
                          万套
                        </span>
                      </p>
                    </div>
                    <Tag tone="pulse">媒体 {released.release.score} 分</Tag>
                  </div>

                  <div className="mt-4 border-t-[3px] border-paper-warm/20 pt-4">
                    <p className="mb-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-paper-warm/50">
                      近 12 周销量走势
                    </p>
                    <Sparkline
                      points={UNITS_TREND}
                      width={260}
                      height={48}
                      tone="#FF2A48"
                      label="《机工协奏曲》近 12 周销量走势，呈长尾下降"
                    />
                    <p className="mt-2 text-[0.75rem] leading-relaxed text-paper-warm/55">
                      长尾期第 14 周，周销量已回落至峰值的三成。续作公布可显著抬升基线。
                    </p>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t-[3px] border-paper-warm/20 pt-4">
                    <div>
                      <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-paper-warm/45">
                        发行收入
                      </dt>
                      <dd className="tabular font-head text-[1rem] font-800">
                        {money(released.release.revenue)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-paper-warm/45">
                        实际成本
                      </dt>
                      <dd className="tabular font-head text-[1rem] font-800">
                        {money(released.spent)}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="text-[0.875rem] text-paper-warm/60">尚无已发行作品。</p>
              )}
            </div>
          </Panel>

          <Panel cut="tr">
            <PanelHead
              icon="PersonStanding"
              title="需要关注的人"
              latin="Attention required"
              right={<Tag tone="signal">{atRisk.length}</Tag>}
            />
            {atRisk.length === 0 ? (
              <p className="px-4 py-5 text-[0.875rem] text-ink/60">
                全员状态良好，本周无需特别干预。
              </p>
            ) : (
              <ul className="divide-y-[3px] divide-ink/10">
                {atRisk.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={s.name} size={38} index={i} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-head text-[0.875rem] font-800">
                        {s.name}
                        <span className="ml-2 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                          {s.title}
                        </span>
                      </p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="tabular font-mono text-[0.625rem] font-700 text-ink/55">
                          体力 {s.stamina}
                        </span>
                        <span className="tabular font-mono text-[0.625rem] font-700 text-ink/55">
                          士气 {s.morale}
                        </span>
                      </div>
                    </div>
                    {s.stamina < 55 && (
                      <BatteryWarning
                        size={16}
                        strokeWidth={2.5}
                        className="shrink-0 text-signal"
                        aria-label="体力偏低"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel cut="tr">
            <PanelHead icon="Layers" title="快速入口" latin="Shortcuts" />
            <div className="grid grid-cols-2 gap-0 divide-x-[3px] divide-y-[3px] divide-ink/10">
              {[
                { to: '/studio', label: '工作室', latin: 'Studio', icon: Building2 },
                { to: '/staff', label: '人员', latin: 'Personnel', icon: Users },
                { to: '/narrative', label: '剧情工坊', latin: 'Narrative', icon: BookOpenText },
                { to: '/market', label: '市场', latin: 'Market', icon: TrendingUp },
              ].map((q) => (
                <Link
                  key={q.to}
                  to={q.to}
                  id={`dash-quick-${q.to.replace('/', '')}`}
                  className="p5-flood group flex flex-col gap-2 p-4 transition-transform duration-200 ease-snap hover:-translate-y-[2px]"
                >
                  <q.icon size={18} strokeWidth={2.4} aria-hidden="true" />
                  <span>
                    <span className="block font-head text-[0.875rem] font-800">
                      {q.label}
                    </span>
                    <span className="block font-mono text-[0.5625rem] font-700 uppercase tracking-[0.2em] opacity-55">
                      {q.latin}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* ---------------------------------------------------------- 模态框 */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.title ?? ''}
        latin={detail ? STAGE_META[detail.stage].label : undefined}
        kicker="项目详情"
        size="lg"
        footer={
          <>
            <Btn id="dash-modal-close" onClick={() => setDetail(null)}>
              关闭
            </Btn>
            <Btn
              id="dash-modal-goto"
              variant="signal"
              onClick={() => {
                setDetail(null)
                navigate('/projects')
                toast.push({
                  severity: 'info',
                  title: '已跳转至企划页',
                  detail: '在「企划」中可调整立项参数、预算与里程碑负责人。',
                  group: 'nav',
                })
              }}
            >
              前往企划页处理
            </Btn>
          </>
        }
      >
        {detail && (
          <div className="space-y-5">
            <p className="border-l-[3px] border-signal pl-4 text-[0.9375rem] leading-relaxed text-ink/78">
              {detail.subtitle}　—　{detail.hook}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="题材">{detail.theme}</Field>
              <Field label="目标平台">{detail.platform.join(' / ')}</Field>
              <Field label="预算">
                <span className="tabular">{money(detail.budget)}</span>
              </Field>
              <Field label="已支出">
                <span className="tabular">{money(detail.spent)}</span>
              </Field>
              <Field label="交期">
                {dueLabel(detail.deadlineWeek, state.week)}
              </Field>
              <Field label="主责">
                {state.staff.find((s) => s.id === detail.leadId)?.name ?? '—'}
              </Field>
            </div>

            <section aria-labelledby="dash-detail-quality">
              <h3
                id="dash-detail-quality"
                className="mb-3 font-mono text-[0.625rem] font-700 uppercase tracking-[0.2em] text-ink/55"
              >
                品质预估
              </h3>
              <div className="space-y-3">
                <Meter
                  id="dash-q-fun"
                  value={detail.quality.fun}
                  label="趣味性"
                  showValue
                  tone="signal"
                />
                <Meter
                  id="dash-q-narr"
                  value={detail.quality.narrative}
                  label="叙事"
                  showValue
                  tone="royal"
                />
                <Meter
                  id="dash-q-tech"
                  value={detail.quality.tech}
                  label="技术"
                  showValue
                  tone="ice"
                />
                <Meter
                  id="dash-q-polish"
                  value={detail.quality.polish}
                  label="打磨度"
                  showValue
                  tone="pulse"
                />
              </div>
            </section>

            <section aria-labelledby="dash-detail-ms">
              <h3
                id="dash-detail-ms"
                className="mb-3 font-mono text-[0.625rem] font-700 uppercase tracking-[0.2em] text-ink/55"
              >
                里程碑
              </h3>
              <ul className="space-y-2.5">
                {detail.milestones.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-col gap-2 border-[3px] border-ink/15 p-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-head text-[0.875rem] font-800">
                        {m.name}
                      </span>
                      <span className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                        {m.owner} · {dueLabel(m.dueWeek, state.week)}
                      </span>
                    </span>
                    <span className="sm:w-40">
                      <Meter value={m.progress} showValue height={10} />
                    </span>
                    {m.dueWeek < state.week && m.progress < 100 && (
                      <Tag tone="signal">超期</Tag>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </Modal>

      <Modal
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
        title="团队速览"
        latin="Headcount & Morale"
        kicker="人员"
        size="lg"
        footer={
          <Btn id="dash-team-close" onClick={() => setTeamOpen(false)}>
            关闭
          </Btn>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            id="team-tile-head"
            icon={Users}
            label="在册"
            value={String(derived.headcount)}
            unit="人"
          />
          <StatTile
            id="team-tile-assigned"
            icon={Building2}
            label="已分配工位"
            value={String(derived.assigned)}
            unit="人"
          />
          <StatTile
            id="team-tile-idle"
            icon={Sparkles}
            label="待分配"
            value={String(unassigned.length)}
            unit="人"
            tone={unassigned.length > 3 ? 'signal' : 'paper'}
          />
        </div>

        <div className="mt-5 space-y-3">
          <Meter
            id="team-avg-morale"
            value={derived.avgMorale}
            label="平均士气"
            showValue
            tone="jade"
          />
          <Meter
            id="team-avg-stamina"
            value={derived.avgStamina}
            label="平均体力"
            showValue
            tone={derived.avgStamina < 55 ? 'signal' : 'ink'}
          />
          <Meter
            id="team-payroll"
            value={Math.min(100, (derived.payroll / 25000) * 100)}
            label={`周薪总额 ${money(derived.payroll)}（规模 2.5 万为满格）`}
            showValue
          />
        </div>

        <h3 className="mt-6 mb-3 font-mono text-[0.625rem] font-700 uppercase tracking-[0.2em] text-ink/55">
          未分配人员
        </h3>
        {unassigned.length === 0 ? (
          <p className="text-[0.875rem] text-ink/60">全部人员均已分配工位。</p>
        ) : (
          <ul className="flex flex-wrap gap-2.5">
            {unassigned.map((s, i) => (
              <li key={s.id}>
                <span
                  id={`team-idle-${s.id}`}
                  className="inline-flex items-center gap-2 border-[3px] border-ink bg-paper px-2.5 py-1.5"
                >
                  <Avatar name={s.name} size={26} index={i} />
                  <span className="font-head text-[0.8125rem] font-800">{s.name}</span>
                  <span className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/50">
                    {s.title}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  )
}

function MiniStat({
  id,
  label,
  value,
  unit,
}: {
  id: string
  label: string
  value: string
  unit: string
}) {
  return (
    <div id={id} className="border-[3px] border-ink bg-paper px-3 py-2.5">
      <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
        {label}
      </dt>
      <dd className="tabular font-display text-[1.25rem] leading-none">
        {value}
        <span className="ml-1 font-head text-[0.6875rem] font-700 text-ink/55">{unit}</span>
      </dd>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-[3px] border-ink/15 px-3 py-2.5">
      <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
        {label}
      </dt>
      <dd className="mt-1 font-head text-[0.875rem] font-800">{children}</dd>
    </div>
  )
}
