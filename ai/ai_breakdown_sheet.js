/**
 * Process Development Monthly Report Automation System
 * Module: AI Breakdown Sheet Data Store
 * Manages the derived AI BREAKDOWN dataset
 * Fields: Task ID | Month | Engineer | Original Task Name | AI Report Title |
 *         AI Description | AI Impact | AI Category | AI Project Type | Photo |
 *         Slide Status | Last AI Update | Source Hash
 */

class AIBreakdownSheet {
  constructor(storageKey = "walton_pd_ai_breakdown_v1") {
    this.storageKey = storageKey;
    this.breakdowns = {}; // Map of taskId -> breakdown record
    this.init();
  }

  init() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.breakdowns = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load AI Breakdown from localStorage:", e);
    }
  }

  save() {
    try {
      const clean = {};
      for (const [k, v] of Object.entries(this.breakdowns)) {
        clean[k] = {
          ...v,
          photo: v.photo ? (typeof v.photo === 'string' && v.photo.length > 500 ? true : v.photo) : null,
          photo_before: v.photo_before ? (typeof v.photo_before === 'string' && v.photo_before.length > 500 ? true : v.photo_before) : null,
          photo_after: v.photo_after ? (typeof v.photo_after === 'string' && v.photo_after.length > 500 ? true : v.photo_after) : null
        };
      }
      localStorage.setItem(this.storageKey, JSON.stringify(clean));
    } catch (e) {
      console.warn("Could not save AI Breakdown to localStorage:", e);
    }
  }

  computeSourceHash(engineer, taskName) {
    const str = `${(engineer || "").trim().toLowerCase()}_${(taskName || "").trim().toLowerCase()}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  getBreakdown(taskId) {
    return this.breakdowns[taskId] || null;
  }

  getAllForMonth(month) {
    const normalizedMonth = (month || "").toUpperCase();
    return Object.values(this.breakdowns).filter(b => (b.month || "").toUpperCase() === normalizedMonth);
  }

  isStale(taskId, engineer, taskName) {
    const existing = this.getBreakdown(taskId);
    if (!existing) return true;
    const currentHash = this.computeSourceHash(engineer, taskName);
    return existing.source_hash !== currentHash;
  }

  upsertBreakdown(data) {
    if (!data.task_id) {
      throw new Error("Task ID is required for AI Breakdown.");
    }

    const existing = this.breakdowns[data.task_id] || {};
    const engineer = data.engineer !== undefined ? data.engineer : (existing.engineer || "");
    const taskName = data.original_task_name !== undefined ? data.original_task_name : (existing.original_task_name || "");
    const currentHash = this.computeSourceHash(engineer, taskName);

    const record = {
      task_id: data.task_id,
      month: data.month || existing.month || "SEP-2026",
      engineer: engineer,
      original_task_name: taskName,
      split_title_1: data.split_title_1 || existing.split_title_1 || "",
      split_title_2: data.split_title_2 || existing.split_title_2 || "",
      ai_report_title: data.ai_report_title || existing.ai_report_title || taskName,
      ai_description: data.ai_description || existing.ai_description || "",
      ai_impact: Array.isArray(data.ai_impact) ? data.ai_impact : (existing.ai_impact || []),
      metrics: Array.isArray(data.metrics) ? data.metrics : (existing.metrics || []),
      quote: data.quote || existing.quote || "Automation for a Smarter Tomorrow",
      ai_category: data.ai_category || existing.ai_category || "Process Development",
      ai_project_type: data.ai_project_type || existing.ai_project_type || "Process Improvement",
      photo: data.photo !== undefined ? data.photo : (existing.photo || null),
      photo_before: data.photo_before !== undefined ? data.photo_before : (existing.photo_before || null),
      photo_after: data.photo_after !== undefined ? data.photo_after : (existing.photo_after || null),
      slide_status: data.slide_status || existing.slide_status || "PHOTO PENDING",
      last_ai_update: data.last_ai_update || existing.last_ai_update || new Date().toISOString(),
      source_hash: currentHash
    };

    // Determine slide_status based on photos
    const hasPhoto = record.photo || record.photo_before || record.photo_after;
    record.slide_status = hasPhoto ? "READY" : "PHOTO PENDING";

    this.breakdowns[data.task_id] = record;
    this.save();
    return record;
  }

  removeBreakdown(taskId) {
    if (this.breakdowns[taskId]) {
      delete this.breakdowns[taskId];
      this.save();
      return true;
    }
    return false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIBreakdownSheet;
} else if (typeof window !== 'undefined') {
  window.AIBreakdownSheet = AIBreakdownSheet;
}
