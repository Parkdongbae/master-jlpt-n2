"""앱 데이터 생성: data/words.json(+extra_words.json) + data/kanji_ko.json + data/kichul.json + KANJIDIC2
→ public/data/vocab.json, data/report.md
사용: python tools/build.py   (KANJIDIC2는 tools/prepare.py 가 data/work/kanjidic.json 으로 풀어 둔다)
"""
import json, re, sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
POS = ['명사', '명사·する', '동사', 'い형용사', 'な형용사', '부사', '접사', '기타']
SECS = ['reading', 'writing', 'formation', 'context', 'synonym', 'usage', 'unknown']
SEC_KO = {'reading': '한자읽기', 'writing': '표기', 'formation': '단어형성', 'context': '문맥규정', 'synonym': '유의표현', 'usage': '용법', 'unknown': '유형 미상'}
KANJI = re.compile(r'[一-鿿]')


def load(name, default):
    p = DATA / name
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else default


def kata2hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    words = load('words.json', []) + load('extra_words.json', [])
    fixes = load('fixes.json', {'words': {}, 'kanji': {}, 'drop': []})
    kichul = load('kichul.json', {'items': [], 'sources': []})
    kd = json.loads((DATA / 'work/kanjidic.json').read_text(encoding='utf-8'))
    kko = {**load('kanji_ko.json', {}), **load('extra_kanji_ko.json', {}), **fixes.get('kanji', {})}

    # 단어 정리 (중복 제거, 수정 반영)
    by_key, by_w, by_r = {}, defaultdict(list), defaultdict(list)
    for x in words:
        key = f"{x['w']}|{x['r']}"
        if key in fixes.get('drop', []) or key in by_key:
            continue
        x = {**x, **fixes.get('words', {}).get(key, {})}
        by_key[key] = x
        by_w[x['w']].append(key)
        by_r[kata2hira(x['r'])].append(key)

    # 기출 연결: 표기+읽기 → 표기 → (가나 표기일 때) 읽기 순
    exams = sorted({it['exam'] for it in kichul['items'] if it['exam'] != 'unknown'})
    hits, missing = defaultdict(set), Counter()
    per_exam = defaultdict(Counter)
    for it in kichul['items']:
        if it['exam'] == 'unknown':
            continue
        w, r = it['word'].replace('～', '〜').strip(), kata2hira((it.get('reading') or '').strip())
        sec = it.get('section') if it.get('section') in SECS else 'unknown'
        per_exam[it['exam']][sec] += 1
        keys = [k for k in by_w.get(w, []) if not r or kata2hira(by_key[k]['r']) == r] or by_w.get(w, [])
        if not keys and not KANJI.search(w):
            keys = by_r.get(kata2hira(w), [])
        if not keys and r and len(by_r.get(r, [])) == 1:
            keys = by_r[r]
        if not keys:
            missing[(w, it.get('reading') or '')] += 1
            continue
        for k in keys[:1]:
            hits[k].add((exams.index(it['exam']), sec))

    out_words = []
    used = set()
    for key, x in by_key.items():
        h = sorted(hits.get(key, []))
        out_words.append([x['w'], x['r'], POS.index(x['pos']), x['ko'], x.get('ex', ''), x.get('exko', ''), [list(t) for t in h]])
        used.update(KANJI.findall(x['w']))
    kanji = {}
    for c in sorted(used):
        if c in kd:
            k = kd[c]
            kanji[c] = [kko.get(c, ''), k['on'], [u for u in k['kun'] if not u.startswith('-')][:4], k['strokes']]
    out = {'exams': exams, 'words': out_words, 'kanji': kanji}
    (ROOT / 'public/data').mkdir(parents=True, exist_ok=True)
    (ROOT / 'public/data/vocab.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (DATA / 'work').mkdir(exist_ok=True)
    (DATA / 'work/kichul_missing.json').write_text(json.dumps([[w, r, n] for (w, r), n in missing.most_common()], ensure_ascii=False, indent=0), encoding='utf-8')

    # 보고서
    kc = [w for w in out_words if w[6]]
    freq = Counter(len({e for e, _ in w[6]}) for w in kc)
    L = ['# 데이터 보고서', '', '`python tools/build.py` 가 자동으로 만든다.', '',
         '## 단어장', '', f'- 단어 {len(out_words):,}개 (예문 {sum(1 for w in out_words if w[4]):,}개)', f'- 한자 {len(kanji):,}자 (한국 훈음 {sum(1 for k in kanji.values() if k[0]):,}자)', '',
         '| 품사 | 개수 |', '|---|---|']
    pc = Counter(POS[w[2]] for w in out_words)
    L += [f'| {p} | {pc[p]:,} |' for p in POS]
    L += ['', '## 기출 분석 (2022년~)', '',
          f'- 수집한 기출 항목 {sum(sum(c.values()) for c in per_exam.values()):,}개, 단어장과 연결된 단어 {len(kc):,}개, 단어장에 없어 빠진 항목 {sum(missing.values()):,}개',
          '- JLPT는 기출을 공식 공개하지 않는다. 아래 수치는 웹에 공개된 복원 자료 기준이며, 회차당 문자·어휘 문항은 30개다(유의표현은 밑줄 어휘와 정답 어휘를 각각 세므로 30을 넘는다).', '',
          '| 회차 | ' + ' | '.join(SEC_KO[s] for s in SECS) + ' | 합계 |', '|---|' + '---|' * (len(SECS) + 1)]
    for e in exams:
        c = per_exam[e]
        L.append(f'| {e} | ' + ' | '.join(str(c[s]) for s in SECS) + f' | {sum(c.values())} |')
    L += ['', '| 기출 횟수 | 단어 수 |', '|---|---|'] + [f'| {n}회 | {freq[n]:,} |' for n in sorted(freq, reverse=True)]
    top = sorted(kc, key=lambda w: -len({e for e, _ in w[6]}))[:30]
    L += ['', '### 여러 회차에 나온 단어', '', ', '.join(f'{w[0]}({len({e for e, _ in w[6]})})' for w in top if len({e for e, _ in w[6]}) > 1) or '없음']
    if kichul.get('sources'):
        L += ['', '### 출처', ''] + [f"- [{s.get('title') or s['url']}]({s['url']})" for s in kichul['sources']]
    (DATA / 'report.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
    size = (ROOT / 'public/data/vocab.json').stat().st_size
    print(f'words {len(out_words)}  kanji {len(kanji)}  exams {exams}  kichul-linked {len(kc)}  missing {sum(missing.values())}  size {size // 1024}KB')


if __name__ == '__main__':
    main()
