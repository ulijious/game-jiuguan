import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  ArrowRight,
  Check,
  ClipboardList,
  Coins,
  Flag,
  Rocket,
  Target,
  Users,
} from 'lucide-react'
import { useToast } from '../lib/toast'
import { useGame } from '../lib/store'
import { dueLabel, money, weekLabel } from '../lib/format'
import { GENRE_META, STAGE_META } from '../data/seed'
import type { Project, ProjectStage } from '../data/types'
import {
  Avatar,
  Btn,
  EmptyState,
  Kicker,
  Meter,
  Modal,
  PageHeader,
  Panel,
  PanelHead,
  Slab,
  StatTile,
  TabPanel,
  Tabs,
  Tag,
} from '../lib/ui'

type Genre = 'sim' | 'dev' | 'story'

const STAGE_ORDER: ProjectStage[] = [
  'concept',
  'prototype',
  'alpha',
  'beta',
  'gold',
  'released',
]

const SCALES = [
  { id: 'small', label: '小品级', blurb: '4–6 个月，2–4 人，适合验证新想法', budget: 640_000 },
  { id: 'mid', label: '标准级', blurb: '8–12 个月，5–8 人，工作室的主力产能', budget: 1_850_000 },
  { id: 'large', label: '旗舰级', blurb: '14–20 个月，全员投入，决定工作室的下一阶段', budget: 4_200_000 },
] as const

const PLATFORMS = ['PC', 'Switch', 'PS5', 'Xbox', '移动']

const THEMES = [
  '雨、家常菜、未说出口的话',
  '机械、城市、共鸣',
  '季节、方言、慢旅行',
  '深夜电台、失物招领',
  '旧书店、手写批注、未寄出的信',
  '山顶气象站、值班表、沉默的同事',
]

export default function Projects() {
  const { state, derived, promoteProject } = useGame()
  const toast = useToast()

  const [tab, setTab] = useState('active')
  const [detail, setDetail] = useState<Project | null>(null)
  const [detailTab, setDetailTab] = useState('overview')
  const [wizardOpen, setWizardOpen] = useState(false)

  const liveDetail = detail ? state.projects.find((p) => p.id === detail.id) ?? null : null

  const active = state.projects.filter((p) => p.stage !== 'released')
  const released = state.projects.filter((p) => p.stage === 'released')

  const totals = useMemo(
    () =>
      state.projects.reduce(
        (acc, p) => ({
          budget: acc.budget + p.budget,
          spent: acc.spent + p.spent,
        }),
        { budget: 0, spent: 0 },
      ),
    [state.projects],
  )

  const allMilestones = useMemo(
    () =>
      active.flatMap((p) =>
        p.milestones.map((m) => ({ ...m, project: p })),
      ),
    [active],
  )

  const staffById = useMemo(() => {
    const m = new Map(state.staff.map((s) => [s.id, s]))
    return m
  }, [state.staff])

  return (
    <>
      <PageHeader
        kicker="企划"
        title="项目与立项"
        latin="PROJECTS / GREENLIGHT"
        lede={`${active.length} 个在研项目、${released.length} 个已发行作品。立项一旦通过，工作室的产能与现金流就会被这个决定绑定数月。`}
        actions={
          <Btn
            id="projects-open-wizard"
            variant="signal"
            icon={Rocket}
            onClick={() => setWizardOpen(true)}
          >
            立项新作
          </Btn>
        }
      />

      <section aria-labelledby="proj-kpi" className="mb-6">
        <h2 id="proj-kpi" className="sr-only">
          项目指标
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            id="proj-tile-active"
            icon={ClipboardList}
            label="在研项目"
            value={String(active.length)}
            unit="个"
            hint={`平均完成度 ${Math.round(active.reduce((s, p) => s + p.progress, 0) / Math.max(1, active.length))}%`}
          />
          <StatTile
            id="proj-tile-budget"
            icon={Coins}
            label="累计预算"
            value={money(totals.budget)}
            tone="ink"
            hint={`其中已支出 ${money(totals.spent)}`}
          />
          <StatTile
            id="proj-tile-burn"
            icon={Target}
            label="预算消耗率"
            value={`${Math.round((totals.spent / Math.max(1, totals.budget)) * 100)}%`}
            tone={totals.spent / totals.budget > 0.75 ? 'signal' : 'paper'}
            hint="超过 80% 且进度落后时，需要重新评估排期"
          />
          <StatTile
            id="proj-tile-deliver"
            icon={Flag}
            label="最近交期"
            value={
              active.length
                ? weekLabel(Math.min(...active.map((p) => p.deadlineWeek)))
                : '—'
            }
            hint="所有在研项目中最靠前的一个截止周"
          />
        </div>
      </section>

      <Tabs
        idPrefix="proj"
        active={tab}
        onChange={setTab}
        items={[
          { id: 'active', label: '在研项目', latin: 'In flight', count: active.length },
          { id: 'milestones', label: '里程碑总览', latin: 'Milestones', count: allMilestones.length },
          { id: 'released', label: '已发行', latin: 'Shipped', count: released.length },
        ]}
        className="mb-5"
      />

      {/* ---------------------------------------------------------- 在研项目 */}
      <TabPanel idPrefix="proj" id="active">
        {active.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="目前没有在研项目"
            hint="工作室的产能正在空转。考虑立项一个新作，或让团队进入休整。"
            action={
              <Btn
                id="projects-empty-wizard"
                variant="signal"
                icon={Rocket}
                onClick={() => setWizardOpen(true)}
              >
                立项新作
              </Btn>
            }
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {active.map((p) => {
              const spendRatio = p.spent / Math.max(1, p.budget)
              const behind = p.progress < (spendRatio - 0.05) * 100
              const stageIndex = STAGE_ORDER.indexOf(p.stage)
              return (
                <Panel key={p.id} as="article" cut="tr" className="flex flex-col">
                  <header className="flex items-start gap-4 border-b-[3px] border-ink p-4">
                    <span
                      aria-hidden="true"
                      className="p5-halftone-red grid h-14 w-14 shrink-0 place-items-center border-[3px] border-ink bg-paper-warm font-display text-[1.5rem] leading-none"
                    >
                      {p.title.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Slab tone={p.stage === 'alpha' ? 'signal' : 'ink'}>
                          {STAGE_META[p.stage].label}
                        </Slab>
                        {behind && <Tag tone="signal">进度落后</Tag>}
                      </div>
                      <h3 className="mt-2 font-display text-[1.375rem] uppercase leading-none">
                        {p.title}
                      </h3>
                      <p className="mt-1 truncate text-[0.8125rem] text-ink/62">{p.subtitle}</p>
                    </div>
                  </header>

                  {/* 阶段轨道 */}
                  <div className="border-b-[3px] border-ink/12 px-4 py-3">
                    <ol className="flex items-center gap-1.5">
                      {STAGE_ORDER.slice(0, 5).map((s, i) => (
                        <li key={s} className="flex flex-1 items-center gap-1.5">
                          <span
                            className={clsx(
                              'flex-1 border-[3px] border-ink px-1.5 py-1 text-center font-mono text-[0.5rem] font-700 uppercase tracking-[0.08em]',
                              i < stageIndex
                                ? 'bg-ink text-paper-warm'
                                : i === stageIndex
                                  ? 'bg-signal text-white'
                                  : 'bg-paper text-ink/40',
                            )}
                          >
                            {STAGE_META[s].label}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="flex-1 p-4">
                    <blockquote className="border-l-[4px] border-signal pl-3.5 text-[0.875rem] leading-relaxed text-ink/78">
                      {p.hook}
                    </blockquote>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2.5">
                        <Meter
                          value={p.quality.fun}
                          label="趣味性"
                          showValue
                          tone="signal"
                          height={10}
                        />
                        <Meter
                          value={p.quality.narrative}
                          label="叙事"
                          showValue
                          tone="royal"
                          height={10}
                        />
                        <Meter
                          value={p.quality.tech}
                          label="技术"
                          showValue
                          tone="ice"
                          height={10}
                        />
                        <Meter
                          value={p.quality.polish}
                          label="打磨度"
                          showValue
                          tone="pulse"
                          height={10}
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="border-[3px] border-ink/15 px-3 py-2.5">
                          <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
                            整体完成度
                          </p>
                          <p className="tabular font-display text-[1.75rem] leading-none text-signal">
                            {p.progress}%
                          </p>
                          <div className="mt-2">
                            <Meter value={p.progress} height={9} />
                          </div>
                        </div>
                        <div className="border-[3px] border-ink/15 px-3 py-2.5">
                          <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
                            预算消耗
                          </p>
                          <p className="tabular mt-0.5 font-head text-[0.9375rem] font-800">
                            {money(p.spent)}
                            <span className="text-ink/50"> / {money(p.budget)}</span>
                          </p>
                          <div className="mt-2">
                            <Meter
                              value={spendRatio * 100}
                              height={9}
                              tone={spendRatio > 0.8 ? 'signal' : 'ink'}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <footer className="flex flex-wrap items-center gap-3 border-t-[3px] border-ink px-4 py-3">
                    <ul className="flex items-center gap-1.5">
                      {p.teamIds.slice(0, 5).map((tid, i) => {
                        const person = staffById.get(tid)
                        if (!person) return null
                        return (
                          <li key={tid} title={`${person.name} · ${person.title}`}>
                            <Avatar name={person.name} size={26} index={i} />
                          </li>
                        )
                      })}
                      {p.teamIds.length > 5 && (
                        <li className="font-mono text-[0.625rem] font-700 text-ink/55">
                          +{p.teamIds.length - 5}
                        </li>
                      )}
                    </ul>
                    <span className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/55">
                      {dueLabel(p.deadlineWeek, state.week)}
                    </span>
                    <span className="ml-auto flex gap-2">
                      <Btn
                        id={`proj-detail-${p.id}`}
                        size="sm"
                        onClick={() => {
                          setDetail(p)
                          setDetailTab('overview')
                        }}
                      >
                        详情
                      </Btn>
                      <Btn
                        id={`proj-promote-${p.id}`}
                        size="sm"
                        variant="signal"
                        icon={ArrowRight}
                        onClick={() => promoteProject(p.id)}
                      >
                        推进阶段
                      </Btn>
                    </span>
                  </footer>
                </Panel>
              )
            })}
          </div>
        )}
      </TabPanel>

      {/* ---------------------------------------------------------- 里程碑 */}
      <TabPanel idPrefix="proj" id="milestones">
        <Panel cut="tr">
          <PanelHead
            icon="ClipboardList"
            title="全部里程碑"
            latin="All milestones"
            right={<Tag tone="ink">{allMilestones.length} 项</Tag>}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <caption className="sr-only">所有在研项目的里程碑、负责人、进度与截止情况</caption>
              <thead>
                <tr className="border-b-[3px] border-ink bg-paper-dim/70">
                  <Th>里程碑</Th>
                  <Th>所属项目</Th>
                  <Th>负责人</Th>
                  <Th>进度</Th>
                  <Th>截止</Th>
                  <Th align="right">状态</Th>
                </tr>
              </thead>
              <tbody>
                {allMilestones.map((m) => {
                  const overdue = m.dueWeek < state.week && m.progress < 100
                  return (
                    <tr
                      key={`${m.project.id}-${m.id}`}
                      className="border-b-2 border-ink/10 transition-colors duration-150 hover:bg-paper-dim/45"
                    >
                      <Td>
                        <span className="font-head text-[0.875rem] font-800">{m.name}</span>
                      </Td>
                      <Td>
                        <button
                          type="button"
                          id={`proj-ms-open-${m.project.id}-${m.id}`}
                          onClick={() => {
                            setDetail(m.project)
                            setDetailTab('milestones')
                          }}
                          className="font-mono text-[0.75rem] font-700 text-ink/70 hover:text-signal"
                        >
                          {m.project.title}
                        </button>
                      </Td>
                      <Td>
                        <span className="text-[0.8125rem]">{m.owner}</span>
                      </Td>
                      <Td>
                        <span className="flex w-36 items-center gap-2">
                          <Meter
                            value={m.progress}
                            height={9}
                            tone={overdue ? 'signal' : 'ink'}
                          />
                          <span className="tabular font-mono text-[0.6875rem] font-700">
                            {m.progress}%
                          </span>
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-[0.6875rem] font-700 uppercase tracking-[0.12em] text-ink/60">
                          {dueLabel(m.dueWeek, state.week)}
                        </span>
                      </Td>
                      <Td align="right">
                        {m.progress >= 100 ? (
                          <Tag tone="jade">已完成</Tag>
                        ) : overdue ? (
                          <Tag tone="signal">超期</Tag>
                        ) : (
                          <Tag tone="pulse">进行中</Tag>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </TabPanel>

      {/* ---------------------------------------------------------- 已发行 */}
      <TabPanel idPrefix="proj" id="released">
        {released.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="还没有作品发行"
            hint="第一作发行后，这里会记录销量、评分与收入。"
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {released.map((p) => (
              <Panel key={p.id} as="article" tone="ink" cut="bl" className="p-5">
                <Kicker tone="paper">已发行 · {weekLabel(p.release?.week ?? state.week)}</Kicker>
                <h3 className="mt-2.5 font-display text-[1.75rem] uppercase leading-none">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-[0.875rem] text-paper-warm/65">{p.subtitle}</p>

                <dl className="mt-5 grid grid-cols-2 gap-4 border-t-[3px] border-paper-warm/20 pt-4 sm:grid-cols-4">
                  <div>
                    <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-paper-warm/45">
                      销量
                    </dt>
                    <dd className="tabular font-display text-[1.25rem] leading-none">
                      {((p.release?.units ?? 0) / 10000).toFixed(2)}
                      <span className="ml-1 font-head text-[0.6875rem] text-paper-warm/60">
                        万
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-paper-warm/45">
                      媒体评分
                    </dt>
                    <dd className="tabular font-display text-[1.25rem] leading-none">
                      {p.release?.score ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-paper-warm/45">
                      发行收入
                    </dt>
                    <dd className="tabular font-display text-[1.25rem] leading-none">
                      {money(p.release?.revenue ?? 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-paper-warm/45">
                      成本回收
                    </dt>
                    <dd className="tabular font-display text-[1.25rem] leading-none">
                      {Math.round(((p.release?.revenue ?? 0) / Math.max(1, p.spent)) * 100)}%
                    </dd>
                  </div>
                </dl>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {p.platform.map((pl) => (
                    <li key={pl}>
                      <Tag tone="ink" className="!border-paper-warm/45 !bg-ink !text-paper-warm">
                        {pl}
                      </Tag>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
          </div>
        )}
      </TabPanel>

      {/* ------------------------------------------------------- 项目详情 */}
      <Modal
        open={liveDetail !== null}
        onClose={() => setDetail(null)}
        title={liveDetail?.title ?? ''}
        latin={liveDetail ? STAGE_META[liveDetail.stage].label : undefined}
        kicker="项目详情"
        size="lg"
        footer={
          <>
            <Btn id="proj-detail-close" onClick={() => setDetail(null)}>
              关闭
            </Btn>
            {liveDetail && liveDetail.stage !== 'released' && (
              <Btn
                id={`proj-detail-promote-${liveDetail.id}`}
                variant="signal"
                icon={ArrowRight}
                onClick={() => promoteProject(liveDetail.id)}
              >
                推进至下一阶段
              </Btn>
            )}
          </>
        }
      >
        {liveDetail && (
          <div className="space-y-5">
            <blockquote className="border-l-[4px] border-signal bg-paper-dim/50 px-4 py-3">
              <p className="text-[0.9375rem] leading-relaxed">{liveDetail.hook}</p>
              <footer className="mt-2 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.2em] text-ink/50">
                {liveDetail.theme}
              </footer>
            </blockquote>

            <Tabs
              idPrefix="proj-detail"
              active={detailTab}
              onChange={setDetailTab}
              items={[
                { id: 'overview', label: '概览', latin: 'Overview' },
                {
                  id: 'milestones',
                  label: '里程碑',
                  latin: 'Milestones',
                  count: liveDetail.milestones.length,
                },
                { id: 'team', label: '团队', latin: 'Team', count: liveDetail.teamIds.length },
              ]}
            />

            <TabPanel idPrefix="proj-detail" id="overview" className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniField
                  label="类型"
                  value={liveDetail.genre.map((g) => GENRE_META[g].label).join(' · ')}
                />
                <MiniField label="目标平台" value={liveDetail.platform.join(' / ')} />
                <MiniField label="预算" value={money(liveDetail.budget)} />
                <MiniField label="已支出" value={money(liveDetail.spent)} />
                <MiniField label="交期" value={dueLabel(liveDetail.deadlineWeek, state.week)} />
                <MiniField
                  label="主责"
                  value={staffById.get(liveDetail.leadId)?.name ?? '—'}
                />
              </div>

              <h3 className="mt-5 mb-3 font-mono text-[0.625rem] font-700 uppercase tracking-[0.2em] text-ink/55">
                品质预估明细
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Meter id={`pd-fun-${liveDetail.id}`} value={liveDetail.quality.fun} label="趣味性" showValue tone="signal" />
                <Meter id={`pd-nar-${liveDetail.id}`} value={liveDetail.quality.narrative} label="叙事" showValue tone="royal" />
                <Meter id={`pd-tec-${liveDetail.id}`} value={liveDetail.quality.tech} label="技术" showValue tone="ice" />
                <Meter id={`pd-pol-${liveDetail.id}`} value={liveDetail.quality.polish} label="打磨度" showValue tone="pulse" />
              </div>
            </TabPanel>

            <TabPanel idPrefix="proj-detail" id="milestones" className="pt-4">
              <ul className="space-y-3">
                {liveDetail.milestones.map((m) => {
                  const overdue = m.dueWeek < state.week && m.progress < 100
                  return (
                    <li
                      key={m.id}
                      className="flex flex-col gap-3 border-[3px] border-ink/15 p-3 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-head text-[0.9375rem] font-800">{m.name}</p>
                        <p className="mt-0.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/50">
                          {m.owner} · {dueLabel(m.dueWeek, state.week)}
                        </p>
                      </div>
                      <span className="sm:w-44">
                        <Meter value={m.progress} showValue height={10} tone={overdue ? 'signal' : 'ink'} />
                      </span>
                      {m.progress >= 100 ? (
                        <Tag tone="jade">已完成</Tag>
                      ) : overdue ? (
                        <Tag tone="signal">超期</Tag>
                      ) : (
                        <Tag tone="pulse">进行中</Tag>
                      )}
                    </li>
                  )
                })}
              </ul>
            </TabPanel>

            <TabPanel idPrefix="proj-detail" id="team" className="pt-4">
              <ul className="grid gap-3 sm:grid-cols-2">
                {liveDetail.teamIds.map((tid, i) => {
                  const person = staffById.get(tid)
                  if (!person) return null
                  return (
                    <li
                      key={tid}
                      className="flex items-center gap-3 border-[3px] border-ink/15 p-3"
                    >
                      <Avatar name={person.name} size={40} index={i} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-head text-[0.875rem] font-800">
                          {person.name}
                          {tid === liveDetail.leadId && (
                            <span className="ml-2 font-mono text-[0.5rem] font-700 uppercase tracking-[0.14em] text-signal">
                              主责
                            </span>
                          )}
                        </p>
                        <p className="truncate font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/50">
                          {person.title}
                        </p>
                      </div>
                      <span className="tabular font-mono text-[0.625rem] font-700 text-ink/55">
                        体力 {person.stamina}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-4 flex items-start gap-2 border-l-[3px] border-pulse pl-3 text-[0.8125rem] leading-relaxed text-ink/65">
                <Users size={15} strokeWidth={2.6} aria-hidden="true" className="mt-0.5 shrink-0" />
                当前工作室共有 {derived.headcount} 人，其中 {derived.assigned} 人已分配工位。
                如需为该项目的团队补充成员，可前往「人员 → 工位分配」。
              </p>
            </TabPanel>
          </div>
        )}
      </Modal>

      <GreenlightWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={(payload) => {
          toast.push({
            severity: 'good',
            title: `立项通过：《${payload.title}》`,
            detail: `${payload.scaleLabel} · ${payload.genreLabels.join(' / ')} · 预算 ${money(payload.budget)} · 交期 ${weekLabel(payload.deadlineWeek)}。团队规模 ${payload.teamSize} 人，主责 ${payload.lead}。`,
            duration: 9000,
            group: 'greenlight',
          })
          setWizardOpen(false)
        }}
        currentWeek={state.week}
        cash={state.money}
        leads={state.staff.filter((s) => s.role === 'producer' || s.role === 'designer' || s.role === 'writer')}
      />
    </>
  )
}

/* ---------------------------------------------------------------- 立项向导 */

interface WizardPayload {
  title: string
  genreLabels: string[]
  scaleLabel: string
  budget: number
  deadlineWeek: number
  lead: string
  teamSize: number
}

const STEPS = [
  { id: 'genre', label: '类型', latin: 'Genre' },
  { id: 'scale', label: '规模', latin: 'Scale' },
  { id: 'detail', label: '设定', latin: 'Detail' },
  { id: 'confirm', label: '确认', latin: 'Confirm' },
] as const

function GreenlightWizard({
  open,
  onClose,
  onSubmit,
  currentWeek,
  cash,
  leads,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (p: WizardPayload) => void
  currentWeek: number
  cash: number
  leads: { id: string; name: string; title: string; stamina: number }[]
}) {
  const [step, setStep] = useState(0)
  const [genre, setGenre] = useState<Genre[]>(['sim', 'story'])
  const [scale, setScale] = useState<(typeof SCALES)[number]['id']>('mid')
  const [title, setTitle] = useState('')
  const [pickTheme, setPickTheme] = useState(THEMES[0])
  const [platforms, setPlatforms] = useState<string[]>(['PC'])
  const [leadId, setLeadId] = useState(leads[0]?.id ?? '')
  const [weeks, setWeeks] = useState(34)

  const chosenScale = SCALES.find((s) => s.id === scale) ?? SCALES[1]

  function reset() {
    setStep(0)
    setGenre(['sim', 'story'])
    setScale('mid')
    setTitle('')
    setPickTheme(THEMES[0])
    setPlatforms(['PC'])
    setLeadId(leads[0]?.id ?? '')
    setWeeks(34)
  }

  const canNext =
    step === 0 ? genre.length > 0 : step === 1 ? true : step === 2 ? title.trim().length > 0 && platforms.length > 0 : true

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="立项新作"
      latin="Greenlight wizard"
      kicker={`第 ${step + 1} / ${STEPS.length} 步`}
      size="lg"
      footer={
        <>
          <Btn
            id="wizard-cancel"
            variant="ghost"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            取消立项
          </Btn>
          <span className="mr-auto flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                aria-hidden="true"
                className={clsx(
                  'h-3 w-3 border-2 border-ink',
                  i < step ? 'bg-ink' : i === step ? 'bg-signal' : 'bg-paper',
                )}
              />
            ))}
          </span>
          {step > 0 && (
            <Btn id="wizard-back" onClick={() => setStep((s) => Math.max(0, s - 1))}>
              上一步
            </Btn>
          )}
          {step < STEPS.length - 1 ? (
            <Btn
              id="wizard-next"
              variant="signal"
              icon={ArrowRight}
              disabled={!canNext}
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              下一步
            </Btn>
          ) : (
            <Btn
              id="wizard-submit"
              variant="signal"
              icon={Check}
              onClick={() => {
                onSubmit({
                  title: title.trim(),
                  genreLabels: genre.map((g) => GENRE_META[g].label),
                  scaleLabel: chosenScale.label,
                  budget: chosenScale.budget,
                  deadlineWeek: currentWeek + weeks,
                  lead: leads.find((l) => l.id === leadId)?.name ?? '待定',
                  teamSize: scale === 'small' ? 3 : scale === 'mid' ? 6 : 9,
                })
                reset()
              }}
            >
              确认立项
            </Btn>
          )}
        </>
      }
    >
      <ol className="mb-5 flex flex-wrap gap-2" aria-label="立项步骤">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={clsx(
                'inline-flex items-center gap-2 border-[3px] px-2.5 py-1.5 font-head text-[0.75rem] font-800',
                i < step
                  ? 'border-ink bg-ink text-paper-warm'
                  : i === step
                    ? 'border-ink bg-signal text-white'
                    : 'border-ink/25 text-ink/45',
              )}
            >
              <span className="tabular font-mono text-[0.5625rem] font-700">
                {String(i + 1).padStart(2, '0')}
              </span>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <ArrowRight
                size={13}
                strokeWidth={3}
                aria-hidden="true"
                className="text-ink/25"
              />
            )}
          </li>
        ))}
        <li className="sr-only" aria-current="step">
          当前步骤：{STEPS[step].label}
        </li>
      </ol>

      {step === 0 && (
        <section aria-labelledby="wiz-genre">
          <h3 id="wiz-genre" className="font-head text-[1rem] font-800">
            这一作要提供什么样的体验？
          </h3>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink/65">
            可以多选。类型组合会同时影响品质预估的初始分布与团队成员的匹配度。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(Object.keys(GENRE_META) as Genre[]).map((g) => {
              const on = genre.includes(g)
              return (
                <button
                  key={g}
                  type="button"
                  id={`wizard-genre-${g}`}
                  aria-pressed={on}
                  onClick={() =>
                    setGenre((cur) =>
                      cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g],
                    )
                  }
                  className={clsx(
                    'flex flex-col items-start gap-2 border-[3px] p-3.5 text-left transition-transform duration-150 ease-snap',
                    on
                      ? 'border-ink bg-signal text-white shadow-hard'
                      : 'border-ink/30 bg-paper-warm hover:-translate-y-[2px] hover:border-ink',
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="font-head text-[0.9375rem] font-800">
                      {GENRE_META[g].label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'grid h-5 w-5 place-items-center border-2',
                        on ? 'border-white bg-white text-signal' : 'border-ink/40',
                      )}
                    >
                      {on && <Check size={12} strokeWidth={3.5} />}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      'text-[0.8125rem] leading-snug',
                      on ? 'text-white/82' : 'text-ink/62',
                    )}
                  >
                    {GENRE_META[g].blurb}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="wiz-scale">
          <h3 id="wiz-scale" className="font-head text-[1rem] font-800">
            投入多大的产能？
          </h3>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink/65">
            规模决定了预算上限、团队编制与合理工期。选得越大，回收压力越大。
          </p>
          <div className="mt-4 space-y-3">
            {SCALES.map((s) => {
              const on = scale === s.id
              const affordable = s.budget <= cash
              return (
                <button
                  key={s.id}
                  type="button"
                  id={`wizard-scale-${s.id}`}
                  aria-pressed={on}
                  onClick={() => setScale(s.id)}
                  className={clsx(
                    'flex w-full flex-wrap items-center gap-4 border-[3px] p-3.5 text-left transition-transform duration-150 ease-snap',
                    on
                      ? 'border-ink bg-ink text-paper-warm shadow-hard'
                      : 'border-ink/30 bg-paper-warm hover:-translate-y-[2px] hover:border-ink',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2.5">
                      <span className="font-head text-[0.9375rem] font-800">{s.label}</span>
                      <span className="tabular font-mono text-[0.6875rem] font-700 opacity-70">
                        {money(s.budget)}
                      </span>
                    </span>
                    <span
                      className={clsx(
                        'mt-1 block text-[0.8125rem] leading-snug',
                        on ? 'text-paper-warm/72' : 'text-ink/62',
                      )}
                    >
                      {s.blurb}
                    </span>
                  </span>
                  {!affordable && <Tag tone="signal">超出当前资金</Tag>}
                  {on && <Check size={18} strokeWidth={3} aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          <label htmlFor="wizard-weeks" className="mt-5 block">
            <span className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
                工期（周）
              </span>
              <span className="tabular font-head text-[0.9375rem] font-800">
                {weeks} 周 · 交期 {weekLabel(currentWeek + weeks)}
              </span>
            </span>
            <input
              id="wizard-weeks"
              type="range"
              min={16}
              max={80}
              step={1}
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-full accent-[#E4002B]"
            />
            <span className="mt-1.5 block text-[0.75rem] text-ink/55">
              {weeks < 24
                ? '工期偏紧，品质打磨度上限会被压低。'
                : weeks > 60
                  ? '工期宽松，但团队倦怠风险显著上升。'
                  : '工期处于常见区间。'}
            </span>
          </label>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="wiz-detail" className="space-y-5">
          <div>
            <h3 id="wiz-detail" className="font-head text-[1rem] font-800">
              给它一个名字和一句钩子
            </h3>
            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink/65">
              标题会出现在所有界面与市场宣传里。钩子是你的团队在走廊里用来向外人解释这个项目的那一句话。
            </p>
          </div>

          <label htmlFor="wizard-title" className="block">
            <span className="mb-1.5 block font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
              项目标题
            </span>
            <input
              id="wizard-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：雨巷食堂"
              className="p5-input"
            />
          </label>

          <fieldset>
            <legend className="mb-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
              题材基调
            </legend>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => {
                const on = pickTheme === t
                return (
                  <button
                    key={t}
                    type="button"
                    id={`wizard-theme-${THEMES.indexOf(t)}`}
                    aria-pressed={on}
                    onClick={() => setPickTheme(t)}
                    className={clsx(
                      'min-h-[36px] border-[3px] px-2.5 py-1.5 text-left text-[0.75rem] transition-transform duration-150 ease-snap',
                      on
                        ? 'border-ink bg-signal text-white shadow-hard-sm'
                        : 'border-ink/30 bg-paper-warm hover:-translate-y-[2px] hover:border-ink',
                    )}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
              目标平台
            </legend>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const on = platforms.includes(p)
                return (
                  <button
                    key={p}
                    type="button"
                    id={`wizard-platform-${p}`}
                    aria-pressed={on}
                    onClick={() =>
                      setPlatforms((cur) =>
                        cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
                      )
                    }
                    className={clsx(
                      'min-h-[36px] border-[3px] px-3 py-1.5 font-head text-[0.8125rem] font-800 transition-transform duration-150 ease-snap',
                      on
                        ? 'border-ink bg-ink text-paper-warm shadow-hard-sm'
                        : 'border-ink/30 bg-paper-warm hover:-translate-y-[2px] hover:border-ink',
                    )}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label htmlFor="wizard-lead" className="block">
            <span className="mb-1.5 block font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
              项目主责
            </span>
            <select
              id="wizard-lead"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="p5-input"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.title}（体力 {l.stamina}）
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      {step === 3 && (
        <section aria-labelledby="wiz-confirm" className="space-y-4">
          <h3 id="wiz-confirm" className="font-head text-[1rem] font-800">
            立项确认
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniField label="标题" value={title.trim() || '（未填写）'} />
            <MiniField label="类型" value={genre.map((g) => GENRE_META[g].label).join(' · ') || '（未选择）'} />
            <MiniField label="规模" value={`${chosenScale.label} · ${money(chosenScale.budget)}`} />
            <MiniField label="工期" value={`${weeks} 周 · ${weekLabel(currentWeek + weeks)}`} />
            <MiniField label="平台" value={platforms.join(' / ') || '（未选择）'} />
            <MiniField label="主责" value={leads.find((l) => l.id === leadId)?.name ?? '待定'} />
            <MiniField label="题材基调" value={pickTheme} />
            <MiniField
              label="预估编制"
              value={`${scale === 'small' ? 3 : scale === 'mid' ? 6 : 9} 人`}
            />
          </div>
          <p className="border-l-[4px] border-signal pl-4 text-[0.875rem] leading-relaxed text-ink/72">
            立项通过后，工作室的现金流将被该项预算锁定。若在开发中调整规模或工期，已投入的成本无法回收。
          </p>
        </section>
      )}
    </Modal>
  )
}

/** 预算是相对当前资金的粗略可行性判断，仅用于向导内的提示 */

/* ---------------------------------------------------------------- 子组件 */

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      scope="col"
      className={clsx(
        'px-3 py-2.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/55',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <td className={clsx('px-3 py-2.5 align-middle', align === 'right' && 'text-right')}>
      {children}
    </td>
  )
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-[3px] border-ink/15 px-3 py-2.5">
      <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
        {label}
      </p>
      <p className="mt-1 font-head text-[0.875rem] font-800">{value}</p>
    </div>
  )
}
