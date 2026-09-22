/**
 * Process Development Monthly Report Automation System
 * Module: Editable PowerPoint (PPTX) Generator
 * Generates 100% editable OpenXML PPTX matching Walton Reference Slide
 * Enforces: 1 Row = 1 Slide
 * WALTON Hi-Tech Industries PLC
 */

class PPTXGenerator {
  constructor(theme = SLIDE_THEME) {
    this.theme = theme;
  }

  /**
   * Generates a complete editable PowerPoint presentation (.pptx)
   * @param {Object} reportData - { month, slides, kpis, savingsData, bomData }
   */
  async generatePresentation(reportData, template = null) {
    if (typeof PptxGenJS === 'undefined') {
      throw new Error("PptxGenJS library is not loaded.");
    }

    const pptx = new PptxGenJS();

    // Widescreen Layout (13.333" × 7.5" matches coordinate space used in slide methods)
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "Walton AC Process Development";
    pptx.company = "WALTON Hi-Tech Industries PLC";
    pptx.title = `AC Process Monthly Report - ${reportData.month}`;

    const font = "Lexend";
    const bgWhite = "FFFFFF";
    const navyPrimary = "0B2038";
    const navyDark = "07172B";
    const blueCorporate = "0284C7";
    const orangeAccent = "FF6B00";
    const greenSuccess = "10B981";
    const cardBgBlue = "F0F9FF";
    const cardBorderBlue = "BAE6FD";
    const cardBgGrey = "F8FAFC";
    const borderLight = "E2E8F0";
    const textMuted = "64748B";

    const monthName = reportData.month || "SEPTEMBER 2026";
    let rawSlides = reportData.slides ? [...reportData.slides] : [];

    // Filter out any slide where include_in_report is NO (Requirement 2)
    rawSlides = rawSlides.filter(s => s.include_in_report !== "NO" && s.monthly_report !== "NO");

    // Ensure all valid tasks present in MonthWorkbookManager marked for report inclusion are included
    if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      try {
        const allMonthTasks = window.appState.workbookMgr.getTasksForMonth(monthName);
        if (Array.isArray(allMonthTasks) && allMonthTasks.length > 0) {
          const slideIds = new Set(rawSlides.map(s => s.task_id));
          allMonthTasks.forEach(t => {
            if (t.include_in_report !== "NO" && t.monthly_report !== "NO" && (t.task_name && t.task_name.trim().length > 0) && !slideIds.has(t.task_id)) {
              rawSlides.push({
                task_id: t.task_id,
                month: monthName,
                engineer: t.assignee || t.engineer || "Process Engineering",
                raw_task_name: t.task_name,
                slide_title: t.task_name,
                description: t.task_details || "Implemented engineering process improvement for regular production.",
                category: t.category || "Process development",
                status: t.status || "Completed",
                investment: t.investment || (t.savings ? `BDT ${t.savings}` : "In-house / Direct Implementation"),
                include_in_report: "YES",
                photo: t.photo_1 || t.photo || null,
                photo_before: t.before_photo || t.photo_1 || null,
                photo_after: t.after_photo || t.photo_2 || null
              });
              slideIds.add(t.task_id);
            }
          });
        }
      } catch (wbErr) {
        console.warn("Workbook task check notice:", wbErr);
      }
    }

    // Order slides: Standard tasks first, followed by Completed Projects & Ongoing Projects right before the final summary slide
    const standardTaskSlides = [];
    const completedProjectSlides = [];
    const ongoingProjectSlides = [];

    rawSlides.forEach(s => {
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
        standardTaskSlides.push(s);
      }
    });

    // Engineer-sequenced Task Slides: Sazzad > Rafi > Faiyaz > Abdullah > Emon > Pear > Hashmi > Anam
    let sequenceMode = 'category';
    if (typeof SettingsView !== 'undefined' && SettingsView.getTaskSequenceMode) {
      try { sequenceMode = SettingsView.getTaskSequenceMode(); } catch(e) {}
    } else if (typeof localStorage !== 'undefined') {
      sequenceMode = localStorage.getItem('walton_task_sequence_mode') || 'category';
    }

    let engineerSeq = ['Sazzad', 'Rafi', 'Faiyaz', 'Abdullah', 'Emon', 'Pear', 'Hashmi', 'Anam'];
    if (typeof SettingsView !== 'undefined' && SettingsView.getMonthlyEngineerSequence) {
      try { engineerSeq = SettingsView.getMonthlyEngineerSequence(); } catch(e) {}
    } else if (typeof localStorage !== 'undefined') {
      const customSeq = localStorage.getItem('walton_monthly_engineer_seq');
      if (customSeq) {
        try { engineerSeq = JSON.parse(customSeq); } catch(e) {}
      }
    }

    const getEngRank = (task) => {
      const eng = (task.concern_engineer || task.concern || task.assignee || task.engineer || '').toLowerCase();
      for (let i = 0; i < engineerSeq.length; i++) {
        if (eng.includes(engineerSeq[i].toLowerCase())) return i;
      }
      return 999;
    };

    // Category Master Sequencing Definition (Requirement 4)
    const masterCategorySeq = [
      "process development",
      "process optimization",
      "process extension",
      "major developments – process",
      "major developments – tools",
      "major developments – parts",
      "major developments – materials",
      "major developments – chemical",
      "bom verification",
      "fg bom/ sfg",
      "cost savings (local)",
      "cost savings (ibu)",
      "cost saving",
      "new model(local)",
      "project",
      "completed projects",
      "ongoing projects",
      "others"
    ];

    const getCatRank = (catStr) => {
      const clean = (catStr || '').trim().toLowerCase();
      for (let i = 0; i < masterCategorySeq.length; i++) {
        if (clean === masterCategorySeq[i] || clean.includes(masterCategorySeq[i])) return i;
      }
      return 900;
    };

    let sequencedStandardTasks = [];

    if (sequenceMode === 'category') {
      // Group standard tasks strictly by exact task category matching Task Input
      const categoryMap = new Map();
      standardTaskSlides.forEach(task => {
        const catName = (task.category || "Process development").trim();
        if (!categoryMap.has(catName)) {
          categoryMap.set(catName, []);
        }
        categoryMap.get(catName).push(task);
      });

      // Sort categories according to master sequence
      const sortedCatNames = Array.from(categoryMap.keys()).sort((a, b) => {
        return getCatRank(a) - getCatRank(b);
      });

      // For each category, sort tasks strictly by Engineer Sequence
      sortedCatNames.forEach(catName => {
        const tasksInCat = categoryMap.get(catName);
        tasksInCat.sort((a, b) => getEngRank(a) - getEngRank(b));
        sequencedStandardTasks.push(...tasksInCat);
      });
    } else {
      // By Engineer
      const matchedTaskIds = new Set();
      engineerSeq.forEach(engName => {
        const cleanEng = (engName || '').trim().toLowerCase();
        if (!cleanEng) return;
        standardTaskSlides.forEach(task => {
          const tEng = (task.concern_engineer || task.concern || task.assignee || task.engineer || '').toLowerCase();
          if (!matchedTaskIds.has(task.task_id) && tEng.includes(cleanEng)) {
            sequencedStandardTasks.push(task);
            matchedTaskIds.add(task.task_id);
          }
        });
      });
      standardTaskSlides.forEach(task => {
        if (!matchedTaskIds.has(task.task_id)) {
          sequencedStandardTasks.push(task);
        }
      });
    }

    // Sort projects by Engineer rank
    completedProjectSlides.sort((a, b) => getEngRank(a) - getEngRank(b));
    ongoingProjectSlides.sort((a, b) => getEngRank(a) - getEngRank(b));

    const taskSlides = [...sequencedStandardTasks, ...completedProjectSlides, ...ongoingProjectSlides];
    const activeTemplate = template || reportData.template || "walton_executive_crimson";
    const isBlue = (activeTemplate === "industrial_innovation_blue" || activeTemplate === "walton_blue_dual");
    const totalSlideCount = taskSlides.length + 4; // Cover + TOC + Dashboard + Tasks + Top 5 Works (4 + N slides)

    // -------------------------------------------------------------
    // SLIDE 1: COVER PAGE (Crimson or Blue)
    // -------------------------------------------------------------
    const slideCover = pptx.addSlide();
    slideCover.background = { color: bgWhite };
    if (isBlue) {
      this._addIndustrialBlueCoverSlide(slideCover, pptx, font, monthName);
    } else {
      this._addExecutiveRedCoverSlide(slideCover, pptx, font, monthName);
    }

    // -------------------------------------------------------------
    // SLIDE 2: TABLE OF CONTENTS & AGENDA
    // -------------------------------------------------------------
    const slideTOC = pptx.addSlide();
    slideTOC.background = { color: bgWhite };
    if (isBlue) {
      this._addIndustrialBlueTableOfContents(slideTOC, pptx, font, monthName, taskSlides, totalSlideCount);
    } else {
      this._addExecutiveRedTableOfContents(slideTOC, pptx, font, monthName, taskSlides, totalSlideCount);
    }

    // -------------------------------------------------------------
    // SLIDE 3: MANAGEMENT DASHBOARD (Rolling 6-Month Savings + 8 KPIs)
    // -------------------------------------------------------------
    const slideDash = pptx.addSlide();
    slideDash.background = { color: bgWhite };
    if (isBlue) {
      this._addIndustrialBlueDashboardSlide(slideDash, pptx, font, monthName, totalSlideCount, reportData.dashboardData || reportData);
    } else {
      this._addExecutiveRedDashboardSlide(slideDash, pptx, font, monthName, totalSlideCount, reportData.dashboardData || reportData);
    }

    // -------------------------------------------------------------
    // SLIDES 4 to N+3: TASK SLIDES (1 Row = 1 Slide)
    // -------------------------------------------------------------
    let currentSlideNum = 4;
    for (const task of taskSlides) {
      const slide = pptx.addSlide();
      slide.background = { color: bgWhite };

      const hasDualPhoto = Boolean(
        (task.photo_before && task.photo_after) ||
        (task.before_photo && task.after_photo) ||
        task.has_dual_photo
      );

      if (isBlue) {
        if (hasDualPhoto) {
          this._addIndustrialDualBeforeAfterTaskSlide(slide, pptx, task, font, monthName, currentSlideNum, totalSlideCount);
        } else {
          this._addIndustrialBlueTaskSlide(slide, pptx, task, font, monthName, currentSlideNum, totalSlideCount);
        }
      } else {
        if (hasDualPhoto) {
          this._addExecutiveDualBeforeAfterTaskSlide(slide, pptx, task, font, monthName, currentSlideNum, totalSlideCount);
        } else {
          this._addExecutiveRedTaskSlide(slide, pptx, task, font, monthName, currentSlideNum, totalSlideCount);
        }
      }
      currentSlideNum++;
    }

    // -------------------------------------------------------------
    // SLIDE N+4 (LAST SLIDE): TOP 5 WORKS & PROJECTS SUMMARY (Image 2)
    // -------------------------------------------------------------
    const slideTopWorks = pptx.addSlide();
    slideTopWorks.background = { color: bgWhite };
    if (isBlue) {
      this._addIndustrialBlueTopWorksSlide(slideTopWorks, pptx, font, monthName, currentSlideNum, totalSlideCount, reportData.topWorksData || reportData);
    } else {
      this._addExecutiveRedTopWorksSlide(slideTopWorks, pptx, font, monthName, currentSlideNum, totalSlideCount, reportData.topWorksData || reportData);
    }

    const fileName = `Walton_AC_Process_Monthly_Report_${monthName.replace(/\s+/g, '_')}.pptx`;
    await pptx.writeFile({ fileName: fileName });
    return fileName;
  }

  /**
   * Slide 2: Executive Operations Overview & Dashboard Layout Slide
   */
  _addExecutiveOverviewSlide(slide, pptx, font, monthName, totalSlideCount, data = null) {
    const redPrimary = "C5161D";
    const charcoalDark = "0F172A";

    this._addExecutiveHeader(slide, pptx, font, "OPERATIONS CONTROL • EXECUTIVE OVERVIEW", `Plant Engineering Operations & Work Distribution (${monthName.toUpperCase()})`);

    // 1. Resolve tasks list & metrics
    let tasksList = (data && (data.slides || data.tasks));
    if (!tasksList && typeof MonthWorkbookManager !== 'undefined') {
      try {
        const mgr = new MonthWorkbookManager();
        tasksList = mgr.getTasksForMonth(monthName);
      } catch(e) {}
    }
    tasksList = tasksList || [];

    const totalTasks = tasksList.length;
    const reportTasks = tasksList.filter(t => t.monthly_report === 'YES').length;
    const internalTasks = totalTasks - reportTasks;

    let processCount = 0;
    let toolsCount = 0;
    let partsCount = 0;
    let costCount = 0;
    let manpowerCount = 0;
    let bomCount = 0;
    let completedProjCount = 0;
    let ongoingProjCount = 0;
    const engineersSet = new Set();

    tasksList.forEach(t => {
      const eng = (t.concern_engineer || t.concern || '').trim();
      if (eng) engineersSet.add(eng);

      const cat = (t.category || '').toLowerCase();
      const title = (t.slide_title || t.task_name || '').toLowerCase();
      const status = (t.status || t.project_status || '').toLowerCase();
      const isProj = Boolean(t.is_project || cat.includes('project') || title.includes('project'));

      if (isProj || cat.includes('project')) {
        if (status.includes('complete') || cat.includes('completed project')) {
          completedProjCount++;
        } else {
          ongoingProjCount++;
        }
      } else {
        if (cat.includes('process') || title.includes('process')) processCount++;
        if (cat.includes('tool') || title.includes('tool') || title.includes('die') || title.includes('fixture')) toolsCount++;
        if (cat.includes('part') || cat.includes('component') || title.includes('part')) partsCount++;
        if (cat.includes('cost') || cat.includes('saving') || title.includes('cost') || title.includes('saving')) costCount++;
        if (cat.includes('manpower') || title.includes('manpower')) manpowerCount++;
        if (cat.includes('bom') || title.includes('bom')) bomCount++;
      }
    });

    let yearlySavings = "BDT 0";
    let monthlySavings = "BDT 0";
    if (typeof CostSavingTracker !== 'undefined') {
      const ct = CostSavingTracker.calculate([], monthName);
      yearlySavings = ct.displayCumulativeYTD || "BDT 0";
      monthlySavings = ct.displayMonthlySaving || "BDT 0";
    }

    // 4 Top Hero Metric Cards
    const heroCards = [
      {
        val: `${totalTasks}`,
        label: "Total Engineering Tasks",
        sub: `Report: ${reportTasks} | Internal: ${internalTasks}`,
        icon: "📋",
        bg: "1E1B4B",
        border: "4338CA"
      },
      {
        val: `${completedProjCount + ongoingProjCount}`,
        label: "Strategic Projects",
        sub: `Completed: ${completedProjCount} | Ongoing: ${ongoingProjCount}`,
        icon: "🚀",
        bg: "064E3B",
        border: "059669"
      },
      {
        val: `${engineersSet.size || 8}`,
        label: "Active Concern Engineers",
        sub: "Plant-Wide Coverage",
        icon: "👥",
        bg: "7C2D12",
        border: "EA580C"
      },
      {
        val: yearlySavings,
        label: "Realized Annual Savings",
        sub: `Monthly: ${monthlySavings}`,
        icon: "💰",
        bg: "065F46",
        border: "10B981"
      }
    ];

    heroCards.forEach((c, idx) => {
      const px = 0.8 + idx * 2.98;
      const py = 1.35;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: px, y: py, w: 2.82, h: 1.25,
        fill: { color: c.bg }, line: { color: c.border, width: 1.5 }, rectRadius: 0.1
      });
      slide.addText(`${c.icon}  ${c.label.toUpperCase()}`, {
        x: px + 0.15, y: py + 0.1, w: 2.52, h: 0.25,
        fontFace: font, fontSize: 8, bold: true, color: "FFFFFF"
      });
      slide.addText(c.val, {
        x: px + 0.15, y: py + 0.35, w: 2.52, h: 0.5,
        fontFace: font, fontSize: 22, bold: true, color: "FFFFFF"
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: px + 0.15, y: py + 0.88, w: 2.52, h: 0.25,
        fill: { color: "FFFFFF", transparency: 80 }, line: { color: "FFFFFF", transparency: 80 }, rectRadius: 0.05
      });
      slide.addText(c.sub, {
        x: px + 0.15, y: py + 0.88, w: 2.52, h: 0.25,
        fontFace: font, fontSize: 7.5, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });
    });

    // 8 Colorful Process Pillars (4x2 Grid)
    const categoryGrid = [
      { val: `${processCount}`, label: "Process Developed", note: "Standard Operating Procedures", icon: "⚙️", bg: "EFF6FF", border: "60A5FA", valColor: "1D4ED8", labelColor: "1E3A8A" },
      { val: `${toolsCount}`, label: "Tools Developed", note: "Jigs, Dies & Fixtures", icon: "🔧", bg: "EEF2FF", border: "818CF8", valColor: "4338CA", labelColor: "312E81" },
      { val: `${partsCount}`, label: "Parts Developed", note: "Components & Sheet Metal", icon: "🔩", bg: "ECFDF5", border: "34D399", valColor: "047857", labelColor: "064E3B" },
      { val: `${costCount}`, label: "Cost Optimisation", note: `Cost: ${yearlySavings}/Yr`, icon: "💰", bg: "FFFBEB", border: "FBBF24", valColor: "B45309", labelColor: "78350F" },
      { val: `${manpowerCount}`, label: "Manpower Optimization", note: "Cycle Time & Line Balance", icon: "👥", bg: "FAF5FF", border: "C084FC", valColor: "7E22CE", labelColor: "581C87" },
      { val: `${bomCount}`, label: "BOM Verification", note: "Material Confirmations", icon: "📋", bg: "FFF1F2", border: "FB7185", valColor: "BE123C", labelColor: "881337" },
      { val: `${completedProjCount}`, label: "Completed Projects", note: "Shop-Floor Commissioned", icon: "🏆", bg: "FEF2F2", border: "F87171", valColor: "B91C1C", labelColor: "7F1D1D" },
      { val: `${ongoingProjCount}`, label: "New Projects / Ongoing", note: "Active Line Trials", icon: "🚀", bg: "ECFEFF", border: "22D3EE", valColor: "0E7490", labelColor: "164E63" }
    ];

    categoryGrid.forEach((k, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const px = 0.8 + col * 2.98;
      const py = 2.78 + row * 1.95;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px, y: py, w: 2.82, h: 1.8,
        fill: { color: k.bg }, line: { color: k.border, width: 1.2 }, rectRadius: 0.1
      });

      slide.addText(`${k.icon}  ${k.val}`, {
        x: px + 0.18, y: py + 0.15, w: 2.46, h: 0.5,
        fontFace: font, fontSize: 24, bold: true, color: k.valColor
      });

      slide.addText(k.label, {
        x: px + 0.18, y: py + 0.7, w: 2.46, h: 0.38,
        fontFace: font, fontSize: 11, bold: true, color: k.labelColor
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px + 0.18, y: py + 1.18, w: 2.46, h: 0.4,
        fill: { color: "FFFFFF" }, line: { color: k.border, width: 0.5 }, rectRadius: 0.05
      });
      slide.addText(k.note, {
        x: px + 0.22, y: py + 1.18, w: 2.38, h: 0.4,
        fontFace: font, fontSize: 8, bold: true, color: k.valColor, valign: "middle"
      });
    });

    this._addExecutiveRedFooter(slide, pptx, font, monthName, 2, totalSlideCount);
  }

  /**
   * Slide 1: Image 3 Replica - Departmental Projects Cover Slide
   */
  _addExecutiveRedCoverSlide(slide, pptx, font, monthName) {
    const navyPrimary = "0B2038";
    const redPrimary = "C5161D";
    const textMuted = "64748B";

    // Top Accent Border
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.333, h: 0.08,
      fill: { color: redPrimary }, line: { color: redPrimary }
    });

    // Top Right subtle identifier
    slide.addText("WALTON AC PROCESS DEVELOPMENT", {
      x: 7.0, y: 0.35, w: 5.5, h: 0.35,
      fontFace: font, fontSize: 9.5, bold: true, color: "94A3B8", align: "right"
    });

    // Center Stage: Walton Logo (Exact 1:1 Aspect Ratio: 1.4 x 1.4 inches centered)
    try {
      slide.addImage({
        path: "assets/img/walton_logo.png",
        x: 5.97, y: 0.85, w: 1.4, h: 1.4,
        sizing: { type: "contain", w: 1.4, h: 1.4 }
      });
    } catch(err) {
      slide.addShape(pptx.ShapeType.diamond, { x: 6.37, y: 1.1, w: 0.6, h: 0.6, fill: { color: redPrimary }, line: { color: redPrimary } });
      slide.addText("WALTON", { x: 0.8, y: 1.8, w: 11.7, h: 0.55, fontFace: font, fontSize: 28, bold: true, color: navyPrimary, align: "center" });
    }

    slide.addText("—  BETTER PRODUCTS | BRIGHTER FUTURE  —", {
      x: 0.8, y: 2.38, w: 11.7, h: 0.3,
      fontFace: font, fontSize: 9.5, bold: true, color: textMuted, align: "center"
    });

    // Main Focus Title (Monthly Report name focus)
    slide.addText("MONTHLY REPORT", {
      x: 0.8, y: 2.78, w: 11.7, h: 0.85,
      fontFace: font, fontSize: 38, bold: true, color: navyPrimary, align: "center"
    });

    // Department Badge (Process Development Department (AC) - Executive Red focus)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 3.66, y: 3.82, w: 6.0, h: 0.52,
      fill: { color: redPrimary }, line: { color: "990000", width: 1.2 }, rectRadius: 0.26
    });
    slide.addText("Process Development Department (AC)", {
      x: 3.66, y: 3.82, w: 6.0, h: 0.52,
      fontFace: font, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // Month Focus Badge (Month focus thakbe - Executive Red focus)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 4.86, y: 4.50, w: 3.6, h: 0.46,
      fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1.2 }, rectRadius: 0.1
    });
    slide.addText(`📅  ${monthName.toUpperCase()}`, {
      x: 4.86, y: 4.50, w: 3.6, h: 0.46,
      fontFace: font, fontSize: 13.5, bold: true, color: redPrimary, align: "center", valign: "middle"
    });

    // Corporate Entity & Location
    slide.addText([
      { text: "Walton Hi-Tech Industries PLC.\n", options: { fontSize: 13, bold: true, color: "0F172A" } },
      { text: "📍 Chandra, Kaliakoir, Gazipur, Bangladesh", options: { fontSize: 10, color: textMuted } }
    ], {
      x: 0.8, y: 5.18, w: 11.7, h: 0.85,
      fontFace: font, align: "center"
    });

    // Grounding Bottom Bars (Walton Crimson Upper Line & Navy Lower Bar)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.05, w: 13.333, h: 0.08,
      fill: { color: redPrimary }, line: { color: redPrimary }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.13, w: 13.333, h: 0.37,
      fill: { color: navyPrimary }, line: { color: navyPrimary }
    });
  }

  /**
   * Slide 3: Executive Strategic Target & FY Comparison Slide (Image 4 Replica)
   */
  _addExecutiveComparisonSlide(slide, pptx, font, monthName, currentSlideNum, totalSlideCount, reportData) {
    const blueDark = "0052CC";
    const greenDark = "00875A";
    const orangeAccent = "FF6B00";

    // Header Pills
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 0.4, w: 5.6, h: 0.55,
      fill: { color: blueDark }, line: { color: blueDark }, rectRadius: 0.15
    });
    slide.addText("📅  |  FY - 25/26", {
      x: 0.8, y: 0.4, w: 5.6, h: 0.55,
      fontFace: font, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.9, y: 0.4, w: 5.6, h: 0.55,
      fill: { color: greenDark }, line: { color: greenDark }, rectRadius: 0.15
    });
    slide.addText("📅  |  FY - 26/27", {
      x: 6.9, y: 0.4, w: 5.6, h: 0.55,
      fontFace: font, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // Left Box: FY 25/26 Metrics
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.1, w: 5.6, h: 3.5,
      fill: { color: "FFFFFF" }, line: { color: "F6AD55", width: 2 }, rectRadius: 0.12
    });
    const metrics25 = [
      "Material Optimization: 12", "Non Moving Utilization: 7", "BOM Tolerance: 17",
      "Capacity Increase: 6", "New Development: 11", "Utility Savings: 7",
      "Manpower Optimization: 6", "Process Optimization: 3", "Wastage Reduction: 8", "Automation: 8"
    ];
    slide.addText(metrics25.map(m => `• ${m}`).join("\n"), {
      x: 1.0, y: 1.25, w: 5.2, h: 2.6,
      fontFace: font, fontSize: 10.5, color: "1E293B", lineSpacing: 18
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.0, y: 3.95, w: 5.2, h: 0.5,
      fill: { color: orangeAccent }, line: { color: orangeAccent }, rectRadius: 0.1
    });
    slide.addText("🎯  |  Total - 85", {
      x: 1.0, y: 3.95, w: 5.2, h: 0.5,
      fontFace: font, fontSize: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // Left Box: Top 5 Projects
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 4.75, w: 5.6, h: 1.9,
      fill: { color: "F0F9FF" }, line: { color: "BAE6FD", width: 1.5 }, rectRadius: 0.12
    });
    slide.addText("🏆 Top 5 Projects", {
      x: 1.0, y: 4.85, w: 5.2, h: 0.35,
      fontFace: font, fontSize: 11, bold: true, color: blueDark
    });
    slide.addText("1. 5mm Evaporator Development\n2. Spiral Tube Manufacturing\n3. Double Row Implementation in CAB Furnace\n4. Booster Pump Implementation (Under UNDP)\n5. MFC 3TR & C ODU Development for Sanhua & Kasun", {
      x: 1.0, y: 5.2, w: 5.2, h: 1.35,
      fontFace: font, fontSize: 9.5, color: "0F172A", lineSpacing: 16
    });

    // Right Box: FY 26/27 Metrics
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.9, y: 1.1, w: 5.6, h: 3.5,
      fill: { color: "FFFFFF" }, line: { color: "68D391", width: 2 }, rectRadius: 0.12
    });
    const metrics26 = [
      "Material Optimization: 3", "Non Moving Utilization: 1", "BOM Tolerance: 6",
      "Capacity Increase: 1", "New Development: 17", "Utility Savings: 3",
      "Process Optimization: 14", "Wastage Reduction: 11", "Automation: 4"
    ];
    slide.addText(metrics26.map(m => `• ${m}`).join("\n"), {
      x: 7.1, y: 1.25, w: 5.2, h: 2.6,
      fontFace: font, fontSize: 10.5, color: "1E293B", lineSpacing: 18
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.1, y: 3.95, w: 5.2, h: 0.5,
      fill: { color: greenDark }, line: { color: greenDark }, rectRadius: 0.1
    });
    slide.addText("🎯  |  Total - 60", {
      x: 7.1, y: 3.95, w: 5.2, h: 0.5,
      fontFace: font, fontSize: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // Right Box: Top 5 Projects
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.9, y: 4.75, w: 5.6, h: 1.9,
      fill: { color: "E8F8F0" }, line: { color: "A7F3D0", width: 1.5 }, rectRadius: 0.12
    });
    slide.addText("🏆 Top 5 Projects", {
      x: 7.1, y: 4.85, w: 5.2, h: 0.35,
      fontFace: font, fontSize: 11, bold: true, color: greenDark
    });
    slide.addText("1. Powder Coating Recycle Project\n2. New Turret Punch Machine Implementation\n3. SS & AL Tube Implementation\n4. New Golden Fin Development\n5. MPE Tube Usability Through Pretreatment", {
      x: 7.1, y: 5.2, w: 5.2, h: 1.35,
      fontFace: font, fontSize: 9.5, color: "0F172A", lineSpacing: 16
    });

    this._addExecutiveRedFooter(slide, pptx, font, monthName, currentSlideNum, totalSlideCount);
  }

  /**
   * Enhanced Dual Before & After Task Slide in PPTX (Industrial Innovation Blue - Image 2 Enhanced Replica)
   */
  _addIndustrialDualBeforeAfterTaskSlide(slide, pptx, task, font, monthName, currentSlideNum, totalSlideCount) {
    const navyPrimary = "0B2038";
    const orangeAccent = "FF6B00";
    const blueCorporate = "0284C7";
    const blueDark = "0052CC";

    const title = task.slide_title || task.task_name || "RAC Vacuum Station Optimized with Booster Pump";
    const status = task.status || "Completed";
    const category = task.category || "Process Improvement";
    const rawEng = task.engineer || task.assignee || "Sazzad (50463)";
    const engineer = (typeof HELPERS !== 'undefined' && HELPERS.formatPersonnelName) 
      ? HELPERS.formatPersonnelName(rawEng) 
      : rawEng;
    const desc = task.description || task.task_details || "With UNDP Investment, we get new booster pump. After installation, NG will be reduced, productivity will increase. Vacuum time will be reduced from 8 min to 5 min.";
    const investment = task.investment || (task.savings ? `BDT ${task.savings}` : "2000 USD");
    const progress = task.progress || (status.toLowerCase().includes("complete") ? 100 : 75);

    const photoBefore = task.photo_before || task.before_photo || task.photo || "";
    const photoAfter = task.photo_after || task.after_photo || "";

    // 1. TOP HEADER BAR
    // Project Title (Front and prominent)
    slide.addText(title, {
      x: 0.8, y: 0.28, w: 7.2, h: 0.52,
      fontFace: font, fontSize: 13.5, bold: true, color: navyPrimary, valign: "middle"
    });

    // Bookmark: Category & Status Pill
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.1, y: 0.35, w: 2.6, h: 0.38,
      fill: { color: orangeAccent }, line: { color: orangeAccent }, rectRadius: 0.08
    });
    slide.addText(status.toUpperCase().includes("COMPLET") ? `Completed • ${category}` : `Ongoing • ${category}`, {
      x: 8.1, y: 0.35, w: 2.6, h: 0.38,
      fontFace: font, fontSize: 8.5, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // Right Kaizen Logo & Slogan
    slide.addText([
      { text: "Continuous Improvement\n", options: { fontSize: 8.5, bold: true, color: navyPrimary } },
      { text: "for Better Production", options: { fontSize: 8, bold: true, color: blueCorporate } }
    ], {
      x: 10.9, y: 0.3, w: 1.6, h: 0.5,
      fontFace: font, align: "right", valign: "middle"
    });

    // 2. LEFT STATUS PILLAR (Full Height)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 0.95, w: 1.8, h: 1.0,
      fill: { color: "E0F2FE" }, line: { color: "BAE6FD", width: 1 }, rectRadius: 0.1
    });
    slide.addText("📋\nPresent Status", {
      x: 0.8, y: 0.95, w: 1.8, h: 1.0,
      fontFace: font, fontSize: 9.5, bold: true, color: "0369A1", align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 2.05, w: 1.8, h: 1.0,
      fill: { color: "E0F2FE" }, line: { color: "BAE6FD", width: 1 }, rectRadius: 0.1
    });
    slide.addText(`\u2713\n${status}`, {
      x: 0.8, y: 2.05, w: 1.8, h: 1.0,
      fontFace: font, fontSize: 11, bold: true, color: blueCorporate, align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 3.15, w: 1.8, h: 0.95,
      fill: { color: "0B2038" }, line: { color: "0052CC", width: 1.5 }, rectRadius: 0.1
    });
    slide.addText([
      { text: "Small Changes\n", options: { fontSize: 10, italic: true, color: "FFFFFF" } },
      { text: "BIG IMPACT", options: { fontSize: 12, bold: true, color: "FBBF24" } }
    ], {
      x: 0.8, y: 3.15, w: 1.8, h: 0.95,
      fontFace: font, align: "center", valign: "middle"
    });

    // 3. CENTER FRAMES: Present Condition (Orange) vs Proposed Project (Blue)
    // Left Box Header
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 2.8, y: 0.95, w: 4.4, h: 0.35,
      fill: { color: "E65100" }, line: { color: "E65100" }, rectRadius: 0.08
    });
    slide.addText("Present Condition", {
      x: 2.8, y: 0.95, w: 4.4, h: 0.35,
      fontFace: font, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });
    // Left Box Photo Frame
    slide.addShape(pptx.ShapeType.rect, {
      x: 2.8, y: 1.3, w: 4.4, h: 2.8,
      fill: { color: "0F172A" }, line: { color: "CBD5E1", width: 1 }
    });
    if (photoBefore && photoBefore.startsWith('data:image/')) {
      try {
        slide.addImage({ data: photoBefore, x: 2.85, y: 1.35, w: 4.3, h: 2.7 });
      } catch (e) {
        this._addEmptyPhotoFrame(slide, pptx, 2.85, 1.35, 4.3, 2.7);
      }
    } else if (photoBefore && (photoBefore.startsWith('http://') || photoBefore.startsWith('https://') || photoBefore.startsWith('assets/'))) {
      try {
        slide.addImage({ path: photoBefore, x: 2.85, y: 1.35, w: 4.3, h: 2.7 });
      } catch (e) {
        this._addEmptyPhotoFrame(slide, pptx, 2.85, 1.35, 4.3, 2.7);
      }
    } else {
      this._addEmptyPhotoFrame(slide, pptx, 2.85, 1.35, 4.3, 2.7);
    }

    // Center Divider: Chevron Arrow with guidelines
    slide.addShape(pptx.ShapeType.line, {
      x: 7.55, y: 1.3, w: 0, h: 1.0,
      line: { color: "BAE6FD", width: 1.5, dashType: "dash" }
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 7.32, y: 2.4, w: 0.55, h: 0.55,
      fill: { color: "FFFFFF" }, line: { color: blueCorporate, width: 2 }
    });
    slide.addText("▶", {
      x: 7.32, y: 2.4, w: 0.55, h: 0.55,
      fontFace: font, fontSize: 11, bold: true, color: blueCorporate, align: "center", valign: "middle"
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 7.55, y: 3.1, w: 0, h: 1.0,
      line: { color: "BAE6FD", width: 1.5, dashType: "dash" }
    });

    // Right Box Header
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.0, y: 0.95, w: 4.4, h: 0.35,
      fill: { color: blueDark }, line: { color: blueDark }, rectRadius: 0.08
    });
    slide.addText("Proposed Project", {
      x: 8.0, y: 0.95, w: 4.4, h: 0.35,
      fontFace: font, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });
    // Right Box Photo Frame
    slide.addShape(pptx.ShapeType.rect, {
      x: 8.0, y: 1.3, w: 4.4, h: 2.8,
      fill: { color: "0F172A" }, line: { color: "CBD5E1", width: 1 }
    });
    if (photoAfter && photoAfter.startsWith('data:image/')) {
      try {
        slide.addImage({ data: photoAfter, x: 8.05, y: 1.35, w: 4.3, h: 2.7 });
      } catch (e) {
        this._addEmptyPhotoFrame(slide, pptx, 8.05, 1.35, 4.3, 2.7);
      }
    } else if (photoAfter && (photoAfter.startsWith('http://') || photoAfter.startsWith('https://') || photoAfter.startsWith('assets/'))) {
      try {
        slide.addImage({ path: photoAfter, x: 8.05, y: 1.35, w: 4.3, h: 2.7 });
      } catch (e) {
        this._addEmptyPhotoFrame(slide, pptx, 8.05, 1.35, 4.3, 2.7);
      }
    } else {
      this._addEmptyPhotoFrame(slide, pptx, 8.05, 1.35, 4.3, 2.7);
    }

    // 4. BOTTOM FUNCTIONAL ROW (Summary & Investment | Radial Gauge | Project Impact Matrix)
    // Left: Summary Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 4.25, w: 4.6, h: 2.45,
      fill: { color: "F0F9FF" }, line: { color: "BAE6FD", width: 1 }, rectRadius: 0.1
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 0.95, y: 4.4, w: 0.32, h: 0.32,
      fill: { color: blueCorporate }, line: { color: blueCorporate }
    });
    slide.addText("📝", {
      x: 0.95, y: 4.4, w: 0.32, h: 0.32,
      fontFace: font, fontSize: 8.5, color: "FFFFFF", align: "center", valign: "middle"
    });
    slide.addText("SUMMARY", {
      x: 1.35, y: 4.38, w: 3.8, h: 0.35,
      fontFace: font, fontSize: 10, bold: true, color: "0369A1", valign: "middle"
    });
    slide.addText(desc, {
      x: 0.95, y: 4.75, w: 4.3, h: 1.25,
      fontFace: font, fontSize: 9, color: "334155", lineSpacing: 13
    });
    // Engineer & Investment Capsules
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.95, y: 6.15, w: 2.1, h: 0.42,
      fill: { color: "F1F5F9" }, line: { color: "CBD5E1", width: 1 }, rectRadius: 0.08
    });
    slide.addText(`👤 ${engineer}`, {
      x: 0.95, y: 6.15, w: 2.1, h: 0.42,
      fontFace: font, fontSize: 8.5, bold: true, color: "334155", align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 3.15, y: 6.15, w: 2.1, h: 0.42,
      fill: { color: "E0F2FE" }, line: { color: "BAE6FD", width: 1 }, rectRadius: 0.08
    });
    slide.addText(`💰 ${investment}`, {
      x: 3.15, y: 6.15, w: 2.1, h: 0.42,
      fontFace: font, fontSize: 8.5, bold: true, color: "0369A1", align: "center", valign: "middle"
    });

    // Center: Radial Completion Ring (Gauge)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.6, y: 4.25, w: 2.2, h: 2.45,
      fill: { color: "F8FAFC" }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1
    });
    // Green circular ring
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 5.95, y: 4.55, w: 1.5, h: 1.5,
      fill: { color: "F0FDF4" }, line: { color: "10B981", width: 4 }
    });
    slide.addText([
      { text: `${progress}%\n`, options: { fontSize: 16, bold: true, color: "059669" } },
      { text: "COMPLETED", options: { fontSize: 8, bold: true, color: "475569" } }
    ], {
      x: 5.95, y: 4.55, w: 1.5, h: 1.5,
      fontFace: font, align: "center", valign: "middle"
    });

    // Right: Project Impact Matrix
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.0, y: 4.25, w: 4.4, h: 2.45,
      fill: { color: "FFFFFF" }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.0, y: 4.25, w: 4.4, h: 0.38,
      fill: { color: blueDark }, line: { color: blueDark }, rectRadius: 0.08
    });
    slide.addText("📈 Project Impact", {
      x: 8.0, y: 4.25, w: 4.4, h: 0.38,
      fontFace: font, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // 4 Colored Impact Pills
    const impactItems = [
      { text: "⚙️  Productivity Increase", bg: "F0F9FF", bdr: "BAE6FD", clr: "0369A1" },
      { text: "⭐  Vacuum Quality improve", bg: "FEF3C7", bdr: "FDE68A", clr: "92400E" },
      { text: "📊  Capacity Increase", bg: "F1F5F9", bdr: "CBD5E1", clr: "334155" },
      { text: "💰  Approximate Yearly Saving - BDT 10,00,000", bg: "ECFDF5", bdr: "A7F3D0", clr: "065F46" }
    ];
    impactItems.forEach((item, idx) => {
      const iy = 4.75 + idx * 0.46;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.15, y: iy, w: 4.1, h: 0.38,
        fill: { color: item.bg }, line: { color: item.bdr, width: 0.75 }, rectRadius: 0.08
      });
      slide.addText(item.text, {
        x: 8.25, y: iy, w: 3.5, h: 0.38,
        fontFace: font, fontSize: 8.5, bold: true, color: item.clr, valign: "middle"
      });
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 11.85, y: iy + 0.08, w: 0.3, h: 0.22,
        fill: { color: item.bdr }, line: { color: item.bdr }
      });
    });

    this._addIndustrialBlueFooter(slide, pptx, font, monthName, currentSlideNum, totalSlideCount);
  }

  /**
   * Executive Crimson Dual Before & After Task Slide in PPTX (Pattern 1)
   */
  _addExecutiveDualBeforeAfterTaskSlide(slide, pptx, task, font, monthName, currentSlideNum, totalSlideCount) {
    const redPrimary = "C5161D";
    const charcoalDark = "0F172A";
    const textMuted = "64748B";

    const title = task.slide_title || task.task_name || "Process Improvement Project";
    const status = task.status || "Completed";
    const category = task.category || "Process Development";
    const rawEng = task.engineer || task.assignee || "Sazzad (50463)";
    const engineer = (typeof HELPERS !== 'undefined' && HELPERS.formatPersonnelName) 
      ? HELPERS.formatPersonnelName(rawEng) 
      : rawEng;
    const desc = task.description || task.task_details || "Implemented engineering process improvement for regular production.";
    const investment = task.investment || (task.savings ? `BDT ${task.savings}` : "In-house / Direct");
    const progress = task.progress || (status.toLowerCase().includes("complete") ? 100 : 75);

    const photoBefore = task.photo_before || task.before_photo || task.photo || "";
    const photoAfter = task.photo_after || task.after_photo || "";

    // 1. Header Bar
    slide.addShape(pptx.ShapeType.diamond, {
      x: 0.8, y: 0.35, w: 0.4, h: 0.4,
      fill: { color: redPrimary }, line: { color: redPrimary }
    });
    // Project Title (Front and prominent)
    slide.addText(title, {
      x: 1.35, y: 0.28, w: 6.8, h: 0.52,
      fontFace: font, fontSize: 13.5, bold: true, color: charcoalDark, valign: "middle"
    });
    // Category pill / Project Badge
    const catLower = category.toLowerCase();
    const titleLower = (title || "").toLowerCase();
    const statusLower = (status || "").toLowerCase();
    const isProj = Boolean(task.is_project || catLower.includes('project') || titleLower.includes('project'));
    const isCompletedProj = isProj && (statusLower.includes('complete') || catLower.includes('completed'));

    let dualBadgeText = "PROCESS IMPROVEMENT";
    let dualBadgeFill = "FEE2E2";
    let dualBadgeBorder = "FCA5A5";
    let dualTextColor = redPrimary;
    let dualBadgeW = 2.2;
    if (isProj) {
      if (isCompletedProj) {
        dualBadgeText = "STRATEGIC PROJECT • COMPLETED";
        dualBadgeFill = "D1FAE5";
        dualBadgeBorder = "6EE7B7";
        dualTextColor = "047857";
        dualBadgeW = 3.2;
      } else {
        dualBadgeText = "STRATEGIC PROJECT • ONGOING";
        dualBadgeFill = "E0F2FE";
        dualBadgeBorder = "7DD3FC";
        dualTextColor = "0369A1";
        dualBadgeW = 3.0;
      }
    }

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 10.5 - dualBadgeW, y: 0.35, w: dualBadgeW, h: 0.38,
      fill: { color: dualBadgeFill }, line: { color: dualBadgeBorder, width: 0.5 }, rectRadius: 0.08
    });
    slide.addText(dualBadgeText, {
      x: 10.5 - dualBadgeW, y: 0.35, w: dualBadgeW, h: 0.38,
      fontFace: font, fontSize: 8, bold: true, color: dualTextColor, align: "center", valign: "middle"
    });
    slide.addText([
      { text: "SMALL CHANGES\n", options: { fontSize: 8, bold: true, color: textMuted } },
      { text: "BIG IMPACT", options: { fontSize: 13, bold: true, color: redPrimary } }
    ], {
      x: 10.6, y: 0.28, w: 1.9, h: 0.55,
      fontFace: font, align: "right", valign: "middle"
    });

    // 2. Left Pillar
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 0.95, w: 1.8, h: 1.0,
      fill: { color: "F8FAFC" }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1
    });
    slide.addText("📋\nPresent Status", {
      x: 0.8, y: 0.95, w: 1.8, h: 1.0,
      fontFace: font, fontSize: 9.5, bold: true, color: charcoalDark, align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 2.05, w: 1.8, h: 1.0,
      fill: { color: "FEE2E2" }, line: { color: "FCA5A5", width: 1 }, rectRadius: 0.1
    });
    slide.addText(`\u2713\n${status}`, {
      x: 0.8, y: 2.05, w: 1.8, h: 1.0,
      fontFace: font, fontSize: 11, bold: true, color: redPrimary, align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 3.15, w: 1.8, h: 0.95,
      fill: { color: redPrimary }, line: { color: redPrimary }, rectRadius: 0.1
    });
    slide.addText([
      { text: "Small Changes\n", options: { fontSize: 10, italic: true, color: "FFFFFF" } },
      { text: "BIG IMPACT", options: { fontSize: 12, bold: true, color: "FEF08A" } }
    ], {
      x: 0.8, y: 3.15, w: 1.8, h: 0.95,
      fontFace: font, align: "center", valign: "middle"
    });

    // 3. Photo Frames
    // Left: Before
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 2.8, y: 0.95, w: 4.4, h: 0.35,
      fill: { color: "D97706" }, line: { color: "D97706" }, rectRadius: 0.08
    });
    slide.addText("1. PRESENT CONDITION (BEFORE)", {
      x: 2.8, y: 0.95, w: 4.4, h: 0.35,
      fontFace: font, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 2.8, y: 1.3, w: 4.4, h: 2.8,
      fill: { color: "0F172A" }, line: { color: "CBD5E1", width: 1 }
    });
    if (photoBefore && photoBefore.startsWith('data:image/')) {
      try { slide.addImage({ data: photoBefore, x: 2.85, y: 1.35, w: 4.3, h: 2.7 }); }
      catch (e) { this._addEmptyPhotoFrame(slide, pptx, 2.85, 1.35, 4.3, 2.7); }
    } else if (photoBefore && (photoBefore.startsWith('http://') || photoBefore.startsWith('https://') || photoBefore.startsWith('assets/'))) {
      try { slide.addImage({ path: photoBefore, x: 2.85, y: 1.35, w: 4.3, h: 2.7 }); }
      catch (e) { this._addEmptyPhotoFrame(slide, pptx, 2.85, 1.35, 4.3, 2.7); }
    } else {
      this._addEmptyPhotoFrame(slide, pptx, 2.85, 1.35, 4.3, 2.7);
    }

    // Center divider
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 7.32, y: 2.4, w: 0.55, h: 0.55,
      fill: { color: "FFFFFF" }, line: { color: redPrimary, width: 2 }
    });
    slide.addText("▶", {
      x: 7.32, y: 2.4, w: 0.55, h: 0.55,
      fontFace: font, fontSize: 11, bold: true, color: redPrimary, align: "center", valign: "middle"
    });

    // Right: After
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.0, y: 0.95, w: 4.4, h: 0.35,
      fill: { color: redPrimary }, line: { color: redPrimary }, rectRadius: 0.08
    });
    slide.addText("2. PROPOSED PROJECT (AFTER)", {
      x: 8.0, y: 0.95, w: 4.4, h: 0.35,
      fontFace: font, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 8.0, y: 1.3, w: 4.4, h: 2.8,
      fill: { color: "0F172A" }, line: { color: "CBD5E1", width: 1 }
    });
    if (photoAfter && photoAfter.startsWith('data:image/')) {
      try { slide.addImage({ data: photoAfter, x: 8.05, y: 1.35, w: 4.3, h: 2.7 }); }
      catch (e) { this._addEmptyPhotoFrame(slide, pptx, 8.05, 1.35, 4.3, 2.7); }
    } else if (photoAfter && (photoAfter.startsWith('http://') || photoAfter.startsWith('https://') || photoAfter.startsWith('assets/'))) {
      try { slide.addImage({ path: photoAfter, x: 8.05, y: 1.35, w: 4.3, h: 2.7 }); }
      catch (e) { this._addEmptyPhotoFrame(slide, pptx, 8.05, 1.35, 4.3, 2.7); }
    } else {
      this._addEmptyPhotoFrame(slide, pptx, 8.05, 1.35, 4.3, 2.7);
    }

    // 4. Bottom Row
    // Left: Summary & Investment
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 4.25, w: 4.6, h: 2.45,
      fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 }, rectRadius: 0.1
    });
    slide.addText("PROJECT SUMMARY", {
      x: 1.0, y: 4.38, w: 4.2, h: 0.35,
      fontFace: font, fontSize: 10, bold: true, color: redPrimary
    });
    slide.addText(desc, {
      x: 1.0, y: 4.75, w: 4.2, h: 1.25,
      fontFace: font, fontSize: 9, color: "334155", lineSpacing: 13
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.0, y: 6.15, w: 2.05, h: 0.42,
      fill: { color: "FFFFFF" }, line: { color: "FECACA", width: 1 }, rectRadius: 0.08
    });
    slide.addText(`👤 ${engineer}`, {
      x: 1.05, y: 6.15, w: 1.95, h: 0.42,
      fontFace: font, fontSize: 8.5, bold: true, color: "334155", align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 3.15, y: 6.15, w: 2.05, h: 0.42,
      fill: { color: "FFFFFF" }, line: { color: "FECACA", width: 1 }, rectRadius: 0.08
    });
    slide.addText(`💰 ${investment}`, {
      x: 3.2, y: 6.15, w: 1.95, h: 0.42,
      fontFace: font, fontSize: 8.5, bold: true, color: redPrimary, align: "center", valign: "middle"
    });

    // Center: Progress
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.6, y: 4.25, w: 2.2, h: 2.45,
      fill: { color: "FFF1F2" }, line: { color: "FECACA", width: 1 }, rectRadius: 0.1
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 5.95, y: 4.55, w: 1.5, h: 1.5,
      fill: { color: "FFFFFF" }, line: { color: redPrimary, width: 4 }
    });
    slide.addText([
      { text: `${progress}%\n`, options: { fontSize: 16, bold: true, color: redPrimary } },
      { text: "COMPLETED", options: { fontSize: 8, bold: true, color: "475569" } }
    ], {
      x: 5.95, y: 4.55, w: 1.5, h: 1.5,
      fontFace: font, align: "center", valign: "middle"
    });

    // Right: Impact
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.0, y: 4.25, w: 4.4, h: 2.45,
      fill: { color: "FFFFFF" }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.0, y: 4.25, w: 4.4, h: 0.38,
      fill: { color: redPrimary }, line: { color: redPrimary }, rectRadius: 0.08
    });
    slide.addText("📈 Project Impact", {
      x: 8.0, y: 4.25, w: 4.4, h: 0.38,
      fontFace: font, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    const crimItems = [
      { text: "⚙️  Process Consistency & Quality", bg: "FEF2F2", bdr: "FECACA", clr: redPrimary },
      { text: "⚡  Cycle Time Reduction", bg: "FFF7ED", bdr: "FED7AA", clr: "C2410C" },
      { text: "📊  Capacity & OEE Increase", bg: "F8FAFC", bdr: "E2E8F0", clr: "334155" },
      { text: "💰  Direct Material & Labor Savings", bg: "ECFDF5", bdr: "A7F3D0", clr: "065F46" }
    ];
    crimItems.forEach((item, idx) => {
      const iy = 4.75 + idx * 0.46;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.15, y: iy, w: 4.1, h: 0.38,
        fill: { color: item.bg }, line: { color: item.bdr, width: 0.75 }, rectRadius: 0.08
      });
      slide.addText(item.text, {
        x: 8.25, y: iy, w: 3.5, h: 0.38,
        fontFace: font, fontSize: 8.5, bold: true, color: item.clr, valign: "middle"
      });
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 11.85, y: iy + 0.08, w: 0.3, h: 0.22,
        fill: { color: item.bdr }, line: { color: item.bdr }
      });
    });

    this._addExecutiveRedFooter(slide, pptx, font, monthName, currentSlideNum, totalSlideCount);
  }

  /**
   * Backward-compatible alias for Dual Before/After slide
   */
  _addDualBeforeAfterTaskSlide(slide, pptx, task, font, monthName, currentSlideNum, totalSlideCount) {
    this._addIndustrialDualBeforeAfterTaskSlide(slide, pptx, task, font, monthName, currentSlideNum, totalSlideCount);
  }

  /**
   * Slide N+2: Executive Closing Scale & Savings Slide (Image 5 Replica)
   */
  _addExecutiveClosingSlide(slide, pptx, font, monthName, currentSlideNum, totalSlideCount, reportData) {
    const blueDark = "0052CC";
    const greenDark = "00875A";

    // Top Pills
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.0, y: 0.5, w: 5.2, h: 0.6,
      fill: { color: blueDark }, line: { color: blueDark }, rectRadius: 0.15
    });
    slide.addText("📅  FY - 25/26", {
      x: 1.0, y: 0.5, w: 5.2, h: 0.6,
      fontFace: font, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.1, y: 0.5, w: 5.2, h: 0.6,
      fill: { color: greenDark }, line: { color: greenDark }, rectRadius: 0.15
    });
    slide.addText("📅  FY - 26/27", {
      x: 7.1, y: 0.5, w: 5.2, h: 0.6,
      fontFace: font, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // Down arrows
    slide.addText("⬇", { x: 3.3, y: 1.2, w: 0.6, h: 0.4, fontSize: 16, bold: true, color: blueDark, align: "center" });
    slide.addText("⬇", { x: 9.4, y: 1.2, w: 0.6, h: 0.4, fontSize: 16, bold: true, color: greenDark, align: "center" });

    // Total Projects Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.0, y: 1.65, w: 5.2, h: 0.8,
      fill: { color: "EBF3FF" }, line: { color: "90CDF4", width: 2 }, rectRadius: 0.12
    });
    slide.addText("📄 Total Projects - 85", {
      x: 1.0, y: 1.65, w: 5.2, h: 0.8,
      fontFace: font, fontSize: 18, bold: true, color: "0F172A", align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.1, y: 1.65, w: 5.2, h: 0.8,
      fill: { color: "E8F8F0" }, line: { color: "A7F3D0", width: 2 }, rectRadius: 0.12
    });
    slide.addText("📄 Total Projects - 60", {
      x: 7.1, y: 1.65, w: 5.2, h: 0.8,
      fontFace: font, fontSize: 18, bold: true, color: "0F172A", align: "center", valign: "middle"
    });

    // Down arrows
    slide.addText("⬇", { x: 3.3, y: 2.55, w: 0.6, h: 0.4, fontSize: 16, bold: true, color: blueDark, align: "center" });
    slide.addText("⬇", { x: 9.4, y: 2.55, w: 0.6, h: 0.4, fontSize: 16, bold: true, color: greenDark, align: "center" });

    // Categorization Split Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.0, y: 3.0, w: 5.2, h: 2.0,
      fill: { color: "FEF3C7" }, line: { color: "F6AD55", width: 2 }, rectRadius: 0.12
    });
    slide.addText("⭐ Major Projects      - 7\n⚙️ Moderate Projects  - 25\n📊 Minor Projects     - 53", {
      x: 1.3, y: 3.2, w: 4.6, h: 1.6,
      fontFace: font, fontSize: 13, bold: true, color: "0F172A", lineSpacing: 22
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.1, y: 3.0, w: 5.2, h: 2.0,
      fill: { color: "DCFCE7" }, line: { color: "68D391", width: 2 }, rectRadius: 0.12
    });
    slide.addText("⭐ Major Projects      - 9\n⚙️ Moderate Projects  - 16\n📊 Minor Projects     - 35", {
      x: 7.4, y: 3.2, w: 4.6, h: 1.6,
      fontFace: font, fontSize: 13, bold: true, color: "0F172A", lineSpacing: 22
    });

    // Down arrows
    slide.addText("⬇", { x: 3.3, y: 5.1, w: 0.6, h: 0.4, fontSize: 16, bold: true, color: blueDark, align: "center" });
    slide.addText("⬇", { x: 9.4, y: 5.1, w: 0.6, h: 0.4, fontSize: 16, bold: true, color: greenDark, align: "center" });

    // Total Savings Capsules
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.0, y: 5.55, w: 5.2, h: 0.85,
      fill: { color: blueDark }, line: { color: blueDark }, rectRadius: 0.42
    });
    slide.addText("💰 Total Savings (BDT) - 5.86 Crore", {
      x: 1.0, y: 5.55, w: 5.2, h: 0.85,
      fontFace: font, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.1, y: 5.55, w: 5.2, h: 0.85,
      fill: { color: greenDark }, line: { color: greenDark }, rectRadius: 0.42
    });
    slide.addText("💰 Total Savings (BDT) - 8.13 Crore (Prediction)", {
      x: 7.1, y: 5.55, w: 5.2, h: 0.85,
      fontFace: font, fontSize: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    this._addExecutiveRedFooter(slide, pptx, font, monthName, currentSlideNum, totalSlideCount);
  }

  /**
   * Reusable: Photo 1 Style Royal Blue Header Banner
   */
  _addPhoto1TopBanner(slide, pptx, font, titleText) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 0.35, w: 11.73, h: 0.72,
      fill: { color: "2563EB" }, line: { color: "1D4ED8", width: 1 }, rectRadius: 0.08
    });
    slide.addText(titleText.toUpperCase(), {
      x: 0.8, y: 0.35, w: 11.73, h: 0.72,
      fontFace: font, fontSize: 16, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });
  }

  /**
   * Reusable: Photo 1 Style 4-Color Metric Cards Row
   */
  _addPhoto1MetricRow(slide, pptx, font, cards) {
    const cardDefaults = [
      { bg: "1E40AF", border: "1D4ED8", label: "TOTAL OVERDUE", val: "8", sub: "Priority Task" },
      { bg: "6366F1", border: "4F46E5", label: "AVERAGE PERFORMANCE", val: "92%", sub: "Operational Quality" },
      { bg: "0284C7", border: "0369A1", label: "TOTAL HOURS WORKED", val: "160", sub: "Plant Standard" },
      { bg: "F59E0B", border: "D97706", label: "TOTAL OVERTIME HOURS", val: "32", sub: "Production Demand" }
    ];

    cards.slice(0, 4).forEach((c, idx) => {
      const def = cardDefaults[idx];
      const px = 0.8 + idx * 2.98;
      const py = 1.22;
      const bg = c.bg || def.bg;
      const border = c.border || def.border;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px, y: py, w: 2.78, h: 1.35,
        fill: { color: bg }, line: { color: border, width: 1.2 }, rectRadius: 0.08
      });

      // Label (Photo 1 small white uppercase)
      slide.addText((c.label || def.label).toUpperCase(), {
        x: px + 0.1, y: py + 0.12, w: 2.58, h: 0.28,
        fontFace: font, fontSize: 8.5, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      // Big Bold White Value
      slide.addText(String(c.val || def.val), {
        x: px + 0.1, y: py + 0.38, w: 2.58, h: 0.58,
        fontFace: font, fontSize: 26, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      // Subtitle / Pill
      if (c.sub) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: px + 0.39, y: py + 0.98, w: 2.0, h: 0.24,
          fill: { color: "FFFFFF", transparency: 80 }, line: { color: "FFFFFF", transparency: 75, width: 0.5 }, rectRadius: 0.04
        });
        slide.addText(c.sub, {
          x: px + 0.39, y: py + 0.98, w: 2.0, h: 0.24,
          fontFace: font, fontSize: 7.5, bold: true, color: "FFFFFF", align: "center", valign: "middle"
        });
      }
    });
  }

  /**
   * Helper: Calculate dynamic page numbers for Photo 3 Table of Contents
   */
  _calculateCategoryPageRanges(taskSlides = [], totalSlideCount = 15) {
    let currentSlide = 4;
    const catPageMap = {};

    if (Array.isArray(taskSlides)) {
      taskSlides.forEach(task => {
        const cat = (task.category || '').toLowerCase();
        let key = 'process';
        if (cat.includes('material') || cat.includes('chemical')) key = 'material';
        else if (cat.includes('cost')) key = 'cost';
        else if (cat.includes('tool') || cat.includes('part') || cat.includes('die')) key = 'tools';
        else if (cat.includes('bom')) key = 'bom';
        else if (task.is_project || cat.includes('project')) key = 'project';
        else key = 'process';

        if (!catPageMap[key]) {
          catPageMap[key] = { start: currentSlide, end: currentSlide, count: 1 };
        } else {
          catPageMap[key].end = currentSlide;
          catPageMap[key].count++;
        }
        currentSlide++;
      });
    }

    const formatRange = (range) => {
      if (!range) return "Page No. —";
      const s = String(range.start).padStart(2, '0');
      const e = String(range.end).padStart(2, '0');
      return s === e ? `Page No. ${s}` : `Page No. ${s}–${e}`;
    };

    const finalPageStr = String(totalSlideCount).padStart(2, '0');

    return [
      { num: "01", title: "Summary", sub: "Operations & Financial Cost Impact", page: "Page No. 03" },
      { num: "02", title: "Major Developments", sub: "(Process & Others)", page: formatRange(catPageMap['process']) },
      { num: "03", title: "Major Developments", sub: "(Materials & Chemical Development)", page: formatRange(catPageMap['material']) },
      { num: "04", title: "Major Developments", sub: "(Cost Savings)", page: formatRange(catPageMap['cost']) },
      { num: "05", title: "Major Developments", sub: "(Tools+Parts)", page: formatRange(catPageMap['tools']) },
      { num: "06", title: "BOM Verification", sub: "Material & Process Confirmations", page: formatRange(catPageMap['bom']) },
      { num: "07", title: "Ongoing Project & Completed Works", sub: "Shop-Floor Line Automation", page: formatRange(catPageMap['project']) },
      { num: "08", title: "Top 5 Works & Projects", sub: "Executive Summary & Milestones", page: `Page No. ${finalPageStr}` }
    ];
  }

  /**
   * Photo 3: Table of Contents Builder (8 Category-Wise Sections with Dynamic Pages)
   */
  _buildPhoto3TableOfContents(slide, pptx, font, monthName, tasksOrCount, totalSlideCount, isBlue = false) {
    const navyPrimary = "0B2038";
    const primaryAccent = isBlue ? "0284C7" : "C5161D";

    // Top Header Banner or Executive Header
    if (isBlue) {
      this._addPhoto1TopBanner(slide, pptx, font, "PROCESS DEVELOPMENT DEPARTMENT (AC) • TABLE OF CONTENTS");
      slide.addText("TABLE OF CONTENTS", {
        x: 0.8, y: 0.96, w: 11.73, h: 0.35,
        fontFace: font, fontSize: 13, bold: true, color: navyPrimary, letterSpacing: 1.5
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.8, y: 1.33, w: 11.73, h: 0.025,
        fill: { color: "0284C7" }
      });
    } else {
      // Executive Red Layout Header
      slide.addShape(pptx.ShapeType.diamond, {
        x: 0.8, y: 0.22, w: 0.35, h: 0.35,
        fill: { color: primaryAccent }, line: { color: primaryAccent }
      });
      slide.addText([
        { text: "PROCESS DEVELOPMENT DEPARTMENT (AC)\n", options: { fontSize: 10, bold: true, color: "0F172A" } },
        { text: "INNOVATE  |  IMPROVE  |  DELIVER", options: { fontSize: 7.5, bold: true, color: "64748B" } }
      ], {
        x: 1.25, y: 0.18, w: 5.5, h: 0.45,
        fontFace: font, valign: "middle"
      });
      slide.addText([
        { text: "SMALL CHANGES\n", options: { fontSize: 8, bold: true, color: "64748B" } },
        { text: "BIG IMPACT", options: { fontSize: 13, bold: true, color: primaryAccent } }
      ], {
        x: 9.5, y: 0.18, w: 3.0, h: 0.45,
        fontFace: font, align: "right", valign: "middle"
      });

      slide.addText("TABLE OF CONTENTS", {
        x: 0.8, y: 0.70, w: 11.73, h: 0.32,
        fontFace: font, fontSize: 14, bold: true, color: navyPrimary, letterSpacing: 1.2
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.8, y: 1.05, w: 11.73, h: 0.025,
        fill: { color: primaryAccent }
      });
    }

    const tasks = Array.isArray(tasksOrCount) ? tasksOrCount : [];
    const items = this._calculateCategoryPageRanges(tasks, totalSlideCount);

    const startY = isBlue ? 1.48 : 1.18;
    const cardH = isBlue ? 1.16 : 1.22;
    const rowGap = isBlue ? 1.30 : 1.34;
    const pillFill = isBlue ? "F0F9FF" : "FEF2F2";
    const pillLine = isBlue ? "BAE6FD" : "FECACA";
    const pillColor = isBlue ? "0369A1" : "C5161D";

    // Render 8 items in 2 columns (4 rows)
    items.forEach((item, idx) => {
      const isLeft = idx < 4;
      const colX = isLeft ? 0.80 : 6.78;
      const rowIdx = isLeft ? idx : (idx - 4);
      const rowY = startY + rowIdx * rowGap;

      // Card Container
      slide.addShape(pptx.ShapeType.roundRect, {
        x: colX, y: rowY, w: 5.75, h: cardH,
        fill: { color: "FFFFFF" }, line: { color: "E2E8F0", width: 1.2 }, rectRadius: 0.08
      });

      // Left Accent Strip
      slide.addShape(pptx.ShapeType.roundRect, {
        x: colX, y: rowY, w: 0.09, h: cardH,
        fill: { color: primaryAccent }, line: { color: primaryAccent }, rectRadius: 0.04
      });

      // Number badge
      slide.addText(item.num, {
        x: colX + 0.18, y: rowY + 0.15, w: 0.75, h: 0.85,
        fontFace: font, fontSize: 24, bold: true, color: primaryAccent, align: "center", valign: "middle"
      });

      // Title & Subtitle
      slide.addText([
        { text: `${item.title}\n`, options: { fontSize: 11.5, bold: true, color: "0F172A" } },
        { text: item.sub, options: { fontSize: 9, color: "64748B" } }
      ], {
        x: colX + 1.0, y: rowY + 0.15, w: 3.25, h: 0.85,
        fontFace: font, valign: "middle"
      });

      // Page Badge Pill
      slide.addShape(pptx.ShapeType.roundRect, {
        x: colX + 4.30, y: rowY + 0.42, w: 1.32, h: 0.38,
        fill: { color: pillFill }, line: { color: pillLine, width: 1 }, rectRadius: 0.06
      });
      slide.addText(item.page, {
        x: colX + 4.30, y: rowY + 0.42, w: 1.32, h: 0.38,
        fontFace: font, fontSize: 8.5, bold: true, color: pillColor, align: "center", valign: "middle"
      });
    });

    if (isBlue) {
      this._addIndustrialBlueFooter(slide, pptx, font, monthName, 2, totalSlideCount);
    } else {
      this._addExecutiveRedFooter(slide, pptx, font, monthName, 2, totalSlideCount);
    }
  }

  /**
   * Photo 4: Operations & Performance Dashboard Builder (AC Product)
   * Exact layout: 5-Month Table + 2 Highlight Blocks + 8 Core Development KPIs
   */
  _buildPhoto4DashboardSlide(slide, pptx, font, monthName, totalSlideCount, data = null, isBlue = false) {
    const charcoalDark = "0F172A";

    // Top Header Banner or Executive Walton Header
    if (isBlue) {
      this._addPhoto1TopBanner(slide, pptx, font, "AC PRODUCT • PROCESS DEVELOPMENT OPERATIONS & PERFORMANCE DASHBOARD");
    } else {
      // Walton Executive Red Layout Header
      slide.addShape(pptx.ShapeType.diamond, {
        x: 0.8, y: 0.22, w: 0.35, h: 0.35,
        fill: { color: "C5161D" }, line: { color: "C5161D" }
      });
      slide.addText([
        { text: "PROCESS DEVELOPMENT DEPARTMENT (AC)\n", options: { fontSize: 10, bold: true, color: "0F172A" } },
        { text: "INNOVATE  |  IMPROVE  |  DELIVER", options: { fontSize: 7.5, bold: true, color: "64748B" } }
      ], {
        x: 1.25, y: 0.18, w: 5.5, h: 0.45,
        fontFace: font, valign: "middle"
      });
      slide.addText([
        { text: "SMALL CHANGES\n", options: { fontSize: 8, bold: true, color: "64748B" } },
        { text: "BIG IMPACT", options: { fontSize: 13, bold: true, color: "C5161D" } }
      ], {
        x: 9.5, y: 0.18, w: 3.0, h: 0.45,
        fontFace: font, align: "right", valign: "middle"
      });

      // Subheader with AC Product Pill
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 0.64, w: 1.25, h: 0.26,
        fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 }, rectRadius: 0.13
      });
      slide.addText("AC PRODUCT", {
        x: 0.8, y: 0.64, w: 1.25, h: 0.26,
        fontFace: font, fontSize: 8.5, bold: true, color: "C5161D", align: "center", valign: "middle"
      });
      slide.addText("Process Development Operations & Performance Dashboard", {
        x: 2.15, y: 0.62, w: 7.2, h: 0.30,
        fontFace: font, fontSize: 13, bold: true, color: "0B2038", valign: "middle"
      });
      slide.addText(`📅  ${monthName.toUpperCase()}`, {
        x: 9.5, y: 0.62, w: 3.0, h: 0.30,
        fontFace: font, fontSize: 9.5, bold: true, color: "64748B", align: "right", valign: "middle"
      });
    }

    // Dynamic Rolling calculation
    let rolling = null;
    if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.getRolling6Months) {
      rolling = CostSavingTracker.getRolling6Months(monthName);
    }

    let currentImpact = (data && data.currentImpact) || "0 TK";
    let yearlyImpact = (data && data.yearlyImpact) || "0 TK";

    if (rolling && Array.isArray(rolling.months)) {
      if (rolling.displayCurrentMonth) currentImpact = rolling.displayCurrentMonth;
      if (rolling.displayCumulativeYTD) yearlyImpact = rolling.displayCumulativeYTD;
    }

    if (typeof CostSavingTracker !== 'undefined') {
      const ct = CostSavingTracker.calculate([], monthName);
      if (ct.displayCumulativeYTD) yearlyImpact = ct.displayCumulativeYTD;
      if (ct.displayMonthlySaving) currentImpact = ct.displayMonthlySaving;
    }

    currentImpact = String(currentImpact).replace(/\s*TK(\s*TK)+/gi, " TK");
    yearlyImpact = String(yearlyImpact).replace(/\s*TK(\s*TK)+/gi, " TK");
    if (!currentImpact.toUpperCase().includes("TK")) currentImpact += " TK";
    if (!yearlyImpact.toUpperCase().includes("TK")) yearlyImpact += " TK";

    // 5-Month Table data
    let tableMonths = [
      { m: "January", val: "BDT 117,600" },
      { m: "February", val: "BDT 329,620" },
      { m: "March", val: "BDT 1,208,308" },
      { m: "April", val: "BDT 133,830" },
      { m: "May", val: "BDT 336,995" }
    ];

    if (rolling && Array.isArray(rolling.months) && rolling.months.length >= 5) {
      tableMonths = rolling.months.slice(-5).map(m => ({ m: m.label || m.shortLabel, val: m.displayAmount }));
    }

    const topSectionY = isBlue ? 1.0 : 0.98;
    const tableHeaderFill = isBlue ? "1E40AF" : "C5161D";

    // TOP CONTAINER (y: topSectionY, w: 11.73, h: 1.70)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: topSectionY, w: 11.73, h: 1.70,
      fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1.2 }, rectRadius: 0.08
    });

    // Left Side of Top Container: 5-Month Savings Table
    const tableRows = [
      [
        { text: "Month", options: { bold: true, fill: tableHeaderFill, color: "FFFFFF", fontSize: 8.5 } },
        { text: "Impact (BDT)", options: { bold: true, fill: tableHeaderFill, color: "FFFFFF", align: "right", fontSize: 8.5 } }
      ],
      ...tableMonths.map((row, idx) => [
        { text: row.m, options: { bold: (idx === tableMonths.length - 1), color: (idx === tableMonths.length - 1 ? (isBlue ? "2563EB" : "C5161D") : charcoalDark), fill: (idx % 2 === 0 ? "FFFFFF" : "F8FAFC"), fontSize: 8 } },
        { text: row.val, options: { bold: true, align: "right", color: (idx === tableMonths.length - 1 ? (isBlue ? "2563EB" : "C5161D") : charcoalDark), fill: (idx % 2 === 0 ? "FFFFFF" : "F8FAFC"), fontSize: 8 } }
      ])
    ];

    slide.addTable(tableRows, {
      x: 0.95, y: topSectionY + 0.08, w: 5.4, h: 1.52,
      fontFace: font, border: { pt: 0.5, color: "E2E8F0" },
      align: "left", valign: "middle"
    });

    // Right Side of Top Container: 2 Highlight Cards
    // Top Card: Current Month Impact
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.55, y: topSectionY + 0.08, w: 5.8, h: 0.72,
      fill: { color: "F8FAFC" }, line: { color: "CBD5E1", width: 1 }, rectRadius: 0.06
    });
    slide.addText("🪙", {
      x: 6.68, y: topSectionY + 0.15, w: 0.55, h: 0.55,
      fontFace: font, fontSize: 18, align: "center", valign: "middle"
    });
    slide.addText([
      { text: `${currentImpact}\n`, options: { fontSize: 18, bold: true, color: charcoalDark } },
      { text: `${monthName.toUpperCase()}`, options: { fontSize: 8.5, bold: true, color: "64748B" } }
    ], {
      x: 7.3, y: topSectionY + 0.12, w: 4.85, h: 0.62,
      fontFace: font, align: "right", valign: "middle"
    });

    // Bottom Card: Yearly Impact
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.55, y: topSectionY + 0.88, w: 5.8, h: 0.72,
      fill: { color: "F8FAFC" }, line: { color: "CBD5E1", width: 1 }, rectRadius: 0.06
    });
    slide.addText("📈", {
      x: 6.68, y: topSectionY + 0.95, w: 0.55, h: 0.55,
      fontFace: font, fontSize: 18, align: "center", valign: "middle"
    });
    slide.addText([
      { text: "Yearly Impact (FY 25-26)\n", options: { fontSize: 8.5, bold: true, color: "64748B" } },
      { text: `${yearlyImpact}`, options: { fontSize: 18, bold: true, color: charcoalDark } }
    ], {
      x: 7.3, y: topSectionY + 0.92, w: 4.85, h: 0.62,
      fontFace: font, align: "right", valign: "middle"
    });

    // BOTTOM CONTAINER (y: 2.85 to 6.65): 8 Development KPI Cards (Photo 4 Exact)
    const kpiCards = [
      {
        icon: "⚙",
        val: (data && data.kpis && data.kpis[0] ? data.kpis[0].val : "51"),
        label: "Process Developed",
        note: (yearlyImpact !== "0 TK" ? `Cost Saved: BDT ${yearlyImpact}/Year` : null)
      },
      {
        icon: "🔧",
        val: (data && data.kpis && data.kpis[1] ? data.kpis[1].val : "3"),
        label: "Tools Developed",
        note: null
      },
      {
        icon: "■",
        val: (data && data.kpis && data.kpis[2] ? data.kpis[2].val : "6"),
        label: "Parts Developed",
        note: null
      },
      {
        icon: "💰",
        val: (data && data.kpis && data.kpis[3] ? data.kpis[3].val : "1"),
        label: "Cost Optimisation",
        note: (yearlyImpact !== "0 TK" ? `Cost Saved: BDT ${yearlyImpact}/Year` : null)
      },
      {
        icon: "👥",
        val: (data && data.kpis && data.kpis[4] ? data.kpis[4].val : "0"),
        label: "Manpower Optimization",
        note: null
      },
      {
        icon: "📋",
        val: (data && data.kpis && data.kpis[5] ? data.kpis[5].val : "32"),
        label: "BOM Verification",
        note: null
      },
      {
        icon: "✔",
        val: (data && data.kpis && data.kpis[6] ? data.kpis[6].val : "0"),
        label: "Completed Projects",
        note: null
      },
      {
        icon: "🚀",
        val: (data && data.kpis && data.kpis[7] ? data.kpis[7].val : "1"),
        label: "New Projects/ Ongoing",
        note: "Cost Save Scope: Target FY 26-27"
      }
    ];

    const cardBorderColor = isBlue ? "0284C7" : "E2E8F0";
    const cardBorderWidth = isBlue ? 2 : 1.2;

    kpiCards.forEach((kpi, idx) => {
      const colIdx = idx % 4;
      const rowIdx = Math.floor(idx / 4);
      const colX = 0.80 + colIdx * 2.98;
      const rowY = 2.85 + rowIdx * 1.95;

      // Card Container
      slide.addShape(pptx.ShapeType.roundRect, {
        x: colX, y: rowY, w: 2.78, h: 1.80,
        fill: { color: "FFFFFF" }, line: { color: cardBorderColor, width: cardBorderWidth }, rectRadius: 0.12
      });

      if (!isBlue) {
        // Red Top Accent Strip for Executive Red pattern
        slide.addShape(pptx.ShapeType.roundRect, {
          x: colX, y: rowY, w: 2.78, h: 0.08,
          fill: { color: "C5161D" }, line: { color: "C5161D" }, rectRadius: 0.04
        });
      }

      // Top Icon
      slide.addText(kpi.icon, {
        x: colX + 0.18, y: rowY + 0.18, w: 0.65, h: 0.65,
        fontFace: font, fontSize: 22, align: "center", valign: "middle"
      });

      // Top Value
      slide.addText(String(kpi.val), {
        x: colX + 0.88, y: rowY + 0.12, w: 1.72, h: 0.65,
        fontFace: font, fontSize: 32, bold: true, color: charcoalDark, align: "right", valign: "middle"
      });

      // Note (if present)
      if (kpi.note) {
        slide.addText(kpi.note, {
          x: colX + 0.15, y: rowY + 0.78, w: 2.48, h: 0.32,
          fontFace: font, fontSize: 7, bold: true, color: "DC2626", align: "right", valign: "middle"
        });
      }

      // Bottom Label
      slide.addText(kpi.label, {
        x: colX + 0.15, y: rowY + 1.25, w: 2.48, h: 0.42,
        fontFace: font, fontSize: 11, bold: true, color: "1E293B", align: "center", valign: "middle"
      });
    });

    if (isBlue) {
      this._addIndustrialBlueFooter(slide, pptx, font, monthName, 3, totalSlideCount);
    } else {
      this._addExecutiveRedFooter(slide, pptx, font, monthName, 3, totalSlideCount);
    }
  }

  /**
   * Slide 2: Table of Contents (Photo 3 Style)
   */
  _addExecutiveRedTableOfContents(slide, pptx, font, monthName, taskCount, totalSlideCount) {
    this._buildPhoto3TableOfContents(slide, pptx, font, monthName, taskCount, totalSlideCount, false);
  }

  /**
   * Slide 3: Operations & Performance Dashboard (Photo 4 Style)
   */
  _addExecutiveRedDashboardSlide(slide, pptx, font, monthName, totalSlideCount, data = null) {
    this._buildPhoto4DashboardSlide(slide, pptx, font, monthName, totalSlideCount, data, false);
  }

  /**
   * Last Slide: Strategic Top 5 Works & Projects (Photo 1 Style)
   */
  _addExecutiveRedTopWorksSlide(slide, pptx, font, monthName, currentSlideNum, totalSlideCount, data = null) {
    const charcoalDark = "0F172A";

    // Walton Executive Red Layout Header
    slide.addShape(pptx.ShapeType.diamond, {
      x: 0.8, y: 0.22, w: 0.35, h: 0.35,
      fill: { color: "C5161D" }, line: { color: "C5161D" }
    });
    slide.addText([
      { text: "PROCESS DEVELOPMENT DEPARTMENT (AC)\n", options: { fontSize: 10, bold: true, color: "0F172A" } },
      { text: "INNOVATE  |  IMPROVE  |  DELIVER", options: { fontSize: 7.5, bold: true, color: "64748B" } }
    ], {
      x: 1.25, y: 0.18, w: 4.8, h: 0.45,
      fontFace: font, valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.15, y: 0.22, w: 3.3, h: 0.38,
      fill: { color: "C5161D" }, line: { color: "990000", width: 1 }, rectRadius: 0.19
    });
    slide.addText("TOP 5 WORKS & PROJECTS", {
      x: 5.15, y: 0.22, w: 3.3, h: 0.38,
      fontFace: font, fontSize: 10.5, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    slide.addText([
      { text: "SMALL CHANGES\n", options: { fontSize: 8, bold: true, color: "64748B" } },
      { text: "BIG IMPACT", options: { fontSize: 13, bold: true, color: "C5161D" } }
    ], {
      x: 9.5, y: 0.18, w: 3.0, h: 0.45,
      fontFace: font, align: "right", valign: "middle"
    });

    // SECTION 1: COMPLETED WORKS (TOP FIVE) - 5 Cards
    slide.addText("⚙ Development Works Completed (Top Five)", {
      x: 0.8, y: 0.85, w: 11.73, h: 0.28,
      fontFace: font, fontSize: 11, bold: true, color: charcoalDark
    });

    const completedTop5 = (data && data.completedTop5 && data.completedTop5.length > 0)
      ? data.completedTop5
      : ["—", "—", "—", "—", "—"];

    const cardPalettes = [
      { bg: "991B1B", border: "EF4444" },
      { bg: "1E3A8A", border: "60A5FA" },
      { bg: "065F46", border: "34D399" },
      { bg: "C2410C", border: "FBBF24" },
      { bg: "581C87", border: "A78BFA" }
    ];

    completedTop5.forEach((item, idx) => {
      const pal = cardPalettes[idx % cardPalettes.length];
      const px = 0.8 + idx * 2.38;
      const py = 1.18;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px, y: py, w: 2.25, h: 1.55,
        fill: { color: pal.bg }, line: { color: pal.border, width: 1.2 }, rectRadius: 0.08
      });

      // Number badge
      slide.addShape(pptx.ShapeType.roundRect, {
        x: px + 0.12, y: py + 0.12, w: 0.50, h: 0.30,
        fill: { color: "FFFFFF", transparency: 25 }, line: { color: "FFFFFF", width: 0.8 }, rectRadius: 0.04
      });
      slide.addText(`0${idx + 1}`, {
        x: px + 0.12, y: py + 0.12, w: 0.50, h: 0.30,
        fontFace: font, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      // Title
      const displayTitle = (item && item.trim() && item.trim() !== "—") ? item : "— (Pending completion)";
      slide.addText(displayTitle, {
        x: px + 0.12, y: py + 0.48, w: 2.01, h: 0.95,
        fontFace: font, fontSize: 10, bold: true, color: "FFFFFF", lineSpacing: 14, valign: "middle"
      });
    });

    // SECTION 2: ON-GOING WORKS (TOP FIVE) TABLE
    slide.addText("📋 On-going Works & Line Automation Projects (Top Five):", {
      x: 0.8, y: 2.95, w: 11.73, h: 0.28,
      fontFace: font, fontSize: 11, bold: true, color: charcoalDark
    });

    const ongoingList = (data && data.ongoingTop5 && data.ongoingTop5.length > 0)
      ? data.ongoingTop5
      : [
          { sl: 1, name: "RAC Assembly line relocation", progress: "Trial production run & line balancing verification ongoing", deadline: "4-5 Months" },
          { sl: 2, name: "—", progress: "—", deadline: "—" },
          { sl: 3, name: "—", progress: "—", deadline: "—" },
          { sl: 4, name: "—", progress: "—", deadline: "—" },
          { sl: 5, name: "—", progress: "—", deadline: "—" }
        ];

    const ongoingRows = [
      [
        { text: "Sl", options: { bold: true, fill: "C5161D", color: "FFFFFF", align: "center" } },
        { text: "Project Name", options: { bold: true, fill: "C5161D", color: "FFFFFF" } },
        { text: "Progress", options: { bold: true, fill: "C5161D", color: "FFFFFF" } },
        { text: "Tentative Deadline", options: { bold: true, fill: "C5161D", color: "FFFFFF", align: "center" } }
      ],
      ...ongoingList.map((p, idx) => [
        { text: String(p.sl || idx + 1), options: { align: "center", bold: true, color: "C5161D" } },
        { text: p.name || "—", options: { bold: Boolean(p.name && p.name.trim() && p.name !== "—") } },
        { text: p.progress || "—" },
        { text: p.deadline || "—", options: { align: "center", bold: true } }
      ])
    ];

    slide.addTable(ongoingRows, {
      x: 0.8, y: 3.28, w: 11.73, h: 3.35,
      colW: [0.6, 5.1, 4.2, 1.83],
      fontFace: font, fontSize: 9.5, color: charcoalDark,
      fill: "FFFFFF", border: { pt: 0.5, color: "E2E8F0" },
      align: "left", valign: "middle"
    });

    this._addExecutiveRedFooter(slide, pptx, font, monthName, currentSlideNum, totalSlideCount);
  }

  /**
   * Helper: Header Bar
   */
  _addExecutiveHeader(slide, pptx, font, pillText, titleText) {
    const redPrimary = "C5161D";
    const charcoalDark = "0F172A";
    const textMuted = "64748B";

    slide.addShape(pptx.ShapeType.diamond, {
      x: 0.8, y: 0.35, w: 0.4, h: 0.4,
      fill: { color: redPrimary }, line: { color: redPrimary }
    });

    slide.addText([
      { text: "PROCESS DEVELOPMENT DEPARTMENT\n", options: { fontSize: 10.5, bold: true, color: charcoalDark } },
      { text: "INNOVATE  |  IMPROVE  |  DELIVER", options: { fontSize: 8, bold: true, color: textMuted } }
    ], {
      x: 1.3, y: 0.3, w: 5.5, h: 0.55,
      fontFace: font, valign: "middle"
    });

    slide.addText([
      { text: "SMALL CHANGES\n", options: { fontSize: 8, bold: true, color: textMuted } },
      { text: "BIG IMPACT", options: { fontSize: 14, bold: true, color: redPrimary } }
    ], {
      x: 9.5, y: 0.28, w: 3.0, h: 0.55,
      fontFace: font, align: "right", valign: "middle"
    });

    // Pill
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 0.95, w: 3.2, h: 0.3,
      fill: { color: "FEE2E2" }, line: { color: "FCA5A5", width: 0.5 }, rectRadius: 0.15
    });
    slide.addText(pillText, {
      x: 0.8, y: 0.95, w: 3.2, h: 0.3,
      fontFace: font, fontSize: 8.5, bold: true, color: redPrimary, align: "center", valign: "middle"
    });

    // Title
    slide.addText(titleText, {
      x: 4.2, y: 0.9, w: 7.0, h: 0.4,
      fontFace: font, fontSize: 13, bold: true, color: charcoalDark, valign: "middle"
    });
  }

  /**
   * Helper: Executive Red Footer
   */
  _addExecutiveRedFooter(slide, pptx, font, monthName, currentSlideNum, totalSlideCount) {
    const redPrimary = "C5161D";
    const charcoalDark = "0F172A";
    const textMuted = "64748B";

    slide.addText("⚙ PROCESS DEVELOPMENT DEPARTMENT", {
      x: 0.8, y: 6.9, w: 4.8, h: 0.35,
      fontFace: font, fontSize: 8.5, bold: true, color: charcoalDark
    });

    slide.addText("🏆 Continuous Improvement   •   👥 Stronger Together", {
      x: 5.6, y: 6.9, w: 5.0, h: 0.35,
      fontFace: font, fontSize: 8.5, bold: true, color: textMuted, align: "center"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 10.8, y: 6.8, w: 2.1, h: 0.5,
      fill: { color: redPrimary }, line: { color: redPrimary }, rectRadius: 0.08
    });
    slide.addText(`${monthName.toUpperCase()}\nMONTHLY REPORT`, {
      x: 10.8, y: 6.8, w: 2.1, h: 0.5,
      fontFace: font, fontSize: 8, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });
  }

  /**
   * Helper: Industrial Blue Header Bar
   */
  _addIndustrialBlueHeader(slide, pptx, font, pillText, titleText) {
    const bluePrimary = "0284C7";
    const blueDark = "0052CC";
    const charcoalDark = "0F172A";
    const textMuted = "64748B";

    // 4-Point Blue Diamond
    slide.addShape(pptx.ShapeType.diamond, {
      x: 0.8, y: 0.35, w: 0.4, h: 0.4,
      fill: { color: bluePrimary }, line: { color: bluePrimary }
    });

    slide.addText([
      { text: "WALTON PROCESS DEVELOPMENT\n", options: { fontSize: 10.5, bold: true, color: charcoalDark } },
      { text: "INNOVATION  |  EFFICIENCY  |  SUSTAINABILITY", options: { fontSize: 8, bold: true, color: textMuted } }
    ], {
      x: 1.3, y: 0.3, w: 5.5, h: 0.55,
      fontFace: font, valign: "middle"
    });

    slide.addText([
      { text: "CONTINUOUS IMPROVEMENT\n", options: { fontSize: 8, bold: true, color: textMuted } },
      { text: "FOR BETTER PRODUCTION", options: { fontSize: 12, bold: true, color: blueDark } }
    ], {
      x: 9.0, y: 0.28, w: 3.5, h: 0.55,
      fontFace: font, align: "right", valign: "middle"
    });

    // Pill
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 0.95, w: 3.4, h: 0.3,
      fill: { color: "E0F2FE" }, line: { color: "BAE6FD", width: 0.5 }, rectRadius: 0.15
    });
    slide.addText(pillText, {
      x: 0.8, y: 0.95, w: 3.4, h: 0.3,
      fontFace: font, fontSize: 8.5, bold: true, color: "0369A1", align: "center", valign: "middle"
    });

    // Title
    slide.addText(titleText, {
      x: 4.4, y: 0.9, w: 7.0, h: 0.4,
      fontFace: font, fontSize: 13, bold: true, color: charcoalDark, valign: "middle"
    });
  }

  /**
   * Helper: Industrial Blue Footer
   */
  _addIndustrialBlueFooter(slide, pptx, font, monthName, currentSlideNum, totalSlideCount) {
    const blueDark = "0052CC";
    const charcoalDark = "0F172A";
    const textMuted = "64748B";

    slide.addText("⚙ PROCESS DEVELOPMENT DEPARTMENT", {
      x: 0.8, y: 6.9, w: 4.8, h: 0.35,
      fontFace: font, fontSize: 8.5, bold: true, color: charcoalDark
    });

    slide.addText("🏆 Continuous Improvement   •   👥 Stronger Together", {
      x: 5.6, y: 6.9, w: 5.0, h: 0.35,
      fontFace: font, fontSize: 8.5, bold: true, color: textMuted, align: "center"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 10.8, y: 6.8, w: 2.1, h: 0.5,
      fill: { color: blueDark }, line: { color: blueDark }, rectRadius: 0.08
    });
    slide.addText(`${monthName.toUpperCase()}\nBLUE EDITION`, {
      x: 10.8, y: 6.8, w: 2.1, h: 0.5,
      fontFace: font, fontSize: 8, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });
  }

  /**
   * Slide 1: Pattern 2 - Industrial Innovation Blue Cover Slide
   */
  _addIndustrialBlueCoverSlide(slide, pptx, font, monthName) {
    const navyPrimary = "0B2038";
    const blueCorporate = "0284C7";
    const blueRoyal = "2563EB";
    const textMuted = "64748B";

    // Top Accent Border
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.333, h: 0.08,
      fill: { color: blueCorporate }, line: { color: blueCorporate }
    });

    // Top Right Identifier
    slide.addText("WALTON AC PROCESS DEVELOPMENT", {
      x: 6.8, y: 0.35, w: 5.7, h: 0.35,
      fontFace: font, fontSize: 9.5, bold: true, color: "94A3B8", align: "right"
    });

    // Center Stage: Walton Logo (Exact 1:1 Aspect Ratio: 1.4 x 1.4 inches centered)
    try {
      slide.addImage({
        path: "assets/img/walton_logo.png",
        x: 5.97, y: 0.85, w: 1.4, h: 1.4,
        sizing: { type: "contain", w: 1.4, h: 1.4 }
      });
    } catch(err) {
      slide.addShape(pptx.ShapeType.diamond, { x: 6.2, y: 0.95, w: 0.4, h: 0.4, fill: { color: blueRoyal }, line: { color: blueRoyal } });
      slide.addShape(pptx.ShapeType.diamond, { x: 6.65, y: 0.95, w: 0.4, h: 0.4, fill: { color: blueCorporate }, line: { color: blueCorporate } });
      slide.addText("WALTON", { x: 0.8, y: 1.8, w: 11.7, h: 0.55, fontFace: font, fontSize: 28, bold: true, color: navyPrimary, align: "center" });
    }

    slide.addText("—  INNOVATION | EFFICIENCY | SUSTAINABILITY  —", {
      x: 0.8, y: 1.85, w: 11.7, h: 0.3,
      fontFace: font, fontSize: 9.5, bold: true, color: textMuted, align: "center"
    });

    // Main Title: Monthly Report Focus
    slide.addText("MONTHLY REPORT", {
      x: 0.8, y: 2.3, w: 11.7, h: 0.85,
      fontFace: font, fontSize: 36, bold: true, color: navyPrimary, align: "center"
    });

    // Subtitle Badge: Process Development Department (AC)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 3.8, y: 3.25, w: 5.7, h: 0.52,
      fill: { color: blueRoyal }, line: { color: cyanAccent, width: 1.5 }, rectRadius: 0.26
    });
    slide.addText("Process Development Department (AC)", {
      x: 3.8, y: 3.25, w: 5.7, h: 0.52,
      fontFace: font, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // Month Focus Badge
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 4.8, y: 4.0, w: 3.7, h: 0.46,
      fill: { color: "F8FAFC" }, line: { color: "CBD5E1", width: 1.2 }, rectRadius: 0.1
    });
    slide.addText(`📅  ${monthName.toUpperCase()}`, {
      x: 4.8, y: 4.0, w: 3.7, h: 0.46,
      fontFace: font, fontSize: 13.5, bold: true, color: "0284C7", align: "center", valign: "middle"
    });

    // Corporate Entity & Location
    slide.addText([
      { text: "Walton Hi-Tech Industries PLC.\n", options: { fontSize: 13, bold: true, color: "0F172A" } },
      { text: "📍 Chandra, Kaliakoir, Gazipur, Bangladesh", options: { fontSize: 10, color: textMuted } }
    ], {
      x: 0.8, y: 4.75, w: 11.7, h: 0.9,
      fontFace: font, align: "center"
    });

    // Bottom Waves (Cyan Upper, Navy/Blue Lower)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 6.85, w: 13.333, h: 0.22,
      fill: { color: cyanAccent }, line: { color: cyanAccent }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.07, w: 13.333, h: 0.43,
      fill: { color: blueRoyal }, line: { color: blueRoyal }
    });
  }

  /**
   * Slide 2: Industrial Innovation Blue Operations Overview Slide
   */
  _addIndustrialBlueOverviewSlide(slide, pptx, font, monthName, totalSlideCount, data = null) {
    const blueDark = "0052CC";
    const charcoalDark = "0F172A";

    this._addIndustrialBlueHeader(slide, pptx, font, "OPERATIONS CONTROL • EXECUTIVE OVERVIEW", `Plant Engineering Operations & Work Distribution (${monthName.toUpperCase()})`);

    // 1. Resolve tasks list & metrics
    let tasksList = (data && (data.slides || data.tasks));
    if (!tasksList && typeof MonthWorkbookManager !== 'undefined') {
      try {
        const mgr = new MonthWorkbookManager();
        tasksList = mgr.getTasksForMonth(monthName);
      } catch(e) {}
    }
    tasksList = tasksList || [];

    const totalTasks = tasksList.length;
    const reportTasks = tasksList.filter(t => t.monthly_report === 'YES').length;
    const internalTasks = totalTasks - reportTasks;

    let processCount = 0;
    let toolsCount = 0;
    let partsCount = 0;
    let costCount = 0;
    let manpowerCount = 0;
    let bomCount = 0;
    let completedProjCount = 0;
    let ongoingProjCount = 0;
    const engineersSet = new Set();

    tasksList.forEach(t => {
      const eng = (t.concern_engineer || t.concern || '').trim();
      if (eng) engineersSet.add(eng);

      const cat = (t.category || '').toLowerCase();
      const title = (t.slide_title || t.task_name || '').toLowerCase();
      const status = (t.status || t.project_status || '').toLowerCase();
      const isProj = Boolean(t.is_project || cat.includes('project') || title.includes('project'));

      if (isProj || cat.includes('project')) {
        if (status.includes('complete') || cat.includes('completed project')) {
          completedProjCount++;
        } else {
          ongoingProjCount++;
        }
      } else {
        if (cat.includes('process') || title.includes('process')) processCount++;
        if (cat.includes('tool') || title.includes('tool') || title.includes('die') || title.includes('fixture')) toolsCount++;
        if (cat.includes('part') || cat.includes('component') || title.includes('part')) partsCount++;
        if (cat.includes('cost') || cat.includes('saving') || title.includes('cost') || title.includes('saving')) costCount++;
        if (cat.includes('manpower') || title.includes('manpower')) manpowerCount++;
        if (cat.includes('bom') || title.includes('bom')) bomCount++;
      }
    });

    let yearlySavings = "BDT 0";
    let monthlySavings = "BDT 0";
    if (typeof CostSavingTracker !== 'undefined') {
      const ct = CostSavingTracker.calculate([], monthName);
      yearlySavings = ct.displayCumulativeYTD || "BDT 0";
      monthlySavings = ct.displayMonthlySaving || "BDT 0";
    }

    // 4 Top Hero Metric Cards
    const heroCards = [
      {
        val: `${totalTasks}`,
        label: "Total Engineering Tasks",
        sub: `Report: ${reportTasks} | Internal: ${internalTasks}`,
        icon: "📋",
        bg: "1E1B4B",
        border: "4338CA"
      },
      {
        val: `${completedProjCount + ongoingProjCount}`,
        label: "Strategic Projects",
        sub: `Completed: ${completedProjCount} | Ongoing: ${ongoingProjCount}`,
        icon: "🚀",
        bg: "064E3B",
        border: "059669"
      },
      {
        val: `${engineersSet.size || 8}`,
        label: "Active Concern Engineers",
        sub: "Plant-Wide Coverage",
        icon: "👥",
        bg: "7C2D12",
        border: "EA580C"
      },
      {
        val: yearlySavings,
        label: "Realized Annual Savings",
        sub: `Monthly: ${monthlySavings}`,
        icon: "💰",
        bg: "065F46",
        border: "10B981"
      }
    ];

    heroCards.forEach((c, idx) => {
      const px = 0.8 + idx * 2.98;
      const py = 1.35;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: px, y: py, w: 2.82, h: 1.25,
        fill: { color: c.bg }, line: { color: c.border, width: 1.5 }, rectRadius: 0.1
      });
      slide.addText(`${c.icon}  ${c.label.toUpperCase()}`, {
        x: px + 0.15, y: py + 0.1, w: 2.52, h: 0.25,
        fontFace: font, fontSize: 8, bold: true, color: "FFFFFF"
      });
      slide.addText(c.val, {
        x: px + 0.15, y: py + 0.35, w: 2.52, h: 0.5,
        fontFace: font, fontSize: 22, bold: true, color: "FFFFFF"
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: px + 0.15, y: py + 0.88, w: 2.52, h: 0.25,
        fill: { color: "FFFFFF", transparency: 80 }, line: { color: "FFFFFF", transparency: 80 }, rectRadius: 0.05
      });
      slide.addText(c.sub, {
        x: px + 0.15, y: py + 0.88, w: 2.52, h: 0.25,
        fontFace: font, fontSize: 7.5, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });
    });

    // 8 Colorful Process Pillars (4x2 Grid)
    const categoryGrid = [
      { val: `${processCount}`, label: "Process Developed", note: "Standard Operating Procedures", icon: "⚙️", bg: "EFF6FF", border: "60A5FA", valColor: "1D4ED8", labelColor: "1E3A8A" },
      { val: `${toolsCount}`, label: "Tools Developed", note: "Jigs, Dies & Fixtures", icon: "🔧", bg: "EEF2FF", border: "818CF8", valColor: "4338CA", labelColor: "312E81" },
      { val: `${partsCount}`, label: "Parts Developed", note: "Components & Sheet Metal", icon: "🔩", bg: "ECFDF5", border: "34D399", valColor: "047857", labelColor: "064E3B" },
      { val: `${costCount}`, label: "Cost Optimisation", note: `Cost: ${yearlySavings}/Yr`, icon: "💰", bg: "FFFBEB", border: "FBBF24", valColor: "B45309", labelColor: "78350F" },
      { val: `${manpowerCount}`, label: "Manpower Optimization", note: "Cycle Time & Line Balance", icon: "👥", bg: "FAF5FF", border: "C084FC", valColor: "7E22CE", labelColor: "581C87" },
      { val: `${bomCount}`, label: "BOM Verification", note: "Material Confirmations", icon: "📋", bg: "FFF1F2", border: "FB7185", valColor: "BE123C", labelColor: "881337" },
      { val: `${completedProjCount}`, label: "Completed Projects", note: "Shop-Floor Commissioned", icon: "🏆", bg: "FEF2F2", border: "F87171", valColor: "B91C1C", labelColor: "7F1D1D" },
      { val: `${ongoingProjCount}`, label: "New Projects / Ongoing", note: "Active Line Trials", icon: "🚀", bg: "ECFEFF", border: "22D3EE", valColor: "0E7490", labelColor: "164E63" }
    ];

    categoryGrid.forEach((k, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const px = 0.8 + col * 2.98;
      const py = 2.78 + row * 1.95;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px, y: py, w: 2.82, h: 1.8,
        fill: { color: k.bg }, line: { color: k.border, width: 1.2 }, rectRadius: 0.1
      });

      slide.addText(`${k.icon}  ${k.val}`, {
        x: px + 0.18, y: py + 0.15, w: 2.46, h: 0.5,
        fontFace: font, fontSize: 24, bold: true, color: k.valColor
      });

      slide.addText(k.label, {
        x: px + 0.18, y: py + 0.7, w: 2.46, h: 0.38,
        fontFace: font, fontSize: 11, bold: true, color: k.labelColor
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px + 0.18, y: py + 1.18, w: 2.46, h: 0.4,
        fill: { color: "FFFFFF" }, line: { color: k.border, width: 0.5 }, rectRadius: 0.05
      });
      slide.addText(k.note, {
        x: px + 0.22, y: py + 1.18, w: 2.38, h: 0.4,
        fontFace: font, fontSize: 8, bold: true, color: k.valColor, valign: "middle"
      });
    });

    this._addIndustrialBlueFooter(slide, pptx, font, monthName, 2, totalSlideCount);
  }

  /**
   * Slide 2: Industrial Innovation Blue Table of Contents (Photo 3 Style)
   */
  _addIndustrialBlueTableOfContents(slide, pptx, font, monthName, taskCount, totalSlideCount) {
    this._buildPhoto3TableOfContents(slide, pptx, font, monthName, taskCount, totalSlideCount, true);
  }

  /**
   * Slide 3: Industrial Innovation Blue Dashboard Slide (Photo 4 Style)
   */
  _addIndustrialBlueDashboardSlide(slide, pptx, font, monthName, totalSlideCount, data = null) {
    this._buildPhoto4DashboardSlide(slide, pptx, font, monthName, totalSlideCount, data, true);
  }

  /**
   * Slide N+1: Industrial Innovation Blue Top 5 Works Slide (Photo 1 Style)
   */
  _addIndustrialBlueTopWorksSlide(slide, pptx, font, monthName, currentSlideNum, totalSlideCount, data = null) {
    const charcoalDark = "0F172A";

    this._addPhoto1TopBanner(slide, pptx, font, "STRATEGIC TOP 5 WORKS & ONGOING PROJECTS SUMMARY");

    // SECTION 1: COMPLETED WORKS (TOP FIVE) - 5 Cards in Photo 1 Colors
    slide.addText("⚙ Development Works Completed (Top Five)", {
      x: 0.8, y: 1.15, w: 11.73, h: 0.28,
      fontFace: font, fontSize: 11, bold: true, color: charcoalDark
    });

    const completedTop5 = (data && data.completedTop5 && data.completedTop5.length > 0)
      ? data.completedTop5
      : ["—", "—", "—", "—", "—"];

    const cardPalettes = [
      { bg: "1E40AF", border: "1D4ED8" },
      { bg: "6366F1", border: "4F46E5" },
      { bg: "0284C7", border: "0369A1" },
      { bg: "F59E0B", border: "D97706" },
      { bg: "10B981", border: "059669" }
    ];

    completedTop5.forEach((item, idx) => {
      const pal = cardPalettes[idx % cardPalettes.length];
      const px = 0.8 + idx * 2.38;
      const py = 1.48;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px, y: py, w: 2.25, h: 1.55,
        fill: { color: pal.bg }, line: { color: pal.border, width: 1.2 }, rectRadius: 0.08
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px + 0.12, y: py + 0.12, w: 0.50, h: 0.30,
        fill: { color: "FFFFFF", transparency: 25 }, line: { color: "FFFFFF", width: 0.8 }, rectRadius: 0.04
      });
      slide.addText(`0${idx + 1}`, {
        x: px + 0.12, y: py + 0.12, w: 0.50, h: 0.30,
        fontFace: font, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      const displayTitle = (item && item.trim() && item.trim() !== "—") ? item : "— (Pending completion)";
      slide.addText(displayTitle, {
        x: px + 0.12, y: py + 0.48, w: 2.01, h: 0.95,
        fontFace: font, fontSize: 10, bold: true, color: "FFFFFF", lineSpacing: 14, valign: "middle"
      });
    });

    // SECTION 2: ON-GOING WORKS (TOP FIVE) TABLE
    slide.addText("📋 On-going Works & Line Automation Projects (Top Five):", {
      x: 0.8, y: 3.25, w: 11.73, h: 0.28,
      fontFace: font, fontSize: 11, bold: true, color: charcoalDark
    });

    const ongoingList = (data && data.ongoingTop5 && data.ongoingTop5.length > 0)
      ? data.ongoingTop5
      : [
          { sl: 1, name: "RAC Assembly line relocation", progress: "Trial production run & line balancing verification ongoing", deadline: "4-5 Months" },
          { sl: 2, name: "—", progress: "—", deadline: "—" },
          { sl: 3, name: "—", progress: "—", deadline: "—" },
          { sl: 4, name: "—", progress: "—", deadline: "—" },
          { sl: 5, name: "—", progress: "—", deadline: "—" }
        ];

    const ongoingRows = [
      [
        { text: "Sl", options: { bold: true, fill: "1E40AF", color: "FFFFFF", align: "center" } },
        { text: "Project Name", options: { bold: true, fill: "1E40AF", color: "FFFFFF" } },
        { text: "Progress", options: { bold: true, fill: "1E40AF", color: "FFFFFF" } },
        { text: "Tentative Deadline", options: { bold: true, fill: "1E40AF", color: "FFFFFF", align: "center" } }
      ],
      ...ongoingList.map((p, idx) => [
        { text: String(p.sl || idx + 1), options: { align: "center", bold: true, color: "2563EB" } },
        { text: p.name || "—", options: { bold: Boolean(p.name && p.name.trim() && p.name !== "—") } },
        { text: p.progress || "—" },
        { text: p.deadline || "—", options: { align: "center", bold: true } }
      ])
    ];

    slide.addTable(ongoingRows, {
      x: 0.8, y: 3.58, w: 11.73, h: 3.05,
      colW: [0.6, 5.1, 4.2, 1.83],
      fontFace: font, fontSize: 9.5, color: charcoalDark,
      fill: "FFFFFF", border: { pt: 0.5, color: "BAE6FD" },
      align: "left", valign: "middle"
    });

    this._addIndustrialBlueFooter(slide, pptx, font, monthName, currentSlideNum, totalSlideCount);
  }

  /**
   * Walton Process Development Executive Red Master Slide (media_1789014742407.jpg)
   */
  _addExecutiveRedTaskSlide(slide, pptx, task, font, monthName, currentSlideNum, totalSlideCount) {
    const rawTitle = task.slide_title || task.task_name || "Process Development Project";
    
    let titleLine1 = task.split_title_1;
    let titleLine2 = task.split_title_2;
    if (!titleLine1 || !titleLine2) {
      if (typeof PROMPT_TEMPLATES !== 'undefined' && PROMPT_TEMPLATES.splitTitle) {
        const split = PROMPT_TEMPLATES.splitTitle(rawTitle);
        titleLine1 = titleLine1 || split.line1;
        titleLine2 = titleLine2 || split.line2;
      } else {
        const words = rawTitle.split(" ");
        titleLine1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
        titleLine2 = words.slice(Math.ceil(words.length / 2)).join(" ");
      }
    }

    const rawEng = task.engineer || task.assignee || "Sazzad (50463)";
    const engineer = (typeof HELPERS !== 'undefined' && HELPERS.formatPersonnelName) 
      ? HELPERS.formatPersonnelName(rawEng) 
      : rawEng;
    const category = task.category || "Process Development";
    const status = task.status || "Completed";
    const desc = task.description || task.ai_description || 
      "Developed and implemented an automatic foil cutting system for compressor jacket production. The system was designed, fabricated and handed over to production for regular use.";
    
    let impacts = Array.isArray(task.impact) && task.impact.length > 0
      ? task.impact
      : (typeof task.impact === 'string' && task.impact.trim() ? task.impact.split(';') : [
          "Improved cutting accuracy and consistency",
          "Increased production efficiency",
          "Reduced manual handling",
          "Better quality control and less material waste"
        ]);
    while (impacts.length < 4) {
      impacts.push("Continuous operational reliability improvement");
    }

    const metrics = Array.isArray(task.metrics) && task.metrics.length >= 3
      ? task.metrics
      : [
          { name: "Production Efficiency", change: "Improved", trend: "up", color: "green" },
          { name: "Quality Consistency", change: "Enhanced", trend: "up", color: "green" },
          { name: "Material Waste", change: "Reduced", trend: "down", color: "red" }
        ];

    const quote = task.quote || "Automation for a Smarter Tomorrow";
    const redPrimary = "C5161D";
    const charcoalDark = "0F172A";
    const textMuted = "64748B";
    const cardBgLight = "F8FAFC";
    const borderLight = "E2E8F0";

    // 1. TOP HEADER ROW
    slide.addShape(pptx.ShapeType.diamond, {
      x: 0.8, y: 0.35, w: 0.45, h: 0.45,
      fill: { color: redPrimary }, line: { color: redPrimary }
    });

    slide.addText([
      { text: "PROCESS DEVELOPMENT DEPARTMENT\n", options: { fontSize: 11, bold: true, color: charcoalDark } },
      { text: "INNOVATE  |  IMPROVE  |  DELIVER", options: { fontSize: 8, bold: true, color: textMuted } }
    ], {
      x: 1.35, y: 0.32, w: 5.5, h: 0.55,
      fontFace: font, valign: "middle"
    });

    slide.addText([
      { text: "SMALL CHANGES\n", options: { fontSize: 8.5, bold: true, color: textMuted } },
      { text: "BIG IMPACT", options: { fontSize: 16, bold: true, color: redPrimary } }
    ], {
      x: 9.5, y: 0.28, w: 3.0, h: 0.6,
      fontFace: font, align: "right", valign: "middle"
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 11.3, y: 0.88, w: 1.2, h: 0.025,
      fill: { color: redPrimary }
    });

    // 2. LEFT COLUMN: CONTENT, OVERVIEW & IMPACT (w: 5.6)
    const catLower = category.toLowerCase();
    const titleLower = (rawTitle || "").toLowerCase();
    const statusLower = (status || "").toLowerCase();
    const isProj = Boolean(task.is_project || catLower.includes('project') || titleLower.includes('project'));
    const isCompletedProj = isProj && (statusLower.includes('complete') || catLower.includes('completed'));

    let badgeText = (task.category || "PROCESS DEVELOPMENT").toUpperCase();
    let badgeFill = redPrimary;
    let badgeW = Math.min(3.8, Math.max(2.4, badgeText.length * 0.11 + 0.5));
    if (isProj) {
      if (isCompletedProj) {
        badgeText = "STRATEGIC PROJECT • COMPLETED";
        badgeFill = "059669";
        badgeW = 3.2;
      } else {
        badgeText = "STRATEGIC PROJECT • ONGOING";
        badgeFill = "0284C7";
        badgeW = 3.0;
      }
    }

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.05, w: badgeW, h: 0.32,
      fill: { color: badgeFill }, line: { color: badgeFill }, rectRadius: 0.04
    });
    slide.addText(badgeText, {
      x: 0.8, y: 1.05, w: badgeW, h: 0.32,
      fontFace: font, fontSize: 8.5, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // Red Left Accent Bar for Title
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 1.48, w: 0.06, h: 0.82,
      fill: { color: redPrimary }
    });

    // Split-Color Title Text Box
    slide.addText([
      { text: `${titleLine1}\n`, options: { fontSize: 17, bold: true, color: charcoalDark } },
      { text: titleLine2, options: { fontSize: 17, bold: true, color: redPrimary } }
    ], {
      x: 0.95, y: 1.45, w: 5.5, h: 0.9,
      fontFace: font, lineSpacing: 22, valign: "top"
    });

    // 3-Column Metadata Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 2.45, w: 5.6, h: 0.58,
      fill: { color: cardBgLight }, line: { color: borderLight }, rectRadius: 0.05
    });
    slide.addText([
      { text: "CONCERN ENGINEER\n", options: { fontSize: 7.5, bold: true, color: textMuted } },
      { text: engineer, options: { fontSize: 9.5, bold: true, color: charcoalDark } }
    ], { x: 0.9, y: 2.48, w: 1.8, h: 0.52, fontFace: font, valign: "middle" });
    slide.addText([
      { text: "CATEGORY\n", options: { fontSize: 7.5, bold: true, color: textMuted } },
      { text: category, options: { fontSize: 9.5, bold: true, color: charcoalDark } }
    ], { x: 2.7, y: 2.48, w: 1.8, h: 0.52, fontFace: font, valign: "middle" });
    slide.addText([
      { text: "STATUS\n", options: { fontSize: 7.5, bold: true, color: textMuted } },
      { text: `● ${status}`, options: { fontSize: 9.5, bold: true, color: "10B981" } }
    ], { x: 4.5, y: 2.48, w: 1.8, h: 0.52, fontFace: font, valign: "middle" });

    // Project Overview Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 3.15, w: 5.6, h: 1.45,
      fill: { color: cardBgLight }, line: { color: borderLight }, rectRadius: 0.06
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 0.95, y: 3.25, w: 0.28, h: 0.28,
      fill: { color: redPrimary }, line: { color: redPrimary }
    });
    slide.addText("📄", { x: 0.95, y: 3.25, w: 0.28, h: 0.28, fontSize: 8, color: "FFFFFF", align: "center", valign: "middle" });
    slide.addText("Project Overview", {
      x: 1.3, y: 3.23, w: 5.0, h: 0.3,
      fontFace: font, fontSize: 11, bold: true, color: charcoalDark, valign: "middle"
    });
    slide.addText(desc, {
      x: 0.95, y: 3.6, w: 5.3, h: 0.9,
      fontFace: font, fontSize: 9, color: "334155", lineSpacing: 13, valign: "top"
    });

    // Key Impact Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 4.72, w: 5.6, h: 1.95,
      fill: { color: "FFFFFF" }, line: { color: borderLight }, rectRadius: 0.06
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 0.95, y: 4.82, w: 0.28, h: 0.28,
      fill: { color: redPrimary }, line: { color: redPrimary }
    });
    slide.addText("🎯", { x: 0.95, y: 4.82, w: 0.28, h: 0.28, fontSize: 8, color: "FFFFFF", align: "center", valign: "middle" });
    slide.addText("Key Impact", {
      x: 1.3, y: 4.8, w: 5.0, h: 0.3,
      fontFace: font, fontSize: 11, bold: true, color: charcoalDark, valign: "middle"
    });

    // 4 Checkmark Bullets (Expanded full card width - Mini KPI block removed per Requirement 5)
    impacts.slice(0, 4).forEach((imp, idx) => {
      const bY = 5.22 + idx * 0.35;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.95, y: bY + 0.02, w: 0.22, h: 0.22,
        fill: { color: redPrimary }, line: { color: redPrimary }, rectRadius: 0.03
      });
      slide.addText("✔", {
        x: 0.95, y: bY + 0.02, w: 0.22, h: 0.22,
        fontFace: font, fontSize: 7.5, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });
      slide.addText(imp.trim(), {
        x: 1.25, y: bY - 0.02, w: 5.0, h: 0.32,
        fontFace: font, fontSize: 9.5, bold: true, color: "1E293B", valign: "middle"
      });
    });

    // 3. RIGHT COLUMN: MACHINE PHOTO (Dual Before & After or Single)
    const photoBefore = task.photo_before || task.photo_1 || null;
    const photoAfter = task.photo_after || task.photo_2 || null;
    const photoSingle = task.photo || photoAfter || photoBefore;
    const hasDualPhoto = Boolean(photoBefore && photoAfter && photoBefore !== photoAfter);

    if (hasDualPhoto) {
      // Left Frame: Before
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.7, y: 1.05, w: 2.8, h: 5.62,
        fill: { color: "0F172A" }, line: { color: borderLight }, rectRadius: 0.1
      });
      if (photoBefore && photoBefore.startsWith('data:image/')) {
        try { slide.addImage({ data: photoBefore, x: 6.7, y: 1.05, w: 2.8, h: 5.62 }); }
        catch (e) { this._addEmptyPhotoFrame(slide, pptx, 6.7, 1.05, 2.8, 5.62); }
      } else if (photoBefore && (photoBefore.startsWith('http://') || photoBefore.startsWith('https://'))) {
        try { slide.addImage({ path: photoBefore, x: 6.7, y: 1.05, w: 2.8, h: 5.62 }); }
        catch (e) { this._addEmptyPhotoFrame(slide, pptx, 6.7, 1.05, 2.8, 5.62); }
      } else {
        this._addEmptyPhotoFrame(slide, pptx, 6.7, 1.05, 2.8, 5.62);
      }
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.82, y: 1.15, w: 2.56, h: 0.32,
        fill: { color: "D97706" }, line: { color: "D97706" }, rectRadius: 0.04
      });
      slide.addText("1. PRESENT CONDITION (BEFORE)", {
        x: 6.82, y: 1.15, w: 2.56, h: 0.32,
        fontFace: font, fontSize: 7, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      // Right Frame: After
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 9.7, y: 1.05, w: 2.8, h: 5.62,
        fill: { color: "0F172A" }, line: { color: borderLight }, rectRadius: 0.1
      });
      if (photoAfter && photoAfter.startsWith('data:image/')) {
        try { slide.addImage({ data: photoAfter, x: 9.7, y: 1.05, w: 2.8, h: 5.62 }); }
        catch (e) { this._addEmptyPhotoFrame(slide, pptx, 9.7, 1.05, 2.8, 5.62); }
      } else if (photoAfter && (photoAfter.startsWith('http://') || photoAfter.startsWith('https://'))) {
        try { slide.addImage({ path: photoAfter, x: 9.7, y: 1.05, w: 2.8, h: 5.62 }); }
        catch (e) { this._addEmptyPhotoFrame(slide, pptx, 9.7, 1.05, 2.8, 5.62); }
      } else {
        this._addEmptyPhotoFrame(slide, pptx, 9.7, 1.05, 2.8, 5.62);
      }
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 9.82, y: 1.15, w: 2.56, h: 0.32,
        fill: { color: redPrimary }, line: { color: redPrimary }, rectRadius: 0.04
      });
      slide.addText("2. PROPOSED PROJECT (AFTER)", {
        x: 9.82, y: 1.15, w: 2.56, h: 0.32,
        fontFace: font, fontSize: 7, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      // Quote banner on After frame (Smaller, transparent red)
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 10.3, y: 6.08, w: 2.2, h: 0.59,
        fill: { color: redPrimary, transparency: 45 }, line: { color: "FFFFFF", width: 0.8, transparency: 50 }, rectRadius: 0.06
      });
      slide.addText(`"${quote}"`, {
        x: 10.32, y: 6.08, w: 2.16, h: 0.59,
        fontFace: font, fontSize: 7.5, bold: true, italic: true, color: "FFFFFF", align: "center", valign: "middle"
      });
    } else {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.7, y: 1.05, w: 5.8, h: 5.62,
        fill: { color: "0F172A" }, line: { color: borderLight }, rectRadius: 0.1
      });

      if (photoSingle && photoSingle.startsWith('data:image/')) {
        try {
          slide.addImage({ data: photoSingle, x: 6.7, y: 1.05, w: 5.8, h: 5.62 });
        } catch (e) {
          this._addEmptyPhotoFrame(slide, pptx, 6.7, 1.05, 5.8, 5.62);
        }
      } else if (photoSingle && (photoSingle.startsWith('http://') || photoSingle.startsWith('https://'))) {
        try {
          slide.addImage({ path: photoSingle, x: 6.7, y: 1.05, w: 5.8, h: 5.62 });
        } catch (e) {
          this._addEmptyPhotoFrame(slide, pptx, 6.7, 1.05, 5.8, 5.62);
        }
      } else {
        this._addEmptyPhotoFrame(slide, pptx, 6.7, 1.05, 5.8, 5.62);
      }

      // Red Quote Banner (Smaller, transparent red)
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 10.1, y: 6.05, w: 2.4, h: 0.62,
        fill: { color: redPrimary, transparency: 45 }, line: { color: "FFFFFF", width: 0.8, transparency: 50 }, rectRadius: 0.06
      });
      slide.addText(`"${quote}"`, {
        x: 10.12, y: 6.05, w: 2.36, h: 0.62,
        fontFace: font, fontSize: 8, bold: true, italic: true, color: "FFFFFF", align: "center", valign: "middle"
      });
    }

    // 4. BOTTOM FOOTER BAR
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 6.82, w: 11.7, h: 0.015,
      fill: { color: borderLight }
    });
    slide.addText("⚙ PROCESS DEVELOPMENT DEPARTMENT\nWALTON HI-TECH INDUSTRIES PLC.", {
      x: 0.8, y: 6.88, w: 3.5, h: 0.45,
      fontFace: font, fontSize: 7.5, bold: true, color: charcoalDark
    });
    slide.addText("🏆 Continuous Improvement     |     👥 Stronger Together     |     💡 A Smarter Tomorrow", {
      x: 4.4, y: 6.88, w: 5.2, h: 0.45,
      fontFace: font, fontSize: 8, bold: true, color: "334155", align: "center", valign: "middle"
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 10.6, y: 6.85, w: 1.9, h: 0.48,
      fill: { color: redPrimary }, line: { color: redPrimary }, rectRadius: 0.08
    });
    slide.addText(`${monthName.toUpperCase()}\nMONTHLY REPORT`, {
      x: 10.6, y: 6.85, w: 1.9, h: 0.48,
      fontFace: font, fontSize: 7.5, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });
  }

  /**
   * Industrial Innovation Blue Layout (Image 3: media_1789184008531.jpg)
   */
  _addIndustrialBlueTaskSlide(slide, pptx, task, font, monthName, currentSlideNum, totalSlideCount) {
    const title = task.slide_title || task.task_name || "RAC Vacuum Station Optimized with Booster Pump";
    const subtitle = task.subtitle || "Enhancing production stability through innovative engineering solutions.";
    const rawEng = task.engineer || task.assignee || "Sazzad (50463)";
    const engineer = (typeof HELPERS !== 'undefined' && HELPERS.formatPersonnelName) 
      ? HELPERS.formatPersonnelName(rawEng) 
      : (task.employee_id ? `${rawEng} (${task.employee_id})` : rawEng);
    const category = task.category || "Process Development";
    const desc = task.description || task.ai_description || "Optimized the RAC vacuum station by installing a booster pump. The system was redesigned and implemented to improve vacuum performance and stability for regular production.";
    const impacts = Array.isArray(task.impact) && task.impact.length > 0 ? task.impact : [
      "Higher vacuum efficiency", "Reduced cycle time", "Improved production stability", "Lower maintenance requirement"
    ];
    const photoBefore = task.photo_before || task.photo_1 || null;
    const photoAfter = task.photo_after || task.photo_2 || null;
    const photoSingle = task.photo || photoAfter || photoBefore || null;
    const hasDualPhoto = Boolean(photoBefore && photoAfter && photoBefore !== photoAfter);

    const bluePrimary = "0284C7";
    const blueDark = "1D4ED8";
    const navyPrimary = "0B2038";
    const charcoalDark = "0F172A";
    const textMuted = "64748B";
    const borderLight = "E2E8F0";
    const cardBg = "F8FAFC";
    const greenSuccess = "10B981";

    // 1. TOP HEADER ROW
    // Brand Identifier
    slide.addText("WALTON", {
      x: 0.8, y: 0.35, w: 2.2, h: 0.28,
      fontFace: font, fontSize: 13, bold: true, color: charcoalDark
    });
    slide.addText("PROCESS DEVELOPMENT DEPARTMENT", {
      x: 0.8, y: 0.62, w: 3.5, h: 0.2,
      fontFace: font, fontSize: 8, bold: true, color: textMuted
    });

    // Corporate Pillars
    slide.addText("INNOVATION  |  EFFICIENCY  |  SUSTAINABILITY", {
      x: 6.5, y: 0.45, w: 6.0, h: 0.3,
      fontFace: font, fontSize: 9.5, bold: true, color: "475569", align: "right"
    });

    // Header divider line
    slide.addShape(pptx.ShapeType.line, {
      x: 0.8, y: 0.9, w: 11.7, h: 0,
      line: { color: borderLight, width: 1 }
    });

    // 2. LEFT COLUMN: PROJECT DETAILS & CARDS (x: 0.8, w: 6.3)
    // Pill Category Badge
    const catLower = category.toLowerCase();
    const titleLower = (title || "").toLowerCase();
    const statusLower = ((task.status || task.project_status || "")).toLowerCase();
    const isProj = Boolean(task.is_project || catLower.includes('project') || titleLower.includes('project'));
    const isCompletedProj = isProj && (statusLower.includes('complete') || catLower.includes('completed'));

    let badgeText = category.toUpperCase();
    let badgeFill = bluePrimary;
    let badgeW = 2.8;
    if (isProj) {
      if (isCompletedProj) {
        badgeText = "STRATEGIC PROJECT • COMPLETED";
        badgeFill = "059669";
        badgeW = 3.2;
      } else {
        badgeText = "STRATEGIC PROJECT • ONGOING";
        badgeFill = "0284C7";
        badgeW = 3.0;
      }
    }

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.05, w: badgeW, h: 0.35,
      fill: { color: badgeFill }, line: { color: badgeFill }, rectRadius: 0.17
    });
    slide.addText(badgeText, {
      x: 0.8, y: 1.05, w: badgeW, h: 0.35,
      fontFace: font, fontSize: 8.5, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // Left accent bar for title
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 1.5, w: 0.06, h: 0.75,
      fill: { color: bluePrimary }
    });

    // Title & Subtitle
    slide.addText(title, {
      x: 0.95, y: 1.45, w: 6.1, h: 0.58,
      fontFace: font, fontSize: 17, bold: true, color: charcoalDark, valign: "top"
    });
    slide.addText(subtitle, {
      x: 0.95, y: 2.05, w: 6.1, h: 0.25,
      fontFace: font, fontSize: 9, color: textMuted
    });

    // 3 Info Chips in a Row (y: 2.38, h: 0.58)
    // Chip 1: Concern Engineer
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 2.38, w: 2.0, h: 0.55,
      fill: { color: cardBg }, line: { color: borderLight }, rectRadius: 0.08
    });
    slide.addText(`CONCERN ENGINEER\n${engineer}`, {
      x: 0.85, y: 2.38, w: 1.9, h: 0.55,
      fontFace: font, fontSize: 7.5, bold: true, color: charcoalDark, valign: "middle"
    });

    // Chip 2: Category
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 2.9, y: 2.38, w: 2.0, h: 0.55,
      fill: { color: cardBg }, line: { color: borderLight }, rectRadius: 0.08
    });
    slide.addText(`CATEGORY\n${category}`, {
      x: 2.95, y: 2.38, w: 1.9, h: 0.55,
      fontFace: font, fontSize: 7.5, bold: true, color: charcoalDark, valign: "middle"
    });

    // Chip 3: Status
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.0, y: 2.38, w: 2.0, h: 0.55,
      fill: { color: cardBg }, line: { color: borderLight }, rectRadius: 0.08
    });
    slide.addText("STATUS\nCompleted", {
      x: 5.05, y: 2.38, w: 1.9, h: 0.55,
      fontFace: font, fontSize: 7.5, bold: true, color: greenSuccess, valign: "middle"
    });

    // Card 1: Project Description (y: 3.08, h: 1.65)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 3.08, w: 6.2, h: 1.65,
      fill: { color: cardBg }, line: { color: borderLight }, rectRadius: 0.08
    });
    slide.addText("Project Description", {
      x: 1.0, y: 3.18, w: 5.8, h: 0.3,
      fontFace: font, fontSize: 11.5, bold: true, color: bluePrimary
    });
    slide.addText(desc, {
      x: 1.0, y: 3.52, w: 5.8, h: 1.1,
      fontFace: font, fontSize: 9.5, color: "334155", lineSpacing: 14
    });

    // Card 2: Key Impact (y: 4.88, h: 1.85)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 4.88, w: 6.2, h: 1.85,
      fill: { color: cardBg }, line: { color: borderLight }, rectRadius: 0.08
    });
    slide.addText("Key Impact", {
      x: 1.0, y: 4.98, w: 5.8, h: 0.3,
      fontFace: font, fontSize: 11.5, bold: true, color: bluePrimary
    });

    // Impact Bullets (Expanded full card width - Mini KPI block removed per Requirement 5)
    impacts.slice(0, 4).forEach((imp, iIdx) => {
      slide.addText(`✔  ${imp.trim()}`, {
        x: 1.0, y: 5.35 + iIdx * 0.34, w: 5.8, h: 0.32,
        fontFace: font, fontSize: 9.5, bold: true, color: "334155"
      });
    });

    // 3. RIGHT COLUMN: HERO PHOTO (Dual Before & After or Single)
    if (hasDualPhoto) {
      // Frame 1: Before
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 7.2, y: 1.05, w: 2.55, h: 5.68,
        fill: { color: "0F172A" }, line: { color: borderLight }, rectRadius: 0.1
      });
      if (photoBefore && (photoBefore.startsWith('data:image/') || photoBefore.startsWith('http://') || photoBefore.startsWith('https://'))) {
        try {
          const opt = photoBefore.startsWith('data:image/') ? { data: photoBefore } : { path: photoBefore };
          slide.addImage({ ...opt, x: 7.2, y: 1.05, w: 2.55, h: 5.68 });
        } catch(e) { this._addEmptyPhotoFrame(slide, pptx, 7.2, 1.05, 2.55, 5.68); }
      } else {
        this._addEmptyPhotoFrame(slide, pptx, 7.2, 1.05, 2.55, 5.68);
      }
      slide.addShape(pptx.ShapeType.rect, {
        x: 7.2, y: 1.05, w: 2.55, h: 0.35,
        fill: { color: "D97706" }
      });
      slide.addText("1. PRESENT CONDITION (BEFORE)", {
        x: 7.2, y: 1.05, w: 2.55, h: 0.35,
        fontFace: font, fontSize: 7, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      // Frame 2: After
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 9.95, y: 1.05, w: 2.55, h: 5.68,
        fill: { color: "0F172A" }, line: { color: borderLight }, rectRadius: 0.1
      });
      if (photoAfter && (photoAfter.startsWith('data:image/') || photoAfter.startsWith('http://') || photoAfter.startsWith('https://'))) {
        try {
          const opt = photoAfter.startsWith('data:image/') ? { data: photoAfter } : { path: photoAfter };
          slide.addImage({ ...opt, x: 9.95, y: 1.05, w: 2.55, h: 5.68 });
        } catch(e) { this._addEmptyPhotoFrame(slide, pptx, 9.95, 1.05, 2.55, 5.68); }
      } else {
        this._addEmptyPhotoFrame(slide, pptx, 9.95, 1.05, 2.55, 5.68);
      }
      slide.addShape(pptx.ShapeType.rect, {
        x: 9.95, y: 1.05, w: 2.55, h: 0.35,
        fill: { color: bluePrimary }
      });
      slide.addText("2. PROPOSED PROJECT (AFTER)", {
        x: 9.95, y: 1.05, w: 2.55, h: 0.35,
        fontFace: font, fontSize: 7, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      // Bottom action strip
      slide.addShape(pptx.ShapeType.rect, {
        x: 9.95, y: 6.25, w: 2.55, h: 0.48,
        fill: { color: navyPrimary }
      });
      slide.addText("⚙ Reliable Process  |  🍃 Green", {
        x: 9.95, y: 6.25, w: 2.55, h: 0.48,
        fontFace: font, fontSize: 7.5, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });
    } else {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 7.2, y: 1.05, w: 5.3, h: 5.68,
        fill: { color: "0F172A" }, line: { color: borderLight }, rectRadius: 0.1
      });

      if (photoSingle && photoSingle.startsWith('data:image/')) {
        try {
          slide.addImage({ data: photoSingle, x: 7.2, y: 1.05, w: 5.3, h: 5.68 });
        } catch (e) {
          this._addEmptyPhotoFrame(slide, pptx, 7.2, 1.05, 5.3, 5.68);
        }
      } else if (photoSingle && (photoSingle.startsWith('http://') || photoSingle.startsWith('https://') || photoSingle.startsWith('assets/'))) {
        try {
          slide.addImage({ path: photoSingle, x: 7.2, y: 1.05, w: 5.3, h: 5.68 });
        } catch (e) {
          this._addEmptyPhotoFrame(slide, pptx, 7.2, 1.05, 5.3, 5.68);
        }
      } else {
        this._addEmptyPhotoFrame(slide, pptx, 7.2, 1.05, 5.3, 5.68);
      }

      // Top Right Navy Badge
      slide.addShape(pptx.ShapeType.rect, {
        x: 9.7, y: 1.05, w: 2.8, h: 0.58,
        fill: { color: navyPrimary }
      });
      slide.addText("ENGINEERING SOLUTIONS\nFOR A BETTER TOMORROW", {
        x: 9.7, y: 1.05, w: 2.8, h: 0.58,
        fontFace: font, fontSize: 8, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      // Bottom Overlaid Bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 7.2, y: 6.18, w: 5.3, h: 0.55,
        fill: { color: navyPrimary }
      });
      slide.addText("⚙ Stable Production    |    👥 Reliable Process    |    🍃 Sustainable Growth", {
        x: 7.2, y: 6.18, w: 5.3, h: 0.55,
        fontFace: font, fontSize: 8, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });
    }

    // 4. FOOTER ROW (y: 6.95)
    slide.addShape(pptx.ShapeType.line, {
      x: 0.8, y: 6.9, w: 11.7, h: 0,
      line: { color: borderLight, width: 1 }
    });
    slide.addText("WALTON HI-TECH INDUSTRIES PLC.", {
      x: 0.8, y: 6.98, w: 3.5, h: 0.35,
      fontFace: font, fontSize: 8.5, bold: true, color: charcoalDark
    });
    slide.addText("💡 Continuous Improvement      👥 Stronger Together      🍃 Greener Tomorrow", {
      x: 4.2, y: 6.98, w: 5.0, h: 0.35,
      fontFace: font, fontSize: 8, bold: true, color: textMuted
    });

    // Right Month Ribbon
    slide.addShape(pptx.ShapeType.rect, {
      x: 10.3, y: 6.92, w: 2.2, h: 0.42,
      fill: { color: blueDark }
    });
    slide.addText(`${monthName.toUpperCase()} REPORT`, {
      x: 10.3, y: 6.92, w: 2.2, h: 0.42,
      fontFace: font, fontSize: 8, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });
  }

  /**
   * Classic Blue Dual-Photo Slide
   */
  _addClassicBlueTaskSlide(slide, pptx, task, font, monthName, currentSlideNum, totalSlideCount) {
    const title = task.slide_title || task.task_name || "Process Development Project";
    const engineer = task.engineer || "Concern Engineer";
    const desc = task.description || "Engineering verification completed.";
    const impacts = Array.isArray(task.impact) && task.impact.length > 0 ? task.impact : ["Process workflow enhancement", "Production capacity increase", "Tooling reliability improved"];
    const investment = task.investment || "In-house / Direct Implementation";
    const bgWhite = "FFFFFF";
    const navyPrimary = "0B2038";
    const navyDark = "07172B";
    const blueCorporate = "0284C7";
    const orangeAccent = "FF6B00";
    const greenSuccess = "10B981";
    const cardBgBlue = "F0F9FF";
    const cardBorderBlue = "BAE6FD";
    const cardBgGrey = "F8FAFC";
    const borderLight = "E2E8F0";
    const textMuted = "64748B";

    // 1. TOP HEADER
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 0.4, w: 1.6, h: 0.38,
      fill: { color: orangeAccent }, line: { color: orangeAccent }, rectRadius: 0.05
    });
    slide.addText("Ongoing Project", {
      x: 0.8, y: 0.4, w: 1.6, h: 0.38,
      fontFace: font, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 2.5, y: 0.4, w: 1.8, h: 0.38,
      fill: { color: "F1F5F9" }, line: { color: borderLight }, rectRadius: 0.05
    });
    slide.addText("Process Improvement", {
      x: 2.5, y: 0.4, w: 1.8, h: 0.38,
      fontFace: font, fontSize: 9, bold: true, color: "334155", align: "center", valign: "middle"
    });

    slide.addText(title, {
      x: 4.4, y: 0.35, w: 5.8, h: 0.65,
      fontFace: font, fontSize: 16, bold: true, color: navyPrimary, align: "center", valign: "middle"
    });

    slide.addText("Continuous Improvement\nfor Better Production", {
      x: 10.3, y: 0.35, w: 2.2, h: 0.55,
      fontFace: font, fontSize: 8.5, bold: true, color: navyPrimary, align: "right"
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 11.2, y: 0.95, w: 1.3, h: 0.03,
      fill: { color: orangeAccent }
    });

    // 2. LEFT STATUS COLUMN
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.2, w: 1.6, h: 5.6,
      fill: { color: cardBgGrey }, line: { color: borderLight }, rectRadius: 0.08
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.95, y: 1.35, w: 1.3, h: 0.7,
      fill: { color: "FFFFFF" }, line: { color: blueCorporate, width: 1 }, rectRadius: 0.05
    });
    slide.addText("PRESENT STATUS", {
      x: 0.95, y: 1.35, w: 1.3, h: 0.7,
      fontFace: font, fontSize: 8, bold: true, color: navyPrimary, align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.95, y: 2.2, w: 1.3, h: 0.8,
      fill: { color: blueCorporate }, line: { color: blueCorporate }, rectRadius: 0.08
    });
    slide.addText("✔ Completed", {
      x: 0.95, y: 2.2, w: 1.3, h: 0.8,
      fontFace: font, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.95, y: 3.2, w: 1.3, h: 0.9,
      fill: { color: "FFFFFF" }, line: { color: borderLight }, rectRadius: 0.05
    });
    slide.addText(`CONCERN:\n${engineer}`, {
      x: 0.95, y: 3.2, w: 1.3, h: 0.9,
      fontFace: font, fontSize: 8.5, bold: true, color: navyPrimary, align: "center", valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.95, y: 5.6, w: 1.3, h: 1.0,
      fill: { color: navyDark }, line: { color: navyDark }, rectRadius: 0.08
    });
    slide.addText("Small Changes\nBig Impact", {
      x: 0.95, y: 5.6, w: 1.3, h: 1.0,
      fontFace: font, fontSize: 9.5, bold: true, italic: true, color: "FFFFFF", align: "center", valign: "middle"
    });

      // 3. CENTER / RIGHT PHOTO AREA (SPLIT OR PANORAMA)
      const photoBefore = task.photo_before || task.photo || null;
      const photoAfter = task.photo_after || null;

      // Photo Card 1: Present Condition
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 2.6, y: 1.2, w: 4.8, h: 3.3,
        fill: { color: cardBgGrey }, line: { color: borderLight }, rectRadius: 0.08
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 2.6, y: 1.2, w: 4.8, h: 0.35,
        fill: { color: orangeAccent }, line: { color: orangeAccent }, rectRadius: 0.05
      });
      slide.addText("PRESENT CONDITION", {
        x: 2.6, y: 1.2, w: 4.8, h: 0.35,
        fontFace: font, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      if (photoBefore && photoBefore.startsWith('data:image/')) {
        try {
          slide.addImage({ data: photoBefore, x: 2.8, y: 1.65, w: 4.4, h: 2.7 });
        } catch (e) {
          this._addEmptyPhotoFrame(slide, pptx, 2.8, 1.65, 4.4, 2.7);
        }
      } else if (photoBefore && (photoBefore.startsWith('http://') || photoBefore.startsWith('https://'))) {
        try {
          slide.addImage({ path: photoBefore, x: 2.8, y: 1.65, w: 4.4, h: 2.7 });
        } catch (e) {
          this._addEmptyPhotoFrame(slide, pptx, 2.8, 1.65, 4.4, 2.7);
        }
      } else {
        this._addEmptyPhotoFrame(slide, pptx, 2.8, 1.65, 4.4, 2.7);
      }

      // Chevron Separator
      slide.addText(">", {
        x: 7.45, y: 2.5, w: 0.5, h: 0.5,
        fontFace: font, fontSize: 16, bold: true, color: blueCorporate, align: "center", valign: "middle"
      });

      // Photo Card 2: Proposed Project
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.0, y: 1.2, w: 4.5, h: 3.3,
        fill: { color: cardBgGrey }, line: { color: borderLight }, rectRadius: 0.08
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.0, y: 1.2, w: 4.5, h: 0.35,
        fill: { color: blueCorporate }, line: { color: blueCorporate }, rectRadius: 0.05
      });
      slide.addText("PROPOSED PROJECT", {
        x: 8.0, y: 1.2, w: 4.5, h: 0.35,
        fontFace: font, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      if (photoAfter && photoAfter.startsWith('data:image/')) {
        try {
          slide.addImage({ data: photoAfter, x: 8.2, y: 1.65, w: 4.1, h: 2.7 });
        } catch (e) {
          this._addEmptyPhotoFrame(slide, pptx, 8.2, 1.65, 4.1, 2.7);
        }
      } else if (photoAfter && (photoAfter.startsWith('http://') || photoAfter.startsWith('https://'))) {
        try {
          slide.addImage({ path: photoAfter, x: 8.2, y: 1.65, w: 4.1, h: 2.7 });
        } catch (e) {
          this._addEmptyPhotoFrame(slide, pptx, 8.2, 1.65, 4.1, 2.7);
        }
      } else {
        this._addEmptyPhotoFrame(slide, pptx, 8.2, 1.65, 4.1, 2.7);
      }

      // 4. BOTTOM FUNCTIONAL ROW
      // Bottom Left: Summary Card
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 2.6, y: 4.65, w: 4.2, h: 2.15,
        fill: { color: cardBgBlue }, line: { color: cardBorderBlue }, rectRadius: 0.08
      });
      slide.addText("Summary", {
        x: 2.8, y: 4.75, w: 3.8, h: 0.3,
        fontFace: font, fontSize: 12, bold: true, color: "0C4A6E"
      });
      slide.addText(desc, {
        x: 2.8, y: 5.1, w: 3.8, h: 1.0,
        fontFace: font, fontSize: 9.5, color: "0F172A", lineSpacing: 14
      });
      slide.addText(`Investment: ${investment}`, {
        x: 2.8, y: 6.2, w: 3.8, h: 0.4,
        fontFace: font, fontSize: 9, bold: true, color: "0369A1"
      });

      // Bottom Center: Radial Completion Donut
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.95, y: 4.65, w: 1.8, h: 2.15,
        fill: { color: "FFFFFF" }, line: { color: borderLight }, rectRadius: 0.08
      });
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 7.2, y: 4.85, w: 1.3, h: 1.3,
        line: { color: greenSuccess, width: 6 }, fill: { color: "FFFFFF" }
      });
      slide.addText("100%\nCompleted", {
        x: 7.0, y: 5.15, w: 1.7, h: 0.8,
        fontFace: font, fontSize: 12, bold: true, color: navyPrimary, align: "center"
      });

      // Bottom Right: Project Impact Card
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.9, y: 4.65, w: 3.6, h: 2.15,
        fill: { color: "FFFFFF" }, line: { color: borderLight }, rectRadius: 0.08
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.9, y: 4.65, w: 3.6, h: 0.35,
        fill: { color: blueCorporate }, line: { color: blueCorporate }, rectRadius: 0.05
      });
      slide.addText("PROJECT IMPACT", {
        x: 8.9, y: 4.65, w: 3.6, h: 0.35,
        fontFace: font, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle"
      });

      const pillColors = ["E0F2FE", "FEF3C7", "F1F5F9", "DCFCE7"];
      const textColors = ["0369A1", "B45309", "334155", "15803D"];

      impacts.slice(0, 4).forEach((imp, iIdx) => {
        const pY = 5.1 + iIdx * 0.4;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 9.05, y: pY, w: 3.3, h: 0.32,
          fill: { color: pillColors[iIdx % 4] }, line: { color: pillColors[iIdx % 4] }, rectRadius: 0.05
        });
        slide.addText(imp, {
          x: 9.15, y: pY, w: 3.1, h: 0.32,
          fontFace: font, fontSize: 8.5, bold: true, color: textColors[iIdx % 4], valign: "middle"
        });
      });

      this._addFooter(slide, currentSlideNum, totalSlideCount);
  }

  _addHeader(slide, title, subtitle, month) {
    const font = "Lexend";
    slide.addText("WALTON HI-TECH INDUSTRIES PLC • PROCESS DEVELOPMENT", {
      x: 0.8, y: 0.4, w: 7.0, h: 0.3,
      fontFace: font, fontSize: 9, bold: true, color: "0284C7"
    });
    slide.addText(title, {
      x: 0.8, y: 0.7, w: 8.5, h: 0.5,
      fontFace: font, fontSize: 18, bold: true, color: "0B2038"
    });
    slide.addText(subtitle, {
      x: 0.8, y: 1.15, w: 8.5, h: 0.3,
      fontFace: font, fontSize: 10, color: "64748B"
    });
    slide.addText(month.toUpperCase(), {
      x: 9.5, y: 0.5, w: 3.0, h: 0.5,
      fontFace: font, fontSize: 14, bold: true, color: "FF6B00", align: "right"
    });
  }

  _addFooter(slide, current, total) {
    const font = "Lexend";
    slide.addText(`Slide ${current} of ${total}`, {
      x: 0.8, y: 7.0, w: 4.0, h: 0.3,
      fontFace: font, fontSize: 8.5, color: "94A3B8"
    });
    slide.addText("Process Development, Air Conditioner, Walton Hi-Tech Industries PLC", {
      x: 6.0, y: 7.0, w: 6.5, h: 0.3,
      fontFace: font, fontSize: 8.5, italic: true, color: "94A3B8", align: "right"
    });
  }

  /**
   * Slide N+1: Final Summary Report Slide (Dashboard Color Card Pattern - Requirement 11)
   */
  _addFinalSummaryDashboardSlide(slide, pptx, font, monthName, currentSlideNum, totalSlideCount, reportData) {
    const redPrimary = "C5161D";
    const charcoalDark = "0F172A";

    this._addExecutiveHeader(slide, pptx, font, "MONTHLY DELIVERABLES SUMMARY • EXECUTIVE AUDIT", `Comprehensive Deliverables & Impact Summary (${monthName.toUpperCase()})`);

    let tasksList = (reportData && (reportData.slides || reportData.tasks));
    if (!tasksList && typeof MonthWorkbookManager !== 'undefined') {
      try {
        const mgr = new MonthWorkbookManager();
        tasksList = mgr.getTasksForMonth(monthName);
      } catch(e) {}
    }
    tasksList = tasksList || [];

    let processCount = 0;
    let toolsCount = 0;
    let partsCount = 0;
    let costCount = 0;
    let manpowerCount = 0;
    let bomCount = 0;
    let completedProjCount = 0;
    let ongoingProjCount = 0;
    let totalPoints = 0;

    tasksList.forEach(t => {
      totalPoints += (t.task_point || 0);
      const cat = (t.category || '').toLowerCase();
      const title = (t.slide_title || t.task_name || '').toLowerCase();
      const status = (t.status || t.project_status || '').toLowerCase();
      const isProj = Boolean(t.is_project || cat.includes('project') || title.includes('project'));

      if (isProj || cat.includes('project')) {
        if (status.includes('complete') || cat.includes('completed project')) completedProjCount++;
        else ongoingProjCount++;
      } else {
        if (cat.includes('process') || title.includes('process')) processCount++;
        if (cat.includes('tool') || title.includes('tool') || title.includes('die') || title.includes('fixture')) toolsCount++;
        if (cat.includes('part') || cat.includes('component') || title.includes('part')) partsCount++;
        if (cat.includes('cost') || cat.includes('saving') || title.includes('cost') || title.includes('saving')) costCount++;
        if (cat.includes('manpower') || title.includes('manpower')) manpowerCount++;
        if (cat.includes('bom') || title.includes('bom')) bomCount++;
      }
    });

    let yearlySavings = "BDT 0";
    if (typeof CostSavingTracker !== 'undefined') {
      const ct = CostSavingTracker.calculate([], monthName);
      yearlySavings = ct.displayCumulativeYTD || "BDT 0";
    }

    const cards = [
      { val: `${processCount}`, label: "Process Developed", icon: "⚙️", bg: "EFF6FF", line: "60A5FA", valColor: "1D4ED8", labelColor: "1E3A8A" },
      { val: `${toolsCount}`, label: "Tools Developed", icon: "🔧", bg: "EEF2FF", line: "818CF8", valColor: "4338CA", labelColor: "312E81" },
      { val: `${partsCount}`, label: "Parts Developed", icon: "🔩", bg: "ECFDF5", line: "34D399", valColor: "047857", labelColor: "064E3B" },
      { val: `${costCount}`, label: "Cost Optimisation", icon: "💰", bg: "FFFBEB", line: "FBBF24", valColor: "B45309", labelColor: "78350F" },
      { val: `${manpowerCount}`, label: "Manpower Optimization", icon: "👥", bg: "FAF5FF", line: "C084FC", valColor: "7E22CE", labelColor: "581C87" },
      { val: `${bomCount}`, label: "BOM Verification", icon: "📋", bg: "FFF1F2", line: "FB7185", valColor: "BE123C", labelColor: "881337" },
      { val: `${completedProjCount}`, label: "Completed Projects", icon: "🏆", bg: "FEF2F2", line: "F87171", valColor: "B91C1C", labelColor: "7F1D1D" },
      { val: `${ongoingProjCount}`, label: "New Projects / Ongoing", icon: "🚀", bg: "ECFEFF", line: "22D3EE", valColor: "0E7490", labelColor: "164E63" }
    ];

    cards.forEach((k, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const px = 0.8 + col * 2.98;
      const py = 1.45 + row * 2.25;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px, y: py, w: 2.82, h: 2.1,
        fill: { color: k.bg }, line: { color: k.line, width: 1.5 }, rectRadius: 0.1
      });

      slide.addText(`${k.icon}  ${k.val}`, {
        x: px + 0.2, y: py + 0.18, w: 2.42, h: 0.6,
        fontFace: font, fontSize: 26, bold: true, color: k.valColor
      });

      slide.addText(k.label, {
        x: px + 0.2, y: py + 0.85, w: 2.42, h: 0.45,
        fontFace: font, fontSize: 11.5, bold: true, color: k.labelColor
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px + 0.2, y: py + 1.45, w: 2.42, h: 0.4,
        fill: { color: "FFFFFF" }, line: { color: k.line, width: 0.5 }, rectRadius: 0.05
      });
      slide.addText("Status: Verified 100%", {
        x: px + 0.2, y: py + 1.45, w: 2.42, h: 0.4,
        fontFace: font, fontSize: 8.5, bold: true, color: k.valColor, align: "center", valign: "middle"
      });
    });

    // Operational Audit Banner
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 6.05, w: 11.85, h: 0.55,
      fill: { color: "F8FAFC" }, line: { color: "CBD5E1", width: 1 }, rectRadius: 0.08
    });
    slide.addText(`✅ Plant Audit Verified: ${tasksList.length} Tasks Executed (${totalPoints} Total Task Points)`, {
      x: 1.0, y: 6.05, w: 7.0, h: 0.55,
      fontFace: font, fontSize: 9.5, bold: true, color: "334155", valign: "middle"
    });
    slide.addText(`Realized Savings: ${yearlySavings}/Year`, {
      x: 8.0, y: 6.05, w: 4.45, h: 0.55,
      fontFace: font, fontSize: 10, bold: true, color: "047857", align: "right", valign: "middle"
    });

    this._addExecutiveRedFooter(slide, pptx, font, monthName, currentSlideNum, totalSlideCount);
  }

  /**
   * Slide N+1: Industrial Innovation Blue Final Summary Slide (Requirement 11)
   */
  _addIndustrialBlueFinalSummarySlide(slide, pptx, font, monthName, currentSlideNum, totalSlideCount, reportData) {
    const blueDark = "0052CC";
    const charcoalDark = "0F172A";

    this._addIndustrialBlueHeader(slide, pptx, font, "MONTHLY DELIVERABLES SUMMARY • EXECUTIVE AUDIT", `Comprehensive Deliverables & Impact Summary (${monthName.toUpperCase()})`);

    let tasksList = (reportData && (reportData.slides || reportData.tasks));
    if (!tasksList && typeof MonthWorkbookManager !== 'undefined') {
      try {
        const mgr = new MonthWorkbookManager();
        tasksList = mgr.getTasksForMonth(monthName);
      } catch(e) {}
    }
    tasksList = tasksList || [];

    let processCount = 0;
    let toolsCount = 0;
    let partsCount = 0;
    let costCount = 0;
    let manpowerCount = 0;
    let bomCount = 0;
    let completedProjCount = 0;
    let ongoingProjCount = 0;
    let totalPoints = 0;

    tasksList.forEach(t => {
      totalPoints += (t.task_point || 0);
      const cat = (t.category || '').toLowerCase();
      const title = (t.slide_title || t.task_name || '').toLowerCase();
      const status = (t.status || t.project_status || '').toLowerCase();
      const isProj = Boolean(t.is_project || cat.includes('project') || title.includes('project'));

      if (isProj || cat.includes('project')) {
        if (status.includes('complete') || cat.includes('completed project')) completedProjCount++;
        else ongoingProjCount++;
      } else {
        if (cat.includes('process') || title.includes('process')) processCount++;
        if (cat.includes('tool') || title.includes('tool') || title.includes('die') || title.includes('fixture')) toolsCount++;
        if (cat.includes('part') || cat.includes('component') || title.includes('part')) partsCount++;
        if (cat.includes('cost') || cat.includes('saving') || title.includes('cost') || title.includes('saving')) costCount++;
        if (cat.includes('manpower') || title.includes('manpower')) manpowerCount++;
        if (cat.includes('bom') || title.includes('bom')) bomCount++;
      }
    });

    let yearlySavings = "BDT 0";
    if (typeof CostSavingTracker !== 'undefined') {
      const ct = CostSavingTracker.calculate([], monthName);
      yearlySavings = ct.displayCumulativeYTD || "BDT 0";
    }

    const cards = [
      { val: `${processCount}`, label: "Process Developed", icon: "⚙️", bg: "EFF6FF", line: "60A5FA", valColor: "1D4ED8", labelColor: "1E3A8A" },
      { val: `${toolsCount}`, label: "Tools Developed", icon: "🔧", bg: "EEF2FF", line: "818CF8", valColor: "4338CA", labelColor: "312E81" },
      { val: `${partsCount}`, label: "Parts Developed", icon: "🔩", bg: "ECFDF5", line: "34D399", valColor: "047857", labelColor: "064E3B" },
      { val: `${costCount}`, label: "Cost Optimisation", icon: "💰", bg: "FFFBEB", line: "FBBF24", valColor: "B45309", labelColor: "78350F" },
      { val: `${manpowerCount}`, label: "Manpower Optimization", icon: "👥", bg: "FAF5FF", line: "C084FC", valColor: "7E22CE", labelColor: "581C87" },
      { val: `${bomCount}`, label: "BOM Verification", icon: "📋", bg: "FFF1F2", line: "FB7185", valColor: "BE123C", labelColor: "881337" },
      { val: `${completedProjCount}`, label: "Completed Projects", icon: "🏆", bg: "FEF2F2", line: "F87171", valColor: "B91C1C", labelColor: "7F1D1D" },
      { val: `${ongoingProjCount}`, label: "New Projects / Ongoing", icon: "🚀", bg: "ECFEFF", line: "22D3EE", valColor: "0E7490", labelColor: "164E63" }
    ];

    cards.forEach((k, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const px = 0.8 + col * 2.98;
      const py = 1.45 + row * 2.25;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px, y: py, w: 2.82, h: 2.1,
        fill: { color: k.bg }, line: { color: k.line, width: 1.5 }, rectRadius: 0.1
      });

      slide.addText(`${k.icon}  ${k.val}`, {
        x: px + 0.2, y: py + 0.18, w: 2.42, h: 0.6,
        fontFace: font, fontSize: 26, bold: true, color: k.valColor
      });

      slide.addText(k.label, {
        x: px + 0.2, y: py + 0.85, w: 2.42, h: 0.45,
        fontFace: font, fontSize: 11.5, bold: true, color: k.labelColor
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: px + 0.2, y: py + 1.45, w: 2.42, h: 0.4,
        fill: { color: "FFFFFF" }, line: { color: k.line, width: 0.5 }, rectRadius: 0.05
      });
      slide.addText("Status: Verified 100%", {
        x: px + 0.2, y: py + 1.45, w: 2.42, h: 0.4,
        fontFace: font, fontSize: 8.5, bold: true, color: k.valColor, align: "center", valign: "middle"
      });
    });

    // Operational Audit Banner
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 6.05, w: 11.85, h: 0.55,
      fill: { color: "F8FAFC" }, line: { color: "BAE6FD", width: 1 }, rectRadius: 0.08
    });
    slide.addText(`✅ Plant Audit Verified: ${tasksList.length} Tasks Executed (${totalPoints} Total Task Points)`, {
      x: 1.0, y: 6.05, w: 7.0, h: 0.55,
      fontFace: font, fontSize: 9.5, bold: true, color: "334155", valign: "middle"
    });
    slide.addText(`Realized Savings: ${yearlySavings}/Year`, {
      x: 8.0, y: 6.05, w: 4.45, h: 0.55,
      fontFace: font, fontSize: 10, bold: true, color: "0284C7", align: "right", valign: "middle"
    });

    this._addIndustrialBlueFooter(slide, pptx, font, monthName, currentSlideNum, totalSlideCount);
  }

  /**
   * Slide N+2: Thank You / Closing Slide (Requirement 11)
   */
  _addThankYouSlide(slide, pptx, font, monthName) {
    // Top subtle bar
    slide.addShape(pptx.ShapeType.diamond, {
      x: 0.8, y: 0.45, w: 0.35, h: 0.35,
      fill: { color: "C5161D" }, line: { color: "E11D48" }
    });
    slide.addText([
      { text: "WALTON Hi-Tech Industries PLC\n", options: { fontSize: 11, bold: true, color: "FFFFFF" } },
      { text: "PROCESS DEVELOPMENT DEPARTMENT", options: { fontSize: 8, bold: true, color: "94A3B8" } }
    ], {
      x: 1.25, y: 0.4, w: 6.5, h: 0.55,
      fontFace: font, valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 10.4, y: 0.45, w: 2.1, h: 0.4,
      fill: { color: "0B2038" }, line: { color: "334155", width: 1 }, rectRadius: 0.2
    });
    slide.addText(monthName.toUpperCase(), {
      x: 10.4, y: 0.45, w: 2.1, h: 0.4,
      fontFace: font, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // Center Stage
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.91, y: 1.7, w: 1.5, h: 1.5,
      fill: { color: "C5161D" }, line: { color: "F59E0B", width: 2 }, rectRadius: 0.3
    });
    slide.addText("💎", {
      x: 5.91, y: 1.7, w: 1.5, h: 1.5,
      fontSize: 40, align: "center", valign: "middle"
    });

    slide.addText("THANK YOU", {
      x: 0.8, y: 3.4, w: 11.7, h: 1.0,
      fontFace: font, fontSize: 48, bold: true, color: "FFFFFF", align: "center"
    });

    slide.addText("SMALL CHANGES • BIG IMPACT", {
      x: 0.8, y: 4.45, w: 11.7, h: 0.4,
      fontFace: font, fontSize: 14, bold: true, color: "F97316", align: "center"
    });

    slide.addText("Open for Technical Discussions, Feedback & Strategic Suggestions for Plant-Wide Process Improvements.", {
      x: 2.5, y: 5.0, w: 8.33, h: 0.6,
      fontFace: font, fontSize: 11, color: "94A3B8", align: "center"
    });

    // Bottom Bar
    slide.addShape(pptx.ShapeType.line, {
      x: 0.8, y: 6.6, w: 11.7, h: 0,
      line: { color: "1E293B", width: 1 }
    });
    slide.addText("📍 Chandra, Gazipur, Bangladesh   •   Continuous Innovation", {
      x: 0.8, y: 6.75, w: 6.0, h: 0.35,
      fontFace: font, fontSize: 8.5, color: "64748B"
    });
    slide.addText("Process Engineering Excellence", {
      x: 7.0, y: 6.75, w: 5.5, h: 0.35,
      fontFace: font, fontSize: 8.5, bold: true, color: "94A3B8", align: "right"
    });
  }

  /**
   * Slide N+2: Industrial Innovation Blue Thank You Slide (Requirement 11)
   */
  _addIndustrialBlueThankYouSlide(slide, pptx, font, monthName) {
    // Top subtle bar
    slide.addShape(pptx.ShapeType.diamond, {
      x: 0.8, y: 0.45, w: 0.35, h: 0.35,
      fill: { color: "0284C7" }, line: { color: "38BDF8" }
    });
    slide.addText([
      { text: "WALTON Hi-Tech Industries PLC\n", options: { fontSize: 11, bold: true, color: "FFFFFF" } },
      { text: "PROCESS DEVELOPMENT DEPARTMENT", options: { fontSize: 8, bold: true, color: "94A3B8" } }
    ], {
      x: 1.25, y: 0.4, w: 6.5, h: 0.55,
      fontFace: font, valign: "middle"
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 10.4, y: 0.45, w: 2.1, h: 0.4,
      fill: { color: "0B2038" }, line: { color: "334155", width: 1 }, rectRadius: 0.2
    });
    slide.addText(monthName.toUpperCase(), {
      x: 10.4, y: 0.45, w: 2.1, h: 0.4,
      fontFace: font, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle"
    });

    // Center Stage
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.91, y: 1.7, w: 1.5, h: 1.5,
      fill: { color: "0284C7" }, line: { color: "38BDF8", width: 2 }, rectRadius: 0.3
    });
    slide.addText("💎", {
      x: 5.91, y: 1.7, w: 1.5, h: 1.5,
      fontSize: 40, align: "center", valign: "middle"
    });

    slide.addText("THANK YOU", {
      x: 0.8, y: 3.4, w: 11.7, h: 1.0,
      fontFace: font, fontSize: 48, bold: true, color: "FFFFFF", align: "center"
    });

    slide.addText("CONTINUOUS INNOVATION • INDUSTRIAL EXCELLENCE", {
      x: 0.8, y: 4.45, w: 11.7, h: 0.4,
      fontFace: font, fontSize: 13, bold: true, color: "38BDF8", align: "center"
    });

    slide.addText("Open for Technical Discussions, Feedback & Strategic Suggestions for Plant-Wide Process Improvements.", {
      x: 2.5, y: 5.0, w: 8.33, h: 0.6,
      fontFace: font, fontSize: 11, color: "94A3B8", align: "center"
    });

    // Bottom Bar
    slide.addShape(pptx.ShapeType.line, {
      x: 0.8, y: 6.6, w: 11.7, h: 0,
      line: { color: "1E293B", width: 1 }
    });
    slide.addText("📍 Chandra, Gazipur, Bangladesh   •   Continuous Innovation", {
      x: 0.8, y: 6.75, w: 6.0, h: 0.35,
      fontFace: font, fontSize: 8.5, color: "64748B"
    });
    slide.addText("Process Engineering Excellence", {
      x: 7.0, y: 6.75, w: 5.5, h: 0.35,
      fontFace: font, fontSize: 8.5, bold: true, color: "94A3B8", align: "right"
    });
  }

  _addEmptyPhotoFrame(slide, pptx, x, y, w, h) {
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w, h,
      fill: { color: "F8FAFC" }, line: { color: "E2E8F0", width: 1, dashType: "dash" }
    });
    slide.addText("Engineering Reference Visual", {
      x, y: y + h / 2 - 0.2, w, h: 0.4,
      fontFace: "Lexend", fontSize: 9, color: "94A3B8", align: "center"
    });
  }
}

const pptxGenerator = new PPTXGenerator();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PPTXGenerator, pptxGenerator };
} else if (typeof window !== 'undefined') {
  window.PPTXGenerator = PPTXGenerator;
  window.pptxGenerator = pptxGenerator;
}
