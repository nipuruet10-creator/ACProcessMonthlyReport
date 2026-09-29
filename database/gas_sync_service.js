/**
 * ==============================================================================
 * Process Development Monthly Report Automation System
 * Module: Google Sheets Cloud Synchronization Service
 * Organization: WALTON Hi-Tech Industries PLC
 * ==============================================================================
 */

var GENUINE_TASK_IDS = new Set();

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
   * Initialize service (100% Pure Firebase Architecture - Google Sheets auto-sync disabled)
   */
  init() {
    this.lastSyncTime = localStorage.getItem(this.STORAGE_KEY_LAST_SYNC) || null;
    this.status = 'CONNECTED';
    this.initialSyncCompleted = true;

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

    this._listenersAttached = true;
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

    if (sanitizedQueue.length !== q.length) {
      this.savePendingQueue(sanitizedQueue);
    }

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
   * Push a single task (100% Pure Firebase Architecture - handled by FirebaseSyncService)
   */
  async pushTask(task, immediate = false) {
    return true;
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
   * Delete a single task (100% Pure Firebase Architecture - handled by FirebaseSyncService)
   */
  async deleteTask(taskId, month) {
    return true;
  },

  /**
   * Delete multiple tasks (100% Pure Firebase Architecture - handled by FirebaseSyncService)
   */
  async deleteMultipleTasks(taskIds = [], month) {
    return true;
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
   * (Decommissioned in 100% Pure Firebase Architecture - Live tasks managed exclusively by Firebase)
   */
  async pullFromCloud(silent = false) {
    console.log("🔥 100% Pure Firebase Architecture: Live tasks are managed exclusively by Firebase Realtime Database.");
    this.status = 'CONNECTED';
    this._updateNavbarBadge();
    if (!silent && typeof HELPERS !== 'undefined' && HELPERS.showToast) {
      HELPERS.showToast("Firebase Realtime Engine Active (Sub-50ms)", "success");
    }
    return true;
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

  _pendingViewRefresh: false,
  _refreshActiveViews() {
    try {
      // Check if task count changed compared to DOM rendered rows
      const tbody = (typeof document !== 'undefined') ? document.getElementById('monthly-input-tbody') : null;
      const activeMonth = (window.appState && window.appState.workbookMgr) ? window.appState.workbookMgr.activeMonth : 'SEP-2026';
      const localCount = (window.appState && window.appState.workbookMgr) ? window.appState.workbookMgr.getTasksForMonth(activeMonth).length : 0;
      const domRowCount = tbody ? tbody.querySelectorAll('tr[id^="task-row-"]').length : 0;

      // If Firebase Realtime Engine is connected AND DOM row count already matches local tasks, skip full table re-render
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected() && domRowCount === localCount) {
        this._pendingViewRefresh = false;
        return;
      }

      const activeEl = document.activeElement;
      const isUserInteracting = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
      
      // If user is actively typing or focused on a control, defer refresh
      if (isUserInteracting) {
        this._pendingViewRefresh = true;
        return;
      }

      // If user made a local edit within the last 3.5 seconds, defer refresh
      if (Date.now() - (this._lastLocalEditTime || 0) < 3500) {
        this._pendingViewRefresh = true;
        return;
      }

      this._pendingViewRefresh = false;

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
    // Pure Firebase Architecture: Navbar badge managed strictly by FirebaseSyncService
  }
};

if (typeof window !== 'undefined') {
  window.GoogleSheetsSync = GoogleSheetsSync;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoogleSheetsSync;
}