import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type CardState, type Vocab } from '../types'
import { distractors, gamePool, readingDistractors } from './pool'

function v(id: string, over: Partial<Vocab> = {}): Vocab {
  return {
    id, w: id, r: id + 'よみ', pos: '명사', ko: [id + '뜻'], ex: '', exko: '', freq: 1, exams: ['2024-07'],
    years: [2024], secs: ['reading'], kanji: [], ...over,
  }
}

describe('gamePool', () => {
  const vocab = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => v(id))
  const cards: Record<string, CardState> = {
    a: { s: 'l' }, b: { s: 'b', boxed: '2026-01-01' }, c: { s: 'c', stage: 0, due: '2026-01-02' }, d: { s: 'd' },
  }
  const user = { cards, settings: { ...DEFAULT_SETTINGS } }

  it('기억상자 → 탈출 확인 → 학습함 → 나머지 순', () => {
    const ids = gamePool(vocab, user, 6).map((x) => x.id)
    expect(ids.slice(0, 2)).toEqual(['b', 'c'])
    expect(ids.slice(2, 4).sort()).toEqual(['a', 'd'])
    expect(ids.slice(4).sort()).toEqual(['e', 'f'])
  })
  it('count만큼만, 모자라면 있는 만큼', () => {
    expect(gamePool(vocab, user, 3)).toHaveLength(3)
    expect(gamePool(vocab, user, 50)).toHaveLength(6)
  })
  it('나머지는 설정 필터를 따른다', () => {
    const mixed = [...vocab, v('g', { pos: '동사' })]
    const only = { cards, settings: { ...DEFAULT_SETTINGS, pos: ['명사' as const] } }
    const ids = gamePool(mixed, only, 20).map((x) => x.id)
    expect(ids).not.toContain('g')
  })
})

describe('distractors', () => {
  const vocab = [
    v('x', { ko: ['가', '나'] }),
    v('y', { ko: ['나'] }),
    v('z1', { ko: ['다'] }),
    v('z2', { ko: ['라'] }),
    v('z3', { ko: ['마'] }),
    v('verb', { pos: '동사', ko: ['바'] }),
  ]
  it('같은 품사에서 뜻이 겹치지 않게 고른다', () => {
    const d = distractors(vocab, vocab[0], 3)
    expect(d.map((x) => x.id).sort()).toEqual(['z1', 'z2', 'z3'])
  })
  it('정답 자신과 겹치는 뜻은 제외', () => {
    const d = distractors(vocab, vocab[0], 3)
    expect(d.find((x) => x.id === 'x' || x.id === 'y')).toBeUndefined()
  })
  it('후보가 모자라면 범위를 넓혀 채운다', () => {
    const d = distractors(vocab, vocab[0], 4)
    expect(d).toHaveLength(4)
    expect(d.some((x) => x.id === 'verb')).toBe(true)
  })
})

describe('readingDistractors', () => {
  const vocab = [
    v('a', { w: '交渉', r: 'こうしょう' }),
    v('b', { w: '検討', r: 'けんとう' }),
    v('c', { w: '改善', r: 'かいぜん' }),
    v('d', { w: '抽象', r: 'ちゅうしょう' }),
    v('e', { w: '拡大', r: 'かくだい' }),
  ]
  it('정답과 다른 읽기 3개를 겹치지 않게 준다', () => {
    for (let i = 0; i < 20; i++) {
      const d = readingDistractors(vocab, vocab[0], 3)
      expect(d).toHaveLength(3)
      expect(new Set(d).size).toBe(3)
      expect(d).not.toContain('こうしょう')
    }
  })
})
