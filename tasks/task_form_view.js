/**
 * Process Development Monthly Report Automation System
 * Module: Task Form View (Fast Engineer Entry)
 * Principle: ENGINEER ENTERS TASK NAME + OPTIONAL AI DETAILS GENERATION
 * WALTON Hi-Tech Industries PLC
 */

const TaskFormView = {
  activeTaskId: null,

  renderModalContainer() {
    let container = document.getElementById('task-form-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'task-form-modal-container';
      document.body.appendChild(container);
    }
    return container;
  },

  /**
   * AI-generate details for the task currently being entered in the modal
   */
  async generateAiDetails(event) {
    if (event && event.preventDefault) event.preventDefault();
    const nameInput = document.getElementById('entry-task-name');
    const detailsInput = document.getElementById('entry-task-details');
    const catSelect = document.getElementById('entry-task-category');

    if (!nameInput || !detailsInput) return;
    const taskName = nameInput.value.trim();

    if (!taskName) {
      if (typeof window.showToast === 'function') {
        window.showToast("Please enter a Task Name first before generating AI details!", "warning");
      } else {
        alert("Please enter a Task Name first!");
      }
      nameInput.focus();
      return;
    }

    const category = catSelect ? catSelect.value : "Process development";
    let steps = "";

    try {
      if (window.appState && window.appState.aiClient && window.appState.aiClient.generateTaskSteps) {
        steps = await window.appState.aiClient.generateTaskSteps(taskName, category);
      }
    } catch (e) {
      // Fallback
    }

    if (!steps && typeof PROMPT_TEMPLATES !== 'undefined' && PROMPT_TEMPLATES.generateEngineeringSteps) {
      steps = PROMPT_TEMPLATES.generateEngineeringSteps(taskName, category);
    }

    if (!steps) {
      steps = `1. Study process requirements for ${taskName}. 2. Fabricate tooling & assemble prototype. 3. Perform production trial run. 4. Complete quality sign-off and SOP.`;
    }

    detailsInput.value = steps;
    if (typeof window.showToast === 'function') {
      window.showToast("\u2728 AI generated tailored milestone details!", "success");
    }
  },

  /**
   * Opens the engineer entry form
   */
  open(taskId = null, defaultMonth = "SEP-2026") {
    this.activeTaskId = taskId;
    const container = this.renderModalContainer();

    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : new MonthWorkbookManager();

    const currentMonth = workbookMgr.normalizeMonth(defaultMonth);
    let task = null;

    if (taskId) {
      const tasks = workbookMgr.getTasksForMonth(currentMonth);
      task = tasks.find(t => t.task_id === taskId);
    }

    const isEdit = Boolean(task);
    const title = isEdit ? `Edit Task (${task.task_id})` : "New Engineering Task Entry";

    // Personnel lists
    const engineers = (typeof MasterDataManager !== 'undefined') ? MasterDataManager.getEngineers() : [
      { name: "Sazzad", id: "50463", display: "Sazzad (50463)" },
      { name: "Rafi", id: "45127", display: "Rafi (45127)" },
      { name: "Faiyaz", id: "54634", display: "Faiyaz (54634)" },
      { name: "Abdullah", id: "58102", display: "Abdullah (58102)" },
      { name: "Emon", id: "58279", display: "Emon (58279)" },
      { name: "Hashmi", id: "56880", display: "Hashmi (56880)" }
    ];

    const supervisors = (typeof MasterDataManager !== 'undefined') ? MasterDataManager.getSupervisors() : [
      { name: "Kamrul", id: "44819", display: "Kamrul (44819)" },
      { name: "Sazzad", id: "50463", display: "Sazzad (50463)" }
    ];

    const currentEng = task ? (task.assignee || task.engineer) : (engineers[0] ? engineers[0].display : "Sazzad (50463)");
    const currentSup = task ? (task.supervisor || "Kamrul (44819)") : "Kamrul (44819)";
    const currentCat = task ? (task.category || "Process development") : "Process development";
    const currentPts = (task && task.points !== undefined && task.points !== null && task.points !== "") ? task.points : "";
    const currentDetails = task ? (task.task_details || "") : "";

    const categories = (typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.CATEGORIES)
      ? MASTER_LISTS.CATEGORIES
      : ["Process development", "Ongoing Projects", "Completed Projects", "Quality improvement", "Cost reduction", "Safety improvement", "Capacity enhancement", "Maintenance & overhaul"];

    const availableMonths = workbookMgr.getAllMonths();

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm font-sans">
        <div class="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span class="text-xs font-mono uppercase tracking-wider text-red-600 font-bold">Fast Engineer Entry</span>
              <h2 class="text-xl font-extrabold text-slate-800 mt-0.5">${title}</h2>
              <p class="text-xs text-slate-400 mt-0.5">Enter Task Name and use AI to automatically generate milestone details.</p>
            </div>
            <button onclick="TaskFormView.close()" class="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Form Body -->
          <form id="simple-task-entry-form" onsubmit="TaskFormView.handleSubmit(event)" class="mt-5 space-y-4 text-xs">
            <input type="hidden" id="entry-task-id" value="${task ? task.task_id : ''}">

            <div class="grid grid-cols-2 gap-4">
              <!-- Month -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Reporting Month</label>
                <select id="entry-task-month" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-400 font-mono font-bold">
                  ${availableMonths.map(m => `<option value="${m}" ${currentMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>

              <!-- Category -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Category</label>
                <select id="entry-task-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-400">
                  ${categories.map(c => `<option value="${c}" ${currentCat === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Task Name -->
            <div>
              <label class="block font-bold text-slate-700 mb-1">
                Task Name <span class="text-red-500">*</span>
              </label>
              <input type="text" id="entry-task-name" required value="${task ? HELPERS.escapeHtml(task.task_name) : ''}" 
                     placeholder="e.g. Compressor Jacket Foil Cutting System Development" 
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-red-400 focus:bg-white shadow-sm" />
            </div>

            <!-- Task Details with AI Generation -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-slate-700">Task Details / Work Steps</label>
                <button type="button" onclick="TaskFormView.generateAiDetails(event)"
                        class="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded-lg transition">
                  <span>\u2728</span> <span>AI Generate Details</span>
                </button>
              </div>
              <textarea id="entry-task-details" rows="3"
                        placeholder="1. Study process requirements 2. Tooling fabrication 3. Production trial..."
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-400 resize-none">${HELPERS.escapeHtml(currentDetails)}</textarea>
            </div>

            <!-- Supervisor, Assignee & Task Point -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Supervisor</label>
                <select id="entry-task-supervisor" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-400 font-medium">
                  ${supervisors.map(s => `<option value="${s.display}" ${currentSup.startsWith(s.name) ? 'selected' : ''}>${s.display}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Assignee *</label>
                <select id="entry-task-engineer" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-400 font-bold">
                  ${engineers.map(e => `<option value="${e.display}" ${currentEng.startsWith(e.name) ? 'selected' : ''}>${e.display}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Task Point</label>
                <input type="number" id="entry-task-points" value="${currentPts}" placeholder="&mdash;" step="5" min="0" max="100"
                       class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono font-bold focus:outline-none focus:border-red-400" />
              </div>
            </div>

            <!-- Actions -->
            <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button type="button" onclick="TaskFormView.close()" class="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition shadow-sm">
                Cancel
              </button>
              <button type="submit" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-bold text-white shadow-lg shadow-red-200/50 transition">
                Save Task
              </button>
            </div>

          </form>

        </div>
      </div>
    `;
  },

  async handleSubmit(event) {
    event.preventDefault();
    const taskId = document.getElementById('entry-task-id').value.trim();
    const month = document.getElementById('entry-task-month').value.trim();
    const assignee = document.getElementById('entry-task-engineer').value.trim();
    const taskName = document.getElementById('entry-task-name').value.trim();
    const category = document.getElementById('entry-task-category').value;
    const taskDetails = document.getElementById('entry-task-details').value.trim();
    const supervisor = document.getElementById('entry-task-supervisor').value;
    const points = document.getElementById('entry-task-points').value;

    if (!taskName) {
      alert("Please enter a Task Name.");
      return;
    }

    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : new MonthWorkbookManager();

    try {
      if (taskId) {
        workbookMgr.updateTask(month, taskId, {
          task_name: taskName,
          assignee: assignee,
          engineer: assignee,
          category: category,
          task_details: taskDetails,
          supervisor: supervisor,
          points: points,
          last_updated: new Date().toISOString()
        });
      } else {
        workbookMgr.addTask(
          month,
          assignee,
          taskName,
          "YES",
          taskDetails,
          category,
          points,
          supervisor,
          { last_updated: new Date().toISOString() }
        );
      }

      // Automatically run synchronization for instant readiness
      if (window.appState && window.appState.syncEngine) {
        await window.appState.syncEngine.syncMonth(month);
      }

      this.close();

      // Refresh current view
      if (window.App && window.App.refreshCurrentTab) {
        window.App.refreshCurrentTab();
      } else if (typeof MonthlyInputView !== 'undefined') {
        MonthlyInputView.render();
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`Saved task: ${taskName}`, "success");
      }
    } catch (e) {
      alert("Error saving task: " + e.message);
    }
  },

  close() {
    const container = document.getElementById('task-form-modal-container');
    if (container) container.innerHTML = '';
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaskFormView;
} else if (typeof window !== 'undefined') {
  window.TaskFormView = TaskFormView;
}