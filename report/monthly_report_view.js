/**
 * Process Development Monthly Report Automation System
 * Module: Monthly Report View (Slide Deck Sequence & Editorial Overrides Hub)
 * Requirement 3: Dedicated Monthly Report section displaying complete slide-by-slide sequence,
 * live editorial overrides/modifications, full deck preview, and 1-click export (PPTX, PDF, HTML).
 * WALTON Hi-Tech Industries PLC
 */

const MonthlyReportView = {
  selectedMonth: "SEP-2026",
  filterEngineer: "",
  searchQuery: "",

  handleMonthSelect(month) {
    this.selectedMonth = month;
    if (typeof FinalEditorView !== 'undefined') FinalEditorView.selectedMonth = month;
    if (typeof MonthlyInputView !== 'undefined') MonthlyInputView.selectedMonth = month;
    this.render();
  },

  handleEngineerFilter(eng) {
    this.filterEngineer = eng || "";
    this.render();
  },

  handleSearch(query) {
    this.searchQuery = (query || "").trim().toLowerCase();
    this.filterSlidesLocally();
  },

  filterSlidesLocally() {
    const q = this.searchQuery;
    const cards = document.querySelectorAll('.task-slide-card');
    let visibleCount = 0;
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (!q || text.includes(q)) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });
    const counter = document.getElementById('monthly-report-filtered-counter');
    if (counter) {
      counter.textContent = q ? `Showing ${visibleCount} of ${cards.length} task slides` : `Showing all ${cards.length} task slides`;
    }
  },

  renderContainer() {
    let container = document.getElementById('monthly-report-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'monthly-report-modal-container';
      document.body.appendChild(container);
    }
    return container;
  },

  /**
   * Opens the slide override editor for a specific task slide
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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800 flex flex-col max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-lg font-bold">
                ✏️
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    SLIDE EDITORIAL OVERRIDE
                  </span>
                  <span class="text-xs font-mono text-slate-400">ID: ${taskId}</span>
                </div>
                <h3 class="text-base font-black text-slate-900 mt-0.5">Edit Slide Presentation Content</h3>
                <p class="text-xs text-slate-500">Changes modify only the slide presentation while keeping raw table data intact.</p>
              </div>
            </div>
            <button onclick="MonthlyReportView.closeModal()" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl">✕</button>
          </div>

          <form onsubmit="MonthlyReportView.saveOverrides(event, '${taskId}')" class="space-y-4 my-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Slide Title (Headline)</label>
              <input type="text" id="edit-slide-title" value="${HELPERS.escapeHtml(currentTitle)}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-bold" required />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Description / 5-Step Process Breakdown</label>
              <textarea id="edit-slide-desc" rows="4" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 leading-relaxed font-sans">${HELPERS.escapeHtml(currentDesc)}</textarea>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Project Impact &amp; Outcomes (One bullet per line)</label>
              <textarea id="edit-slide-impact" rows="3" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-sans">${HELPERS.escapeHtml(currentImpact)}</textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Concern Engineer Name</label>
                <input type="text" id="edit-slide-engineer" value="${HELPERS.escapeHtml(currentEngineer)}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-medium" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Investment / Budget Note</label>
                <input type="text" id="edit-slide-investment" value="${HELPERS.escapeHtml(currentInvestment)}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-medium" />
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button type="button" onclick="MonthlyReportView.resetOverrides('${taskId}')" class="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition">
                Reset to AI Defaults
              </button>
              <div class="flex items-center gap-2">
                <button type="button" onclick="MonthlyReportView.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
                  Cancel
                </button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition cursor-pointer">
                  💾 Save Overrides
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    `;
  },

  closeModal() {
    const container = document.getElementById('monthly-report-modal-container');
    if (container) container.innerHTML = '';
  },

  saveOverrides(event, taskId) {
    if (event) event.preventDefault();

    const titleEl = document.getElementById('edit-slide-title');
    const descEl = document.getElementById('edit-slide-desc');
    const impactEl = document.getElementById('edit-slide-impact');
    const engineerEl = document.getElementById('edit-slide-engineer');
    const investEl = document.getElementById('edit-slide-investment');

    const overrides = {
      slide_title: titleEl ? titleEl.value.trim() : "",
      description: descEl ? descEl.value.trim() : "",
      impact: impactEl ? impactEl.value.trim().split("\n").filter(l => l.trim().length > 0) : [],
      engineer: engineerEl ? engineerEl.value.trim() : "",
      investment: investEl ? investEl.value.trim() : ""
    };

    if (window.appState && window.appState.syncEngine) {
      window.appState.syncEngine.saveManualOverride(taskId, overrides);
    }

    this.closeModal();
    this.render();

    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Slide overrides saved for task ${taskId}!`, "success");
    }
  },

  resetOverrides(taskId) {
    if (window.appState && window.appState.syncEngine) {
      window.appState.syncEngine.removeManualOverride(taskId);
    }
    this.closeModal();
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast(`Reset task ${taskId} to original AI defaults.`, "info");
    }
  },

  previewFullDeck() {
    const month = this.selectedMonth;
    if (typeof ReportBuilderView !== 'undefined' && ReportBuilderView.previewFullDeck) {
      ReportBuilderView.previewFullDeck(month);
    } else if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openFullDeck) {
      const activeSlides = window.appState && window.appState.syncEngine
        ? window.appState.syncEngine.getActiveSlides(month)
        : [];
      if (typeof photoManager !== 'undefined') {
        activeSlides.forEach(s => {
          const p = photoManager.getTaskPhotos(s.task_id, month);
          s.photo_before = p ? (p.before_photo || null) : null;
          s.photo_after = p ? (p.after_photo || null) : null;
          s.photo = p ? (p.before_photo || p.after_photo || null) : null;
          s.has_dual_photo = Boolean(s.photo_before && s.photo_after);
        });
      }
      SlidePreviewModal.openFullDeck({ month, slides: activeSlides });
    } else {
      ExportController.exportHTML(month);
    }
  },

  render() {
    const container = document.getElementById('monthly-report-view-container');
    if (!container) return;

    const month = this.selectedMonth;
    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : (typeof MonthWorkbookManager !== 'undefined' ? new MonthWorkbookManager() : null);

    const months = workbookMgr ? workbookMgr.getAllMonths() : ["SEP-2026"];
    const allTasks = workbookMgr ? workbookMgr.getTasksForMonth(month) : [];

    // Get active slides using SyncEngine or fallback
    let activeSlides = (window.appState && window.appState.syncEngine)
      ? window.appState.syncEngine.getActiveSlides(month)
      : [];

    if (activeSlides.length === 0 && allTasks.length > 0) {
      activeSlides = allTasks.filter(t => t.include_in_report !== "NO" && t.monthly_report !== "NO").map((t, idx) => ({
        task_id: t.task_id || `${month}-${idx + 1}`,
        slide_title: t.task_name || `Task ${idx + 1}`,
        description: t.task_details || "Standard operating procedure execution and engineering development.",
        impact: ["Zero defect manufacturing", "Enhanced line balancing and cycle efficiency"],
        engineer: t.concern_engineer || t.engineer || t.assignee || "Concern Engineer",
        category: t.category || "Process Development",
        status: t.status || "Completed",
        photo_before: t.photo_before || t.photo || null,
        photo_after: t.photo_after || null,
        has_manual_override: false
      }));
    }

    // Dynamic Photo Binding: Always pull 100% current fresh photos from photoManager
    if (typeof photoManager !== 'undefined') {
      activeSlides.forEach(s => {
        const p = photoManager.getTaskPhotos(s.task_id, month);
        s.photo_before = p ? (p.before_photo || null) : null;
        s.photo_after = p ? (p.after_photo || null) : null;
        s.photo = p ? (p.before_photo || p.after_photo || null) : null;
        s.has_dual_photo = Boolean(s.photo_before && s.photo_after);
      });
    }

    // Filter by engineer if selected
    const norm = s => (s || '').trim().toLowerCase();
    const filterNorm = norm(this.filterEngineer);
    const filterFirst = filterNorm.split(/[\s(]/)[0];
    const isEngMatch = eng => {
      if (!filterNorm) return true;
      const e = norm(eng);
      if (e.includes(filterNorm)) return true;
      const eFirst = e.split(/[\s(]/)[0];
      return Boolean(eFirst && filterFirst && eFirst === filterFirst);
    };

    const displayedSlides = this.filterEngineer
      ? activeSlides.filter(s => isEngMatch(s.engineer))
      : activeSlides;

    // Unique engineers for filter pills
    const uniqueEngineers = Array.from(new Set(activeSlides.map(s => {
      const raw = s.engineer || 'Unassigned';
      return raw.split('(')[0].trim();
    }))).filter(Boolean);

    // Total sequence slide count calculation
    const totalPresentationSlides = activeSlides.length + 4; // Cover + Executive Dashboard + Tasks + Top 5 + Closing

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header Banner & Slide Hub Controls -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div class="flex items-center gap-4">
              <img src="assets/img/walton_logo.png" alt="WALTON" class="h-12 w-auto object-contain flex-shrink-0 drop-shadow-sm">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    EXECUTIVE SLIDE DECK HUB
                  </span>
                  <span class="text-xs text-slate-500 font-mono font-bold">${month}</span>
                </div>
                <h2 class="text-2xl font-black text-slate-900 mt-1">Monthly Report Presentation Hub</h2>
                <p class="text-xs text-slate-500 mt-0.5">
                  Complete slide-by-slide sequence review, live editorial overrides, full deck preview, and 1-click presentation download.
                </p>
              </div>
            </div>

            <!-- Export & Presentation Buttons -->
            <div class="flex flex-wrap items-center gap-2.5">
              <button onclick="MonthlyReportView.previewFullDeck()" class="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                <span>👁️</span> <span>Preview Full Deck</span>
              </button>
              <button onclick="ExportController.exportPPTX('${month}')" title="100% Native Editable PPTX" class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-black text-white shadow-md shadow-red-200/50 transition flex items-center gap-1 cursor-pointer">
                <span>📊</span> <span>Download PPTX</span>
              </button>
              <button onclick="ExportController.exportPDF('${month}')" class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1 shadow-sm cursor-pointer">
                <span>🖨️</span> <span>PDF</span>
              </button>
              <button onclick="ExportController.exportHTML('${month}')" class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1 shadow-sm cursor-pointer">
                <span>🌐</span> <span>HTML</span>
              </button>
            </div>
          </div>

          <!-- Month Selector UI (Running Month + Archive Dropdown) -->
          <div class="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              ${HELPERS.renderMonthSelectorUI(months, this.selectedMonth, 'MonthlyReportView.handleMonthSelect')}
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold">
                📑 Total Deck: <strong>${totalPresentationSlides} Slides</strong>
              </span>
              <span class="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                ⚙️ Task Slides: <strong>${activeSlides.length}</strong>
              </span>
            </div>
          </div>
        </div>

        <!-- SLIDE PRESENTATION DECK OVERVIEW SECTION (Requirement 3: Sequential Slide-by-Slide Cards) -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
          
          <!-- Section Title & Filters -->
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  🗂️
                </span>
                <h3 class="text-base font-black text-slate-900">Monthly Report Complete Slide Sequence</h3>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                Every slide is listed in exact presentation order. Click <span class="font-bold text-blue-600">✏️ Edit Slide</span> to override texts or milestones before export.
              </p>
            </div>

            <!-- Search Box & Counter -->
            <div class="flex items-center gap-3 w-full md:w-auto">
              <div class="relative flex-1 md:w-64">
                <input type="text" oninput="MonthlyReportView.handleSearch(this.value)" placeholder="Search slides by title, engineer..." 
                       class="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 font-medium" />
                <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>
              <span id="monthly-report-filtered-counter" class="text-xs font-mono text-slate-500 whitespace-nowrap">
                Showing all ${displayedSlides.length} task slides
              </span>
            </div>
          </div>

          <!-- Engineer Filter Pills -->
          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            <span class="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider pr-1">Filter Concern:</span>
            <button onclick="MonthlyReportView.handleEngineerFilter('')" 
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition border ${!this.filterEngineer ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
              All Engineers (${activeSlides.length})
            </button>
            ${uniqueEngineers.map(eng => {
              const isSel = (this.filterEngineer.toLowerCase() === eng.toLowerCase());
              const count = activeSlides.filter(s => isEngMatch(s.engineer)).length;
              return `
                <button onclick="MonthlyReportView.handleEngineerFilter('${HELPERS.escapeHtml(eng)}')" 
                        class="px-3 py-1.5 rounded-xl text-xs font-bold transition border ${isSel ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
                  👤 ${HELPERS.escapeHtml(eng)}
                </button>
              `;
            }).join('')}
          </div>

          <!-- SEQUENTIAL SLIDE DECK GRID -->
          <div class="space-y-4">
            
            <!-- Slide 1: Cover Slide Card -->
            <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <span class="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-400 font-mono font-black text-sm flex items-center justify-center flex-shrink-0">
                  #1
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500 text-white">COVER SLIDE</span>
                    <span class="text-xs font-mono text-slate-400">Opening Presentation</span>
                  </div>
                  <h4 class="text-base font-black text-white mt-1">AC Process Development Monthly Report</h4>
                  <p class="text-xs text-slate-300">Walton Hi-Tech Industries PLC &bull; Department of Process Development &bull; ${month}</p>
                </div>
              </div>
              <button onclick="MonthlyReportView.previewFullDeck()" class="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 border border-white/20">
                <span>👁️</span> <span>Preview Cover</span>
              </button>
            </div>

            <!-- Slide 2: Executive Dashboard & Performance Summary Card -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <span class="w-10 h-10 rounded-xl bg-blue-600 text-white font-mono font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                  #2
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-600 text-white">DASHBOARD SLIDE</span>
                    <span class="text-xs font-mono text-indigo-700">Executive Performance Matrix</span>
                  </div>
                  <h4 class="text-base font-black text-slate-900 mt-1">Executive Summary, Points &amp; Process Metrics</h4>
                  <p class="text-xs text-slate-600">Total Registered Tasks: <strong>${allTasks.length}</strong> &bull; Total Slide Candidates: <strong>${activeSlides.length}</strong> &bull; Departmental KPI Analysis</p>
                </div>
              </div>
              <button onclick="MonthlyReportView.previewFullDeck()" class="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 shadow-xs">
                <span>👁️</span> <span>Preview Dashboard</span>
              </button>
            </div>

            <!-- Slides 3+: Task Slides Sequence Grid (Editorial Overrides Hub) -->
            <div class="space-y-3">
              <div class="flex items-center justify-between pt-2">
                <span class="text-xs font-mono font-black text-slate-700 uppercase tracking-wider">
                  📋 Task Presentation Slides (Slides #3 to #${activeSlides.length + 2})
                </span>
                <span class="text-xs text-slate-500 font-medium">1 Task = 1 Presentation Slide</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${displayedSlides.length === 0 ? `
                  <div class="col-span-full py-12 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 text-xs font-mono">
                    No active slides match the current filter in ${month}.
                  </div>
                ` : displayedSlides.map((s, idx) => {
                  const hasPhoto = Boolean(s.photo_before || s.photo_after || s.photo);
                  const isOverridden = Boolean(s.has_manual_override);

                  return `
                    <div class="task-slide-card bg-white border ${isOverridden ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'} rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:border-blue-300 hover:shadow-sm transition space-y-3">
                      <div>
                        <!-- Slide Top Indicator -->
                        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span class="text-[10px] font-mono font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            Slide #${idx + 3}
                          </span>
                          <div class="flex items-center gap-1.5">
                            ${isOverridden ? `
                              <span class="text-[9px] font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded" title="Slide content edited manually">
                                ✏️ Overridden
                              </span>
                            ` : ''}
                            <span class="text-[10px] font-mono text-slate-400">${s.task_id}</span>
                          </div>
                        </div>

                        <!-- Title & Meta -->
                        <h4 class="text-xs font-bold text-slate-900 mt-2 line-clamp-2 leading-snug" title="${HELPERS.escapeHtml(s.slide_title)}">
                          ${HELPERS.escapeHtml(s.slide_title)}
                        </h4>
                        
                        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span class="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            👤 ${HELPERS.escapeHtml(s.engineer)}
                          </span>
                          <span class="text-[10px] text-slate-500 font-medium">
                            ⚙️ ${HELPERS.escapeHtml(s.category || 'Process')}
                          </span>
                          <span class="text-[10px] font-mono ${hasPhoto ? 'text-emerald-600' : 'text-slate-400'}">
                            ${hasPhoto ? '📷 Photo Added' : '📷 No Photo'}
                          </span>
                        </div>

                        <!-- Description Preview -->
                        <p class="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                          ${HELPERS.escapeHtml(s.description || 'No milestone description')}
                        </p>
                      </div>

                      <!-- Slide Card Actions -->
                      <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button onclick="SlidePreviewModal.openSingle(window.appState.syncEngine.getActiveSlides('${month}')[${idx}])" class="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer">
                          <span>👁️</span> <span>Preview</span>
                        </button>
                        <button onclick="MonthlyReportView.openModal('${s.task_id}')" class="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-xs font-bold text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 shadow-2xs transition flex items-center gap-1 cursor-pointer">
                          <span>✏️</span> <span>Edit Slide</span>
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Slide N+1: Top 5 Completed & Ongoing Summary Slide Card -->
            <div class="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <span class="w-10 h-10 rounded-xl bg-red-600 text-white font-mono font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                  #${activeSlides.length + 3}
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white">SUMMARY SLIDE</span>
                    <span class="text-xs font-mono text-red-700">Strategic Milestones</span>
                  </div>
                  <h4 class="text-base font-black text-slate-900 mt-1">Top 5 Completed &amp; Ongoing Works Summary</h4>
                  <p class="text-xs text-slate-600">Headline completed works and active carried-over projects with timeline targets.</p>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button onclick="App.switchTab('top5-summary')" class="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-red-700 border border-red-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                  <span>✏️</span> <span>Edit Top 5</span>
                </button>
                <button onclick="MonthlyReportView.previewFullDeck()" class="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                  <span>👁️</span> <span>Preview</span>
                </button>
              </div>
            </div>

            <!-- Slide N+2: Concluding Slide Card -->
            <div class="bg-slate-900 text-white rounded-2xl p-5 border border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <span class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono font-black text-sm flex items-center justify-center flex-shrink-0">
                  #${activeSlides.length + 4}
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-700 text-white">CLOSING SLIDE</span>
                    <span class="text-xs font-mono text-slate-400">Final Slide</span>
                  </div>
                  <h4 class="text-base font-black text-white mt-1">Thank You &bull; Continuous Process Improvement</h4>
                  <p class="text-xs text-slate-400">Process Development Team &bull; Walton Hi-Tech Industries PLC</p>
                </div>
              </div>
              <button onclick="MonthlyReportView.previewFullDeck()" class="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 border border-white/20">
                <span>👁️</span> <span>Preview Closing</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonthlyReportView;
} else if (typeof window !== 'undefined') {
  window.MonthlyReportView = MonthlyReportView;
}
