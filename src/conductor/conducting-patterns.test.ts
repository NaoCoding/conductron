import { describe, expect, it } from 'vitest'
import { accentFor, conductingMeter, conductingPosition, directionFor, patternFor, poseAt } from './conducting-patterns'
import type { MusicalPosition } from '../music/types'

const position: MusicalPosition = { elapsedSeconds: 0, measureIndex: 0, measureNumber: '1', beatIndex: 0, beatProgress: 0, bpm: 100, timeSignature: { numerator: 4, denominator: 4 }, quarterPosition: 0 }

describe('conducting patterns', () => {
  it.each([1, 2, 3, 4])('lands exactly on every ictus and closes the %i-beat bar without a jump', beats => {
    const pattern = patternFor(beats)
    expect(pattern).toHaveLength(beats)
    for (let index = 0; index < beats; index++) {
      expect(poseAt(beats, index, 0)).toEqual(pattern[index])
      expect(poseAt(beats, index, 1)).toEqual(pattern[(index + 1) % beats])
      const before = poseAt(beats, index, 0.99999), after = poseAt(beats, index + 1, 0.00001)
      expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(0.001)
    }
  })
  it.each([2, 3, 4])('arrives downward and rebounds immediately on the first of %i beats', beats => {
    const downbeat = poseAt(beats, 0, 0)
    expect(poseAt(beats, beats - 1, 0.98).y).toBeGreaterThan(downbeat.y)
    expect(poseAt(beats, 0, 0.02).y).toBeGreaterThan(downbeat.y)
  })
  it('shows in/out from the musicians’ viewpoint, with the right hand on screen-left', () => {
    expect(patternFor(3)[1]!.x).toBeLessThan(patternFor(3)[0]!.x)
    expect(patternFor(4)[1]!.x).toBeGreaterThan(patternFor(4)[0]!.x)
    expect(patternFor(4)[2]!.x).toBeLessThan(patternFor(4)[0]!.x)
    expect([0, 1, 2, 3].map(index => directionFor(4, index))).toEqual(['Down', 'In', 'Out', 'Up'])
  })
  it('distinguishes the secondary accent in quadruple meter', () => {
    expect([0, 1, 2, 3].map(index => accentFor(4, index))).toEqual(['strong', 'weak', 'secondary', 'weak'])
    expect([0, 1, 2].map(index => accentFor(3, index))).toEqual(['strong', 'weak', 'weak'])
  })
  it.each([[6, 2], [9, 3], [12, 4]])('groups %i/8 into %i large beats while preserving subdivision progress', (numerator, beats) => {
    const timeSignature = { numerator, denominator: 8 }
    expect(conductingMeter(timeSignature)).toEqual({ beats, unitsPerBeat: 3, compound: true, supported: true })
    const secondGroup = conductingPosition({ ...position, timeSignature, beatIndex: 3, beatProgress: 0 })
    expect(secondGroup).toEqual({ beatIndex: 1, progress: 0 })
    const subdivision = conductingPosition({ ...position, timeSignature, beatIndex: 4, beatProgress: 0.5 })
    expect(subdivision).toEqual({ beatIndex: 1, progress: 0.5 })
    const before = conductingPosition({ ...position, timeSignature, beatIndex: 2, beatProgress: 0.99999 })
    const a = poseAt(beats, before.beatIndex, before.progress), b = poseAt(beats, secondGroup.beatIndex, 0)
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.0001)
  })
  it('does not substitute a four-beat gesture for an unspecified additive meter', () => {
    expect(conductingMeter({ numerator: 7, denominator: 8 }).supported).toBe(false)
    expect(patternFor(7)).toHaveLength(7)
    expect(patternFor(7).every(point => point.x === 0)).toBe(true)
    expect(conductingMeter({ numerator: 3, denominator: 8 })).toEqual({ beats: 3, unitsPerBeat: 1, compound: false, supported: true })
  })
})
