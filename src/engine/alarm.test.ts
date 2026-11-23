import { describe, expect, it } from 'vitest'
import { alarmText, isPast, msUntil, parseTime } from './alarm'

describe('알람 시간', () => {
  it('시각 문자열을 분으로 바꾼다', () => {
    expect(parseTime('20:30')).toBe(1230)
    expect(parseTime('07:05')).toBe(425)
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('오후 8시')).toBeNull()
  })
  it('오늘 시각이 남았으면 오늘, 지났으면 내일까지의 시간', () => {
    const now = new Date(2026, 10, 23, 19, 0, 0)
    expect(msUntil('20:00', now)).toBe(60 * 60 * 1000)
    expect(msUntil('18:00', now)).toBe(23 * 60 * 60 * 1000)
    expect(msUntil('19:00', now)).toBe(24 * 60 * 60 * 1000)
  })
  it('오늘 알람 시각이 지났는지 판단한다', () => {
    const now = new Date(2026, 10, 23, 20, 0, 30)
    expect(isPast('20:00', now)).toBe(true)
    expect(isPast('20:01', now)).toBe(false)
  })
  it('남은 양에 맞는 문구를 만든다', () => {
    expect(alarmText(30, 5).body).toBe('오늘 기억상자 복습 5개, 새 카드 30개가 남았어요.')
    expect(alarmText(30, 0).body).toBe('오늘 새 카드 30개가 남았어요.')
    expect(alarmText(0, 0).title).toBe('오늘 목표 달성')
  })
})
