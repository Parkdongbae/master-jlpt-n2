import { useMemo, useRef, useState } from 'react'
import { useApp } from '../store/store'
import type { UserData, Vocab } from '../types'
import { shuffle, sfx, speak } from '../ui/util'
import { gamePool, readingDistractors } from './pool'
import { finishGame, meaning, Notice, Result, WrongList, type Outcome } from './shared'

const COUNT = 10

/** 한자 읽기: 시험 問題1처럼 한자 표기를 보고 올바른 읽기를 고른다 */
export default function Read({ onExit }: { onExit: () => void }) {
  const { vocab, user } = useApp()
  const [round, setRound] = useState(0)
  if (!vocab || !user) return <Notice text="단어를 불러오는 중이에요." onExit={onExit} />
  return <Play key={round} vocab={vocab} user={user} onExit={onExit} onRetry={() => setRound((r) => r + 1)} />
}

function Play({ vocab, user, onExit, onRetry }: { vocab: Vocab[]; user: UserData; onExit: () => void; onRetry: () => void }) {
  // 한자가 들어간 단어만 문제로 낸다
  const withKanji = useMemo(() => vocab.filter((v) => v.kanji.length > 0 && v.pos !== '접사'), [vocab])
  const queue = useMemo(() => gamePool(withKanji, user, COUNT), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<Vocab[]>([])
  const [out, setOut] = useState<Outcome | null>(null)
  const locked = useRef(false)

  const q = queue[idx]
  const options = useMemo(() => (q ? shuffle([q.r, ...readingDistractors(withKanji, q, 3)]) : []), [q]) // eslint-disable-line react-hooks/exhaustive-deps

  if (queue.length < 4) return <Notice text="문제로 낼 단어가 부족해요. 설정에서 범위를 넓혀 보세요." onExit={onExit} />

  if (out) {
    return (
      <Result title="한자 읽기" score={score} out={out} lines={[`${queue.length - wrong.length}/${queue.length} 문제 정답`]} onRetry={onRetry} onExit={onExit}>
        <WrongList items={wrong} />
      </Result>
    )
  }

  const pick = (i: number) => {
    if (locked.current) return
    locked.current = true
    setPicked(i)
    const ok = options[i] === q.r
    const total = score + (ok ? 10 : 0)
    setScore(total)
    if (ok) sfx('ok')
    else {
      sfx('no')
      setWrong([...wrong, q])
    }
    speak(q.r)
    window.setTimeout(() => {
      locked.current = false
      if (idx + 1 >= queue.length) setOut(finishGame('read', total, total * 0.4))
      else {
        setIdx(idx + 1)
        setPicked(null)
      }
    }, ok ? 900 : 1600)
  }

  return (
    <div className="g-wrap">
      <div className="row between">
        <button className="btn ghost small" onClick={onExit}>그만하기</button>
        <span className="tag primary">{idx + 1} / {queue.length}</span>
        <div className="g-pts">{score}점</div>
      </div>
      <div className="bar"><i style={{ width: `${(idx / queue.length) * 100}%` }} /></div>
      <div className="card g-q">
        <div className="sub">이 단어의 읽기는?</div>
        <div className={'g-prompt' + (q.w.length > 6 ? ' long' : '')} lang="ja">{q.w}</div>
        <div className="sub g-hintline">{picked !== null ? meaning(q) : ' '}</div>
      </div>
      <div className="g-options">
        {options.map((o, i) => {
          const isAns = o === q.r
          const cls = picked === null ? '' : isAns ? ' ok' : i === picked ? ' bad' : ''
          return (
            <button key={o} lang="ja" className={'g-opt' + cls} disabled={picked !== null && !isAns && i !== picked} onClick={() => pick(i)}>
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}
