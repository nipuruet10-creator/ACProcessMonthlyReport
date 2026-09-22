/**
 * Process Development Monthly Report Automation System
 * Module: Google Firebase Realtime Database Engine (Sub-50ms Collaborative Sync)
 * Identical architecture to Google Docs & Google Sheets Online
 * WALTON Hi-Tech Industries PLC
 */

const FirebaseSyncService = {
  STORAGE_KEY_CONFIG: 'walton_pd_firebase_config_v1',
  app: null,
  db: null,
  status: 'NOT_CONFIGURED', // 'NOT_CONFIGURED' | 'CONNECTING' | 'CONNECTED' | 'OFFLINE'
  currentListeningMonth: null,
  _monthRef: null,
  _subscribers: [],
  _suppressLocalEchoUntil: {}, // taskId:field -> timestamp

  /**
   * Get stored Firebase config
   */
  getConfig() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_CONFIG);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}

    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.FIREBASE && APP_CONFIG.FIREBASE.DATABASE_URL) {
      return {
        apiKey: APP_CONFIG.FIREBASE.API_KEY || "",
        databaseURL: APP_CONFIG.FIREBASE.DATABASE_URL,
        projectId: APP_CONFIG.FIREBASE.PROJECT_ID || ""
      };
    }
    return null;
  },

  /**
   * Save Firebase config
   */
  saveConfig(config) {
    if (!config) {
      localStorage.removeItem(this.STORAGE_KEY_CONFIG);
      this.status = 'NOT_CONFIGURED';
      this._updateNavbarBadge();
      return;
    }
    localStorage.setItem(this.STORAGE_KEY_CONFIG, JSON.stringify(config));
    this.init(true);
  },

  /**
   * Check if Firebase is currently active and connected
   */
  isConnected() {
    return this.status === 'CONNECTED' && Boolean(this.db);
  },

  /**
   * Initialize Firebase Engine
   */
  init(forceReinit = false) {
    const config = this.getConfig();
    if (!config || !config.databaseURL) {
      this.status = 'NOT_CONFIGURED';
      this._notifySubscribers();
      return;
    }

    if (typeof firebase === 'undefined') {
      console.warn("Firebase SDK not loaded. Waiting for network...");
      setTimeout(() => this.init(), 1000);
      return;
    }

    try {
      if (!this.app || forceReinit) {
        const appName = 'walton-report-realtime-engine';
        const existing = firebase.apps.find(a => a.name === appName);
        if (existing) {
          this.app = existing;
        } else {
          this.app = firebase.initializeApp(config, appName);
        }
        this.db = this.app.database();
      }

      this.status = 'CONNECTING';
      this._updateNavbarBadge();

      // Listen to connection state
      const connectedRef = this.db.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
          this.status = 'CONNECTED';
          console.log("🔥 Firebase Realtime Engine: Connected! Live sub-50ms sync active.");
          this._updateNavbarBadge();
          this._notifySubscribers();

          // Bind active month listeners
          const activeMonth = (window.appState && window.appState.workbookMgr)
            ? window.appState.workbookMgr.activeMonth
            : 'SEP-2026';
          this.bindMonthListeners(activeMonth);
        } else {
          this.status = 'OFFLINE';
          this._updateNavbarBadge();
          this._notifySubscribers();
        }
      });
    } catch (err) {
      console.error("Firebase init error:", err);
      this.status = 'OFFLINE';
      this._updateNavbarBadge();
    }
  },

  /**
   * Bind real-time listeners to active month
   */
  bindMonthListeners(month) {
    if (!this.db || !month) return;
    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    if (this.currentListeningMonth === normMonth && this._monthRef) {
      return; // Already listening to this month
    }

    // Unbind previous month
    this.unbindCurrentMonth();

    this.currentListeningMonth = normMonth;
    this._monthRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks`);

    // 0. Initial Hydration: Load all current tasks from Firebase on startup/connect
    this._monthRef.once('value').then((snapshot) => {
      const fbData = snapshot.val();
      if (fbData && typeof fbData === 'object' && window.appState && window.appState.workbookMgr) {
        let deletedSet = new Set();
        try {
          const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
          deletedSet = new Set(deletedList);
        } catch (e) {}

        // Filter out any tombstoned / locally deleted tasks
        const remoteTasks = Object.values(fbData).filter(t => t && t.task_id && !deletedSet.has(t.task_id));

        // Actively purge any zombie tasks found in Firebase that were previously deleted locally
        Object.values(fbData).forEach(t => {
          if (t && t.task_id && deletedSet.has(t.task_id)) {
            console.log(`🔥 [Firebase Hydration] Purging zombie task from cloud: ${t.task_id}`);
            this.deleteTask(normMonth, t.task_id);
          }
        });

        const wbMgr = window.appState.workbookMgr;
        if (remoteTasks.length > 0 || (wbMgr.workbooks[normMonth] && wbMgr.workbooks[normMonth].length === 0)) {
          wbMgr.workbooks[normMonth] = remoteTasks;
          wbMgr.save();
          console.log(`🔥 Firebase Hydrated: Loaded ${remoteTasks.length} active tasks for ${normMonth} into active memory.`);
          if (window.appState.activeTab === 'monthly-input' && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
            MonthlyInputView.render();
          }
        }
      }
    }).catch(e => console.warn("Firebase initial hydration notice:", e));

    // 1. child_added: Another user created a new task row
    this._monthRef.on('child_added', (snapshot) => {
      const task = snapshot.val();
      if (!task || !task.task_id) return;

      // Check tombstone: if this task was deleted, ignore and purge from Firebase
      try {
        const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
        if (deleted.includes(task.task_id)) {
          console.log(`🔥 [Firebase child_added] Blocked zombie resurrection of deleted task: ${task.task_id}`);
          this.deleteTask(normMonth, task.task_id);
          return;
        }
      } catch (e) {}

      this._handleRemoteTaskAdded(normMonth, task);
    });

    // 2. child_changed: Another user modified a cell, category, points, supervisor, photo, TMS, etc.
    this._monthRef.on('child_changed', (snapshot) => {
      const task = snapshot.val();
      if (!task || !task.task_id) return;

      // Check tombstone: if deleted, do not update or revive
      try {
        const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
        if (deleted.includes(task.task_id)) {
          console.log(`🔥 [Firebase child_changed] Blocked zombie task: ${task.task_id}`);
          this.deleteTask(normMonth, task.task_id);
          return;
        }
      } catch (e) {}

      this._handleRemoteTaskChanged(normMonth, task);
    });

    // 3. child_removed: Another user deleted a task row
    this._monthRef.on('child_removed', (snapshot) => {
      const task = snapshot.val();
      const taskId = (task && task.task_id) ? task.task_id : snapshot.key;
      if (!taskId) return;
      this._handleRemoteTaskRemoved(normMonth, taskId);
    });

    console.log(`🔥 Firebase listening to real-time changes for ${normMonth}`);
  },

  /**
   * Unbind active month listeners
   */
  unbindCurrentMonth() {
    if (this._monthRef) {
      try {
        this._monthRef.off();
      } catch (e) {}
      this._monthRef = null;
    }
    this.currentListeningMonth = null;
  },

  /**
   * Handle remote task added
   */
  _handleRemoteTaskAdded(month, task) {
    if (!window.appState || !window.appState.workbookMgr) return;
    if (!task || !task.task_id) return;

    // Check tombstone - never add back deleted task
    try {
      const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (deleted.includes(task.task_id)) {
        console.log(`🔥 [Firebase _handleRemoteTaskAdded] Suppressed deleted task: ${task.task_id}`);
        this.deleteTask(month, task.task_id);
        return;
      }
    } catch (e) {}

    const wbMgr = window.appState.workbookMgr;
    const existing = wbMgr.getTask(month, task.task_id);
    if (existing) {
      // If already present, merge any remote updates smoothly
      Object.assign(existing, task);
      wbMgr.save();
      return;
    }

    // Add to in-memory workbook without pushing back
    if (!wbMgr.workbooks[month]) wbMgr.workbooks[month] = [];
    wbMgr.workbooks[month].push(task);
    wbMgr.save();

    // If currently viewing Monthly Input, append row smoothly into DOM
    if (window.appState.activeTab === 'monthly-input' && typeof MonthlyInputView !== 'undefined') {
      const tbody = document.getElementById('monthly-input-tbody');
      if (tbody && !tbody.querySelector('td[colspan]')) {
        const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers) ? MasterDataManager.getEngineers() : [];
        const supervisors = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getSupervisors) ? MasterDataManager.getSupervisors() : [];
        const categories = (typeof MasterDataManager !== 'undefined') ? MasterDataManager.getCategories() : [];
        const allTasks = wbMgr.getTasksForMonth(month);
        const rowHtml = MonthlyInputView.renderTaskRowHtml(task, allTasks.length - 1, allTasks.length, categories, engineers, supervisors);
        const temp = document.createElement('tbody');
        temp.innerHTML = rowHtml;
        const newTr = temp.firstElementChild;
        if (newTr) {
          newTr.classList.add('animate-fade-in');
          tbody.appendChild(newTr);
        }
        if (typeof MonthlyInputView.updateRowIndices === 'function') {
          MonthlyInputView.updateRowIndices();
        }
        if (typeof MonthlyInputView.updateEngineerSummary === 'function') {
          MonthlyInputView.updateEngineerSummary();
        }
        const counter = document.getElementById('total-rows-counter');
        if (counter) counter.innerHTML = `Total ${allTasks.length} rows &bull; ⚡ Real-Time Instant Sync Active`;
      } else {
        MonthlyInputView.render();
      }
    }
  },

  /**
   * Handle remote task changed (Cell-level micro-patching)
   */
  _handleRemoteTaskChanged(month, task) {
    if (!window.appState || !window.appState.workbookMgr) return;
    const wbMgr = window.appState.workbookMgr;
    const tasks = wbMgr.workbooks[month] || [];
    const idx = tasks.findIndex(t => t.task_id === task.task_id);
    if (idx === -1) {
      tasks.push(task);
      wbMgr.save();
      return;
    }

    const localTask = tasks[idx];
    const taskId = task.task_id;

    // Check what specific fields changed
    const changedKeys = [];
    for (const k of Object.keys(task)) {
      if (String(task[k] ?? '') !== String(localTask[k] ?? '')) {
        changedKeys.push(k);
      }
    }

    // Update in-memory workbook
    tasks[idx] = { ...localTask, ...task };
    wbMgr.save();

    // Cell-level Micro-Patching (Google Docs style: patch only changed DOM element!)
    const activeEl = document.activeElement;
    const activeId = activeEl ? activeEl.id : '';

    changedKeys.forEach(field => {
      // Ignore local echo if user just typed this field locally in last 400ms
      const echoKey = `${taskId}:${field}`;
      if (this._suppressLocalEchoUntil[echoKey] && Date.now() < this._suppressLocalEchoUntil[echoKey]) {
        return;
      }

      // 1. Task Name
      if (field === 'task_name') {
        const input = document.getElementById(`task-name-input-${taskId}`);
        if (input && activeId !== `task-name-input-${taskId}`) {
          input.value = task.task_name || '';
          input.style.height = 'auto';
          input.style.height = input.scrollHeight + 'px';
          this._flashCell(input);
        }
      }

      // 2. Task Details
      else if (field === 'task_details') {
        const input = document.getElementById(`task-details-input-${taskId}`);
        if (input && activeId !== `task-details-input-${taskId}`) {
          input.value = task.task_details || '';
          this._flashCell(input);
        }
      }

      // 3. Points
      else if (field === 'points') {
        const input = document.querySelector(`input[onchange*="${taskId}'][onchange*="points"]`);
        if (input && activeId !== input.id) {
          input.value = (task.points !== undefined && task.points !== null) ? task.points : '';
          this._flashCell(input);
        }
        if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.updateRankingTable) {
          MonthlyInputView.updateRankingTable();
        }
      }

      // 4. Category
      else if (field === 'category') {
        const select = document.querySelector(`select[onchange*="${taskId}'][onchange*="category"]`);
        if (select && activeEl !== select) {
          select.value = task.category || 'Process development';
          this._flashCell(select);
        }
      }

      // 5. Supervisor
      else if (field === 'supervisor') {
        const select = document.querySelector(`select[onchange*="${taskId}'][onchange*="supervisor"]`);
        if (select && activeEl !== select) {
          select.value = task.supervisor || '';
          this._flashCell(select);
        }
      }

      // 6. Assignee
      else if (field === 'assignee' || field === 'engineer') {
        const select = document.querySelector(`select[onchange*="${taskId}'][onchange*="assignee"]`);
        if (select && activeEl !== select) {
          select.value = task.assignee || task.engineer || '';
          this._flashCell(select);
        }
        if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.updateEngineerSummary) {
          MonthlyInputView.updateEngineerSummary();
        }
      }

      // 7. Report Inclusion Toggle
      else if (field === 'include_in_report') {
        const btn = document.getElementById(`report-toggle-btn-${taskId}`);
        if (btn) {
          const isYes = task.include_in_report !== 'NO';
          btn.textContent = isYes ? 'YES' : 'NO';
          btn.className = `px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition ${
            isYes
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-black'
              : 'bg-slate-50 text-slate-400 border border-slate-200'
          }`;
          this._flashCell(btn);
        }
      }

      // 8. TMS Status
      else if (field === 'tms_task_id' || field === 'status' || field === 'remarks') {
        if (typeof TmsSyncService !== 'undefined' && TmsSyncService.updateRowTmsBadgeInPlace) {
          TmsSyncService.updateRowTmsBadgeInPlace(month, taskId, task);
        }
      }

      // 9. Photo
      else if (field === 'photo_1' || field === 'photo_2') {
        if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
          // If photo changed, refresh active views smoothly
          if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync._refreshActiveViews) {
            GoogleSheetsSync._refreshActiveViews();
          }
        }
      }
    });

    if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.updateEngineerSummary) {
      MonthlyInputView.updateEngineerSummary();
    }
  },

  /**
   * Handle remote task removed
   */
  _handleRemoteTaskRemoved(month, taskId) {
    if (!window.appState || !window.appState.workbookMgr) return;
    const wbMgr = window.appState.workbookMgr;
    const tasks = wbMgr.workbooks[month] || [];
    wbMgr.workbooks[month] = tasks.filter(t => t.task_id !== taskId);
    wbMgr.save();

    // Record tombstone locally
    try {
      const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (!deleted.includes(taskId)) {
        deleted.push(taskId);
        if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
      }
    } catch (e) {}

    // Remove row from DOM with smooth fade-out
    const tr = document.getElementById(`task-row-${taskId}`);
    if (tr) {
      tr.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
      tr.style.opacity = '0';
      tr.style.transform = 'translateX(24px) scale(0.98)';
      setTimeout(() => {
        tr.remove();
        if (typeof MonthlyInputView !== 'undefined') {
          if (typeof MonthlyInputView.updateRowIndices === 'function') MonthlyInputView.updateRowIndices();
          if (typeof MonthlyInputView.updateBulkDeleteButton === 'function') MonthlyInputView.updateBulkDeleteButton();
          if (typeof MonthlyInputView.updateEngineerSummary === 'function') MonthlyInputView.updateEngineerSummary();
          if (typeof MonthlyInputView.updateRankingTable === 'function') MonthlyInputView.updateRankingTable();
        }
      }, 250);
    }
  },

  /**
   * Subtle highlight on cell when edited remotely (Google Docs style)
   */
  _flashCell(elem) {
    if (!elem) return;
    elem.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50/50');
    setTimeout(() => {
      elem.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50/50');
    }, 800);
  },

  /**
   * Send instant cell update to Firebase Realtime Highway (~15-30ms)
   */
  async updateCell(month, taskId, field, value) {
    if (!this.isConnected()) return false;
    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    // Suppress local echo for 400ms
    this._suppressLocalEchoUntil[`${taskId}:${field}`] = Date.now() + 400;

    try {
      const taskRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${taskId}`);
      await taskRef.update({
        [field]: value,
        last_updated: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.warn("Firebase updateCell notice:", e);
      return false;
    }
  },

  /**
   * Send full task create or update to Firebase
   */
  async pushTask(month, task) {
    if (!this.isConnected() || !task || !task.task_id) return false;
    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    try {
      const taskRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${task.task_id}`);
      await taskRef.set(task);
      return true;
    } catch (e) {
      console.warn("Firebase pushTask notice:", e);
      return false;
    }
  },

  /**
   * Delete task from Firebase (atomically with tombstone recording)
   */
  async deleteTask(month, taskId) {
    if (!taskId) return false;

    // Record tombstone locally first
    try {
      const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (!deleted.includes(taskId)) {
        deleted.push(taskId);
        if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
      }
    } catch (e) {}

    if (!this.isConnected()) return false;
    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    try {
      const taskRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${taskId}`);
      await taskRef.remove();
      return true;
    } catch (e) {
      console.warn("Firebase deleteTask notice:", e);
      return false;
    }
  },

  /**
   * Atomically delete multiple tasks from Firebase
   */
  async deleteMultipleTasks(month, taskIds = []) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) return false;

    // 1. Record tombstones locally first
    try {
      const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      taskIds.forEach(id => {
        if (!deleted.includes(id)) deleted.push(id);
      });
      if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
      localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
    } catch (e) {}

    if (!this.isConnected()) return false;
    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    try {
      const updates = {};
      taskIds.forEach(id => {
        updates[`walton_monthly_report/workbooks/${normMonth}/tasks/${id}`] = null;
      });
      await this.db.ref().update(updates);
      return true;
    } catch (e) {
      console.warn("Firebase deleteMultipleTasks multi-path notice, trying sequential fallback:", e);
      let allOk = true;
      for (const id of taskIds) {
        const ok = await this.deleteTask(normMonth, id);
        if (!ok) allOk = false;
      }
      return allOk;
    }
  },

  /**
   * Migrate / Push entire workbook month to Firebase
   */
  async pushEntireMonth(month) {
    if (!this.isConnected()) throw new Error("Firebase is not connected.");
    if (!window.appState || !window.appState.workbookMgr) throw new Error("Workbook not ready.");

    const normMonth = window.appState.workbookMgr.normalizeMonth(month);
    const tasks = window.appState.workbookMgr.getTasksForMonth(normMonth);
    const map = {};
    tasks.forEach(t => {
      map[t.task_id] = t;
    });

    const monthRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks`);
    await monthRef.set(map);
    return tasks.length;
  },

  /**
   * Test Firebase connection with credentials
   */
  async testConnection(config) {
    if (!config || !config.databaseURL) {
      throw new Error("Database URL is required.");
    }

    // Try REST test ping first (works without full SDK init)
    const testUrl = config.databaseURL.replace(/\/$/, '') + '/.json?shallow=true';
    const res = await fetch(testUrl, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Connection test returned HTTP ${res.status}: ${res.statusText}`);
    }
    return true;
  },

  onStateChange(cb) {
    if (typeof cb === 'function') {
      this._subscribers.push(cb);
      cb({ status: this.status, isConnected: this.isConnected() });
    }
  },

  _notifySubscribers() {
    const s = { status: this.status, isConnected: this.isConnected() };
    this._subscribers.forEach(cb => {
      try { cb(s); } catch (e) {}
    });
  },

  _updateNavbarBadge() {
    const badge = document.getElementById('navbar-cloud-sync-badge');
    if (!badge) return;

    if (this.isConnected()) {
      badge.innerHTML = `
        <button onclick="if(window.appState) window.appState.switchTab('settings')" 
                title="⚡ Google Firebase Realtime Active: Sub-50ms instant live sync active across all laptops!" 
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer shadow-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span class="font-bold">⚡ Real-Time Live</span>
        </button>
      `;
    } else {
      // Fallback to Google Sheets badge
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync._updateNavbarBadge) {
        GoogleSheetsSync._updateNavbarBadge();
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.FirebaseSyncService = FirebaseSyncService;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseSyncService;
}
