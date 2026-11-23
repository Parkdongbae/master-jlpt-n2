import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type UserData, type Vocab } from '../types'
import {
  addDays, cancelBox, escapeBox, gainGameXp, level, newQueue, pass, putInBox, reviewQueue, streak, studyDay, weekKey, XP,
} from './engine'

const D1 = '2026-11-23'
const day = (n: number) => addDays(D1, n - 1)

function user(goal = 30): UserData {
  return {
    name: '테스트', joined: D1, settings: { ...DEFAULT_SETTINGS, goal }, cards: {}, days: {},
    xp: 0, best: {}, badges: {}, tutorial: true, updatedAt: 0,
  }
}

function vocab(n: number): Vocab[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `w:${i}`, w: `語${i}`, r: `ご${i}`, pos: '명사' as const, ko: ['뜻'], ex: '', exko: '', freq: n - i,
    exams: ['2024-07'], years: [2024], secs: ['reading' as const], kanji: ['語'],
  }))
}

describe('학습일', () => {
  it('새벽 4시 전은 전날로 계산한다', () => {
    expect(studyDay(new Date(2026, 10, 23, 3, 59))).toBe('2026-11-22')
    expect(studyDay(new Date(2026, 10, 23, 4, 0))).toBe('2026-11-23')
  })
  it('주의 시작은 월요일', () => {
    expect(weekKey('2026-11-22')).toBe('2026-11-16') // 일요일
    expect(weekKey('2026-11-23')).toBe('2026-11-23') // 월요일
  })
})

describe('새 카드', () => {
  it('빈도 높은 순으로 나오고 본 카드는 다시 안 나온다', () => {
    const u = user()
    const v = vocab(100)
    const q = newQueue(v, u, 5)
    expect(q).toEqual(['w:0', 'w:1', 'w:2', 'w:3', 'w:4'])
    pass(u, 'w:0', D1)
    expect(newQueue(v, u, 5)[0]).toBe('w:1')
  })
  it('필터에 맞지 않는 카드는 제외한다', () => {
    const u = user()
    u.settings.pos = ['동사']
    expect(newQueue(vocab(10), u, 5)).toEqual([])
    u.settings.pos = ['명사']
    u.settings.scope = 'kichul'
    u.settings.years = [2023]
    expect(newQueue(vocab(10), u, 5)).toEqual([])
    u.settings.years = [2024]
    expect(newQueue(vocab(10), u, 5)).toHaveLength(5)
  })
  it('목표 개수를 채우면 달성 처리와 보너스 경험치', () => {
    const u = user(30)
    let met = false
    for (let i = 0; i < 30; i++) met = pass(u, `w:${i}`, D1).goalJustMet
    expect(met).toBe(true)
    expect(u.days[D1].goal).toBe(true)
    expect(u.xp).toBe(30 * XP.new + XP.goal)
    expect(streak(u.days, D1)).toBe(1)
  })
})

describe('기억상자', () => {
  it('1일차에 담은 카드는 그날은 복습에 안 나오고 2일차 맨 앞에 나온다', () => {
    const u = user()
    putInBox(u, 'w:3', D1)
    expect(reviewQueue(u.cards, D1)).toEqual([])
    expect(reviewQueue(u.cards, day(2))).toEqual(['w:3'])
    expect(u.days[D1].new).toBe(1) // 담은 새 카드도 오늘 학습 수에 포함
  })
  it('탈출하지 않고 넘기면 3일차에도 다시 나온다 (하루에 한 번만)', () => {
    const u = user()
    putInBox(u, 'w:3', D1)
    pass(u, 'w:3', day(2))
    expect(reviewQueue(u.cards, day(2))).toEqual([])
    expect(reviewQueue(u.cards, day(3))).toEqual(['w:3'])
    expect(u.days[day(2)].review).toBe(1)
  })
  it('며칠 쉬어도 밀린 복습은 한 번만 나온다', () => {
    const u = user()
    putInBox(u, 'w:3', D1)
    expect(reviewQueue(u.cards, day(10))).toEqual(['w:3'])
  })
  it('오래 담긴 카드가 먼저 나온다', () => {
    const u = user()
    putInBox(u, 'w:9', day(2))
    putInBox(u, 'w:1', D1)
    expect(reviewQueue(u.cards, day(3))).toEqual(['w:1', 'w:9'])
  })
  it('같은 날 담기를 취소할 수 있다', () => {
    const u = user()
    putInBox(u, 'w:3', D1)
    cancelBox(u, 'w:3', D1)
    expect(u.cards['w:3'].s).toBe('l')
    expect(u.days[D1].boxed).toBe(0)
  })
  it('탈출 후 3·7·21일 뒤에 확인하고 모두 통과하면 완전 암기', () => {
    const u = user()
    putInBox(u, 'w:3', D1)
    escapeBox(u, 'w:3', day(2))
    expect(u.cards['w:3'].s).toBe('c')
    expect(reviewQueue(u.cards, day(4))).toEqual([])
    expect(reviewQueue(u.cards, day(5))).toEqual(['w:3']) // 탈출 3일 뒤
    pass(u, 'w:3', day(5))
    expect(reviewQueue(u.cards, day(8))).toEqual([])
    expect(reviewQueue(u.cards, day(9))).toEqual(['w:3']) // 탈출 7일 뒤
    pass(u, 'w:3', day(9))
    expect(reviewQueue(u.cards, day(23))).toEqual(['w:3']) // 탈출 21일 뒤
    pass(u, 'w:3', day(23))
    expect(u.cards['w:3'].s).toBe('d')
    expect(reviewQueue(u.cards, day(60))).toEqual([])
  })
  it('탈출 확인에서 모르면 다시 상자로 돌아간다', () => {
    const u = user()
    putInBox(u, 'w:3', D1)
    escapeBox(u, 'w:3', day(2))
    putInBox(u, 'w:3', day(5))
    expect(u.cards['w:3'].s).toBe('b')
    expect(reviewQueue(u.cards, day(6))).toEqual(['w:3'])
  })
  it('복습은 하루 목표에 포함되지 않는다', () => {
    const u = user()
    putInBox(u, 'w:3', D1)
    pass(u, 'w:3', day(2))
    expect(u.days[day(2)].new).toBe(0)
  })
  it('복습 대상이 많으면 상한까지만 나온다', () => {
    const u = user()
    for (let i = 0; i < 150; i++) putInBox(u, `w:${i}`, D1)
    expect(reviewQueue(u.cards, day(2)).length).toBe(100)
  })
})

describe('보상', () => {
  it('연속 학습일은 하루 빠지면 끊긴다', () => {
    const u = user()
    const g = { new: 30, review: 0, boxed: 0, goal: true, xp: 0, gameXp: 0 }
    u.days[day(1)] = { ...g }
    u.days[day(2)] = { ...g }
    expect(streak(u.days, day(3))).toBe(2) // 오늘 아직 안 했어도 어제까지 유지
    expect(streak(u.days, day(4))).toBe(0)
  })
  it('게임 경험치는 하루 상한이 있다', () => {
    const u = user()
    expect(gainGameXp(u, D1, 100)).toBe(100)
    expect(gainGameXp(u, D1, 100)).toBe(20)
    expect(gainGameXp(u, D1, 100)).toBe(0)
  })
  it('레벨은 경험치에 따라 오른다', () => {
    expect(level(0).lv).toBe(1)
    expect(level(100).lv).toBe(2)
    expect(level(0).title).toBe('입문')
  })
})
