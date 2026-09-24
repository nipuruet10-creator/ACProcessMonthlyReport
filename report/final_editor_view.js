/**
 * Process Development Monthly Report Automation System
 * Module: Final Report Editor View
 * Implements Manual Final Edit workflow without destroying source input data
 * Meets Specification in Section 19 of User Directive
 * WALTON Hi-Tech Industries PLC
 */

const FinalEditorView = {
  selectedMonth: "SEP-2026",

  renderContainer() {
    let container = document.getElementById('final-editor-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'final-editor-modal-container';
      document.body.appendChild(container);
    }
    return container;
  },

  /**
   * Opens the slide override editor for a specific task
   */
  openModal(taskId) {
    if (!taskId) return;

    const breakdown = window.appState && window.appState.breakdownSheet
      ? window.appState.breakdownSheet.getBreakdown(taskId)
      : null;
    const overrides = window.appState && window.appState.syncEngine
      ? window.appState.syncEngine.getManualOverride(taskId) || {}
      : {};

    const rawTaskName = breakdown ? breakdown.original_task_name : "Task " + taskId;
    const currentTitle = overrides.slide_title || (breakdown ? breakdown.ai_report_title : rawTaskName);
    const currentDesc = overrides.description || (breakdown ? breakdown.ai_description : "");
    const currentImpact = overrides.impact
      ? (Array.isArray(overrides.impact) ? overrides.impact.join("\n") : overrides.impact)
      : (breakdown && Array.isArray(breakdown.ai_impact) ? breakdown.ai_impact.join("\n") : "");
    const currentEngineer = overrides.engineer || (breakdown ? breakdown.engineer : "Concern Engineer");
    const currentInvestment = overrides.investment || "In-house / Direct Implementation";

    const container = this.renderContainer();
    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <div class="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  SLIDE OVERRIDE EDITOR
                </span>
                <span class="text-xs font-mono text-slate-400">ID: ${taskId}</span>
              </div>
              <h3 class="text-lg font-bold text-white mt-1">Edit Report Presentation Content</h3>
              <p class="text-xs text-slate-400">Edits modify only the presentation slide and preserve the source input data intact.</p>
            </div>
            <button onclick="FinalEditorView.closeModal()" class="p-1 text-slate-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <form onsubmit="FinalEditorView.saveOverrides(event, '${taskId}')" class="space-y-4 my-4 text-xs">
            <div>
              <label class="block font-semibold text-slate-300 mb-1">Slide Title</label>
              <input type="text" id="edit-slide-title" value="${HELPERS.escapeHtml(currentTitle)}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500 font-medium" required />
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1">Description (Summary Panel)</label>
              <textarea id="edit-slide-desc" rows="3" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500 leading-relaxed font-sans">${HELPERS.escapeHtml(currentDesc)}</textarea>
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1">Project Impact Points (One per line)</label>
              <textarea id="edit-slide-impact" rows="3" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500 font-sans">${HELPERS.escapeHtml(currentImpact)}</textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block font-semibold text-slate-300 mb-1">Concern Engineer Name</label>
                <input type="text" id="edit-slide-engineer" value="${HELPERS.escapeHtml(currentEngineer)}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label class="block font-semibold text-slate-300 mb-1">Investment / Budget Note</label>
                <input type="text" id="edit-slide-investment" value="${HELPERS.escapeHtml(currentInvestment)}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div class="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button type="button" onclick="FinalEditorView.resetOverrides('${taskId}')" class="px-4 py-2 rounded-xl border border-slate-700 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold">
                Reset to AI Defaults
              </button>
              <div class="flex items-center gap-3">
                <button type="button" onclick="FinalEditorView.closeModal()" class="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow-lg shadow-cyan-600/20">
                  Save Changes
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    `;
  },

  closeModal() {
    const container = document.getElementById('final-editor-modal-container');
    if (container) container.innerHTML = '';
  },

  saveOverrides(event, taskId) {
    event.preventDefault();
    const title = document.getElementById('edit-slide-title').value.trim();
    const desc = document.getElementById('edit-slide-desc').value.trim();
    const impactText = document.getElementById('edit-slide-impact').value.trim();
    const engineer = document.getElementById('edit-slide-engineer').value.trim();
    const investment = document.getElementById('edit-slide-investment').value.trim();

    const impact = impactText.split("\n").map(s => s.trim()).filter(s => s.length > 0);

    if (window.appState && window.appState.syncEngine) {
      window.appState.syncEngine.setManualOverride(taskId, {
        slide_title: title,
        description: desc,
        impact: impact,
        engineer: engineer,
        investment: investment
      });
    }

    this.closeModal();

    // Re-render active view
    if (window.App && window.App.currentTab === 'report-builder') {
      ReportBuilderView.render();
    } else if (window.App && window.App.currentTab === 'final-report') {
      FinalEditorView.render();
    }
  },

  resetOverrides(taskId) {
    if (confirm("Reset manual edits for this slide back to AI breakdown?")) {
      if (window.appState && window.appState.syncEngine) {
        delete window.appState.syncEngine.manualOverrides[taskId];
        window.appState.syncEngine.saveManualOverrides();
      }
      this.closeModal();
      if (window.App && window.App.currentTab === 'report-builder') {
        ReportBuilderView.render();
      }
    }
  },

  async handleMonthSelect(month) {
    this.selectedMonth = month;
    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.activeMonth = month;
    }
    await this.render();
  },

  autoFillCompletedFromMonth() {
    if (!window.appState || !window.appState.workbookMgr) return;
    const tasks = window.appState.workbookMgr.getTasksForMonth(this.selectedMonth)
      .filter(t => t.include_in_report !== "NO");
    
    for (let i = 0; i < 5; i++) {
      const input = document.getElementById(`top-completed-input-${i}`);
      if (input) {
        input.value = (tasks[i] && tasks[i].task_name) ? tasks[i].task_name : "";
      }
    }
    if (typeof window.showToast === 'function') {
      window.showToast("Filled completed works from active tasks!", "info");
    }
  },

  copyOngoingFromPreviousMonth() {
    if (typeof TopWorksManager === 'undefined') return;
    const prev = TopWorksManager.getPreviousMonth(this.selectedMonth);
    if (!prev) {
      alert("No previous month found before " + this.selectedMonth);
      return;
    }
    const prevOngoing = TopWorksManager.copyFromPreviousMonth(this.selectedMonth);
    if (!prevOngoing || prevOngoing.length === 0) {
      alert("No ongoing records found in " + prev);
      return;
    }

    prevOngoing.slice(0, 5).forEach((p, idx) => {
      const nameInp = document.getElementById(`top-ongoing-name-${idx}`);
      const progInp = document.getElementById(`top-ongoing-prog-${idx}`);
      const dlineInp = document.getElementById(`top-ongoing-dline-${idx}`);
      if (nameInp) nameInp.value = p.name || "";
      if (progInp) progInp.value = p.progress || "";
      if (dlineInp) dlineInp.value = p.deadline || "";
    });

    if (typeof window.showToast === 'function') {
      window.showToast(`🔁 Re-synced ongoing works from ${prev}!`, "success");
    }
  },

  saveTopWorks() {
    if (typeof TopWorksManager === 'undefined') return;

    const completed = [];
    for (let i = 0; i < 5; i++) {
      const inp = document.getElementById(`top-completed-input-${i}`);
      completed.push(inp ? inp.value.trim() : "");
    }

    const ongoing = [];
    for (let i = 0; i < 5; i++) {
      const nameInp = document.getElementById(`top-ongoing-name-${i}`);
      const progInp = document.getElementById(`top-ongoing-prog-${i}`);
      const dlineInp = document.getElementById(`top-ongoing-dline-${i}`);
      ongoing.push({
        sl: i + 1,
        name: nameInp ? nameInp.value.trim() : "",
        progress: progInp ? progInp.value.trim() : "",
        deadline: dlineInp ? dlineInp.value.trim() : ""
      });
    }

    TopWorksManager.saveTopWorksForMonth(this.selectedMonth, completed, ongoing);

    if (typeof window.showToast === 'function') {
      window.showToast(`💾 Top 5 Works & Projects saved for ${this.selectedMonth}!`, "success");
    } else {
      alert(`Top 5 Works saved for ${this.selectedMonth}!`);
    }

    this.render();
  },

  render(containerId = 'final-report-view-container') {
    const container = document.getElementById(containerId) || document.getElementById('final-report-container');
    if (!container) return;

    const month = this.selectedMonth;
    const workbookMgr = window.appState && window.appState.workbookMgr ? window.appState.workbookMgr : null;
    const months = workbookMgr ? workbookMgr.getAllMonths() : [
      "APR-2026", "MAY-2026", "JUN-2026", "JUL-2026", "AUG-2026", "SEP-2026", "OCT-2026", "NOV-2026"
    ];

    const activeSlides = window.appState && window.appState.syncEngine
      ? window.appState.syncEngine.getActiveSlides(month)
      : [];

    const topWorks = (typeof TopWorksManager !== 'undefined')
      ? TopWorksManager.getTopWorksForMonth(month)
      : { completedTop5: ["", "", "", "", ""], ongoingTop5: [], isCarriedOver: false };

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header Banner & Month Tabs -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div class="flex items-center gap-4">
              <img src="assets/img/walton_logo.png" alt="WALTON" class="h-12 w-auto object-contain flex-shrink-0 drop-shadow-sm">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-200">
                    TOP 5 SUMMARY HUB
                  </span>
                  <span class="text-xs text-slate-400 font-mono">${month}</span>
                </div>
                <h2 class="text-2xl font-black text-slate-800 mt-1">Top 5 Summary &amp; Slide Management</h2>
                <p class="text-xs text-slate-500 mt-0.5">
                  Input Top 5 Completed &amp; Ongoing works for the monthly summary slide, customize slide overrides, and export.
                </p>
              </div>
            </div>

            <!-- Export Buttons -->
            <div class="flex flex-wrap items-center gap-2.5">
              <button onclick="ReportBuilderView.previewFullDeck()" class="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1.5 shadow-sm">
                <span>👁️</span> <span>Preview Deck</span>
              </button>
              <button onclick="ExportController.exportPPTX('${month}')" title="100% Native Editable PPTX" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-black text-white shadow-md shadow-red-200/50 transition flex items-center gap-1">
                <span>📊</span> <span>PPTX</span>
              </button>
              <button onclick="ExportController.exportPDF('${month}')" class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1 shadow-sm">
                <span>🖨️</span> <span>PDF</span>
              </button>
              <button onclick="ExportController.exportHTML('${month}')" class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1 shadow-sm">
                <span>🌐</span> <span>HTML</span>
              </button>
            </div>
          </div>

          <!-- Month Selector UI (Current Month Pill + Previous Months Dropdown) -->
          <div class="pt-4">
            ${HELPERS.renderMonthSelectorUI(months, this.selectedMonth, 'FinalEditorView.handleMonthSelect')}
          </div>
        </div>

        <!-- DEDICATED INPUT SECTION: FINAL SUMMARY PAGE (TOP 5 WORKS & PROJECTS) - IMAGE 1 -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold border border-red-200 shadow-sm">
                🏆
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white">FINAL SLIDE DATA INPUT</span>
                  <span class="text-xs font-bold text-slate-700 font-mono">Top 5 Works &amp; Projects (${month})</span>
                </div>
                <h3 class="text-lg font-black text-slate-800 mt-0.5">Strategic Milestones &amp; Process Achievements Editor</h3>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="FinalEditorView.autoFillCompletedFromMonth()" class="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1 shadow-sm">
                <span>✨</span> <span>Auto-Fill Completed</span>
              </button>
              <button onclick="FinalEditorView.copyOngoingFromPreviousMonth()" class="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1 shadow-sm">
                <span>🔄</span> <span>Re-sync Ongoing</span>
              </button>
              <button onclick="FinalEditorView.saveTopWorks()" class="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-black text-white shadow-md shadow-red-200/50 transition flex items-center gap-1.5">
                <span>💾</span> <span>Save Top 5 Projects</span>
              </button>
            </div>
          </div>

          <!-- SECTION 1: Development Works Completed (Top Five) -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">⚙️</span>
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wide">1. Development Works Completed (Top Five)</h4>
              </div>
              <span class="text-[11px] text-slate-400 font-mono">Every month starts blank &bull; Enter the 5 headline completed works</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
              ${[0, 1, 2, 3, 4].map(idx => `
                <div class="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col justify-between focus-within:border-red-400 focus-within:bg-white transition">
                  <div class="flex items-center justify-between mb-2">
                    <span class="w-6 h-6 rounded-md bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                      ${idx + 1}
                    </span>
                    <span class="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Completed
                    </span>
                  </div>
                  <textarea id="top-completed-input-${idx}" rows="3"
                    placeholder="Enter completed work title ${idx + 1} (leave blank if none)..."
                    class="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-400 resize-none">${HELPERS.escapeHtml(topWorks.completedTop5[idx] || '')}</textarea>
                  <div class="text-[9px] font-mono text-slate-400 mt-1">Slot #${idx + 1}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- SECTION 2: On-going Works (Top Five) -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold">📋</span>
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wide">2. On-going Works (Top Five)</h4>
                ${topWorks.isCarriedOver ? `
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    🔁 Carried over from ${topWorks.sourceMonth}
                  </span>
                ` : `
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✔ Custom for ${month}
                  </span>
                `}
              </div>
              <span class="text-[11px] text-slate-400 font-mono">Auto-carried from previous month &bull; Fully editable</span>
            </div>

            <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table class="w-full text-xs border-collapse">
                <thead class="bg-slate-100 text-slate-700 font-mono uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th class="py-2.5 px-3 w-12 text-center">Sl</th>
                    <th class="py-2.5 px-3 w-2/5">Project Name</th>
                    <th class="py-2.5 px-3 w-2/5">Current Progress / Status</th>
                    <th class="py-2.5 px-3 w-1/5 text-center">Tentative Deadline</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  ${[0, 1, 2, 3, 4].map(idx => {
                    const row = topWorks.ongoingTop5[idx] || { sl: idx + 1, name: "", progress: "", deadline: "" };
                    return `
                      <tr class="hover:bg-red-50/20 transition">
                        <td class="py-2.5 px-3 text-center font-mono font-bold text-red-600">
                          ${idx + 1}
                        </td>
                        <td class="py-2 px-2">
                          <input type="text" id="top-ongoing-name-${idx}" value="${HELPERS.escapeHtml(row.name || '')}"
                            placeholder="e.g. CNC Tube Bending Automation..."
                            class="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-400" />
                        </td>
                        <td class="py-2 px-2">
                          <input type="text" id="top-ongoing-prog-${idx}" value="${HELPERS.escapeHtml(row.progress || '')}"
                            placeholder="e.g. Trial run and modification ongoing..."
                            class="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-red-400" />
                        </td>
                        <td class="py-2 px-2 text-center">
                          <input type="text" id="top-ongoing-dline-${idx}" value="${HELPERS.escapeHtml(row.deadline || '')}"
                            placeholder="e.g. Oct, 2026"
                            class="w-full text-center bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-red-400" />
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Bottom Save Notice -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs text-slate-400 font-mono">
              💡 Changes saved here will instantly reflect in the final summary slide across PPTX, HTML, and PDF exports.
            </span>
            <button onclick="FinalEditorView.saveTopWorks()" class="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-black text-white shadow-md shadow-red-200/50 transition flex items-center gap-1.5 cursor-pointer">
              <span>💾</span> <span>Save Top 5 Projects</span>
            </button>
          </div>
        </div>

      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FinalEditorView;
} else if (typeof window !== 'undefined') {
  window.FinalEditorView = FinalEditorView;
}
