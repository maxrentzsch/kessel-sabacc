import type { TokenId } from './types'

export type TokenTarget = 'none' | 'opponent' | 'standingOpponent'

export interface TokenDef {
  id: TokenId
  target: TokenTarget
  /** effect lasts until the next reveal and is shown as a table modifier */
  lasting: boolean
}

export const TOKENS: Record<TokenId, TokenDef> = {
  freeDraw: { id: 'freeDraw', target: 'none', lasting: false },
  refund: { id: 'refund', target: 'none', lasting: false },
  extraRefund: { id: 'extraRefund', target: 'none', lasting: false },
  generalTariff: { id: 'generalTariff', target: 'none', lasting: false },
  targetTariff: { id: 'targetTariff', target: 'opponent', lasting: false },
  embargo: { id: 'embargo', target: 'none', lasting: false },
  markdown: { id: 'markdown', target: 'none', lasting: true },
  immunity: { id: 'immunity', target: 'none', lasting: true },
  generalAudit: { id: 'generalAudit', target: 'none', lasting: false },
  targetAudit: { id: 'targetAudit', target: 'standingOpponent', lasting: false },
  majorFraud: { id: 'majorFraud', target: 'none', lasting: true },
  embezzlement: { id: 'embezzlement', target: 'none', lasting: false },
  cookTheBooks: { id: 'cookTheBooks', target: 'none', lasting: true },
  exhaustion: { id: 'exhaustion', target: 'opponent', lasting: false },
  directTransaction: { id: 'directTransaction', target: 'opponent', lasting: false },
  primeSabacc: { id: 'primeSabacc', target: 'none', lasting: true },
}

export const REFUND_AMOUNT = 2
export const EXTRA_REFUND_AMOUNT = 3
export const GENERAL_TARIFF_AMOUNT = 1
export const TARGET_TARIFF_AMOUNT = 2
export const GENERAL_AUDIT_AMOUNT = 2
export const TARGET_AUDIT_AMOUNT = 3
