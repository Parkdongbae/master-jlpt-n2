import { gainGameXp, putInBox } from '../engine/engine'
import { mutate, today, useApp } from '../store/store'
import type { Vocab } from '../types'
import { confetti, sfx } from '../ui/util'

export const meaning = (v: Vocab) => v.ko.join(', ')

export interface Outcome {
  gained: number
  newBest: boolean
  best: number
}

/** 게임 기록: 경험치(하루 상한 적용)와 최고 기록을 저장하고 결과를 돌려준다 */
export function finishGame(key: 'quiz' | 'match' | 'read', score: number, xp: number): Outcome {
  let gained = 0
  let prev = 0
  mutate((u) => {
    prev = u.best[key] ?? 0
    gained = gainGameXp(u, today(), Math.max(0, Math.min(40, Math.round(xp))))
    u.best[key] = Math.max(prev, score)
  })
  const newBest = score > prev && score > 0
  sfx('win')
  if (newBest) confetti()
  return { gained, newBest, best: Math.max(prev, score) }
}

export function Result(props: {
  title: string
  score: number
  out: Outcome
  lines?: string[]
  onRetry: () => void
  onExit: () => void
  children?: React.ReactNode
}) {
  const { score, out } = props
  return (
    <div className="g-wrap">
      <div className="card g-result">
        <div className="sub">{props.title}</div>
        <div className="g-score">{score}<small>점</small></div>
        {out.newBest && <span className="tag accent g-new">최고 기록 갱신!</span>}
        <div className="g-lines">
          <div>얻은 경험치 <b>+{out.gained}</b>{out.gained === 0 && <span className="sub"> (오늘 상한)</span>}</div>
          <div>내 최고 기록 <b>{out.best}</b></div>
          {props.lines?.map((l) => <div key={l}>{l}</div>)}
        </div>
      </div>
      {props.children}
      <div className="g-actions">
        <button className="btn" onClick={props.onRetry}>다시 하기</button>
        <button className="btn ghost" onClick={props.onExit}>목록으로</button>
      </div>
    </div>
  )
}

/** 틀린 단어 목록과 기억상자 일괄 담기 */
export function WrongList({ items }: { items: Vocab[] }) {
  const { user } = useApp()
  if (!items.length) return null
  const todo = items.filter((v) => user?.cards[v.id]?.s !== 'b')
  const putAll = () => {
    mutate((u) => {
      for (const v of todo) putInBox(u, v.id, today())
    })
    sfx('box')
  }
  return (
    <div className="card flat g-wrong">
      <div className="row between">
        <b>틀린 단어 {items.length}개</b>
      </div>
      <div className="list">
        {items.map((v) => (
          <div className="item" key={v.id}>
            <div className="grow">
              <b lang="ja">{v.w}</b>{v.r !== v.w && <span className="sub" lang="ja" style={{ marginLeft: 8 }}>{v.r}</span>}
              <div className="ko">{meaning(v)}</div>
            </div>
            {user?.cards[v.id]?.s === 'b' && <span className="tag accent">상자</span>}
          </div>
        ))}
      </div>
      {todo.length > 0 && <button className="btn small g-box" onClick={putAll}>기억상자에 담기 ({todo.length})</button>}
    </div>
  )
}


export function Notice({ text, onExit }: { text: string; onExit: () => void }) {
  return (
    <div className="g-wrap">
      <div className="empty">
        <div>{text}</div>
        <button className="btn ghost small" onClick={onExit}>목록으로</button>
      </div>
    </div>
  )
}
