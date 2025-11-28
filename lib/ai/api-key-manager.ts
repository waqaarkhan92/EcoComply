/**
 * OpenAI API Key Manager
 * Handles API key management, validation, rotation, and fallback
 */

interface APIKeyConfig {
  primary: string;
  fallbacks: string[];
  currentKey: string;
  rotationEnabled: boolean;
}

export class APIKeyManager {
  private config: APIKeyConfig;
  private lastValidation: Map<string, { valid: boolean; timestamp: number }> = new Map();
  private readonly VALIDATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    const primary = process.env.OPENAI_API_KEY;
    if (!primary) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.config = {
      primary,
      fallbacks: [
        process.env.OPENAI_API_KEY_FALLBACK_1,
        process.env.OPENAI_API_KEY_FALLBACK_2,
      ].filter(Boolean) as string[],
      currentKey: primary,
      rotationEnabled: true,
    };
  }

  /**
   * Validate API key by making a test API call
   */
  async validateKey(key: string): Promise<boolean> {
    // Check cache first
    const cached = this.lastValidation.get(key);
    if (cached && Date.now() - cached.timestamp < this.VALIDATION_CACHE_TTL) {
      return cached.valid;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
      });

      const valid = response.ok;
      this.lastValidation.set(key, {
        valid,
        timestamp: Date.now(),
      });

      return valid;
    } catch (error) {
      console.error('API key validation failed:', error);
      this.lastValidation.set(key, {
        valid: false,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  /**
   * Get current API key
   */
  getCurrentKey(): string {
    return this.config.currentKey;
  }

  /**
   * Get fallback key if current key fails
   */
  async getFallbackKey(): Promise<string | null> {
    for (const key of this.config.fallbacks) {
      const isValid = await this.validateKey(key);
      if (isValid) {
        return key;
      }
    }
    return null;
  }

  /**
   * Rotate to next fallback key
   */
  async rotateKey(): Promise<void> {
    if (this.config.fallbacks.length === 0) {
      throw new Error('No fallback keys available for rotation');
    }

    // Rotate to next fallback key
    const nextKey = this.config.fallbacks[0];
    const isValid = await this.validateKey(nextKey);

    if (!isValid) {
      throw new Error('Fallback key validation failed');
    }

    // Move current key to fallbacks (for 7-day grace period)
    this.config.fallbacks = [
      ...this.config.fallbacks.slice(1),
      this.config.currentKey,
    ];
    this.config.currentKey = nextKey;
  }

  /**
   * Get a valid API key (current or fallback)
   */
  async getValidKey(): Promise<string> {
    // Check current key first
    const currentValid = await this.validateKey(this.config.currentKey);
    if (currentValid) {
      return this.config.currentKey;
    }

    // Try fallback keys
    const fallbackKey = await this.getFallbackKey();
    if (fallbackKey) {
      // Switch to fallback temporarily
      this.config.currentKey = fallbackKey;
      return fallbackKey;
    }

    throw new Error('No valid API keys available');
  }

  /**
   * Validate all keys on startup
   */
  async validateAllKeys(): Promise<{ primary: boolean; fallbacks: boolean[] }> {
    const primary = await this.validateKey(this.config.primary);
    const fallbacks = await Promise.all(
      this.config.fallbacks.map((key) => this.validateKey(key))
    );

    return { primary, fallbacks };
  }

  /**
   * Initialize and validate API keys
   */
  async initialize(): Promise<void> {
    const validation = await this.validateAllKeys();

    if (!validation.primary && !validation.fallbacks.some((v) => v)) {
      console.error('CRITICAL: All OpenAI API keys are invalid');
      // In production, you might want to send an alert here
      throw new Error('No valid OpenAI API keys available');
    }

    if (!validation.primary) {
      console.warn('WARNING: Primary OpenAI API key is invalid, using fallback');
      const fallbackKey = await this.getFallbackKey();
      if (fallbackKey) {
        this.config.currentKey = fallbackKey;
      }
    }

    console.log('OpenAI API keys validated successfully');
  }
}

// Singleton instance
let apiKeyManager: APIKeyManager | null = null;

export function getAPIKeyManager(): APIKeyManager {
  if (!apiKeyManager) {
    apiKeyManager = new APIKeyManager();
  }
  return apiKeyManager;
}

