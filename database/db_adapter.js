/**
 * Process Development Monthly Report Automation System
 * Module: Database Adapter (IndexedDB / LocalStorage & Google Sheets API)
 * Single Source of Truth Manager
 */

class DatabaseAdapter {
  constructor(config = APP_CONFIG) {
    this.config = config;
    this.storageKey = config.STORAGE_KEYS.TASKS;
    this.historyKey = config.STORAGE_KEYS.HISTORY;
    this.auditKey = config.STORAGE_KEYS.AUDIT;
    this.tasksCache = null;
  }

  /**
   * Initializes the database. Loads seed data if storage is empty.
   */
  async init() {
    let tasks = HELPERS.storage.get(this.storageKey, null);
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      if (typeof SEED_DATA !== 'undefined' && Array.isArray(SEED_DATA.TASKS)) {
        console.log("Database empty. Seeding with August 2026 engineering dataset...");
        tasks = SEED_DATA.TASKS.map(t => TASK_SCHEMA.createTaskRecord(t));
        HELPERS.storage.set(this.storageKey, tasks);
      } else {
        tasks = [];
      }
    }
    this.tasksCache = tasks;
    return this.tasksCache;
  }

  /**
   * Retrieves all tasks with optional filter criteria
   */
  async getAllTasks(filters = {}) {
    if (!this.tasksCache) {
      await this.init();
    }

    let result = [...this.tasksCache];

    if (filters.month) {
      result = result.filter(t => t.task_month === filters.month);
    }
    if (filters.engineer) {
      result = result.filter(t => t.concern_engineer === filters.engineer || (t.concern_engineer && t.concern_engineer.includes(filters.engineer)));
    }
    if (filters.category) {
      result = result.filter(t => t.category === filters.category);
    }
    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.monthly_report) {
      result = result.filter(t => t.monthly_report === filters.monthly_report);
    }
    if (filters.report_ready) {
      result = result.filter(t => t.report_ready === filters.report_ready);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(t => 
        (t.task_name && t.task_name.toLowerCase().includes(q)) ||
        (t.task_details && t.task_details.toLowerCase().includes(q)) ||
        (t.concern_engineer && t.concern_engineer.toLowerCase().includes(q)) ||
        (t.impact && t.impact.toLowerCase().includes(q))
      );
    }

    return result;
  }

  /**
   * Finds a task by ID
   */
  async getTaskById(taskId) {
    if (!this.tasksCache) await this.init();
    return this.tasksCache.find(t => t.task_id === taskId) || null;
  }

  /**
   * Saves or updates a task (Single Source of Truth)
   */
  async saveTask(taskData, operator = "System") {
    if (!this.tasksCache) await this.init();

    const validation = TASK_SCHEMA.validateTask(taskData);
    if (!validation.isValid) {
      throw new Error("Validation Error: " + validation.errors.join("; "));
    }

    const taskRecord = TASK_SCHEMA.createTaskRecord(taskData);
    taskRecord.last_updated = new Date().toISOString();

    const existingIndex = this.tasksCache.findIndex(t => t.task_id === taskRecord.task_id);
    const isNew = existingIndex === -1;

    if (isNew) {
      this.tasksCache.unshift(taskRecord);
      this._logAudit(operator, "Task Created", taskRecord.task_id, "ALL", "", taskRecord.task_name);
    } else {
      const oldTask = this.tasksCache[existingIndex];
      this.tasksCache[existingIndex] = taskRecord;
      
      // Audit significant field changes
      if (oldTask.monthly_report !== taskRecord.monthly_report) {
        this._logAudit(operator, "Monthly Report Changed", taskRecord.task_id, "monthly_report", oldTask.monthly_report, taskRecord.monthly_report);
      }
      if (oldTask.status !== taskRecord.status) {
        this._logAudit(operator, "Status Changed", taskRecord.task_id, "status", oldTask.status, taskRecord.status);
      }
      this._logAudit(operator, "Task Updated", taskRecord.task_id, "task_details", "", "Updated");
    }

    // Persist to local storage
    this._persist();

    // Sync to Google Sheets if configured
    this._syncToGoogleWorkspace("SAVE", taskRecord);

    return taskRecord;
  }

  /**
   * Deletes a task by ID
   */
  async deleteTask(taskId, operator = "System") {
    if (!this.tasksCache) await this.init();
    const idx = this.tasksCache.findIndex(t => t.task_id === taskId);
    if (idx === -1) return false;

    const removed = this.tasksCache.splice(idx, 1)[0];
    this._logAudit(operator, "Task Deleted", taskId, "ALL", removed.task_name, "");
    this._persist();
    this._syncToGoogleWorkspace("DELETE", { task_id: taskId });
    return true;
  }

  /**
   * Bulk save tasks (used for imports and initial seeding)
   */
  async bulkSaveTasks(tasks, operator = "System Bulk") {
    if (!this.tasksCache) await this.init();
    
    tasks.forEach(t => {
      const record = TASK_SCHEMA.createTaskRecord(t);
      const existingIndex = this.tasksCache.findIndex(item => item.task_id === record.task_id);
      if (existingIndex >= 0) {
        this.tasksCache[existingIndex] = record;
      } else {
        this.tasksCache.push(record);
      }
    });

    this._persist();
    this._logAudit(operator, "Bulk Import", `COUNT:${tasks.length}`, "ALL", "", `Imported ${tasks.length} tasks`);
    return this.tasksCache.length;
  }

  /**
   * Clears database and resets to seed data
   */
  async resetToSeed(seedTasks = []) {
    this.tasksCache = seedTasks.map(t => TASK_SCHEMA.createTaskRecord(t));
    this._persist();
    return this.tasksCache.length;
  }

  // Internal persistence
  _persist() {
    HELPERS.storage.set(this.storageKey, this.tasksCache);
  }

  // Internal Audit Log
  _logAudit(user, action, taskId, field, oldValue, newValue) {
    try {
      const logs = HELPERS.storage.get(this.auditKey, []);
      const newEntry = {
        log_id: "AUD-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString(),
        user: user || "System",
        action,
        task_id: taskId,
        field: field || "",
        old_value: String(oldValue || ""),
        new_value: String(newValue || "")
      };
      logs.unshift(newEntry);
      if (logs.length > 500) logs.pop(); // Keep recent 500 logs
      HELPERS.storage.set(this.auditKey, logs);
    } catch (e) {
      console.warn("Audit log write error:", e);
    }
  }

  // Background Google Sheets Synchronization
  async _syncToGoogleWorkspace(action, payload) {
    if (!this.config.GOOGLE_WORKSPACE || !this.config.GOOGLE_WORKSPACE.ENABLED || !this.config.GOOGLE_WORKSPACE.APPS_SCRIPT_WEBAPP_URL) {
      return; // Offline / local mode
    }
    try {
      fetch(this.config.GOOGLE_WORKSPACE.APPS_SCRIPT_WEBAPP_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload, token: "WALTON_PD_AUTH" })
      }).catch(err => console.warn("Google Workspace sync notice (offline):", err));
    } catch (e) {
      // Non-blocking
    }
  }
}

// Export singleton instance
const db = new DatabaseAdapter();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DatabaseAdapter, db };
} else if (typeof window !== 'undefined') {
  window.DatabaseAdapter = DatabaseAdapter;
  window.db = db;
}
