export const YEARS = [2022, 2023, 2024, 2025, 2026]

export const POS_LIST = ['명사', '명사·する', '동사', 'い형용사', 'な형용사', '부사', '접사', '기타'] as const
export type Pos = (typeof POS_LIST)[number]

/** 기출 문제 유형 (문자·어휘 파트 問題1~6) */
export const SECTIONS = {
  reading: '한자읽기',
  writing: '표기',
  formation: '단어형성',
  context: '문맥규정',
  synonym: '유의표현',
  usage: '용법',
  unknown: '기출',
} as const
export type Section = keyof typeof SECTIONS

/** 단어 한 장 */
export interface Vocab {
  id: string
  /** 표기 (한자 포함) */
  w: string
  /** 읽기 (히라가나·가타카나) */
  r: string
  pos: Pos
  ko: string[]
  /** 예문. 후리가나는 [漢字|かんじ] 형식 */
  ex: string
  exko: string
  /** 기출 회차 수 */
  freq: number
  /** 기출 회차: "2024-07" 형식 */
  exams: string[]
  years: number[]
  secs: Section[]
  /** 표기에 들어 있는 한자 */
  kanji: string[]
}

/** 한자 한 글자 정보 */
export interface Kanji {
  /** 한국 훈음: "험할 험" */
  ko: string
  /** 음독 (가타카나) */
  on: string[]
  /** 훈독 (히라가나, 오쿠리가나는 . 뒤) */
  kun: string[]
  strokes: number
}

/**
 * 카드 상태
 *  l: 학습함(보고 넘김)  b: 기억상자 안  c: 탈출 확인 중  d: 완전 암기
 */
export interface CardState {
  s: 'l' | 'b' | 'c' | 'd'
  /** 상자에 담은 날 */
  boxed?: string
  /** 탈출 확인 단계 0~2 (3·7·21일) */
  stage?: number
  /** 탈출 확인이 나올 날 */
  due?: string
  /** 마지막으로 복습한 날 (하루 한 번만 복습에 나오게) */
  lr?: string
  /** 복습 횟수 */
  n?: number
}

export interface DayRecord {
  new: number
  review: number
  boxed: number
  goal: boolean
  xp: number
  gameXp: number
}

export interface Settings {
  goal: number
  /** 앞면: ja2ko 일본어 → 뜻, ko2ja 뜻 → 일본어 */
  dir: 'ja2ko' | 'ko2ja'
  /** 학습 범위: 전체 N2 단어 / 기출 단어만 */
  scope: 'all' | 'kichul'
  /** 기출 연도 (scope가 kichul일 때만 적용) */
  years: number[]
  pos: Pos[]
  order: 'freq' | 'random'
  /** 일본어 앞면에 읽기(후리가나)를 함께 보여 줄지 */
  furigana: boolean
  /** 카드 뒷면에 예문을 보여 줄지 */
  showEx: boolean
  autoSpeak: boolean
  /** 발음 속도 */
  rate: 'slow' | 'normal'
  sound: boolean
  /** 학습 알람 사용 여부와 시각("HH:MM") */
  alarm: boolean
  alarmTime: string
}

export const DEFAULT_SETTINGS: Settings = {
  goal: 30,
  dir: 'ja2ko',
  scope: 'all',
  years: [...YEARS],
  pos: [...POS_LIST],
  order: 'freq',
  furigana: false,
  showEx: true,
  autoSpeak: false,
  rate: 'normal',
  sound: true,
  alarm: false,
  alarmTime: '20:00',
}

export interface UserData {
  name: string
  joined: string
  settings: Settings
  cards: Record<string, CardState>
  days: Record<string, DayRecord>
  xp: number
  best: Record<string, number>
  badges: Record<string, string>
  tutorial: boolean
  updatedAt: number
}
