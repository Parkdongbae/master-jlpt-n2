import { useEffect, useState, type ReactElement } from 'react'
import { reviewQueue } from './engine/engine'
import Games from './games/Games'
import Auth from './screens/Auth'
import Box from './screens/Box'
import Home from './screens/Home'
import Settings from './screens/Settings'
import Stats from './screens/Stats'
import Study, { type StudyMode } from './screens/Study'
import { loadVocab, restore, today, useApp } from './store/store'
import { scheduleAlarm } from './ui/alarm'
import { BoxIcon, ChartIcon, GameIcon, GearIcon, HomeIcon } from './ui/icons'

type Tab = 'home' | 'box' | 'games' | 'stats' | 'settings'

const TABS: { id: Tab; label: string; icon: (p: { className?: string }) => ReactElement }[] = [
  { id: 'home', label: '학습', icon: HomeIcon },
  { id: 'box', label: '기억상자', icon: BoxIcon },
  { id: 'games', label: '게임', icon: GameIcon },
  { id: 'stats', label: '기록', icon: ChartIcon },
  { id: 'settings', label: '설정', icon: GearIcon },
]

export default function App() {
  const { user } = useApp()
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('home')
  const [study, setStudy] = useState<StudyMode | null>(null)
  const [session, setSession] = useState(0)

  useEffect(() => {
    void restore().finally(() => setReady(true))
    void loadVocab()
    const more = (e: Event) => {
      setStudy((e as CustomEvent<StudyMode>).detail)
      setSession((n) => n + 1)
    }
    window.addEventListener('mjn:study', more)
    return () => window.removeEventListener('mjn:study', more)
  }, [])

  // 알람 설정이 바뀌면 예약을 다시 건다
  const alarmKey = user ? `${user.settings.alarm}|${user.settings.alarmTime}` : ''
  useEffect(() => {
    scheduleAlarm()
  }, [alarmKey])

  if (!ready) return <div className="app"><div className="page center sub">불러오는 중…</div></div>
  if (!user) return <div className="app"><Auth /></div>

  const open = (mode: StudyMode) => {
    setStudy(mode)
    setSession((n) => n + 1)
  }

  if (study) {
    return (
      <div className="app">
        <Study key={session} mode={study} onExit={() => setStudy(null)} onGames={() => { setStudy(null); setTab('games') }} />
      </div>
    )
  }

  const due = reviewQueue(user.cards, today()).length

  return (
    <div className="app">
      {tab === 'home' && <Home onStudy={open} />}
      {tab === 'box' && <Box onReview={() => open('box')} />}
      {tab === 'games' && <Games />}
      {tab === 'stats' && <Stats />}
      {tab === 'settings' && <Settings />}
      <nav className="tabbar" aria-label="메뉴">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <t.icon />
            {t.label}
            {t.id === 'home' && due > 0 && <span className="dot">{due}</span>}
          </button>
        ))}
      </nav>
    </div>
  )
}
