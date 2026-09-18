import { boc } from './boc'
import { cbsl } from './cbsl'
import { combank } from './combank'
import { dfcc } from './dfcc'
import { ndb } from './ndb'
import { nsb } from './nsb'
import { ntb } from './ntb'
import { peoples } from './peoples'
import { sampath } from './sampath'
import { seylan } from './seylan'
import type { Src } from './types'

export const SRCS: Src[] = [sampath, seylan, boc, combank, peoples, ndb, ntb, nsb, dfcc, cbsl]

export const byId = new Map(SRCS.map((s) => [s.id, s]))

export * from './types'
