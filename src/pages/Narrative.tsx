import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  AlertTriangle,
  BookMarked,
  Check,
  GitBranch,
  RefreshCw,
  ScrollText,
  ThumbsDown,
  Wand2,
} from 'lucide-react'
import { useGame } from '../lib/store'
import { useToast } from '../lib/toast'
import { num } from '../lib/format'
import type { Chapter } from '../data/types'
import {
  Avatar,
  Btn,
  EmptyState,
  Meter,
  Modal,
  PageHeader,
  Panel,
  PanelHead,
  StatTile,
  TabPanel,
  Tabs,
  Tag,
} from '../lib/ui'
import { SeverityMark } from '../components/SeverityMark'

const CHAPTER_STATUS: Record<
  Chapter['status'],
  { label: string; tone: 'jade' | 'pulse' | 'ice' }
> = {
  done: { label: '定稿', tone: 'jade' },
  writing: { label: '撰写中', tone: 'pulse' },
  outline: { label: '大纲', tone: 'ice' },
}

const BEAT_KIND: Record<
  Chapter['beats'][number]['kind'],
  { label: string; tone: 'ink' | 'signal' | 'royal' | 'ice' }
> = {
  scene: { label: '场景', tone: 'ink' },
  choice: { label: '选择', tone: 'signal' },
  reveal: { label: '揭示', tone: 'royal' },
  branch: { label: '分支', tone: 'ice' },
}

interface LoreEntry {
  id: string
  book: string
  keys: string[]
  title: string
  body: string
  priority: number
  tokens: number
  active: boolean
}

const LORE: LoreEntry[] = [
  {
    id: 'lb-1',
    book: '雨巷街景 · 器物',
    keys: ['铁锅', '灶台', '菜单'],
    title: '灶台与那口铁锅',
    body: '食堂的灶台是 1998 年留下的，铸铁锅边缘有一道缺口。主角只在雨天用它做汤——这是全作唯一一个从未被解释过的习惯。',
    priority: 9,
    tokens: 142,
    active: true,
  },
  {
    id: 'lb-2',
    book: '雨巷街景 · 器物',
    keys: ['照片', '抽屉', '1998'],
    title: '抽屉里的旧照片',
    body: '照片上有两个人，右侧那位的脸被水渍糊掉了。背面写着"给以后的人"。玩家永远不会被直接告知被糊掉的是谁。',
    priority: 10,
    tokens: 188,
    active: true,
  },
  {
    id: 'lb-3',
    book: '叙事规则',
    keys: ['记忆', '交换', '忘记'],
    title: '记忆交换规则',
    body: '主角的记忆不是丢失，而是与客人发生了交换。每次交换都会让主角少记住一张脸，同时多记住一件客人的事。这条规则不允许在正文里被角色直接说明。',
    priority: 10,
    tokens: 226,
    active: true,
  },
  {
    id: 'lb-4',
    book: '叙事规则',
    keys: ['雨', '开门', '营业'],
    title: '只在雨天营业',
    body: '食堂的营业条件只有一个：下雨。雨停则打烊，无论锅内还剩多少。这条设定用于控制单章时长与情绪密度。',
    priority: 8,
    tokens: 96,
    active: false,
  },
  {
    id: 'lb-5',
    book: '角色 · 常客',
    keys: ['不肯点单的女人', '她', '短发'],
    title: '不肯点单的女人',
    body: '她的说话方式极短，最多七字一句。全作中她只主动提问过三次，其中一次在第三章。不要让她解释自己的动机。',
    priority: 9,
    tokens: 164,
    active: true,
  },
  {
    id: 'lb-6',
    book: '角色 · 常客',
    keys: ['气象站值班员', '值班表'],
    title: '气象站值班员',
    body: '他每周三来，总坐同一个位置，从不多点。他知道雨什么时候停——因为他在山上记录天气。他与主角的交换发生在第二章之后。',
    priority: 7,
    tokens: 178,
    active: true,
  },
]

interface ConsistencyIssue {
  id: string
  severity: 'danger' | 'warn' | 'info' | 'good'
  title: string
  detail: string
  where: string
  fix: string
}

const ISSUES: ConsistencyIssue[] = [
  {
    id: 'ci-1',
    severity: 'danger',
    title: '角色语气漂移：不肯点单的女人',
    detail:
      '该角色的既有台词最长为 7 字，意见稿第二章第 14 节出现一句 21 字的说明性台词，且包含对动机的直接解释。',
    where: '第二章 · 第 14 节',
    fix: '拆分为三句短句，或删除动机解释改用动作代替。',
  },
  {
    id: 'ci-2',
    severity: 'warn',
    title: '时间线冲突：雨停时刻',
    detail: '第一章设定雨在打烊前停，第二章同一场雨持续至次日清晨，两处相隔不到三章。',
    where: '第一章 / 第二章 交界',
    fix: '在第二章补一句过渡，说明这是另一场雨，或调整第一章的收尾。',
  },
  {
    id: 'ci-3',
    severity: 'warn',
    title: '变量越界：好感度',
    detail: '当前变量 `affection` 在两次连续选择中跳升了 34 点，超出单次变动上限 15。',
    where: '第二章 · 分支 B → C',
    fix: '下调分支 C 的加成至 8，或增加一次中间事件作为过渡。',
  },
  {
    id: 'ci-4',
    severity: 'info',
    title: '不可达分支：第三章 · 选项三',
    detail: '该分支的前置条件要求 `photo_seen = true`，但同章内没有任何路径能设置该变量。',
    where: '第三章 · 选项三',
    fix: '在第二章的"是否追问照片"处补充赋值。',
  },
  {
    id: 'ci-5',
    severity: 'good',
    title: '标签契约检查通过',
    detail: '全部 42 个节拍均只使用已声明的 6 个标签，未发现嵌套或未闭合标签。',
    where: '全篇',
    fix: '无需处理。',
  },
]

const CONTEXT_OPTIONS = [
  { id: 'lore', label: '启用世界书', detail: `${LORE.filter((l) => l.active).length} 本已激活`, on: true },
  { id: 'vars', label: '注入当前变量', detail: 'hp / mood / affection', on: true },
  { id: 'cards', label: '注入角色卡', detail: '2 张角色卡', on: true },
  { id: 'summary', label: '注入前情提要', detail: '最近 3 节摘要', on: false },
]

const GENRE_PRESETS = [
  '续写本节的下一段正文，保持不大于 120 字',
  '把这一节改写成选项分支，给出 3 个互斥选项',
  '检查本节是否违反世界书中的叙事规则，并只输出问题',
  '为这个场景补一句本回合总结（sum 标签）',
  '把这段对话按角色卡的语气重写一遍',
]

/** 生成台的模拟输出（原型数据，按查询内容挑选） */
const SIM_RESPONSE: Record<string, string> = {
  '续写本节的下一段正文，保持不大于 120 字':
    '<maintext>\n雨小了一点，但还没停。她把碗往柜台内侧推了半寸，像是替它躲雨。\n我假装没看见。灶上的汤开始响。\n她忽然说：「今天不点了。」\n\n我还是盛了一碗。放在她手边，没说话。\n第七个雨夜，我第一次先开口。\n</maintext>\n<sum>她第一次拒绝了点单，而主角第一次主动打破了沉默。</sum>\n<vars>{ "affection": 8, "silence_broken": true }</vars>',
  '把这一节改写成选项分支，给出 3 个互斥选项':
    '<maintext>\n她把碗推回来的时候，指尖碰到了碗沿。汤晃了一下。\n</maintext>\n<option>收回碗，当作什么都没发生\n把碗推回去，等她开口\n问一句：「你是不是认识我。」</option>\n<sum>三个选项分别走向回避、等待与直问，对应不同的记忆代价。</sum>\n<vars>{ "branch_point": "c2_b14" }</vars>',
  '检查本节是否违反世界书中的叙事规则，并只输出问题':
    '<thinking>\n逐条比对激活的世界书条目：\n1. 「记忆交换规则」要求规则不得被角色直接说明 —— 本节违规，台词"我记得你，因为我拿了你的记忆"属直接说明。\n2. 角色卡「不肯点单的女人」限制单句 ≤7 字 —— 本节第 3 句为 21 字，违规。\n3. 「只在雨天营业」—— 本节场景在雨中进行，通过。\n</thinking>\n<sum>发现 2 处规则违反，均集中在同一段对话内。</sum>',
  '为这个场景补一句本回合总结（sum 标签）':
    '<sum>雨没停，但两个人的沉默停了一瞬。</sum>',
  '把这段对话按角色卡的语气重写一遍':
    '<maintext>\n「不点。」\n「……哦。」\n风把门吹开了一条缝。\n我起身去关，她没有看我，但也没有走。\n</maintext>\n<sum>用四句对白与一个动作，替换了原先的说明性段落。</sum>',
}

export default function Narrative() {
  const { state, dispatch } = useGame()
  const toast = useToast()

  const writer = state.staff.find((s) => s.role === 'writer')
  const writerName = writer?.name ?? '剧情主笔'
  const writerTitle = writer?.title ?? '叙事'

  const [tab, setTab] = useState('chapters')
  const [selected, setSelected] = useState<string>(state.chapters[0]?.id ?? '')
  const [prompt, setPrompt] = useState(GENRE_PRESETS[0])
  const [context, setContext] = useState(CONTEXT_OPTIONS)
  const [model, setModel] = useState('primary')
  const [temp, setTemp] = useState(0.8)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [loreFilter, setLoreFilter] = useState('')
  const [loreDetail, setLoreDetail] = useState<LoreEntry | null>(null)
  const [issueDetail, setIssueDetail] = useState<ConsistencyIssue | null>(null)
  const [resultOpen, setResultOpen] = useState(false)

  const timer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const chapter = state.chapters.find((c) => c.id === selected) ?? state.chapters[0]

  const totals = useMemo(() => {
    const words = state.chapters.reduce((s, c) => s + c.wordCount, 0)
    const branches = state.chapters.reduce((s, c) => s + c.branches, 0)
    const beats = state.chapters.reduce((s, c) => s + c.beats.length, 0)
    return { words, branches, beats }
  }, [state.chapters])

  const filteredLore = useMemo(() => {
    const q = loreFilter.trim().toLowerCase()
    if (!q) return LORE
    return LORE.filter((l) =>
      `${l.title}${l.book}${l.keys.join('')}${l.body}`.toLowerCase().includes(q),
    )
  }, [loreFilter])

  function runGenerate() {
    if (pending) return
    setPending(true)
    setResult(null)
    timer.current = window.setTimeout(() => {
      const out =
        SIM_RESPONSE[prompt] ??
        '<maintext>\n（根据当前提示生成的正文段落。请在真实接入后替换为模型输出。）\n</maintext>\n<sum>已按提示生成候选内容。</sum>'
      setResult(out)
      setPending(false)
      toast.push({
        severity: 'good',
        title: '生成完成，等待复核',
        detail: `模型 ${model === 'primary' ? '主接口' : '次接口'} · 温度 ${temp.toFixed(1)} · 输入约 ${(prompt.length / 1.6 + 320).toFixed(0)} tokens。请检查标签闭合与规则一致性后再采纳。`,
        action: { label: '打开复核', run: () => setResultOpen(true) },
        group: 'gen',
      })
    }, 1250)
  }

  return (
    <>
      <PageHeader
        kicker="剧情工坊"
        title="叙事与生成"
        latin="NARRATIVE WORKSHOP / LLM-DRIVEN"
        lede={`这是整部作品的写作现场。${state.chapters.length} 章、约 ${num(totals.words)} 字、${totals.branches} 个分支节点。生成的每一段文本都会先进入候选区，通过规则校验后才会被采纳为正式节拍。`}
        actions={
          <Btn
            id="nar-goto-console"
            variant="signal"
            icon={Wand2}
            onClick={() => setTab('console')}
          >
            打开生成台
          </Btn>
        }
      />

      <section aria-labelledby="nar-kpi" className="mb-6">
        <h2 id="nar-kpi" className="sr-only">
          叙事指标
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            id="nar-tile-chapters"
            icon={ScrollText}
            label="章节"
            value={String(state.chapters.length)}
            unit="章"
            hint={`${state.chapters.filter((c) => c.status === 'done').length} 章已定稿`}
          />
          <StatTile
            id="nar-tile-words"
            icon={BookMarked}
            label="累计字数"
            value={num(totals.words)}
            hint={`平均每章 ${Math.round(totals.words / Math.max(1, state.chapters.length))} 字`}
          />
          <StatTile
            id="nar-tile-branches"
            icon={GitBranch}
            label="分支节点"
            value={String(totals.branches)}
            tone="ink"
            hint={`共 ${totals.beats} 个节拍`}
          />
          <StatTile
            id="nar-tile-issues"
            icon={AlertTriangle}
            label="待处理一致性问题"
            value={String(ISSUES.filter((i) => i.severity === 'danger' || i.severity === 'warn').length)}
            tone="signal"
            hint="其中 1 项为高危，建议在采纳新内容前处理"
          />
        </div>
      </section>

      <Tabs
        idPrefix="nar"
        active={tab}
        onChange={setTab}
        items={[
          { id: 'chapters', label: '章节', latin: 'Chapters', count: state.chapters.length },
          { id: 'console', label: '生成台', latin: 'Console' },
          { id: 'lore', label: '世界书', latin: 'Lorebook', count: LORE.length },
          { id: 'check', label: '一致性', latin: 'Consistency', count: ISSUES.length },
        ]}
        className="mb-5"
      />

      {/* ---------------------------------------------------------- 章节 */}
      <TabPanel idPrefix="nar" id="chapters">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] [&>*]:min-w-0">
          <Panel cut="tr">
            <PanelHead
              icon="ScrollText"
              title="章节树"
              latin="Chapter tree"
              right={<Tag tone="ink">{state.chapters.length}</Tag>}
            />
            <ol className="divide-y-[3px] divide-ink/10">
              {state.chapters.map((c) => {
                const on = c.id === chapter?.id
                const st = CHAPTER_STATUS[c.status]
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      id={`nar-chapter-${c.id}`}
                      aria-pressed={on}
                      onClick={() => setSelected(c.id)}
                      className={clsx(
                        'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150',
                        on ? 'bg-ink text-paper-warm' : 'hover:bg-paper-dim/60',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          'grid h-8 w-8 shrink-0 place-items-center border-[3px] font-mono text-[0.6875rem] font-700',
                          on ? 'border-paper-warm/45' : 'border-ink',
                        )}
                      >
                        {String(c.index).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-head text-[0.875rem] font-800">
                          {c.title}
                        </span>
                        <span
                          className={clsx(
                            'mt-0.5 block truncate text-[0.75rem]',
                            on ? 'text-paper-warm/60' : 'text-ink/60',
                          )}
                        >
                          {c.summary}
                        </span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <Tag tone={st.tone}>{st.label}</Tag>
                          <span
                            className={clsx(
                              'tabular font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em]',
                              on ? 'text-paper-warm/55' : 'text-ink/45',
                            )}
                          >
                            {c.wordCount ? `${num(c.wordCount)} 字` : '未起笔'} · {c.branches} 分支
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </Panel>

          {chapter ? (
            <div className="flex flex-col gap-5">
              <Panel cut="tr">
                <PanelHead
                  icon="GitBranch"
                  title={chapter.title}
                  latin={`${chapter.beats.length} beats`}
                  right={
                    <div className="flex gap-1.5">
                      {(Object.keys(CHAPTER_STATUS) as Chapter['status'][]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          id={`nar-set-status-${chapter.id}-${s}`}
                          aria-pressed={chapter.status === s}
                          onClick={() => {
                            dispatch({ type: 'setChapterStatus', chapterId: chapter.id, status: s })
                            toast.push({
                              severity: 'info',
                              title: `《${chapter.title}》状态已改为「${CHAPTER_STATUS[s].label}」`,
                              detail: '状态变更会同步到研发看板的叙事交付项。',
                              group: 'chapter-status',
                            })
                          }}
                          className={clsx(
                            'border-[3px] px-2 py-1 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.12em] transition-colors duration-150',
                            chapter.status === s
                              ? 'border-ink bg-signal text-white'
                              : 'border-ink/30 hover:border-ink',
                          )}
                        >
                          {CHAPTER_STATUS[s].label}
                        </button>
                      ))}
                    </div>
                  }
                />
                <p className="border-b-[3px] border-ink/10 px-4 py-3 text-[0.875rem] leading-relaxed text-ink/72">
                  {chapter.summary}
                </p>
                <ol className="divide-y-[3px] divide-ink/10">
                  {chapter.beats.map((b, i) => {
                    const kind = BEAT_KIND[b.kind]
                    return (
                      <li key={b.id} className="flex gap-3.5 px-4 py-3.5">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center border-[3px] border-ink font-mono text-[0.625rem] font-700"
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Tag tone={kind.tone}>{kind.label}</Tag>
                            <span className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                              {b.id.toUpperCase()}
                            </span>
                          </div>
                          <p className="mt-1.5 whitespace-pre-line text-[0.875rem] leading-relaxed text-ink/78">
                            {b.text}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </Panel>

              <Panel tone="ink" cut="bl">
                <PanelHead
                  tone="ink"
                  icon="BookMarked"
                  title="本节启用中的世界书"
                  latin="Active lore at this chapter"
                />
                <ul className="divide-y-[3px] divide-paper-warm/15">
                  {LORE.filter((l) => l.active).map((l) => (
                    <li key={l.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0">
                          <SeverityMark severity="info" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-head text-[0.875rem] font-800">{l.title}</p>
                          <p className="mt-0.5 text-[0.75rem] text-paper-warm/60">
                            {l.book} · 优先级 {l.priority} · 约 {l.tokens} tokens
                          </p>
                          <ul className="mt-1.5 flex flex-wrap gap-1.5">
                            {l.keys.map((k) => (
                              <li key={k}>
                                <Tag
                                  tone="ink"
                                  className="!border-paper-warm/40 !bg-ink !text-paper-warm"
                                >
                                  {k}
                                </Tag>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="border-t-[3px] border-paper-warm/15 px-4 py-3 text-[0.75rem] leading-relaxed text-paper-warm/60">
                  本节会注入约{' '}
                  <span className="tabular font-mono font-700">
                    {LORE.filter((l) => l.active).reduce((s, l) => s + l.tokens, 0)}
                  </span>{' '}
                  tokens 的世界书内容。优先级高的条目在预算不足时会被优先保留。
                </p>
              </Panel>
            </div>
          ) : (
            <EmptyState icon={ScrollText} title="没有可编辑的章节" />
          )}
        </div>
      </TabPanel>

      {/* ---------------------------------------------------------- 生成台 */}
      <TabPanel idPrefix="nar" id="console">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] [&>*]:min-w-0">
          <div className="flex flex-col gap-5">
            <Panel cut="tr">
              <PanelHead icon="Sparkles" title="生成参数" latin="Generation" />
              <div className="space-y-4 p-4">
                <label htmlFor="nar-console-prompt" className="block">
                  <span className="mb-1.5 block font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
                    指令
                  </span>
                  <textarea
                    id="nar-console-prompt"
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="p5-input resize-y"
                  />
                </label>

                <div>
                  <p className="mb-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
                    快捷指令
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {GENRE_PRESETS.map((p, i) => (
                      <li key={p}>
                        <button
                          type="button"
                          id={`nar-preset-${i}`}
                          aria-pressed={prompt === p}
                          onClick={() => setPrompt(p)}
                          className={clsx(
                            'min-h-[32px] border-2 px-2 py-1 text-left text-[0.6875rem] leading-snug transition-colors duration-150',
                            prompt === p
                              ? 'border-ink bg-signal text-white'
                              : 'border-ink/30 hover:border-ink',
                          )}
                        >
                          {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <label htmlFor="nar-model" className="block">
                  <span className="mb-1.5 block font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
                    接口
                  </span>
                  <select
                    id="nar-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="p5-input"
                  >
                    <option value="primary">主接口 · 负责正文与选项</option>
                    <option value="secondary">次接口 · 负责总结与变量</option>
                  </select>
                </label>

                <label htmlFor="nar-temp" className="block">
                  <span className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
                      温度
                    </span>
                    <span className="tabular font-head text-[0.875rem] font-800">
                      {temp.toFixed(2)}
                    </span>
                  </span>
                  <input
                    id="nar-temp"
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={temp}
                    onChange={(e) => setTemp(Number(e.target.value))}
                    className="w-full accent-[#E4002B]"
                  />
                  <span className="mt-1 block text-[0.75rem] text-ink/55">
                    {temp < 0.5
                      ? '偏保守，适合需要严格符合既有设定的段落。'
                      : temp > 1.3
                        ? '偏发散，适合寻找意外走向，但更容易违反世界书规则。'
                        : '常用区间，在符合设定与保持新鲜感之间取平衡。'}
                  </span>
                </label>

                <fieldset>
                  <legend className="mb-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
                    注入上下文
                  </legend>
                  <ul className="space-y-2">
                    {context.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          id={`nar-context-${c.id}`}
                          role="switch"
                          aria-checked={c.on}
                          onClick={() =>
                            setContext((cur) =>
                              cur.map((x) => (x.id === c.id ? { ...x, on: !x.on } : x)),
                            )
                          }
                          className="flex w-full items-center gap-3 border-[3px] border-ink/20 px-3 py-2 text-left transition-colors duration-150 hover:border-ink"
                        >
                          <span
                            className={clsx(
                              'relative h-5 w-9 shrink-0 border-[3px] border-ink transition-colors duration-150',
                              c.on ? 'bg-signal' : 'bg-paper-dim',
                            )}
                          >
                            <span
                              className={clsx(
                                'absolute top-0 h-full w-3 bg-ink transition-transform duration-150 ease-snap',
                                c.on ? 'translate-x-[14px]' : 'translate-x-0',
                              )}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-head text-[0.8125rem] font-800">
                              {c.label}
                            </span>
                            <span className="block font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/50">
                              {c.detail}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </fieldset>

                <Btn
                  id="nar-generate"
                  variant="signal"
                  icon={pending ? RefreshCw : Wand2}
                  className="w-full"
                  disabled={pending || prompt.trim().length === 0}
                  onClick={runGenerate}
                >
                  {pending ? '生成中…' : '生成候选'}
                </Btn>
              </div>
            </Panel>

            <Panel cut="tr">
              <PanelHead
                icon="BookMarked"
                title="候选记录"
                latin="Drafts"
                right={<Tag tone="ink">{state.drafts.length}</Tag>}
              />
              {state.drafts.length === 0 ? (
                <p className="px-4 py-5 text-[0.8125rem] text-ink/60">
                  还没有采纳过任何候选。生成的候选在被采纳后才会出现在这里。
                </p>
              ) : (
                <ul className="divide-y-[3px] divide-ink/10">
                  {state.drafts.map((d) => (
                    <li key={d.id} className="px-4 py-3">
                      <p className="font-head text-[0.8125rem] font-800">{d.label}</p>
                      <p className="mt-0.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
                        {d.kind}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[0.75rem] leading-relaxed text-ink/62">
                        {d.text.slice(0, 90)}…
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {state.drafts.length > 0 && (
                <div className="border-t-[3px] border-ink/10 px-4 py-3">
                  <Btn
                    id="nar-clear-drafts"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      dispatch({ type: 'clearDrafts' })
                      toast.push({
                        severity: 'info',
                        title: '候选记录已清空',
                        detail: '已采纳为正式节拍的内容不受影响。',
                      })
                    }}
                  >
                    清空候选记录
                  </Btn>
                </div>
              )}
            </Panel>
          </div>

          <div className="flex flex-col gap-5">
            <Panel tone="ink" cut="both" className="overflow-hidden">
              <PanelHead
                tone="ink"
                icon="Terminal"
                title="生成控制台"
                latin={`${model === 'primary' ? 'PRIMARY' : 'SECONDARY'} · T=${temp.toFixed(2)}`}
                right={
                  pending ? (
                    <span className="flex items-center gap-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-pulse">
                      <span className="inline-block h-2.5 w-2.5 animate-flicker bg-pulse" />
                      请求中
                    </span>
                  ) : result ? (
                    <Tag tone="jade">已完成</Tag>
                  ) : (
                    <Tag tone="ink" className="!border-paper-warm/40 !bg-ink !text-paper-warm">
                      空闲
                    </Tag>
                  )
                }
              />
              <div className="min-h-[22rem] p-4">
                {pending && (
                  <div className="space-y-2.5" aria-live="polite">
                    <p className="font-mono text-[0.6875rem] leading-relaxed text-pulse">
                      &gt; 正在组装上下文：世界书 {LORE.filter((l) => l.active).length} 条、角色卡 2 张、变量 12 项…
                    </p>
                    <p className="font-mono text-[0.6875rem] leading-relaxed text-paper-warm/60">
                      &gt; 已发送至{model === 'primary' ? '主接口' : '次接口'}，等待首字节…
                    </p>
                    <span className="mt-4 block h-[3px] w-full bg-paper-warm/15">
                      <span className="block h-full w-1/3 animate-marquee bg-signal" />
                    </span>
                  </div>
                )}

                {!pending && !result && (
                  <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 text-center">
                    <span className="grid h-14 w-14 place-items-center border-[3px] border-paper-warm/35">
                      <Wand2 size={22} strokeWidth={2.2} className="text-paper-warm/60" />
                    </span>
                    <p className="font-head text-[0.9375rem] font-800">控制台待命</p>
                    <p className="max-w-[36ch] text-[0.8125rem] leading-relaxed text-paper-warm/60">
                      在左侧填写指令并点击「生成候选」。输出会先到此处的候选区，经过标签与规则校验后再采纳。
                    </p>
                  </div>
                )}

                {!pending && result && (
                  <pre className="whitespace-pre-wrap break-words font-mono text-[0.75rem] leading-relaxed text-paper-warm">
                    {result}
                  </pre>
                )}
              </div>

              {result && (
                <footer className="flex flex-wrap items-center gap-2.5 border-t-[3px] border-paper-warm/20 px-4 py-3">
                  <Btn
                    id="nar-result-review"
                    size="sm"
                    onClick={() => setResultOpen(true)}
                  >
                    打开复核
                  </Btn>
                  <Btn
                    id="nar-result-accept-inline"
                    size="sm"
                    variant="signal"
                    icon={Check}
                    onClick={() => {
                      dispatch({
                        type: 'generateDraft',
                        label: prompt.slice(0, 18),
                        kind: '正文候选',
                        text: result,
                      })
                      toast.push({
                        severity: 'good',
                        title: '候选已采纳为节拍',
                        detail: `已追加到《${chapter?.title ?? '当前章节'}》。相关变量会按 <vars> 中的声明深合并。`,
                      })
                      setResult(null)
                    }}
                  >
                    直接采纳
                  </Btn>
                  <Btn
                    id="nar-result-regen"
                    size="sm"
                    icon={RefreshCw}
                    onClick={runGenerate}
                  >
                    重新生成
                  </Btn>
                  <Btn
                    id="nar-result-discard-inline"
                    size="sm"
                    variant="ghost"
                    icon={ThumbsDown}
                    onClick={() => {
                      setResult(null)
                      toast.push({
                        severity: 'info',
                        title: '已丢弃本次候选',
                        detail: '丢弃不会影响章节内容，可随时重新生成。',
                        group: 'discard',
                      })
                    }}
                  >
                    丢弃
                  </Btn>
                </footer>
              )}
            </Panel>

            <Panel cut="tr">
              <PanelHead icon="AlertTriangle" title="采纳前检查" latin="Pre-accept checks" />
              <ul className="divide-y-[3px] divide-ink/10">
                {ISSUES.slice(0, 3).map((i) => (
                  <li key={i.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 shrink-0">
                      <SeverityMark severity={i.severity} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-head text-[0.8125rem] font-800">{i.title}</p>
                      <p className="mt-0.5 text-[0.75rem] text-ink/60">{i.where}</p>
                    </div>
                    <button
                      type="button"
                      id={`nar-check-open-${i.id}`}
                      onClick={() => setIssueDetail(i)}
                      className="shrink-0 border-[3px] border-ink px-2 py-1 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.12em] transition-colors duration-150 hover:bg-ink hover:text-paper-warm"
                    >
                      处理
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </TabPanel>

      {/* ---------------------------------------------------------- 世界书 */}
      <TabPanel idPrefix="nar" id="lore">
        <Panel cut="tr" className="mb-5">
          <div className="flex flex-wrap items-end gap-4 p-4">
            <label htmlFor="nar-lore-search" className="min-w-[16rem] flex-1">
              <span className="mb-1.5 block font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/55">
                检索词条
              </span>
              <input
                id="nar-lore-search"
                type="search"
                value={loreFilter}
                onChange={(e) => setLoreFilter(e.target.value)}
                placeholder="关键词 / 标题 / 正文"
                className="p5-input"
              />
            </label>
            <dl className="flex gap-5">
              <div>
                <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                  已激活
                </dt>
                <dd className="tabular font-head text-[1rem] font-800">
                  {LORE.filter((l) => l.active).length} / {LORE.length}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                  激活消耗
                </dt>
                <dd className="tabular font-head text-[1rem] font-800">
                  {LORE.filter((l) => l.active).reduce((s, l) => s + l.tokens, 0)} t
                </dd>
              </div>
            </dl>
          </div>
        </Panel>

        {filteredLore.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            title="没有匹配的词条"
            hint="试着用更短的关键词，或清空检索框查看全部条目。"
          />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredLore.map((l) => (
              <li key={l.id}>
                <article
                  id={`nar-lore-card-${l.id}`}
                  className="p5-noise flex h-full flex-col border-[3px] border-ink bg-paper-warm shadow-hard transition-transform duration-200 ease-snap hover:-translate-y-[3px]"
                >
                  <header className="flex items-start justify-between gap-3 border-b-[3px] border-ink bg-paper-dim/60 px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/45">
                        {l.book}
                      </p>
                      <h3 className="mt-1 font-head text-[0.9375rem] font-800">{l.title}</h3>
                    </div>
                    <button
                      type="button"
                      id={`nar-lore-toggle-${l.id}`}
                      role="switch"
                      aria-checked={l.active}
                      aria-label={`${l.active ? '停用' : '激活'}词条：${l.title}`}
                      onClick={() => dispatch({ type: 'toggleLorebook', id: l.id })}
                      className={clsx(
                        'relative h-6 w-11 shrink-0 border-[3px] border-ink transition-colors duration-150',
                        l.active ? 'bg-jade' : 'bg-paper-dim',
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-0 h-full w-3.5 bg-ink transition-transform duration-150 ease-snap',
                          l.active ? 'translate-x-[17px]' : 'translate-x-0',
                        )}
                      />
                    </button>
                  </header>
                  <div className="flex-1 px-3.5 py-3">
                    <p className="line-clamp-3 text-[0.8125rem] leading-relaxed text-ink/72">
                      {l.body}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {l.keys.map((k) => (
                        <li key={k}>
                          <Tag>{k}</Tag>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <footer className="flex items-center gap-3 border-t-[3px] border-ink px-3.5 py-2.5">
                    <span className="tabular font-mono text-[0.625rem] font-700 text-ink/55">
                      优先级 {l.priority} · {l.tokens} t
                    </span>
                    <Btn
                      id={`nar-lore-detail-${l.id}`}
                      size="sm"
                      className="ml-auto"
                      onClick={() => setLoreDetail(l)}
                    >
                      详情
                    </Btn>
                  </footer>
                </article>
              </li>
            ))}
          </ul>
        )}
      </TabPanel>

      {/* ---------------------------------------------------------- 一致性 */}
      <TabPanel idPrefix="nar" id="check">
        <Panel cut="tr">
          <PanelHead
            icon="AlertTriangle"
            title="一致性检查"
            latin="Consistency report"
            right={
              <Tag tone="signal">
                {
                  ISSUES.filter((i) => i.severity === 'danger' || i.severity === 'warn')
                    .length
                }{' '}
                项需要处理
              </Tag>
            }
          />
          <ol className="divide-y-[3px] divide-ink/10">
            {ISSUES.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:gap-4">
                <span className="shrink-0">
                  <SeverityMark severity={i.severity} withLabel />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-head text-[0.9375rem] font-800">{i.title}</h3>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink/68">{i.detail}</p>
                  <p className="mt-1.5 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                    位置：{i.where}
                  </p>
                </div>
                <Btn
                  id={`nar-issue-open-${i.id}`}
                  size="sm"
                  onClick={() => setIssueDetail(i)}
                  className="shrink-0 self-start"
                >
                  查看与修复
                </Btn>
              </li>
            ))}
          </ol>
        </Panel>
      </TabPanel>

      {/* ------------------------------------------------------- 复核模态框 */}
      <Modal
        open={resultOpen && result !== null}
        onClose={() => setResultOpen(false)}
        title="候选复核"
        latin="Review before accept"
        kicker="生成结果"
        size="lg"
        footer={
          <>
            <Btn id="nar-review-close" onClick={() => setResultOpen(false)}>
              返回
            </Btn>
            <Btn
              id="nar-review-regen"
              icon={RefreshCw}
              onClick={() => {
                setResultOpen(false)
                runGenerate()
              }}
            >
              重新生成
            </Btn>
            <Btn
              id="nar-review-discard"
              variant="ghost"
              icon={ThumbsDown}
              onClick={() => {
                setResult(null)
                setResultOpen(false)
                toast.push({
                  severity: 'info',
                  title: '已丢弃本次候选',
                  detail: '这次生成的文本不会被写入任何章节。',
                  group: 'discard',
                })
              }}
            >
              丢弃
            </Btn>
            <Btn
              id="nar-review-accept"
              variant="signal"
              icon={Check}
              onClick={() => {
                if (!result) return
                dispatch({
                  type: 'generateDraft',
                  label: prompt.slice(0, 18),
                  kind: '正文候选',
                  text: result,
                })
                setResultOpen(false)
                setResult(null)
                toast.push({
                  severity: 'good',
                  title: '已采纳为正式节拍',
                  detail: `追加至《${chapter?.title ?? '当前章节'}》，<vars> 中声明的变量已深合并。建议随即运行一次一致性检查。`,
                })
              }}
            >
              采纳为节拍
            </Btn>
          </>
        }
      >
        {result && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <MiniField label="接口" value={model === 'primary' ? '主接口' : '次接口'} />
              <MiniField label="温度" value={temp.toFixed(2)} />
              <MiniField label="上下文" value={`${context.filter((c) => c.on).length} 项注入`} />
              <MiniField
                label="预估输入"
                value={`${(prompt.length / 1.6 + 320).toFixed(0)} t`}
              />
            </div>

            <section aria-labelledby="nar-review-tags">
              <h3
                id="nar-review-tags"
                className="mb-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.2em] text-ink/55"
              >
                标签解析
              </h3>
              <ul className="flex flex-wrap gap-2">
                {['maintext', 'option', 'sum', 'vars', 'thinking']
                  .filter((t) => result.includes(`<${t}`))
                  .map((t) => (
                    <li key={t}>
                      <Tag tone={t === 'maintext' ? 'signal' : 'ink'}>
                        &lt;{t}&gt; 已闭合
                      </Tag>
                    </li>
                  ))}
              </ul>
            </section>

            <section aria-labelledby="nar-review-body">
              <h3
                id="nar-review-body"
                className="mb-2.5 font-mono text-[0.625rem] font-700 uppercase tracking-[0.2em] text-ink/55"
              >
                输出原文
              </h3>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words border-[3px] border-ink bg-ink p-4 font-mono text-[0.75rem] leading-relaxed text-paper-warm">
                {result}
              </pre>
            </section>

            <p className="border-l-[4px] border-signal pl-4 text-[0.8125rem] leading-relaxed text-ink/72">
              采纳后，正文会追加至章节末尾，<span className="font-mono">&lt;vars&gt;</span> 的内容会与当前变量做深合并。
              已有的高危一致性问题（角色语气漂移）不会因为采纳而消失。
            </p>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------- 词条详情 */}
      <Modal
        open={loreDetail !== null}
        onClose={() => setLoreDetail(null)}
        title={loreDetail?.title ?? ''}
        latin={loreDetail?.book}
        kicker="世界书词条"
        size="md"
        footer={
          <>
            <Btn id="nar-lore-close" onClick={() => setLoreDetail(null)}>
              关闭
            </Btn>
            {loreDetail && (
              <Btn
                id={`nar-lore-detail-toggle-${loreDetail.id}`}
                variant={loreDetail.active ? 'paper' : 'signal'}
                onClick={() => {
                  dispatch({ type: 'toggleLorebook', id: loreDetail.id })
                  setLoreDetail({ ...loreDetail, active: !loreDetail.active })
                }}
              >
                {loreDetail.active ? '停用该词条' : '激活该词条'}
              </Btn>
            )}
          </>
        }
      >
        {loreDetail && (
          <div className="space-y-4">
            <p className="text-[0.9375rem] leading-relaxed text-ink/80">{loreDetail.body}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniField label="优先级" value={String(loreDetail.priority)} />
              <MiniField label="Token 估算" value={`${loreDetail.tokens} t`} />
              <MiniField label="状态" value={loreDetail.active ? '已激活' : '未激活'} />
            </div>
            <div>
              <p className="mb-2 font-mono text-[0.625rem] font-700 uppercase tracking-[0.2em] text-ink/55">
                触发关键词
              </p>
              <ul className="flex flex-wrap gap-2">
                {loreDetail.keys.map((k) => (
                  <li key={k}>
                    <Tag tone="ink">{k}</Tag>
                  </li>
                ))}
              </ul>
            </div>
            <Meter
              id={`nar-lore-budget-${loreDetail.id}`}
              value={(loreDetail.tokens / 400) * 100}
              label="占单条词条预算上限（400 t）"
              showValue
              tone={loreDetail.tokens > 240 ? 'pulse' : 'ink'}
            />
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------- 问题详情 */}
      <Modal
        open={issueDetail !== null}
        onClose={() => setIssueDetail(null)}
        title={issueDetail?.title ?? ''}
        latin="Consistency issue"
        kicker={issueDetail?.where}
        size="md"
        footer={
          <>
            <Btn id="nar-issue-close" onClick={() => setIssueDetail(null)}>
              关闭
            </Btn>
            <Btn
              id="nar-issue-fix"
              variant="signal"
              icon={Check}
              onClick={() => {
                toast.push({
                  severity: 'good',
                  title: '已标记为待修复',
                  detail: '修复任务已加入本节的改写清单。真实接入后，这里会触发一次针对性的重写请求。',
                })
                setIssueDetail(null)
              }}
            >
              标记为待修复
            </Btn>
          </>
        }
      >
        {issueDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <SeverityMark severity={issueDetail.severity} withLabel />
              <span className="font-mono text-[0.625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                {issueDetail.where}
              </span>
            </div>
            <p className="text-[0.9375rem] leading-relaxed text-ink/78">{issueDetail.detail}</p>
            <div className="border-l-[4px] border-jade bg-paper-dim/50 px-4 py-3">
              <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.2em] text-ink/50">
                建议修复
              </p>
              <p className="mt-1 text-[0.875rem] leading-relaxed">{issueDetail.fix}</p>
            </div>
            <p className="flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-ink/62">
              <Avatar name={writerName} size={26} index={1} />
              <span className="pt-0.5">
                本节归属「叙事」职能，当前主笔为 {writerName}（{writerTitle}）。
                修复需要其确认后才会写入章节定稿。
              </span>
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

/* ---------------------------------------------------------------- 子组件 */

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-[3px] border-ink/15 px-3 py-2.5">
      <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
        {label}
      </p>
      <p className="tabular mt-1 font-head text-[0.875rem] font-800">{value}</p>
    </div>
  )
}
