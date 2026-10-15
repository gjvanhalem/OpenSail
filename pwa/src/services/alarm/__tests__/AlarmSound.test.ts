import { describe, it, expect, vi } from 'vitest';
import { AlarmSound } from '../AlarmSound';

interface FakeOscillator {
  type: string;
  frequency: { value: number };
  started: boolean;
  stopped: boolean;
}

/** Just enough of Web Audio to see which nodes the alarm starts and stops */
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = 'suspended';
  onstatechange: (() => void) | null = null;
  destination = {};
  oscillators: FakeOscillator[] = [];
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  resume = vi.fn(async () => {
    this.state = 'running';
    this.onstatechange?.();
  });
  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: { value: 0 },
      started: false,
      stopped: false,
      connect: (node: unknown) => node,
      start() {
        osc.started = true;
      },
      stop() {
        osc.stopped = true;
      },
    };
    this.oscillators.push(osc);
    return osc;
  }
  createGain() {
    return { gain: { value: 1 }, connect: (node: unknown) => node, disconnect: vi.fn() };
  }
  createBuffer() {
    return {};
  }
  createBufferSource() {
    return { buffer: null, connect: vi.fn(), start: vi.fn() };
  }
}

const make = () => {
  FakeAudioContext.instances = [];
  return new AlarmSound(FakeAudioContext as unknown as new () => AudioContext);
};

describe('AlarmSound', () => {
  it('plays a pattern on the audio thread and stops it', async () => {
    const sound = make();
    const states: string[] = [];
    sound.subscribe((s) => states.push(`${s.pattern}/${s.audio}`));
    sound.play('alarm');
    const context = FakeAudioContext.instances[0];
    expect(context.resume).toHaveBeenCalled();
    expect(context.oscillators.every((o) => o.started)).toBe(true);
    expect(context.oscillators.map((o) => o.type)).toEqual(['square', 'square']);
    await Promise.resolve();
    expect(sound.getState()).toEqual({ pattern: 'alarm', audio: 'running' });

    sound.stop();
    expect(context.oscillators.every((o) => o.stopped)).toBe(true);
    expect(sound.getState().pattern).toBeNull();
    expect(states).toContain('alarm/running');
  });

  it('switches pattern without stacking sounds, and replaying is a no-op', () => {
    const sound = make();
    sound.play('warning');
    sound.play('warning');
    const context = FakeAudioContext.instances[0];
    expect(context.oscillators).toHaveLength(2);
    sound.play('alarm');
    expect(context.oscillators).toHaveLength(4);
    expect(context.oscillators.slice(0, 2).every((o) => o.stopped)).toBe(true);
    expect(context.oscillators.slice(2).some((o) => o.stopped)).toBe(false);
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it('unlock creates and resumes the context ahead of an alarm', () => {
    const sound = make();
    expect(sound.getState().audio).toBe('not-started');
    sound.unlock();
    expect(FakeAudioContext.instances[0].resume).toHaveBeenCalled();
  });

  it('reports when Web Audio is unavailable, and still tracks the pattern', () => {
    const sound = new AlarmSound(null);
    sound.play('alarm');
    expect(sound.getState()).toEqual({ pattern: 'alarm', audio: 'unavailable' });
  });
});
