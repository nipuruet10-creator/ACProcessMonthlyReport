/**
 * Process Development Monthly Report Automation System
 * Module: AI Breakdown View
 * Displays the automatically derived AI BREAKDOWN dataset
 * Meets Specification in Section 5 of User Directive
 * WALTON Hi-Tech Industries PLC
 */

const AIBreakdownView = {
  selectedMonth: "SEP-2026",

  async handleMonthChange(m) {
    this.selectedMonth = m;
    await this.render();
  },

  async regenerateRow(taskId) {
    if (typeof ReportBuilderView !== 'undefined') {
      await ReportBuilderView.regenerateTaskAI(taskId);
      await this.render();
    }
  },

  async render(containerId = 'ai-breakdown-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const breakdownSheet = window.appState && window.appState.breakdownSheet
      ? window.appState.breakdownSheet
      : new AIBreakdownSheet();

    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : new MonthWorkbookManager();

    const month = this.selectedMonth;
    const records = breakdownSheet.getAllForMonth(month);
    const months = workbookMgr.getAllMonths();

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header Banner -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  DERIVED AI DATASET
                </span>
                <span class="text-xs text-slate-400 font-mono">GEMINI 3.8 FLASH WITH ZERO-FABRICATION</span>
              </div>
              <h2 class="text-2xl font-black text-white mt-1">AI Breakdown Sheet: ${month}</h2>
              <p class="text-xs text-slate-400 mt-0.5">Automated technical synthesis derived from the primary monthly input sheet.</p>
            </div>

            <div class="flex items-center gap-3">
              <select onchange="AIBreakdownView.handleMonthChange(this.value)" class="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono font-bold">
                ${months.map(m => `<option value="${m}" ${this.selectedMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- AI Breakdown Table -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th class="py-3 px-3 w-28">Task ID</th>
                  <th class="py-3 px-3 w-32">Engineer</th>
                  <th class="py-3 px-3">Original Task Name</th>
                  <th class="py-3 px-3">AI Report Title</th>
                  <th class="py-3 px-3">AI Description</th>
                  <th class="py-3 px-3 w-28">Status</th>
                  <th class="py-3 px-3 w-24">Hash</th>
                  <th class="py-3 px-3 w-20 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-slate-300">
                ${records.length === 0 ? `
                  <tr>
                    <td colspan="8" class="py-12 text-center text-slate-500">
                      No AI breakdown data found for ${month}. Click "⚡ SYNC INPUT DATA" to derive content.
                    </td>
                  </tr>
                ` : records.map(r => `
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-3 px-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                      ${r.task_id}
                    </td>
                    <td class="py-3 px-3 font-semibold text-white whitespace-nowrap">
                      ${r.engineer}
                    </td>
                    <td class="py-3 px-3 max-w-xs truncate" title="${HELPERS.escapeHtml(r.original_task_name)}">
                      ${HELPERS.escapeHtml(r.original_task_name)}
                    </td>
                    <td class="py-3 px-3 max-w-xs truncate text-indigo-300 font-medium" title="${HELPERS.escapeHtml(r.ai_report_title)}">
                      ${HELPERS.escapeHtml(r.ai_report_title)}
                    </td>
                    <td class="py-3 px-3 max-w-xs truncate text-slate-400" title="${HELPERS.escapeHtml(r.ai_description)}">
                      ${HELPERS.escapeHtml(r.ai_description)}
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.slide_status === 'READY'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }">
                        ${r.slide_status}
                      </span>
                    </td>
                    <td class="py-3 px-3 font-mono text-[10px] text-slate-500">
                      ${r.source_hash || 'N/A'}
                    </td>
                    <td class="py-3 px-3 text-right whitespace-nowrap">
                      <button onclick="AIBreakdownView.regenerateRow('${r.task_id}')" title="Regenerate AI Content" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400">
                        ✨
                      </button>
                    </td>
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
  module.exports = AIBreakdownView;
} else if (typeof window !== 'undefined') {
  window.AIBreakdownView = AIBreakdownView;
}
