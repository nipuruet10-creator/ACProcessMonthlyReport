/**
 * Process Development Monthly Report Automation System
 * Module: TASKS Database Schema & Validation Rules
 * WALTON Hi-Tech Industries PLC
 */

const TASK_SCHEMA = {
  TABLE_NAME: "TASKS",
  TOTAL_FIELDS: 33,
  
  // Field Definitions
  FIELDS: [
    { name: "task_id", type: "string", required: true, description: "Unique task identifier (TSK-YYYYMM-XXXX)" },
    { name: "entry_date", type: "date", required: true, description: "Date when task was entered" },
    { name: "task_month", type: "string", required: true, description: "Target reporting month (YYYY-MM)" },
    { name: "task_name", type: "string", required: true, description: "Original engineer task title" },
    { name: "task_details", type: "string", required: true, description: "Detailed procedure / description" },
    { name: "category", type: "string", required: true, description: "Category of work" },
    { name: "task_point", type: "number", required: false, default: 50.0, description: "WBS evaluation point" },
    { name: "supervisor", type: "string", required: true, description: "Supervising engineer" },
    { name: "concern_engineer", type: "string", required: true, description: "Primary responsible engineer (Grouping key)" },
    { name: "assignee_2", type: "string", required: false, default: "", description: "Secondary supporting engineer" },
    { name: "start_date", type: "date", required: false, default: "", description: "Commencement date" },
    { name: "end_date", type: "date", required: false, default: "", description: "Completion date" },
    { name: "status", type: "string", required: true, default: "Ongoing", description: "Completed, Ongoing, In Progress, Scheduled, On Hold" },
    { name: "progress_percent", type: "number", required: false, default: 50, description: "Progress percentage (0-100)" },
    { name: "impact", type: "string", required: false, default: "", description: "Operational, technical, or cost impact" },
    { name: "cost_impact", type: "string", required: false, default: "", description: "Direct cost impact note or amount" },
    { name: "annual_saving", type: "number", required: false, default: 0, description: "Annualized verified financial saving in BDT" },
    { name: "deadline", type: "date", required: false, default: "", description: "Milestone deadline" },
    { name: "monthly_report", type: "string", required: true, default: "NO", description: "Master report selector: YES / NO" },
    { name: "report_section", type: "string", required: false, default: "Major Developments – Process", description: "Target report section" },
    { name: "report_priority", type: "string", required: false, default: "Medium", description: "High, Medium, Low" },
    { name: "photo_required", type: "string", required: false, default: "NO", description: "YES / NO flag" },
    { name: "photo_1", type: "string", required: false, default: "", description: "Primary photo URL or path" },
    { name: "photo_2", type: "string", required: false, default: "", description: "Secondary photo URL or path" },
    { name: "before_photo", type: "string", required: false, default: "", description: "Before condition photo" },
    { name: "after_photo", type: "string", required: false, default: "", description: "After condition photo" },
    { name: "ai_report_title", type: "string", required: false, default: "", description: "AI transformed concise management title" },
    { name: "ai_report_description", type: "string", required: false, default: "", description: "AI transformed executive summary narrative" },
    { name: "ai_report_impact", type: "string", required: false, default: "", description: "AI transformed bulleted impact points" },
    { name: "report_ready", type: "string", required: false, default: "INCOMPLETE", description: "Readiness state: READY, PHOTO PENDING, INCOMPLETE, etc." },
    { name: "report_order", type: "number", required: false, default: 100, description: "Ordering weight within slide" },
    { name: "remarks", type: "string", required: false, default: "", description: "Internal notes" },
    { name: "last_updated", type: "string", required: true, description: "ISO timestamp of last update" }
  ],

  /**
   * Evaluates deterministic report readiness status
   * CRITICAL: Photo absence must NOT automatically make the report invalid!
   */
  evaluateReadiness(task) {
    if (!task.task_name || task.task_name.trim().length === 0) {
      return "MISSING TITLE";
    }
    if (!task.concern_engineer || task.concern_engineer.trim().length === 0) {
      return "MISSING ENGINEER";
    }
    if (!task.category || task.category.trim().length === 0) {
      return "MISSING CATEGORY";
    }
    if (!task.task_details || task.task_details.trim().length === 0) {
      return "MISSING DESCRIPTION";
    }
    if (!task.impact || task.impact.trim().length === 0) {
      return "MISSING IMPACT";
    }

    // Check photo availability
    const hasPhoto = Boolean(task.photo_1 || task.photo_2 || task.before_photo || task.after_photo);
    if (task.photo_required === "YES" && !hasPhoto) {
      return "PHOTO PENDING"; // Eligible for report, but flags pending visual
    }

    return "READY";
  },

  /**
   * Factory function to instantiate a valid task with defaults
   */
  createTaskRecord(data = {}) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const taskMonth = data.task_month || today.slice(0, 7);

    const task = {
      task_id: data.task_id || (typeof HELPERS !== 'undefined' ? HELPERS.generateTaskId(taskMonth) : `TSK-${taskMonth.replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`),
      entry_date: data.entry_date || today,
      task_month: taskMonth,
      task_name: (data.task_name || "").trim(),
      task_details: (data.task_details || "").trim(),
      category: data.category || "Major Developments – Process",
      task_point: typeof data.task_point === 'number' ? data.task_point : (parseFloat(data.task_point) || 50.0),
      supervisor: data.supervisor || "Kamrul (44819)",
      concern_engineer: data.concern_engineer || "",
      assignee_2: data.assignee_2 || "",
      start_date: data.start_date || today,
      end_date: data.end_date || "",
      status: data.status || "Ongoing",
      progress_percent: typeof data.progress_percent === 'number' ? data.progress_percent : (parseInt(data.progress_percent, 10) || 50),
      impact: (data.impact || "").trim(),
      cost_impact: data.cost_impact || "",
      annual_saving: typeof data.annual_saving === 'number' ? data.annual_saving : (parseFloat(data.annual_saving) || 0),
      deadline: data.deadline || "",
      monthly_report: (data.monthly_report === "YES" || data.monthly_report === true) ? "YES" : "NO",
      report_section: data.report_section || "Major Developments – Process",
      report_priority: data.report_priority || "Medium",
      photo_required: (data.photo_required === "YES" || data.photo_required === true) ? "YES" : "NO",
      photo_1: data.photo_1 || "",
      photo_2: data.photo_2 || "",
      before_photo: data.before_photo || "",
      after_photo: data.after_photo || "",
      ai_report_title: data.ai_report_title || "",
      ai_report_description: data.ai_report_description || "",
      ai_report_impact: data.ai_report_impact || "",
      report_ready: "INCOMPLETE",
      report_order: typeof data.report_order === 'number' ? data.report_order : (parseInt(data.report_order, 10) || 100),
      remarks: data.remarks || "",
      last_updated: data.last_updated || now.toISOString()
    };

    // Auto-evaluate readiness
    task.report_ready = this.evaluateReadiness(task);

    return task;
  },

  /**
   * Validates a task object against required rules
   */
  validateTask(task) {
    const errors = [];
    if (!task) {
      return { isValid: false, errors: ["Task object cannot be null or undefined"] };
    }

    if (!task.task_name || task.task_name.trim().length === 0) {
      errors.push("Task Name is required.");
    }
    if (!task.concern_engineer || task.concern_engineer.trim().length === 0) {
      errors.push("Concern Engineer is required.");
    }
    if (!task.category || task.category.trim().length === 0) {
      errors.push("Category is required.");
    }
    if (!task.task_month || !/^\d{4}-\d{2}$/.test(task.task_month)) {
      errors.push("Task Month must be in YYYY-MM format.");
    }
    if (task.monthly_report !== "YES" && task.monthly_report !== "NO") {
      errors.push("Monthly Report must be 'YES' or 'NO'.");
    }
    if (typeof task.progress_percent === 'number' && (task.progress_percent < 0 || task.progress_percent > 100)) {
      errors.push("Progress Percent must be between 0 and 100.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TASK_SCHEMA;
} else if (typeof window !== 'undefined') {
  window.TASK_SCHEMA = TASK_SCHEMA;
}
