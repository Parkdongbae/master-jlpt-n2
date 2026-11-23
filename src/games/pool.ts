/** 게임 문제 뽑기: 순수 함수만 둔다. */
import { matches } from '../engine/engine'
import type { UserData, Vocab } from '../types'

function mix<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 문제로 낼 카드: 기억상자 → 탈출 확인 → 학습함/완전암기 → 설정 필터에 맞는 나머지 순.
 * 각 그룹 안에서는 섞고, 모자라면 있는 만큼만 돌려준다.
 */
export function gamePool(
  vocab: Vocab[],
  user: Pick<UserData, 'cards' | 'settings'>,
  count: number,
  rnd: () => number = Math.random,
): Vocab[] {
  const box: Vocab[] = []
  const check: Vocab[] = []
  const seen: Vocab[] = []
  const rest: Vocab[] = []
  for (const v of vocab) {
    const s = user.cards[v.id]?.s
    if (s === 'b') box.push(v)
    else if (s === 'c') check.push(v)
    else if (s === 'l' || s === 'd') seen.push(v)
    else if (matches(v, user.settings)) rest.push(v)
  }
  return [...mix(box, rnd), ...mix(check, rnd), ...mix(seen, rnd), ...mix(rest, rnd)].slice(0, Math.max(0, count))
}

/**
 * 오답 보기: 같은 품사에서 뜻이 겹치지 않는 것. 모자라면 전체로 넓힌다.
 */
export function distractors(vocab: Vocab[], answer: Vocab, n: number, rnd: () => number = Math.random): Vocab[] {
  const banned = new Set(answer.ko)
  const out: Vocab[] = []
  const take = (list: Vocab[]) => {
    for (const v of mix(list, rnd)) {
      if (out.length >= n) return
      if (v.id === answer.id || v.w === answer.w || v.r === answer.r) continue
      if (v.ko.some((k) => banned.has(k))) continue
      out.push(v)
      v.ko.forEach((k) => banned.add(k))
    }
  }
  take(vocab.filter((v) => v.pos === answer.pos))
  if (out.length < n) take(vocab)
  return out
}

/** 히라가나에서 헷갈리기 쉬운 바꿔치기: 장음·촉음·탁음 */
const SWAPS: [RegExp, string][] = [
  [/ょう/, 'ょ'], [/ゅう/, 'ゅ'], [/こう/, 'こ'], [/そう/, 'そ'], [/とう/, 'と'], [/ほう/, 'ほ'], [/せい/, 'せ'], [/けい/, 'け'],
  [/っ/, ''], [/しょ(?!う)/, 'しょう'], [/しゅ(?!う)/, 'しゅう'], [/きょ(?!う)/, 'きょう'],
  [/^か/, 'が'], [/^が/, 'か'], [/^た/, 'だ'], [/^だ/, 'た'], [/^さ/, 'ざ'], [/^ざ/, 'さ'], [/^は/, 'ば'], [/^ば/, 'は'],
  [/じ/, 'ち'], [/ず/, 'す'], [/ぜ/, 'せ'], [/ぞ/, 'そ'], [/げ/, 'け'], [/ご/, 'こ'], [/ど/, 'と'], [/で/, 'て'], [/び/, 'ひ'], [/ぶ/, 'ふ'], [/べ/, 'へ'], [/ぼ/, 'ほ'],
]

/**
 * 한자 읽기 문제의 오답 읽기 n개.
 * 정답 읽기를 살짝 바꾼 것(장음·촉음·탁음)을 먼저 쓰고, 모자라면 길이가 같고 앞뒤 글자가 닮은 다른 단어의 읽기로 채운다.
 */
export function readingDistractors(vocab: Vocab[], answer: Vocab, n: number, rnd: () => number = Math.random): string[] {
  const out = new Set<string>()
  const real = new Set(vocab.filter((v) => v.w === answer.w).map((v) => v.r))
  real.add(answer.r)
  for (const [re, to] of mix(SWAPS, rnd)) {
    if (out.size >= Math.min(2, n)) break
    const alt = answer.r.replace(re, to)
    if (alt && !real.has(alt)) out.add(alt)
  }
  const r = answer.r
  const score = (v: Vocab) => (v.r.length === r.length ? 2 : Math.abs(v.r.length - r.length) === 1 ? 1 : 0) + (v.r[0] === r[0] ? 1 : 0) + (v.r.at(-1) === r.at(-1) ? 1 : 0) + (v.pos === answer.pos ? 1 : 0)
  const ranked = mix(vocab, rnd).filter((v) => !real.has(v.r)).sort((a, b) => score(b) - score(a))
  for (const v of ranked) {
    if (out.size >= n) break
    out.add(v.r)
  }
  return [...out].slice(0, n)
}
