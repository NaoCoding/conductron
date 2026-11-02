import { describe, expect, it } from 'vitest'
import { patternFor, poseAt } from './conducting-patterns'

describe('conducting patterns', () => {
  it.each([[2, 2], [3, 3], [4, 4]])('selects %i beat gestures', (meter, count) => { expect(patternFor(meter)).toHaveLength(count) })
  it('marks the first beat with a down gesture and interpolates smoothly', () => {
    expect(patternFor(3)[0]?.y).toBeLessThan(0)
    const first = poseAt(4, 0, 0.49), second = poseAt(4, 0, 0.51)
    expect(Math.abs(first.x - second.x)).toBeLessThan(0.05)
  })
})
