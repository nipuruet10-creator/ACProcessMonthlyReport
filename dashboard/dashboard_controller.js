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

    // 2b. Canonical Projects from the "Projects" section
    const projectTasks = allMonthTasks.filter(t => {
      const cat = (t.category || '').toLowerCase();
      const name = (t.task_name || '').toLowerCase();
      return Boolean(t.is_project || cat.includes('project') || name.includes('project'));
    });

    const ongoingProjects = projectTasks.filter(t => {
      const status = (t.status || t.project_status || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      return !status.includes('complete') && !cat.includes('completed project');
    });

    const completedProjects = projectTasks.filter(t => {
      const status = (t.status || t.project_status || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      return status.includes('complete') || cat.includes('completed project');
    });

    let ongoingProjCount = ongoingProjects.length;
    let completedProjCount = completedProjects.length;

    // Check top works manager for ongoing if needed
    if (ongoingProjCount === 0 && typeof TopWorksManager !== 'undefined') {
      const tw = TopWorksManager.getTopWorksForMonth(this.currentFilters.month);
      if (tw && tw.ongoingTop5) {
        ongoingProjCount = tw.ongoingTop5.filter(p => p.name && p.name.trim()).length;
      }
    }

    // 3. Category Distribution breakdown from Task Entry
    const categoryCounts = {};
    filteredTasks.forEach(t => {
      const cat = (t.category && t.category.trim()) || "Process development";
      const catLower = cat.toLowerCase();
      // Projects are counted in the dedicated project cards below
      if (catLower.includes('ongoing project') || catLower.includes('completed project')) {
        return;
      }
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

    // 2c. Requirement 3: Engineer-wise Task Entry & Monthly Report YES/NO Count
    const engineerStatsMap = {};
    allMonthTasks.forEach(t => {
      const eng = (t.concern_engineer || '').trim() || 'Unassigned';
      if (!engineerStatsMap[eng]) {
        engineerStatsMap[eng] = {
          name: eng,
          total: 0,
          reportYes: 0,
          reportNo: 0,
          completed: 0,
          points: 0
        };
      }
      engineerStatsMap[eng].total += 1;
      if (t.monthly_report === 'YES') {
        engineerStatsMap[eng].reportYes += 1;
      } else {
        engineerStatsMap[eng].reportNo += 1;
      }
      if (t.status === 'Completed') {
        engineerStatsMap[eng].completed += 1;
      }
      engineerStatsMap[eng].points += (t.task_point || 0);
    });

    const sortedEngineerStats = Object.values(engineerStatsMap).sort((a, b) => b.total - a.total);
    const overallMonthTasksTotal = allMonthTasks.length;
    const overallMonthReportYes = allMonthTasks.filter(t => t.monthly_report === 'YES').length;
    const overallMonthReportNo = overallMonthTasksTotal - overallMonthReportYes;
    const overallMonthReportPct = overallMonthTasksTotal > 0 ? Math.round((overallMonthReportYes / overallMonthTasksTotal) * 100) : 0;

    // 2d. Requirement 4: Presentation Readiness Audit & Top Deliverables
    const reportEligibleTasks = allMonthTasks.filter(t => t.monthly_report === 'YES');
    let auditPhotosAttached = 0;
    let auditPhotosPending = 0;
    const auditAttentionList = [];

    reportEligibleTasks.forEach(t => {
      let hasPic = false;
      if (typeof photoManager !== 'undefined' && photoManager.getTaskPhotos) {
        const p = photoManager.getTaskPhotos(t.task_id);
        hasPic = Boolean(p && (p.before_photo || p.photo_1 || p.after_photo || p.photo_2));
      }
      if (!hasPic && (t.before_photo || t.photo_1 || t.photo || t.has_photo)) {
        hasPic = true;
      }

      if (hasPic) {
        auditPhotosAttached++;
      } else {
        auditPhotosPending++;
        if (auditAttentionList.length < 6) {
          auditAttentionList.push({
            task_id: t.task_id,
            name: t.task_name || 'Unnamed Task',
            engineer: t.concern_engineer || 'Unassigned',
            points: t.task_point || 0,
            category: t.category || 'Process development'
          });
        }
      }
    });

    const readinessScorePct = reportEligibleTasks.length > 0 ? Math.round((auditPhotosAttached / reportEligibleTasks.length) * 100) : 100;

    const topEngineeringBreakthroughs = [...allMonthTasks]
      .filter(t => t.task_point > 0 || (t.task_name && t.task_name.trim().length > 0))
      .sort((a, b) => (b.task_point || 0) - (a.task_point || 0))
      .slice(0, 5);

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

    // Metadata dictionary for known process engineering categories
    const CATEGORY_META = {
      "process development": {
        label: "Process Developed",
        icon: "⚙️",
        note: "Process Standardisation & SOP",
        bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
        border: "#60A5FA",
        valColor: "#1D4ED8",
        labelColor: "#1E3A8A",
        shadow: "rgba(59,130,246,0.16)"
      },
      "major developments – tools": {
        label: "Tools Developed",
        icon: "🔧",
        note: "Jigs, Fixtures & Dies",
        bg: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
        border: "#818CF8",
        valColor: "#4338CA",
        labelColor: "#312E81",
        shadow: "rgba(99,102,241,0.16)"
      },
      "major developments - tools": {
        label: "Tools Developed",
        icon: "🔧",
        note: "Jigs, Fixtures & Dies",
        bg: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
        border: "#818CF8",
        valColor: "#4338CA",
        labelColor: "#312E81",
        shadow: "rgba(99,102,241,0.16)"
      },
      "major developments – materials": {
        label: "Materials Developed",
        icon: "🧪",
        note: "Raw Materials & Chemical",
        bg: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
        border: "#34D399",
        valColor: "#047857",
        labelColor: "#064E3B",
        shadow: "rgba(16,185,129,0.16)"
      },
      "major developments - materials": {
        label: "Materials Developed",
        icon: "🧪",
        note: "Raw Materials & Chemical",
        bg: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
        border: "#34D399",
        valColor: "#047857",
        labelColor: "#064E3B",
        shadow: "rgba(16,185,129,0.16)"
      },
      "major developments – parts": {
        label: "Parts Developed",
        icon: "🔩",
        note: "Components & Sheet Metal",
        bg: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
        border: "#4ADE80",
        valColor: "#15803D",
        labelColor: "#14532D",
        shadow: "rgba(34,197,94,0.16)"
      },
      "major developments - parts": {
        label: "Parts Developed",
        icon: "🔩",
        note: "Components & Sheet Metal",
        bg: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
        border: "#4ADE80",
        valColor: "#15803D",
        labelColor: "#14532D",
        shadow: "rgba(34,197,94,0.16)"
      },
      "major developments – process": {
        label: "Major Process Dev",
        icon: "⚡",
        note: "Line Upgrades & Re-layout",
        bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
        border: "#60A5FA",
        valColor: "#1D4ED8",
        labelColor: "#1E3A8A",
        shadow: "rgba(59,130,246,0.16)"
      },
      "major developments - process": {
        label: "Major Process Dev",
        icon: "⚡",
        note: "Line Upgrades & Re-layout",
        bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
        border: "#60A5FA",
        valColor: "#1D4ED8",
        labelColor: "#1E3A8A",
        shadow: "rgba(59,130,246,0.16)"
      },
      "major developments – chemical": {
        label: "Chemical Development",
        icon: "⚗️",
        note: "SWAAT & Corrosion Trials",
        bg: "linear-gradient(135deg, #FDF4FF 0%, #FAE8FF 100%)",
        border: "#E879F9",
        valColor: "#A21CAF",
        labelColor: "#701A75",
        shadow: "rgba(217,70,239,0.16)"
      },
      "major developments - chemical": {
        label: "Chemical Development",
        icon: "⚗️",
        note: "SWAAT & Corrosion Trials",
        bg: "linear-gradient(135deg, #FDF4FF 0%, #FAE8FF 100%)",
        border: "#E879F9",
        valColor: "#A21CAF",
        labelColor: "#701A75",
        shadow: "rgba(217,70,239,0.16)"
      },
      "cost savings (local)": {
        label: "Cost Savings (Local)",
        icon: "💰",
        note: `Cost: ${savingsData.displayCumulativeYTD}/Yr`,
        bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
        border: "#FBBF24",
        valColor: "#B45309",
        labelColor: "#78350F",
        shadow: "rgba(245,158,11,0.16)"
      },
      "cost savings (ibu)": {
        label: "Cost Savings (IBU)",
        icon: "💵",
        note: "International Business Saving",
        bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
        border: "#FBBF24",
        valColor: "#B45309",
        labelColor: "#78350F",
        shadow: "rgba(245,158,11,0.16)"
      },
      "cost saving": {
        label: "Cost Saving",
        icon: "💰",
        note: `Cost: ${savingsData.displayCumulativeYTD}/Yr`,
        bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
        border: "#FBBF24",
        valColor: "#B45309",
        labelColor: "#78350F",
        shadow: "rgba(245,158,11,0.16)"
      },
      "bom verification": {
        label: "BOM Verification",
        icon: "📋",
        note: "BOM Audit & Physical Observation",
        bg: "linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)",
        border: "#FB7185",
        valColor: "#BE123C",
        labelColor: "#881337",
        shadow: "rgba(244,63,94,0.16)"
      },
      "fg bom/ sfg": {
        label: "FG BOM / SFG",
        icon: "📦",
        note: "BOM Structure & Confirmations",
        bg: "linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)",
        border: "#F472B6",
        valColor: "#BE185D",
        labelColor: "#831843",
        shadow: "rgba(236,72,153,0.16)"
      },
      "new model(local)": {
        label: "New Model (Local)",
        icon: "✨",
        note: "Model Introduction & Trial",
        bg: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
        border: "#A78BFA",
        valColor: "#6D28D9",
        labelColor: "#4C1D95",
        shadow: "rgba(139,92,246,0.16)"
      },
      "process optimization": {
        label: "Process Optimization",
        icon: "👥",
        note: "Line Balancing & Efficiency",
        bg: "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)",
        border: "#C084FC",
        valColor: "#7E22CE",
        labelColor: "#581C87",
        shadow: "rgba(168,85,247,0.16)"
      },
      "process extension": {
        label: "Process Extension",
        icon: "🏗️",
        note: "Plant Capacity & Line Expansion",
        bg: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
        border: "#38BDF8",
        valColor: "#0369A1",
        labelColor: "#0C4A6E",
        shadow: "rgba(14,165,233,0.16)"
      }
    };

    // 4. Build Dynamic Cards for Categories that have task entries
    const dynamicCategoryCards = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([catName, cnt]) => {
        const normKey = catName.toLowerCase().replace(/–/g, '-').trim();
        const meta = CATEGORY_META[normKey] || CATEGORY_META[catName.toLowerCase()] || {
          label: catName,
          icon: "🏷️",
          note: "Task Entry Category",
          bg: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
          border: "#94A3B8",
          valColor: "#334155",
          labelColor: "#1E293B",
          shadow: "rgba(100,116,139,0.16)"
        };

        return {
          id: `cat_${normKey.replace(/[^a-z0-9]/g, '_')}`,
          val: cnt,
          label: meta.label,
          icon: meta.icon,
          note: meta.note,
          bg: meta.bg,
          border: meta.border,
          valColor: meta.valColor,
          labelColor: meta.labelColor,
          shadow: meta.shadow,
          filterCategory: catName
        };
      });

    // Default starter categories if month has no tasks entered yet
    if (dynamicCategoryCards.length === 0) {
      dynamicCategoryCards.push(
        {
          id: "process_dev",
          val: 0,
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
          val: 0,
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
          val: 0,
          label: "Parts Developed",
          icon: "🔩",
          note: "Components & Sheet Metal",
          bg: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
          border: "#34D399",
          valColor: "#047857",
          labelColor: "#064E3B",
          shadow: "rgba(16,185,129,0.16)",
          filterCategory: "Major Developments – Parts"
        }
      );
    }

    // Two dedicated Project Cards directly from "Projects" Section
    const projectCards = [
      {
        id: "comp_proj",
        val: completedProjCount,
        label: "Completed Projects",
        icon: "🏆",
        note: "From Projects Section",
        bg: "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)",
        border: "#F87171",
        valColor: "#B91C1C",
        labelColor: "#7F1D1D",
        shadow: "rgba(239,68,68,0.16)",
        filterCategory: "Completed Projects",
        isProjectLink: true
      },
      {
        id: "ongoing_proj",
        val: ongoingProjCount,
        label: "New Projects / Ongoing",
        icon: "🚀",
        note: "From Projects Section",
        bg: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)",
        border: "#22D3EE",
        valColor: "#0E7490",
        labelColor: "#164E63",
        shadow: "rgba(6,182,212,0.16)",
        filterCategory: "Ongoing Projects",
        isProjectLink: true
      }
    ];

    const image2Cards = [...dynamicCategoryCards, ...projectCards];

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

        <!-- ENGINEER-WISE TASK ENTRY & MONTHLY REPORT SUMMARY (IMAGE 3 REQUIREMENT) -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                👥
              </div>
              <div>
                <h3 class="text-lg sm:text-xl font-black text-slate-900">
                  Engineer Task Entries &amp; Monthly Report Summary (${this.currentFilters.month})
                </h3>
                <p class="text-xs sm:text-sm text-slate-500 font-medium">
                  Summary of recorded engineering tasks vs. tasks approved for monthly executive presentation (Report = YES).
                </p>
              </div>
            </div>

            <!-- Top Level Totals Pill Row -->
            <div class="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span class="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-bold border border-slate-200 shadow-sm">
                Total Tasks: <strong class="text-slate-900">${overallMonthTasksTotal}</strong>
              </span>
              <span class="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-sm">
                Report Selected (YES): <strong class="text-emerald-700">${overallMonthReportYes} (${overallMonthReportPct}%)</strong>
              </span>
              <span class="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-bold border border-amber-200 shadow-sm">
                Internal Only (NO): <strong class="text-amber-700">${overallMonthReportNo}</strong>
              </span>
            </div>
          </div>

          <!-- Cards Grid for Each Engineer -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            ${sortedEngineerStats.map(stat => {
              const yesPct = stat.total > 0 ? Math.round((stat.reportYes / stat.total) * 100) : 0;
              const isFiltered = (this.currentFilters.engineer && this.currentFilters.engineer.includes(stat.name));
              return `
                <div onclick="DashboardController.handleFilter('engineer', '${HELPERS.escapeHtml(stat.name)}')" 
                     class="cursor-pointer bg-slate-50/70 hover:bg-white border ${isFiltered ? 'border-red-500 ring-2 ring-red-100 shadow-md' : 'border-slate-200'} rounded-2xl p-4 transition hover:shadow-md hover:border-slate-300 flex flex-col justify-between"
                     title="Click to filter dashboard by ${HELPERS.escapeHtml(stat.name)}">
                  <div>
                    <div class="flex items-center justify-between mb-2.5">
                      <div class="flex items-center gap-2">
                        <span class="w-7 h-7 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shadow-xs">
                          👤
                        </span>
                        <h4 class="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[150px]" title="${HELPERS.escapeHtml(stat.name)}">
                          ${HELPERS.escapeHtml(stat.name)}
                        </h4>
                      </div>
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700">
                        ${stat.points} pts
                      </span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 my-2 text-center">
                      <div class="bg-white p-2 rounded-xl border border-slate-200">
                        <div class="text-[10px] font-mono font-bold uppercase text-slate-400">Task Entries</div>
                        <div class="text-xl font-black font-mono text-slate-900 mt-0.5">${stat.total}</div>
                      </div>
                      <div class="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
                        <div class="text-[10px] font-mono font-bold uppercase text-emerald-700">Report (YES)</div>
                        <div class="text-xl font-black font-mono text-emerald-700 mt-0.5">${stat.reportYes}</div>
                      </div>
                    </div>
                  </div>

                  <!-- Mini Progress Bar -->
                  <div class="mt-2 pt-2 border-t border-slate-200/60">
                    <div class="flex items-center justify-between text-[11px] font-mono mb-1 text-slate-500">
                      <span>Report Rate</span>
                      <span class="font-bold text-slate-800">${yesPct}%</span>
                    </div>
                    <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div class="bg-emerald-500 h-full rounded-full transition-all" style="width: ${yesPct}%"></div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- PROCESS ENGINEERING CORE WORK HIGHLIGHTS CARDS -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center text-xl flex-shrink-0">
                ⚙️
              </div>
              <div>
                <h3 class="text-lg sm:text-xl font-black text-slate-900">
                  Process Engineering Core Work Highlights
                </h3>
                <p class="text-xs sm:text-sm text-slate-500 font-medium">
                  Dynamic category breakdown from task entry and active strategic projects.
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

        <!-- NEW EXECUTIVE SECTIONS: PRESENTATION READINESS & HIGH-IMPACT DELIVERABLES (IMAGE 4 REPLACEMENT) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
          
          <!-- Card 1: Monthly Presentation Readiness & Quality Audit -->
          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4 pb-3.5 border-b border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                    📋
                  </div>
                  <div>
                    <h3 class="text-lg sm:text-xl font-black text-slate-900">Monthly Report Presentation Readiness</h3>
                    <p class="text-xs sm:text-sm text-slate-500 font-medium">Pre-Flight Audit for PPTX &amp; PDF Report Generation</p>
                  </div>
                </div>
                <span class="px-3.5 py-1.5 rounded-full text-xs font-mono font-black ${readinessScorePct >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                  ${readinessScorePct}% Ready
                </span>
              </div>

              <!-- Metrics Row -->
              <div class="grid grid-cols-3 gap-3 my-3">
                <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                  <div class="text-[10px] font-mono font-bold uppercase text-slate-500">Report Queue</div>
                  <div class="text-2xl font-black font-mono text-slate-900 mt-0.5">${reportEligibleTasks.length}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">Selected Tasks</div>
                </div>
                <div class="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center">
                  <div class="text-[10px] font-mono font-bold uppercase text-emerald-700">Photos Attached</div>
                  <div class="text-2xl font-black font-mono text-emerald-700 mt-0.5">${auditPhotosAttached}</div>
                  <div class="text-[10px] text-emerald-600 mt-0.5">Visual Evidence OK</div>
                </div>
                <div class="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center">
                  <div class="text-[10px] font-mono font-bold uppercase text-amber-700">Photo Pending</div>
                  <div class="text-2xl font-black font-mono text-amber-700 mt-0.5">${auditPhotosPending}</div>
                  <div class="text-[10px] text-amber-600 mt-0.5">Needs Attachment</div>
                </div>
              </div>

              <!-- Attention Checklist -->
              <div class="mt-4">
                <div class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Photo &amp; Detail Checklist</span>
                  <span class="text-[11px] font-normal text-slate-400">${auditPhotosPending === 0 ? 'All report items have photos!' : `${auditPhotosPending} items pending photos`}</span>
                </div>
                <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                  ${auditAttentionList.length > 0 ? auditAttentionList.map(item => `
                    <div class="bg-slate-50 hover:bg-amber-50/50 p-3 rounded-xl border border-slate-200 flex items-center justify-between transition text-xs">
                      <div class="truncate mr-2">
                        <div class="font-bold text-slate-800 truncate">${HELPERS.escapeHtml(item.name)}</div>
                        <div class="text-[11px] text-slate-500">${HELPERS.escapeHtml(item.engineer)} &bull; <span class="font-mono text-amber-700">Missing Photo</span></div>
                      </div>
                      <button onclick="App.switchTab('monthly-input')" class="flex-shrink-0 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] transition">
                        Attach 📸
                      </button>
                    </div>
                  `).join('') : `
                    <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <span>✅</span> <span>All report-selected tasks have photo attachments verified. Ready to generate slides!</span>
                    </div>
                  `}
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button onclick="App.switchTab('report-builder')" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1">
                <span>🛠️ Open Report Builder &rarr;</span>
              </button>
              <button onclick="ReportBuilderView.generateMonthlyReport()" class="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5">
                <span>🚀 Generate Slides</span>
              </button>
            </div>
          </div>

          <!-- Card 2: High-Impact Process Innovations & Milestones -->
          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4 pb-3.5 border-b border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                    🏆
                  </div>
                  <div>
                    <h3 class="text-lg sm:text-xl font-black text-slate-900">Top Engineering Process Breakthroughs</h3>
                    <p class="text-xs sm:text-sm text-slate-500 font-medium">Ranked High-Impact Deliverables (${this.currentFilters.month})</p>
                  </div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  By Task Points
                </span>
              </div>

              <!-- Top Deliverables List -->
              <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                ${topEngineeringBreakthroughs.map((item, idx) => `
                  <div class="bg-slate-50 hover:bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between hover:shadow-sm transition">
                    <div class="flex items-center gap-3 truncate mr-2">
                      <div class="w-7 h-7 rounded-xl ${idx === 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-200/80 text-slate-700 border-slate-300'} border flex items-center justify-center text-xs font-black font-mono flex-shrink-0">
                        #${idx + 1}
                      </div>
                      <div class="truncate">
                        <h4 class="text-xs sm:text-sm font-black text-slate-900 truncate" title="${HELPERS.escapeHtml(item.task_name)}">
                          ${HELPERS.escapeHtml(item.task_name)}
                        </h4>
                        <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span class="font-bold text-slate-700">${HELPERS.escapeHtml(item.concern_engineer)}</span>
                          <span>&bull;</span>
                          <span class="px-2 py-0.2 rounded bg-slate-200/70 text-slate-600 font-mono text-[10px]">${HELPERS.escapeHtml(item.category)}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col items-end flex-shrink-0">
                      <span class="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-red-50 text-red-700 border border-red-200">
                        ${item.task_point} pts
                      </span>
                      <span class="text-[10px] font-bold mt-1 ${item.status === 'Completed' ? 'text-emerald-600' : 'text-sky-600'}">
                        ${item.status}
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span class="text-xs text-slate-400 font-mono">Assignee 100% &bull; Supervisor 25% WBS</span>
              <button onclick="App.switchTab('monthly-input')" class="text-xs font-bold text-red-600 hover:text-red-800 transition flex items-center gap-1">
                <span>View All Tasks in Grid &rarr;</span>
              </button>
            </div>
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
