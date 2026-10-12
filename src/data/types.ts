/* ------------------------------------------------------------------ 类型定义 */

export type RoomKind =
  | 'planning' // 策划
  | 'engineering' // 程序
  | 'art' // 美术
  | 'audio' // 音频
  | 'meeting' // 会议
  | 'lounge' // 休息
  | 'server' // 机房
  | 'qa' // 测试
  | 'negotiation' // 洽谈
  | 'mocap' // 动捕
  | 'vault' // 资料库
  | 'empty' // 空地

export interface Equipment {
  id: string
  name: string
  /** 完好度 0–100 */
  condition: number
  tier: 1 | 2 | 3
  note: string
}

export interface Room {
  id: string
  name: string
  kind: RoomKind
  level: number
  /** 工位容量 */
  capacity: number
  staffIds: string[]
  equipment: Equipment[]
  /** 为该房间提供的加成描述 */
  perk: string
  weeklyCost: number
  /** 相对楼层中心的横向槽位，允许负值（向左拓建） */
  slot: number
}

export interface Floor {
  id: string
  /** 0 = 平层 / 1..n = 楼上 / -1..-n = 地下 */
  level: number
  name: string
  rooms: Room[]
  /** 该层可容纳的房间槽位（左右各可拓建） */
  capacity: number
  weeklyRent: number
}

export type StaffRole =
  | 'producer'
  | 'designer'
  | 'engineer'
  | 'artist'
  | 'writer'
  | 'composer'
  | 'qa'
  | 'ops'

export type StaffStatus = 'working' | 'idle' | 'resting' | 'training' | 'burnout'

export interface Staff {
  id: string
  name: string
  handle: string
  role: StaffRole
  title: string
  level: number
  /** 四维能力，0–100 */
  stats: { tech: number; creative: number; express: number; collab: number }
  morale: number
  stamina: number
  /** 周薪（元） */
  salary: number
  traits: string[]
  status: StaffStatus
  joinedOn: string
  /** 当前被分配到的房间 id */
  roomId: string | null
  bio: string
  /** 近期履历 */
  resume: { year: string; text: string }[]
  /** 隐藏的成长潜力 */
  growth: number
}

export interface Milestone {
  id: string
  name: string
  progress: number
  owner: string
  dueWeek: number
}

export type ProjectStage = 'concept' | 'prototype' | 'alpha' | 'beta' | 'gold' | 'released'

export interface Project {
  id: string
  title: string
  subtitle: string
  genre: ('sim' | 'dev' | 'story')[]
  stage: ProjectStage
  progress: number
  /** 品质预估 0–100 */
  quality: { fun: number; polish: number; narrative: number; tech: number }
  budget: number
  spent: number
  deadlineWeek: number
  leadId: string
  teamIds: string[]
  milestones: Milestone[]
  platform: string[]
  theme: string
  hook: string
  /** 已发行项目的市场数据 */
  release?: { week: number; units: number; score: number; revenue: number }
}

export type Severity = 'info' | 'good' | 'warn' | 'danger'

export interface LogEntry {
  id: string
  week: number
  severity: Severity
  title: string
  detail: string
}

export interface Chapter {
  id: string
  index: number
  title: string
  summary: string
  status: 'done' | 'writing' | 'outline'
  wordCount: number
  branches: number
  beats: { id: string; kind: 'scene' | 'choice' | 'reveal' | 'branch'; text: string }[]
}

export interface Competitor {
  id: string
  title: string
  studio: string
  genre: string
  units: string
  score: number
  stance: 'rival' | 'peer' | 'idol'
  note: string
}

export interface FinanceRow {
  id: string
  week: number
  kind: 'income' | 'expense'
  category: string
  label: string
  amount: number
}
