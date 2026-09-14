/**
 * Process Development Monthly Report Automation System
 * Module: AI Cache Manager
 * Prevents redundant calls to Gemini model by caching results against content hash
 * WALTON Hi-Tech Industries PLC
 */

const AICacheManager = {
  storageKey: APP_CONFIG.STORAGE_KEYS.AI_CACHE,

  /**
   * Generates a stable hash code for the task content
   */
  hashContent(task) {
    const raw = `${task.task_name || ''}:::${task.task_details || ''}:::${task.impact || ''}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `hash_${Math.abs(hash)}`;
  },

  /**
   * Retrieves cached AI result if source content hasn't changed
   */
  get(task) {
    if (!task) return null;
    const cache = HELPERS.storage.get(this.storageKey, {});
    const hash = this.hashContent(task);
    const entry = cache[hash];
    if (entry && entry.ai_report_title) {
      return entry;
    }
    return null;
  },

  /**
   * Saves AI result to cache
   */
  set(task, result) {
    if (!task || !result) return;
    const cache = HELPERS.storage.get(this.storageKey, {});
    const hash = this.hashContent(task);
    cache[hash] = {
      ai_report_title: result.ai_report_title,
      ai_report_description: result.ai_report_description,
      ai_report_impact: result.ai_report_impact,
      cached_at: new Date().toISOString()
    };
    HELPERS.storage.set(this.storageKey, cache);
  },

  /**
   * Clear cache
   */
  clear() {
    HELPERS.storage.remove(this.storageKey);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AICacheManager;
} else if (typeof window !== 'undefined') {
  window.AICacheManager = AICacheManager;
}
