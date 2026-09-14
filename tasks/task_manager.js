/**
 * Process Development Monthly Report Automation System
 * Module: Task Manager Controller
 * Handles business operations, filtering, search, and data export
 */

class TaskManager {
  constructor(database = db) {
    this.db = database;
    this.listeners = [];
  }

  /**
   * Subscribe to task state updates
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notify() {
    this.listeners.forEach(fn => fn());
  }

  /**
   * Fetch filtered tasks
   */
  async getTasks(filters = {}) {
    return await this.db.getAllTasks(filters);
  }

  /**
   * Get single task
   */
  async getTask(taskId) {
    return await this.db.getTaskById(taskId);
  }

  /**
   * Create or update task
   */
  async saveTask(taskData, operator = "Engineer") {
    const saved = await this.db.saveTask(taskData, operator);
    this.notify();
    return saved;
  }

  /**
   * Quick toggle Monthly Report (YES / NO)
   */
  async toggleMonthlyReport(taskId, operator = "Engineer") {
    const task = await this.db.getTaskById(taskId);
    if (!task) throw new Error("Task not found: " + taskId);

    const newStatus = task.monthly_report === "YES" ? "NO" : "YES";
    task.monthly_report = newStatus;
    task.last_updated = new Date().toISOString();
    
    // Auto-update readiness
    task.report_ready = TASK_SCHEMA.evaluateReadiness(task);

    const saved = await this.db.saveTask(task, operator);
    this.notify();
    return saved;
  }

  /**
   * Delete task
   */
  async deleteTask(taskId, operator = "Engineer") {
    const success = await this.db.deleteTask(taskId, operator);
    if (success) this.notify();
    return success;
  }

  /**
   * Export tasks to CSV format
   */
  async exportToCSV(filters = {}) {
    const tasks = await this.getTasks(filters);
    if (tasks.length === 0) return "";

    const headers = TASK_SCHEMA.FIELDS.map(f => f.name);
    const rows = [headers.join(",")];

    tasks.forEach(t => {
      const line = headers.map(h => {
        let val = t[h] !== undefined && t[h] !== null ? String(t[h]) : "";
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      });
      rows.push(line.join(","));
    });

    return rows.join("\r\n");
  }

  /**
   * Import tasks from JSON or CSV
   */
  async importTasks(taskArray, operator = "Import User") {
    if (!Array.isArray(taskArray)) {
      throw new Error("Invalid task import data: expected an array.");
    }
    const count = await this.db.bulkSaveTasks(taskArray, operator);
    this.notify();
    return count;
  }
}

const taskManager = new TaskManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TaskManager, taskManager };
} else if (typeof window !== 'undefined') {
  window.TaskManager = TaskManager;
  window.taskManager = taskManager;
}
