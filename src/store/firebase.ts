/**
 * Firebase 연결. 환경 변수(VITE_FIREBASE_*)가 없으면 cloud는 null이고 앱은 기기 저장만으로 동작한다.
 * Firebase SDK는 설정이 있을 때만 불러온다.
 */
import { weekKey, weekXp } from '../engine/engine'
import type { CardState, UserData } from '../types'

const env = import.meta.env
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

export interface RankRow {
  name: string
  xp: number
}

export interface Cloud {
  pull(name: string): Promise<UserData | null>
  push(user: UserData, today: string): Promise<void>
  ranking(today: string): Promise<RankRow[]>
}

/** 카드 상태를 작게 줄인다: '학습함'은 id 목록 문자열 하나로 (문서 크기 1MB 제한 대비) */
export function pack(user: UserData) {
  const learned: string[] = []
  const active: Record<string, CardState> = {}
  for (const id in user.cards) {
    const c = user.cards[id]
    if (c.s === 'l') learned.push(id)
    else active[id] = c
  }
  const { cards: _cards, ...rest } = user
  return { ...rest, learned: learned.join('\n'), active: JSON.stringify(active), days: JSON.stringify(user.days) }
}

export function unpack(doc: Record<string, unknown>): UserData {
  const cards: Record<string, CardState> = JSON.parse((doc.active as string) || '{}')
  for (const id of ((doc.learned as string) || '').split('\n')) if (id) cards[id] = { s: 'l' }
  const { learned: _l, active: _a, days, ...rest } = doc
  return { ...(rest as unknown as UserData), cards, days: JSON.parse((days as string) || '{}') }
}

/**
 * 영어 단어 앱과 같은 Firebase 프로젝트를 함께 쓴다. 보안 규칙이 users·ranking 두 곳만 열어 두므로
 * 같은 컬렉션 안에서 문서 이름과 week 값에 "n2:" 를 붙여 영어 앱 데이터와 섞이지 않게 한다.
 */
const NS = 'n2:'

async function connect(): Promise<Cloud> {
  const [{ initializeApp }, { getAuth, signInAnonymously }, fs] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ])
  const app = initializeApp(config)
  const db = fs.getFirestore(app)
  await signInAnonymously(getAuth(app))
  return {
    async pull(name) {
      const snap = await fs.getDoc(fs.doc(db, 'users', NS + name))
      return snap.exists() ? unpack(snap.data()) : null
    },
    async push(user, today) {
      await fs.setDoc(fs.doc(db, 'users', NS + user.name), pack(user))
      const week = NS + weekKey(today)
      await fs.setDoc(fs.doc(db, 'ranking', `${week}_${user.name}`), { week, name: user.name, xp: weekXp(user.days, today) })
    },
    async ranking(today) {
      const q = fs.query(fs.collection(db, 'ranking'), fs.where('week', '==', NS + weekKey(today)))
      const snap = await fs.getDocs(q)
      return snap.docs.map((d) => d.data() as RankRow).sort((a, b) => b.xp - a.xp)
    },
  }
}

let ready: Promise<Cloud> | null = null
const lazy = () => (ready ??= connect())

export const cloud: Cloud | null = config.apiKey && config.projectId
  ? {
      pull: async (n) => (await lazy()).pull(n),
      push: async (u, t) => (await lazy()).push(u, t),
      ranking: async (t) => (await lazy()).ranking(t),
    }
  : null
