import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cancelBox, escapeBox, newQueue, pass, putInBox, remainingNew, reviewQueue } from '../engine/engine'
import { mutate, today, useApp } from '../store/store'
import { SECTIONS, type Vocab } from '../types'
import { BoxIcon, BoxInIcon, CloseIcon, EscapeIcon, FlipIcon, SpeakerIcon, SwipeIcon, TapIcon, TrophyIcon } from '../ui/icons'
import { KanjiList, Ruby } from '../ui/ja'
import { confetti, sfx, speak } from '../ui/util'

export type StudyMode = 'daily' | 'more' | 'box'

interface Props {
  mode: StudyMode
  onExit: () => void
  onGames: () => void
}

interface Entry {
  id: string
  /** 이 세션에 들어올 때의 구분: 복습(상자), 확인(탈출 확인), 새 카드 */
  kind: 'box' | 'check' | 'new'
}

const MORE = 20

export default function Study({ mode, onExit, onGames }: Props) {
  const { user, vocab, byId } = useApp()
  const day = today()

  // 세션 시작 시 한 번만 줄을 세운다. (넘길 때마다 상태가 바뀌어도 순서는 유지)
  const queue = useMemo<Entry[]>(() => {
    if (!user || !vocab) return []
    if (mode === 'box') {
      return Object.entries(user.cards)
        .filter(([, c]) => c.s === 'b')
        .sort((a, b) => (a[1].boxed! < b[1].boxed! ? -1 : 1))
        .map(([id]) => ({ id, kind: 'box' as const }))
        .filter((e) => byId.has(e.id))
    }
    const review = reviewQueue(user.cards, day)
      .filter((id) => byId.has(id))
      .map((id) => ({ id, kind: user.cards[id].s === 'b' ? ('box' as const) : ('check' as const) }))
    const done = user.days[day]?.new ?? 0
    const want = mode === 'more' ? MORE : Math.max(0, user.settings.goal - done)
    const fresh = newQueue(vocab, user, want).map((id) => ({ id, kind: 'new' as const }))
    return [...review, ...fresh]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocab, mode])

  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [anim, setAnim] = useState<'' | 'fly-left' | 'fly-right' | 'fly-in'>('fly-in')
  const [drag, setDrag] = useState(0)
  const [pop, setPop] = useState(false)
  const [toast, setToast] = useState('')
  const [celebrated, setCelebrated] = useState(false)
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastTap = useRef(0)
  const busy = useRef(false)

  const entry = queue[idx]
  const v: Vocab | undefined = entry && byId.get(entry.id)
  const card = entry && user?.cards[entry.id]
  const dir = user?.settings.dir ?? 'ja2ko'
  const reviewTotal = queue.filter((e) => e.kind !== 'new').length
  const newTotal = queue.length - reviewTotal
  const finished = idx >= queue.length

  const say = useCallback((text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(''), 1400)
  }, [])

  const listen = useCallback((text: string) => {
    speak(text, () => say('발음을 재생하지 못했어요. 인터넷 연결을 확인하세요'))
  }, [say])

  // 일본어가 앞면일 때 발음 자동 재생
  useEffect(() => {
    if (v && user?.settings.autoSpeak && dir === 'ja2ko') speak(v.r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  useEffect(() => {
    if (finished && queue.length > 0 && mode !== 'box' && user?.days[day]?.goal && !celebrated) {
      setCelebrated(true)
      sfx('win')
      confetti()
    }
  }, [finished, queue.length, mode, user, day, celebrated])

  const flip = useCallback(() => {
    setFlipped((f) => !f)
    sfx('flip')
  }, [])

  const go = useCallback(
    (step: 1 | -1) => {
      if (busy.current || !entry) return
      if (step === -1 && idx === 0) return
      busy.current = true
      if (step === 1) mutate((u) => pass(u, entry.id, day))
      setAnim(step === 1 ? 'fly-left' : 'fly-right')
      window.setTimeout(() => {
        setIdx((i) => i + step)
        setFlipped(false)
        setDrag(0)
        setAnim('fly-in')
        busy.current = false
      }, 200)
    },
    [entry, idx, day],
  )

  const toggleBox = useCallback(() => {
    if (!entry || !user) return
    const c = user.cards[entry.id]
    if (c?.s === 'b' && c.boxed === day) {
      mutate((u) => cancelBox(u, entry.id, day))
      say('기억상자에서 꺼냈어요')
    } else if (c?.s !== 'b') {
      mutate((u) => putInBox(u, entry.id, day))
      sfx('box')
      setPop(true)
      window.setTimeout(() => setPop(false), 350)
      say('기억상자에 담았어요')
    }
  }, [entry, user, day, say])

  const escape = useCallback(() => {
    if (!entry) return
    mutate((u) => escapeBox(u, entry.id, day))
    sfx('escape')
    say('탈출! 3일 뒤에 다시 확인해요')
    window.setTimeout(() => go(1), 450)
  }, [entry, day, go, say])

  // 키보드 (PC)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip() }
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key.toLowerCase() === 'b') toggleBox()
      else if (e.key.toLowerCase() === 's' && v) listen(v.r)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finished, flip, go, toggleBox, v, listen])

  // 터치: 두 번 터치 = 뒤집기, 왼쪽으로 밀기 = 다음, 오른쪽으로 밀기 = 이전
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    start.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    if (Math.abs(dx) > 8) setDrag(dx)
  }
  const onUp = (e: React.PointerEvent) => {
    const s = start.current
    start.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1)
      if (dx > 0 && idx === 0) setDrag(0)
      return
    }
    setDrag(0)
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const now = Date.now()
      if (now - lastTap.current < 350) {
        lastTap.current = 0
        flip()
      } else lastTap.current = now
    }
  }

  if (!user || !vocab) return <div className="page center sub">단어를 불러오는 중…</div>

  // ----- 끝 화면 -----
  if (finished) {
    const d = user.days[day]
    if (mode === 'box') {
      return (
        <div className="celebrate">
          <BoxIcon className="trophy" />
          <h1>{queue.length ? '기억상자 복습 끝' : '기억상자가 비어 있어요'}</h1>
          <p className="sub">{queue.length ? `${queue.length}개를 다시 봤어요.` : '모르는 단어를 만나면 기억상자 버튼으로 담아 두세요.'}</p>
          <button className="btn" onClick={onExit}>돌아가기</button>
        </div>
      )
    }
    if (d?.goal) {
      return (
        <div className="celebrate">
          <TrophyIcon className="trophy" />
          <h1>축하합니다.</h1>
          <p style={{ fontSize: 20, fontWeight: 700 }}>오늘 목표 완성 되었습니다.</p>
          <div className="stats3" style={{ width: '100%' }}>
            <div className="stat"><b>{d.new}</b><span>새로 학습</span></div>
            <div className="stat"><b>{d.review}</b><span>복습</span></div>
            <div className="stat"><b>{d.boxed}</b><span>상자에 담음</span></div>
          </div>
          <p className="sub">오늘 얻은 경험치 {d.xp.toLocaleString()}</p>
          {remainingNew(vocab, user) > 0 && <MoreButton onExit={onExit} />}
          <button className="btn ghost" onClick={onGames}>게임으로 복습하기</button>
          <button className="btn ghost" onClick={onExit}>홈으로</button>
        </div>
      )
    }
    return (
      <div className="celebrate">
        <BoxIcon className="trophy" />
        <h1>이 범위를 모두 학습했습니다</h1>
        <p className="sub">설정에서 학습 범위·기출 연도·품사를 넓히면 새 카드가 나옵니다.</p>
        <button className="btn" onClick={onExit}>홈으로</button>
      </div>
    )
  }

  if (!v) return null

  const inReview = idx < reviewTotal
  const front = dir === 'ja2ko' ? 'ja' : 'ko'
  const boxedNow = card?.s === 'b'
  const canEscape = boxedNow && card!.boxed! < day
  const label = mode === 'box' ? `기억상자 ${idx + 1} / ${queue.length}` : inReview ? `복습 ${idx + 1} / ${reviewTotal}` : `새 카드 ${idx - reviewTotal + 1} / ${newTotal}`
  const total = queue.length
  const style = drag ? { transform: `translateX(${drag}px) rotate(${drag / 30}deg)${flipped ? ' rotateY(180deg)' : ''}` } : undefined

  const meta = (
    <div className="meta">
      {entry.kind === 'box' && <span className="tag accent">기억상자 복습</span>}
      {entry.kind === 'check' && <span className="tag primary">탈출 확인</span>}
      <span className="tag">{v.pos}</span>
      {v.freq > 0 && <span className="tag primary">기출 {v.freq}회</span>}
    </div>
  )
  const word = <div className={'word' + (v.w.length > 6 ? ' long' : '')} lang="ja">{v.w}</div>
  const reading = v.r !== v.w && <div className="reading" lang="ja">{v.r}</div>
  const ko = <div className="ko">{v.ko.join(', ')}</div>
  const detail = (
    <>
      <KanjiList chars={v.kanji} />
      {v.ex && user?.settings.showEx && (
        <div className="example">
          <button className="ex-speak" onClick={() => listen(v.ex)} aria-label="예문 듣기"><SpeakerIcon /></button>
          <div>
            <div className="ex-ja"><Ruby text={v.ex} /></div>
            <div className="ex-ko">{v.exko}</div>
          </div>
        </div>
      )}
      {v.freq > 0 && (
        <div className="hint-line">
          {v.exams.map((e) => `${e.slice(2, 4)}년 ${Number(e.slice(5))}월`).join(' · ')}
          {' · '}{v.secs.map((s) => SECTIONS[s]).join('·')}
        </div>
      )}
    </>
  )

  return (
    <div className="study">
      <div className="study-top">
        <button className="icon-btn" onClick={onExit} aria-label="학습 닫기"><CloseIcon /></button>
        <div className="grow">
          <div className="row between" style={{ marginBottom: 6 }}>
            <b style={{ fontSize: 14 }}>{label}</b>
            {mode !== 'box' && <span className="sub">오늘 {user.days[day]?.new ?? 0} / {user.settings.goal}</span>}
          </div>
          <div className={'bar' + (inReview || mode === 'box' ? ' accent' : '')}><i style={{ width: `${(idx / total) * 100}%` }} /></div>
        </div>
      </div>

      <div className="stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { start.current = null; setDrag(0) }} onDoubleClick={(e) => e.preventDefault()}>
        <div key={idx} className={anim} style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
          <div className={'flash' + (flipped ? ' flipped' : '') + (drag ? ' dragging' : '')} style={style}>
            <div className={'face' + (entry.kind === 'box' ? ' review-box' : '')}>
              {meta}
              {front === 'ja' ? <>{word}{user.settings.furigana && reading}</> : ko}
              <div className="hint">두 번 터치하면 {front === 'ja' ? '읽기와 뜻이' : '일본어가'} 보여요</div>
            </div>
            <div className={'face back' + (entry.kind === 'box' ? ' review-box' : '')}>
              {meta}
              <div className="back-body">
                {word}{reading}{ko}{detail}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="act" onClick={() => listen(v.r)} disabled={front === 'ko' && !flipped} aria-label="발음 듣기">
          <SpeakerIcon />발음
        </button>
        {canEscape ? (
          <button className="act escape-btn" onClick={escape} aria-label="기억상자 탈출">
            <EscapeIcon />기억상자 탈출
          </button>
        ) : (
          <button className={'act box-btn' + (boxedNow ? ' on' : '') + (pop ? ' pop' : '')} onClick={toggleBox} aria-pressed={boxedNow} aria-label={boxedNow ? '기억상자에서 꺼내기' : '기억상자에 담기'}>
            {boxedNow ? <BoxInIcon /> : <BoxIcon />}
            {boxedNow ? '상자에 담김' : '모르면 기억상자'}
          </button>
        )}
        <button className="act" onClick={flip} aria-label="카드 뒤집기"><FlipIcon />뒤집기</button>
      </div>
      <div className="nav-row">
        <button className="btn ghost" onClick={() => go(-1)} disabled={idx === 0} style={{ flex: 1 }}>이전</button>
        <button className="btn" onClick={() => go(1)} style={{ flex: 2 }}>{canEscape ? '아직 몰라요 · 다음' : '다음'}</button>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
      {!user.tutorial && <Tutorial />}
    </div>
  )
}

function MoreButton({ onExit }: { onExit: () => void }) {
  // "더 공부하기"는 화면을 새로 열어 줄을 다시 세운다
  return (
    <button className="btn" onClick={() => { onExit(); window.dispatchEvent(new CustomEvent('mjn:study', { detail: 'more' })) }}>
      {MORE}개 더 공부하기
    </button>
  )
}

function Tutorial() {
  return (
    <div className="overlay" role="dialog" aria-label="조작법">
      <div className="card">
        <h2 style={{ fontSize: 20 }}>카드 조작법</h2>
        <div className="howto">
          <TapIcon /><span><b>두 번 터치</b>하면 카드가 돌면서 읽기·뜻·한자·예문이 나옵니다.</span>
          <SwipeIcon /><span><b>왼쪽으로 밀면</b> 다음 카드, 오른쪽으로 밀면 이전 카드.</span>
          <BoxIcon /><span>모르는 단어는 <b>기억상자</b>에 담으세요. 다음 날 맨 먼저 다시 나옵니다.</span>
          <EscapeIcon /><span>복습 때 외웠으면 <b>기억상자 탈출</b>을 누르세요.</span>
          <SpeakerIcon /><span><b>발음</b> 버튼으로 일본어 발음을 듣습니다. 예문 옆 스피커는 예문을 읽어 줍니다.</span>
        </div>
        <button className="btn" onClick={() => mutate((u) => { u.tutorial = true })}>시작하기</button>
      </div>
    </div>
  )
}
