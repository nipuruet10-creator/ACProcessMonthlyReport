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

    // Ensure September 2026 is initialized if not present (preserve user entries)
    if (!this.workbooks["SEP-2026"]) {
      this.workbooks["SEP-2026"] = [];
      this.save();
    }
  }

  sanitizeWorkbooks() {
    if (!this.workbooks || typeof this.workbooks !== 'object') return;
    const keys = Object.keys(this.workbooks);
    let modified = false;

    keys.forEach(k => {
      const norm = this.normalizeMonth(k);
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
      // 2025 Months
      "JAN-2025", "FEB-2025", "MAR-2025", "APR-2025", "MAY-2025", "JUN-2025",
      "JUL-2025", "AUG-2025", "SEP-2025", "OCT-2025", "NOV-2025", "DEC-2025",
      // 2026 Months
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
      is_project: isProject,
      project_status: projectStatus,
      deadline: deadline,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.workbooks[m].push(newTask);
    this.save();
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
      GoogleSheetsSync.pushTask(newTask);
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

    const getOrInit = (rawName) => {
      const canonical = formatName(rawName);
      if (!canonical) return null;

      // Kamrul is HOD, strictly exclude from ranking table
      if (canonical.toLowerCase().includes("kamrul") || canonical.includes("44819")) {
        return null;
      }

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
      const assigneeEntry = getOrInit(assigneeName);
      if (assigneeEntry) {
        assigneeEntry.total_point += validPts;
        assigneeEntry.total_task += 1;
        assigneeEntry.wbs_point += Math.round(validPts * 0.75 * 100) / 100;
      }

      // 2. Supervisor: 25% WBS Point (added to existing personnel row, never a duplicate row!)
      const supName = t.supervisor;
      if (supName && supName.trim()) {
        const supEntry = getOrInit(supName);
        if (supEntry) {
          supEntry.wbs_point += Math.round(validPts * 0.25 * 100) / 100;
        }
      }
    });

    // Sort by Total Point (Actual Point) descending (Image 1 Ranking)
    const ranking = Object.values(personnelMap)
      .filter(r => !r.name.toLowerCase().includes("kamrul") && !r.name.includes("44819"))
      .sort((a, b) => {
        if (b.total_point !== a.total_point) return b.total_point - a.total_point;
        if (b.wbs_point !== a.wbs_point) return b.wbs_point - a.wbs_point;
        return b.total_task - a.total_task;
      });

    const totalTasksSum = ranking.reduce((sum, r) => sum + r.total_task, 0);
    const totalWbsSum = Math.round(ranking.reduce((sum, r) => sum + r.wbs_point, 0));
    const totalActualSum = ranking.reduce((sum, r) => sum + r.total_point, 0);

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
          if (deleted.length > 200) deleted.shift();
          localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
        }
      } catch (e) {}
      this.save();
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.deleteTask) {
        GoogleSheetsSync.deleteTask(taskId, m);
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
        if (deleted.length > 200) deleted.splice(0, deleted.length - 200);
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
      } catch (e) {}
      this.save();
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.deleteTask) {
        taskIds.forEach(id => {
          GoogleSheetsSync.deleteTask(id, m);
        });
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

  mergeFromCloud(remoteWorkbooks) {
    if (!remoteWorkbooks || typeof remoteWorkbooks !== 'object') return false;
    let anyChanges = false;
    const months = Object.keys(remoteWorkbooks);

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
        remoteIdSet.add(rt.task_id);
        rt.month = norm;
        if (!rt.assignee && rt.engineer) rt.assignee = rt.engineer;
        if (!rt.engineer && rt.assignee) rt.engineer = rt.assignee;

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
          }

          let isDifferent = false;
          for (const k of Object.keys(rt)) {
            if (rt[k] !== lt[k]) {
              isDifferent = true;
              break;
            }
          }

          if (isDifferent) {
            // NON-DESTRUCTIVE MULTI-DEVICE PROTECTION:
            // Do NOT let remote empty fields wipe out existing local content!
            for (const k of Object.keys(rt)) {
              const rVal = rt[k];
              const lVal = lt[k];
              const isProtectedField = (k === 'task_details' || k === 'photo_1' || k === 'photo_2' || k === 'ai_report_title' || k === 'ai_report_description');
              
              if (isProtectedField && (rVal === "" || rVal === null || rVal === undefined) && (lVal !== "" && lVal !== null && lVal !== undefined)) {
                // Local has valuable content (e.g. AI task breakdown or photo), remote is empty.
                // Keep local content!
                continue;
              }
              lt[k] = rVal;
            }
            anyChanges = true;
          }

          // If local has valuable details/photo that remote Google Sheets is missing, push local back to cloud!
          let localPhoto = lt.photo_1 || lt.photo_2;
          if (!localPhoto && typeof photoManager !== 'undefined') {
            const lp = photoManager.getTaskPhotos(lt.task_id);
            if (lp && (lp.before_photo || lp.photo_1)) {
              lt.photo_1 = lp.before_photo || lp.photo_1;
              localPhoto = lt.photo_1;
            }
          }
          const needsRepush = (lt.task_details && !rt.task_details) || (localPhoto && !rt.photo_1);
          if (needsRepush && typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
            GoogleSheetsSync.pushTask(lt);
          }
        }
      });

        // Handle un-synced local tasks and remote deletions safely
        if (remoteList.length > 0) {
          let deletedIds = [];
          try {
            deletedIds = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
          } catch (e) {}

          const filtered = localTasks.filter(lt => {
            if (!remoteIdSet.has(lt.task_id)) {
              // If user explicitly deleted it, prune it
              if (deletedIds.includes(lt.task_id)) {
                return false;
              }
              // If not deleted, it's a locally created task that needs pushing!
              // DO NOT delete it! Push it to cloud so all devices get it!
              if (typeof photoManager !== 'undefined' && !lt.photo_1) {
                const lp = photoManager.getTaskPhotos(lt.task_id);
                if (lp && (lp.before_photo || lp.photo_1)) {
                  lt.photo_1 = lp.before_photo || lp.photo_1;
                }
              }
              if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
                GoogleSheetsSync.pushTask(lt);
              }
              return true;
            }
            return true;
          });
          if (filtered.length !== localTasks.length) {
            this.workbooks[norm] = filtered;
            anyChanges = true;
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
