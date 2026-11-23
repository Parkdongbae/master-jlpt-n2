import { counts, level, remainingNew, reviewQueue, streak } from '../engine/engine'
import { today, useApp } from '../store/store'
import { BoxIcon, FlameIcon } from '../ui/icons'
import type { StudyMode } from './Study'


export default function Home({ onStudy }: { onStudy: (m: StudyMode) => void }) {
  const { user, vocab } = useApp()
  if (!user) return null
  const day = today()
  const d = user.days[day]
  const done = d?.new ?? 0
  const goal = user.settings.goal
  const due = reviewQueue(user.cards, day).length
  const lv = level(user.xp)
  const c = counts(user.cards)
  const left = vocab ? remainingNew(vocab, user) : null
  const goalMet = !!d?.goal

  return (
    <div className="page">
      <div className="row between">
        <div>
          <p className="sub">{user.name}님, 안녕하세요</p>
          <h1 className="page-title">오늘의 학습</h1>
        </div>
        <span className="tag accent" style={{ fontSize: 14, padding: '6px 12px', gap: 4 }}>
          <FlameIcon className="" />
          <style>{`.tag svg { width: 18px; height: 18px; }`}</style>
          {streak(user.days, day)}일 연속
        </span>
      </div>

      <div className="hero">
        <p style={{ opacity: 0.85, fontWeight: 600 }}>{goalMet ? '오늘 목표 달성' : '오늘 목표'}</p>
        <p className="big">{done} <span style={{ fontSize: 22, opacity: 0.8 }}>/ {goal}</span></p>
        <div className="bar" style={{ marginTop: 12 }}><i style={{ width: `${Math.min(100, (done / goal) * 100)}%` }} /></div>
        <p style={{ marginTop: 10, fontSize: 14, opacity: 0.9 }}>
          {due > 0 ? `기억상자 복습 ${due}개를 먼저 하고 새 카드로 넘어갑니다.` : `${user.settings.scope === 'kichul' ? '기출 단어' : 'N2 전체'} · ${user.settings.dir === 'ja2ko' ? '일본어 → 뜻' : '뜻 → 일본어'}`}
        </p>
        {!vocab ? (
          <button className="btn" disabled>단어를 불러오는 중…</button>
        ) : goalMet && due === 0 ? (
          <button className="btn" onClick={() => onStudy('more')} disabled={left === 0}>{left === 0 ? '이 범위를 모두 학습했어요' : '20개 더 공부하기'}</button>
        ) : (
          <button className="btn" onClick={() => onStudy('daily')}>{done > 0 || (d?.review ?? 0) > 0 ? '이어서 학습하기' : '오늘 학습 시작'}</button>
        )}
      </div>

      <div className="stats3">
        <div className="stat"><b>{c.total.toLocaleString()}</b><span>누적 학습</span></div>
        <div className="stat"><b>{c.box}</b><span>기억상자</span></div>
        <div className="stat"><b>{c.done + c.check}</b><span>탈출</span></div>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 8 }}>
          <b>Lv.{lv.lv} {lv.title}</b>
          <span className="sub">{lv.rest} / {lv.need} XP</span>
        </div>
        <div className="bar accent"><i style={{ width: `${(lv.rest / lv.need) * 100}%` }} /></div>
      </div>

      {left !== null && (
        <div className="card flat row">
          <BoxIcon className="" />
          <style>{`.card.flat > svg { width: 36px; height: 36px; color: var(--primary); flex: none; }`}</style>
          <p className="sub grow">지금 설정한 범위에 남은 새 카드 <b style={{ color: 'var(--text)' }}>{left.toLocaleString()}개</b>. 범위는 설정에서 바꿀 수 있습니다.</p>
        </div>
      )}
    </div>
  )
}
