const DEFAULT_MAX_CATCH_UP_STEPS = 5;

export class FixedStepClock {
  private lastTimeMs: number | undefined;
  private accumulatorSeconds = 0;

  public constructor(
    private readonly stepSeconds: number,
    private readonly maxCatchUpSteps = DEFAULT_MAX_CATCH_UP_STEPS,
  ) {
    if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) {
      throw new Error("stepSeconds must be positive and finite");
    }

    if (!Number.isInteger(maxCatchUpSteps) || maxCatchUpSteps <= 0) {
      throw new Error("maxCatchUpSteps must be a positive integer");
    }
  }

  public reset(nowMs: number): void {
    this.lastTimeMs = nowMs;
    this.accumulatorSeconds = 0;
  }

  public advance(nowMs: number): number {
    if (!Number.isFinite(nowMs)) {
      return 0;
    }

    if (this.lastTimeMs === undefined) {
      this.reset(nowMs);
      return 0;
    }

    const elapsedSeconds = Math.max(0, (nowMs - this.lastTimeMs) / 1000);

    this.lastTimeMs = nowMs;
    this.accumulatorSeconds += Math.min(elapsedSeconds, this.stepSeconds * this.maxCatchUpSteps);

    const availableSteps = Math.floor((this.accumulatorSeconds + Number.EPSILON) / this.stepSeconds);
    const steps = Math.min(availableSteps, this.maxCatchUpSteps);

    this.accumulatorSeconds -= steps * this.stepSeconds;

    if (availableSteps > this.maxCatchUpSteps) {
      this.accumulatorSeconds %= this.stepSeconds;
    }

    return steps;
  }
}
