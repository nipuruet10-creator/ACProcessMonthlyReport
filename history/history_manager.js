/**
 * Process Development Monthly Report Automation System
 * Module: Report History & Versioning Manager
 * WALTON Hi-Tech Industries PLC
 */

class HistoryManager {
  constructor(storageKey = APP_CONFIG.STORAGE_KEYS.HISTORY) {
    this.storageKey = storageKey;
  }

  /**
   * Get all report history records
   */
  getAll() {
    return HELPERS.storage.get(this.storageKey, []);
  }

  /**
   * Get history for specific month
   */
  getByMonth(month) {
    const all = this.getAll();
    return all.filter(r => r.month === month);
  }

  /**
   * Generates next version string for a month (e.g. 2026-08-v01, 2026-08-v02)
   */
  getNextVersion(month, isFinal = false) {
    const existing = this.getByMonth(month);
    if (isFinal) return `${month}-final`;
    const nextNum = existing.length + 1;
    return `${month}-v${String(nextNum).padStart(2, '0')}`;
  }

  /**
   * Logs a new generated report record
   */
  recordReport(data) {
    const all = this.getAll();
    const version = data.version || this.getNextVersion(data.month);

    const record = {
      report_id: `RPT-${data.month.replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      month: data.month,
      generated_at: new Date().toISOString(),
      generated_by: data.generated_by || "Report Owner",
      version: version,
      task_count: data.task_count || 0,
      engineer_count: data.engineer_count || 0,
      pptx_url: data.pptx_url || `Monthly_Report_${data.month.replace(/\s+/g, '_')}.pptx`,
      pdf_url: data.pdf_url || `Monthly_Report_${data.month.replace(/\s+/g, '_')}.pdf`,
      html_url: data.html_url || `Monthly_Report_${data.month.replace(/\s+/g, '_')}.html`,
      status: data.status || "Generated"
    };

    all.unshift(record);
    HELPERS.storage.set(this.storageKey, all);
    return record;
  }
}

const historyManager = new HistoryManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HistoryManager, historyManager };
} else if (typeof window !== 'undefined') {
  window.HistoryManager = HistoryManager;
  window.historyManager = historyManager;
}
