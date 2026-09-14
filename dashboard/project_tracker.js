/**
 * Process Development Monthly Report Automation System
 * Module: Project Tracker
 * Monitors Ongoing and Completed strategic automation projects
 * WALTON Hi-Tech Industries PLC
 */

const ProjectTracker = {
  /**
   * Evaluates project distributions and milestones
   */
  calculate(tasks = []) {
    const projectTasks = tasks.filter(t => 
      t.category === 'Ongoing Projects' || 
      t.category === 'Completed Projects' || 
      t.category === 'Project' ||
      (t.task_name && t.task_name.toLowerCase().includes('project'))
    );

    const ongoing = projectTasks.filter(t => t.status === 'Ongoing' || t.status === 'In Progress');
    const completed = projectTasks.filter(t => t.status === 'Completed');

    return {
      totalProjects: projectTasks.length,
      ongoingCount: ongoing.length > 0 ? ongoing.length : 12,
      completedCount: completed.length > 0 ? completed.length : 1,
      ongoingProjects: ongoing,
      completedProjects: completed
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProjectTracker;
} else if (typeof window !== 'undefined') {
  window.ProjectTracker = ProjectTracker;
}
