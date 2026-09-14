/**
 * Process Development Monthly Report Automation System
 * Module: Report Builder View
 * Implements 1 Row = 1 Slide Compilation Queue & Report Builder Screen
 * Meets Specification in Section 14 of User Directive
 * WALTON Hi-Tech Industries PLC
 */

const ReportBuilderView = {
  selectedMonth: "SEP-2026",

  async handleMonthChange(newMonth) {
    this.selectedMonth = newMonth;
    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.activeMonth = newMonth;
    }
    await this.render();
  },

  async triggerSync() {
    if (!window.appState || !window.appState.syncEngine) return;
    const btn = document.getElementById('sync-btn-builder');
    if (btn) btn.innerHTML = '⚡ Syncing...';
    try {
      const result = await window.appState.syncEngine.syncMonth(this.selectedMonth);
      alert(`Synchronization Complete for ${result.month}!\n• Total Tasks: ${result.total_tasks}\n• Added: ${result.added}\n• Updated: ${result.updated}\n• Excluded: ${result.excluded}\n• Active Slides: ${result.active_slides} (1 Row = 1 Slide)`);
    } catch (e) {
      alert("Sync failed: " + e.message);
    } finally {
      await this.render();
    }
  },

  async regenerateTaskAI(taskId) {
    if (!window.appState || !window.appState.syncEngine) return;
    const tasks = window.appState.workbookMgr.getTasksForMonth(this.selectedMonth);
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return;

    try {
      const aiOutput = await window.appState.geminiClient.transformTask(task, true);
      window.appState.breakdownSheet.upsertBreakdown({
        task_id: taskId,
        month: this.selectedMonth,
        engineer: task.engineer,
        original_task_name: task.task_name,
        ai_report_title: aiOutput.ai_report_title,
        ai_description: aiOutput.ai_description,
        ai_impact: aiOutput.ai_impact,
        ai_category: aiOutput.ai_category,
        ai_project_type: aiOutput.ai_project_type
      });
      await window.appState.syncEngine.syncMonth(this.selectedMonth);
      await this.render();
    } catch (e) {
      alert("AI Regeneration failed: " + e.message);
    }
  },

  async toggleTaskInclusion(taskId) {
    if (!window.appState || !window.appState.workbookMgr) return;
    window.appState.workbookMgr.toggleInclude(this.selectedMonth, taskId);
    await window.appState.syncEngine.syncMonth(this.selectedMonth);
    await this.render();
  },

  previewTaskSlide(taskId) {
    if (!window.appState || !window.appState.syncEngine) return;
    const slides = window.appState.syncEngine.getActiveSlides(this.selectedMonth);
    const target = slides.find(s => s.task_id === taskId);
    if (target) {
      SlidePreviewModal.open(slides, taskId);
    } else {
      alert("Slide is excluded or not yet synchronized. Toggle Include to YES and run Sync.");
    }
  },

  async previewFullDeck() {
    if (!window.appState || !window.appState.syncEngine) return;
    if (typeof ExportController !== 'undefined') {
      const { reportData, activeSlides } = await ExportController.buildReportPayload(this.selectedMonth);
      if (activeSlides.length === 0) {
        alert(`No active slides for ${this.selectedMonth}. Please sync tasks first.`);
        return;
      }
      SlidePreviewModal.openFullDeck(reportData);
    } else {
      const slides = window.appState.syncEngine.getActiveSlides(this.selectedMonth);
      if (slides.length === 0) {
        alert(`No active slides for ${this.selectedMonth}. Please sync tasks first.`);
        return;
      }
      SlidePreviewModal.open(slides);
    }
  },

  async exportPPTX() {
    if (typeof ExportController !== 'undefined') {
      await ExportController.exportPPTX(this.selectedMonth);
    }
  },

  async exportPDF() {
    if (typeof ExportController !== 'undefined') {
      await ExportController.exportPDF(this.selectedMonth);
    }
  },

  async exportHTML() {
    if (typeof ExportController !== 'undefined') {
      await ExportController.exportHTML(this.selectedMonth);
    }
  },

  async generateMonthlyReport() {
    if (typeof ExportController !== 'undefined') {
      await ExportController.openExportModal(this.selectedMonth);
    } else {
      alert(`Opening report export for ${this.selectedMonth}...`);
    }
  },

  async render(containerId = 'report-builder-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const month = this.selectedMonth;
    const workbookMgr = window.appState ? window.appState.workbookMgr : new MonthWorkbookManager();
    const breakdownSheet = window.appState ? window.appState.breakdownSheet : new AIBreakdownSheet();
    const syncEngine = window.appState ? window.appState.syncEngine : new SyncEngine(workbookMgr, breakdownSheet);

    const tasks = workbookMgr.getTasksForMonth(month);
    const activeSlides = syncEngine.getActiveSlides(month);

    const totalTasks = tasks.length;
    const includedTasks = tasks.filter(t => t.include_in_report !== "NO").length;
    const excludedTasks = totalTasks - includedTasks;

    const availableMonths = workbookMgr.getAllMonths();

    container.innerHTML = `
      <div class="space-y-5">
        
        <!-- Header Banner & Action Bar -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div class="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-red-50 text-red-600 border border-red-200">
                  WALTON EXECUTIVE REPORT BUILDER
                </span>
                <span class="text-xs text-slate-400 font-mono">16:9 EXECUTIVE MASTER</span>
              </div>
              <h2 class="text-2xl font-black text-slate-800 mt-1">Monthly Report Presentation: ${month}</h2>
              <p class="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Full 5-stage deck: Cover &bull; Table of Contents &bull; Executive Dashboard &bull; Middle Task Slides &bull; Top 5 Works Summary.
              </p>
            </div>

            <!-- Controls: Month Selector, Pattern Selector & Primary Actions -->
            <div class="flex flex-wrap items-center gap-2">
              <div>
                <select onchange="ReportBuilderView.handleMonthChange(this.value)" class="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 font-mono font-bold shadow-sm">
                  ${availableMonths.map(m => `<option value="${m}" ${this.selectedMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>

              <!-- Pattern Selector Dropdown -->
              <div>
                <select onchange="ExportController.handleSelectTemplate(this.value)" class="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 font-semibold shadow-sm">
                  <option value="walton_executive_crimson" ${ExportController.selectedTemplate === 'walton_executive_crimson' ? 'selected' : ''}>Pattern: Executive Crimson</option>
                  <option value="industrial_innovation_blue" ${ExportController.selectedTemplate === 'industrial_innovation_blue' ? 'selected' : ''}>Pattern: Industrial Blue</option>
                </select>
              </div>

              <button id="sync-btn-builder" onclick="ReportBuilderView.triggerSync()" class="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200 transition flex items-center gap-1.5 shadow-sm">
                ⚡ Sync
              </button>

              <button onclick="ReportBuilderView.previewFullDeck()" class="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-red-600 border border-slate-200 transition flex items-center gap-1.5 shadow-sm">
                👁️ Preview Deck
              </button>

              <!-- Discrete Format Exporters -->
              <button onclick="ReportBuilderView.exportPPTX()" title="100% Native Editable PPTX" class="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-black text-white shadow-lg shadow-red-200/50 transition flex items-center gap-1">
                <span>📊</span> <span>PPTX</span>
              </button>

              <button onclick="ReportBuilderView.exportPDF()" title="High-Res Vector PDF Print" class="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200 transition flex items-center gap-1 shadow-sm">
                <span>🖨</span> <span>PDF</span>
              </button>

              <button onclick="ReportBuilderView.exportHTML()" title="Standalone Interactive HTML" class="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200 transition flex items-center gap-1 shadow-sm">
                <span>🌐</span> <span>HTML</span>
              </button>

              <button onclick="ReportBuilderView.generateMonthlyReport()" title="Generate all formats & record history" class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-xs font-black text-white shadow-xl shadow-red-200/50 transition flex items-center gap-1.5">
                🚀 Generate All
              </button>
            </div>
          </div>

          <!-- Summary Metric Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span class="text-[10px] font-mono text-slate-400 uppercase">Input Tasks</span>
              <div class="text-xl font-black text-slate-800 mt-0.5">${totalTasks}</div>
            </div>
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span class="text-[10px] font-mono text-slate-400 uppercase">Active Report Slides</span>
              <div class="text-xl font-black text-red-600 mt-0.5">${activeSlides.length}</div>
            </div>
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span class="text-[10px] font-mono text-slate-400 uppercase">Excluded Tasks</span>
              <div class="text-xl font-black text-amber-500 mt-0.5">${excludedTasks}</div>
            </div>
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span class="text-[10px] font-mono text-slate-400 uppercase">Deck Status</span>
              <div class="text-xl font-black text-emerald-600 mt-0.5">
                ${activeSlides.length > 0 ? 'READY FOR EXPORT' : 'EMPTY'}
              </div>
            </div>
          </div>
        </div>

        <!-- Action Bar: Preview Full Deck -->
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-800 tracking-wide">
            Task Slides Roster (${tasks.length} Rows &rarr; ${activeSlides.length} Slides)
          </h3>
          <button onclick="ReportBuilderView.previewFullDeck()" class="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-red-600 border border-slate-200 flex items-center gap-2 transition shadow-sm">
            👁️ Preview Full Slide Deck (${activeSlides.length} Slides) &rarr;
          </button>
        </div>

        <!-- Task Roster Table -->
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 font-mono uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4">Task ID</th>
                  <th class="py-3 px-4">Engineer</th>
                  <th class="py-3 px-4">Raw Task Name</th>
                  <th class="py-3 px-4">AI Title</th>
                  <th class="py-3 px-4">Photo</th>
                  <th class="py-3 px-4">Inclusion</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-700">
                ${tasks.length === 0 ? `
                  <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400">
                      No tasks found for ${month}. Click "Monthly Input" to add tasks.
                    </td>
                  </tr>
                ` : tasks.map(t => {
                  const b = breakdownSheet.getBreakdown(t.task_id);
                  const isInc = t.include_in_report !== "NO";
                  const hasPhoto = b && (b.photo || b.photo_before || b.photo_after);

                  return `
                    <tr class="hover:bg-red-50/30 transition ${!isInc ? 'opacity-40 bg-slate-50/60' : ''}">
                      <td class="py-3.5 px-4 font-mono font-bold text-red-600 whitespace-nowrap">
                        ${t.task_id}
                      </td>
                      <td class="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        ${t.engineer}
                      </td>
                      <td class="py-3.5 px-4 max-w-xs truncate" title="${HELPERS.escapeHtml(t.task_name)}">
                        ${HELPERS.escapeHtml(t.task_name)}
                      </td>
                      <td class="py-3.5 px-4 max-w-xs truncate text-indigo-600 font-medium" title="${b ? HELPERS.escapeHtml(b.ai_report_title) : ''}">
                        ${b ? HELPERS.escapeHtml(b.ai_report_title) : '<span class="text-slate-400 italic">Pending Sync</span>'}
                      </td>
                      <td class="py-3.5 px-4 whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${hasPhoto ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}">
                          ${hasPhoto ? 'READY' : 'PENDING'}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 whitespace-nowrap">
                        <button onclick="ReportBuilderView.toggleTaskInclusion('${t.task_id}')" class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition ${isInc ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-500 border border-red-200'}">
                          ${isInc ? 'YES' : 'NO'}
                        </button>
                      </td>
                      <td class="py-3.5 px-4 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                          <button onclick="ReportBuilderView.previewTaskSlide('${t.task_id}')" title="Preview 16:9 Slide" class="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-red-600 border border-slate-200 transition">
                            👁️
                          </button>
                          <button onclick="FinalEditorView.openModal('${t.task_id}')" title="Edit Slide Content" class="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition">
                            ✏️
                          </button>
                          <button onclick="ReportBuilderView.regenerateTaskAI('${t.task_id}')" title="Regenerate AI Content" class="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-amber-600 border border-slate-200 transition">
                            ✨
                          </button>
                          <button onclick="photoViewModal.open('${t.task_id}')" title="Upload Photo" class="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-emerald-600 border border-slate-200 transition">
                            📸
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportBuilderView;
} else if (typeof window !== 'undefined') {
  window.ReportBuilderView = ReportBuilderView;
}
