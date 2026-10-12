import { useMemo, useState, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Coins,
  FileText,
  Filter,
  Info,
  Landmark,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from 'lucide-react'
import clsx from 'clsx'
import { useGame } from '../lib/store'
import { useToast } from '../lib/toast'
import { money, pct, weekShort } from '../lib/format'
import type { FinanceRow } from '../data/types'
import {
  Btn,
  EmptyState,
  Meter,
  Modal,
  PageHeader,
  Panel,
  PanelHead,
  Sparkline,
  StatTile,
  TabPanel,
  Tabs,
} from '../lib/ui'

/* ------------------------------------------------------------------ 静态表 */

/** 近 12 周现金净额（元）。与 store 内每周发行分成 ¥4.2 万、固定支出约 ¥2.2 万一致，
    其中第 3 周与第 12 周含一次性的本地化与展会支出，因此为负。 */
const NET_12W = [
  20_400, 18_800, -11_200, 21_050, 19_900, 20_480, 22_100, 19_500, 20_800, 18_600, 20_480,
  -8_400,
]

interface BudgetLine {
  slug: string
  label: string
  total: number
  used: number
  note: string
}

const BUDGETS: BudgetLine[] = [
  {
    slug: 'rd',
    label: '研发',
    total: 420_000,
    used: 318_000,
    note: '主力项目《雨巷食堂》的引擎、工具链与关卡实现。',
  },
  {
    slug: 'art',
    label: '美术外包',
    total: 180_000,
    used: 146_000,
    note: '场景概念外包已交付两期，角色二次外包尚未启动。',
  },
  {
    slug: 'audio',
    label: '音频',
    total: 70_000,
    used: 31_000,
    note: '录音棚时段费与三名客座乐手的单次结算。',
  },
  {
    slug: 'market',
    label: '市场',
    total: 160_000,
    used: 58_000,
    note: '独立游戏展位已支出，预告片剪辑与投放尚未排期。',
  },
  {
    slug: 'ops',
    label: '运营',
    total: 120_000,
    used: 74_000,
    note: '社区维护、本地化校对与法务咨询的月度固定支出。',
  },
  {
    slug: 'gear',
    label: '设备',
    total: 95_000,
    used: 88_600,
    note: '数位屏更换后余额紧张，机房节点换代需追加预算。',
  },
]

interface LoanOffer {
  id: string
  name: string
  lender: string
  amount: number
  rate: string
  term: string
  interest: string
  condition: string
  risks: string[]
  available: boolean
  blockedReason: string
}

const LOAN_OFFERS: LoanOffer[] = [
  {
    id: 'bank',
    name: '商业银行 · 文创经营贷',
    lender: '城南商业银行',
    amount: 800_000,
    rate: '6.8% / 年',
    term: '104 周（等额本息）',
    interest: '约 ¥108,800',
    condition: '需以现有作品《机工协奏曲》的著作权作为质押，并接受季度财务稽核。',
    risks: [
      '质押期内该作品的发行与授权变更须经银行书面同意。',
      '连续两期逾期将触发资产冻结，并影响法人征信记录。',
      '等额本息意味着在项目无收入阶段仍需按周拨付还款。',
    ],
    available: true,
    blockedReason: '',
  },
  {
    id: 'publisher',
    name: '发行商 · 项目预付款',
    lender: '白鲸互动（发行）',
    amount: 1_500_000,
    rate: '0%（以分成让利替代）',
    term: '至发行后 52 周',
    interest: '首年发行分成 35%',
    condition: '需让出《雨巷食堂》发行后首年 35% 分成，且发行窗口由对方指定。',
    risks: [
      '发行档期不再由工作室自主决定，可能与竞品正面撞期。',
      '首年分成让利 35% 将显著压低回本速度。',
      '合同期内续作需优先向该发行商报价。',
    ],
    available: false,
    blockedReason: '在研项目尚未进入 β 阶段，发行商不接受此阶段的签约请求。',
  },
  {
    id: 'fund',
    name: '文化基金 · 内容扶持',
    lender: '市文化产业专项基金',
    amount: 400_000,
    rate: '0%',
    term: '无固定还款期（结项核销）',
    interest: '无需偿还，需结项审计',
    condition: '需承诺作品中本土文化题材内容占比不低于 30%，并按季度提交进度报告。',
    risks: [
      '内容配比要求可能影响叙事自由，需调整章节结构。',
      '结项审计不通过需全额退回，且三年内不得再次申报。',
      '申请窗口每年开放两次，错过需等待下一周期。',
    ],
    available: false,
    blockedReason: '本轮申请窗口已关闭（下次开放于第 38 周）。',
  },
]

type KindFilter = 'all' | 'income' | 'expense'

const ROOMY = 'border-[3px] border-ink bg-paper-warm shadow-hard'

/* ------------------------------------------------------------------ 页面 */

export default function Finance() {
  const { state, derived } = useGame()
  const toast = useToast()

  const [tab, setTab] = useState('ledger')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [budgets, setBudgets] = useState<BudgetLine[]>(BUDGETS)

  const [rowDetail, setRowDetail] = useState<FinanceRow | null>(null)
  const [editSlug, setEditSlug] = useState<string | null>(null)
  const [editTotal, setEditTotal] = useState('')
  const [editReason, setEditReason] = useState('')
  const [loanOffer, setLoanOffer] = useState<LoanOffer | null>(null)

  const categories = useMemo(
    () => Array.from(new Set(state.finance.map((r) => r.category))),
    [state.finance],
  )

  const rows = useMemo(() => {
    const sorted = [...state.finance].sort((a, b) => b.week - a.week)
    return sorted.filter((r) => {
      if (kindFilter !== 'all' && r.kind !== kindFilter) return false
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
      return true
    })
  }, [state.finance, kindFilter, categoryFilter])

  const filteredTotal = useMemo(
    () => rows.reduce((s, r) => s + r.amount, 0),
    [rows],
  )

  const incomeTotal = useMemo(
    () => state.finance.filter((r) => r.kind === 'income').reduce((s, r) => s + r.amount, 0),
    [state.finance],
  )
  const expenseTotal = useMemo(
    () => state.finance.filter((r) => r.kind === 'expense').reduce((s, r) => s + Math.abs(r.amount), 0),
    [state.finance],
  )
  const releasedIncome = useMemo(
    () =>
      state.projects.reduce((s, p) => s + (p.release ? p.release.revenue : 0), 0),
    [state.projects],
  )

  const groupBy = (kind: 'income' | 'expense') => {
    const map = new Map<string, number>()
    state.finance
      .filter((r) => r.kind === kind)
      .forEach((r) => {
        map.set(r.category, (map.get(r.category) ?? 0) + Math.abs(r.amount))
      })
    const total = kind === 'income' ? incomeTotal : expenseTotal
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        share: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  const incomeMix = useMemo(() => groupBy('income'), [state.finance, incomeTotal])
  const expenseMix = useMemo(() => groupBy('expense'), [state.finance, expenseTotal])

  const allocated = budgets.reduce((s, b) => s + b.total, 0)
  const allocatable = state.money - allocated

  const mainProject = state.projects.find((p) => p.stage !== 'released')
  const remainingBudget = mainProject ? mainProject.budget - mainProject.spent : 0
  const weeksOfBudget =
    derived.weeklyBurn > 0 ? Math.floor(remainingBudget / derived.weeklyBurn) : 0
  const margin = derived.runwayWeeks - weeksOfBudget
  const runwayTight = derived.runwayWeeks < 30 || margin < 8

  const editing = budgets.find((b) => b.slug === editSlug) ?? null

  const openEdit = (b: BudgetLine) => {
    setEditSlug(b.slug)
    setEditTotal(String(b.total))
    setEditReason('')
  }

  const submitEdit = () => {
    if (!editing) return
    const next = Number(editTotal)
    if (!Number.isFinite(next) || next < 0) {
      toast.push({
        severity: 'danger',
        title: '总额填写无效',
        detail: `「${editing.label}」的总额必须是不小于 0 的数字，当前输入为「${editTotal || '空'}」。`,
      })
      return
    }
    if (next < editing.used) {
      toast.push({
        severity: 'danger',
        title: `「${editing.label}」总额低于已用金额`,
        detail: `该科目已支出 ${money(editing.used)}，总额不能下调至 ${money(next)}。请先结清或核销超支部分。`,
      })
      return
    }
    const delta = next - editing.total
    if (delta > allocatable) {
      toast.push({
        severity: 'warn',
        title: '超出可分配额度',
        detail: `本次上调 ${money(delta)}，但未分配额度仅剩 ${money(Math.max(0, allocatable))}。请先下调其他科目，或申请融资。`,
        action: { label: '前往融资', run: () => setTab('funding') },
      })
      return
    }
    if (!editReason.trim()) {
      toast.push({
        severity: 'warn',
        title: '请填写调整理由',
        detail: '预算是可追溯的内部承诺，调整需留一句说明，便于季度复盘时对照。',
      })
      return
    }
    setBudgets((all) =>
      all.map((b) => (b.slug === editing.slug ? { ...b, total: next } : b)),
    )
    setEditSlug(null)
    toast.push({
      severity: 'good',
      title: `「${editing.label}」预算已调整`,
      detail: `总额由 ${money(editing.total)} 调整为 ${money(next)}（${delta >= 0 ? '上调' : '下调'} ${money(Math.abs(delta))}）。理由已归档：${editReason.trim()}`,
    })
  }

  return (
    <>
      <PageHeader
        kicker="财务"
        title="财务"
        latin="LEDGER / CASHFLOW, BUDGET & FINANCING"
        lede={`第 ${state.week} 周账面现金 ${money(state.money)}，每周固定支出 ${money(derived.weeklyBurn)}，其中薪资占 ${money(derived.payroll)}。${
          derived.runwayWeeks >= 99
            ? '已发行作品的分成当前已覆盖全部固定支出，现金处于净流入状态。'
            : `按当前净烧钱速率，现金可支撑 ${derived.runwayWeeks} 周。`
        }`}
        actions={
          <Btn
            id="fin-goto-funding"
            variant="signal"
            icon={Landmark}
            onClick={() => setTab('funding')}
          >
            查看融资方案
          </Btn>
        }
      />

      {/* ------------------------------------------------------- 关键指标 */}
      <section aria-labelledby="fin-kpi" className="mb-7">
        <h2 id="fin-kpi" className="sr-only">
          财务关键指标
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile
            id="fin-kpi-cash"
            icon={Coins}
            label="账面现金"
            value={money(state.money)}
            tone="ink"
            delta={{ dir: 'up', text: '1.6%' }}
            hint="含未结算的发行分成应收账款"
          />
          <StatTile
            id="fin-kpi-burn"
            icon={Wallet}
            label="每周固定支出"
            value={money(derived.weeklyBurn)}
            delta={{ dir: 'up', text: '0.4%' }}
            hint="薪资 + 场地 + 房间运维"
          />
          <StatTile
            id="fin-kpi-payroll"
            icon={Users}
            label="周薪总额"
            value={money(derived.payroll)}
            hint={`${derived.headcount} 名在册成员，人均 ${money(Math.round(derived.payroll / Math.max(1, derived.headcount)))}`}
          />
          <StatTile
            id="fin-kpi-runway"
            icon={CalendarClock}
            label="可支撑周数"
            value={String(derived.runwayWeeks)}
            unit="周"
            tone={runwayTight ? 'signal' : 'paper'}
            delta={{ dir: runwayTight ? 'down' : 'up', text: runwayTight ? '紧张' : '充裕' }}
            hint="在维持现有收入与支出结构的前提下"
          />
          <StatTile
            id="fin-kpi-release-income"
            icon={TrendingUp}
            label="累计发行收入"
            value={money(releasedIncome)}
            delta={{ dir: 'up', text: '12.8%' }}
            hint="已发行作品的累计分成与销售"
          />
        </div>
      </section>

      <Tabs
        idPrefix="fin"
        active={tab}
        onChange={setTab}
        items={[
          { id: 'ledger', label: '流水明细', latin: 'Ledger', count: rows.length },
          { id: 'cash', label: '现金流', latin: 'Cashflow' },
          { id: 'budget', label: '预算分配', latin: 'Budget', count: budgets.length },
          { id: 'funding', label: '融资与贷款', latin: 'Financing' },
        ]}
      />

      {/* ------------------------------------------------------- 流水明细 */}
      <TabPanel idPrefix="fin" id="ledger" className="mt-6">
        <Panel cut="tr">
          <PanelHead
            icon="ScrollText"
            title="收支流水"
            latin={`${rows.length} / ${state.finance.length} 条记录`}
            right={
              <span className="tabular font-mono text-[0.6875rem] font-700 text-ink/60">
                合计 {money(filteredTotal)}
              </span>
            }
          />

          <div className="flex flex-col gap-3 border-b-[3px] border-ink/12 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/50">
                <Filter size={12} strokeWidth={2.8} aria-hidden="true" />
                类型
              </span>
              {(
                [
                  { key: 'all' as KindFilter, label: '全部' },
                  { key: 'income' as KindFilter, label: '收入' },
                  { key: 'expense' as KindFilter, label: '支出' },
                ] as const
              ).map((opt) => (
                <Btn
                  key={opt.key}
                  id={`fin-filter-${opt.key}`}
                  size="sm"
                  variant={kindFilter === opt.key ? 'signal' : 'paper'}
                  aria-pressed={kindFilter === opt.key}
                  onClick={() => setKindFilter(opt.key)}
                >
                  {opt.label}
                </Btn>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <label
                htmlFor="fin-filter-category"
                className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/50"
              >
                科目
              </label>
              <select
                id="fin-filter-category"
                className="p5-input !min-h-[36px] !w-auto !py-1"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">全部科目</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 移动端滚动提示 */}
          <p className="border-b-[3px] border-ink/12 px-4 py-2 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/40 lg:hidden">
            表格可左右滑动查看完整字段
          </p>

          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Banknote}
                title="没有符合当前筛选条件的流水"
                hint="尝试将类型切回「全部」，或把科目筛选重置为「全部科目」。"
                action={
                  <Btn
                    id="fin-filter-reset"
                    onClick={() => {
                      setKindFilter('all')
                      setCategoryFilter('all')
                    }}
                  >
                    重置筛选
                  </Btn>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-left">
                <caption className="sr-only">
                  第 {state.week} 周为止的工作室收支流水，包含周次、类型、科目、摘要与金额
                </caption>
                <thead>
                  <tr className="border-b-[3px] border-ink bg-paper-dim/70">
                    <th scope="col" className="px-4 py-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60">
                      周次
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60">
                      类型
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60">
                      科目
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60">
                      摘要
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60">
                      金额
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isIncome = r.kind === 'income'
                    return (
                      <tr
                        key={r.id}
                        className="border-b-2 border-ink/10 transition-colors duration-150 hover:bg-paper-dim/50"
                      >
                        <td className="tabular px-4 py-3 font-mono text-[0.75rem] font-700 text-ink/70">
                          {weekShort(r.week)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1.5 border-2 border-ink px-1.5 py-0.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.12em]',
                              isIncome ? 'bg-jade text-white' : 'bg-signal text-white',
                            )}
                          >
                            {isIncome ? (
                              <ArrowUpRight size={11} strokeWidth={3} aria-hidden="true" />
                            ) : (
                              <ArrowDownRight size={11} strokeWidth={3} aria-hidden="true" />
                            )}
                            {isIncome ? '收入' : '支出'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-head text-[0.8125rem] font-800">{r.category}</td>
                        <td className="px-4 py-3 text-[0.8125rem] text-ink/72">{r.label}</td>
                        <td
                          className={clsx(
                            'tabular px-4 py-3 text-right font-head text-[0.875rem] font-800',
                            isIncome ? 'text-jade' : 'text-signal',
                          )}
                        >
                          {isIncome ? '+' : ''}
                          {money(r.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            id={`fin-row-open-${r.id}`}
                            onClick={() => setRowDetail(r)}
                            className="border-2 border-ink bg-paper-warm px-2 py-1 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] transition-colors duration-150 hover:bg-ink hover:text-paper-warm"
                            aria-label={`查看流水详情：第 ${r.week} 周 ${r.label}`}
                          >
                            详情
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-[3px] border-ink bg-ink text-paper-warm">
                    <td colSpan={4} className="px-4 py-3 font-head text-[0.8125rem] font-800">
                      当前筛选合计（{rows.length} 条）
                    </td>
                    <td
                      className={clsx(
                        'tabular px-4 py-3 text-right font-display text-[1rem]',
                        filteredTotal >= 0 ? 'text-jade' : 'text-signal-glow',
                      )}
                    >
                      {filteredTotal >= 0 ? '+' : ''}
                      {money(filteredTotal)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Panel>
      </TabPanel>

      {/* ------------------------------------------------------- 现金流 */}
      <TabPanel idPrefix="fin" id="cash" className="mt-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] [&>*]:min-w-0">
          <Panel cut="tr">
            <PanelHead
              icon="ChartNoAxesCombined"
              title="近 12 周现金净额"
              latin="Net cash per week"
              right={
                <span className="tabular font-mono text-[0.6875rem] font-700 text-ink/60">
                  平均 {money(Math.round(NET_12W.reduce((s, n) => s + n, 0) / NET_12W.length))}
                </span>
              }
            />
            <div className="px-4 py-5">
              <div className="overflow-x-auto">
                <Sparkline
                  points={NET_12W}
                  width={560}
                  height={120}
                  tone="#E4002B"
                  label="近 12 周每周现金净额走势，整体为正、含两次一次性支出造成的负值周"
                />
              </div>
              <p className="mt-4 border-l-[3px] border-ink pl-3.5 text-[0.8125rem] leading-relaxed text-ink/68">
                净额基线稳定在每周
                <strong className="mx-1 font-head font-800 text-jade">
                  +{money(20_480)}
                </strong>
                左右，来自《机工协奏曲》的持续分成。第 3 周与第 12 周出现负值，分别对应日语本地化外包与独立游戏展位租赁两笔一次性支出，不属于结构性亏损。
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-3 border-t-[3px] border-ink/12 pt-4 sm:grid-cols-4">
                <CashStat id="fin-cash-best" label="最佳单周" value={`+${money(22_100)}`} tone="jade" />
                <CashStat id="fin-cash-worst" label="最差单周" value={money(-11_200)} tone="signal" />
                <CashStat id="fin-cash-median" label="中位数" value={`+${money(20_190)}`} />
                <CashStat id="fin-cash-volatility" label="波动幅度" value={money(33_300)} />
              </dl>
            </div>
          </Panel>

          <div className="flex flex-col gap-5">
            <Panel cut="tr">
              <PanelHead
                icon="TrendingUp"
                title="收入结构"
                latin="Revenue mix"
                right={
                  <span className="tabular font-mono text-[0.6875rem] font-700 text-jade">
                    {money(incomeTotal)}
                  </span>
                }
              />
              <div className="space-y-4 px-4 py-4">
                {incomeMix.map((row) => (
                  <div key={row.category}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="font-head text-[0.8125rem] font-800">{row.category}</span>
                      <span className="tabular font-mono text-[0.6875rem] font-700 text-ink/70">
                        {money(row.amount)} · {pct(row.share, 1)}
                      </span>
                    </div>
                    <Meter value={row.share} tone="jade" height={9} />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel cut="tr">
              <PanelHead
                icon="Layers"
                title="支出结构"
                latin="Expense mix"
                right={
                  <span className="tabular font-mono text-[0.6875rem] font-700 text-signal">
                    {money(expenseTotal)}
                  </span>
                }
              />
              <div className="space-y-4 px-4 py-4">
                {expenseMix.map((row) => (
                  <div key={row.category}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="font-head text-[0.8125rem] font-800">{row.category}</span>
                      <span className="tabular font-mono text-[0.6875rem] font-700 text-ink/70">
                        {money(row.amount)} · {pct(row.share, 1)}
                      </span>
                    </div>
                    <Meter value={row.share} tone="signal" height={9} />
                  </div>
                ))}
                <p className="border-t-2 border-ink/12 pt-3 text-[0.75rem] leading-relaxed text-ink/60">
                  薪资与外包合计占支出的
                  <strong className="mx-1 font-head font-800">
                    {pct(
                      ((expenseMix.find((r) => r.category === '薪资')?.amount ?? 0) +
                        (expenseMix.find((r) => r.category === '外包')?.amount ?? 0)) /
                        Math.max(1, expenseTotal) *
                        100,
                      0,
                    )}
                  </strong>
                  ，是压缩支出的主要着力点。
                </p>
              </div>
            </Panel>
          </div>
        </div>

        <Panel tone={runwayTight ? 'ink' : 'paper'} cut="bl" className="mt-5">
          <PanelHead
            tone={runwayTight ? 'ink' : 'paper'}
            icon="Terminal"
            title="资金断点评估"
            latin="Runway assessment"
          />
          <div className="px-4 py-4">
            <div className="flex flex-wrap items-start gap-3">
              <span
                className={clsx(
                  'grid h-10 w-10 shrink-0 place-items-center border-[3px]',
                  runwayTight ? 'border-signal bg-signal text-white' : 'border-ink bg-pulse',
                )}
              >
                <TriangleAlert size={19} strokeWidth={2.6} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={clsx(
                    'font-head text-[0.9375rem] font-800',
                    runwayTight && 'text-paper-warm',
                  )}
                >
                  {runwayTight ? '安全边际不足，建议立即处理' : '当前处于安全区间，但需锁定下一笔收入'}
                </p>
                <p
                  className={clsx(
                    'mt-1.5 text-[0.875rem] leading-relaxed',
                    runwayTight ? 'text-paper-warm/72' : 'text-ink/70',
                  )}
                >
                  {derived.runwayWeeks >= 99 ? (
                    <>
                      现有发行分成已覆盖每周 {money(derived.weeklyBurn)} 的固定支出，账面现金不再净流出。
                    </>
                  ) : (
                    <>
                      按每周 {money(derived.weeklyBurn)} 的固定支出计算，账面现金可支撑
                      <strong className="mx-1 tabular font-head font-800">
                        {derived.runwayWeeks}
                      </strong>
                      周。
                    </>
                  )}
                  在研的《{mainProject ? mainProject.title : '当前项目'}》仍需投入
                  <strong className="mx-1 tabular font-head font-800">{money(remainingBudget)}</strong>
                  才能走完到母盘的流程，折合约
                  <strong className="mx-1 tabular font-head font-800">{weeksOfBudget}</strong>
                  周，安全边际为
                  <strong className="mx-1 tabular font-head font-800">{margin}</strong>
                  周。
                </p>
                <ul
                  className={clsx(
                    'mt-3.5 space-y-2 text-[0.8125rem] leading-relaxed',
                    runwayTight ? 'text-paper-warm/70' : 'text-ink/68',
                  )}
                >
                  <li className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-2 w-2 shrink-0 bg-signal"
                    />
                    将「市场」与「音频」的未用额度合计
                    <strong className="mx-1 font-head font-800">
                      {money(
                        budgets
                          .filter((b) => b.slug === 'market' || b.slug === 'audio')
                          .reduce((s, b) => s + (b.total - b.used), 0),
                      )}
                    </strong>
                    暂缓拨付，可把安全边际延长约
                    {Math.floor(
                      budgets
                        .filter((b) => b.slug === 'market' || b.slug === 'audio')
                        .reduce((s, b) => s + (b.total - b.used), 0) / Math.max(1, derived.weeklyBurn),
                    )}
                    周。
                  </li>
                  <li className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-2 w-2 shrink-0 bg-signal"
                    />
                    若《{mainProject ? mainProject.title : '在研项目'}》延期超过 8 周，发行分成与项目投入将同时错位，届时应启动融资方案。
                  </li>
                  <li className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-2 w-2 shrink-0 bg-signal"
                    />
                    每周固定支出中，薪资
                    <strong className="mx-1 font-head font-800">{money(derived.payroll)}</strong>
                    与房间及场地运维
                    <strong className="mx-1 font-head font-800">
                      {money(derived.weeklyBurn - derived.payroll)}
                    </strong>
                    均属刚性支出，无法直接削减，只能通过调整人员配置与房间规模间接优化。
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Panel>
      </TabPanel>

      {/* ------------------------------------------------------- 预算分配 */}
      <TabPanel idPrefix="fin" id="budget" className="mt-6">
        <Panel cut="tr">
          <PanelHead
            icon="Layers"
            title="部门预算"
            latin="Departmental budget"
            right={
              <span className="tabular font-mono text-[0.6875rem] font-700 text-ink/60">
                已分配 {money(allocated)} / {money(state.money)}
              </span>
            }
          />

          <div className="grid gap-0 border-b-[3px] border-ink/12 sm:grid-cols-3">
            <BudgetHead
              id="fin-budget-head-allocated"
              label="已分配总额"
              value={money(allocated)}
              hint={`占账面现金 ${pct((allocated / Math.max(1, state.money)) * 100, 1)}`}
            />
            <BudgetHead
              id="fin-budget-head-used"
              label="本周已用"
              value={money(budgets.reduce((s, b) => s + b.used, 0))}
              hint="含已结算与已承诺待付的部分"
              divided
            />
            <BudgetHead
              id="fin-budget-head-left"
              label="剩余可分配"
              value={money(Math.max(0, allocatable))}
              hint={allocatable < 100_000 ? '额度偏低，上调任一科目都会触发提示' : '可自由上调任意科目'}
              divided
              tone={allocatable < 100_000 ? 'signal' : 'jade'}
            />
          </div>

          <ul className="divide-y-[3px] divide-ink/10">
            {budgets.map((b) => {
              const ratio = b.total > 0 ? (b.used / b.total) * 100 : 0
              const nearLimit = ratio >= 90
              return (
                <li
                  key={b.slug}
                  className="flex flex-col gap-3 px-4 py-4 transition-colors duration-150 hover:bg-paper-dim/40 lg:flex-row lg:items-center lg:gap-6"
                >
                  <div className="min-w-0 lg:w-52">
                    <p className="font-head text-[1rem] font-800">{b.label}</p>
                    <p className="mt-0.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/45">
                      {b.slug.toUpperCase()}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <Meter
                      id={`fin-budget-meter-${b.slug}`}
                      value={ratio}
                      label={`${b.label} 已用占总额`}
                      showValue
                      tone={nearLimit ? 'signal' : ratio > 70 ? 'pulse' : 'ink'}
                    />
                    <p className="mt-2 text-[0.75rem] leading-relaxed text-ink/60">{b.note}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-4 lg:flex-col lg:items-end lg:gap-1.5">
                    <p className="tabular font-head text-[0.875rem] font-800">
                      {money(b.used)}
                      <span className="mx-1 text-ink/35">/</span>
                      {money(b.total)}
                    </p>
                    <Btn
                      id={`fin-budget-adjust-${b.slug}`}
                      size="sm"
                      onClick={() => openEdit(b)}
                    >
                      调整
                    </Btn>
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </TabPanel>

      {/* ------------------------------------------------------- 融资 */}
      <TabPanel idPrefix="fin" id="funding" className="mt-6">
        <Panel cut="tr" className="mb-5">
          <PanelHead
            tone="ink"
            icon="Handshake"
            title="可选融资方案"
            latin="Financing options"
          />
          <p className="border-b-[3px] border-ink/12 px-4 py-3.5 text-[0.8125rem] leading-relaxed text-ink/70">
            三种方案的代价不在利率本身，而在附带的控制权、档期与内容约束。下列条款为可签约状态的真实快照，被否决的方案同时给出否决原因。
          </p>
          <div className="grid gap-5 p-4 lg:grid-cols-3">
            {LOAN_OFFERS.map((offer) => (
              <article
                key={offer.id}
                id={`fin-loan-card-${offer.id}`}
                className={clsx(
                  'p5-noise relative flex flex-col border-[3px] border-ink p-4 transition-transform duration-200 ease-snap',
                  offer.available
                    ? clsx(ROOMY, 'hover:-translate-y-[3px]')
                    : 'bg-paper-dim/70',
                )}
              >
                {!offer.available && (
                  <span
                    aria-hidden="true"
                    className="p5-hatch pointer-events-none absolute inset-0"
                  />
                )}

                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
                      {offer.lender}
                    </span>
                    {offer.available ? null : (
                      <span className="inline-flex items-center gap-1 border-2 border-ink bg-ink px-1.5 py-0.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.12em] text-paper-warm">
                        不可申请
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 font-head text-[1rem] font-800 leading-snug">
                    {offer.name}
                  </h3>

                  <p className="tabular mt-3 font-display text-[1.875rem] leading-none">
                    {money(offer.amount)}
                  </p>

                  <dl className="mt-4 space-y-2 border-t-[3px] border-ink/12 pt-3.5">
                    <OfferRow id={`fin-loan-${offer.id}-rate`} label="利率" value={offer.rate} />
                    <OfferRow id={`fin-loan-${offer.id}-term`} label="期限" value={offer.term} />
                    <OfferRow id={`fin-loan-${offer.id}-cost`} label="资金成本" value={offer.interest} />
                  </dl>

                  <p className="mt-3.5 border-l-[3px] border-signal pl-3 text-[0.8125rem] leading-relaxed text-ink/70">
                    {offer.condition}
                  </p>
                </div>

                <div className="relative mt-5 border-t-[3px] border-ink/12 pt-4">
                  {offer.available ? (
                    <Btn
                      id={`fin-loan-apply-${offer.id}`}
                      variant="signal"
                      className="w-full"
                      icon={FileText}
                      onClick={() => setLoanOffer(offer)}
                    >
                      申请
                    </Btn>
                  ) : (
                    <>
                      <Btn
                        id={`fin-loan-apply-${offer.id}`}
                        disabled
                        className="w-full"
                        aria-describedby={`fin-loan-blocked-${offer.id}`}
                      >
                        申请
                      </Btn>
                      <p
                        id={`fin-loan-blocked-${offer.id}`}
                        className="mt-2.5 flex gap-2 text-[0.75rem] leading-relaxed text-ink/65"
                      >
                        <Info size={13} strokeWidth={2.8} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" />
                        {offer.blockedReason}
                      </p>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel cut="tr">
          <PanelHead icon="BadgeDollarSign" title="融资决策参考" latin="Decision notes" />
          <ul className="divide-y-[3px] divide-ink/10">
            {[
              {
                id: 'fin-note-1',
                title: '优先顺序：文化基金 → 银行贷款 → 发行商预付款',
                body: '基金的成本最低但受内容与窗口约束；银行贷款保留创作自主权但增加刚性还款；预付款金额最大，代价是让出档期与首年分成，只应在发行前景明确时启用。',
              },
              {
                id: 'fin-note-2',
                title: '当前阶段不建议引入发行商预付款',
                body: `《${mainProject ? mainProject.title : '在研项目'}》尚未进入 β，品质预估仍在浮动。此刻签约等于把定价权交给对方，而项目本身还有调整空间。`,
              },
              {
                id: 'fin-note-3',
                title: '银行贷款的实际还款压力测算',
                body: `若借入 ¥80 万并以 104 周等额本息偿还，每周需支出约 ¥8,400。以当前每周净额 ${money(20_480)} 计，仍可覆盖，但会将安全边际压缩约 42%。`,
              },
            ].map((n) => (
              <li key={n.id} id={n.id} className="px-4 py-4">
                <h3 className="font-head text-[0.9375rem] font-800">{n.title}</h3>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink/68">{n.body}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </TabPanel>

      {/* ------------------------------------------------------- 流水详情 */}
      <Modal
        open={rowDetail !== null}
        onClose={() => setRowDetail(null)}
        title={rowDetail?.label ?? ''}
        latin={rowDetail ? `${rowDetail.category} · ${weekShort(rowDetail.week)}` : undefined}
        kicker="流水详情"
        size="md"
        footer={
          <>
            <Btn id="fin-ledger-detail-close" onClick={() => setRowDetail(null)}>
              关闭
            </Btn>
            <Btn
              id="fin-ledger-detail-account"
              variant="signal"
              onClick={() => {
                const r = rowDetail
                setRowDetail(null)
                toast.push({
                  severity: 'info',
                  title: '已生成对账单草稿',
                  detail: r
                    ? `已按「${r.category}」科目汇总本周记录，草稿金额 ${money(r.amount)}，可在季度审计时导出。`
                    : '已按当前筛选生成对账单草稿。',
                })
              }}
            >
              生成对账单
            </Btn>
          </>
        }
      >
        {rowDetail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 border-2 border-ink px-2 py-1 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em]',
                  rowDetail.kind === 'income' ? 'bg-jade text-white' : 'bg-signal text-white',
                )}
              >
                {rowDetail.kind === 'income' ? (
                  <ArrowUpRight size={12} strokeWidth={3} aria-hidden="true" />
                ) : (
                  <ArrowDownRight size={12} strokeWidth={3} aria-hidden="true" />
                )}
                {rowDetail.kind === 'income' ? '收入' : '支出'}
              </span>
              <span className="tabular font-mono text-[0.6875rem] font-700 uppercase tracking-[0.16em] text-ink/55">
                {weekShort(rowDetail.week)}
              </span>
            </div>

            <p
              className={clsx(
                'tabular font-display text-[2rem] leading-none',
                rowDetail.kind === 'income' ? 'text-jade' : 'text-signal',
              )}
            >
              {rowDetail.kind === 'income' ? '+' : ''}
              {money(rowDetail.amount)}
            </p>

            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField id="fin-detail-category" label="科目">
                {rowDetail.category}
              </DetailField>
              <DetailField id="fin-detail-id" label="流水编号">
                <span className="font-mono">{rowDetail.id.toUpperCase()}</span>
              </DetailField>
              <DetailField id="fin-detail-week" label="记账周次">
                <span className="tabular">{weekShort(rowDetail.week)}（第 {rowDetail.week} 周）</span>
              </DetailField>
              <DetailField id="fin-detail-signed" label="对现金流影响">
                <span className={clsx('tabular', rowDetail.kind === 'income' ? 'text-jade' : 'text-signal')}>
                  {rowDetail.kind === 'income' ? '增加' : '减少'} {money(Math.abs(rowDetail.amount))}
                </span>
              </DetailField>
            </dl>

            <div className="border-[3px] border-ink/15 px-3.5 py-3">
              <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
                摘要
              </p>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink/78">{rowDetail.label}</p>
            </div>

            <p className="text-[0.75rem] leading-relaxed text-ink/55">
              该笔记录已计入第 {state.week} 周的现金流结余。若金额与合同不符，请在「预算分配」中调整对应科目后重新生成对账单。
            </p>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------- 预算调整 */}
      <Modal
        open={editing !== null}
        onClose={() => setEditSlug(null)}
        title={editing ? `调整「${editing.label}」预算` : ''}
        latin="Rebalance a department line"
        kicker="预算调整"
        size="sm"
        footer={
          <>
            <Btn id="fin-budget-modal-cancel" onClick={() => setEditSlug(null)}>
              取消
            </Btn>
            <Btn
              id="fin-budget-modal-submit"
              variant="signal"
              icon={CheckCircle2}
              onClick={submitEdit}
            >
              确认调整
            </Btn>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3">
              <DetailField id="fin-budget-modal-current" label="当前总额">
                <span className="tabular">{money(editing.total)}</span>
              </DetailField>
              <DetailField id="fin-budget-modal-used" label="已用">
                <span className="tabular">{money(editing.used)}</span>
              </DetailField>
              <DetailField id="fin-budget-modal-left" label="可用余量">
                <span className="tabular">{money(editing.total - editing.used)}</span>
              </DetailField>
              <DetailField id="fin-budget-modal-pool" label="未分配额度">
                <span className="tabular">{money(Math.max(0, allocatable))}</span>
              </DetailField>
            </dl>

            <div>
              <label
                htmlFor="fin-budget-modal-total"
                className="mb-1.5 block font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60"
              >
                新总额（元）
              </label>
              <input
                id="fin-budget-modal-total"
                className="p5-input tabular"
                type="number"
                min={editing.used}
                step={1000}
                inputMode="numeric"
                value={editTotal}
                onChange={(e) => setEditTotal(e.target.value)}
              />
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink/55">
                不得低于已支出的 {money(editing.used)}；上调额度将从「剩余可分配」中扣除。
              </p>
            </div>

            <div>
              <label
                htmlFor="fin-budget-modal-reason"
                className="mb-1.5 block font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60"
              >
                调整理由
              </label>
              <textarea
                id="fin-budget-modal-reason"
                className="p5-input min-h-[84px] resize-y"
                rows={3}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="例如：机房节点换代需追加采购预算。"
              />
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink/55">
                必填。理由会随调整一并归档，用于季度复盘时追溯决策依据。
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------- 贷款申请 */}
      <Modal
        open={loanOffer !== null}
        onClose={() => setLoanOffer(null)}
        title={loanOffer ? `申请：${loanOffer.name}` : ''}
        latin={loanOffer ? `${loanOffer.lender} · ${money(loanOffer.amount)}` : undefined}
        kicker="融资确认"
        size="md"
        footer={
          <>
            <Btn id="fin-loan-modal-cancel" onClick={() => setLoanOffer(null)}>
              再考虑一下
            </Btn>
            <Btn
              id="fin-loan-modal-confirm"
              variant="signal"
              icon={CheckCircle2}
              onClick={() => {
                const offer = loanOffer
                setLoanOffer(null)
                toast.push({
                  severity: 'warn',
                  title: offer ? `已提交「${offer.name}」申请` : '已提交申请',
                  detail: offer
                    ? `额度 ${money(offer.amount)}，资金成本 ${offer.interest}。本原型不产生真实合约，条款仅在界面中模拟。`
                    : '本原型不产生真实合约，条款仅在界面中模拟。',
                })
              }}
            >
              确认申请
            </Btn>
          </>
        }
      >
        {loanOffer && (
          <div className="space-y-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField id="fin-loan-modal-amount" label="额度">
                <span className="tabular">{money(loanOffer.amount)}</span>
              </DetailField>
              <DetailField id="fin-loan-modal-rate" label="利率">
                {loanOffer.rate}
              </DetailField>
              <DetailField id="fin-loan-modal-term" label="期限">
                {loanOffer.term}
              </DetailField>
              <DetailField id="fin-loan-modal-cost" label="资金成本">
                {loanOffer.interest}
              </DetailField>
            </dl>

            <div className="border-[3px] border-ink/15 px-3.5 py-3">
              <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
                附带条件
              </p>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink/78">
                {loanOffer.condition}
              </p>
            </div>

            <section aria-labelledby="fin-loan-modal-risks">
              <h3
                id="fin-loan-modal-risks"
                className="mb-2.5 flex items-center gap-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-signal"
              >
                <TriangleAlert size={13} strokeWidth={2.8} aria-hidden="true" />
                风险提示
              </h3>
              <ul className="space-y-2.5">
                {loanOffer.risks.map((risk, i) => (
                  <li
                    key={risk}
                    id={`fin-loan-modal-risk-${i + 1}`}
                    className="flex gap-3 border-[3px] border-ink/15 px-3 py-2.5"
                  >
                    <span
                      aria-hidden="true"
                      className="tabular mt-0.5 shrink-0 border-2 border-ink bg-signal px-1.5 font-mono text-[0.5625rem] font-700 text-white"
                    >
                      R{i + 1}
                    </span>
                    <span className="text-[0.8125rem] leading-relaxed text-ink/72">{risk}</span>
                  </li>
                ))}
              </ul>
            </section>

            <p className="border-l-[3px] border-ink pl-3.5 text-[0.75rem] leading-relaxed text-ink/58">
              确认后将生成一份待签署的意向书，签署动作在「企划」页完成。本原型不会产生任何真实资金往来。
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

/* --------------------------------------------------------------- 局部组件 */

function CashStat({
  id,
  label,
  value,
  tone = 'ink',
}: {
  id: string
  label: string
  value: string
  tone?: 'ink' | 'jade' | 'signal'
}) {
  return (
    <div id={id} className="border-[3px] border-ink bg-paper px-3 py-2.5">
      <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
        {label}
      </dt>
      <dd
        className={clsx(
          'tabular mt-0.5 font-head text-[0.9375rem] font-800',
          tone === 'jade' && 'text-jade',
          tone === 'signal' && 'text-signal',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function BudgetHead({
  id,
  label,
  value,
  hint,
  divided = false,
  tone = 'ink',
}: {
  id: string
  label: string
  value: string
  hint: string
  divided?: boolean
  tone?: 'ink' | 'jade' | 'signal'
}) {
  return (
    <div
      id={id}
      className={clsx('px-4 py-3.5', divided && 'border-t-[3px] border-ink/12 sm:border-l-[3px] sm:border-t-0')}
    >
      <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
        {label}
      </p>
      <p
        className={clsx(
          'tabular mt-1 font-display text-[1.375rem] leading-none',
          tone === 'jade' && 'text-jade',
          tone === 'signal' && 'text-signal',
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink/58">{hint}</p>
    </div>
  )
}

function OfferRow({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div id={id} className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/50">
        {label}
      </dt>
      <dd className="tabular text-right font-head text-[0.8125rem] font-800">{value}</dd>
    </div>
  )
}

function DetailField({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div id={id} className="border-[3px] border-ink/15 px-3 py-2.5">
      <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
        {label}
      </dt>
      <dd className="mt-1 font-head text-[0.875rem] font-800">{children}</dd>
    </div>
  )
}
