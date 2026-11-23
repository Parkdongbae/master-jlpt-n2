/**
 * 학습 알람. 설정한 시각에 기기 알림을 띄운다.
 * 웹앱의 한계: 앱(브라우저)이 완전히 종료된 상태에서는 예약이 살아 있지 않아 알림이 뜨지 않는다.
 * 그래서 앱을 다시 열었을 때 오늘 알람이 지나갔으면 그 자리에서 한 번 알려 준다.
 */
import { alarmText, isPast, msUntil } from '../engine/alarm'
import { reviewQueue } from '../engine/engine'
import { getState, today } from '../store/store'

const KEY_LAST = 'mjn:alarm:last'
let timer: number | undefined

export type AlarmSupport = 'ok' | 'unsupported' | 'denied' | 'ask'

export function alarmSupport(): AlarmSupport {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'ok'
  return Notification.permission === 'denied' ? 'denied' : 'ask'
}

/** 알림 권한을 요청한다. 사용자가 버튼을 누른 직후에만 호출할 것. */
export async function askPermission(): Promise<AlarmSupport> {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'default') await Notification.requestPermission()
  return alarmSupport()
}

function calendarDay(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

async function show(title: string, body: string) {
  const options: NotificationOptions = { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'mjn-study', lang: 'ko' }
  try {
    // 설치된 앱(서비스 워커)이 있으면 그쪽으로 띄워야 안드로이드에서 표시된다
    const reg = await Promise.race([
      navigator.serviceWorker?.getRegistration(),
      new Promise<undefined>((r) => setTimeout(() => r(undefined), 1500)),
    ])
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    /* 알림을 띄울 수 없는 환경이면 조용히 넘어간다 */
  }
}

/** 지금 알람을 울린다. 오늘 이미 울렸으면 건너뛴다. */
export async function fireAlarm(force = false) {
  const user = getState().user
  if (!user || alarmSupport() !== 'ok') return
  if (!force && localStorage.getItem(KEY_LAST) === calendarDay()) return
  if (!force) localStorage.setItem(KEY_LAST, calendarDay()) // 시험 알림은 오늘 알람을 소진하지 않는다
  const day = today()
  const left = Math.max(0, user.settings.goal - (user.days[day]?.new ?? 0))
  const due = reviewQueue(user.cards, day).length
  if (!force && left === 0 && due === 0) return // 이미 다 했으면 방해하지 않는다
  const { title, body } = alarmText(left, due)
  await show(title, body)
}

/** 설정에 맞춰 다음 알람을 예약한다. 설정이 바뀌거나 앱이 다시 보일 때마다 호출한다. */
export function scheduleAlarm() {
  window.clearTimeout(timer)
  const s = getState().user?.settings
  if (!s?.alarm || alarmSupport() !== 'ok') return
  // 앱을 닫아 둔 사이 오늘 알람 시각이 지나갔으면 지금 알려 준다
  if (isPast(s.alarmTime, new Date()) && localStorage.getItem(KEY_LAST) !== calendarDay()) void fireAlarm()
  const wait = msUntil(s.alarmTime, new Date())
  if (!Number.isFinite(wait)) return
  // 브라우저 타이머 한계(약 24.8일)보다 짧으므로 그대로 건다
  timer = window.setTimeout(() => {
    void fireAlarm().then(scheduleAlarm)
  }, wait + 500)
}

if (typeof document !== 'undefined') {
  // 백그라운드에서 타이머가 멈췄다가 돌아온 경우를 대비해 다시 계산한다
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleAlarm()
  })
}
