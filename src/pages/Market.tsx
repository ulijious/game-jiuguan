import { useMemo, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck,
  CalendarRange,
  CircleDollarSign,
  Eye,
  Flame,
  Gauge,
  HeartHandshake,
  Lock,
  MessageSquareQuote,
  Newspaper,
  Shield,
  Sparkle,
  Star,
  Swords,
  TrendingDown,
  Trophy,
  Users2,
  type LucideIcon,
} from 'lucide-react'
import { useGame } from '../lib/store'
import { useToast } from '../lib/toast'
import { clamp, num, pct, weekLabel } from '../lib/format'
import {
  Btn,
  EmptyState,
  Marquee,
  Meter,
  Modal,
  PageHeader,
  Panel,
  Slab,
  Sparkline,
  StatTile,
  TabPanel,
  Tag,
  Tabs,
  type TabItem,
} from '../lib/ui'
import { SeverityMark } from '../components/SeverityMark'
import type { Competitor } from '../data/types'

/* ------------------------------------------------------------------ 常量数据 */

type Stance = Competitor['stance']

const STANCE_META: Record<Stance, { label: string; latin: string; tone: 'signal' | 'ice' | 'pulse' }> = {
  rival: { label: '对手', latin: 'Rival', tone: 'signal' },
  peer: { label: '同类', latin: 'Peer', tone: 'ice' },
  idol: { label: '标杆', latin: 'Benchmark', tone: 'pulse' },
}

interface Intel {
  strengths: string[]
  weaknesses: string[]
  counter: string
  threat: number
}

const INTEL: Record<string, Intel> = {
  k1: {
    strengths: [
      '同档期题材重叠，玩家认知成本比我们低',
      '美术外包成本比我们低约三成',
      '已与两家平台签下首页推荐位',
    ],
    weaknesses: ['叙事高度线性，缺乏分支重玩价值', '美术风格辨识度弱，宣传图同质', '社区运营薄弱，更新节奏慢'],
    counter: '把「分支重玩」做成宣传主轴，并在他们放出宣传片之前先释出一段可玩 Demo。',
    threat: 74,
  },
  k2: {
    strengths: ['教程即剧情的教科书级处理', '品牌溢价高，定价可上浮', '团队规模约为我们的六倍'],
    weaknesses: ['题材偏硬核，女性玩家占比不足两成', '更新周期长，半年一次大版本', '对低配置设备优化一般'],
    counter: '不与它对标规模，改对标「情感密度」。把我们的短时长、高完成度作为正面卖点。',
    threat: 88,
  },
  k3: {
    strengths: ['口碑极高，正面评价率超过九成', '极低预算换来极高回报', '作者个人号召力强'],
    weaknesses: ['内容量不足八小时', '无多语言支持', '无主机版本，渠道单一'],
    counter: '它是同类而不是对手。可以考虑主动接触，争取联合发行或捆绑曝光。',
    threat: 31,
  },
  k4: {
    strengths: ['体量大，内容更新频繁', '直接沿用我们已验证过的配器机制', '营销预算充足，买量凶猛'],
    weaknesses: ['机制照搬但缺少情感内核', '社区已出现「像但不像」的评价', '性能口碑差，差评集中在优化'],
    counter: '准备一份「机制溯源」开发日志，用时间线确立原创性，把争议转化为关注度。',
    threat: 81,
  },
}

const HEADLINES = [
  '《钢与蜜》宣布延期至 Q3，官方称「需要更多打磨时间」',
  '独立游戏节公布入围名单：《巷口便利店》领跑叙事类',
  '主机平台调整小型作品分成比例，独立团队普遍受益',
  '《协奏都市》发布性能补丁，玩家仍指优化不到位',
  '暑期档竞争强度预报：模拟经营品类将出现四款同档期作品',
  '《长夜书店》释出试玩版，Steam 好评率暂为 82%',
]

/** 已发行作品《机工协奏曲》周销量长尾（第 12–26 周，合计 41,200 份） */
const WEEKLY_UNITS = [
  { week: 12, units: 8180 },
  { week: 13, units: 6100 },
  { week: 14, units: 4800 },
  { week: 15, units: 3950 },
  { week: 16, units: 3280 },
  { week: 17, units: 2740 },
  { week: 18, units: 2300 },
  { week: 19, units: 1960 },
  { week: 20, units: 1680 },
  { week: 21, units: 1450 },
  { week: 22, units: 1250 },
  { week: 23, units: 1080 },
  { week: 24, units: 930 },
  { week: 25, units: 800 },
  { week: 26, units: 700 },
]

const WINDOWS = [
  { id: 'w4', label: '近 4 周', weeks: 4, latin: '4W' },
  { id: 'w12', label: '近 12 周', weeks: 12, latin: '12W' },
  { id: 'all', label: '全部', weeks: WEEKLY_UNITS.length, latin: 'ALL' },
] as const

const PRESS = [
  { id: 'pr1', outlet: '游戏观察', score: 84, quote: '它把「等待」做成了一种玩法。' },
  { id: 'pr2', outlet: '像素评论', score: 79, quote: '叙事密度惊人，但第二幕的节奏明显松散。' },
  { id: 'pr3', outlet: '独立前线', score: 88, quote: '年度最安静，也最狠的一部作品。' },
  { id: 'pr4', outlet: '第九艺术', score: 76, quote: '机械部分扎实，情感部分偶有失手。' },
  { id: 'pr5', outlet: '周末游戏志', score: 82, quote: '值得在雨天、且只有一个人时打开。' },
  { id: 'pr6', outlet: '玩家之声', score: 85, quote: '配器系统让我重开了三次。' },
]

const REVIEWS = [
  {
    id: 'rv1',
    author: '雨里等灯',
    platform: 'PC',
    hours: 46,
    rating: 5,
    title: '它记得每一个没说出口的人',
    body: '第三章那段「不追问」的处理让我停下来很久。它没有逼你做选择，但你能感觉到选择已经发生了。配器系统是意外的惊喜，我为了凑齐一段完整旋律重开了两次。',
    helpful: 412,
  },
  {
    id: 'rv2',
    author: '铁皮罐头',
    platform: 'Switch',
    hours: 23,
    rating: 3,
    title: '好作品，但节奏对掌机不友好',
    body: '文本量放在这里是对的，但掌机模式下字号偏小，长时间阅读很累。中段有大约三小时几乎没有新机制，差点弃坑，坚持过去之后才好转。',
    helpful: 187,
  },
  {
    id: 'rv3',
    author: '十九号齿轮',
    platform: 'PC',
    hours: 71,
    rating: 4,
    title: '系统深度足够，说明文档不足',
    body: '配器与管道耦合的逻辑其实很优雅，但游戏从来没解释清楚过。我是看了社区的一份表格才明白的。建议加一个可展开的高级说明，而不是让玩家自己去猜。',
    helpful: 264,
  },
]

const KEYWORDS = [
  { word: '雨天氛围', count: 412 },
  { word: '配器系统', count: 388 },
  { word: '长镜头', count: 341 },
  { word: '节奏偏慢', count: 297 },
  { word: '原声带', count: 286 },
  { word: '结局处理', count: 254 },
  { word: '二周目', count: 203 },
  { word: '说明文档', count: 188 },
  { word: '手感', count: 166 },
  { word: '性能优化', count: 141 },
  { word: '本地化', count: 118 },
  { word: '流程时长', count: 97 },
  { word: '存档机制', count: 62 },
]

const PLATFORM_SPLIT = [
  { id: 'plat-pc', label: 'PC / Steam', value: 54, tone: 'ink' as const },
  { id: 'plat-console', label: '主机', value: 28, tone: 'signal' as const },
  { id: 'plat-mobile', label: '移动端', value: 18, tone: 'ice' as const },
]

const ARCHETYPES = [
  { id: 'arch-story', label: '叙事驱动型', value: 38, tone: 'royal' as const, note: '为剧情付费，对分支与结局敏感' },
  { id: 'arch-system', label: '系统钻研型', value: 27, tone: 'ice' as const, note: '关心数值与最优解，会做表' },
  { id: 'arch-mood', label: '氛围沉浸型', value: 23, tone: 'jade' as const, note: '为美术与音乐停留，容忍慢节奏' },
  { id: 'arch-collect', label: '收集完成型', value: 12, tone: 'pulse' as const, note: '追求全成就，对隐藏内容敏感' },
]

interface Slot {
  id: string
  week: number
  label: string
  competition: number
  firstWeekUnits: number
  risk: '低' | '中' | '高'
  rival: string
  note: string
  recommended: boolean
}

const SLOTS: Slot[] = [
  {
    id: 'slot-30',
    week: 30,
    label: '初春档',
    competition: 78,
    firstWeekUnits: 4200,
    risk: '中',
    rival: '《长夜书店》',
    note: '与《长夜书店》正面撞档，题材重叠度高。宣传预算会被摊薄，但能借势引起品类讨论。',
    recommended: false,
  },
  {
    id: 'slot-34',
    week: 34,
    label: '春末档',
    competition: 92,
    firstWeekUnits: 3900,
    risk: '高',
    rival: '《钢与蜜》资料片',
    note: '《钢与蜜》资料片落在同一周，几乎所有媒体版面都会被占用。不建议在此档期硬碰。',
    recommended: false,
  },
  {
    id: 'slot-40',
    week: 40,
    label: '暑期尾段',
    competition: 41,
    firstWeekUnits: 5600,
    risk: '低',
    rival: '无同量级作品',
    note: '竞争强度全年最低，且落在暑期购买力的尾段。与 α 封版（第 34 周）之间留有六周缓冲，可从容处理遗留缺陷。',
    recommended: true,
  },
  {
    id: 'slot-46',
    week: 46,
    label: '年末档',
    competition: 63,
    firstWeekUnits: 4800,
    risk: '中',
    rival: '《协奏都市》年度版',
    note: '销量窗口稳定，但会被年度榜单与颁奖季的讨论淹没。若档期进一步延后，现金储备需重新评估。',
    recommended: false,
  },
]

const TIMELINE_START = 26
const TIMELINE_END = 49
const TIMELINE_WEEKS = Array.from(
  { length: TIMELINE_END - TIMELINE_START + 1 },
  (_, i) => TIMELINE_START + i,
)
const timelinePos = (w: number) =>
  ((w - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100

/* ------------------------------------------------------------------ 局部标题条
   PanelHead 的 icon 走 ICONS 登记表，未登记的图标会静默退化成方块。
   这里改为直接接收 Lucide 组件，避免图标被吞掉。 */

function SectionHead({
  icon: Ico,
  title,
  latin,
  right,
}: {
  icon: LucideIcon
  title: string
  latin?: string
  right?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b-[3px] border-ink bg-paper-dim/70 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center border-2 border-ink bg-paper-warm">
          <Ico size={15} strokeWidth={2.4} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-head text-[0.9375rem] font-800 tracking-[0.01em]">
            {title}
          </h3>
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

/* ------------------------------------------------------------------ 页面 */

export default function Market() {
  const { state } = useGame()
  const toast = useToast()

  const [tab, setTab] = useState('rivals')
  const [stance, setStance] = useState<Stance | 'all'>('all')
  const [windowId, setWindowId] = useState<(typeof WINDOWS)[number]['id']>('w12')
  const [openRival, setOpenRival] = useState<Competitor | null>(null)
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)
  const [lockedSlotId, setLockedSlotId] = useState<string | null>(null)

  const released = state.projects.find((p) => p.release)
  const releasedUnits = released?.release?.units ?? 0
  const releasedScore = released?.release?.score ?? 0

  const filteredRivals = useMemo(
    () => (stance === 'all' ? state.competitors : state.competitors.filter((c) => c.stance === stance)),
    [state.competitors, stance],
  )

  const windowData = useMemo(() => {
    const conf = WINDOWS.find((w) => w.id === windowId) ?? WINDOWS[1]
    const slice = WEEKLY_UNITS.slice(-conf.weeks)
    const total = slice.reduce((s, d) => s + d.units, 0)
    return {
      conf,
      slice,
      points: slice.map((d) => d.units),
      total,
      average: Math.round(total / Math.max(1, slice.length)),
      peak: Math.max(...slice.map((d) => d.units)),
    }
  }, [windowId])

  const tabItems: TabItem[] = [
    { id: 'rivals', label: '竞品情报', latin: 'Rivals', count: state.competitors.length, icon: Swords },
    { id: 'sales', label: '销量与口碑', latin: 'Sales', icon: CircleDollarSign },
    { id: 'slate', label: '发行计划', latin: 'Release', count: SLOTS.length, icon: CalendarRange },
    { id: 'audience', label: '受众画像', latin: 'Audience', icon: Users2 },
  ]

  const positiveRate = 87
  const negativeRate = 100 - positiveRate
  const pressAverage = PRESS.reduce((s, p) => s + p.score, 0) / PRESS.length

  const lockSlot = (slot: Slot) => {
    setLockedSlotId(slot.id)
    toast.push({
      severity: 'good',
      title: `已锁定「${slot.label}」档期`,
      detail: `第 ${slot.week} 周，竞争强度 ${slot.competition}/100，预期首周 ${num(slot.firstWeekUnits)} 份。市场与发行团队已收到排期确认。`,
      action: {
        label: '查看档期详情',
        run: () => setOpenSlot(slot),
      },
    })
  }

  return (
    <>
      <PageHeader
        kicker="市场"
        title="市场"
        latin="MARKET"
        lede="玩家在哪里、对手在做什么、我们的作品什么时候该被放出去。这一页不做决策，只把决策需要看见的东西摊开来。"
        actions={
          <>
            <Btn
              id="mkt-open-slate-shortcut"
              icon={CalendarRange}
              onClick={() => setTab('slate')}
            >
              查看发行档期
            </Btn>
            <Btn
              id="mkt-open-rivals-shortcut"
              variant="signal"
              icon={Swords}
              onClick={() => setTab('rivals')}
            >
              竞品情报
            </Btn>
          </>
        }
      />

      <Marquee items={HEADLINES} />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          id="mkt-stat-fans"
          icon={Users2}
          label="累计粉丝"
          value={num(state.fans)}
          delta={{ dir: 'up', text: '本周 +412' }}
          hint="含 Wishlist 与关注，非实际购买者。"
        />
        <StatTile
          id="mkt-stat-hype"
          icon={Flame}
          label="当前热度"
          value={String(state.hype)}
          unit="/100"
          delta={{ dir: 'up', text: '+3' }}
          hint="热度低于 25 时，首周曝光将明显受限。"
        />
        <StatTile
          id="mkt-stat-reputation"
          icon={Trophy}
          label="行业声望"
          value={String(state.reputation)}
          unit="/100"
          hint="影响发行商谈判额度与人才投递意愿。"
        />
        <StatTile
          id="mkt-stat-rivals"
          icon={Swords}
          label="在追竞品"
          value={String(state.competitors.length)}
          unit="款"
          hint="同品类、同档期或直接借鉴过我们机制的作品。"
        />
        <StatTile
          id="mkt-stat-units"
          icon={BadgeCheck}
          label="已发行累计销量"
          value={num(releasedUnits)}
          unit="份"
          delta={{ dir: 'down', text: '近 4 周放缓' }}
          hint={`《${released?.title ?? '—'}》媒体均分 ${releasedScore}。`}
          tone="ink"
        />
      </div>

      <div className="mt-8">
        <Tabs items={tabItems} active={tab} onChange={setTab} idPrefix="mkt" />
      </div>

      <TabPanel idPrefix="mkt" id="rivals" className="mt-6">
        <section aria-labelledby="mkt-rivals-heading">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id="mkt-rivals-heading" className="font-head text-[1.1rem] font-800">
              竞品筛选
            </h2>
            <div role="group" aria-label="按竞争关系筛选竞品" className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'all' as const, label: '全部', count: state.competitors.length },
                  ...(Object.keys(STANCE_META) as Stance[]).map((s) => ({
                    id: s,
                    label: STANCE_META[s].label,
                    count: state.competitors.filter((c) => c.stance === s).length,
                  })),
                ]
              ).map((opt) => {
                const on = stance === opt.id
                return (
                  <button
                    key={opt.id}
                    id={`mkt-filter-${opt.id}`}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setStance(opt.id)}
                    className={
                      'inline-flex items-center gap-2 border-[3px] border-ink px-3 py-1.5 font-head text-[0.8125rem] font-800 transition-all duration-150 ' +
                      (on
                        ? 'translate-x-[2px] translate-y-[2px] bg-ink text-paper-warm shadow-none'
                        : 'bg-paper-warm shadow-hard-sm hover:bg-signal hover:text-white')
                    }
                  >
                    {opt.label}
                    <span className="tabular font-mono text-[0.625rem] font-700 opacity-70">
                      {opt.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {filteredRivals.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={Swords}
                title="该分类下暂无竞品"
                hint="换一个筛选条件，或等待市场情报更新。"
                action={
                  <Btn id="mkt-filter-reset" variant="signal" onClick={() => setStance('all')}>
                    显示全部竞品
                  </Btn>
                }
              />
            </div>
          ) : (
            <ul className="mt-5 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
              {filteredRivals.map((c) => {
                const meta = STANCE_META[c.stance]
                const intel = INTEL[c.id]
                return (
                  <li key={c.id}>
                    <Panel
                      as="article"
                      cut="tr"
                      className="flex h-full flex-col transition-transform duration-200 ease-snap hover:-translate-y-[3px]"
                    >
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Tag tone={meta.tone}>{meta.label}</Tag>
                            <h3 className="mt-2.5 font-display text-[1.15rem] leading-tight">
                              {c.title}
                            </h3>
                            <p className="mt-1 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                              {c.studio}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="tabular font-display text-[1.6rem] leading-none">
                              {c.score}
                            </p>
                            <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                              媒体均分
                            </p>
                          </div>
                        </div>

                        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t-2 border-ink/12 pt-3">
                          <div className="flex items-baseline gap-1.5">
                            <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
                              品类
                            </dt>
                            <dd className="font-head text-[0.8125rem] font-800">{c.genre}</dd>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
                              销量
                            </dt>
                            <dd className="tabular font-head text-[0.8125rem] font-800">
                              {c.units}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-3">
                          <Meter
                            id={`mkt-threat-${c.id}`}
                            label="威胁度"
                            value={intel?.threat ?? 50}
                            tone={(intel?.threat ?? 50) >= 75 ? 'signal' : 'pulse'}
                            showValue
                            height={10}
                          />
                        </div>

                        <p className="mt-3 line-clamp-3 text-[0.8125rem] leading-relaxed text-ink/65">
                          {c.note}
                        </p>
                      </div>

                      <div className="border-t-[3px] border-ink px-4 py-3">
                        <Btn
                          id={`mkt-competitor-open-${c.id}`}
                          size="sm"
                          variant="ink"
                          icon={Eye}
                          onClick={() => setOpenRival(c)}
                          className="w-full"
                        >
                          查看情报详情
                        </Btn>
                      </div>
                    </Panel>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </TabPanel>

      <TabPanel idPrefix="mkt" id="sales" className="mt-6">
        <section aria-labelledby="mkt-sales-heading">
          <h2 id="mkt-sales-heading" className="sr-only">
            销量与口碑
          </h2>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Panel cut="tr">
              <SectionHead
                icon={TrendingDown}
                title={`《${released?.title ?? '—'}》周销量长尾`}
                latin="Weekly Units · Long Tail"
                right={
                  <div role="group" aria-label="选择统计窗口" className="flex gap-1.5">
                    {WINDOWS.map((w) => {
                      const on = w.id === windowId
                      return (
                        <button
                          key={w.id}
                          id={`mkt-window-${w.id}`}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setWindowId(w.id)}
                          className={
                            'border-2 border-ink px-2 py-1 font-mono text-[0.625rem] font-700 uppercase tracking-[0.12em] transition-colors duration-150 ' +
                            (on
                              ? 'bg-signal text-white'
                              : 'bg-paper-warm text-ink/60 hover:bg-ink hover:text-paper-warm')
                          }
                        >
                          {w.latin}
                        </button>
                      )
                    })}
                  </div>
                }
              />
              <div className="p-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/45">
                      {windowData.conf.label}合计
                    </p>
                    <p className="tabular font-display text-[2.25rem] leading-none">
                      {num(windowData.total)}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 font-head text-[0.8125rem] font-800 text-signal">
                      <TrendingDown size={14} strokeWidth={2.6} aria-hidden="true" />
                      长尾衰减中 · 周均 {num(windowData.average)}
                    </p>
                  </div>
                  <div className="p5-halftone border-[3px] border-ink bg-paper-warm p-2">
                    <Sparkline
                      points={windowData.points}
                      width={300}
                      height={72}
                      label={`${windowData.conf.label}周销量折线，峰值 ${windowData.peak} 份`}
                    />
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[32rem] border-collapse text-left">
                    <caption className="sr-only">周销量明细</caption>
                    <thead>
                      <tr className="border-b-[3px] border-ink">
                        <th scope="col" className="py-2 pr-3 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/55">
                          周次
                        </th>
                        <th scope="col" className="px-3 py-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/55">
                          销量
                        </th>
                        <th scope="col" className="px-3 py-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/55">
                          环比
                        </th>
                        <th scope="col" className="px-3 py-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/55">
                          占窗口比
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {windowData.slice.map((d, i) => {
                        const prev = windowData.slice[i - 1]
                        const delta = prev ? ((d.units - prev.units) / prev.units) * 100 : 0
                        return (
                          <tr key={d.week} className="border-b-2 border-ink/10 hover:bg-paper-dim/50">
                            <td className="tabular py-1.5 pr-3 font-mono text-[0.75rem] font-700">
                              W{d.week}
                            </td>
                            <td className="tabular px-3 py-1.5 font-head text-[0.8125rem] font-800">
                              {num(d.units)}
                            </td>
                            <td
                              className={
                                'tabular px-3 py-1.5 font-mono text-[0.75rem] font-700 ' +
                                (i === 0 ? 'text-ink/40' : 'text-signal')
                              }
                            >
                              {i === 0 ? '基准' : `${pct(delta, 1)}`}
                            </td>
                            <td className="tabular px-3 py-1.5 font-mono text-[0.75rem] text-ink/60">
                              {pct((d.units / windowData.total) * 100, 1)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Panel>

            <div className="flex flex-col gap-4">
              <Panel cut="bl">
                <SectionHead icon={Newspaper} title="媒体评分" latin="Press Review" />
                <div className="p-4">
                  <div className="flex items-baseline gap-3">
                    <p className="tabular font-display text-[2.5rem] leading-none">
                      {pressAverage.toFixed(1)}
                    </p>
                    <div>
                      <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                        六家媒体均值
                      </p>
                      <div className="mt-1 flex gap-1">
                        {PRESS.map((p) => (
                          <span
                            key={p.id}
                            aria-hidden="true"
                            className={
                              'inline-block h-3 w-3 border-2 border-ink ' +
                              (p.score >= 85 ? 'bg-jade' : p.score >= 80 ? 'bg-pulse' : 'bg-signal')
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <ul className="mt-4 list-none space-y-0 p-0">
                    {PRESS.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-start gap-3 border-t-2 border-ink/10 py-2.5 first:border-t-0"
                      >
                        <span className="tabular grid h-9 w-11 shrink-0 place-items-center border-[3px] border-ink bg-paper-warm font-display text-[0.9375rem]">
                          {p.score}
                        </span>
                        <div className="min-w-0">
                          <p className="font-head text-[0.8125rem] font-800">{p.outlet}</p>
                          <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink/65">
                            「{p.quote}」
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Panel>

              <Panel cut="tr">
                <SectionHead icon={MessageSquareQuote} title="玩家评价" latin="Player Reviews" />
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center border-[3px] border-ink bg-jade text-white">
                      <BadgeCheck size={22} strokeWidth={2.4} aria-hidden="true" />
                    </span>
                    <div className="flex-1">
                      <p className="font-head text-[0.9375rem] font-800">
                        好评率 {positiveRate}%
                      </p>
                      <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
                        基于 1,842 条有效评价
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex h-5 overflow-hidden border-[3px] border-ink">
                    <div className="bg-jade" style={{ width: `${positiveRate}%` }} />
                    <div className="bg-signal" style={{ width: `${negativeRate}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[0.625rem] font-700 uppercase tracking-[0.12em]">
                    <span className="text-jade">好评 {positiveRate}%</span>
                    <span className="text-signal">差评 {negativeRate}%</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/45">
                      评分分布
                    </p>
                    {[
                      { star: 5, value: 58 },
                      { star: 4, value: 21 },
                      { star: 3, value: 8 },
                      { star: 2, value: 6 },
                      { star: 1, value: 7 },
                    ].map((row) => (
                      <div key={row.star} className="flex items-center gap-3">
                        <span className="tabular w-10 shrink-0 font-mono text-[0.6875rem] font-700">
                          {row.star} 星
                        </span>
                        <div className="flex-1">
                          <Meter
                            id={`mkt-stars-${row.star}`}
                            value={row.value}
                            tone={row.star >= 4 ? 'jade' : row.star === 3 ? 'pulse' : 'signal'}
                            height={9}
                          />
                        </div>
                        <span className="tabular w-10 shrink-0 text-right font-mono text-[0.6875rem] font-700 text-ink/60">
                          {pct(row.value)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <ul className="mt-4 list-none space-y-3 p-0">
                    {REVIEWS.map((r) => (
                      <li key={r.id} className="border-[3px] border-ink bg-paper p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-head text-[0.8125rem] font-800">{r.author}</p>
                          <span className="flex items-center gap-1" aria-label={`${r.rating} 星评价`}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={`${r.id}-${i}`}
                                size={12}
                                strokeWidth={2.4}
                                aria-hidden="true"
                                className={i < r.rating ? 'fill-pulse text-pulse' : 'text-ink/25'}
                              />
                            ))}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
                          {r.platform} · {r.hours} 小时 · 有用 {r.helpful}
                        </p>
                        <p className="mt-1.5 font-head text-[0.8125rem] font-800">{r.title}</p>
                        <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink/65">
                          {r.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </Panel>
            </div>
          </div>
        </section>
      </TabPanel>

      <TabPanel idPrefix="mkt" id="slate" className="mt-6">
        <section aria-labelledby="mkt-slate-heading">
          <h2 id="mkt-slate-heading" className="sr-only">
            发行计划
          </h2>

          <Panel cut="tr">
            <SectionHead
              icon={CalendarRange}
              title="档期竞争强度时间轴"
              latin="Release Window Timeline"
              right={
                <Tag tone={lockedSlotId ? 'jade' : 'pulse'}>
                  {lockedSlotId ? '已锁定档期' : '尚未锁定'}
                </Tag>
              }
            />
            <div className="p-4">
              <p className="mb-4 flex flex-wrap items-center gap-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/50">
                <span>当前 {weekLabel(state.week)}</span>
                <span aria-hidden="true" className="inline-block h-3 w-[2px] bg-ink/25" />
                <span>窗口 W{TIMELINE_START} – W{TIMELINE_END}</span>
                <span aria-hidden="true" className="inline-block h-3 w-[2px] bg-ink/25" />
                <span>横向滚动可查看全部 24 周</span>
              </p>

              <div className="overflow-x-auto px-4 pb-2">
                <div className="relative h-[15rem] min-w-[46rem]">
                  <div
                    aria-hidden="true"
                    className="absolute left-0 right-0 top-[11.5rem] h-[3px] bg-ink/20"
                  />

                  {TIMELINE_WEEKS.map((w) => (
                    <div key={w} className="absolute top-[11.1rem]" style={{ left: `${timelinePos(w)}%` }}>
                      <span
                        aria-hidden="true"
                        className="block h-[11px] w-[2px] -translate-x-1/2 bg-ink/25"
                      />
                      <span className="tabular mt-1 block -translate-x-1/2 font-mono text-[0.5625rem] font-700 text-ink/45">
                        {w}
                      </span>
                    </div>
                  ))}

                  <div
                    className="absolute top-0 h-[11.5rem] w-[3px] bg-signal"
                    style={{ left: `${timelinePos(state.week)}%` }}
                  >
                    <span className="p5-skew absolute left-1 top-0 block whitespace-nowrap bg-signal px-1.5 py-0.5">
                      <span className="p5-unskew block font-mono text-[0.5625rem] font-700 uppercase tracking-[0.12em] text-white">
                        当前 W{state.week}
                      </span>
                    </span>
                  </div>

                  {SLOTS.map((s) => {
                    const locked = lockedSlotId === s.id
                    return (
                      <div
                        key={s.id}
                        className="absolute top-0 flex h-[11.5rem] w-[10.5rem] -translate-x-1/2 flex-col items-center"
                        style={{ left: `${timelinePos(s.week)}%` }}
                      >
                        <button
                          id={`mkt-timeline-slot-${s.id}`}
                          type="button"
                          onClick={() => setOpenSlot(s)}
                          className={
                            'w-full border-[3px] border-ink p-2 text-left transition-all duration-150 hover:-translate-y-[3px] ' +
                            (s.recommended
                              ? 'bg-ink text-paper-warm shadow-hard-red'
                              : locked
                                ? 'bg-jade text-white shadow-hard-sm'
                                : 'bg-paper-warm shadow-hard-sm')
                          }
                        >
                          <span className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] opacity-70">
                              W{s.week}
                            </span>
                            {s.recommended && (
                              <span className="border border-current px-1 font-mono text-[0.5rem] font-700 uppercase tracking-[0.1em]">
                                推荐
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block font-head text-[0.8125rem] font-800 leading-tight">
                            {s.label}
                          </span>
                          <span className="mt-1 block font-mono text-[0.5625rem] font-700 opacity-70">
                            竞争 {s.competition}
                          </span>
                        </button>
                        <span
                          aria-hidden="true"
                          className={
                            'mx-auto w-[3px] flex-1 ' + (s.recommended ? 'bg-signal' : 'bg-ink/30')
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-ink/12 pt-3">
                <span className="flex items-center gap-1.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/50">
                  <span aria-hidden="true" className="inline-block h-3 w-3 border-2 border-ink bg-signal" />
                  当前周
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/50">
                  <span aria-hidden="true" className="inline-block h-3 w-3 border-2 border-ink bg-ink" />
                  推荐档期
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/50">
                  <span aria-hidden="true" className="inline-block h-3 w-3 border-2 border-ink bg-jade" />
                  已锁定
                </span>
              </div>
            </div>
          </Panel>

          <Panel cut="bl" className="mt-4">
            <SectionHead icon={CalendarCheck} title="候选档期对比" latin="Window Comparison" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-left">
                <caption className="sr-only">四个候选发行档期的对比</caption>
                <thead>
                  <tr className="border-b-[3px] border-ink bg-paper-dim/70">
                    <th scope="col" className="px-4 py-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/60">
                      档期
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/60">
                      周次
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/60">
                      竞争强度
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/60">
                      主要对手
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/60">
                      预期首周
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/60">
                      风险
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/60">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SLOTS.map((s) => {
                    const locked = lockedSlotId === s.id
                    return (
                      <tr
                        key={s.id}
                        className={
                          'border-b-2 border-ink/10 transition-colors duration-150 ' +
                          (s.recommended ? 'bg-signal/8' : 'hover:bg-paper-dim/50')
                        }
                      >
                        <td className="px-4 py-3">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-head text-[0.875rem] font-800">{s.label}</span>
                            {s.recommended && <Tag tone="signal">推荐</Tag>}
                            {locked && <Tag tone="jade">已锁定</Tag>}
                          </span>
                        </td>
                        <td className="tabular px-4 py-3 font-mono text-[0.75rem] font-700">
                          W{s.week}
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-36">
                            <Meter
                              id={`mkt-slot-comp-${s.id}`}
                              label={`竞争强度 ${s.competition}`}
                              value={s.competition}
                              tone={s.competition >= 80 ? 'signal' : s.competition >= 60 ? 'pulse' : 'jade'}
                              showValue
                              height={10}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[0.8125rem] text-ink/70">{s.rival}</td>
                        <td className="tabular px-4 py-3 font-head text-[0.875rem] font-800">
                          {num(s.firstWeekUnits)}
                        </td>
                        <td className="px-4 py-3">
                          <Tag tone={s.risk === '高' ? 'signal' : s.risk === '中' ? 'pulse' : 'jade'}>
                            {s.risk}
                          </Tag>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex flex-wrap justify-end gap-2">
                            <Btn
                              id={`mkt-slot-detail-${s.id}`}
                              size="sm"
                              icon={Eye}
                              onClick={() => setOpenSlot(s)}
                            >
                              详情
                            </Btn>
                            <Btn
                              id={`mkt-slot-lock-${s.id}`}
                              size="sm"
                              variant={locked ? 'ghost' : 'signal'}
                              icon={locked ? BadgeCheck : Lock}
                              disabled={locked}
                              onClick={() => lockSlot(s)}
                            >
                              {locked ? '已锁定' : '锁定档期'}
                            </Btn>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t-[3px] border-ink bg-paper-dim/60 p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center border-[3px] border-ink bg-signal text-white">
                  <Sparkle size={17} strokeWidth={2.4} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-head text-[0.9375rem] font-800">系统建议：选择「暑期尾段」第 40 周</p>
                  <p className="mt-1 max-w-[70ch] text-[0.8125rem] leading-relaxed text-ink/65">
                    该档期竞争强度为全年最低的 41，主要对手缺位；同时与 α 封版（第 34 周）之间留有六周缓冲，
                    足以处理遗留缺陷而不必压缩测试周期。若进一步延后到年末档，销量窗口虽稳，
                    但会被年度榜单讨论淹没，且现金储备将跌破安全线。
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        </section>
      </TabPanel>

      <TabPanel idPrefix="mkt" id="audience" className="mt-6">
        <section aria-labelledby="mkt-audience-heading">
          <h2 id="mkt-audience-heading" className="sr-only">
            受众画像
          </h2>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel cut="tr">
              <SectionHead icon={Gauge} title="平台分布" latin="Platform Split" />
              <div className="p-4">
                <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                  基于 {num(state.fans)} 名关注者
                </p>
                <div className="mt-4 space-y-4">
                  {PLATFORM_SPLIT.map((row) => (
                    <div key={row.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-head text-[0.875rem] font-800">{row.label}</span>
                        <span className="tabular font-display text-[1.125rem]">
                          {pct(row.value)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <Meter
                          id={`mkt-${row.id}`}
                          value={row.value}
                          tone={row.tone}
                          height={14}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 border-l-[3px] border-signal pl-3 text-[0.8125rem] leading-relaxed text-ink/65">
                  主机占比低于同类作品均值（通常为 34%）。若要争取主机平台的推荐位，需要在手柄适配与性能上做额外投入。
                </p>
              </div>
            </Panel>

            <Panel cut="bl" className="lg:col-span-2">
              <SectionHead icon={Users2} title="玩家原型分布" latin="Player Archetypes" />
              <div className="p-4">
                <ul className="list-none space-y-4 p-0">
                  {ARCHETYPES.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-4">
                      <div className="min-w-[7rem] flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-head text-[0.9375rem] font-800">{a.label}</span>
                          <span className="tabular font-display text-[1.25rem] leading-none">
                            {pct(a.value)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[0.8125rem] text-ink/60">{a.note}</p>
                      </div>
                      <div className="w-full sm:w-[16rem]">
                        <Meter id={`mkt-${a.id}`} value={a.value} tone={a.tone} height={16} />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 flex items-start gap-2 border-t-2 border-ink/12 pt-4 text-[0.8125rem] leading-relaxed text-ink/65">
                  <HeartHandshake size={16} strokeWidth={2.4} aria-hidden="true" className="mt-0.5 shrink-0 text-signal" />
                  叙事驱动型与氛围沉浸型合计 61%，与《雨巷食堂》「分支重玩 + 雨天氛围」的定位一致。宣传素材应优先服务这两类人，而不是系统钻研型。
                </p>
              </div>
            </Panel>

            <Panel cut="tr" className="lg:col-span-3">
              <SectionHead
                icon={Flame}
                title="玩家评论关键词"
                latin="Review Keyword Cloud"
                right={<Tag tone="ink">{KEYWORDS.length} 个高频词</Tag>}
              />
              <div className="p-4">
                <ul className="flex list-none flex-wrap gap-2 p-0">
                  {KEYWORDS.map((k, i) => {
                    const hot = k.count >= 250
                    const warm = k.count >= 150 && k.count < 250
                    return (
                      <li key={k.word}>
                        <span
                          className={
                            'inline-flex items-center gap-2 border-[3px] border-ink px-2.5 py-1.5 transition-transform duration-150 hover:-translate-y-[2px] ' +
                            (hot
                              ? 'bg-signal text-white'
                              : warm
                                ? 'bg-pulse text-ink'
                                : 'bg-paper-warm text-ink')
                          }
                          style={{ fontSize: `${0.75 + Math.min(0.5, k.count / 900)}rem` }}
                        >
                          <span className="font-head font-800">{k.word}</span>
                          <span className="tabular font-mono text-[0.625rem] font-700 opacity-65">
                            {k.count}
                          </span>
                          {i === 0 && (
                            <ArrowUpRight size={13} strokeWidth={2.8} aria-hidden="true" />
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink/65">
                  正面词（雨天氛围、配器系统、原声带）与负面词（节奏偏慢、说明文档、性能优化）
                  目前大致为三比一。其中「说明文档」是唯一可以靠文档而非改代码解决的高频抱怨，
                  建议列为下一个补丁的优先项。
                </p>
              </div>
            </Panel>
          </div>
        </section>
      </TabPanel>

      <Modal
        open={openRival !== null}
        onClose={() => setOpenRival(null)}
        title={openRival ? `${openRival.title}` : '竞品详情'}
        latin={openRival ? openRival.studio : undefined}
        kicker={openRival ? `${STANCE_META[openRival.stance].latin} INTELLIGENCE` : undefined}
        size="lg"
        footer={
          <>
            <Btn id="mkt-rival-close" onClick={() => setOpenRival(null)}>
              关闭
            </Btn>
            <Btn
              id="mkt-rival-plan"
              variant="signal"
              icon={Shield}
              onClick={() => {
                toast.push({
                  severity: 'info',
                  title: `已将《${openRival?.title ?? ''}》加入跟踪清单`,
                  detail: '之后每次该竞品有公开动向，都会出现在事件日志中。',
                })
                setOpenRival(null)
              }}
            >
              加入跟踪清单
            </Btn>
          </>
        }
      >
        {openRival && (
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Tag tone={STANCE_META[openRival.stance].tone}>
                {STANCE_META[openRival.stance].label}
              </Tag>
              <Tag tone="paper">{openRival.genre}</Tag>
              <Tag tone="paper">销量 {openRival.units}</Tag>
              <Tag tone="ink">媒体均分 {openRival.score}</Tag>
            </div>

            <div className="mt-4">
              <Slab tone="ink">威胁评估</Slab>
              <div className="mt-2.5">
                <Meter
                  id="mkt-rival-threat-modal"
                  label="威胁度"
                  value={clamp(INTEL[openRival.id]?.threat ?? 50)}
                  tone={(INTEL[openRival.id]?.threat ?? 50) >= 75 ? 'signal' : 'pulse'}
                  showValue
                  height={14}
                />
              </div>
            </div>

            <p className="mt-5 border-l-[3px] border-signal pl-3 text-[0.875rem] leading-relaxed text-ink/75">
              {openRival.note}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <section className="border-[3px] border-ink bg-paper-warm">
                <header className="flex items-center gap-2 border-b-[3px] border-ink bg-ink px-3 py-2 text-paper-warm">
                  <Swords size={15} strokeWidth={2.6} aria-hidden="true" />
                  <h3 className="font-head text-[0.875rem] font-800">优势</h3>
                </header>
                <ul className="list-none space-y-2 p-3">
                  {(INTEL[openRival.id]?.strengths ?? []).map((s) => (
                    <li key={s} className="flex gap-2 text-[0.8125rem] leading-relaxed">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 border-2 border-ink bg-signal"
                      />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="border-[3px] border-ink bg-paper-warm">
                <header className="flex items-center gap-2 border-b-[3px] border-ink bg-paper-dim px-3 py-2">
                  <TrendingDown size={15} strokeWidth={2.6} aria-hidden="true" />
                  <h3 className="font-head text-[0.875rem] font-800 text-ink">劣势</h3>
                </header>
                <ul className="list-none space-y-2 p-3">
                  {(INTEL[openRival.id]?.weaknesses ?? []).map((w) => (
                    <li key={w} className="flex gap-2 text-[0.8125rem] leading-relaxed">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 border-2 border-ink bg-jade"
                      />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="p5-noise mt-5 border-[3px] border-ink bg-signal/10 p-4">
              <div className="flex items-center gap-2">
                <SeverityMark severity="warn" withLabel />
                <h3 className="font-head text-[0.9375rem] font-800">应对建议</h3>
              </div>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-ink/80">
                {INTEL[openRival.id]?.counter ?? '暂无对策记录。'}
              </p>
            </section>
          </div>
        )}
      </Modal>

      <Modal
        open={openSlot !== null}
        onClose={() => setOpenSlot(null)}
        title={openSlot ? `${openSlot.label} · 第 ${openSlot.week} 周` : '档期详情'}
        latin="Release Window"
        kicker="SLATE PLANNING"
        size="md"
        footer={
          <>
            <Btn id="mkt-slot-close" onClick={() => setOpenSlot(null)}>
              关闭
            </Btn>
            <Btn
              id="mkt-slot-confirm"
              variant="signal"
              icon={CalendarCheck}
              disabled={openSlot !== null && lockedSlotId === openSlot.id}
              onClick={() => {
                if (openSlot) lockSlot(openSlot)
              }}
            >
              {openSlot && lockedSlotId === openSlot.id ? '该档期已锁定' : '锁定此档期'}
            </Btn>
          </>
        }
      >
        {openSlot && (
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Tag tone={openSlot.risk === '高' ? 'signal' : openSlot.risk === '中' ? 'pulse' : 'jade'}>
                风险 {openSlot.risk}
              </Tag>
              <Tag tone="paper">主要对手：{openSlot.rival}</Tag>
              {openSlot.recommended && <Tag tone="signal">系统推荐</Tag>}
              {lockedSlotId === openSlot.id && <Tag tone="jade">已锁定</Tag>}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="border-[3px] border-ink bg-paper-warm p-3">
                <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                  周次
                </dt>
                <dd className="tabular mt-0.5 font-display text-[1.5rem] leading-none">
                  W{openSlot.week}
                </dd>
              </div>
              <div className="border-[3px] border-ink bg-paper-warm p-3">
                <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                  竞争强度
                </dt>
                <dd className="tabular mt-0.5 font-display text-[1.5rem] leading-none">
                  {openSlot.competition}
                </dd>
              </div>
              <div className="border-[3px] border-ink bg-paper-warm p-3">
                <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                  预期首周
                </dt>
                <dd className="tabular mt-0.5 font-display text-[1.5rem] leading-none">
                  {num(openSlot.firstWeekUnits)}
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <Meter
                id="mkt-slot-modal-comp"
                label="竞争强度"
                value={openSlot.competition}
                tone={openSlot.competition >= 80 ? 'signal' : openSlot.competition >= 60 ? 'pulse' : 'jade'}
                showValue
                height={14}
              />
            </div>

            <p className="mt-5 border-l-[3px] border-signal pl-3 text-[0.875rem] leading-relaxed text-ink/75">
              {openSlot.note}
            </p>

            <div className="mt-5 border-t-2 border-ink/12 pt-4">
              <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/45">
                与当前进度的关系
              </p>
              <ul className="mt-2 list-none space-y-1.5 p-0 text-[0.8125rem] text-ink/70">
                <li className="flex justify-between gap-3">
                  <span>当前周次</span>
                  <span className="tabular font-head font-800">W{state.week}</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>距离该档期</span>
                  <span className="tabular font-head font-800">
                    {Math.max(0, openSlot.week - state.week)} 周
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>《雨巷食堂》α 封版</span>
                  <span className="tabular font-head font-800">W34</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>封版后可用缓冲</span>
                  <span className="tabular font-head font-800">
                    {Math.max(0, openSlot.week - 34)} 周
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
