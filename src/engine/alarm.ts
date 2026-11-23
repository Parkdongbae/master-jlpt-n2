/** 알람 시간 계산. 화면·브라우저 API와 무관한 순수 함수. */

/** "HH:MM" → 자정부터의 분. 형식이 틀리면 null */
export function parseTime(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

/** now부터 다음 알람 시각까지 남은 밀리초 (지금이 정확히 그 시각이면 내일) */
export function msUntil(time: string, now: Date): number {
  const mins = parseTime(time)
  if (mins === null) return Infinity
  const target = new Date(now)
  target.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}

/** 오늘 알람 시각이 이미 지났는가 (달력 날짜 기준) */
export function isPast(time: string, now: Date): boolean {
  const mins = parseTime(time)
  return mins !== null && now.getHours() * 60 + now.getMinutes() >= mins
}

/** 알람 문구: 남은 새 카드 수와 복습 대기 수에 따라 */
export function alarmText(left: number, due: number): { title: string; body: string } {
  const title = '단어 공부할 시간이에요'
  if (left <= 0 && due <= 0) return { title: '오늘 목표 달성', body: '오늘 목표를 이미 채웠어요. 게임으로 가볍게 복습해 볼까요?' }
  const parts: string[] = []
  if (due > 0) parts.push(`기억상자 복습 ${due}개`)
  if (left > 0) parts.push(`새 카드 ${left}개`)
  return { title, body: `오늘 ${parts.join(', ')}가 남았어요.` }
}
