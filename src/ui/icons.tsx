/** 직접 그린 SVG 아이콘. 색은 currentColor를 따른다. */
type P = { className?: string }
const base = { viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

/** 기억상자: 뚜껑이 닫힌 상자 */
export const BoxIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M6 20h36v18a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" fill="currentColor" fillOpacity="0.18" />
    <path d="M4 12h40v8H4z" fill="currentColor" fillOpacity="0.35" />
    <path d="M19 28h10" />
  </svg>
)

/** 기억상자에 담김: 상자 위로 카드가 들어가는 모양 */
export const BoxInIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M6 24h36v14a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" fill="currentColor" fillOpacity="0.3" />
    <path d="M6 24l5-8h26l5 8" />
    <rect x="17" y="5" width="14" height="13" rx="2" fill="currentColor" fillOpacity="0.5" />
    <path d="M19 32h10" />
  </svg>
)

/** 기억상자 탈출: 열린 상자에서 날아오르는 모양 */
export const EscapeIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M6 28h36v11a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" fill="currentColor" fillOpacity="0.2" />
    <path d="M6 28l-3-7 12 3M42 28l3-7-12 3" />
    <path d="M24 24V6M17 13l7-7 7 7" strokeWidth="3.5" />
  </svg>
)

export const SpeakerIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M8 19h7l10-8v26l-10-8H8z" fill="currentColor" fillOpacity="0.2" />
    <path d="M32 18a9 9 0 0 1 0 12M36 12a17 17 0 0 1 0 24" />
  </svg>
)

export const FlipIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M10 18a15 15 0 0 1 27-5M38 30a15 15 0 0 1-27 5" />
    <path d="M38 5v9h-9M10 43v-9h9" />
  </svg>
)

export const SwipeIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M40 24H10M20 13L9 24l11 11" />
  </svg>
)

export const TapIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true">
    <circle cx="24" cy="24" r="6" fill="currentColor" fillOpacity="0.3" />
    <circle cx="24" cy="24" r="13" strokeDasharray="4 5" />
    <circle cx="24" cy="24" r="20" strokeDasharray="3 7" strokeOpacity="0.5" />
  </svg>
)

export const CloseIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true"><path d="M12 12l24 24M36 12L12 36" /></svg>
)

export const TrophyIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M14 6h20v12a10 10 0 0 1-20 0z" fill="currentColor" fillOpacity="0.3" />
    <path d="M14 10H6c0 8 4 11 9 11M34 10h8c0 8-4 11-9 11M24 28v8M15 42h18M18 36h12" />
  </svg>
)

export const FlameIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M24 4c2 8 12 12 12 24a12 12 0 0 1-24 0c0-5 3-8 5-11 1 4 3 5 4 5 0-7 1-13 3-18z" fill="currentColor" fillOpacity="0.3" />
  </svg>
)

// 하단 메뉴
export const HomeIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true"><path d="M7 22L24 7l17 15v17a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" /><path d="M19 41V28h10v13" /></svg>
)
export const GameIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true">
    <rect x="4" y="14" width="40" height="22" rx="11" /><path d="M14 21v8M10 25h8" /><circle cx="32" cy="22" r="1.5" fill="currentColor" /><circle cx="36" cy="28" r="1.5" fill="currentColor" />
  </svg>
)
export const ChartIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true"><path d="M8 40V24M20 40V8M32 40V18M44 40H4" /></svg>
)
export const GearIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden="true">
    <circle cx="24" cy="24" r="6" />
    <path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4" />
  </svg>
)
