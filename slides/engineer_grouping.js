/**
 * Process Development Monthly Report Automation System
 * Module: Task Slide Compiler & Grouping Engine
 * ENFORCES: 1 INPUT ROW = 1 REPORT SLIDE
 * WALTON Hi-Tech Industries PLC
 */

const EngineerGrouping = {
  /**
   * Primary Compilation Rule: 1 INPUT ROW = 1 REPORT SLIDE
   * Every included task row becomes exactly one dedicated report slide
   * @param {Array} tasks - List of task rows where include_in_report !== 'NO'
   * @param {String} month - Target reporting month (e.g. 'SEP-2026')
   * @returns {Array} List of slide definitions (1 per task)
   */
  compileTaskSlides(tasks = [], month = "SEP-2026") {
    if (!Array.isArray(tasks)) return [];

    // Filter to included tasks
    const included = tasks.filter(t => t.include_in_report !== "NO" && t.monthly_report !== "NO");

    return included.map((task, idx) => {
      const engName = task.engineer || task.concern_engineer || "Concern Engineer";
      const idMatch = engName.match(/\((\d+)\)/);
      const employeeId = idMatch ? idMatch[1] : (task.employee_id || "");

      return {
        slide_index: idx + 1,
        task_id: task.task_id,
        month: month,
        engineer: engName,
        employee_id: employeeId,
        task_name: task.task_name || task.original_task_name,
        slide_title: task.slide_title || task.ai_report_title || task.task_name,
        description: task.description || task.ai_description || task.task_details || "",
        impact: Array.isArray(task.impact) ? task.impact : (task.ai_impact || []),
        category: task.category || task.ai_category || "Process Development",
        project_type: task.project_type || task.ai_project_type || "Process Improvement",
        photo: task.photo || task.photo_1 || null,
        photo_before: task.photo_before || task.before_photo || null,
        photo_after: task.photo_after || task.after_photo || null,
        status: task.status || "Completed",
        investment: task.investment || "In-house / Direct Implementation"
      };
    });
  },

  /**
   * Legacy grouping method (for backwards compatibility)
   */
  groupByEngineer(tasks = [], month = "SEP-2026") {
    return this.compileTaskSlides(tasks, month);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EngineerGrouping;
} else if (typeof window !== 'undefined') {
  window.EngineerGrouping = EngineerGrouping;
}
