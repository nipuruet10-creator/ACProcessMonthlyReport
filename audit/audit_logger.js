/**
 * Process Development Monthly Report Automation System
 * Module: Audit Logger
 * Tracks timestamp, user, action, task_id, field, old_value, new_value
 * WALTON Hi-Tech Industries PLC
 */

class AuditLogger {
  constructor(storageKey = APP_CONFIG.STORAGE_KEYS.AUDIT) {
    this.storageKey = storageKey;
  }

  log(user, action, taskId, field, oldValue, newValue) {
    try {
      const logs = HELPERS.storage.get(this.storageKey, []);
      const entry = {
        log_id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        user: user || "System",
        action: action,
        task_id: taskId || "-",
        field: field || "-",
        old_value: String(oldValue !== undefined && oldValue !== null ? oldValue : ""),
        new_value: String(newValue !== undefined && newValue !== null ? newValue : "")
      };
      logs.unshift(entry);
      if (logs.length > 500) logs.pop();
      HELPERS.storage.set(this.storageKey, logs);
      return entry;
    } catch (e) {
      console.warn("Audit logger write error:", e);
      return null;
    }
  }

  getLogs(limit = 100) {
    const logs = HELPERS.storage.get(this.storageKey, []);
    return logs.slice(0, limit);
  }

  clear() {
    HELPERS.storage.remove(this.storageKey);
  }
}

const auditLogger = new AuditLogger();

const AuditView = {
  render(containerId = 'audit-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const logs = auditLogger.getLogs(100);

    container.innerHTML = `
      <div class="space-y-6">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <h2 class="text-xl font-black text-white">System Audit Trail & Compliance Log</h2>
            <p class="text-xs text-slate-400 mt-0.5">Immutable record of data creation, edits, photos, AI calls, and exports</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            ${logs.length} Recent Events
          </span>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th class="py-3 px-4">Timestamp</th>
                  <th class="py-3 px-4">User</th>
                  <th class="py-3 px-4">Action</th>
                  <th class="py-3 px-4">Task ID</th>
                  <th class="py-3 px-4">Field</th>
                  <th class="py-3 px-4">Old Value</th>
                  <th class="py-3 px-4">New Value</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 font-mono text-[11px]">
                ${logs.length === 0 ? `
                  <tr><td colspan="7" class="py-12 text-center text-slate-500 font-sans">No audit events recorded yet.</td></tr>
                ` : logs.map(l => `
                  <tr class="hover:bg-slate-800/30">
                    <td class="py-3 px-4 text-slate-400 whitespace-nowrap">${l.timestamp.replace('T', ' ').slice(0, 19)}</td>
                    <td class="py-3 px-4 font-sans font-bold text-white">${l.user}</td>
                    <td class="py-3 px-4 whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-400 font-semibold border border-slate-700">
                        ${l.action}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-cyan-300">${l.task_id}</td>
                    <td class="py-3 px-4 text-slate-400">${l.field}</td>
                    <td class="py-3 px-4 text-slate-500 truncate max-w-xs">${HELPERS.escapeHTML(l.old_value)}</td>
                    <td class="py-3 px-4 text-emerald-400 truncate max-w-xs">${HELPERS.escapeHTML(l.new_value)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuditLogger, auditLogger, AuditView };
} else if (typeof window !== 'undefined') {
  window.AuditLogger = AuditLogger;
  window.auditLogger = auditLogger;
  window.AuditView = AuditView;
}
