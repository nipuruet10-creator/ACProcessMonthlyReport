/**
 * Process Development Monthly Report Automation System
 * Module: Report Controller
 * Manages the Monthly Report Queue and Eligibility Engine
 */

class ReportController {
  constructor(database = db, engine = ReadinessEngine) {
    this.db = database;
    this.readinessEngine = engine;
  }

  /**
   * Retrieves all tasks eligible for monthly report:
   * task_month == targetMonth && monthly_report == 'YES'
   */
  async getEligibleTasks(targetMonth = "2026-08") {
    const tasks = await this.db.getAllTasks({
      month: targetMonth,
      monthly_report: "YES"
    });
    return tasks;
  }

  /**
   * Builds the executive Report Queue grouped by engineer
   */
  async getReportQueue(targetMonth = "2026-08") {
    const eligibleTasks = await this.getEligibleTasks(targetMonth);

    // Group tasks by concern_engineer
    const engineerMap = {};
    eligibleTasks.forEach(task => {
      const eng = task.concern_engineer || "Unassigned";
      if (!engineerMap[eng]) engineerMap[eng] = [];
      engineerMap[eng].push(task);
    });

    const queue = [];
    for (const [engineer, tasks] of Object.entries(engineerMap)) {
      const evaluation = this.readinessEngine.evaluateEngineerGroup(engineer, tasks);
      queue.push({
        engineer,
        taskCount: tasks.length,
        availablePhotos: evaluation.availablePhotos,
        photosPending: evaluation.photosPending,
        status: evaluation.status,
        canGenerate: evaluation.canGenerate,
        issues: evaluation.issues,
        tasks
      });
    }

    // Sort queue by taskCount descending
    queue.sort((a, b) => b.taskCount - a.taskCount);

    return {
      month: targetMonth,
      totalEligibleTasks: eligibleTasks.length,
      engineerCount: queue.length,
      canGenerateFullReport: queue.every(q => q.canGenerate),
      queue
    };
  }

  /**
   * Toggles task monthly report flag directly from report builder
   */
  async toggleTaskInclusion(taskId, operator = "Report Owner") {
    return await taskManager.toggleMonthlyReport(taskId, operator);
  }
}

const reportController = new ReportController();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReportController, reportController };
} else if (typeof window !== 'undefined') {
  window.ReportController = ReportController;
  window.reportController = reportController;
}
