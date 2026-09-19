/**
 * Process Development Monthly Report Automation System
 * Module: Export Controller & Master Report Pipeline
 * Coordinates PPTX + PDF + HTML generation with selectable Output Design Patterns
 * Supported Patterns:
 * 1. Walton Executive Crimson (Classic Red Executive Layout)
 * 2. Industrial Innovation Blue (High-Tech Modern Blue Layout - Image 3)
 * WALTON Hi-Tech Industries PLC
 */

const ExportController = {
  selectedTemplate: "walton_executive_crimson",
  activeExportMonth: "SEP-2026",

  handleSelectTemplate(tmpl) {
    this.selectedTemplate = tmpl || "walton_executive_crimson";
    const cardCrimson = document.getElementById('tmpl-card-crimson');
    const cardBlue = document.getElementById('tmpl-card-blue');
    if (cardCrimson && cardBlue) {
      if (this.selectedTemplate === 'walton_executive_crimson') {
        cardCrimson.className = "cursor-pointer border-2 border-red-600 bg-red-50/50 shadow-md rounded-2xl p-4 transition flex items-center gap-3.5";
        cardBlue.className = "cursor-pointer border-2 border-slate-200 bg-white hover:border-slate-300 rounded-2xl p-4 transition flex items-center gap-3.5";
      } else {
        cardCrimson.className = "cursor-pointer border-2 border-slate-200 bg-white hover:border-slate-300 rounded-2xl p-4 transition flex items-center gap-3.5";
        cardBlue.className = "cursor-pointer border-2 border-sky-600 bg-sky-50/50 shadow-md rounded-2xl p-4 transition flex items-center gap-3.5";
      }
    }

    // Real-time update of Online Report shareable URL
    const urlInput = document.getElementById('online-report-url-input');
    if (urlInput) {
      urlInput.value = this.getOnlineReportUrl(this.activeExportMonth, this.selectedTemplate);
    }

    // Update bottom status bar format indicator
    const formatLabel = document.getElementById('modal-active-format-label');
    if (formatLabel) {
      formatLabel.textContent = this.selectedTemplate === 'industrial_innovation_blue' ? 'Industrial Blue (Pattern 2)' : 'Executive Crimson (Pattern 1)';
    }
  },

  /**
   * Generates unique shareable Online Report URL for given month and pattern
   * E.g. /report/sep-2026/pattern-1 or /report/sep-2026/pattern-2
   */
  getOnlineReportUrl(selectedMonth = "SEP-2026", template = null) {
    const tmpl = template || this.selectedTemplate || "walton_executive_crimson";
    const patternSlug = tmpl === "industrial_innovation_blue" ? "pattern-2" : "pattern-1";
    const monthSlug = (selectedMonth || "SEP-2026").toLowerCase().replace(/[^a-z0-9]/g, "-");

    if (typeof window === 'undefined') {
      return `/#/report/${monthSlug}/${patternSlug}`;
    }

    if (window.location.protocol === 'file:') {
      const base = window.location.href.split('?')[0].split('#')[0];
      return `${base}#/report/${monthSlug}/${patternSlug}`;
    }

    const origin = window.location.origin || '';
    return `${origin}/#/report/${monthSlug}/${patternSlug}`;
  },

  /**
   * Copies shareable Online Report URL to clipboard
   */
  copyOnlineReportUrl(selectedMonth = "SEP-2026") {
    const month = selectedMonth || this.activeExportMonth || "SEP-2026";
    const url = this.getOnlineReportUrl(month, this.selectedTemplate);
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
          window.showToast("📋 Online Report URL copied to clipboard!", "success");
        } else {
          alert("Online Report URL copied to clipboard:\n" + url);
        }
      }).catch(() => {
        prompt("Copy Online Report URL:", url);
      });
    } else {
      prompt("Copy Online Report URL:", url);
    }
  },

  /**
   * Opens the Online Report in a new browser tab or current stage
   */
  openOnlineReport(selectedMonth = "SEP-2026", inSameTab = false) {
    const month = selectedMonth || this.activeExportMonth || "SEP-2026";
    const url = this.getOnlineReportUrl(month, this.selectedTemplate);
    if (inSameTab && typeof App !== 'undefined' && App.renderOnlineReport) {
      this.closeExportModal();
      App.renderOnlineReport(month, this.selectedTemplate);
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  },

  /**
   * Opens the report generation modal with layout options
   */
  generateReport(selectedMonth = "SEP-2026") {
    return this.openExportModal(selectedMonth);
  },

  /**
   * Constructs comprehensive report data bundle including dashboard and top works datasets
   */
  async buildReportPayload(selectedMonth = "SEP-2026", template = null) {
    const syncEngine = window.appState && window.appState.syncEngine
      ? window.appState.syncEngine
      : new SyncEngine();

    // Ensure sync has run
    await syncEngine.syncMonth(selectedMonth);
    const activeSlides = syncEngine.getActiveSlides(selectedMonth);

    // 1. Resolve Top Works Data from TopWorksManager
    let topWorksData = null;
    if (typeof TopWorksManager !== 'undefined') {
      topWorksData = TopWorksManager.getTopWorksForMonth(selectedMonth);
    } else {
      topWorksData = {
        completedTop5: ["", "", "", "", ""],
        ongoingTop5: [
          { sl: 1, name: "CNC Tube Bending & End Shaping M/C Automation Development", progress: "Trail run and modification ongoing", deadline: "Oct, 2026" },
          { sl: 2, name: "CNC Turret Punch Machine Project", progress: "Machine manufacturing almost done; PSI preparation ongoing", deadline: "Oct, 2026" },
          { sl: 3, name: "Evaporator Brazing Fixture for without water brazing", progress: "One model running under observation and working for rest model", deadline: "Sep, 2026" },
          { sl: 4, name: "MPE Tube rust repair process development", progress: "Mass production trial ongoing", deadline: "Oct, 2026" },
          { sl: 5, name: "New fin material (Aluzinc Sheet) supplier (MAX) development for Evaporator and condenser", progress: "All test completed, Trial production lot order is ongoing", deadline: "Dec, 2026" }
        ]
      };
    }

    // 2. Resolve Monthly Cost Savings from CostSavingTracker
    let costData = null;
    if (typeof CostSavingTracker !== 'undefined') {
      costData = CostSavingTracker.calculate(activeSlides, selectedMonth);
    } else {
      costData = {
        monthlySavings: [
          { m: "April", val: "BDT 0" },
          { m: "May", val: "BDT 0" },
          { m: "June", val: "BDT 0" },
          { m: "July", val: "BDT 0" },
          { m: "August", val: "BDT 0" },
          { m: "September", val: "BDT 0" }
        ],
        currentImpact: "0 TK",
        currentMonthLabel: selectedMonth,
        yearlyImpact: "0 TK",
        currentCostBDT: 0,
        yearlyCostBDT: 0
      };
    }

    // 3. Dynamic Category Counting for the 8 KPI Cards
    let processCount = 0;
    let toolsCount = 0;
    let partsCount = 0;
    let costCount = 0;
    let manpowerCount = 0;
    let bomCount = 0;
    let completedCount = 0;
    let ongoingCount = 0;

    activeSlides.forEach(s => {
      const cat = (s.category || '').toLowerCase();
      const title = (s.slide_title || s.task_name || '').toLowerCase();
      const status = (s.status || '').toLowerCase();

      if (cat.includes('process') || title.includes('process')) processCount++;
      if (cat.includes('tool') || title.includes('tool') || title.includes('die') || title.includes('fixture')) toolsCount++;
      if (cat.includes('part') || cat.includes('component') || title.includes('part')) partsCount++;
      if (cat.includes('cost') || cat.includes('saving') || title.includes('cost') || title.includes('saving')) costCount++;
      if (cat.includes('manpower') || title.includes('manpower')) manpowerCount++;
      if (cat.includes('bom') || title.includes('bom')) bomCount++;
    });

    // Strategic projects counts directly from Projects section
    const allRawTasks = (syncEngine && syncEngine.workbookMgr)
      ? syncEngine.workbookMgr.getTasksForMonth(selectedMonth)
      : [];

    const projectTasks = allRawTasks.filter(t => {
      const cat = (t.category || '').toLowerCase();
      const name = (t.task_name || '').toLowerCase();
      return Boolean(t.is_project || cat.includes('project') || name.includes('project'));
    });

    const ongoingProjList = projectTasks.filter(t => {
      const status = (t.status || t.project_status || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      return !status.includes('complete') && !cat.includes('completed project');
    });

    const completedProjList = projectTasks.filter(t => {
      const status = (t.status || t.project_status || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      return status.includes('complete') || cat.includes('completed project');
    });

    completedCount = completedProjList.length;
    ongoingCount = ongoingProjList.length;

    if (ongoingCount === 0 && topWorksData && topWorksData.ongoingTop5) {
      ongoingCount = topWorksData.ongoingTop5.filter(p => p.name && p.name.trim()).length;
    }

    const kpis = [
      { val: `${processCount}`, label: "Process Developed", icon: "⚙️", note: null },
      { val: `${toolsCount}`, label: "Tools Developed", icon: "🛠️", note: null },
      { val: `${partsCount}`, label: "Parts Developed", icon: "🔲", note: null },
      { val: `${costCount}`, label: "Cost Optimisation", icon: "💰", note: (costData.yearlyImpact !== "0 TK" ? `Cost Saved: BDT ${costData.yearlyImpact}/Year` : null) },
      { val: `${manpowerCount}`, label: "Manpower Optimization", icon: "👥", note: null },
      { val: `${bomCount}`, label: "BOM Verification", icon: "📋", note: null },
      { val: `${completedCount}`, label: "Completed Projects", icon: "✅", note: (costData.currentImpact !== "0 TK" ? `Cost Saved: ${costData.currentImpact}` : null) },
      { val: `${ongoingCount}`, label: "New Projects / Ongoing", icon: "🚀", note: "Cost Save Scope: Target FY 26-27" }
    ];

    // Order slides: Standard process tasks first, followed by Completed Projects & Ongoing Projects right before the final summary slide
    const standardSlides = [];
    const completedProjectSlides = [];
    const ongoingProjectSlides = [];

    activeSlides.forEach(s => {
      const cat = (s.category || '').toLowerCase();
      const title = (s.slide_title || s.raw_task_name || s.task_name || '').toLowerCase();
      const status = (s.status || s.project_status || '').toLowerCase();
      const isProj = Boolean(s.is_project || cat.includes('project') || title.includes('project'));

      if (isProj) {
        if (status.includes('complete') || cat.includes('completed project')) {
          completedProjectSlides.push({ ...s, is_project: true, project_status: "Completed" });
        } else {
          ongoingProjectSlides.push({ ...s, is_project: true, project_status: "Ongoing" });
        }
      } else {
        standardSlides.push(s);
      }
    });

    const orderedSlides = [...standardSlides, ...completedProjectSlides, ...ongoingProjectSlides];

    const reportData = {
      month: selectedMonth,
      template: template || this.selectedTemplate || "walton_executive_crimson",
      slides: orderedSlides,
      totalTasks: orderedSlides.length,
      kpis: {
        yearlyImpact: `৳ ${costData.yearlyImpact}`,
        monthlyImpact: `৳ ${costData.currentImpact}`,
        processDeveloped: processCount,
        bomPhysicalObservations: bomCount
      },
      dashboardData: {
        monthlySavings: costData.monthlySavings,
        currentImpact: costData.currentImpact,
        currentMonthLabel: selectedMonth,
        yearlyImpact: costData.yearlyImpact,
        kpis: kpis
      },
      topWorksData: topWorksData
    };

    return { reportData, activeSlides };
  },

  /**
   * Export 100% Editable PowerPoint (PPTX)
   */
  async exportPPTX(selectedMonth = "SEP-2026", template = null) {
    const tmpl = template || this.selectedTemplate || "walton_executive_crimson";
    try {
      const { reportData, activeSlides } = await this.buildReportPayload(selectedMonth, tmpl);
      if (activeSlides.length === 0) {
        alert(`No active report slides found for ${selectedMonth}. Please add tasks and include them.`);
        return null;
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`Generating Editable PPTX (${tmpl === 'industrial_innovation_blue' ? 'Industrial Blue' : 'Executive Crimson'})...`, "info");
      }

      const pptxGen = window.pptxGenerator || (typeof PPTXGenerator !== 'undefined' ? new PPTXGenerator() : null);
      if (!pptxGen) {
        throw new Error("PPTX Generator engine not available");
      }

      const fileName = await pptxGen.generatePresentation(reportData, tmpl);
      return fileName;
    } catch (err) {
      console.error("PPTX Export failed:", err);
      alert("PPTX Export error: " + err.message);
      return null;
    }
  },

  /**
   * Export Standalone Portable HTML Deck
   */
  async exportHTML(selectedMonth = "SEP-2026", template = null) {
    const tmpl = template || this.selectedTemplate || "walton_executive_crimson";
    try {
      const { reportData, activeSlides } = await this.buildReportPayload(selectedMonth, tmpl);
      if (activeSlides.length === 0) {
        alert(`No active report slides found for ${selectedMonth}. Please add tasks and include them.`);
        return null;
      }

      const htmlContent = HTMLReportGenerator.generateStandaloneHTML(reportData, tmpl);
      const htmlBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const htmlUrl = URL.createObjectURL(htmlBlob);
      const a = document.createElement('a');
      a.href = htmlUrl;
      const tmplTag = tmpl === 'industrial_innovation_blue' ? 'Industrial_Blue' : 'Executive_Crimson';
      a.download = `Monthly_Report_${selectedMonth.replace(/[^a-zA-Z0-9]/g, '_')}_${tmplTag}.html`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(htmlUrl), 1000);
      return a.download;
    } catch (err) {
      console.error("HTML Export failed:", err);
      alert("HTML Export error: " + err.message);
      return null;
    }
  },

  /**
   * Export Vector PDF
   */
  async exportPDF(selectedMonth = "SEP-2026", template = null) {
    const tmpl = template || this.selectedTemplate || "walton_executive_crimson";
    try {
      const { reportData, activeSlides } = await this.buildReportPayload(selectedMonth, tmpl);
      if (activeSlides.length === 0) {
        alert(`No active report slides found for ${selectedMonth}. Please add tasks and include them.`);
        return null;
      }

      return await PDFReportGenerator.generatePDF(reportData, tmpl);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("PDF Export error: " + err.message);
      return null;
    }
  },

  renderModalContainer() {
    let container = document.getElementById('export-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'export-modal-container';
      document.body.appendChild(container);
    }
    return container;
  },

  closeExportModal() {
    const container = document.getElementById('export-modal-container');
    if (container) container.innerHTML = '';
  },

  /**
   * Opens the Walton Executive Export Center modal with direct template format selection
   */
  async openExportModal(selectedMonth = "SEP-2026") {
    this.activeExportMonth = selectedMonth;
    const { reportData, activeSlides } = await this.buildReportPayload(selectedMonth);
    if (activeSlides.length === 0) {
      alert(`No active report slides found for ${selectedMonth}. Please add tasks and set inclusion to YES first.`);
      return;
    }

    const totalSlides = activeSlides.length + 4;
    const container = this.renderModalContainer();

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
        <div class="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 flex flex-col">
          
          <!-- Header -->
          <div class="flex items-start justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3.5">
              <img src="assets/img/walton_logo.png" alt="WALTON" class="h-10 w-auto object-contain flex-shrink-0 drop-shadow-sm">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white shadow-sm">
                    WALTON EXECUTIVE EXPORT CENTER
                  </span>
                  <span class="text-xs font-mono text-slate-400">${selectedMonth} &bull; ${totalSlides} Slides</span>
                </div>
                <h2 class="text-xl font-black text-slate-800 mt-1">Download Monthly Engineering Report</h2>
                <p class="text-xs text-slate-400 mt-0.5">Select your preferred design pattern and download in PPTX, HTML, PDF, or view Online.</p>
              </div>
            </div>
            <button onclick="ExportController.closeExportModal()" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- DESIGN PATTERN / FORMAT SELECTION (2 UNIQUE FORMATS) -->
          <div class="mt-5 mb-3">
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Step 1: Choose Slide Design Pattern
              </span>
              <span class="text-[11px] text-slate-400">Click to switch design theme</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              <!-- Pattern 1: Walton Executive Crimson -->
              <div id="tmpl-card-crimson" onclick="ExportController.handleSelectTemplate('walton_executive_crimson')" 
                   class="cursor-pointer border-2 ${this.selectedTemplate === 'walton_executive_crimson' ? 'border-red-600 bg-red-50/50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'} rounded-2xl p-4 transition flex items-center gap-3.5">
                <div class="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-lg flex-shrink-0 shadow-sm shadow-red-200">
                  W
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <h4 class="text-xs font-black text-slate-800 truncate">Walton Executive Crimson</h4>
                    <span class="text-[10px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">Pattern 1</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Classic Walton Red executive layout with dual-aspect metrics</p>
                </div>
              </div>

              <!-- Pattern 2: Industrial Innovation Blue (Image 3) -->
              <div id="tmpl-card-blue" onclick="ExportController.handleSelectTemplate('industrial_innovation_blue')" 
                   class="cursor-pointer border-2 ${this.selectedTemplate === 'industrial_innovation_blue' ? 'border-sky-600 bg-sky-50/50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'} rounded-2xl p-4 transition flex items-center gap-3.5">
                <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white flex items-center justify-center font-black text-lg flex-shrink-0 shadow-sm shadow-sky-200">
                  💎
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <h4 class="text-xs font-black text-slate-800 truncate">Industrial Innovation Blue</h4>
                    <span class="text-[10px] font-mono font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">Pattern 2</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5 line-clamp-1">High-tech modern industrial blue design with hero photo</p>
                </div>
              </div>

            </div>
          </div>

          <!-- Format Cards Grid (4 Formats) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-3">
            
            <!-- 1. PowerPoint (.pptx) -->
            <div class="bg-white border border-slate-200 hover:border-red-300 rounded-2xl p-5 flex flex-col justify-between transition group shadow-sm hover:shadow-md">
              <div>
                <div class="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-2xl mb-3 group-hover:scale-105 transition">
                  📊
                </div>
                <h3 class="text-sm font-black text-slate-800">PowerPoint (.pptx)</h3>
                <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  100% native editable OpenXML slides formatted with your selected design pattern.
                </p>
                <div class="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 font-bold">
                  <span>✔</span> <span>Editable in MS PowerPoint</span>
                </div>
              </div>
              <button id="btn-export-pptx" onclick="ExportController.handleDownloadPPTX('${selectedMonth}')" class="mt-5 w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-black text-white shadow-lg shadow-red-200/40 transition flex items-center justify-center gap-2">
                <span>Download .pptx</span>
              </button>
            </div>

            <!-- 2. Standalone Presentation (.html) -->
            <div class="bg-white border border-slate-200 hover:border-sky-300 rounded-2xl p-5 flex flex-col justify-between transition group shadow-sm hover:shadow-md">
              <div>
                <div class="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center text-2xl mb-3 group-hover:scale-105 transition">
                  🌐
                </div>
                <h3 class="text-sm font-black text-slate-800">Standalone HTML</h3>
                <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Single portable offline presentation file. Fullscreen stage, keyboard navigation.
                </p>
                <div class="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-sky-600 font-bold">
                  <span>✔</span> <span>Works in any web browser</span>
                </div>
              </div>
              <button id="btn-export-html" onclick="ExportController.handleDownloadHTML('${selectedMonth}')" class="mt-5 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-xs font-black text-sky-600 border border-slate-200 transition flex items-center justify-center gap-2 shadow-sm">
                <span>Download .html</span>
              </button>
            </div>

            <!-- 3. Vector PDF (.pdf) -->
            <div class="bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-5 flex flex-col justify-between transition group shadow-sm hover:shadow-md">
              <div>
                <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-2xl mb-3 group-hover:scale-105 transition">
                  📄
                </div>
                <h3 class="text-sm font-black text-slate-800">Vector PDF</h3>
                <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  High-resolution vector PDF export. Crisp 16:9 landscape layout for executive distribution.
                </p>
                <div class="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-amber-600 font-bold">
                  <span>✔</span> <span>Crisp vector format</span>
                </div>
              </div>
              <button id="btn-export-pdf" onclick="ExportController.handleDownloadPDF('${selectedMonth}')" class="mt-5 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-xs font-black text-amber-600 border border-slate-200 transition flex items-center justify-center gap-2 shadow-sm">
                <span>Download PDF</span>
              </button>
            </div>

            <!-- 4. Online Report -->
            <div class="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 flex flex-col justify-between transition group shadow-sm hover:shadow-md">
              <div>
                <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-2xl mb-3 group-hover:scale-105 transition">
                  ⚡
                </div>
                <div class="flex items-center gap-1.5">
                  <h3 class="text-sm font-black text-slate-800">Online Report</h3>
                  <span class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-100 text-indigo-700 font-mono">LIVE WEB</span>
                </div>
                <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Interactive online report with slide navigation, fullscreen mode, and shareable URL.
                </p>
                <div class="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-indigo-600 font-bold">
                  <span>✔</span> <span>Zero install &bull; Shareable link</span>
                </div>
              </div>
              <button onclick="ExportController.openOnlineReport('${selectedMonth}')" class="mt-5 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black text-white shadow-md shadow-indigo-200/40 transition flex items-center justify-center gap-2">
                <span>Open Online Report ↗</span>
              </button>
            </div>

          </div>

          <!-- ONLINE REPORT READY BANNER -->
          <div class="mt-1 mb-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-lg">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <span class="flex h-3 w-3 relative">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-black tracking-wider uppercase font-mono text-emerald-400">ONLINE REPORT READY</span>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Shareable URL</span>
                  </div>
                  <div class="text-[11px] text-slate-300 mt-0.5">Direct interactive link matching your active design pattern:</div>
                </div>
              </div>
              <div class="flex items-center gap-2 w-full sm:w-auto">
                <button onclick="ExportController.openOnlineReport('${selectedMonth}', true)" class="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition flex items-center justify-center gap-1.5 backdrop-blur-sm" title="View interactive presentation directly">
                  <span>⛶</span> <span>View Fullscreen</span>
                </button>
                <button onclick="ExportController.copyOnlineReportUrl('${selectedMonth}')" class="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition flex items-center justify-center gap-1.5 backdrop-blur-sm">
                  <span>📋</span> <span>Copy Link</span>
                </button>
                <button onclick="ExportController.openOnlineReport('${selectedMonth}')" class="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-500/30 transition flex items-center justify-center gap-1.5">
                  <span>Open Online Report ↗</span>
                </button>
              </div>
            </div>
            <div class="mt-3 flex items-center gap-2 bg-black/40 border border-indigo-500/20 rounded-xl px-3 py-2">
              <span class="text-xs text-indigo-400 font-mono select-none">🔗</span>
              <input id="online-report-url-input" type="text" readonly value="${this.getOnlineReportUrl(selectedMonth, this.selectedTemplate)}" class="bg-transparent text-xs font-mono text-slate-200 focus:outline-none w-full truncate cursor-pointer select-all" onclick="this.select()">
            </div>
          </div>

          <!-- Bottom Master Action Bar -->
          <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div class="text-slate-400 flex items-center gap-2">
              <span class="text-emerald-600 font-bold">● System Ready</span>
              <span>&bull;</span>
              <span>Format: <strong id="modal-active-format-label" class="text-slate-700">${this.selectedTemplate === 'industrial_innovation_blue' ? 'Industrial Blue (Pattern 2)' : 'Executive Crimson (Pattern 1)'}</strong></span>
            </div>
            <div class="flex items-center gap-3 w-full sm:w-auto">
              <button onclick="ExportController.closeExportModal()" class="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold shadow-sm">
                Close
              </button>
              <button id="btn-export-all" onclick="ExportController.handleDownloadAll('${selectedMonth}')" class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black shadow-xl shadow-red-200/50 transition flex items-center justify-center gap-2">
                <span>🚀</span>
                <span>Download All Formats</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  async handleDownloadPPTX(selectedMonth) {
    const btn = document.getElementById('btn-export-pptx');
    if (btn) btn.innerHTML = '⌛ Generating PPTX...';
    try {
      const fileName = await this.exportPPTX(selectedMonth, this.selectedTemplate);
      if (fileName) {
        if (btn) btn.innerHTML = '✔ Downloaded PPTX';
      } else {
        if (btn) btn.innerHTML = 'Download .pptx';
      }
    } catch (e) {
      alert("PowerPoint export failed: " + e.message);
      if (btn) btn.innerHTML = 'Download .pptx';
    }
  },

  async handleDownloadHTML(selectedMonth) {
    const btn = document.getElementById('btn-export-html');
    if (btn) btn.innerHTML = '⌛ Generating HTML...';
    try {
      const fileName = await this.exportHTML(selectedMonth, this.selectedTemplate);
      if (fileName) {
        if (btn) btn.innerHTML = '✔ Downloaded HTML';
      } else {
        if (btn) btn.innerHTML = 'Download .html';
      }
    } catch (e) {
      alert("HTML export failed: " + e.message);
      if (btn) btn.innerHTML = 'Download .html';
    }
  },

  async handleDownloadPDF(selectedMonth) {
    const btn = document.getElementById('btn-export-pdf');
    if (btn) btn.innerHTML = '⌛ Generating PDF...';
    try {
      const res = await this.exportPDF(selectedMonth, this.selectedTemplate);
      if (btn) btn.innerHTML = '✔ Downloaded PDF';
    } catch (e) {
      alert("PDF export failed: " + e.message);
      if (btn) btn.innerHTML = 'Download PDF';
    }
  },

  async handleDownloadAll(selectedMonth) {
    const btn = document.getElementById('btn-export-all');
    if (btn) btn.innerHTML = '<span>⌛</span> <span>Generating All Formats...</span>';
    try {
      await this.exportPPTX(selectedMonth, this.selectedTemplate);
      await this.exportHTML(selectedMonth, this.selectedTemplate);
      await this.exportPDF(selectedMonth, this.selectedTemplate);
      if (btn) btn.innerHTML = '<span>✔</span> <span>All Formats Generated!</span>';
    } catch (e) {
      alert("Bulk export failed: " + e.message);
      if (btn) btn.innerHTML = '<span>🚀</span> <span>Download All Formats</span>';
    }
  },

  /**
   * Opens online cloud presentation link with permission verification
   * Automatically creates a new presentation document if default
   */
  openOnlineDocs(selectedMonth) {
    const defaultOwner = "nipu.ruet10@gmail.com";
    const allowedEmailsStr = localStorage.getItem('walton_online_docs_emails') || '';
    let targetUrl = (localStorage.getItem('walton_google_slides_url') || '').trim();
    
    // Check permission if restriction list is configured
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

    // If no custom presentation URL is set, or if set to the generic dashboard,
    // open the official Google Slides document creation URL to create a real file!
    if (!targetUrl || targetUrl === 'https://docs.google.com/presentation/u/0/' || targetUrl === 'https://docs.google.com/presentation/u/0') {
      targetUrl = 'https://docs.google.com/presentation/u/0/create';
    }

    // Open Google Slides presentation in a new tab
    window.open(targetUrl, '_blank');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportController;
} else if (typeof window !== 'undefined') {
  window.ExportController = ExportController;
}
