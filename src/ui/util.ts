import { getState } from '../store/store'

let voices: SpeechSynthesisVoice[] = []
function loadVoices() {
  voices = speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ja'))
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices()
  // 음성 목록은 늦게 채워지는 브라우저가 많다
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
}

/** 기기에 일본어 음성이 있는지. 목록이 아직 안 왔으면 null */
export function hasJaVoice(): boolean | null {
  if (!('speechSynthesis' in window)) return false
  if (voices.length) return true
  return speechSynthesis.getVoices().length ? false : null
}

/** 후리가나 표기 [漢字|かんじ] 를 걷어낸다. kana=true면 읽기 쪽을 남긴다 */
export function plain(text: string, kana = false): string {
  return text.replace(/\[([^|\]]+)\|([^\]]+)\]/g, kana ? '$2' : '$1')
}

let player: HTMLAudioElement | null = null

/** 내장 일본어 음성이 없는 기기용: 온라인 음성으로 읽는다 (인터넷 필요) */
function speakOnline(text: string, slow: boolean, onFail?: () => void) {
  try {
    player?.pause()
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ja&ttsspeed=${slow ? 0.3 : 1}&q=${encodeURIComponent(text.slice(0, 180))}`
    player = new Audio(url)
    player.onerror = () => onFail?.()
    player.play().catch(() => onFail?.())
  } catch {
    onFail?.()
  }
}

/**
 * 일본어 발음 재생. 기기 내장 음성을 쓰고, 일본어 음성이 없으면 온라인 음성으로 대신한다.
 * 둘 다 안 되면 onFail을 부른다. 단어는 읽기(가나)를 넘겨야 한자를 다르게 읽는 일이 없다.
 */
export function speak(text: string, onFail?: () => void) {
  const clean = plain(text).replace(/[〜～]/g, '').trim()
  if (!clean) return
  const slow = getState().user?.settings.rate === 'slow'
  if ('speechSynthesis' in window && !voices.length) loadVoices()
  if (!voices.length) return speakOnline(clean, slow, onFail)
  const u = new SpeechSynthesisUtterance(clean)
  u.lang = 'ja-JP'
  u.rate = slow ? 0.6 : 0.9
  // 자연스러운 음성을 먼저 고른다 (기기마다 이름이 다르다)
  u.voice = voices.find((v) => /natural|neural|enhanced|premium|google/i.test(v.name)) ?? voices[0]
  u.onerror = (e) => {
    if (e.error !== 'canceled' && e.error !== 'interrupted') speakOnline(clean, slow, onFail)
  }
  player?.pause()
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}

let ctx: AudioContext | null = null

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08) {
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(gain, ctx.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur)
  o.connect(g).connect(ctx.destination)
  o.start(ctx.currentTime + start)
  o.stop(ctx.currentTime + start + dur)
}

export type Sfx = 'ok' | 'no' | 'flip' | 'box' | 'escape' | 'win' | 'tick'

/** 짧은 효과음. 설정에서 끌 수 있다. */
export function sfx(kind: Sfx) {
  if (!getState().user?.settings.sound) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    if (kind === 'ok') { tone(660, 0, 0.09); tone(880, 0.08, 0.14) }
    else if (kind === 'no') { tone(200, 0, 0.18, 'square', 0.05) }
    else if (kind === 'flip') { tone(420, 0, 0.05, 'triangle', 0.04) }
    else if (kind === 'tick') { tone(520, 0, 0.04, 'triangle', 0.04) }
    else if (kind === 'box') { tone(330, 0, 0.1); tone(220, 0.09, 0.16) }
    else if (kind === 'escape') { tone(440, 0, 0.08); tone(660, 0.07, 0.08); tone(990, 0.14, 0.2) }
    else if (kind === 'win') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25)) }
  } catch {
    /* 소리를 낼 수 없는 환경이면 조용히 넘어간다 */
  }
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 색종이 효과 (목표 달성·배지 획득) */
export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#f59e0b', '#4f46e5', '#10b981', '#ef4444', '#06b6d4']
  const root = document.createElement('div')
  root.className = 'confetti'
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i')
    p.style.left = Math.random() * 100 + '%'
    p.style.background = colors[i % colors.length]
    p.style.animationDelay = Math.random() * 0.5 + 's'
    p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's'
    p.style.transform = `rotate(${Math.random() * 360}deg)`
    root.appendChild(p)
  }
  document.body.appendChild(root)
  setTimeout(() => root.remove(), 3500)
}

export function fmtDate(day: string) {
  const [, m, d] = day.split('-').map(Number)
  return `${m}월 ${d}일`
}
