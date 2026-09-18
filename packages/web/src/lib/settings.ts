import { WINS, type Kind, type Mode, type WinId } from '@fxtrack/shared'

export const SETTINGS_KEY = 'fxtrack.settings'
export const SETTINGS_VERSION = 1

export interface Settings {
  mode: Mode
  kind: Kind
  win: WinId
  amount: number
  picks: string[]
}

const DEFAULTS: Settings = {
  mode: 'buy',
  kind: 'tt',
  win: '3m',
  amount: 1000,
  picks: [],
}

type Bag = Record<string, unknown>
type Migration = (value: Bag) => Bag

const MIGRATIONS: Record<number, Migration> = {
  0: (value) => ({ ...value, version: 1 }),
}

function isMode(value: unknown): value is Mode {
  return value === 'buy' || value === 'sell'
}

function isKind(value: unknown): value is Kind {
  return value === 'tt' || value === 'note' || value === 'card'
}

function isWin(value: unknown): value is WinId {
  return WINS.some((w) => w.id === value)
}

function copy(value: Settings): Settings {
  return { ...value, picks: [...value.picks] }
}

function normalize(value: Bag): Settings {
  const mode: Mode = isMode(value.mode) ? value.mode : DEFAULTS.mode
  const kind: Kind =
    mode === 'sell' ? 'tt' : isKind(value.kind) ? value.kind : DEFAULTS.kind
  const amount =
    typeof value.amount === 'number' && Number.isFinite(value.amount) && value.amount >= 0
      ? value.amount
      : DEFAULTS.amount
  const picks = Array.isArray(value.picks)
    ? [...new Set(value.picks.filter((v): v is string => typeof v === 'string'))]
    : DEFAULTS.picks

  return {
    mode,
    kind,
    win: isWin(value.win) ? value.win : DEFAULTS.win,
    amount,
    picks,
  }
}

export function loadSettings(): {
  value: Settings
  migrated: boolean
  supported: boolean
  found: boolean
} {
  if (typeof window === 'undefined') {
    return { value: copy(DEFAULTS), migrated: false, supported: true, found: false }
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { value: copy(DEFAULTS), migrated: false, supported: true, found: false }

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: copy(DEFAULTS), migrated: false, supported: true, found: false }
    }

    const input = parsed as Bag
    const version = Number.isInteger(input.version) ? Number(input.version) : 0
    if (version > SETTINGS_VERSION) {
      return { value: copy(DEFAULTS), migrated: false, supported: false, found: true }
    }

    let value = input
    for (let v = version; v < SETTINGS_VERSION; v++) {
      const migrate = MIGRATIONS[v]
      if (!migrate) return { value: copy(DEFAULTS), migrated: false, supported: true, found: true }
      value = migrate(value)
    }

    return {
      value: normalize(value),
      migrated: version !== SETTINGS_VERSION,
      supported: true,
      found: true,
    }
  } catch {
    return { value: copy(DEFAULTS), migrated: false, supported: true, found: false }
  }
}

export function saveSettings(value: Settings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ version: SETTINGS_VERSION, ...value, picks: [...value.picks] }),
    )
  } catch {
    return
  }
}
