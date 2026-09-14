/**
 * Process Development Monthly Report Automation System
 * Module: Top Works Manager (Final Summary Page Dataset)
 * Manages Top 5 Completed and Top 5 Ongoing Engineering Projects per Month
 * Logic:
 * - Top 5 Completed starts blank for every month
 * - Top 5 Ongoing automatically carries over from the previous month and can be edited
 * WALTON Hi-Tech Industries PLC
 */

const TopWorksManager = {
  storageKey: "walton_top_works_data",

  MONTH_ORDER: [
    "APR-2026", "MAY-2026", "JUN-2026", "JUL-2026", "AUG-2026", "SEP-2026",
    "OCT-2026", "NOV-2026", "DEC-2026", "JAN-2027", "FEB-2027", "MAR-2027"
  ],

  // Initial reference baseline from Image 1
  DEFAULT_ONGOING: [
    { sl: 1, name: "CNC Tube Bending & End Shaping M/C Automation Development", progress: "Trail run and modification ongoing", deadline: "Oct, 2026" },
    { sl: 2, name: "CNC Turret Punch Machine Project", progress: "Machine manufacturing almost done; PSI preparation ongoing", deadline: "Oct, 2026" },
    { sl: 3, name: "Evaporator Brazing Fixture for without water brazing", progress: "One model running under observation and working for rest model", deadline: "Sep, 2026" },
    { sl: 4, name: "MPE Tube rust repair process development", progress: "Mass production trial ongoing", deadline: "Oct, 2026" },
    { sl: 5, name: "New fin material (Aluzinc Sheet) supplier (MAX) development for Evaporator and condenser", progress: "All test completed, Trial production lot order is ongoing", deadline: "Dec, 2026" }
  ],

  _loadStore() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn("Could not load top works data:", e);
      return {};
    }
  },

  _saveStore(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error("Could not save top works data:", e);
    }
  },

  getPreviousMonth(month) {
    if (!month) return null;
    const m = month.toUpperCase();
    const idx = this.MONTH_ORDER.indexOf(m);
    if (idx > 0) {
      return this.MONTH_ORDER[idx - 1];
    }
    return null;
  },

  /**
   * Retrieves Top 5 Works for a given month
   * - Completed works are blank ["", "", "", "", ""] if not entered
   * - Ongoing works auto-carryover from previous month if not entered
   */
  getTopWorksForMonth(month = "SEP-2026") {
    const m = month.toUpperCase();
    const store = this._loadStore();

    if (store[m]) {
      return {
        completedTop5: Array.isArray(store[m].completedTop5) ? store[m].completedTop5 : ["", "", "", "", ""],
        ongoingTop5: Array.isArray(store[m].ongoingTop5) ? store[m].ongoingTop5 : this._cloneOngoing(this.DEFAULT_ONGOING),
        isCarriedOver: false,
        sourceMonth: m
      };
    }

    // New month: Completed is blank
    const completedTop5 = ["", "", "", "", ""];

    // Auto-carryover ongoing works from previous month
    let ongoingTop5 = null;
    let sourceMonth = null;
    const prev = this.getPreviousMonth(m);
    if (prev && store[prev] && Array.isArray(store[prev].ongoingTop5)) {
      ongoingTop5 = this._cloneOngoing(store[prev].ongoingTop5);
      sourceMonth = prev;
    } else {
      // Check any earlier months in descending order
      const mIdx = this.MONTH_ORDER.indexOf(m);
      if (mIdx !== -1) {
        for (let i = mIdx - 1; i >= 0; i--) {
          const earlier = this.MONTH_ORDER[i];
          if (store[earlier] && Array.isArray(store[earlier].ongoingTop5)) {
            ongoingTop5 = this._cloneOngoing(store[earlier].ongoingTop5);
            sourceMonth = earlier;
            break;
          }
        }
      }
    }

    if (!ongoingTop5) {
      ongoingTop5 = this._cloneOngoing(this.DEFAULT_ONGOING);
      sourceMonth = "Baseline";
    }

    return {
      completedTop5,
      ongoingTop5,
      isCarriedOver: true,
      sourceMonth: sourceMonth
    };
  },

  saveTopWorks(month, completedOrData, ongoingTop5) {
    if (completedOrData && typeof completedOrData === 'object' && !Array.isArray(completedOrData)) {
      return this.saveTopWorksForMonth(month, completedOrData.completedTop5, completedOrData.ongoingTop5);
    }
    return this.saveTopWorksForMonth(month, completedOrData, ongoingTop5);
  },

  /**
   * Saves completed and ongoing works for a specific month
   */
  saveTopWorksForMonth(month, completedTop5, ongoingTop5) {
    const m = month.toUpperCase();
    const store = this._loadStore();

    // Ensure array of 5 completed strings
    const cleanCompleted = (Array.isArray(completedTop5) ? completedTop5 : []).slice(0, 5);
    while (cleanCompleted.length < 5) cleanCompleted.push("");

    // Ensure array of 5 ongoing objects
    const cleanOngoing = (Array.isArray(ongoingTop5) ? ongoingTop5 : []).slice(0, 5).map((p, idx) => ({
      sl: idx + 1,
      name: (p.name || "").trim(),
      progress: (p.progress || "").trim(),
      deadline: (p.deadline || "").trim()
    }));
    while (cleanOngoing.length < 5) {
      cleanOngoing.push({ sl: cleanOngoing.length + 1, name: "", progress: "", deadline: "" });
    }

    store[m] = {
      completedTop5: cleanCompleted,
      ongoingTop5: cleanOngoing,
      updated_at: new Date().toISOString()
    };

    this._saveStore(store);
    return store[m];
  },

  /**
   * Copies ongoing works from previous month explicitly
   */
  copyFromPreviousMonth(targetMonth) {
    const prev = this.getPreviousMonth(targetMonth);
    if (!prev) return null;
    const store = this._loadStore();
    const prevData = store[prev] ? store[prev].ongoingTop5 : this.DEFAULT_ONGOING;
    return this._cloneOngoing(prevData);
  },

  _cloneOngoing(list) {
    return (list || []).map((item, idx) => ({
      sl: idx + 1,
      name: item.name || "",
      progress: item.progress || "",
      deadline: item.deadline || ""
    }));
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TopWorksManager;
} else if (typeof window !== 'undefined') {
  window.TopWorksManager = TopWorksManager;
}
