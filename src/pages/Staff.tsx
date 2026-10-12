import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  BatteryMedium,
  Briefcase,
  Filter,
  GraduationCap,
  HeartPulse,
  LogOut,
  Search,
  Star,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react'
import { useGame } from '../lib/store'
import { useToast } from '../lib/toast'
import { avgStats, gradeOf, money } from '../lib/format'
import { ROLE_META } from '../data/seed'
import type { Staff as StaffRow, StaffRole, StaffStatus } from '../data/types'
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

const STATUS_META: Record<StaffStatus, { label: string; tone: 'jade' | 'ice' | 'pulse' | 'signal' | 'paper' }> = {
  working: { label: '在岗', tone: 'jade' },
  idle: { label: '待命', tone: 'paper' },
  resting: { label: '休整', tone: 'ice' },
  training: { label: '进修', tone: 'pulse' },
  burnout: { label: '倦怠', tone: 'signal' },
}

type SortKey = 'level' | 'stamina' | 'morale' | 'salary'

/** 招募候选人（原型数据） */
const CANDIDATES: {
  id: string
  name: string
  role: StaffRole
  title: string
  level: number
  ask: number
  match: number
  traits: string[]
  pitch: string
  demand: string
}[] = [
  {
    id: 'cand-1',
    name: '岑舟',
    role: 'engineer',
    title: '图形程序',
    level: 7,
    ask: 1680,
    match: 88,
    traits: ['手写 shader', '对帧率零容忍'],
    pitch: '在上一家工作室负责主机平台渲染移植，独立完成过两套后处理管线。',
    demand: '要求配备独立工位与可调节色温照明。',
  },
  {
    id: 'cand-2',
    name: '苗见',
    role: 'artist',
    title: 'UI / 动效',
    level: 6,
    ask: 1420,
    match: 82,
    traits: ['动效节奏感强', '熟悉设计系统'],
    pitch: '擅长把交互状态做成有性格的东西，作品集里有三套完整的界面动效规范。',
    demand: '希望参与前期概念，而非只做落地实现。',
  },
  {
    id: 'cand-3',
    name: '蒋听',
    role: 'writer',
    title: '分支叙事',
    level: 5,
    ask: 1180,
    match: 79,
    traits: ['结构意识好', '写过互动小说'],
    pitch: '发表过两部互动小说，熟悉分支收敛与变量记账。',
    demand: '要求作品署名权。',
  },
  {
    id: 'cand-4',
    name: '陆昀',
    role: 'designer',
    title: '系统策划',
    level: 8,
    ask: 1720,
    match: 71,
    traits: ['从大厂流出', '流程化思维'],
    pitch: '参与过两款月流水千万级项目，负责成长与经济系统。',
    demand: '对流程规范要求较高，需要适应期。',
  },
  {
    id: 'cand-5',
    name: '萧岚',
    role: 'qa',
    title: '自动化测试',
    level: 5,
    ask: 1040,
    match: 85,
    traits: ['写测试框架', '记录极其详尽'],
    pitch: '为上一家公司从零搭建了回归测试框架，缺陷漏出率下降四成。',
    demand: '希望有权限直接向制作人汇报。',
  },
  {
    id: 'cand-6',
    name: '阮清',
    role: 'composer',
    title: '作曲 / 配器',
    level: 6,
    ask: 1360,
    match: 64,
    traits: ['交响配器见长', '档期紧张'],
    pitch: '以自由职业身份参与过若干独立项目，擅长弦乐与木管。',
    demand: '半年内可能同时接外部委托。',
  },
]

export default function Staff() {
  const { state, derived, assignStaff, restStaff, fireStaff, dispatch } = useGame()
  const toast = useToast()

  const [tab, setTab] = useState('roster')
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('level')
  const [detail, setDetail] = useState<StaffRow | null>(null)
  const [detailTab, setDetailTab] = useState('stats')
  const [confirmFire, setConfirmFire] = useState<StaffRow | null>(null)
  const [assignFor, setAssignFor] = useState<StaffRow | null>(null)
  const [candidate, setCandidate] = useState<(typeof CANDIDATES)[number] | null>(null)
  const [offer, setOffer] = useState('')

  const liveDetail = detail ? state.staff.find((s) => s.id === detail.id) ?? null : null

  const rooms = useMemo(() => state.floors.flatMap((f) => f.rooms), [state.floors])

  const roster = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.staff
      .filter((s) => (roleFilter === 'all' ? true : s.role === roleFilter))
      .filter((s) =>
        q === ''
          ? true
          : `${s.name}${s.handle}${s.title}${s.traits.join('')}`.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        if (sort === 'level') return b.level - a.level
        if (sort === 'stamina') return a.stamina - b.stamina
        if (sort === 'morale') return a.morale - b.morale
        return b.salary - a.salary
      })
  }, [state.staff, roleFilter, query, sort])

  const unassigned = state.staff.filter((s) => !s.roomId)

  const roleCounts = useMemo(() => {
    const m = new Map<StaffRole, number>()
    state.staff.forEach((s) => m.set(s.role, (m.get(s.role) ?? 0) + 1))
    return m
  }, [state.staff])

  return (
    <>
      <PageHeader
        kicker="人员"
        title="团队管理"
        latin="PERSONNEL / ROSTER"
        lede={`在册 ${derived.headcount} 人，其中 ${derived.assigned} 人已分配固定工位，${unassigned.length} 人处于待分配状态。体力低于 55 或士气低于 62 的成员会进入关注列表。`}
        actions={
          <Btn
            id="staff-goto-recruit"
            variant="signal"
            icon={UserPlus}
            onClick={() => setTab('recruit')}
          >
            招募新人
          </Btn>
        }
      />

      <section aria-labelledby="staff-kpi" className="mb-6">
        <h2 id="staff-kpi" className="sr-only">
          人员指标
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            id="staff-tile-head"
            icon={Users}
            label="在册人数"
            value={String(derived.headcount)}
            unit="人"
            hint={`${new Set(state.staff.map((s) => s.role)).size} 个职能方向`}
          />
          <StatTile
            id="staff-tile-assigned"
            icon={Briefcase}
            label="已分配工位"
            value={String(derived.assigned)}
            unit="人"
            tone={unassigned.length > 3 ? 'signal' : 'paper'}
            hint={`${unassigned.length} 人尚未分配`}
          />
          <StatTile
            id="staff-tile-morale"
            icon={HeartPulse}
            label="平均士气"
            value={String(derived.avgMorale)}
            unit="/100"
            tone={derived.avgMorale < 60 ? 'signal' : 'paper'}
            hint="休息室可提供每周士气回复"
          />
          <StatTile
            id="staff-tile-payroll"
            icon={Star}
            label="周薪总额"
            value={money(derived.payroll)}
            tone="ink"
            hint={`占每周固定支出 ${Math.round((derived.payroll / Math.max(1, derived.weeklyBurn)) * 100)}%`}
          />
        </div>
      </section>

      <Tabs
        idPrefix="staff"
        active={tab}
        onChange={setTab}
        items={[
          { id: 'roster', label: '花名册', latin: 'Roster', count: state.staff.length },
          { id: 'seats', label: '工位分配', latin: 'Seating' },
          { id: 'recruit', label: '招募', latin: 'Recruit', count: CANDIDATES.length },
        ]}
        className="mb-5"
      />

      {/* ------------------------------------------------------------ 花名册 */}
      <TabPanel idPrefix="staff" id="roster">
        <Panel cut="tr" className="mb-5">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <label htmlFor="staff-search" className="min-w-[14rem] flex-1">
                <span className="mb-1.5 block font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
                  搜索
                </span>
                <span className="relative block">
                  <Search
                    size={15}
                    strokeWidth={2.6}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
                  />
                  <input
                    id="staff-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="姓名 / 花名 / 职位 / 特长"
                    className="p5-input !pl-9"
                  />
                </span>
              </label>

              <label htmlFor="staff-sort" className="min-w-[11rem]">
                <span className="mb-1.5 block font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
                  排序
                </span>
                <select
                  id="staff-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="p5-input"
                >
                  <option value="level">等级从高到低</option>
                  <option value="stamina">体力从低到高</option>
                  <option value="morale">士气从低到高</option>
                  <option value="salary">薪资从高到低</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
                <Filter size={12} strokeWidth={2.8} aria-hidden="true" />
                职能
              </span>
              <FilterChip
                id="staff-filter-all"
                label="全部"
                count={state.staff.length}
                active={roleFilter === 'all'}
                onClick={() => setRoleFilter('all')}
              />
              {(Object.keys(ROLE_META) as StaffRole[]).map((r) => (
                <FilterChip
                  key={r}
                  id={`staff-filter-${r}`}
                  label={ROLE_META[r].label}
                  count={roleCounts.get(r) ?? 0}
                  active={roleFilter === r}
                  onClick={() => setRoleFilter(r)}
                />
              ))}
            </div>
          </div>
        </Panel>

        {roster.length === 0 ? (
          <EmptyState
            icon={Search}
            title="没有符合条件的成员"
            hint="换一个职能筛选，或清空搜索关键词。"
            action={
              <Btn
                id="staff-reset-filters"
                onClick={() => {
                  setRoleFilter('all')
                  setQuery('')
                }}
              >
                清空筛选
              </Btn>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {roster.map((p, i) => {
              const avg = avgStats(p.stats)
              const status = STATUS_META[p.status]
              return (
                <li key={p.id}>
                  <article
                    id={`staff-card-${p.id}`}
                    className="p5-noise group relative flex h-full flex-col border-[3px] border-ink bg-paper-warm shadow-hard transition-transform duration-200 ease-snap hover:-translate-y-[3px] hover:shadow-hard-lg"
                  >
                    <span
                      aria-hidden="true"
                      className="p5-stripes absolute right-0 top-0 h-16 w-16 opacity-[0.07]"
                    />
                    <header className="flex items-start gap-3 border-b-[3px] border-ink p-3.5">
                      <Avatar name={p.name} size={52} index={i} />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-[1.0625rem] uppercase leading-tight">
                          {p.name}
                        </h3>
                        <p className="mt-0.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.2em] text-ink/45">
                          {p.handle}
                        </p>
                        <p className="mt-1 truncate text-[0.8125rem] text-ink/65">{p.title}</p>
                      </div>
                      <span className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="grid h-9 w-9 place-items-center border-[3px] border-ink bg-ink font-display text-[1rem] text-paper-warm">
                          {gradeOf(avg)}
                        </span>
                        <Tag tone={status.tone}>{status.label}</Tag>
                      </span>
                    </header>

                    <div className="flex-1 space-y-2 p-3.5">
                      <StatRow label="技术" value={p.stats.tech} tone="ice" />
                      <StatRow label="创意" value={p.stats.creative} tone="royal" />
                      <StatRow label="表达" value={p.stats.express} tone="signal" />
                      <StatRow label="协作" value={p.stats.collab} tone="jade" />

                      <div className="mt-3 grid grid-cols-2 gap-3 border-t-[3px] border-ink/10 pt-3">
                        <Meter
                          value={p.stamina}
                          tone={p.stamina < 55 ? 'signal' : 'ink'}
                          label="体力"
                          showValue
                          height={10}
                        />
                        <Meter
                          value={p.morale}
                          tone={p.morale < 62 ? 'pulse' : 'jade'}
                          label="士气"
                          showValue
                          height={10}
                        />
                      </div>

                      <ul className="flex flex-wrap gap-1.5 pt-2">
                        {p.traits.map((t) => (
                          <li key={t}>
                            <Tag>{t}</Tag>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <footer className="flex items-center gap-2 border-t-[3px] border-ink px-3.5 py-3">
                      <span className="tabular mr-auto font-mono text-[0.6875rem] font-700 text-ink/60">
                        周薪 {money(p.salary)}
                      </span>
                      <Btn
                        id={`staff-detail-${p.id}`}
                        size="sm"
                        onClick={() => {
                          setDetail(p)
                          setDetailTab('stats')
                        }}
                      >
                        详情
                      </Btn>
                      <Btn
                        id={`staff-quick-rest-${p.id}`}
                        size="sm"
                        variant={p.stamina < 55 ? 'signal' : 'ghost'}
                        icon={BatteryMedium}
                        aria-label={`安排 ${p.name} 休整`}
                        onClick={() => restStaff(p.id)}
                      >
                        休整
                      </Btn>
                    </footer>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </TabPanel>

      {/* ------------------------------------------------------------ 工位分配 */}
      <TabPanel idPrefix="staff" id="seats">
        <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
          <Panel cut="tr">
            <PanelHead
              icon="Users"
              title="待分配人员"
              latin="Unassigned"
              right={<Tag tone={unassigned.length > 3 ? 'signal' : 'ink'}>{unassigned.length}</Tag>}
            />
            {unassigned.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Briefcase}
                  title="全部人员均已就位"
                  hint="所有在册成员都已分配到具体房间，房间加成正全额生效。"
                />
              </div>
            ) : (
              <ul className="divide-y-[3px] divide-ink/10">
                {unassigned.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3.5"
                  >
                    <Avatar name={p.name} size={40} index={i} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-head text-[0.875rem] font-800">{p.name}</p>
                      <p className="truncate font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/50">
                        {p.title}
                      </p>
                    </div>
                    <Tag tone={ROLE_META[p.role].accent}>{ROLE_META[p.role].label}</Tag>
                    <Btn
                      id={`staff-assign-${p.id}`}
                      size="sm"
                      variant="signal"
                      icon={UserPlus}
                      onClick={() => setAssignFor(p)}
                    >
                      分配工位
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel cut="tr">
            <PanelHead icon="Ruler" title="房间占用一览" latin="Room occupancy" />
            <ul className="divide-y-[3px] divide-ink/10">
              {rooms.map((r) => {
                const full = r.staffIds.length >= r.capacity
                const vacant = r.kind === 'empty'
                return (
                  <li key={r.id} className="px-4 py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate font-head text-[0.875rem] font-800">
                        {r.name}
                        <span className="ml-2 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
                          {vacant ? '空地' : `${r.staffIds.length}/${r.capacity}`}
                        </span>
                      </p>
                      {!vacant && (
                        <span
                          className={clsx(
                            'shrink-0 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em]',
                            full ? 'text-signal' : 'text-jade',
                          )}
                        >
                          {full ? '工位已满' : `余 ${r.capacity - r.staffIds.length}`}
                        </span>
                      )}
                    </div>
                    {!vacant && (
                      <div className="mt-2">
                        <Meter
                          value={(r.staffIds.length / Math.max(1, r.capacity)) * 100}
                          tone={full ? 'signal' : 'ink'}
                          height={9}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Panel>
        </div>
      </TabPanel>

      {/* ------------------------------------------------------------ 招募 */}
      <TabPanel idPrefix="staff" id="recruit">
        <div className="mb-5">
          <Kicker>人才市场 · 本周可见候选人</Kicker>
          <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-ink/68">
            「匹配度」由能力结构与你当前项目需求共同计算。薪资要求高于团队均值的候选人，往往也带来更高的产出上限。
          </p>
        </div>
        <ul className="grid gap-4 lg:grid-cols-2">
          {CANDIDATES.map((c, i) => (
            <li key={c.id}>
              <article
                id={`staff-candidate-${c.id}`}
                className="p5-noise flex h-full flex-col border-[3px] border-ink bg-paper-warm shadow-hard transition-transform duration-200 ease-snap hover:-translate-y-[3px]"
              >
                <header className="flex items-start gap-3 border-b-[3px] border-ink bg-paper-dim/60 p-3.5">
                  <Avatar name={c.name} size={46} index={i + 3} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-[1rem] uppercase leading-tight">
                      {c.name}
                    </h3>
                    <p className="mt-0.5 truncate text-[0.8125rem] text-ink/65">
                      {c.title}
                    </p>
                  </div>
                  <Tag tone={ROLE_META[c.role].accent}>{ROLE_META[c.role].label}</Tag>
                </header>

                <div className="flex-1 space-y-3 p-3.5">
                  <p className="text-[0.8125rem] leading-relaxed text-ink/72">{c.pitch}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                        期望周薪
                      </p>
                      <p className="tabular font-head text-[0.9375rem] font-800">
                        {money(c.ask)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                        当前等级
                      </p>
                      <p className="tabular font-head text-[0.9375rem] font-800">Lv.{c.level}</p>
                    </div>
                  </div>
                  <div>
                    <Meter
                      value={c.match}
                      tone={c.match >= 80 ? 'jade' : c.match >= 70 ? 'pulse' : 'signal'}
                      label="岗位匹配度"
                      showValue
                      height={11}
                    />
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {c.traits.map((t) => (
                      <li key={t}>
                        <Tag>{t}</Tag>
                      </li>
                    ))}
                  </ul>
                  <p className="border-l-[3px] border-pulse pl-3 text-[0.75rem] leading-relaxed text-ink/62">
                    {c.demand}
                  </p>
                </div>

                <footer className="border-t-[3px] border-ink px-3.5 py-3">
                  <Btn
                    id={`staff-candidate-talk-${c.id}`}
                    variant="signal"
                    icon={GraduationCap}
                    className="w-full"
                    onClick={() => {
                      setCandidate(c)
                      setOffer(String(c.ask))
                    }}
                  >
                    约谈
                  </Btn>
                </footer>
              </article>
            </li>
          ))}
        </ul>
      </TabPanel>

      {/* ------------------------------------------------------- 人员详情 */}
      <Modal
        open={liveDetail !== null}
        onClose={() => setDetail(null)}
        title={liveDetail?.name ?? ''}
        latin={liveDetail ? `${liveDetail.handle} · ${liveDetail.title}` : undefined}
        kicker="人员档案"
        size="lg"
        footer={
          <>
            <Btn id="staff-detail-close" onClick={() => setDetail(null)}>
              关闭
            </Btn>
            {liveDetail && (
              <>
                <Btn
                  id={`staff-detail-rest-${liveDetail.id}`}
                  icon={BatteryMedium}
                  onClick={() => restStaff(liveDetail.id)}
                >
                  安排休整
                </Btn>
                {liveDetail.roomId && (
                  <Btn
                    id={`staff-detail-unassign-${liveDetail.id}`}
                    icon={UserMinus}
                    onClick={() => {
                      dispatch({ type: 'unassignStaff', staffId: liveDetail.id })
                      toast.push({
                        severity: 'info',
                        title: `${liveDetail.name} 已解除工位分配`,
                        detail: '该房间的加成会相应下降，可随时重新分配。',
                      })
                    }}
                  >
                    解除分配
                  </Btn>
                )}
                <Btn
                  id={`staff-detail-fire-${liveDetail.id}`}
                  variant="signal"
                  icon={LogOut}
                  onClick={() => setConfirmFire(liveDetail)}
                >
                  解除合作
                </Btn>
              </>
            )}
          </>
        }
      >
        {liveDetail && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={liveDetail.name} size={72} index={1} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Slab tone="ink">Lv.{liveDetail.level}</Slab>
                  <Tag tone={STATUS_META[liveDetail.status].tone}>
                    {STATUS_META[liveDetail.status].label}
                  </Tag>
                  <Tag tone={ROLE_META[liveDetail.role].accent}>
                    {ROLE_META[liveDetail.role].label}
                  </Tag>
                  <Tag tone="ink">入职 {liveDetail.joinedOn}</Tag>
                </div>
                <p className="mt-3 text-[0.875rem] leading-relaxed text-ink/72">
                  {liveDetail.bio}
                </p>
              </div>
            </div>

            <Tabs
              idPrefix="staff-detail"
              active={detailTab}
              onChange={setDetailTab}
              items={[
                { id: 'stats', label: '能力', latin: 'Stats' },
                { id: 'resume', label: '履历', latin: 'History' },
                { id: 'assign', label: '工位与状态', latin: 'Assignment' },
              ]}
            />

            <TabPanel idPrefix="staff-detail" id="stats" className="pt-4">
              <div className="grid gap-5 sm:grid-cols-[1fr_1fr]">
                <div className="space-y-3">
                  <Meter id={`sd-tech-${liveDetail.id}`} value={liveDetail.stats.tech} label="技术" showValue tone="ice" />
                  <Meter id={`sd-cre-${liveDetail.id}`} value={liveDetail.stats.creative} label="创意" showValue tone="royal" />
                  <Meter id={`sd-exp-${liveDetail.id}`} value={liveDetail.stats.express} label="表达" showValue tone="signal" />
                  <Meter id={`sd-col-${liveDetail.id}`} value={liveDetail.stats.collab} label="协作" showValue tone="jade" />
                </div>
                <div className="space-y-3">
                  <Meter
                    id={`sd-sta-${liveDetail.id}`}
                    value={liveDetail.stamina}
                    label="体力"
                    showValue
                    tone={liveDetail.stamina < 55 ? 'signal' : 'ink'}
                  />
                  <Meter
                    id={`sd-mor-${liveDetail.id}`}
                    value={liveDetail.morale}
                    label="士气"
                    showValue
                    tone={liveDetail.morale < 62 ? 'pulse' : 'jade'}
                  />
                  <Meter
                    id={`sd-gro-${liveDetail.id}`}
                    value={liveDetail.growth}
                    label="成长潜力"
                    showValue
                    tone="royal"
                  />
                  <div className="border-[3px] border-ink/15 px-3 py-2.5">
                    <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
                      综合评级
                    </p>
                    <p className="font-display text-[1.75rem] leading-none">
                      {gradeOf(avgStats(liveDetail.stats))}
                      <span className="ml-2 font-head text-[0.75rem] font-700 text-ink/50">
                        均值 {avgStats(liveDetail.stats).toFixed(1)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="mt-6 mb-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.2em] text-ink/55">
                个人特质
              </h3>
              <ul className="flex flex-wrap gap-2">
                {liveDetail.traits.map((t) => (
                  <li key={t}>
                    <Tag tone="ink">{t}</Tag>
                  </li>
                ))}
              </ul>
            </TabPanel>

            <TabPanel idPrefix="staff-detail" id="resume" className="pt-4">
              <ol className="relative border-l-[3px] border-ink/20 pl-5">
                {liveDetail.resume.map((r) => (
                  <li key={r.year + r.text} className="relative pb-5 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[27px] top-1.5 h-3 w-3 border-2 border-ink bg-signal"
                    />
                    <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
                      {r.year}
                    </p>
                    <p className="mt-1 text-[0.875rem] leading-relaxed">{r.text}</p>
                  </li>
                ))}
              </ol>
            </TabPanel>

            <TabPanel idPrefix="staff-detail" id="assign" className="pt-4">
              {liveDetail.roomId ? (
                <div className="border-[3px] border-ink p-4">
                  <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
                    当前工位
                  </p>
                  <p className="mt-1 font-head text-[1.0625rem] font-800">
                    {rooms.find((r) => r.id === liveDetail.roomId)?.name ?? '未知房间'}
                  </p>
                  <p className="mt-1.5 text-[0.8125rem] text-ink/62">
                    房间加成：
                    {rooms.find((r) => r.id === liveDetail.roomId)?.perk ?? '—'}
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={Briefcase}
                  title="该成员尚未分配工位"
                  hint="未分配的人员不会为任何房间提供加成，且闲置会缓慢降低士气。"
                  action={
                    <Btn
                      id={`staff-detail-assign-${liveDetail.id}`}
                      variant="signal"
                      icon={UserPlus}
                      onClick={() => setAssignFor(liveDetail)}
                    >
                      分配工位
                    </Btn>
                  }
                />
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MiniField label="周薪" value={money(liveDetail.salary)} />
                <MiniField label="入职日期" value={liveDetail.joinedOn} />
                <MiniField
                  label={`${state.studio.name}工龄`}
                  value={`${Math.max(
                    1,
                    Math.floor(
                      (state.week * 7) / 365 +
                        (2026 - Number(liveDetail.joinedOn.slice(0, 4))),
                    ),
                  )} 年`}
                />
              </div>
            </TabPanel>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------- 解除合作确认 */}
      <Modal
        open={confirmFire !== null}
        onClose={() => setConfirmFire(null)}
        title="解除合作"
        latin="Termination"
        kicker="不可撤销操作"
        size="sm"
        footer={
          <>
            <Btn id="staff-fire-cancel" onClick={() => setConfirmFire(null)}>
              取消
            </Btn>
            <Btn
              id="staff-fire-confirm"
              variant="signal"
              icon={LogOut}
              onClick={() => {
                if (!confirmFire) return
                fireStaff(confirmFire.id)
                setConfirmFire(null)
                setDetail(null)
              }}
            >
              确认解除
            </Btn>
          </>
        }
      >
        {confirmFire && (
          <div className="space-y-4">
            <p className="border-l-[4px] border-signal pl-4 text-[0.9375rem] leading-relaxed">
              你正在解除与 <strong className="font-head">{confirmFire.name}</strong> 的合作关系。
              该成员将从所有房间撤出，并需要支付相当于一个月薪资的补偿金
              （<span className="tabular font-mono">{money(confirmFire.salary * 4)}</span>）。
            </p>
            <ul className="space-y-2 border-[3px] border-ink/15 p-3.5">
              <li className="text-[0.8125rem] text-ink/72">
                · 团队士气将在下周结算时受到轻微影响
              </li>
              <li className="text-[0.8125rem] text-ink/72">
                · 该成员负责的里程碑需要重新指派负责人
              </li>
              <li className="text-[0.8125rem] text-ink/72">
                · 若其所在房间因此低于最低人数，房间加成会下降
              </li>
            </ul>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------- 分配工位 */}
      <Modal
        open={assignFor !== null}
        onClose={() => setAssignFor(null)}
        title="分配工位"
        latin={assignFor?.name}
        kicker="人员调配"
        size="md"
        footer={
          <Btn id="staff-assign-cancel" onClick={() => setAssignFor(null)}>
            取消
          </Btn>
        }
      >
        {assignFor && (
          <>
            <p className="mb-4 border-l-[3px] border-signal pl-4 text-[0.875rem] leading-relaxed text-ink/72">
              为 <strong className="font-head">{assignFor.name}</strong> 选择一个功能房间。若房间工位已满，
              需要先扩建或清出空位。
            </p>
            <ul className="space-y-2.5">
              {rooms
                .filter((r) => r.kind !== 'empty')
                .map((r) => {
                  const full = r.staffIds.length >= r.capacity
                  const current = assignFor.roomId === r.id
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        id={`staff-assign-room-${r.id}`}
                        disabled={full || current}
                        aria-pressed={current}
                        onClick={() => {
                          assignStaff(assignFor.id, r.id)
                          setAssignFor(null)
                        }}
                        className={clsx(
                          'flex w-full items-center gap-3 border-[3px] p-3 text-left transition-transform duration-150 ease-snap',
                          current
                            ? 'border-ink bg-ink text-paper-warm'
                            : 'border-ink/25 bg-paper-warm hover:-translate-y-[2px] hover:border-ink',
                          (full || current) && 'cursor-not-allowed opacity-50 hover:translate-y-0',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-head text-[0.875rem] font-800">
                            {r.name}
                          </span>
                          <span className="block truncate font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] opacity-60">
                            {r.perk}
                          </span>
                        </span>
                        <span className="tabular shrink-0 font-mono text-[0.6875rem] font-700">
                          {r.staffIds.length}/{r.capacity}
                        </span>
                        {current && <Tag tone="signal">当前</Tag>}
                        {!current && full && <Tag tone="pulse">已满</Tag>}
                      </button>
                    </li>
                  )
                })}
            </ul>
          </>
        )}
      </Modal>

      {/* ------------------------------------------------------- 约谈 */}
      <Modal
        open={candidate !== null}
        onClose={() => setCandidate(null)}
        title={candidate ? `约谈 ${candidate.name}` : ''}
        latin={candidate?.title}
        kicker="招募洽谈"
        size="md"
        footer={
          <>
            <Btn id="staff-talk-cancel" onClick={() => setCandidate(null)}>
              暂缓
            </Btn>
            <Btn
              id="staff-talk-offer"
              variant="signal"
              icon={UserPlus}
              onClick={() => {
                if (!candidate) return
                const ask = Number(offer) || candidate.ask
                toast.push({
                  severity: ask > candidate.ask * 1.15 ? 'good' : 'warn',
                  title:
                    ask > candidate.ask * 1.15
                      ? `${candidate.name} 已接受条件`
                      : `${candidate.name} 需要时间考虑`,
                  detail:
                    ask > candidate.ask * 1.15
                      ? `报价 ${money(ask)}／周，高于其期望值，对方当场确认入职意向。可前往「工位分配」安排房间。`
                      : `报价 ${money(ask)}／周 未明显高于其期望的 ${money(candidate.ask)}／周。对方表示会在一周内回复，期间可能被其他工作室接触。`,
                })
                setCandidate(null)
              }}
            >
              发出录用意向
            </Btn>
          </>
        }
      >
        {candidate && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar name={candidate.name} size={60} index={2} />
              <div className="min-w-0 flex-1">
                <p className="text-[0.875rem] leading-relaxed text-ink/72">{candidate.pitch}</p>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {candidate.traits.map((t) => (
                    <li key={t}>
                      <Tag>{t}</Tag>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniField label="期望周薪" value={money(candidate.ask)} />
              <MiniField label="当前等级" value={`Lv.${candidate.level}`} />
              <MiniField label="岗位匹配度" value={`${candidate.match}%`} />
            </div>

            <label htmlFor="staff-talk-offer-input" className="block">
              <span className="mb-1.5 block font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
                报价（每周，元）
              </span>
              <input
                id="staff-talk-offer-input"
                type="number"
                min={0}
                step={10}
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                className="p5-input tabular"
              />
              <span className="mt-1.5 block text-[0.75rem] text-ink/55">
                {Number(offer) > candidate.ask * 1.15
                  ? '高于期望值 15% 以上，对方极可能当场接受。'
                  : Number(offer) < candidate.ask
                    ? '低于期望值，对方很可能拒绝。'
                    : '与期望值接近，需要一段考虑时间。'}
              </span>
            </label>

            <p className="border-l-[3px] border-pulse pl-3 text-[0.8125rem] leading-relaxed text-ink/62">
              {candidate.demand}
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

/* ---------------------------------------------------------------- 子组件 */

function FilterChip({
  id,
  label,
  count,
  active,
  onClick,
}: {
  id: string
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      id={id}
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'inline-flex min-h-[34px] items-center gap-1.5 border-[3px] px-2.5 py-1 font-head text-[0.75rem] font-800 transition-transform duration-150 ease-snap',
        active
          ? 'border-ink bg-signal text-white shadow-hard-sm'
          : 'border-ink/30 bg-paper-warm text-ink hover:-translate-y-[2px] hover:border-ink',
      )}
    >
      {label}
      <span className="tabular font-mono text-[0.5625rem] font-700 opacity-70">{count}</span>
    </button>
  )
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'ice' | 'royal' | 'signal' | 'jade'
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 shrink-0 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/50">
        {label}
      </span>
      <span className="flex-1">
        <Meter value={value} tone={tone} height={9} />
      </span>
      <span className="tabular w-7 shrink-0 text-right font-mono text-[0.6875rem] font-700">
        {value}
      </span>
    </div>
  )
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-[3px] border-ink/15 px-3 py-2.5">
      <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
        {label}
      </p>
      <p className="tabular mt-1 font-head text-[0.9375rem] font-800">{value}</p>
    </div>
  )
}
