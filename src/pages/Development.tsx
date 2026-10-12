import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  Activity,
  BadgeCheck,
  Boxes,
  Bug,
  CalendarClock,
  Cpu,
  Gauge,
  ListChecks,
  Package,
  Rocket,
  Search,
  TriangleAlert,
  UserPlus,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { useGame } from '../lib/store'
import { useToast } from '../lib/toast'
import { STAGE_META } from '../data/seed'
import type { Project, ProjectStage, Severity } from '../data/types'
import { dueLabel, pct } from '../lib/format'
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
  Sparkline,
  StatTile,
  TabPanel,
  Tabs,
  Tag,
} from '../lib/ui'
import { SeverityMark } from '../components/SeverityMark'

/* --------------------------------------------------------------- 本地常量 */

const STAGE_ORDER: ProjectStage[] = [
  'concept',
  'prototype',
  'alpha',
  'beta',
  'gold',
  'released',
]

type BugStatus = 'open' | 'triaging' | 'fixed' | 'verified'

const BUG_STATUS_META: Record<BugStatus, { label: string; tone: 'paper' | 'signal' | 'pulse' | 'jade' }> = {
  open: { label: '待处理', tone: 'signal' },
  triaging: { label: '定位中', tone: 'pulse' },
  fixed: { label: '已修复', tone: 'paper' },
  verified: { label: '已验证', tone: 'jade' },
}

interface BugRow {
  id: string
  code: string
  title: string
  severity: Exclude<Severity, 'good'>
  /** 复现率 0–100 */
  repro: number
  ownerId: string
  ownerFallback: string
  status: BugStatus
  project: string
  steps: string[]
  expected: string
  actual: string
  commit: string
  env: string
}

const BUGS: BugRow[] = [
  {
    id: 'bug-2317',
    code: 'BUG-2317',
    title: '雨夜第七位顾客在选项界面卡死',
    severity: 'danger',
    repro: 92,
    ownerId: 's-qi',
    ownerFallback: '祁野',
    status: 'open',
    project: '雨巷食堂',
    steps: [
      '读取存档 Y2W26-3，进入第二章第 3 个雨夜',
      '连续选择两次「沉默」类选项，使分支指针落到 silent_04',
      '在第三次选项节点出现前打开「历史记录」抽屉',
      '关闭抽屉，回到正文视图',
    ],
    expected: '选项列表刷新为当前节点的三个选项，并可继续交互。',
    actual: '选项列表保留上一节点的文本与事件监听，点击任意项无响应；控制台无报错。',
    commit: 'a91f3c2 —— 历史记录抽屉改为 portal 渲染',
    env: 'Chrome 141 / Windows 11 / 16GB / 存档 Y2W26-3',
  },
  {
    id: 'bug-2308',
    code: 'BUG-2308',
    title: '世界书关键词在热重载后整批丢失',
    severity: 'warn',
    repro: 61,
    ownerId: 's-wei',
    ownerFallback: '卫子谦',
    status: 'fixed',
    project: '雨巷食堂',
    steps: [
      '激活《雨巷街景·器物》，确认 214 条词条已载入',
      '修改任一 TypeScript 文件，等待热重载完成',
      '重新打开世界书面板',
    ],
    expected: '词条与激活状态在热重载后保持。',
    actual: 'IndexedDB 事务在重载瞬间被中止，词条表回退到上一次快照（丢失约 40 分钟内的编辑）。',
    commit: '4c77e10 —— 为词条写入增加事务重试',
    env: 'Vite 5.4 / Node 24 / Windows 11',
  },
  {
    id: 'bug-2296',
    code: 'BUG-2296',
    title: '数值面板在四位以上货币时溢出工位',
    severity: 'info',
    repro: 100,
    ownerId: 's-luo',
    ownerFallback: '罗晚',
    status: 'open',
    project: '雨巷食堂',
    steps: ['进入游戏变量面板', '将「营业额」手动编辑为 12840', '缩小窗口至 375px 宽'],
    expected: '数字使用等宽字体并自动收窄，不破坏网格。',
    actual: '数字撑破右侧边框，导致「确认」按钮被推出可视区。',
    commit: '—（尚未定位到引入提交）',
    env: 'Chrome 141 / 375×812 / 100% 缩放',
  },
  {
    id: 'bug-2284',
    code: 'BUG-2284',
    title: '存档回溯后变量快照与楼层状态不一致',
    severity: 'danger',
    repro: 44,
    ownerId: 's-qi',
    ownerFallback: '祁野',
    status: 'triaging',
    project: '雨巷食堂',
    steps: [
      '在第 26 周于程序间分配两名人员并升级设备',
      '回溯到第 22 周的任意楼层',
      '检查变量快照中的 equipment_tier',
    ],
    expected: '快照应反映第 22 周当时的设备等级。',
    actual: '快照写入了回溯前的设备等级，导致后续增量结算偏高。',
    commit: 'f0d5b81 —— 快照序列化改为浅拷贝',
    env: 'Chrome 141 / Windows 11 / 存档 Y2W26-1',
  },
  {
    id: 'bug-2271',
    code: 'BUG-2271',
    title: '日文假名在窄屏下断行位置错误',
    severity: 'info',
    repro: 78,
    ownerId: 's-bai',
    ownerFallback: '白町',
    status: 'open',
    project: '机工协奏曲',
    steps: ['将语言切换为日语', '打开任意长段落剧情', '把窗口宽度缩到 320px'],
    expected: '按禁则处理规则避让行首标点。',
    actual: '小假名与长音符被拆到行首，且「」编号出现孤行。',
    commit: '—（本地化分支待合并）',
    env: 'Edge 141 / 320×640 / 日语界面',
  },
  {
    id: 'bug-2259',
    code: 'BUG-2259',
    title: '场景切换时音频总线出现约 120ms 静音',
    severity: 'warn',
    repro: 33,
    ownerId: 's-tan',
    ownerFallback: '谭旭',
    status: 'verified',
    project: '机工协奏曲',
    steps: ['进入主界面并等待环境音铺底', '从主界面切入任意章节', '用监听耳机记录切换瞬间'],
    expected: '环境音交叉淡化，无可感知中断。',
    actual: '总线在场景卸载时被整体挂起，产生约 120ms 空白。',
    commit: '9b2a447 —— 总线改为淡出后再卸载',
    env: 'Chrome 141 / 监听耳机 / 48kHz',
  },
  {
    id: 'bug-2243',
    code: 'BUG-2243',
    title: '连点「跳过」时手柄震动效果叠加',
    severity: 'info',
    repro: 55,
    ownerId: 's-an',
    ownerFallback: '安折',
    status: 'fixed',
    project: '机工协奏曲',
    steps: ['接入手柄并进入对话', '以约 8 次/秒 的频率连点跳过', '在第 6 次之后手持感受'],
    expected: '同一时刻只保留一条震动曲线。',
    actual: '多条曲线同时写入，振幅累积到不可用的程度。',
    commit: '5e18c90 —— 震动请求改为可抢占单例',
    env: 'DualSense / Chrome 141 / Windows 11',
  },
  {
    id: 'bug-2231',
    code: 'BUG-2231',
    title: '主机端构建产物缺少应用图标',
    severity: 'danger',
    repro: 100,
    ownerId: 's-wei',
    ownerFallback: '卫子谦',
    status: 'open',
    project: '机工协奏曲',
    steps: ['执行打包脚本 host:build', '将产物导入主机开发机', '查看系统菜单中的应用条目'],
    expected: '显示《机工协奏曲》正式图标。',
    actual: '显示系统默认占位图标，且尺寸清单缺少 512×512 一档。',
    commit: 'c31d0aa —— 图标清单改为动态生成',
    env: '主机开发机 / 打包脚本 v17',
  },
  {
    id: 'bug-2218',
    code: 'BUG-2218',
    title: '章节树在大纲模式下折叠状态不回写',
    severity: 'info',
    repro: 27,
    ownerId: 's-mu',
    ownerFallback: '穆禾',
    status: 'triaging',
    project: '雨巷食堂',
    steps: ['打开剧情工坊的章节树', '将第三章切换到「大纲」视图', '折叠两个二级节点后刷新页面'],
    expected: '折叠状态随草稿一并保存。',
    actual: '刷新后全部展开，需重新折叠。',
    commit: '—（低优先级，待排期）',
    env: 'Chrome 141 / Windows 11',
  },
]

interface Capability {
  id: string
  name: string
  latin: string
  /** 1–5 */
  level: number
  note: string
}

const CAPABILITIES: Capability[] = [
  {
    id: 'render',
    name: '渲染管线',
    latin: 'RENDER',
    level: 4,
    note: '自研延迟渲染在 PC 端稳定；主机端仍有偶发显存抖动待收口。',
  },
  {
    id: 'net',
    name: '网络同步',
    latin: 'NETCODE',
    level: 2,
    note: '目前只服务于云存档与排行榜，实时多人尚未做过压力验证。',
  },
  {
    id: 'audio',
    name: '音频系统',
    latin: 'AUDIO',
    level: 5,
    note: '总线、混音与动态范围工具完备，是工作室最不需要担心的一环。',
  },
  {
    id: 'tool',
    name: '工具链',
    latin: 'TOOLING',
    level: 4,
    note: '构建已压到 40 秒、热重载稳定；策划表纳入版本管理仍在推进。',
  },
  {
    id: 'l10n',
    name: '本地化',
    latin: 'L10N',
    level: 3,
    note: '中日英三语管线可用，CJK 字体回退与断行规则尚未完全覆盖。',
  },
  {
    id: 'ai',
    name: 'AI 辅助',
    latin: 'AI-ASSIST',
    level: 3,
    note: '剧情一致性复核已接入流水线；数值配表生成仍需人工把关。',
  },
]

interface BuildRecord {
  id: string
  label: string
  duration: string
  size: string
  result: 'success' | 'unstable' | 'failed'
  note: string
}

const BUILDS: BuildRecord[] = [
  {
    id: 'BUILD-2187',
    label: '雨巷食堂 · α 候选 3',
    duration: '3 分 12 秒',
    size: '4.7 GB',
    result: 'success',
    note: '冒烟测试 182/190 通过，8 项失败均已关联缺陷',
  },
  {
    id: 'BUILD-2183',
    label: '机工协奏曲 · 主机补丁 17',
    duration: '5 分 48 秒',
    size: '6.1 GB',
    result: 'unstable',
    note: '图标清单缺失导致打包告警，见 BUG-2231',
  },
  {
    id: 'BUILD-2179',
    label: '雨巷食堂 · 剧情分支校验',
    duration: '1 分 04 秒',
    size: '212 MB',
    result: 'success',
    note: '校验 1,842 个分支节点，发现 3 处死路',
  },
  {
    id: 'BUILD-2174',
    label: '雨巷食堂 · α 候选 2',
    duration: '3 分 26 秒',
    size: '4.6 GB',
    result: 'failed',
    note: '音频资产导入阶段内存溢出，已回滚',
  },
  {
    id: 'BUILD-2169',
    label: '二十四节气 · 原型快照',
    duration: '2 分 41 秒',
    size: '980 MB',
    result: 'success',
    note: '仅用于内部评审，未接入正式资源库',
  },
]

const BUILD_DURATIONS = [212, 198, 205, 186, 171, 164, 152, 148]

/* --------------------------------------------------------------- 辅助函数 */

function stageIndex(stage: ProjectStage): number {
  return STAGE_ORDER.indexOf(stage)
}

function nextStage(stage: ProjectStage): ProjectStage {
  return STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, stageIndex(stage) + 1)]
}

function leaderName(project: Project, lookup: (id: string) => string | undefined): string {
  return lookup(project.leadId) ?? '未指派'
}

/* --------------------------------------------------------------- 主组件 */

export default function Development() {
  const { state, dispatch, derived } = useGame()
  const toast = useToast()

  const [tab, setTab] = useState('board')
  const [bugSeverity, setBugSeverity] = useState<Exclude<Severity, 'good'> | 'all'>('all')
  const [bugQuery, setBugQuery] = useState('')
  const [openBug, setOpenBug] = useState<BugRow | null>(null)
  const [dispatchTarget, setDispatchTarget] = useState<{
    projectId: string
    project: string
    milestoneId: string
    milestone: string
    owner: string
  } | null>(null)

  const staffById = useMemo(() => {
    const map = new Map<string, string>()
    state.staff.forEach((s) => map.set(s.id, s.name))
    return map
  }, [state.staff])

  const findName = (id: string) => staffById.get(id)

  const activeProjects = useMemo(
    () => state.projects.filter((p) => p.stage !== 'released'),
    [state.projects],
  )

  const milestones = useMemo(
    () =>
      activeProjects.flatMap((p) =>
        p.milestones.map((m) => ({
          ...m,
          project: p.title,
          projectId: p.id,
          ownerName: staffById.get(p.leadId) ?? '未指派',
        })),
      ),
    [activeProjects, staffById],
  )

  const milestoneRate = useMemo(() => {
    if (milestones.length === 0) return 0
    return milestones.reduce((s, m) => s + m.progress, 0) / milestones.length
  }, [milestones])

  const techDebtWeeks = useMemo(
    () => CAPABILITIES.reduce((s, c) => s + (5 - c.level) * 2, 0),
    [],
  )

  const openBugs = BUGS.filter((b) => b.status === 'open').length

  const filteredBugs = useMemo(() => {
    const q = bugQuery.trim().toLowerCase()
    return BUGS.filter((b) => {
      const sevOk = bugSeverity === 'all' || b.severity === bugSeverity
      const qOk =
        q === '' ||
        b.code.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        (staffById.get(b.ownerId) ?? b.ownerFallback).toLowerCase().includes(q)
      return sevOk && qOk
    })
  }, [bugSeverity, bugQuery, staffById])

  function promote(project: Project) {
    const from = project.stage
    const to = nextStage(from)
    if (to === from) return
    dispatch({ type: 'promoteProject', projectId: project.id })
    dispatch({
      type: 'log',
      severity: 'info',
      title: `《${project.title}》进入「${STAGE_META[to].label}」阶段`,
      detail: `由 ${STAGE_META[from].label} 推进至 ${STAGE_META[to].label}（${STAGE_META[to].blurb}）。主导人 ${leaderName(project, findName)}。`,
    })
    toast.push({
      severity: 'good',
      title: `《${project.title}》推进至「${STAGE_META[to].label}」`,
      detail: `${STAGE_META[to].blurb}。整体进度 +8%，请同步复核里程碑排期。`,
      action: {
        label: '查看里程碑',
        run: () => setTab('milestones'),
      },
    })
  }

  function confirmDispatch() {
    if (!dispatchTarget) return
    dispatch({
      type: 'log',
      severity: 'info',
      title: `里程碑「${dispatchTarget.milestone}」已改派`,
      detail: `《${dispatchTarget.project}》将该里程碑交由 ${dispatchTarget.owner} 负责，原负责人已完成交接说明。`,
    })
    toast.push({
      severity: 'good',
      title: '派单已下发',
      detail: `「${dispatchTarget.milestone}」现由 ${dispatchTarget.owner} 负责，事件日志已留痕。`,
    })
    setDispatchTarget(null)
  }

  function investIn(cap: Capability) {
    toast.push({
      severity: cap.level >= 4 ? 'info' : 'good',
      title: `已向「${cap.name}」追加研发投入`,
      detail:
        cap.level >= 4
          ? `当前等级 ${cap.level}/5，继续投入的边际收益开始下降。${cap.note}`
          : `预计 2 周内可提升一级（当前 ${cap.level}/5）。${cap.note}`,
      action: {
        label: '记录到日志',
        run: () =>
          dispatch({
            type: 'log',
            severity: 'info',
            title: `研发投入：${cap.name}`,
            detail: `等级 ${cap.level}/5。${cap.note}`,
          }),
      },
    })
  }

  const tabItems = [
    { id: 'board', label: '阶段看板', latin: 'Board', icon: Boxes, count: activeProjects.length },
    { id: 'milestones', label: '里程碑', latin: 'Milestones', icon: ListChecks, count: milestones.length },
    { id: 'bugs', label: '缺陷追踪', latin: 'Defects', icon: Bug, count: openBugs },
    { id: 'stack', label: '技术栈', latin: 'Stack', icon: Cpu, count: CAPABILITIES.length },
  ]

  return (
    <>
      <PageHeader
        kicker="研发"
        title="研发管线"
        latin="PIPELINE"
        lede="六个阶段、一条流水线。任何一次阶段推进都不是庆祝，而是把风险从「不知道」挪到「已知」。"
        actions={
          <>
            <Btn
              id="dev-action-open-bugs"
              icon={TriangleAlert}
              onClick={() => {
                setTab('bugs')
                setBugSeverity('all')
                setBugQuery('')
                toast.push({
                  severity: 'warn',
                  title: `当前有 ${openBugs} 项未关闭缺陷`,
                  detail: '其中高危缺陷会直接影响 α 封版日期，建议优先处理。',
                })
              }}
            >
              未关闭缺陷 {openBugs}
            </Btn>
            <Btn
              id="dev-action-report"
              variant="signal"
              icon={Zap}
              onClick={() =>
                toast.push({
                  severity: 'info',
                  title: '已生成本周研发简报',
                  detail: `在研 ${activeProjects.length} 个项目、${milestones.length} 项里程碑，平均达成 ${pct(milestoneRate, 0)}。`,
                })
              }
            >
              生成本周简报
            </Btn>
          </>
        }
      />

      <section aria-label="研发关键指标" className="mb-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile
            id="dev-stat-active-projects"
            icon={Boxes}
            label="在研项目"
            value={String(activeProjects.length)}
            unit="个"
            hint={`另有 ${state.projects.length - activeProjects.length} 个已发行作品持续产生分成`}
          />
          <StatTile
            id="dev-stat-milestone-rate"
            icon={ListChecks}
            label="里程碑完成率"
            value={pct(milestoneRate, 0)}
            tone="signal"
            hint={`共 ${milestones.length} 项里程碑，${milestones.filter((m) => m.dueWeek < state.week).length} 项已逾期`}
          />
          <StatTile
            id="dev-stat-new-bugs"
            icon={Bug}
            label="本周缺陷新增"
            value={String(BUGS.length)}
            unit="项"
            delta={{ dir: 'down', text: '较上周 −3' }}
            hint={`其中高危 ${BUGS.filter((b) => b.severity === 'danger').length} 项`}
          />
          <StatTile
            id="dev-stat-avg-stamina"
            icon={Activity}
            label="平均体力"
            value={String(derived.avgStamina)}
            tone={derived.avgStamina < 55 ? 'signal' : 'paper'}
            hint={derived.avgStamina < 55 ? '已低于 55，倦怠风险上升' : '处于可持续区间'}
          />
          <StatTile
            id="dev-stat-tech-debt"
            icon={Wrench}
            label="技术债估算"
            value={String(techDebtWeeks)}
            unit="周"
            hint="按六项能力的缺口折算，用于排期时预留缓冲"
          />
        </div>
      </section>

      <Panel cut="tr" className="overflow-hidden">
        <div className="px-4 pt-4 sm:px-5">
          <Tabs items={tabItems} active={tab} onChange={setTab} idPrefix="dev" />
        </div>

        {/* ---------------------------------------------------- 阶段看板 */}
        <TabPanel idPrefix="dev" id="board" className="p-4 sm:p-5">
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
            {STAGE_ORDER.map((stage) => {
              const bucket = state.projects.filter((p) => p.stage === stage)
              return (
                <section
                  key={stage}
                  aria-label={`${STAGE_META[stage].label}阶段`}
                  className="w-[17.5rem] shrink-0"
                >
                  <header className="mb-3 border-[3px] border-ink bg-ink px-3 py-2 text-paper-warm">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-head text-[0.875rem] font-800">
                        {STAGE_META[stage].label}
                      </h3>
                      <span className="tabular font-mono text-[0.625rem] font-700 opacity-60">
                        {bucket.length} 项
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-paper-warm/50">
                      {STAGE_META[stage].blurb}
                    </p>
                  </header>

                  <div className="space-y-3">
                    {bucket.length === 0 && (
                      <p className="border-2 border-dashed border-ink/30 px-3 py-6 text-center font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink/35">
                        空阶段
                      </p>
                    )}

                    {bucket.map((p) => {
                      const canPromote = stage !== 'gold' && stage !== 'released'
                      const team = p.teamIds
                        .map((id, i) => ({ id, name: findName(id), i }))
                        .filter((t) => t.name)
                      return (
                        <article
                          key={p.id}
                          id={`dev-card-${p.id}`}
                          className="p5-noise border-[3px] border-ink bg-paper-warm p-3 shadow-hard-sm transition-transform duration-200 ease-snap hover:-translate-y-[3px]"
                        >
                          <h4 className="font-head text-[0.9375rem] font-800 leading-snug">
                            《{p.title}》
                          </h4>
                          <p className="mt-1 text-[0.75rem] leading-snug text-ink/60">
                            {p.subtitle}
                          </p>

                          <div className="mt-3">
                            <Meter
                              value={p.progress}
                              tone="signal"
                              label="整体进度"
                              showValue
                              id={`dev-card-meter-${p.id}`}
                            />
                          </div>

                          <dl className="mt-3 space-y-1.5">
                            {(
                              [
                                ['fun', '趣味', 'jade'],
                                ['polish', '完成度', 'ice'],
                                ['narrative', '叙事', 'royal'],
                                ['tech', '技术', 'pulse'],
                              ] as const
                            ).map(([key, label, tone]) => (
                              <div key={key} className="flex items-center gap-2">
                                <dt className="w-[3.25rem] shrink-0 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.12em] text-ink/50">
                                  {label}
                                </dt>
                                <dd className="min-w-0 flex-1">
                                  <Meter
                                    value={p.quality[key]}
                                    tone={tone}
                                    height={8}
                                    label={`${p.title} ${label}`}
                                    id={`dev-card-q-${p.id}-${key}`}
                                  />
                                </dd>
                                <span className="tabular w-6 shrink-0 text-right font-mono text-[0.625rem] font-700">
                                  {p.quality[key]}
                                </span>
                              </div>
                            ))}
                          </dl>

                          <div className="mt-3 flex items-center justify-between gap-2 border-t-2 border-ink/12 pt-2.5">
                            <span className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.12em] text-ink/50">
                              主导
                            </span>
                            <span className="truncate font-head text-[0.75rem] font-800">
                              {leaderName(p, findName)}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="flex -space-x-2">
                              {team.slice(0, 5).map((t) => (
                                <Avatar key={t.id} name={t.name as string} size={26} index={t.i} />
                              ))}
                              {team.length > 5 && (
                                <span className="tabular grid h-[26px] w-[26px] place-items-center border-[3px] border-ink bg-ink font-mono text-[0.5625rem] font-700 text-paper-warm">
                                  +{team.length - 5}
                                </span>
                              )}
                            </div>
                            <Tag
                              tone={p.deadlineWeek < state.week ? 'signal' : 'paper'}
                            >
                              <CalendarClock size={11} strokeWidth={2.6} aria-hidden="true" />
                              {dueLabel(p.deadlineWeek, state.week)}
                            </Tag>
                          </div>

                          {canPromote ? (
                            <Btn
                              id={`dev-stage-promote-${p.id}`}
                              size="sm"
                              variant="signal"
                              icon={Rocket}
                              className="mt-3 w-full"
                              onClick={() => promote(p)}
                            >
                              推进至 {STAGE_META[nextStage(p.stage)].label}
                            </Btn>
                          ) : (
                            <p className="mt-3 flex items-center gap-1.5 border-2 border-ink/25 px-2 py-1.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
                              <BadgeCheck size={12} strokeWidth={2.6} aria-hidden="true" />
                              {stage === 'gold' ? '已压盘，等待发行' : '已发行，转入长线运营'}
                            </p>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </TabPanel>

        {/* ---------------------------------------------------- 里程碑 */}
        <TabPanel idPrefix="dev" id="milestones" className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Slab tone="ink">共 {milestones.length} 项</Slab>
            <Slab tone="signal">
              逾期 {milestones.filter((m) => m.dueWeek < state.week).length} 项
            </Slab>
            <span className="ml-auto font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
              当前 {state.week} 周
            </span>
          </div>

          <div className="overflow-x-auto border-[3px] border-ink">
            <table className="w-full min-w-[46rem] border-collapse bg-paper-warm">
              <caption className="sr-only">全部在研项目的里程碑清单</caption>
              <thead>
                <tr className="bg-ink text-paper-warm">
                  {['里程碑', '所属项目', '负责人', '进度', '截止', '状态', '操作'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="border-r-2 border-paper-warm/20 px-3 py-2.5 text-left font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] last:border-r-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {milestones.map((m) => {
                  const overdue = m.dueWeek < state.week
                  const owner = staffById.get(
                    state.projects.find((p) => p.id === m.projectId)?.leadId ?? '',
                  )
                  return (
                    <tr
                      key={m.id}
                      id={`dev-milestone-row-${m.id}`}
                      className="border-b-2 border-ink/12 transition-colors duration-150 hover:bg-paper-dim/60"
                    >
                      <th
                        scope="row"
                        className="max-w-[16rem] px-3 py-3 text-left font-head text-[0.8125rem] font-800"
                      >
                        {m.name}
                      </th>
                      <td className="px-3 py-3 text-[0.75rem] text-ink/70">《{m.project}》</td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-2">
                          <Avatar name={owner ?? m.ownerName} size={24} index={m.id.length} />
                          <span className="font-head text-[0.75rem] font-800">
                            {owner ?? m.ownerName}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="flex min-w-[7rem] items-center gap-2">
                          <Meter
                            value={m.progress}
                            tone={overdue ? 'signal' : 'ink'}
                            height={8}
                            label={`${m.name} 进度`}
                            id={`dev-milestone-meter-${m.id}`}
                          />
                          <span className="tabular w-9 shrink-0 text-right font-mono text-[0.6875rem] font-700">
                            {m.progress}%
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="tabular font-mono text-[0.6875rem] font-700">
                          W{m.dueWeek}
                        </span>
                        <span className="mt-0.5 block text-[0.6875rem] text-ink/55">
                          {dueLabel(m.dueWeek, state.week)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {overdue ? (
                          <Tag tone="signal">
                            <TriangleAlert size={11} strokeWidth={2.6} aria-hidden="true" />
                            风险
                          </Tag>
                        ) : m.progress >= 100 ? (
                          <Tag tone="jade">
                            <BadgeCheck size={11} strokeWidth={2.6} aria-hidden="true" />
                            已完成
                          </Tag>
                        ) : (
                          <Tag>进行中</Tag>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Btn
                          id={`dev-milestone-assign-${m.id}`}
                          size="sm"
                          variant="ghost"
                          icon={UserPlus}
                          onClick={() =>
                            setDispatchTarget({
                              projectId: m.projectId,
                              project: m.project,
                              milestoneId: m.id,
                              milestone: m.name,
                              owner: owner ?? m.ownerName,
                            })
                          }
                        >
                          派单
                        </Btn>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabPanel>

        {/* ---------------------------------------------------- 缺陷追踪 */}
        <TabPanel idPrefix="dev" id="bugs" className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="按严重度筛选缺陷">
              {(
                [
                  ['all', '全部', 'paper'],
                  ['danger', '高危', 'signal'],
                  ['warn', '中危', 'pulse'],
                  ['info', '低危', 'ice'],
                ] as const
              ).map(([key, label, tone]) => {
                const on = bugSeverity === key
                const count =
                  key === 'all' ? BUGS.length : BUGS.filter((b) => b.severity === key).length
                return (
                  <button
                    key={key}
                    id={`dev-bug-filter-${key}`}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setBugSeverity(key)}
                    className={clsx(
                      'inline-flex min-h-[38px] items-center gap-1.5 border-[3px] border-ink px-2.5 py-1.5 font-head text-[0.75rem] font-800 transition-transform duration-150 ease-snap active:translate-y-[2px]',
                      on
                        ? tone === 'signal'
                          ? 'bg-signal text-white shadow-hard-sm'
                          : tone === 'pulse'
                            ? 'bg-pulse text-ink shadow-hard-sm'
                            : tone === 'ice'
                              ? 'bg-ice text-white shadow-hard-sm'
                              : 'bg-ink text-paper-warm shadow-hard-sm'
                        : 'bg-paper-warm text-ink/65 hover:text-ink',
                    )}
                  >
                    {label}
                    <span className="tabular font-mono text-[0.625rem] opacity-70">{count}</span>
                  </button>
                )
              })}
            </div>

            <div className="relative ml-auto w-full sm:w-[16rem]">
              <Search
                size={15}
                strokeWidth={2.6}
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40"
              />
              <input
                id="dev-bug-search"
                type="search"
                value={bugQuery}
                onChange={(e) => setBugQuery(e.target.value)}
                placeholder="搜索编号、标题或负责人"
                aria-label="搜索缺陷"
                className="p5-input !pl-8"
              />
            </div>
          </div>

          {filteredBugs.length === 0 ? (
            <EmptyState
              icon={Bug}
              title="没有匹配的缺陷"
              hint="调整严重度筛选或清空搜索关键词后重试。"
              action={
                <Btn
                  id="dev-bug-reset"
                  icon={X}
                  onClick={() => {
                    setBugSeverity('all')
                    setBugQuery('')
                  }}
                >
                  清空筛选
                </Btn>
              }
            />
          ) : (
            <div className="overflow-x-auto border-[3px] border-ink">
              <table className="w-full min-w-[48rem] border-collapse bg-paper-warm">
                <caption className="sr-only">当前缺陷清单</caption>
                <thead>
                  <tr className="bg-ink text-paper-warm">
                    {['编号', '标题', '严重度', '复现率', '负责人', '所属项目', '状态', '操作'].map(
                      (h) => (
                        <th
                          key={h}
                          scope="col"
                          className="border-r-2 border-paper-warm/20 px-3 py-2.5 text-left font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] last:border-r-0"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredBugs.map((b) => {
                    const owner = staffById.get(b.ownerId) ?? b.ownerFallback
                    const status = BUG_STATUS_META[b.status]
                    return (
                      <tr
                        key={b.id}
                        id={`dev-bug-row-${b.id}`}
                        className="cursor-pointer border-b-2 border-ink/12 transition-colors duration-150 hover:bg-paper-dim/60"
                        onClick={() => setOpenBug(b)}
                      >
                        <td className="tabular px-3 py-3 font-mono text-[0.6875rem] font-700">
                          {b.code}
                        </td>
                        <th
                          scope="row"
                          className="max-w-[18rem] px-3 py-3 text-left font-head text-[0.8125rem] font-800"
                        >
                          {b.title}
                        </th>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2">
                            <SeverityMark severity={b.severity} />
                            <Tag tone={b.severity === 'danger' ? 'signal' : b.severity === 'warn' ? 'pulse' : 'ice'}>
                              {b.severity === 'danger' ? '高危' : b.severity === 'warn' ? '中危' : '低危'}
                            </Tag>
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex min-w-[6rem] items-center gap-2">
                            <Meter
                              value={b.repro}
                              tone={b.repro >= 80 ? 'signal' : 'ink'}
                              height={8}
                              label={`${b.code} 复现率`}
                              id={`dev-bug-repro-${b.id}`}
                            />
                            <span className="tabular w-9 shrink-0 text-right font-mono text-[0.6875rem] font-700">
                              {b.repro}%
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2">
                            <Avatar name={owner} size={24} index={b.code.length} />
                            <span className="font-head text-[0.75rem] font-800">{owner}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[0.75rem] text-ink/70">《{b.project}》</td>
                        <td className="px-3 py-3">
                          <Tag tone={status.tone}>{status.label}</Tag>
                        </td>
                        <td className="px-3 py-3">
                          <Btn
                            id={`dev-bug-open-${b.id}`}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenBug(b)
                            }}
                          >
                            详情
                          </Btn>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabPanel>

        {/* ---------------------------------------------------- 技术栈 */}
        <TabPanel idPrefix="dev" id="stack" className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section aria-label="工作室技术能力">
              <Kicker>能力评估</Kicker>
              <ul className="mt-4 space-y-3">
                {CAPABILITIES.map((c) => (
                  <li
                    key={c.id}
                    id={`dev-capability-${c.id}`}
                    className="p5-noise border-[3px] border-ink bg-paper-warm p-3.5 transition-transform duration-200 ease-snap hover:-translate-y-[3px] hover:shadow-hard-sm"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <h3 className="font-head text-[0.875rem] font-800">{c.name}</h3>
                      <span className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.2em] text-ink/45">
                        {c.latin}
                      </span>

                      <span
                        className="ml-auto flex items-center gap-1"
                        role="img"
                        aria-label={`${c.name} 等级 ${c.level} / 5`}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            aria-hidden="true"
                            className={clsx(
                              'h-4 w-3 border-2 border-ink transition-colors duration-200',
                              n <= c.level
                                ? c.level >= 4
                                  ? 'bg-jade'
                                  : c.level === 3
                                    ? 'bg-pulse'
                                    : 'bg-signal'
                                : 'bg-paper-dim',
                            )}
                          />
                        ))}
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <Meter
                        value={c.level * 20}
                        tone={c.level >= 4 ? 'jade' : c.level === 3 ? 'pulse' : 'signal'}
                        height={8}
                        label={`${c.name} 成熟度`}
                        id={`dev-capability-meter-${c.id}`}
                      />
                    </div>

                    <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-ink/70">{c.note}</p>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Tag tone={c.level >= 4 ? 'jade' : c.level === 3 ? 'pulse' : 'signal'}>
                        等级 {c.level}/5
                      </Tag>
                      <Btn
                        id={`dev-capability-invest-${c.id}`}
                        size="sm"
                        icon={Zap}
                        onClick={() => investIn(c)}
                      >
                        投入研发
                      </Btn>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="构建历史" className="space-y-5">
              <Panel cut="tr" className="p-4">
                <Kicker>构建耗时趋势</Kicker>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <Sparkline
                    points={BUILD_DURATIONS}
                    width={190}
                    height={44}
                    label="近八次构建耗时趋势，单位秒，整体呈下降趋势"
                  />
                  <div className="text-right">
                    <p className="tabular font-display text-[1.5rem] leading-none">
                      {BUILD_DURATIONS[BUILD_DURATIONS.length - 1]}
                      <span className="ml-1 font-head text-[0.75rem] opacity-60">秒</span>
                    </p>
                    <p className="mt-1 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-jade">
                      ▼ 较峰值 −{BUILD_DURATIONS[0] - BUILD_DURATIONS[BUILD_DURATIONS.length - 1]} 秒
                    </p>
                  </div>
                </div>
              </Panel>

              <Panel cut="bl" className="p-0">
                <PanelHead
                  icon="Server"
                  title="构建历史"
                  latin="Build Log"
                  right={<Tag tone="ink">{BUILDS.length} 次</Tag>}
                />
                <ol className="divide-y-2 divide-ink/12">
                  {BUILDS.map((b) => (
                    <li key={b.id} id={`dev-build-${b.id}`} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tabular font-mono text-[0.6875rem] font-700">
                          {b.id}
                        </span>
                        <Tag
                          tone={
                            b.result === 'success' ? 'jade' : b.result === 'unstable' ? 'pulse' : 'signal'
                          }
                        >
                          {b.result === 'success'
                            ? '成功'
                            : b.result === 'unstable'
                              ? '告警'
                              : '失败'}
                        </Tag>
                        <span className="ml-auto font-mono text-[0.625rem] font-700 text-ink/50">
                          {b.duration} · {b.size}
                        </span>
                      </div>
                      <p className="mt-1.5 font-head text-[0.8125rem] font-800">{b.label}</p>
                      <p className="mt-0.5 text-[0.75rem] leading-snug text-ink/60">{b.note}</p>
                    </li>
                  ))}
                </ol>
              </Panel>

              <Panel tone="ink" cut="tr" className="flex items-center gap-3 p-4">
                <Package size={20} strokeWidth={2.4} aria-hidden="true" />
                <div>
                  <p className="font-head text-[0.8125rem] font-800">资源库共 482 GB</p>
                  <p className="mt-0.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] opacity-55">
                    可复用资产占比 61%
                  </p>
                </div>
              </Panel>
            </section>
          </div>
        </TabPanel>
      </Panel>

      {/* ---------------------------------------------------- 缺陷详情模态框 */}
      <Modal
        open={openBug !== null}
        onClose={() => setOpenBug(null)}
        kicker="Defect Report"
        title={openBug ? `${openBug.code} · 缺陷报告` : '缺陷报告'}
        latin={openBug ? `《${openBug.project}》` : undefined}
        size="lg"
        footer={
          openBug && (
            <>
              <Btn
                id="dev-bug-detail-close"
                variant="ghost"
                onClick={() => setOpenBug(null)}
              >
                关闭
              </Btn>
              <Btn
                id="dev-bug-detail-assign"
                icon={UserPlus}
                onClick={() =>
                  toast.push({
                    severity: 'info',
                    title: `${openBug.code} 已指派`,
                    detail: `已通知 ${staffById.get(openBug.ownerId) ?? openBug.ownerFallback} 跟进，按复现率 ${openBug.repro}% 优先排入本周。`,
                  })
                }
              >
                指派跟进
              </Btn>
              <Btn
                id="dev-bug-detail-close-bug"
                variant="signal"
                icon={BadgeCheck}
                onClick={() => {
                  toast.push({
                    severity: 'good',
                    title: `${openBug.code} 已标记为待验证`,
                    detail: '修复提交将被排入下一次冒烟测试；验证通过后自动归档。',
                  })
                  setOpenBug(null)
                }}
              >
                标记待验证
              </Btn>
            </>
          )
        }
      >
        {openBug && (
          <div className="space-y-5">
            <div>
              <h3 className="font-display text-[1.125rem] leading-snug">{openBug.title}</h3>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Tag
                  tone={
                    openBug.severity === 'danger'
                      ? 'signal'
                      : openBug.severity === 'warn'
                        ? 'pulse'
                        : 'ice'
                  }
                >
                  {openBug.severity === 'danger'
                    ? '高危'
                    : openBug.severity === 'warn'
                      ? '中危'
                      : '低危'}
                </Tag>
                <Tag tone={BUG_STATUS_META[openBug.status].tone}>
                  {BUG_STATUS_META[openBug.status].label}
                </Tag>
                <Tag>复现率 {openBug.repro}%</Tag>
                <Tag tone="ink">《{openBug.project}》</Tag>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="border-[3px] border-ink bg-paper-dim/50 p-3">
                <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/50">
                  负责人
                </dt>
                <dd className="mt-1.5 flex items-center gap-2">
                  <Avatar
                    name={staffById.get(openBug.ownerId) ?? openBug.ownerFallback}
                    size={30}
                    index={openBug.code.length}
                  />
                  <span className="font-head text-[0.875rem] font-800">
                    {staffById.get(openBug.ownerId) ?? openBug.ownerFallback}
                  </span>
                </dd>
              </div>
              <div className="border-[3px] border-ink bg-paper-dim/50 p-3">
                <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/50">
                  关联提交
                </dt>
                <dd className="mt-1.5 font-mono text-[0.75rem] font-700 break-words">
                  {openBug.commit}
                </dd>
              </div>
            </dl>

            <section aria-labelledby="dev-bug-steps-title">
              <h4
                id="dev-bug-steps-title"
                className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55"
              >
                复现步骤
              </h4>
              <ol className="mt-2.5 space-y-0 border-[3px] border-ink">
                {openBug.steps.map((s, i) => (
                  <li
                    key={s}
                    className="flex items-start gap-3 border-b-2 border-ink/12 px-3 py-2.5 last:border-b-0"
                  >
                    <span className="tabular grid h-6 w-6 shrink-0 place-items-center border-2 border-ink bg-ink font-mono text-[0.625rem] font-700 text-paper-warm">
                      {i + 1}
                    </span>
                    <span className="text-[0.8125rem] leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </section>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="border-[3px] border-jade bg-jade/8 p-3.5">
                <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-jade-deep">
                  预期表现
                </p>
                <p className="mt-2 text-[0.8125rem] leading-relaxed">{openBug.expected}</p>
              </div>
              <div className="border-[3px] border-signal bg-signal/8 p-3.5">
                <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-signal-deep">
                  实际表现
                </p>
                <p className="mt-2 text-[0.8125rem] leading-relaxed">{openBug.actual}</p>
              </div>
            </div>

            <section aria-labelledby="dev-bug-env-title">
              <h4
                id="dev-bug-env-title"
                className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55"
              >
                运行环境
              </h4>
              <p className="mt-2 border-[3px] border-ink bg-ink px-3 py-2.5 font-mono text-[0.75rem] text-paper-warm">
                {openBug.env}
              </p>
            </section>
          </div>
        )}
      </Modal>

      {/* ---------------------------------------------------- 里程碑派单模态框 */}
      <Modal
        open={dispatchTarget !== null}
        onClose={() => setDispatchTarget(null)}
        kicker="Assignment"
        title="里程碑派单"
        latin={dispatchTarget?.project}
        size="md"
        footer={
          <>
            <Btn id="dev-dispatch-cancel" variant="ghost" onClick={() => setDispatchTarget(null)}>
              取消
            </Btn>
            <Btn
              id="dev-dispatch-confirm"
              variant="signal"
              icon={UserPlus}
              disabled={!dispatchTarget}
              onClick={confirmDispatch}
            >
              确认派单
            </Btn>
          </>
        }
      >
        {dispatchTarget && (
          <div className="space-y-5">
            <div className="border-[3px] border-ink bg-paper-dim/50 p-3.5">
              <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/50">
                目标里程碑
              </p>
              <p className="mt-1.5 font-head text-[1rem] font-800">
                {dispatchTarget.milestone}
              </p>
              <p className="mt-0.5 text-[0.8125rem] text-ink/65">
                《{dispatchTarget.project}》· 当前负责人 {dispatchTarget.owner}
              </p>
            </div>

            <p className="text-[0.8125rem] leading-relaxed text-ink/70">
              从在册人员中选择新的负责人。派单结果会写入事件日志，便于本周结算时追溯。
            </p>

            <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
              {state.staff.map((s, i) => (
                <li
                  key={s.id}
                  id={`dev-dispatch-staff-${s.id}`}
                  className="flex items-center gap-3 border-[3px] border-ink bg-paper-warm p-2.5 transition-colors duration-150 hover:bg-paper-dim/60"
                >
                  <Avatar name={s.name} size={36} index={i} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-head text-[0.875rem] font-800">{s.name}</p>
                    <p className="truncate font-mono text-[0.5625rem] font-700 uppercase tracking-[0.12em] text-ink/50">
                      {s.title}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Meter
                        value={s.stamina}
                        tone={s.stamina < 50 ? 'signal' : 'jade'}
                        height={6}
                        label={`${s.name} 体力`}
                        id={`dev-dispatch-stamina-${s.id}`}
                      />
                      <span className="tabular w-8 shrink-0 text-right font-mono text-[0.5625rem] font-700">
                        {s.stamina}
                      </span>
                    </div>
                  </div>
                  <Btn
                    id={`dev-dispatch-pick-${s.id}`}
                    size="sm"
                    variant={dispatchTarget.owner === s.name ? 'ink' : 'paper'}
                    onClick={() =>
                      setDispatchTarget((t) => (t ? { ...t, owner: s.name } : t))
                    }
                  >
                    {dispatchTarget.owner === s.name ? '已选中' : '指派'}
                  </Btn>
                </li>
              ))}
            </ul>

            {state.staff.length === 0 && (
              <EmptyState icon={Gauge} title="当前没有可派单的人员" hint="请先在人员页面招募或解冻成员。" />
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
