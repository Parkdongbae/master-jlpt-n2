import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store/store'
import type { UserData, Vocab } from '../types'
import { shuffle, sfx } from '../ui/util'
import { distractors, gamePool } from './pool'
import { finishGame, meaning, Notice, Result, WrongList, type Outcome } from './shared'

const TOTAL_MS = 60000
const PENALTY_MS = 3000
const mult = (combo: number) => Math.min(5, 1 + Math.floor(combo / 3))

export default function Quiz({ onExit }: { onExit: () => void }) {
  const { vocab, user } = useApp()
  const [round, setRound] = useState(0)
  if (!vocab || !user) return <Notice text="단어를 불러오는 중이에요." onExit={onExit} />
  return <Play key={round} vocab={vocab} user={user} onExit={onExit} onRetry={() => setRound((r) => r + 1)} />
}

function Play({ vocab, user, onExit, onRetry }: { vocab: Vocab[]; user: UserData; onExit: () => void; onRetry: () => void }) {
  const dir = user.settings.dir
  const queue = useMemo(() => gamePool(vocab, user, 80), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [left, setLeft] = useState(TOTAL_MS)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<Vocab[]>([])
  const [right, setRight] = useState(0)
  const [out, setOut] = useState<Outcome | null>(null)
  const deadline = useRef(Date.now() + TOTAL_MS)
  const latest = useRef({ score: 0 })
  latest.current.score = score
  const done = useRef(false)

  const q = queue[idx % Math.max(1, queue.length)]
  const options = useMemo(() => {
    if (!q) return []
    return shuffle([q, ...distractors(vocab, q, 3)])
  }, [q, idx]) // eslint-disable-line react-hooks/exhaustive-deps

  const finish = () => {
    if (done.current) return
    done.current = true
    const s = latest.current.score
    setOut(finishGame('quiz', s, s / 15))
  }

  useEffect(() => {
    if (queue.length < 4) return
    const t = window.setInterval(() => {
      const l = deadline.current - Date.now()
      if (l <= 0) {
        setLeft(0)
        window.clearInterval(t)
        finish()
      } else setLeft(l)
    }, 100)
    return () => window.clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (queue.length < 4) return <Notice text="문제로 낼 단어가 부족해요. 설정에서 범위를 넓혀 보세요." onExit={onExit} />

  if (out) {
    return (
      <Result title="스피드 퀴즈" score={score} out={out} lines={[`맞힌 문제 ${right}개`]} onRetry={onRetry} onExit={onExit}>
        <WrongList items={wrong} />
      </Result>
    )
  }

  const pick = (i: number) => {
    if (picked !== null || done.current) return
    setPicked(i)
    const ok = options[i].id === q.id
    if (ok) {
      sfx('ok')
      setScore((s) => s + 10 * mult(combo))
      setCombo((c) => c + 1)
      setRight((r) => r + 1)
    } else {
      sfx('no')
      setCombo(0)
      deadline.current -= PENALTY_MS
      setWrong((w) => (w.some((x) => x.id === q.id) ? w : [...w, q]))
    }
    window.setTimeout(() => {
      if (done.current) return
      setPicked(null)
      setIdx((n) => n + 1)
    }, ok ? 300 : 800)
  }

  const label = (v: Vocab) => (dir === 'ja2ko' ? meaning(v) : v.w)
  const m = mult(combo)
  const missed = picked !== null && options[picked].id !== q.id

  return (
    <div className="g-wrap">
      <div className="row between">
        <button className="btn ghost small" onClick={onExit}>그만하기</button>
        <div className="g-time" aria-label="남은 시간">{Math.ceil(left / 1000)}초</div>
        <div className="g-pts">{score}점</div>
      </div>
      <div className={'bar' + (left < 10000 ? ' accent' : '')}><i style={{ width: `${(left / TOTAL_MS) * 100}%` }} /></div>
      <div className="row between">
        <span className={'tag' + (m > 1 ? ' accent' : '')}>콤보 {combo} · ×{m}</span>
        {missed && <span className="tag g-pen">-3초</span>}
      </div>
      <div className="card g-q">
        <div className="sub">{dir === 'ja2ko' ? '알맞은 뜻은?' : '알맞은 일본어는?'}</div>
        <div className={'g-prompt' + (q.w.length > 6 || dir === 'ko2ja' ? ' long' : '')}>{dir === 'ja2ko' ? q.w : meaning(q)}</div>
      </div>
      <div className="g-options">
        {options.map((o, i) => {
          const isAns = o.id === q.id
          const cls = picked === null ? '' : isAns ? ' ok' : i === picked ? ' bad' : ''
          return (
            <button key={o.id} className={'g-opt' + cls} disabled={picked !== null && !isAns && i !== picked} onClick={() => pick(i)}>
              {label(o)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
