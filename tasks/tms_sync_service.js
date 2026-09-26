/**
 * Process Development Monthly Report Automation System
 * Module: Walton eService TMS Sync Service & Auto-Pilot Engine
 * Automatically logs in per-employee, creates Direct Tasks, and completes them 100% on Walton TMS
 * WALTON Hi-Tech Industries PLC
 */

const TmsSyncService = {
  RELAY_URL: 'http://127.0.0.1:3138',
  FALLBACK_RELAY_URLS: ['http://127.0.0.1:3138', 'http://192.168.50.158:3138'],
  activeRelayUrl: 'http://127.0.0.1:3138',
  isBridgeRunning: false,
  _checkingBridge: false,

  /**
   * Check if local background relay or LAN relay is reachable
   */
  async checkBridgeStatus() {
    const customHost = (typeof localStorage !== 'undefined') ? localStorage.getItem('walton_tms_relay_host') : null;
    const candidates = [
      customHost,
      'http://127.0.0.1:3138',
      'http://192.168.50.158:3138'
    ].filter(Boolean);

    for (const url of candidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1600);
        const res = await fetch(`${url}/status`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 'online') {
            this.activeRelayUrl = url;
            this.isBridgeRunning = true;
            return data;
          }
        }
      } catch (e) {
        // try next candidate
      }
    }
    this.isBridgeRunning = false;
    return { status: 'offline', relay: 'stopped' };
  },

  /**
   * Format dates for Walton TMS (YYYY-MM-DD 12:00:00)
   * Requirement 1: Assign date is 7 days before today OR 1st of running month.
   * Deadline is ALWAYS 1 day after the running date (tomorrow).
   */
  getFormattedDates(monthCode) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    let targetYear = now.getFullYear();
    let targetMonthNum = now.getMonth() + 1;

    if (monthCode && monthCode.includes('-')) {
      const parts = monthCode.split('-');
      const mStr = parts[0].toUpperCase();
      const yStr = parseInt(parts[1], 10);
      if (!isNaN(yStr)) targetYear = yStr;

      const mIdx = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(mStr);
      if (mIdx !== -1) targetMonthNum = mIdx + 1;
    }

    const isCurrentMonth = (targetYear === now.getFullYear() && targetMonthNum === (now.getMonth() + 1));

    // Deadline: "Deadline always running date er cheye 1 din pore hobe" -> today + 1 day
    const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const deadlineDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())} 12:00:00`;

    // Assign Date: "Task Assign date aj theke 7 din age or running month er 1 tarik hobe."
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const firstOfTargetMonth = new Date(targetYear, targetMonthNum - 1, 1, 12, 0, 0);

    let assignDateObj;
    if (isCurrentMonth) {
      assignDateObj = (sevenDaysAgo < firstOfTargetMonth) ? firstOfTargetMonth : sevenDaysAgo;
    } else {
      assignDateObj = firstOfTargetMonth;
    }

    const startDate = `${assignDateObj.getFullYear()}-${pad(assignDateObj.getMonth() + 1)}-${pad(assignDateObj.getDate())} 12:00:00`;

    const diffMs = Math.abs(tomorrow.getTime() - assignDateObj.getTime());
    const totalDays = String(Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));

    return { startDate, deadlineDate, totalDays };
  },

  /**
   * Generates or finds the next sequential Walton TMS code
   */
  getNextTmsCode(month) {
    let maxCode = 104870;
    try {
      if (window.appState && window.appState.workbookMgr) {
        const tasks = window.appState.workbookMgr.getTasksForMonth(month);
        tasks.forEach(t => {
          const match = String(t.tms_task_id || t.status || t.remarks || '').match(/\b(10\d{4})\b/);
          if (match) {
            const val = parseInt(match[1], 10);
            if (val > maxCode) maxCode = val;
          }
        });
      }
    } catch (e) {}
    return String(maxCode + 1);
  },

  /**
   * Sync a single task to Walton TMS - Opens Confirmation Modal First (Requirement 2)
   * The user reviews task details & confirms before submitting.
   * @param {string} month
   * @param {string} taskId
   */
  async syncSingleTask(month, taskId, autoConfirm = false) {
    if (autoConfirm) {
      return this.executeTaskSync(month, taskId);
    }
    return this.openTmsConfirmModal(month, taskId);
  },

  /**
   * Walton TMS Confirmation Modal (Shown BEFORE clicking TMS / submitting)
   * Displays Task Name, Assigned Engineer, Supervisor, Points, Dates, and editable TMS Password
   */
  openTmsConfirmModal(month, taskId) {
    if (!window.appState || !window.appState.workbookMgr) return;
    const task = window.appState.workbookMgr.getTask(month, taskId);
    if (!task) return;

    // Check if task already has a genuine TMS ID
    const existingTms = this.getTmsInfo(task);
    if (existingTms && existingTms.tms_task_id && !String(existingTms.tms_task_id).startsWith('MOCK')) {
      const fullTask = { ...task, ...existingTms };
      this.updateRowTmsBadgeInPlace(month, taskId, fullTask);
      if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.body) {
        this.openTmsActionsMenu(null, month, taskId, existingTms.tms_task_id);
      }
      return { success: true, tms_code: existingTms.tms_task_id, tms_link: existingTms.tms_url, status: "Completed" };
    }

    // Resolve assigned engineer strictly from this row (NO fallback to Sazzad!)
    const assigneeName = (task.assignee || task.engineer || "").trim();
    const creds = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineerCredentials)
      ? MasterDataManager.getEngineerCredentials(assigneeName)
      : null;
    
    const empId = (creds && creds.id) ? creds.id : (assigneeName.match(/\b(\d{4,6})\b/) || [])[1];
    if (!empId) {
      alert(`⚠️ Please select an assigned engineer with Employee ID for this task row before submitting to Walton TMS.`);
      return;
    }

    const engFullName = (creds && creds.fullName) ? creds.fullName : (assigneeName || `ID: ${empId}`);
    const engDisplay = (creds && creds.display) ? creds.display : `${assigneeName} (${empId})`;
    const currentPass = (creds && creds.password) ? creds.password : "Sep@2026";
    const dates = this.getFormattedDates(month);

    let supId = "44819";
    let supName = "Kamrul (44819)";
    if (task.supervisor) {
      supName = task.supervisor;
      const sLower = task.supervisor.toLowerCase();
      if (sLower.includes("50463") || sLower.includes("sazzad")) supId = "50463";
      else {
        const supMatch = task.supervisor.match(/\b(\d{4,6})\b/);
        if (supMatch) supId = supMatch[1];
      }
    }

    const points = (task.points !== undefined && task.points !== null && task.points !== "") ? task.points : 50;
    const category = task.category || "Process development";

    let container = document.getElementById('tms-confirm-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tms-confirm-modal-container';
      document.body.appendChild(container);
    }

    const escape = (str) => (typeof HELPERS !== 'undefined' && HELPERS.escapeHtml) ? HELPERS.escapeHtml(str) : String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans animate-in fade-in duration-150">
        <div class="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-800 animate-in zoom-in-95 duration-150">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-2xl flex-shrink-0 shadow-xs">
                🏢
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900">Walton TMS Submission Confirmation</h3>
                <p class="text-xs text-slate-500">Confirm task details before creating &amp; marking 100% complete in Walton TMS.</p>
              </div>
            </div>
            <button onclick="TmsSyncService.closeConfirmModal()" class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">✕</button>
          </div>

          <!-- Body -->
          <div class="my-4 space-y-3.5 text-xs text-slate-700">
            
            <!-- Task Title Banner -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Task Title</span>
              <div class="font-bold text-slate-900 text-sm leading-snug">${escape(task.task_name)}</div>
              ${task.task_details ? `<div class="text-[11px] text-slate-500 mt-1 line-clamp-2">${escape(task.task_details)}</div>` : ''}
            </div>

            <!-- Parameters Grid -->
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="bg-blue-50/60 border border-blue-200 rounded-xl p-2.5">
                <span class="text-[10px] font-bold uppercase tracking-wider text-blue-800 block mb-0.5">Assigned Engineer</span>
                <div class="font-bold text-slate-900">${escape(engDisplay)}</div>
                <div class="text-[10px] font-mono text-blue-700 font-bold mt-0.5">Employee ID: ${empId}</div>
              </div>

              <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Supervisor (HOD)</span>
                <div class="font-bold text-slate-900">${escape(supName)}</div>
                <div class="text-[10px] font-mono text-slate-500 mt-0.5">ID: ${supId}</div>
              </div>

              <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Category &amp; Points</span>
                <div class="font-semibold text-slate-800 truncate">${escape(category)}</div>
                <div class="text-[10px] font-mono text-emerald-700 font-bold mt-0.5">⚡ ${points} Points</div>
              </div>

              <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Timeline (Assign / Deadline)</span>
                <div class="font-mono text-[11px] text-slate-800 font-semibold">${dates.startDate.slice(0, 10)} ➔ ${dates.deadlineDate.slice(0, 10)}</div>
                <div class="text-[10px] font-mono text-slate-500 mt-0.5">${dates.totalDays} Days Duration</div>
              </div>
            </div>

            <!-- Engineer TMS Password Field (Editable) -->
            <div class="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2">
              <div class="flex items-center justify-between">
                <label for="tms-confirm-password" class="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                  <span>🔑</span> <span>Walton TMS Password for ${escape(engFullName)} (${empId})</span>
                </label>
                <span class="text-[10px] text-amber-800 font-mono font-semibold">Walton Intranet</span>
              </div>
              <div class="relative flex items-center">
                <input type="password" id="tms-confirm-password" value="${escape(currentPass)}"
                       placeholder="Enter Walton TMS Password..."
                       class="w-full bg-white border border-amber-300 focus:border-amber-600 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 pr-10 shadow-xs" 
                       onkeydown="if(event.key==='Enter') TmsSyncService.handleConfirmModalSubmit('${month}', '${task.task_id}', '${empId}')" />
                <button type="button" onclick="const f=document.getElementById('tms-confirm-password'); f.type=(f.type==='password'?'text':'password'); this.textContent=(f.type==='password'?'👁️':'🔒')"
                        title="Toggle Password Visibility"
                        class="absolute right-2.5 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-1">
                  👁️
                </button>
              </div>
              <div class="flex items-center justify-between pt-0.5 text-[11px] text-slate-600">
                <label class="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" id="tms-save-password-chk" checked class="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 cursor-pointer" />
                  <span>Remember this password for ${escape(engFullName)}</span>
                </label>
                <span class="text-[10px] text-slate-400 font-medium">Strictly per-engineer</span>
              </div>
            </div>

          </div>

          <!-- Footer Actions -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-mono">Host: 192.168.118.138</span>
            <div class="flex items-center gap-2">
              <button type="button" onclick="TmsSyncService.closeConfirmModal()" 
                      class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer">
                Cancel
              </button>
              <button type="button" id="tms-confirm-submit-btn" 
                      onclick="TmsSyncService.handleConfirmModalSubmit('${month}', '${task.task_id}', '${empId}')"
                      class="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 active:scale-95 text-xs font-black text-white shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer">
                <span>Confirm &amp; Submit 100% 🚀</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  closeConfirmModal() {
    const container = document.getElementById('tms-confirm-modal-container');
    if (container) container.innerHTML = '';
  },

  async handleConfirmModalSubmit(month, taskId, empId) {
    const passInput = document.getElementById('tms-confirm-password');
    const chk = document.getElementById('tms-save-password-chk');
    const submitBtn = document.getElementById('tms-confirm-submit-btn');

    const enteredPass = passInput ? passInput.value.trim() : '';
    if (!enteredPass) {
      alert("Please enter the Walton TMS password for this engineer.");
      if (passInput) passInput.focus();
      return;
    }

    if (chk && chk.checked && typeof MasterDataManager !== 'undefined' && MasterDataManager.updateTmsPassword) {
      MasterDataManager.updateTmsPassword(empId, enteredPass);
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="animate-spin inline-block mr-1">⌛</span><span>Connecting...</span>`;
    }

    this.closeConfirmModal();
    await this.executeTaskSync(month, taskId, {
      employeeId: empId,
      password: enteredPass
    });
  },

  /**
   * Executes the real Walton TMS task creation and 100% completion
   */
  async executeTaskSync(month, taskId, credOverride = null) {
    if (!window.appState || !window.appState.workbookMgr) return;
    const task = window.appState.workbookMgr.getTask(month, taskId);
    if (!task) return;

    const btn = document.getElementById(`tms-btn-${taskId}`);
    const slot = document.getElementById(`tms-action-slot-${taskId}`);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block mr-1">⌛</span><span>Syncing...</span>`;
      btn.className = "inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500 text-white font-bold text-[9px] shadow-xs cursor-wait flex-shrink-0 whitespace-nowrap";
    }

    // Resolve engineer credentials strictly from row / credOverride (NEVER fallback to Sazzad)
    const assigneeName = (task.assignee || task.engineer || "").trim();
    const creds = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineerCredentials)
      ? MasterDataManager.getEngineerCredentials(assigneeName)
      : null;

    const empId = (credOverride && credOverride.employeeId)
      ? credOverride.employeeId
      : ((creds && creds.id) ? creds.id : (assigneeName.match(/\b(\d{4,6})\b/) || [])[1]);

    if (!empId) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>TMS</span>`;
        btn.className = "inline-flex items-center px-2 py-0.5 rounded-md bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-[9px] shadow-xs cursor-pointer flex-shrink-0 whitespace-nowrap";
      }
      alert("⚠️ No Employee ID found for this task. Please assign an engineer from the dropdown.");
      return { success: false, error: "Missing Employee ID" };
    }

    const empPass = (credOverride && credOverride.password)
      ? credOverride.password
      : ((creds && creds.password) ? creds.password : "Sep@2026");

    // Check if relay bridge is reachable
    const bridgeStatus = await this.checkBridgeStatus();
    if (!bridgeStatus.status || bridgeStatus.status !== 'online') {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>TMS</span>`;
        btn.className = "inline-flex items-center px-2 py-0.5 rounded-md bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-[9px] shadow-xs cursor-pointer flex-shrink-0 whitespace-nowrap";
      }
      this.openBridgeRequiredModal(month, task, {
        employeeId: empId,
        password: empPass
      });
      return;
    }

    const dates = this.getFormattedDates(month);
    let supId = "44819";
    const supName = (task.supervisor || "").toLowerCase();
    if (supName.includes("50463") || supName.includes("sazzad")) supId = "50463";
    else {
      const supMatch = (task.supervisor || "").match(/\b(\d{4,6})\b/);
      if (supMatch) supId = supMatch[1];
    }

    const payload = {
      employeeId: empId,
      password: empPass,
      taskName: task.task_name,
      taskDetails: task.task_details || `${task.task_name} execution and implementation.`,
      startDate: dates.startDate,
      deadlineDate: dates.deadlineDate,
      totalDays: dates.totalDays,
      points: (task.points !== undefined && task.points !== null && task.points !== "") ? task.points : 50,
      supervisorId: supId,
      category: task.category || "Process development"
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const res = await fetch(`${this.activeRelayUrl || this.RELAY_URL}/sync-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      // Check for Authentication / Password failure (Requirement 1: "TMS er password kaj na korle warning dibe")
      if (res.status === 401 || (data && data.authError)) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span>TMS</span>`;
          btn.className = "inline-flex items-center px-2 py-0.5 rounded-md bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-[9px] shadow-xs cursor-pointer flex-shrink-0 whitespace-nowrap";
        }
        this.openTmsPasswordWarningModal(month, taskId, empId, assigneeName, (data && data.error) ? data.error : "Invalid TMS password");
        if (typeof window.showToast === 'function') {
          window.showToast(`⚠️ Walton TMS password invalid for ${assigneeName}!`, "error");
        }
        return { success: false, authError: true, error: data ? data.error : "Auth failed" };
      }

      if (!data || !data.success || !data.taskId) {
        throw new Error((data && data.error) ? data.error : "Walton TMS did not return a valid task ID");
      }

      const tmsId = String(data.taskId);
      const tmsUrl = data.tmsUrl || `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${tmsId}`;
      const syncedAt = data.syncedAt || new Date().toISOString();

      // 1. Update Task in Workbook with returned genuine TMS metadata
      const updates = {
        tms_task_id: tmsId,
        tms_url: tmsUrl,
        tms_synced_at: syncedAt,
        tms_status: '100% Completed',
        status: `TMS#${tmsId} (100% Completed)`,
        remarks: `TMS_ID:${tmsId}`
      };
      window.appState.workbookMgr.updateTask(month, taskId, updates);

      // 2. Save to persistent localStorage map
      try {
        const syncedMap = JSON.parse(localStorage.getItem('walton_tms_synced_records') || '{}');
        const rec = { tms_task_id: tmsId, tms_url: tmsUrl, tms_synced_at: syncedAt };
        syncedMap[taskId] = rec;
        if (task.task_name) syncedMap[task.task_name.trim().toLowerCase()] = rec;
        localStorage.setItem('walton_tms_synced_records', JSON.stringify(syncedMap));
      } catch (e) {}

      // 3. Instant in-place DOM update (button turns into green badge with options)
      if (slot) {
        const fullTask = window.appState.workbookMgr.getTask(month, taskId) || { ...task, ...updates };
        slot.innerHTML = this.renderTmsBadgeHtml(fullTask);
      }

      // 4. Cloud / Firebase broadcast
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
        const fullTask = window.appState.workbookMgr.getTask(month, taskId);
        if (fullTask) FirebaseSyncService.pushTask(month, fullTask);
      }
      if (window.appState.syncEngine) {
        window.appState.syncEngine.syncMonth(month).catch(() => {});
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`✅ Walton TMS #${tmsId} created & 100% Completed for ${assigneeName}!`, "success");
      }

      return {
        success: true,
        tms_code: tmsId,
        tms_link: tmsUrl,
        status: "Completed"
      };

    } catch (err) {
      console.error("TMS Sync failed:", err);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>TMS</span>`;
        btn.className = "inline-flex items-center px-2 py-0.5 rounded-md bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-[9px] shadow-xs cursor-pointer flex-shrink-0 whitespace-nowrap";
      }

      // Check if error message indicates authentication failure
      const msg = err.message || '';
      if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('authentication') || msg.includes('401')) {
        this.openTmsPasswordWarningModal(month, taskId, empId, assigneeName, msg);
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast(`❌ Walton TMS Error: ${msg}`, "error");
        } else {
          alert(`❌ Walton TMS Error: ${msg}`);
        }
      }
      return { success: false, error: msg };
    }
  },

  /**
   * Password Warning Modal (Requirement 1: "TMS er password kaj na korle warning dibe")
   * Displays warning that password was rejected, prompts for correct password, and allows retry
   */
  openTmsPasswordWarningModal(month, taskId, empId, assigneeName, errorMsg) {
    let container = document.getElementById('tms-warning-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tms-warning-modal-container';
      document.body.appendChild(container);
    }

    const escape = (str) => (typeof HELPERS !== 'undefined' && HELPERS.escapeHtml) ? HELPERS.escapeHtml(str) : String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans animate-in fade-in duration-150">
        <div class="relative w-full max-w-md bg-white border border-rose-200 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-800 animate-in zoom-in-95 duration-150">
          
          <!-- Header -->
          <div class="flex items-start justify-between pb-3 border-b border-rose-100">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center text-2xl flex-shrink-0 shadow-xs">
                ⚠️
              </div>
              <div>
                <h3 class="text-base font-black text-rose-950">Walton TMS Password Rejected</h3>
                <p class="text-xs text-rose-600 font-medium">Authentication failed on Walton TMS Intranet.</p>
              </div>
            </div>
            <button onclick="TmsSyncService.closeWarningModal()" class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">✕</button>
          </div>

          <!-- Body -->
          <div class="my-4 space-y-3 text-xs text-slate-700">
            <div class="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 space-y-1.5">
              <div class="text-rose-950 font-bold">
                Login failed for: <span class="text-rose-700 font-black">${escape(assigneeName)} (ID: ${empId})</span>
              </div>
              <p class="text-slate-600 text-[11px] leading-relaxed">
                Walton TMS rejected the password used for this employee ID. The task was <strong class="text-rose-700 font-bold">NOT</strong> submitted to avoid creating it under another person's account.
              </p>
              <div class="text-[10px] font-mono text-rose-700 bg-white/80 p-2 rounded-xl border border-rose-200 break-words">
                ${escape(errorMsg || 'Invalid Walton TMS password')}
              </div>
            </div>

            <!-- Password Input -->
            <div class="space-y-1.5">
              <label for="tms-retry-password-input" class="font-bold text-slate-800 block text-xs">
                Enter Correct Walton TMS Password for ${empId}:
              </label>
              <div class="relative flex items-center">
                <input type="password" id="tms-retry-password-input" placeholder="Enter personal TMS password..."
                       class="w-full bg-white border border-slate-300 focus:border-blue-600 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10 shadow-xs" 
                       onkeydown="if(event.key==='Enter') TmsSyncService.submitRetryPassword('${month}', '${taskId}', '${empId}', '${escape(assigneeName)}')" />
                <button type="button" onclick="const f=document.getElementById('tms-retry-password-input'); f.type=(f.type==='password'?'text':'password'); this.textContent=(f.type==='password'?'👁️':'🔒')"
                        title="Toggle Password Visibility"
                        class="absolute right-2.5 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-1">
                  👁️
                </button>
              </div>
              <label class="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer pt-1 select-none">
                <input type="checkbox" id="tms-warning-save-chk" checked class="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 cursor-pointer" />
                <span>Save this password in master list for future tasks</span>
              </label>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" onclick="TmsSyncService.closeWarningModal()" 
                    class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer">
              Cancel
            </button>
            <button type="button" onclick="TmsSyncService.submitRetryPassword('${month}', '${taskId}', '${empId}', '${escape(assigneeName)}')"
                    class="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 active:scale-95 text-xs font-black text-white shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer">
              <span>Retry Submission ↺</span>
            </button>
          </div>

        </div>
      </div>
    `;
  },

  closeWarningModal() {
    const container = document.getElementById('tms-warning-modal-container');
    if (container) container.innerHTML = '';
  },

  async submitRetryPassword(month, taskId, empId, assigneeName) {
    const input = document.getElementById('tms-retry-password-input');
    const chk = document.getElementById('tms-warning-save-chk');
    const newPass = input ? input.value.trim() : '';
    if (!newPass) {
      alert("Please enter the Walton TMS password.");
      if (input) input.focus();
      return;
    }

    if (chk && chk.checked && typeof MasterDataManager !== 'undefined' && MasterDataManager.updateTmsPassword) {
      MasterDataManager.updateTmsPassword(empId, newPass);
    }

    this.closeWarningModal();
    await this.executeTaskSync(month, taskId, {
      employeeId: empId,
      password: newPass
    });
  },

  /**
   * Quick Options Menu for existing synced tasks (Re-sync, Change ID, Unlink)
   */
  openTmsActionsMenu(event, month, taskId, tmsId) {
    if (event) event.stopPropagation();
    if (!window.appState || !window.appState.workbookMgr) return;
    const task = window.appState.workbookMgr.getTask(month, taskId);
    if (!task) return;

    let container = document.getElementById('tms-actions-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tms-actions-modal-container';
      document.body.appendChild(container);
    }

    const tmsUrl = task.tms_url || `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${tmsId}`;
    const escape = (str) => (typeof HELPERS !== 'undefined' && HELPERS.escapeHtml) ? HELPERS.escapeHtml(str) : String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm font-sans animate-in fade-in duration-150" onclick="TmsSyncService.closeActionsMenu()">
        <div class="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 text-slate-800 animate-in zoom-in-95 duration-150" onclick="event.stopPropagation()">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <span class="text-xl">🏢</span>
              <div>
                <h4 class="text-sm font-black text-slate-900">Walton TMS Options</h4>
                <div class="text-[11px] font-mono text-emerald-700 font-bold">Linked Task #${tmsId}</div>
              </div>
            </div>
            <button onclick="TmsSyncService.closeActionsMenu()" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer">✕</button>
          </div>

          <div class="my-3 space-y-2 text-xs">
            <a href="${tmsUrl}" target="_blank" rel="noopener noreferrer"
               class="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 hover:text-blue-700 font-bold transition">
              <span class="flex items-center gap-2"><span>↗</span> <span>Open in Walton TMS Intranet</span></span>
              <span class="text-[10px] text-slate-400 font-mono">192.168.118.138</span>
            </a>

            <button type="button" onclick="TmsSyncService.unlinkAndResubmit('${month}', '${taskId}')"
                    class="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100 border border-blue-200 text-blue-900 font-bold transition text-left cursor-pointer">
              <span class="flex items-center gap-2"><span>🔄</span> <span>Re-Submit / Switch Engineer</span></span>
              <span class="text-[10px] text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-200">Re-sync</span>
            </button>

            <button type="button" onclick="TmsSyncService.unlinkTmsTask('${month}', '${taskId}', '${tmsId}')"
                    class="w-full flex items-center justify-between p-3 rounded-xl bg-rose-50/50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold transition text-left cursor-pointer">
              <span class="flex items-center gap-2"><span>✕</span> <span>Unlink TMS ID from this row</span></span>
              <span class="text-[10px] text-rose-600">Revert to TMS button</span>
            </button>
          </div>

          <div class="pt-2 border-t border-slate-100 text-center">
            <button onclick="TmsSyncService.closeActionsMenu()" class="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer">
              Close
            </button>
          </div>

        </div>
      </div>
    `;
  },

  closeActionsMenu() {
    const container = document.getElementById('tms-actions-modal-container');
    if (container) container.innerHTML = '';
  },

  unlinkTmsTask(month, taskId, tmsId) {
    if (!confirm(`Unlink TMS #${tmsId} from this task?\n\nThis will remove the badge and show the blue 'TMS' button again.`)) {
      return;
    }
    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.updateTask(month, taskId, {
        tms_task_id: '',
        tms_url: '',
        tms_status: '',
        status: 'In Progress',
        remarks: ''
      });
      try {
        const syncedMap = JSON.parse(localStorage.getItem('walton_tms_synced_records') || '{}');
        delete syncedMap[taskId];
        localStorage.setItem('walton_tms_synced_records', JSON.stringify(syncedMap));
      } catch (e) {}

      if (window.appState.syncEngine) window.appState.syncEngine.syncMonth(month);
    }
    this.closeActionsMenu();
    this.updateRowTmsBadgeInPlace(month, taskId, { tms_task_id: '' });
    if (typeof window.showToast === 'function') {
      window.showToast(`TMS #${tmsId} unlinked from task`, 'info');
    }
  },

  unlinkAndResubmit(month, taskId) {
    this.closeActionsMenu();
    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.updateTask(month, taskId, {
        tms_task_id: '',
        tms_url: '',
        tms_status: ''
      });
      this.updateRowTmsBadgeInPlace(month, taskId, { tms_task_id: '' });
    }
    this.openTmsConfirmModal(month, taskId);
  },


  /**
   * Resolve TMS information for a task from any source
   * (Direct properties, status string, remarks string, localStorage cache, or known tasks)
   */
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
    if (tmsId && String(tmsId).trim() !== '' && String(tmsId) !== 'undefined' && String(tmsId) !== 'null') {
      return {
        tms_task_id: String(tmsId).trim(),
        tms_url: url || `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${tmsId}`,
        tms_synced_at: syncedAt || new Date().toISOString()
      };
    }

    // 2. Parse from status e.g. "TMS#104868 (100% Completed)" or "TMS 104868"
    const statusMatch = String(task.status || '').match(/(?:TMS(?:_ID)?|[#:_-\s])+(\d{5,7})/i);
    if (statusMatch) {
      tmsId = statusMatch[1];
      return {
        tms_task_id: tmsId,
        tms_url: `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${tmsId}`,
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }

    // 3. Parse from remarks e.g. "TMS_ID:104867" or "TMS#104869" or "TMS:104867"
    const remarksMatch = String(task.remarks || '').match(/(?:TMS(?:_ID)?|[#:_-\s])+(\d{5,7})/i) ||
                         String(task.remarks || '').match(/\b(\d{5,7})\b/);
    if (remarksMatch) {
      tmsId = remarksMatch[1];
      return {
        tms_task_id: tmsId,
        tms_url: `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${tmsId}`,
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }

    // 4. Check persistent LocalStorage cache by EXACT taskId or task_name
    try {
      const cache = JSON.parse(localStorage.getItem('walton_tms_synced_records') || '{}');
      if (task.task_id && cache[task.task_id]) {
        return cache[task.task_id];
      }
      if (task.task_name && cache[task.task_name.trim().toLowerCase()]) {
        return cache[task.task_name.trim().toLowerCase()];
      }
    } catch (e) {}

    // 5. Pre-configured known genuine tasks from Walton TMS (Locked permanence)
    const KNOWN_TMS_TASKS = {
      'SEP-2026-001-EE2': '104867',
      'SEP-2026-002-4YT': '104869',
      'SEP-2026-003-SJ2': '104868',
      'SEP-2026-004-C44': '104870',
      'SEP-2026-001': '104812',
      'SEP-2026-002-PXV': '104813'
    };

    if (task.task_id && KNOWN_TMS_TASKS[task.task_id]) {
      const id = KNOWN_TMS_TASKS[task.task_id];
      return {
        tms_task_id: id,
        tms_url: `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${id}`,
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }

    // Robust matching by task name for known tasks
    const nameLower = (task.task_name || '').toLowerCase().trim();
    if (nameLower.includes('cnc turret punch') || nameLower.includes('turret punch machine')) {
      return {
        tms_task_id: '104867',
        tms_url: 'http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=104867',
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }
    if (nameLower.includes('powder coating')) {
      return {
        tms_task_id: '104869',
        tms_url: 'http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=104869',
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }
    if (nameLower.includes('compressor jacket 24m0610')) {
      return {
        tms_task_id: '104868',
        tms_url: 'http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=104868',
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }
    if (nameLower.includes('screen printing')) {
      return {
        tms_task_id: '104870',
        tms_url: 'http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=104870',
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }
    if (nameLower.includes('die setup for 18m') || nameLower.includes('foil compressor jacket new die setup')) {
      return {
        tms_task_id: '104888',
        tms_url: 'http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=104888',
        tms_synced_at: task.last_updated || new Date().toISOString()
      };
    }
    if (nameLower.includes('assembly line reclocation') || nameLower.includes('assembly line relocation') || (nameLower.includes('assembly line') && nameLower.includes('rac'))) {
      return {
        tms_task_id: '104889',
        tms_url: 'http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=104889',
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
    if (isSynced && (!task.tms_task_id || task.tms_task_id !== tmsInfo.tms_task_id)) {
      task.tms_task_id = tmsInfo.tms_task_id;
      task.tms_url = tmsInfo.tms_url;
      task.tms_synced_at = tmsInfo.tms_synced_at;
      if (!task.status || !task.status.includes('TMS')) {
        task.status = `TMS#${tmsInfo.tms_task_id} (100% Completed)`;
      }
      if (!task.remarks || !task.remarks.includes('TMS')) {
        task.remarks = `TMS_ID:${tmsInfo.tms_task_id}`;
      }
    }
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
    const month = task.month || (window.appState && window.appState.workbookMgr ? window.appState.workbookMgr.activeMonth : 'SEP-2026');
    return `
      <div class="inline-flex items-center gap-0.5 flex-shrink-0">
        <a href="${url}" target="_blank" rel="noopener noreferrer"
           title="Walton TMS Task #${tmsId} (100% Complete) - Click to view in TMS"
           class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[9px] font-bold shadow-xs cursor-pointer flex-shrink-0 whitespace-nowrap">
          <span>🏢</span>
          <span>#${tmsId}</span>
          <span class="text-emerald-600 font-black">✔</span>
        </a>
        <button type="button" onclick="TmsSyncService.openTmsActionsMenu(event, '${month}', '${task.task_id}', '${tmsId}')"
                title="TMS Options: Re-sync, change engineer, or unlink"
                class="px-1 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded text-[9px] font-bold transition cursor-pointer">
          ⚙️
        </button>
      </div>
    `;
  },

  renderTmsButtonHtml(month, task) {
    return `
      <button id="tms-btn-${task.task_id}" onclick="TmsSyncService.openTmsConfirmModal('${month}', '${task.task_id}')"
              title="Review details &amp; Confirm Walton TMS Submission"
              class="inline-flex items-center px-2 py-0.5 rounded-md bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-[9px] shadow-xs cursor-pointer flex-shrink-0 whitespace-nowrap transition active:scale-95">
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

    const currentBridge = this.activeRelayUrl || 'http://127.0.0.1:3138';

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-800">
          
          <div class="flex items-start justify-between pb-3.5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl flex-shrink-0">
                ⚡
              </div>
              <div>
                <h3 class="text-base font-black text-slate-800">Walton TMS Bridge Connection</h3>
                <p class="text-xs text-slate-500">Connect Walton Intranet (192.168.118.138) or link TMS Task ID directly.</p>
              </div>
            </div>
            <button onclick="TmsSyncService.closeBridgeModal()" class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition">✕</button>
          </div>

          <div class="my-4 space-y-3.5 text-xs text-slate-600">
            
            <!-- Recommended Solution: Instant Direct TMS ID Link (Zero Network Dependency) -->
            <div class="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-4 space-y-2.5 shadow-sm">
              <div class="flex items-center justify-between">
                <span class="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                  <span>🚀</span> <span>Best &amp; Instant Solution: Enter TMS Task ID</span>
                </span>
                <span class="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">Recommended</span>
              </div>
              <p class="text-slate-600 text-[11px] leading-relaxed">
                Browser security blocks cloud HTTPS apps from connecting to local HTTP bridges. To link your Walton TMS task in 0ms without running any bridge:
              </p>
              <div class="flex items-center gap-2">
                <input type="text" id="manual-tms-input" placeholder="e.g. 104868 or paste TMS link..." 
                       class="flex-1 bg-white border border-emerald-300 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none shadow-xs" 
                       onkeydown="if(event.key==='Enter') TmsSyncService.linkManualTmsId('${month}', '${task.task_id}', this.value)" />
                <button type="button" onclick="TmsSyncService.linkManualTmsId('${month}', '${task.task_id}', document.getElementById('manual-tms-input').value)"
                        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex-shrink-0 cursor-pointer">
                  Link TMS ✔
                </button>
              </div>
              <div class="flex items-center justify-between text-[11px] pt-0.5 text-slate-500">
                <span>View task on Walton Intranet:</span>
                <a href="http://192.168.118.138/adm/repo1/mod/tms/login.php" target="_blank" class="text-blue-700 underline font-bold flex items-center gap-1">
                  <span>Open Walton TMS</span> <span>↗</span>
                </a>
              </div>
            </div>

            <!-- Option 1: Team Shared Bridge (Zero installation for colleagues!) -->
            <div class="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 space-y-2">
              <div class="font-bold text-blue-900 flex items-center justify-between">
                <span class="flex items-center gap-1.5"><span>🌐</span> <span>Option 2: Connect to Team Bridge (Sazzad's PC)</span></span>
                <span class="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-sans font-bold">Fastest</span>
              </div>
              <p class="text-slate-600 text-[11px]">
                If Sazzad's PC has the bridge running on the office Wi-Fi, you can sync through it without running anything on your PC!
              </p>
              <div class="flex items-center gap-2 pt-1">
                <button type="button" onclick="localStorage.setItem('walton_tms_relay_host', 'http://192.168.50.158:3138'); TmsSyncService.retrySync('${month}', '${task.task_id}')"
                        class="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer">
                  ⚡ Use Sazzad's Team Bridge (192.168.50.158)
                </button>
                <button type="button" onclick="localStorage.removeItem('walton_tms_relay_host'); TmsSyncService.retrySync('${month}', '${task.task_id}')"
                        class="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition cursor-pointer">
                  Reset to Localhost
                </button>
              </div>
            </div>

            <!-- Option 3: Local 1-Click Bridge -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div class="font-bold text-slate-800 flex items-center gap-1.5">
                <span>💻</span> <span>Option 3: Run Local Bridge on this PC</span>
              </div>
              <p class="text-slate-600 text-[11px]">
                Go to the project folder and double-click either:
              </p>
              <div class="grid grid-cols-2 gap-2 text-[11px] font-mono font-bold">
                <div class="bg-white border border-slate-300 rounded-xl p-2 text-indigo-700 flex items-center justify-between">
                  <span>Run_TMS_Sync_Bridge_Silent.vbs</span>
                  <span class="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Silent</span>
                </div>
                <div class="bg-white border border-slate-300 rounded-xl p-2 text-indigo-700 flex items-center justify-between">
                  <span>Run_TMS_Sync_Bridge.bat</span>
                  <span class="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Console</span>
                </div>
              </div>
            </div>

            <!-- Option 4: Manual Task & Credentials -->
            <div class="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 space-y-1.5">
              <div class="font-bold text-amber-900 flex items-center justify-between">
                <span class="flex items-center gap-1.5"><span>🔑</span> <span>Manual TMS Login Details</span></span>
                <a href="http://192.168.118.138/adm/repo1/mod/tms/login.php" target="_blank" class="text-[11px] text-blue-700 underline font-bold">Open Walton TMS ↗</a>
              </div>
              <div class="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-700">
                <div>ID: <strong class="text-slate-900">${payload.employeeId}</strong></div>
                <div>Pass: <strong class="text-slate-900">${payload.password}</strong></div>
              </div>
            </div>

          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-mono">Current: ${currentBridge}</span>
            <div class="flex items-center gap-2">
              <button onclick="TmsSyncService.closeBridgeModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
                Close
              </button>
              <button onclick="TmsSyncService.retrySync('${month}', '${task.task_id}')" class="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-xs font-black text-white shadow-md transition flex items-center gap-1.5">
                <span>↺</span> <span>Retry Sync</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  linkManualTmsId(month, taskId, inputVal) {
    if (!inputVal) {
      alert("Please enter a Walton TMS Task ID or paste the TMS link.");
      return;
    }
    let codeMatch = String(inputVal).match(/code=(\d+)/i) || String(inputVal).match(/\b(\d{5,7})\b/);
    const tmsCode = codeMatch ? codeMatch[1] : String(inputVal).trim();
    if (!tmsCode) {
      alert("Invalid TMS Task ID format. Example: 104868");
      return;
    }
    const tmsUrl = `http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=${tmsCode}`;
    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.updateTask(month, taskId, {
        tms_task_id: tmsCode,
        tms_url: tmsUrl,
        tms_status: '100% Completed',
        status: `TMS#${tmsCode} (100% Completed)`,
        remarks: `TMS_ID:${tmsCode}`,
        tms_synced_at: new Date().toISOString()
      });
      if (window.appState.syncEngine) {
        window.appState.syncEngine.syncMonth(month);
      }
    }
    this.closeBridgeModal();
    if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
      MonthlyInputView.render();
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`✅ Walton TMS #${tmsCode} linked & marked 100% Completed!`, "success");
    }
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
      const firstTask = tasksToSync[0];
      const firstAssignee = firstTask.assignee || firstTask.engineer || "";
      const firstCreds = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineerCredentials)
        ? MasterDataManager.getEngineerCredentials(firstAssignee)
        : null;
      const firstEmpId = (firstCreds && firstCreds.id) ? firstCreds.id : (firstAssignee.match(/\b(\d{4,6})\b/) || [])[1] || "";
      const firstPass = (firstCreds && firstCreds.password) ? firstCreds.password : "Sep@2026";

      this.openBridgeRequiredModal(month, firstTask, {
        employeeId: firstEmpId,
        password: firstPass
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
        
        const empId = (creds && creds.id) ? creds.id : (assigneeName.match(/\b(\d{4,6})\b/) || [])[1];
        if (!empId) {
          console.warn(`[Batch TMS] Skipping task without employee ID:`, t.task_id);
          failCount++;
          continue;
        }

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
          totalDays: dates.totalDays,
          points: (t.points !== undefined && t.points !== null && t.points !== "") ? t.points : 50,
          supervisorId: supId,
          category: t.category || "Process development"
        };

        const res = await fetch(`${this.activeRelayUrl || this.RELAY_URL}/sync-task`, {
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
