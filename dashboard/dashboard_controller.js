/**
 * Process Development Monthly Report Automation System
 * Module: Executive Dashboard Controller
 * White Professional Theme
 * WALTON Hi-Tech Industries PLC
 */

const DashboardController = {
  currentFilters: {
    month: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEFAULT_MONTH) ? APP_CONFIG.DEFAULT_MONTH : "2026-09",
    engineer: "",
    category: "",
    status: "",
    monthly_report: ""
  },

  /**
   * Resolves tasks for dashboard from MonthWorkbookManager (Jan-Aug 2026) or fallback db
   */
  async getTasksForDashboard(monthFilter) {
    let workbookMgr = (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr
      : (typeof MonthWorkbookManager !== 'undefined' ? new MonthWorkbookManager() : null);

    // Normalize month: "2026-09" -> "SEP-2026", "2026-08" -> "AUG-2026", "2026-01" -> "JAN-2026"
    let normMonth = "SEP-2026";
    if (monthFilter) {
      if (monthFilter.includes("-") && monthFilter.length === 7 && /^\d{4}-\d{2}$/.test(monthFilter)) {
        const [yr, mNum] = monthFilter.split("-");
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const mIdx = parseInt(mNum, 10) - 1;
        normMonth = `${monthNames[mIdx] || "SEP"}-${yr}`;
      } else {
        normMonth = monthFilter.toUpperCase();
      }
    }

    let rawTasks = [];
    if (workbookMgr) {
      rawTasks = workbookMgr.getTasksForMonth(normMonth);
    }

    // If workbookMgr has real tasks, map them
    if (rawTasks && rawTasks.length > 0) {
      return rawTasks.map(t => {
        const isDone = t.status && (
          t.status.toLowerCase().includes("complete") || 
          t.status.toLowerCase().includes("done") ||
          t.status.toLowerCase().includes("entry completed")
        );
        return {
          task_id: t.task_id,
          task_name: t.task_name || "",
          task_details: t.task_details || "",
          category: t.category || "Process development",
          task_point: (t.points !== "" && !isNaN(parseFloat(t.points))) ? parseFloat(t.points) : 0,
          concern_engineer: t.assignee || t.engineer || "",
          supervisor: t.supervisor || "",
          status: isDone ? "Completed" : "Ongoing",
          raw_status: t.status || "",
          monthly_report: t.include_in_report || "YES",
          report_ready: "READY",
          task_month: monthFilter
        };
      });
    }

    // Fallback to db adapter
    if (typeof db !== 'undefined' && db.getAllTasks) {
      return await db.getAllTasks({ month: monthFilter });
    }
    return [];
  },

  async render(containerId = 'dashboard-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Fetch real month dataset
    const allMonthTasks = await this.getTasksForDashboard(this.currentFilters.month);
    let filteredTasks = [...allMonthTasks];

    // Apply Active Filters
    if (this.currentFilters.engineer) {
      const qEng = this.currentFilters.engineer.toLowerCase();
      filteredTasks = filteredTasks.filter(t => 
        (t.concern_engineer && t.concern_engineer.toLowerCase().includes(qEng)) ||
        (t.supervisor && t.supervisor.toLowerCase().includes(qEng))
      );
    }
    if (this.currentFilters.category) {
      filteredTasks = filteredTasks.filter(t => 
        t.category && t.category.toLowerCase() === this.currentFilters.category.toLowerCase()
      );
    }
    if (this.currentFilters.monthly_report) {
      filteredTasks = filteredTasks.filter(t => t.monthly_report === this.currentFilters.monthly_report);
    }

    // 2. High-Level Metrics
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t.status === "Completed").length;
    const ongoingTasks = totalTasks - completedTasks;
    const selectedForReport = filteredTasks.filter(t => t.monthly_report === "YES").length;
    const reportReady = filteredTasks.filter(t => t.monthly_report === "YES" && (t.report_ready === "READY" || t.task_name)).length;
    const photoPending = filteredTasks.filter(t => t.monthly_report === "YES" && t.report_ready === "PHOTO PENDING").length;
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Ensure production defaults are initialized
    if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.ensureProductionDefaults) {
      CostSavingTracker.ensureProductionDefaults();
    }

    const savingsData = CostSavingTracker.calculate(filteredTasks, this.currentFilters.month);
    const bomData = BOMTracker.calculate(filteredTasks);
    const projectData = ProjectTracker.calculate(filteredTasks);

    // 3. 8 Process Engineering Categories (Direct from Image 2)
    let processCount = 0, toolsCount = 0, partsCount = 0, costCount = 0, manpowerCount = 0, bomCount = 0, completedProjCount = 0, ongoingProjCount = 0;

    filteredTasks.forEach(t => {
      const cat = (t.category || '').toLowerCase();
      const title = (t.task_name || '').toLowerCase();
      const status = (t.status || '').toLowerCase();

      if (cat.includes('process') || title.includes('process')) processCount++;
      if (cat.includes('tool') || title.includes('tool') || title.includes('die') || title.includes('fixture')) toolsCount++;
      if (cat.includes('part') || cat.includes('component') || cat.includes('fg bom') || cat.includes('sfg') || title.includes('part')) partsCount++;
      if (cat.includes('cost') || cat.includes('saving') || title.includes('cost') || title.includes('saving')) costCount++;
      if (cat.includes('manpower') || cat.includes('optimization') || title.includes('manpower') || title.includes('optimization')) manpowerCount++;
      if (cat.includes('bom') || title.includes('bom')) bomCount++;

      if (status.includes('complete') || status.includes('done')) {
        completedProjCount++;
      } else {
        ongoingProjCount++;
      }
    });

    // Check top works manager for ongoing if needed
    if (ongoingProjCount === 0 && typeof TopWorksManager !== 'undefined') {
      const tw = TopWorksManager.getTopWorksForMonth(this.currentFilters.month);
      if (tw && tw.ongoingTop5) {
        ongoingProjCount = tw.ongoingTop5.filter(p => p.name && p.name.trim()).length;
      }
    }

    // 4. Exact Category Distribution breakdown ("Kon category te kaj hoyese segulo")
    const categoryCounts = {};
    filteredTasks.forEach(t => {
      const cat = (t.category && t.category.trim()) || "Others";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

    // Dropdown options
    const masterEngineers = (typeof MasterDataManager !== 'undefined') 
      ? MasterDataManager.getEngineers() 
      : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.ENGINEERS : []);

    const masterCategories = (typeof MasterDataManager !== 'undefined') 
      ? MasterDataManager.getCategories() 
      : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.CATEGORIES : []);

    const engineerOptions = `<option value="">All Concern Engineers</option>` + masterEngineers.map(e => 
      `<option value="${e.display}" ${this.currentFilters.engineer === e.display ? 'selected' : ''}>${e.display}</option>`
    ).join('');

    const categoryOptions = `<option value="">All Work Categories</option>` + masterCategories.map(c => 
      `<option value="${c}" ${this.currentFilters.category === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    // 8 Image 2 KPI Cards Definition
    const image2Cards = [
      {
        id: "process_dev",
        val: processCount,
        label: "Process Developed",
        icon: "⚙️",
        note: "Process Standardisation & SOP",
        bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
        border: "#60A5FA",
        valColor: "#1D4ED8",
        labelColor: "#1E3A8A",
        shadow: "rgba(59,130,246,0.16)",
        filterCategory: "Process development"
      },
      {
        id: "tools_dev",
        val: toolsCount,
        label: "Tools Developed",
        icon: "🔧",
        note: "Jigs, Fixtures & Dies",
        bg: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
        border: "#818CF8",
        valColor: "#4338CA",
        labelColor: "#312E81",
        shadow: "rgba(99,102,241,0.16)",
        filterCategory: "Major Developments – Tools"
      },
      {
        id: "parts_dev",
        val: partsCount,
        label: "Parts Developed",
        icon: "🔩",
        note: "Components & Sheet Metal",
        bg: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
        border: "#34D399",
        valColor: "#047857",
        labelColor: "#064E3B",
        shadow: "rgba(16,185,129,0.16)",
        filterCategory: "Major Developments – Parts"
      },
      {
        id: "cost_opt",
        val: costCount,
        label: "Cost Optimisation",
        icon: "💰",
        note: `Cost: ${savingsData.displayCumulativeYTD}/Yr`,
        bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
        border: "#FBBF24",
        valColor: "#B45309",
        labelColor: "#78350F",
        shadow: "rgba(245,158,11,0.16)",
        filterCategory: "Cost savings (Local)"
      },
      {
        id: "manpower_opt",
        val: manpowerCount,
        label: "Manpower Optimization",
        icon: "👥",
        note: "Line Balancing & Automation",
        bg: "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)",
        border: "#C084FC",
        valColor: "#7E22CE",
        labelColor: "#581C87",
        shadow: "rgba(168,85,247,0.16)",
        filterCategory: "Process optimization"
      },
      {
        id: "bom_verif",
        val: bomCount,
        label: "BOM Verification",
        icon: "📋",
        note: "BOM Audit & Physical Observation",
        bg: "linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)",
        border: "#FB7185",
        valColor: "#BE123C",
        labelColor: "#881337",
        shadow: "rgba(244,63,94,0.16)",
        filterCategory: "BOM verification"
      },
      {
        id: "comp_proj",
        val: completedProjCount,
        label: "Completed Projects",
        icon: "🏆",
        note: "Verified Finished Operations",
        bg: "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)",
        border: "#F87171",
        valColor: "#B91C1C",
        labelColor: "#7F1D1D",
        shadow: "rgba(239,68,68,0.16)",
        filterCategory: "Completed Projects"
      },
      {
        id: "ongoing_proj",
        val: ongoingProjCount,
        label: "New Projects / Ongoing",
        icon: "🚀",
        note: "Scope Target FY 26-27",
        bg: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)",
        border: "#22D3EE",
        valColor: "#0E7490",
        labelColor: "#164E63",
        shadow: "rgba(6,182,212,0.16)",
        filterCategory: "Project"
      }
    ];

    container.innerHTML = `
      <div class="space-y-6 text-slate-800">
        
        <!-- DASHBOARD FILTER & BANNER -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div>
            <div class="flex items-center gap-2.5">
              <span class="text-xs font-mono font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-md">
                EXECUTIVE MISSION CONTROL
              </span>
              <span class="text-slate-300">&bull;</span>
              <span class="text-xs font-bold text-slate-500 font-mono">WALTON Hi-Tech Industries PLC</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 tracking-tight">
              Process Development Executive Dashboard
            </h2>
            <p class="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Plant-wide engineering operations, monthly task execution, financial cost savings, and category monitoring.
            </p>
          </div>

          <!-- Filters -->
          <div class="flex flex-wrap items-center gap-3">
            <select onchange="DashboardController.handleFilter('month', this.value)" class="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-mono font-black focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 shadow-sm transition">
              ${APP_CONFIG.SUPPORTED_MONTHS.map(m => `<option value="${m.id}" ${this.currentFilters.month === m.id ? 'selected' : ''}>📅 ${m.label}</option>`).join('')}
            </select>

            <select onchange="DashboardController.handleFilter('engineer', this.value)" class="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 shadow-sm transition">
              ${engineerOptions}
            </select>

            <select onchange="DashboardController.handleFilter('category', this.value)" class="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 shadow-sm transition">
              ${categoryOptions}
            </select>

            <select onchange="DashboardController.handleFilter('monthly_report', this.value)" class="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 shadow-sm transition">
              <option value="">Report: ALL</option>
              <option value="YES" ${this.currentFilters.monthly_report === 'YES' ? 'selected' : ''}>Report = YES</option>
              <option value="NO" ${this.currentFilters.monthly_report === 'NO' ? 'selected' : ''}>Report = NO</option>
            </select>
          </div>
        </div>

        <!-- 3 VIBRANT COLORFUL HERO CARDS (IMAGE 3 WRITERIFY HIGH-CONTRAST STYLE) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          
          <!-- Card 1: Purple / Fuchsia Gradient - Task Execution -->
          <div class="rounded-3xl p-6 lg:p-7 text-white shadow-lg transition hover:shadow-2xl relative overflow-hidden flex flex-col justify-between"
               style="background: linear-gradient(135deg, #7C3AED 0%, #C026D3 100%);">
            <div>
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-sm border border-white/25">
                  ⚡
                </div>
                <span class="px-3.5 py-1.5 rounded-full text-xs font-mono font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/30 text-white">
                  TASK EXECUTION
                </span>
              </div>
              <div class="text-5xl font-black tracking-tight font-mono text-white mt-1">${completedTasks}</div>
              <div class="text-sm font-extrabold text-purple-100 mt-2">
                Completed Tasks &bull; <span class="text-white font-mono">${totalTasks}</span> Total in View
              </div>
            </div>
            <div class="mt-6 pt-3.5 border-t border-white/20 flex items-center justify-between">
              <span class="px-3.5 py-1.5 rounded-xl bg-white/25 hover:bg-white/35 text-xs font-black backdrop-blur-sm transition flex items-center gap-1.5 text-white">
                <span>Rate: ${completionPercent}%</span> <span>↗</span>
              </span>
              <span class="text-xs font-mono font-extrabold text-purple-100">${ongoingTasks} Ongoing</span>
            </div>
          </div>

          <!-- Card 2: Sunset Orange Gradient - Monthly Savings (High Contrast Pill) -->
          <div class="rounded-3xl p-6 lg:p-7 text-white shadow-lg transition hover:shadow-2xl relative overflow-hidden flex flex-col justify-between"
               style="background: linear-gradient(135deg, #EA580C 0%, #F59E0B 100%);">
            <div>
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-sm border border-white/25">
                  🪙
                </div>
                <span style="background: #FFFFFF; color: #9A3412; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 900; font-family: 'JetBrains Mono', monospace; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                  MONTHLY SAVINGS
                </span>
              </div>
              <div class="text-4xl sm:text-5xl font-black tracking-tight font-mono text-white mt-1 truncate" title="${savingsData.displayMonthlySaving}">
                ${savingsData.displayMonthlySaving}
              </div>
              <div class="text-sm font-extrabold text-amber-100 mt-2">
                Monthly Realized Cost Savings (${this.currentFilters.month})
              </div>
            </div>
            <div class="mt-6 pt-3.5 border-t border-white/20 flex items-center justify-between">
              <span class="px-3.5 py-1.5 rounded-xl bg-white/25 hover:bg-white/35 text-xs font-black backdrop-blur-sm transition flex items-center gap-1.5 text-white">
                <span>Status: 100% Realized</span> <span>↗</span>
              </span>
              <span class="text-xs font-mono font-extrabold text-amber-100">FY 26-27</span>
            </div>
          </div>

          <!-- Card 3: Emerald / Teal Gradient - Cumulative Savings (High Contrast Pill) -->
          <div class="rounded-3xl p-6 lg:p-7 text-white shadow-lg transition hover:shadow-2xl relative overflow-hidden flex flex-col justify-between"
               style="background: linear-gradient(135deg, #059669 0%, #0D9488 100%);">
            <div>
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-sm border border-white/25">
                  📈
                </div>
                <span style="background: #FFFFFF; color: #065F46; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 900; font-family: 'JetBrains Mono', monospace; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                  CUMULATIVE SAVINGS
                </span>
              </div>
              <div class="text-4xl sm:text-5xl font-black tracking-tight font-mono text-white mt-1 truncate" title="${savingsData.displayCumulativeYTD}">
                ${savingsData.displayCumulativeYTD}
              </div>
              <div class="text-sm font-extrabold text-emerald-100 mt-2">
                Cumulative Realized Savings &bull; FY 26-27 YTD
              </div>
            </div>
            <div class="mt-6 pt-3.5 border-t border-white/20 flex items-center justify-between">
              <span class="px-3.5 py-1.5 rounded-xl bg-white/25 hover:bg-white/35 text-xs font-black backdrop-blur-sm transition flex items-center gap-1.5 text-white">
                <span>${selectedForReport} Slides Ready</span> <span>↗</span>
              </span>
              <span class="text-xs font-mono font-extrabold text-emerald-100">${reportReady} Compiled</span>
            </div>
          </div>

        </div>

        <!-- 4 HIGH-LEVEL MONTHLY TASK QUANTITY & EXECUTION METRIC CARDS -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
          
          <div class="bg-gradient-to-br from-blue-50 to-sky-100/70 border border-blue-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-black uppercase text-blue-800">Monthly Task Quantity</span>
              <span class="text-xl">📋</span>
            </div>
            <div class="text-4xl font-black text-blue-700 font-mono mt-2">${totalTasks}</div>
            <div class="text-sm font-black text-slate-800 mt-1">Total Recorded Tasks</div>
          </div>

          <div class="bg-gradient-to-br from-emerald-50 to-teal-100/70 border border-emerald-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-black uppercase text-emerald-800">Verified Completed</span>
              <span class="text-xl">🏆</span>
            </div>
            <div class="text-4xl font-black text-emerald-700 font-mono mt-2">${completedTasks}</div>
            <div class="text-sm font-black text-slate-800 mt-1">Completed Operations</div>
          </div>

          <div class="bg-gradient-to-br from-amber-50 to-orange-100/70 border border-amber-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-black uppercase text-amber-800">Active In-Execution</span>
              <span class="text-xl">⏳</span>
            </div>
            <div class="text-4xl font-black text-amber-700 font-mono mt-2">${ongoingTasks}</div>
            <div class="text-sm font-black text-slate-800 mt-1">Ongoing Projects &amp; Trials</div>
          </div>

          <div class="bg-gradient-to-br from-purple-50 to-fuchsia-100/70 border border-purple-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-black uppercase text-purple-800">Presentation Ready</span>
              <span class="text-xl">📊</span>
            </div>
            <div class="text-4xl font-black text-purple-700 font-mono mt-2">${selectedForReport}</div>
            <div class="text-sm font-black text-slate-800 mt-1">Report Selected Slides</div>
          </div>

        </div>

        <!-- 8 COLORFUL PROCESS ENGINEERING DEVELOPMENT CARDS (IMAGE 2 REPLICA) -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center text-xl flex-shrink-0">
                ⚙️
              </div>
              <div>
                <h3 class="text-lg sm:text-xl font-black text-slate-900">
                  Process Engineering Core Work Highlights (Image 2 Replica)
                </h3>
                <p class="text-xs sm:text-sm text-slate-500 font-medium">
                  8 core development categories tracking plant modifications, tooling, and strategic projects.
                </p>
              </div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Interactive Filter Active
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${image2Cards.map(c => `
              <div onclick="${(c.id === 'comp_proj' || c.id === 'ongoing_proj') ? `App.switchTab('projects')` : `DashboardController.handleFilter('category', '${c.filterCategory}')`}"
                   class="cursor-pointer rounded-2xl p-5 transition hover:scale-[1.02] hover:shadow-lg relative overflow-hidden flex flex-col justify-between"
                   style="background: ${c.bg}; border: 1.5px solid ${c.border}; box-shadow: 0 4px 12px ${c.shadow};"
                   title="${(c.id === 'comp_proj' || c.id === 'ongoing_proj') ? 'Click to open Dedicated Projects Section' : `Click to filter by ${c.filterCategory}`}">
                <div class="flex items-center justify-between">
                  <div class="text-4xl font-black font-mono tracking-tight" style="color: ${c.valColor};">
                    ${c.val}
                  </div>
                  <span class="text-2xl">${c.icon}</span>
                </div>
                <div class="mt-3">
                  <div class="text-base font-black leading-tight" style="color: ${c.labelColor};">
                    ${c.label}
                  </div>
                  <div class="text-xs font-bold mt-1.5 inline-block px-2.5 py-0.5 rounded-md bg-white/80 border border-black/5" style="color: ${c.valColor};">
                    ${c.note}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- CATEGORY WORK DISTRIBUTION PILLS ("Kon category te kaj hoyese segulo") -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">🏷️</span>
              <div>
                <h3 class="text-base sm:text-lg font-black text-slate-900">
                  Excel Category Work Distribution (${this.currentFilters.month})
                </h3>
                <p class="text-xs text-slate-400">
                  Click any category pill to filter the dashboard:
                </p>
              </div>
            </div>
            ${this.currentFilters.category ? `
              <button onclick="DashboardController.handleFilter('category', '')" class="px-3 py-1 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold border border-red-200 transition">
                ✕ Reset Category Filter
              </button>
            ` : ''}
          </div>

          <div class="flex flex-wrap gap-3">
            <button onclick="DashboardController.handleFilter('category', '')"
                    class="px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 border ${!this.currentFilters.category ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
              <span>All Categories</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${!this.currentFilters.category ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">${totalTasks}</span>
            </button>
            ${sortedCategories.map(([catName, cnt]) => {
              const isSelected = this.currentFilters.category === catName;
              return `
                <button onclick="DashboardController.handleFilter('category', '${HELPERS.escapeHtml(catName)}')"
                        class="px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 border ${isSelected ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-slate-50 hover:bg-red-50/50 text-slate-700 hover:text-red-700 border-slate-200 hover:border-red-200'}">
                  <span>${HELPERS.escapeHtml(catName)}</span>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${isSelected ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-800'}">${cnt}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- CHARTS SECTION (Financial Trend & Categories) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Monthly Saving Trend -->
          <div class="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-xl font-black text-slate-900">Monthly Cost Savings Trend (FY 26-27)</h3>
                <p class="text-xs sm:text-sm text-slate-500 font-medium">Cumulative Savings: <span class="text-emerald-600 font-extrabold font-mono text-base">${savingsData.displayCumulativeYTD}</span></p>
              </div>
              <span class="px-3.5 py-1.5 rounded-full text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-black shadow-sm">
                ${this.currentFilters.month}: ${savingsData.displayMonthlySaving}
              </span>
            </div>
            <div class="h-72 w-full">
              <canvas id="chart-savings-trend"></canvas>
            </div>
          </div>

          <!-- Category Breakdown Donut -->
          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 class="text-xl font-black text-slate-900 mb-1">Category Distribution</h3>
              <p class="text-xs sm:text-sm text-slate-500 font-medium mb-3">Proportion across process engineering tasks</p>
            </div>
            <div class="h-72 w-full">
              <canvas id="chart-categories"></canvas>
            </div>
          </div>

        </div>

        <!-- STRATEGIC PROJECTS & BOM AUDIT SECTION -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Project Tracker -->
          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between mb-4 pb-3.5 border-b border-slate-100">
              <div>
                <h3 class="text-xl font-black text-slate-900">Strategic Engineering Projects</h3>
                <p class="text-xs sm:text-sm text-slate-500 font-medium">Milestones &amp; Line Automation Handover</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 font-mono">
                  ${projectData.ongoingCount} Ongoing
                </span>
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                  ${projectData.completedCount} Completed
                </span>
              </div>
            </div>

            <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
              <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:shadow-sm transition">
                <div>
                  <h4 class="text-base font-black text-slate-900">Auto Brazing Fixture Development</h4>
                  <p class="text-xs sm:text-sm text-slate-600 mt-0.5 font-medium">Engr. Sazzad &amp; Rafi &bull; Completed</p>
                </div>
                <span class="text-sm font-mono font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">৳ 5,00,000 / Yr</span>
              </div>
              <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:shadow-sm transition">
                <div>
                  <h4 class="text-base font-black text-slate-900">Compressor Jacket Foil Cutting Automation</h4>
                  <p class="text-xs sm:text-sm text-slate-600 mt-0.5 font-medium">Engr. Sazzad (50463) &bull; Ongoing (85%)</p>
                </div>
                <span class="text-xs sm:text-sm font-mono text-sky-700 font-bold bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200">Phase 2 Trial</span>
              </div>
              <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:shadow-sm transition">
                <div>
                  <h4 class="text-base font-black text-slate-900">Injection Robot Automation Project</h4>
                  <p class="text-xs sm:text-sm text-slate-600 mt-0.5 font-medium">Engr. Abdullah (58102) &bull; Ongoing (70%)</p>
                </div>
                <span class="text-xs sm:text-sm font-mono text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">Cycle Optimization</span>
              </div>
            </div>
          </div>

          <!-- BOM Audit Tracker -->
          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between mb-4 pb-3.5 border-b border-slate-100">
              <div>
                <h3 class="text-xl font-black text-slate-900">BOM Verification &amp; Physical Audit</h3>
                <p class="text-xs sm:text-sm text-slate-500 font-medium">RAC &amp; CAC Model Consumption Cross-Check</p>
              </div>
              <span class="px-3.5 py-1.5 rounded-full text-xs font-mono font-black bg-amber-50 text-amber-700 border border-amber-200">
                ${bomData.totalPhysicalObservations} Total Observations
              </span>
            </div>

            <div class="grid grid-cols-2 gap-4 my-2">
              <div class="bg-gradient-to-br from-sky-50 to-blue-50/50 p-4 rounded-2xl border border-sky-200">
                <span class="text-xs font-mono text-sky-700 uppercase font-black">RAC Observations</span>
                <div class="text-3xl font-black text-slate-900 mt-1 font-mono">${bomData.breakdown.rac.totalObservations}</div>
                <div class="text-xs sm:text-[13px] text-slate-700 mt-2 space-y-1 font-mono font-medium">
                  <div>Alternative Use: <span class="font-bold text-slate-900">${bomData.breakdown.rac.alternativeUse}</span></div>
                  <div>Physically Not Used: <span class="font-bold text-slate-900">${bomData.breakdown.rac.physicallyNotUsed}</span></div>
                  <div>Over-Consumption: <span class="font-bold text-slate-900">${bomData.breakdown.rac.overConsumption}</span></div>
                </div>
              </div>

              <div class="bg-gradient-to-br from-indigo-50 to-purple-50/50 p-4 rounded-2xl border border-indigo-200">
                <span class="text-xs font-mono text-indigo-700 uppercase font-black">CAC Observations</span>
                <div class="text-3xl font-black text-slate-900 mt-1 font-mono">${bomData.breakdown.cac.totalObservations}</div>
                <div class="text-xs sm:text-[13px] text-slate-700 mt-2 space-y-1 font-mono font-medium">
                  <div>Alternative Use: <span class="font-bold text-slate-900">${bomData.breakdown.cac.alternativeUse}</span></div>
                  <div>Physically Not Used: <span class="font-bold text-slate-900">${bomData.breakdown.cac.physicallyNotUsed}</span></div>
                  <div>Over-Consumption: <span class="font-bold text-slate-900">${bomData.breakdown.cac.overConsumption}</span></div>
                </div>
              </div>
            </div>

            <p class="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
              47 Model Verifications Completed &bull; 110 BOM Upload Summaries Processed
            </p>
          </div>

        </div>

      </div>
    `;

    // Render Charts after DOM injection
    setTimeout(() => {
      DashboardCharts.renderSavingsTrendChart('chart-savings-trend', savingsData.monthlyTrend);
      DashboardCharts.renderCategoryChart('chart-categories', filteredTasks);
    }, 50);
  },

  handleFilter(key, val) {
    this.currentFilters[key] = val;
    this.render();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardController;
} else if (typeof window !== 'undefined') {
  window.DashboardController = DashboardController;
}
