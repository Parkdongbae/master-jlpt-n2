import { useSyncExternalStore } from 'react'
import { studyDay } from '../engine/engine'
import { DEFAULT_SETTINGS, POS_LIST, type Kanji, type Section, type UserData, type Vocab } from '../types'
import { cloud } from './firebase'

/** 가입 암호의 SHA-256("mjn:" + 암호). 원문은 소스에 두지 않는다. */
const JOIN_HASH = '9e27f43919cbfc9554d36016c25899e95cd43e4dfdaabf0971774705646fb227'
const KEY_CURRENT = 'mjn:current'
const userKey = (name: string) => `mjn:u:${name}`

interface State {
  user: UserData | null
  vocab: Vocab[] | null
  byId: Map<string, Vocab>
  kanji: Map<string, Kanji>
  syncing: boolean
}

const state: State = { user: null, vocab: null, byId: new Map(), kanji: new Map(), syncing: false }
let version = 0
const listeners = new Set<() => void>()

function emit() {
  version++
  listeners.forEach((l) => l())
}

export function useApp(): State {
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => version,
  )
  return state
}

export const getState = () => state

/** 오늘의 학습일. 주소에 ?debugDate=2026-11-24 를 붙이면 그 날짜로 동작한다(검증용). */
export function today(): string {
  const dbg = new URLSearchParams(location.search).get('debugDate')
  return dbg && /^\d{4}-\d{2}-\d{2}$/.test(dbg) ? dbg : studyDay()
}

// ---------- 단어 데이터 ----------

interface RawVocab {
  exams: string[]
  /** [표기, 읽기, 품사 번호, 뜻, 예문, 예문 뜻, [[회차 번호, 유형]...]] */
  words: [string, string, number, string[], string, string, [number, Section][]][]
  /** 한자 → [훈음, 음독, 훈독, 획수] */
  kanji: Record<string, [string, string[], string[], number]>
}

const KANJI_RE = /[一-鿿]/g

export async function loadVocab() {
  if (state.vocab) return
  const raw: RawVocab = await fetch(`${import.meta.env.BASE_URL}data/vocab.json`).then((r) => r.json())
  const vocab: Vocab[] = raw.words.map(([w, r, p, ko, ex, exko, hits]) => {
    const exams = [...new Set(hits.map((h) => raw.exams[h[0]]))].sort()
    return {
      id: `${w}|${r}`,
      w, r, ko, ex, exko, exams,
      pos: POS_LIST[p],
      freq: exams.length,
      years: [...new Set(exams.map((e) => Number(e.slice(0, 4))))],
      secs: [...new Set(hits.map((h) => h[1]))],
      kanji: [...new Set(w.match(KANJI_RE) ?? [])],
    }
  })
  const kanji = new Map<string, Kanji>()
  for (const ch in raw.kanji) {
    const [ko, on, kun, strokes] = raw.kanji[ch]
    kanji.set(ch, { ko, on, kun, strokes })
  }
  state.vocab = vocab
  state.byId = new Map(vocab.map((v) => [v.id, v]))
  state.kanji = kanji
  emit()
}

// ---------- 사용자 ----------

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fresh(name: string): UserData {
  return {
    name, joined: today(), settings: { ...DEFAULT_SETTINGS }, cards: {}, days: {},
    xp: 0, best: {}, badges: {}, tutorial: false, updatedAt: Date.now(),
  }
}

function normalize(u: UserData): UserData {
  u.settings = { ...DEFAULT_SETTINGS, ...u.settings }
  u.best ??= {}
  u.badges ??= {}
  u.days ??= {}
  u.cards ??= {}
  return u
}

function readLocal(name: string): UserData | null {
  try {
    const s = localStorage.getItem(userKey(name))
    return s ? normalize(JSON.parse(s)) : null
  } catch {
    return null
  }
}

let saveTimer: number | undefined
let cloudTimer: number | undefined

function saveLocal() {
  if (!state.user) return
  try {
    localStorage.setItem(userKey(state.user.name), JSON.stringify(state.user))
  } catch {
    /* 저장 공간 부족 등: 메모리 상태로 계속 동작 */
  }
}

export async function pushCloud() {
  window.clearTimeout(cloudTimer)
  if (!state.user || !cloud) return
  try {
    await cloud.push(state.user, today())
  } catch (e) {
    console.warn('클라우드 저장 실패', e)
  }
}

/** 사용자 데이터를 바꾼다. 기기에 바로 저장하고, 클라우드에는 모아서 올린다. */
export function mutate(fn: (u: UserData) => void) {
  if (!state.user) return
  fn(state.user)
  state.user.updatedAt = Date.now()
  emit()
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(saveLocal, 200)
  if (cloud) {
    window.clearTimeout(cloudTimer)
    cloudTimer = window.setTimeout(pushCloud, 15000)
  }
}

export type LoginResult = 'ok' | 'bad-code' | 'bad-name'

export async function login(name: string, code: string): Promise<LoginResult> {
  name = name.trim().normalize('NFC')
  if (name.length < 1 || name.length > 12 || /[\/.#$\[\]]/.test(name)) return 'bad-name'
  // 기기에 따라 한글이 자모 분리형(NFD)으로 들어올 수 있어 조합형으로 맞추고, 공백은 무시한다
  if ((await sha256('mjn:' + code.normalize('NFC').replace(/\s/g, ''))) !== JOIN_HASH) return 'bad-code'
  let user = readLocal(name)
  if (cloud) {
    state.syncing = true
    emit()
    try {
      const remote = await cloud.pull(name)
      if (remote && (!user || remote.updatedAt > user.updatedAt)) user = normalize(remote)
    } catch (e) {
      console.warn('클라우드 불러오기 실패', e)
    }
    state.syncing = false
  }
  state.user = user ?? fresh(name)
  localStorage.setItem(KEY_CURRENT, name)
  saveLocal()
  emit()
  void pushCloud()
  return 'ok'
}

/** 앱을 다시 열었을 때: 이 기기에서 마지막에 쓰던 사용자로 바로 들어간다 */
export async function restore() {
  const name = localStorage.getItem(KEY_CURRENT)
  if (!name) return
  const user = readLocal(name)
  if (!user) return
  state.user = user
  emit()
  if (cloud) {
    try {
      const remote = await cloud.pull(name)
      if (remote && remote.updatedAt > user.updatedAt) {
        state.user = normalize(remote)
        saveLocal()
        emit()
      }
    } catch {
      /* 오프라인이면 기기 데이터로 계속 */
    }
  }
}

export function logout() {
  saveLocal()
  void pushCloud()
  localStorage.removeItem(KEY_CURRENT)
  state.user = null
  emit()
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveLocal()
      void pushCloud()
    }
  })
}
