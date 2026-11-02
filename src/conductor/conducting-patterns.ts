import type { MusicalPosition, TimeSignature } from '../music/types'

/** Coordinates are seen by the musicians: the conductor's right is screen-left. */
export interface GesturePose { x: number; y: number }
export type BeatAccent = 'strong' | 'secondary' | 'weak'
export interface ConductingMeter { beats: number; unitsPerBeat: number; supported: boolean; compound: boolean }

const patterns: Record<number, GesturePose[]> = {
  1: [{ x: 0, y: -0.48 }],
  2: [{ x: 0, y: -0.48 }, { x: 0, y: 0.66 }],
  3: [{ x: 0, y: -0.48 }, { x: -0.78, y: -0.08 }, { x: 0, y: 0.66 }],
  4: [{ x: 0, y: -0.48 }, { x: 0.62, y: -0.08 }, { x: -0.78, y: -0.08 }, { x: 0, y: 0.66 }],
}

export function conductingMeter(meter: TimeSignature): ConductingMeter {
  const compound = [8, 16].includes(meter.denominator) && [6, 9, 12].includes(meter.numerator)
  return { beats: compound ? meter.numerator / 3 : meter.numerator, unitsPerBeat: compound ? 3 : 1, supported: compound || [1, 2, 3, 4].includes(meter.numerator), compound }
}

export function conductingPosition(position: MusicalPosition): { beatIndex: number; progress: number } {
  const { unitsPerBeat } = conductingMeter(position.timeSignature)
  return { beatIndex: Math.floor(position.beatIndex / unitsPerBeat), progress: ((position.beatIndex % unitsPerBeat) + position.beatProgress) / unitsPerBeat }
}

export function accentFor(beats: number, beatIndex: number): BeatAccent {
  return beatIndex === 0 ? 'strong' : beats === 4 && beatIndex === 2 ? 'secondary' : 'weak'
}

export function directionFor(beats: number, beatIndex: number): string {
  if (beatIndex === 0) return 'Down'
  if (beatIndex === beats - 1) return 'Up'
  return beats === 4 && beatIndex === 1 ? 'In' : 'Out'
}

export function patternFor(beats: number): readonly GesturePose[] {
  // Unspecified additive grouping must not silently display a four-beat pattern.
  return patterns[beats] ?? Array.from({ length: Math.max(1, Math.floor(beats)) }, () => ({ x: 0, y: -0.48 }))
}

/** Every integer beat is an ictus. Lift immediately, then arrive at the next ictus exactly on time. */
export function poseAt(beats: number, beatIndex: number, progress: number): GesturePose {
  const pattern = patternFor(beats)
  const index = ((beatIndex % pattern.length) + pattern.length) % pattern.length
  const from = pattern[index]!
  const to = pattern[(index + 1) % pattern.length]!
  const t = Math.max(0, Math.min(1, progress))
  const u = 1 - t
  const upbeat = pattern.length > 1 && (index + 1) % pattern.length === pattern.length - 1
  const lift = index === 0 ? 0.68 : 0.4
  const c1 = { x: from.x, y: from.y + (index === pattern.length - 1 && pattern.length > 1 ? 0.12 : lift) }
  const c2 = { x: to.x, y: to.y + (upbeat ? -0.38 : 0.5) }
  return {
    x: u ** 3 * from.x + 3 * u ** 2 * t * c1.x + 3 * u * t ** 2 * c2.x + t ** 3 * to.x,
    y: u ** 3 * from.y + 3 * u ** 2 * t * c1.y + 3 * u * t ** 2 * c2.y + t ** 3 * to.y,
  }
}
