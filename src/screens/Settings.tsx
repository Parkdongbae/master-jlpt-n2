import { useState } from 'react'
import { MIN_GOAL, remainingNew } from '../engine/engine'
import { cloud } from '../store/firebase'
import { logout, mutate, useApp } from '../store/store'
import { POS_LIST, YEARS, type Settings as S } from '../types'
import { hasJaVoice, speak } from '../ui/util'
import { alarmSupport, askPermission, fireAlarm, type AlarmSupport } from '../ui/alarm'

const GOALS = [10, 20, 30, 50, 100]

function toggle<T>(list: T[], item: T, all: readonly T[]): T[] {
  const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
  // 하나도 안 고르면 학습할 카드가 없으므로 마지막 하나는 남긴다
  return next.length ? all.filter((x) => next.includes(x)) : list
}

export default function Settings() {
  const { user, vocab } = useApp()
  const [custom, setCustom] = useState('')
  const [voice, setVoice] = useState(hasJaVoice())
  const [support, setSupport] = useState<AlarmSupport>(alarmSupport())
  if (!user) return null
  const s = user.settings
  const set = (patch: Partial<S>) => mutate((u) => { u.settings = { ...u.settings, ...patch } })
  const left = vocab ? remainingNew(vocab, user) : null
  const allPos = s.pos.length === POS_LIST.length
  const voiceMsg = voice === false
    ? '이 기기에는 일본어 음성이 없어 온라인 음성으로 읽어 줍니다(인터넷 필요). 기기 설정의 "텍스트 음성 변환"에서 일본어 음성을 내려받으면 오프라인에서도 들을 수 있습니다.'
    : '기기에 내장된 일본어 음성으로 읽어 줍니다.'

  const applyCustom = () => {
    const n = Math.round(Number(custom))
    if (Number.isFinite(n) && n >= MIN_GOAL && n <= 500) {
      set({ goal: n })
      setCustom('')
    }
  }

  const toggleAlarm = async (on: boolean) => {
    if (!on) return set({ alarm: false })
    const r = await askPermission()
    setSupport(r)
    set({ alarm: r === 'ok' })
  }

  return (
    <div className="page">
      <h1 className="page-title">설정</h1>

      <section className="card">
        <h2 className="sec">하루 목표 <span className="sub">(새 카드 수, 최소 {MIN_GOAL}개)</span></h2>
        <div className="chips">
          {GOALS.map((g) => <button key={g} className={'chip' + (s.goal === g ? ' on' : '')} onClick={() => set({ goal: g })}>{g}개</button>)}
          {!GOALS.includes(s.goal) && <button className="chip on">{s.goal}개</button>}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <input className="input" inputMode="numeric" placeholder={`직접 입력 (${MIN_GOAL}~500)`} value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} aria-label="하루 목표 직접 입력" />
          <button className="btn small" onClick={applyCustom} disabled={!custom || Number(custom) < MIN_GOAL || Number(custom) > 500}>적용</button>
        </div>
        {custom !== '' && Number(custom) < MIN_GOAL && <p className="error" style={{ marginTop: 6 }}>목표는 {MIN_GOAL}개 이상이어야 합니다.</p>}
      </section>

      <section className="card">
        <h2 className="sec">맞추는 방향</h2>
        <div className="seg">
          <button className={s.dir === 'ja2ko' ? 'on' : ''} onClick={() => set({ dir: 'ja2ko' })}>일본어 → 뜻</button>
          <button className={s.dir === 'ko2ja' ? 'on' : ''} onClick={() => set({ dir: 'ko2ja' })}>뜻 → 일본어</button>
        </div>
        <h2 className="sec" style={{ marginTop: 16 }}>새 카드 순서</h2>
        <div className="seg">
          <button className={s.order === 'freq' ? 'on' : ''} onClick={() => set({ order: 'freq' })}>기출 많은 순</button>
          <button className={s.order === 'random' ? 'on' : ''} onClick={() => set({ order: 'random' })}>무작위</button>
        </div>
      </section>

      <section className="card">
        <h2 className="sec">학습 범위</h2>
        <div className="seg">
          <button className={s.scope === 'all' ? 'on' : ''} onClick={() => set({ scope: 'all' })}>N2 전체</button>
          <button className={s.scope === 'kichul' ? 'on' : ''} onClick={() => set({ scope: 'kichul' })}>기출 단어만</button>
        </div>
        {s.scope === 'kichul' && (
          <>
            <h2 className="sec" style={{ marginTop: 16 }}>기출 연도</h2>
            <div className="chips">
              {YEARS.map((y) => <button key={y} className={'chip' + (s.years.includes(y) ? ' on' : '')} aria-pressed={s.years.includes(y)} onClick={() => set({ years: toggle(s.years, y, YEARS) })}>{y}</button>)}
            </div>
          </>
        )}
        <div className="row between" style={{ marginTop: 16 }}>
          <h2 className="sec" style={{ margin: 0 }}>품사</h2>
          <button className="btn small ghost" onClick={() => set({ pos: allPos ? [POS_LIST[0]] : [...POS_LIST] })}>{allPos ? '하나만 고르기' : '전체 선택'}</button>
        </div>
        <div className="chips" style={{ marginTop: 10 }}>
          {POS_LIST.map((d) => <button key={d} className={'chip' + (s.pos.includes(d) ? ' on' : '')} aria-pressed={s.pos.includes(d)} onClick={() => set({ pos: toggle(s.pos, d, POS_LIST) })}>{d}</button>)}
        </div>
        {left !== null && <p className="sub" style={{ marginTop: 12 }}>이 범위에 남은 새 카드: <b style={{ color: 'var(--text)' }}>{left.toLocaleString()}개</b></p>}
      </section>

      <section className="card">
        <h2 className="sec">발음</h2>
        <Row label="발음 자동 재생" desc="일본어 카드가 나올 때 발음을 들려줍니다" on={s.autoSpeak} onChange={(v) => set({ autoSpeak: v })} />
        <div className="seg" style={{ margin: '6px 0 10px' }}>
          <button className={s.rate === 'normal' ? 'on' : ''} onClick={() => set({ rate: 'normal' })}>보통 속도</button>
          <button className={s.rate === 'slow' ? 'on' : ''} onClick={() => set({ rate: 'slow' })}>천천히</button>
        </div>
        <div className="row between">
          <p className="sub" style={{ fontSize: 13 }}>{voiceMsg}</p>
          <button className="btn small ghost" onClick={() => { speak('日本語の発音を確認します'); setVoice(hasJaVoice()) }}>들어 보기</button>
        </div>
      </section>

      <section className="card">
        <Row label="학습 알람" desc="정한 시각에 오늘 남은 학습량을 알려 줍니다" on={s.alarm && support === 'ok'} onChange={toggleAlarm} />
        {s.alarm && support === 'ok' && (
          <>
            <div className="row between" style={{ padding: '8px 0' }}>
              <label htmlFor="alarm-time" style={{ fontSize: 15, fontWeight: 700 }}>알람 시각</label>
              <input id="alarm-time" className="input" type="time" value={s.alarmTime} onChange={(e) => e.target.value && set({ alarmTime: e.target.value })} style={{ width: 150 }} />
            </div>
            <div className="row between" style={{ padding: '4px 0 8px' }}>
              <p className="sub" style={{ fontSize: 13 }}>앱을 완전히 닫아 두면 알림이 뜨지 않고, 다음에 열 때 알려 줍니다.</p>
              <button className="btn small ghost" onClick={() => void fireAlarm(true)}>지금 시험</button>
            </div>
          </>
        )}
        {support === 'denied' && <p className="error" style={{ marginBottom: 8 }}>알림이 차단되어 있습니다. 브라우저(또는 휴대폰) 설정에서 이 사이트의 알림을 허용해 주세요.</p>}
        {support === 'unsupported' && <p className="sub" style={{ marginBottom: 8 }}>이 브라우저는 알림을 지원하지 않습니다. 아이폰은 홈 화면에 추가한 뒤 사용할 수 있습니다.</p>}
      </section>

      <section className="card">
        <Row label="예문 보기" desc="카드 뒷면에 그 단어를 쓴 예문과 해석을 보여 줍니다 (기출 단어 포함)" on={s.showEx} onChange={(v) => set({ showEx: v })} />
        <Row label="앞면에 읽기 표시" desc="일본어 앞면에 히라가나 읽기를 함께 보여 줍니다" on={s.furigana} onChange={(v) => set({ furigana: v })} />
        <Row label="효과음" desc="" on={s.sound} onChange={(v) => set({ sound: v })} />
      </section>

      <section className="card">
        <div className="row between">
          <div>
            <b>{user.name}</b>
            <p className="sub">{user.joined} 가입 · {cloud ? '클라우드 동기화 켜짐' : '이 기기에만 저장 중'}</p>
          </div>
          <button className="btn small danger" onClick={() => { if (confirm('로그아웃할까요? 학습 기록은 그대로 남습니다.')) logout() }}>로그아웃</button>
        </div>
        <button className="btn small ghost" style={{ marginTop: 12 }} onClick={() => mutate((u) => { u.tutorial = false })}>카드 조작법 다시 보기</button>
      </section>
      <style>{`.sec { font-size: 15px; font-weight: 700; margin-bottom: 10px; } .sec .sub { font-weight: 500; }`}</style>
    </div>
  )
}

function Row({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row between" style={{ padding: '8px 0' }}>
      <div>
        <b style={{ fontSize: 15 }}>{label}</b>
        {desc && <p className="sub" style={{ fontSize: 13 }}>{desc}</p>}
      </div>
      <button className={'switch' + (on ? ' on' : '')} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
    </div>
  )
}
