/**
 * Extraction Cache Service
 * Redis-based caching for AI extraction results
 * Reference: docs/specs/43_Backend_AI_Integration.md Section 4.3
 */

import crypto from 'crypto';
import { getRedisConnection } from '../queue/queue-manager';
import { ExtractionResult } from './document-processor';

export interface CacheEntry {
  value: ExtractionResult;
  ttl: number;
  createdAt: number;
  cacheType: 'document' | 'rule_match' | 'segment';
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
}

export class ExtractionCache {
  private readonly CACHE_PREFIX = 'ai:extraction:';
  private readonly DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  private readonly RULE_MATCH_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly SEGMENT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };

  /**
   * Generate cache key for document hash
   */
  private generateDocumentKey(documentHash: string): string {
    return `${this.CACHE_PREFIX}doc:${documentHash}`;
  }

  /**
   * Generate cache key for rule library match
   */
  private generateRuleMatchKey(documentHash: string, patternHash: string): string {
    return `${this.CACHE_PREFIX}rule:${documentHash}:${patternHash}`;
  }

  /**
   * Generate cache key for document segment
   */
  private generateSegmentKey(segmentHash: string): string {
    return `${this.CACHE_PREFIX}segment:${segmentHash}`;
  }

  /**
   * Generate hash for document content
   */
  generateDocumentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate hash for segment content
   */
  generateSegmentHash(segment: string): string {
    return crypto.createHash('sha256').update(segment).digest('hex');
  }

  /**
   * Generate hash for rule pattern
   */
  generatePatternHash(pattern: string): string {
    return crypto.createHash('sha256').update(pattern).digest('hex');
  }

  /**
   * Get cached extraction result for document
   */
  async getDocumentCache(documentHash: string): Promise<ExtractionResult | null> {
    try {
      const redis = getRedisConnection();
      const key = this.generateDocumentKey(documentHash);
      const cached = await redis.get(key);

      if (!cached) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry = JSON.parse(cached);
      const age = Date.now() - entry.createdAt;

      // Check if expired
      if (age > entry.ttl) {
        await redis.del(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.value;
    } catch (error: any) {
      console.error('Error getting document cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cached extraction result for document
   */
  async setDocumentCache(
    documentHash: string,
    result: ExtractionResult,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const redis = getRedisConnection();
      const key = this.generateDocumentKey(documentHash);
      const entry: CacheEntry = {
        value: result,
        ttl,
        createdAt: Date.now(),
        cacheType: 'document',
      };

      // Store in Redis with TTL (convert to seconds)
      await redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(entry));
    } catch (error: any) {
      console.error('Error setting document cache:', error);
      // Don't throw - caching failures shouldn't break extraction
    }
  }

  /**
   * Get cached rule library match result
   */
  async getRuleMatchCache(documentHash: string, patternHash: string): Promise<ExtractionResult | null> {
    try {
      const redis = getRedisConnection();
      const key = this.generateRuleMatchKey(documentHash, patternHash);
      const cached = await redis.get(key);

      if (!cached) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry = JSON.parse(cached);
      const age = Date.now() - entry.createdAt;

      if (age > entry.ttl) {
        await redis.del(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.value;
    } catch (error: any) {
      console.error('Error getting rule match cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cached rule library match result
   */
  async setRuleMatchCache(
    documentHash: string,
    patternHash: string,
    result: ExtractionResult,
    ttl: number = this.RULE_MATCH_TTL
  ): Promise<void> {
    try {
      const redis = getRedisConnection();
      const key = this.generateRuleMatchKey(documentHash, patternHash);
      const entry: CacheEntry = {
        value: result,
        ttl,
        createdAt: Date.now(),
        cacheType: 'rule_match',
      };

      await redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(entry));
    } catch (error: any) {
      console.error('Error setting rule match cache:', error);
    }
  }

  /**
   * Get cached segment extraction result
   */
  async getSegmentCache(segmentHash: string): Promise<ExtractionResult | null> {
    try {
      const redis = getRedisConnection();
      const key = this.generateSegmentKey(segmentHash);
      const cached = await redis.get(key);

      if (!cached) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry = JSON.parse(cached);
      const age = Date.now() - entry.createdAt;

      if (age > entry.ttl) {
        await redis.del(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.value;
    } catch (error: any) {
      console.error('Error getting segment cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cached segment extraction result
   */
  async setSegmentCache(
    segmentHash: string,
    result: ExtractionResult,
    ttl: number = this.SEGMENT_TTL
  ): Promise<void> {
    try {
      const redis = getRedisConnection();
      const key = this.generateSegmentKey(segmentHash);
      const entry: CacheEntry = {
        value: result,
        ttl,
        createdAt: Date.now(),
        cacheType: 'segment',
      };

      await redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(entry));
    } catch (error: any) {
      console.error('Error setting segment cache:', error);
    }
  }

  /**
   * Invalidate all caches matching a pattern
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      const redis = getRedisConnection();
      const keys = await redis.keys(`${this.CACHE_PREFIX}*${pattern}*`);
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await redis.del(...keys);
      return deleted;
    } catch (error: any) {
      console.error('Error invalidating cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate all rule library caches
   */
  async invalidateRuleLibraryCaches(): Promise<number> {
    try {
      const redis = getRedisConnection();
      const keys = await redis.keys(`${this.CACHE_PREFIX}rule:*`);
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await redis.del(...keys);
      console.log(`Invalidated ${deleted} rule library cache entries`);
      return deleted;
    } catch (error: any) {
      console.error('Error invalidating rule library caches:', error);
      return 0;
    }
  }

  /**
   * Invalidate all document caches
   */
  async invalidateDocumentCaches(): Promise<number> {
    try {
      const redis = getRedisConnection();
      const keys = await redis.keys(`${this.CACHE_PREFIX}doc:*`);
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await redis.del(...keys);
      console.log(`Invalidated ${deleted} document cache entries`);
      return deleted;
    } catch (error: any) {
      console.error('Error invalidating document caches:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const redis = getRedisConnection();
      const keys = await redis.keys(`${this.CACHE_PREFIX}*`);
      const totalEntries = keys.length;
      
      const total = this.stats.hits + this.stats.misses;
      const hitRate = total > 0 ? this.stats.hits / total : 0;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate,
        totalEntries,
      };
    } catch (error: any) {
      console.error('Error getting cache stats:', error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalEntries: 0,
      };
    }
  }

  /**
   * Clear all cache statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Clear all caches (use with caution)
   */
  async clearAll(): Promise<number> {
    try {
      const redis = getRedisConnection();
      const keys = await redis.keys(`${this.CACHE_PREFIX}*`);
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await redis.del(...keys);
      this.resetStats();
      console.log(`Cleared ${deleted} cache entries`);
      return deleted;
    } catch (error: any) {
      console.error('Error clearing all caches:', error);
      return 0;
    }
  }
}

// Singleton instance
let cacheInstance: ExtractionCache | null = null;

export function getExtractionCache(): ExtractionCache {
  if (!cacheInstance) {
    cacheInstance = new ExtractionCache();
  }
  return cacheInstance;
}

