import type { ReactNode } from 'react'
import type { TokenId } from '../../engine'

const dot = (cx: number, cy: number, r = 1.4) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />

const ICONS: Record<TokenId, ReactNode> = {
  freeDraw: (
    <>
      <rect x="6.5" y="3.5" width="11" height="16" rx="2" />
      <path d="M12 8.5v6M9 11.5h6" />
    </>
  ),
  refund: (
    <>
      <path d="M8 6 4.5 9.5 8 13" />
      <path d="M4.5 9.5H14a5 5 0 0 1 0 10h-3" />
      {dot(16, 5)}
      {dot(20, 5)}
    </>
  ),
  extraRefund: (
    <>
      <path d="M8 6 4.5 9.5 8 13" />
      <path d="M4.5 9.5H14a5 5 0 0 1 0 10h-3" />
      {dot(13, 4.6)}
      {dot(16.8, 4.6)}
      {dot(20.6, 4.6)}
    </>
  ),
  generalTariff: (
    <>
      <path d="M5 5v10M2.5 12.5 5 15l2.5-2.5M12 5v10M9.500 12.500 12 15l2.5-2.5M19 5v10M16.500 12.500 19 15l2.5-2.5" />
      <path d="M3 19.500h18" />
    </>
  ),
  targetTariff: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v9M8.500 12.500 12 16l3.500-3.500" />
    </>
  ),
  embargo: (
    <>
      <circle cx="12" cy="12" r="8.500" />
      <path d="M6 6l12 12" />
    </>
  ),
  markdown: (
    <>
      <circle cx="12" cy="9" r="5.500" />
      {dot(12, 9, 1.8)}
      <path d="M7 18.500 12 22l5-3.500" />
    </>
  ),
  immunity: (
    <>
      <path d="M12 3 4.500 6v5.500c0 4.500 3 8 7.500 9.500 4.500-1.500 7.500-5 7.500-9.500V6z" />
      <path d="m8.500 12 2.500 2.500 4.500-5" />
    </>
  ),
  generalAudit: (
    <>
      <path d="M2 12s3.500-6.500 10-6.500S22 12 22 12s-3.500 6.500-10 6.500S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  targetAudit: (
    <>
      <circle cx="12" cy="12" r="6.500" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3.500M12 18.500V22M2 12h3.500M18.500 12H22" />
    </>
  ),
  majorFraud: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.500" />
      {dot(8.5, 8)}
      {dot(8.5, 12)}
      {dot(8.5, 16)}
      {dot(15.5, 8)}
      {dot(15.5, 12)}
      {dot(15.5, 16)}
    </>
  ),
  embezzlement: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M3 3l5 5M21 3l-5 5M3 21l5-5M21 21l-5-5" />
      <path d="M4.500 8H8V4.500M19.500 8H16V4.500M4.500 16H8v3.500M19.500 16H16v3.500" />
    </>
  ),
  cookTheBooks: (
    <>
      <path d="M8 20V4M4.500 7.500 8 4l3.500 3.500" />
      <path d="M16 4v16M12.500 16.500 16 20l3.500-3.500" />
    </>
  ),
  exhaustion: (
    <>
      <path d="M20 12a8 8 0 0 1-14.500 4.600M4 12a8 8 0 0 1 14.500-4.600" />
      <path d="M18.500 3.500v4h-4M5.500 20.500v-4h4" />
    </>
  ),
  directTransaction: (
    <>
      <path d="M4 8h15M15.500 4.500 19 8l-3.500 3.500" />
      <path d="M20 16H5M8.500 12.500 5 16l3.500 3.500" />
    </>
  ),
  primeSabacc: (
    <path d="m12 2.500 2.800 6 6.500.800-4.800 4.500 1.300 6.500L12 17l-5.800 3.300 1.300-6.500L2.700 9.300l6.500-.800z" />
  ),
}

export function TokenIcon({ token, size = 24 }: { token: TokenId; size?: number | string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[token]}
    </svg>
  )
}
