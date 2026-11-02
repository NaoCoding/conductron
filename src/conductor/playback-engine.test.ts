import { describe, expect, it } from 'vitest'
import { PlaybackEngine } from './playback-engine'
import { parseMusicXML } from '../music/musicxml-parser'

const timeline = parseMusicXML('<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list><part id="P1"><measure><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>120</per-minute></metronome></direction-type></direction><note><rest/><duration>4</duration></note></measure></part></score-partwise>')

describe('PlaybackEngine state', () => {
  it('supports play, pause, resume, and reset without losing elapsed score time', async () => {
    let now = 0
    const fake = { get currentTime() { return now }, state: 'running', resume: async () => {}, close: async () => {} } as unknown as AudioContext
    const engine = new PlaybackEngine(timeline, () => fake)
    expect(engine.state).toBe('stopped')
    expect(engine.position().beatIndex).toBe(0)
    await engine.play()
    now = 0.75
    expect(engine.state).toBe('playing')
    expect(engine.position().beatIndex).toBe(1)
    engine.pause()
    expect(engine.state).toBe('paused')
    now = 2
    await engine.play()
    now = 2.25
    expect(engine.position().beatIndex).toBe(2)
    engine.reset()
    expect(engine.state).toBe('stopped')
    expect(engine.position().elapsedSeconds).toBe(0)
  })
  it('uses parsed tempo for the score duration', () => { expect(timeline.durationSeconds).toBe(2) })
})
