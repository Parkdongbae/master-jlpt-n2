import type { ReactNode } from 'react'
import { useState } from 'react'
import { XP } from '../engine/engine'
import { today, useApp } from '../store/store'
import './games.css'
import Match from './Match'
import Quiz from './Quiz'
import Read from './Read'

type Key = 'quiz' | 'match' | 'read'

const LIST: { key: Key; icon: ReactNode; name: string; desc: string }[] = [
  { key: 'quiz', icon: (<svg viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M27 4L10 27h12l-3 17 19-25H25z" fill="currentColor" fillOpacity="0.25" /></svg>), name: '스피드 퀴즈', desc: '60초 동안 4지선다. 연속 정답이면 점수 배수 상승' },
  { key: 'match', icon: (<svg viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="10" width="20" height="28" rx="3" fill="currentColor" fillOpacity="0.25" /><rect x="22" y="14" width="20" height="28" rx="3" /><path d="M29 28h6" /></svg>), name: '짝 맞추기', desc: '일본어와 뜻 짝을 찾기. 단계가 오르면 카드가 늘어요' },
  { key: 'read', icon: (<svg viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="16" width="12" height="16" rx="3" fill="currentColor" fillOpacity="0.25" /><rect x="18" y="16" width="12" height="16" rx="3" /><rect x="32" y="16" width="12" height="16" rx="3" fill="currentColor" fillOpacity="0.25" /></svg>), name: '한자 읽기', desc: '시험 問題1처럼 한자의 올바른 읽기 고르기 (10문제)' },
]

export default function Games() {
  const { user, vocab } = useApp()
  const [playing, setPlaying] = useState<Key | null>(null)
  const exit = () => setPlaying(null)

  if (!user) return null

  if (playing) {
    return (
      <div className="page games">
        {playing === 'quiz' && <Quiz onExit={exit} />}
        {playing === 'match' && <Match onExit={exit} />}
        {playing === 'read' && <Read onExit={exit} />}
      </div>
    )
  }

  const day = user.days[today()]
  const gameXp = day?.gameXp ?? 0
  const noStudy = (day?.new ?? 0) === 0

  return (
    <div className="page games">
      <h1 className="page-title">게임</h1>
      {noStudy && <div className="g-banner">오늘 학습부터 할까요?</div>}
      <div className="card flat g-cap">
        <div className="row between">
          <span className="sub">오늘 얻은 게임 경험치</span>
          <b>{gameXp} / {XP.gameDailyCap}</b>
        </div>
        <div className="bar accent"><i style={{ width: `${Math.min(100, (gameXp / XP.gameDailyCap) * 100)}%` }} /></div>
      </div>
      {!vocab && <div className="sub">단어를 불러오는 중이에요.</div>}
      <div className="list">
        {LIST.map((g) => (
          <button key={g.key} className="card g-entry" onClick={() => setPlaying(g.key)} disabled={!vocab}>
            <span className="g-icon" aria-hidden>{g.icon}</span>
            <span className="grow">
              <b>{g.name}</b>
              <span className="sub g-desc">{g.desc}</span>
            </span>
            <span className="g-best">
              <span className="sub">최고</span>
              <b>{user.best[g.key] ?? 0}</b>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
