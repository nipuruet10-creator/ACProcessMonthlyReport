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
   * Renders a unified Month Selector UI:
   * Running Month (SEP-2026) always in focus + Strictly 1 Month Archive (AUG-2026)
   * Both options are always visible and clickable so selecting Archive never hides Running Month
   */
  renderMonthSelectorUI(months, selectedMonth, onselectJsMethodName, onAddMonthJsMethodName = null) {
    const runningMonth = "SEP-2026";
    const archiveMonth = "AUG-2026";
    const current = selectedMonth || runningMonth;

    const isRunningActive = (current === runningMonth);
    const isArchiveActive = (current === archiveMonth);

    return `
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Running Month (Always Primary & In Focus) -->
        <button type="button" onclick="${onselectJsMethodName}('${runningMonth}')" 
                title="Active Running Month: ${runningMonth}"
                class="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${isRunningActive ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-sm shadow-blue-500/20 border border-blue-600' : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-300 shadow-xs'}">
          <span>🟢</span> <span>Running Month: <strong>${runningMonth}</strong></span>
          ${isRunningActive ? '<span class="px-1.5 py-0.2 rounded text-[9px] bg-white/20 uppercase tracking-wider font-bold">Active</span>' : ''}
        </button>

        <!-- Archive Month (Strictly 1 Month: AUG-2026) -->
        <button type="button" onclick="${onselectJsMethodName}('${archiveMonth}')" 
                title="Historical Archive Month: ${archiveMonth}"
                class="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${isArchiveActive ? 'bg-amber-500 text-white shadow-sm border border-amber-600' : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-300 shadow-xs'}">
          <span>📦</span> <span>Archive: <strong>${archiveMonth}</strong></span>
          ${isArchiveActive ? '<span class="px-1.5 py-0.2 rounded text-[9px] bg-black/20 uppercase tracking-wider font-bold">Historical</span>' : ''}
        </button>

        ${onAddMonthJsMethodName ? `
        <!-- Optional Add Month Quick Action -->
        <button type="button" onclick="${onAddMonthJsMethodName}()" title="Add a new month" 
                class="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition flex items-center gap-1 whitespace-nowrap cursor-pointer">
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
