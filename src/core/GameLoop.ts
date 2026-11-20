/**
 * Game Loop basato su requestAnimationFrame con delta time.
 * La velocità del gioco non dipende dagli FPS: ogni update riceve i secondi
 * trascorsi dall'ultimo frame (limitati a maxDeltaTimeSeconds).
 */
export class GameLoop {
  private animationFrameId: number | null = null;
  private lastTimestampMs: number | null = null;

  constructor(
    private readonly updateCallback: (deltaTimeSeconds: number) => void,
    private readonly renderCallback: () => void,
    private readonly maxDeltaTimeSeconds: number
  ) {}

  public start(): void {
    if (this.animationFrameId !== null) {
      return;
    }
    this.lastTimestampMs = null;
    this.animationFrameId = requestAnimationFrame(this.runFrame);
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public isRunning(): boolean {
    return this.animationFrameId !== null;
  }

  /** Calcola il delta time (secondi), azzerato al primo frame e limitato in alto. */
  public static calculateDeltaTime(
    previousTimestampMs: number | null,
    currentTimestampMs: number,
    maxDeltaTimeSeconds: number
  ): number {
    if (previousTimestampMs === null) {
      return 0;
    }
    const elapsedSeconds = (currentTimestampMs - previousTimestampMs) / 1000;
    return Math.max(0, Math.min(elapsedSeconds, maxDeltaTimeSeconds));
  }

  private readonly runFrame = (timestampMs: number): void => {
    const deltaTimeSeconds = GameLoop.calculateDeltaTime(
      this.lastTimestampMs,
      timestampMs,
      this.maxDeltaTimeSeconds
    );
    this.lastTimestampMs = timestampMs;
    this.updateCallback(deltaTimeSeconds);
    this.renderCallback();
    this.animationFrameId = requestAnimationFrame(this.runFrame);
  };
}
