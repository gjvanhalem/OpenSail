/**
 * Alarm sounds made with Web Audio oscillators, so they need no audio files
 * and work offline. Each pattern runs entirely on the audio thread (an LFO
 * modulates the tone), so it keeps sounding without JavaScript timers, which
 * browsers throttle in background tabs.
 *
 * Browsers only start audio after a user gesture. `unlock()` is called on the
 * first tap or key press anywhere in the app, so an alarm raised later (anchor
 * drag, with nobody touching the screen) can still sound.
 */

/** 'alarm': two-tone siren for safety alarms; 'warning': a beep for instrument alerts */
export type AlarmPattern = 'alarm' | 'warning';

export interface AlarmSoundState {
  /** The pattern that should be sounding, or null for silence */
  pattern: AlarmPattern | null;
  /** The AudioContext state ('running' means it can be heard), or 'unavailable' */
  audio: AudioContextState | 'unavailable' | 'not-started';
}

type Listener = (state: AlarmSoundState) => void;

interface Voice {
  stop(): void;
}

type AudioContextConstructor = new () => AudioContext;

function audioContextClass(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Siren: a square wave switching between 660 and 1100 Hz twice a second */
function startAlarm(context: AudioContext, output: AudioNode): Voice {
  const tone = context.createOscillator();
  tone.type = 'square';
  tone.frequency.value = 880;

  const lfo = context.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 2;
  const depth = context.createGain();
  depth.gain.value = 220;
  lfo.connect(depth).connect(tone.frequency);

  const level = context.createGain();
  level.gain.value = 0.35;
  tone.connect(level).connect(output);

  tone.start();
  lfo.start();
  return {
    stop: () => {
      tone.stop();
      lfo.stop();
      level.disconnect();
    },
  };
}

/** Beep: 1 kHz, half a second on and half a second off */
function startWarning(context: AudioContext, output: AudioNode): Voice {
  const tone = context.createOscillator();
  tone.type = 'sine';
  tone.frequency.value = 1000;

  // Gain = 0.25 + 0.25 × square(1 Hz): switches between 0.5 and 0
  const gate = context.createGain();
  gate.gain.value = 0.25;
  const lfo = context.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 1;
  const depth = context.createGain();
  depth.gain.value = 0.25;
  lfo.connect(depth).connect(gate.gain);

  tone.connect(gate).connect(output);
  tone.start();
  lfo.start();
  return {
    stop: () => {
      tone.stop();
      lfo.stop();
      gate.disconnect();
    },
  };
}

export class AlarmSound {
  private context: AudioContext | null = null;
  private voice: Voice | null = null;
  private pattern: AlarmPattern | null = null;
  private listeners = new Set<Listener>();
  private readonly Context: AudioContextConstructor | null;

  constructor(Context: AudioContextConstructor | null = audioContextClass()) {
    this.Context = Context;
  }

  getState(): AlarmSoundState {
    return {
      pattern: this.pattern,
      audio: !this.Context ? 'unavailable' : (this.context?.state ?? 'not-started'),
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Allow sound from now on. Call from a user gesture: creates or resumes the
   * AudioContext and plays a silent buffer, which iOS Safari requires.
   */
  unlock(): void {
    const context = this.ensureContext();
    if (!context) return;
    if (context.state !== 'running') {
      context.resume().catch(() => undefined);
    }
    try {
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start();
    } catch {
      // Not needed outside iOS; ignore
    }
  }

  /** Sound `pattern` until `stop()` or another pattern; playing the current pattern again is a no-op */
  play(pattern: AlarmPattern): void {
    if (this.pattern === pattern && this.voice) return;
    this.stopVoice();
    this.pattern = pattern;
    const context = this.ensureContext();
    if (context) {
      // Without an earlier gesture this stays suspended until the next tap (see unlock)
      if (context.state !== 'running') context.resume().catch(() => undefined);
      try {
        this.voice =
          pattern === 'alarm'
            ? startAlarm(context, context.destination)
            : startWarning(context, context.destination);
      } catch (error) {
        console.error('Alarm sound failed:', error);
      }
    }
    this.notify();
  }

  stop(): void {
    if (this.pattern === null) return;
    this.stopVoice();
    this.pattern = null;
    this.notify();
  }

  private stopVoice() {
    try {
      this.voice?.stop();
    } catch {
      // Already stopped
    }
    this.voice = null;
  }

  private ensureContext(): AudioContext | null {
    if (this.context || !this.Context) return this.context;
    try {
      this.context = new this.Context();
      this.context.onstatechange = () => this.notify();
    } catch (error) {
      console.error('Web Audio unavailable:', error);
      this.context = null;
    }
    return this.context;
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}

/** The app's one alarm sound */
export const alarmSound = new AlarmSound();
