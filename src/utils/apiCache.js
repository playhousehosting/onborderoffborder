/**
 * Simple in-memory cache with TTL for API responses
 * Reduces redundant Graph API calls and improves performance
 */

class ApiCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Generate cache key from endpoint and params
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {string} Cache key
   */
  generateKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');
    return `${endpoint}?${sortedParams}`;
  }

  /**
   * Get cached data if valid
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if expired/missing
   */
  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache data with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Clear specific cache entry
   * @param {string} key - Cache key
   */
  invalidate(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries matching a pattern
   * @param {RegExp} pattern - Pattern to match keys
   */
  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const apiCache = new ApiCache();

/**
 * Cache configuration for different endpoints
 * Adjust TTL based on data volatility
 */
export const CACHE_CONFIG = {
  // Frequently accessed, rarely changes
  USERS_LIST: { ttl: 5 * 60 * 1000 },      // 5 minutes
  GROUPS_LIST: { ttl: 10 * 60 * 1000 },    // 10 minutes
  
  // Changes more frequently
  DEVICES_LIST: { ttl: 2 * 60 * 1000 },    // 2 minutes
  COMPLIANCE: { ttl: 2 * 60 * 1000 },      // 2 minutes
  
  // Real-time data
  AUDIT_LOGS: { ttl: 30 * 1000 },          // 30 seconds
  
  // Rarely changes
  POLICIES: { ttl: 15 * 60 * 1000 },       // 15 minutes
  APPS: { ttl: 15 * 60 * 1000 },           // 15 minutes
};
