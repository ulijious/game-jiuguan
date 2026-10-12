import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ROOM_META,
  SEED_CHAPTERS,
  SEED_COMPETITORS,
  SEED_FINANCE,
  SEED_FLOORS,
  SEED_LOG,
  SEED_PROJECTS,
  SEED_STAFF,
  STAGE_META,
} from '../data/seed'
import type {
  Chapter,
  Competitor,
  Equipment,
  FinanceRow,
  Floor,
  LogEntry,
  Project,
  Room,
  RoomKind,
  Severity,
  Staff,
} from '../data/types'
import { useToast } from './toast'

/* --------------------------------------------------------------- 状态 */

export interface StudioMeta {
  name: string
  latin: string
  founded: string
  motto: string
  mottoEn: string
}

export interface GameState {
  studio: StudioMeta
  week: number
  money: number
  reputation: number
  fans: number
  hype: number
  floors: Floor[]
  staff: Staff[]
  projects: Project[]
  chapters: Chapter[]
  competitors: Competitor[]
  finance: FinanceRow[]
  log: LogEntry[]
  /** 剧情工坊里以 AI 生成的候选条目 */
  drafts: { id: string; label: string; kind: string; text: string }[]
  /** 已激活的世界书 */
  activeLorebooks: string[]
}

const INITIAL: GameState = {
  studio: {
    name: '酒馆工作室',
    latin: 'TAVERN STUDIO',
    founded: '2019 · 春',
    motto: '先把灯留着，等人推门。',
    mottoEn: 'KEEP THE LIGHT ON',
  },
  week: 26,
  money: 1_284_600,
  reputation: 68,
  fans: 41_200,
  hype: 32,
  floors: SEED_FLOORS,
  staff: SEED_STAFF,
  projects: SEED_PROJECTS,
  chapters: SEED_CHAPTERS,
  competitors: SEED_COMPETITORS,
  finance: SEED_FINANCE,
  log: SEED_LOG,
  drafts: [],
  activeLorebooks: [],
}

/* --------------------------------------------------------------- 行动 */

export type Action =
  | { type: 'advanceWeek' }
  | { type: 'addFloor'; direction: 'up' | 'down' }
  | { type: 'addRoom'; floorId: string; side: 'left' | 'right'; kind: RoomKind }
  | { type: 'upgradeRoom'; roomId: string }
  | { type: 'maintainEquipment'; roomId: string; equipmentId: string }
  | { type: 'assignStaff'; staffId: string; roomId: string }
  | { type: 'unassignStaff'; staffId: string }
  | { type: 'restStaff'; staffId: string }
  | { type: 'fireStaff'; staffId: string }
  | { type: 'toggleLorebook'; id: string }
  | { type: 'setChapterStatus'; chapterId: string; status: Chapter['status'] }
  | { type: 'generateDraft'; label: string; kind: string; text: string }
  | { type: 'clearDrafts' }
  | { type: 'promoteProject'; projectId: string }
  | { type: 'log'; severity: Severity; title: string; detail: string }

/* 已发行作品的每周分成基线，同时用于结算与资金续航推算 */
const WEEKLY_ROYALTY = 42_000

let uid = 0
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${(uid += 1)}`

const FLOOR_NAMES: Record<string, string> = {
  '1': '二层 · 内容层',
  '2': '三层 · 展演层',
  '3': '四层 · 顶层',
  '-1': '地下一层 · 备份',
  '-2': '地下二层 · 机房',
  '-3': '地下三层 · 深处',
}

const ROOM_BUILD: Record<RoomKind, { capacity: number; perk: string; weeklyCost: number }> = {
  planning: { capacity: 4, perk: '企划产出 +12%', weeklyCost: 460 },
  engineering: { capacity: 5, perk: '原型周产 +18%', weeklyCost: 620 },
  art: { capacity: 4, perk: '美术资产产出 +14%', weeklyCost: 540 },
  audio: { capacity: 3, perk: '音频表现 +16%', weeklyCost: 580 },
  meeting: { capacity: 8, perk: '跨职能协作 +10%', weeklyCost: 280 },
  lounge: { capacity: 6, perk: '全员每周士气 +4', weeklyCost: 240 },
  server: { capacity: 2, perk: '构建时长 −35%', weeklyCost: 700 },
  qa: { capacity: 4, perk: '缺陷逃逸率 −22%', weeklyCost: 320 },
  negotiation: { capacity: 4, perk: '发行谈判额度 +15%', weeklyCost: 360 },
  mocap: { capacity: 3, perk: '动作资产质量 +20%', weeklyCost: 820 },
  vault: { capacity: 2, perk: '资产复用率 +18%', weeklyCost: 200 },
  empty: { capacity: 0, perk: '尚未规划', weeklyCost: 0 },
}

function roomFromKind(kind: RoomKind, slot: number, name?: string): Room {
  const build = ROOM_BUILD[kind]
  const equip: Equipment[] = [
    {
      id: nextId('eq'),
      name: kind === 'empty' ? '—' : '基础工位组',
      condition: 100,
      tier: 1,
      note: '全新交付',
    },
  ]
  return {
    id: nextId('room'),
    name: name ?? ROOM_META[kind].label,
    kind,
    level: 1,
    capacity: build.capacity,
    staffIds: [],
    equipment: equip,
    perk: build.perk,
    weeklyCost: build.weeklyCost,
    slot,
  }
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'advanceWeek': {
      const week = state.week + 1
      const payroll = state.staff.reduce((s, x) => s + x.salary, 0)
      const venue = state.floors.reduce((s, f) => s + f.weeklyRent, 0)
      const upkeep = state.floors.reduce(
        (s, f) => s + f.rooms.reduce((rs, r) => rs + r.weeklyCost, 0),
        0,
      )
      const royalty = WEEKLY_ROYALTY
      const net = royalty - payroll - venue - upkeep

      const staff = state.staff.map((s) => {
        const room = state.floors
          .flatMap((f) => f.rooms)
          .find((r) => r.id === s.roomId)
        const comfort = room ? (room.kind === 'lounge' ? 6 : 2) : -1
        return {
          ...s,
          stamina: Math.max(18, Math.min(100, s.stamina + (s.status === 'resting' ? 14 : -3))),
          morale: Math.max(20, Math.min(100, s.morale + comfort)),
        }
      })

      const finance: FinanceRow[] = [
        ...state.finance,
        { id: nextId('f'), week, kind: 'income', category: '发行', label: '现有作品分成', amount: royalty },
        { id: nextId('f'), week, kind: 'expense', category: '薪资', label: '全员薪资', amount: -payroll },
        { id: nextId('f'), week, kind: 'expense', category: '场地', label: '楼层租金及运维', amount: -(venue + upkeep) },
      ]

      const entry: LogEntry = {
        id: nextId('l'),
        week,
        severity: net >= 0 ? 'good' : 'warn',
        title: net >= 0 ? `第 ${week} 周结算：现金净流入` : `第 ${week} 周结算：现金净流出`,
        detail: `发行分成 ${royalty.toLocaleString('zh-CN')} 元，支出 ${Math.abs(payroll + venue + upkeep).toLocaleString('zh-CN')} 元，本周净额 ${net >= 0 ? '+' : '−'}${Math.abs(net).toLocaleString('zh-CN')} 元。`,
      }

      const projects = state.projects.map((p) =>
        p.stage === 'released'
          ? p
          : { ...p, progress: Math.min(100, p.progress + 2) },
      )

      return { ...state, week, money: state.money + net, staff, finance, log: [entry, ...state.log], projects }
    }

    case 'addFloor': {
      const levels = state.floors.map((f) => f.level)
      const level =
        action.direction === 'up' ? Math.max(...levels) + 1 : Math.min(...levels) - 1
      const floor: Floor = {
        id: nextId('floor'),
        level,
        name: FLOOR_NAMES[String(level)] ?? `第 ${level} 层`,
        rooms: [roomFromKind('empty', 0, '待规划空间')],
        capacity: 3,
        weeklyRent: action.direction === 'up' ? 2600 : 1900,
      }
      const floors = [...state.floors, floor].sort((a, b) => b.level - a.level)
      return { ...state, floors }
    }

    case 'addRoom': {
      const floors = state.floors.map((f) => {
        if (f.id !== action.floorId) return f
        const slots = f.rooms.map((r) => r.slot)
        const slot =
          action.side === 'right' ? Math.max(0, ...slots) + 1 : Math.min(0, ...slots) - 1
        return {
          ...f,
          capacity: f.capacity + 1,
          rooms: [...f.rooms, roomFromKind(action.kind, slot)].sort((a, b) => a.slot - b.slot),
        }
      })
      return { ...state, floors }
    }

    case 'upgradeRoom': {
      const floors = state.floors.map((f) => ({
        ...f,
        rooms: f.rooms.map((r) =>
          r.id === action.roomId
            ? {
                ...r,
                level: Math.min(3, r.level + 1),
                capacity: r.capacity + 2,
                perk: r.perk.replace(/\+\d+%/, (m) => `+${parseInt(m) + 6}%`),
                equipment: r.equipment.map((e) =>
                  e.id === r.equipment[0]?.id
                    ? { ...e, condition: Math.min(100, e.condition + 18), tier: Math.min(3, e.tier + 1) as 1 | 2 | 3, note: '经过整修与扩容' }
                    : e,
                ),
              }
            : r,
        ),
      }))
      return { ...state, floors }
    }

    case 'maintainEquipment': {
      const floors = state.floors.map((f) => ({
        ...f,
        rooms: f.rooms.map((r) =>
          r.id === action.roomId
            ? {
                ...r,
                equipment: r.equipment.map((e) =>
                  e.id === action.equipmentId
                    ? { ...e, condition: Math.min(100, e.condition + 34), note: '刚刚完成保养' }
                    : e,
                ),
              }
            : r,
        ),
      }))
      return { ...state, floors }
    }

    case 'assignStaff': {
      const floors = state.floors.map((f) => ({
        ...f,
        rooms: f.rooms.map((r) => {
          if (r.id === action.roomId) {
            if (r.staffIds.includes(action.staffId)) return r
            if (r.staffIds.length >= r.capacity) return r
            return { ...r, staffIds: [...r.staffIds, action.staffId] }
          }
          return r.staffIds.includes(action.staffId)
            ? { ...r, staffIds: r.staffIds.filter((x) => x !== action.staffId) }
            : r
        }),
      }))
      const staff = state.staff.map((s) =>
        s.id === action.staffId ? { ...s, roomId: action.roomId, status: 'working' as const } : s,
      )
      return { ...state, floors, staff }
    }

    case 'unassignStaff': {
      const floors = state.floors.map((f) => ({
        ...f,
        rooms: f.rooms.map((r) =>
          r.staffIds.includes(action.staffId)
            ? { ...r, staffIds: r.staffIds.filter((x) => x !== action.staffId) }
            : r,
        ),
      }))
      const staff = state.staff.map((s) =>
        s.id === action.staffId ? { ...s, roomId: null, status: 'idle' as const } : s,
      )
      return { ...state, floors, staff }
    }

    case 'restStaff': {
      const staff = state.staff.map((s) =>
        s.id === action.staffId
          ? { ...s, status: 'resting' as const, stamina: Math.min(100, s.stamina + 8), morale: Math.min(100, s.morale + 3) }
          : s,
      )
      return { ...state, staff }
    }

    case 'fireStaff': {
      const floors = state.floors.map((f) => ({
        ...f,
        rooms: f.rooms.map((r) =>
          r.staffIds.includes(action.staffId)
            ? { ...r, staffIds: r.staffIds.filter((x) => x !== action.staffId) }
            : r,
        ),
      }))
      return {
        ...state,
        floors,
        staff: state.staff.filter((s) => s.id !== action.staffId),
      }
    }

    case 'toggleLorebook': {
      const on = state.activeLorebooks.includes(action.id)
      return {
        ...state,
        activeLorebooks: on
          ? state.activeLorebooks.filter((x) => x !== action.id)
          : [...state.activeLorebooks, action.id],
      }
    }

    case 'setChapterStatus': {
      return {
        ...state,
        chapters: state.chapters.map((c) =>
          c.id === action.chapterId ? { ...c, status: action.status } : c,
        ),
      }
    }

    case 'generateDraft': {
      return {
        ...state,
        drafts: [
          { id: nextId('draft'), label: action.label, kind: action.kind, text: action.text },
          ...state.drafts,
        ].slice(0, 12),
      }
    }

    case 'clearDrafts':
      return { ...state, drafts: [] }

    case 'promoteProject': {
      const order: Project['stage'][] = ['concept', 'prototype', 'alpha', 'beta', 'gold', 'released']
      return {
        ...state,
        projects: state.projects.map((p) => {
          if (p.id !== action.projectId) return p
          const i = order.indexOf(p.stage)
          const stage = order[Math.min(order.length - 1, i + 1)]
          return { ...p, stage, progress: Math.min(100, p.progress + 8) }
        }),
      }
    }

    case 'log':
      return {
        ...state,
        log: [
          { id: nextId('l'), week: state.week, severity: action.severity, title: action.title, detail: action.detail },
          ...state.log,
        ],
      }

    default:
      return state
  }
}

/* --------------------------------------------------------------- Context */

interface GameApi {
  state: GameState
  dispatch: (a: Action) => void
  /** 带提示与扣费的组合操作 */
  addFloor: (direction: 'up' | 'down') => void
  addRoom: (floorId: string, side: 'left' | 'right', kind: RoomKind) => void
  upgradeRoom: (roomId: string) => void
  maintainEquipment: (roomId: string, equipmentId: string) => void
  assignStaff: (staffId: string, roomId: string) => void
  restStaff: (staffId: string) => void
  fireStaff: (staffId: string) => void
  promoteProject: (projectId: string) => void
  advanceWeek: () => void
  derived: {
    payroll: number
    weeklyBurn: number
    headcount: number
    assigned: number
    avgMorale: number
    avgStamina: number
    roomCount: number
    gearHealth: number
    runwayWeeks: number
  }
}

const GameCtx = createContext<GameApi | null>(null)

export function useGame(): GameApi {
  const ctx = useContext(GameCtx)
  if (!ctx) throw new Error('useGame 必须在 <GameProvider> 内使用')
  return ctx
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const toast = useToast()
  const navigate = useNavigate()

  const derived = useMemo(() => {
    const payroll = state.staff.reduce((s, x) => s + x.salary, 0)
    const venue = state.floors.reduce((s, f) => s + f.weeklyRent, 0)
    const upkeep = state.floors.reduce(
      (s, f) => s + f.rooms.reduce((rs, r) => rs + r.weeklyCost, 0),
      0,
    )
    const weeklyBurn = payroll + venue + upkeep
    const allRooms = state.floors.flatMap((f) => f.rooms)
    const gear = allRooms.flatMap((r) => r.equipment).filter((e) => e.name !== '—')
    return {
      payroll,
      weeklyBurn,
      headcount: state.staff.length,
      assigned: state.staff.filter((s) => s.roomId).length,
      avgMorale: Math.round(state.staff.reduce((s, x) => s + x.morale, 0) / Math.max(1, state.staff.length)),
      avgStamina: Math.round(state.staff.reduce((s, x) => s + x.stamina, 0) / Math.max(1, state.staff.length)),
      roomCount: allRooms.filter((r) => r.kind !== 'empty').length,
      gearHealth: Math.round(gear.reduce((s, e) => s + e.condition, 0) / Math.max(1, gear.length)),
      // 净消耗为负（分成高于支出）时现金并不流失，用 99 表示"充裕"
      runwayWeeks:
        weeklyBurn - WEEKLY_ROYALTY <= 0
          ? 99
          : Math.floor(state.money / (weeklyBurn - WEEKLY_ROYALTY)),
    }
  }, [state])

  const addFloor = useCallback(
    (direction: 'up' | 'down') => {
      const cost = direction === 'up' ? 260_000 : 180_000
      if (state.money < cost) {
        toast.push({
          severity: 'danger',
          title: '资金不足，无法拓建楼层',
          detail: `需要 ${cost.toLocaleString('zh-CN')} 元，当前可用 ${state.money.toLocaleString('zh-CN')} 元。可考虑申请贷款或延后开发计划。`,
        })
        return
      }
      dispatch({ type: 'addFloor', direction })
      toast.push({
        severity: 'good',
        title: direction === 'up' ? '向上一层层拓建完成' : '向地下拓建完成',
        detail:
          direction === 'up'
            ? '新楼层已交付，目前为空置状态。可在其中规划建造房间。'
            : '地下空间已打通，湿度偏高，建议优先配置机房或资料库。',
        action: { label: '前往工作室', run: () => navigate('/studio') },
      })
      dispatch({
        type: 'log',
        severity: 'info',
        title: direction === 'up' ? '向上拓建新楼层' : '向下拓建地下层',
        detail: `支出 ${cost.toLocaleString('zh-CN')} 元。`,
      })
    },
    [state.money, toast, navigate],
  )

  const addRoom = useCallback(
    (floorId: string, side: 'left' | 'right', kind: RoomKind) => {
      const cost = ROOM_META[kind].cost + (side === 'left' ? 0 : 400)
      if (state.money < cost) {
        toast.push({
          severity: 'danger',
          title: '资金不足，无法拓建房间',
          detail: `建造「${ROOM_META[kind].label}」需要 ${cost.toLocaleString('zh-CN')} 元。`,
        })
        return
      }
      dispatch({ type: 'addRoom', floorId, side, kind })
      toast.push({
        severity: 'good',
        title: `已向${side === 'right' ? '右' : '左'}拓建：${ROOM_META[kind].label}`,
        detail: `${ROOM_META[kind].blurb}。房间已可投入分配人员。`,
      })
    },
    [state.money, toast],
  )

  const upgradeRoom = useCallback(
    (roomId: string) => {
      const cost = 96_000
      if (state.money < cost) {
        toast.push({
          severity: 'warn',
          title: '扩建预算不足',
          detail: `升级该房间需要 ${cost.toLocaleString('zh-CN')} 元，用于扩展工位与设备换代。`,
        })
        return
      }
      dispatch({ type: 'upgradeRoom', roomId })
      toast.push({
        severity: 'good',
        title: '房间完成扩建',
        detail: '工位 +2，设备等级提升，房间加成同步提高。',
      })
    },
    [state.money, toast],
  )

  const maintainEquipment = useCallback(
    (roomId: string, equipmentId: string) => {
      const cost = 8_400
      if (state.money < cost) {
        toast.push({ severity: 'warn', title: '维护预算不足', detail: '保养一台设备需要 8,400 元。' })
        return
      }
      dispatch({ type: 'maintainEquipment', roomId, equipmentId })
      toast.push({ severity: 'good', title: '设备保养完成', detail: '完好度已回升，短期内不会影响产出。' })
    },
    [state.money, toast],
  )

  const assignStaff = useCallback(
    (staffId: string, roomId: string) => {
      const room = state.floors.flatMap((f) => f.rooms).find((r) => r.id === roomId)
      const person = state.staff.find((s) => s.id === staffId)
      if (!room || !person) return
      if (room.kind === 'empty') {
        toast.push({ severity: 'warn', title: '空地无法分配人员', detail: '请先在此处建造一个功能房间。' })
        return
      }
      if (!room.staffIds.includes(staffId) && room.staffIds.length >= room.capacity) {
        toast.push({
          severity: 'danger',
          title: '工位已满',
          detail: `「${room.name}」容量 ${room.capacity} 人，已分配 ${room.staffIds.length} 人。扩建或改派其他人。`,
        })
        return
      }
      dispatch({ type: 'assignStaff', staffId, roomId })
      toast.push({
        severity: 'good',
        title: `${person.name} 已调往「${room.name}」`,
        detail: `职能：${person.title}。房间加成：${room.perk}。`,
      })
    },
    [state.floors, state.staff, toast],
  )

  const restStaff = useCallback(
    (staffId: string) => {
      const person = state.staff.find((s) => s.id === staffId)
      if (!person) return
      dispatch({ type: 'restStaff', staffId })
      toast.push({
        severity: 'info',
        title: `${person.name} 已进入休整`,
        detail: '本周产出下降，但体力与士气将逐步恢复。',
      })
    },
    [state.staff, toast],
  )

  const fireStaff = useCallback(
    (staffId: string) => {
      const person = state.staff.find((s) => s.id === staffId)
      if (!person) return
      dispatch({ type: 'fireStaff', staffId })
      toast.push({
        severity: 'danger',
        title: `已解除与 ${person.name} 的合作`,
        detail: `需支付一个月薪资作为补偿，团队士气受到轻微影响。`,
      })
    },
    [state.staff, toast],
  )

  const promoteProject = useCallback(
    (projectId: string) => {
      const project = state.projects.find((p) => p.id === projectId)
      if (!project) return
      const order: Project['stage'][] = [
        'concept',
        'prototype',
        'alpha',
        'beta',
        'gold',
        'released',
      ]
      const i = order.indexOf(project.stage)
      if (i >= order.length - 1) {
        toast.push({
          severity: 'info',
          title: `《${project.title}》已处于最终阶段`,
          detail: '母盘之后没有下一个开发阶段，请前往企划页处理发行事宜。',
        })
        return
      }
      const next = order[i + 1]
      dispatch({ type: 'promoteProject', projectId })
      toast.push({
        severity: 'good',
        title: `《${project.title}》推进至${STAGE_META[next].label}`,
        detail: `${STAGE_META[next].blurb}。整体完成度同步提升，请复核里程碑排期。`,
      })
    },
    [state.projects, toast],
  )

  const advanceWeek = useCallback(() => {
    dispatch({ type: 'advanceWeek' })
    toast.push({
      severity: 'info',
      title: `进入第 ${state.week + 1} 周`,
      detail: '已完成本周结算、人员状态推进与项目进度更新。',
      group: 'week-tick',
    })
  }, [state.week, toast])

  const api = useMemo<GameApi>(
    () => ({
      state,
      dispatch,
      addFloor,
      addRoom,
      upgradeRoom,
      maintainEquipment,
      assignStaff,
      restStaff,
      fireStaff,
      promoteProject,
      advanceWeek,
      derived,
    }),
    [state, addFloor, addRoom, upgradeRoom, maintainEquipment, assignStaff, restStaff, fireStaff, promoteProject, advanceWeek, derived],
  )

  return <GameCtx.Provider value={api}>{children}</GameCtx.Provider>
}
