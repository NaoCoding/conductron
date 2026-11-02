import { describe, expect, it } from 'vitest'
import { parseMusicXML, positionAt } from './musicxml-parser'

const score = (time = '3', denominator = '4', bpm = '90') => `<?xml version="1.0"?><score-partwise><work><work-title>Test</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>2</divisions><time><beats>${time}</beats><beat-type>${denominator}</beat-type></time></attributes><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type></direction><note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration></note><note><rest/><duration>2</duration></note></measure><measure number="2"><note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note></measure></part></score-partwise>`

describe('MusicXML timeline', () => {
  it('reads meter, tempo, measures, and note durations', () => {
    const timeline = parseMusicXML(score())
    expect(timeline.title).toBe('Test')
    expect(timeline.initialTimeSignature).toEqual({ numerator: 3, denominator: 4 })
    expect(timeline.initialTempo.quarterBpm).toBe(90)
    expect(timeline.measures).toHaveLength(2)
    expect(timeline.notes[0]).toMatchObject({ onset: 0, duration: 1 })
    expect(timeline.durationSeconds).toBe(4)
  })
  it('converts eighth note tempo to quarter-note clock', () => {
    const xml = score().replace('<beat-unit>quarter</beat-unit><per-minute>90</per-minute>', '<beat-unit>eighth</beat-unit><per-minute>180</per-minute>')
    expect(parseMusicXML(xml).initialTempo.quarterBpm).toBe(90)
  })
  it('reads a sound tempo when a metronome mark is absent', () => {
    const xml = score().replace(/<direction>[\s\S]*?<\/direction>/, '<direction><sound tempo="112"/></direction>')
    expect(parseMusicXML(xml).initialTempo.quarterBpm).toBe(112)
  })
  it('applies tempo changes to later measures on the same timeline', () => {
    const xml = score().replace('<measure number="2">', '<measure number="2"><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>60</per-minute></metronome></direction-type></direction>')
    const timeline = parseMusicXML(xml)
    expect(timeline.durationSeconds).toBe(5)
    expect(positionAt(timeline, 2)).toMatchObject({ measureIndex: 1, bpm: 60, beatIndex: 0 })
  })
  it('uses a clear default tempo and rejects malformed input', () => {
    const timeline = parseMusicXML(score().replace(/<direction>[\s\S]*?<\/direction>/, ''))
    expect(timeline.initialTempo.isDefault).toBe(true)
    expect(() => parseMusicXML('<not-musicxml/>')).toThrow()
  })
  it('maps elapsed seconds to measure and fractional beat', () => {
    const timeline = parseMusicXML(score())
    expect(positionAt(timeline, 0.5)).toMatchObject({ measureIndex: 0, beatIndex: 0, beatProgress: 0.75 })
    expect(positionAt(timeline, 2.1)).toMatchObject({ measureIndex: 1, beatIndex: 0 })
  })
})
