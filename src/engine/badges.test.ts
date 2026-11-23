import { describe, expect, it } from 'vitest'
import { badges, longestStreak } from './badges'
import { DEFAULT_SETTINGS, type CardState, type DayRecord, type UserData } from '../types'

const day = (goal: boolean): DayRecord => ({ new: goal ? 50 : 1, review: 0, boxed: 0, goal, xp: 0, gameXp: 0 })

function user(p: Partial<UserData> = {}): UserData {
  return {
    name: 't', joined: '2026-01-01', settings: { ...DEFAULT_SETTINGS }, cards: {}, days: {},
    xp: 0, best: {}, badges: {}, tutorial: false, updatedAt: 0, ...p,
  }
}
const get = (u: UserData, id: string, total = 1000) => badges(u, '2026-11-22', total).find((b) => b.id === id)!

describe('badges', () => {
  it('빈 사용자는 아무것도 못 얻는다', () => {
    const list = badges(user(), '2026-11-22', 1000)
    expect(list.every((b) => !b.earned && b.progress === 0)).toBe(true)
    expect(new Set(list.map((b) => b.id)).size).toBe(list.length)
  })

  it('최장 연속 기록: 끊겨도 지난 최장 기준', () => {
    const days: Record<string, DayRecord> = {}
    for (let i = 1; i <= 7; i++) days[`2026-03-0${i}`] = day(true)
    days['2026-03-08'] = day(false)
    days['2026-03-10'] = day(true)
    expect(longestStreak(days)).toBe(7)
    expect(get(user({ days }), 'streak-7').earned).toBe(true)
    expect(get(user({ days }), 'streak-30').progress).toBeCloseTo(7 / 30)
    expect(get(user({ days }), 'first-goal').earned).toBe(true)
  })

  it('카드 개수 기준', () => {
    const cards: Record<string, CardState> = {}
    for (let i = 0; i < 500; i++) cards['w:' + i] = { s: 'l' }
    for (let i = 0; i < 50; i++) cards['w:' + i] = { s: i < 20 ? 'c' : 'd' }
    const u = user({ cards })
    expect(get(u, 'learn-500').earned).toBe(true)
    expect(get(u, 'learn-1000').progress).toBeCloseTo(0.5)
    expect(get(u, 'escape-50').earned).toBe(true)
    expect(get(u, 'master-100').progress).toBeCloseTo(0.3)
    expect(get(u, 'learn-all', 500).earned).toBe(true)
    expect(get(u, 'learn-all', 501).earned).toBe(false)
  })

  it('게임 최고 기록', () => {
    const u = user({ best: { quiz: 300, match: 150 } })
    expect(get(u, 'quiz-300').earned).toBe(true)
    expect(get(u, 'match-300').progress).toBeCloseTo(0.5)
    expect(get(u, 'read-100').earned).toBe(false)
  })

  it('전체 단어 수가 0이면 얻지 않는다', () => {
    expect(get(user(), 'learn-all', 0).earned).toBe(false)
  })
})
