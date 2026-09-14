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
    const btn = document.getElementById('bulk-delete-btn');
    const countSpan = document.getElementById('selected-task-count');
    const selectAllCb = document.getElementById('task-select-all');

    if (countSpan) countSpan.textContent = checked.length;
    if (btn) {
      if (checked.length > 0) {
        btn.classList.remove('hidden');
        btn.classList.add('inline-flex');
      } else {
        btn.classList.add('hidden');
        btn.classList.remove('inline-flex');
      }
    }

    const allCheckboxes = document.querySelectorAll('.task-row-checkbox');
    if (selectAllCb && allCheckboxes.length > 0) {
      selectAllCb.checked = (checked.length === allCheckboxes.length);
    }
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

  renderTaskRowHtml(t, idx, totalCount, categories, engineers, supervisors) {
    const photos = (typeof photoManager !== 'undefined') ? photoManager.getTaskPhotos(t.task_id) : {};
    const rawThumb = (photos && (photos.before_photo || photos.photo_1 || photos.after_photo)) || t.photo_1 || t.photo_2;
    const hasPhoto = Boolean(rawThumb);
    const thumb = rawThumb;
    const currentSup = HELPERS.formatPersonnelName(t.supervisor || "Kamrul (44819)");
    const currentAssignee = HELPERS.formatPersonnelName(t.assignee || t.engineer || (engineers[0] ? engineers[0].display : "Sazzad (50463)"));
    const isLastRow = (idx === totalCount - 1);

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

        <!-- Delete Row & Auto Row Trigger on Tab/Enter -->
        <td class="py-2.5 px-2 text-center whitespace-nowrap align-middle">
          <button onclick="MonthlyInputView.deleteTask('${t.task_id}')" 
                  onkeydown="MonthlyInputView.handleLastRowKeyNav(event, ${isLastRow})"
                  title="Delete Row (or press Tab on last row to auto-insert new row)" 
                  class="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
            ✕
          </button>
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

    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : new MonthWorkbookManager();

    const month = this.selectedMonth;
    const allTasks = workbookMgr.getTasksForMonth(month);
    const months = workbookMgr.getAllMonths();

    // Filter tasks by Concern Assignee/Engineer if set
    const tasks = this.filterEngineer 
      ? allTasks.filter(t => (t.assignee === this.filterEngineer || t.engineer === this.filterEngineer || t.supervisor === this.filterEngineer)) 
      : allTasks;

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

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Top Toolbar with Official Walton Logo & Month Tabs -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div class="flex items-center gap-4">
              <img src="assets/img/walton_logo.png" alt="WALTON" class="h-12 w-auto object-contain flex-shrink-0 drop-shadow-sm">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-600 border border-red-200">
                    EXCEL SPREADSHEET WORKBOOK
                  </span>
                  <span class="text-xs text-slate-400 font-mono">Process Task Management Entry 2025_2026</span>
                </div>
                <h2 class="text-2xl font-black text-slate-800 mt-1">Monthly Task Entry Grid: ${month}</h2>
                <p class="text-xs text-slate-400 mt-0.5">
                  Direct cell editing active. Drop photos on rows, use AI for milestone steps, or paste rows from Excel (<kbd class="px-1 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[9px] text-slate-600">Ctrl+V</kbd>).
                </p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center gap-2.5">
              <button onclick="MonthlyInputView.openPasteModal()" title="Copy rows in Excel (Ctrl+C) and click here or press Ctrl+V to bulk paste" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-bold text-white shadow-md shadow-red-200/50 flex items-center gap-1.5 transition">
                <span>📋</span> <span>Paste from Excel</span>
                <span class="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono">Ctrl+V</span>
              </button>

              <button onclick="MonthlyInputView.openPhotoStudio()" title="Open Interactive Photo Studio: Insert, Replace, Delete Before & After Photos" class="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 shadow-sm transition flex items-center gap-1.5">
                <span>🖼️</span> <span>Photo Studio</span>
              </button>

              <button onclick="CostSavingTracker.openCostSavingsModal('${month}')" title="Manage Monthly Cost Savings" class="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 shadow-sm transition flex items-center gap-1.5">
                <span>💰</span> <span>Cost Savings</span>
              </button>

              <button onclick="MonthlyInputView.exportToExcel()" class="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200 flex items-center gap-1.5 transition shadow-sm">
                <span>📤</span> <span>Export Excel</span>
              </button>

              <button id="sync-btn-input" onclick="MonthlyInputView.triggerSync()" class="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 shadow-sm transition flex items-center gap-1.5">
                <span class="text-amber-500">⚡</span> <span>SYNC INPUT DATA</span>
              </button>

              <button onclick="MonthlyInputView.openNewTaskModal()" class="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200 flex items-center gap-1.5 transition shadow-sm">
                <span>📝</span> <span>Task Dialog</span>
              </button>

              <button onclick="MonthlyInputView.addNewRow()" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white shadow-sm transition flex items-center gap-1.5">
                <span>➕</span> <span>Insert New Row</span>
              </button>
            </div>
          </div>

          <!-- Controls: Month Tabs (2025 to Future) + Future Month Creator + Filter -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
            <!-- Month Selector UI (Current Month Pill + Previous Months Dropdown + Add Month) -->
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

        <!-- 1ST SECTION: TASK POINT RANKING DASHBOARD (IMAGE 1 REPLICA) -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                🏆
              </div>
              <div>
                <h3 class="text-base font-black text-slate-800">
                  Task Point Ranking &amp; Performance Dashboard (${month})
                </h3>
                <p class="text-xs text-slate-400">
                  Assignee gets 100% Actual Points &amp; 75% WBS Points &bull; Supervisor gets 25% WBS Points &bull; Ranked by Actual Points
                </p>
              </div>
            </div>

            <!-- Engaging KPI Metric Highlights -->
            <div class="flex items-center gap-3 flex-wrap text-xs">
              <div class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <span class="text-slate-500 font-mono">Total Tasks:</span>
                <strong id="kpi-total-tasks-val" class="font-mono text-slate-800 font-black">${totalTasksSum}</strong>
              </div>
              <div class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <span class="text-slate-500 font-mono">Total Actual Pts:</span>
                <strong id="kpi-total-points-val" class="font-mono text-red-600 font-black">${totalActualSum}</strong>
              </div>
              <div class="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <span class="text-emerald-700 font-mono">Total WBS Pts:</span>
                <strong id="kpi-total-wbs-val" class="font-mono text-emerald-800 font-black">${totalWbsSum}</strong>
              </div>
              <div class="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <span class="text-amber-700 font-mono">Top:</span>
                <strong id="kpi-top-engineer-val" class="font-bold text-amber-900">${topPerformer}</strong>
              </div>
            </div>
          </div>

          <!-- Peach-Apricot Ranking Table Matching Image 1 -->
          <div id="ranking-table-container" class="overflow-x-auto -webkit-overflow-scrolling-touch rounded-2xl border border-slate-300 shadow-sm">
            ${this.renderRankingTableHtml(ranking, totalTasksSum, totalWbsSum)}
          </div>
        </div>

        <!-- 2ND SECTION: SPREADSHEET TASK GRID (IMAGE 1 REPLICA) -->
        <div class="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-sm shadow-emerald-200/50"></span>
              <h3 class="text-sm font-black text-slate-800 font-mono">
                TASK MANAGEMENT ENTRY GRID ${this.filterEngineer ? `&bull; Showing ${this.filterEngineer} (${tasks.length})` : ''}
              </h3>

              <!-- Dynamic Multi-Row Bulk Delete Button -->
              <button id="bulk-delete-btn" onclick="MonthlyInputView.deleteSelectedTasks()" class="hidden px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition items-center gap-1.5 animate-pulse">
                <span>🗑️</span> <span>Delete Selected (<span id="selected-task-count">0</span>)</span>
              </button>
            </div>
            <span class="text-xs text-slate-400 font-mono">
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
                  <th class="py-2.5 px-2 w-12 text-center">Del</th>
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
                ) : tasks.map((t, idx) => this.renderTaskRowHtml(t, idx, tasks.length, categories, engineers, supervisors)).join('')}
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
