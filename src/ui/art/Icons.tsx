import type { ReactNode } from 'react'

const PATHS = {
  back: <path d="M14.500 5 8 12l6.500 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  lock: (
    <>
      <rect x="5.500" y="10.500" width="13" height="9.500" rx="2" />
      <path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500" />
    </>
  ),
  check: <path d="m5 12.500 4.500 4.500L19 7.500" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M5.300 18.700l2.100-2.100M16.600 7.400l2.100-2.100" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.500C6.500 4.500 9.500 4.500 12 6c2.500-1.500 5.500-1.500 8-.5v13c-2.500-1-5.500-1-8 .500-2.500-1.500-5.500-1.500-8-.500z" />
      <path d="M12 6v13" />
    </>
  ),
  play: <path d="M8 5.500v13l10.500-6.500z" />,
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.500c0 3 1.500 4.500 3.500 4.500M16 6h3.500c0 3-1.500 4.500-3.500 4.500M12 13v4M8.500 20h7M10 17h4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.500" r="3.500" />
      <path d="M5 20c.500-4 3-6 7-6s6.500 2 7 6" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.500" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="15" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.500-6.500 10-6.500S22 12 22 12s-3.500 6.500-10 6.500S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 17.500h6M10 20.500h4M8.200 14.500C6.800 13.400 6 11.800 6 10a6 6 0 0 1 12 0c0 1.800-.800 3.400-2.200 4.500-.500.400-.800 1-.800 1.600V17.500H9v-1.400c0-.600-.300-1.200-.800-1.600z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.500" />
      <path d="M12 11v5.500M12 7.500v.500" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.800"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  )
}
