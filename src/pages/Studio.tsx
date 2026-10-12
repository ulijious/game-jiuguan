import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Building2,
  Hammer,
  Ruler,
  TriangleAlert,
  UserMinus,
  UserPlus,
  Wrench,
} from 'lucide-react'
import { useGame } from '../lib/store'
import { useToast } from '../lib/toast'
import { money } from '../lib/format'
import { ROOM_META, ROLE_META } from '../data/seed'
import type { Room, RoomKind, Staff } from '../data/types'
import {
  Avatar,
  Btn,
  EmptyState,
  Icon,
  Kicker,
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

const FLOOR_COST = { up: 260_000, down: 180_000 }

export default function Studio() {
  const { state, derived, addFloor, addRoom, upgradeRoom, maintainEquipment, assignStaff } =
    useGame()
  const toast = useToast()

  const [roomDetail, setRoomDetail] = useState<Room | null>(null)
  const [detailTab, setDetailTab] = useState('staff')
  const [buildTarget, setBuildTarget] = useState<{
    floorId: string
    floorName: string
    side: 'left' | 'right'
  } | null>(null)
  const [buildKind, setBuildKind] = useState<RoomKind>('planning')
  const [assignOpen, setAssignOpen] = useState(false)

  const floors = state.floors
  const topLevel = Math.max(...floors.map((f) => f.level))
  const bottomLevel = Math.min(...floors.map((f) => f.level))
  const upperFloors = floors.filter((f) => f.level > 0).length
  const lowerFloors = floors.filter((f) => f.level < 0).length
  const vacantRooms = state.floors
    .flatMap((f) => f.rooms)
    .filter((r) => r.kind === 'empty').length

  const allRooms = useMemo(() => floors.flatMap((f) => f.rooms), [floors])
  const totalSeats = allRooms.reduce((s, r) => s + (r.kind === 'empty' ? 0 : r.capacity), 0)
  const usedSeats = allRooms.reduce((s, r) => s + r.staffIds.length, 0)
  const monthlyOverhead = floors.reduce(
    (s, f) => s + f.weeklyRent + f.rooms.reduce((rs, r) => rs + r.weeklyCost, 0),
    0,
  )

  const staffById = useMemo(() => {
    const m = new Map<string, Staff>()
    state.staff.forEach((s) => m.set(s.id, s))
    return m
  }, [state.staff])

  const liveRoom = roomDetail ? allRooms.find((r) => r.id === roomDetail.id) ?? roomDetail : null

  function openRoom(room: Room) {
    setRoomDetail(room)
    setDetailTab('staff')
  }

  return (
    <>
      <PageHeader
        kicker="工作室"
        title="楼层与房间"
        latin="THE BUILDING / EXPANDABLE FLOORPLAN"
        lede={`这里是你每天推门进来的地方。目前 ${floors.length} 层、${derived.roomCount} 个功能房间。可以向上加层、向下挖地下，也可以在任意一层向左或向右拓建新房间。`}
        actions={
          <>
            <Btn
              id="studio-add-floor-up"
              icon={ArrowUpToLine}
              onClick={() => addFloor('up')}
            >
              向上拓建楼层
            </Btn>
            <Btn
              id="studio-add-floor-down"
              icon={ArrowDownToLine}
              onClick={() => addFloor('down')}
            >
              向下拓建地下层
            </Btn>
          </>
        }
      />

      {/* ------------------------------------------------------------ 概况 */}
      <section aria-labelledby="studio-summary" className="mb-6">
        <h2 id="studio-summary" className="sr-only">
          建筑概况
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            id="studio-tile-floors"
            icon={Building2}
            label="楼层"
            value={String(floors.length)}
            unit="层"
            hint={`地上 ${upperFloors} 层 · 地下 ${lowerFloors} 层 · 平层 1 层`}
          />
          <StatTile
            id="studio-tile-rooms"
            icon={Ruler}
            label="功能房间"
            value={String(derived.roomCount)}
            unit="间"
            hint={
              vacantRooms > 0
                ? `另有 ${vacantRooms} 处空地待规划`
                : '全部空间均已投入使用'
            }
          />
          <StatTile
            id="studio-tile-seats"
            icon={UserPlus}
            label="工位占用"
            value={`${usedSeats}/${totalSeats}`}
            tone={usedSeats >= totalSeats ? 'signal' : 'paper'}
            hint="工位不足会限制招募与新项目承载"
          />
          <StatTile
            id="studio-tile-overhead"
            icon={Hammer}
            label="每周场地运维"
            value={money(monthlyOverhead)}
            tone="ink"
            hint={`占每周固定支出 ${Math.round((monthlyOverhead / Math.max(1, derived.weeklyBurn)) * 100)}%`}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------ 剖面 */}
      <section aria-labelledby="studio-section" className="mb-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Kicker>剖面图</Kicker>
            <h2
              id="studio-section"
              className="mt-2 font-display text-[1.75rem] uppercase leading-none"
            >
              建筑剖面
            </h2>
          </div>
          <p className="max-w-[46ch] text-[0.8125rem] leading-relaxed text-ink/60">
            点击任意房间查看使用人员与设备明细。每层两端都可以继续加房间；楼层本身则从剖面顶部与底部向外延伸。
          </p>
        </div>

        <Panel tone="ink" cut="both" className="overflow-hidden">
          {/* 向上拓建 */}
          <div className="border-b-[3px] border-paper-warm/20 px-4 py-3">
            <BuildFloorRow
              id="studio-top-add"
              label={`在 ${topLevel} 层之上加建 · ${money(FLOOR_COST.up)}`}
              hint="新增一层可用于规划 3 个房间，租金每周 2,600 元"
              direction="up"
              disabled={state.money < FLOOR_COST.up}
              onBuild={() => addFloor('up')}
            />
          </div>

          <div className="flex flex-col">
            {floors.map((floor) => {
              const isGround = floor.level === 0
              const seats = floor.rooms.reduce(
                (s, r) => s + (r.kind === 'empty' ? 0 : r.capacity),
                0,
              )
              const used = floor.rooms.reduce((s, r) => s + r.staffIds.length, 0)
              return (
                <section
                  key={floor.id}
                  aria-labelledby={`studio-floor-${floor.id}`}
                  className="border-b-[3px] border-paper-warm/20 last:border-b-0"
                >
                  {/* 楼层标头 */}
                  <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-[3px] border-paper-warm/15 bg-ink-soft px-4 py-2.5">
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'grid h-8 min-w-8 place-items-center border-[3px] px-1 font-mono text-[0.75rem] font-700',
                        isGround
                          ? 'border-signal bg-signal text-white'
                          : 'border-paper-warm/45 text-paper-warm',
                      )}
                    >
                      {floor.level > 0 ? `+${floor.level}` : floor.level === 0 ? 'G' : floor.level}
                    </span>
                    <h3
                      id={`studio-floor-${floor.id}`}
                      className="font-head text-[0.9375rem] font-800"
                    >
                      {floor.name}
                    </h3>
                    <dl className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
                      <FloorMetric label="房间" value={`${floor.rooms.length}/${floor.capacity}`} />
                      <FloorMetric label="工位" value={`${used}/${seats}`} />
                      <FloorMetric label="周租" value={money(floor.weeklyRent)} />
                    </dl>
                  </header>

                  {/* 房间带 */}
                  <div className="flex items-stretch">
                    <BuildSlotButton
                      id={`studio-add-left-${floor.id}`}
                      side="left"
                      disabled={floor.rooms.length >= floor.capacity}
                      onClick={() => {
                        setBuildTarget({ floorId: floor.id, floorName: floor.name, side: 'left' })
                        setBuildKind('planning')
                      }}
                    />

                    <ul className="grid flex-1 grid-cols-1 gap-0 divide-y-[3px] divide-paper-warm/15 sm:grid-cols-2 sm:divide-x-[3px] sm:divide-y-0 lg:grid-cols-3 xl:grid-cols-4">
                      {floor.rooms.map((room) => (
                        <li key={room.id}>
                          <RoomCard
                            room={room}
                            staffById={staffById}
                            onOpen={() => openRoom(room)}
                          />
                        </li>
                      ))}
                      {floor.rooms.length < floor.capacity && (
                        <li aria-hidden="true" className="hidden p-3 lg:block">
                          <div className="p5-hatch flex h-full min-h-[7.5rem] flex-col items-center justify-center gap-2 border-[3px] border-dashed border-paper-warm/30 px-3 text-center">
                            <Ruler
                              size={18}
                              strokeWidth={2.2}
                              className="text-paper-warm/45"
                            />
                            <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-paper-warm/45">
                              可扩建空间
                            </p>
                          </div>
                        </li>
                      )}
                    </ul>

                    <BuildSlotButton
                      id={`studio-add-right-${floor.id}`}
                      side="right"
                      disabled={floor.rooms.length >= floor.capacity}
                      onClick={() => {
                        setBuildTarget({ floorId: floor.id, floorName: floor.name, side: 'right' })
                        setBuildKind('planning')
                      }}
                    />
                  </div>
                </section>
              )
            })}
          </div>

          {/* 向下拓建 */}
          <div className="border-t-[3px] border-paper-warm/20 px-4 py-3">
            <BuildFloorRow
              id="studio-bottom-add"
              label={`在 ${bottomLevel} 层之下开挖 · ${money(FLOOR_COST.down)}`}
              hint="地下层租金更低，但湿度偏高，机房与资料库可获得额外加成"
              direction="down"
              disabled={state.money < FLOOR_COST.down}
              onBuild={() => addFloor('down')}
            />
          </div>
        </Panel>
      </section>

      {/* ------------------------------------------------------------ 房间索引 */}
      <Panel cut="tr">
        <PanelHead
          icon="Ruler"
          title="房间索引"
          latin="Room index"
          right={<Tag tone="ink">{allRooms.length} 处</Tag>}
        />
        {allRooms.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Building2}
              title="还没有任何房间"
              hint="从剖面上的「向左／向右拓建」开始，先建一间策划室。"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <caption className="sr-only">全部房间的所在楼层、类型、工位占用、设备完好度与每周成本</caption>
              <thead>
                <tr className="border-b-[3px] border-ink bg-paper-dim/70">
                  <Th>房间</Th>
                  <Th>类型</Th>
                  <Th>楼层</Th>
                  <Th>工位占用</Th>
                  <Th>设备完好</Th>
                  <Th align="right">每周成本</Th>
                  <Th align="right">操作</Th>
                </tr>
              </thead>
              <tbody>
                {allRooms.map((room) => {
                  const floor = floors.find((f) => f.rooms.some((r) => r.id === room.id))
                  const gear = room.equipment.filter((e) => e.name !== '—')
                  const health = gear.length
                    ? Math.round(gear.reduce((s, e) => s + e.condition, 0) / gear.length)
                    : 0
                  const isVacant = room.kind === 'empty'
                  return (
                    <tr
                      key={room.id}
                      className="border-b-2 border-ink/10 transition-colors duration-150 hover:bg-paper-dim/45"
                    >
                      <Td>
                        <button
                          type="button"
                          id={`studio-index-open-${room.id}`}
                          onClick={() => openRoom(room)}
                          className="inline-flex items-center gap-2 font-head text-[0.875rem] font-800 hover:text-signal"
                        >
                          <Icon name={ROOM_META[room.kind].icon} size={15} />
                          {room.name}
                        </button>
                      </Td>
                      <Td>
                        <Tag tone={isVacant ? 'pulse' : 'paper'}>{ROOM_META[room.kind].label}</Tag>
                      </Td>
                      <Td>
                        <span className="font-mono text-[0.75rem] font-700">
                          {floor
                            ? floor.level > 0
                              ? `+${floor.level} 层`
                              : floor.level === 0
                                ? '平层'
                                : `${floor.level} 层`
                            : '—'}
                        </span>
                      </Td>
                      <Td>
                        {isVacant ? (
                          <span className="text-ink/40">—</span>
                        ) : (
                          <span className="tabular font-mono text-[0.75rem] font-700">
                            {room.staffIds.length} / {room.capacity}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {isVacant ? (
                          <span className="text-ink/40">—</span>
                        ) : (
                          <span className="flex w-32 items-center gap-2">
                            <Meter
                              value={health}
                              height={9}
                              tone={health < 55 ? 'signal' : health < 75 ? 'pulse' : 'jade'}
                            />
                            <span className="tabular font-mono text-[0.6875rem] font-700">
                              {health}
                            </span>
                          </span>
                        )}
                      </Td>
                      <Td align="right">
                        <span className="tabular font-mono text-[0.75rem] font-700">
                          {room.weeklyCost === 0 ? '—' : money(room.weeklyCost)}
                        </span>
                      </Td>
                      <Td align="right">
                        <Btn
                          id={`studio-index-detail-${room.id}`}
                          size="sm"
                          onClick={() => openRoom(room)}
                        >
                          详情
                        </Btn>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ------------------------------------------------------- 房间详情 */}
      <Modal
        open={liveRoom !== null}
        onClose={() => setRoomDetail(null)}
        title={liveRoom?.name ?? ''}
        latin={liveRoom ? `${ROOM_META[liveRoom.kind].label} · Lv.${liveRoom.level}` : undefined}
        kicker="房间详情"
        size="lg"
        footer={
          <>
            <Btn id="studio-room-close" onClick={() => setRoomDetail(null)}>
              关闭
            </Btn>
            {liveRoom && liveRoom.kind !== 'empty' && (
              <Btn
                id={`studio-room-upgrade-${liveRoom.id}`}
                variant="signal"
                icon={Hammer}
                onClick={() => upgradeRoom(liveRoom.id)}
              >
                扩建房间 · {money(96_000)}
              </Btn>
            )}
          </>
        }
      >
        {liveRoom && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailStat label="房间类型" value={ROOM_META[liveRoom.kind].label} />
              <DetailStat
                label="工位占用"
                value={
                  liveRoom.kind === 'empty'
                    ? '未规划'
                    : `${liveRoom.staffIds.length} / ${liveRoom.capacity} 人`
                }
              />
              <DetailStat
                label="每周成本"
                value={liveRoom.weeklyCost === 0 ? '—' : money(liveRoom.weeklyCost)}
              />
            </div>

            <div className="border-l-[4px] border-signal bg-paper-dim/50 px-4 py-3">
              <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.2em] text-ink/50">
                房间加成
              </p>
              <p className="mt-1 font-head text-[0.9375rem] font-800">{liveRoom.perk}</p>
              <p className="mt-1 text-[0.8125rem] text-ink/62">
                {ROOM_META[liveRoom.kind].blurb}
              </p>
            </div>

            <Tabs
              idPrefix="studio-room"
              active={detailTab}
              onChange={setDetailTab}
              items={[
                { id: 'staff', label: '使用人员', latin: 'Staff', count: liveRoom.staffIds.length },
                { id: 'gear', label: '设备信息', latin: 'Equipment', count: liveRoom.equipment.length },
              ]}
            />

            <TabPanel idPrefix="studio-room" id="staff" className="pt-4">
              {liveRoom.kind === 'empty' ? (
                <EmptyState
                  icon={Ruler}
                  title="这块空地还没有用途"
                  hint="先建造一个功能房间，才能分配人员与设备。"
                />
              ) : liveRoom.staffIds.length === 0 ? (
                <EmptyState
                  icon={UserPlus}
                  title="尚无人员进驻"
                  hint={`该房间可容纳 ${liveRoom.capacity} 人。分配人员后房间加成才会生效。`}
                  action={
                    <Btn
                      id={`studio-room-assign-${liveRoom.id}`}
                      variant="signal"
                      icon={UserPlus}
                      onClick={() => setAssignOpen(true)}
                    >
                      分配人员
                    </Btn>
                  }
                />
              ) : (
                <>
                  <ul className="space-y-3">
                    {liveRoom.staffIds.map((sid, i) => {
                      const person = staffById.get(sid)
                      if (!person) return null
                      return (
                        <li
                          key={sid}
                          className="flex flex-col gap-3 border-[3px] border-ink/15 p-3 sm:flex-row sm:items-center sm:gap-4"
                        >
                          <Avatar name={person.name} size={42} index={i} />
                          <div className="min-w-0 flex-1">
                            <p className="font-head text-[0.9375rem] font-800">
                              {person.name}
                              <span className="ml-2 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                                {person.handle}
                              </span>
                            </p>
                            <p className="mt-0.5 text-[0.8125rem] text-ink/62">{person.title}</p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                              <InlineStat label="体力" value={person.stamina} warn={person.stamina < 55} />
                              <InlineStat label="士气" value={person.morale} warn={person.morale < 62} />
                              <InlineStat label="周薪" value={money(person.salary)} />
                            </div>
                          </div>
                          <Tag tone={ROLE_META[person.role].accent}>{ROLE_META[person.role].label}</Tag>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <Btn
                      id={`studio-room-assign-more-${liveRoom.id}`}
                      icon={UserPlus}
                      disabled={liveRoom.staffIds.length >= liveRoom.capacity}
                      onClick={() => setAssignOpen(true)}
                    >
                      {liveRoom.staffIds.length >= liveRoom.capacity
                        ? '工位已满，需先扩建'
                        : '继续分配人员'}
                    </Btn>
                    <Btn
                      id={`studio-room-upgrade-from-staff-${liveRoom.id}`}
                      variant="ghost"
                      icon={Hammer}
                      onClick={() => upgradeRoom(liveRoom.id)}
                    >
                      扩建工位
                    </Btn>
                  </div>
                </>
              )}
            </TabPanel>

            <TabPanel idPrefix="studio-room" id="gear" className="pt-4">
              <ul className="space-y-3">
                {liveRoom.equipment.map((e, i) => (
                  <li
                    key={e.id}
                    className="flex flex-col gap-3 border-[3px] border-ink/15 p-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'grid h-11 w-11 shrink-0 place-items-center border-[3px] border-ink',
                        e.condition < 55 ? 'bg-signal text-white' : 'bg-paper-warm',
                      )}
                    >
                      <Wrench size={18} strokeWidth={2.4} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-head text-[0.9375rem] font-800">
                        {e.name}
                        <span className="ml-2 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-ink/45">
                          TIER {e.tier}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] text-ink/62">{e.note}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="w-32">
                          <Meter
                            value={e.condition}
                            height={9}
                            tone={
                              e.condition < 55 ? 'signal' : e.condition < 75 ? 'pulse' : 'jade'
                            }
                          />
                        </span>
                        <span className="tabular font-mono text-[0.6875rem] font-700">
                          完好度 {e.condition}%
                        </span>
                        {e.condition < 60 && (
                          <span className="flex items-center gap-1 font-mono text-[0.5625rem] font-700 uppercase tracking-[0.12em] text-signal">
                            <TriangleAlert size={12} strokeWidth={2.8} aria-hidden="true" />
                            建议保养
                          </span>
                        )}
                      </div>
                    </div>
                    <Btn
                      id={`studio-gear-fix-${e.id}-${i}`}
                      size="sm"
                      onClick={() => maintainEquipment(liveRoom.id, e.id)}
                    >
                      保养 · {money(8_400)}
                    </Btn>
                  </li>
                ))}
              </ul>
            </TabPanel>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------- 建造房间 */}
      <Modal
        open={buildTarget !== null}
        onClose={() => setBuildTarget(null)}
        title={`向${buildTarget?.side === 'right' ? '右' : '左'}拓建房间`}
        latin={buildTarget?.floorName}
        kicker="建造"
        size="lg"
        footer={
          <>
            <Btn id="studio-build-cancel" onClick={() => setBuildTarget(null)}>
              取消
            </Btn>
            <Btn
              id="studio-build-confirm"
              variant="signal"
              icon={Hammer}
              onClick={() => {
                if (!buildTarget) return
                addRoom(buildTarget.floorId, buildTarget.side, buildKind)
                setBuildTarget(null)
              }}
            >
              确认建造 · {money(ROOM_META[buildKind].cost)}
            </Btn>
          </>
        }
      >
        <p className="mb-4 border-l-[3px] border-signal pl-4 text-[0.875rem] leading-relaxed text-ink/72">
          选择要建造的房间类型。不同房间提供不同的团队加成，工位容量与每周运维成本也各不相同。
        </p>
        <fieldset>
          <legend className="mb-3 font-mono text-[0.625rem] font-700 uppercase tracking-[0.2em] text-ink/55">
            房间类型
          </legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(Object.keys(ROOM_META) as RoomKind[])
              .filter((k) => k !== 'empty')
              .map((k) => {
                const meta = ROOM_META[k]
                const on = buildKind === k
                const affordable = state.money >= meta.cost
                return (
                  <button
                    key={k}
                    type="button"
                    id={`studio-build-kind-${k}`}
                    aria-pressed={on}
                    disabled={!affordable}
                    onClick={() => setBuildKind(k)}
                    className={clsx(
                      'flex items-start gap-3 border-[3px] p-3 text-left transition-transform duration-150 ease-snap',
                      on
                        ? 'border-ink bg-signal text-white shadow-hard'
                        : 'border-ink/30 bg-paper-warm hover:-translate-y-[2px] hover:border-ink',
                      !affordable && 'cursor-not-allowed opacity-45 hover:translate-y-0',
                    )}
                  >
                    <span
                      className={clsx(
                        'grid h-9 w-9 shrink-0 place-items-center border-2',
                        on ? 'border-white/70' : 'border-ink',
                      )}
                    >
                      <Icon name={meta.icon} size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-head text-[0.875rem] font-800">{meta.label}</span>
                        <span className="tabular font-mono text-[0.6875rem] font-700">
                          {money(meta.cost)}
                        </span>
                      </span>
                      <span
                        className={clsx(
                          'mt-1 block text-[0.75rem] leading-snug',
                          on ? 'text-white/80' : 'text-ink/60',
                        )}
                      >
                        {meta.blurb}
                      </span>
                      <span
                        className={clsx(
                          'mt-1.5 block font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em]',
                          on ? 'text-white/70' : 'text-ink/45',
                        )}
                      >
                        容量 {ROOM_CAP[k]} 人
                        {!affordable && ' · 资金不足'}
                      </span>
                    </span>
                  </button>
                )
              })}
          </div>
        </fieldset>
      </Modal>

      {/* ------------------------------------------------------- 分配人员 */}
      <Modal
        open={assignOpen && liveRoom !== null}
        onClose={() => setAssignOpen(false)}
        title="分配人员"
        latin={liveRoom?.name}
        kicker="人员调配"
        size="lg"
        footer={
          <Btn id="studio-assign-close" onClick={() => setAssignOpen(false)}>
            完成
          </Btn>
        }
      >
        {liveRoom && (
          <>
            <p className="mb-4 border-l-[3px] border-signal pl-4 text-[0.875rem] leading-relaxed text-ink/72">
              当前房间工位 {liveRoom.staffIds.length} / {liveRoom.capacity}。选中的人员将从原房间调离。
            </p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {state.staff.map((person, i) => {
                const here = person.roomId === liveRoom.id
                const elsewhere = person.roomId !== null && !here
                const otherRoom = elsewhere
                  ? allRooms.find((r) => r.id === person.roomId)
                  : undefined
                const full = !here && liveRoom.staffIds.length >= liveRoom.capacity
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      id={`studio-assign-${person.id}`}
                      aria-pressed={here}
                      disabled={full}
                      onClick={() => {
                        if (here) {
                          toast.push({
                            severity: 'info',
                            title: `${person.name} 已在本房间`,
                            detail: '如需调离，请在人员页执行「解除分配」。',
                          })
                          return
                        }
                        assignStaff(person.id, liveRoom.id)
                        setAssignOpen(false)
                      }}
                      className={clsx(
                        'flex w-full items-center gap-3 border-[3px] p-3 text-left transition-transform duration-150 ease-snap',
                        here
                          ? 'border-ink bg-ink text-paper-warm'
                          : 'border-ink/25 bg-paper-warm hover:-translate-y-[2px] hover:border-ink',
                        full && 'cursor-not-allowed opacity-45 hover:translate-y-0',
                      )}
                    >
                      <Avatar name={person.name} size={38} index={i} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-head text-[0.875rem] font-800">
                          {person.name}
                        </span>
                        <span
                          className={clsx(
                            'block truncate font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em]',
                            here ? 'text-paper-warm/60' : 'text-ink/50',
                          )}
                        >
                          {person.title}
                          {otherRoom ? ` · 现于${otherRoom.name}` : ' · 未分配'}
                        </span>
                      </span>
                      {here ? (
                        <UserMinus size={16} strokeWidth={2.6} aria-hidden="true" />
                      ) : (
                        <UserPlus size={16} strokeWidth={2.6} aria-hidden="true" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Modal>
    </>
  )
}

/* ---------------------------------------------------------------- 子组件 */

const ROOM_CAP: Record<RoomKind, number> = {
  planning: 4,
  engineering: 5,
  art: 4,
  audio: 3,
  meeting: 8,
  lounge: 6,
  server: 2,
  qa: 4,
  negotiation: 4,
  mocap: 3,
  vault: 2,
  empty: 0,
}

function RoomCard({
  room,
  staffById,
  onOpen,
}: {
  room: Room
  staffById: Map<string, Staff>
  onOpen: () => void
}) {
  const meta = ROOM_META[room.kind]
  const isVacant = room.kind === 'empty'
  const gear = room.equipment.filter((e) => e.name !== '—')
  const health = gear.length
    ? Math.round(gear.reduce((s, e) => s + e.condition, 0) / gear.length)
    : 0

  return (
    <button
      type="button"
      id={`studio-room-card-${room.id}`}
      onClick={onOpen}
      aria-label={`打开房间详情：${room.name}`}
      className={clsx(
        'group relative flex h-full min-h-[9rem] w-full flex-col gap-3 p-3 text-left transition-colors duration-200',
        isVacant ? 'bg-ink hover:bg-ink-soft' : 'hover:bg-signal',
      )}
    >
      <span className="flex items-start gap-2.5">
        <span
          className={clsx(
            'grid h-9 w-9 shrink-0 place-items-center border-[3px]',
            isVacant
              ? 'border-paper-warm/35 text-paper-warm/60'
              : 'border-paper-warm/55 text-paper-warm group-hover:border-white',
          )}
        >
          <Icon name={meta.icon} size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-head text-[0.9375rem] font-800 text-paper-warm">
            {room.name}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-paper-warm/55">
              {meta.label}
            </span>
            {!isVacant && (
              <span className="border border-paper-warm/40 px-1 font-mono text-[0.5rem] font-700 tracking-[0.1em] text-paper-warm/70">
                LV.{room.level}
              </span>
            )}
          </span>
        </span>
      </span>

      {isVacant ? (
        <span className="mt-auto border-t-[3px] border-paper-warm/15 pt-2.5">
          <span className="block font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-paper-warm/45">
            尚未规划用途
          </span>
          <span className="mt-1 block text-[0.75rem] leading-snug text-paper-warm/60">
            点击可查看，或从本层两端拓建新房间。
          </span>
        </span>
      ) : (
        <>
          <span className="flex flex-wrap items-center gap-1.5">
            {room.staffIds.length === 0 ? (
              <span className="border border-dashed border-paper-warm/35 px-1.5 py-0.5 font-mono text-[0.5rem] font-700 tracking-[0.12em] text-paper-warm/50">
                无人在岗
              </span>
            ) : (
              room.staffIds.slice(0, 5).map((sid, i) => {
                const p = staffById.get(sid)
                if (!p) return null
                return (
                  <span
                    key={sid}
                    title={`${p.name} · ${p.title}`}
                    className="block border-2 border-paper-warm/55"
                  >
                    <Avatar name={p.name} size={22} index={i} className="!border-0" />
                  </span>
                )
              })
            )}
            {room.staffIds.length > 5 && (
              <span className="font-mono text-[0.5625rem] font-700 text-paper-warm/60">
                +{room.staffIds.length - 5}
              </span>
            )}
            <span className="ml-auto font-mono text-[0.5625rem] font-700 text-paper-warm/60">
              {room.staffIds.length}/{room.capacity}
            </span>
          </span>

          <span className="mt-auto border-t-[3px] border-paper-warm/15 pt-2.5">
            <span className="mb-1 flex items-baseline justify-between gap-2">
              <span className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-paper-warm/50">
                设备完好
              </span>
              <span className="tabular font-mono text-[0.625rem] font-700 text-paper-warm">
                {health}%
              </span>
            </span>
            <span className="flex h-[9px] w-full border-2 border-paper-warm/45">
              <span
                className={clsx(
                  'h-full transition-[width] duration-300',
                  health < 55 ? 'bg-pulse' : 'bg-paper-warm',
                )}
                style={{ width: `${health}%` }}
              />
            </span>
          </span>
        </>
      )}
    </button>
  )
}

function BuildFloorRow({
  id,
  label,
  hint,
  direction,
  disabled,
  onBuild,
}: {
  id: string
  label: string
  hint: string
  direction: 'up' | 'down'
  disabled: boolean
  onBuild: () => void
}) {
  const Arrow = direction === 'up' ? ArrowUpToLine : ArrowDownToLine
  return (
    <button
      type="button"
      id={id}
      disabled={disabled}
      onClick={onBuild}
      className={clsx(
        'group flex w-full flex-col items-center gap-2 border-[3px] border-dashed px-4 py-3 text-center transition-colors duration-150 sm:flex-row sm:justify-center sm:gap-4 sm:text-left',
        disabled
          ? 'cursor-not-allowed border-paper-warm/20 text-paper-warm/35'
          : 'border-paper-warm/45 text-paper-warm hover:border-signal hover:bg-signal',
      )}
    >
      <Arrow size={20} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
      <span className="min-w-0">
        <span className="block font-head text-[0.875rem] font-800">{label}</span>
        <span className="mt-0.5 block font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] opacity-65">
          {disabled ? '资金不足' : hint}
        </span>
      </span>
    </button>
  )
}

function BuildSlotButton({
  id,
  side,
  disabled,
  onClick,
}: {
  id: string
  side: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  const Arrow = side === 'left' ? ArrowLeftToLine : ArrowRightToLine
  return (
    <button
      type="button"
      id={id}
      disabled={disabled}
      onClick={onClick}
      aria-label={side === 'left' ? '向左拓建新房间' : '向右拓建新房间'}
      className={clsx(
        'group flex w-[3.25rem] shrink-0 flex-col items-center justify-center gap-2 border-paper-warm/20 transition-colors duration-150 sm:w-[4.5rem]',
        side === 'left' ? 'border-r-[3px]' : 'border-l-[3px]',
        disabled
          ? 'cursor-not-allowed text-paper-warm/22'
          : 'p5-hatch text-paper-warm/70 hover:bg-signal hover:text-white',
      )}
    >
      <Arrow size={19} strokeWidth={2.6} aria-hidden="true" />
      <span className="font-mono text-[0.5rem] font-700 uppercase tracking-[0.14em] [writing-mode:vertical-rl]">
        {disabled ? '本层已满' : side === 'left' ? '向左拓建' : '向右拓建'}
      </span>
    </button>
  )
}

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

function FloorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.16em] text-paper-warm/45">
        {label}
      </dt>
      <dd className="tabular font-mono text-[0.6875rem] font-700 text-paper-warm">{value}</dd>
    </div>
  )
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-[3px] border-ink/15 px-3 py-2.5">
      <p className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.18em] text-ink/50">
        {label}
      </p>
      <p className="mt-1 font-head text-[0.9375rem] font-800">{value}</p>
    </div>
  )
}

function InlineStat({
  label,
  value,
  warn = false,
}: {
  label: string
  value: string | number
  warn?: boolean
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="font-mono text-[0.5625rem] font-700 uppercase tracking-[0.14em] text-ink/45">
        {label}
      </span>
      <span
        className={clsx(
          'tabular font-mono text-[0.6875rem] font-700',
          warn ? 'text-signal' : 'text-ink',
        )}
      >
        {value}
      </span>
    </span>
  )
}
