/** Descrizione di un'animazione: sequenza di sprite e tempo per frame. */
export interface AnimationDefinition {
  frameIds: string[];
  frameDurationMs: number;
  /** Durate diverse per ogni frame (ms). Se presente ha la precedenza su frameDurationMs. */
  frameDurationsMs?: number[];
  loop: boolean;
}

/** Riproduce un'animazione alla volta per una singola entità. */
export class AnimationPlayer {
  private currentName: string;
  private elapsedMs = 0;
  private frameIndex = 0;
  private finished = false;

  constructor(
    private readonly definitions: Record<string, AnimationDefinition>,
    initialAnimationName: string
  ) {
    this.currentName = initialAnimationName;
    this.getDefinition(initialAnimationName);
  }

  public get animationName(): string {
    return this.currentName;
  }

  public get isFinished(): boolean {
    return this.finished;
  }

  /** Id dello sprite da disegnare in questo momento. */
  public get currentFrameId(): string {
    const definition = this.getDefinition(this.currentName);
    return definition.frameIds[this.frameIndex] ?? definition.frameIds[0]!;
  }

  /** Avvia un'animazione; se è già quella in corso non la riavvia. */
  public play(animationName: string): void {
    if (animationName === this.currentName) {
      return;
    }
    this.getDefinition(animationName);
    this.currentName = animationName;
    this.elapsedMs = 0;
    this.frameIndex = 0;
    this.finished = false;
  }

  /** Riavvia l'animazione dall'inizio anche se è già quella in corso. */
  public restart(animationName: string): void {
    this.getDefinition(animationName);
    this.currentName = animationName;
    this.elapsedMs = 0;
    this.frameIndex = 0;
    this.finished = false;
  }

  public update(deltaTimeSeconds: number): void {
    const definition = this.getDefinition(this.currentName);
    if (this.finished) {
      return;
    }
    this.elapsedMs += deltaTimeSeconds * 1000;
    while (this.elapsedMs >= this.getFrameDuration(definition, this.frameIndex)) {
      this.elapsedMs -= this.getFrameDuration(definition, this.frameIndex);
      this.frameIndex++;
      if (this.frameIndex >= definition.frameIds.length) {
        if (definition.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = definition.frameIds.length - 1;
          this.finished = true;
          return;
        }
      }
    }
  }

  private getFrameDuration(definition: AnimationDefinition, frameIndex: number): number {
    return definition.frameDurationsMs?.[frameIndex] ?? definition.frameDurationMs;
  }

  private getDefinition(animationName: string): AnimationDefinition {
    const definition = this.definitions[animationName];
    if (definition === undefined || definition.frameIds.length === 0) {
      throw new Error(`Animazione non definita o vuota: ${animationName}`);
    }
    return definition;
  }
}
