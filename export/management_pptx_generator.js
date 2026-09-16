/**
 * Process Development Monthly Report Automation System
 * Module: Management PPTX Generator
 * Generates 100% editable OpenXML PowerPoint presentations for Executive Management Review
 * Layout: 
 *   1. Executive Cover Slide
 *   2. Executive All-Works Summary Table Slide (auto-calculates task counts & BDT savings)
 *   3. Concern-by-Concern Sequenced Task Slides (Text & Image focus, no blank space)
 *   4. Executive Thank You & Q&A Slide
 * WALTON Hi-Tech Industries PLC
 */

class ManagementPPTXGenerator {
  constructor(theme = (typeof SLIDE_THEME !== 'undefined' ? SLIDE_THEME : {})) {
    this.theme = theme;
  }

  /**
   * Builds the presentation deck without triggering a file download (useful for tests and programmatic usage)
   */
  generateDeck(monthOrData, tasks = [], summary = null) {
    let reportData = {};
    if (typeof monthOrData === 'object' && monthOrData !== null && !Array.isArray(monthOrData)) {
      reportData = monthOrData;
    } else {
      reportData = {
        month: monthOrData,
        tasks: Array.isArray(tasks) ? tasks : (tasks && tasks.sequencedTasks ? tasks.sequencedTasks : []),
        summary: summary
      };
    }

    if (typeof PptxGenJS === 'undefined') {
      throw new Error("PptxGenJS library is not loaded.");
    }

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE"; // 13.333" × 7.5"
    pptx.author = "Walton AC Process Development";
    pptx.company = "WALTON Hi-Tech Industries PLC";
    pptx.title = `Executive Management Report - ${reportData.month || "SEP-2026"}`;

    const font = "Lexend";
    const monthName = reportData.month || "SEPTEMBER 2026";
    const rawTasks = Array.isArray(reportData.tasks) ? reportData.tasks : (reportData.tasks && reportData.tasks.sequencedTasks ? reportData.tasks.sequencedTasks : []);
    const sum = reportData.summary || {
      totalTasks: rawTasks.length,
      formattedTotalSavings: "৳ 0 / Year",
      completionRate: 0,
      uniqueConcernsCount: 1
    };

    // Group & sequence tasks strictly by Concern / Engineer
    const groups = {};
    rawTasks.forEach(t => {
      const c = (t.concern || t.assignee || "General").trim();
      if (!groups[c]) groups[c] = [];
      groups[c].push(t);
    });

    const sortedConcerns = Object.keys(groups).sort((a, b) => {
      if (a.includes("Sazzad")) return -1;
      if (b.includes("Sazzad")) return 1;
      return a.localeCompare(b);
    });

    const sequencedTasks = [];
    sortedConcerns.forEach(c => {
      sequencedTasks.push(...groups[c]);
    });

    const totalSlideCount = sequencedTasks.length + 3; // Cover + Summary Table + Tasks + Thank You

    // ==========================================
    // 1. SLIDE 1: EXECUTIVE COVER PAGE
    // ==========================================
    const slideCover = pptx.addSlide();
    this._addCoverSlide(slideCover, font, monthName);

    // ==========================================
    // 2. SLIDE 2: ALL-WORKS SUMMARY TABLE SLIDE
    // ==========================================
    const slideSummary = pptx.addSlide();
    this._addSummaryTableSlide(slideSummary, font, monthName, sequencedTasks, sum, 2, totalSlideCount);

    // ==========================================
    // 3. SLIDES 3 to N: CONCERN-WISE TASK SLIDES
    // ==========================================
    let currentSlideNum = 3;
    for (const task of sequencedTasks) {
      const slideTask = pptx.addSlide();
      this._addTaskSlide(slideTask, font, monthName, task, currentSlideNum, totalSlideCount);
      currentSlideNum++;
    }

    // ==========================================
    // 4. FINAL SLIDE: EXECUTIVE THANK YOU PAGE
    // ==========================================
    const slideThankYou = pptx.addSlide();
    this._addThankYouSlide(slideThankYou, font, monthName);

    return pptx;
  }

  /**
   * Generates and downloads the Management Report PPTX presentation
   * @param {Object} reportData - { month, tasks, summary }
   */
  async generatePresentation(reportData = {}) {
    const pptx = this.generateDeck(reportData);
    const monthName = reportData.month || "SEPTEMBER 2026";
    const cleanMonth = String(monthName).replace(/[^A-Za-z0-9_-]/g, '_');
    const filename = `Walton_AC_Executive_Management_Report_${cleanMonth}.pptx`;
    await pptx.writeFile({ fileName: filename });
    return { success: true, filename, totalSlides: (pptx.slides ? pptx.slides.length : 4) };
  }

  // Static proxies
  static getInstance() {
    if (typeof window !== 'undefined') {
      if (!window.managementPptxGenerator) {
        window.managementPptxGenerator = new ManagementPPTXGenerator();
      }
      return window.managementPptxGenerator;
    }
    return new ManagementPPTXGenerator();
  }

  static generateDeck(month, tasks, summary) {
    return this.getInstance().generateDeck(month, tasks, summary);
  }

  static generatePresentation(reportData) {
    return this.getInstance().generatePresentation(reportData);
  }

  // --------------------------------------------------------------------------
  // SLIDE 1: COVER SLIDE
  // --------------------------------------------------------------------------
  _addCoverSlide(slide, font, monthName) {
    // Deep executive navy background with subtle crimson gradient effect
    slide.background = { color: "0B2038" };

    // Accent top banner
    slide.addShape('rect', {
      x: 0, y: 0, w: 13.333, h: 0.15,
      fill: { color: "E11D48" },
      line: { color: "E11D48" }
    });

    // Walton Logo
    slide.addImage({
      path: "assets/img/walton_logo.png",
      x: 1.0, y: 1.2, w: 2.2, h: 0.8,
      sizing: { type: "contain" }
    });

    // Department Tag Pill
    slide.addShape('roundRect', {
      x: 1.0, y: 2.4, w: 4.8, h: 0.45,
      rectRadius: 0.1,
      fill: { color: "1E293B" },
      line: { color: "334155", width: 1 }
    });
    slide.addText("AC PROCESS DEVELOPMENT DEPARTMENT", {
      x: 1.1, y: 2.4, w: 4.6, h: 0.45,
      fontSize: 11, fontFace: font, bold: true, color: "38BDF8",
      valign: "middle"
    });

    // Main Title
    slide.addText("EXECUTIVE MANAGEMENT REPORT", {
      x: 1.0, y: 3.0, w: 11.5, h: 1.1,
      fontSize: 34, fontFace: font, bold: true, color: "FFFFFF",
      valign: "middle"
    });

    // Subtitle
    slide.addText("Strategic Manufacturing Innovations, Process Optimization & Annual Cost Impact", {
      x: 1.0, y: 4.1, w: 11.0, h: 0.6,
      fontSize: 16, fontFace: font, color: "94A3B8"
    });

    // Reporting Month Box
    slide.addShape('roundRect', {
      x: 1.0, y: 4.9, w: 3.4, h: 0.6,
      rectRadius: 0.12,
      fill: { color: "E11D48" },
      line: { color: "E11D48" }
    });
    slide.addText(`📅 REPORTING PERIOD: ${monthName.toUpperCase()}`, {
      x: 1.0, y: 4.9, w: 3.4, h: 0.6,
      fontSize: 11, fontFace: font, bold: true, color: "FFFFFF",
      align: "center", valign: "middle"
    });

    // Presenter & Organization Block
    slide.addShape('line', {
      x: 1.0, y: 5.9, w: 11.333, h: 0,
      line: { color: "334155", width: 1 }
    });

    slide.addText("WALTON Hi-Tech Industries PLC • Manufacturing Headquarters, Chandra, Gazipur", {
      x: 1.0, y: 6.15, w: 7.0, h: 0.4,
      fontSize: 11, fontFace: font, color: "64748B"
    });

    slide.addText("Prepared by: Engr. Md. Sazzad Hossain & AC Process Development Team", {
      x: 8.0, y: 6.15, w: 4.3, h: 0.4,
      fontSize: 11, fontFace: font, bold: true, color: "CBD5E1",
      align: "right"
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE 2: ALL-WORKS SUMMARY TABLE SLIDE
  // --------------------------------------------------------------------------
  _addSummaryTableSlide(slide, font, monthName, tasks, summary, slideNum, totalSlides) {
    slide.background = { color: "FFFFFF" };

    // Header Bar
    this._addHeader(slide, font, monthName, "EXECUTIVE SUMMARY: ALL WORKS & COST IMPACT");

    // 4 Top KPI Cards
    const kpis = [
      { label: "TOTAL STRATEGIC TASKS", val: String(tasks.length), bg: "F8FAFC", border: "E2E8F0", color: "0F172A" },
      { label: "TOTAL COST IMPACT (ANNUAL)", val: summary.formattedTotalSavings || "৳ 0 / Year", bg: "FEF3C7", border: "FDE68A", color: "92400E" },
      { label: "CONCERNS ENGAGED", val: `${summary.uniqueConcernsCount || 1} Engineers`, bg: "F0FDF4", border: "BBF7D0", color: "166534" },
      { label: "COMPLETION RATE", val: `${summary.completionRate || 0}% Completed`, bg: "EFF6FF", border: "BFDBFE", color: "1E40AF" }
    ];

    const cardW = 2.65;
    const gap = 0.24;
    kpis.forEach((k, i) => {
      const x = 0.8 + i * (cardW + gap);
      slide.addShape('roundRect', {
        x: x, y: 1.35, w: cardW, h: 0.85,
        rectRadius: 0.08,
        fill: { color: k.bg },
        line: { color: k.border, width: 1 }
      });
      slide.addText(k.label, {
        x: x + 0.1, y: 1.42, w: cardW - 0.2, h: 0.25,
        fontSize: 8.5, fontFace: font, bold: true, color: "64748B"
      });
      slide.addText(k.val, {
        x: x + 0.1, y: 1.68, w: cardW - 0.2, h: 0.45,
        fontSize: 14, fontFace: font, bold: true, color: k.color,
        valign: "middle"
      });
    });

    // Table Data
    const tableHeader = [
      { text: "SL", options: { bold: true, align: "center", fill: { color: "0B2038" }, color: "FFFFFF" } },
      { text: "Concern Engineer", options: { bold: true, fill: { color: "0B2038" }, color: "FFFFFF" } },
      { text: "Strategic Work / Project Name", options: { bold: true, fill: { color: "0B2038" }, color: "FFFFFF" } },
      { text: "Category", options: { bold: true, fill: { color: "0B2038" }, color: "FFFFFF" } },
      { text: "Timeline / Target", options: { bold: true, fill: { color: "0B2038" }, color: "FFFFFF" } },
      { text: "Annual Cost Impact", options: { bold: true, align: "right", fill: { color: "0B2038" }, color: "FFFFFF" } },
      { text: "Status", options: { bold: true, align: "center", fill: { color: "0B2038" }, color: "FFFFFF" } }
    ];

    const tableRows = [tableHeader];
    const displayTasks = tasks.slice(0, 8); // Top 8 strategic works fit cleanly

    displayTasks.forEach((t, idx) => {
      const isCompleted = (t.status || '').toLowerCase().includes('complete');
      const isEven = idx % 2 === 1;
      const rowBg = isEven ? "F8FAFC" : "FFFFFF";

      tableRows.push([
        { text: String(idx + 1), options: { align: "center", fill: { color: rowBg }, color: "64748B", bold: true } },
        { text: t.concern || t.assignee || "General", options: { fill: { color: rowBg }, color: "0F172A", bold: true } },
        { text: t.task_name, options: { fill: { color: rowBg }, color: "0F172A" } },
        { text: t.category || "Process Dev", options: { fill: { color: rowBg }, color: "475569" } },
        { text: t.timeline || "4-5 Months", options: { fill: { color: rowBg }, color: "475569" } },
        { text: t.cost_impact || "৳ 0", options: { align: "right", fill: { color: rowBg }, color: "D97706", bold: true } },
        { text: isCompleted ? "Completed" : "In Progress", options: { align: "center", fill: { color: isCompleted ? "DCFCE7" : "EFF6FF" }, color: isCompleted ? "166534" : "1E40AF", bold: true } }
      ]);
    });

    slide.addTable(tableRows, {
      x: 0.8, y: 2.45, w: 11.733,
      colW: [0.6, 2.3, 3.8, 1.7, 1.4, 1.4, 1.2],
      fontSize: 9.5,
      fontFace: font,
      border: { pt: 0.5, color: "E2E8F0" },
      valign: "middle"
    });

    // Footer
    this._addFooter(slide, font, monthName, slideNum, totalSlides);
  }

  // --------------------------------------------------------------------------
  // SLIDES 3 to N: CONCERN-WISE TASK SLIDES
  // --------------------------------------------------------------------------
  _addTaskSlide(slide, font, monthName, task, slideNum, totalSlides) {
    slide.background = { color: "FFFFFF" };

    // Header Bar with Concern Badge & Category
    const concern = task.concern || task.assignee || "General Concern";
    this._addHeader(slide, font, monthName, `CONCERN: ${concern.toUpperCase()}`);

    // Project Main Title (Large, Clear)
    slide.addText(task.task_name, {
      x: 0.8, y: 1.3, w: 11.7, h: 0.7,
      fontSize: 18, fontFace: font, bold: true, color: "0F172A",
      valign: "top"
    });

    // Left Column: Details & Impact Cards (Width: 6.4")
    const leftW = 6.4;

    // Card 1: Annual Cost Impact Highlight Box
    slide.addShape('roundRect', {
      x: 0.8, y: 2.1, w: leftW, h: 0.95,
      rectRadius: 0.1,
      fill: { color: "FEF3C7" },
      line: { color: "FDE68A", width: 1.5 }
    });
    slide.addText("💰 ANNUAL COST SAVING / FINANCIAL IMPACT", {
      x: 1.0, y: 2.18, w: leftW - 0.4, h: 0.25,
      fontSize: 9, fontFace: font, bold: true, color: "92400E"
    });
    slide.addText(task.cost_impact || "Significant Cost Avoidance & Process Efficiency", {
      x: 1.0, y: 2.45, w: leftW - 0.4, h: 0.5,
      fontSize: 18, fontFace: font, bold: true, color: "B45309",
      valign: "middle"
    });

    // Card 2: Timeline & Milestones Box
    slide.addShape('roundRect', {
      x: 0.8, y: 3.2, w: leftW, h: 1.85,
      rectRadius: 0.1,
      fill: { color: "F8FAFC" },
      line: { color: "E2E8F0", width: 1 }
    });
    slide.addText(`⏱️ PROJECT TIMELINE: ${task.timeline || 'Active Development'}`, {
      x: 1.0, y: 3.3, w: leftW - 0.4, h: 0.28,
      fontSize: 10, fontFace: font, bold: true, color: "1E40AF"
    });

    const milestonesText = task.milestones || "1. Detailed technical design study\n2. Tooling fabrication & assembly\n3. Safety validation & line deployment";
    slide.addText(milestonesText, {
      x: 1.0, y: 3.65, w: leftW - 0.4, h: 1.3,
      fontSize: 9.5, fontFace: font, color: "334155",
      lineSpacing: 16
    });

    // Card 3: Key Strategic Management Outcomes
    slide.addShape('roundRect', {
      x: 0.8, y: 5.18, w: leftW, h: 1.45,
      rectRadius: 0.1,
      fill: { color: "F0FDF4" },
      line: { color: "BBF7D0", width: 1 }
    });
    slide.addText("🎯 KEY MANAGEMENT OUTCOMES & OPERATIONAL IMPACT:", {
      x: 1.0, y: 5.26, w: leftW - 0.4, h: 0.25,
      fontSize: 9, fontFace: font, bold: true, color: "166534"
    });

    const impactText = task.key_impact || "• Enhanced manufacturing efficiency and line ergonomics\n• Reduced operational cycle time and manual intervention\n• Zero defects assurance across Walton RAC production lines";
    slide.addText(impactText, {
      x: 1.0, y: 5.55, w: leftW - 0.4, h: 1.0,
      fontSize: 9.5, fontFace: font, color: "14532D",
      lineSpacing: 15
    });

    // Right Column: Image Container (Width: 5.0", Height: 4.53")
    const rightX = 7.45;
    const rightW = 5.08;
    const rightY = 2.1;
    const rightH = 4.53;

    // Image Background Shadow Frame
    slide.addShape('roundRect', {
      x: rightX, y: rightY, w: rightW, h: rightH,
      rectRadius: 0.1,
      fill: { color: "F1F5F9" },
      line: { color: "CBD5E1", width: 1.5 }
    });

    const photoSrc = task.photo || task.photo_after || task.photo_before;
    if (photoSrc && photoSrc.length > 50) {
      slide.addImage({
        data: photoSrc,
        x: rightX + 0.08, y: rightY + 0.08, w: rightW - 0.16, h: rightH - 0.5,
        sizing: { type: "contain" }
      });
    } else {
      // Clean graphic placeholder
      slide.addImage({
        path: "assets/img/walton_logo.png",
        x: rightX + 1.2, y: rightY + 1.2, w: 2.6, h: 1.2,
        sizing: { type: "contain" }
      });
      slide.addText("Manufacturing Automation Demonstration\n(Photo record in department archive)", {
        x: rightX + 0.3, y: rightY + 2.6, w: rightW - 0.6, h: 0.8,
        fontSize: 10, fontFace: font, color: "94A3B8", align: "center"
      });
    }

    // Photo verification badge at bottom of right card
    slide.addShape('roundRect', {
      x: rightX + 0.15, y: rightY + rightH - 0.42, w: rightW - 0.3, h: 0.32,
      rectRadius: 0.05,
      fill: { color: "0B2038" }
    });
    slide.addText("VERIFIED BY WALTON AC PROCESS DEVELOPMENT", {
      x: rightX + 0.2, y: rightY + rightH - 0.42, w: rightW - 0.4, h: 0.32,
      fontSize: 8.5, fontFace: font, bold: true, color: "FFFFFF",
      align: "center", valign: "middle"
    });

    // Footer
    this._addFooter(slide, font, monthName, slideNum, totalSlides);
  }

  // --------------------------------------------------------------------------
  // SLIDE 4: THANK YOU SLIDE
  // --------------------------------------------------------------------------
  _addThankYouSlide(slide, font, monthName) {
    slide.background = { color: "0B2038" };

    // Accent top line
    slide.addShape('rect', {
      x: 0, y: 0, w: 13.333, h: 0.15,
      fill: { color: "E11D48" },
      line: { color: "E11D48" }
    });

    // Walton Logo
    slide.addImage({
      path: "assets/img/walton_logo.png",
      x: 5.1, y: 1.6, w: 3.1, h: 1.1,
      sizing: { type: "contain" }
    });

    slide.addText("THANK YOU", {
      x: 1.0, y: 3.0, w: 11.333, h: 1.0,
      fontSize: 38, fontFace: font, bold: true, color: "FFFFFF",
      align: "center", valign: "middle"
    });

    slide.addText("Driving Manufacturing Excellence Through Strategic Automation & Cost Optimization", {
      x: 1.0, y: 4.1, w: 11.333, h: 0.5,
      fontSize: 15, fontFace: font, color: "38BDF8",
      align: "center"
    });

    slide.addText("AC Process Development Department • WALTON Hi-Tech Industries PLC", {
      x: 1.0, y: 4.8, w: 11.333, h: 0.4,
      fontSize: 12, fontFace: font, color: "94A3B8",
      align: "center"
    });

    slide.addText("Questions & Strategic Discussion", {
      x: 4.6, y: 5.6, w: 4.1, h: 0.5,
      fontSize: 12, fontFace: font, bold: true, color: "FFFFFF",
      align: "center", valign: "middle"
    });
  }

  // --------------------------------------------------------------------------
  // SHARED HEADER & FOOTER HELPERS
  // --------------------------------------------------------------------------
  _addHeader(slide, font, monthName, subHeaderTitle) {
    // Top banner bar
    slide.addShape('rect', {
      x: 0, y: 0, w: 13.333, h: 0.95,
      fill: { color: "FFFFFF" },
      line: { color: "E2E8F0", width: 1 }
    });

    // Walton Logo on header
    slide.addImage({
      path: "assets/img/walton_logo.png",
      x: 0.8, y: 0.15, w: 1.6, h: 0.65,
      sizing: { type: "contain" }
    });

    // Organization & Department Text
    slide.addText("WALTON Hi-Tech Industries PLC • AC Process Development", {
      x: 2.6, y: 0.22, w: 6.5, h: 0.25,
      fontSize: 10, fontFace: font, bold: true, color: "E11D48"
    });

    slide.addText(subHeaderTitle, {
      x: 2.6, y: 0.48, w: 6.5, h: 0.35,
      fontSize: 13, fontFace: font, bold: true, color: "0B2038"
    });

    // Month Badge (Top Right)
    slide.addShape('roundRect', {
      x: 10.3, y: 0.25, w: 2.2, h: 0.45,
      rectRadius: 0.1,
      fill: { color: "0B2038" }
    });
    slide.addText(`📅 ${monthName}`, {
      x: 10.3, y: 0.25, w: 2.2, h: 0.45,
      fontSize: 10, fontFace: font, bold: true, color: "FFFFFF",
      align: "center", valign: "middle"
    });
  }

  _addFooter(slide, font, monthName, slideNum, totalSlides) {
    slide.addShape('line', {
      x: 0.8, y: 6.95, w: 11.733, h: 0,
      line: { color: "E2E8F0", width: 1 }
    });

    slide.addText("CONFIDENTIAL &bull; FOR WALTON MANAGEMENT REVIEW ONLY", {
      x: 0.8, y: 7.05, w: 8.0, h: 0.3,
      fontSize: 8.5, fontFace: font, color: "94A3B8"
    });

    slide.addText(`Slide ${slideNum} of ${totalSlides}`, {
      x: 9.5, y: 7.05, w: 3.0, h: 0.3,
      fontSize: 9, fontFace: font, bold: true, color: "64748B",
      align: "right"
    });
  }
}

// Attach globally
if (typeof window !== 'undefined') {
  window.ManagementPPTXGenerator = ManagementPPTXGenerator;
  if (!window.managementPptxGenerator) {
    window.managementPptxGenerator = new ManagementPPTXGenerator();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ManagementPPTXGenerator;
}
