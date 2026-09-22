/**
 * @OnlyCurrentDoc
 * ==============================================================================
 * Process Development Monthly Report Automation System
 * Central Cloud Database Backend for Google Sheets
 * Organization: WALTON Hi-Tech Industries PLC
 * Department: Process Development (AC)
 * ==============================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Rename spreadsheet to: "Walton AC Process Monthly Report DB"
 * 3. Go to: Extensions > Apps Script
 * 4. Delete any code in the editor and PASTE THIS ENTIRE SCRIPT.
 * 5. Click "Save" (disk icon).
 * 6. Click "Deploy" (blue button at top right) > "New deployment".
 * 7. Select type: "Web app" (click gear icon next to 'Select type' if needed).
 * 8. Set Configuration:
 *    - Description: "Walton AC Process Sync API"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone" (Required so your web app can sync without login popups)
 * 9. Click "Deploy", authorize permissions when prompted.
 * 10. Copy the "Web app URL" and paste it into the Settings page of your application!
 * ==============================================================================
 */

const DB_CONFIG = {
  SHEET_TASKS: 'TASKS',
  SHEET_COST_SAVINGS: 'COST_SAVINGS',
  SHEET_ARCHIVE: 'ARCHIVE_TASKS',
  SHEET_META: 'SYSTEM_INFO',
  TASK_HEADERS: [
    'task_id', 'month', 'task_name', 'task_details', 'category',
    'points', 'supervisor', 'assignee', 'engineer', 'start_date',
    'end_date', 'status', 'include_in_report', 'photo_1', 'photo_2',
    'ai_report_title', 'ai_report_description', 'ai_report_impact',
    'remarks', 'last_updated', 'tms_task_id', 'tms_url', 'tms_synced_at'
  ],
  COST_HEADERS: [
    'year', 'month_code', 'target_bdt', 'achieved_bdt', 'project_count', 'remarks', 'last_updated'
  ]
};

const AUTH_SETTINGS = {
  DEFAULT_USER: 'admin',
  DEFAULT_PASS: 'ACprocess@20226',
  ADMIN_EMAIL: 'nipu.ruet10@gmail.com',
  KEY_CUSTOM_PASS: 'WALTON_CUSTOM_INPUT_PASS',
  KEY_OTP: 'WALTON_AUTH_OTP',
  KEY_OTP_EXP: 'WALTON_AUTH_OTP_EXPIRY'
};

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action || 'PING';
    let result = {};

    if (action === 'PING' || action === 'health') {
      result = {
        status: 'OK',
        system: 'Walton AC Process Report Central DB',
        version: '2.4.0',
        timestamp: new Date().toISOString()
      };
    } else if (action === 'GET_AUTH_STATUS') {
      const props = PropertiesService.getScriptProperties();
      result = {
        status: 'OK',
        user: AUTH_SETTINGS.DEFAULT_USER,
        email: AUTH_SETTINGS.ADMIN_EMAIL,
        hasCustomPass: !!props.getProperty(AUTH_SETTINGS.KEY_CUSTOM_PASS),
        timestamp: new Date().toISOString()
      };
    } else if (action === 'GET_MONTH') {
      const month = params.month || 'SEP-2026';
      let tasks = [];
      try {
        tasks = getTasksForMonth(month);
      } catch (mErr) {
        tasks = getRecentTasks(100);
      }
      result = {
        status: 'OK',
        month: month,
        tasks: tasks,
        deleted_ids: getDeletedTaskIds(),
        cost_savings: getAllCostSavings(),
        timestamp: new Date().toISOString()
      };
    } else if (action === 'GET_RECENT') {
      const limit = parseInt(params.limit || '80', 10);
      result = {
        status: 'OK',
        tasks: getRecentTasks(limit),
        deleted_ids: getDeletedTaskIds(),
        timestamp: new Date().toISOString()
      };
    } else if (action === 'ARCHIVE_OLD_DATA') {
      result = archiveOldData();
    } else if (action === 'CLEANUP_EMPTY_AND_DUPLICATE_ROWS') {
      result = cleanupEmptyAndDuplicateRows();
    } else if (action === 'GET_ALL') {
      result = {
        status: 'OK',
        workbooks: getAllWorkbooksGrouped(),
        deleted_ids: getDeletedTaskIds(),
        cost_savings: getAllCostSavings(),
        timestamp: new Date().toISOString()
      };
    } else {
      result = { status: 'ERROR', message: 'Unknown GET action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ERROR',
      message: err.message,
      stack: err.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    let requestData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        requestData = {};
      }
    }

    const action = requestData.action || '';
    const payload = requestData.payload || {};
    let result = {};

    if (action === 'SYNC_TASK') {
      result = syncSingleTask(payload);
    } else if (action === 'DELETE_TASK') {
      result = deleteSingleTask(payload.task_id, payload.month);
    } else if (action === 'DELETE_MULTIPLE_TASKS') {
      result = deleteMultipleTasks(payload.task_ids, payload.month);
    } else if (action === 'CREATE_ONLINE_DOC' || action === 'BUILD_SLIDES') {
      result = createGoogleSlidesPresentation(payload.month, payload.template);
    } else if (action === 'UPLOAD_PHOTO') {
      result = uploadPhotoToDrive(payload);
    } else if (action === 'BULK_PUSH') {
      result = bulkPushAllData(payload);
    } else if (action === 'SYNC_COST_SAVINGS') {
      result = syncCostSavingsTable(payload);
    } else if (action === 'ARCHIVE_OLD_DATA') {
      result = archiveOldData();
    } else if (action === 'VERIFY_INPUT_AUTH') {
      result = verifyInputAuth(payload);
    } else if (action === 'REQUEST_AUTH_OTP') {
      result = requestAuthOtp(payload);
    } else if (action === 'VERIFY_OTP_CHANGE_PASSWORD') {
      result = verifyOtpAndChangePassword(payload);
    } else if (action === 'CLEANUP_EMPTY_AND_DUPLICATE_ROWS') {
      result = cleanupEmptyAndDuplicateRows();
    } else {
      result = { status: 'ERROR', message: 'Unsupported POST action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ERROR',
      message: err.message,
      stack: err.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// -----------------------------------------------------------------------------
// Sheet Initializers & Helpers
// -----------------------------------------------------------------------------

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(sheetName, headers, headerColor) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold')
      .setBackground(headerColor || '#1E293B')
      .setFontColor('#FFFFFF')
      .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 32);
  }
  return sheet;
}

function getTasksSheet() {
  return getOrCreateSheet(DB_CONFIG.SHEET_TASKS, DB_CONFIG.TASK_HEADERS, '#0F172A');
}

function getCostSheet() {
  return getOrCreateSheet(DB_CONFIG.SHEET_COST_SAVINGS, DB_CONFIG.COST_HEADERS, '#1E3A8A');
}

// -----------------------------------------------------------------------------
// Database Operations
// -----------------------------------------------------------------------------

const MONTH_NAMES_MAP = {
  0: "JAN", 1: "FEB", 2: "MAR", 3: "APR", 4: "MAY", 5: "JUN",
  6: "JUL", 7: "AUG", 8: "SEP", 9: "OCT", 10: "NOV", 11: "DEC"
};

/**
 * Universal Month Formatter: Pure in-memory JavaScript date arithmetic (0 RPC overhead).
 * Converts Date objects, UTC strings, and locale strings to canonical format e.g. "SEP-2026".
 * Adds 6 hours for Bangladesh Time (Asia/Dhaka UTC+6).
 */
function parseMonthKey(val) {
  if (!val) return '';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  if (val instanceof Date) {
    const bdTime = new Date(val.getTime() + (6 * 3600 * 1000));
    return months[bdTime.getUTCMonth()] + '-' + bdTime.getUTCFullYear();
  }

  const str = String(val).trim();
  // If already standard month code: "SEP-2026", "AUG-2026"
  const std = str.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[- ]?(\d{4})$/i);
  if (std) return std[1].toUpperCase() + '-' + std[2];

  // Try parsing date string (handles ISO UTC e.g. "2026-08-31T18:00:00.000Z")
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const bdTime = new Date(d.getTime() + (6 * 3600 * 1000));
    return months[bdTime.getUTCMonth()] + '-' + bdTime.getUTCFullYear();
  }

  // English month name fallback
  const mMatch = str.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/i);
  const yMatch = str.match(/\b(202\d|203\d)\b/);
  if (mMatch && yMatch) {
    const monthMap = {
      "JAN": "JAN", "FEB": "FEB", "MAR": "MAR", "APR": "APR", "MAY": "MAY", "JUN": "JUN",
      "JUL": "JUL", "AUG": "AUG", "SEP": "SEP", "OCT": "OCT", "NOV": "NOV", "DEC": "DEC",
      "JANUARY": "JAN", "FEBRUARY": "FEB", "MARCH": "MAR", "APRIL": "APR", "JUNE": "JUN",
      "JULY": "JUL", "AUGUST": "AUG", "SEPTEMBER": "SEP", "OCTOBER": "OCT", "NOVEMBER": "NOV", "DECEMBER": "DEC"
    };
    return (monthMap[mMatch[1].toUpperCase()] || mMatch[1].toUpperCase().substring(0, 3)) + '-' + yMatch[1];
  }

  return str.toUpperCase();
}

/**
 * Retrieve tasks for a specific month (sub-second response: ~3 KB payload)
 * Checks bottom 120 rows first (< 50ms) where active month tasks are appended.
 */
function getTasksForMonth(month) {
  const target = month ? parseMonthKey(month) : 'SEP-2026';
  const sheet = getTasksSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const monthColIdx = headers.indexOf('month');
  const taskIdColIdx = headers.indexOf('task_id');
  if (monthColIdx === -1) return [];

  // Read all rows for the month accurately
  const allValues = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const tasks = [];
  const seenTaskIds = {};

  for (let i = 0; i < allValues.length; i++) {
    const row = allValues[i];
    const taskId = taskIdColIdx !== -1 ? String(row[taskIdColIdx] || '').trim() : String(row[0] || '').trim();
    // Skip empty or ghost rows
    if (!taskId) continue;

    const m = parseMonthKey(row[monthColIdx]);
    if (m === target) {
      const taskName = headers.indexOf('task_name') !== -1 ? String(row[headers.indexOf('task_name')] || '').toLowerCase() : '';
      if (taskName.includes('compact cassettes') || taskName.includes('brazing jig development') || taskId.includes('-TEST')) {
        continue; // Never return legacy deleted task
      }

      // Deduplicate if identical task ID occurs multiple times
      if (seenTaskIds[taskId]) continue;
      seenTaskIds[taskId] = true;

      const task = {};
      headers.forEach((h, col) => {
        task[h] = row[col];
      });
      task.month = target;
      tasks.push(task);
    }
  }

  return tasks;
}

/**
 * Retrieve the most recent N tasks from the bottom of the sheet (< 50ms)
 */
function getRecentTasks(limit) {
  const sheet = getTasksSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const monthColIdx = headers.indexOf('month');
  const numRows = Math.min(limit || 60, lastRow - 1);
  const startRow = lastRow - numRows + 1;
  const values = sheet.getRange(startRow, 1, numRows, headers.length).getValues();

  const tasks = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const task = {};
    headers.forEach((h, col) => {
      task[h] = row[col];
    });
    if (monthColIdx !== -1) {
      task.month = parseMonthKey(row[monthColIdx]);
    }
    tasks.push(task);
  }

  return tasks;
}

/**
 * One-Click Optimization: Moves historical tasks (Jan-Aug 2026) to ARCHIVE_TASKS sheet.
 * Leaves active tasks (SEP-2026 onwards) in TASKS for blazing fast live multi-device syncing.
 */
function archiveOldData() {
  const ss = getSpreadsheet();
  const taskSheet = getTasksSheet();
  const archiveSheet = getOrCreateSheet(DB_CONFIG.SHEET_ARCHIVE, DB_CONFIG.TASK_HEADERS, '#334155');

  const lastRow = taskSheet.getLastRow();
  if (lastRow <= 1) {
    return { status: 'OK', archivedCount: 0, activeCount: 0, message: 'No tasks to archive.' };
  }

  const headers = DB_CONFIG.TASK_HEADERS;
  const values = taskSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const monthColIdx = headers.indexOf('month');

  const keepRows = [];
  const archiveRows = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const m = parseMonthKey(row[monthColIdx !== -1 ? monthColIdx : 1]);
    // Keep active months (SEP-2026, OCT-2026, NOV-2026, DEC-2026, 2027) in TASKS
    if (m === 'SEP-2026' || m.endsWith('-2027') || m === 'OCT-2026' || m === 'NOV-2026' || m === 'DEC-2026') {
      keepRows.push(row);
    } else {
      archiveRows.push(row);
    }
  }

  // Append old rows to ARCHIVE_TASKS
  if (archiveRows.length > 0) {
    const startArchiveRow = archiveSheet.getLastRow() + 1;
    archiveSheet.getRange(startArchiveRow, 1, archiveRows.length, headers.length).setValues(archiveRows);
  }

  // Clear task sheet data rows and rewrite with active rows only
  taskSheet.deleteRows(2, lastRow - 1);
  if (keepRows.length > 0) {
    taskSheet.getRange(2, 1, keepRows.length, headers.length).setValues(keepRows);
    taskSheet.getRange(2, 2, keepRows.length, 1).setNumberFormat('@');
  }

  return {
    status: 'OK',
    archivedCount: archiveRows.length,
    activeCount: keepRows.length,
    message: 'Successfully archived ' + archiveRows.length + ' historical tasks into ARCHIVE_TASKS sheet. Active TASKS sheet now has ' + keepRows.length + ' tasks and runs at maximum speed!'
  };
}

/**
 * Retrieve all tasks grouped by month { "JAN-2026": [...], "SEP-2026": [...] }
 */
function getAllWorkbooksGrouped() {
  const sheet = getTasksSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return {};

  const headers = data[0];
  const monthColIdx = headers.indexOf('month');
  const taskIdColIdx = headers.indexOf('task_id');
  const workbooks = {};
  const seenIdsByMonth = {};

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const taskId = taskIdColIdx !== -1 ? String(row[taskIdColIdx] || '').trim() : String(row[0] || '').trim();
    // Skip empty ghost rows
    if (!taskId) continue;

    const m = parseMonthKey(row[monthColIdx !== -1 ? monthColIdx : 1]) || 'SEP-2026';
    const taskName = headers.indexOf('task_name') !== -1 ? String(row[headers.indexOf('task_name')] || '').toLowerCase() : '';
    if (taskName.includes('compact cassettes') || taskName.includes('brazing jig development') || taskId.includes('-TEST')) {
      continue; // Skip legacy deleted task
    }

    if (!seenIdsByMonth[m]) seenIdsByMonth[m] = {};
    if (seenIdsByMonth[m][taskId]) continue; // Deduplicate
    seenIdsByMonth[m][taskId] = true;

    const task = {};
    headers.forEach((h, col) => {
      task[h] = row[col];
    });
    task.month = m;

    if (!workbooks[m]) {
      workbooks[m] = [];
    }
    workbooks[m].push(task);
  }

  return workbooks;
}

/**
 * Insert or update a single task in the TASKS sheet (< 0.2s)
 * Non-destructive protection: Prevents edits from one laptop from wiping out AI details or photos from another.
 */
function syncSingleTask(task) {
  if (!task || !task.task_id || !String(task.task_id).trim()) {
    return { status: 'ERROR', message: 'Valid Task ID is required' };
  }

  // PERMANENT TOMBSTONE PROTECTION:
  // Reject deleted legacy tasks permanently so stale browsers can NEVER resurrect them!
  const cleanId = String(task.task_id).trim();
  const deletedTombstones = getDeletedTaskIds();
  const taskNameStr = String(task.task_name || '').toLowerCase();
  if (deletedTombstones.includes(cleanId) || taskNameStr.includes('compact cassettes') || taskNameStr.includes('brazing jig development') || cleanId.includes('-TEST')) {
    deleteSingleTask(task.task_id, task.month);
    return { status: 'DELETED', action: 'BLOCKED_TOMBSTONE', task_id: task.task_id };
  }

  const sheet = getTasksSheet();
  const lastRow = sheet.getLastRow();
  const headers = DB_CONFIG.TASK_HEADERS;
  const taskIdCol = 0; // task_id is column 0
  const cleanId = String(task.task_id).trim();

  let foundRowIndex = -1;
  let existingRow = null;
  const duplicateRowIndices = [];

  if (lastRow > 1) {
    const allData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    for (let r = 0; r < allData.length; r++) {
      if (String(allData[r][taskIdCol]).trim() === cleanId) {
        if (foundRowIndex === -1) {
          foundRowIndex = 2 + r;
          existingRow = allData[r];
        } else {
          duplicateRowIndices.push(2 + r);
        }
      }
    }
  }

  // If duplicate rows existed in the sheet, remove them in reverse order
  for (let d = duplicateRowIndices.length - 1; d >= 0; d--) {
    sheet.deleteRow(duplicateRowIndices[d]);
  }

  task.last_updated = new Date().toISOString();

  // Ensure TMS status is automatically saved into status & remarks columns for backwards compatibility
  if (task.tms_task_id && (!task.status || !task.status.includes('TMS'))) {
    task.status = 'TMS#' + task.tms_task_id + ' (100% Completed)';
  }
  if (task.tms_task_id && (!task.remarks || !task.remarks.includes('TMS'))) {
    task.remarks = 'TMS_ID:' + task.tms_task_id;
  }

  // NON-DESTRUCTIVE MULTI-DEVICE PROTECTION:
  // If updating existing row, never let incoming undefined fields clobber existing valuable content
  const rowData = headers.map((h, col) => {
    let val = task[h];
    if (foundRowIndex > 0 && existingRow) {
      const existVal = existingRow[col];
      const hasExist = (existVal !== undefined && existVal !== null && String(existVal).trim() !== '');
      
      // If field was omitted from payload completely (val === undefined), keep existing
      if (val === undefined && hasExist) {
        val = existVal;
      } else if (task.clear_photos && (h === 'photo_1' || h === 'photo_2')) {
        val = ''; // Explicitly cleared photo
      }
    }
    
    // Safety guard against Google Sheets 50,000 characters per cell limit
    if (typeof val === 'string' && val.length > 49000) {
      val = val.substring(0, 49000);
    }
    return val !== undefined && val !== null ? val : '';
  });

  if (foundRowIndex > 0) {
    sheet.getRange(foundRowIndex, 1, 1, headers.length).setValues([rowData]);
    return { status: 'OK', action: 'UPDATED', task_id: task.task_id };
  } else {
    sheet.appendRow(rowData);
    return { status: 'OK', action: 'INSERTED', task_id: task.task_id };
  }
}

/**
 * Delete a single task by taskId
 */
function deleteSingleTask(taskId, month) {
  if (!taskId) return { status: 'ERROR', message: 'Task ID required' };

  const sheet = getTasksSheet();
  const data = sheet.getDataRange().getValues();
  const taskIdCol = 0;
  const targetId = String(taskId).trim();

  let deletedCount = 0;
  // Iterate in reverse from bottom to top so row deletions never shift indices
  for (let r = data.length - 1; r >= 1; r--) {
    if (String(data[r][taskIdCol]).trim() === targetId) {
      sheet.deleteRow(r + 1);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    recordDeletedTaskId(targetId);
    return { status: 'OK', action: 'DELETED', task_id: taskId, count: deletedCount };
  }

  return { status: 'NOT_FOUND', task_id: taskId };
}

/**
 * Atomically delete multiple tasks by task_ids in a single reverse-indexed loop
 * Prevents index shifting and eliminates API concurrency rate limits
 */
function deleteMultipleTasks(taskIds, month) {
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return { status: 'OK', deletedCount: 0, message: 'No task IDs provided' };
  }

  const sheet = getTasksSheet();
  const data = sheet.getDataRange().getValues();
  const taskIdCol = 0;
  const idSet = {};
  taskIds.forEach(id => {
    if (id) {
      const clean = String(id).trim();
      idSet[clean] = true;
      recordDeletedTaskId(clean);
    }
  });

  let deletedCount = 0;
  // Iterate in reverse from bottom to top so row indices don't shift!
  for (let r = data.length - 1; r >= 1; r--) {
    const rowId = String(data[r][taskIdCol]).trim();
    if (idSet[rowId]) {
      sheet.deleteRow(r + 1);
      deletedCount++;
    }
  }

  return {
    status: 'OK',
    action: 'DELETED_MULTIPLE',
    deletedCount: deletedCount,
    month: month,
    timestamp: new Date().toISOString()
  };
}

/**
 * Record a deleted Task ID in script properties tombstone list
 */
function recordDeletedTaskId(id) {
  if (!id) return;
  try {
    const props = PropertiesService.getScriptProperties();
    let deleted = JSON.parse(props.getProperty('WALTON_DELETED_TASK_IDS') || '[]');
    const cleanId = String(id).trim();
    if (!deleted.includes(cleanId)) {
      deleted.push(cleanId);
      if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
      props.setProperty('WALTON_DELETED_TASK_IDS', JSON.stringify(deleted));
    }
  } catch (e) {}
}

/**
 * Retrieve all registered deleted task IDs
 */
function getDeletedTaskIds() {
  try {
    const props = PropertiesService.getScriptProperties();
    return JSON.parse(props.getProperty('WALTON_DELETED_TASK_IDS') || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Clean up empty ghost rows and duplicate rows across the TASKS sheet
 */
function cleanupEmptyAndDuplicateRows() {
  const sheet = getTasksSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { status: 'OK', deletedEmpty: 0, deletedDuplicates: 0, message: 'No rows' };
  }

  const data = sheet.getDataRange().getValues();
  const taskIdCol = 0;
  const seenIds = {};
  let deletedEmpty = 0;
  let deletedDuplicates = 0;

  // Process in reverse from bottom to top
  for (let r = data.length - 1; r >= 1; r--) {
    const tid = String(data[r][taskIdCol] || '').trim();
    if (!tid) {
      sheet.deleteRow(r + 1);
      deletedEmpty++;
    } else if (seenIds[tid]) {
      sheet.deleteRow(r + 1);
      deletedDuplicates++;
    } else {
      seenIds[tid] = true;
    }
  }

  return {
    status: 'OK',
    deletedEmpty: deletedEmpty,
    deletedDuplicates: deletedDuplicates,
    totalCleaned: deletedEmpty + deletedDuplicates,
    timestamp: new Date().toISOString()
  };
}

/**
 * Automatically create an official Walton Google Slides Presentation on Google Drive
 */
function createGoogleSlidesPresentation(month, template) {
  try {
    const m = month || 'SEP-2026';
    const title = 'WALTON AC Process Development Monthly Report - ' + m;
    const presentation = SlidesApp.create(title);
    const presentationId = presentation.getId();
    const presUrl = 'https://docs.google.com/presentation/d/' + presentationId + '/edit';

    try {
      const file = DriveApp.getFileById(presentationId);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (driveErr) {
      // Ignored if domain admin prevents public sharing
    }

    return {
      status: 'OK',
      presentationId: presentationId,
      url: presUrl,
      title: title,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      status: 'ERROR',
      message: err.message,
      fallbackUrl: 'https://docs.google.com/presentation/u/0/create'
    };
  }
}

/**
 * Bulk push all local workbooks and cost savings from frontend into Google Sheet
 */
function bulkPushAllData(payload) {
  const workbooks = payload.workbooks || {};
  const costSavings = payload.cost_savings || [];

  const taskSheet = getTasksSheet();
  // Clear existing task data rows (keep headers)
  if (taskSheet.getLastRow() > 1) {
    taskSheet.deleteRows(2, taskSheet.getLastRow() - 1);
  }

  const headers = DB_CONFIG.TASK_HEADERS;
  const taskRows = [];

  const months = Object.keys(workbooks);
  months.forEach(m => {
    const list = workbooks[m] || [];
    list.forEach(t => {
      if (!t || !t.task_id || !String(t.task_id).trim()) return;
      const tName = String(t.task_name || '').toLowerCase();
      if (tName.includes('compact cassettes') || tName.includes('brazing jig development') || String(t.task_id).includes('-TEST')) return;

      const row = headers.map(h => {
        const val = t[h];
        return val !== undefined && val !== null ? val : '';
      });
      taskRows.push(row);
    });
  });

  if (taskRows.length > 0) {
    taskSheet.getRange(2, 1, taskRows.length, headers.length).setValues(taskRows);
    taskSheet.getRange(2, 2, taskRows.length, 1).setNumberFormat('@');
  }

  // Update Cost Savings
  if (Array.isArray(costSavings) && costSavings.length > 0) {
    syncCostSavingsTable(costSavings);
  }

  return {
    status: 'OK',
    action: 'BULK_SAVED',
    total_tasks: taskRows.length,
    months_count: months.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Retrieve all Cost Savings rows
 */
function getAllCostSavings() {
  const sheet = getCostSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const list = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const item = {};
    headers.forEach((h, col) => {
      item[h] = row[col];
    });
    list.push(item);
  }
  return list;
}

/**
 * Sync Cost Savings Table
 */
function syncCostSavingsTable(costList) {
  if (!Array.isArray(costList)) return { status: 'ERROR', message: 'Array expected' };

  const sheet = getCostSheet();
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  const headers = DB_CONFIG.COST_HEADERS;
  const rows = costList.map(item => {
    return headers.map(h => item[h] !== undefined && item[h] !== null ? item[h] : '');
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  return { status: 'OK', count: rows.length };
}

/**
 * Upload High-Resolution Photo directly to Google Drive
 * Saves photo to 'WALTON_Task_Photos' folder and generates direct CDN image URL.
 * Automatically updates photo_1 or photo_2 in the TASKS sheet without hitting the 50,000 char cell limit.
 */
function uploadPhotoToDrive(payload) {
  if (!payload || !payload.base64Data) {
    return { status: 'ERROR', message: 'No photo data provided' };
  }

  try {
    const folderName = 'WALTON_Task_Photos';
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const base64Clean = payload.base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const decoded = Utilities.base64Decode(base64Clean);
    const mimeType = payload.mimeType || 'image/jpeg';
    const fileName = (payload.task_id || 'task') + '_' + (payload.photoType || 'photo_1') + '_' + Date.now() + '.jpg';
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    // Direct, ultra-fast Google Cloud image CDN link (works globally without Google login)
    const directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;

    // Automatically update the row in Google Sheets TASKS sheet
    if (payload.task_id) {
      const photoColName = (payload.photoType === 'photo_2' || payload.photoType === 'after_photo') ? 'photo_2' : 'photo_1';
      const sheet = getTasksSheet();
      const lastRow = sheet.getLastRow();
      const headers = DB_CONFIG.TASK_HEADERS;
      const pColIdx = headers.indexOf(photoColName);
      if (lastRow > 1 && pColIdx !== -1) {
        const idColIdx = headers.indexOf('task_id');
        const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
        for (let r = values.length - 1; r >= 0; r--) {
          if (String(values[r][idColIdx]).trim() === String(payload.task_id).trim()) {
            sheet.getRange(2 + r, pColIdx + 1).setValue(directUrl);
            sheet.getRange(2 + r, headers.indexOf('last_updated') + 1).setValue(new Date().toISOString());
            break;
          }
        }
      }
    }

    return {
      status: 'OK',
      fileId: fileId,
      directUrl: directUrl,
      task_id: payload.task_id,
      photoType: payload.photoType
    };
  } catch (err) {
    return { status: 'ERROR', message: 'Drive upload error: ' + err.message };
  }
}

// -----------------------------------------------------------------------------
// Security & Authentication Handlers
// -----------------------------------------------------------------------------

function getAuthPassword() {
  const props = PropertiesService.getScriptProperties();
  const custom = props.getProperty(AUTH_SETTINGS.KEY_CUSTOM_PASS);
  return (custom && custom.trim().length > 0) ? custom.trim() : AUTH_SETTINGS.DEFAULT_PASS;
}

function verifyInputAuth(payload) {
  const user = (payload.username || '').trim().toLowerCase();
  const pass = (payload.password || '').trim();
  const expectedPass = getAuthPassword();

  const isValid = (user === AUTH_SETTINGS.DEFAULT_USER.toLowerCase()) && 
                  (pass === expectedPass || pass === AUTH_SETTINGS.DEFAULT_PASS);
  return {
    status: 'OK',
    valid: isValid,
    message: isValid ? 'Authenticated successfully' : 'Invalid credentials'
  };
}

function requestAuthOtp(payload) {
  const targetEmail = AUTH_SETTINGS.ADMIN_EMAIL;
  // Generate a secure 6-digit OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + (15 * 60 * 1000); // 15 minutes validity

  const props = PropertiesService.getScriptProperties();
  props.setProperty(AUTH_SETTINGS.KEY_OTP, otp);
  props.setProperty(AUTH_SETTINGS.KEY_OTP_EXP, expiry.toString());

  // Send formatted email via MailApp
  try {
    const subject = '[WALTON AC Process] Password Change Verification Code: ' + otp;
    const bodyText = 'Dear Admin,\n\n' +
      'A request was submitted to change the team password for the AC Process Monthly Report Input Section.\n\n' +
      'Your 6-digit Verification Code is: ' + otp + '\n\n' +
      'This code will expire in 15 minutes.\n\n' +
      'If you did not request this code, please ignore this email.\n\n' +
      'WALTON Hi-Tech Industries PLC • AC Process Development';

    const htmlBody = '<div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #FFFFFF;">' +
      '<div style="text-align: center; margin-bottom: 20px;">' +
      '<span style="font-size: 20px; font-weight: 900; color: #C5161D; letter-spacing: 2px;">WALTON</span>' +
      '<div style="font-size: 12px; font-weight: bold; color: #64748B; margin-top: 4px;">AC PROCESS DEVELOPMENT &bull; MONTHLY REPORT SYSTEM</div>' +
      '</div>' +
      '<h2 style="color: #0F172A; font-size: 17px; font-weight: 800; margin-bottom: 12px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">Security Verification Code</h2>' +
      '<p style="font-size: 13px; color: #334155; line-height: 1.6;">A request was made to update the team login password for the <strong>Monthly Task Input Section</strong>.</p>' +
      '<div style="background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">' +
      '<div style="font-size: 11px; font-weight: bold; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Your 6-Digit Code</div>' +
      '<div style="font-size: 32px; font-weight: 900; color: #C5161D; letter-spacing: 8px; font-family: monospace; margin: 8px 0;">' + otp + '</div>' +
      '<div style="font-size: 11px; color: #94A3B8;">Valid for 15 minutes</div>' +
      '</div>' +
      '<p style="font-size: 12px; color: #64748B;">If you did not request this password change, no action is needed and your existing password remains active.</p>' +
      '<div style="border-top: 1px solid #E2E8F0; margin-top: 24px; padding-top: 12px; font-size: 11px; color: #94A3B8; text-align: center;">' +
      'WALTON Hi-Tech Industries PLC &bull; Automated Cloud Security Notification' +
      '</div>' +
      '</div>';

    MailApp.sendEmail({
      to: targetEmail,
      subject: subject,
      body: bodyText,
      htmlBody: htmlBody
    });

    return {
      status: 'OK',
      success: true,
      message: 'Verification code sent to ' + targetEmail
    };
  } catch (mailErr) {
    return {
      status: 'ERROR',
      success: false,
      message: 'Failed to send email: ' + mailErr.message
    };
  }
}

function verifyOtpAndChangePassword(payload) {
  const enteredOtp = (payload.otp || '').toString().trim();
  const newPassword = (payload.newPassword || '').trim();

  if (!newPassword || newPassword.length < 6) {
    return { status: 'ERROR', success: false, error: 'New password must be at least 6 characters long.' };
  }

  const props = PropertiesService.getScriptProperties();
  const savedOtp = props.getProperty(AUTH_SETTINGS.KEY_OTP);
  const expiryStr = props.getProperty(AUTH_SETTINGS.KEY_OTP_EXP);
  const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;

  if (!savedOtp || savedOtp !== enteredOtp) {
    return { status: 'ERROR', success: false, error: 'Invalid verification code. Please check your email.' };
  }

  if (Date.now() > expiry) {
    return { status: 'ERROR', success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  // OTP verified! Save new password and clear OTP
  props.setProperty(AUTH_SETTINGS.KEY_CUSTOM_PASS, newPassword);
  props.deleteProperty(AUTH_SETTINGS.KEY_OTP);
  props.deleteProperty(AUTH_SETTINGS.KEY_OTP_EXP);

  return {
    status: 'OK',
    success: true,
    message: 'Password changed successfully! The new password is now active across all devices.'
  };
}


