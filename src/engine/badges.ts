import type { UserData } from '../types'
import { addDays } from './engine'

export interface Badge {
  id: string
  name: string
  desc: string
  earned: boolean
  /** 0~1 */
  progress: number
}

/** days에서 목표를 달성한 날이 가장 길게 이어진 일수 */
export function longestStreak(days: UserData['days']): number {
  const goalDays = Object.keys(days).filter((d) => days[d]?.goal).sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const d of goalDays) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    if (run > best) best = run
    prev = d
  }
  return best
}

export function badges(user: UserData, _today: string, totalVocab: number): Badge[] {
  const seen = Object.keys(user.cards).length
  let escaped = 0
  let done = 0
  for (const id in user.cards) {
    const s = user.cards[id].s
    if (s === 'c' || s === 'd') escaped++
    if (s === 'd') done++
  }
  const goalCount = Object.values(user.days).filter((d) => d?.goal).length
  const streakMax = longestStreak(user.days)
  const best = user.best ?? {}

  const make = (id: string, name: string, desc: string, value: number, need: number): Badge => ({
    id,
    name,
    desc,
    earned: need > 0 && value >= need,
    progress: need > 0 ? Math.max(0, Math.min(1, value / need)) : 0,
  })

  return [
    make('first-goal', '첫 목표 달성', '하루 목표를 처음으로 채우기', goalCount, 1),
    make('streak-7', '7일 연속', '7일 연속 목표 달성', streakMax, 7),
    make('streak-30', '30일 연속', '30일 연속 목표 달성', streakMax, 30),
    make('streak-100', '100일 연속', '100일 연속 목표 달성', streakMax, 100),
    make('learn-500', '누적 500개', '카드 500개 학습', seen, 500),
    make('learn-1000', '누적 1,000개', '카드 1,000개 학습', seen, 1000),
    make('learn-1500', '누적 1,500개', '카드 1,500개 학습', seen, 1500),
    make('learn-all', '전체 학습 완료', '모든 카드를 한 번씩 보기', seen, totalVocab),
    make('escape-50', '상자 탈출 50개', '기억상자에서 50개 탈출', escaped, 50),
    make('master-100', '완전 암기 100개', '완전 암기 카드 100개', done, 100),
    make('quiz-300', '퀴즈 300점', '퀴즈 최고 기록 300점 이상', best.quiz ?? 0, 300),
    make('match-300', '짝 맞추기 300점', '짝 맞추기 최고 기록 300점 이상', best.match ?? 0, 300),
    make('read-100', '한자 읽기 만점', '한자 읽기 10문제 모두 정답', best.read ?? 0, 100),
  ]
}
