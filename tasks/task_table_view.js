/**
 * Process Development Monthly Report Automation System
 * Module: Task Table View (Interactive Data Grid)
 * WALTON Hi-Tech Industries PLC
 */

const TaskTableView = {
  currentFilters: {
    month: "2026-08",
    engineer: "",
    category: "",
    status: "",
    monthly_report: "",
    search: ""
  },

  /**
   * Initializes and renders the task management view
   */
  async render(containerId = 'tasks-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const tasks = await taskManager.getTasks(this.currentFilters);

    const engineerOptions = `<option value="">All Engineers</option>` + MASTER_LISTS.ENGINEERS.map(e => 
      `<option value="${e.display}" ${this.currentFilters.engineer === e.display ? 'selected' : ''}>${e.display}</option>`
    ).join('');

    const categoryOptions = `<option value="">All Categories</option>` + MASTER_LISTS.CATEGORIES.map(c => 
      `<option value="${c}" ${this.currentFilters.category === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    const statusOptions = `<option value="">All Statuses</option>` + MASTER_LISTS.STATUSES.map(s => 
      `<option value="${s.id}" ${this.currentFilters.status === s.id ? 'selected' : ''}>${s.label}</option>`
    ).join('');

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Controls & Filters Toolbar -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div>
              <h2 class="text-xl font-black text-white tracking-wide">Tasks Master Directory</h2>
              <p class="text-xs text-slate-400 mt-0.5">Central source of truth for all Process Development tasks</p>
            </div>
            <div class="flex items-center gap-3">
              <button onclick="TaskTableView.exportCSV()" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition">
                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Export CSV
              </button>
              <button onclick="TaskFormView.open(null, '${this.currentFilters.month}')" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                New Task Entry
              </button>
            </div>
          </div>

          <!-- Filter Rows -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-4">
            <!-- Search -->
            <div class="lg:col-span-2">
              <input type="text" id="task-search-input" value="${HELPERS.escapeHTML(this.currentFilters.search)}" oninput="TaskTableView.handleFilterChange('search', this.value)" placeholder="Search task name, procedure, engineer..." class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500">
            </div>

            <!-- Month Filter -->
            <div>
              <select onchange="TaskTableView.handleFilterChange('month', this.value)" class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500">
                ${APP_CONFIG.SUPPORTED_MONTHS.map(m => `<option value="${m.id}" ${this.currentFilters.month === m.id ? 'selected' : ''}>${m.label}</option>`).join('')}
              </select>
            </div>

            <!-- Engineer Filter -->
            <div>
              <select onchange="TaskTableView.handleFilterChange('engineer', this.value)" class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500">
                ${engineerOptions}
              </select>
            </div>

            <!-- Category Filter -->
            <div>
              <select onchange="TaskTableView.handleFilterChange('category', this.value)" class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500">
                ${categoryOptions}
              </select>
            </div>

            <!-- Monthly Report Filter -->
            <div>
              <select onchange="TaskTableView.handleFilterChange('monthly_report', this.value)" class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500">
                <option value="">Report: ALL</option>
                <option value="YES" ${this.currentFilters.monthly_report === 'YES' ? 'selected' : ''}>Report = YES</option>
                <option value="NO" ${this.currentFilters.monthly_report === 'NO' ? 'selected' : ''}>Report = NO</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Task Table Card -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div class="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <span class="text-xs font-mono text-slate-400">Showing <span class="text-cyan-400 font-bold">${tasks.length}</span> recorded tasks</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th class="py-3 px-4">Task ID</th>
                  <th class="py-3 px-4">Task Name & Details</th>
                  <th class="py-3 px-4">Concern Engineer</th>
                  <th class="py-3 px-4">Category</th>
                  <th class="py-3 px-4 text-center">Status</th>
                  <th class="py-3 px-4 text-center">Monthly Report</th>
                  <th class="py-3 px-4 text-center">Photo</th>
                  <th class="py-3 px-4 text-right">Saving</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                ${tasks.length === 0 ? `
                  <tr><td colspan="9" class="py-12 text-center text-slate-500">No tasks found matching criteria.</td></tr>
                ` : tasks.map(t => this._renderTaskRow(t)).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  },

  _renderTaskRow(task) {
    const isReportYes = task.monthly_report === "YES";
    const hasPhoto = Boolean(task.photo_1 || task.photo_2 || task.before_photo || task.after_photo);

    let statusBadge = "bg-slate-800 text-slate-300 border border-slate-700";
    if (task.status === "Completed") statusBadge = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    else if (task.status === "Ongoing") statusBadge = "bg-sky-500/10 text-sky-400 border border-sky-500/20";
    else if (task.status === "In Progress") statusBadge = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";

    return `
      <tr class="hover:bg-slate-800/30 transition">
        <td class="py-3 px-4 font-mono font-medium text-cyan-400 whitespace-nowrap">
          ${task.task_id}
        </td>
        <td class="py-3 px-4 max-w-sm">
          <div class="font-bold text-white line-clamp-1">${HELPERS.escapeHTML(task.task_name)}</div>
          <div class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">${HELPERS.escapeHTML(task.task_details)}</div>
        </td>
        <td class="py-3 px-4 whitespace-nowrap">
          <div class="font-semibold text-slate-200">${HELPERS.escapeHTML(task.concern_engineer)}</div>
          <div class="text-[10px] text-slate-500">Sup: ${HELPERS.escapeHTML(task.supervisor || 'Kamrul')}</div>
        </td>
        <td class="py-3 px-4 whitespace-nowrap text-slate-400">
          ${HELPERS.escapeHTML(task.category)}
        </td>
        <td class="py-3 px-4 text-center whitespace-nowrap">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusBadge}">
            ${task.status} (${task.progress_percent}%)
          </span>
        </td>
        <td class="py-3 px-4 text-center whitespace-nowrap">
          <button onclick="TaskTableView.toggleReport('${task.task_id}')" title="Click to toggle Monthly Report inclusion" class="px-3 py-1 rounded-full text-[11px] font-bold border transition ${
            isReportYes 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' 
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
          }">
            ${isReportYes ? '✔ YES' : '✖ NO'}
          </button>
        </td>
        <td class="py-3 px-4 text-center whitespace-nowrap">
          ${hasPhoto ? `
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              📸 YES
            </span>
          ` : `
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-500">
              -
            </span>
          `}
        </td>
        <td class="py-3 px-4 text-right font-mono whitespace-nowrap ${task.annual_saving > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}">
          ${task.annual_saving > 0 ? HELPERS.formatBDT(task.annual_saving) : '-'}
        </td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <div class="inline-flex items-center gap-1.5">
            <button onclick="TaskFormView.open('${task.task_id}')" title="Edit Task" class="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button onclick="TaskTableView.deleteTask('${task.task_id}')" title="Delete Task" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  handleFilterChange(key, val) {
    this.currentFilters[key] = val;
    this.render();
  },

  async toggleReport(taskId) {
    try {
      await taskManager.toggleMonthlyReport(taskId, "User");
      this.render();
      if (typeof window.showToast === 'function') {
        window.showToast("Monthly Report status updated!", "info");
      }
    } catch (e) {
      alert("Error toggling monthly report: " + e.message);
    }
  },

  async deleteTask(taskId) {
    if (!confirm(`Are you sure you want to delete task ${taskId}? This action is logged.`)) {
      return;
    }
    try {
      await taskManager.deleteTask(taskId, "User");
      this.render();
      if (typeof window.showToast === 'function') {
        window.showToast("Task deleted successfully.", "warning");
      }
    } catch (e) {
      alert("Error deleting task: " + e.message);
    }
  },

  async exportCSV() {
    const csv = await taskManager.exportToCSV(this.currentFilters);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Walton_Process_Tasks_${this.currentFilters.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaskTableView;
} else if (typeof window !== 'undefined') {
  window.TaskTableView = TaskTableView;
}
