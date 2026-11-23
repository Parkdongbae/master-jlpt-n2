"""번역 작업 결과(data/work/out_*.json, kanji_out_*.json)를 검증해 data/words.json, data/kanji_ko.json 으로 합친다."""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORK, DATA = ROOT / 'data/work', ROOT / 'data'
POS = ['명사', '명사·する', '동사', 'い형용사', 'な형용사', '부사', '접사', '기타']
RUBY = re.compile(r'\[([^|\[\]]+)\|([^|\[\]]+)\]')
KANJI = re.compile(r'[一-鿿]')
KANA = re.compile(r'^[぀-ヿー〜・]+$')


def collect(pattern):
    words, seen, skipped, bad = [], {}, 0, []
    for f in sorted(WORK.glob(pattern)):
        for it in json.loads(f.read_text(encoding='utf-8')):
            if 'skip' in it:
                skipped += 1
                continue
            w, r = it['w'].replace('～', '〜').strip(), it['r'].replace('～', '〜').strip()
            ex = it.get('ex', '').strip()
            errs = []
            if it.get('pos') not in POS: errs.append('pos')
            if not it.get('ko'): errs.append('ko')
            if not KANA.match(r): errs.append('reading')
            if re.search(r'[\s()（）;]', w): errs.append('w')
            if KANJI.search(re.sub('[一二三四五六七八九十百千]', '', RUBY.sub('', ex))): errs.append('ruby')  # 후리가나 없는 한자
            if any(not re.match(r'^[぀-ヿー]+$', m[1]) for m in RUBY.findall(ex)): errs.append('rubykana')
            if errs:
                bad.append((it['i'], w, errs))
            if 'pos' in errs or 'ko' in errs or 'reading' in errs or 'w' in errs:
                continue
            if 'ruby' in errs or 'rubykana' in errs:
                ex = ''
            key = (w, r)
            if key in seen:
                skipped += 1
                continue
            seen[key] = 1
            words.append({'w': w, 'r': r, 'pos': it['pos'], 'ko': [k.strip() for k in it['ko']][:3], 'ex': ex, 'exko': it.get('exko', '').strip() if ex else ''})
    return words, skipped, bad


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    # 기본 단어장 / 기출에만 나온 추가 단어
    for pattern, kpattern, wout, kout in [('out_*.json', 'kanji_out_*.json', 'words.json', 'kanji_ko.json'),
                                          ('extra_out.json', 'extra_kanji_out.json', 'extra_words.json', 'extra_kanji_ko.json')]:
        words, skipped, bad = collect(pattern)
        kk = {}
        for f in sorted(WORK.glob(kpattern)):
            kk.update(json.loads(f.read_text(encoding='utf-8')))
        (DATA / wout).write_text(json.dumps(words, ensure_ascii=False, indent=0), encoding='utf-8')
        (DATA / kout).write_text(json.dumps(kk, ensure_ascii=False, indent=0), encoding='utf-8')
        print(f'{wout}: words {len(words)}  skipped/dup {skipped}  flagged {len(bad)}  kanji {len(kk)}')
        for b in bad: print(' ', b)


if __name__ == '__main__':
    main()
