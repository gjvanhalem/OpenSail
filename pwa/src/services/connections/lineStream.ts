/**
 * Shared by the network connections (WebSocket, native TCP): turning chunks of
 * a byte stream into lines, and the waits between reconnect attempts.
 */

const COMPLETE_SENTENCE = /^[$!].*\*[0-9A-Fa-f]{2}$/;

/**
 * Splits text that arrives in chunks into lines. A chunk may hold several
 * lines, or part of one; a part is kept until the rest arrives.
 */
export class LineSplitter {
  private buffer = '';

  /** The complete, non-empty lines this chunk finishes, trimmed */
  push(text: string): string[] {
    this.buffer += text;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? '';
    // A chunk without a line end is one complete sentence, as some gateways send them
    if (this.buffer && COMPLETE_SENTENCE.test(this.buffer.trim())) {
      lines.push(this.buffer);
      this.buffer = '';
    }
    return lines.map((line) => line.trim()).filter(Boolean);
  }

  /** Forget a partial line, e.g. when the link drops */
  reset(): void {
    this.buffer = '';
  }
}

/** Waits between reconnect attempts: the first is initialMs, each next one twice as long, up to maxMs */
export class Backoff {
  private readonly initialMs: number;
  private readonly maxMs: number;
  private delay: number;

  constructor(initialMs: number, maxMs: number) {
    this.initialMs = initialMs;
    this.maxMs = maxMs;
    this.delay = initialMs;
  }

  /** The wait before the next attempt */
  next(): number {
    const delay = this.delay;
    this.delay = Math.min(this.delay * 2, this.maxMs);
    return delay;
  }

  /** Back to the shortest wait, after a link came up */
  reset(): void {
    this.delay = this.initialMs;
  }
}

export function reconnectMessage(delayMs: number): string {
  return `Connection lost, reconnecting in ${Math.round(delayMs / 1000)} s`;
}
