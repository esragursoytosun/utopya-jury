'use client'

class AudioManager {
  private ctx: AudioContext | null = null

  private get audioCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  private tone(
    freq: number,
    startTime: number,
    duration: number,
    volume = 0.15,
    type: OscillatorType = 'sine'
  ) {
    const ctx = this.audioCtx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime + startTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration)
    osc.start(ctx.currentTime + startTime)
    osc.stop(ctx.currentTime + startTime + duration)
  }

  voteReceived() {
    this.tone(880, 0, 0.12, 0.08)
    this.tone(1100, 0.1, 0.1, 0.06)
  }

  allVotesIn() {
    // Mutlu bir akord
    const ctx = this.audioCtx
    ;[523, 659, 784, 1047].forEach((freq, i) => {
      this.tone(freq, i * 0.08, 1.2, 0.12)
    })
    void ctx
  }

  countTick() {
    this.tone(1200, 0, 0.04, 0.04, 'square')
  }

  scoreReveal() {
    // Yükselen süpürme + final akoru
    const ctx = this.audioCtx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 1.8)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2)
    osc.start()
    osc.stop(ctx.currentTime + 2)

    // Final akoru
    ;[523, 659, 784].forEach((freq, i) => {
      this.tone(freq, 1.8 + i * 0.1, 1.5, 0.15)
    })
  }

  podiumReveal(place: 1 | 2 | 3) {
    const sequences: Record<number, number[]> = {
      3: [349, 440, 523],
      2: [440, 554, 659, 784],
      1: [523, 659, 784, 1047, 1319],
    }
    const notes = sequences[place]
    notes.forEach((freq, i) => {
      this.tone(freq, i * 0.18, 1.0, place === 1 ? 0.2 : 0.15)
    })
    if (place === 1) {
      // Konfeti sesi — çok hızlı üst notalar
      ;[2093, 2349, 2637].forEach((freq, i) => {
        this.tone(freq, 0.9 + i * 0.1, 0.3, 0.06)
      })
    }
  }

  fanfare() {
    const melody = [523, 523, 523, 659, 523, 659, 784]
    const timings = [0, 0.18, 0.36, 0.54, 0.72, 0.9, 1.08]
    melody.forEach((freq, i) => {
      this.tone(freq, timings[i], 0.2, 0.18)
    })
  }
}

export const audioManager = typeof window !== 'undefined' ? new AudioManager() : null
