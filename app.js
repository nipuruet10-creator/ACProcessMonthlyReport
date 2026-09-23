/**
 * Process Development Monthly Report Automation System
 * Module: Main Application Coordinator (app.js)
 * Implements Central State, 9 Navigation Tabs, and Idempotent Sync Coordination
 * WALTON Hi-Tech Industries PLC
 */

const App = {
  currentTab: 'monthly-input', // Default to Monthly Input for fast engineer entry

  async init() {
    console.log("Initializing Walton AC Process Monthly Report Automation System...");

    // Storage Quota Self-Healing: Clean up bloated legacy keys from LocalStorage
    try {
      const keysToClean = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("walton_pd_active_slides_") || k === "walton_pd_task_photos_v1")) {
          const val = localStorage.getItem(k);
          if (val && val.length > 200000) {
            keysToClean.push(k);
          }
        }
      }
      keysToClean.forEach(k => {
        if (k === "walton_pd_task_photos_v1") {
          localStorage.removeItem(k);
        } else {
          try {
            const parsed = JSON.parse(localStorage.getItem(k));
            if (Array.isArray(parsed)) {
              parsed.forEach(s => { s.photo = null; s.photo_before = null; s.photo_after = null; });
              localStorage.setItem(k, JSON.stringify(parsed));
            }
          } catch(e) {
            localStorage.removeItem(k);
          }
        }
      });
    } catch (e) {
      console.warn("Storage self-healing notice:", e);
    }

    // Initialize Database & Local Storage
    if (typeof db !== 'undefined' && db.init) {
      await db.init();
    }

    // Instantiate Central State
    const workbookMgr = new MonthWorkbookManager();
    const breakdownSheet = new AIBreakdownSheet();
    const aiClient = geminiClient;
    const photoMgr = photoManager;
    const syncEngine = new SyncEngine(workbookMgr, breakdownSheet, aiClient, photoMgr);

    window.appState = {
      workbookMgr,
      breakdownSheet,
      aiClient,
      geminiClient,
      photoMgr,
      photoManager,
      syncEngine,
      switchTab: (t) => App.switchTab(t),
      get activeTab() { return App.currentTab; },
      get monthlyInputView() { return typeof MonthlyInputView !== 'undefined' ? MonthlyInputView : null; },
      get dashboardView() { return typeof DashboardController !== 'undefined' ? DashboardController : null; }
    };

    // Setup global toast function
    window.showToast = this.showToast.bind(this);

    // Render User Badge
    this.renderUserBadge();

    // Listen for browser navigation changes (Online Report SPA routing)
    window.addEventListener('popstate', () => {
      const r = this.parseReportRoute();
      if (r.isReport) {
        this.renderOnlineReport(r.month, r.template);
      } else {
        this.exitOnlineReport();
      }
    });

    // Detect Online Report Deep-Link URL
    const reportRoute = this.parseReportRoute();
    if (reportRoute.isReport) {
      await this.renderOnlineReport(reportRoute.month, reportRoute.template);
      console.log(`Mounted Online Report for ${reportRoute.month} (${reportRoute.template})`);
      return;
    }

    // INSTANT UI RENDER (< 25ms): Immediately display Monthly Task Entry Grid without waiting for heavy network sync
    await this.switchTab(this.currentTab);

    // Initialize Google Firebase Realtime Database Engine (Sub-50ms Collaborative Sync)
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.init) {
      FirebaseSyncService.init();
    }

    // Initialize Google Sheets Cloud Sync Engine
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.init) {
      GoogleSheetsSync.init();
    }

    // Background Non-blocking Slide Sync Pipeline (Runs smoothly without freezing UI)
    syncEngine.syncMonth(workbookMgr.activeMonth).catch(e => {
      console.warn("Background sync notification:", e);
    });

    console.log("System initialized successfully.");
  },

  async switchTab(tabId) {
    this.currentTab = tabId;

    // Update Navigation Tab UI Buttons (Executive Sidebar Style from Mockup)
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('bg-[#2563EB]', 'text-white', 'shadow-md', 'shadow-blue-500/25');
        btn.classList.remove('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
      } else {
        btn.classList.remove('bg-[#2563EB]', 'text-white', 'shadow-md', 'shadow-blue-500/25');
        btn.classList.add('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
      }
    });

    // Hide all view containers
    document.querySelectorAll('.view-container').forEach(c => c.classList.add('hidden'));

    // Show active container & render
    const activeContainer = document.getElementById(`${tabId}-view-container`);
    if (activeContainer) {
      activeContainer.classList.remove('hidden');
    }

    await this.refreshCurrentTab();

    // Rapid sync whenever user navigates tabs to ensure fresh data across devices
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pullFromCloud && !GoogleSheetsSync.isSyncing) {
      GoogleSheetsSync.pullFromCloud(true);
    }
  },

  async refreshCurrentTab() {
    const tabId = this.currentTab;
    if (tabId === 'dashboard') {
      if (typeof DashboardController !== 'undefined') await DashboardController.render('dashboard-view-container');
    } else if (tabId === 'monthly-input') {
      if (typeof MonthlyInputView !== 'undefined') await MonthlyInputView.render('monthly-input-view-container');
    } else if (tabId === 'mgmt-report') {
      if (typeof ManagementReportView !== 'undefined') await ManagementReportView.render('mgmt-report-view-container');
    } else if (tabId === 'projects') {
      if (typeof ProjectsView !== 'undefined') await ProjectsView.render('projects-view-container');
    } else if (tabId === 'ai-breakdown') {
      if (typeof AIBreakdownView !== 'undefined') await AIBreakdownView.render('ai-breakdown-view-container');
    } else if (tabId === 'report-builder') {
      if (typeof ReportBuilderView !== 'undefined') await ReportBuilderView.render('report-builder-view-container');
    } else if (tabId === 'photo-manager') {
      if (typeof PhotoManagerView !== 'undefined') await PhotoManagerView.render('photo-manager-view-container');
    } else if (tabId === 'final-report') {
      if (typeof FinalEditorView !== 'undefined') await FinalEditorView.render('final-report-view-container');
    } else if (tabId === 'history') {
      if (typeof VersionView !== 'undefined') VersionView.render('history-view-container');
    } else if (tabId === 'master-data') {
      if (typeof MasterDataView !== 'undefined') MasterDataView.render('master-data-view-container');
    } else if (tabId === 'settings') {
      if (typeof SettingsView !== 'undefined') SettingsView.render('settings-view-container');
    }
  },

  renderUserBadge() {
    const badge = document.getElementById('user-role-badge');
    if (!badge) return;

    const user = typeof authManager !== 'undefined' ? authManager.currentUser : { name: "Admin", role: "ADMIN" };
    badge.innerHTML = `
      <div class="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200">
        <div class="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold text-white">
          ${user.name ? user.name.charAt(0).toUpperCase() : 'A'}
        </div>
        <div class="text-left leading-none">
          <div class="text-xs font-bold text-slate-800">${user.name || 'Admin'}</div>
          <div class="text-[9px] font-mono text-red-600 uppercase font-black">${user.role || 'ADMIN'}</div>
        </div>
      </div>
    `;
  },

  showToast(message, type = "info") {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bg = type === 'error' ? 'bg-red-50 border-red-300 text-red-700' : type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 shadow-lg';
    toast.className = `px-4 py-3 rounded-xl border shadow-xl text-xs font-semibold backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto ${bg}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /**
   * Fast global sync: pulls latest cloud updates from Google Sheets and compiles local slides
   */
  async triggerGlobalSync() {
    const activeMonth = (window.appState && window.appState.workbookMgr) ? window.appState.workbookMgr.activeMonth : 'SEP-2026';
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      await FirebaseSyncService.hydrateMonth(activeMonth);
    }
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getWebAppUrl()) {
      await GoogleSheetsSync.pullFromCloud(false);
    }
    if (typeof ReportBuilderView !== 'undefined' && ReportBuilderView.triggerSync) {
      await ReportBuilderView.triggerSync();
    }
    if (typeof window.showToast === 'function') {
      window.showToast("⚡ Cloud & Multi-PC Sync Complete! All data up-to-date.", "success");
    }
  },

  normalizeMonth(rawMonth) {
    if (!rawMonth) return "SEP-2026";
    const clean = rawMonth.trim().toUpperCase().replace(/_/g, '-');
    return clean;
  },

  normalizeTemplate(rawPattern) {
    if (!rawPattern) return "walton_executive_crimson";
    const p = rawPattern.trim().toLowerCase();
    if (p === 'pattern-2' || p === 'blue' || p === 'industrial_innovation_blue') {
      return "industrial_innovation_blue";
    }
    return "walton_executive_crimson";
  },

  parseReportRoute() {
    if (typeof window === 'undefined') return { isReport: false };
    const path = (window.location.pathname || '').trim();
    const hash = (window.location.hash || '').trim();
    const search = window.location.search || '';

    // 1. Check path: /report/:month/:pattern?
    const pathMatch = path.match(/\/report\/([^\/]+)(?:\/([^\/]+))?/i);
    if (pathMatch) {
      return {
        isReport: true,
        month: this.normalizeMonth(pathMatch[1]),
        template: this.normalizeTemplate(pathMatch[2])
      };
    }

    // 2. Check hash: #/report/:month/:pattern?
    const hashMatch = hash.match(/#\/?report\/([^\/]+)(?:\/([^\/]+))?/i);
    if (hashMatch) {
      return {
        isReport: true,
        month: this.normalizeMonth(hashMatch[1]),
        template: this.normalizeTemplate(hashMatch[2])
      };
    }

    // 3. Check search parameters: ?report=:month&pattern=:pattern
    if (search) {
      const params = new URLSearchParams(search);
      if (params.has('report')) {
        return {
          isReport: true,
          month: this.normalizeMonth(params.get('report')),
          template: this.normalizeTemplate(params.get('pattern'))
        };
      }
    }

    return { isReport: false };
  },

  /**
   * Renders the interactive full-screen Online Report presentation stage
   */
  async renderOnlineReport(selectedMonth = "SEP-2026", template = "walton_executive_crimson") {
    const month = this.normalizeMonth(selectedMonth);
    const tmpl = this.normalizeTemplate(template);

    // Ensure database initialized
    if (typeof db !== 'undefined' && db.init) {
      await db.init();
    }

    // Ensure state initialized
    if (!window.appState || !window.appState.syncEngine) {
      const workbookMgr = new MonthWorkbookManager();
      const breakdownSheet = new AIBreakdownSheet();
      const aiClient = typeof geminiClient !== 'undefined' ? geminiClient : null;
      const photoMgr = typeof photoManager !== 'undefined' ? photoManager : null;
      const syncEngine = new SyncEngine(workbookMgr, breakdownSheet, aiClient, photoMgr);
      window.appState = { workbookMgr, breakdownSheet, aiClient, photoMgr, syncEngine };
      try {
        await syncEngine.syncMonth(month);
      } catch (e) {
        console.warn("Report sync notice:", e);
      }
    } else {
      try {
        await window.appState.syncEngine.syncMonth(month);
      } catch (e) {}
    }

    // Build unified report data strictly via ExportController
    const { reportData } = await ExportController.buildReportPayload(month, tmpl);

    // Render sequential slides via SlideLayoutEngine
    const slides = (typeof SlideLayoutEngine !== 'undefined' && SlideLayoutEngine.renderDeck)
      ? SlideLayoutEngine.renderDeck(reportData, tmpl)
      : [];
    const totalSlides = slides.length;

    // Build readable titles for jump navigation
    const titles = [
      "1. Executive Cover Page",
      "2. Table of Contents & Agenda",
      "3. Operations & Financial Dashboard"
    ];
    (reportData.slides || []).forEach((t, i) => {
      const cleanTitle = (t.slide_title || t.task_name || `Task ${i + 1}`).replace(/<[^>]*>?/gm, '');
      const eng = t.concern_engineer || t.concern || '';
      const cat = (t.category || '').toLowerCase();
      const status = (t.status || t.project_status || '').toLowerCase();
      const isProj = Boolean(t.is_project || cat.includes('project') || (t.task_name || '').toLowerCase().includes('project'));
      let prefix = eng ? `[${eng}]` : '[Task]';
      if (isProj) {
        prefix = (status.includes('complete') || cat.includes('completed project')) ? '[Completed Project]' : '[Ongoing Project]';
      }
      titles.push(`${i + 4}. ${prefix} ${cleanTitle}`);
    });
    titles.push(`${totalSlides}. Top 5 Completed Works & Ongoing Projects`);

    // Hide standard app layout
    document.querySelectorAll('header.sticky, nav, footer, .view-container').forEach(el => el.classList.add('hidden'));

    // Create or locate Online Report Viewer Container
    let viewer = document.getElementById('online-report-viewer');
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.id = 'online-report-viewer';
      viewer.className = 'fixed inset-0 z-50 bg-[#0A0E17] flex flex-col text-slate-100 overflow-hidden';
      document.body.appendChild(viewer);
    }
    viewer.classList.remove('hidden');

    if (totalSlides === 0) {
      viewer.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div class="text-4xl mb-3">📄</div>
          <h2 class="text-lg font-bold text-slate-100">No Slides Available for ${month}</h2>
          <p class="text-xs text-slate-400 mt-1 max-w-md">There are no approved active tasks or slides for ${month}. Please populate tasks in the input view first.</p>
          <button onclick="App.exitOnlineReport()" class="mt-5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md">
            Go to Monthly Input
          </button>
        </div>
      `;
      return;
    }

    const templateDisplayName = tmpl === 'industrial_innovation_blue' ? 'Industrial Innovation Blue (Pattern 2)' : 'Walton Executive Crimson (Pattern 1)';
    const templateBadgeBg = tmpl === 'industrial_innovation_blue' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20';

    viewer.innerHTML = `
      <!-- Top Interactive Bar -->
      <header class="no-print sticky top-0 left-0 right-0 z-50 bg-[#0B0F19]/95 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-white shadow-2xl">
        <div class="flex items-center gap-3">
          <img src="assets/img/walton_logo.png" alt="WALTON" class="h-8 sm:h-9 w-auto object-contain flex-shrink-0 drop-shadow">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-black text-red-500 text-xs tracking-widest font-mono">WALTON</span>
              <span class="text-slate-600">&bull;</span>
              <span class="text-xs font-semibold text-slate-300">AC Process Monthly Report (${month})</span>
            </div>
            <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
              <span class="px-1.5 py-0.2 rounded font-bold border font-mono ${templateBadgeBg}">${templateDisplayName}</span>
              <span>&bull;</span>
              <span class="text-emerald-400 font-mono font-semibold">● Live Online Report</span>
            </div>
          </div>
        </div>

        <!-- Slide Jump & Controls -->
        <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
          <select id="online-report-slide-select" class="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-red-500 max-w-[200px] sm:max-w-xs truncate">
            ${titles.map((t, idx) => `<option value="${idx}">${t}</option>`).join('')}
          </select>

          <div class="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button id="btn-report-prev" class="px-2.5 py-1 rounded hover:bg-slate-800 text-xs font-semibold text-slate-200 transition">
              &larr; Prev
            </button>
            <span id="online-report-slide-counter" class="text-xs font-mono text-red-400 font-bold px-2 whitespace-nowrap">
              1 / ${totalSlides}
            </span>
            <button id="btn-report-next" class="px-2.5 py-1 rounded hover:bg-slate-800 text-xs font-semibold text-slate-200 transition">
              Next &rarr;
            </button>
          </div>

          <button id="btn-report-fullscreen" title="Full Screen Presentation (F)" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition flex items-center gap-1">
            <span>⛶</span> <span class="hidden sm:inline">Fullscreen</span>
          </button>

          <button id="btn-report-copy-link" title="Copy shareable link" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition flex items-center gap-1">
            <span>📋</span> <span class="hidden sm:inline">Share</span>
          </button>

          <div class="flex items-center gap-1 border-l border-slate-700 pl-2">
            <button id="btn-report-download-pdf" title="Download Vector PDF" class="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm">
              <span>📄</span> <span class="hidden md:inline">PDF</span>
            </button>
            <button id="btn-report-download-pptx" title="Download Editable PowerPoint" class="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm">
              <span>📊</span> <span class="hidden md:inline">PPTX</span>
            </button>
          </div>

          <button id="btn-report-back-app" title="Return to Management Dashboard" class="ml-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition flex items-center gap-1.5">
            <span>🏠</span> <span class="hidden sm:inline">Dashboard</span>
          </button>
        </div>
      </header>

      <!-- Center Slide Frame Stage -->
      <main class="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-[#0A0E17]">
        <div id="online-report-viewport" class="w-full max-w-[1400px] aspect-[16/9] max-h-[calc(100vh-80px)] bg-white rounded-xl shadow-2xl overflow-hidden text-slate-800 flex items-center justify-center border border-slate-800"></div>
      </main>
    `;

    // Slide navigation state
    let currentIndex = 0;
    const viewport = document.getElementById('online-report-viewport');
    const counter = document.getElementById('online-report-slide-counter');
    const selector = document.getElementById('online-report-slide-select');

    const showSlide = (idx) => {
      if (idx < 0) idx = 0;
      if (idx >= totalSlides) idx = totalSlides - 1;
      currentIndex = idx;
      if (viewport) {
        viewport.innerHTML = slides[currentIndex];
      }
      if (counter) {
        counter.textContent = `${currentIndex + 1} / ${totalSlides}`;
      }
      if (selector) {
        selector.value = currentIndex;
      }
    };

    // Attach control listeners
    const prevBtn = document.getElementById('btn-report-prev');
    const nextBtn = document.getElementById('btn-report-next');
    if (prevBtn) prevBtn.onclick = () => showSlide(currentIndex - 1);
    if (nextBtn) nextBtn.onclick = () => showSlide(currentIndex + 1);
    if (selector) selector.onchange = (e) => showSlide(parseInt(e.target.value, 10));

    const fsBtn = document.getElementById('btn-report-fullscreen');
    if (fsBtn) {
      fsBtn.onclick = () => {
        if (!document.fullscreenElement) {
          viewer.requestFullscreen().catch(() => {});
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
      };
    }

    const copyBtn = document.getElementById('btn-report-copy-link');
    if (copyBtn) {
      copyBtn.onclick = () => {
        ExportController.copyOnlineReportUrl(month);
      };
    }

    const pdfBtn = document.getElementById('btn-report-download-pdf');
    if (pdfBtn) {
      pdfBtn.onclick = async () => {
        if (typeof window.showToast === 'function') window.showToast("Generating Vector PDF...", "info");
        await ExportController.exportPDF(month, tmpl);
      };
    }

    const pptxBtn = document.getElementById('btn-report-download-pptx');
    if (pptxBtn) {
      pptxBtn.onclick = async () => {
        if (typeof window.showToast === 'function') window.showToast("Generating PowerPoint...", "info");
        await ExportController.exportPPTX(month, tmpl);
      };
    }

    const backBtn = document.getElementById('btn-report-back-app');
    if (backBtn) {
      backBtn.onclick = () => {
        this.exitOnlineReport();
      };
    }

    // Keyboard navigation
    const keyHandler = (e) => {
      if (viewer.classList.contains('hidden')) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;

      if (e.key === 'ArrowRight' || e.key === 'Space' || e.key === 'PageDown' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        showSlide(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        showSlide(currentIndex - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        showSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        showSlide(totalSlides - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) viewer.requestFullscreen().catch(() => {});
        else if (document.exitFullscreen) document.exitFullscreen();
      } else if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          this.exitOnlineReport();
        }
      }
    };

    window.removeEventListener('keydown', this._onlineReportKeyHandler);
    this._onlineReportKeyHandler = keyHandler;
    window.addEventListener('keydown', keyHandler);

    // Initial slide render
    showSlide(0);
  },

  exitOnlineReport() {
    const viewer = document.getElementById('online-report-viewer');
    if (viewer) viewer.classList.add('hidden');
    document.querySelectorAll('header.sticky, nav, footer').forEach(el => el.classList.remove('hidden'));

    // Reset URL
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      if (window.location.hash.includes('report') || window.location.pathname.includes('/report/')) {
        const base = window.location.pathname.includes('/report/') ? '/' : window.location.pathname;
        window.history.pushState(null, '', base);
      }
    }

    this.switchTab(this.currentTab || 'dashboard');
  }
};

window.App = App;

// Bootstrap application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
