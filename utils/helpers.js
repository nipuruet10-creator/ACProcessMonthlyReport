/**
 * Process Development Monthly Report Automation System
 * Module: Utility Functions
 */

const HELPERS = {
  /**
   * Generates a unique task ID: TSK-YYYYMM-XXXX
   */
  generateTaskId(monthStr) {
    const cleanMonth = (monthStr || '2026-08').replace(/[^0-9]/g, '').slice(0, 6);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `TSK-${cleanMonth}-${rand}`;
  },

  /**
   * Formats a numeric value into Bangladeshi Taka format (e.g. ৳ 28,12,151)
   */
  formatBDT(value) {
    if (value === null || value === undefined || value === '') return '৳ 0';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : Number(value);
    if (isNaN(num)) return '৳ 0';

    const isNegative = num < 0;
    const absVal = Math.round(Math.abs(num));
    const str = absVal.toString();

    // Indian/Bangladeshi Numbering System: 3 digits, then groups of 2 digits
    let result = '';
    if (str.length <= 3) {
      result = str;
    } else {
      const last3 = str.substring(str.length - 3);
      const remaining = str.substring(0, str.length - 3);
      const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      result = formattedRemaining + ',' + last3;
    }

    return (isNegative ? '-৳ ' : '৳ ') + result;
  },

  /**
   * Parses annual saving or cost string into a pure number
   */
  parseCurrencyNumber(val) {
    if (!val) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const clean = val.toString().replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  },

  /**
   * Standardizes ISO date YYYY-MM-DD
   */
  formatDate(dateObjOrStr) {
    if (!dateObjOrStr) return '';
    const d = new Date(dateObjOrStr);
    if (isNaN(d.getTime())) return String(dateObjOrStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Deep clone object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return Object.assign({}, obj);
    }
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  escapeHtml(str) {
    return this.escapeHTML(str);
  },

  /**
   * Safe LocalStorage wrapper
   */
  storage: {
    get(key, defaultValue = null) {
      try {
        if (typeof localStorage === 'undefined') return defaultValue;
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.warn(`Storage read error for key [${key}]:`, e);
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        if (typeof localStorage === 'undefined') return false;
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn(`Storage write error for key [${key}]:`, e);
        return false;
      }
    },
    remove(key) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Storage remove error for key [${key}]:`, e);
      }
    }
  },

  /**
   * Renders a unified Month Selector UI: Current active month pill + Previous/Other Months dropdown + Add Month button
   */
  renderMonthSelectorUI(months, selectedMonth, onselectJsMethodName, onAddMonthJsMethodName = null) {
    const runningMonth = (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.activeMonth
      : "SEP-2026";
    const current = selectedMonth || (months && months[0] ? months[0] : runningMonth);
    const safeMonths = Array.isArray(months) ? months : [current];

    const monthOrder = { "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12 };

    const isArchived = (m) => {
      if (m === runningMonth) return false;
      const parts = String(m).toUpperCase().split('-');
      if (parts.length !== 2) return false;
      const yr = parseInt(parts[1], 10);
      const mIdx = monthOrder[parts[0]] || 0;
      const runParts = String(runningMonth).toUpperCase().split('-');
      const runYr = parseInt(runParts[1], 10);
      const runMIdx = monthOrder[runParts[0]] || 9;
      if (yr < runYr) return true;
      if (yr === runYr && mIdx < runMIdx) return true;
      return false;
    };

    // Filter valid months and exclude purged Jan-Jul 2026
    const validMonths = safeMonths.filter(m => {
      const parts = String(m).toUpperCase().split('-');
      if (parts.length !== 2) return false;
      if (["JAN-2026", "FEB-2026", "MAR-2026", "APR-2026", "MAY-2026", "JUN-2026", "JUL-2026"].includes(m)) return false;
      const yr = parseInt(parts[1], 10);
      return !isNaN(yr) && yr >= 2026;
    });

    // Sort chronologically
    validMonths.sort((a, b) => {
      const pA = a.split('-');
      const pB = b.split('-');
      const yA = parseInt(pA[1], 10), yB = parseInt(pB[1], 10);
      if (yA !== yB) return yA - yB;
      return (monthOrder[pA[0]] || 0) - (monthOrder[pB[0]] || 0);
    });

    const archiveMonths = validMonths.filter(m => isArchived(m));
    const isViewingArchive = isArchived(current);
    const archiveLabel = archiveMonths.length === 1 
      ? `Previous Month (${archiveMonths[0]})`
      : (archiveMonths.length > 1 ? `Archive Months (${archiveMonths[0]} – ${archiveMonths[archiveMonths.length - 1]})` : 'Archive Months');

    if (isViewingArchive) {
      return `
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Return to Running Month Quick Action -->
          <button type="button" onclick="${onselectJsMethodName}('${runningMonth}')" 
                  title="Return to active running month"
                  class="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs flex items-center gap-1.5 transition cursor-pointer">
            <span>🟢</span> <span>Running Month: <strong>${runningMonth}</strong></span>
          </button>

          <!-- Active Archived Month Indicator -->
          <div class="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500 text-white shadow-xs border border-amber-600 flex items-center gap-1.5">
            <span>📦</span> <span>Archive: ${current}</span>
            <span class="px-1.5 py-0.2 rounded text-[9px] bg-black/20 uppercase tracking-wider font-bold">Historical</span>
          </div>

          <!-- Archive Dropdown to switch between archived months -->
          <div class="relative inline-flex items-center">
            <select onchange="if(this.value) { ${onselectJsMethodName}(this.value); }" 
                    title="Switch to another archived month"
                    class="bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-amber-900 shadow-xs focus:outline-none cursor-pointer">
              <option value="" disabled>Change Archive ▼</option>
              ${archiveMonths.map(m => `<option value="${m}" ${m === current ? 'selected' : ''}>${m} ${m === current ? '(Current)' : ''}</option>`).join('')}
            </select>
          </div>

          ${onAddMonthJsMethodName ? `
          <button type="button" onclick="${onAddMonthJsMethodName}()" title="Add a new month" 
                  class="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition flex items-center gap-1 whitespace-nowrap cursor-pointer">
            <span>➕</span> <span>Add Month</span>
          </button>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Running Month Active Pill -->
        <button type="button" onclick="${onselectJsMethodName}('${runningMonth}')" 
                title="Active Running Month"
                class="px-3.5 py-1.5 rounded-xl text-xs font-mono font-black bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-sm shadow-blue-500/20 border border-blue-600 flex items-center gap-1.5 whitespace-nowrap cursor-default">
          <span>🟢</span> <span>Running Month: ${runningMonth}</span>
          <span class="px-1.5 py-0.2 rounded text-[9px] bg-white/20 text-white uppercase tracking-wider font-bold">Active</span>
        </button>

        <!-- Archived / Previous Months Dropdown -->
        ${archiveMonths.length > 0 ? `
        <div class="relative inline-flex items-center">
          <select onchange="if(this.value) { ${onselectJsMethodName}(this.value); }" 
                  title="View previous month data"
                  class="bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-700 shadow-xs focus:outline-none focus:border-blue-500 transition cursor-pointer">
            <option value="" selected disabled>📦 ${archiveLabel} ▼</option>
            ${archiveMonths.map(m => `<option value="${m}">${m} (Archived)</option>`).join('')}
          </select>
        </div>
        ` : ''}

        ${onAddMonthJsMethodName ? `
        <!-- Add Month Button -->
        <button type="button" onclick="${onAddMonthJsMethodName}()" title="Add a new month" 
                class="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition flex items-center gap-1 whitespace-nowrap cursor-pointer">
          <span>➕</span> <span>Add Month</span>
        </button>
        ` : ''}
      </div>
    `;
  },

  /**
   * Formats any personnel name with ID: e.g. "Rafi" -> "Rafi (45127)"
   */
  formatPersonnelName(raw) {
    if (!raw || typeof raw !== 'string') return "";
    if (typeof MasterDataManager !== 'undefined' && MasterDataManager.formatNameWithId) {
      return MasterDataManager.formatNameWithId(raw);
    }
    return raw.trim();
  },

  /**
   * Formats task details into clean, concise short bullet points
   * @param {string} text
   * @returns {string} Short bullet points e.g. "1. Step • 2. Step • 3. Step"
   */
  formatDetailsAsShortBullets(text) {
    if (!text || typeof text !== 'string') return '';
    const rawParts = text.split(/(?:\r?\n|\s*\b\d+[\.\)]\s*|[•*]|\s*;\s*)/).map(s => s.trim()).filter(Boolean);
    if (rawParts.length === 0) return text.trim();
    const bullets = rawParts.map(p => {
      let clean = p.replace(/^[•\-\*0-9\.\)\s]+/, '').trim();
      if (clean.length > 70) {
        const commaIdx = clean.indexOf(',');
        if (commaIdx > 20 && commaIdx < 70) {
          clean = clean.substring(0, commaIdx).trim();
        } else {
          const words = clean.split(/\s+/);
          if (words.length > 8) clean = words.slice(0, 8).join(' ') + '...';
        }
      }
      return clean;
    }).filter(b => b.length > 0);
    if (bullets.length === 0) return text.trim();
    return bullets.map((b, i) => `${i + 1}. ${b}`).join(' • ');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HELPERS;
} else if (typeof window !== 'undefined') {
  window.HELPERS = HELPERS;
}
