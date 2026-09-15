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
    const current = selectedMonth || (months && months[0] ? months[0] : 'SEP-2026');
    const safeMonths = Array.isArray(months) ? months : [current];

    const monthOrder = { "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12 };
    const runningYear = 2026;
    const runningMonthIndex = 9; // SEP-2026

    // Exclude any 2025 months; strictly show Jan'2026 up to current running month (Sep'2026)
    const filteredMonths = safeMonths.filter(m => {
      const parts = String(m).toUpperCase().split('-');
      if (parts.length !== 2) return false;
      const yr = parseInt(parts[1], 10);
      const mIdx = monthOrder[parts[0]] || 0;
      if (isNaN(yr) || yr < runningYear) return false; // Strictly exclude 2025 and older
      if (yr === runningYear) {
        return mIdx <= runningMonthIndex || m === current;
      }
      return m === current;
    });

    const displayMonths = filteredMonths.length > 0 ? filteredMonths : [current];

    // Group display months by year
    const groups = {};
    displayMonths.forEach(m => {
      const parts = m.split('-');
      const yr = parts[1] || 'Other';
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push(m);
    });

    const sortedYears = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    let optgroups = '';
    sortedYears.forEach(yr => {
      optgroups += `<optgroup label="Year ${yr}">`;
      groups[yr].forEach(m => {
        const isCurrent = (m === current);
        optgroups += `<option value="${m}" ${isCurrent ? 'selected' : ''}>${m}${isCurrent ? ' (Active)' : ''}</option>`;
      });
      optgroups += `</optgroup>`;
    });

    return `
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Current Month Active Pill -->
        <button type="button" onclick="${onselectJsMethodName}('${current}')" 
                class="px-3.5 py-1.5 rounded-xl text-xs font-mono font-black bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-200/50 border border-red-500 flex items-center gap-1.5 whitespace-nowrap">
          <span>📅</span> <span>${current}</span>
          <span class="px-1.5 py-0.2 rounded text-[9px] bg-white/20 text-white uppercase tracking-wider font-bold">Active</span>
        </button>

        <!-- Months Dropdown (Jan 2026 to Running Month) -->
        <div class="relative inline-flex items-center">
          <select onchange="if(this.value) { ${onselectJsMethodName}(this.value); }" 
                  title="Select month (Jan 2026 to running month)"
                  class="bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-700 shadow-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition cursor-pointer">
            <option value="" disabled>📂 Select Month ▼</option>
            ${optgroups}
          </select>
        </div>

        ${onAddMonthJsMethodName ? `
        <!-- Add Month Button -->
        <button type="button" onclick="${onAddMonthJsMethodName}()" title="Add a new historical or future month" 
                class="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition flex items-center gap-1 whitespace-nowrap">
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
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HELPERS;
} else if (typeof window !== 'undefined') {
  window.HELPERS = HELPERS;
}
