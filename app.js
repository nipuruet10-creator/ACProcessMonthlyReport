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

    // Auto-run initial sync for active month
    try {
      await syncEngine.syncMonth(workbookMgr.activeMonth);
    } catch (e) {
      console.warn("Initial sync notification:", e);
    }

    // Setup global toast function
    window.showToast = this.showToast.bind(this);

    // Initialize Google Sheets Cloud Sync Engine
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.init) {
      GoogleSheetsSync.init();
    }

    // Render User Badge
    this.renderUserBadge();

    // Render Active Tab View
    await this.switchTab(this.currentTab);

    console.log("System initialized successfully.");
  },

  async switchTab(tabId) {
    this.currentTab = tabId;

    // Update Navigation Tab UI Buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('bg-red-600', 'text-white', 'border-red-500', 'shadow-md', 'shadow-red-200/50');
        btn.classList.remove('text-slate-500', 'border-transparent', 'hover:text-slate-800', 'hover:bg-slate-100');
      } else {
        btn.classList.remove('bg-red-600', 'text-white', 'border-red-500', 'shadow-md', 'shadow-red-200/50');
        btn.classList.add('text-slate-500', 'border-transparent', 'hover:text-slate-800', 'hover:bg-slate-100');
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

    const user = typeof authManager !== 'undefined' ? authManager.currentUser : { name: "Report Owner", role: "REPORT_OWNER" };
    badge.innerHTML = `
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
        <div class="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold text-white">
          ${user.name.charAt(0)}
        </div>
        <div class="text-left leading-none">
          <div class="text-xs font-bold text-slate-700">${user.name}</div>
          <div class="text-[9px] font-mono text-red-600 uppercase font-semibold">${user.role}</div>
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
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getWebAppUrl()) {
      await GoogleSheetsSync.pullFromCloud(false);
    }
    if (typeof ReportBuilderView !== 'undefined' && ReportBuilderView.triggerSync) {
      await ReportBuilderView.triggerSync();
    }
  }
};

window.App = App;

// Bootstrap application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
