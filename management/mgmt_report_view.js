/**
 * Process Development Monthly Report Automation System
 * Module: Executive Management Report View
 * Dedicated workspace for C-Level / Director Review Presentations
 * Features: Cost Impact tracking, Concern-wise sequencing, Task editing, AI synthesis, PPTX & HTML exports
 * WALTON Hi-Tech Industries PLC
 */

const ManagementReportView = {
  selectedMonth: "SEP-2026",
  filterConcern: "",
  activePreviewSlide: 0,

  init() {
    if (!window.managementReportMgr) {
      window.managementReportMgr = new ManagementReportManager();
    }
  },

  handleMonthSelect(month) {
    this.selectedMonth = month;
    this.render();
  },

  handleConcernFilter(concern) {
    this.filterConcern = concern || "";
    this.render();
  },

  async render(containerId = 'mgmt-report-view-container') {
    this.init();
    const container = document.getElementById(containerId);
    if (!container) return;

    const mgr = window.managementReportMgr;
    const month = this.selectedMonth;
    const allTasks = mgr.getTasksForMonth(month);
    const summary = mgr.getSummary(month);

    // Sequence tasks by concern
    const { sequencedTasks, groupedByConcern, concernsList } = mgr.getTasksSequencedByConcern(month);

    // Filter if concern tab is selected
    const tasks = this.filterConcern 
      ? sequencedTasks.filter(t => (t.concern || t.assignee || '').toLowerCase().includes(this.filterConcern.toLowerCase()))
      : sequencedTasks;

    // Available months from workbook manager or defaults
    const months = (window.appState && window.appState.workbookMgr) 
      ? window.appState.workbookMgr.getAllMonths() 
      : ["JAN-2026", "FEB-2026", "MAR-2026", "APR-2026", "MAY-2026", "JUN-2026", "JUL-2026", "AUG-2026", "SEP-2026"];

    container.innerHTML = `
      <div class="space-y-6 font-sans text-slate-800">
        
        <!-- Header Bar with Walton Branding, Month Navigation & Quick Actions -->
        <div class="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div class="flex items-center gap-4">
              <img src="assets/img/walton_logo.png" alt="WALTON" class="h-11 w-auto object-contain flex-shrink-0 drop-shadow-sm">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    EXECUTIVE DECK
                  </span>
                  <span class="text-xs text-slate-400 font-mono">C-Level &amp; Management Review</span>
                </div>
                <h2 class="text-2xl font-black text-slate-800 mt-0.5">Executive Management Report: ${month}</h2>
                <p class="text-xs text-slate-400 mt-0.5">
                  High-level strategic presentation with auto-generated summary table, concern-sequenced slides, and verified annual cost impacts.
                </p>
              </div>
            </div>

            <!-- Action Buttons Group -->
            <div class="flex flex-wrap items-center gap-2.5">
              <button onclick="ManagementReportView.openNewTaskModal()" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5">
                <span>➕</span> <span>Add Strategic Task</span>
              </button>

              <button onclick="ManagementReportView.previewPresentation()" class="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                <span>👁️</span> <span>Preview Slides</span>
              </button>

              <button onclick="ManagementReportView.exportPPTX()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs shadow-md shadow-red-200/50 transition flex items-center gap-1.5">
                <span>📊</span> <span>Export Management PPTX</span>
              </button>

              <button onclick="ManagementReportView.openDownloadModal()" class="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                <span>📥</span> <span>Download &amp; Online Docs</span>
              </button>
            </div>
          </div>

          <!-- Controls: Month Selector + Filter Dropdowns -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
            ${HELPERS.renderMonthSelectorUI(months, this.selectedMonth, 'ManagementReportView.handleMonthSelect', 'MonthlyInputView.openAddMonthModal')}

            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-800 text-xs font-semibold">
              <span>ℹ️</span> <span>Slide Sequence: <strong>Concern by Concern</strong> (Sazzad → Rafi → Abdullah...)</span>
            </div>
          </div>
        </div>

        <!-- 4 TOP EXECUTIVE KPI CARDS (Auto-calculated from Tasks & Financials) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- Card 1: Total Strategic Tasks -->
          <div class="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">Strategic Tasks</span>
              <span class="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold">📋</span>
            </div>
            <div class="text-3xl font-black text-slate-900 font-mono mt-2">${summary.totalTasks}</div>
            <p class="text-xs text-slate-400 mt-1">Management focus projects in ${month}</p>
          </div>

          <!-- Card 2: Total Cost Savings (Annual) -->
          <div class="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-200 rounded-3xl p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-amber-800">Total Annual Savings</span>
              <span class="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">💰</span>
            </div>
            <div class="text-2xl font-black text-amber-900 font-mono mt-2">${summary.formattedTotalSavings}</div>
            <p class="text-xs text-amber-700/80 mt-1">Sum of verified process cost impacts</p>
          </div>

          <!-- Card 3: Concerns Engaged -->
          <div class="bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border border-indigo-200 rounded-3xl p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-indigo-800">Concerns Engaged</span>
              <span class="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">👥</span>
            </div>
            <div class="text-3xl font-black text-indigo-900 font-mono mt-2">${summary.uniqueConcernsCount}</div>
            <p class="text-xs text-indigo-700/80 mt-1">Responsible engineers presenting</p>
          </div>

          <!-- Card 4: Completion Rate -->
          <div class="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-200 rounded-3xl p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">Completion Status</span>
              <span class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">✅</span>
            </div>
            <div class="text-3xl font-black text-emerald-900 font-mono mt-2">${summary.completionRate}%</div>
            <p class="text-xs text-emerald-700/80 mt-1">${summary.completedCount} Completed &bull; ${summary.inProgressCount} In Progress</p>
          </div>

        </div>

        <!-- CONCERN FILTER & SEQUENCE TABS -->
        <div class="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span class="text-xs font-mono font-black text-slate-500 uppercase tracking-wider pl-1 whitespace-nowrap">Filter Concern:</span>
          
          <button type="button" onclick="ManagementReportView.handleConcernFilter('')" 
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap border ${!this.filterConcern ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}">
            <span>👥 All Concerns</span>
            <span class="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${!this.filterConcern ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">${allTasks.length}</span>
          </button>

          ${concernsList.map(c => {
            const isSel = (this.filterConcern.toLowerCase() === c.toLowerCase());
            const count = (groupedByConcern[c] || []).length;
            return `
              <button type="button" onclick="ManagementReportView.handleConcernFilter('${HELPERS.escapeHtml(c)}')" 
                      class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap border ${isSel ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}">
                <span>👤 ${HELPERS.escapeHtml(c)}</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${isSel ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'}">${count}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- EXECUTIVE SLIDE DECK OVERVIEW SECTION (Requirement 4: Slide-by-Slide Pre-Download Editor) -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center text-xl font-bold">
                📑
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Executive Slide Deck Overview</span>
                  <span class="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-mono font-bold border border-indigo-200">
                    Total ${tasks.length + 3} Slides
                  </span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">
                  Inspect and modify every slide of the Management Report before downloading PPTX or PDF.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="ManagementReportView.previewPresentation()" class="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                <span>👁️</span> <span>Preview Full Presentation</span>
              </button>
              <button onclick="ManagementReportView.exportPPTX()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-black shadow-md shadow-red-200/50 transition flex items-center gap-1.5 cursor-pointer">
                <span>📊</span> <span>Export PPTX</span>
              </button>
            </div>
          </div>

          <!-- Slides Sequence Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <!-- Slide 1: Cover -->
            <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 flex flex-col justify-between shadow-sm border border-slate-700">
              <div>
                <div class="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span class="text-[10px] font-mono font-bold bg-blue-500 text-white px-2 py-0.5 rounded">Slide #1 &bull; Cover</span>
                  <span class="text-[10px] font-mono text-slate-400">16:9 Deck</span>
                </div>
                <h4 class="text-xs font-black text-white mt-2">Executive Management Report</h4>
                <p class="text-[11px] text-slate-300 mt-1">Walton AC Process Development &bull; ${month}</p>
                <p class="text-[10px] text-slate-400 mt-2 font-mono">Presenters: ${concernsList.join(', ') || 'Process Engineers'}</p>
              </div>
              <div class="pt-3 mt-3 border-t border-slate-700 flex justify-end">
                <button onclick="ManagementReportView.previewPresentation()" class="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                  <span>👁️</span> <span>Preview Slide</span>
                </button>
              </div>
            </div>

            <!-- Slide 2: Summary Table -->
            <div class="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div class="flex items-center justify-between pb-2 border-b border-indigo-100">
                  <span class="text-[10px] font-mono font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">Slide #2 &bull; All-Works Summary</span>
                  <span class="text-[10px] font-mono text-indigo-700 font-bold">Auto-Calculated</span>
                </div>
                <h4 class="text-xs font-black text-slate-900 mt-2">Strategic Performance &amp; Savings Table</h4>
                <div class="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                  <div class="bg-white/80 rounded-lg p-1.5 border border-indigo-100">
                    <span class="text-slate-400 block text-[9px] uppercase font-bold">Total Savings</span>
                    <strong class="text-amber-800 font-mono">${summary.formattedTotalSavings}</strong>
                  </div>
                  <div class="bg-white/80 rounded-lg p-1.5 border border-indigo-100">
                    <span class="text-slate-400 block text-[9px] uppercase font-bold">Completion</span>
                    <strong class="text-emerald-700 font-mono">${summary.completionRate}%</strong>
                  </div>
                </div>
              </div>
              <div class="pt-3 mt-3 border-t border-indigo-100 flex justify-end">
                <button onclick="ManagementReportView.previewPresentation()" class="text-xs text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1">
                  <span>👁️</span> <span>Preview Slide</span>
                </button>
              </div>
            </div>

            <!-- Slides 3+: Task Slides (Concern by Concern) -->
            ${tasks.map((t, idx) => {
              const isCompleted = (t.status || '').toLowerCase().includes('complete');
              return `
                <div class="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 flex flex-col justify-between shadow-sm transition space-y-3">
                  <div>
                    <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span class="text-[10px] font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                        Slide #${idx + 3} &bull; ${HELPERS.escapeHtml(t.concern || t.assignee || 'General')}
                      </span>
                      <span class="text-[9px] font-bold ${isCompleted ? 'text-emerald-600 bg-emerald-50' : 'text-sky-600 bg-sky-50'} px-1.5 py-0.5 rounded">
                        ${isCompleted ? 'Completed' : 'In Progress'}
                      </span>
                    </div>

                    <h4 class="text-xs font-black text-slate-900 mt-2 line-clamp-2 leading-snug" title="${HELPERS.escapeHtml(t.task_name)}">
                      ${HELPERS.escapeHtml(t.task_name)}
                    </h4>

                    <div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>⚙️ ${HELPERS.escapeHtml(t.category || 'Process')}</span>
                      <span class="font-mono font-bold text-amber-800">${HELPERS.escapeHtml(t.cost_impact || '৳ 0')}</span>
                    </div>

                    <p class="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      ${HELPERS.escapeHtml(t.milestones || t.key_impact || 'Engineering development and implementation.')}
                    </p>
                  </div>

                  <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button onclick="ManagementReportView.previewPresentation()" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
                      <span>👁️</span> <span>Preview</span>
                    </button>
                    <button onclick="ManagementReportView.openEditTaskModal('${t.task_id}')" class="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-xs font-bold text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 transition flex items-center gap-1 cursor-pointer">
                      <span>✏️</span> <span>Edit Slide</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}

            <!-- Final Slide: Closing Slide -->
            <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 flex flex-col justify-between shadow-sm border border-slate-700">
              <div>
                <div class="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span class="text-[10px] font-mono font-bold bg-slate-700 text-white px-2 py-0.5 rounded">Slide #${tasks.length + 3} &bull; Closing</span>
                  <span class="text-[10px] font-mono text-slate-400">Final Slide</span>
                </div>
                <h4 class="text-xs font-black text-white mt-2">Executive Thank You &amp; Q&amp;A</h4>
                <p class="text-[11px] text-slate-300 mt-1">Walton Hi-Tech Industries PLC &bull; Process Development</p>
                <p class="text-[10px] text-slate-400 mt-2 font-mono">Continuous Quality &amp; Efficiency Excellence</p>
              </div>
              <div class="pt-3 mt-3 border-t border-slate-700 flex justify-end">
                <button onclick="ManagementReportView.previewPresentation()" class="text-xs text-slate-300 hover:text-white font-bold flex items-center gap-1">
                  <span>👁️</span> <span>Preview Slide</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- MANAGEMENT TASKS CARDS / LIST -->
        <div class="space-y-4">
          ${tasks.length === 0 ? `
            <div class="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-400 font-mono text-xs">
              No management report tasks recorded for ${month}.<br>
              You can easily copy tasks here from the <strong>Monthly Input</strong> grid using the <strong class="text-indigo-600">👔 Copy to Mgmt Report</strong> button, or click "Add Strategic Task" above.
            </div>
          ` : tasks.map((t, idx) => {
            const isCompleted = (t.status || '').toLowerCase().includes('complete');
            const photoSrc = t.photo || t.photo_after || t.photo_before || 'assets/img/walton_logo.png';
            const hasPhoto = Boolean(t.photo || t.photo_after || t.photo_before);

            return `
              <div class="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm hover:border-indigo-200 transition space-y-4">
                
                <!-- Card Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div class="flex items-center gap-3">
                    <span class="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-mono font-bold text-xs">
                      ${idx + 1}
                    </span>
                    <div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-white">
                          👤 ${HELPERS.escapeHtml(t.concern || t.assignee || 'General')}
                        </span>
                        <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          ⚙️ ${HELPERS.escapeHtml(t.category || 'Process Development')}
                        </span>
                        <span class="px-2 py-0.5 rounded text-[11px] font-bold ${isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}">
                          ${isCompleted ? '✅ Completed' : '⏳ In Progress'}
                        </span>
                      </div>
                      <h3 class="text-lg font-black text-slate-900 mt-1">${HELPERS.escapeHtml(t.task_name)}</h3>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-2">
                    <button onclick="ManagementReportView.generateAiImpactForTask('${t.task_id}')" title="AI synthesize management outcomes" class="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center gap-1 shadow-xs">
                      <span>✨</span> <span>AI Impact</span>
                    </button>
                    <button onclick="ManagementReportView.openEditTaskModal('${t.task_id}')" title="Edit details" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
                      ✏️ Edit
                    </button>
                    <button onclick="ManagementReportView.deleteTask('${t.task_id}')" title="Delete from Management Report" class="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition">
                      🗑️
                    </button>
                  </div>
                </div>

                <!-- 3-Column Info Layout -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  
                  <!-- Col 1: Financial & Timeline -->
                  <div class="space-y-3">
                    <div class="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5">
                      <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800">Annual Cost Impact</div>
                      <div class="text-base font-black text-amber-900 font-mono mt-0.5">${HELPERS.escapeHtml(t.cost_impact || '৳ 0')}</div>
                    </div>

                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                      <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Project Timeline</div>
                      <div class="font-bold text-slate-800 mt-0.5">${HELPERS.escapeHtml(t.timeline || 'Active Development')}</div>
                      <div class="text-[11px] text-slate-400 mt-1">Supervisor: ${HELPERS.escapeHtml(t.supervisor || 'Kamrul (44819)')}</div>
                    </div>
                  </div>

                  <!-- Col 2: Milestones & Management Impact -->
                  <div class="space-y-3">
                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                      <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">Milestone Details</div>
                      <p class="text-slate-700 text-[11px] leading-relaxed whitespace-pre-line">${HELPERS.escapeHtml(t.milestones || 'No detailed steps entered.')}</p>
                    </div>

                    <div class="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5">
                      <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 mb-1">Key Management Outcomes</div>
                      <p class="text-emerald-900 text-[11px] leading-relaxed whitespace-pre-line">${HELPERS.escapeHtml(t.key_impact || 'Enhanced operational efficiency and zero defect assurance.')}</p>
                    </div>
                  </div>

                  <!-- Col 3: Visual Container -->
                  <div class="bg-slate-100 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center relative min-h-[140px]">
                    <img src="${photoSrc}" alt="Task Visual" class="max-h-28 w-auto object-contain rounded-lg drop-shadow-sm mb-2">
                    <div class="flex items-center gap-1.5 flex-wrap justify-center mt-1">
                      <label class="cursor-pointer px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700 shadow-xs transition inline-flex items-center gap-1">
                        <span>📷</span> <span>${hasPhoto ? 'Change' : 'Upload'}</span>
                        <input type="file" accept="image/*" class="hidden" onchange="ManagementReportView.handlePhotoUpload(event, '${t.task_id}')">
                      </label>
                      ${hasPhoto ? `
                        <button type="button" onclick="ManagementReportView.openPhotoAdjustModal('${t.task_id}')" class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[10px] font-bold text-indigo-700 shadow-xs transition inline-flex items-center gap-1 cursor-pointer">
                          <span>✂️</span> <span>Crop &amp; Adjust</span>
                        </button>
                        <button type="button" onclick="ManagementReportView.removePhoto('${t.task_id}')" title="Remove Photo" class="p-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-bold text-red-600 shadow-xs transition cursor-pointer">
                          🗑️
                        </button>
                      ` : ''}
                    </div>
                  </div>

                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>

      <!-- Container for Dynamic Modals -->
      <div id="mgmt-modal-container"></div>
    `;
  },

  // --------------------------------------------------------------------------
  // TASK CRUD & EDIT MODALS
  // --------------------------------------------------------------------------
  openNewTaskModal() {
    this._renderTaskModal(null);
  },

  openEditTaskModal(taskId) {
    const task = window.managementReportMgr.getTasksForMonth(this.selectedMonth).find(t => t.task_id === taskId);
    if (!task) return;
    this._renderTaskModal(task);
  },

  _renderTaskModal(task = null) {
    const isEdit = Boolean(task);
    const modalContainer = document.getElementById('mgmt-modal-container');
    if (!modalContainer) return;

    const personnel = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getAllPersonnel)
      ? MasterDataManager.getAllPersonnel()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS : []);

    const supervisors = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getSupervisors)
      ? MasterDataManager.getSupervisors()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.SUPERVISORS) ? MASTER_LISTS.SUPERVISORS : []);

    const categories = typeof MasterDataManager !== 'undefined' 
      ? MasterDataManager.getCategories() 
      : ["Process Development", "Process Improvement", "Major Development", "Tools & Fixtures", "Cost Reduction"];

    const currentConcern = task ? (task.concern || task.assignee) : (personnel[0] ? personnel[0].display : "Sazzad (50463)");
    const currentSup = task ? task.supervisor : (supervisors[0] ? supervisors[0].display : "Kamrul (44819)");

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 flex flex-col font-sans max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center text-xl shadow-sm">
                👔
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900">${isEdit ? 'Edit Strategic Management Task' : 'Add Strategic Management Task'}</h3>
                <p class="text-xs text-slate-400">Target Month: <strong class="text-slate-700">${this.selectedMonth}</strong> &bull; Executive Presentation Format</p>
              </div>
            </div>
            <button onclick="ManagementReportView.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-sm flex items-center justify-center transition">&times;</button>
          </div>

          <form id="mgmt-task-form" onsubmit="ManagementReportView.saveTask(event, '${task ? task.task_id : ''}')" class="mt-5 space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Strategic Project / Task Name <span class="text-red-500">*</span></label>
              <input type="text" id="mgmt-name" required value="${task ? HELPERS.escapeHtml(task.task_name) : ''}" placeholder="e.g. Compressor Jacket Foil Cutting System Automation"
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white shadow-sm" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Concern Engineer <span class="text-red-500">*</span></label>
                <select id="mgmt-concern" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500">
                  ${personnel.map(p => `<option value="${p.display}" ${p.display === currentConcern || p.name === currentConcern ? 'selected' : ''}>${p.display}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Category</label>
                <select id="mgmt-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500">
                  ${categories.map(c => `<option value="${c}" ${task && task.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Annual Cost Impact (BDT)</label>
                <input type="text" id="mgmt-cost" value="${task ? HELPERS.escapeHtml(task.cost_impact || '') : '৳ 4,50,000 / Year'}" placeholder="e.g. ৳ 5,00,000 / Year"
                       class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Project Timeline</label>
                <input type="text" id="mgmt-timeline" value="${task ? HELPERS.escapeHtml(task.timeline || '') : '4-5 Months (Target: Dec, 2026)'}" placeholder="e.g. 4-5 Months"
                       class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Status</label>
                <select id="mgmt-status" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500">
                  <option value="Completed" ${task && task.status === 'Completed' ? 'selected' : ''}>Completed</option>
                  <option value="In Progress" ${!task || task.status !== 'Completed' ? 'selected' : ''}>In Progress</option>
                </select>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-slate-700">Milestone Steps (1, 2, 3...)</label>
                <button type="button" onclick="ManagementReportView.generateAiStepsInModal(event)" class="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg transition">
                  <span>✨</span> <span>AI Generate Milestones</span>
                </button>
              </div>
              <textarea id="mgmt-milestones" rows="3" placeholder="1. Concept study 2. Fixture fabrication 3. Safety inspection..."
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 resize-none font-sans">${task ? HELPERS.escapeHtml(task.milestones || '') : ''}</textarea>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-slate-700">Key Management Outcomes / Impact</label>
                <button type="button" onclick="ManagementReportView.generateAiImpactInModal(event)" class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition">
                  <span>✨</span> <span>AI Generate Outcomes</span>
                </button>
              </div>
              <textarea id="mgmt-impact" rows="3" placeholder="• Reduced cycle time by 20%&#10;• Eliminated manual razor risk&#10;• Generated ৳ 4.5L annual saving"
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 resize-none font-sans">${task ? HELPERS.escapeHtml(task.key_impact || '') : ''}</textarea>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-100">
              <span class="text-[11px] text-slate-400">Preserved in executive management presentation store.</span>
              <div class="flex items-center gap-2">
                <button type="button" onclick="ManagementReportView.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition">Cancel</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white font-black shadow-md shadow-indigo-200/50 transition flex items-center gap-1.5">
                  <span>💾</span> <span>${isEdit ? 'Update Task' : 'Save Task'}</span>
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    `;
  },

  closeModal() {
    const modalContainer = document.getElementById('mgmt-modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
  },

  async saveTask(event, taskId) {
    event.preventDefault();
    const name = document.getElementById('mgmt-name').value.trim();
    if (!name) return;

    const concern = document.getElementById('mgmt-concern').value;
    const category = document.getElementById('mgmt-category').value;
    const cost = document.getElementById('mgmt-cost').value.trim();
    const timeline = document.getElementById('mgmt-timeline').value.trim();
    const status = document.getElementById('mgmt-status').value;
    const milestones = document.getElementById('mgmt-milestones').value.trim();
    const impact = document.getElementById('mgmt-impact').value.trim();

    const mgr = window.managementReportMgr;
    if (taskId) {
      mgr.updateTask(this.selectedMonth, taskId, {
        task_name: name,
        concern: concern,
        category: category,
        cost_impact: cost,
        timeline: timeline,
        status: status,
        milestones: milestones,
        key_impact: impact
      });
      if (typeof window.showToast === 'function') window.showToast("Updated management task!", "success");
    } else {
      mgr.addTask(this.selectedMonth, {
        task_name: name,
        concern: concern,
        category: category,
        cost_impact: cost,
        timeline: timeline,
        status: status,
        milestones: milestones,
        key_impact: impact
      });
      if (typeof window.showToast === 'function') window.showToast("Added new strategic task!", "success");
    }

    this.closeModal();
    this.render();
  },

  deleteTask(taskId) {
    if (confirm(`Remove this task from the Management Report (${this.selectedMonth})?`)) {
      window.managementReportMgr.deleteTask(this.selectedMonth, taskId);
      if (typeof window.showToast === 'function') window.showToast("Removed task from Management Report", "info");
      this.render();

      // Trigger sync event for MonthlyInputView
      try {
        window.dispatchEvent(new CustomEvent('mgmt-report-updated', { detail: { month: this.selectedMonth } }));
        const monthlyContainer = document.getElementById('monthly-input-view-container');
        if (monthlyContainer && monthlyContainer.innerHTML.length > 50 && typeof MonthlyInputView !== 'undefined') {
          MonthlyInputView.render();
        }
      } catch (e) {
        // Ignore
      }
    }
  },

  async handlePhotoUpload(event, taskId) {
    const files = event.target ? event.target.files : null;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      window.managementReportMgr.updateTask(this.selectedMonth, taskId, { photo: base64 });
      if (typeof window.showToast === 'function') window.showToast("Photo attached to management task!", "success");
      this.render();
    };
    reader.readAsDataURL(file);
  },

  removePhoto(taskId) {
    if (!confirm("Remove photo from this management report task?")) return;
    window.managementReportMgr.updateTask(this.selectedMonth, taskId, { photo: null, photo_after: null, photo_before: null });
    if (typeof window.showToast === 'function') window.showToast("Photo removed from management task.", "info");
    this.render();
  },

  _activeAdjustTaskId: null,
  _adjustState: {
    rotation: 0,
    zoom: 1,
    brightness: 0,
    contrast: 0,
    aspectRatio: '16:9',
    img: null
  },

  openPhotoAdjustModal(taskId) {
    const task = window.managementReportMgr.getTasks(this.selectedMonth).find(t => t.task_id === taskId);
    if (!task) return;
    const photoSrc = task.photo || task.photo_after || task.photo_before;
    if (!photoSrc) {
      alert("No photo found on this task to adjust.");
      return;
    }

    this._activeAdjustTaskId = taskId;
    this._adjustState = {
      rotation: 0,
      zoom: 1,
      brightness: 0,
      contrast: 0,
      aspectRatio: '16:9',
      img: new Image()
    };

    let container = document.getElementById('mgmt-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mgmt-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800 flex flex-col max-h-[92vh]">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <span class="text-xl">✂️</span>
              <h3 class="text-base font-black text-slate-900">Crop, Edit &amp; Adjust Photo</h3>
            </div>
            <button onclick="ManagementReportView.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-sm flex items-center justify-center transition">&times;</button>
          </div>

          <div class="my-4 flex-1 flex flex-col items-center justify-center bg-slate-900/90 rounded-2xl p-3 overflow-hidden min-h-[260px] relative">
            <canvas id="mgmt-adjust-canvas" class="max-w-full max-h-[280px] object-contain rounded-lg shadow-lg border border-slate-700"></canvas>
          </div>

          <!-- Controls Bar -->
          <div class="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-1.5 font-bold text-slate-700 flex-wrap">
                <span>Aspect Ratio:</span>
                <button type="button" onclick="ManagementReportView.setAdjustAspect('16:9')" class="px-2 py-1 rounded bg-white hover:bg-indigo-50 border border-slate-200 font-mono text-[11px] font-bold">16:9 Slide</button>
                <button type="button" onclick="ManagementReportView.setAdjustAspect('4:3')" class="px-2 py-1 rounded bg-white hover:bg-indigo-50 border border-slate-200 font-mono text-[11px] font-bold">4:3 Standard</button>
                <button type="button" onclick="ManagementReportView.setAdjustAspect('1:1')" class="px-2 py-1 rounded bg-white hover:bg-indigo-50 border border-slate-200 font-mono text-[11px] font-bold">1:1 Square</button>
                <button type="button" onclick="ManagementReportView.setAdjustAspect('orig')" class="px-2 py-1 rounded bg-white hover:bg-indigo-50 border border-slate-200 font-mono text-[11px] font-bold">Original</button>
              </div>

              <div class="flex items-center gap-1.5 font-bold text-slate-700">
                <span>Rotate:</span>
                <button type="button" onclick="ManagementReportView.rotateAdjust(90)" class="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold">↻ 90°</button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Zoom: <span id="val-zoom">1.0x</span></label>
                <input type="range" min="0.5" max="2.0" step="0.05" value="1.0" oninput="ManagementReportView.updateAdjust('zoom', parseFloat(this.value))" class="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Brightness: <span id="val-bright">0</span></label>
                <input type="range" min="-50" max="50" step="1" value="0" oninput="ManagementReportView.updateAdjust('brightness', parseInt(this.value, 10))" class="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contrast: <span id="val-contrast">0</span></label>
                <input type="range" min="-50" max="50" step="1" value="0" oninput="ManagementReportView.updateAdjust('contrast', parseInt(this.value, 10))" class="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer">
              </div>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between mt-3">
            <button type="button" onclick="ManagementReportView.resetAdjust()" class="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition">
              Reset
            </button>
            <div class="flex items-center gap-2">
              <button type="button" onclick="ManagementReportView.closeModal()" class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="button" onclick="ManagementReportView.saveAdjustedPhoto()" class="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer">
                <span>💾</span> <span>Apply &amp; Save Photo</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    this._adjustState.img.onload = () => {
      this.renderAdjustCanvas();
    };
    this._adjustState.img.src = photoSrc;
  },

  setAdjustAspect(aspect) {
    this._adjustState.aspectRatio = aspect;
    this.renderAdjustCanvas();
  },

  rotateAdjust(deg) {
    this._adjustState.rotation = (this._adjustState.rotation + deg) % 360;
    this.renderAdjustCanvas();
  },

  updateAdjust(prop, val) {
    this._adjustState[prop] = val;
    if (prop === 'zoom') {
      const zEl = document.getElementById('val-zoom');
      if (zEl) zEl.textContent = val.toFixed(2) + 'x';
    } else if (prop === 'brightness') {
      const bEl = document.getElementById('val-bright');
      if (bEl) bEl.textContent = val > 0 ? `+${val}` : `${val}`;
    } else if (prop === 'contrast') {
      const cEl = document.getElementById('val-contrast');
      if (cEl) cEl.textContent = val > 0 ? `+${val}` : `${val}`;
    }
    this.renderAdjustCanvas();
  },

  resetAdjust() {
    this._adjustState.rotation = 0;
    this._adjustState.zoom = 1;
    this._adjustState.brightness = 0;
    this._adjustState.contrast = 0;
    this._adjustState.aspectRatio = '16:9';
    const zEl = document.getElementById('val-zoom');
    const bEl = document.getElementById('val-bright');
    const cEl = document.getElementById('val-contrast');
    if (zEl) zEl.textContent = '1.0x';
    if (bEl) bEl.textContent = '0';
    if (cEl) cEl.textContent = '0';
    this.renderAdjustCanvas();
  },

  renderAdjustCanvas() {
    const canvas = document.getElementById('mgmt-adjust-canvas');
    if (!canvas || !this._adjustState.img) return;
    const ctx = canvas.getContext('2d');
    const img = this._adjustState.img;

    let targetW = 960;
    let targetH = 540;
    if (this._adjustState.aspectRatio === '4:3') {
      targetW = 800; targetH = 600;
    } else if (this._adjustState.aspectRatio === '1:1') {
      targetW = 600; targetH = 600;
    } else if (this._adjustState.aspectRatio === 'orig') {
      targetW = img.width || 800; targetH = img.height || 600;
    }

    canvas.width = targetW;
    canvas.height = targetH;

    ctx.clearRect(0, 0, targetW, targetH);
    ctx.save();

    const brightPct = 100 + this._adjustState.brightness;
    const contrastPct = 100 + this._adjustState.contrast;
    ctx.filter = `brightness(${brightPct}%) contrast(${contrastPct}%)`;

    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((this._adjustState.rotation * Math.PI) / 180);
    ctx.scale(this._adjustState.zoom, this._adjustState.zoom);

    const imgRatio = img.width / img.height;
    const targetRatio = targetW / targetH;
    let drawW, drawH;
    if (imgRatio > targetRatio) {
      drawW = targetW;
      drawH = targetW / imgRatio;
    } else {
      drawH = targetH;
      drawW = targetH * imgRatio;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  },

  saveAdjustedPhoto() {
    const canvas = document.getElementById('mgmt-adjust-canvas');
    if (!canvas || !this._activeAdjustTaskId) return;
    const base64 = canvas.toDataURL('image/jpeg', 0.92);
    window.managementReportMgr.updateTask(this.selectedMonth, this._activeAdjustTaskId, { photo: base64 });
    this.closeModal();
    if (typeof window.showToast === 'function') window.showToast("✨ Photo edited, cropped & saved!", "success");
    this.render();
  },

  // --------------------------------------------------------------------------
  // AI INTEGRATION IN VIEW
  // --------------------------------------------------------------------------
  async generateAiStepsInModal(event) {
    if (event && event.preventDefault) event.preventDefault();
    const nameInput = document.getElementById('mgmt-name');
    const catSelect = document.getElementById('mgmt-category');
    const textArea = document.getElementById('mgmt-milestones');
    if (!nameInput || !textArea) return;

    const name = nameInput.value.trim();
    if (!name) {
      alert("Please enter a Project / Task Name first!");
      nameInput.focus();
      return;
    }

    const category = catSelect ? catSelect.value : "Process Development";
    textArea.value = "Generating milestones with AI...";
    const steps = await geminiClient.generateTaskSteps(name, category);
    textArea.value = steps;
  },

  async generateAiImpactInModal(event) {
    if (event && event.preventDefault) event.preventDefault();
    const nameInput = document.getElementById('mgmt-name');
    const catSelect = document.getElementById('mgmt-category');
    const costInput = document.getElementById('mgmt-cost');
    const timelineInput = document.getElementById('mgmt-timeline');
    const textArea = document.getElementById('mgmt-impact');
    if (!nameInput || !textArea) return;

    const name = nameInput.value.trim();
    if (!name) {
      alert("Please enter a Project / Task Name first!");
      nameInput.focus();
      return;
    }

    const category = catSelect ? catSelect.value : "Process Development";
    const cost = costInput ? costInput.value : "";
    const timeline = timelineInput ? timelineInput.value : "";

    textArea.value = "Synthesizing executive outcomes with AI...";
    const impact = await geminiClient.generateManagementImpact(name, category, cost, timeline);
    textArea.value = impact;
  },

  async generateAiImpactForTask(taskId) {
    const task = window.managementReportMgr.getTasksForMonth(this.selectedMonth).find(t => t.task_id === taskId);
    if (!task) return;

    if (typeof window.showToast === 'function') window.showToast("✨ Synthesizing AI executive outcomes...", "info");
    const impact = await geminiClient.generateManagementImpact(task.task_name, task.category, task.cost_impact, task.timeline);
    window.managementReportMgr.updateTask(this.selectedMonth, taskId, { key_impact: impact });
    if (typeof window.showToast === 'function') window.showToast("✅ AI Management Outcomes updated!", "success");
    this.render();
  },

  // --------------------------------------------------------------------------
  // EXPORTS & PREVIEWS
  // --------------------------------------------------------------------------
  async exportPPTX() {
    const mgr = window.managementReportMgr;
    const tasks = mgr.getTasksForMonth(this.selectedMonth);
    const summary = mgr.getSummary(this.selectedMonth);

    if (tasks.length === 0) {
      alert("No tasks available in Management Report for " + this.selectedMonth + ". Please add or copy tasks first.");
      return;
    }

    if (typeof window.showToast === 'function') {
      window.showToast("Compiling Executive Management PPTX...", "info");
    }

    try {
      const generator = new ManagementPPTXGenerator();
      await generator.generatePresentation({
        month: this.selectedMonth,
        tasks: tasks,
        summary: summary
      });
      if (typeof window.showToast === 'function') {
        window.showToast("🎉 Executive Management PPTX Downloaded!", "success");
      }
    } catch (e) {
      console.error("Management PPTX generation error:", e);
      alert("Error generating PPTX: " + e.message);
    }
  },

  openStandaloneDeck() {
    const mgr = window.managementReportMgr;
    const tasks = mgr.getTasksForMonth(this.selectedMonth);
    const summary = mgr.getSummary(this.selectedMonth);

    if (tasks.length === 0) {
      alert("No tasks in Management Report for " + this.selectedMonth);
      return;
    }

    const html = ManagementHTMLGenerator.generateStandaloneHTML({
      month: this.selectedMonth,
      tasks: tasks,
      summary: summary
    });

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  },

  openOnlineDocs() {
    const defaultOwner = "nipu.ruet10@gmail.com";
    const allowedEmailsStr = localStorage.getItem('walton_online_docs_emails') || '';
    let targetUrl = (localStorage.getItem('walton_google_slides_url') || '').trim();

    // Verify authorized email if configured
    if (allowedEmailsStr.trim()) {
      const allowed = allowedEmailsStr.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
      const userPromptEmail = prompt(`Online Presentation Access Protected.\nOwner: ${defaultOwner}\nPlease enter your authorized Walton email to verify access:`);
      if (!userPromptEmail) return;
      const cleanInput = userPromptEmail.trim().toLowerCase();
      if (!allowed.includes(cleanInput) && cleanInput !== defaultOwner) {
        alert(`Access Denied: The email "${userPromptEmail}" is not in the authorized list.\nPlease contact ${defaultOwner} to grant access in Settings.`);
        return;
      }
    }

    if (!targetUrl || targetUrl === 'https://docs.google.com/presentation/u/0/' || targetUrl === 'https://docs.google.com/presentation/u/0') {
      targetUrl = 'https://docs.google.com/presentation/u/0/create';
    }

    // Open live Google Presentation in new tab
    window.open(targetUrl, '_blank');
  },

  async exportPDF() {
    if (typeof PDFReportGenerator !== 'undefined' && PDFReportGenerator.generateManagementPDF) {
      const mgr = window.managementReportMgr;
      const tasks = mgr.getTasksForMonth(this.selectedMonth);
      const summary = mgr.getSummary(this.selectedMonth);
      await PDFReportGenerator.generateManagementPDF({ month: this.selectedMonth, tasks, summary });
    } else {
      this.openStandaloneDeck();
    }
  },

  openDownloadModal() {
    const modalContainer = document.getElementById('mgmt-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
        <div class="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8">
          
          <div class="flex items-start justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-xl font-bold">
                📥
              </div>
              <div>
                <h3 class="text-xl font-black text-slate-800">Download Executive Management Report</h3>
                <p class="text-xs text-slate-400 mt-0.5">High-level strategic presentation for ${this.selectedMonth} with verified cost impacts.</p>
              </div>
            </div>
            <button onclick="ManagementReportView.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition">&times;</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
            <!-- 1. PPTX -->
            <div class="bg-white border border-slate-200 hover:border-red-300 rounded-2xl p-4 flex flex-col justify-between transition shadow-sm hover:shadow-md">
              <div>
                <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-xl mb-2.5">
                  📊
                </div>
                <h4 class="text-sm font-black text-slate-800">PowerPoint (.pptx)</h4>
                <p class="text-xs text-slate-400 mt-1">100% native editable OpenXML presentation.</p>
              </div>
              <button onclick="ManagementReportView.exportPPTX()" class="mt-4 w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow transition">
                Download .pptx
              </button>
            </div>

            <!-- 2. Standalone HTML -->
            <div class="bg-white border border-slate-200 hover:border-sky-300 rounded-2xl p-4 flex flex-col justify-between transition shadow-sm hover:shadow-md">
              <div>
                <div class="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center text-xl mb-2.5">
                  🌐
                </div>
                <h4 class="text-sm font-black text-slate-800">Standalone HTML</h4>
                <p class="text-xs text-slate-400 mt-1">Self-contained portable interactive deck.</p>
              </div>
              <button onclick="ManagementReportView.openStandaloneDeck()" class="mt-4 w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-sky-600 border border-slate-200 shadow-sm transition">
                Download .html
              </button>
            </div>

            <!-- 3. Vector PDF -->
            <div class="bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-4 flex flex-col justify-between transition shadow-sm hover:shadow-md">
              <div>
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-xl mb-2.5">
                  📄
                </div>
                <h4 class="text-sm font-black text-slate-800">Vector PDF</h4>
                <p class="text-xs text-slate-400 mt-1">Clean vector 16:9 executive landscape output.</p>
              </div>
              <button onclick="ManagementReportView.exportPDF()" class="mt-4 w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-amber-600 border border-slate-200 shadow-sm transition">
                Download PDF
              </button>
            </div>

            <!-- 4. Online Docs Link -->
            <div class="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 flex flex-col justify-between transition shadow-sm hover:shadow-md">
              <div>
                <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-xl mb-2.5">
                  🔗
                </div>
                <h4 class="text-sm font-black text-slate-800">Online Presentation</h4>
                <p class="text-xs text-slate-400 mt-1">Live presentation for authorized team emails.</p>
                <div class="mt-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-600 font-mono truncate" title="Owner: nipu.ruet10@gmail.com">
                  Owner: <strong class="text-indigo-600">nipu.ruet10@gmail.com</strong>
                </div>
              </div>
              <button onclick="ManagementReportView.openOnlineDocs()" class="mt-4 w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow transition">
                Open Online Docs ↗
              </button>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-100 flex justify-end">
            <button onclick="ManagementReportView.closeModal()" class="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition">
              Close
            </button>
          </div>

        </div>
      </div>
    `;
  },

  previewPresentation() {
    const mgr = window.managementReportMgr;
    const tasks = mgr.getTasksForMonth(this.selectedMonth);
    const summary = mgr.getSummary(this.selectedMonth);

    if (tasks.length === 0) {
      alert("No tasks in Management Report for " + this.selectedMonth);
      return;
    }

    const modalContainer = document.getElementById('mgmt-modal-container');
    if (!modalContainer) return;

    const html = ManagementHTMLGenerator.generateStandaloneHTML({
      month: this.selectedMonth,
      tasks: tasks,
      summary: summary
    });

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <div class="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh]">
          
          <div class="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-sm font-bold">👁️</span>
              <div>
                <h3 class="text-sm font-bold text-white">Executive Management Report Preview &bull; ${this.selectedMonth}</h3>
                <p class="text-[11px] text-slate-400">16:9 Interactive Deck &bull; Sequenced by Concern &bull; Full Text &amp; Image Focus</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="ManagementReportView.exportPPTX()" class="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow">
                <span>📊</span> <span>Export PPTX</span>
              </button>
              <button onclick="ManagementReportView.closeModal()" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition">&times;</button>
            </div>
          </div>

          <div class="flex-1 w-full bg-slate-950 overflow-hidden relative">
            <iframe id="mgmt-preview-iframe" class="w-full h-full border-none"></iframe>
          </div>

        </div>
      </div>
    `;

    // Inject the generated HTML into iframe
    const iframe = document.getElementById('mgmt-preview-iframe');
    if (iframe) {
      iframe.srcdoc = html;
    }
  }
};

// Attach globally
if (typeof window !== 'undefined') {
  window.ManagementReportView = ManagementReportView;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ManagementReportView;
}
