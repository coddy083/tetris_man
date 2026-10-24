export class ArcadeAudio {
  enabled = true;
  private context: AudioContext | null = null;
  private beat = -1;
  unlock() { if (!this.context) this.context = new AudioContext(); void this.context.resume().catch(() => {}); }
  tone(freq: number, duration = .08, type: OscillatorType = 'square', volume = .025, delay = 0) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain(), start = ctx.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(volume, start); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(start); osc.stop(start + duration);
  }
  play(name: string, count = 1) {
    if (name === 'move') this.tone(110,.025,'triangle',.018);
    if (name === 'rotate') { this.tone(440,.04); this.tone(660,.05,'square',.02,.035); }
    if (name === 'hold') { this.tone(330,.05); this.tone(520,.07,'triangle',.04,.05); }
    if (name === 'drop') { this.tone(100,.12,'sawtooth',.035); this.tone(55,.18,'triangle',.08,.03); }
    if (name === 'lock') this.tone(170,.035,'triangle',.025);
    if (name === 'clear' || name === 'level' || name === 'start') {
      const notes = count >= 4 ? [523,659,784,1047,1319] : [523,659,784,1047];
      notes.forEach((n,i) => this.tone(n,.12,'square',.035,i * .075));
    }
    if (name === 'gameover') [440,392,330,220,110].forEach((n,i) => this.tone(n,.25,'triangle',.07,i*.15));
  }
  music(elapsed: number) {
    const beat = Math.floor(elapsed / 230);
    if (beat === this.beat) return;
    this.beat = beat;
    const melody = [659,0,784,0,880,784,659,523,587,0,659,0,523,494,440,0,523,0,659,784,880,0,784,659,587,659,523,0,494,0,440,0];
    const note = melody[beat % melody.length];
    if (note) this.tone(note,.12,'triangle',.018);
    if (beat % 2 === 0) this.tone([110,131,147,98][Math.floor(beat / 8) % 4],.13,'triangle',.035);
  }
}
