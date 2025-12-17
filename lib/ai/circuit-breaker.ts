/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when external services (like OpenAI) are down
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are immediately rejected
 * - HALF_OPEN: Testing if service has recovered
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close the circuit */
  resetTimeoutMs: number;
  /** Number of successful requests needed to close the circuit from half-open */
  successThreshold: number;
  /** Optional name for logging */
  name?: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
  successThreshold: 2,
  name: 'default',
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number = 0;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if request should be allowed
   */
  canRequest(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      // Check if enough time has passed to try again
      if (Date.now() >= this.nextAttemptTime) {
        this.transitionTo('HALF_OPEN');
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow limited requests to test
    return true;
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.totalRequests++;
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(error?: Error): void {
    this.totalRequests++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open state opens the circuit again
      this.transitionTo('OPEN');
      return;
    }

    if (this.state === 'CLOSED') {
      this.failures++;
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canRequest()) {
      const waitTime = Math.ceil((this.nextAttemptTime - Date.now()) / 1000);
      throw new CircuitOpenError(
        `Circuit breaker is OPEN for ${this.config.name}. Service unavailable. Retry in ${waitTime}s`,
        waitTime
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error as Error);
      throw error;
    }
  }

  /**
   * Get current circuit state and stats
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    // Check if we should auto-transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.transitionTo('HALF_OPEN');
    }
    return this.state;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.transitionTo('CLOSED');
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
  }

  /**
   * Force the circuit open (useful for maintenance)
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;

    switch (newState) {
      case 'CLOSED':
        this.failures = 0;
        this.successes = 0;
        console.log(`🟢 Circuit breaker [${this.config.name}]: CLOSED (recovered)`);
        break;

      case 'OPEN':
        this.nextAttemptTime = Date.now() + this.config.resetTimeoutMs;
        this.successes = 0;
        console.warn(
          `🔴 Circuit breaker [${this.config.name}]: OPEN after ${this.failures} failures. ` +
            `Will retry in ${this.config.resetTimeoutMs / 1000}s`
        );
        break;

      case 'HALF_OPEN':
        this.successes = 0;
        console.log(`🟡 Circuit breaker [${this.config.name}]: HALF_OPEN (testing recovery)`);
        break;
    }
  }
}

/**
 * Custom error for circuit breaker open state
 */
export class CircuitOpenError extends Error {
  public readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'CircuitOpenError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Singleton instances for different services
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a specific service
 */
export function getCircuitBreaker(
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(
      serviceName,
      new CircuitBreaker({ ...config, name: serviceName })
    );
  }
  return circuitBreakers.get(serviceName)!;
}

/**
 * Get all circuit breaker stats (useful for health checks)
 */
export function getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
  const stats: Record<string, CircuitBreakerStats> = {};
  for (const [name, breaker] of circuitBreakers) {
    stats[name] = breaker.getStats();
  }
  return stats;
}
