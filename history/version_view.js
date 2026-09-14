/**
 * Process Development Monthly Report Automation System
 * Module: Report History View
 * WALTON Hi-Tech Industries PLC
 */

const VersionView = {
  render(containerId = 'history-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const records = historyManager.getAll();

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <h2 class="text-xl font-black text-white">Report Archives & Version History</h2>
            <p class="text-xs text-slate-400 mt-0.5">Historical monthly presentations, version audit logs, and download links</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            ${records.length} Archived Decks
          </span>
        </div>

        <!-- History Table -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th class="py-3 px-4">Report ID</th>
                  <th class="py-3 px-4">Month</th>
                  <th class="py-3 px-4">Version</th>
                  <th class="py-3 px-4 text-center">Tasks</th>
                  <th class="py-3 px-4 text-center">Engineers</th>
                  <th class="py-3 px-4">Generated At</th>
                  <th class="py-3 px-4">Author</th>
                  <th class="py-3 px-4 text-right">Downloads</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 font-mono">
                ${records.length === 0 ? `
                  <tr><td colspan="8" class="py-12 text-center text-slate-500 font-sans">No reports generated yet. Compile your first report in the Report Builder.</td></tr>
                ` : records.map(r => `
                  <tr class="hover:bg-slate-800/30">
                    <td class="py-3 px-4 font-bold text-cyan-400">${r.report_id}</td>
                    <td class="py-3 px-4 text-white">${r.month}</td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                        ${r.version}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-center text-white">${r.task_count}</td>
                    <td class="py-3 px-4 text-center text-white">${r.engineer_count}</td>
                    <td class="py-3 px-4 text-slate-400 text-[11px]">${r.generated_at ? r.generated_at.split('T')[0] : ''}</td>
                    <td class="py-3 px-4 text-slate-400 font-sans">${r.generated_by}</td>
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                      <div class="inline-flex items-center gap-2">
                        <span class="text-xs text-cyan-400 font-bold">PPTX</span>
                        <span class="text-slate-600">&bull;</span>
                        <span class="text-xs text-emerald-400 font-bold">PDF</span>
                        <span class="text-slate-600">&bull;</span>
                        <span class="text-xs text-indigo-400 font-bold">HTML</span>
                      </div>
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
  module.exports = VersionView;
} else if (typeof window !== 'undefined') {
  window.VersionView = VersionView;
}
