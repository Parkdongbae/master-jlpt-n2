/**
 * 학습 엔진: 하루 세션, 기억상자, 반복 규칙. 화면·저장소와 무관한 순수 함수만 둔다.
 * 규칙은 docs/03_학습엔진_화면_지시서.md 3~5절.
 */
import type { CardState, DayRecord, Settings, UserData, Vocab } from '../types'

export const CHECK_DAYS = [3, 7, 21]
export const REVIEW_CAP = 100
export const MIN_GOAL = 10
export const XP = { new: 2, review: 1, goal: 30, gameDailyCap: 120 }

const DAY_MS = 86400000

/** 학습일: 새벽 4시에 날짜가 바뀐다 */
export function studyDay(now: Date = new Date()): string {
  const d = new Date(now.getTime() - 4 * 3600000)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d) + n * DAY_MS)
  return t.toISOString().slice(0, 10)
}

export function diffDays(a: string, b: string): number {
  const p = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((p(a) - p(b)) / DAY_MS)
}

export function emptyDay(): DayRecord {
  return { new: 0, review: 0, boxed: 0, goal: false, xp: 0, gameXp: 0 }
}

/** 문자열 → 32비트 해시 (사용자별 고정 섞기용) */
export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function matches(v: Vocab, s: Settings): boolean {
  if (!s.pos.includes(v.pos)) return false
  if (s.scope === 'kichul' && !v.years.some((y) => s.years.includes(y))) return false
  return true
}

/** 오늘 복습할 카드: 상자 안(오래 담긴 순) → 탈출 확인. 오늘 담은 카드와 오늘 이미 복습한 카드는 제외 */
export function reviewQueue(cards: Record<string, CardState>, today: string, cap = REVIEW_CAP): string[] {
  const box: [string, string][] = []
  const check: [string, string][] = []
  for (const id in cards) {
    const c = cards[id]
    if (c.lr === today) continue
    if (c.s === 'b' && c.boxed! < today) box.push([c.boxed!, id])
    else if (c.s === 'c' && c.due! <= today) check.push([c.due!, id])
  }
  const byKey = (a: [string, string], b: [string, string]) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1)
  return [...box.sort(byKey), ...check.sort(byKey)].slice(0, cap).map((x) => x[1])
}

/** 아직 안 본 카드 중 조건에 맞는 것을 순서대로 */
export function newQueue(vocab: Vocab[], user: Pick<UserData, 'cards' | 'settings' | 'name'>, count: number): string[] {
  const s = user.settings
  const pool = vocab.filter((v) => !user.cards[v.id] && matches(v, s))
  const key = (v: Vocab) => hash(user.name + v.id)
  if (s.order === 'freq') pool.sort((a, b) => b.freq - a.freq || key(a) - key(b))
  else pool.sort((a, b) => key(a) - key(b))
  return pool.slice(0, count).map((v) => v.id)
}

export function remainingNew(vocab: Vocab[], user: Pick<UserData, 'cards' | 'settings'>): number {
  return vocab.reduce((n, v) => n + (!user.cards[v.id] && matches(v, user.settings) ? 1 : 0), 0)
}

function day(user: UserData, today: string): DayRecord {
  return (user.days[today] ??= emptyDay())
}

function gain(user: UserData, today: string, xp: number) {
  user.xp += xp
  day(user, today).xp += xp
}

/**
 * 카드를 넘겼을 때(왼쪽으로 밀기). 상태에 따라:
 *  - 새 카드: 학습함으로 기록, 오늘 새 카드 수 +1
 *  - 상자 안: 그대로 남고 내일 또 나온다
 *  - 탈출 확인 중: 통과 처리, 다음 확인 단계로
 */
export function pass(user: UserData, id: string, today: string): { goalJustMet: boolean } {
  const c = user.cards[id]
  const d = day(user, today)
  let goalJustMet = false
  if (!c) {
    user.cards[id] = { s: 'l' }
    d.new++
    gain(user, today, XP.new)
    if (!d.goal && d.new >= user.settings.goal) {
      d.goal = true
      gain(user, today, XP.goal)
      goalJustMet = true
    }
  } else if (c.s === 'b') {
    if (c.boxed === today) return { goalJustMet } // 방금 담은 카드를 넘기는 경우
    if (c.lr !== today) {
      c.lr = today
      c.n = (c.n ?? 0) + 1
      d.review++
      gain(user, today, XP.review)
    }
  } else if (c.s === 'c' && c.due! <= today && c.lr !== today) {
    c.lr = today
    c.n = (c.n ?? 0) + 1
    d.review++
    gain(user, today, XP.review)
    const next = (c.stage ?? 0) + 1
    if (next >= CHECK_DAYS.length) {
      user.cards[id] = { s: 'd', n: c.n }
    } else {
      c.stage = next
      c.due = addDays(today, CHECK_DAYS[next] - CHECK_DAYS[next - 1])
    }
  }
  return { goalJustMet }
}

/** 기억상자에 담기 (새 카드·학습한 카드·탈출 확인 중인 카드 모두 가능) */
export function putInBox(user: UserData, id: string, today: string) {
  const c = user.cards[id]
  if (c?.s === 'b') return
  const d = day(user, today)
  if (!c) {
    d.new++
    gain(user, today, XP.new)
    if (!d.goal && d.new >= user.settings.goal) {
      d.goal = true
      gain(user, today, XP.goal)
    }
  }
  user.cards[id] = { s: 'b', boxed: today, n: c?.n ?? 0, lr: c?.lr }
  d.boxed++
}

/** 오늘 담은 것을 취소 (같은 카드에서 버튼을 다시 누름) */
export function cancelBox(user: UserData, id: string, today: string) {
  const c = user.cards[id]
  if (c?.s !== 'b' || c.boxed !== today) return
  user.cards[id] = { s: 'l' }
  const d = day(user, today)
  d.boxed = Math.max(0, d.boxed - 1)
}

/** 기억상자 탈출: 3일 뒤부터 확인 복습 */
export function escapeBox(user: UserData, id: string, today: string) {
  const c = user.cards[id]
  if (c?.s !== 'b') return
  const d = day(user, today)
  if (c.lr !== today && c.boxed! < today) {
    d.review++
    gain(user, today, XP.review)
  }
  user.cards[id] = { s: 'c', stage: 0, due: addDays(today, CHECK_DAYS[0]), lr: today, n: (c.n ?? 0) + 1 }
}

/** 목표를 달성한 날이 이어진 일수. 오늘 아직 못 채웠으면 어제까지를 센다 */
export function streak(days: Record<string, DayRecord>, today: string): number {
  let n = 0
  let d = days[today]?.goal ? today : addDays(today, -1)
  while (days[d]?.goal) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export const LEVELS = ['입문', '도전자', '실력자', '고수', '합격권']

/** 경험치 → 레벨(1부터), 칭호, 현재 레벨 안에서의 진행률 */
export function level(xp: number) {
  let lv = 1
  let need = 100
  let rest = xp
  while (rest >= need) {
    rest -= need
    lv++
    need = Math.round(need * 1.15)
  }
  const title = LEVELS[Math.min(LEVELS.length - 1, Math.floor((lv - 1) / 5))]
  return { lv, title, rest, need }
}

export function counts(cards: Record<string, CardState>) {
  const c = { learned: 0, box: 0, check: 0, done: 0, total: 0 }
  for (const id in cards) {
    const s = cards[id].s
    c.total++
    if (s === 'l') c.learned++
    else if (s === 'b') c.box++
    else if (s === 'c') c.check++
    else c.done++
  }
  return c
}

/** 게임 경험치: 하루 상한 적용 후 실제로 준 값 */
export function gainGameXp(user: UserData, today: string, xp: number): number {
  const d = day(user, today)
  const give = Math.max(0, Math.min(xp, XP.gameDailyCap - d.gameXp))
  d.gameXp += give
  gain(user, today, give)
  return give
}

export function weekKey(dayStr: string): string {
  // 월요일 시작 주의 월요일 날짜
  const [y, m, d] = dayStr.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  const dow = (t.getUTCDay() + 6) % 7
  return addDays(dayStr, -dow)
}

export function weekXp(days: Record<string, DayRecord>, today: string): number {
  const start = weekKey(today)
  let sum = 0
  for (let i = 0; i < 7; i++) sum += days[addDays(start, i)]?.xp ?? 0
  return sum
}
