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
  searchQuery: "",
  filterCategory: "",
  filterSupervisor: "",
  filterAssigneeDropdown: "",
  filterReport: "",
  isRankingExpanded: false,

  handleSearch(query) {
    this.searchQuery = (query || "").trim();
    this.filterTableRowsLocally();
  },

  handleCategoryFilter(cat) {
    this.filterCategory = cat || "";
    this.filterTableRowsLocally();
  },

  handleSupervisorFilter(sup) {
    this.filterSupervisor = sup || "";
    this.filterTableRowsLocally();
  },

  handleAssigneeDropdownFilter(assignee) {
    this.filterAssigneeDropdown = assignee || "";
    this.filterTableRowsLocally();
  },

  handleReportFilter(reportVal) {
    this.filterReport = reportVal || "";
    this.filterTableRowsLocally();
  },

  filterTableRowsLocally() {
    const tbody = document.getElementById('monthly-input-tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr[id^="task-row-"]');
    const q = (this.searchQuery || "").toLowerCase();
    const cat = (this.filterCategory || "").toLowerCase();
    const sup = (this.filterSupervisor || "").toLowerCase();
    const ass = (this.filterAssigneeDropdown || "").toLowerCase();
    const rep = this.filterReport;

    let visibleCount = 0;
    rows.forEach(row => {
      const taskNameInput = row.querySelector('textarea[id^="task-name-input-"]') || row.querySelector('input[id^="task-name-input-"]');
      const taskDetailsInput = row.querySelector('input[id^="task-details-input-"]');
      const taskName = taskNameInput ? taskNameInput.value.toLowerCase() : '';
      const taskDetails = taskDetailsInput ? taskDetailsInput.value.toLowerCase() : '';
      
      const catSelect = row.querySelector('select[onchange*="category"]');
      const rowCat = catSelect ? catSelect.value.toLowerCase() : '';

      const supSelect = row.querySelector('select[onchange*="supervisor"]');
      const rowSup = supSelect ? supSelect.value.toLowerCase() : '';

      const assSelect = row.querySelector('select[onchange*="assignee"]');
      const rowAss = assSelect ? assSelect.value.toLowerCase() : '';

      const repBtn = row.querySelector('button[id^="report-toggle-btn-"]');
      const rowRep = repBtn ? repBtn.textContent.trim() : 'YES';

      let match = true;
      if (q && !taskName.includes(q) && !taskDetails.includes(q)) match = false;
      if (cat && rowCat !== cat) match = false;
      if (sup && !rowSup.includes(sup)) match = false;
      if (ass && !rowAss.includes(ass)) match = false;
      if (rep && rowRep !== rep) match = false;

      if (match) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    const counter = document.getElementById('total-rows-counter');
    if (counter) {
      if (q || cat || sup || ass || rep) {
        counter.textContent = `Showing ${visibleCount} of ${rows.length} tasks`;
      } else {
        counter.textContent = `Showing all ${rows.length} tasks`;
      }
    }
  },

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
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.bindMonthListeners) {
      FirebaseSyncService.bindMonthListeners(month);
    }
    await this.render();
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pullFromCloud) {
      GoogleSheetsSync.pullFromCloud(true);
    }
  },

  handleEngineerFilter(engName) {
    this.filterEngineer = engName || "";
    if (engName && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('walton_active_engineer_profile', engName);
      } catch (e) {}
    }
    this.render();
  },

  async handleInlineUpdate(taskId, field, value) {
    if (!window.appState || !window.appState.workbookMgr) return;
    try {
      if (typeof GoogleSheetsSync !== 'undefined') {
        GoogleSheetsSync._lastLocalEditTime = Date.now();
      }

      let cleanVal = value;
      if (field === 'points') {
        cleanVal = (value !== '' && value !== null && !isNaN(parseFloat(value))) ? parseFloat(value) : '';
      }

      const patch = { [field]: cleanVal };
      if (field === 'assignee' || field === 'engineer' || field === 'concern_engineer') {
        patch.assignee = cleanVal;
        patch.engineer = cleanVal;
      }

      window.appState.workbookMgr.updateTask(this.selectedMonth, taskId, patch);

      // Ultra-Fast Real-time Firebase Sync (Sub-30ms Instant Highway)
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
        FirebaseSyncService.updateCell(this.selectedMonth, taskId, field, cleanVal);
        if (field === 'assignee' || field === 'engineer' || field === 'concern_engineer') {
          FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'assignee', cleanVal);
          FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'engineer', cleanVal);
          const fullTask = window.appState.workbookMgr.getTask(this.selectedMonth, taskId);
          if (fullTask) {
            FirebaseSyncService.pushTask(this.selectedMonth, fullTask);
          }
        }
      }
      
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
      if (field === 'points' && typeof this.updateRankingTable === 'function') {
        this.updateRankingTable();
      }
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
    const categories = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getRoutineCategories)
      ? MasterDataManager.getRoutineCategories()
      : ((typeof MasterDataManager !== 'undefined') ? MasterDataManager.getCategories() : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.CATEGORIES : []));

    const activeProfile = (typeof localStorage !== 'undefined') ? localStorage.getItem('walton_active_engineer_profile') : null;
    const defaultEng = this.filterEngineer || activeProfile || ((engineers[0] && engineers[0].display) ? engineers[0].display : "Sazzad (50463)");
    const defaultSup = (supervisors[0] && supervisors[0].display) ? supervisors[0].display : "Kamrul (44819)";

    const newTask = window.appState.workbookMgr.addTask(
      this.selectedMonth,
      defaultEng,
      "New Engineering Task",
      "YES",
      "",
      "Process development",
      "",
      defaultSup,
      { last_updated: new Date().toISOString(), assignee: defaultEng, engineer: defaultEng }
    );

    // Guarantee no residual ghost photos attach to the new task row
    if (typeof photoManager !== 'undefined' && newTask && newTask.task_id) {
      photoManager.removePhoto(newTask.task_id, 'before_photo');
      photoManager.removePhoto(newTask.task_id, 'after_photo');
    }

    // Instant Real-time Firebase Broadcast
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected() && newTask) {
      FirebaseSyncService.pushTask(this.selectedMonth, newTask);
    }

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

  _renderMgmtCopyButtonHtml(taskId, isCopied) {
    if (isCopied) {
      return `
        <button onclick="MonthlyInputView.toggleManagementReportCopy('${taskId}')" 
                title="Included in Executive Management Report (${this.selectedMonth}). Click to remove." 
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-rose-50 text-indigo-700 hover:text-rose-600 border border-indigo-200 hover:border-rose-300 text-[10px] font-bold shadow-xs cursor-pointer flex-shrink-0 whitespace-nowrap">
          <span>👔</span> <span>Copied</span> <span class="text-[9px] text-emerald-600 font-black">✔</span>
        </button>
      `;
    } else {
      return `
        <button onclick="MonthlyInputView.toggleManagementReportCopy('${taskId}')" 
                title="Copy this task into Executive Management Report" 
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-600 border border-slate-200 text-[10px] font-bold shadow-xs cursor-pointer flex-shrink-0 whitespace-nowrap">
          <span>👔</span>
          <span>Copy</span>
        </button>
      `;
    }
  },

  _updateMgmtCopyButtonInPlace(taskId, isCopied) {
    const cell = document.getElementById(`mgmt-action-cell-${taskId}`);
    if (cell) {
      const isLastRow = Boolean(cell.querySelector('button[onkeydown]'));
      cell.innerHTML = `
        ${this._renderMgmtCopyButtonHtml(taskId, isCopied)}
        <button onclick="MonthlyInputView.deleteTask('${taskId}')" 
                onkeydown="MonthlyInputView.handleLastRowKeyNav(event, ${isLastRow})"
                title="Delete Row" 
                class="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 text-xs">
          ✕
        </button>
      `;
    } else {
      this.render();
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
        this._updateMgmtCopyButtonInPlace(taskId, false);
      }
    } else {
      const result = mgr.copyFromMonthlyTask(this.selectedMonth, task);
      if (typeof window.showToast === 'function') {
        window.showToast(`👔 Copied "${task.task_name}" to Management Report!`, "success");
      } else {
        alert(`👔 Copied "${task.task_name}" to Management Report!`);
      }
      this._updateMgmtCopyButtonInPlace(taskId, true);
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

  updateRowIndices() {
    const tbody = document.getElementById('monthly-input-tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr[id^="task-row-"]');
    rows.forEach((row, i) => {
      const slCell = row.querySelector('.task-sl-cell');
      if (slCell) slCell.textContent = i + 1;
    });
    const counter = document.getElementById('total-rows-counter');
    if (counter) {
      counter.innerHTML = `Total ${rows.length} rows &bull; Press "⚡ SYNC INPUT DATA" to compile slides`;
    }
    if (rows.length === 0) {
      this.render();
    }
  },

  async deleteSelectedTasks() {
    const checked = Array.from(document.querySelectorAll('.task-row-checkbox:checked'));
    if (checked.length === 0) return;

    const taskIds = checked.map(cb => cb.dataset.taskId).filter(Boolean);
    if (taskIds.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${taskIds.length} selected task(s) from ${this.selectedMonth}?`)) {
      return;
    }

    if (!window.appState || !window.appState.workbookMgr) return;

    // 1. Smooth UI visual exit (fade-out + slide-right with no page shaking)
    taskIds.forEach(id => {
      const tr = document.getElementById(`task-row-${id}`);
      if (tr) {
        tr.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        tr.style.opacity = '0';
        tr.style.transform = 'translateX(24px) scale(0.98)';
      }
    });

    // 2. Persist deletion in MonthWorkbookManager (updates local memory & records tombstones)
    window.appState.workbookMgr.deleteMultipleTasks(this.selectedMonth, taskIds);

    // 3. Real-time Firebase Broadcast & Cloud deletion
    if (typeof FirebaseSyncService !== 'undefined') {
      try {
        if (FirebaseSyncService.deleteMultipleTasks) {
          FirebaseSyncService.deleteMultipleTasks(this.selectedMonth, taskIds);
        } else if (FirebaseSyncService.deleteTask) {
          taskIds.forEach(id => FirebaseSyncService.deleteTask(this.selectedMonth, id));
        }
      } catch (e) {
        console.warn("Firebase deleteSelectedTasks notice:", e);
      }
    }

    // 4. Clean up DOM elements smoothly after transition completes
    setTimeout(() => {
      taskIds.forEach(id => {
        const tr = document.getElementById(`task-row-${id}`);
        if (tr) tr.remove();
      });

      this.updateRowIndices();
      this.updateBulkDeleteButton();
      this.updateEngineerSummary();

      const selectAllCb = document.getElementById('task-select-all');
      if (selectAllCb) selectAllCb.checked = false;
    }, 250);

    // 5. Silent background slide compilation (never blocks or shakes UI)
    if (window.appState.syncEngine) {
      window.appState.syncEngine.syncMonth(this.selectedMonth).catch(e => console.warn("Sync notice:", e));
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`🗑️ Deleted ${taskIds.length} task(s)`, "info");
    }
  },

  async deleteTask(taskId) {
    if (!taskId) return;
    if (!window.appState || !window.appState.workbookMgr) return;
    const task = window.appState.workbookMgr.getTask(this.selectedMonth, taskId);
    const taskName = (task && task.task_name) ? task.task_name : taskId;

    const confirmed = (typeof window !== 'undefined' && typeof window.confirm === 'function')
      ? window.confirm(`Are you sure you want to delete "${taskName}" from ${this.selectedMonth}?`)
      : true;
    if (!confirmed) return;

    // 1. Smooth UI visual exit
    const tr = document.getElementById(`task-row-${taskId}`) ||
               document.querySelector(`tr:has(button[onclick*="deleteTask('${taskId}')"])`);
    if (tr) {
      tr.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
      tr.style.opacity = '0';
      tr.style.transform = 'translateX(24px) scale(0.98)';
    }

    // 2. Persist deletion in MonthWorkbookManager (updates local memory & records tombstones)
    window.appState.workbookMgr.deleteTask(this.selectedMonth, taskId);

    // 3. Real-time Firebase Broadcast & Cloud deletion
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.deleteTask) {
      try {
        FirebaseSyncService.deleteTask(this.selectedMonth, taskId);
      } catch (e) {
        console.warn("Firebase deleteTask notice:", e);
      }
    }

    // 4. Clean up DOM smoothly after transition completes
    setTimeout(() => {
      if (tr) tr.remove();
      this.updateRowIndices();
      this.updateBulkDeleteButton();
      this.updateEngineerSummary();
    }, 250);

    // 5. Silent background slide compilation
    if (window.appState.syncEngine) {
      window.appState.syncEngine.syncMonth(this.selectedMonth).catch(e => console.warn("Sync notice:", e));
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`🗑️ Deleted "${taskName}"`, "info");
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
        steps = "1. Process requirement study & CAD modeling 2. Tooling fabrication, component assembly & wiring 3. Sensor calibration & pneumatic testing 4. Production trial run & cycle time check 5. Final handover to production with work instruction SOP";
      }

      window.appState.workbookMgr.updateTask(this.selectedMonth, taskId, { task_details: steps });
      
      // Real-time broadcast to Firebase RTDB & other connected PCs
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
        FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'task_details', steps);
      }
      
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
        if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
          FirebaseSyncService.updateCell(this.selectedMonth, t.task_id, 'task_details', steps);
        }
        count++;
      }
    }

    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      try {
        await FirebaseSyncService.pushEntireMonth(this.selectedMonth);
      } catch (fbErr) {
        console.warn("Firebase bulk push warning:", fbErr);
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

    // Protect local edit from background poll collision
    if (typeof GoogleSheetsSync !== 'undefined') {
      GoogleSheetsSync._lastLocalEditTime = Date.now();
    }

    const updatedTask = window.appState.workbookMgr.toggleInclude(this.selectedMonth, taskId);
    const isYes = updatedTask ? (updatedTask.include_in_report !== 'NO') : true;

    // Instant in-place DOM update - NO page re-render, ZERO screen shaking
    const btn = document.getElementById(`report-toggle-btn-${taskId}`) ||
                document.querySelector(`button[onclick*="toggleInclude('${taskId}')"]`);
    if (btn) {
      btn.textContent = isYes ? 'YES' : 'NO';
      btn.className = `px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition ${
        isYes
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-black'
          : 'bg-slate-50 text-slate-400 border border-slate-200'
      }`;
    }

    // Real-time Firebase Broadcast
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected() && updatedTask) {
      FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'include_in_report', updatedTask.include_in_report);
    }

    // Silently compile report slides in background without blocking or shaking UI
    if (window.appState.syncEngine) {
      window.appState.syncEngine.syncMonth(this.selectedMonth).catch(e => console.warn("Sync notice:", e));
    }
  },

  async triggerSync() {
    const btn = document.getElementById('sync-btn-input');
    if (btn) btn.innerHTML = `<span>⏳</span><span>Syncing...</span>`;

    try {
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
        await FirebaseSyncService.hydrateMonth(this.selectedMonth);
      }
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
    const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers)
      ? MasterDataManager.getEngineers()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS : []);
    const engNames = engineers.map(e => e.name.toLowerCase());
    const fallbackEng = defaultEngineer || (engineers[0] ? engineers[0].name : "Sazzad");
    const fallbackSup = "Kamrul (44819)";

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
          sup = (workingCells[4] && workingCells[4].trim()) ? workingCells[4].trim() : fallbackSup;
          eng = (workingCells[5] && workingCells[5].trim()) ? workingCells[5].trim() : fallbackEng;
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

          // Ensure supervisor never erroneously defaults to Sazzad, auto-defaults to Kamrul (44819)
          if (sup && (sup.toLowerCase().includes('sazzad') || sup.toLowerCase().includes('50463'))) {
            sup = fallbackSup;
          }

          const matchedSup = personnelList.find(p => 
            p.display.toLowerCase() === sup.toLowerCase() || 
            p.name.toLowerCase() === sup.toLowerCase() || 
            sup.toLowerCase().includes(p.name.toLowerCase())
          );
          if (matchedSup && !matchedSup.name.toLowerCase().includes('sazzad')) {
            sup = matchedSup.display;
          } else {
            sup = fallbackSup;
          }
        } else {
          // Fallback if MasterDataManager is not available
          const matchedEng = engineers.find(e => e.name.toLowerCase() === eng.toLowerCase() || eng.toLowerCase().includes(e.name.toLowerCase()));
          if (matchedEng) {
            assigneeDisplay = matchedEng.display || matchedEng.name;
            engineerName = matchedEng.name;
          }
          if (sup && (sup.toLowerCase().includes('sazzad') || sup.toLowerCase().includes('50463'))) {
            sup = fallbackSup;
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

    const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers)
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
            <th class="py-2 px-3 w-28">Supervisor</th>
            <th class="py-2 px-3 w-48">Task Name</th>
            <th class="py-2 px-3">Details / Steps</th>
            <th class="py-2 px-3 w-28">Category</th>
            <th class="py-2 px-3 w-14 text-center">Pts</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          ${parsed.map((t, idx) => `
            <tr class="hover:bg-red-50/30">
              <td class="py-2 px-3 text-center font-mono text-slate-400">${idx + 1}</td>
              <td class="py-2 px-3 font-semibold text-slate-700">${HELPERS.escapeHtml(t.engineer)}</td>
              <td class="py-2 px-3 font-medium text-slate-600">${HELPERS.escapeHtml(t.supervisor || 'Kamrul (44819)')}</td>
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
        t.supervisor || "Kamrul (44819)"
      );
    }

    // Instant Firebase Highway Broadcast - sub-50ms sync to all other PCs
    if (typeof FirebaseSyncService !== 'undefined') {
      try {
        await FirebaseSyncService.pushEntireMonth(this.selectedMonth);
        console.log(`🔥 Broadcasted entire ${this.selectedMonth} to Firebase for multi-PC instant sync.`);
      } catch (err) {
        console.warn("Firebase bulk paste push notice:", err);
      }
    }

    // Google Sheets Cloud Sync - atomic bulk push in background
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getWebAppUrl()) {
      GoogleSheetsSync.pushAllLocalData().catch(e => console.warn("Google Sheets bulk push notice:", e));
    }

    if (window.appState.syncEngine) {
      await window.appState.syncEngine.syncMonth(this.selectedMonth);
    }

    this.closePasteModal();
    await this.render();

    if (typeof window.showToast === 'function') {
      window.showToast(`📋 Successfully imported ${parsed.length} tasks from Excel! Synced to Cloud & other PCs.`, "success");
    } else {
      alert(`Successfully imported ${parsed.length} tasks from Excel! Synced to Cloud & other PCs.`);
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

    // Update summary strip if present
    const topPerformer = (ranking && ranking.length > 0 && ranking[0].total_point > 0)
      ? `${ranking[0].name} (${ranking[0].total_point} pts)`
      : 'None';
    const topEl = document.getElementById('ranking-top-performer');
    if (topEl) topEl.textContent = `Top: ${topPerformer}`;
    const metricsEl = document.getElementById('ranking-summary-metrics');
    if (metricsEl) metricsEl.innerHTML = `&bull; ${totalTasksSum} Tasks &bull; ${totalActualSum} Actual Pts &bull; ${totalWbsSum} WBS Pts`;

    // Update KPI badges if DOM elements exist
    const kpiTasks = document.getElementById('kpi-total-tasks-val');
    if (kpiTasks) kpiTasks.textContent = totalTasksSum;
    const kpiPoints = document.getElementById('kpi-total-points-val');
    if (kpiPoints) kpiPoints.textContent = totalActualSum;
    const kpiWbs = document.getElementById('kpi-total-wbs-val');
    if (kpiWbs) kpiWbs.textContent = totalWbsSum;
    const kpiTop = document.getElementById('kpi-top-engineer-val');
    const kpiTopPts = document.getElementById('kpi-top-points-val');
    if (ranking.length > 0) {
      if (kpiTop) kpiTop.textContent = ranking[0].name;
      if (kpiTopPts) kpiTopPts.innerHTML = `<span>⚡</span> <span>${ranking[0].total_point} Points</span>`;
    }
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
      <tr id="task-row-${t.task_id}" class="hover:bg-slate-50/70 group transition">
        <!-- Checkbox Selection -->
        <td class="py-1.5 px-2 text-center border-r border-slate-200 align-middle">
          <input type="checkbox" class="task-row-checkbox w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                 data-task-id="${t.task_id}" onchange="MonthlyInputView.updateBulkDeleteButton()" />
        </td>

        <!-- SL -->
        <td class="task-sl-cell py-1.5 px-1 text-center font-mono text-slate-500 border-r border-slate-200 font-bold align-middle text-xs">
          ${idx + 1}
        </td>

        <!-- Task Name (Multi-line auto-expanding, docked Walton TMS Button) -->
        <td class="py-1.5 px-2.5 border-r border-slate-200 align-middle">
          <div class="flex items-center justify-between gap-1.5 w-full">
            <textarea id="task-name-input-${t.task_id}" rows="1"
                      onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'task_name', this.value)"
                      oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
                      class="flex-1 min-h-[36px] bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-blue-100 resize-none overflow-hidden leading-snug block transition"
                      placeholder="Enter Task Name...">${HELPERS.escapeHtml(t.task_name)}</textarea>
            ${(typeof TmsSyncService !== 'undefined') ? TmsSyncService.renderTmsActionHtml(this.selectedMonth, t) : ''}
          </div>
        </td>

        <!-- Task Details / Steps (Editable Text with Docked AI Button) -->
        <td class="py-1.5 px-2.5 border-r border-slate-200 align-middle">
          <div class="relative flex items-center w-full">
            <input type="text" id="task-details-input-${t.task_id}" value="${HELPERS.escapeHtml(t.task_details || '')}"
                   placeholder="1. Concept design & layout analysis..."
                   title="${HELPERS.escapeHtml(t.task_details || '')}"
                   onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'task_details', this.value)"
                   class="w-full h-[34px] bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg pl-2 pr-9 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-100 transition truncate" />
            <button id="ai-btn-${t.task_id}" type="button" onclick="MonthlyInputView.generateTaskDetails('${t.task_id}')"
                    title="Auto-generate engineering steps with AI"
                    class="absolute right-1 px-1.5 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200 shadow-xs flex items-center gap-0.5 flex-shrink-0 cursor-pointer">
              <span>✨</span>
            </button>
          </div>
        </td>

        <!-- Category Dropdown (Soft Blue Pill) -->
        <td class="py-1.5 px-2 text-center border-r border-slate-200 align-middle">
          <select id="task-category-select-${t.task_id}" 
                  onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'category', this.value)"
                  class="bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2.5 py-1 text-[11px] font-medium text-center focus:outline-none cursor-pointer max-w-[125px] truncate">
            ${((t.category && !categories.includes(t.category)) ? [t.category, ...categories] : categories).map(c => `<option value="${c}" ${t.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </td>

        <!-- Task Point (Centered, Clean Box) -->
        <td class="py-1.5 px-1 text-center border-r border-slate-200 align-middle">
          <div class="flex items-center justify-center">
            <input type="number" id="task-point-${t.task_id}" value="${(t.points !== undefined && t.points !== null && t.points !== '') ? t.points : ''}"
                   placeholder="—" title="Task Point (0-100)" step="5" min="0" max="100"
                   oninput="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'points', this.value)"
                   onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'points', this.value)"
                   class="w-12 h-8 text-center bg-white border border-emerald-400 hover:border-emerald-600 focus:border-emerald-600 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-400 shadow-xs placeholder:text-slate-400" />
          </div>
        </td>

        <!-- Supervisor Dropdown -->
        <td class="py-1.5 px-2 border-r border-slate-200 align-middle">
          <select id="task-supervisor-select-${t.task_id}" 
                  onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'supervisor', this.value)"
                  class="w-full h-8 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg px-2 py-0.5 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer truncate">
            ${supervisors.map(s => {
              const isSel = (currentSup === s.display || currentSup === s.name || (!t.supervisor && s.name === 'Kamrul'));
              return `<option value="${s.display}" ${isSel ? 'selected' : ''}>${s.display}</option>`;
            }).join('')}
          </select>
        </td>

        <!-- Assignee Dropdown -->
        <td class="py-1.5 px-2 border-r border-slate-200 align-middle">
          <select id="task-assignee-select-${t.task_id}" 
                  onchange="MonthlyInputView.handleInlineUpdate('${t.task_id}', 'assignee', this.value)"
                  class="w-full h-8 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg px-2 py-0.5 text-xs text-slate-700 font-bold focus:outline-none cursor-pointer truncate">
            ${engineers.map(e => {
              const eDisp = e.display || e.name;
              const isSel = (currentAssignee === eDisp || currentAssignee === e.name || (t.assignee && (t.assignee.includes(e.name) || t.assignee.includes(e.id))));
              return `<option value="${eDisp}" ${isSel ? 'selected' : ''}>${eDisp}</option>`;
            }).join('')}
          </select>
        </td>

        <!-- Photo Attachment Button -->
        <td class="py-1.5 px-1 text-center border-r border-slate-200 align-middle">
          ${hasPhoto ? `
            <div class="inline-flex items-center justify-center cursor-pointer" onclick="photoViewModal.open('${t.task_id}')" title="View attached photo">
              <img src="${thumb}" class="w-7 h-7 rounded-lg object-cover border border-emerald-300 shadow-xs">
            </div>
          ` : `
            <button onclick="photoViewModal.open('${t.task_id}')" title="Upload or attach photo" class="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-xs cursor-pointer">
              🖼️
            </button>
          `}
        </td>

        <!-- Report Inclusion Toggle (Green Pill) -->
        <td class="py-1.5 px-1 text-center border-r border-slate-200 align-middle">
          <button id="report-toggle-btn-${t.task_id}" onclick="MonthlyInputView.toggleInclude('${t.task_id}')" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
            t.include_in_report !== 'NO'
              ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
              : 'bg-slate-50 text-slate-400 border border-slate-200'
          }">
            ${t.include_in_report !== 'NO' ? 'YES' : 'NO'}
          </button>
        </td>

        <!-- Actions -->
        <td class="py-1.5 px-2 text-center align-middle whitespace-nowrap">
          <div id="mgmt-action-cell-${t.task_id}" class="flex items-center justify-center gap-1">
            <button onclick="MonthlyInputView.toggleManagementReportCopy('${t.task_id}')" title="Copy to Management Report" class="p-1 text-slate-400 hover:text-indigo-600 rounded text-xs transition cursor-pointer">
              📋
            </button>
            <button onclick="TaskFormView.open('${t.task_id}', '${this.selectedMonth}')" title="Edit in Full Dialog" class="p-1 text-slate-400 hover:text-blue-600 rounded text-xs transition cursor-pointer">
              ✏️
            </button>
            <button onclick="MonthlyInputView.deleteTask('${t.task_id}')" 
                    onkeydown="MonthlyInputView.handleLastRowKeyNav(event, ${isLastRow})"
                    title="Delete Row" 
                    class="p-1 text-slate-400 hover:text-red-600 rounded text-xs transition cursor-pointer">
              🗑️
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

  _renderEmptyStateHtml(month) {
    return (typeof GoogleSheetsSync !== 'undefined' && !GoogleSheetsSync.initialSyncCompleted && GoogleSheetsSync.getWebAppUrl()) ? `
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

    // Anti-jitter: Preserve scroll position and prevent height collapse
    const savedScrollY = (typeof window !== 'undefined') ? window.scrollY : 0;
    const tableScroll = (typeof document !== 'undefined') ? (document.getElementById('task-table-scroll-container') || document.querySelector('.overflow-x-auto')) : null;
    const savedTableTop = tableScroll ? tableScroll.scrollTop : 0;
    const savedTableLeft = tableScroll ? tableScroll.scrollLeft : 0;

    if (container.offsetHeight > 0) {
      container.style.minHeight = container.offsetHeight + 'px';
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

    // Ensure all tasks entered for this month are visible in the Task Management Entry Grid (Never hide tasks!)
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

    const categories = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getRoutineCategories) 
      ? MasterDataManager.getRoutineCategories() 
      : ((typeof MasterDataManager !== 'undefined') ? MasterDataManager.getCategories() : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.CATEGORIES : []));

    const rankingData = workbookMgr.calculatePointsRanking(month);
    const { ranking, totalTasksSum, totalWbsSum, totalActualSum } = rankingData;
    const topPerformerName = (ranking.length > 0 && ranking[0].name) ? ranking[0].name : '—';
    const topPerformerPts = (ranking.length > 0 && ranking[0].total_point) ? ranking[0].total_point : 0;
    const totalEngineersCount = personnel.length || 128;

    // Populate Centered Month Selector in Top Executive Bar
    const topMonthContainer = document.getElementById('top-month-selector-container');
    if (topMonthContainer) {
      topMonthContainer.innerHTML = `
        <div class="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-2xl px-3.5 py-1.5 shadow-xs">
          <span class="text-sm">📅</span>
          <select onchange="MonthlyInputView.handleMonthSelect(this.value)" class="bg-transparent text-xs font-bold text-slate-800 font-mono focus:outline-none cursor-pointer pr-1">
            ${months.map(m => `<option value="${m}" ${m === month ? 'selected' : ''}>${m} ${m === month ? '(Active)' : ''}</option>`).join('')}
          </select>
          <button onclick="MonthlyInputView.openAddMonthModal()" title="Add / Create New Month" class="p-0.5 text-slate-400 hover:text-blue-600 font-bold text-xs cursor-pointer">➕</button>
        </div>
      `;
    }

    // Fast-path: If table is already mounted for this month and filter, update tbody without rebuilding whole page!
    const existingTbody = document.getElementById('monthly-input-tbody');
    if (existingTbody && this._renderedMonth === month && this._renderedFilter === this.filterEngineer) {
      existingTbody.innerHTML = (tasks.length === 0)
        ? this._renderEmptyStateHtml(month)
        : tasks.map((t, idx) => this.renderTaskRowHtml(t, idx, tasks.length, categories, engineers, supervisors, copiedSourceIds, copiedNames)).join('');
      
      const counter = document.getElementById('total-rows-counter');
      if (counter) {
        counter.innerHTML = `Showing all ${tasks.length} tasks`;
      }
      this.updateRankingTable();
      return;
    }

    this._renderedMonth = month;
    this._renderedFilter = this.filterEngineer;

    // Calculate engineer counts for filter pills
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
                class="px-2.5 py-1 rounded-full text-[11px] font-semibold transition flex items-center gap-1.5 whitespace-nowrap shadow-xs border flex-shrink-0 ${isSel ? 'bg-[#1E293B] text-white border-[#1E293B]' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}">
          <span>👤 ${HELPERS.escapeHtml(e.display)}</span>
          <span class="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${isSel ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}">${e.count}</span>
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-4 text-slate-800 pb-12">
        
        <!-- REDESIGNED EXECUTIVE PERFORMANCE SUMMARY STRIP -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <!-- Card 1: Total Engineers -->
          <div class="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-blue-300 shadow-xs transition flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg shadow-2xs flex-shrink-0">
                👥
              </div>
              <div class="min-w-0">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Engineers</div>
                <div class="text-2xl font-black text-slate-900 font-mono leading-none tracking-tight my-0.5" id="kpi-total-engineers-val">${totalEngineersCount}</div>
                <div class="text-[11px] text-slate-500 font-medium">Active Personnel</div>
              </div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 flex-shrink-0">Staff</span>
          </div>

          <!-- Card 2: Total Tasks -->
          <div class="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-emerald-300 shadow-xs transition flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-lg shadow-2xs flex-shrink-0">
                📑
              </div>
              <div class="min-w-0">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</div>
                <div class="text-2xl font-black text-slate-900 font-mono leading-none tracking-tight my-0.5" id="kpi-total-tasks-val">${allTasks.length}</div>
                <div class="text-[11px] text-slate-500 font-medium">Registered for ${month}</div>
              </div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 flex-shrink-0">Active</span>
          </div>

          <!-- Card 3: Total Actual Points -->
          <div class="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-purple-300 shadow-xs transition flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 text-lg shadow-2xs flex-shrink-0">
                🎯
              </div>
              <div class="min-w-0">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actual Task Points</div>
                <div class="text-2xl font-black text-purple-700 font-mono leading-none tracking-tight my-0.5" id="kpi-total-points-val">${totalActualSum}</div>
                <div class="text-[11px] text-slate-500 font-medium">Target: ${totalWbsSum} WBS Pts</div>
              </div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-100 flex-shrink-0">Points</span>
          </div>

          <!-- Card 4: Top Performer (Zero Truncation, Full Name & Points Display) -->
          <div class="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-amber-300 shadow-xs transition flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-lg shadow-2xs flex-shrink-0">
                👑
              </div>
              <div class="min-w-0 flex-1 pr-1">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <span>Top Performer</span>
                  <span class="text-[10px] text-amber-600">★</span>
                </div>
                <div class="text-sm font-black text-slate-900 leading-snug my-0.5 whitespace-normal break-words" id="kpi-top-engineer-val" title="${topPerformerName}">${topPerformerName}</div>
                <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-black border border-amber-200 shadow-2xs" id="kpi-top-points-val">
                  <span>⚡</span> <span>${topPerformerPts} Points</span>
                </div>
              </div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 flex-shrink-0">Rank #1</span>
          </div>
        </div>

        <!-- ENGINEERS FILTER PILLS (Requirement 2: Strictly 1 Single Line Layout) -->
        <div class="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-xs">
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap">
            <span class="text-xs font-bold text-slate-700 whitespace-nowrap px-1 flex items-center gap-1 flex-shrink-0">
              <span>👤</span> <span>Engineers:</span>
            </span>
            <button type="button" onclick="MonthlyInputView.handleEngineerFilter('')" 
                    class="px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 whitespace-nowrap shadow-xs border flex-shrink-0 ${!this.filterEngineer ? 'bg-[#1E293B] text-white border-[#1E293B]' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
              <span>👥 All Personnel</span>
              <span class="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${!this.filterEngineer ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'}">${allTasks.length}</span>
            </button>
            ${engineerTabsHtml}
          </div>
        </div>

        <!-- TASK MANAGEMENT ENTRY GRID CARD (Matching media_1790166211871.jpg) -->
        <div class="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
          
          <!-- Card Header Toolbar (Requirement 2: Strictly 1 Single Line Layout) -->
          <div class="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar whitespace-nowrap">
            <div class="flex items-center gap-2.5 flex-shrink-0">
              <div class="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm shadow-xs flex-shrink-0">
                📝
              </div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-black text-slate-900 tracking-tight whitespace-nowrap">
                  Task Management Entry Grid
                </h3>
                <span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200 whitespace-nowrap">${month}</span>
              </div>
            </div>

            <!-- Header Actions: Month Selector + Tools (1 Single Line) -->
            <div class="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
              
              <!-- Integrated Month Selector (Running Month + Archive Dropdown) -->
              ${HELPERS.renderMonthSelectorUI(months, month, 'MonthlyInputView.handleMonthSelect', 'MonthlyInputView.openAddMonthModal')}

              <!-- Bulk Actions (Dynamic) -->
              <button id="bulk-copy-mgmt-btn" onclick="MonthlyInputView.copySelectedToManagementReport()" class="hidden px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition items-center gap-1">
                <span>👔</span> <span>Copy to Mgmt (<span id="selected-mgmt-task-count">0</span>)</span>
              </button>
              <button id="bulk-delete-btn" onclick="MonthlyInputView.deleteSelectedTasks()" class="hidden px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition items-center gap-1">
                <span>🗑️</span> <span>Delete (<span id="selected-task-count">0</span>)</span>
              </button>

              <button onclick="MonthlyInputView.openPasteModal()" title="Copy rows in Excel (Ctrl+C) and click here or press Ctrl+V to bulk paste" 
                      class="px-2.5 py-1.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-xs font-semibold text-white shadow-xs flex items-center gap-1 transition cursor-pointer">
                <span>📋</span> <span>Paste Excel</span>
              </button>

              <button onclick="MonthlyInputView.generateAllTaskDetails()" title="AI Auto-generate engineering steps for tasks" 
                      class="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-purple-700 border border-purple-200 transition flex items-center gap-1 cursor-pointer">
                <span>✨</span> <span>Auto-Fill AI</span>
              </button>

              <button onclick="MonthlyInputView.toggleRanking()" title="Toggle Points Ranking Table" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs">
                ⋮
              </button>
            </div>
          </div>

          <!-- Single-Row Search & Filters Bar (Matching media_1790166211871.jpg) -->
          <div class="px-5 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center gap-3">
            <!-- Search Input -->
            <div class="relative flex-1 min-w-[220px]">
              <span class="absolute left-3 top-2 text-slate-400 text-xs pointer-events-none">🔍</span>
              <input type="text" id="task-search-input" value="${HELPERS.escapeHtml(this.searchQuery)}" oninput="MonthlyInputView.handleSearch(this.value)"
                     placeholder="Search task name, details or keyword..."
                     class="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 shadow-xs transition" />
            </div>

            <!-- Category Filter -->
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <span class="text-xs text-slate-500 font-medium hidden lg:inline">Category:</span>
              <select id="task-filter-category" onchange="MonthlyInputView.handleCategoryFilter(this.value)"
                      class="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer">
                <option value="">All Category</option>
                ${categories.map(c => `<option value="${c}" ${this.filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>

            <!-- Supervisor Filter -->
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <span class="text-xs text-slate-500 font-medium hidden lg:inline">Supervisor:</span>
              <select id="task-filter-supervisor" onchange="MonthlyInputView.handleSupervisorFilter(this.value)"
                      class="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer">
                <option value="">All Supervisor</option>
                ${supervisors.map(s => `<option value="${s.display}" ${this.filterSupervisor === s.display ? 'selected' : ''}>${s.display}</option>`).join('')}
              </select>
            </div>

            <!-- Assignee Filter -->
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <span class="text-xs text-slate-500 font-medium hidden lg:inline">Assignee:</span>
              <select id="task-filter-assignee" onchange="MonthlyInputView.handleAssigneeDropdownFilter(this.value)"
                      class="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer">
                <option value="">All Assignee</option>
                ${engineers.map(e => `<option value="${e.display}" ${this.filterAssigneeDropdown === e.display ? 'selected' : ''}>${e.display}</option>`).join('')}
              </select>
            </div>

            <!-- Report Filter -->
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <span class="text-xs text-slate-500 font-medium hidden lg:inline">Report:</span>
              <select id="task-filter-report" onchange="MonthlyInputView.handleReportFilter(this.value)"
                      class="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer">
                <option value="" ${!this.filterReport ? 'selected' : ''}>Report: All</option>
                <option value="YES" ${this.filterReport === 'YES' ? 'selected' : ''}>Report: YES</option>
                <option value="NO" ${this.filterReport === 'NO' ? 'selected' : ''}>Report: NO</option>
              </select>
            </div>

            <!-- View Modes -->
            <div class="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0 pl-1">
              <span class="font-medium mr-1 hidden sm:inline">View</span>
              <button class="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 shadow-xs" title="Table View">🪟</button>
              <button onclick="MonthlyInputView.toggleRanking()" class="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 border border-slate-200 cursor-pointer" title="Ranking View">📊</button>
            </div>
          </div>

          <!-- Optional Collapsible Points Ranking Bar (If toggled open) -->
          <div id="ranking-table-collapsible" class="${this.isRankingExpanded ? 'block border-b border-slate-200 p-4 bg-slate-50' : 'hidden'}">
            <div id="ranking-table-container" class="overflow-x-auto rounded-xl border border-slate-300 shadow-xs">
              ${this.renderRankingTableHtml(ranking, totalTasksSum, totalWbsSum)}
            </div>
          </div>

          <!-- Table Container (Horizontal Scrollable, Full Responsive Width) -->
          <div class="overflow-x-auto -webkit-overflow-scrolling-touch w-full">
            <table class="w-full text-left text-xs border-collapse" style="table-layout: fixed; width: 100%; min-width: 1100px;">
              <colgroup>
                <col style="width: 32px;">   <!-- Checkbox -->
                <col style="width: 38px;">   <!-- SL (#) -->
                <col style="width: 34%;">    <!-- Task Name (Expanded for readability) -->
                <col style="width: 18%;">    <!-- Task Details (Requirement 5: Reduced width as requested) -->
                <col style="width: 130px;">  <!-- Category -->
                <col style="width: 60px;">   <!-- Point -->
                <col style="width: 135px;">  <!-- Supervisor -->
                <col style="width: 135px;">  <!-- Assignee -->
                <col style="width: 50px;">   <!-- Photo -->
                <col style="width: 58px;">   <!-- Report -->
                <col style="width: 110px;">  <!-- Actions -->
              </colgroup>
              <thead class="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th class="py-3 px-2 text-center border-r border-slate-100">
                    <input type="checkbox" id="task-select-all" onchange="MonthlyInputView.toggleSelectAll(this.checked)" title="Select All Rows"
                           class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer" />
                  </th>
                  <th class="py-3 px-1 text-center border-r border-slate-100 text-[11px] font-mono">#</th>
                  <th class="py-3 px-3 border-r border-slate-100 text-[11px]">Task Name ↕</th>
                  <th class="py-3 px-3 border-r border-slate-100 text-[11px]">Task Details ↕</th>
                  <th class="py-3 px-2 text-center border-r border-slate-100 text-[11px]">Category ↕</th>
                  <th class="py-3 px-1 text-center border-r border-slate-100 text-[11px]">Point ↕</th>
                  <th class="py-3 px-2 border-r border-slate-100 text-[11px]">Supervisor ↕</th>
                  <th class="py-3 px-2 border-r border-slate-100 text-[11px]">Assignee ↕</th>
                  <th class="py-3 px-1 text-center border-r border-slate-100 text-[11px]">Photo</th>
                  <th class="py-3 px-1 text-center border-r border-slate-100 text-[11px]">Report</th>
                  <th class="py-3 px-2 text-center text-[11px]">Actions</th>
                </tr>
              </thead>
              <tbody id="monthly-input-tbody" class="divide-y divide-slate-100 text-slate-700 font-sans bg-white">
                ${tasks.length === 0 ? this._renderEmptyStateHtml(month) : tasks.map((t, idx) => this.renderTaskRowHtml(t, idx, tasks.length, categories, engineers, supervisors, copiedSourceIds, copiedNames)).join('')}
              </tbody>
              <tfoot class="bg-slate-50/95 border-t-2 border-slate-200">
                <tr>
                  <td colspan="11" class="py-2.5 px-4 text-left">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <button type="button" onclick="MonthlyInputView.addNewRow(true)" 
                                class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all duration-150 cursor-pointer">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                          <span>➕ Add Row</span>
                        </button>
                        <span class="text-xs text-slate-500 font-medium">Click to append a new task row to the bottom</span>
                      </div>
                      <span class="text-xs font-semibold text-slate-500 font-mono">
                        ${tasks.length} tasks registered
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Bottom Footer (No Pagination Numbers - User Requirement: "entry gulo number deyar dorkar nai. sob gulo ekta page e thakbe.") -->
          <div class="px-5 py-3.5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span id="total-rows-counter" class="text-xs font-semibold text-slate-600 font-mono">
              Showing all ${tasks.length} tasks
            </span>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Real-Time Instant Cloud Sync Active</span>
              </span>
              <span class="text-xs text-slate-400 font-medium hidden sm:inline">&bull; Direct Cell Editing Enabled</span>
            </div>
          </div>

        </div>

      </div>
    `;

    // Initialize/sync ranking table
    this.updateRankingTable();

    // Auto-expand textarea heights to comfortably display all lines without vertical truncation (Requirement 6)
    setTimeout(() => {
      if (container) {
        container.querySelectorAll('textarea[id^="task-name-input-"]').forEach(el => {
          el.style.height = 'auto';
          el.style.height = el.scrollHeight + 'px';
        });
      }
    }, 10);

    // Preserve scroll position without disruptive height bouncing
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    }
    const newTableScroll = (typeof document !== 'undefined') ? (document.getElementById('task-table-scroll-container') || document.querySelector('.overflow-x-auto')) : null;
    if (newTableScroll) {
      newTableScroll.scrollTop = savedTableTop;
      newTableScroll.scrollLeft = savedTableLeft;
    }
    if (container) {
      container.style.minHeight = '';
    }
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
