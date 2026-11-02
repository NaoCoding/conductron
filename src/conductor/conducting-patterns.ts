export interface GesturePose { x: number; y: number; left: number; right: number }

const patterns: Record<number, GesturePose[]> = {
  2: [{ x: 0, y: -0.48, left: -0.35, right: 0.35 }, { x: 0, y: 0.32, left: 0.2, right: -0.2 }],
  3: [{ x: 0, y: -0.48, left: -0.35, right: 0.35 }, { x: 0.48, y: 0.08, left: 0.25, right: -0.15 }, { x: 0, y: 0.32, left: 0.2, right: -0.2 }],
  4: [{ x: 0, y: -0.48, left: -0.35, right: 0.35 }, { x: -0.42, y: 0.08, left: 0.15, right: -0.3 }, { x: 0.42, y: 0.08, left: -0.15, right: 0.3 }, { x: 0, y: 0.32, left: 0.2, right: -0.2 }],
}

export function patternFor(numerator: number): GesturePose[] {
  return patterns[numerator] ?? patterns[4]!
}

export function poseAt(numerator: number, beatIndex: number, progress: number): GesturePose {
  const pattern = patternFor(numerator)
  const from = pattern[beatIndex % pattern.length]!
  const to = pattern[(beatIndex + 1) % pattern.length]!
  const eased = (1 - Math.cos(Math.max(0, Math.min(1, progress)) * Math.PI)) / 2
  return { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased, left: from.left + (to.left - from.left) * eased, right: from.right + (to.right - from.right) * eased }
}
