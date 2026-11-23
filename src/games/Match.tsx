import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/store'
import type { UserData, Vocab } from '../types'
import { shuffle, sfx } from '../ui/util'
import { gamePool } from './pool'
import { finishGame, meaning, Notice, Result, type Outcome } from './shared'

const STAGES = [6, 8, 10] // 카드 12 · 16 · 20장

interface Card {
  key: string
  id: string
  text: string
  kind: 'ja' | 'ko'
}

function deal(words: Vocab[]): Card[] {
  const cards: Card[] = []
  for (const v of words) {
    cards.push({ key: v.id + ':ja', id: v.id, text: v.w, kind: 'ja' })
    cards.push({ key: v.id + ':ko', id: v.id, text: meaning(v), kind: 'ko' })
  }
  return shuffle(cards)
}

/** 한 단계 점수: 짝 수 기준 점수에서 군더더기 뒤집기와 시간을 깎는다 */
export function stageScore(pairs: number, flips: number, secs: number): number {
  const extra = Math.max(0, flips - pairs * 2)
  return Math.max(pairs * 10, pairs * 50 - extra * 3 - Math.round(secs) * 2)
}

export default function Match({ onExit }: { onExit: () => void }) {
  const { vocab, user } = useApp()
  const [round, setRound] = useState(0)
  if (!vocab || !user) return <Notice text="단어를 불러오는 중이에요." onExit={onExit} />
  return <Play key={round} vocab={vocab} user={user} onExit={onExit} onRetry={() => setRound((r) => r + 1)} />
}

function Play({ vocab, user, onExit, onRetry }: { vocab: Vocab[]; user: UserData; onExit: () => void; onRetry: () => void }) {
  const [stage, setStage] = useState(0)
  const [cards, setCards] = useState<Card[]>(() => deal(gamePool(vocab, user, STAGES[0])))
  const [open, setOpen] = useState<number[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [flips, setFlips] = useState(0)
  const [secs, setSecs] = useState(0)
  const [total, setTotal] = useState(0)
  const [gain, setGain] = useState(0)
  const [phase, setPhase] = useState<'play' | 'between'>('play')
  const [out, setOut] = useState<Outcome | null>(null)
  const start = useRef(Date.now())
  const lock = useRef(false)
  const finished = useRef(false)

  const pairs = cards.length / 2
  const enough = pairs >= STAGES[0]

  useEffect(() => {
    if (!enough || phase !== 'play') return
    const t = window.setInterval(() => setSecs(Math.floor((Date.now() - start.current) / 1000)), 500)
    return () => window.clearInterval(t)
  }, [enough, phase, stage])

  if (!enough) return <Notice text="문제로 낼 단어가 부족해요. 설정에서 범위를 넓혀 보세요." onExit={onExit} />

  const finish = (score: number) => {
    if (finished.current) return
    finished.current = true
    setOut(finishGame('match', score, score / 10))
  }

  if (out) {
    return <Result title="짝 맞추기" score={total} out={out} lines={[`${stage + 1}단계까지 도전`]} onRetry={onRetry} onExit={onExit} />
  }

  const flip = (i: number) => {
    if (lock.current || phase !== 'play' || open.includes(i) || matched.includes(cards[i].id)) return
    sfx('flip')
    setFlips((f) => f + 1)
    const now = [...open, i]
    setOpen(now)
    if (now.length < 2) return
    lock.current = true
    const [a, b] = now.map((k) => cards[k])
    if (a.id === b.id && a.kind !== b.kind) {
      window.setTimeout(() => {
        sfx('ok')
        const m = [...matched, a.id]
        setMatched(m)
        setOpen([])
        lock.current = false
        if (m.length === pairs) {
          const secsNow = (Date.now() - start.current) / 1000
          const s = stageScore(pairs, flips + 1, secsNow)
          setSecs(Math.floor(secsNow))
          setGain(s)
          setTotal((t) => t + s)
          if (stage + 1 < STAGES.length) setPhase('between')
          else finish(total + s)
        }
      }, 350)
    } else {
      window.setTimeout(() => {
        sfx('no')
        setOpen([])
        lock.current = false
      }, 800)
    }
  }

  const nextStage = () => {
    const want = STAGES[stage + 1]
    const words = gamePool(vocab, user, want)
    if (words.length < want) return finish(total)
    setCards(deal(words))
    setStage(stage + 1)
    setOpen([])
    setMatched([])
    setFlips(0)
    setSecs(0)
    start.current = Date.now()
    lock.current = false
    setPhase('play')
  }

  const cols = cards.length <= 12 ? 3 : 4

  return (
    <div className="g-wrap">
      <div className="row between">
        <button className="btn ghost small" onClick={onExit}>그만하기</button>
        <span className="tag primary">{stage + 1}단계 · {cards.length}장</span>
        <div className="g-pts">{total}점</div>
      </div>
      <div className="row between sub">
        <span>시간 {secs}초</span>
        <span>뒤집은 횟수 {flips}</span>
        <span>짝 {matched.length}/{pairs}</span>
      </div>
      <div className="g-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cards.map((c, i) => {
          const done = matched.includes(c.id)
          const up = done || open.includes(i)
          return (
            <button
              key={c.key}
              className={'g-tile' + (up ? ' up' : '') + (done ? ' done' : '') + (c.kind === 'ko' ? ' ko' : '') + (cards.length > 12 ? ' small' : '')}
              onClick={() => flip(i)}
              aria-label={up ? c.text : '카드'}
            >
              <span>{up ? c.text : '?'}</span>
            </button>
          )
        })}
      </div>
      {phase === 'between' && (
        <div className="card g-result">
          <div className="sub">{stage + 1}단계 완료</div>
          <div className="g-score">+{gain}<small>점</small></div>
          <div className="g-lines">
            <div>걸린 시간 <b>{secs}초</b> · 뒤집은 횟수 <b>{flips}</b></div>
          </div>
          <div className="g-actions">
            <button className="btn" onClick={nextStage}>다음 단계 ({STAGES[stage + 1] * 2}장)</button>
            <button className="btn ghost" onClick={() => finish(total)}>여기서 마치기</button>
          </div>
        </div>
      )}
    </div>
  )
}
