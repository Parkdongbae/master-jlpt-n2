import { useState } from 'react'
import { diffDays, escapeBox } from '../engine/engine'
import { mutate, today, useApp } from '../store/store'
import { BoxIcon, EscapeIcon, SpeakerIcon } from '../ui/icons'
import { fmtDate, sfx, speak } from '../ui/util'

export default function Box({ onReview }: { onReview: () => void }) {
  const { user, byId } = useApp()
  const [view, setView] = useState<'box' | 'check'>('box')
  if (!user) return null
  const day = today()
  const all = Object.entries(user.cards)
  const box = all.filter(([id, c]) => c.s === 'b' && byId.has(id)).sort((a, b) => (a[1].boxed! < b[1].boxed! ? -1 : 1))
  const check = all.filter(([id, c]) => c.s === 'c' && byId.has(id)).sort((a, b) => (a[1].due! < b[1].due! ? -1 : 1))
  const rows = view === 'box' ? box : check

  return (
    <div className="page">
      <div>
        <h1 className="page-title">기억상자</h1>
        <p className="sub">상자 안의 단어는 다음 학습일부터 매일 맨 먼저 나옵니다.</p>
      </div>
      <div className="seg" role="tablist">
        <button className={view === 'box' ? 'on' : ''} onClick={() => setView('box')} role="tab" aria-selected={view === 'box'}>상자 안 {box.length}</button>
        <button className={view === 'check' ? 'on' : ''} onClick={() => setView('check')} role="tab" aria-selected={view === 'check'}>탈출 확인 중 {check.length}</button>
      </div>
      {view === 'box' && box.length > 0 && <button className="btn" onClick={onReview}>상자 속 {box.length}개 지금 복습하기</button>}
      {rows.length === 0 ? (
        <div className="empty">
          <BoxIcon />
          <p>{view === 'box' ? '기억상자가 비어 있어요. 학습 중 모르는 단어를 담아 보세요.' : '탈출 확인 중인 단어가 없어요.'}</p>
        </div>
      ) : (
        <div className="list">
          {rows.map(([id, c]) => {
            const v = byId.get(id)!
            return (
              <div className="item" key={id}>
                <button className="icon-btn" style={{ background: 'var(--surface-2)' }} onClick={() => speak(v.r)} aria-label={`${v.w} 발음 듣기`}><SpeakerIcon /></button>
                <div className="grow">
                  <b lang="ja">{v.w}</b>{v.r !== v.w && <span className="sub" lang="ja" style={{ marginLeft: 8 }}>{v.r}</span>}
                  <div className="ko">{v.ko.join(', ')}</div>
                  <div className="sub" style={{ fontSize: 12 }}>
                    {view === 'box'
                      ? `${fmtDate(c.boxed!)} 담음 · 복습 ${c.n ?? 0}회`
                      : diffDays(c.due!, day) <= 0 ? '오늘 확인' : `${diffDays(c.due!, day)}일 뒤 확인 (${(c.stage ?? 0) + 1}/3)`}
                  </div>
                </div>
                {view === 'box' && (
                  <button className="btn small ghost" onClick={() => { mutate((u) => escapeBox(u, id, day)); sfx('escape') }} aria-label={`${v.w} 기억상자 탈출`}>
                    <EscapeIcon className="" />탈출
                  </button>
                )}
              </div>
            )
          })}
          <style>{`.item .btn.small svg { width: 20px; height: 20px; }`}</style>
        </div>
      )}
    </div>
  )
}
