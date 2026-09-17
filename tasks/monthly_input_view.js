/**
 * Process Development Monthly Report Automation System
 * Module: Monthly Input View (Excel Spreadsheet Grid Mode)
 * Replicates the structure and workflow of 'Process Task management entry 2025_2026.xlsx'
 * Features: Direct in-table editing, Drag & Drop Photo Attachments, Engineer Filter, Fast AI Milestone Generation
 * WALTON Hi-Tech Industries PLC
 */

const MonthlyInputView = {
  selectedMonth: "SEP-2026",
  filterEngineer: "",
  isRankingExpanded: false,

  toggleRanking() {
    this.isRankingExpanded = !this.isRankingExpanded;
    const panel = document.getElementById('ranking-table-collapsible');
    const btn = document.getElementById('ranking-toggle-btn');
    if (panel) {
      if (this.isRankingExpanded) {
        panel.classList.remove('hidden');
        panel.classList.add('block');
        if (btn) btn.innerHTML = `<span>Hide Details ▲</span>`;
      } else {
        panel.classList.remove('block');
        panel.classList.add('hidden');
        if (btn) btn.innerHTML = `<span>View Full Ranking Table ▼</span>`;
      }
    }
  },

  async handleMonthSelect(month) {
    this.selectedMonth = month;
    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.activeMonth = month;
    }
    await this.render();
  },

  handleEngineerFilter(engName) {
    this.filterEngineer = engName || "";
    this.render();
  },

  async handleInlineUpdate(taskId, field, value) {
    if (!window.appState || !window.appState.workbookMgr) return;
    try {
      if (typeof GoogleSheetsSync !== 'undefined') {
        GoogleSheetsSync._lastLocalEditTime = Date.now();
      }
      window.appState.workbookMgr.updateTask(this.selectedMonth, taskId, { [field]: value });
      
      // If Assignee was changed, re-render immediately so the task transfers to that respective concern engineer's tab!
      if (field === 'assignee' || field === 'engineer' || field === 'concern_engineer') {
        if (typeof window.showToast === 'function') {
          window.showToast(`Task assigned to ${value}`, 'info');
        }
        await this.render();
        return;
      }

      // Update summary cards without full re-render to keep focus
      this.updateEngineerSummary();
    } catch (e) {
      console.warn("Inline update notice:", e);
    }
  },

  async handlePhotoDrop(event, taskId) {
    event.preventDefault();
    event.stopPropagation();
    const zone = document.getElementById(`dropzone-${taskId}`);
    if (zone) zone.classList.remove('border-red-500', 'bg-red-50');

    const files = event.dataTransfer ? event.dataTransfer.files : null;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    try {
      await photoManager.savePhotoFile(taskId, 'before_photo', file);
      if (typeof window.showToast === 'function') {
        window.showToast(`📸 Photo attached to ${taskId}!`, "success");
      }
      await this.render();
    } catch (err) {
      alert("Failed to save photo: " + err.message);
    }
  },

  async handleRowPhotoUpload(event, taskId) {
    const files = event.target ? event.target.files : null;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      await photoManager.savePhotoFile(taskId, 'before_photo', file);
      if (typeof window.showToast === 'function') {
        window.showToast(`📸 Photo attached to ${taskId}!`, "success");
      }
      await this.render();
    } catch (err) {
      alert("Failed to save photo: " + err.message);
    }
  },

  async addNewRow(focusNew = false) {
    if (!window.appState || !window.appState.workbookMgr) return;
    if (typeof GoogleSheetsSync !== 'undefined') {
      GoogleSheetsSync._lastLocalEditTime = Date.now();
    }
    const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers)
      ? MasterDataManager.getEngineers()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS : []);
    const supervisors = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getSupervisors)
      ? MasterDataManager.getSupervisors()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.SUPERVISORS) ? MASTER_LISTS.SUPERVISORS : []);
    const categories = (typeof MasterDataManager !== 'undefined')
      ? MasterDataManager.getCategories()
      : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.CATEGORIES : []);

    const defaultEng = (engineers[0] && engineers[0].display) ? engineers[0].display : "Sazzad (50463)";
    const defaultSup = (supervisors[0] && supervisors[0].display) ? supervisors[0].display : "Kamrul (44819)";

    const newTask = window.appState.workbookMgr.addTask(
      this.selectedMonth,
      this.filterEngineer || defaultEng,
      "New Engineering Task",
      "YES",
      "",
      "Process development",
      "",
      defaultSup,
      { last_updated: new Date().toISOString() }
    );

    // Asynchronously synchronize in background without full page reload
    if (window.appState.syncEngine) {
      window.appState.syncEngine.syncMonth(this.selectedMonth).catch(e => console.warn("Sync notice:", e));
    }

    const tbody = document.getElementById('monthly-input-tbody');
    // If table already has rows rendered, insert smoothly into DOM without shaking/reloading the page!
    if (tbody && !tbody.querySelector('td[colspan]')) {
      const allTasks = window.appState.workbookMgr.getTasksForMonth(this.selectedMonth);
      const rowHtml = this.renderTaskRowHtml(newTask, allTasks.length - 1, allTasks.length, categories, engineers, supervisors);
      const tempTbody = document.createElement('tbody');
      tempTbody.innerHTML = rowHtml;
      const newTr = tempTbody.firstElementChild;
      if (newTr) {
        tbody.appendChild(newTr);
      }

      const counter = document.getElementById('total-rows-counter');
      if (counter) {
        counter.innerHTML = `Total ${allTasks.length} rows &bull; Press "⚡ SYNC INPUT DATA" to compile slides`;
      }

      this.updateEngineerSummary();

      if (focusNew && newTask && newTask.task_id) {
        setTimeout(() => {
          const inputElem = document.getElementById(`task-name-input-${newTask.task_id}`);
          if (inputElem) {
            inputElem.focus();
            inputElem.select();
            inputElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 50);
      }
    } else {
      await this.render();
      if (focusNew && newTask && newTask.task_id) {
        setTimeout(() => {
          const inputElem = document.getElementById(`task-name-input-${newTask.task_id}`);
          if (inputElem) {
            inputElem.focus();
            inputElem.select();
            inputElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 50);
      }
    }
  },

  toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.task-row-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = Boolean(checked);
    });
    this.updateBulkDeleteButton();
  },

  updateBulkDeleteButton() {
    const checked = document.querySelectorAll('.task-row-checkbox:checked');
    const delBtn = document.getElementById('bulk-delete-btn');
    const copyBtn = document.getElementById('bulk-copy-mgmt-btn');
    const countSpan = document.getElementById('selected-task-count');
    const copyCountSpan = document.getElementById('selected-mgmt-task-count');
    const selectAllCb = document.getElementById('task-select-all');

    if (countSpan) countSpan.textContent = checked.length;
    if (copyCountSpan) copyCountSpan.textContent = checked.length;

    if (delBtn) {
      if (checked.length > 0) {
        delBtn.classList.remove('hidden');
        delBtn.classList.add('inline-flex');
      } else {
        delBtn.classList.add('hidden');
        delBtn.classList.remove('inline-flex');
      }
    }

    if (copyBtn) {
      if (checked.length > 0) {
        copyBtn.classList.remove('hidden');
        copyBtn.classList.add('inline-flex');
      } else {
        copyBtn.classList.add('hidden');
        copyBtn.classList.remove('inline-flex');
      }
    }

    const allCheckboxes = document.querySelectorAll('.task-row-checkbox');
    if (selectAllCb && allCheckboxes.length > 0) {
      selectAllCb.checked = (checked.length === allCheckboxes.length);
    }
  },

  toggleManagementReportCopy(taskId) {
    if (!window.appState || !window.appState.workbookMgr) return;
    const task = window.appState.workbookMgr.getTask(this.selectedMonth, taskId);
    if (!task) return;

    const mgr = window.managementReportMgr || (typeof ManagementReportManager !== 'undefined' ? new ManagementReportManager() : null);
    if (!mgr) {
      alert("Management Report Manager is not initialized.");
      return;
    }

    const isCopied = mgr.isTaskInManagementReport ? mgr.isTaskInManagementReport(this.selectedMonth, task) : false;
    if (isCopied) {
      if (confirm(`Remove "${task.task_name}" from the Management Report (${this.selectedMonth})?`)) {
        mgr.deleteBySourceTaskId(this.selectedMonth, taskId, task.task_name);
        if (typeof window.showToast === 'function') {
          window.showToast(`Removed "${task.task_name}" from Management Report`, "info");
        } else {
          alert(`Removed "${task.task_name}" from Management Report`);
        }
        this.render();
      }
    } else {
      const result = mgr.copyFromMonthlyTask(this.selectedMonth, task);
      if (typeof window.showToast === 'function') {
        window.showToast(`👔 Copied "${task.task_name}" to Management Report!`, "success");
      } else {
        alert(`👔 Copied "${task.task_name}" to Management Report!`);
      }
      this.render();
    }
  },

  copyTaskToManagementReport(taskId) {
    return this.toggleManagementReportCopy(taskId);
  },

  copySelectedToManagementReport() {
    const checked = Array.from(document.querySelectorAll('.task-row-checkbox:checked'));
    if (checked.length === 0) return;

    if (!window.appState || !window.appState.workbookMgr) return;
    const mgr = window.managementReportMgr || (typeof ManagementReportManager !== 'undefined' ? new ManagementReportManager() : null);
    if (!mgr) return;

    const tasksToCopy = checked.map(cb => window.appState.workbookMgr.getTask(this.selectedMonth, cb.value)).filter(Boolean);
    const results = mgr.bulkCopyFromMonthlyTasks(this.selectedMonth, tasksToCopy);
    const newCopies = results.filter(r => !r.alreadyExists).length;

    if (typeof window.showToast === 'function') {
      window.showToast(`👔 Copied ${newCopies} task(s) to Management Report!`, "success");
    } else {
      alert(`👔 Copied ${newCopies} task(s) to Management Report!`);
    }

    // Uncheck checkboxes
    checked.forEach(cb => { cb.checked = false; });
    const selectAllCb = document.getElementById('task-select-all');
    if (selectAllCb) selectAllCb.checked = false;
    this.updateBulkDeleteButton();
    this.render();
  },

  async deleteSelectedTasks() {
    const checked = Array.from(document.querySelectorAll('.task-row-checkbox:checked'));
    if (checked.length === 0) return;

    const taskIds = checked.map(cb => cb.dataset.taskId);
    if (confirm(`Are you sure you want to delete ${taskIds.length} selected task(s) from ${this.selectedMonth}?`)) {
      if (!window.appState || !window.appState.workbookMgr) return;
      window.appState.workbookMgr.deleteMultipleTasks(this.selectedMonth, taskIds);

      if (window.appState.syncEngine) {
        await window.appState.syncEngine.syncMonth(this.selectedMonth);
      }

      await this.render();
      if (typeof window.showToast === 'function') {
        window.showToast(`🗑️ Deleted ${taskIds.length} task(s)`, "info");
      }
    }
  },

  fillPointDown(fromTaskId, forcedValue = null) {
    // Disabled & removed per user request
    return;
  },

  handlePointKeyDown(event, taskId) {
    // Ctrl + D: Excel Fill Down from cell above
    if (event.ctrlKey && (event.key === 'd' || event.key === 'D')) {
      event.preventDefault();
      if (!window.appState || !window.appState.workbookMgr) return;
      const tasks = window.appState.workbookMgr.getTasksForMonth(this.selectedMonth);
      const curIdx = tasks.findIndex(t => t.task_id === taskId);
      if (curIdx > 0) {
        const prevPoint = tasks[curIdx - 1].points;
        if (prevPoint !== undefined && prevPoint !== null && prevPoint !== "") {
          const input = document.getElementById(`task-point-${taskId}`);
          if (input) input.value = prevPoint;
          this.handleInlineUpdate(taskId, 'points', prevPoint);
          if (typeof window.showToast === 'function') {
            window.showToast(`Copied ${prevPoint} pts from row above (Ctrl+D)`, "info");
          }
        }
      }
    }
  },

  async handlePointPaste(event, taskId) {
    const clipboardData = (event.clipboardData || window.clipboardData);
    if (!clipboardData) return;
    const text = clipboardData.getData('text');
    if (!text) return;

    const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 1) {
      event.preventDefault();
      if (!window.appState || !window.appState.workbookMgr) return;
      const tasks = window.appState.workbookMgr.getTasksForMonth(this.selectedMonth);
      const startIdx = tasks.findIndex(t => t.task_id === taskId);
      if (startIdx === -1) return;

      let applied = 0;
      for (let i = 0; i < lines.length && (startIdx + i) < tasks.length; i++) {
        const val = parseFloat(lines[i]);
        if (!isNaN(val)) {
          window.appState.workbookMgr.updateTask(this.selectedMonth, tasks[startIdx + i].task_id, { points: val });
          applied++;
        }
      }

      if (window.appState.syncEngine) {
        await window.appState.syncEngine.syncMonth(this.selectedMonth);
      }
      await this.render();
      if (typeof window.showToast === 'function') {
        window.showToast(`📋 Pasted ${applied} points across rows!`, "success");
      }
    }
  },

  handleLastRowKeyNav(event, isLastRow) {
    if (isLastRow && (event.key === 'Tab' || event.key === 'Enter')) {
      setTimeout(() => {
        this.addNewRow(true);
      }, 50);
    }
  },

  openNewTaskModal() {
    if (typeof TaskFormView !== 'undefined') {
      TaskFormView.open(null, this.selectedMonth);
    } else {
      this.addNewRow();
    }
  },

  openAddMonthModal() {
    let container = document.getElementById('add-month-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'add-month-modal-container';
      document.body.appendChild(container);
    }

    const currentYear = new Date().getFullYear();
    const years = [2025, 2026, 2027, 2028, 2029, 2030];
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">📅</span>
              <div>
                <h3 class="text-base font-black text-slate-800">Create / Add New Month</h3>
                <p class="text-xs text-slate-400">Initialize a historical (from Jan 2025) or future month workbook</p>
              </div>
            </div>
            <button onclick="MonthlyInputView.closeAddMonthModal()" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
          </div>

          <div class="space-y-4 my-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 font-mono mb-1">Select Month:</label>
              <select id="new-month-select" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-red-500">
                ${months.map(m => `<option value="${m}">${m}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 font-mono mb-1">Select Year:</label>
              <select id="new-year-select" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-red-500">
                ${years.map(y => `<option value="${y}" ${y === 2027 ? 'selected' : ''}>${y}</option>`).join('')}
              </select>
            </div>
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800">
              💡 The new month will be available for task entry, spreadsheet input, photos, and monthly presentation reports.
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onclick="MonthlyInputView.closeAddMonthModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Cancel
            </button>
            <button onclick="MonthlyInputView.confirmAddMonth()" class="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-bold text-white shadow-md transition">
              ➕ Create &amp; Open
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closeAddMonthModal() {
    const container = document.getElementById('add-month-modal-container');
    if (container) container.innerHTML = '';
  },

  async confirmAddMonth() {
    const mSelect = document.getElementById('new-month-select');
    const ySelect = document.getElementById('new-year-select');
    if (!mSelect || !ySelect || !window.appState || !window.appState.workbookMgr) return;

    const monthCode = `${mSelect.value}-${ySelect.value}`;
    window.appState.workbookMgr.createMonth(monthCode);
    this.closeAddMonthModal();
    await this.handleMonthSelect(monthCode);

    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Successfully created month: ${monthCode}!`, "success");
    }
  },

  /**
   * AI-generates realistic 3-4 milestone steps for a specific task row
   * Reads current input value and falls back seamlessly if offline
   * @param {string} taskId
   */
  async generateTaskDetails(taskId) {
    if (!window.appState || !window.appState.workbookMgr) return;
    
    // Check DOM input first in case user typed without blurring
    const domNameInput = document.getElementById(`task-name-input-${taskId}`);
    let taskName = domNameInput ? domNameInput.value.trim() : "";
    
    const task = window.appState.workbookMgr.getTask(this.selectedMonth, taskId);
    if (!taskName && task) {
      taskName = (task.task_name || "").trim();
    }

    if (!taskName || taskName.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast("Please enter a Task Name first before generating AI details.", "warning");
      } else {
        alert("Please enter a Task Name first before generating AI details.");
      }
      if (domNameInput) domNameInput.focus();
      return;
    }

    // Save task name to workbook if updated in DOM
    if (task && taskName !== task.task_name) {
      window.appState.workbookMgr.updateTask(this.selectedMonth, taskId, { task_name: taskName });
    }

    const btn = document.getElementById(`ai-btn-${taskId}`);
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = `<span>⏳</span><span>AI...</span>`;
      btn.disabled = true;
    }

    try {
      let steps = "";
      const category = (task && task.category) ? task.category : "Process development";

      // Try Gemini AI client
      try {
        if (window.appState.aiClient && window.appState.aiClient.generateTaskSteps) {
          steps = await window.appState.aiClient.generateTaskSteps(taskName, category);
        }
      } catch (aiErr) {
        console.warn("AI generation network fallback:", aiErr);
      }

      // Robust fallback to prompt templates
      if (!steps && typeof PROMPT_TEMPLATES !== 'undefined' && PROMPT_TEMPLATES.generateEngineeringSteps) {
        steps = PROMPT_TEMPLATES.generateEngineeringSteps(taskName, category);
      }
      if (!steps) {
        steps = "1. Process requirement study & technical design 2. Tooling fabrication & wiring 3. Calibration, safety check & production trial run 4. Handover to production with SOP";
      }

      window.appState.workbookMgr.updateTask(this.selectedMonth, taskId, { task_details: steps });
      
      // Update input field in DOM with visual pulse feedback
      const inputElem = document.getElementById(`task-details-input-${taskId}`);
      if (inputElem) {
        inputElem.value = steps;
        inputElem.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-50');
        setTimeout(() => {
          inputElem.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-50');
        }, 1800);
      }

      try {
        if (window.appState.syncEngine) {
          await window.appState.syncEngine.syncMonth(this.selectedMonth);
        }
      } catch (syncErr) {
        console.warn("Sync notice:", syncErr);
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`✨ AI generated steps for ${taskId}!`, "success");
      }
    } catch (err) {
      console.error("AI details error:", err);
      alert("Failed to generate task details: " + err.message);
    } finally {
      if (btn) {
        btn.innerHTML = originalContent || `<span>✨</span><span>AI</span>`;
        btn.disabled = false;
      }
    }
  },

  /**
   * Bulk generates AI steps for all tasks in the active month with empty details
   */
  async generateAllTaskDetails() {
    if (!window.appState || !window.appState.workbookMgr) return;
    const tasks = window.appState.workbookMgr.getTasksForMonth(this.selectedMonth);
    const emptyTasks = tasks.filter(t => {
      if (!t.task_details || t.task_details.trim().length === 0) return true;
      const lower = t.task_details.toLowerCase();
      if (lower.includes("e.g.")) return true;
      if (lower.includes("study process requirement") || lower.includes("process requirement")) return true;
      return false;
    });

    if (emptyTasks.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast("All tasks already have details filled in!", "info");
      } else {
        alert("All tasks already have details filled in!");
      }
      return;
    }

    const btn = document.getElementById('ai-fill-all-btn');
    if (btn) {
      btn.innerHTML = `<span>⏳</span><span>Filling ${emptyTasks.length}...</span>`;
      btn.disabled = true;
    }

    let count = 0;
    for (const t of emptyTasks) {
      if (!t.task_name || t.task_name.trim().length === 0) continue;
      let steps = "";
      try {
        if (window.appState.aiClient && window.appState.aiClient.generateTaskSteps) {
          steps = await window.appState.aiClient.generateTaskSteps(t.task_name, t.category);
        }
      } catch (e) {
        // Fallback
      }
      if (!steps && typeof PROMPT_TEMPLATES !== 'undefined' && PROMPT_TEMPLATES.generateEngineeringSteps) {
        steps = PROMPT_TEMPLATES.generateEngineeringSteps(t.task_name, t.category);
      }
      if (steps) {
        window.appState.workbookMgr.updateTask(this.selectedMonth, t.task_id, { task_details: steps });
        count++;
      }
    }

    if (window.appState.syncEngine) {
      await window.appState.syncEngine.syncMonth(this.selectedMonth);
    }

    await this.render();

    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Generated milestone steps for ${count} tasks!`, "success");
    }
  },

  async toggleInclude(taskId) {
    if (!window.appState || !window.appState.workbookMgr) return;
    window.appState.workbookMgr.toggleInclude(this.selectedMonth, taskId);
    if (window.appState.syncEngine) {
      await window.appState.syncEngine.syncMonth(this.selectedMonth);
    }
    await this.render();
  },

  async deleteTask(taskId) {
    if (!window.appState || !window.appState.workbookMgr) return;
    if (confirm(`Are you sure you want to delete task ${taskId}?`)) {
      window.appState.workbookMgr.deleteTask(this.selectedMonth, taskId);
      if (window.appState.syncEngine) {
        await window.appState.syncEngine.syncMonth(this.selectedMonth);
      }
      await this.render();
      if (typeof window.showToast === 'function') {
        window.showToast(`Deleted ${taskId}`, "info");
      }
    }
  },

  async triggerSync() {
    const btn = document.getElementById('sync-btn-input');
    if (btn) btn.innerHTML = `<span>⏳</span><span>Syncing...</span>`;

    try {
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getWebAppUrl()) {
        await GoogleSheetsSync.pullFromCloud(true);
      }
      if (window.appState && window.appState.syncEngine) {
        const res = await window.appState.syncEngine.syncMonth(this.selectedMonth);
        if (typeof window.showToast === 'function') {
          window.showToast(`✅ Synced with Cloud & Slides! Total: ${res.total_tasks} tasks`, "success");
        } else {
          alert(`✅ Synchronized ${res.month}!\n• Tasks: ${res.total_tasks}\n• Added: ${res.added}\n• Updated: ${res.updated}\n• Active Slides: ${res.active_slides}`);
        }
        await this.render();
      }
    } catch (e) {
      alert("Sync error: " + e.message);
    } finally {
      if (btn) btn.innerHTML = `<span class="text-amber-500">⚡</span> <span>SYNC INPUT DATA</span>`;
    }
  },

  exportToExcel() {
    if (!window.appState || !window.appState.workbookMgr) return;
    const tasks = window.appState.workbookMgr.getTasksForMonth(this.selectedMonth);
    
    if (typeof XLSX === 'undefined') {
      alert("SheetJS library is loading. Please try again.");
      return;
    }

    const rows = [
      ["Process Task Management Entry - Walton AC Process Development"],
      [`Month: ${this.selectedMonth}`, `Exported: ${new Date().toLocaleDateString()}`],
      [],
      ["SL", "Task ID", "Engineer", "Task Name", "Task Details / Steps", "Category", "Points", "Include in Report"]
    ];

    tasks.forEach((t, idx) => {
      rows.push([
        idx + 1,
        t.task_id,
        t.engineer,
        t.task_name,
        t.task_details || "",
        t.category,
        t.points || 50,
        t.include_in_report !== "NO" ? "YES" : "NO"
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, this.selectedMonth);
    XLSX.writeFile(wb, `Process_Task_management_entry_${this.selectedMonth}.xlsx`);
  },

  parseExcelClipboard(text, defaultEngineer = "") {
    if (!text || typeof text !== 'string') return [];

    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return [];

    const parsedTasks = [];
    const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers())
      ? MasterDataManager.getEngineers()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS : []);
    const engNames = engineers.map(e => e.name.toLowerCase());
    const fallbackEng = defaultEngineer || (engineers[0] ? engineers[0].name : "Sazzad");
    const fallbackSup = "Sazzad(50463)";

    let colMap = { sl: -1, eng: -1, name: -1, details: -1, cat: -1, pts: -1, sup: -1, assignee: -1 };
    let hasHeader = false;

    // Check first line for header keywords
    const firstLineCells = lines[0].split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const firstLineLower = firstLineCells.map(c => c.toLowerCase());

    const hasHeaderKeywords = firstLineLower.some(c => 
      c.includes("engineer") || c.includes("task name") || c.includes("task_name") ||
      c.includes("task") || c.includes("detail") || c.includes("step") ||
      c.includes("category") || c.includes("point") || c.includes("pts") || c.includes("sl") ||
      c.includes("supervisor") || c.includes("assignee")
    );

    if (hasHeaderKeywords) {
      hasHeader = true;
      firstLineLower.forEach((col, idx) => {
        if (col === "sl" || col === "no" || col === "#" || col.includes("serial")) colMap.sl = idx;
        else if (col.includes("supervisor") || col.includes("lead")) colMap.sup = idx;
        else if (col.includes("assignee")) colMap.assignee = idx;
        else if (col.includes("engineer") || col.includes("concern")) {
          if (colMap.assignee === -1) colMap.assignee = idx;
          colMap.eng = idx;
        }
        else if (col.includes("task name") || col.includes("task") || col.includes("title")) {
          if (colMap.name === -1) colMap.name = idx;
        } else if (col.includes("detail") || col.includes("step") || col.includes("description")) colMap.details = idx;
        else if (col.includes("category") || col.includes("type") || col.includes("section")) colMap.cat = idx;
        else if (col.includes("point") || col.includes("pts") || col.includes("score")) colMap.pts = idx;
      });
    }

    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = lines[i].split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cells.length === 0 || cells.every(c => c === "")) continue;

      let eng = fallbackEng;
      let sup = fallbackSup;
      let name = "";
      let details = "";
      let cat = "Process development";
      let pts = "";

      if (hasHeader && colMap.name !== -1) {
        if (colMap.assignee !== -1 && cells[colMap.assignee]) eng = cells[colMap.assignee];
        else if (colMap.eng !== -1 && cells[colMap.eng]) eng = cells[colMap.eng];
        if (colMap.sup !== -1 && cells[colMap.sup]) sup = cells[colMap.sup];
        if (colMap.name !== -1 && cells[colMap.name]) name = cells[colMap.name];
        if (colMap.details !== -1 && cells[colMap.details]) details = cells[colMap.details];
        if (colMap.cat !== -1 && cells[colMap.cat]) cat = cells[colMap.cat];
        if (colMap.pts !== -1 && cells[colMap.pts] !== undefined && cells[colMap.pts].trim() !== "") {
          const num = parseFloat(cells[colMap.pts]);
          pts = isNaN(num) ? "" : num;
        }
      } else {
        // Positional heuristic when no header row is copied
        let workingCells = [...cells];
        // If first column is purely numeric SL (1, 2, 3...), strip it
        if (/^\d+$/.test(workingCells[0]) && workingCells.length > 1) {
          workingCells.shift();
        }

        // Check if layout matches Image 1: [Task Name] [Task Details] [Category] [Task Point] [Supervisor] [Assignee]
        if (workingCells.length >= 6) {
          name = workingCells[0] || "";
          details = workingCells[1] || "";
          cat = workingCells[2] || "Process development";
          const parsedNum = parseFloat(workingCells[3]);
          pts = isNaN(parsedNum) ? "" : parsedNum;
          sup = workingCells[4] || fallbackSup;
          eng = workingCells[5] || fallbackEng;
        } else if (workingCells.length > 1 && engNames.some(en => workingCells[0].toLowerCase().includes(en))) {
          eng = workingCells[0];
          name = workingCells[1] || "";
          details = workingCells[2] || "";
          cat = workingCells[3] || "Process development";
          if (workingCells[4] && workingCells[4].trim() !== "") {
            const num = parseFloat(workingCells[4]);
            pts = isNaN(num) ? "" : num;
          }
        } else {
          name = workingCells[0] || "";
          details = workingCells[1] || "";
          if (workingCells[2]) {
            if (!isNaN(parseFloat(workingCells[2]))) {
              pts = parseFloat(workingCells[2]);
              cat = workingCells[3] || "Process development";
            } else {
              cat = workingCells[2];
              if (workingCells[3] && workingCells[3].trim() !== "") {
                const num = parseFloat(workingCells[3]);
                pts = isNaN(num) ? "" : num;
              }
            }
          }
        }
      }

      name = name.trim();
      if (name.length > 0) {
        const personnelList = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getAllPersonnel)
          ? MasterDataManager.getAllPersonnel()
          : [];

        let assigneeDisplay = eng || fallbackEng;
        let engineerName = eng || fallbackEng;

        if (personnelList.length > 0) {
          const matchedEng = personnelList.find(p => 
            p.display.toLowerCase() === eng.toLowerCase() || 
            p.name.toLowerCase() === eng.toLowerCase() || 
            eng.toLowerCase().includes(p.name.toLowerCase())
          );
          if (matchedEng) {
            assigneeDisplay = matchedEng.display;
            engineerName = matchedEng.name;
          }

          const matchedSup = personnelList.find(p => 
            p.display.toLowerCase() === sup.toLowerCase() || 
            p.name.toLowerCase() === sup.toLowerCase() || 
            sup.toLowerCase().includes(p.name.toLowerCase())
          );
          if (matchedSup) sup = matchedSup.display;
        } else {
          // Fallback if MasterDataManager is not available
          const matchedEng = engineers.find(e => e.name.toLowerCase() === eng.toLowerCase() || eng.toLowerCase().includes(e.name.toLowerCase()));
          if (matchedEng) {
            assigneeDisplay = matchedEng.display || matchedEng.name;
            engineerName = matchedEng.name;
          }
        }

        parsedTasks.push({
          engineer: engineerName,
          assignee: assigneeDisplay,
          supervisor: sup || fallbackSup,
          task_name: name,
          task_details: details.replace(/\\n/g, '\n'),
          category: cat || "Process development",
          points: pts,
          include_in_report: "YES"
        });
      }
    }

    return parsedTasks;
  },

  openPasteModal(initialText = '') {
    let modal = document.getElementById('bulk-paste-modal-container');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bulk-paste-modal-container';
      document.body.appendChild(modal);
    }

    const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers())
      ? MasterDataManager.getEngineers()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS : []);

    const defaultEng = this.filterEngineer || (engineers[0] ? engineers[0].name : "Sazzad");

    modal.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
        <div class="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 flex flex-col max-h-[92vh] overflow-y-auto">
          
          <!-- Header Bar -->
          <div class="flex items-start justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                📋
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white shadow-sm">
                    EXCEL BULK PASTE
                  </span>
                  <span class="text-xs font-bold text-slate-700 font-mono">
                    Target Month: ${this.selectedMonth}
                  </span>
                </div>
                <h2 class="text-lg sm:text-xl font-black text-slate-800 mt-1">
                  Copy &amp; Paste Tasks from Excel
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">
                  Select rows in your Excel file, press <kbd class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">Ctrl+C</kbd>, then paste below with <kbd class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">Ctrl+V</kbd>. New rows are automatically generated!
                </p>
              </div>
            </div>

            <button onclick="MonthlyInputView.closePasteModal()" class="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Controls: Default Engineer & Import Mode -->
          <div class="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-slate-600 font-mono">Default Concern Engineer:</span>
              <select id="bulk-paste-default-eng" onchange="MonthlyInputView.updatePastePreview()" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-red-400 shadow-sm">
                ${engineers.map(e => `<option value="${e.name}" ${e.name === defaultEng ? 'selected' : ''}>${e.name}</option>`).join('')}
              </select>
            </div>

            <div class="flex items-center gap-4 text-xs font-semibold text-slate-700">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="paste-mode" value="append" checked class="text-red-600 focus:ring-red-400">
                <span>➕ Append Rows</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="paste-mode" value="replace" class="text-red-600 focus:ring-red-400">
                <span>🔄 Replace Month Tasks</span>
              </label>
            </div>
          </div>

          <!-- Textarea for paste -->
          <div class="mt-4">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-slate-700 font-mono">Paste Excel Cells Here:</span>
              <span class="text-[11px] text-slate-400 font-mono">Accepts copied cells directly from Excel (Tab-delimited)</span>
            </div>
            <textarea id="bulk-paste-textarea" rows="6" oninput="MonthlyInputView.updatePastePreview()"
              placeholder="Paste cells here (Ctrl+V)...&#10;Columns supported: [SL] [Engineer] [Task Name] [Details / Steps] [Category] [Points]"
              class="w-full bg-slate-50/70 border border-slate-300 rounded-2xl p-3.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition resize-y"></textarea>
          </div>

          <!-- Live Preview Section -->
          <div class="mt-4">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-700 font-mono uppercase">Live Parsed Preview</span>
                <span id="bulk-paste-count-badge" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  0 Tasks Detected
                </span>
              </div>
              <span class="text-[11px] text-slate-400">Header row is automatically detected and skipped</span>
            </div>

            <div id="bulk-paste-preview-table-wrapper" class="max-h-56 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50">
              <div class="p-6 text-center text-xs text-slate-400 font-mono">
                Paste copied Excel data above to preview task rows.
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
            <button onclick="MonthlyInputView.closePasteModal()" class="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Cancel
            </button>
            <button id="bulk-paste-confirm-btn" onclick="MonthlyInputView.confirmBulkPaste()" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-black text-white shadow-lg shadow-red-200/50 transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed" disabled>
              <span>✅</span> <span>Insert Tasks into Grid</span>
            </button>
          </div>

        </div>
      </div>
    `;

    if (initialText) {
      const ta = document.getElementById('bulk-paste-textarea');
      if (ta) {
        ta.value = initialText;
        this.updatePastePreview();
      }
    } else {
      setTimeout(() => {
        const ta = document.getElementById('bulk-paste-textarea');
        if (ta) ta.focus();
      }, 100);
    }
  },

  closePasteModal() {
    const modal = document.getElementById('bulk-paste-modal-container');
    if (modal) modal.innerHTML = '';
  },

  updatePastePreview() {
    const textarea = document.getElementById('bulk-paste-textarea');
    const defaultEngSelect = document.getElementById('bulk-paste-default-eng');
    const previewWrapper = document.getElementById('bulk-paste-preview-table-wrapper');
    const countBadge = document.getElementById('bulk-paste-count-badge');
    const confirmBtn = document.getElementById('bulk-paste-confirm-btn');

    if (!textarea || !previewWrapper) return;

    const text = textarea.value;
    const defaultEng = defaultEngSelect ? defaultEngSelect.value : "Sazzad";
    const parsed = this.parseExcelClipboard(text, defaultEng);

    if (countBadge) {
      countBadge.textContent = `${parsed.length} Task${parsed.length === 1 ? '' : 's'} Detected`;
      if (parsed.length > 0) {
        countBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200';
      } else {
        countBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200';
      }
    }

    if (confirmBtn) {
      confirmBtn.disabled = parsed.length === 0;
      confirmBtn.innerHTML = `<span>✅</span> <span>Insert ${parsed.length} Task${parsed.length === 1 ? '' : 's'} into Grid</span>`;
    }

    if (parsed.length === 0) {
      previewWrapper.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400 font-mono">
          Paste copied Excel data above to preview task rows.
        </div>
      `;
      return;
    }

    previewWrapper.innerHTML = `
      <table class="w-full text-left text-xs border-collapse">
        <thead class="bg-slate-100 text-slate-600 font-mono uppercase text-[10px] sticky top-0 border-b border-slate-200">
          <tr>
            <th class="py-2 px-3 w-10 text-center">#</th>
            <th class="py-2 px-3 w-28">Engineer</th>
            <th class="py-2 px-3 w-48">Task Name</th>
            <th class="py-2 px-3">Details / Steps</th>
            <th class="py-2 px-3 w-32">Category</th>
            <th class="py-2 px-3 w-16 text-center">Pts</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          ${parsed.map((t, idx) => `
            <tr class="hover:bg-red-50/30">
              <td class="py-2 px-3 text-center font-mono text-slate-400">${idx + 1}</td>
              <td class="py-2 px-3 font-semibold text-slate-700">${HELPERS.escapeHtml(t.engineer)}</td>
              <td class="py-2 px-3 font-bold text-slate-800">${HELPERS.escapeHtml(t.task_name)}</td>
              <td class="py-2 px-3 text-slate-600 truncate max-w-xs" title="${HELPERS.escapeHtml(t.task_details)}">${HELPERS.escapeHtml(t.task_details || '-')}</td>
              <td class="py-2 px-3 text-slate-500 font-mono text-[11px]">${HELPERS.escapeHtml(t.category)}</td>
              <td class="py-2 px-3 text-center font-mono font-bold text-amber-600">${(t.points !== "" && t.points !== undefined && t.points !== null) ? t.points : '<span class="text-slate-300 font-normal">—</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  async confirmBulkPaste() {
    const textarea = document.getElementById('bulk-paste-textarea');
    const defaultEngSelect = document.getElementById('bulk-paste-default-eng');
    const modeInputs = document.getElementsByName('paste-mode');

    if (!textarea || !window.appState || !window.appState.workbookMgr) return;

    const defaultEng = defaultEngSelect ? defaultEngSelect.value : "Sazzad";
    const parsed = this.parseExcelClipboard(textarea.value, defaultEng);
    if (parsed.length === 0) {
      alert("No valid tasks found in pasted text.");
      return;
    }

    let mode = 'append';
    for (const r of modeInputs) {
      if (r.checked) mode = r.value;
    }

    if (mode === 'replace') {
      if (!confirm(`Are you sure you want to replace ALL tasks in ${this.selectedMonth} with these ${parsed.length} tasks?`)) {
        return;
      }
      if (window.appState.workbookMgr.workbooks) {
        window.appState.workbookMgr.workbooks[this.selectedMonth] = [];
      }
    }

    for (const t of parsed) {
      window.appState.workbookMgr.addTask(
        this.selectedMonth,
        t.assignee || t.engineer,
        t.task_name,
        t.include_in_report || "YES",
        t.task_details || "",
        t.category || "Process development",
        (t.points !== "" && t.points !== undefined && t.points !== null) ? t.points : "",
        t.supervisor || "Sazzad(50463)"
      );
    }

    if (window.appState.syncEngine) {
      await window.appState.syncEngine.syncMonth(this.selectedMonth);
    }

    this.closePasteModal();
    await this.render();

    if (typeof window.showToast === 'function') {
      window.showToast(`📋 Successfully imported ${parsed.length} tasks from Excel!`, "success");
    } else {
      alert(`Successfully imported ${parsed.length} tasks from Excel!`);
    }
  },

  async deleteRowPhoto(taskId) {
    if (confirm(`Are you sure you want to delete photos for task ${taskId}?`)) {
      if (typeof photoManager !== 'undefined') {
        await photoManager.removePhoto(taskId, 'before_photo');
        await photoManager.removePhoto(taskId, 'after_photo');
        await photoManager.removePhoto(taskId, 'photo_1');
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`Photos removed for ${taskId}`, "info");
      }
      await this.render();
    }
  },

  openPhotoStudio(taskId = null) {
    if (typeof PhotoViewModal !== 'undefined') {
      const tasks = (window.appState && window.appState.workbookMgr)
        ? window.appState.workbookMgr.getTasksForMonth(this.selectedMonth)
        : [];
      const targetId = taskId || ((tasks.length > 0) ? tasks[0].task_id : null);
      PhotoViewModal.open(targetId, this.selectedMonth);
    }
  },

  updateRankingTable() {
    const container = document.getElementById('ranking-table-container');
    if (!container || !window.appState || !window.appState.workbookMgr) return;

    const rankingData = window.appState.workbookMgr.calculatePointsRanking(this.selectedMonth);
    const { ranking, totalTasksSum, totalWbsSum, totalActualSum } = rankingData;

    container.innerHTML = this.renderRankingTableHtml(ranking, totalTasksSum, totalWbsSum);

    // Update KPI badges if DOM elements exist
    const kpiTasks = document.getElementById('kpi-total-tasks-val');
    if (kpiTasks) kpiTasks.textContent = totalTasksSum;
    const kpiPoints = document.getElementById('kpi-total-points-val');
    if (kpiPoints) kpiPoints.textContent = totalActualSum;
    const kpiWbs = document.getElementById('kpi-total-wbs-val');
    if (kpiWbs) kpiWbs.textContent = totalWbsSum;
    const kpiTop = document.getElementById('kpi-top-engineer-val');
    if (kpiTop && ranking.length > 0) kpiTop.textContent = `${ranking[0].name} (${ranking[0].total_point} pts)`;
  },

  renderTaskRowHtml(t, idx, totalCount, categories, engineers, supervisors, copiedSourceIds = null, copiedNames = null) {
    const photos = (typeof photoManager !== 'undefined') ? photoManager.getTaskPhotos(t.task_id) : {};
    const rawThumb = (photos && (photos.before_photo || photos.photo_1 || photos.after_photo)) || t.photo_1 || t.photo_2;
    const hasPhoto = Boolean(rawThumb);
    const thumb = rawThumb;
    const currentSup = HELPERS.formatPersonnelName(t.supervisor || "Kamrul (44819)");
    const currentAssignee = HELPERS.formatPersonnelName(t.assignee || t.engineer || (engineers[0] ? engineers[0].display : "Sazzad (50463)"));
    const isLastRow = (idx === totalCount - 1);

    // Determine whether task is in Executive Management Report
    let isCopied = false;
    if (copiedSourceIds && copiedSourceIds.has(t.task_id)) {
      isCopied = true;
    } else if (copiedNames && copiedNames.has((t.task_name || '').trim().toLowerCase())) {
      isCopied = true;
    } else if (window.managementReportMgr && window.managementReportMgr.isTaskInManagementReport) {
      isCopied = window.managementReportMgr.isTaskInManagementReport(this.selectedMonth, t);
    }

    return `
      <tr class="hover:bg-slate-50/80 transition group">
        <!-- Checkbox Selection -->
        <td class="py-2.5 px-2 text-center border-r border-slate-200 align-middle">
          <input type="checkbox" class="task-row-checkbox w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                 data-task-id="${t.task_id}" onchange="MonthlyInputView.updateBulkDeleteButton()" />
        </td>

        <!-- SL -->
        <td class="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-200 font-bold align-middle">
          ${idx + 1}
        </td>

        <!-- Task Name (Full Visibility Auto-adjusting Textarea) -->
        <td class="py-2 px-2 border-r border-slate-200 align-middle">
          <textarea id="task-name-input-${t.task_id}" rows="1"
                    oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px';"
                    onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'task_name', this.value)"
                    class="w-full bg-white border border-transparent group-hover:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-100 resize-none overflow-hidden leading-snug block transition"
                    placeholder="Enter Task Name...">${HELPERS.escapeHtml(t.task_name)}</textarea>
        </td>

        <!-- Task Details / Steps (Editable Text with Docked AI Button) -->
        <td class="py-2 px-2 border-r border-slate-200 align-middle">
          <div class="relative flex items-center">
            <input type="text" id="task-details-input-${t.task_id}" value="${HELPERS.escapeHtml(t.task_details || '')}"
                   placeholder="1. Design 2. Handover 3. Fabrication..."
                   onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'task_details', this.value)"
                   class="w-full bg-white border border-transparent group-hover:border-slate-300 rounded-lg pl-2.5 pr-14 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-100 transition" />
            <button id="ai-btn-${t.task_id}" type="button" onclick="MonthlyInputView.generateTaskDetails('${t.task_id}')"
                    title="Auto-generate engineering steps with AI"
                    class="absolute right-1 px-2 py-1 rounded bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-[10px] font-black text-white shadow-sm flex items-center gap-1 transition">
              <span>✨</span><span>AI</span>
            </button>
          </div>
        </td>

        <!-- Category Dropdown -->
        <td class="py-2 px-2 border-r border-slate-200 align-middle">
          <select onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'category', this.value)"
                  class="w-full bg-white border border-transparent group-hover:border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-red-500">
            ${categories.map(c => `<option value="${c}" ${t.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </td>

        <!-- Task Point (Centered, Clean, No Fill Down Button per User Request) -->
        <td class="py-2 px-2 text-center bg-[#D4EDDA]/60 border-r border-slate-200 align-middle">
          <div class="flex items-center justify-center">
            <input type="number" id="task-point-${t.task_id}" value="${(t.points !== undefined && t.points !== null && t.points !== '') ? t.points : ''}"
                   placeholder="—" title="Task Point (0-100)" step="5" min="0" max="100"
                   onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'points', this.value)"
                   class="w-16 text-center bg-white/90 border border-emerald-300 hover:border-emerald-500 rounded-lg px-1.5 py-1.5 text-xs font-mono font-black text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm placeholder:text-slate-400" />
          </div>
        </td>

        <!-- Supervisor Dropdown (Kamrul default, Kamrul and Sazzad only) -->
        <td class="py-2 px-2 border-r border-slate-200 align-middle">
          <select onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'supervisor', this.value)"
                  class="w-full bg-white border border-transparent group-hover:border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-red-500">
            ${supervisors.map(s => {
              const isSel = (currentSup === s.display || currentSup === s.name || (!t.supervisor && s.name === 'Kamrul'));
              return `<option value="${s.display}" ${isSel ? 'selected' : ''}>${s.display}</option>`;
            }).join('')}
          </select>
        </td>

        <!-- Assignee Dropdown (7 removed engineers excluded) -->
        <td class="py-2 px-2 border-r border-slate-200 align-middle">
          <select onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'assignee', this.value)"
                  class="w-full bg-white border border-transparent group-hover:border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-red-500">
            ${engineers.map(e => {
              const isSel = (currentAssignee === e.display || currentAssignee === e.name);
              return `<option value="${e.display}" ${isSel ? 'selected' : ''}>${e.display}</option>`;
            }).join('')}
          </select>
        </td>

        <!-- Direct Drag & Drop Photo Attachment / Interactive Studio -->
        <td class="py-2 px-2 border-r border-slate-200 align-middle">
          ${hasPhoto ? `
            <div class="flex items-center justify-between gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <div class="flex items-center gap-1.5 overflow-hidden cursor-pointer" onclick="photoViewModal.open('${t.task_id}')" title="Click to view & edit in Photo Studio">
                <img src="${thumb}" class="w-7 h-7 rounded-lg object-cover border border-slate-200 flex-shrink-0">
                <span class="text-[10px] text-emerald-600 font-bold font-mono">Attached</span>
              </div>
              <div class="flex items-center gap-0.5">
                <button onclick="photoViewModal.open('${t.task_id}')" title="Open Photo Studio (Replace / Manage)" class="text-xs text-slate-500 hover:text-slate-900 p-1 rounded hover:bg-slate-200 transition">
                  📷
                </button>
                <button onclick="MonthlyInputView.deleteRowPhoto('${t.task_id}')" title="Delete Photo" class="text-xs text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition">
                  🗑️
                </button>
              </div>
            </div>
          ` : `
            <div id="dropzone-${t.task_id}"
                 ondragover="event.preventDefault(); this.classList.add('border-red-500', 'bg-red-50');"
                 ondragleave="this.classList.remove('border-red-500', 'bg-red-50');"
                 ondrop="MonthlyInputView.handlePhotoDrop(event, '${t.task_id}')"
                 class="border border-dashed border-slate-300 hover:border-red-400 rounded-xl p-1 flex items-center justify-between gap-1 transition bg-slate-50/50">
              <label for="row-file-${t.task_id}" class="cursor-pointer flex items-center justify-center gap-1 text-[10px] text-slate-500 hover:text-red-600 font-medium py-0.5 px-1 flex-1">
                <span>📸</span> <span>Upload</span>
              </label>
              <button onclick="photoViewModal.open('${t.task_id}')" title="Open in Photo Studio" class="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded text-xs">
                🖼️
              </button>
              <input type="file" id="row-file-${t.task_id}" accept="image/*" class="hidden" onchange="MonthlyInputView.handleRowPhotoUpload(event, '${t.task_id}')">
            </div>
          `}
        </td>

        <!-- Report Inclusion Toggle -->
        <td class="py-2.5 px-3 text-center whitespace-nowrap border-r border-slate-200 align-middle">
          <button onclick="MonthlyInputView.toggleInclude('${t.task_id}')" class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition ${
            t.include_in_report !== 'NO'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-black'
              : 'bg-slate-50 text-slate-400 border border-slate-200'
          }">
            ${t.include_in_report !== 'NO' ? 'YES' : 'NO'}
          </button>
        </td>

        <!-- Actions: Copy to Management Report & Delete Row -->
        <td class="py-2.5 px-2 text-center whitespace-nowrap align-middle">
          <div class="flex items-center justify-center gap-1.5">
            ${isCopied ? `
              <button onclick="MonthlyInputView.toggleManagementReportCopy('${t.task_id}')" 
                      title="This task is included in Executive Management Report (${this.selectedMonth}). Click to remove." 
                      class="group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-rose-50 border border-indigo-200 hover:border-rose-200 transition text-[10px] font-bold shadow-xs cursor-pointer">
                <span class="text-indigo-700 group-hover:hidden flex items-center gap-1 font-black">
                  <span>👔</span> <span>Copied</span> <span class="text-[9px] text-emerald-600 font-black">✔</span>
                </span>
                <span class="hidden group-hover:inline text-rose-600 font-black">✕ Remove</span>
              </button>
            ` : `
              <button onclick="MonthlyInputView.toggleManagementReportCopy('${t.task_id}')" 
                      title="Copy this task into Executive Management Report" 
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-600 border border-slate-200 transition text-[10px] font-bold shadow-xs cursor-pointer">
                <span>👔</span>
                <span>Copy</span>
              </button>
            `}
            <button onclick="MonthlyInputView.deleteTask('${t.task_id}')" 
                    onkeydown="MonthlyInputView.handleLastRowKeyNav(event, ${isLastRow})"
                    title="Delete Row (or press Tab on last row to auto-insert new row)" 
                    class="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition text-xs">
              ✕
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  updateEngineerSummary() {
    this.updateRankingTable();
  },

  renderRankingTableHtml(ranking, totalTasksSum, totalWbsSum) {
    if (ranking.length === 0) {
      return `
        <div class="p-8 text-center text-xs text-slate-400 font-mono">
          No task points recorded yet for ${this.selectedMonth}. Enter tasks and points below to generate rankings.
        </div>
      `;
    }

    return `
      <table class="w-full min-w-[650px] text-xs border-collapse border border-slate-300">
        <thead class="bg-[#FDEBD0] text-slate-900 font-bold border-b-2 border-slate-300">
          <tr>
            <th class="py-2.5 px-3 w-14 text-center border-r border-slate-300">SL</th>
            <th class="py-2.5 px-4 w-36 text-center border-r border-slate-300">Total Point</th>
            <th class="py-2.5 px-6 border-r border-slate-300 text-left">Name</th>
            <th class="py-2.5 px-4 w-32 text-center border-r border-slate-300">Total Task</th>
            <th class="py-2.5 px-4 w-36 text-center bg-[#D1E7DD]/80 border-r border-slate-300">WBS POINT</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          ${ranking.map((r, idx) => {
            const medal = idx === 0 ? '🥇 1' : (idx === 1 ? '🥈 2' : (idx === 2 ? '🥉 3' : String(idx + 1)));
            const isTop3 = idx < 3;
            return `
              <tr class="${isTop3 ? 'bg-amber-50/20' : 'hover:bg-slate-50'} transition">
                <td class="py-2 px-3 text-center font-mono font-bold ${isTop3 ? 'text-amber-800' : 'text-slate-500'} border-r border-slate-200">
                  ${medal}
                </td>
                <td class="py-2 px-4 text-center font-mono font-black text-slate-900 text-sm border-r border-slate-200">
                  ${r.total_point}
                </td>
                <td class="py-2 px-6 font-bold text-slate-800 border-r border-slate-200">
                  ${HELPERS.escapeHtml(r.name)}
                </td>
                <td class="py-2 px-4 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                  ${r.total_task}
                </td>
                <td class="py-2 px-4 text-center font-mono font-black text-emerald-800 text-sm border-r border-slate-200 bg-emerald-50/30">
                  ${r.wbs_point}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot class="bg-[#F8FAFC] font-bold border-t-2 border-slate-300">
          <tr>
            <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-mono text-[11px]">—</td>
            <td class="py-2.5 px-4 border-r border-slate-300 text-center text-slate-400 font-mono text-[11px]">—</td>
            <td class="py-2.5 px-6 border-r border-slate-300 text-slate-600 uppercase font-mono text-[11px] tracking-wider font-bold">TOTAL SUMMARY</td>
            <td class="py-2.5 px-4 text-center font-mono font-black text-emerald-950 bg-[#D1E7DD] border-r border-slate-300 text-sm">
              ${totalTasksSum}
            </td>
            <td class="py-2.5 px-4 text-center font-mono font-black text-emerald-950 bg-[#D1E7DD] border-r border-slate-300 text-sm">
              ${totalWbsSum}
            </td>
          </tr>
        </tfoot>
      </table>
    `;
  },

  async render(containerId = 'monthly-input-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Security Gate: Check if Input Section is unlocked
    const isUnlocked = (typeof authManager !== 'undefined' && authManager.isInputUnlocked)
      ? authManager.isInputUnlocked()
      : false;

    if (!isUnlocked) {
      this.renderLoginGate(containerId);
      return;
    }

    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : new MonthWorkbookManager();

    const month = this.selectedMonth;
    const allTasks = workbookMgr.getTasksForMonth(month);
    const months = workbookMgr.getAllMonths();

    // Filter tasks strictly by Concern Assignee/Engineer if set (exclude supervisor from assignee tab)
    const norm = (s) => (s || '').trim().toLowerCase();
    const filterNorm = norm(this.filterEngineer);
    const filterFirst = filterNorm.split(/[\s(]/)[0];

    const isMatch = (val) => {
      if (!val) return false;
      const v = norm(val);
      if (v === filterNorm) return true;
      const vFirst = v.split(/[\s(]/)[0];
      return Boolean(vFirst && filterFirst && vFirst === filterFirst);
    };

    const tasks = this.filterEngineer 
      ? allTasks.filter(t => isMatch(t.assignee) || isMatch(t.engineer)) 
      : allTasks;

    // Fetch tasks currently copied to Executive Management Report for this month
    const mgmtMgr = window.managementReportMgr || (typeof ManagementReportManager !== 'undefined' ? new ManagementReportManager() : null);
    const mgmtTasks = mgmtMgr ? mgmtMgr.getTasksForMonth(month) : [];
    const copiedSourceIds = new Set(mgmtTasks.map(t => t.source_task_id || t.task_id || t.id).filter(Boolean));
    const copiedNames = new Set(mgmtTasks.map(t => (t.task_name || '').trim().toLowerCase()).filter(Boolean));

    const personnel = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getAllPersonnel)
      ? MasterDataManager.getAllPersonnel()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS : []);

    const supervisors = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getSupervisors)
      ? MasterDataManager.getSupervisors()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.SUPERVISORS) ? MASTER_LISTS.SUPERVISORS : []);

    const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers)
      ? MasterDataManager.getEngineers()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS : []);

    const categories = typeof MasterDataManager !== 'undefined' 
      ? MasterDataManager.getCategories() 
      : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.CATEGORIES : []);

    const rankingData = workbookMgr.calculatePointsRanking(month);
    const { ranking, totalTasksSum, totalWbsSum, totalActualSum } = rankingData;
    const topPerformer = ranking.length > 0 ? `${ranking[0].name} (${ranking[0].total_point} pts)` : '—';

    // Calculate engineer counts for tabs (Requirement 2)
    const engineerCounts = {};
    allTasks.forEach(t => {
      const eng = (t.assignee || t.engineer || '').trim();
      if (eng) {
        engineerCounts[eng] = (engineerCounts[eng] || 0) + 1;
      }
    });

    const engineerTabsList = [];
    const addedEngs = new Set();
    Object.keys(engineerCounts).sort((a, b) => engineerCounts[b] - engineerCounts[a]).forEach(engName => {
      addedEngs.add(engName.toLowerCase());
      engineerTabsList.push({ display: engName, count: engineerCounts[engName] });
    });

    engineers.forEach(eng => {
      const dName = eng.display || eng.name;
      if (!addedEngs.has(dName.toLowerCase()) && !addedEngs.has((eng.name || '').toLowerCase())) {
        addedEngs.add(dName.toLowerCase());
        engineerTabsList.push({ display: dName, count: 0 });
      }
    });

    const engineerTabsHtml = engineerTabsList.map(e => {
      const isSel = (this.filterEngineer === e.display || this.filterEngineer === e.display.split(' ')[0]);
      return `
        <button type="button" onclick="MonthlyInputView.handleEngineerFilter('${HELPERS.escapeHtml(e.display)}')" 
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shadow-sm border ${isSel ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-200/50' : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-red-700 border-slate-200'}">
          <span>👤 ${HELPERS.escapeHtml(e.display)}</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${isSel ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'}">${e.count}</span>
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-4 text-slate-800">
        
        <!-- Optimized Top Toolbar with Walton Logo & Compact Actions -->
        <div class="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <img src="assets/img/walton_logo.png" alt="WALTON" class="h-10 w-auto object-contain flex-shrink-0 drop-shadow-sm">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-600 border border-red-200">
                    EXCEL GRID
                  </span>
                  <h2 class="text-xl sm:text-2xl font-black text-slate-800">Monthly Task Entry Grid: ${month}</h2>
                </div>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  Direct cell editing active &bull; Paste rows from Excel (<kbd class="px-1 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[9px] text-slate-600">Ctrl+V</kbd>) &bull; Drop photos on rows
                </p>
              </div>
            </div>

            <!-- Action Buttons (Admin Access and Lock moved to Settings) -->
            <div class="flex flex-wrap items-center gap-2">
              <button onclick="MonthlyInputView.openPasteModal()" title="Copy rows in Excel (Ctrl+C) and click here or press Ctrl+V to bulk paste" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-bold text-white shadow-md shadow-red-200/50 flex items-center gap-1.5 transition">
                <span>📋</span> <span>Paste Excel</span>
                <span class="text-[9px] bg-white/20 text-white px-1 py-0.2 rounded font-mono">Ctrl+V</span>
              </button>

              <button onclick="MonthlyInputView.openPhotoStudio()" title="Open Interactive Photo Studio" class="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 shadow-sm transition flex items-center gap-1.5">
                <span>🖼️</span> <span>Photo Studio</span>
              </button>

              <button onclick="CostSavingTracker.openCostSavingsModal('${month}')" title="Manage Monthly Cost Savings" class="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 shadow-sm transition flex items-center gap-1.5">
                <span>💰</span> <span>Cost Savings</span>
              </button>

              <button onclick="MonthlyInputView.exportToExcel()" class="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200 flex items-center gap-1.5 transition shadow-sm">
                <span>📤</span> <span>Export</span>
              </button>

              <button id="sync-btn-input" onclick="MonthlyInputView.triggerSync()" class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 shadow-sm transition flex items-center gap-1.5">
                <span class="text-amber-500">⚡</span> <span>Sync</span>
              </button>

              <button onclick="MonthlyInputView.openNewTaskModal()" class="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200 flex items-center gap-1.5 transition shadow-sm">
                <span>📝</span> <span>Task Dialog</span>
              </button>

              <button onclick="MonthlyInputView.addNewRow()" class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white shadow-sm transition flex items-center gap-1.5">
                <span>➕</span> <span>Insert Row</span>
              </button>
            </div>
          </div>

          <!-- Controls: Month Selector (Jan 2026 to Running Month) + Filter Dropdown -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3">
            <!-- Month Selector UI (Excludes 2025, shows Jan-Sep 2026) -->
            ${HELPERS.renderMonthSelectorUI(months, this.selectedMonth, 'MonthlyInputView.handleMonthSelect', 'MonthlyInputView.openAddMonthModal')}

            <!-- Concern Personnel Filter Dropdown -->
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="text-xs font-semibold text-slate-500 font-mono">Filter by Concern:</span>
              <select onchange="MonthlyInputView.handleEngineerFilter(this.value)" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 shadow-sm">
                <option value="">All Personnel (${allTasks.length} tasks)</option>
                ${personnel.map(p => `
                  <option value="${p.display}" ${this.filterEngineer === p.display || this.filterEngineer === p.name ? 'selected' : ''}>
                    ${p.display}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- 1ST SECTION: COMPACT & COLLAPSIBLE TASK POINT RANKING BAR -->
        <div class="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-base flex-shrink-0 shadow-sm">
                🏆
              </div>
              <div class="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
                <span class="font-black text-slate-800 text-sm">Performance &amp; Points Ranking (${month})</span>
                <span class="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">Top: ${topPerformer}</span>
                <span class="text-slate-500 font-mono hidden md:inline">&bull; ${totalTasksSum} Tasks &bull; ${totalActualSum} Actual Pts &bull; ${totalWbsSum} WBS Pts</span>
              </div>
            </div>
            <button id="ranking-toggle-btn" onclick="MonthlyInputView.toggleRanking()" class="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm">
              <span>${this.isRankingExpanded ? 'Hide Details ▲' : 'View Full Ranking Table ▼'}</span>
            </button>
          </div>
          <div id="ranking-table-collapsible" class="${this.isRankingExpanded ? 'block mt-3.5' : 'hidden mt-0'}">
            <div id="ranking-table-container" class="overflow-x-auto -webkit-overflow-scrolling-touch rounded-2xl border border-slate-300 shadow-sm">
              ${this.renderRankingTableHtml(ranking, totalTasksSum, totalWbsSum)}
            </div>
          </div>
        </div>

        <!-- 2ND SECTION: SPREADSHEET TASK GRID (WITH ENGINEER TABS - IMAGE 2 REPLICA) -->
        <div class="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          
          <!-- Engineer Tabs Bar (Requirement 2: Tabbed per Engineer - Multi-Row Responsive Wrap) -->
          <div class="bg-slate-100/90 border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span class="text-xs font-mono font-black text-slate-500 uppercase tracking-wider pl-1 whitespace-nowrap hidden sm:inline">Engineers:</span>
            <button type="button" onclick="MonthlyInputView.handleEngineerFilter('')" 
                    class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shadow-sm border ${!this.filterEngineer ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}">
              <span>👥 All Personnel</span>
              <span class="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${!this.filterEngineer ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">${allTasks.length}</span>
            </button>
            ${engineerTabsHtml}
          </div>

          <!-- Table Sub-Header & Controls -->
          <div class="px-5 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-sm shadow-emerald-200/50"></span>
              <h3 class="text-sm font-black text-slate-800 font-mono">
                TASK MANAGEMENT ENTRY GRID ${this.filterEngineer ? `&bull; Showing ${this.filterEngineer} (${tasks.length})` : ''}
              </h3>

              <!-- Dynamic Multi-Row Bulk Actions -->
              <div class="flex items-center gap-2">
                <button id="bulk-copy-mgmt-btn" onclick="MonthlyInputView.copySelectedToManagementReport()" class="hidden px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition items-center gap-1.5">
                  <span>👔</span> <span>Copy to Mgmt Report (<span id="selected-mgmt-task-count">0</span>)</span>
                </button>
                <button id="bulk-delete-btn" onclick="MonthlyInputView.deleteSelectedTasks()" class="hidden px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition items-center gap-1.5 animate-pulse">
                  <span>🗑️</span> <span>Delete Selected (<span id="selected-task-count">0</span>)</span>
                </button>
              </div>
            </div>
            <span class="text-xs text-slate-400 font-mono hidden md:inline">
              Excel Grid Mode &bull; Direct cell editing &bull; ⬇️ Fill Down &bull; Ctrl+D point copy &bull; Multi-select delete
            </span>
          </div>

          <div class="overflow-x-auto -webkit-overflow-scrolling-touch pb-2 w-full">
            <table class="w-full min-w-[1100px] text-left text-xs border-collapse border border-slate-300">
              <thead class="bg-[#D1E7DD] text-slate-900 font-bold border-b-2 border-slate-300">
                <tr>
                  <!-- Multi-select checkbox column -->
                  <th class="py-2.5 px-2 w-8 text-center border-r border-slate-300">
                    <input type="checkbox" id="task-select-all" onchange="MonthlyInputView.toggleSelectAll(this.checked)" title="Select All Rows"
                           class="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer" />
                  </th>
                  <th class="py-2.5 px-3 w-12 text-center border-r border-slate-300">SL</th>
                  <th class="py-2.5 px-3 w-64 border-r border-slate-300">Task Name</th>
                  <th class="py-2.5 px-3 w-72 border-r border-slate-300">
                    <div class="flex items-center justify-between gap-1.5">
                      <span>Task Details</span>
                      <button id="ai-fill-all-btn" type="button" onclick="MonthlyInputView.generateAllTaskDetails()" title="AI Auto-generate steps for all empty tasks" class="px-2 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-[10px] font-bold text-white shadow-sm transition flex items-center gap-1 ai-pulse-hover">
                        <span>✨</span><span>AI Fill All</span>
                      </button>
                    </div>
                  </th>
                  <th class="py-2.5 px-3 w-40 border-r border-slate-300">Category</th>
                  <th class="py-2.5 px-2 w-28 text-center border-r border-slate-300 bg-[#C8E6C9] font-black">
                    <span>Task Point</span>
                  </th>
                  <th class="py-2.5 px-3 w-40 border-r border-slate-300">Supervisor</th>
                  <th class="py-2.5 px-3 w-40 border-r border-slate-300">Assignee</th>
                  <th class="py-2.5 px-3 w-32 text-center border-r border-slate-300">Photo</th>
                  <th class="py-2.5 px-3 w-20 text-center border-r border-slate-300">Report</th>
                  <th class="py-2.5 px-2 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody id="monthly-input-tbody" class="divide-y divide-slate-200 text-slate-700 font-sans bg-white">
                ${tasks.length === 0 ? (
                  (typeof GoogleSheetsSync !== 'undefined' && !GoogleSheetsSync.initialSyncCompleted && GoogleSheetsSync.getWebAppUrl()) ? `
                    <tr>
                      <td colspan="11" class="py-14 text-center">
                        <div class="max-w-md mx-auto space-y-3">
                          <div class="inline-block animate-spin text-3xl">🔄</div>
                          <div class="text-sm font-bold text-slate-700">Connecting to Cloud &amp; Syncing ${month} Tasks...</div>
                          <p class="text-xs text-slate-400 font-mono">
                            Fetching latest tasks from Google Sheets. Rows will appear in a moment...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ` : `
                    <tr>
                      <td colspan="11" class="py-14 text-center">
                        <div class="max-w-md mx-auto space-y-3">
                          <div class="text-3xl">📋</div>
                          <div class="text-sm font-bold text-slate-700">No tasks currently entered for ${month}${this.filterEngineer ? ` for ${this.filterEngineer}` : ''}</div>
                          <p class="text-xs text-slate-400">
                            Click below to insert your first task row, open the task entry dialog, or paste rows from your Excel sheet.
                          </p>
                          <div class="flex items-center justify-center gap-3 pt-2">
                            <button onclick="MonthlyInputView.addNewRow(true)" class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs shadow-lg shadow-red-200/50 hover:from-red-500 hover:to-rose-600 transition flex items-center gap-1.5">
                              <span>➕</span> <span>Insert First Task Row</span>
                            </button>
                            <button onclick="MonthlyInputView.openNewTaskModal()" class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                              <span>📝</span> <span>Task Dialog</span>
                            </button>
                            <button onclick="MonthlyInputView.openPasteModal()" class="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                              <span>📋</span> <span>Paste from Excel</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `
                ) : tasks.map((t, idx) => this.renderTaskRowHtml(t, idx, tasks.length, categories, engineers, supervisors, copiedSourceIds, copiedNames)).join('')}
              </tbody>
            </table>
          </div>

          <!-- Bottom Add Row Bar -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <button onclick="MonthlyInputView.addNewRow(true)" class="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-300 flex items-center gap-1.5 transition shadow-sm">
                <span>➕</span> <span>Insert Another Task Row</span>
              </button>
              <button onclick="MonthlyInputView.generateAllTaskDetails()" class="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 flex items-center gap-1.5 transition ai-pulse-hover">
                <span>✨</span> <span>Auto-Fill All Details (AI)</span>
              </button>
            </div>
            <span id="total-rows-counter" class="text-xs text-slate-500 font-mono">
              Total ${tasks.length} rows &bull; Press "⚡ SYNC INPUT DATA" to compile slides
            </span>
          </div>

        </div>

      </div>
    `;

    // Initialize/sync ranking table
    this.updateRankingTable();

    // Auto-adjust height of all task name textareas so full text is visible without scrollbars
    setTimeout(() => {
      if (container) {
        container.querySelectorAll('textarea[id^="task-name-input-"]').forEach(el => {
          el.style.height = 'auto';
          el.style.height = Math.max(30, el.scrollHeight) + 'px';
        });
      }
    }, 20);
  },

  // ---------------------------------------------------------------------------
  // Input Section Security Gate & Login View
  // ---------------------------------------------------------------------------

  renderLoginGate(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="max-w-md mx-auto py-12 px-4 sm:px-6">
        <div class="bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-xl shadow-slate-100 text-center relative overflow-hidden">
          
          <!-- Top Brand Strip -->
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500"></div>

          <!-- Walton Brand & Shield Icon -->
          <div class="flex flex-col items-center mb-6">
            <img src="assets/img/walton_logo.png" alt="WALTON" class="h-10 w-auto object-contain drop-shadow-sm mb-3">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-[10px] font-mono font-black uppercase tracking-wider">
              <span>🛡️</span> <span>Restricted Access Area</span>
            </div>
            <h2 class="text-xl font-black text-slate-800 mt-3">Monthly Task Input Section</h2>
            <p class="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Official engineering records, task points, and photos are protected. Please sign in with team credentials to unlock editing.
            </p>
          </div>

          <!-- Login Form -->
          <form id="input-auth-form" onsubmit="event.preventDefault(); MonthlyInputView.handleUnlockSubmit(event);" class="space-y-4 text-left">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Login Username
              </label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">👤</span>
                <input 
                  type="text" 
                  id="input-auth-user" 
                  value="admin" 
                  required
                  placeholder="admin"
                  class="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-slate-50 focus:bg-white transition"
                >
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button 
                  type="button" 
                  onclick="MonthlyInputView.openChangePasswordModal()" 
                  class="text-[11px] text-red-600 hover:text-red-700 font-bold transition">
                  Change / Forgot?
                </button>
              </div>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">🔒</span>
                <input 
                  type="password" 
                  id="input-auth-pass" 
                  required
                  placeholder="Enter team password"
                  class="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-slate-50 focus:bg-white transition"
                >
                <button 
                  type="button" 
                  onclick="MonthlyInputView.togglePasswordVisibility('input-auth-pass', 'input-auth-toggle-icon')" 
                  class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
                  <span id="input-auth-toggle-icon">👁️</span>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1">
              <label class="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input type="checkbox" id="input-auth-remember" checked class="rounded border-slate-300 text-red-600 focus:ring-red-500">
                <span>Remember session on this device</span>
              </label>
            </div>

            <div id="input-auth-error" class="hidden p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium"></div>

            <button 
              type="submit" 
              id="input-auth-submit-btn"
              class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-red-200/50 transition flex items-center justify-center gap-2">
              <span>🔓</span>
              <span>Unlock Input Section</span>
            </button>
          </form>

          <!-- Information Notice -->
          <div class="mt-6 pt-5 border-t border-slate-100 text-center">
            <p class="text-[11px] text-slate-400 leading-relaxed">
              <strong class="text-slate-600">Open Public Access:</strong> Dashboard, Strategic Projects, Presentation Slides & Export reports remain completely accessible to everyone without login.
            </p>
          </div>

        </div>
      </div>
    `;
  },

  async handleUnlockSubmit(event) {
    if (event) event.preventDefault();
    const userEl = document.getElementById('input-auth-user');
    const passEl = document.getElementById('input-auth-pass');
    const rememberEl = document.getElementById('input-auth-remember');
    const errorEl = document.getElementById('input-auth-error');
    const btn = document.getElementById('input-auth-submit-btn');

    const username = userEl ? userEl.value.trim() : '';
    const password = passEl ? passEl.value.trim() : '';
    const remember = rememberEl ? rememberEl.checked : true;

    if (!password) {
      if (errorEl) {
        errorEl.textContent = "Please enter the password.";
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> <span>Verifying...</span>';
    }

    try {
      const res = await authManager.unlockInput(username, password, remember);
      if (res && res.success) {
        if (typeof window.showToast === 'function') {
          window.showToast("🔓 Input section unlocked successfully!", "success");
        }
        await this.render();
      } else {
        if (errorEl) {
          errorEl.textContent = (res && res.error) ? res.error : "Incorrect password. Please try again.";
          errorEl.classList.remove('hidden');
        }
        if (passEl) passEl.focus();
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = "Authentication error: " + err.message;
        errorEl.classList.remove('hidden');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>🔓</span> <span>Unlock Input Section</span>';
      }
    }
  },

  handleLock() {
    if (typeof authManager !== 'undefined') {
      authManager.lockInput();
      if (typeof window.showToast === 'function') {
        window.showToast("🔒 Input section has been locked.", "info");
      }
      this.render();
    }
  },

  togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) icon.textContent = '🙈';
    } else {
      input.type = 'password';
      if (icon) icon.textContent = '👁️';
    }
  },

  // ---------------------------------------------------------------------------
  // Change Password Modal (Direct Change, Master PIN & Optional Email OTP)
  // ---------------------------------------------------------------------------

  openChangePasswordModal() {
    const existing = document.getElementById('change-password-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'change-password-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm';

    modal.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200 font-sans">
        <!-- Accent Top Strip -->
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-indigo-600"></div>

        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold shadow-xs">
              🔑
            </div>
            <div>
              <h3 class="text-base font-extrabold text-slate-900">Change Team Password</h3>
              <p class="text-[11px] text-slate-400 font-mono">Direct Change &bull; Master PIN &bull; Email</p>
            </div>
          </div>
          <button onclick="MonthlyInputView.closeChangePasswordModal()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-sm font-bold transition">
            ✕
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-bold">
          <button type="button" id="tab-btn-direct" onclick="MonthlyInputView.switchPasswordModalTab('direct')"
                  class="flex-1 py-1.5 rounded-xl bg-white text-slate-800 shadow-xs transition flex items-center justify-center gap-1.5">
            <span>⚡</span> <span>Direct / Master PIN</span>
          </button>
          <button type="button" id="tab-btn-otp" onclick="MonthlyInputView.switchPasswordModalTab('otp')"
                  class="flex-1 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1.5">
            <span>📧</span> <span>Email OTP</span>
          </button>
        </div>

        <!-- METHOD 1: Direct Change / Master PIN (Default, No email needed) -->
        <div id="section-direct-change" class="space-y-3.5">
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-700 leading-relaxed">
            🔒 <strong>Instant Change:</strong> Enter current team password or administrator recovery key to update immediately.
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Current Password or Recovery Key <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input 
                type="password" 
                id="direct-current-password" 
                placeholder="Enter current password or recovery key" 
                class="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none bg-slate-50 focus:bg-white"
              >
              <button 
                type="button" 
                onclick="MonthlyInputView.togglePasswordVisibility('direct-current-password', 'direct-curr-toggle-icon')" 
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                <span id="direct-curr-toggle-icon">👁️</span>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              New Password (min. 6 characters) <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input 
                type="password" 
                id="direct-new-password" 
                placeholder="Enter new team password" 
                class="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none bg-slate-50 focus:bg-white"
              >
              <button 
                type="button" 
                onclick="MonthlyInputView.togglePasswordVisibility('direct-new-password', 'direct-new-toggle-icon')" 
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                <span id="direct-new-toggle-icon">👁️</span>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Confirm New Password <span class="text-red-500">*</span>
            </label>
            <input 
              type="password" 
              id="direct-confirm-password" 
              placeholder="Re-enter new password" 
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none bg-slate-50 focus:bg-white"
            >
          </div>

          <div id="direct-change-error" class="hidden p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium"></div>

          <div class="flex items-center gap-2 pt-2">
            <button 
              type="button" 
              onclick="MonthlyInputView.closeChangePasswordModal()" 
              class="w-1/3 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition">
              Cancel
            </button>
            <button 
              type="button" 
              id="direct-change-submit-btn"
              onclick="MonthlyInputView.handleDirectChangePassword()" 
              class="w-2/3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-red-200 transition flex items-center justify-center gap-1.5">
              <span>✔</span>
              <span>Save New Password</span>
            </button>
          </div>
        </div>

        <!-- METHOD 2: Email OTP Recovery (Optional) -->
        <div id="section-otp-change" class="hidden space-y-3.5">
          <p class="text-xs text-slate-600 leading-relaxed">
            A 6-digit verification code will be sent to the authorized admin email:
            <strong class="text-slate-800 font-mono">nipu.ruet10@gmail.com</strong>.
          </p>

          <div id="otp-request-step">
            <button 
              type="button" 
              id="otp-send-btn"
              onclick="MonthlyInputView.handleRequestOtp()" 
              class="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow transition flex items-center justify-center gap-2">
              <span>📧</span>
              <span>Send 6-Digit Code to nipu.ruet10@gmail.com</span>
            </button>
            <div id="otp-send-status" class="hidden mt-2 p-2.5 rounded-xl text-xs font-medium"></div>
          </div>

          <div id="otp-verify-step" class="space-y-3 pt-3 border-t border-slate-100">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                6-Digit Verification Code
              </label>
              <input 
                type="text" 
                id="otp-input-code" 
                maxlength="6"
                placeholder="e.g. 482915" 
                class="w-full text-center tracking-[6px] font-mono text-base font-black py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:outline-none bg-slate-50 focus:bg-white"
              >
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Password (min. 6 characters)
              </label>
              <div class="relative">
                <input 
                  type="password" 
                  id="otp-new-password" 
                  placeholder="Enter new team password" 
                  class="w-full px-3.5 pr-10 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none bg-slate-50 focus:bg-white"
                >
                <button 
                  type="button" 
                  onclick="MonthlyInputView.togglePasswordVisibility('otp-new-password', 'otp-pass-toggle-icon')" 
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                  <span id="otp-pass-toggle-icon">👁️</span>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input 
                type="password" 
                id="otp-confirm-password" 
                placeholder="Re-enter new password" 
                class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none bg-slate-50 focus:bg-white"
              >
            </div>

            <div id="otp-verify-error" class="hidden p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium"></div>

            <div class="flex items-center gap-2 pt-2">
              <button 
                type="button" 
                onclick="MonthlyInputView.closeChangePasswordModal()" 
                class="w-1/3 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition">
                Cancel
              </button>
              <button 
                type="button" 
                id="otp-verify-submit-btn"
                onclick="MonthlyInputView.handleVerifyAndSavePassword()" 
                class="w-2/3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-red-200 transition flex items-center justify-center gap-1.5">
                <span>✔</span>
                <span>Verify &amp; Save</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modal);
  },

  switchPasswordModalTab(tab) {
    const directSec = document.getElementById('section-direct-change');
    const otpSec = document.getElementById('section-otp-change');
    const directBtn = document.getElementById('tab-btn-direct');
    const otpBtn = document.getElementById('tab-btn-otp');

    if (!directSec || !otpSec) return;

    if (tab === 'direct') {
      directSec.classList.remove('hidden');
      otpSec.classList.add('hidden');
      if (directBtn) {
        directBtn.className = 'flex-1 py-1.5 rounded-xl bg-white text-slate-800 shadow-xs transition flex items-center justify-center gap-1.5 font-bold';
      }
      if (otpBtn) {
        otpBtn.className = 'flex-1 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1.5 font-bold';
      }
    } else {
      directSec.classList.add('hidden');
      otpSec.classList.remove('hidden');
      if (otpBtn) {
        otpBtn.className = 'flex-1 py-1.5 rounded-xl bg-white text-slate-800 shadow-xs transition flex items-center justify-center gap-1.5 font-bold';
      }
      if (directBtn) {
        directBtn.className = 'flex-1 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1.5 font-bold';
      }
    }
  },

  closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) modal.remove();
  },

  async handleDirectChangePassword() {
    const currEl = document.getElementById('direct-current-password');
    const newEl = document.getElementById('direct-new-password');
    const confirmEl = document.getElementById('direct-confirm-password');
    const errorEl = document.getElementById('direct-change-error');
    const btn = document.getElementById('direct-change-submit-btn');

    const curr = currEl ? currEl.value.trim() : '';
    const newPass = newEl ? newEl.value.trim() : '';
    const confirmPass = confirmEl ? confirmEl.value.trim() : '';

    if (!curr) {
      if (errorEl) {
        errorEl.textContent = 'Please enter current password or administrator recovery key.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (!newPass || newPass.length < 6) {
      if (errorEl) {
        errorEl.textContent = 'New password must be at least 6 characters long.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (newPass !== confirmPass) {
      if (errorEl) {
        errorEl.textContent = 'Passwords do not match. Please re-check.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> <span>Saving Password...</span>';
    }

    try {
      const res = await authManager.changePasswordDirect(curr, newPass);
      if (res && res.success) {
        this.closeChangePasswordModal();
        if (typeof window.showToast === 'function') {
          window.showToast("🎉 Password changed successfully! Input section unlocked.", "success");
        } else {
          alert("Password changed successfully! Input section unlocked.");
        }
        await this.render();
      } else {
        if (errorEl) {
          errorEl.textContent = (res && res.error) ? res.error : 'Incorrect password or Master PIN.';
          errorEl.classList.remove('hidden');
        }
      }
    } catch (e) {
      if (errorEl) {
        errorEl.textContent = e.message;
        errorEl.classList.remove('hidden');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>✔</span> <span>Save New Password</span>';
      }
    }
  },

  async handleRequestOtp() {
    const btn = document.getElementById('otp-send-btn');
    const status = document.getElementById('otp-send-status');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> <span>Sending code to nipu.ruet10@gmail.com...</span>';
    }

    try {
      const res = await authManager.requestPasswordResetOtp();
      if (status) {
        if (res.success) {
          status.className = 'mt-2 p-2.5 rounded-xl text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700';
          status.textContent = '✔ Verification code sent! Please check nipu.ruet10@gmail.com inbox or spam folder.';
          status.classList.remove('hidden');
        } else {
          status.className = 'mt-2 p-2.5 rounded-xl text-xs font-medium bg-red-50 border border-red-200 text-red-600';
          status.textContent = res.error || 'Failed to send code. Make sure Google Sheets Web App is connected, or use Direct Change tab.';
          status.classList.remove('hidden');
        }
      }
    } catch (e) {
      if (status) {
        status.className = 'mt-2 p-2.5 rounded-xl text-xs font-medium bg-red-50 border border-red-200 text-red-600';
        status.textContent = e.message;
        status.classList.remove('hidden');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>🔄</span> <span>Resend Code to nipu.ruet10@gmail.com</span>';
      }
    }
  },

  async handleVerifyAndSavePassword() {
    const codeEl = document.getElementById('otp-input-code');
    const passEl = document.getElementById('otp-new-password');
    const confirmEl = document.getElementById('otp-confirm-password');
    const errorEl = document.getElementById('otp-verify-error');
    const btn = document.getElementById('otp-verify-submit-btn');

    const code = codeEl ? codeEl.value.trim() : '';
    const pass = passEl ? passEl.value.trim() : '';
    const confirm = confirmEl ? confirmEl.value.trim() : '';

    if (!code) {
      if (errorEl) {
        errorEl.textContent = 'Please enter the 6-digit verification code.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (!pass || pass.length < 6) {
      if (errorEl) {
        errorEl.textContent = 'Password must be at least 6 characters long.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (pass !== confirm) {
      if (errorEl) {
        errorEl.textContent = 'Passwords do not match. Please re-check.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> <span>Verifying & Saving...</span>';
    }

    try {
      const res = await authManager.verifyOtpAndChangePassword(code, pass);
      if (res && res.success) {
        this.closeChangePasswordModal();
        if (typeof window.showToast === 'function') {
          window.showToast("🎉 Password updated successfully! Input section unlocked.", "success");
        }
        await this.render();
      } else {
        if (errorEl) {
          errorEl.textContent = (res && res.error) ? res.error : 'Invalid verification code.';
          errorEl.classList.remove('hidden');
        }
      }
    } catch (e) {
      if (errorEl) {
        errorEl.textContent = e.message;
        errorEl.classList.remove('hidden');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>✔</span> <span>Save New Password</span>';
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonthlyInputView;
} else if (typeof window !== 'undefined') {
  window.MonthlyInputView = MonthlyInputView;

  // Global Ctrl+V Excel clipboard paste listener
  window.addEventListener('paste', (e) => {
    const container = document.getElementById('monthly-input-view-container');
    if (!container || container.classList.contains('hidden')) return;

    const activeEl = document.activeElement;
    const tag = activeEl ? activeEl.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || (activeEl && activeEl.isContentEditable)) {
      return;
    }

    const clipText = (e.clipboardData || window.clipboardData) ? (e.clipboardData || window.clipboardData).getData('text') : '';
    if (clipText && clipText.trim().length > 0) {
      e.preventDefault();
      MonthlyInputView.openPasteModal(clipText);
    }
  });
}
