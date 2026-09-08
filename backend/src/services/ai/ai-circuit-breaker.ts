import { CircuitBreakerState } from './types';
import { SafeLogger } from './safe-logger';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  cooldownPeriodMs?: number;
}

export class AICircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount: number = 0;
  private readonly failureThreshold: number;
  private readonly cooldownPeriodMs: number;
  private lastFailureTime: number = 0;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.cooldownPeriodMs = options.cooldownPeriodMs || 30000; // 30 seconds
  }

  public getState(): CircuitBreakerState {
    this.updateState();
    return this.state;
  }

  public canExecute(): boolean {
    this.updateState();
    return this.state !== 'OPEN';
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN' || this.failureCount > 0) {
      SafeLogger.logSafeInfo(`Circuit breaker restored to CLOSED state.`);
    }
    this.state = 'CLOSED';
    this.failureCount = 0;
  }

  public recordFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      SafeLogger.logSafeAI({
        provider: 'groq',
        result: 'error',
        message: `Circuit breaker tripped back to OPEN after test failed.`,
      });
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      SafeLogger.logSafeAI({
        provider: 'groq',
        result: 'error',
        fallback: 'local',
        message: `Circuit breaker OPENED after ${this.failureCount} consecutive failures. Temporarily skipping Groq to avoid latency.`,
      });
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  private updateState(): void {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.cooldownPeriodMs) {
        this.state = 'HALF_OPEN';
        SafeLogger.logSafeInfo(`Circuit breaker entered HALF_OPEN state. Testing single Groq request.`);
      }
    }
  }
}

export const aiCircuitBreaker = new AICircuitBreaker();
