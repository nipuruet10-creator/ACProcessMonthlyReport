/**
 * Process Development Monthly Report Automation System
 * Module: Month Workbook Manager
 * Manages Month-Wise Input Sheets (JAN-2026 through DEC-2027)
 * Implements: Engineer | Task Name | Details/Steps | Category | Points | Immutable Task IDs
 * Matches: 'Process Task management entry 2025_2026.xlsx'
 * WALTON Hi-Tech Industries PLC
 */

class MonthWorkbookManager {
  constructor(storageKey = "walton_pd_month_workbooks_v2") {
    this.storageKey = storageKey;
    this.workbooks = {}; // Map of month -> Array of task rows
    this.activeMonth = "SEP-2026";
    this.init();
  }

  init() {
    try {
      let saved = localStorage.getItem(this.storageKey);
      if (!saved && this.storageKey === "walton_pd_month_workbooks_v2") {
        saved = localStorage.getItem("walton_pd_month_workbooks_v1");
      }
      if (saved) {
        this.workbooks = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load workbooks from localStorage:", e);
    }

    // Sanitize any malformed month keys loaded from storage
    this.sanitizeWorkbooks();

    // Load full 2026 Production Dataset (Jan 2026 to Aug 2026) directly extracted from Excel
    this.hydrateFromImported2026Dataset();

    // Ensure September 2026 is initialized if not present (clean empty array, no old dummy data)
    if (!this.workbooks["SEP-2026"]) {
      this.workbooks["SEP-2026"] = [];
      this.save();
    }
  }

  getDefaultSep2026Tasks() {
    return []; // Clean empty start - no old dummy data
  }

  sanitizeWorkbooks() {
    if (!this.workbooks || typeof this.workbooks !== 'object') return;
    const keys = Object.keys(this.workbooks);
    let modified = false;

    keys.forEach(k => {
      const norm = this.normalizeMonth(k);
      if (Array.isArray(this.workbooks[k])) {
        // Filter out legacy dummy mock tasks ("Assembly Line Relocation" or "Compressor Jacket New Die Setup for 18M")
        const initialCount = this.workbooks[k].length;
        this.workbooks[k] = this.workbooks[k].filter(t => {
          if (!t) return false;
          const nameLower = (t.task_name || '').toLowerCase();
          if (nameLower.includes("assembly line relocation")) return false;
          if (nameLower.includes("compressor jacket new die setup")) return false;
          if (t.task_id === "SEP-2026-001" || t.task_id === "SEP-2026-002-PXV") return false;
          return true;
        });
        if (this.workbooks[k].length !== initialCount) modified = true;

        this.workbooks[k].forEach(t => {
          if (!t) return;
          // Auto-repair mistakenly defaulted Sazzad supervisor to Kamrul (44819)
          if (t.supervisor) {
            const supLower = String(t.supervisor).toLowerCase();
            if (supLower.includes('sazzad') || supLower.includes('50463')) {
              t.supervisor = 'Kamrul (44819)';
              modified = true;
            }
          }
        });
      }

      if (norm !== k) {
        if (!this.workbooks[norm]) {
          this.workbooks[norm] = [];
        }
        const existingIds = new Set(this.workbooks[norm].map(t => t.task_id));
        const malformedTasks = this.workbooks[k] || [];
        malformedTasks.forEach(t => {
          t.month = norm;
          if (!existingIds.has(t.task_id)) {
            this.workbooks[norm].push(t);
            existingIds.add(t.task_id);
          }
        });
        delete this.workbooks[k];
        modified = true;
      }
    });

    if (modified) {
      this.save();
    }
  }

  hydrateFromImported2026Dataset(forceReload = false) {
    const dataset = (typeof IMPORTED_2026_DATASET !== 'undefined')
      ? IMPORTED_2026_DATASET
      : ((typeof window !== 'undefined' && window.IMPORTED_2026_DATASET) ? window.IMPORTED_2026_DATASET : null);

    if (!dataset) return false;

    const formatName = (n) => (typeof MasterDataManager !== 'undefined' && MasterDataManager.formatNameWithId)
      ? MasterDataManager.formatNameWithId(n)
      : (n || "").trim();

    const months = Object.keys(dataset);
    let loadedAny = false;

    months.forEach(m => {
      // Strictly protect running and active months from dataset overwrites
      if (m === "SEP-2026" || m.includes("2027") || m === this.activeMonth) return;
      const currentTasks = this.workbooks[m] || [];
      const incomingTasks = dataset[m] || [];

      // Upgrade if empty, forceReload, or has mismatched count
      if (forceReload || (currentTasks.length < 50 && incomingTasks.length > 0) || (currentTasks.length !== incomingTasks.length && incomingTasks.length > 0)) {
        this.workbooks[m] = incomingTasks.map(t => {
          const assignee = formatName(t.assignee || t.engineer);
          const supervisor = formatName(t.supervisor);
          return {
            task_id: t.task_id,
            month: m,
            task_name: t.task_name || "",
            task_details: t.task_details || "",
            category: t.category || "Process development",
            points: (t.points !== "" && t.points !== undefined && t.points !== null && !isNaN(parseFloat(t.points))) ? parseFloat(t.points) : "",
            supervisor: supervisor,
            assignee: assignee,
            engineer: assignee,
            start_date: t.start_date || "",
            end_date: t.end_date || "",
            status: t.status || "Task Entry Completed",
            include_in_report: t.include_in_report === "NO" ? "NO" : "YES",
            created_at: t.created_at || new Date().toISOString()
          };
        });
        loadedAny = true;
      }
    });

    if (loadedAny) {
      this.save();
    }
    return loadedAny;
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.workbooks));
    } catch (e) {
      console.warn("Storage quota notice: keeping workbooks in memory:", e);
    }
  }

  normalizeMonth(month) {
    if (!month) return "SEP-2026";
    const str = String(month).trim();
    const upper = str.toUpperCase();

    // 1. Exact standard month code e.g. "SEP-2026", "JUN-2026"
    const std = upper.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[- ]?(\d{4})$/);
    if (std) {
      return `${std[1]}-${std[2]}`;
    }

    // 2. Exact ISO format e.g. "2026-06"
    if (/^\d{4}-\d{2}$/.test(str)) {
      const [year, mStr] = str.split("-");
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const mIdx = parseInt(mStr, 10) - 1;
      return `${monthNames[mIdx] || "SEP"}-${year}`;
    }

    // 3. Exact full month name e.g. "September 2026", "September-2026"
    const fullMonths = {
      "JANUARY": "JAN", "FEBRUARY": "FEB", "MARCH": "MAR", "APRIL": "APR", "MAY": "MAY", "JUNE": "JUN",
      "JULY": "JUL", "AUGUST": "AUG", "SEPTEMBER": "SEP", "OCTOBER": "OCT", "NOVEMBER": "NOV", "DECEMBER": "DEC"
    };
    const fullMatch = upper.match(/^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)[- ]?(\d{4})$/);
    if (fullMatch) {
      return `${fullMonths[fullMatch[1]]}-${fullMatch[2]}`;
    }

    // 4. Date object / locale date string from Google Sheets (e.g. "Tue Sep 01 2026 00:00:00 GMT+0600 (Bangladesh Standard Time)")
    const monthMap = {
      "JAN": "JAN", "FEB": "FEB", "MAR": "MAR", "APR": "APR", "MAY": "MAY", "JUN": "JUN",
      "JUL": "JUL", "AUG": "AUG", "SEP": "SEP", "OCT": "OCT", "NOV": "NOV", "DEC": "DEC",
      "JANUARY": "JAN", "FEBRUARY": "FEB", "MARCH": "MAR", "APRIL": "APR", "JUNE": "JUN",
      "JULY": "JUL", "AUGUST": "AUG", "SEPTEMBER": "SEP", "OCTOBER": "OCT", "NOVEMBER": "NOV", "DECEMBER": "DEC"
    };

    if (upper.includes("GMT") || upper.includes("UTC") || upper.includes("00:00:00") || /^(MON|TUE|WED|THU|FRI|SAT|SUN)\b/.test(upper)) {
      const mMatch = upper.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/);
      const yMatch = upper.match(/\b(202\d|203\d)\b/);
      if (mMatch && yMatch) {
        const code = monthMap[mMatch[1]] || mMatch[1].substring(0, 3);
        return `${code}-${yMatch[1]}`;
      }
    }

    // 5. Universal date fallback: If string has spaces, colons, or slashes and contains month name and 4-digit year
    if (upper.includes(" ") || upper.includes(":") || upper.includes("/")) {
      const anyM = upper.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/);
      const anyY = upper.match(/\b(202\d|203\d)\b/);
      if (anyM && anyY) {
        const code = monthMap[anyM[1]] || anyM[1].substring(0, 3);
        return `${code}-${anyY[1]}`;
      }
    }

    return upper;
  }

  getAllMonths() {
    const monthOrder = { "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12 };
    const defaultMonths = [
      // 2026 Months (Starts from January 2026 as required)
      "JAN-2026", "FEB-2026", "MAR-2026", "APR-2026", "MAY-2026", "JUN-2026",
      "JUL-2026", "AUG-2026", "SEP-2026", "OCT-2026", "NOV-2026", "DEC-2026",
      // 2027 Months
      "JAN-2027", "FEB-2027", "MAR-2027", "APR-2027", "MAY-2027", "JUN-2027",
      "JUL-2027", "AUG-2027", "SEP-2027", "OCT-2027", "NOV-2027", "DEC-2027"
    ];
    const existing = Object.keys(this.workbooks).map(k => this.normalizeMonth(k));
    const combined = Array.from(new Set([...defaultMonths, ...existing])).filter(m => /^[A-Z]{3}-\d{4}$/.test(m));

    // Sort chronologically (Year then Month)
    combined.sort((a, b) => {
      const getScore = (str) => {
        const parts = String(str).toUpperCase().split("-");
        if (parts.length === 2) {
          const mon = parts[0];
          const yr = parseInt(parts[1], 10);
          if (monthOrder[mon] && !isNaN(yr)) {
            return yr * 100 + monthOrder[mon];
          }
        }
        return 999999;
      };
      return getScore(a) - getScore(b);
    });

    return combined;
  }

  createMonth(monthCode) {
    if (!monthCode || !monthCode.trim()) throw new Error("Month code required.");
    const m = this.normalizeMonth(monthCode);
    if (!this.workbooks[m]) {
      this.workbooks[m] = [];
      this.save();
    }
    return m;
  }

  getTasksForMonth(month) {
    const m = this.normalizeMonth(month);
    if (!this.workbooks[m]) {
      this.workbooks[m] = [];
    }
    return [...this.workbooks[m]];
  }

  getTask(month, taskId) {
    const m = this.normalizeMonth(month);
    const tasks = this.workbooks[m] || [];
    return tasks.find(t => t.task_id === taskId) || null;
  }

  generateNextTaskId(month) {
    const m = this.normalizeMonth(month);
    const tasks = this.getTasksForMonth(m);
    let maxSeq = 0;
    const prefix = `${m}-`;
    tasks.forEach(t => {
      if (t.task_id && t.task_id.startsWith(prefix)) {
        const numPart = t.task_id.substring(prefix.length).split('-')[0];
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
    const nextSeq = maxSeq + 1;
    const randSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${String(nextSeq).padStart(3, "0")}-${randSuffix}`;
  }

  addTask(month, engineerOrAssignee, taskName, includeInReport = "YES", taskDetails = "", category = "Process development", points = "", supervisor = "", options = {}) {
    const m = this.normalizeMonth(month);
    if (!this.workbooks[m]) {
      this.workbooks[m] = [];
    }

    if (!taskName || !taskName.trim()) {
      throw new Error("Task Name is required.");
    }
    if (!engineerOrAssignee || !engineerOrAssignee.trim()) {
      throw new Error("Assignee / Engineer must be selected.");
    }

    if (typeof taskDetails === 'object' && taskDetails !== null) {
      options = taskDetails;
      taskDetails = options.task_details || "";
      category = options.category || category;
      points = options.points !== undefined ? options.points : points;
      supervisor = options.supervisor || supervisor;
    }

    const taskId = this.generateNextTaskId(m);
    const parsedPts = (points !== "" && points !== undefined && points !== null && !isNaN(parseFloat(points))) ? parseFloat(points) : "";
    
    const formatName = (n) => (typeof MasterDataManager !== 'undefined' && MasterDataManager.formatNameWithId)
      ? MasterDataManager.formatNameWithId(n)
      : (n || "").trim();

    const cleanAssignee = formatName(engineerOrAssignee);
    const cleanSupervisor = formatName(supervisor || "Kamrul (44819)");

    const isProject = Boolean(options.is_project || category === 'Ongoing Projects' || category === 'Completed Projects');
    const projectStatus = options.project_status || (category === 'Completed Projects' ? 'Completed' : (isProject ? 'Ongoing' : ''));
    const deadline = options.deadline || "";

    const newTask = {
      task_id: taskId,
      month: m,
      assignee: cleanAssignee,
      engineer: cleanAssignee, // Kept for complete backwards compatibility
      supervisor: cleanSupervisor,
      task_name: taskName.trim(),
      task_details: (taskDetails || "").trim(),
      category: (category || "Process development").trim(),
      points: parsedPts, // Task Point (Actual Point)
      include_in_report: includeInReport === "NO" ? "NO" : "YES",
      status: "",
      remarks: "",
      photo_1: "",
      photo_2: "",
      is_project: isProject,
      project_status: projectStatus,
      deadline: deadline,
      _isLocalDraft: true,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.workbooks[m].push(newTask);
    this.save();
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.pushTask(m, newTask);
    }
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
      GoogleSheetsSync.pushTask(newTask).then(ok => {
        if (ok) {
          delete newTask._isLocalDraft;
          newTask._syncedToCloud = true;
          this.save();
        }
      }).catch(() => {});
    }
    return newTask;
  }

  updateTask(month, taskId, updates = {}) {
    const m = this.normalizeMonth(month);
    const tasks = this.workbooks[m] || [];
    const idx = tasks.findIndex(t => t.task_id === taskId);
    if (idx === -1) {
      throw new Error(`Task with ID ${taskId} not found in ${m}`);
    }

    const formatName = (n) => (typeof MasterDataManager !== 'undefined' && MasterDataManager.formatNameWithId)
      ? MasterDataManager.formatNameWithId(n)
      : (n || "").trim();

    const updated = {
      ...tasks[idx],
      ...updates,
      task_id: tasks[idx].task_id,
      month: m,
      _lastFieldEditTime: Date.now(),
      updated_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    if (updates.assignee) {
      updated.assignee = formatName(updates.assignee);
      updated.engineer = updated.assignee;
    } else if (updates.engineer) {
      updated.engineer = formatName(updates.engineer);
      updated.assignee = updated.engineer;
    }

    if (updates.supervisor !== undefined) {
      updated.supervisor = formatName(updates.supervisor);
    }

    if (updates.include_in_report) {
      updated.include_in_report = updates.include_in_report === "NO" ? "NO" : "YES";
    }

    if (updates.points !== undefined) {
      updated.points = (updates.points !== "" && updates.points !== null && !isNaN(parseFloat(updates.points)))
        ? parseFloat(updates.points)
        : "";
    }

    tasks[idx] = updated;
    this.save();
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.pushTask(m, updated);
    }
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
      GoogleSheetsSync.pushTask(updated);
    }
    return updated;
  }

  /**
   * Calculates Points Ranking & WBS Points as per Image 1 specifications
   * Formula:
   * - Assignee receives 100% of Task Point in Total Point (Actual Point)
   * - Assignee receives 75% in WBS Point (0.75 * P)
   * - Supervisor receives 25% in WBS Point (0.25 * P) summed into their existing row (no duplicate row)
   * - Kamrul is HOD, excluded from ranking table
   * - Names strictly displayed in "Name (ID)" format
   * - Ranking table sorts by Total Point (Actual Point) descending
   */
  calculatePointsRanking(month) {
    const m = this.normalizeMonth(month);
    const tasks = this.getTasksForMonth(m);

    const personnelMap = {};

    const formatName = (n) => {
      if (!n || !n.trim()) return "";
      return (typeof MasterDataManager !== 'undefined' && MasterDataManager.formatNameWithId)
        ? MasterDataManager.formatNameWithId(n)
        : n.trim();
    };

    const isHod = (canonical) => {
      if (!canonical) return false;
      const lower = canonical.toLowerCase();
      return lower.includes("kamrul") || lower.includes("44819");
    };

    const getOrInit = (rawName) => {
      const canonical = formatName(rawName);
      if (!canonical) return null;

      if (!personnelMap[canonical]) {
        personnelMap[canonical] = {
          name: canonical,
          total_point: 0,
          total_task: 0,
          wbs_point: 0
        };
      }
      return personnelMap[canonical];
    };

    tasks.forEach(t => {
      const pts = parseFloat(t.points);
      const validPts = (!isNaN(pts) && pts > 0) ? pts : 0;

      // 1. Assignee: 100% Actual Point, +1 Task Count, 75% WBS Point
      const assigneeName = t.assignee || t.engineer;
      if (assigneeName && assigneeName.trim()) {
        const assigneeEntry = getOrInit(assigneeName);
        if (assigneeEntry) {
          assigneeEntry.total_point += validPts;
          assigneeEntry.total_task += 1;
          assigneeEntry.wbs_point += Math.round(validPts * 0.75 * 100) / 100;
        }
      }

      // 2. Supervisor: 25% WBS Point (added to existing personnel row, never a duplicate row!)
      // HOD (Kamrul) is excluded from accumulating 25% supervisor WBS points from subordinate tasks
      const supName = t.supervisor;
      if (supName && supName.trim()) {
        const canonicalSup = formatName(supName);
        if (!isHod(canonicalSup)) {
          const supEntry = getOrInit(supName);
          if (supEntry) {
            supEntry.wbs_point += Math.round(validPts * 0.25 * 100) / 100;
          }
        }
      }
    });

    // Sort by Total Point (Actual Point) descending (Image 1 Ranking)
    // Kamrul is HOD, excluded from competitive engineer ranking table
    const ranking = Object.values(personnelMap)
      .filter(r => !isHod(r.name) && (r.total_task > 0 || r.total_point > 0))
      .sort((a, b) => {
        if (b.total_point !== a.total_point) return b.total_point - a.total_point;
        if (b.wbs_point !== a.wbs_point) return b.wbs_point - a.wbs_point;
        return b.total_task - a.total_task;
      });

    const totalTasksSum = tasks.length;
    const totalWbsSum = Math.round(ranking.reduce((sum, r) => sum + r.wbs_point, 0));
    const totalActualSum = tasks.reduce((sum, t) => {
      const p = parseFloat(t.points);
      return sum + ((!isNaN(p) && p > 0) ? p : 0);
    }, 0);

    return {
      ranking,
      totalTasksSum,
      totalWbsSum,
      totalActualSum
    };
  }

  toggleInclude(month, taskId) {
    const m = this.normalizeMonth(month);
    const tasks = this.workbooks[m] || [];
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return null;
    const newStatus = task.include_in_report === "YES" ? "NO" : "YES";
    return this.updateTask(m, taskId, { include_in_report: newStatus });
  }

  deleteTask(month, taskId) {
    const m = this.normalizeMonth(month);
    if (!this.workbooks[m]) return false;
    const initialLen = this.workbooks[m].length;
    this.workbooks[m] = this.workbooks[m].filter(t => t.task_id !== taskId);
    if (this.workbooks[m].length !== initialLen) {
      try {
        const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
        if (!deleted.includes(taskId)) {
          deleted.push(taskId);
          if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
          localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
        }
      } catch (e) {}

      // Immediately purge any pending sync of this deleted task from queue
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getPendingQueue && GoogleSheetsSync.savePendingQueue) {
        try {
          const q = GoogleSheetsSync.getPendingQueue();
          const cleanQ = q.filter(item => !(item.action === 'SYNC_TASK' && item.payload && item.payload.task_id === taskId));
          if (cleanQ.length !== q.length) {
            GoogleSheetsSync.savePendingQueue(cleanQ);
          }
        } catch (e) {}
      }

      this.save();
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.deleteTask) {
        GoogleSheetsSync.deleteTask(taskId, m);
      }
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.deleteTask) {
        try {
          FirebaseSyncService.deleteTask(m, taskId);
        } catch (e) {
          console.warn("Firebase deleteTask notice:", e);
        }
      }
      return true;
    }
    return false;
  }

  deleteMultipleTasks(month, taskIds = []) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) return { success: true, deletedCount: 0, count: 0 };
    const m = this.normalizeMonth(month);
    if (!this.workbooks[m]) return { success: true, deletedCount: 0, count: 0 };
    const initialLen = this.workbooks[m].length;
    const toDeleteSet = new Set(taskIds);
    this.workbooks[m] = this.workbooks[m].filter(t => !toDeleteSet.has(t.task_id));
    const deletedCount = initialLen - this.workbooks[m].length;
    if (deletedCount > 0) {
      try {
        const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
        taskIds.forEach(id => {
          if (!deleted.includes(id)) deleted.push(id);
        });
        if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
      } catch (e) {}

      // Immediately purge any pending sync for all deleted tasks
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getPendingQueue && GoogleSheetsSync.savePendingQueue) {
        try {
          const q = GoogleSheetsSync.getPendingQueue();
          const cleanQ = q.filter(item => !(item.action === 'SYNC_TASK' && item.payload && toDeleteSet.has(item.payload.task_id)));
          if (cleanQ.length !== q.length) {
            GoogleSheetsSync.savePendingQueue(cleanQ);
          }
        } catch (e) {}
      }

      this.save();
      if (typeof GoogleSheetsSync !== 'undefined') {
        if (GoogleSheetsSync.deleteMultipleTasks) {
          GoogleSheetsSync.deleteMultipleTasks(taskIds, m);
        } else if (GoogleSheetsSync.deleteTask) {
          taskIds.forEach(id => {
            GoogleSheetsSync.deleteTask(id, m);
          });
        }
      }

      // Propagate to Firebase Realtime Database
      if (typeof FirebaseSyncService !== 'undefined') {
        try {
          if (FirebaseSyncService.deleteMultipleTasks) {
            FirebaseSyncService.deleteMultipleTasks(m, taskIds);
          } else if (FirebaseSyncService.deleteTask) {
            taskIds.forEach(id => {
              FirebaseSyncService.deleteTask(m, id);
            });
          }
        } catch (e) {
          console.warn("Firebase deleteMultipleTasks notice:", e);
        }
      }
    }
    return { success: true, deletedCount: deletedCount, count: deletedCount };
  }

  getPreviousMonth(month) {
    const all = this.getAllMonths();
    const m = this.normalizeMonth(month);
    const idx = all.indexOf(m);
    if (idx > 0) {
      return all[idx - 1];
    }
    return null;
  }

  syncOngoingProjectsFromPreviousMonth(targetMonth) {
    const m = this.normalizeMonth(targetMonth);
    const prevMonth = this.getPreviousMonth(m);
    if (!prevMonth) {
      return { added: 0, prevMonth: null, message: "No preceding month found." };
    }

    const prevTasks = this.getTasksForMonth(prevMonth);
    const currentTasks = this.getTasksForMonth(m);

    // Identify active ongoing projects from previous month
    const ongoingProjects = prevTasks.filter(t => {
      const cat = (t.category || '').toLowerCase();
      const status = (t.status || t.project_status || '').toLowerCase();
      const isProj = Boolean(t.is_project || cat.includes('ongoing project') || cat === 'project' || (t.task_name && t.task_name.toLowerCase().includes('project')));
      const isCompleted = status.includes('complete') || cat.includes('completed project');
      return isProj && !isCompleted;
    });

    let addedCount = 0;
    ongoingProjects.forEach(proj => {
      // Avoid duplicate tasks by task_name
      const alreadyExists = currentTasks.some(ct => 
        ct.task_name && proj.task_name &&
        ct.task_name.trim().toLowerCase() === proj.task_name.trim().toLowerCase()
      );

      if (!alreadyExists) {
        this.addTask(
          m,
          proj.assignee || proj.engineer,
          proj.task_name,
          proj.include_in_report !== "NO" ? "YES" : "NO",
          proj.task_details || "",
          "Ongoing Projects",
          (proj.points !== undefined && proj.points !== null && proj.points !== "") ? proj.points : "",
          proj.supervisor || "Kamrul (44819)",
          {
            is_project: true,
            project_status: "Ongoing",
            deadline: proj.deadline || ""
          }
        );
        addedCount++;
      }
    });

    if (addedCount > 0) {
      this.save();
    }

    return {
      added: addedCount,
      syncedCount: addedCount,
      prevMonth: prevMonth,
      message: `Carried forward ${addedCount} active ongoing project(s) from ${prevMonth} to ${m}.`
    };
  }

  mergeFromCloud(remoteWorkbooks, isAuthoritative = false) {
    if (!remoteWorkbooks || typeof remoteWorkbooks !== 'object') return false;
    let anyChanges = false;
    const months = Object.keys(remoteWorkbooks);

    let deletedIds = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
    } catch (e) {}

    months.forEach(m => {
      const norm = this.normalizeMonth(m);
      const remoteList = remoteWorkbooks[m];
      if (!Array.isArray(remoteList)) return;

      if (!this.workbooks[norm]) {
        this.workbooks[norm] = [];
      }
      const localTasks = this.workbooks[norm];
      const localMap = new Map();
      localTasks.forEach(t => localMap.set(t.task_id, t));
      const remoteIdSet = new Set();

      remoteList.forEach(rt => {
        if (!rt || !rt.task_id) return;

        // Suppress tasks deleted on this device if present locally
        if (deletedIds.includes(rt.task_id)) {
          if (localMap.has(rt.task_id)) {
            const idx = localTasks.findIndex(t => t.task_id === rt.task_id);
            if (idx !== -1) {
              localTasks.splice(idx, 1);
              localMap.delete(rt.task_id);
              anyChanges = true;
            }
          }
          return;
        }

        remoteIdSet.add(rt.task_id);
        rt.month = norm;
        if (!rt.assignee && rt.engineer) rt.assignee = rt.engineer;
        if (!rt.engineer && rt.assignee) rt.engineer = rt.assignee;

        // Auto-sanitize supervisor so legacy Sazzad/50463 entries from Google Sheets become Kamrul (44819)
        if (!rt.supervisor || String(rt.supervisor).toLowerCase().includes('sazzad') || String(rt.supervisor).includes('50463')) {
          rt.supervisor = 'Kamrul (44819)';
        }

        if (rt.points !== "" && rt.points !== undefined && rt.points !== null && !isNaN(parseFloat(rt.points))) {
          rt.points = parseFloat(rt.points);
        } else {
          rt.points = "";
        }

        const lt = localMap.get(rt.task_id);
        if (!lt) {
          localTasks.push(rt);
          localMap.set(rt.task_id, rt);
          anyChanges = true;

          // Automatically hydrate photos into photoManager & IndexedDB
          if (typeof photoManager !== 'undefined' && (rt.photo_1 || rt.photo_2)) {
            if (rt.photo_1) photoManager.setTaskPhoto(rt.task_id, 'before_photo', rt.photo_1, rt.photo_1);
            if (rt.photo_2) photoManager.setTaskPhoto(rt.task_id, 'after_photo', rt.photo_2, rt.photo_2);
          }
        } else {
          // If remote task has photos and local task or photoManager does not, hydrate!
          if (typeof photoManager !== 'undefined') {
            const currentPhotos = photoManager.getTaskPhotos(rt.task_id);
            if (rt.photo_1 && (!currentPhotos || !currentPhotos.before_photo)) {
              photoManager.setTaskPhoto(rt.task_id, 'before_photo', rt.photo_1, rt.photo_1);
              lt.photo_1 = rt.photo_1;
              anyChanges = true;
            }
            if (rt.photo_2 && (!currentPhotos || !currentPhotos.after_photo)) {
              photoManager.setTaskPhoto(rt.task_id, 'after_photo', rt.photo_2, rt.photo_2);
              lt.photo_2 = rt.photo_2;
              anyChanges = true;
            }
            // If remote task has NO photos, and local user didn't attach a photo recently (last 15s), clear ghost photo!
            const isRecentLocalPhoto = lt._lastPhotoEditTime && (Date.now() - lt._lastPhotoEditTime < 15000);
            if (!rt.photo_1 && lt.photo_1 && !isRecentLocalPhoto) {
              lt.photo_1 = "";
              photoManager.removePhoto(rt.task_id, 'before_photo');
              anyChanges = true;
            }
            if (!rt.photo_2 && lt.photo_2 && !isRecentLocalPhoto) {
              lt.photo_2 = "";
              photoManager.removePhoto(rt.task_id, 'after_photo');
              anyChanges = true;
            }
          }

          // Check for actual data differences on meaningful user-facing fields
          const checkFields = ['task_name', 'task_details', 'category', 'points', 'assignee', 'supervisor', 'status', 'remarks', 'tms_task_id', 'include_in_report', 'photo_1', 'photo_2'];
          let isDifferent = false;
          for (const k of checkFields) {
            const rVal = String(rt[k] !== undefined && rt[k] !== null ? rt[k] : '').trim();
            const lVal = String(lt[k] !== undefined && lt[k] !== null ? lt[k] : '').trim();
            if (rVal !== lVal) {
              isDifferent = true;
              break;
            }
          }

          if (isDifferent) {
            const localTimestamp = lt.last_updated ? new Date(lt.last_updated).getTime() : (lt._lastFieldEditTime || 0);
            const remoteTimestamp = rt.last_updated ? new Date(rt.last_updated).getTime() : 0;
            const isLocalStrictlyNewer = localTimestamp > remoteTimestamp && remoteTimestamp > 0;
            let needsCloudPushBack = false;

            // NON-DESTRUCTIVE MULTI-DEVICE PROTECTION:
            for (const k of Object.keys(rt)) {
              const rVal = rt[k];
              const lVal = lt[k];

              // 1. POINTS PROTECTION: Never allow empty/blank remote points to wipe populated local points!
              if (k === 'points') {
                const rPts = (rVal !== undefined && rVal !== null) ? String(rVal).trim() : '';
                const lPts = (lVal !== undefined && lVal !== null) ? String(lVal).trim() : '';
                if (rPts === '' && lPts !== '') {
                  // Keep local points, and mark to push back so cloud is permanently updated
                  needsCloudPushBack = true;
                  continue;
                }
                if (isLocalStrictlyNewer && lPts !== '') {
                  continue; // Newer local edit wins
                }
              }

              // 2. TEXT FIELDS PROTECTION: Never wipe non-empty task_name or task_details with empty remote strings
              if (k === 'task_name' || k === 'task_details') {
                const rStr = (rVal !== undefined && rVal !== null) ? String(rVal).trim() : '';
                const lStr = (lVal !== undefined && lVal !== null) ? String(lVal).trim() : '';
                if (rStr === '' && lStr !== '') {
                  continue; // Keep local non-empty text!
                }
                if (isLocalStrictlyNewer && lStr !== '') {
                  continue;
                }
              }

              // 3. PHOTOS PROTECTION:
              if (k === 'photo_1' || k === 'photo_2') {
                const isRecentLocalPhoto = lt._lastPhotoEditTime && (Date.now() - lt._lastPhotoEditTime < 15000);
                if (!rVal && lVal && isRecentLocalPhoto) {
                  continue;
                }
              }

              // 4. SUPERVISOR AUTO-GUARD:
              if (k === 'supervisor') {
                if (!rVal || String(rVal).toLowerCase().includes('sazzad') || String(rVal).includes('50463')) {
                  lt.supervisor = 'Kamrul (44819)';
                  continue;
                }
              }

              const isRecentLocalEdit = lt._lastFieldEditTime && (Date.now() - lt._lastFieldEditTime < 10000);
              const isProtectedField = (k === 'points' || k === 'task_name' || k === 'task_details' || k === 'photo_1' || k === 'photo_2' || k === 'ai_report_title' || k === 'ai_report_description');
              
              if (isRecentLocalEdit && isProtectedField && (rVal === "" || rVal === null || rVal === undefined) && (lVal !== "" && lVal !== null && lVal !== undefined)) {
                // User locally edited in last 10 seconds, keep local
                continue;
              }

              if (isLocalStrictlyNewer && (lVal !== "" && lVal !== null && lVal !== undefined) && (rVal === "" || rVal === null || rVal === undefined)) {
                continue;
              }

              lt[k] = rVal;
            }
            anyChanges = true;

            // If local points or fields were preserved while remote had empty cells, push back to cloud!
            if (needsCloudPushBack) {
              if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
                FirebaseSyncService.pushTask(norm, lt);
              }
              if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
                GoogleSheetsSync.pushTask(lt);
              }
            }
          }
        }
      });

      // Handle un-synced local tasks and remote deletions safely across multiple devices
      const shouldReconcile = isAuthoritative || remoteList.length > 0 || (Array.isArray(remoteList) && isAuthoritative);
      if (shouldReconcile) {
        const newlyPrunedIds = [];
        const pendingQ = (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getPendingQueue)
          ? GoogleSheetsSync.getPendingQueue()
          : [];

        const filtered = localTasks.filter(lt => {
          if (deletedIds.includes(lt.task_id)) {
            return false;
          }

          if (!remoteIdSet.has(lt.task_id)) {
            if (!isAuthoritative) {
              // Partial non-authoritative sync: preserve unlisted tasks
              return true;
            }
            // Authoritative cloud sync: task is absent on Google Sheet!
            // Strictly keep ONLY if this task is currently queued to push to Google Sheets
            const isPendingPush = pendingQ.some(item => item.action === 'SYNC_TASK' && item.payload && item.payload.task_id === lt.task_id);
            const isFreshLocalDraft = lt._isLocalDraft === true || isPendingPush;
            
            if (!isFreshLocalDraft) {
              newlyPrunedIds.push(lt.task_id);
              return false; // Absent on authoritative cloud -> permanently remove locally
            }
            return true;
          }
          // Present in remote list: flag as synced to cloud
          lt._syncedToCloud = true;
          delete lt._isLocalDraft;
          return true;
        });

        if (filtered.length !== localTasks.length) {
          this.workbooks[norm] = filtered;
          anyChanges = true;
        }

        // Add newly pruned IDs to deletedIds tombstones so they can NEVER resurrect!
        if (newlyPrunedIds.length > 0) {
          newlyPrunedIds.forEach(id => {
            if (!deletedIds.includes(id)) deletedIds.push(id);
          });
          try {
            if (deletedIds.length > 500) deletedIds.splice(0, deletedIds.length - 500);
            localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deletedIds));
          } catch (e) {}

          // Purge any pending SYNC_TASK for newly pruned IDs from the pending queue
          if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getPendingQueue && GoogleSheetsSync.savePendingQueue) {
            try {
              const q = GoogleSheetsSync.getPendingQueue();
              const pruneSet = new Set(newlyPrunedIds);
              const cleanQ = q.filter(item => !(item.action === 'SYNC_TASK' && item.payload && pruneSet.has(item.payload.task_id)));
              if (cleanQ.length !== q.length) {
                GoogleSheetsSync.savePendingQueue(cleanQ);
              }
            } catch (e) {}
          }
        }
      }

      // Sort tasks consistently by sequential task ID across all devices
      this.workbooks[norm].sort((a, b) => {
        const idA = String(a.task_id || '');
        const idB = String(b.task_id || '');
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });
    });

    if (anyChanges) {
      this.save();
    }
    return anyChanges;
  }

  seedAug2026() {
    // AUG-2026 is fully hydrated from IMPORTED_2026_DATASET (258 production tasks)
    this.hydrateFromImported2026Dataset(true);
  }

  seedSep2026() {
    // SEP-2026 starts clean and empty for new user entries
    this.workbooks["SEP-2026"] = [];
    this.save();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonthWorkbookManager;
} else if (typeof window !== 'undefined') {
  window.MonthWorkbookManager = MonthWorkbookManager;
}
