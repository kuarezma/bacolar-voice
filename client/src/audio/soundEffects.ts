class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private ringOscillator: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private isRinging: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Odaya Giriş Sesi (Futuristik İki Ton)
  public playJoinSound() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Sound effect failed:', e);
    }
  }

  // Odadan Ayrılma Sesi
  public playLeaveSound() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.14);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Sound effect failed:', e);
    }
  }

  // Mikrofon Kapatma (Mute)
  public playMuteSound() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.setValueAtTime(350, now + 0.06);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  // Mikrofon Açma (Unmute)
  public playUnmuteSound() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.setValueAtTime(600, now + 0.06);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  // Bas-Konuş Başlangıç Çanı (PTT Start Walkie-Talkie beep)
  public playPttStartSound() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(1600, now + 0.03);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }

  // Bas-Konuş Bitiş Sesi (PTT Release)
  public playPttStopSound() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.setValueAtTime(600, now + 0.03);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  // Mesaj / Bildirim Sesi
  public playMessageSound() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  // Gelen Arama Çalma Melodisi
  public startIncomingCallTone() {
    if (this.isRinging) return;
    this.isRinging = true;

    const ring = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.setValueAtTime(0.06, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);

        setTimeout(() => {
          if (this.isRinging) ring();
        }, 3000);
      } catch (e) {}
    };

    ring();
  }

  public stopIncomingCallTone() {
    this.isRinging = false;
  }
}

export const sounds = new SoundEffectsEngine();
