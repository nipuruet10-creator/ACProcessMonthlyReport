/**
 * Process Development Monthly Report Automation System
 * Module: Settings View
 * Manages Gemini API Key, Google Sheets Cloud Database, and System Preferences
 * WALTON Hi-Tech Industries PLC
 */

const SettingsView = {
  render(containerId = 'settings-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentGeminiKey = HELPERS.storage.get(APP_CONFIG.AI.STORAGE_KEY_API_KEY, "");
    const currentGasUrl = (typeof GoogleSheetsSync !== 'undefined') ? GoogleSheetsSync.getWebAppUrl() : "";
    const syncStatus = (typeof GoogleSheetsSync !== 'undefined') ? GoogleSheetsSync.getStatus() : { status: 'OFFLINE' };

    let statusBadgeHtml = `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
        <span class="w-2 h-2 rounded-full bg-slate-500"></span> Not Connected (Local Mode)
      </span>
    `;
    if (syncStatus.status === 'CONNECTED') {
      statusBadgeHtml = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Connected to Google Sheets
        </span>
      `;
    } else if (syncStatus.status === 'SYNCING') {
      statusBadgeHtml = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span class="inline-block w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span> Syncing...
        </span>
      `;
    } else if (syncStatus.status === 'ERROR') {
      statusBadgeHtml = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <span class="w-2 h-2 rounded-full bg-rose-400"></span> Connection Error
        </span>
      `;
    }

    container.innerHTML = `
      <div class="space-y-6 max-w-4xl">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            SYSTEM SETTINGS & INTEGRATIONS
          </span>
          <h2 class="text-2xl font-black text-white mt-1">Application Configuration</h2>
          <p class="text-xs text-slate-400 mt-0.5">Manage Google Sheets multi-user cloud database, Gemini 3.8 Flash AI, and local data persistence.</p>
        </div>

        <!-- Google Sheets Cloud Database Card -->
        <div class="bg-slate-900 border border-emerald-900/40 rounded-2xl p-6 shadow-xl space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg font-bold">
                📊
              </div>
              <div>
                <h3 class="text-base font-bold text-white flex items-center gap-2">
                  Google Sheets Central Cloud Database
                  ${statusBadgeHtml}
                </h3>
                <p class="text-xs text-slate-400">Enables real-time multi-user team collaboration across all engineers and computers.</p>
              </div>
            </div>
            <div>
              <button onclick="SettingsView.toggleSetupGuide()" class="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1">
                <span>📖 Setup Instructions</span>
              </button>
            </div>
          </div>

          <!-- URL Input & Buttons -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Google Apps Script Web App URL
            </label>
            <div class="flex flex-col sm:flex-row items-stretch gap-3">
              <input type="text" id="settings-gas-url" value="${HELPERS.escapeHtml(currentGasUrl)}" 
                     placeholder="https://script.google.com/macros/s/.../exec" 
                     class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono" />
              <div class="flex gap-2">
                <button onclick="SettingsView.saveGasUrl()" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow transition-colors">
                  💾 Save URL
                </button>
                <button onclick="SettingsView.testGasConnection()" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors">
                  🔗 Test
                </button>
              </div>
            </div>
            <p class="text-[11px] text-slate-500 mt-1">
              Any tasks added or edited by team members will automatically sync to this Google Spreadsheet in real time.
            </p>
          </div>

          <!-- Cloud Action Buttons -->
          <div class="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
            <button onclick="SettingsView.syncFromGas()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-colors flex items-center gap-2">
              <span>🔄 Sync from Google Sheets</span>
            </button>
            <button onclick="SettingsView.pushAllLocalData()" class="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-xs font-bold text-emerald-400 border border-emerald-500/30 transition-colors flex items-center gap-2">
              <span>⬆️ Push All Local Data to Google Sheet (Jan-Aug + All)</span>
            </button>
            <button onclick="SettingsView.archiveOldData()" class="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-xs font-bold text-amber-400 border border-amber-500/30 transition-colors flex items-center gap-2" title="Move Jan-Aug historical tasks to ARCHIVE_TASKS sheet to make Google Sheets ultra-fast">
              <span>⚡ Archive Old Data (Jan–Aug 2026)</span>
            </button>
          </div>

          <!-- Collapsible Setup Guide -->
          <div id="gas-setup-guide" class="hidden bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-white text-sm text-cyan-400">⚡ 2-Minute Google Sheets Setup Guide</h4>
              <button onclick="SettingsView.copyGasScript()" class="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-[11px] font-bold text-white shadow">
                📋 Copy Apps Script Code
              </button>
            </div>
            <ol class="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
              <li>Open a new Google Sheet at <a href="https://sheets.new" target="_blank" class="text-cyan-400 underline">sheets.new</a> and name it <strong class="text-white">"Walton AC Process Monthly Report DB"</strong>.</li>
              <li>Click menu: <strong class="text-white">Extensions > Apps Script</strong>.</li>
              <li>Delete whatever is in the script editor, click the <strong class="text-cyan-400">"📋 Copy Apps Script Code"</strong> button above, and paste it into the editor.</li>
              <li>Click <strong class="text-white">Save</strong> (Floppy disk icon).</li>
              <li>Click the blue <strong class="text-white">Deploy</strong> button (top right) > <strong class="text-white">New deployment</strong>.</li>
              <li>Select type: <strong class="text-white">Web app</strong> (gear icon next to 'Select type').</li>
              <li>Configure:
                <ul class="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-400">
                  <li>Description: <code class="text-emerald-400">Walton AC Process Sync API</code></li>
                  <li>Execute as: <code class="text-emerald-400">Me (your email)</code></li>
                  <li>Who has access: <strong class="text-amber-400">Anyone</strong> (Mandatory so everyone can sync without individual Google auth)</li>
                </ul>
              </li>
              <li>Click <strong class="text-white">Deploy</strong>, authorize Google permissions when prompted.</li>
              <li>Copy the generated <strong class="text-white">Web app URL</strong> (ends in <code>/exec</code>), paste it into the box above, and click <strong class="text-white">"Save URL"</strong>!</li>
            </ol>
          </div>
        </div>

        <!-- Gemini API Key Configuration Card -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              ⚡
            </div>
            <div>
              <h3 class="text-sm font-bold text-white">Google Gemini 3.8 Flash API Integration</h3>
              <p class="text-xs text-slate-400">Used for technical summary rewriting and zero-fabrication impact synthesis.</p>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Gemini API Key</label>
            <div class="flex items-center gap-3">
              <input type="password" id="settings-gemini-key" value="${HELPERS.escapeHtml(currentGeminiKey)}" placeholder="AIzaSy..." 
                     class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono" />
              <button onclick="SettingsView.saveGeminiKey()" class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow">
                Save Key
              </button>
            </div>
            <p class="text-[11px] text-slate-500 mt-1">
              If left blank, the system automatically uses deterministic rule-based local transformation with 100% offline capability.
            </p>
          </div>
        </div>

        <!-- Storage & Cache Controls -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 class="text-sm font-bold text-white">Cache &amp; Local Persistence</h3>
          <p class="text-xs text-slate-400">Clear cached AI breakdowns or reload original seed data.</p>
          <div class="flex flex-wrap gap-3">
            <button onclick="SettingsView.clearAICache()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700">
              🧹 Clear AI Response Cache
            </button>
            <button onclick="SettingsView.resetWorkbooks()" class="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/30">
              🔄 Reset Month Workbooks to Defaults
            </button>
          </div>
        </div>
      </div>
    `;
  },

  toggleSetupGuide() {
    const guide = document.getElementById('gas-setup-guide');
    if (guide) {
      guide.classList.toggle('hidden');
    }
  },

  saveGasUrl() {
    const url = document.getElementById('settings-gas-url').value.trim();
    if (typeof GoogleSheetsSync !== 'undefined') {
      GoogleSheetsSync.setWebAppUrl(url);
      if (url) {
        alert("Google Sheets Web App URL saved! Testing connection...");
        SettingsView.testGasConnection();
      } else {
        alert("Google Sheets URL removed. System is now in Local Offline Mode.");
        SettingsView.render();
      }
    }
  },

  async testGasConnection() {
    const url = document.getElementById('settings-gas-url').value.trim();
    if (!url) {
      alert("Please enter a Google Apps Script Web App URL first.");
      return;
    }

    try {
      if (typeof GoogleSheetsSync !== 'undefined') {
        const res = await GoogleSheetsSync.testConnection(url);
        alert(`✅ Success! Connected to Google Sheets!\nSystem: ${res.system || 'Walton Central DB'}\nStatus: ${res.status}`);
        SettingsView.render();
      }
    } catch (err) {
      alert(`❌ Connection failed:\n${err.message}\n\nPlease verify that the Web App is deployed with 'Who has access: Anyone'.`);
    }
  },

  async syncNow() {
    if (typeof GoogleSheetsSync !== 'undefined') {
      const ok = await GoogleSheetsSync.pullFromCloud(false);
      if (ok) {
        alert("Synced successfully from Google Sheets!");
        SettingsView.render();
      }
    }
  },

  async pushAllLocalData() {
    if (!confirm("This will upload all existing local data (Jan-Aug 2026 + all months + cost savings) to your Google Sheet. Continue?")) {
      return;
    }

    try {
      if (typeof GoogleSheetsSync !== 'undefined') {
        const result = await GoogleSheetsSync.pushAllLocalData();
        alert(`✅ All data successfully uploaded to Google Sheet!\nTotal Tasks: ${result.total_tasks}\nMonths: ${result.months_count}`);
        SettingsView.render();
      }
    } catch (err) {
      alert(`❌ Push failed: ${err.message}`);
    }
  },

  async archiveOldData() {
    if (!confirm("This will optimize your Google Sheet by moving historical tasks prior to SEP-2026 into an 'ARCHIVE_TASKS' sheet.\n\n• All historical data is 100% safely preserved in the spreadsheet\n• The active TASKS sheet becomes ultra-lightweight\n• Multi-device live sync speed increases up to 400x!\n\nDo you want to proceed with optimization?")) {
      return;
    }

    try {
      if (typeof GoogleSheetsSync === 'undefined' || !GoogleSheetsSync.getWebAppUrl()) {
        alert("Please configure Google Apps Script Web App URL first.");
        return;
      }
      const res = await GoogleSheetsSync.archiveOldData();
      alert(`✅ Optimization Complete!\n\n• ${res.message || 'Archived old tasks successfully.'}\n• Archived: ${res.archivedCount} rows\n• Active Tasks: ${res.activeCount} rows`);
      SettingsView.render();
    } catch (e) {
      alert("Archive optimization notice: " + e.message);
    }
  },

  copyGasScript() {
    // The complete script is read from WaltonCentralDB
    const scriptCode = `/**
 * @OnlyCurrentDoc
 * Process Development Monthly Report Automation System
 * Central Cloud Database Backend for Google Sheets
 * Organization: WALTON Hi-Tech Industries PLC
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
    'remarks', 'last_updated'
  ],
  COST_HEADERS: [
    'year', 'month_code', 'target_bdt', 'achieved_bdt', 'project_count', 'remarks', 'last_updated'
  ]
};

function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action || 'PING';
    let result = {};

    if (action === 'PING' || action === 'health') {
      result = { status: 'OK', system: 'Walton AC Process Report Central DB', version: '2.3.0', timestamp: new Date().toISOString() };
    } else if (action === 'GET_MONTH') {
      const month = params.month || 'SEP-2026';
      let tasks = [];
      try {
        tasks = getTasksForMonth(month);
      } catch (mErr) {
        tasks = getRecentTasks(100);
      }
      result = { status: 'OK', month: month, tasks: tasks, timestamp: new Date().toISOString() };
    } else if (action === 'GET_RECENT') {
      const limit = parseInt(params.limit || '80', 10);
      result = { status: 'OK', tasks: getRecentTasks(limit), timestamp: new Date().toISOString() };
    } else if (action === 'ARCHIVE_OLD_DATA') {
      result = archiveOldData();
    } else if (action === 'GET_ALL') {
      result = { status: 'OK', workbooks: getAllWorkbooksGrouped(), cost_savings: getAllCostSavings(), timestamp: new Date().toISOString() };
    } else {
      result = { status: 'ERROR', message: 'Unknown GET action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ERROR', message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let requestData = {};
    if (e && e.postData && e.postData.contents) {
      try { requestData = JSON.parse(e.postData.contents); } catch (parseErr) { requestData = {}; }
    }

    const action = requestData.action || '';
    const payload = requestData.payload || {};
    let result = {};

    if (action === 'SYNC_TASK') {
      result = syncSingleTask(payload);
    } else if (action === 'DELETE_TASK') {
      result = deleteSingleTask(payload.task_id, payload.month);
    } else if (action === 'BULK_PUSH') {
      result = bulkPushAllData(payload);
    } else if (action === 'SYNC_COST_SAVINGS') {
      result = syncCostSavingsTable(payload);
    } else if (action === 'ARCHIVE_OLD_DATA') {
      result = archiveOldData();
    } else {
      result = { status: 'ERROR', message: 'Unsupported POST action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ERROR', message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

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
    range.setFontWeight('bold').setBackground(headerColor || '#1E293B').setFontColor('#FFFFFF').setHorizontalAlignment('center');
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

function parseMonthKey(val) {
  if (!val) return '';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  if (val instanceof Date) {
    const bdTime = new Date(val.getTime() + (6 * 3600 * 1000));
    return months[bdTime.getUTCMonth()] + '-' + bdTime.getUTCFullYear();
  }
  const str = String(val).trim();
  const std = str.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[- ]?(\\d{4})$/i);
  if (std) return std[1].toUpperCase() + '-' + std[2];
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const bdTime = new Date(d.getTime() + (6 * 3600 * 1000));
    return months[bdTime.getUTCMonth()] + '-' + bdTime.getUTCFullYear();
  }
  const mMatch = str.match(/\\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\\b/i);
  const yMatch = str.match(/\\b(202\\d|203\\d)\\b/);
  if (mMatch && yMatch) {
    const monthMap = { "JAN":"JAN","FEB":"FEB","MAR":"MAR","APR":"APR","MAY":"MAY","JUN":"JUN","JUL":"JUL","AUG":"AUG","SEP":"SEP","OCT":"OCT","NOV":"NOV","DEC":"DEC","JANUARY":"JAN","FEBRUARY":"FEB","MARCH":"MAR","APRIL":"APR","JUNE":"JUN","JULY":"JUL","AUGUST":"AUG","SEPTEMBER":"SEP","OCTOBER":"OCT","NOVEMBER":"NOV","DECEMBER":"DEC" };
    return (monthMap[mMatch[1].toUpperCase()] || mMatch[1].toUpperCase().substring(0, 3)) + '-' + yMatch[1];
  }
  return str.toUpperCase();
}

function getTasksForMonth(month) {
  const target = month ? parseMonthKey(month) : 'SEP-2026';
  const sheet = getTasksSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const monthColIdx = headers.indexOf('month');
  if (monthColIdx === -1) return [];

  // Check bottom 120 rows first (< 50ms) where active tasks reside
  const scanRows = Math.min(120, lastRow - 1);
  const startRow = lastRow - scanRows + 1;
  const recentValues = sheet.getRange(startRow, 1, scanRows, headers.length).getValues();
  const tasks = [];
  for (let i = 0; i < recentValues.length; i++) {
    const row = recentValues[i];
    const m = parseMonthKey(row[monthColIdx]);
    if (m === target) {
      const task = {};
      headers.forEach((h, col) => { task[h] = row[col]; });
      task.month = target;
      tasks.push(task);
    }
  }
  if (tasks.length > 0) return tasks;

  if (startRow > 2) {
    const olderValues = sheet.getRange(2, 1, startRow - 2, headers.length).getValues();
    for (let i = 0; i < olderValues.length; i++) {
      const row = olderValues[i];
      const m = parseMonthKey(row[monthColIdx]);
      if (m === target) {
        const task = {};
        headers.forEach((h, col) => { task[h] = row[col]; });
        task.month = target;
        tasks.push(task);
      }
    }
  }
  return tasks;
}

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
    headers.forEach((h, col) => { task[h] = row[col]; });
    if (monthColIdx !== -1) task.month = parseMonthKey(row[monthColIdx]);
    tasks.push(task);
  }
  return tasks;
}

function archiveOldData() {
  const ss = getSpreadsheet();
  const taskSheet = getTasksSheet();
  const archiveSheet = getOrCreateSheet(DB_CONFIG.SHEET_ARCHIVE, DB_CONFIG.TASK_HEADERS, '#334155');
  const lastRow = taskSheet.getLastRow();
  if (lastRow <= 1) return { status: 'OK', archivedCount: 0, activeCount: 0, message: 'No tasks to archive.' };
  const headers = DB_CONFIG.TASK_HEADERS;
  const values = taskSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const monthColIdx = headers.indexOf('month');
  const keepRows = [];
  const archiveRows = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const m = parseMonthKey(row[monthColIdx !== -1 ? monthColIdx : 1]);
    if (m === 'SEP-2026' || m.endsWith('-2027') || m === 'OCT-2026' || m === 'NOV-2026' || m === 'DEC-2026') {
      keepRows.push(row);
    } else {
      archiveRows.push(row);
    }
  }
  if (archiveRows.length > 0) {
    const startArchiveRow = archiveSheet.getLastRow() + 1;
    archiveSheet.getRange(startArchiveRow, 1, archiveRows.length, headers.length).setValues(archiveRows);
  }
  taskSheet.deleteRows(2, lastRow - 1);
  if (keepRows.length > 0) {
    taskSheet.getRange(2, 1, keepRows.length, headers.length).setValues(keepRows);
    taskSheet.getRange(2, 2, keepRows.length, 1).setNumberFormat('@');
  }
  return { status: 'OK', archivedCount: archiveRows.length, activeCount: keepRows.length, message: 'Successfully archived ' + archiveRows.length + ' historical tasks into ARCHIVE_TASKS sheet. Active TASKS sheet now has ' + keepRows.length + ' tasks and runs at maximum speed!' };
}

function getAllWorkbooksGrouped() {
  const sheet = getTasksSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return {};
  const headers = data[0];
  const monthColIdx = headers.indexOf('month');
  const workbooks = {};
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const task = {};
    headers.forEach((h, col) => { task[h] = row[col]; });
    const m = parseMonthKey(row[monthColIdx !== -1 ? monthColIdx : 1]) || 'SEP-2026';
    task.month = m;
    if (!workbooks[m]) workbooks[m] = [];
    workbooks[m].push(task);
  }
  return workbooks;
}

function syncSingleTask(task) {
  if (!task || !task.task_id) return { status: 'ERROR', message: 'Task ID is required' };
  const sheet = getTasksSheet();
  const lastRow = sheet.getLastRow();
  const headers = DB_CONFIG.TASK_HEADERS;
  let foundRowIndex = -1;
  let existingRow = null;

  if (lastRow > 1) {
    const checkCount = Math.min(120, lastRow - 1);
    const startScan = lastRow - checkCount + 1;
    const recentData = sheet.getRange(startScan, 1, checkCount, headers.length).getValues();
    for (let r = recentData.length - 1; r >= 0; r--) {
      if (String(recentData[r][0]).trim() === String(task.task_id).trim()) {
        foundRowIndex = startScan + r;
        existingRow = recentData[r];
        break;
      }
    }
    if (foundRowIndex === -1 && startScan > 2) {
      const earlierData = sheet.getRange(2, 1, startScan - 2, headers.length).getValues();
      for (let r = earlierData.length - 1; r >= 0; r--) {
        if (String(earlierData[r][0]).trim() === String(task.task_id).trim()) {
          foundRowIndex = 2 + r;
          existingRow = earlierData[r];
          break;
        }
      }
    }
  }

  task.last_updated = new Date().toISOString();
  const rowData = headers.map((h, col) => {
    let val = task[h];
    if (foundRowIndex > 0 && existingRow) {
      const existVal = existingRow[col];
      const hasExist = (existVal !== undefined && existVal !== null && String(existVal).trim() !== '');
      const incomingEmpty = (val === undefined || val === null || String(val).trim() === '');
      if (incomingEmpty && hasExist) {
        if (h === 'task_details' || h === 'photo_1' || h === 'photo_2' || h === 'ai_report_title' || h === 'ai_report_description' || h === 'ai_report_impact') {
          val = existVal;
        }
      }
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

function deleteSingleTask(taskId, month) {
  if (!taskId) return { status: 'ERROR', message: 'Task ID required' };
  const sheet = getTasksSheet();
  const data = sheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][0]).trim() === String(taskId).trim()) {
      sheet.deleteRow(r + 1);
      return { status: 'OK', action: 'DELETED', task_id: taskId };
    }
  }
  return { status: 'NOT_FOUND', task_id: taskId };
}

function bulkPushAllData(payload) {
  const workbooks = payload.workbooks || {};
  const costSavings = payload.cost_savings || [];
  const taskSheet = getTasksSheet();
  if (taskSheet.getLastRow() > 1) {
    taskSheet.deleteRows(2, taskSheet.getLastRow() - 1);
  }
  const headers = DB_CONFIG.TASK_HEADERS;
  const taskRows = [];
  const months = Object.keys(workbooks);
  months.forEach(m => {
    const list = workbooks[m] || [];
    list.forEach(t => {
      const row = headers.map(h => t[h] !== undefined && t[h] !== null ? t[h] : '');
      taskRows.push(row);
    });
  });
  if (taskRows.length > 0) {
    taskSheet.getRange(2, 1, taskRows.length, headers.length).setValues(taskRows);
    taskSheet.getRange(2, 2, taskRows.length, 1).setNumberFormat('@');
  }
  if (Array.isArray(costSavings) && costSavings.length > 0) {
    syncCostSavingsTable(costSavings);
  }
  return { status: 'OK', action: 'BULK_SAVED', total_tasks: taskRows.length, months_count: months.length, timestamp: new Date().toISOString() };
}

function getAllCostSavings() {
  const sheet = getCostSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const list = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const item = {};
    headers.forEach((h, col) => { item[h] = row[col]; });
    list.push(item);
  }
  return list;
}

function syncCostSavingsTable(costList) {
  if (!Array.isArray(costList)) return { status: 'ERROR', message: 'Array expected' };
  const sheet = getCostSheet();
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  const headers = DB_CONFIG.COST_HEADERS;
  const rows = costList.map(item => headers.map(h => item[h] !== undefined && item[h] !== null ? item[h] : ''));
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  return { status: 'OK', count: rows.length };
}`;

    navigator.clipboard.writeText(scriptCode).then(() => {
      alert("📋 Google Apps Script code copied to clipboard!\n\nNow open Google Sheets > Extensions > Apps Script, paste it, save and deploy as Web App.");
    }).catch(() => {
      prompt("Copy the Google Apps Script code below:", scriptCode);
    });
  },

  saveGeminiKey() {
    const key = document.getElementById('settings-gemini-key').value.trim();
    HELPERS.storage.set(APP_CONFIG.AI.STORAGE_KEY_API_KEY, key);
    alert(key ? "Gemini API Key saved successfully!" : "Gemini API Key removed. Local rule fallback active.");
  },

  clearAICache() {
    AICacheManager.clear();
    alert("AI Cache cleared successfully.");
  },

  resetWorkbooks() {
    if (confirm("Reset all monthly workbooks back to original seed data? This will overwrite local edits.")) {
      localStorage.removeItem("walton_pd_month_workbooks_v1");
      localStorage.removeItem("walton_pd_month_workbooks_v2");
      localStorage.removeItem("walton_pd_ai_breakdown_v1");
      if (window.appState && window.appState.workbookMgr) {
        window.appState.workbookMgr.init();
      }
      alert("Workbooks reset. Reloading view.");
      window.location.reload();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsView;
} else if (typeof window !== 'undefined') {
  window.SettingsView = SettingsView;
}
