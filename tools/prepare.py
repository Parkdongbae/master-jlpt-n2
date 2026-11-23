"""원본(N2 공개 단어 목록, KANJIDIC2)을 읽어 번역 작업용 묶음과 한자 기본 정보를 만든다.
사용: python tools/prepare.py
"""
import csv, gzip, html, json, re, sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW, WORK = ROOT / 'data/raw', ROOT / 'data/work'
CHUNKS = 8
KANJI = re.compile(r'[一-鿿]')


def load_kanjidic():
    out = {}
    with gzip.open(RAW / 'kanjidic2.xml.gz', 'rb') as f:
        for _, ch in ET.iterparse(f):
            if ch.tag != 'character':
                continue
            lit = ch.findtext('literal')
            rd = lambda t: [r.text for r in ch.iter('reading') if r.get('r_type') == t]
            out[lit] = {
                'on': rd('ja_on'), 'kun': rd('ja_kun'), 'kr': rd('korean_h'),
                'en': [m.text for m in ch.iter('meaning') if m.get('m_lang') is None][:4],
                'strokes': int(ch.findtext('misc/stroke_count') or 0),
                'grade': int(ch.findtext('misc/grade') or 0),
                'jlpt': int(ch.findtext('misc/jlpt') or 0),
            }
            ch.clear()
    return out


def main():
    rows = list(csv.DictReader(open(RAW / 'n2.csv', encoding='utf-8')))
    items = [[i, r['expression'].strip(), r['reading'].strip(), html.unescape(r['meaning']).strip()] for i, r in enumerate(rows)]
    WORK.mkdir(parents=True, exist_ok=True)
    size = -(-len(items) // CHUNKS)
    for k in range(CHUNKS):
        (WORK / f'in_{k}.json').write_text(json.dumps(items[k * size:(k + 1) * size], ensure_ascii=False, indent=0), encoding='utf-8')
    kd = load_kanjidic()
    (WORK / 'kanjidic.json').write_text(json.dumps(kd, ensure_ascii=False), encoding='utf-8')
    used = sorted({c for it in items for c in KANJI.findall(it[1])})
    missing = [c for c in used if c not in kd]
    kin = [[c, kd[c]['kr'], kd[c]['en']] for c in used if c in kd]
    (WORK / 'kanji_in.json').write_text(json.dumps(kin, ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'words {len(items)}  chunks {CHUNKS}x{size}  kanji {len(used)}  missing {missing}')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
