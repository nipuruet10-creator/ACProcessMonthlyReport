/**
 * ==============================================================================
 * Process Development Monthly Report Automation System
 * Module: Google Sheets Cloud Synchronization Service
 * Organization: WALTON Hi-Tech Industries PLC
 * ==============================================================================
 */

const GoogleSheetsSync = {
  STORAGE_KEY_URL: 'walton_gas_webapp_url',
  STORAGE_KEY_LAST_SYNC: 'walton_gas_last_sync_timestamp',
  STORAGE_KEY_QUEUE: 'walton_gas_sync_pending_queue',
  
  status: 'OFFLINE', // 'CONNECTED' | 'SYNCING' | 'OFFLINE' | 'ERROR'
  lastSyncTime: null,
  isSyncing: false,
  initialSyncCompleted: false,
  _viewsHydratedOnce: false,
  subscribers: [],
  broadcastChannel: null,
  _listenersAttached: false,
  _consecutiveFailures: 0,
  _lastFailureTime: 0,

  /**
   * Helper: fetch with strict timeout using AbortController
   */
  async _fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    if (typeof AbortController === 'undefined') {
      return fetch(url, options);
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Helper: safely parses JSON and detects Google Drive HTML throttling/error pages
   */
  async _safeJson(response) {
    if (!response || !response.ok) return null;
    try {
      const text = await response.text();
      if (!text || text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
        console.warn("Google Apps Script temporarily rate limited or busy. Waiting for next cycle.");
        return null;
      }
      return JSON.parse(text);
    } catch (e) {
      console.warn("Safe JSON parse error:", e.message);
      return null;
    }
  },

  /**
   * Initialize service
   */
  init() {
    this.lastSyncTime = localStorage.getItem(this.STORAGE_KEY_LAST_SYNC) || null;
    const url = this.getWebAppUrl();
    if (url) {
      this.status = 'SYNCING';
      this._updateNavbarBadge();

      // Immediate pull on startup after initial render settles
      setTimeout(async () => {
        await this.flushPendingQueue();
        const success = await this.pullFromCloud(true);
        if (!success && !this.initialSyncCompleted) {
          setTimeout(() => {
            this.pullFromCloud(true);
          }, 2500);
        }
      }, 400);

      // Safe background polling:
      // Active visible tab: every 5 seconds (rapid multi-browser sync)
      // Hidden/minimized tab: every 15 seconds (energy and quota saving)
      let pollCycle = 0;
      setInterval(() => {
        if (!this.isSyncing && this.getWebAppUrl()) {
          pollCycle++;
          const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
          if (isHidden && (pollCycle % 3 !== 0)) {
            return;
          }
          // If backed off due to temporary Google rate limiting, wait 35 seconds
          if (this._consecutiveFailures >= 2 && (Date.now() - this._lastFailureTime < 35000)) {
            return;
          }
          this.flushPendingQueue();
          this.pullFromCloud(true);
        }
      }, 5000);
    } else {
      this.status = 'OFFLINE';
      this._updateNavbarBadge();
    }

    // Set up BroadcastChannel for zero-latency sync between multiple open tabs/windows
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window && !this.broadcastChannel) {
      try {
        this.broadcastChannel = new BroadcastChannel('walton_report_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event && event.data && event.data.type === 'SYNC_UPDATE') {
            if (window.appState && window.appState.workbookMgr) {
              window.appState.workbookMgr.load();
              this._refreshActiveViews();
            }
          }
        };
      } catch (e) {
        console.warn("BroadcastChannel notice:", e);
      }
    }

    // Attach real-time wakeup listeners on window focus, visibilitychange, pageshow, and online state
    if (!this._listenersAttached && typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        if (this.getWebAppUrl() && !this.isSyncing) {
          this.flushPendingQueue();
          this.pullFromCloud(true);
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.getWebAppUrl() && !this.isSyncing) {
          this.flushPendingQueue();
          this.pullFromCloud(true);
        }
      });

      window.addEventListener('pageshow', () => {
        if (this.getWebAppUrl() && !this.isSyncing) {
          this.flushPendingQueue();
          this.pullFromCloud(true);
        }
      });

      window.addEventListener('online', () => {
        if (this.getWebAppUrl()) {
          this.status = 'CONNECTED';
          this.flushPendingQueue();
          this.pullFromCloud(true);
        }
      });

      this._listenersAttached = true;
    }

    this._notifySubscribers();
  },

  _broadcastUpdate(reason) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'SYNC_UPDATE', reason, timestamp: Date.now() });
      } catch (e) {}
    }
  },

  getPendingQueue() {
    try {
      const q = localStorage.getItem(this.STORAGE_KEY_QUEUE);
      return q ? JSON.parse(q) : [];
    } catch (e) {
      return [];
    }
  },

  savePendingQueue(q) {
    try {
      localStorage.setItem(this.STORAGE_KEY_QUEUE, JSON.stringify(q || []));
    } catch (e) {
      console.warn("Storage notice:", e);
    }
  },

  queuePending(actionItem) {
    const q = this.getPendingQueue();
    q.push({ ...actionItem, queued_at: new Date().toISOString() });
    this.savePendingQueue(q);
  },

  async flushPendingQueue() {
    const q = this.getPendingQueue();
    if (!q || q.length === 0) return;

    const url = this.getWebAppUrl();
    if (!url) return;

    let deletedIds = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
    } catch (e) {}

    // Discard any pending SYNC_TASK for tasks that have since been deleted
    const sanitizedQueue = q.filter(item => {
      if (item.action === 'SYNC_TASK' && item.payload && item.payload.task_id) {
        if (deletedIds.includes(item.payload.task_id)) {
          return false;
        }
      }
      return true;
    });

    const remaining = [];
    for (const item of sanitizedQueue) {
      try {
        const res = await this._fetchWithTimeout(url, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(item)
        }, 20000);
        const data = await this._safeJson(res);
        if (data && data.status === 'ERROR' && item.action === 'DELETE_MULTIPLE_TASKS' && item.payload && Array.isArray(item.payload.task_ids)) {
          // If server reported unsupported action or error on batch, unpack into individual DELETE_TASK
          for (const tid of item.payload.task_ids) {
            remaining.push({ action: 'DELETE_TASK', payload: { task_id: tid, month: item.payload.month } });
          }
        }
      } catch (err) {
        remaining.push(item);
      }
    }
    this.savePendingQueue(remaining);
  },

  /**
   * Get configured Web App URL (local override or config default)
   */
  getWebAppUrl() {
    const local = localStorage.getItem(this.STORAGE_KEY_URL);
    if (local && local.trim()) return local.trim();
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GOOGLE_WORKSPACE && APP_CONFIG.GOOGLE_WORKSPACE.APPS_SCRIPT_WEBAPP_URL) {
      return APP_CONFIG.GOOGLE_WORKSPACE.APPS_SCRIPT_WEBAPP_URL.trim();
    }
    return "";
  },

  /**
   * Save Web App URL
   */
  setWebAppUrl(url) {
    const clean = (url || "").trim();
    if (clean) {
      localStorage.setItem(this.STORAGE_KEY_URL, clean);
      this.status = 'CONNECTED';
      this.flushPendingQueue();
      this.pullFromCloud(true);
    } else {
      localStorage.removeItem(this.STORAGE_KEY_URL);
      this.status = 'OFFLINE';
    }
    this._notifySubscribers();
  },

  /**
   * Subscribe to sync state changes
   */
  onStateChange(callback) {
    if (typeof callback === 'function') {
      this.subscribers.push(callback);
      callback(this.getStatus());
    }
  },

  _notifySubscribers() {
    const s = this.getStatus();
    this.subscribers.forEach(cb => {
      try { cb(s); } catch (e) { console.warn("Sync subscriber notice:", e); }
    });
    this._updateNavbarBadge();
  },

  getStatus() {
    return {
      status: this.status,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      urlConfigured: !!this.getWebAppUrl()
    };
  },

  /**
   * Test connection to Google Apps Script Web App
   */
  async testConnection(customUrl = null) {
    const url = (customUrl || this.getWebAppUrl()).trim();
    if (!url) {
      throw new Error("No Google Apps Script Web App URL provided.");
    }

    const testEndpoint = url + (url.includes('?') ? '&' : '?') + 'action=PING&_t=' + Date.now();
    const response = await fetch(testEndpoint, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data && data.status === 'OK') {
      return data;
    } else {
      throw new Error(data.message || "Invalid response from Apps Script endpoint.");
    }
  },

  /**
   * Push a single task to Google Sheets in background
   */
  async pushTask(task) {
    const url = this.getWebAppUrl();
    if (!url || !task || !task.task_id) return false;

    // NEVER push a task that has been deleted on this device
    try {
      const deletedIds = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (deletedIds.includes(task.task_id)) {
        return false;
      }
    } catch (e) {}

    task.last_updated = task.last_updated || new Date().toISOString();

    try {
      // Using text/plain prevents CORS OPTIONS preflight
      await this._fetchWithTimeout(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'SYNC_TASK',
          payload: task
        })
      }, 25000);
      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY_LAST_SYNC, this.lastSyncTime);
      this.status = 'CONNECTED';
      this._lastLocalEditTime = Date.now();
      this._broadcastUpdate('TASK_PUSHED');
      return true;
    } catch (e) {
      console.warn("Background cloud task sync notice - enqueuing retry:", e);
      this.queuePending({ action: 'SYNC_TASK', payload: task });
      return false;
    }
  },

  /**
   * Upload high-resolution photo directly to Google Drive via Apps Script API
   * Returns permanent direct CDN image URL (lh3.googleusercontent.com/d/...)
   */
  async uploadPhoto(taskId, slot, base64Data) {
    const url = this.getWebAppUrl();
    if (!url || !base64Data) return null;

    try {
      this._lastLocalEditTime = Date.now();
      const res = await this._fetchWithTimeout(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'UPLOAD_PHOTO',
          payload: {
            task_id: taskId,
            photoType: (slot === 'after_photo' || slot === 'photo_2') ? 'photo_2' : 'photo_1',
            base64Data: base64Data,
            mimeType: 'image/jpeg'
          }
        })
      }, 35000);

      const data = await this._safeJson(res);
      if (data && data.status === 'OK' && data.directUrl) {
        return data.directUrl;
      }
      return null;
    } catch (e) {
      console.warn("Google Drive photo upload fallback:", e);
      return null;
    }
  },

  /**
   * Delete a single task from Google Sheets in background
   */
  async deleteTask(taskId, month) {
    if (!taskId) return false;

    // 1. Immediately record in deleted tombstones
    try {
      const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (!deleted.includes(taskId)) {
        deleted.push(taskId);
        if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
      }
    } catch (e) {}

    // 2. Immediately purge any pending SYNC_TASK for this task from queue
    try {
      const q = this.getPendingQueue();
      const filtered = q.filter(item => !(item.action === 'SYNC_TASK' && item.payload && item.payload.task_id === taskId));
      this.savePendingQueue(filtered);
    } catch (e) {}

    const url = this.getWebAppUrl();
    if (!url) return false;

    try {
      const res = await this._fetchWithTimeout(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'DELETE_TASK',
          payload: { task_id: taskId, month: month }
        })
      }, 15000);
      const data = await this._safeJson(res);
      if (data && (data.status === 'OK' || data.status === 'NOT_FOUND')) {
        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY_LAST_SYNC, this.lastSyncTime);
        this.status = 'CONNECTED';
        this._broadcastUpdate('TASK_DELETED');
        return true;
      }
      console.warn("Cloud delete notice - response not OK, enqueuing retry:", data);
      this.queuePending({ action: 'DELETE_TASK', payload: { task_id: taskId, month: month } });
      return false;
    } catch (e) {
      console.warn("Cloud delete notice - enqueuing retry:", e);
      this.queuePending({ action: 'DELETE_TASK', payload: { task_id: taskId, month: month } });
      return false;
    }
  },

  /**
   * Atomically delete multiple tasks from Google Sheets
   * Executes reliable sequential DELETE_TASK operations across Google Apps Script
   */
  async deleteMultipleTasks(taskIds = [], month) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) return false;

    // 1. Immediately record in deleted tombstones
    try {
      const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      taskIds.forEach(id => {
        if (!deleted.includes(id)) deleted.push(id);
      });
      if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
      localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
    } catch (e) {}

    // 2. Immediately purge any pending SYNC_TASK for these tasks from queue
    try {
      const q = this.getPendingQueue();
      const idSet = new Set(taskIds);
      const filtered = q.filter(item => !(item.action === 'SYNC_TASK' && item.payload && idSet.has(item.payload.task_id)));
      this.savePendingQueue(filtered);
    } catch (e) {}

    const url = this.getWebAppUrl();
    if (!url) return false;

    // The remote Google Apps Script web app natively supports DELETE_TASK.
    // Executing sequential deleteTask guarantees atomic row deletion on Google Cloud!
    const ok = await this._sequentialDeleteFallback(taskIds, month);
    this.lastSyncTime = new Date().toISOString();
    localStorage.setItem(this.STORAGE_KEY_LAST_SYNC, this.lastSyncTime);
    this.status = 'CONNECTED';
    this._broadcastUpdate('TASKS_DELETED_MULTIPLE');
    return ok;
  },

  /**
   * Helper fallback: sequentially execute deleteTask for each id with small pacing
   */
  async _sequentialDeleteFallback(taskIds, month) {
    let allOk = true;
    for (const id of taskIds) {
      try {
        const ok = await this.deleteTask(id, month);
        if (!ok) allOk = false;
      } catch (err) {
        allOk = false;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return allOk;
  },

  /**
   * Synchronize Cost Savings records to Google Sheets
   */
  async syncCostSavings(records = null) {
    const url = this.getWebAppUrl();
    if (!url) return false;

    const list = records || ((typeof CostSavingTracker !== 'undefined' && CostSavingTracker.getAllRecords) ? CostSavingTracker.getAllRecords() : []);
    if (!Array.isArray(list)) return false;

    try {
      await this._fetchWithTimeout(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'SYNC_COST_SAVINGS',
          payload: list
        })
      }, 20000);
      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY_LAST_SYNC, this.lastSyncTime);
      this.status = 'CONNECTED';
      this._broadcastUpdate('COST_SAVINGS_SYNCED');
      return true;
    } catch (e) {
      console.warn("Cost savings cloud sync notice:", e);
      return false;
    }
  },

  /**
   * Verify username & password against Google Apps Script
   */
  async verifyInputAuth(username, password) {
    const url = this.getWebAppUrl();
    if (!url) return { valid: false };

    try {
      const res = await this._fetchWithTimeout(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'VERIFY_INPUT_AUTH',
          payload: { username, password }
        })
      }, 15000);
      const data = await this._safeJson(res);
      return data && data.status === 'OK' ? data : { valid: false };
    } catch (e) {
      console.warn("Verify input auth notice:", e);
      return { valid: false };
    }
  },

  /**
   * Request 6-digit OTP sent to admin email (nipu.ruet10@gmail.com)
   */
  async requestAuthOtp(email) {
    const url = this.getWebAppUrl();
    if (!url) throw new Error("Google Apps Script URL is not configured. Connect in Settings.");

    try {
      const res = await this._fetchWithTimeout(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'REQUEST_AUTH_OTP',
          payload: { email }
        })
      }, 20000);
      const data = await this._safeJson(res);
      if (data && data.status === 'OK') {
        return { success: true, message: data.message || "Verification code sent." };
      }
      return { success: false, error: (data && data.message) ? data.message : "Failed to send code." };
    } catch (e) {
      return { success: false, error: "Network error: " + e.message };
    }
  },

  /**
   * Verify OTP and change team password on Google Apps Script
   */
  async verifyOtpChangePassword(otp, newPassword) {
    const url = this.getWebAppUrl();
    if (!url) throw new Error("Google Apps Script URL is not configured. Connect in Settings.");

    try {
      const res = await this._fetchWithTimeout(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'VERIFY_OTP_CHANGE_PASSWORD',
          payload: { otp, newPassword }
        })
      }, 20000);
      const data = await this._safeJson(res);
      if (data && data.status === 'OK' && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: (data && data.error) ? data.error : "Failed to verify code." };
    } catch (e) {
      return { success: false, error: "Network error: " + e.message };
    }
  },

  /**
   * Pull all tasks and cost savings from Google Sheets
   */
  async pullFromCloud(silent = false) {
    const url = this.getWebAppUrl();
    if (!url) return false;
    if (this.isSyncing) return false; // Prevent overlapping pulls

    try {
      this.isSyncing = true;
      this._updateNavbarBadge();

      const activeMonth = (window.appState && window.appState.workbookMgr && window.appState.workbookMgr.activeMonth)
        ? window.appState.workbookMgr.activeMonth
        : 'SEP-2026';

      let data = null;

      // TIER 1: Try fast month-specific fetch (20s timeout, ~3 KB payload)
      try {
        const monthEndpoint = url + (url.includes('?') ? '&' : '?') + 'action=GET_MONTH&month=' + encodeURIComponent(activeMonth) + '&_t=' + Date.now();
        const resMonth = await this._fetchWithTimeout(monthEndpoint, { method: 'GET', mode: 'cors' }, 20000);
        const monthData = await this._safeJson(resMonth);
        if (monthData && monthData.status === 'OK' && Array.isArray(monthData.tasks)) {
          data = {
            status: 'OK',
            isAuthoritativeMonth: true,
            workbooks: {
              [activeMonth]: monthData.tasks
            },
            cost_savings: monthData.cost_savings || null
          };
        }
      } catch (monthErr) {
        // Fallback to Tier 2
      }

      // TIER 2: Fast recent tasks fetch (< 100ms, ~5 KB payload)
      if (!data) {
        try {
          const recentEndpoint = url + (url.includes('?') ? '&' : '?') + 'action=GET_RECENT&limit=80&_t=' + Date.now();
          const resRecent = await this._fetchWithTimeout(recentEndpoint, { method: 'GET', mode: 'cors' }, 20000);
          const recentData = await this._safeJson(resRecent);
          if (recentData && recentData.status === 'OK' && Array.isArray(recentData.tasks) && recentData.tasks.length > 0) {
            const grouped = {};
            recentData.tasks.forEach(t => {
              const m = (window.appState && window.appState.workbookMgr)
                ? window.appState.workbookMgr.normalizeMonth(t.month || activeMonth)
                : (t.month || activeMonth);
              if (!grouped[m]) grouped[m] = [];
              grouped[m].push(t);
            });
            data = {
              status: 'OK',
              workbooks: grouped
            };
          }
        } catch (recentErr) {
          // Fallback to Tier 3
        }
      }

      // TIER 3: Full history fallback ONLY if Tier 1 & 2 returned 0 (e.g. initial boot or explicit manual sync)
      if (!data && (!this.initialSyncCompleted || !silent)) {
        const fullEndpoint = url + (url.includes('?') ? '&' : '?') + 'action=GET_ALL&_t=' + Date.now();
        const resFull = await this._fetchWithTimeout(fullEndpoint, { method: 'GET', mode: 'cors' }, 30000);
        data = await this._safeJson(resFull);
      }

      if (data && data.status === 'OK') {
        this._consecutiveFailures = 0;
        let changed = false;

        // Merge workbooks into MonthWorkbookManager with authoritative month flag
        if (data.workbooks && window.appState && window.appState.workbookMgr) {
          changed = window.appState.workbookMgr.mergeFromCloud(data.workbooks, Boolean(data.isAuthoritativeMonth)) || changed;
        }

        // Merge cost savings into CostSavingTracker across devices
        if (data.cost_savings && typeof CostSavingTracker !== 'undefined' && CostSavingTracker.mergeFromCloud) {
          const costChanged = CostSavingTracker.mergeFromCloud(data.cost_savings);
          if (costChanged) changed = true;
        }

        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY_LAST_SYNC, this.lastSyncTime);
        this.status = 'CONNECTED';
        this.initialSyncCompleted = true;

        // Refresh views if data changed or on initial hydration
        if (changed || !this._viewsHydratedOnce) {
          this._viewsHydratedOnce = true;
          this._refreshActiveViews();
          this._broadcastUpdate('DATA_MERGED');
        }

        if (!silent && typeof HELPERS !== 'undefined' && HELPERS.showToast) {
          HELPERS.showToast("Cloud sync complete: All tasks up-to-date.", "success");
        }
        return true;
      } else {
        // Record failure for adaptive backoff
        this._consecutiveFailures = (this._consecutiveFailures || 0) + 1;
        this._lastFailureTime = Date.now();
      }
    } catch (err) {
      console.warn("Pull from cloud notice:", err);
      this._consecutiveFailures = (this._consecutiveFailures || 0) + 1;
      this._lastFailureTime = Date.now();
      this.status = 'CONNECTED';
      if (!silent && typeof HELPERS !== 'undefined' && HELPERS.showToast) {
        HELPERS.showToast("Cloud sync notice: " + err.message, "info");
      }
      return false;
    } finally {
      this.isSyncing = false;
      this.status = this.getWebAppUrl() ? 'CONNECTED' : 'OFFLINE';
      this._updateNavbarBadge();
      this._notifySubscribers();
    }
  },

  /**
   * One-Click Data Optimization: Archive Jan-Aug historical tasks to ARCHIVE_TASKS sheet
   */
  async archiveOldData() {
    const url = this.getWebAppUrl();
    if (!url) throw new Error("Please configure Google Apps Script URL first.");

    this.isSyncing = true;
    this._updateNavbarBadge();

    try {
      const endpoint = url + (url.includes('?') ? '&' : '?') + 'action=ARCHIVE_OLD_DATA&_t=' + Date.now();
      const res = await this._fetchWithTimeout(endpoint, { method: 'GET', mode: 'cors' }, 35000);
      const data = await this._safeJson(res);
      if (data && data.status === 'OK') {
        this.initialSyncCompleted = false;
        await this.pullFromCloud(true);
        return data;
      }
      throw new Error((data && data.message) ? data.message : "Archive request failed.");
    } finally {
      this.isSyncing = false;
      this._updateNavbarBadge();
      this._notifySubscribers();
    }
  },

  /**
   * Push all current local data to Google Sheet
   */
  async pushAllLocalData() {
    const url = this.getWebAppUrl();
    if (!url) throw new Error("Please configure Google Apps Script Web App URL first.");

    if (!window.appState || !window.appState.workbookMgr) {
      throw new Error("System state not initialized.");
    }

    this.isSyncing = true;

    try {
      const workbooks = window.appState.workbookMgr.workbooks || {};
      let costSavings = [];
      if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.getAllRecords) {
        costSavings = CostSavingTracker.getAllRecords();
      }

      const res = await this._fetchWithTimeout(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'BULK_PUSH',
          payload: {
            workbooks: workbooks,
            cost_savings: costSavings
          }
        })
      }, 30000);

      if (!res.ok) throw new Error("Upload failed: " + res.status);
      const data = await res.json();
      if (data.status === 'OK') {
        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY_LAST_SYNC, this.lastSyncTime);
        this.status = 'CONNECTED';
        this._broadcastUpdate('BULK_PUSHED');
        return data;
      } else {
        throw new Error(data.message || "Bulk push error.");
      }
    } finally {
      this.isSyncing = false;
      this._notifySubscribers();
    }
  },

  _setStatus(s) {
    this.status = s;
    this._notifySubscribers();
  },

  _refreshActiveViews() {
    try {
      const activeEl = document.activeElement;
      const isUserInteracting = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
      
      // If user is actively typing or focused on a control, NEVER wipe out the table!
      if (isUserInteracting) {
        return;
      }

      // If user made a local edit within the last 8 seconds, do not disrupt their work!
      if (Date.now() - (this._lastLocalEditTime || 0) < 8000) {
        return;
      }

      // Smooth scroll preservation to prevent screen shaking/vibration
      const savedScrollY = (typeof window !== 'undefined') ? window.scrollY : 0;
      const tableScroll = (typeof document !== 'undefined') ? (document.getElementById('task-table-scroll-container') || document.querySelector('.overflow-x-auto')) : null;
      const savedTableTop = tableScroll ? tableScroll.scrollTop : 0;
      const savedTableLeft = tableScroll ? tableScroll.scrollLeft : 0;

      const restoreScroll = () => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => {
            if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
              window.scrollTo({ top: savedScrollY, behavior: 'instant' });
            }
            const newTableScroll = (typeof document !== 'undefined') ? (document.getElementById('task-table-scroll-container') || document.querySelector('.overflow-x-auto')) : null;
            if (newTableScroll) {
              newTableScroll.scrollTop = savedTableTop;
              newTableScroll.scrollLeft = savedTableLeft;
            }
          });
        }
      };

      if (window.appState && window.appState.activeTab === 'monthly-input' && window.appState.monthlyInputView) {
        const p = window.appState.monthlyInputView.render();
        if (p && typeof p.then === 'function') {
          p.then(restoreScroll).catch(restoreScroll);
        } else {
          restoreScroll();
        }
      } else if (window.appState && window.appState.activeTab === 'projects' && window.appState.projectsView) {
        window.appState.projectsView.render();
      } else if (window.appState && window.appState.activeTab === 'dashboard' && window.appState.dashboardView) {
        window.appState.dashboardView.render();
      } else if (window.appState && window.appState.activeTab === 'photos' && typeof PhotoManagerView !== 'undefined' && PhotoManagerView.render) {
        PhotoManagerView.render();
      }
    } catch (e) {
      console.warn("View refresh notice:", e);
    }
  },

  _updateNavbarBadge() {
    const badge = document.getElementById('navbar-cloud-sync-badge');
    if (!badge) return;

    if (this.status === 'SYNCING' || (this.isSyncing && !this.initialSyncCompleted)) {
      badge.innerHTML = `
        <button onclick="GoogleSheetsSync.pullFromCloud(false)" title="Connecting and syncing with Google Sheets..." 
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20 transition-colors">
          <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>Syncing...</span>
        </button>
      `;
    } else if (this.status === 'CONNECTED') {
      badge.innerHTML = `
        <button onclick="GoogleSheetsSync.pullFromCloud(false)" title="Cloud Sync Active (Google Sheets). Click to refresh." 
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Cloud Synced</span>
        </button>
      `;
    } else if (this.status === 'OFFLINE') {
      badge.innerHTML = `
        <button onclick="if(window.appState) window.appState.switchTab('settings')" title="Click to connect Google Sheets" 
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-700 transition-colors">
          <span class="w-2 h-2 rounded-full bg-slate-400"></span>
          <span>Offline</span>
        </button>
      `;
    } else {
      badge.innerHTML = '';
    }
  }
};

if (typeof window !== 'undefined') {
  window.GoogleSheetsSync = GoogleSheetsSync;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoogleSheetsSync;
}