import type { MusicalPosition, MusicalTimeline } from '../music/types'
import { positionAt } from '../music/musicxml-parser'

export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'finished'

export class PlaybackEngine {
  private context: AudioContext | undefined
  private anchor = 0
  private pausedAt = 0
  state: PlaybackState = 'stopped'

  constructor(private timeline: MusicalTimeline, private createAudioContext: () => AudioContext = () => new AudioContext()) {}

  setTimeline(timeline: MusicalTimeline): void { this.pause(); this.timeline = timeline; this.reset() }
  async play(): Promise<void> {
    if (this.state === 'playing') return
    this.context ??= this.createAudioContext()
    if (this.context.state === 'suspended') await this.context.resume()
    if (this.state === 'finished' || this.state === 'stopped') this.pausedAt = 0
    this.anchor = this.context.currentTime - this.pausedAt
    this.state = 'playing'
  }
  pause(): void {
    if (this.state !== 'playing') return
    this.pausedAt = this.elapsed()
    this.state = 'paused'
  }
  reset(): void { this.pausedAt = 0; this.state = 'stopped' }
  position(): MusicalPosition {
    const time = this.state === 'playing' ? this.elapsed() : this.pausedAt
    if (this.state === 'playing' && time >= this.timeline.durationSeconds) {
      this.pausedAt = this.timeline.durationSeconds
      this.state = 'finished'
      return positionAt(this.timeline, this.pausedAt)
    }
    return positionAt(this.timeline, time)
  }
  dispose(): void { this.pause(); void this.context?.close(); this.context = undefined }
  private elapsed(): number { return Math.max(0, (this.context?.currentTime ?? 0) - this.anchor) }
}
