import { useApp } from '../store/store'

/** 후리가나 표기 [漢字|かんじ] 를 <ruby>로 그린다 */
export function Ruby({ text }: { text: string }) {
  const parts = text.split(/(\[[^|\]]+\|[^\]]+\])/)
  return (
    <span lang="ja">
      {parts.map((p, i) => {
        const m = /^\[([^|\]]+)\|([^\]]+)\]$/.exec(p)
        return m ? <ruby key={i}>{m[1]}<rt>{m[2]}</rt></ruby> : p
      })}
    </span>
  )
}

/** 단어에 들어 있는 한자의 훈음·음독·훈독 */
export function KanjiList({ chars, max = 4 }: { chars: string[]; max?: number }) {
  const { kanji } = useApp()
  const rows = chars.filter((c) => kanji.has(c)).slice(0, max)
  if (!rows.length) return null
  return (
    <div className="kanji-list">
      {rows.map((c) => {
        const k = kanji.get(c)!
        return (
          <div className="kanji-row" key={c}>
            <b lang="ja">{c}</b>
            <div>
              <div className="k-ko">{k.ko}</div>
              <div className="k-rd" lang="ja">
                {k.on.length > 0 && <span><i>음</i>{k.on.slice(0, 3).join('・')}</span>}
                {k.kun.length > 0 && <span><i>훈</i>{k.kun.slice(0, 3).join('・')}</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
