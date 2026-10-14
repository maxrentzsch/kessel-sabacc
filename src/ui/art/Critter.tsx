import { useId } from 'react'
import type { Animal } from '../../career/story'
import { tx } from '../../i18n'

export const ANIMAL_NAME: Record<Animal, string> = {
  vulptex: tx`Vulptex-Welpe`,
  lothcat: tx`Loth-Kätzchen`,
  convor: tx`Convor-Küken`,
}

/** a voice for each animal, as a hue for the sound of a line (see sfx.voice) */
export const ANIMAL_VOICE: Record<Animal, number> = { vulptex: 18, lothcat: 42, convor: 180 }

interface Props {
  animal: Animal
  /** width in pixels, or a CSS length */
  size?: number | string
  /** the convor hangs from a lamp; elsewhere it may simply stand */
  perch?: boolean
}

/**
 * The three animals of Tarsk, one of which comes along as Bix: a vulptex pup,
 * a Loth-cat kitten and a convor chick. Drawn on a 240 × 240 grid, standing
 * on the bottom edge, in the style of the portraits.
 */
export function Critter({ animal, size = 120, perch = true }: Props) {
  const u = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 240 240" width={size} height={size} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
      {animal === 'vulptex' && <Vulptex u={u} />}
      {animal === 'lothcat' && <LothCat u={u} />}
      {animal === 'convor' && <Convor u={u} perch={perch} />}
    </svg>
  )
}

function Vulptex({ u }: { u: string }) {
  return (
    <g>
      <defs>
      <radialGradient id={`${u}-fur`} cx="0.42" cy="0.28" r="0.9"><stop offset="0" stopColor="#fbf8f2" /><stop offset="0.6" stopColor="#e6e0d6" /><stop offset="1" stopColor="#b9b2a7" /></radialGradient>
      <radialGradient id={`${u}-belly`} cx="0.5" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e9e4dc" /></radialGradient>
      <radialGradient id={`${u}-iris`} cx="0.5" cy="0.62" r="0.6"><stop offset="0" stopColor="#ffb347" /><stop offset="0.55" stopColor="#e2672b" /><stop offset="1" stopColor="#7a2a14" /></radialGradient>
      <linearGradient id={`${u}-ear`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d98d78" /><stop offset="1" stopColor="#f0b7a4" /></linearGradient>
      </defs>
      <ellipse cx="116" cy="222" rx="70" ry="8" fill="#000" opacity="0.4" />

      {/* tail: bushy, crystals hanging from its underside */}
      <g>
      <path d="M150 200c34 6 64-8 72-38 4-18-4-32-18-30 6 28-14 48-54 52z" fill={`url(#${u}-fur)`} />
      <path d="M204 132c8-2 16 4 18 14 1 6 0 12-3 16-2-12-8-22-15-30z" fill="#fbf8f2" />
      <g><path d="M166 200l2 18 6-15z" fill="#c24a2c" /><path d="M168 218l6-15 3 2z" fill="#ef8a62" /></g>
      <g><path d="M182 194l4 17 5-15z" fill="#c24a2c" /><path d="M186 211l5-15 3 2z" fill="#ef8a62" /></g>
      <g><path d="M198 184l7 14 2-15z" fill="#c24a2c" /><path d="M205 198l2-15 3 1z" fill="#ef8a62" /></g>
      </g>

      {/* body */}
      <path d="M74 176c0-26 18-42 44-42s44 16 44 42c0 26-18 42-44 42s-44-16-44-42z" fill={`url(#${u}-fur)`} />
      {/* chest ruff */}
      <path d="M94 150l6 8 6-6 6 8 6-8 6 8 6-6 6 6c-4 26-16 46-30 46s-24-20-30-48z" fill={`url(#${u}-belly)`} />
      {/* crystal bristles on the back */}
      <g><path d="M86 148l-10-14 16 6z" fill="#c24a2c" /><path d="M76 134l16 6-2 4z" fill="#ef8a62" /></g>
      <g><path d="M138 142l8-16 2 18z" fill="#c24a2c" /><path d="M146 126l2 18-4 0z" fill="#ef8a62" /></g>
      <g><path d="M152 158l14-8-8 14z" fill="#c24a2c" /><path d="M166 150l-8 14-3-3z" fill="#ef8a62" /></g>
      {/* crystals hanging from the flanks */}
      <g><path d="M78 186l1 18 7-14z" fill="#c24a2c" /><path d="M79 204l7-14 2 3z" fill="#ef8a62" /></g>
      <g><path d="M158 186l-1 18-7-14z" fill="#c24a2c" /><path d="M157 204l-7-14-2 3z" fill="#ef8a62" /></g>
      {/* legs and paws */}
      <path d="M90 196c-2 10-2 18 2 22h18c2-6 0-14-2-22z" fill="#ece6dd" />
      <path d="M126 196c-2 8-4 16-2 22h18c4-4 4-12 2-22z" fill="#ece6dd" />
      <path d="M96 218v-4M101 218v-4M106 218v-4M130 218v-4M135 218v-4M140 218v-4" stroke="#b9b2a7" strokeWidth="1.300" strokeLinecap="round" />

      {/* ears: fox ears, broad at the base, tufted inside */}
      <path d="M74 108C62 86 58 60 64 38c22 10 38 30 44 54z" fill={`url(#${u}-fur)`} />
      <path d="M162 108c12-22 16-48 10-70-22 10-38 30-44 54z" fill={`url(#${u}-fur)`} />
      <path d="M77 98c-7-16-9-34-6-48 13 8 23 22 28 38z" fill={`url(#${u}-ear)`} />
      <path d="M159 98c7-16 9-34 6-48-13 8-23 22-28 38z" fill={`url(#${u}-ear)`} />
      <path d="M80 96c2-6 4-10 8-14M84 100c2-4 6-8 10-10M156 96c-2-6-4-10-8-14M152 100c-2-4-6-8-10-10" stroke="#fff" strokeWidth="1.800" strokeLinecap="round" opacity="0.9" />

      {/* head */}
      <path d="M70 116c0-28 22-46 48-46s48 18 48 46c0 14-6 24-14 32l-34 14-34-14c-8-8-14-18-14-32z" fill={`url(#${u}-fur)`} />
      {/* cheek fluff */}
      <path d="M70 124l-10 6 8 2-6 8 10-2-2 8 12-8z" fill="#f4efe7" />
      <path d="M166 124l10 6-8 2 6 8-10-2 2 8-12-8z" fill="#f4efe7" />
      {/* brow crystals, a little crown */}
      <g><path d="M104 74l2-14 6 12z" fill="#c24a2c" /><path d="M106 60l6 12-3 1z" fill="#ef8a62" /></g>
      <g><path d="M118 72l4-16 4 16z" fill="#c24a2c" /><path d="M122 56l4 16-3 0z" fill="#ef8a62" /></g>
      <g><path d="M130 74l6-12 2 14z" fill="#c24a2c" /><path d="M136 62l2 14-3-1z" fill="#ef8a62" /></g>
      {/* cheek crystals hanging down */}
      <g><path d="M74 138l-5 18 10-12z" fill="#c24a2c" /><path d="M69 156l10-12 1 3z" fill="#ef8a62" /></g>
      <g><path d="M162 138l5 18-10-12z" fill="#c24a2c" /><path d="M167 156l-10-12-1 3z" fill="#ef8a62" /></g>

      {/* muzzle: pointed, white */}
      <path d="M98 136c4 14 12 24 20 26 8-2 16-12 20-26-10 5-30 5-40 0z" fill={`url(#${u}-belly)`} />
      {/* eyes */}
      <g>
      <ellipse cx="98" cy="114" rx="13" ry="15" fill="#1c100c" />
      <ellipse cx="98" cy="116" rx="10" ry="12" fill={`url(#${u}-iris)`} />
      <ellipse cx="98" cy="117" rx="5" ry="7" fill="#1c100c" />
      <circle cx="103" cy="108" r="4.500" fill="#fff" />
      <circle cx="93" cy="122" r="1.800" fill="#fff" opacity="0.8" />
      <path d="M86 102c6-4 14-4 20 0" stroke="#a9a196" strokeWidth="1.600" fill="none" strokeLinecap="round" />
      </g>
      <g>
      <ellipse cx="138" cy="114" rx="13" ry="15" fill="#1c100c" />
      <ellipse cx="138" cy="116" rx="10" ry="12" fill={`url(#${u}-iris)`} />
      <ellipse cx="138" cy="117" rx="5" ry="7" fill="#1c100c" />
      <circle cx="143" cy="108" r="4.500" fill="#fff" />
      <circle cx="133" cy="122" r="1.800" fill="#fff" opacity="0.8" />
      <path d="M130 102c6-4 14-4 20 0" stroke="#a9a196" strokeWidth="1.600" fill="none" strokeLinecap="round" />
      </g>
      {/* nose with a shine, mouth */}
      <path d="M112 146c0-3 3-4 6-4s6 1 6 4-3 6-6 6-6-3-6-6z" fill="#2a1712" />
      <ellipse cx="116" cy="145" rx="2" ry="1.200" fill="#fff" opacity="0.7" />
      <path d="M118 152v3c-2 3-6 3-8 1M118 155c2 3 6 3 8 1" fill="none" stroke="#2a1712" strokeWidth="1.500" strokeLinecap="round" />
      <ellipse cx="86" cy="134" rx="6" ry="3.500" fill="#e0574c" opacity="0.28" />
      <ellipse cx="150" cy="134" rx="6" ry="3.500" fill="#e0574c" opacity="0.28" />
    </g>
  )
}

function LothCat({ u }: { u: string }) {
  return (
    <g>
      <defs>
      <clipPath id={`${u}-tailclip`}><path d="M150 206c28-2 44-22 40-46-2-14 6-22 16-16 10 30-8 70-56 70z" /></clipPath>
      <radialGradient id={`${u}-fur`} cx="0.42" cy="0.28" r="0.9"><stop offset="0" stopColor="#fff1d6" /><stop offset="0.6" stopColor="#f0d29e" /><stop offset="1" stopColor="#c99a5c" /></radialGradient>
      <radialGradient id={`${u}-cream`} cx="0.5" cy="0.3" r="0.8"><stop offset="0" stopColor="#fffaf0" /><stop offset="1" stopColor="#f5e3c3" /></radialGradient>
      <radialGradient id={`${u}-iris`} cx="0.5" cy="0.6" r="0.6"><stop offset="0" stopColor="#fff2a0" /><stop offset="0.6" stopColor="#f2c12e" /><stop offset="1" stopColor="#b7841a" /></radialGradient>
      <linearGradient id={`${u}-ear`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e59a86" /><stop offset="1" stopColor="#f6c3b0" /></linearGradient>
      </defs>
      <ellipse cx="116" cy="222" rx="66" ry="8" fill="#000" opacity="0.4" />

      {/* tail curling up, ringed */}
      <path d="M150 206c28-2 44-22 40-46-2-14 6-22 16-16 10 30-8 70-56 70z" fill={`url(#${u}-fur)`} />
      <path d="M176 168l30-4M178 182l30-2M170 196l28 2" stroke="#b07a3c" strokeWidth="5" fill="none" clipPath={`url(#${u}-tailclip)`} />
      <path d="M196 146c6-6 12-4 12 2-4-2-8-1-10 2z" fill="#8e5f2c" />

      {/* body */}
      <path d="M76 178c0-26 18-40 42-40s42 14 42 40c0 24-16 40-42 40s-42-16-42-40z" fill={`url(#${u}-fur)`} />
      {/* back stripes */}
      <path d="M84 160c4 4 6 10 6 16M152 160c-4 4-6 10-6 16" stroke="#b07a3c" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* fluffy chest */}
      <path d="M98 150l5 7 5-5 5 7 5-7 5 7 5-5 5 6c-2 24-14 42-20 42s-18-18-20-44z" fill={`url(#${u}-cream)`} />
      {/* paws with toe beans peeking */}
      <path d="M92 196c-2 10-2 18 2 22h18c2-6 0-14-2-22z" fill="#f6dfb8" />
      <path d="M126 196c-2 8-4 16-2 22h18c4-4 4-12 2-22z" fill="#f6dfb8" />
      <path d="M98 218v-4M103 218v-4M108 218v-4M130 218v-4M135 218v-4M140 218v-4" stroke="#c99a5c" strokeWidth="1.300" strokeLinecap="round" />

      {/* tall ears with tufts at the tips, like a lynx */}
      <path d="M74 112C56 92 46 62 50 32c26 12 44 36 50 66z" fill={`url(#${u}-fur)`} />
      <path d="M162 112c18-20 28-50 24-80-26 12-44 36-50 66z" fill={`url(#${u}-fur)`} />
      <path d="M77 102C64 86 58 64 59 46c16 10 28 26 33 44z" fill={`url(#${u}-ear)`} />
      <path d="M159 102c13-16 19-38 18-56-16 10-28 26-33 44z" fill={`url(#${u}-ear)`} />
      <path d="M50 32l-6-14 10 8 0-10 4 12z" fill="#8e5f2c" />
      <path d="M186 32l6-14-10 8 0-10-4 12z" fill="#8e5f2c" />
      <path d="M80 98c3-6 6-10 10-12M84 104c3-4 7-7 11-8M156 98c-3-6-6-10-10-12M152 104c-3-4-7-7-11-8" stroke="#fffaf0" strokeWidth="1.800" strokeLinecap="round" />

      {/* head: round, with cheek ruffs */}
      <path d="M72 120c0-28 20-46 46-46s46 18 46 46c0 22-18 40-46 40s-46-18-46-40z" fill={`url(#${u}-fur)`} />
      <path d="M74 128l-12 4 9 4-8 7 11 0-4 8 14-8z" fill="#f6dfb8" />
      <path d="M162 128l12 4-9 4 8 7-11 0 4 8-14-8z" fill="#f6dfb8" />
      {/* forehead markings */}
      <path d="M108 80c2 8 2 14 0 20M118 78v22M128 80c-2 8-2 14 0 20" stroke="#b07a3c" strokeWidth="3.600" strokeLinecap="round" fill="none" />
      {/* muzzle */}
      <path d="M100 138c0-8 8-12 18-12s18 4 18 12-8 16-18 16-18-8-18-16z" fill={`url(#${u}-cream)`} />

      {/* eyes: big and yellow */}
      <g>
      <ellipse cx="97" cy="118" rx="14" ry="15" fill="#2a1a10" />
      <ellipse cx="97" cy="119" rx="12" ry="13" fill={`url(#${u}-iris)`} />
      <ellipse cx="97" cy="120" rx="6.500" ry="10" fill="#1d1410" />
      <circle cx="102" cy="112" r="4.500" fill="#fff" />
      <circle cx="92" cy="125" r="1.800" fill="#fff" opacity="0.8" />
      </g>
      <g>
      <ellipse cx="139" cy="118" rx="14" ry="15" fill="#2a1a10" />
      <ellipse cx="139" cy="119" rx="12" ry="13" fill={`url(#${u}-iris)`} />
      <ellipse cx="139" cy="120" rx="6.500" ry="10" fill="#1d1410" />
      <circle cx="144" cy="112" r="4.500" fill="#fff" />
      <circle cx="134" cy="125" r="1.800" fill="#fff" opacity="0.8" />
      </g>
      {/* eye markings running to the cheeks */}
      <path d="M83 128c-4 4-8 6-12 6M153 128c4 4 8 6 12 6" stroke="#b07a3c" strokeWidth="2.600" strokeLinecap="round" fill="none" />

      {/* nose, mouth, whiskers */}
      <path d="M113 136c0-2 2-3 5-3s5 1 5 3-2 5-5 5-5-3-5-5z" fill="#d06a5e" />
      <ellipse cx="116" cy="135" rx="1.800" ry="1" fill="#fff" opacity="0.7" />
      <path d="M118 141v3c-2 3-6 3-8 1M118 144c2 3 6 3 8 1" fill="none" stroke="#5a3a28" strokeWidth="1.500" strokeLinecap="round" />
      <path d="M100 140h-24M100 144l-22 6M136 140h24M136 144l22 6" stroke="#fffaf0" strokeWidth="1.300" strokeLinecap="round" opacity="0.95" />
      <ellipse cx="86" cy="136" rx="6" ry="3.500" fill="#e0574c" opacity="0.28" />
      <ellipse cx="150" cy="136" rx="6" ry="3.500" fill="#e0574c" opacity="0.28" />
    </g>
  )
}

function Convor({ u, perch }: { u: string; perch: boolean }) {
  return (
    <g>
      <defs>
      <radialGradient id={`${u}-feath`} cx="0.45" cy="0.28" r="0.9"><stop offset="0" stopColor="#d8cfbf" /><stop offset="0.6" stopColor="#ada290" /><stop offset="1" stopColor="#7e7465" /></radialGradient>
      <radialGradient id={`${u}-disc`} cx="0.5" cy="0.45" r="0.65"><stop offset="0" stopColor="#f6f1e6" /><stop offset="1" stopColor="#ddd3c1" /></radialGradient>
      <radialGradient id={`${u}-iris`} cx="0.5" cy="0.6" r="0.6"><stop offset="0" stopColor="#bff7f1" /><stop offset="0.55" stopColor="#4fb8b0" /><stop offset="1" stopColor="#1e5652" /></radialGradient>
      <radialGradient id={`${u}-bulb`}><stop offset="0" stopColor="#fff1c8" /><stop offset="0.4" stopColor="#ffd38a" stopOpacity="0.7" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${u}-lamp`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#56656b" /><stop offset="1" stopColor="#2c373b" /></linearGradient>
      </defs>
      {perch && (
        <g>
          {/* Kessk's lamp: a bar with a warm bulb */}
          <rect x="24" y="20" width="192" height="9" rx="4" fill={`url(#${u}-lamp)`} />
          <ellipse cx="60" cy="40" rx="30" ry="16" fill={`url(#${u}-bulb)`} />
          <ellipse cx="60" cy="35" rx="7" ry="4" fill="#fff4d6" />
          <path d="M48 29h24l-4 5H52z" fill="#3d4a4f" />
        </g>
      )}
      {/* the tail, feathered at the root, coiled round the bar */}
      <path d="M146 150c22-10 30-44 22-80-4-20-2-36 8-44 8-6 18-2 16 6-6-4-12 0-12 10 0 22 10 50 4 78-6 22-20 32-38 36z" fill="#8a8070" />
      <circle cx="183" cy="24.500" r="8" fill="none" stroke="#8a8070" strokeWidth="7" />

      {/* body */}
      <ellipse cx="116" cy="164" rx="50" ry="54" fill={`url(#${u}-feath)`} />
      {/* breast: rows of small scalloped feathers */}
      <ellipse cx="116" cy="178" rx="32" ry="36" fill={`url(#${u}-disc)`} />
      <path d="M94 160q5 6 10 0q5 6 10 0q5 6 10 0q5 6 10 0M90 174q5 6 10 0q5 6 10 0q5 6 10 0q5 6 10 0q5 6 10 0M94 188q5 6 10 0q5 6 10 0q5 6 10 0q5 6 10 0M100 202q5 6 10 0q5 6 10 0q5 6 10 0" fill="none" stroke="#b8ad98" strokeWidth="1.800" strokeLinecap="round" />
      {/* wings, layered feathers */}
      <path d="M68 144c-14 20-14 48 4 66 2-24 4-46-4-66z" fill="#7a7062" />
      <path d="M70 168c-4 10-4 22 0 34M76 160c-2 12-2 26 2 40" stroke="#5f574b" strokeWidth="1.600" strokeLinecap="round" fill="none" />
      <path d="M164 144c14 20 14 48-4 66-2-24-4-46 4-66z" fill="#7a7062" />
      <path d="M162 168c4 10 4 22 0 34M156 160c2 12 2 26-2 40" stroke="#5f574b" strokeWidth="1.600" strokeLinecap="round" fill="none" />
      {/* feet */}
      <path d="M100 212c-2 6-6 8-8 10M104 214v8M108 212c2 6 6 8 8 10M126 212c-2 6-6 8-8 10M130 214v8M134 212c2 6 6 8 8 10" stroke="#e0a64a" strokeWidth="3" strokeLinecap="round" />

      {/* ear tufts */}
      <path d="M80 92c-8-14-8-30 0-40 6 8 12 22 14 34z" fill="#8a8070" />
      <path d="M152 92c8-14 8-30 0-40-6 8-12 22-14 34z" fill="#8a8070" />
      <path d="M82 62c2 8 4 14 8 20M150 62c-2 8-4 14-8 20" stroke="#6d6456" strokeWidth="1.600" strokeLinecap="round" />
      {/* head */}
      <ellipse cx="116" cy="112" rx="46" ry="40" fill={`url(#${u}-feath)`} />
      {/* facial disc with fine radial feathers */}
      <path d="M74 114c0-22 20-32 42-18 22-14 42-4 42 18 0 22-20 32-42 22-22 10-42 0-42-22z" fill={`url(#${u}-disc)`} />
      <path d="M80 104l-4-4M78 116h-5M82 128l-4 4M152 104l4-4M154 116h5M150 128l4 4" stroke="#c8bda9" strokeWidth="1.500" strokeLinecap="round" />
      <path d="M116 96v8" stroke="#c8bda9" strokeWidth="1.500" strokeLinecap="round" />
      {/* eyes: huge, sea-green */}
      <g>
      <circle cx="98" cy="114" r="15" fill="#1d1a16" />
      <circle cx="98" cy="115" r="12" fill={`url(#${u}-iris)`} />
      <circle cx="98" cy="116" r="6.500" fill="#141210" />
      <circle cx="103" cy="108" r="4.800" fill="#fff" />
      <circle cx="93" cy="121" r="2" fill="#fff" opacity="0.8" />
      </g>
      <g>
      <circle cx="134" cy="114" r="15" fill="#1d1a16" />
      <circle cx="134" cy="115" r="12" fill={`url(#${u}-iris)`} />
      <circle cx="134" cy="116" r="6.500" fill="#141210" />
      <circle cx="139" cy="108" r="4.800" fill="#fff" />
      <circle cx="129" cy="121" r="2" fill="#fff" opacity="0.8" />
      </g>
      {/* beak */}
      <path d="M110 126c2-2 10-2 12 0l-6 11z" fill="#e8ad52" />
      <path d="M110 126c2-2 10-2 12 0" stroke="#c98a30" strokeWidth="1.200" fill="none" />
      <ellipse cx="84" cy="130" rx="6" ry="3.500" fill="#e0574c" opacity="0.22" />
      <ellipse cx="148" cy="130" rx="6" ry="3.500" fill="#e0574c" opacity="0.22" />
    </g>
  )
}
