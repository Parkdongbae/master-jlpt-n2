import { useState } from 'react'
import { login } from '../store/store'
import { BoxIcon } from '../ui/icons'

export default function Auth() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const r = await login(name, code)
    setBusy(false)
    if (r === 'bad-name') setError('이름은 1~12자로 입력하세요. ( / . # $ [ ] 는 쓸 수 없습니다 )')
    else if (r === 'bad-code') setError('가입 암호가 맞지 않습니다.')
  }

  return (
    <form className="page" onSubmit={submit} style={{ justifyContent: 'center' }}>
      <div className="center" style={{ marginBottom: 8 }}>
        <BoxIcon className="" />
        <style>{`.page > .center > svg { width: 84px; height: 84px; color: var(--primary); }`}</style>
        <h1 className="page-title" style={{ fontSize: 26, marginTop: 8 }}>JLPT N2 기출 단어 정복</h1>
        <p className="sub">2022년 이후 N2 기출 어휘와 필수 단어를 한자와 함께 매일 조금씩</p>
      </div>
      <div className="field">
        <label htmlFor="name">이름</label>
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" autoComplete="nickname" maxLength={12} required />
      </div>
      <div className="field">
        <label htmlFor="code">가입 암호</label>
        <input id="code" className="input" type="text" lang="ko" value={code} onChange={(e) => setCode(e.target.value)} placeholder="안내받은 암호" autoComplete="off" autoCapitalize="off" spellCheck={false} required />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn" disabled={busy || !name.trim() || !code}>{busy ? '확인 중…' : '시작하기'}</button>
      <p className="sub center">처음이면 가입되고, 같은 이름으로 다시 들어오면 기록이 이어집니다.</p>
    </form>
  )
}
