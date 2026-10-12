import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  BadgeCheck,
  CircleAlert,
  Database,
  Download,
  Eye,
  EyeOff,
  LoaderCircle,
  MonitorCog,
  Plug,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Tag as TagIcon,
  Trash2,
  Upload,
  Waypoints,
} from 'lucide-react'
import clsx from 'clsx'
import { useGame } from '../lib/store'
import { useToast } from '../lib/toast'
import { money, num, weekLabel } from '../lib/format'
import {
  Btn,
  Kicker,
  Meter,
  Modal,
  PageHeader,
  Panel,
  PanelHead,
  Slab,
  TabPanel,
  Tabs,
  Tag,
  type TabItem,
} from '../lib/ui'

/* ============================================================================
   设置 — 前端原型。全部偏好写入 localStorage，密钥不出浏览器。
   ========================================================================== */

const STORE_KEY = 'tavern-studio:settings'
const BUILD = '20261012.1'

interface ApiProfile {
  enabled: boolean
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  timeout: number
  template: string
}

interface TagDef {
  id: string
  name: string
  desc: string
  required: boolean
  collapsed: boolean
  sample: string
  locked?: boolean
}

interface SaveSlot {
  id: string
  name: string
  week: number
  at: string
  sizeKb: number
}

type MotionLevel = 'full' | 'reduced' | 'off'
type Density = 'compact' | 'standard' | 'loose'
type NumberFormat = 'full' | 'wan'
type FontScale = 'standard' | 'large'

interface DisplayPrefs {
  motion: MotionLevel
  density: Density
  numberFormat: NumberFormat
  fontScale: FontScale
  highContrast: boolean
  halftone: boolean
}

interface SettingsShape {
  primary: ApiProfile
  secondary: ApiProfile
  tags: TagDef[]
  slots: SaveSlot[]
  autoSave: boolean
  autoSaveEvery: string
  savePath: string
  display: DisplayPrefs
}

const TEMPLATE_PRIMARY = `你是《雨巷食堂》的叙事引擎。每一回合只输出一次，且必须使用下列标签。

<thinking>内部推理，不展示给玩家。不要在内部解析其他标签。</thinking>
<maintext>本回合正文。允许换行，禁止使用 markdown 语法。</maintext>
<option>每一项占一行
给出 2 到 4 个可执行选项
选项之间不要编号</option>
<sum>本回合的一句话总结，不超过 40 字。</sum>
<vars>{"好感": 0, "现金": 0}</vars>

硬性约束：
1. 不要替玩家做决定。
2. <vars> 只输出发生变化的字段。
3. 缺少 <maintext> 视为生成失败。`

const TEMPLATE_SECONDARY = `只做两件事，不要复述正文，不要添加寒暄。

<sum>把上一条回复压缩成一句话，不超过 40 字。</sum>
<vars>{"字段": 数值}</vars>

规则：
1. 只输出确实发生变化的变量。
2. 数值必须是数字，不要加引号或单位。
3. 无法确定时输出空的 <vars>{}</vars>。`

const DEFAULT_TAGS: TagDef[] = [
  {
    id: 'tag-maintext',
    name: 'maintext',
    desc: '正文。流式渲染到主显示区，是唯一必需的叙事容器。',
    required: true,
    collapsed: false,
    sample: '<maintext>雨点打在铁皮棚上，她把伞收起来，抖了两下。</maintext>',
    locked: true,
  },
  {
    id: 'tag-option',
    name: 'option',
    desc: '选项列表。每行一项，渲染为可点击的选项卡，玩家也可自由输入。',
    required: true,
    collapsed: false,
    sample: '<option>问她要不要加辣\n先给她倒一杯热的\n什么都不说</option>',
    locked: true,
  },
  {
    id: 'tag-sum',
    name: 'sum',
    desc: '本回合总结。写入楼层存档，用于回溯与变量快照对齐。',
    required: false,
    collapsed: false,
    sample: '<sum>她第一次点了单，并且没有回头。</sum>',
  },
  {
    id: 'tag-vars',
    name: 'vars',
    desc: '变量更新。JSON 对象，深合并进当前存档的变量表。',
    required: false,
    collapsed: false,
    sample: '<vars>{"好感": 12, "现金": 340}</vars>',
  },
  {
    id: 'tag-thinking',
    name: 'thinking',
    desc: '长篇推理。默认折叠为一行，内部不再解析其他标签。',
    required: false,
    collapsed: true,
    sample: '<thinking>她在试探我是否还记得上次那件事。</thinking>',
  },
  {
    id: 'tag-think',
    name: 'think',
    desc: '简短判断。折叠显示，用于节奏较快的回合。',
    required: false,
    collapsed: true,
    sample: '<think>保持沉默更安全。</think>',
  },
]

const DEFAULT_SLOTS: SaveSlot[] = [
  { id: 'slot-1', name: '雨巷食堂 · α 封版前', week: 26, at: '今天 01:12', sizeKb: 842 },
  { id: 'slot-2', name: '雨巷食堂 · 第二章初稿', week: 24, at: '昨天 22:47', sizeKb: 796 },
  { id: 'slot-3', name: '机工协奏曲 · 发行前统稿', week: 12, at: '上月 09 日 18:03', sizeKb: 1_240 },
  { id: 'slot-4', name: '节气旅札 · 立项', week: 8, at: '上月 02 日 11:26', sizeKb: 118 },
]

const DEFAULTS: SettingsShape = {
  primary: {
    enabled: true,
    baseUrl: 'https://api.example.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.9,
    maxTokens: 1024,
    timeout: 60,
    template: TEMPLATE_PRIMARY,
  },
  secondary: {
    enabled: false,
    baseUrl: 'https://api.example.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    maxTokens: 320,
    timeout: 30,
    template: TEMPLATE_SECONDARY,
  },
  tags: DEFAULT_TAGS,
  slots: DEFAULT_SLOTS,
  autoSave: true,
  autoSaveEvery: '每 5 回合',
  savePath: '浏览器本地存储 / tavern-studio / saves',
  display: {
    motion: 'full',
    density: 'standard',
    numberFormat: 'full',
    fontScale: 'standard',
    highContrast: false,
    halftone: true,
  },
}

function loadSettings(): SettingsShape {
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return DEFAULTS
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULTS
    const p = parsed as Partial<SettingsShape>
    return {
      primary: { ...DEFAULTS.primary, ...(p.primary ?? {}) },
      secondary: { ...DEFAULTS.secondary, ...(p.secondary ?? {}) },
      tags: Array.isArray(p.tags) && p.tags.length > 0 ? p.tags : DEFAULTS.tags,
      slots: Array.isArray(p.slots) && p.slots.length > 0 ? p.slots : DEFAULTS.slots,
      autoSave: typeof p.autoSave === 'boolean' ? p.autoSave : DEFAULTS.autoSave,
      autoSaveEvery: p.autoSaveEvery ?? DEFAULTS.autoSaveEvery,
      savePath: p.savePath ?? DEFAULTS.savePath,
      display: { ...DEFAULTS.display, ...(p.display ?? {}) },
    }
  } catch {
    return DEFAULTS
  }
}

/* --------------------------------------------------------------- 小组件 */

function Field({
  id,
  label,
  hint,
  children,
  wide = false,
}: {
  id: string
  label: string
  hint?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className={clsx('min-w-0', wide && 'sm:col-span-2')}>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[0.75rem] leading-snug text-ink/50">{hint}</p>}
    </div>
  )
}

function Switch({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative mt-0.5 h-7 w-14 shrink-0 border-[3px] border-ink transition-colors duration-150',
          checked ? 'bg-signal' : 'bg-paper-dim',
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'absolute top-0 h-full w-1/2 bg-paper-warm transition-transform duration-200 ease-slam',
            checked ? 'translate-x-full border-l-[3px] border-ink' : 'translate-x-0 border-r-[3px] border-ink',
          )}
        />
      </button>
      <span className="min-w-0">
        <span className="block font-head text-[0.875rem] font-800 leading-tight">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.75rem] leading-snug text-ink/50">{hint}</span>}
      </span>
    </div>
  )
}

function RadioRow<V extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string
  value: V
  options: { value: V; label: string; hint?: string }[]
  onChange: (next: V) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value
        return (
          <label
            key={o.value}
            htmlFor={`${name}-${o.value}`}
            className={clsx(
              'flex cursor-pointer items-start gap-2 border-[3px] border-ink px-3 py-2 transition-colors duration-150',
              on ? 'bg-signal text-white shadow-hard-sm' : 'bg-paper-warm hover:bg-paper-dim',
            )}
          >
            <input
              type="radio"
              id={`${name}-${o.value}`}
              name={name}
              value={o.value}
              checked={on}
              onChange={() => onChange(o.value)}
              className="mt-1 h-4 w-4 shrink-0 accent-ink"
            />
            <span className="min-w-0">
              <span className="block font-head text-[0.8125rem] font-800 leading-tight">
                {o.label}
              </span>
              {o.hint && (
                <span
                  className={clsx(
                    'mt-0.5 block text-[0.6875rem] leading-snug',
                    on ? 'text-white/75' : 'text-ink/50',
                  )}
                >
                  {o.hint}
                </span>
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------- 主页面 */

export default function Settings() {
  const { state } = useGame()
  const toast = useToast()

  const [settings, setSettings] = useState<SettingsShape>(() => loadSettings())
  const [tab, setTab] = useState('api')
  const [revealed, setRevealed] = useState<{ primary: boolean; secondary: boolean }>({
    primary: false,
    secondary: false,
  })
  const [testing, setTesting] = useState<'primary' | 'secondary' | null>(null)
  const [draftTag, setDraftTag] = useState('')

  const [tagResetOpen, setTagResetOpen] = useState(false)
  const [deleteSlot, setDeleteSlot] = useState<SaveSlot | null>(null)
  const [fullResetOpen, setFullResetOpen] = useState(false)

  const testTimer = useRef<number | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(settings))
    } catch {
      /* 隐私模式下写入会失败，原型中静默忽略 */
    }
  }, [settings])

  useEffect(
    () => () => {
      if (testTimer.current !== null) window.clearTimeout(testTimer.current)
    },
    [],
  )

  const patchProfile = useCallback(
    (which: 'primary' | 'secondary', patch: Partial<ApiProfile>) => {
      setSettings((s) => {
        const next: ApiProfile = { ...s[which], ...patch }
        return which === 'primary'
          ? { ...s, primary: next }
          : { ...s, secondary: next }
      })
    },
    [],
  )

  const patchDisplay = useCallback((patch: Partial<DisplayPrefs>) => {
    setSettings((s) => ({ ...s, display: { ...s.display, ...patch } }))
  }, [])

  const runTest = useCallback(
    (which: 'primary' | 'secondary') => {
      if (testing !== null) return
      const profile = settings[which]
      setTesting(which)
      testTimer.current = window.setTimeout(() => {
        testTimer.current = null
        setTesting(null)
        if (!profile.apiKey.trim()) {
          toast.push({
            severity: 'warn',
            title: '连接测试未通过：缺少密钥',
            detail: `「${which === 'primary' ? '主接口' : '次接口'}」当前没有填写密钥。原型不会把密钥发往任何服务器，此检查仅在本地完成。`,
          })
          return
        }
        toast.push({
          severity: 'good',
          title: `「${which === 'primary' ? '主接口' : '次接口'}」连接测试通过`,
          detail: `已按地址 ${profile.baseUrl} 与模型 ${profile.model} 完成握手，往返延迟 218 ms（模拟值，未发起真实请求）。`,
        })
      }, 1400)
    },
    [settings, testing, toast],
  )

  const toggleTag = useCallback((tagId: string, key: 'required' | 'collapsed') => {
    setSettings((s) => ({
      ...s,
      tags: s.tags.map((t) => {
        if (t.id !== tagId) return t
        return key === 'required'
          ? { ...t, required: !t.required }
          : { ...t, collapsed: !t.collapsed }
      }),
    }))
  }, [])

  const addTag = useCallback(() => {
    const raw = draftTag.trim().replace(/[^a-zA-Z0-9_-]/g, '')
    if (!raw) {
      toast.push({
        severity: 'warn',
        title: '标签名不合法',
        detail: '标签名只能包含字母、数字、下划线与连字符，例如 weather。',
      })
      return
    }
    if (settings.tags.some((t) => t.name === raw)) {
      toast.push({
        severity: 'warn',
        title: '标签已存在',
        detail: `标签集中已经有 <${raw}> 了，可以修改它的必填与折叠状态。`,
      })
      return
    }
    setSettings((s) => ({
      ...s,
      tags: [
        ...s.tags,
        {
          id: `tag-${raw}`,
          name: raw,
          desc: '自定义标签。请在此补充它承载的内容与渲染方式。',
          required: false,
          collapsed: false,
          sample: `<${raw}>示例内容</${raw}>`,
        },
      ],
    }))
    setDraftTag('')
    toast.push({
      severity: 'good',
      title: `已新增标签 <${raw}>`,
      detail: '记得在提示词模板里同步说明它的用途，否则模型不会输出它。',
    })
  }, [draftTag, settings.tags, toast])

  const removeTag = useCallback(
    (tag: TagDef) => {
      setSettings((s) => ({ ...s, tags: s.tags.filter((t) => t.id !== tag.id) }))
      toast.push({
        severity: 'info',
        title: `已移除标签 <${tag.name}>`,
        detail: '解析器将不再识别该标签，其内容会作为正文一并显示。',
      })
    },
    [toast],
  )

  const resetTags = useCallback(() => {
    setSettings((s) => ({ ...s, tags: DEFAULT_TAGS }))
    setTagResetOpen(false)
    toast.push({
      severity: 'good',
      title: '标签集已恢复默认',
      detail: `已还原为 ${DEFAULT_TAGS.length} 个标签。自定义标签全部被移除。`,
    })
  }, [toast])

  const exportSlot = useCallback(
    (slot: SaveSlot) => {
      const payload = JSON.stringify({
        slot: slot.id,
        name: slot.name,
        week: slot.week,
        studio: state.studio.name,
        progress: state.projects.map((p) => ({ title: p.title, stage: p.stage, percent: p.progress })),
      })
      const bytes = new TextEncoder().encode(payload).length
      toast.push({
        severity: 'good',
        title: `已导出「${slot.name}」`,
        detail: `已生成 ${bytes} 字节的 JSON 存档内容（原型中不落盘，仅展示序列化结果）。`,
      })
    },
    [state.projects, state.studio.name, toast],
  )

  const importSlot = useCallback(
    (slot: SaveSlot) => {
      toast.push({
        severity: 'warn',
        title: `导入将覆盖「${slot.name}」`,
        detail: '原型阶段未接入文件选择器，导入流程仅保留入口。真实实现会校验存档版本号后写入本地存储。',
      })
    },
    [toast],
  )

  const overwriteSlot = useCallback(
    (slot: SaveSlot) => {
      setSettings((s) => ({
        ...s,
        slots: s.slots.map((x) =>
          x.id === slot.id
            ? { ...x, week: state.week, at: '刚刚', sizeKb: x.sizeKb + 6 }
            : x,
        ),
      }))
      toast.push({
        severity: 'good',
        title: `已覆盖「${slot.name}」`,
        detail: `存档已更新至${weekLabel(state.week)}，大小增加约 6 KB。`,
      })
    },
    [state.week, toast],
  )

  const confirmDeleteSlot = useCallback(() => {
    const slot = deleteSlot
    if (!slot) return
    setSettings((s) => ({ ...s, slots: s.slots.filter((x) => x.id !== slot.id) }))
    setDeleteSlot(null)
    toast.push({
      severity: 'danger',
      title: `已删除存档「${slot.name}」`,
      detail: '该操作不可撤销。其余存档的周次与变量快照不受影响。',
    })
  }, [deleteSlot, toast])

  const confirmFullReset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORE_KEY)
    } catch {
      /* 忽略 */
    }
    setSettings(DEFAULTS)
    setFullResetOpen(false)
    toast.push({
      severity: 'danger',
      title: '全部设置已重置',
      detail: '接口配置、标签集、存档列表与显示偏好均已恢复出厂值，本机存储已清空。',
    })
  }, [toast])

  const fmt = useCallback(
    (n: number) => (settings.display.numberFormat === 'wan' ? money(n, { compact: true }) : money(n, { compact: false })),
    [settings.display.numberFormat],
  )

  const tabItems: TabItem[] = useMemo(
    () => [
      { id: 'api', label: '接口配置', latin: 'API', icon: Plug },
      { id: 'tags', label: '标签集', latin: 'Tags', icon: TagIcon, count: settings.tags.length },
      { id: 'saves', label: '存档', latin: 'Saves', icon: Database, count: settings.slots.length },
      { id: 'display', label: '显示与动效', latin: 'Display', icon: MonitorCog },
      { id: 'about', label: '关于', latin: 'About', icon: Sparkles },
    ],
    [settings.tags.length, settings.slots.length],
  )

  const densityPad: Record<Density, string> = {
    compact: 'p-2.5 text-[0.75rem] leading-snug',
    standard: 'p-4 text-[0.8125rem] leading-relaxed',
    loose: 'p-6 text-[0.875rem] leading-loose',
  }

  return (
    <div>
      <PageHeader
        kicker="设置"
        title="设置"
        latin="CONFIGURATION"
        lede="接口、标签契约、存档与显示偏好都在这里决定。所有内容仅保存在这台机器的浏览器里，本页面不连接任何后端。"
        actions={
          <>
            <Tag tone="ink">原型 · 无后端</Tag>
            <Tag tone="signal">构建 {BUILD}</Tag>
          </>
        }
      />

      <Tabs items={tabItems} active={tab} onChange={setTab} idPrefix="cfg" />

      {/* ============================================================ 接口配置 */}
      <TabPanel idPrefix="cfg" id="api" className="pt-6">
        <aside
          id="cfg-notice-local-only"
          className="p5-shard mb-6 flex flex-col gap-3 border-[3px] border-ink bg-pulse px-4 py-4 sm:flex-row sm:items-center"
        >
          <ShieldCheck size={22} strokeWidth={2.4} className="shrink-0" aria-hidden="true" />
          <p className="text-[0.8125rem] leading-relaxed">
            <strong className="font-head font-800">这是前端原型。</strong>
            此页填写的密钥只会写入本浏览器的 localStorage，不会上传到任何服务器，也没有任何网络请求发生。清除浏览器数据会把它们一并删除。
          </p>
        </aside>

        <div className="grid gap-6 xl:grid-cols-2">
          {(['primary', 'secondary'] as const).map((which) => {
            const p = settings[which]
            const isPrimary = which === 'primary'
            const title = isPrimary ? '主接口' : '次接口'
            const latin = isPrimary ? 'Primary endpoint' : 'Secondary endpoint'
            return (
              <Panel key={which} cut="tr" className="overflow-hidden">
                <PanelHead
                  icon="Server"
                  title={title}
                  latin={latin}
                  right={
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1.5 border-2 border-ink px-2 py-0.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.12em]',
                        p.enabled ? 'bg-jade text-white' : 'bg-paper-dim text-ink/60',
                      )}
                    >
                      {p.enabled ? '已启用' : '未启用'}
                    </span>
                  }
                />

                <div className="border-b-[3px] border-ink/12 bg-paper-dim/40 px-4 py-3">
                  <Switch
                    id={`cfg-${which}-enabled`}
                    checked={p.enabled}
                    onChange={(v) => patchProfile(which, { enabled: v })}
                    label={isPrimary ? '启用主接口' : '启用次接口'}
                    hint={
                      isPrimary
                        ? '承担正文与选项的生成，关闭后剧情无法推进。'
                        : '承担变量提取与本回合总结。关闭或失败时自动回落到主接口。'
                    }
                  />
                </div>

                <form className="grid gap-4 p-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
                  <Field
                    id={`cfg-${which}-base-url`}
                    label="服务地址"
                    hint="需包含版本段，例如 /v1。留空则使用默认地址。"
                    wide
                  >
                    <input
                      id={`cfg-${which}-base-url`}
                      name={`${which}-base-url`}
                      type="url"
                      className="p5-input font-mono text-[0.8125rem]"
                      value={p.baseUrl}
                      onChange={(e) => patchProfile(which, { baseUrl: e.target.value })}
                      placeholder="https://api.example.com/v1"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </Field>

                  <Field id={`cfg-${which}-key`} label="密钥" hint="仅存于本机浏览器。" wide>
                    <div className="flex gap-2">
                      <input
                        id={`cfg-${which}-key`}
                        name={`${which}-key`}
                        type={revealed[which] ? 'text' : 'password'}
                        className="p5-input min-w-0 flex-1 font-mono text-[0.8125rem]"
                        value={p.apiKey}
                        onChange={(e) => patchProfile(which, { apiKey: e.target.value })}
                        placeholder="sk-••••••••••••••••"
                        autoComplete="off"
                        spellCheck={false}
                        aria-describedby={`cfg-${which}-key-note`}
                      />
                      <Btn
                        id={`cfg-${which}-key-toggle`}
                        size="sm"
                        variant="paper"
                        icon={revealed[which] ? EyeOff : Eye}
                        aria-pressed={revealed[which]}
                        onClick={() =>
                          setRevealed((r) =>
                            which === 'primary'
                              ? { ...r, primary: !r.primary }
                              : { ...r, secondary: !r.secondary },
                          )
                        }
                        className="!min-h-[44px] shrink-0"
                      >
                        {revealed[which] ? '隐藏' : '显示'}
                      </Btn>
                    </div>
                    <p id={`cfg-${which}-key-note`} className="mt-1.5 text-[0.75rem] text-ink/50">
                      密钥长度 {p.apiKey.length} 个字符。
                    </p>
                  </Field>

                  <Field id={`cfg-${which}-model`} label="模型名称">
                    <input
                      id={`cfg-${which}-model`}
                      name={`${which}-model`}
                      type="text"
                      className="p5-input font-mono text-[0.8125rem]"
                      value={p.model}
                      onChange={(e) => patchProfile(which, { model: e.target.value })}
                      placeholder="gpt-4o-mini"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </Field>

                  <Field id={`cfg-${which}-timeout`} label="超时（秒）">
                    <input
                      id={`cfg-${which}-timeout`}
                      name={`${which}-timeout`}
                      type="number"
                      min={5}
                      max={300}
                      step={5}
                      className="p5-input tabular font-mono text-[0.8125rem]"
                      value={p.timeout}
                      onChange={(e) =>
                        patchProfile(which, { timeout: Number(e.target.value) || 0 })
                      }
                    />
                  </Field>

                  <Field id={`cfg-${which}-temp`} label="温度" wide>
                    <input
                      id={`cfg-${which}-temp`}
                      name={`${which}-temp`}
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={p.temperature}
                      onChange={(e) =>
                        patchProfile(which, { temperature: Number(e.target.value) })
                      }
                      className="p5-input cursor-pointer accent-signal"
                      aria-describedby={`cfg-${which}-temp-value`}
                    />
                    <p
                      id={`cfg-${which}-temp-value`}
                      className="mt-1.5 flex items-center gap-2 text-[0.75rem] text-ink/60"
                    >
                      <span className="tabular font-mono font-700 text-ink">
                        {p.temperature.toFixed(2)}
                      </span>
                      <span>
                        {p.temperature <= 0.3
                          ? '几乎确定：适合变量与总结'
                          : p.temperature <= 1
                            ? '平衡：叙事与稳定性兼顾'
                            : '发散：更容易出现意外情节'}
                      </span>
                    </p>
                  </Field>

                  <Field id={`cfg-${which}-max-tokens`} label="最大输出（tokens）" wide>
                    <input
                      id={`cfg-${which}-max-tokens`}
                      name={`${which}-max-tokens`}
                      type="number"
                      min={64}
                      max={8192}
                      step={64}
                      className="p5-input tabular font-mono text-[0.8125rem]"
                      value={p.maxTokens}
                      onChange={(e) =>
                        patchProfile(which, { maxTokens: Number(e.target.value) || 0 })
                      }
                    />
                  </Field>

                  <Field id={`cfg-${which}-template`} label="提示词模板" wide>
                    <textarea
                      id={`cfg-${which}-template`}
                      name={`${which}-template`}
                      rows={9}
                      className="p5-input min-h-[12rem] resize-y font-mono text-[0.75rem] leading-relaxed"
                      value={p.template}
                      onChange={(e) => patchProfile(which, { template: e.target.value })}
                      spellCheck={false}
                    />
                  </Field>

                  <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                    <Btn
                      id={`cfg-${which}-test`}
                      variant="ink"
                      icon={testing === which ? LoaderCircle : Waypoints}
                      disabled={testing !== null}
                      onClick={() => runTest(which)}
                    >
                      {testing === which ? '测试中…' : '连接测试'}
                    </Btn>
                    <Btn
                      id={`cfg-${which}-restore-template`}
                      variant="ghost"
                      size="sm"
                      icon={RotateCcw}
                      onClick={() => {
                        patchProfile(which, {
                          template: isPrimary ? TEMPLATE_PRIMARY : TEMPLATE_SECONDARY,
                        })
                        toast.push({
                          severity: 'info',
                          title: '提示词模板已还原',
                          detail:
                            '已恢复到解释 XML 标签契约的默认模板，修改内容被丢弃。',
                        })
                      }}
                    >
                      还原模板
                    </Btn>
                    <span className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
                      模板 {num(p.template.length)} 字符
                    </span>
                  </div>
                </form>
              </Panel>
            )
          })}
        </div>

        <Panel cut="bl" className="mt-6">
          <PanelHead icon="Cpu" title="路由策略" latin="Routing" />
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/55">
                正文与选项
              </p>
              <p className="mt-1 font-head text-[0.9375rem] font-800">主接口</p>
              <p className="mt-1 text-[0.75rem] leading-snug text-ink/55">
                唯一负责推进剧情的通道，失败即本回合中断。
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/55">
                变量与总结
              </p>
              <p className="mt-1 font-head text-[0.9375rem] font-800">次接口优先</p>
              <p className="mt-1 text-[0.75rem] leading-snug text-ink/55">
                可用更便宜的模型。超时或返回不合法时回落主接口。
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/55">
                本文档中的口径
              </p>
              <p className="mt-1 font-head text-[0.9375rem] font-800">回合制</p>
              <p className="mt-1 text-[0.75rem] leading-snug text-ink/55">
                一次玩家输入记为一回合，对应一次存档楼层与一份变量快照。
              </p>
            </div>
          </div>
        </Panel>
      </TabPanel>

      {/* ============================================================== 标签集 */}
      <TabPanel idPrefix="cfg" id="tags" className="pt-6">
        <Panel cut="tr" className="mb-6">
          <PanelHead
            icon="Boxes"
            title="输出标签集"
            latin="Tag contract"
            right={
              <div className="flex items-center gap-2">
                <Tag tone="ink">{settings.tags.length} 个标签</Tag>
                <Btn
                  id="cfg-tags-reset"
                  size="sm"
                  variant="ghost"
                  icon={RotateCcw}
                  onClick={() => setTagResetOpen(true)}
                >
                  恢复默认标签集
                </Btn>
              </div>
            }
          />

          <div className="border-b-[3px] border-ink/12 bg-paper-dim/40 px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="cfg-tags-new-name"
                  className="mb-1.5 block font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60"
                >
                  新标签名
                </label>
                <input
                  id="cfg-tags-new-name"
                  type="text"
                  className="p5-input font-mono text-[0.8125rem]"
                  value={draftTag}
                  onChange={(e) => setDraftTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="weather"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <Btn id="cfg-tags-add" variant="signal" icon={Plus} onClick={addTag}>
                新增标签
              </Btn>
            </div>
            <p className="mt-2 text-[0.75rem] leading-snug text-ink/50">
              仅允许字母、数字、下划线与连字符。新增后需要同步写入提示词模板，模型才会输出它。
            </p>
          </div>

          <ul className="divide-y-[3px] divide-ink/12">
            {settings.tags.map((t) => (
              <li key={t.id} className="px-4 py-4 transition-colors duration-150 hover:bg-paper-dim/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="border-2 border-ink bg-ink px-2 py-0.5 font-mono text-[0.75rem] font-700 text-paper-warm">
                        &lt;{t.name}&gt;
                      </code>
                      {t.required && <Tag tone="signal">必填</Tag>}
                      {t.locked && <Tag tone="ink">核心</Tag>}
                      {t.collapsed && <Tag tone="pulse">折叠显示</Tag>}
                    </div>
                    <p className="mt-2 max-w-[70ch] text-[0.8125rem] leading-relaxed text-ink/70">
                      {t.desc}
                    </p>
                    <p className="mt-2 overflow-x-auto whitespace-nowrap border-l-[3px] border-ink/20 bg-paper/70 px-3 py-2 font-mono text-[0.6875rem] text-ink/70">
                      {t.sample}
                    </p>
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:min-w-[15rem]">
                    <Switch
                      id={`cfg-tag-${t.name}-required`}
                      checked={t.required}
                      onChange={() => toggleTag(t.id, 'required')}
                      label="必填"
                      hint={t.locked ? '核心标签，建议保持必填。' : '缺失时视为本回合生成失败。'}
                    />
                    <Switch
                      id={`cfg-tag-${t.name}-collapsed`}
                      checked={t.collapsed}
                      onChange={() => toggleTag(t.id, 'collapsed')}
                      label="默认折叠"
                      hint="玩家需要手动展开才能看到内容。"
                    />
                    <Btn
                      id={`cfg-tag-${t.name}-delete`}
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      disabled={!!t.locked}
                      onClick={() => removeTag(t)}
                      title={t.locked ? '核心标签不可删除' : `删除标签 ${t.name}`}
                    >
                      删除
                    </Btn>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel cut="bl">
          <PanelHead icon="ScrollText" title="解析优先级" latin="Parse order" />
          <ol className="divide-y-[3px] divide-ink/12">
            {[
              { n: '01', t: 'thinking / think', d: '最先切分，其内部内容不再参与任何后续解析。' },
              { n: '02', t: 'maintext', d: '作为正文容器，未闭合时按已接收内容流式渲染。' },
              { n: '03', t: 'option', d: '按行切分为选项；空行被忽略。' },
              { n: '04', t: 'sum / vars', d: '在回合结束时一次性提交，写入楼层存档与变量表。' },
            ].map((row) => (
              <li key={row.n} className="flex gap-4 px-4 py-3">
                <span className="tabular shrink-0 font-display text-[1.125rem] leading-none text-signal">
                  {row.n}
                </span>
                <div className="min-w-0">
                  <p className="font-head text-[0.875rem] font-800">{row.t}</p>
                  <p className="mt-0.5 text-[0.75rem] leading-snug text-ink/55">{row.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </TabPanel>

      {/* ================================================================ 存档 */}
      <TabPanel idPrefix="cfg" id="saves" className="pt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Panel cut="tr">
            <PanelHead
              icon="Archive"
              title="存档位"
              latin="Save slots"
              right={<Tag tone="ink">共 4 个槽位</Tag>}
            />
            <ul className="divide-y-[3px] divide-ink/12">
              {settings.slots.map((slot, i) => (
                <li key={slot.id} className="px-4 py-4 transition-colors duration-150 hover:bg-paper-dim/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="tabular grid h-10 w-10 shrink-0 place-items-center border-[3px] border-ink bg-paper-warm font-display text-[1rem]">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-head text-[0.9375rem] font-800 leading-tight">
                          {slot.name}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6875rem] font-700 uppercase tracking-[0.1em] text-ink/50">
                          <span className="tabular">第 {slot.week} 周</span>
                          <span>{slot.at}</span>
                          <span className="tabular">{slot.sizeKb} KB</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Btn
                        id={`cfg-save-export-${i + 1}`}
                        size="sm"
                        icon={Download}
                        onClick={() => exportSlot(slot)}
                      >
                        导出
                      </Btn>
                      <Btn
                        id={`cfg-save-import-${i + 1}`}
                        size="sm"
                        icon={Upload}
                        onClick={() => importSlot(slot)}
                      >
                        导入
                      </Btn>
                      <Btn
                        id={`cfg-save-overwrite-${i + 1}`}
                        size="sm"
                        icon={Save}
                        onClick={() => overwriteSlot(slot)}
                      >
                        覆盖
                      </Btn>
                      <Btn
                        id={`cfg-save-delete-${i + 1}`}
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => setDeleteSlot(slot)}
                      >
                        删除
                      </Btn>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="flex flex-col gap-6">
            <Panel cut="bl">
              <PanelHead title="自动存档" latin="Autosave" />
              <div className="flex flex-col gap-5 p-4">
                <Switch
                  id="cfg-saves-autosave"
                  checked={settings.autoSave}
                  onChange={(v) => setSettings((s) => ({ ...s, autoSave: v }))}
                  label="启用自动存档"
                  hint="每完成指定回合数自动写入当前进度。"
                />

                <div>
                  <label
                    htmlFor="cfg-saves-frequency"
                    className="mb-1.5 block font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60"
                  >
                    频率
                  </label>
                  <select
                    id="cfg-saves-frequency"
                    className="p5-input"
                    value={settings.autoSaveEvery}
                    disabled={!settings.autoSave}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, autoSaveEvery: e.target.value }))
                    }
                  >
                    {['每回合', '每 3 回合', '每 5 回合', '每 10 回合'].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[0.75rem] text-ink/50">
                    {settings.autoSave
                      ? `当前策略：${settings.autoSaveEvery}自动写入，覆盖最早的手动存档之外的一个临时位。`
                      : '自动存档已关闭，进度仅在你手动覆盖存档位时保留。'}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="cfg-saves-path"
                    className="mb-1.5 block font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60"
                  >
                    存档位置
                  </label>
                  <input
                    id="cfg-saves-path"
                    type="text"
                    readOnly
                    className="p5-input cursor-not-allowed bg-paper-dim font-mono text-[0.75rem]"
                    value={settings.savePath}
                  />
                  <p className="mt-1.5 text-[0.75rem] text-ink/50">
                    原型阶段固定为浏览器本地存储，无法更改。
                  </p>
                </div>
              </div>
            </Panel>

            <Panel cut="bl">
              <PanelHead title="存储用量" latin="Usage" />
              <div className="flex flex-col gap-4 p-4">
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/55">
                      已用 / 上限
                    </span>
                    <span className="tabular font-mono text-[0.6875rem] font-700">
                      {num(settings.slots.reduce((s, x) => s + x.sizeKb, 0))} / 5,120 KB
                    </span>
                  </div>
                  <Meter
                    id="cfg-saves-usage-meter"
                    value={settings.slots.reduce((s, x) => s + x.sizeKb, 0)}
                    max={5120}
                    tone="signal"
                    height={14}
                    label="本地存储用量"
                  />
                </div>
                <p className="text-[0.75rem] leading-snug text-ink/55">
                  数值由本页设定的四个存档位大小推算，用于演示存储压力。达到上限后新的自动存档会失败并提示。
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </TabPanel>

      {/* ========================================================== 显示与动效 */}
      <TabPanel idPrefix="cfg" id="display" className="pt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Panel cut="tr">
            <PanelHead icon="Palette" title="显示与动效" latin="Display & motion" />
            <div className="flex flex-col divide-y-[3px] divide-ink/12">
              <fieldset className="px-4 py-5">
                <legend className="mb-3 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60">
                  动效强度
                </legend>
                <RadioRow<MotionLevel>
                  name="cfg-display-motion"
                  value={settings.display.motion}
                  onChange={(v) => patchDisplay({ motion: v })}
                  options={[
                    { value: 'full', label: '完整', hint: '保留全部转场与微交互。' },
                    { value: 'reduced', label: '精简', hint: '只保留必要的状态变化。' },
                    { value: 'off', label: '关闭', hint: '等同系统"减少动态效果"。' },
                  ]}
                />
                <p className="mt-3 text-[0.75rem] leading-snug text-ink/50">
                  选择「关闭」时会同时遵循系统的 prefers-reduced-motion 设置，两者任一命中都会停用动画。
                </p>
              </fieldset>

              <fieldset className="px-4 py-5">
                <legend className="mb-3 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60">
                  界面密度
                </legend>
                <RadioRow<Density>
                  name="cfg-display-density"
                  value={settings.display.density}
                  onChange={(v) => patchDisplay({ density: v })}
                  options={[
                    { value: 'compact', label: '紧凑', hint: '信息密度优先。' },
                    { value: 'standard', label: '标准', hint: '默认间距与行高。' },
                    { value: 'loose', label: '宽松', hint: '适合长时间阅读。' },
                  ]}
                />
              </fieldset>

              <fieldset className="px-4 py-5">
                <legend className="mb-3 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60">
                  数字显示
                </legend>
                <RadioRow<NumberFormat>
                  name="cfg-display-number"
                  value={settings.display.numberFormat}
                  onChange={(v) => patchDisplay({ numberFormat: v })}
                  options={[
                    { value: 'full', label: '完整', hint: '¥1,284,600' },
                    { value: 'wan', label: '万元', hint: '¥128.5 万' },
                  ]}
                />
              </fieldset>

              <fieldset className="px-4 py-5">
                <legend className="mb-3 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/60">
                  字号
                </legend>
                <RadioRow<FontScale>
                  name="cfg-display-fontscale"
                  value={settings.display.fontScale}
                  onChange={(v) => patchDisplay({ fontScale: v })}
                  options={[
                    { value: 'standard', label: '标准', hint: '正文 16px。' },
                    { value: 'large', label: '大', hint: '正文 18px，便于长时间阅读。' },
                  ]}
                />
              </fieldset>

              <div className="flex flex-col gap-5 px-4 py-5">
                <Switch
                  id="cfg-display-contrast"
                  checked={settings.display.highContrast}
                  onChange={(v) => patchDisplay({ highContrast: v })}
                  label="高对比模式"
                  hint="加粗描边并提高前景对比，适合强光环境。"
                />
                <Switch
                  id="cfg-display-halftone"
                  checked={settings.display.halftone}
                  onChange={(v) => patchDisplay({ halftone: v })}
                  label="半调网点底纹"
                  hint="在面板与头像上叠加网点纹理，关闭后界面更干净。"
                />
              </div>
            </div>
          </Panel>

          <div className="flex flex-col gap-6">
            <Panel cut="bl">
              <PanelHead title="实时预览" latin="Preview" />
              <div
                id="cfg-display-preview"
                className={clsx(
                  'border-t-0 p-4',
                  settings.display.highContrast && 'border-[3px] border-ink bg-paper',
                )}
              >
                <div
                  className={clsx(
                    'relative border-[3px] border-ink bg-paper-warm shadow-hard',
                    settings.display.halftone && 'p5-noise',
                    densityPad[settings.display.density],
                  )}
                >
                  {settings.display.halftone && (
                    <span
                      aria-hidden="true"
                      className="p5-halftone absolute inset-0 opacity-[0.07]"
                    />
                  )}
                  <p
                    className={clsx(
                      'font-head font-800',
                      settings.display.fontScale === 'large' ? 'text-[1.125rem]' : 'text-[0.9375rem]',
                    )}
                  >
                    雨巷食堂 · 第 2 章
                  </p>
                  <p
                    className={clsx(
                      'mt-2 leading-relaxed text-ink/70',
                      settings.display.fontScale === 'large' ? 'text-[1.125rem]' : 'text-[0.8125rem]',
                    )}
                  >
                    她把伞靠在门边，水顺着伞骨淌下来，在水泥地上积成一小片深色。灶上的汤还是滚的。
                  </p>
                  <p className="tabular mt-3 font-mono text-[0.6875rem] font-700 uppercase tracking-[0.12em] text-ink/50">
                    现金 {fmt(state.money)} · 密度 {settings.display.density} · 字号{' '}
                    {settings.display.fontScale === 'large' ? '大' : '标准'}
                  </p>
                </div>
                <p className="mt-3 text-[0.75rem] leading-snug text-ink/55">
                  预览实时反映密度、字号、网点与对比设置；其他页面的正文排版会同步变化。
                </p>
              </div>
            </Panel>

            <Panel cut="bl">
              <PanelHead title="对比度自检" latin="Contrast" />
              <div className="grid gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center border-[3px] border-ink bg-signal font-display text-[0.875rem] text-white"
                  >
                    白
                  </span>
                  <p className="text-[0.75rem] leading-snug text-ink/60">
                    正文使用纯黑到 72% 的墨色区间，任何一档都高于 4.5:1。
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center border-[3px] border-ink bg-pulse font-display text-[0.875rem] text-ink"
                  >
                    黑
                  </span>
                  <p className="text-[0.75rem] leading-snug text-ink/60">
                    强调色（信号红、脉冲黄）只用于色块与描边，不承载小字号正文。
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center border-[3px] border-ink bg-ink font-display text-[0.875rem] text-paper-warm"
                  >
                    反
                  </span>
                  <p className="text-[0.75rem] leading-snug text-ink/60">
                    反色面板一律使用奶油白文字，避免在纯黑上出现灰字。
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </TabPanel>

      {/* ================================================================ 关于 */}
      <TabPanel idPrefix="cfg" id="about" className="pt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Panel cut="tr">
            <PanelHead icon="Boxes" title="关于本原型" latin="About" />
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Slab tone="signal">{state.studio.name}</Slab>
                <Tag tone="ink">版本 0.1.0</Tag>
                <Tag tone="paper">构建 {BUILD}</Tag>
              </div>

              <p className="mt-4 max-w-[68ch] text-[0.875rem] leading-relaxed text-ink/70">
                这是一套只包含前端的交互原型，用于验证"以 LLM 对话为核心驱动的游戏工作室模拟经营"这一玩法的界面骨架。
                工作室的建筑拓建、人员调配、剧情工坊与市场反馈都只在本机内存中推演，没有任何后端服务、数据库或网络请求。
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { k: '技术栈', v: 'React + Vite + Tailwind' },
                  { k: '数据来源', v: '内存中的固定示例数据' },
                  { k: '持久化', v: '仅本页设置写入 localStorage' },
                ].map((row) => (
                  <div key={row.k} className="border-[3px] border-ink bg-paper px-3 py-2.5">
                    <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
                      {row.k}
                    </p>
                    <p className="mt-0.5 font-head text-[0.8125rem] font-800">{row.v}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t-[3px] border-ink/12 pt-4">
                <p className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
                  制作
                </p>
                <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {[
                    { role: '企划与数值', who: '罗晚' },
                    { role: '界面与交互', who: '安折' },
                    { role: '视觉与设计系统', who: '明濑' },
                    { role: '叙事与文案', who: '苏黎' },
                    { role: '构建与工具链', who: '卫子谦' },
                    { role: '质量管理', who: '何知遥' },
                  ].map((c) => (
                    <li key={c.role} className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[0.6875rem] font-700 uppercase tracking-[0.12em] text-ink/45">
                        {c.role}
                      </span>
                      <span className="font-head text-[0.8125rem] font-800">{c.who}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>

          <div className="flex flex-col gap-6">
            <Panel cut="bl">
              <PanelHead title="更新记录" latin="Changelog" />
              <ol className="divide-y-[3px] divide-ink/12">
                {[
                  {
                    v: '0.1.0',
                    d: '今天',
                    items: [
                      '工作室建筑支持向上、向下拓建楼层，向左、向右拓建房间。',
                      '剧情工坊接入主接口与次接口的分流设定与标签契约。',
                      '全局应用内通知系统上线，替换全部浏览器原生弹窗。',
                    ],
                  },
                  {
                    v: '0.0.3',
                    d: '3 天前',
                    items: [
                      '人员页加入四维属性、专长与履历，支持分配与休整。',
                      '市场页加入竞品对比与销量曲线。',
                    ],
                  },
                  {
                    v: '0.0.1',
                    d: '上周',
                    items: ['建立 P5R 风格设计系统：0 圆角、硬偏移阴影、机械按压反馈。'],
                  },
                ].map((rel) => (
                  <li key={rel.v} className="px-4 py-4">
                    <div className="flex items-baseline gap-2">
                      <span className="tabular font-display text-[1rem] text-signal">{rel.v}</span>
                      <span className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
                        {rel.d}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {rel.items.map((it) => (
                        <li key={it} className="flex gap-2 text-[0.75rem] leading-snug text-ink/65">
                          <span
                            aria-hidden="true"
                            className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 bg-signal"
                          />
                          {it}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel cut="bl">
              <PanelHead icon="Bug" title="危险操作" latin="Danger zone" />
              <div className="p-4">
                <div className="flex items-start gap-3 border-[3px] border-signal bg-signal/8 p-3">
                  <CircleAlert
                    size={20}
                    strokeWidth={2.4}
                    className="mt-0.5 shrink-0 text-signal"
                    aria-hidden="true"
                  />
                  <p className="text-[0.75rem] leading-relaxed text-ink/70">
                    重置会清空本机保存的全部设置，并恢复接口、标签集与显示偏好的默认值。此操作不可撤销。
                  </p>
                </div>
                <Btn
                  id="cfg-about-reset-all"
                  variant="signal"
                  icon={RotateCcw}
                  className="mt-4 w-full"
                  onClick={() => setFullResetOpen(true)}
                >
                  重置全部设置
                </Btn>
              </div>
            </Panel>
          </div>
        </div>
      </TabPanel>

      {/* ============================================================== 模态框 */}

      <Modal
        open={tagResetOpen}
        onClose={() => setTagResetOpen(false)}
        kicker="Tags"
        title="恢复默认标签集"
        latin="Reset tag contract"
        size="sm"
        footer={
          <>
            <Btn id="cfg-modal-tag-reset-cancel" onClick={() => setTagResetOpen(false)}>
              取消
            </Btn>
            <Btn
              id="cfg-modal-tag-reset-confirm"
              variant="signal"
              icon={RotateCcw}
              onClick={resetTags}
            >
              确认恢复
            </Btn>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <TagIcon size={22} strokeWidth={2.4} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" />
          <div>
            <p className="text-[0.875rem] leading-relaxed text-ink/80">
              当前标签集共 {settings.tags.length} 个，其中自定义标签{' '}
              {settings.tags.filter((t) => !DEFAULT_TAGS.some((d) => d.name === t.name)).length} 个。
              恢复默认后，自定义标签会被移除，必填与折叠状态全部回到出厂设定。
            </p>
            <ul className="mt-3 space-y-1">
              {DEFAULT_TAGS.map((t) => (
                <li key={t.id} className="flex items-center gap-2 font-mono text-[0.6875rem] text-ink/60">
                  <BadgeCheck size={13} strokeWidth={2.6} aria-hidden="true" />
                  &lt;{t.name}&gt;
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteSlot !== null}
        onClose={() => setDeleteSlot(null)}
        kicker="Saves"
        title="删除存档"
        latin="Delete save slot"
        size="sm"
        footer={
          <>
            <Btn id="cfg-modal-save-delete-cancel" onClick={() => setDeleteSlot(null)}>
              取消
            </Btn>
            <Btn
              id="cfg-modal-save-delete-confirm"
              variant="signal"
              icon={Trash2}
              onClick={confirmDeleteSlot}
            >
              确认删除
            </Btn>
          </>
        }
      >
        {deleteSlot && (
          <div className="flex items-start gap-3">
            <CircleAlert
              size={22}
              strokeWidth={2.4}
              className="mt-0.5 shrink-0 text-signal"
              aria-hidden="true"
            />
            <p className="text-[0.875rem] leading-relaxed text-ink/80">
              即将删除存档
              <strong className="font-head font-800">「{deleteSlot.name}」</strong>
              ，该存档记录在第 {deleteSlot.week} 周，占用 {deleteSlot.sizeKb} KB。删除后无法恢复，其余
              {settings.slots.length - 1} 个存档不受影响。
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={fullResetOpen}
        onClose={() => setFullResetOpen(false)}
        kicker="Danger zone"
        title="重置全部设置"
        latin="Reset everything"
        size="sm"
        footer={
          <>
            <Btn id="cfg-modal-full-reset-cancel" onClick={() => setFullResetOpen(false)}>
              取消
            </Btn>
            <Btn
              id="cfg-modal-full-reset-confirm"
              variant="signal"
              icon={RotateCcw}
              onClick={confirmFullReset}
            >
              我确认，全部重置
            </Btn>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <CircleAlert
            size={22}
            strokeWidth={2.4}
            className="mt-0.5 shrink-0 text-signal"
            aria-hidden="true"
          />
          <div>
            <p className="text-[0.875rem] leading-relaxed text-ink/80">
              将清空本机存储中的
              <code className="mx-1 border-2 border-ink bg-paper px-1.5 py-0.5 font-mono text-[0.75rem]">
                {STORE_KEY}
              </code>
              ，并把接口配置、标签集、存档列表与显示偏好恢复为默认值。
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink/60">
              已填写的接口密钥会一并丢失，需要重新输入。
            </p>
            <Kicker className="mt-3">此操作不可撤销</Kicker>
          </div>
        </div>
      </Modal>
    </div>
  )
}
