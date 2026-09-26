/**
 * Process Development Monthly Report Automation System
 * Module: Google Firebase Realtime Database Engine (Sub-50ms Collaborative Sync)
 * Identical architecture to Google Docs & Google Sheets Online
 * WALTON Hi-Tech Industries PLC
 */
const GENUINE_TASK_IDS = new Set([
  'SEP-2026-001-EE2',
  'SEP-2026-002-4YT',
  'SEP-2026-003-SJ2',
  'SEP-2026-004-C44',
  'SEP-2026-005-A3D',
  'SEP-2026-005-FR5'
]);

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
    try {
      const raw = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      const cleaned = raw.filter(id => !GENUINE_TASK_IDS.has(id));
      localStorage.setItem('walton_deleted_task_ids', JSON.stringify(cleaned));
    } catch (e) {}

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
   * Hydrate tasks for a month from Firebase into local memory and reconcile
   */
  async hydrateMonth(month) {
    if (!this.db || !month) return false;
    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    try {
      const snapshot = await this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks`).once('value');
      const fbData = snapshot.val();
      const wbMgr = window.appState && window.appState.workbookMgr;
      if (!wbMgr) return false;

      let deletedSet = new Set();
      try {
        const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
        deletedList.filter(id => !GENUINE_TASK_IDS.has(id)).forEach(id => deletedSet.add(id));
      } catch (e) {}

      // Hydrate cloud tombstones from Firebase to guarantee cross-device permanent deletions (excluding protected tasks)
      try {
        const tombSnap = await this.db.ref('walton_monthly_report/deleted_task_ids').once('value');
        const cloudTombs = tombSnap.val();
        if (cloudTombs && typeof cloudTombs === 'object') {
          Object.keys(cloudTombs).forEach(id => {
            if (!GENUINE_TASK_IDS.has(id)) {
              deletedSet.add(id);
            }
          });
          localStorage.setItem('walton_deleted_task_ids', JSON.stringify(Array.from(deletedSet)));
        }
      } catch (e) {}

      // 🛡️ CRITICAL GUARD: Prune tombstoned tasks from in-memory workbook BEFORE processing, but STRICTLY IMMUNIZE genuine tasks
      if (wbMgr.workbooks && Array.isArray(wbMgr.workbooks[normMonth])) {
        const initCount = wbMgr.workbooks[normMonth].length;
        wbMgr.workbooks[normMonth] = wbMgr.workbooks[normMonth].filter(t => {
          if (!t || !t.task_id) return false;
          if (GENUINE_TASK_IDS.has(t.task_id)) return true; // IMMUNE
          return !deletedSet.has(t.task_id);
        });
        if (wbMgr.workbooks[normMonth].length !== initCount) {
          wbMgr.save();
        }
      }

      if (fbData && typeof fbData === 'object' && Object.keys(fbData).length > 0) {
        // Auto-heal tasks loaded from Firebase
        const remoteTasks = [];
        for (const [key, t] of Object.entries(fbData)) {
          if (!t || typeof t !== 'object') continue;
          if (!t.task_id) t.task_id = key; // Auto-heal missing task_id from Firebase key

          // 🛡️ STRICT REJECTION: If task is in deletedSet (tombstoned), NEVER resurrect it!
          if (deletedSet.has(t.task_id)) {
            console.warn(`🛡️ Firebase task ${t.task_id} is in deleted tombstones! Purging from cloud...`);
            this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${t.task_id}`).remove().catch(() => {});
            continue;
          }

          // Auto-repair supervisor to Kamrul (44819)
          if (!t.supervisor || String(t.supervisor).toLowerCase().includes('sazzad') || String(t.supervisor).includes('50463')) {
            t.supervisor = 'Kamrul (44819)';
          }

          // If task_name is missing from Firebase node, attempt to heal from local task
          const localMatch = wbMgr.getTask(normMonth, t.task_id);
          if (!t.task_name && localMatch && localMatch.task_name) {
            t.task_name = localMatch.task_name;
            t.assignee = t.assignee || localMatch.assignee;
            t.category = t.category || localMatch.category;
          }

          // Heal missing points from local task if Firebase has empty points but local has points
          const rPts = (t.points !== undefined && t.points !== null) ? String(t.points).trim() : '';
          const lPts = (localMatch && localMatch.points !== undefined && localMatch.points !== null) ? String(localMatch.points).trim() : '';
          if (rPts === '' && lPts !== '') {
            t.points = localMatch.points;
            this.updateCell(normMonth, t.task_id, 'points', t.points);
          }

          if (t.task_name && String(t.task_name).trim()) {
            remoteTasks.push(t);

            // Cross-device photo reconciliation on initial connect
            if (typeof photoManager !== 'undefined') {
              const isRecentBeforeDelete = localMatch && localMatch._photoDeleted_before && (Date.now() - localMatch._photoDeleted_before < 300000);
              const isRecentAfterDelete = localMatch && localMatch._photoDeleted_after && (Date.now() - localMatch._photoDeleted_after < 300000);
              const isRecentBeforeEdit = localMatch && localMatch._lastPhotoEditTime && (Date.now() - localMatch._lastPhotoEditTime < 15000);
              const isLocalBeforeEmpty = localMatch && localMatch.photo_1 === "";
              const isLocalAfterEmpty = localMatch && localMatch.photo_2 === "";

              if (t.photo_1) {
                if (!isRecentBeforeDelete && !isLocalBeforeEmpty && !localMatch?.clear_photos) {
                  photoManager.setTaskPhoto(t.task_id, 'before_photo', t.photo_1, t.photo_1, normMonth);
                }
              } else if (t.clear_photos || isLocalBeforeEmpty || (!isRecentBeforeEdit && isRecentBeforeDelete)) {
                photoManager.removePhoto(t.task_id, 'before_photo', normMonth);
              } else if (!t.photo_1 && !isRecentBeforeEdit) {
                photoManager.removePhoto(t.task_id, 'before_photo', normMonth);
              }

              if (t.photo_2) {
                if (!isRecentAfterDelete && !isLocalAfterEmpty && !localMatch?.clear_photos) {
                  photoManager.setTaskPhoto(t.task_id, 'after_photo', t.photo_2, t.photo_2, normMonth);
                }
              } else if (t.clear_photos || isLocalAfterEmpty || (!isRecentBeforeEdit && isRecentAfterDelete)) {
                photoManager.removePhoto(t.task_id, 'after_photo', normMonth);
              } else if (!t.photo_2 && !isRecentBeforeEdit) {
                photoManager.removePhoto(t.task_id, 'after_photo', normMonth);
              }
            }
          }
        }

        remoteTasks.sort((a, b) => (a.task_id || '').localeCompare(b.task_id || '', undefined, { numeric: true, sensitivity: 'base' }));

        const changed = wbMgr.mergeFromCloud({ [normMonth]: remoteTasks }, false);

        // Check if local has active tasks that Firebase is missing or incomplete (STRICTLY EXCLUDE DELETED TASKS)
        const localTasks = wbMgr.getTasksForMonth(normMonth);
        const missingOrIncomplete = localTasks.filter(lt => {
          if (!lt || !lt.task_name || !lt.task_id) return false;
          if (deletedSet.has(lt.task_id)) return false;
          let curDel = [];
          try { curDel = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]'); } catch(e) {}
          if (curDel.includes(lt.task_id)) return false;

          const fbItem = fbData[lt.task_id];
          return !fbItem || !fbItem.task_name;
        });
        if (missingOrIncomplete.length > 0) {
          console.log(`🔥 Pushing ${missingOrIncomplete.length} genuine local tasks to Firebase to repair/sync cloud...`);
          for (const mt of missingOrIncomplete) {
            if (!deletedSet.has(mt.task_id)) {
              await this.pushTask(normMonth, mt);
            }
          }
        }

        if (changed || missingOrIncomplete.length > 0) {
          wbMgr.save();
          console.log(`🔥 Firebase Hydrated: Loaded ${remoteTasks.length} active tasks for ${normMonth} into active memory.`);
          if (window.appState.activeTab === 'monthly-input' && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
            MonthlyInputView.render();
          }
          if (window.appState.activeTab === 'dashboard' && typeof DashboardController !== 'undefined' && DashboardController.render) {
            DashboardController.render();
          }
        }
        return true;
      } else {
        // Firebase has no tasks for this month yet. If local has tasks, seed Firebase!
        if (wbMgr.workbooks && Array.isArray(wbMgr.workbooks[normMonth])) {
          wbMgr.workbooks[normMonth] = wbMgr.workbooks[normMonth].filter(lt => lt && lt.task_id && !deletedSet.has(lt.task_id));
          wbMgr.save();
        }
        const localTasks = wbMgr.getTasksForMonth(normMonth).filter(lt => lt && lt.task_id && !deletedSet.has(lt.task_id));
        if (localTasks.length > 0) {
          console.log(`🔥 Seeding Firebase for ${normMonth} with ${localTasks.length} local tasks...`);
          await this.pushEntireMonth(normMonth);
        }
        return true;
      }
    } catch (e) {
      console.warn("Firebase hydrateMonth notice:", e);
      return false;
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
    this.hydrateMonth(normMonth);

    // 1. child_added: Another user created a new task row
    this._monthRef.on('child_added', (snapshot) => {
      const task = snapshot.val();
      if (!task || typeof task !== 'object') return;
      if (!task.task_id) task.task_id = snapshot.key;

      // Auto-repair supervisor
      if (!task.supervisor || String(task.supervisor).toLowerCase().includes('sazzad') || String(task.supervisor).includes('50463')) {
        task.supervisor = 'Kamrul (44819)';
      }

      this._handleRemoteTaskAdded(normMonth, task);
    });

    // 2. child_changed: Another user modified a cell, category, points, supervisor, photo, TMS, etc.
    this._monthRef.on('child_changed', (snapshot) => {
      const task = snapshot.val();
      if (!task || typeof task !== 'object') return;
      if (!task.task_id) task.task_id = snapshot.key;

      // Auto-repair supervisor
      if (!task.supervisor || String(task.supervisor).toLowerCase().includes('sazzad') || String(task.supervisor).includes('50463')) {
        task.supervisor = 'Kamrul (44819)';
      }

      this._handleRemoteTaskChanged(normMonth, task);
    });

    // 3. child_removed: Another user deleted a task row
    this._monthRef.on('child_removed', (snapshot) => {
      const task = snapshot.val();
      const taskId = (task && task.task_id) ? task.task_id : snapshot.key;
      if (!taskId) return;
      this._handleRemoteTaskRemoved(normMonth, taskId);
    });

    // 4. Real-time Cloud Tombstones from any laptop
    if (!this._tombstonesBound) {
      this._tombstonesBound = true;
      this.db.ref('walton_monthly_report/deleted_task_ids').on('child_added', (snapshot) => {
        const deletedId = snapshot.key;
        if (!deletedId || GENUINE_TASK_IDS.has(deletedId)) return;

        try {
          const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
          if (!deleted.includes(deletedId)) {
            deleted.push(deletedId);
            localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
          }
        } catch (e) {}

        if (window.appState && window.appState.workbookMgr) {
          const wbMgr = window.appState.workbookMgr;
          const activeMonth = wbMgr.activeMonth || 'SEP-2026';
          const tasks = wbMgr.getTasksForMonth(activeMonth);
          const found = tasks.some(t => t.task_id === deletedId);
          if (found) {
            this._handleRemoteTaskRemoved(activeMonth, deletedId);
          }
        }
      });
    }

    // 5. Real-time Master Engineers & Passwords Sync
    if (!this._engineersBound) {
      this._engineersBound = true;
      this.db.ref('walton_monthly_report/master_engineers').on('value', (snapshot) => {
        const val = snapshot.val();
        if (Array.isArray(val) && val.length > 0 && typeof MASTER_LISTS !== 'undefined') {
          val.forEach(remoteEng => {
            const local = MASTER_LISTS.ENGINEERS.find(e => String(e.id) === String(remoteEng.id));
            if (local) {
              if (remoteEng.tms_password) local.tms_password = remoteEng.tms_password;
              if (remoteEng.name) local.name = remoteEng.name;
              if (remoteEng.fullName) local.fullName = remoteEng.fullName;
              if (remoteEng.display) local.display = remoteEng.display;
            } else {
              MASTER_LISTS.ENGINEERS.push(remoteEng);
            }
          });
          try {
            localStorage.setItem("walton_pd_master_engineers_v2", JSON.stringify(MASTER_LISTS.ENGINEERS));
          } catch (e) {}
        }
      });
    }

    console.log(`🔥 Firebase listening to real-time changes for ${normMonth}`);
  },

  /**
   * Push master engineers and TMS credentials to Firebase
   */
  pushMasterEngineers(engineers) {
    if (!this.db || !Array.isArray(engineers)) return;
    try {
      this.db.ref('walton_monthly_report/master_engineers').set(engineers);
    } catch (e) {
      console.warn("Firebase pushMasterEngineers notice:", e);
    }
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

    let deletedSet = new Set();
    try {
      const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      deletedSet = new Set(deletedList);
    } catch (e) {}
    if (deletedSet.has(task.task_id)) {
      console.warn(`🛡️ Firebase child_added rejected tombstoned task: ${task.task_id}`);
      return;
    }

    const wbMgr = window.appState.workbookMgr;
    const existing = wbMgr.getTask(month, task.task_id);
    if (existing) {
      // If already present, merge any remote updates smoothly without wiping points
      for (const [k, v] of Object.entries(task)) {
        if (k === 'points') {
          const rPts = (v !== undefined && v !== null) ? String(v).trim() : '';
          const lPts = (existing.points !== undefined && existing.points !== null) ? String(existing.points).trim() : '';
          if (rPts === '' && lPts !== '') continue;
        }
        if ((k === 'task_name' || k === 'task_details') && (!v || String(v).trim() === '') && existing[k]) continue;
        existing[k] = v;
      }
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
    if (window.appState && window.appState.activeTab === 'dashboard' && typeof DashboardController !== 'undefined' && DashboardController.render) {
      DashboardController.render();
    }
  },

  /**
   * Handle remote task changed (Cell-level micro-patching)
   */
  _handleRemoteTaskChanged(month, task) {
    if (!window.appState || !window.appState.workbookMgr) return;
    if (!task || !task.task_id) return;

    let deletedSet = new Set();
    try {
      const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      deletedSet = new Set(deletedList);
    } catch (e) {}
    if (deletedSet.has(task.task_id)) {
      console.warn(`🛡️ Firebase child_changed rejected tombstoned task: ${task.task_id}`);
      return;
    }

    const wbMgr = window.appState.workbookMgr;
    const tasks = wbMgr.workbooks[month] || [];
    const idx = tasks.findIndex(t => t.task_id === task.task_id);
    if (idx === -1) {
      if (deletedSet.has(task.task_id)) return;
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

    // Cell-level Micro-Patching (Google Docs style: patch only changed DOM element!)
    const activeEl = document.activeElement;
    const activeId = activeEl ? activeEl.id : '';

    // Update in-memory workbook safely: NEVER let remote wipe user edits, valid points, or TMS badges
    const mergedTask = { ...localTask };
    for (const [k, v] of Object.entries(task)) {
      // Never overwrite field if user is actively focused on it in DOM!
      if (k === 'task_name' && activeId === `task-name-input-${taskId}`) {
        continue;
      }
      if (k === 'task_details' && activeId === `task-details-input-${taskId}`) {
        continue;
      }
      if (k === 'points' && activeId === `task-point-${taskId}`) {
        continue;
      }

      // Local edit recent guard (15s)
      if ((k === 'task_name' || k === 'task_details' || k === 'points') &&
          localTask._lastFieldEditTime && (Date.now() - localTask._lastFieldEditTime < 15000)) {
        continue;
      }

      // Never let placeholder overwrite real name
      if (k === 'task_name') {
        const vStr = String(v ?? '').trim();
        const lStr = String(localTask.task_name ?? '').trim();
        if (vStr === 'New Engineering Task' && lStr !== '' && lStr !== 'New Engineering Task') {
          continue;
        }
      }

      // TMS IMMUTABILITY: Never let empty/null wipe local TMS ID!
      if (k === 'tms_task_id' || k === 'tms_url' || k === 'tms_synced_at') {
        if (!v && localTask[k]) {
          continue;
        }
      }

      if (k === 'points') {
        const rPts = (v !== undefined && v !== null) ? String(v).trim() : '';
        const lPts = (localTask.points !== undefined && localTask.points !== null) ? String(localTask.points).trim() : '';
        if (rPts === '' && lPts !== '') {
          continue; // Preserve local points
        }
      }
      if ((k === 'task_name' || k === 'task_details') && (!v || String(v).trim() === '') && localTask[k]) {
        continue;
      }
      mergedTask[k] = v;
    }

    // If remote has TMS info, adopt it
    if (task.tms_task_id && !mergedTask.tms_task_id) {
      mergedTask.tms_task_id = String(task.tms_task_id);
    }
    // Also if local has TMS info from known tasks or remarks, keep it
    if (!mergedTask.tms_task_id && typeof TmsSyncService !== 'undefined') {
      const info = TmsSyncService.getTmsInfo(mergedTask);
      if (info && info.tms_task_id) {
        mergedTask.tms_task_id = info.tms_task_id;
        mergedTask.tms_url = info.tms_url;
      }
    }

    tasks[idx] = mergedTask;
    wbMgr.save();

    changedKeys.forEach(field => {
      // Ignore local echo if user just typed this field locally
      const echoKey = `${taskId}:${field}`;
      if (this._suppressLocalEchoUntil[echoKey] && Date.now() < this._suppressLocalEchoUntil[echoKey]) {
        return;
      }

      // 1. Task Name
      if (field === 'task_name') {
        const input = document.getElementById(`task-name-input-${taskId}`);
        if (input && activeId !== `task-name-input-${taskId}`) {
          const currentVal = input.value.trim();
          const incomingVal = String(task.task_name || '').trim();
          // Never overwrite genuine local name with default placeholder!
          if (incomingVal === 'New Engineering Task' && currentVal && currentVal !== 'New Engineering Task') {
            return;
          }
          input.value = incomingVal;
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
        const input = document.getElementById(`task-point-${taskId}`) || document.querySelector(`input[onchange*="${taskId}"][onchange*="points"]`);
        if (input && activeId !== input.id) {
          input.value = (task.points !== undefined && task.points !== null) ? task.points : '';
          this._flashCell(input);
        }
        if (typeof MonthlyInputView !== 'undefined') {
          if (MonthlyInputView.updateRankingTable) MonthlyInputView.updateRankingTable();
          if (MonthlyInputView.updateEngineerSummary) MonthlyInputView.updateEngineerSummary();
        }
      }

      // 4. Category
      else if (field === 'category') {
        const select = document.getElementById(`task-category-select-${taskId}`) ||
                       document.querySelector(`select[onchange*="${taskId}"][onchange*="category"]`);
        if (select && activeEl !== select) {
          const catVal = task.category || 'Process development';
          for (let opt of select.options) {
            if (opt.value.toLowerCase() === catVal.toLowerCase()) {
              select.value = opt.value;
              break;
            }
          }
          this._flashCell(select);
        }
      }

      // 5. Supervisor
      else if (field === 'supervisor') {
        const select = document.getElementById(`task-supervisor-select-${taskId}`) ||
                       document.querySelector(`select[onchange*="${taskId}"][onchange*="supervisor"]`);
        if (select && activeEl !== select) {
          const supVal = task.supervisor || '';
          for (let opt of select.options) {
            if (opt.value === supVal || opt.text === supVal || (supVal && opt.value.toLowerCase().includes(supVal.toLowerCase()))) {
              select.value = opt.value;
              break;
            }
          }
          this._flashCell(select);
        }
      }

      // 6. Assignee (Syncs engineer selection across all computers)
      else if (field === 'assignee' || field === 'engineer') {
        const select = document.getElementById(`task-assignee-select-${taskId}`) ||
                       document.querySelector(`select[onchange*="${taskId}"][onchange*="assignee"]`);
        if (select && activeEl !== select) {
          const val = task.assignee || task.engineer || '';
          let matched = false;
          for (let opt of select.options) {
            if (opt.value === val || opt.text === val || (val && opt.value.toLowerCase().includes(val.toLowerCase()))) {
              select.value = opt.value;
              matched = true;
              break;
            }
          }
          if (!matched && val) select.value = val;
          this._flashCell(select);
        }
        if (typeof MonthlyInputView !== 'undefined') {
          if (MonthlyInputView.updateEngineerSummary) MonthlyInputView.updateEngineerSummary();
          if (MonthlyInputView.filterTableRowsLocally) MonthlyInputView.filterTableRowsLocally();
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

      // 9. Photo real-time cross-device sync (Adds and deletes on all PCs immediately!)
      else if (field === 'photo_1' || field === 'photo_2') {
        const val = task[field];
        const slot = (field === 'photo_1') ? 'before_photo' : 'after_photo';
        if (!val || val === "" || val === "null") {
          // Another user deleted this photo: remove it cleanly on this PC!
          if (typeof photoManager !== 'undefined') {
            photoManager.removePhoto(taskId, slot, month);
          }
        } else {
          // Another user added/updated this photo: save it into this PC's photoManager!
          if (typeof photoManager !== 'undefined') {
            photoManager.setTaskPhoto(taskId, slot, val, val, month);
          }
        }

        // Live re-render if user is on Photo Manager, Monthly Report, or Monthly Input
        if (typeof window !== 'undefined' && window.appState) {
          const curTab = window.appState.activeTab || window.appState.currentTab || (typeof App !== 'undefined' ? App.currentTab : '');
          if (curTab === 'photo-manager' && typeof PhotoManagerView !== 'undefined' && PhotoManagerView.render) {
            PhotoManagerView.render();
          }
          if (curTab === 'monthly-report' && typeof MonthlyReportView !== 'undefined' && MonthlyReportView.render) {
            MonthlyReportView.render();
          }
          if (curTab === 'monthly-input' && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
            MonthlyInputView.render();
          }
        }
      }
    });

    if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.updateEngineerSummary) {
      MonthlyInputView.updateEngineerSummary();
    }
    if (window.appState && window.appState.activeTab === 'dashboard' && typeof DashboardController !== 'undefined' && DashboardController.render) {
      DashboardController.render();
    }
  },

  /**
   * Handle remote task removed
   */
  _handleRemoteTaskRemoved(month, taskId) {
    if (!taskId || GENUINE_TASK_IDS.has(taskId)) return;
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
        if (window.appState && window.appState.activeTab === 'dashboard' && typeof DashboardController !== 'undefined' && DashboardController.render) {
          DashboardController.render();
        }
      }, 250);
    } else {
      if (window.appState && window.appState.activeTab === 'dashboard' && typeof DashboardController !== 'undefined' && DashboardController.render) {
        DashboardController.render();
      }
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
    if (!this.isConnected() || !taskId) return false;

    // 🛡️ CRITICAL GUARD: Never resurrect tombstoned tasks via cell updates
    try {
      const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (deletedList.includes(taskId)) {
        console.warn(`🛡️ Firebase updateCell blocked: ${taskId} is tombstoned!`);
        return false;
      }
    } catch (e) {}

    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    // Suppress local echo for 3000ms to allow multi-PC real-time smooth collaboration
    this._suppressLocalEchoUntil[`${taskId}:${field}`] = Date.now() + 3000;

    try {
      const taskRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${taskId}`);
      const patch = {
        task_id: taskId,
        [field]: value,
        last_updated: new Date().toISOString()
      };

      // Guarantee core fields are included if local task is known
      if (window.appState && window.appState.workbookMgr) {
        const lt = window.appState.workbookMgr.getTask(normMonth, taskId);
        if (lt) {
          if (lt.task_name && field !== 'task_name') patch.task_name = lt.task_name;
          if (lt.assignee && field !== 'assignee') patch.assignee = lt.assignee;
          if (lt.engineer && field !== 'engineer') patch.engineer = lt.engineer;
          if (lt.supervisor && field !== 'supervisor') patch.supervisor = lt.supervisor;
          if (lt.category && field !== 'category') patch.category = lt.category;
          if (lt.include_in_report && field !== 'include_in_report') patch.include_in_report = lt.include_in_report;
        }
      }

      await taskRef.update(patch);
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

    // 🛡️ CRITICAL GUARD: Never push a task that is in deletedSet / tombstoned!
    try {
      const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (deletedList.includes(task.task_id)) {
        console.warn(`🛡️ FirebaseSyncService.pushTask BLOCKED: ${task.task_id} is in deleted list!`);
        return false;
      }
    } catch (e) {}

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
    if (!taskId || GENUINE_TASK_IDS.has(taskId)) return false;

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
      // Record tombstone in Firebase so all devices delete permanently
      await this.db.ref(`walton_monthly_report/deleted_task_ids/${taskId}`).set(Date.now());
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
    taskIds = taskIds.filter(id => !GENUINE_TASK_IDS.has(id));
    if (taskIds.length === 0) return false;

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
      const now = Date.now();
      taskIds.forEach(id => {
        updates[`walton_monthly_report/workbooks/${normMonth}/tasks/${id}`] = null;
        updates[`walton_monthly_report/deleted_task_ids/${id}`] = now;
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
    if (this.status === 'CONNECTING' && this.db) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (this.isConnected() || this.status === 'OFFLINE') {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 3000);
      });
    }

    if (!this.isConnected()) throw new Error("Firebase is not connected.");
    if (!window.appState || !window.appState.workbookMgr) throw new Error("Workbook not ready.");

    const normMonth = window.appState.workbookMgr.normalizeMonth(month);
    let deletedSet = new Set();
    try {
      const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      deletedSet = new Set(deletedList);
    } catch (e) {}

    const tasks = window.appState.workbookMgr.getTasksForMonth(normMonth);
    const map = {};
    tasks.forEach(t => {
      if (t && t.task_id && !deletedSet.has(t.task_id)) {
        map[t.task_id] = t;
      }
    });

    const monthRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks`);
    await monthRef.set(map);
    return Object.keys(map).length;
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
