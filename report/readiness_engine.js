/**
 * Process Development Monthly Report Automation System
 * Module: Readiness Engine
 * Evaluates deterministic readiness for tasks and consolidated engineer slides
 */

const ReadinessEngine = {
  /**
   * Evaluates readiness for an individual task
   * States: READY, PHOTO PENDING, MISSING DESCRIPTION, MISSING IMPACT, MISSING ENGINEER, MISSING CATEGORY
   */
  evaluateTask(task) {
    if (!task) return { status: "INCOMPLETE", canGenerate: false, reason: "No task data" };

    if (!task.task_name || task.task_name.trim().length === 0) {
      return { status: "MISSING TITLE", canGenerate: false, reason: "Task name is required" };
    }
    if (!task.concern_engineer || task.concern_engineer.trim().length === 0) {
      return { status: "MISSING ENGINEER", canGenerate: false, reason: "Concern engineer is required for grouping" };
    }
    if (!task.category || task.category.trim().length === 0) {
      return { status: "MISSING CATEGORY", canGenerate: false, reason: "Category is required" };
    }
    if (!task.task_details || task.task_details.trim().length === 0) {
      return { status: "MISSING DESCRIPTION", canGenerate: false, reason: "Task details are required" };
    }
    if (!task.impact || task.impact.trim().length === 0) {
      return { status: "MISSING IMPACT", canGenerate: false, reason: "Impact points are required" };
    }

    const hasPhoto = Boolean(task.photo_1 || task.photo_2 || task.before_photo || task.after_photo);
    if (task.photo_required === "YES" && !hasPhoto) {
      // CRITICAL RULE: Missing photos must not block report generation!
      return { status: "PHOTO PENDING", canGenerate: true, reason: "Photo requested but pending; blank region reserved" };
    }

    return { status: "READY", canGenerate: true, reason: "Task is complete and report-ready" };
  },

  /**
   * Evaluates aggregate readiness for an engineer group
   */
  evaluateEngineerGroup(engineerName, tasks = []) {
    if (!tasks || tasks.length === 0) {
      return {
        engineer: engineerName,
        taskCount: 0,
        availablePhotos: 0,
        photosPending: 0,
        status: "EMPTY",
        canGenerate: false,
        issues: ["No tasks selected for this engineer"]
      };
    }

    let availablePhotos = 0;
    let photosPending = 0;
    let blockingIssues = [];
    let hasPhotoPending = false;

    tasks.forEach(task => {
      const evaluation = this.evaluateTask(task);
      const hasPhoto = Boolean(task.photo_1 || task.photo_2 || task.before_photo || task.after_photo);
      
      if (hasPhoto) {
        availablePhotos++;
      } else {
        photosPending++;
      }

      if (!evaluation.canGenerate) {
        blockingIssues.push(`${task.task_id}: ${evaluation.reason}`);
      } else if (evaluation.status === "PHOTO PENDING") {
        hasPhotoPending = true;
      }
    });

    let groupStatus = "READY";
    if (blockingIssues.length > 0) {
      groupStatus = "INCOMPLETE";
    } else if (hasPhotoPending || (tasks.length > 0 && availablePhotos < tasks.length)) {
      groupStatus = "PHOTO PENDING";
    }

    return {
      engineer: engineerName,
      taskCount: tasks.length,
      availablePhotos,
      photosPending,
      status: groupStatus,
      canGenerate: blockingIssues.length === 0, // Can generate even if PHOTO PENDING
      issues: blockingIssues
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReadinessEngine;
} else if (typeof window !== 'undefined') {
  window.ReadinessEngine = ReadinessEngine;
}
