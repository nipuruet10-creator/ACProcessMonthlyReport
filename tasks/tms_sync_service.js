/**
 * Process Development Monthly Report Automation System
 * Module: Walton eService TMS Sync Service & Auto-Pilot Engine
 * Automatically logs in per-employee, creates Direct Tasks, and completes them 100% on Walton TMS
 * WALTON Hi-Tech Industries PLC
 */

const TmsSyncService = {
  RELAY_URL: 'http://127.0.0.1:3138',
  isBridgeRunning: false,
  _checkingBridge: false,

  /**
   * Check if local background relay is reachable
   */
  async checkBridgeStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`${this.RELAY_URL}/status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        this.isBridgeRunning = Boolean(data.status === 'online');
        return data;
      }
    } catch (e) {
      this.isBridgeRunning = false;
    }
    return { status: 'offline', relay: 'stopped' };
  },

  /**
   * Format dates for Walton TMS (YYYY-MM-DD 12:00:00)
   */
  getFormattedDates(monthCode) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    let year = now.getFullYear();
    let monthNum = now.getMonth() + 1;

    if (monthCode && monthCode.includes('-')) {
      const parts = monthCode.split('-');
      const mStr = parts[0].toUpperCase();
      const yStr = parseInt(parts[1], 10);
      if (!isNaN(yStr)) year = yStr;

      const mIdx = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(mStr);
      if (mIdx !== -1) monthNum = mIdx + 1;
    }

    const startDate = `${year}-${pad(monthNum)}-01 12:00:00`;
    const deadlineDate = `${year}-${pad(monthNum)}-22 12:00:00`;
    return { startDate, deadlineDate };
  },

  /**
   * Sync a single task to Walton TMS
   * @param {string} month
   * @param {string} taskId
   */
  async syncSingleTask(month, taskId) {
    if (!window.appState || !window.appState.workbookMgr) return;
    const task = window.appState.workbookMgr.getTask(month, taskId);
    if (!task) {
      alert("Task not found in active workbook.");
      return;
    }

    // 1. Resolve Assigned Engineer credentials
    const assigneeName = task.assignee || task.engineer || "";
    let creds = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineerCredentials)
      ? MasterDataManager.getEngineerCredentials(assigneeName)
      : null;

    // Fallback search by ID or name
    if (!creds && typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) {
      const idMatch = (assigneeName.match(/\b(\d{4,6})\b/) || [])[1];
      const found = MASTER_LISTS.ENGINEERS.find(e => 
        (idMatch && String(e.id) === idMatch) || 
        e.name.toLowerCase() === assigneeName.toLowerCase() ||
        assigneeName.toLowerCase().includes(e.name.toLowerCase())
      );
      if (found) {
        creds = {
          id: found.id,
          name: found.name,
          fullName: found.fullName,
          password: found.tms_password || "Sep@2026"
        };
      }
    }

    if (!creds || !creds.id) {
      alert(`Could not find Walton Employee ID for "${assigneeName}". Please check Central Master Registry.`);
      return;
    }

    const empPassword = creds.password || "Sep@2026";

    // 2. Resolve Supervisor ID
    let supId = "44819"; // Kamrul Hasan Chowdhury
    const supName = (task.supervisor || "").toLowerCase();
    if (supName.includes("50463") || supName.includes("sazzad")) {
      supId = "50463";
    } else {
      const supMatch = (task.supervisor || "").match(/\b(\d{4,6})\b/);
      if (supMatch) supId = supMatch[1];
    }

    // 3. Prepare Payload
    const dates = this.getFormattedDates(month);
    const payload = {
      employeeId: creds.id,
      password: empPassword,
      taskName: task.task_name,
      taskDetails: task.task_details || `${task.task_name} execution and implementation.`,
      startDate: dates.startDate,
      deadlineDate: dates.deadlineDate,
      points: (task.points !== undefined && task.points !== null && task.points !== "") ? task.points : 50,
      supervisorId: supId,
      category: task.category || "Process development"
    };

    // User Confirmation Dialog before sending to Walton TMS
    const confirmPrompt = 
      `Are you sure you want to sync this task to Walton TMS?\n\n` +
      `📌 Task: "${task.task_name || 'Untitled'}"\n` +
      `👤 Assignee: ${creds.name || assigneeName} (ID: ${creds.id})\n` +
      `👔 Supervisor: ${task.supervisor || 'Kamrul (44819)'}\n` +
      `🎯 Point: ${payload.points}\n\n` +
      `Click OK to login as ${creds.name} (${creds.id}), create this task in Walton TMS, and mark 100% Completed.`;

    if (!confirm(confirmPrompt)) {
      return;
    }

    // 4. Check bridge status
    const statusBtn = document.getElementById(`tms-btn-${taskId}`);
    const originalBtnHtml = statusBtn ? statusBtn.innerHTML : '';
    if (statusBtn) {
      statusBtn.innerHTML = `<span>⏳</span><span>Syncing...</span>`;
      statusBtn.disabled = true;
    }

    const bridgeStatus = await this.checkBridgeStatus();

    if (!bridgeStatus.status || bridgeStatus.status !== 'online') {
      if (statusBtn) {
        statusBtn.innerHTML = originalBtnHtml;
        statusBtn.disabled = false;
      }
      this.openBridgeRequiredModal(month, task, payload);
      return;
    }

    try {
      const res = await fetch(`${this.RELAY_URL}/sync-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create task on Walton TMS");
      }

      const tmsId = String(data.taskId);
      const tmsUrl = data.tmsUrl || `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${tmsId}`;
      const syncedAt = data.syncedAt || new Date().toISOString();

      // Save to localStorage map for permanence across reloads
      try {
        const syncedMap = JSON.parse(localStorage.getItem('walton_tms_synced_records') || '{}');
        const record = { tms_task_id: tmsId, tms_url: tmsUrl, tms_synced_at: syncedAt };
        syncedMap[taskId] = record;
        if (task.task_name) syncedMap[task.task_name.trim().toLowerCase()] = record;
        localStorage.setItem('walton_tms_synced_records', JSON.stringify(syncedMap));
      } catch (e) {}

      // 5. Update Task in Workbook with returned TMS metadata AND persist in status & remarks columns
      const updates = {
        tms_task_id: tmsId,
        tms_url: tmsUrl,
        tms_synced_at: syncedAt,
        tms_status: '100% Completed',
        status: `TMS#${tmsId} (100% Completed)`,
        remarks: `TMS_ID:${tmsId}`
      };

      window.appState.workbookMgr.updateTask(month, taskId, updates);

      // Real-time Firebase Broadcast (instantly updates badges across all computers)
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
        const fullTask = window.appState.workbookMgr.getTask(month, taskId);
        if (fullTask) {
          FirebaseSyncService.pushTask(month, fullTask);
        }
      }

      if (window.appState.syncEngine) {
        window.appState.syncEngine.syncMonth(month).catch(e => console.warn(e));
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`🎉 Walton TMS: Created Task #${tmsId} & Completed 100%!`, "success");
      } else {
        alert(`🎉 Walton TMS: Created Task #${tmsId} and marked 100% Complete!`);
      }

      // Update DOM cell in-place
      this.updateRowTmsBadgeInPlace(month, taskId, updates);
    } catch (err) {
      console.error("TMS Sync Error:", err);
      alert(`Walton TMS Error: ${err.message}\n\nPlease check that the credentials for ${creds.name} (${creds.id}) are correct.`);
      if (statusBtn) {
        statusBtn.innerHTML = originalBtnHtml;
        statusBtn.disabled = false;
      }
    }
  },

  /**
   * Resolve TMS information for a task from any source
   * (Direct properties, status string, remarks string, localStorage cache, or known tasks)
   */
  getTmsInfo(task) {
    if (!task) return null;
    let tmsId = task.tms_task_id;
    let url = task.tms_url;
    let syncedAt = task.tms_synced_at;

    // 1. Direct property match
    if (tmsId) {
      return {
        tms_task_id: String(tmsId),
        tms_url: url || `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${tmsId}`,
        tms_synced_at: syncedAt || new Date().toISOString()
      };
    }

    // 2. Parse from status e.g. "TMS#104813 (100% Completed)" or "TMS 104813"
    const statusMatch = String(task.status || '').match(/TMS[#:\s_-]?(\d{5,7})/i);
    if (statusMatch) {
      tmsId = statusMatch[1];
      return {
        tms_task_id: tmsId,
        tms_url: `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${tmsId}`,
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }

    // 3. Parse from remarks e.g. "TMS_ID:104813"
    const remarksMatch = String(task.remarks || '').match(/TMS[#:_-\s]?(\d{5,7})/i);
    if (remarksMatch) {
      tmsId = remarksMatch[1];
      return {
        tms_task_id: tmsId,
        tms_url: `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${tmsId}`,
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }

    // 4. Check persistent LocalStorage cache by EXACT taskId only
    try {
      const cache = JSON.parse(localStorage.getItem('walton_tms_synced_records') || '{}');
      if (task.task_id && cache[task.task_id]) {
        return cache[task.task_id];
      }
    } catch (e) {}

    // 5. Pre-configured known tasks from previous syncs (BY EXACT TASK_ID ONLY)
    if (task.task_id === 'SEP-2026-002-PXV') {
      return {
        tms_task_id: '104813',
        tms_url: 'http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=104813',
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }
    if (task.task_id === 'SEP-2026-001') {
      return {
        tms_task_id: '104812',
        tms_url: 'http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=104812',
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }

    return null;
  },

  /**
   * Update the TMS action button or badge in place without full table re-render
   */
  updateRowTmsBadgeInPlace(month, taskId, updates) {
    const container = document.getElementById(`tms-action-slot-${taskId}`);
    if (container) {
      const task = (window.appState && window.appState.workbookMgr) ? window.appState.workbookMgr.getTask(month, taskId) : updates;
      const combined = { ...(task || {}), ...(updates || {}) };
      const tmsInfo = this.getTmsInfo(combined);
      container.innerHTML = this.renderTmsBadgeHtml({ ...combined, ...(tmsInfo || {}) });
    } else if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
      MonthlyInputView.render();
    }
  },

  /**
   * Render TMS badge (when synced) or button (when not yet synced)
   */
  renderTmsActionHtml(month, task) {
    const tmsInfo = this.getTmsInfo(task);
    const isSynced = Boolean(tmsInfo && tmsInfo.tms_task_id);
    const resolvedTask = isSynced ? { ...task, ...tmsInfo } : task;
    return `
      <div id="tms-action-slot-${task.task_id}" class="inline-flex items-center flex-shrink-0">
        ${isSynced ? this.renderTmsBadgeHtml(resolvedTask) : this.renderTmsButtonHtml(month, task)}
      </div>
    `;
  },

  renderTmsBadgeHtml(task) {
    const tmsId = task.tms_task_id;
    const url = task.tms_url || `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${tmsId}`;
    return `
      <a href="${url}" target="_blank" rel="noopener noreferrer"
         title="Walton TMS Task #${tmsId} (100% Complete) - Click to view in TMS"
         class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[9px] font-bold shadow-xs cursor-pointer flex-shrink-0 whitespace-nowrap">
        <span>🏢</span>
        <span>#${tmsId}</span>
        <span class="text-emerald-600 font-black">✔</span>
      </a>
    `;
  },

  renderTmsButtonHtml(month, task) {
    return `
      <button id="tms-btn-${task.task_id}" onclick="TmsSyncService.syncSingleTask('${month}', '${task.task_id}')"
              title="Sync &amp; 100% Complete on Walton TMS (192.168.118.138)"
              class="inline-flex items-center px-2 py-0.5 rounded-md bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-[9px] shadow-xs cursor-pointer flex-shrink-0 whitespace-nowrap">
        <span>TMS</span>
      </button>
    `;
  },

  /**
   * Modal shown when the local background bridge (Run_TMS_Sync_Bridge.bat) is not yet running
   */
  openBridgeRequiredModal(month, task, payload) {
    let container = document.getElementById('tms-bridge-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tms-bridge-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-800">
          
          <div class="flex items-start justify-between pb-3.5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl flex-shrink-0">
                ⚡
              </div>
              <div>
                <h3 class="text-base font-black text-slate-800">Walton TMS Local Bridge Offline</h3>
                <p class="text-xs text-slate-500">To sync tasks directly to Walton's intranet (192.168.118.138), start the local bridge.</p>
              </div>
            </div>
            <button onclick="TmsSyncService.closeBridgeModal()" class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition">✕</button>
          </div>

          <div class="my-4 space-y-3.5 text-xs text-slate-600">
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div class="font-bold text-slate-800 flex items-center gap-1.5">
                <span>1️⃣</span> <span>How to Start the 1-Click Bridge:</span>
              </div>
              <p class="text-slate-600">
                Go to the project folder and double-click:
              </p>
              <div class="bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-[11px] font-bold text-indigo-700 flex items-center justify-between">
                <span>Run_TMS_Sync_Bridge.bat</span>
                <span class="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-sans">Ready to Run</span>
              </div>
              <p class="text-[11px] text-slate-400">
                The bridge runs quietly on port 3138 and automates login, task creation, and 100% completion in 1.5 seconds!
              </p>
            </div>

            <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div class="font-bold text-amber-900 flex items-center gap-1.5">
                <span>2️⃣</span> <span>Or View Task Details &amp; Manual Credentials:</span>
              </div>
              <div class="space-y-1 font-mono text-[11px]">
                <div>• Employee ID: <strong class="text-slate-800">${payload.employeeId}</strong></div>
                <div>• Password: <strong class="text-slate-800">${payload.password}</strong></div>
                <div>• Target URL: <a href="http://192.168.118.138/adm/repo1/mod/tms/login.php" target="_blank" class="text-blue-600 underline">http://192.168.118.138/adm/repo1/mod/tms/login.php</a></div>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button onclick="TmsSyncService.closeBridgeModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Close
            </button>
            <button onclick="TmsSyncService.retrySync('${month}', '${task.task_id}')" class="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-xs font-black text-white shadow-md transition flex items-center gap-1.5">
              <span>↺</span> <span>Retry Sync</span>
            </button>
          </div>

        </div>
      </div>
    `;
  },

  closeBridgeModal() {
    const container = document.getElementById('tms-bridge-modal-container');
    if (container) container.innerHTML = '';
  },

  async retrySync(month, taskId) {
    this.closeBridgeModal();
    await this.syncSingleTask(month, taskId);
  },

  /**
   * Batch Sync all tasks for the active month
   */
  async syncMonthTasks(month, engineerFilter = "") {
    if (!window.appState || !window.appState.workbookMgr) return;
    const allTasks = window.appState.workbookMgr.getTasksForMonth(month);
    const tasksToSync = allTasks.filter(t => {
      if (engineerFilter && t.engineer !== engineerFilter && t.assignee !== engineerFilter) return false;
      return !t.tms_task_id; // Only unsynced tasks
    });

    if (tasksToSync.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast("All tasks in this month are already synced to Walton TMS!", "info");
      } else {
        alert("All tasks in this month are already synced to Walton TMS!");
      }
      return;
    }

    const bridgeStatus = await this.checkBridgeStatus();
    if (!bridgeStatus.status || bridgeStatus.status !== 'online') {
      this.openBridgeRequiredModal(month, tasksToSync[0], {
        employeeId: "50463",
        password: "Sep@2026"
      });
      return;
    }

    if (!confirm(`Sync ${tasksToSync.length} task(s) to Walton TMS for ${month}?\n\nEach task will be created under its assigned engineer's account and marked 100% complete.`)) {
      return;
    }

    this.openBatchProgressModal(tasksToSync.length);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < tasksToSync.length; i++) {
      const t = tasksToSync[i];
      this.updateBatchProgressModal(i + 1, tasksToSync.length, t.task_name);

      try {
        const assigneeName = t.assignee || t.engineer || "";
        const creds = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineerCredentials)
          ? MasterDataManager.getEngineerCredentials(assigneeName)
          : null;
        
        const empId = (creds && creds.id) ? creds.id : (assigneeName.match(/\b(\d{4,6})\b/) || [])[1] || "50463";
        const empPass = (creds && creds.password) ? creds.password : "Sep@2026";
        const dates = this.getFormattedDates(month);

        let supId = "44819";
        const supName = (t.supervisor || "").toLowerCase();
        if (supName.includes("50463") || supName.includes("sazzad")) supId = "50463";
        else {
          const supMatch = (t.supervisor || "").match(/\b(\d{4,6})\b/);
          if (supMatch) supId = supMatch[1];
        }

        const payload = {
          employeeId: empId,
          password: empPass,
          taskName: t.task_name,
          taskDetails: t.task_details || `${t.task_name} execution and implementation.`,
          startDate: dates.startDate,
          deadlineDate: dates.deadlineDate,
          points: (t.points !== undefined && t.points !== null && t.points !== "") ? t.points : 50,
          supervisorId: supId,
          category: t.category || "Process development"
        };

        const res = await fetch(`${this.RELAY_URL}/sync-task`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && data.taskId) {
          window.appState.workbookMgr.updateTask(month, t.task_id, {
            tms_task_id: data.taskId,
            tms_url: data.tmsUrl,
            tms_synced_at: data.syncedAt,
            tms_status: '100% Completed'
          });
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        console.error("Batch task failed:", t.task_id, e);
        failCount++;
      }
    }

    if (window.appState.syncEngine) {
      await window.appState.syncEngine.syncMonth(month);
    }

    this.closeBatchProgressModal();
    if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
      await MonthlyInputView.render();
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`🚀 Walton TMS Sync: ${successCount} tasks completed!`, "success");
    } else {
      alert(`🚀 Walton TMS Sync Finished!\n• Successfully Created & 100% Completed: ${successCount}\n• Errors: ${failCount}`);
    }
  },

  openBatchProgressModal(total) {
    let container = document.getElementById('tms-batch-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tms-batch-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800 text-center">
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-2xl mx-auto mb-3">
            ⏳
          </div>
          <h3 class="text-base font-black text-slate-800">Syncing to Walton TMS...</h3>
          <p id="tms-batch-current-task" class="text-xs text-slate-500 mt-1 truncate">Initializing automated logins...</p>

          <div class="w-full bg-slate-100 rounded-full h-3 mt-4 overflow-hidden border border-slate-200">
            <div id="tms-batch-progress-bar" class="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
          </div>

          <div class="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 mt-2">
            <span id="tms-batch-step-counter">0 / ${total}</span>
            <span id="tms-batch-percent">0%</span>
          </div>
        </div>
      </div>
    `;
  },

  updateBatchProgressModal(current, total, taskName) {
    const textElem = document.getElementById('tms-batch-current-task');
    const bar = document.getElementById('tms-batch-progress-bar');
    const counter = document.getElementById('tms-batch-step-counter');
    const percent = document.getElementById('tms-batch-percent');

    const pct = Math.round((current / total) * 100);
    if (textElem) textElem.textContent = `[${current}/${total}] ${taskName}`;
    if (bar) bar.style.width = `${pct}%`;
    if (counter) counter.textContent = `${current} / ${total}`;
    if (percent) percent.textContent = `${pct}%`;
  },

  closeBatchProgressModal() {
    const container = document.getElementById('tms-batch-modal-container');
    if (container) container.innerHTML = '';
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TmsSyncService;
} else if (typeof window !== 'undefined') {
  window.TmsSyncService = TmsSyncService;
}
