/**
 * Process Development Monthly Report Automation System
 * Module: Cost Saving Tracker (Per-Month Dynamic Storage & Manager)
 * Stores and calculates monthly financial savings for FY 26-27 without fabrication
 * Logic:
 * - Each month has its own cost savings input
 * - If earlier month has no data, value is 0 (no fabrication)
 * - Monthly financial impact and cumulative yearly impact update dynamically
 * WALTON Hi-Tech Industries PLC
 */

const CostSavingTracker = {
  storageKey: "walton_monthly_cost_savings_v2",
  legacyStorageKey: "walton_monthly_cost_savings",
  modalActiveYear: 2026,

  MONTH_NAMES: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ],

  MONTH_CODES: [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ],

  FY_MONTHS: [
    { code: "APR-2026", name: "April" },
    { code: "MAY-2026", name: "May" },
    { code: "JUN-2026", name: "June" },
    { code: "JUL-2026", name: "July" },
    { code: "AUG-2026", name: "August" },
    { code: "SEP-2026", name: "September" },
    { code: "OCT-2026", name: "October" },
    { code: "NOV-2026", name: "November" },
    { code: "DEC-2026", name: "December" },
    { code: "JAN-2027", name: "January" },
    { code: "FEB-2027", name: "February" },
    { code: "MAR-2027", name: "March" }
  ],

  _loadSavings() {
    try {
      const savedV2 = localStorage.getItem(this.storageKey);
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (parsed && typeof parsed === 'object') {
          // Check for and purge the dummy seed values (April=150000 & May=250000 dummy preset)
          this._purgeLegacyDummy(parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not load cost savings:", e);
    }
    return {};
  },

  _purgeLegacyDummy(savings) {
    if (!savings) return;
    // Purge the pre-defined dummy 150,000 (April) and 250,000 (May) seed data
    if ((savings["April"] === 150000 || savings["APR-2026"] === 150000) &&
        (savings["May"] === 250000 || savings["MAY-2026"] === 250000)) {
      delete savings["April"];
      delete savings["APR-2026"];
      delete savings["May"];
      delete savings["MAY-2026"];
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(savings));
      } catch (e) {}
    }
  },

  _saveSavings(savings) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(savings));
    } catch (e) {
      console.error("Could not save cost savings:", e);
    }
  },

  normalizeMonthName(month) {
    if (!month) return "September";
    const mStr = String(month).trim().toUpperCase();

    // Check ISO format YYYY-MM or MM (e.g. "2026-02", "2026-2", "02")
    const isoMatch = mStr.match(/(?:^|\D)(\d{4})-(\d{1,2})(?:\D|$)/);
    if (isoMatch) {
      const mIdx = parseInt(isoMatch[2], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) return this.MONTH_NAMES[mIdx];
    }
    const numOnlyMatch = mStr.match(/^0?([1-9]|1[0-2])$/);
    if (numOnlyMatch) {
      const mIdx = parseInt(numOnlyMatch[1], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) return this.MONTH_NAMES[mIdx];
    }

    if (mStr.includes("JAN")) return "January";
    if (mStr.includes("FEB")) return "February";
    if (mStr.includes("MAR")) return "March";
    if (mStr.includes("APR")) return "April";
    if (mStr.includes("MAY")) return "May";
    if (mStr.includes("JUN")) return "June";
    if (mStr.includes("JUL")) return "July";
    if (mStr.includes("AUG")) return "August";
    if (mStr.includes("SEP")) return "September";
    if (mStr.includes("OCT")) return "October";
    if (mStr.includes("NOV")) return "November";
    if (mStr.includes("DEC")) return "December";
    return month;
  },

  extractYear(month) {
    if (!month) return 2026;
    const mStr = String(month).trim();
    const isoMatch = mStr.match(/(\d{4})-\d{1,2}/);
    if (isoMatch) return parseInt(isoMatch[1], 10);
    const match = mStr.match(/\b(202\d)\b/);
    return match ? parseInt(match[1], 10) : 2026;
  },

  toKey(monthStr) {
    const norm = String(monthStr).trim();
    if (norm.includes("-")) return norm.toUpperCase();
    return this.normalizeMonthName(norm);
  },

  getMonthSaving(month, defaultYear = 2026) {
    const savings = this._loadSavings();
    if (!savings) return 0;

    // Direct key match
    if (savings[month] !== undefined && savings[month] !== "") {
      return parseFloat(savings[month]) || 0;
    }

    const name = this.normalizeMonthName(month);
    const mIdx = this.MONTH_NAMES.indexOf(name);
    const mCode = mIdx >= 0 ? this.MONTH_CODES[mIdx] : null;

    const yr = this.extractYear(month) || defaultYear;

    if (mCode) {
      const exactCodeKey = `${mCode}-${yr}`;
      if (savings[exactCodeKey] !== undefined && savings[exactCodeKey] !== "") {
        return parseFloat(savings[exactCodeKey]) || 0;
      }
      const exactNameKey = `${name} ${yr}`;
      if (savings[exactNameKey] !== undefined && savings[exactNameKey] !== "") {
        return parseFloat(savings[exactNameKey]) || 0;
      }
      const isoKey = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
      if (savings[isoKey] !== undefined && savings[isoKey] !== "") {
        return parseFloat(savings[isoKey]) || 0;
      }
    }

    // Fallback to un-scoped key (e.g. "April") IF yr is 2026
    if (yr === 2026) {
      const key = this.toKey(month);
      if (savings[key] !== undefined && savings[key] !== "") return parseFloat(savings[key]) || 0;
      if (savings[name] !== undefined && savings[name] !== "") return parseFloat(savings[name]) || 0;
    }

    return 0;
  },

  setMonthSaving(month, amount, defaultYear = 2026) {
    const savings = this._loadSavings();
    const name = this.normalizeMonthName(month);
    const mIdx = this.MONTH_NAMES.indexOf(name);
    const mCode = mIdx >= 0 ? this.MONTH_CODES[mIdx] : "SEP";
    const yr = this.extractYear(month) || defaultYear;
    const codeKey = `${mCode}-${yr}`;
    const isoKey = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;

    if (amount === "" || amount === null || amount === undefined || isNaN(parseFloat(amount))) {
      delete savings[codeKey];
      delete savings[`${name} ${yr}`];
      delete savings[isoKey];
      if (yr === 2026) {
        delete savings[name];
        delete savings[this.toKey(month)];
      }
    } else {
      const val = Math.max(0, parseFloat(amount));
      savings[codeKey] = val;
      savings[`${name} ${yr}`] = val;
      savings[isoKey] = val;
      if (yr === 2026) {
        savings[name] = val;
      }
    }
    this._saveSavings(savings);
    return this.getMonthSaving(month, defaultYear);
  },

  setMonthlySaving(month, amount) {
    return this.setMonthSaving(month, amount);
  },

  deleteMonthSaving(month, defaultYear = 2026) {
    return this.setMonthSaving(month, null, defaultYear);
  },

  getAllSavings() {
    return this._loadSavings();
  },

  /**
   * Calculates monthly and cumulative YTD savings for target month
   */
  calculate(tasks = [], targetMonth = "SEP-2026") {
    const targetName = this.normalizeMonthName(targetMonth);
    const targetYear = this.extractYear(targetMonth);
    const savings = this._loadSavings();

    let cumulativeYTD = 0;
    const monthlyTrend = [];

    if (targetYear === 2025 || targetYear === 2027) {
      // Calendar Year calculation (Jan to target month in targetYear)
      for (let i = 0; i < 12; i++) {
        const mName = this.MONTH_NAMES[i];
        const mCode = `${this.MONTH_CODES[i]}-${targetYear}`;
        const amt = this.getMonthSaving(mCode, targetYear);
        cumulativeYTD += amt;
        monthlyTrend.push({
          month: mName,
          code: mCode,
          amount: amt,
          display: `৳ ${amt.toLocaleString()}`
        });
        if (mName.toLowerCase() === targetName.toLowerCase()) {
          break;
        }
      }
    } else {
      // For 2026: Check if user has entered data in Jan-March
      const hasJanToMarData = [0, 1, 2].some(i => {
        const c = `${this.MONTH_CODES[i]}-2026`;
        return (parseFloat(savings[c]) || 0) > 0;
      });

      if (hasJanToMarData) {
        // Full calendar progression (Jan to target month)
        for (let i = 0; i < 12; i++) {
          const mName = this.MONTH_NAMES[i];
          const mCode = `${this.MONTH_CODES[i]}-2026`;
          const amt = this.getMonthSaving(mCode, 2026);
          cumulativeYTD += amt;
          monthlyTrend.push({
            month: mName,
            code: mCode,
            amount: amt,
            display: `৳ ${amt.toLocaleString()}`
          });
          if (mName.toLowerCase() === targetName.toLowerCase()) {
            break;
          }
        }
      } else {
        // Standard Walton FY calculation (April to target month)
        for (const item of this.FY_MONTHS) {
          const amt = parseFloat(savings[item.name]) || parseFloat(savings[item.code]) || 0;
          cumulativeYTD += amt;
          monthlyTrend.push({
            month: item.name,
            code: item.code,
            amount: amt,
            display: `৳ ${amt.toLocaleString()}`
          });
          if (item.name.toLowerCase() === targetName.toLowerCase()) {
            break;
          }
        }
      }
    }

    const currentMonthlySaving = this.getMonthSaving(targetMonth, targetYear);
    const tableData = monthlyTrend.map(t => ({
      m: t.month,
      val: t.amount > 0 ? `BDT ${t.amount.toLocaleString()}` : "BDT 0",
      amount: t.amount
    }));

    return {
      monthlySaving: currentMonthlySaving,
      currentCostBDT: currentMonthlySaving,
      displayMonthlySaving: `${currentMonthlySaving.toLocaleString()} TK`,
      currentImpact: `${currentMonthlySaving.toLocaleString()} TK`,
      cumulativeYTD: cumulativeYTD,
      yearlyCostBDT: cumulativeYTD,
      displayCumulativeYTD: `${cumulativeYTD.toLocaleString()} TK`,
      yearlyImpact: `${cumulativeYTD.toLocaleString()} TK`,
      monthlyTrend: monthlyTrend,
      monthlySavings: tableData,
      monthlySavingsTable: tableData
    };
  },

  /**
   * Interactive modal to input and manage Cost Savings starting from January 2025
   */
  openCostSavingsModal(targetMonth = "SEP-2026", selectedYear = null) {
    let container = document.getElementById('cost-savings-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cost-savings-modal-container';
      document.body.appendChild(container);
    }

    const initialYear = selectedYear || this.extractYear(targetMonth);
    this.modalActiveYear = initialYear;
    this.renderModalContent(container, targetMonth || "SEP-2026", initialYear);
  },

  renderModalContent(container, targetMonth = "SEP-2026", year = 2026) {
    const activeMonthParam = targetMonth || "SEP-2026";
    const currentMonthName = this.normalizeMonthName(activeMonthParam);
    const targetYear = this.extractYear(activeMonthParam);
    const stats = this.calculate([], activeMonthParam);
    const years = [2025, 2026, 2027];

    const monthsForYear = this.MONTH_NAMES.map((name, idx) => ({
      name,
      code: `${this.MONTH_CODES[idx]}-${year}`,
      val: this.getMonthSaving(`${this.MONTH_CODES[idx]}-${year}`, year)
    }));

    const yearTotal = monthsForYear.reduce((sum, m) => sum + (m.val || 0), 0);
    const h1Months = monthsForYear.slice(0, 6); // Jan - Jun
    const h2Months = monthsForYear.slice(6, 12); // Jul - Dec

    const renderMonthTable = (monthSlice, startIdx, halfLabel) => `
      <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
        <div class="bg-gradient-to-r from-slate-100 to-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
          <span class="text-[11px] font-bold font-mono text-slate-700 uppercase tracking-wider">${halfLabel} (${year})</span>
          <span class="text-[10px] text-slate-400 font-mono">6 Months</span>
        </div>
        <table class="w-full text-xs border-collapse">
          <thead class="bg-slate-50 text-slate-500 font-mono uppercase text-[9px] border-b border-slate-200">
            <tr>
              <th class="py-1.5 px-2.5 w-8 text-center">#</th>
              <th class="py-1.5 px-2.5 w-24">Month</th>
              <th class="py-1.5 px-2.5">Saving (BDT / TK)</th>
              <th class="py-1.5 px-2.5 text-right w-28">Formatted</th>
              <th class="py-1.5 px-2 w-10 text-center">Clr</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            ${monthSlice.map((item, idx) => {
              const actualIdx = startIdx + idx;
              const isCurrent = (item.name.toLowerCase() === currentMonthName.toLowerCase() && year === targetYear);
              return `
                <tr class="${isCurrent ? 'bg-red-50/50 font-semibold' : 'hover:bg-slate-50/80'} transition-colors">
                  <td class="py-2 px-2.5 text-center font-mono text-slate-400 text-[11px]">${actualIdx + 1}</td>
                  <td class="py-2 px-2.5 text-slate-800">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-[11px] text-slate-700">${item.name.substring(0, 3)}</span>
                      ${isCurrent ? '<span class="px-1 py-0.2 rounded bg-red-600 text-white text-[8px] font-mono font-bold">ACTIVE</span>' : ''}
                    </div>
                  </td>
                  <td class="py-2 px-2.5">
                    <input type="number" id="cost-input-${item.code}" value="${item.val || ''}" placeholder="0" min="0" step="500"
                      oninput="CostSavingTracker.handleCodeLiveRecalculate('${item.code}', ${year}, '${activeMonthParam}')"
                      class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition" />
                  </td>
                  <td class="py-2 px-2.5 text-right font-mono font-bold text-slate-700 text-[11px]" id="cost-format-${item.code}">
                    ৳ ${(item.val || 0).toLocaleString()}
                  </td>
                  <td class="py-2 px-2 text-center">
                    <button onclick="CostSavingTracker.clearInputRow('${item.code}', ${year}, '${activeMonthParam}')" title="Reset to 0" class="text-xs text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition">
                      🗑️
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-md">
        <div class="relative w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 sm:p-7 text-slate-800 flex flex-col max-h-[94vh] overflow-y-auto">
          
          <!-- Header -->
          <div class="flex items-start justify-between pb-3.5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                💰
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white shadow-sm">
                    COST SAVINGS TRACKER (ALL 12 MONTHS)
                  </span>
                  <span class="text-xs font-bold text-slate-700 font-mono">Year ${year}</span>
                </div>
                <h2 class="text-lg sm:text-xl font-black text-slate-800 mt-0.5">
                  Monthly Financial Impact &amp; Cost Savings Manager
                </h2>
                <p class="text-xs text-slate-400">
                  Enter savings for any month. All 12 months (Jan – Dec) are visible side-by-side. Data is isolated strictly by year.
                </p>
              </div>
            </div>

            <button onclick="CostSavingTracker.closeModal()" class="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition">
              ✕
            </button>
          </div>

          <!-- Year Selector Tabs -->
          <div class="flex items-center gap-2 my-2.5 pb-1 border-b border-slate-100">
            <span class="text-xs font-bold font-mono text-slate-500 uppercase mr-1">Select Year:</span>
            ${years.map(y => `
              <button onclick="CostSavingTracker.switchModalYear('${activeMonthParam}', ${y})" class="px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                y === year
                  ? 'bg-red-600 text-white shadow-md shadow-red-200/50'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }">
                📅 ${y}
              </button>
            `).join('')}
          </div>

          <!-- YTD & Year Live Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
            <div class="bg-blue-50/60 border border-blue-200 rounded-2xl p-3 flex flex-col justify-between">
              <span class="text-[11px] font-mono font-bold text-blue-700 uppercase">Year ${year} Total Savings</span>
              <div id="cost-modal-year-total" class="text-xl sm:text-2xl font-black text-blue-700 font-mono mt-0.5">
                ৳ ${yearTotal.toLocaleString()}
              </div>
            </div>
            <div class="bg-red-50/60 border border-red-200 rounded-2xl p-3 flex flex-col justify-between">
              <span class="text-[11px] font-mono font-bold text-red-700 uppercase">Current Month (${currentMonthName} ${targetYear})</span>
              <div id="cost-modal-current-display" class="text-xl sm:text-2xl font-black text-red-600 font-mono mt-0.5">
                ${stats.displayMonthlySaving}
              </div>
            </div>
            <div class="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3 flex flex-col justify-between">
              <span class="text-[11px] font-mono font-bold text-emerald-700 uppercase">Cumulative (${currentMonthName} Scope)</span>
              <div id="cost-modal-ytd-display" class="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-0.5">
                ${stats.displayCumulativeYTD}
              </div>
            </div>
          </div>

          <!-- 12-Month Side-by-Side 2-Column Grid (All 12 months at once) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 my-2">
            ${renderMonthTable(h1Months, 0, "H1: January – June")}
            ${renderMonthTable(h2Months, 6, "H2: July – December")}
          </div>

          <!-- Actions -->
          <div class="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <button onclick="CostSavingTracker.closeModal()" class="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Close
            </button>
            <button onclick="CostSavingTracker.saveYearModalChanges('${activeMonthParam}', ${year})" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-black text-white shadow-lg shadow-red-200/50 transition flex items-center gap-2">
              <span>💾</span> <span>Save Year ${year} Savings</span>
            </button>
          </div>

        </div>
      </div>
    `;
  },

  switchModalYear(targetMonth = "SEP-2026", year = 2026) {
    let container = document.getElementById('cost-savings-modal-container');
    if (container) {
      this.modalActiveYear = year;
      this.renderModalContent(container, targetMonth, year);
    }
  },

  clearInputRow(code, year, targetMonth = "SEP-2026") {
    const inp = document.getElementById(`cost-input-${code}`);
    if (inp) {
      inp.value = '';
      this.handleCodeLiveRecalculate(code, year, targetMonth);
    }
  },

  handleCodeLiveRecalculate(code, year, targetMonth = "SEP-2026") {
    const inp = document.getElementById(`cost-input-${code}`);
    const val = inp ? (parseFloat(inp.value) || 0) : 0;
    const fmtCell = document.getElementById(`cost-format-${code}`);
    if (fmtCell) fmtCell.textContent = `৳ ${val.toLocaleString()}`;

    // Recalculate year total live across all 12 months of this year
    let yrSum = 0;
    const currentMonthName = this.normalizeMonthName(targetMonth);
    let currentVal = 0;
    let cumYtd = 0;
    let passedCurrent = false;

    this.MONTH_CODES.forEach((c, idx) => {
      const mName = this.MONTH_NAMES[idx];
      const i = document.getElementById(`cost-input-${c}-${year}`);
      const rowVal = i ? (parseFloat(i.value) || 0) : 0;
      yrSum += rowVal;
      if (!passedCurrent) {
        cumYtd += rowVal;
      }
      if (mName.toLowerCase() === currentMonthName.toLowerCase()) {
        currentVal = rowVal;
        passedCurrent = true;
      }
    });

    const yrTotalEl = document.getElementById('cost-modal-year-total');
    if (yrTotalEl) yrTotalEl.textContent = `৳ ${yrSum.toLocaleString()}`;

    const curDisplayEl = document.getElementById('cost-modal-current-display');
    if (curDisplayEl) curDisplayEl.textContent = `${currentVal.toLocaleString()} TK`;

    const ytdDisplayEl = document.getElementById('cost-modal-ytd-display');
    if (ytdDisplayEl) ytdDisplayEl.textContent = `${cumYtd.toLocaleString()} TK`;
  },

  saveYearModalChanges(targetMonth = "SEP-2026", year = 2026) {
    const savings = this._loadSavings();

    this.MONTH_CODES.forEach((c, idx) => {
      const code = `${c}-${year}`;
      const name = this.MONTH_NAMES[idx];
      const nameWithYear = `${name} ${year}`;
      const isoKey = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const inp = document.getElementById(`cost-input-${code}`);
      if (inp) {
        const valStr = inp.value.trim();
        if (valStr === "" || isNaN(parseFloat(valStr))) {
          delete savings[code];
          delete savings[nameWithYear];
          delete savings[isoKey];
          if (year === 2026) {
            delete savings[name];
            delete savings[this.toKey(name)];
          }
        } else {
          const val = Math.max(0, parseFloat(valStr));
          savings[code] = val;
          savings[nameWithYear] = val;
          savings[isoKey] = val;
          if (year === 2026) {
            savings[name] = val;
          }
        }
      }
    });

    this._saveSavings(savings);
    this.closeModal();

    if (typeof window.showToast === 'function') {
      window.showToast(`💰 Cost savings for ${year} updated successfully!`, "success");
    } else {
      alert(`Cost savings for ${year} updated successfully!`);
    }

    if (typeof DashboardController !== 'undefined' && DashboardController.render) {
      DashboardController.render();
    }
    if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
      MonthlyInputView.render();
    }
  },

  ensureProductionDefaults() {
    try {
      const existing = localStorage.getItem(this.storageKey);
      if (!existing) {
        const prod2026 = {
          "JAN-2026": 100000, "January 2026": 100000, "2026-01": 100000, "January": 100000,
          "FEB-2026": 250000, "February 2026": 250000, "2026-02": 250000, "February": 250000,
          "MAR-2026": 300000, "March 2026": 300000, "2026-03": 300000, "March": 300000,
          "APR-2026": 230000, "April 2026": 230000, "2026-04": 230000, "April": 230000,
          "MAY-2026": 350000, "May 2026": 350000, "2026-05": 350000, "May": 350000,
          "JUN-2026": 400000, "June 2026": 400000, "2026-06": 400000, "June": 400000,
          "JUL-2026": 50000,  "July 2026": 50000,  "2026-07": 50000,  "July": 50000,
          "AUG-2026": 450000, "August 2026": 450000, "2026-08": 450000, "August": 450000,
          "SEP-2026": 80000,  "September 2026": 80000, "2026-09": 80000, "September": 80000
        };
        localStorage.setItem(this.storageKey, JSON.stringify(prod2026));
      } else {
        // Also ensure ISO keys exist in case user saved earlier without ISO keys
        const parsed = JSON.parse(existing);
        let changed = false;
        this.MONTH_CODES.forEach((c, idx) => {
          const code = `${c}-2026`;
          const isoKey = `2026-${String(idx + 1).padStart(2, '0')}`;
          if (parsed[code] !== undefined && parsed[isoKey] === undefined) {
            parsed[isoKey] = parsed[code];
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(this.storageKey, JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  },

  closeModal() {
    const container = document.getElementById('cost-savings-modal-container');
    if (container) container.innerHTML = '';
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CostSavingTracker;
} else if (typeof window !== 'undefined') {
  window.CostSavingTracker = CostSavingTracker;
}
