import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createConductor, gesturePoint, solveArm } from './conductor-model'
import { poseAt } from './conducting-patterns'

describe('articulated conductor', () => {
  it.each([1, 2, 3, 4])('keeps the baton at the musical target throughout the %i-beat pattern', beats => {
    const conductor = createConductor()
    const shoulder = new THREE.Vector3(-0.47, 2.57, 0)
    for (let step = 0; step <= beats * 40; step++) {
      const time = step / 40
      const pose = poseAt(beats, Math.floor(time), time % 1)
      const expected = gesturePoint(pose)
      expect(conductor.update(pose, 0, true).distanceTo(expected)).toBeLessThan(0.000001)
      const direction = new THREE.Vector3(-0.20 + pose.x * 0.15, 1, 0.12).normalize()
      const wrist = expected.clone().addScaledVector(direction, -0.64)
      const solution = solveArm(shoulder, wrist, -1)
      expect(solution.elbow.distanceTo(shoulder)).toBeCloseTo(0.72, 8)
      expect(solution.elbow.distanceTo(solution.wrist)).toBeCloseTo(0.72, 8)
      expect(solution.elbow.x).toBeLessThan(shoulder.x)
    }
  })
  it('clamps unreachable targets without stretching either bone', () => {
    const shoulder = new THREE.Vector3(0.47, 2.57, 0)
    const { elbow, wrist } = solveArm(shoulder, new THREE.Vector3(20, 2, 2), 1)
    expect(elbow.distanceTo(shoulder)).toBeCloseTo(0.72, 8)
    expect(elbow.distanceTo(wrist)).toBeCloseTo(0.72, 8)
    expect(wrist.distanceTo(shoulder)).toBeLessThan(1.44)
  })
})
