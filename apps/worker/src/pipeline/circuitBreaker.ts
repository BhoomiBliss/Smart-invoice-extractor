export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF-OPEN';

export class CircuitBreaker<T> {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private totalCount = 0;
  private lastStateChange: number = Date.now();
  
  private readonly thresholdPercent = 50; // trip if failed rate > 50%
  private readonly timeoutMs = 30000;      // 30s timeout on action execution
  private readonly cooldownMs = 60000;     // 60s cooldown to transition back

  constructor(
    private readonly action: (...args: any[]) => Promise<T>,
    private readonly name: string
  ) {}

  public async execute(...args: any[]): Promise<T> {
    this.checkCooldown();

    if (this.state === 'OPEN') {
      console.warn(`[CIRCUIT-BREAKER] Circuit is OPEN for ${this.name}. Rejecting request.`);
      throw new Error(`Circuit breaker is OPEN for ${this.name}`);
    }

    console.log(`[CIRCUIT-BREAKER] Executing action for ${this.name} (State: ${this.state})`);

    // Race action execution with 30s timeout guard
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout of ${this.timeoutMs}ms exceeded`)), this.timeoutMs)
    );

    try {
      const result = await Promise.race([
        this.action(...args),
        timeoutPromise
      ]);

      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure(err);
      throw err;
    }
  }

  private checkCooldown() {
    if (this.state === 'OPEN' && Date.now() - this.lastStateChange > this.cooldownMs) {
      this.state = 'HALF-OPEN';
      this.lastStateChange = Date.now();
      console.log(`[CIRCUIT-BREAKER] Transitioning ${this.name} to HALF-OPEN for recovery checks.`);
    }
  }

  private onSuccess() {
    this.totalCount++;
    if (this.state === 'HALF-OPEN') {
      this.successCount++;
      // If we succeed in half-open state, we close the circuit immediately
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.successCount = 0;
      this.totalCount = 0;
      this.lastStateChange = Date.now();
      console.log(`[CIRCUIT-BREAKER] Circuit CLOSED successfully for ${this.name} after recovery check.`);
    }
  }

  private onFailure(err: any) {
    this.failureCount++;
    this.totalCount++;
    console.warn(`[CIRCUIT-BREAKER] Action failed for ${this.name}: ${err.message} (Failures: ${this.failureCount}/${this.totalCount})`);

    if (this.state === 'CLOSED') {
      const errorRate = (this.failureCount / this.totalCount) * 100;
      if (this.totalCount >= 2 && errorRate >= this.thresholdPercent) {
        this.trip();
      }
    } else if (this.state === 'HALF-OPEN') {
      // In half-open state, any failure trips the circuit open again
      this.trip();
    }
  }

  private trip() {
    this.state = 'OPEN';
    this.lastStateChange = Date.now();
    console.error(`[CIRCUIT-BREAKER] 🚨 Circuit TRIPPED OPEN for ${this.name}! Cooldown initialized.`);
  }

  public getState(): CircuitState {
    return this.state;
  }
}
