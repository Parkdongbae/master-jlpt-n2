import { useEffect, useMemo, useState } from 'react'
import { addDays, counts, level, streak, weekKey } from '../engine/engine'
import { badges } from '../engine/badges'
import { useApp, today } from '../store/store'
import { cloud, type RankRow } from '../store/firebase'
import './stats.css'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

/** 'YYYY-MM-DD' 의 요일(0=일) */
function dow(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function BadgeIcon({ id }: { id: string }) {
  const p = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (id === 'first-goal')
    return <svg {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
  if (id.startsWith('streak'))
    return <svg {...p}><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" /></svg>
  if (id.startsWith('learn'))
    return <svg {...p}><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" /></svg>
  if (id === 'escape-50')
    return <svg {...p}><path d="M4 10h16v10H4zM4 10l3-5h10l3 5M9 14h6" /></svg>
  if (id === 'master-100')
    return <svg {...p}><circle cx="12" cy="9" r="5" /><path d="M9 13.5L7.5 21l4.5-2.5 4.5 2.5L15 13.5" /></svg>
  if (id === 'quiz-300')
    return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></svg>
  if (id === 'match-300')
    return <svg {...p}><rect x="3" y="5" width="8" height="14" rx="2" /><rect x="13" y="5" width="8" height="14" rx="2" /></svg>
  return <svg {...p}><path d="M5 19L12 5l7 14M8 14h8" /></svg>
}

function Chevron({ dir }: { dir: 'l' | 'r' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'l' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}

type Rank = { status: 'loading' } | { status: 'error' } | { status: 'ok'; rows: RankRow[] }

export default function Stats() {
  const { user, vocab } = useApp()
  const now = today()
  const [month, setMonth] = useState(now.slice(0, 7))
  const [sel, setSel] = useState<string | null>(null)
  const [rank, setRank] = useState<Rank>({ status: 'loading' })

  useEffect(() => {
    if (!cloud) return
    let alive = true
    setRank({ status: 'loading' })
    cloud
      .ranking(now)
      .then((rows) => alive && setRank({ status: 'ok', rows }))
      .catch(() => alive && setRank({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [now])

  const total = vocab?.length ?? 0
  const list = useMemo(() => (user ? badges(user, now, total) : []), [user, now, total])
  if (!user) return null

  const c = counts(user.cards)
  const lv = level(user.xp)
  const st = streak(user.days, now)
  const seen = c.total

  // 달력
  const first = `${month}-01`
  const lead = dow(first)
  const nextFirst = addDays(first, 32).slice(0, 7) + '-01'
  const prevMonth = addDays(first, -1).slice(0, 7)
  const dim = Number(addDays(nextFirst, -1).slice(8, 10))
  const cells: (string | null)[] = [...Array(lead).fill(null)]
  for (let i = 1; i <= dim; i++) cells.push(`${month}-${String(i).padStart(2, '0')}`)
  const [yy, mm] = month.split('-').map(Number)
  const canNext = nextFirst.slice(0, 7) <= now.slice(0, 7)
  const detail = sel && sel.startsWith(month) ? user.days[sel] : undefined
  const week = weekKey(now)

  return (
    <div className="page stats-page">
      <h1 className="page-title">기록</h1>

      <div className="stats3">
        <div className="stat">
          <b>{seen.toLocaleString()}</b>
          <span>누적 학습</span>
        </div>
        <div className="stat">
          <b>{st.toLocaleString()}일</b>
          <span>연속 학습</span>
        </div>
        <div className="stat">
          <b>Lv.{lv.lv.toLocaleString()}</b>
          <span>{lv.title}</span>
        </div>
      </div>

      {vocab && total > 0 && (
        <div className="card">
          <div className="row between">
            <h2 className="section-title">전체 진도율</h2>
            <span className="prog-nums">
              {seen.toLocaleString()} / {total.toLocaleString()} ({Math.min(100, Math.floor((seen / total) * 100))}%)
            </span>
          </div>
          <div className="bar" style={{ marginTop: 10 }}>
            <i style={{ width: `${Math.min(100, (seen / total) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="section-title">카드 상태</h2>
        <div className="dist">
          <div className="d-l"><b>{c.learned.toLocaleString()}</b><span>학습함</span></div>
          <div className="d-b"><b>{c.box.toLocaleString()}</b><span>기억상자</span></div>
          <div className="d-c"><b>{c.check.toLocaleString()}</b><span>탈출 확인 중</span></div>
          <div className="d-d"><b>{c.done.toLocaleString()}</b><span>완전 암기</span></div>
        </div>
      </div>

      <div className="card">
        <div className="cal-head">
          <button className="nav" aria-label="이전 달" onClick={() => setMonth(prevMonth)}><Chevron dir="l" /></button>
          <b>{yy}년 {mm}월</b>
          <button className="nav" aria-label="다음 달" disabled={!canNext} onClick={() => setMonth(nextFirst.slice(0, 7))}><Chevron dir="r" /></button>
        </div>
        <div className="cal-grid">
          {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`b${i}`} className="cal-cell blank" />
            const r = user.days[d]
            const cls = ['cal-cell']
            if (d > now) cls.push('future')
            else if (r?.goal) cls.push('goal')
            else if (r && r.new > 0) cls.push('studied')
            if (d === now) cls.push('today')
            if (d === sel) cls.push('sel')
            return (
              <button key={d} className={cls.join(' ')} onClick={() => setSel(d === sel ? null : d)} aria-label={`${mm}월 ${Number(d.slice(8))}일`}>
                {Number(d.slice(8))}
              </button>
            )
          })}
        </div>
        <div className="cal-legend">
          <span><i className="l-s" />학습함</span>
          <span><i className="l-g" />목표 달성</span>
          <span><i className="l-t" />오늘</span>
        </div>
        {sel && sel.startsWith(month) && (
          <div className="day-detail">
            <div className="dd-title">{Number(sel.slice(5, 7))}월 {Number(sel.slice(8))}일{detail?.goal ? ' · 목표 달성' : ''}</div>
            <div className="dd-grid">
              <div><b>{(detail?.new ?? 0).toLocaleString()}</b><span>새 카드</span></div>
              <div><b>{(detail?.review ?? 0).toLocaleString()}</b><span>복습</span></div>
              <div><b>{(detail?.boxed ?? 0).toLocaleString()}</b><span>담은 수</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="row between">
          <h2 className="section-title">배지</h2>
          <span className="sub">{list.filter((b) => b.earned).length} / {list.length}</span>
        </div>
        <div className="badge-grid">
          {list.map((b) => (
            <div key={b.id} className={'badge' + (b.earned ? ' earned' : '')}>
              <div className="b-ico"><BadgeIcon id={b.id} /></div>
              <div className="b-name">{b.name}</div>
              {b.earned ? (
                <div className="b-desc">{b.desc}</div>
              ) : (
                <>
                  <div className="bar accent"><i style={{ width: `${Math.round(b.progress * 100)}%` }} /></div>
                  <div className="b-pct">{Math.floor(b.progress * 100)}%</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">주간 랭킹</h2>
        {!cloud ? (
          <p className="sub" style={{ marginTop: 8 }}>Firebase를 연결하면 가입자끼리 주간 순위를 볼 수 있습니다.</p>
        ) : rank.status === 'loading' ? (
          <p className="sub" style={{ marginTop: 8 }}>순위를 불러오는 중…</p>
        ) : rank.status === 'error' ? (
          <p className="sub" style={{ marginTop: 8 }}>순위를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>
        ) : rank.rows.length === 0 ? (
          <p className="sub" style={{ marginTop: 8 }}>아직 이번 주 기록이 없습니다.</p>
        ) : (
          <>
            <p className="sub" style={{ marginTop: 4 }}>{week.slice(5).replace('-', '월 ')}일 월요일부터 이번 주 경험치</p>
            <div className="rank-list">
              {rank.rows.map((r, i) => (
                <div key={r.name} className={'rank-row' + (r.name === user.name ? ' me' : '')}>
                  <span className={'rk' + (i < 3 ? ' top' : '')}>{i + 1}</span>
                  <span className="rn">{r.name}</span>
                  <span className="rx">{r.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
