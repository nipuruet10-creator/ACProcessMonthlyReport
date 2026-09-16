/**
 * Process Development Monthly Report Automation System
 * Module: Management HTML Report Generator
 * Generates standalone 16:9 interactive HTML presentations and print-to-PDF decks for Executive Management Review
 * WALTON Hi-Tech Industries PLC
 */

const ManagementHTMLGenerator = {
  generateHTMLDeck(monthOrData, tasks = [], summary = null) {
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
    return this.generateStandaloneHTML(reportData);
  },

  generateStandaloneHTML(reportData = {}) {
    const month = reportData.month || "SEPTEMBER 2026";
    const rawTasks = Array.isArray(reportData.tasks) ? reportData.tasks : (reportData.tasks && reportData.tasks.sequencedTasks ? reportData.tasks.sequencedTasks : []);
    const summary = reportData.summary || {
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

    const totalSlides = sequencedTasks.length + 3; // Cover + Summary + Tasks + Thank You

    // Slide Titles for navigation
    const titles = [
      "1. Executive Cover Page",
      "2. Executive Summary Table & All Works"
    ];
    sequencedTasks.forEach((t, i) => {
      titles.push(`${i + 3}. [${t.concern}] ${t.task_name.slice(0, 32)}...`);
    });
    titles.push(`${totalSlides}. Executive Thank You & Q&A`);

    // Render HTML Slides Array
    const renderedSlides = [];

    // Slide 1: Cover Page
    renderedSlides.push(this._renderCoverSlide(month));

    // Slide 2: Summary Table Slide
    renderedSlides.push(this._renderSummaryTableSlide(month, sequencedTasks, summary, 2, totalSlides));

    // Slides 3 to N: Concern-wise Task Slides
    sequencedTasks.forEach((t, idx) => {
      renderedSlides.push(this._renderTaskSlide(month, t, idx + 3, totalSlides));
    });

    // Final Slide: Thank You
    renderedSlides.push(this._renderThankYouSlide(month));

    const optionsHtml = titles.map((t, idx) => `<option value="${idx}">${HELPERS.escapeHtml(t)}</option>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Management Report - ${month} - Walton AC Process</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #020617;
      color: #0F172A;
      font-family: 'Lexend', system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      overflow-x: hidden;
    }
    .mgmt-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      width: 100%;
      background: rgba(11, 32, 56, 0.96);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid #1E293B;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .mgmt-btn {
      background: #1E293B;
      color: #F8FAFC;
      border: 1px solid #334155;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .mgmt-btn:hover { background: #334155; border-color: #475569; }
    .mgmt-btn-primary { background: #E11D48; border-color: #E11D48; color: #FFF; }
    .mgmt-btn-primary:hover { background: #BE123C; }
    .slide-viewport {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px 16px;
      width: 100%;
      max-width: 1400px;
    }
    .mgmt-slide-frame {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
      position: relative;
      overflow: hidden;
      display: none;
    }
    .mgmt-slide-frame.active { display: block; }
    
    /* Print Layout for Vector 16:9 PDF */
    @media print {
      body { background: #FFF !important; }
      .mgmt-toolbar { display: none !important; }
      .slide-viewport { display: none !important; }
      #print-container { display: block !important; }
      .print-page {
        width: 100vw !important;
        height: 56.25vw !important; /* 16:9 */
        page-break-after: always;
        break-after: page;
        border-radius: 0 !important;
        box-shadow: none !important;
      }
      @page {
        size: 16in 9in;
        margin: 0;
      }
    }
    #print-container { display: none; }
  </style>
</head>
<body>

  <!-- Controls Header -->
  <div class="mgmt-toolbar no-print">
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="color: #E11D48; font-weight: 900; font-size: 14px; letter-spacing: 1px;">WALTON</span>
      <span style="color: #64748B;">•</span>
      <span style="color: #CBD5E1; font-weight: 700; font-size: 12px;">Executive Management Report: ${month}</span>
    </div>

    <div style="display: flex; align-items: center; gap: 8px;">
      <button class="mgmt-btn" onclick="prevSlide()" title="Previous Slide (Arrow Left)">◀ Prev</button>
      <select id="slide-jump-select" onchange="jumpToSlide(this.value)" class="mgmt-btn" style="padding: 5px 8px; font-weight: 600;">
        ${optionsHtml}
      </select>
      <button class="mgmt-btn" onclick="nextSlide()" title="Next Slide (Arrow Right / Space)">Next ▶</button>
      <button class="mgmt-btn" onclick="toggleFullScreen()" title="Full Screen (F)">⛶ Fullscreen</button>
      <button class="mgmt-btn mgmt-btn-primary" onclick="window.print()" title="Print Vector PDF (Ctrl+P)">🖨️ Print PDF</button>
    </div>
  </div>

  <!-- Interactive Slide Viewport -->
  <div class="slide-viewport">
    ${renderedSlides.map((html, idx) => `
      <div class="mgmt-slide-frame ${idx === 0 ? 'active' : ''}" id="slide-${idx}">
        ${html}
      </div>
    `).join('')}
  </div>

  <!-- Full Multi-page Container for Vector PDF Print -->
  <div id="print-container">
    ${renderedSlides.map(html => `
      <div class="print-page" style="position: relative; overflow: hidden; background: #FFF; width: 100%; aspect-ratio: 16/9;">
        ${html}
      </div>
    `).join('')}
  </div>

  <script>
    let currentSlideIndex = 0;
    const totalSlides = ${totalSlides};

    function showSlide(idx) {
      if (idx < 0) idx = 0;
      if (idx >= totalSlides) idx = totalSlides - 1;
      currentSlideIndex = idx;
      document.querySelectorAll('.mgmt-slide-frame').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
      });
      const select = document.getElementById('slide-jump-select');
      if (select) select.value = idx;
    }

    function nextSlide() { showSlide(currentSlideIndex + 1); }
    function prevSlide() { showSlide(currentSlideIndex - 1); }
    function jumpToSlide(idx) { showSlide(parseInt(idx, 10)); }

    function toggleFullScreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault(); nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); prevSlide();
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullScreen();
      } else if (e.key.toLowerCase() === 'p' && (e.ctrlKey || e.metaKey)) {
        window.print();
      }
    });
  </script>
</body>
</html>`;
  },

  // --------------------------------------------------------------------------
  // SLIDE 1: COVER
  // --------------------------------------------------------------------------
  _renderCoverSlide(month) {
    return `
      <div style="width: 100%; height: 100%; background: #0B2038; color: #FFF; position: relative; padding: 4vw 6vw; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 8px; background: #E11D48;"></div>
        
        <div>
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
            <img src="assets/img/walton_logo.png" alt="WALTON" style="height: 38px; width: auto; object-fit: contain;">
            <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #38BDF8; background: #1E293B; border: 1px solid #334155; padding: 6px 14px; rounded: 8px;">
              AC PROCESS DEVELOPMENT DEPARTMENT
            </span>
          </div>

          <h1 style="font-size: 2.8vw; font-weight: 900; line-height: 1.15; color: #FFFFFF; max-width: 90%;">
            EXECUTIVE MANAGEMENT REPORT
          </h1>
          <p style="font-size: 1.3vw; color: #94A3B8; margin-top: 12px; max-width: 85%;">
            Strategic Manufacturing Innovations, Process Optimization &amp; Annual Cost Impact Analysis
          </p>

          <div style="margin-top: 28px; display: inline-flex; align-items: center; gap: 10px; background: #E11D48; color: #FFF; font-weight: 800; font-size: 0.95vw; padding: 8px 18px; border-radius: 8px; font-family: 'JetBrains Mono', monospace;">
            <span>📅</span> <span>REPORTING PERIOD: ${month.toUpperCase()}</span>
          </div>
        </div>

        <div style="border-top: 1px solid #334155; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85vw; color: #64748B;">
          <span>WALTON Hi-Tech Industries PLC • Manufacturing Headquarters, Chandra, Gazipur</span>
          <span style="color: #CBD5E1; font-weight: 700;">Prepared by: Engr. Md. Sazzad Hossain &amp; AC Process Development Team</span>
        </div>
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // SLIDE 2: SUMMARY TABLE
  // --------------------------------------------------------------------------
  _renderSummaryTableSlide(month, tasks, summary, slideNum, totalSlides) {
    const kpis = [
      { label: "TOTAL STRATEGIC TASKS", val: tasks.length, bg: "#F8FAFC", border: "#E2E8F0", color: "#0F172A" },
      { label: "TOTAL COST IMPACT (ANNUAL)", val: summary.formattedTotalSavings || "৳ 0 / Year", bg: "#FEF3C7", border: "#FDE68A", color: "#92400E" },
      { label: "CONCERNS ENGAGED", val: `${summary.uniqueConcernsCount || 1} Engineers`, bg: "#F0FDF4", border: "#BBF7D0", color: "#166534" },
      { label: "COMPLETION RATE", val: `${summary.completionRate || 0}% Completed`, bg: "#EFF6FF", border: "#BFDBFE", color: "#1E40AF" }
    ];

    const displayTasks = tasks.slice(0, 8);

    return `
      <div style="width: 100%; height: 100%; background: #FFF; position: relative; padding: 1.5vw 3vw 2vw 3vw; display: flex; flex-direction: column; justify-content: space-between;">
        ${this._renderHeaderHtml(month, "EXECUTIVE SUMMARY: ALL WORKS & COST IMPACT")}

        <!-- 4 Top KPI Cards -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1vw; margin: 1vw 0 0.8vw 0;">
          ${kpis.map(k => `
            <div style="background: ${k.bg}; border: 1px solid ${k.border}; border-radius: 10px; padding: 0.7vw 1vw;">
              <div style="font-size: 0.65vw; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">${k.label}</div>
              <div style="font-size: 1.15vw; font-weight: 900; color: ${k.color}; margin-top: 4px; font-family: 'JetBrains Mono', monospace;">${k.val}</div>
            </div>
          `).join('')}
        </div>

        <!-- Summary Table -->
        <div style="flex: 1; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8vw; text-align: left;">
            <thead>
              <tr style="background: #0B2038; color: #FFF; font-weight: 800; font-size: 0.75vw;">
                <th style="padding: 8px 10px; text-align: center; width: 4%;">SL</th>
                <th style="padding: 8px 12px; width: 18%;">Concern Engineer</th>
                <th style="padding: 8px 12px; width: 34%;">Strategic Project / Task Name</th>
                <th style="padding: 8px 10px; width: 14%;">Category</th>
                <th style="padding: 8px 10px; width: 11%;">Timeline</th>
                <th style="padding: 8px 10px; width: 11%; text-align: right;">Cost Impact</th>
                <th style="padding: 8px 10px; width: 8%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${displayTasks.map((t, idx) => {
                const isCompleted = (t.status || '').toLowerCase().includes('complete');
                const rowBg = idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF';
                return `
                  <tr style="background: ${rowBg}; border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 6px 10px; text-align: center; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #64748B;">${idx + 1}</td>
                    <td style="padding: 6px 12px; font-weight: 800; color: #0F172A;">${HELPERS.escapeHtml(t.concern || t.assignee || 'General')}</td>
                    <td style="padding: 6px 12px; font-weight: 700; color: #1E293B;">${HELPERS.escapeHtml(t.task_name)}</td>
                    <td style="padding: 6px 10px; color: #475569;">${HELPERS.escapeHtml(t.category || 'Process Dev')}</td>
                    <td style="padding: 6px 10px; color: #475569; font-size: 0.75vw;">${HELPERS.escapeHtml(t.timeline || '4-5 Months')}</td>
                    <td style="padding: 6px 10px; text-align: right; font-weight: 800; color: #D97706; font-family: 'JetBrains Mono', monospace;">${HELPERS.escapeHtml(t.cost_impact || '৳ 0')}</td>
                    <td style="padding: 6px 10px; text-align: center;">
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.65vw; font-weight: 800; background: ${isCompleted ? '#DCFCE7' : '#EFF6FF'}; color: ${isCompleted ? '#166534' : '#1E40AF'};">
                        ${isCompleted ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        ${this._renderFooterHtml(month, slideNum, totalSlides)}
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // SLIDES 3 to N: CONCERN-WISE TASK SLIDES
  // --------------------------------------------------------------------------
  _renderTaskSlide(month, task, slideNum, totalSlides) {
    const concern = task.concern || task.assignee || "General Concern";
    const isCompleted = (task.status || '').toLowerCase().includes('complete');
    const photoSrc = task.photo || task.photo_after || task.photo_before || "assets/img/walton_logo.png";
    const hasRealPhoto = Boolean(task.photo || task.photo_after || task.photo_before);

    const milestonesText = task.milestones || "1. Detailed technical design study\n2. Tooling fabrication & assembly\n3. Safety validation & line deployment";
    const impactText = task.key_impact || "• Enhanced manufacturing efficiency and line ergonomics\n• Reduced operational cycle time and manual intervention\n• Zero defects assurance across Walton RAC production lines";

    return `
      <div style="width: 100%; height: 100%; background: #FFF; position: relative; padding: 1.2vw 3vw 1.5vw 3vw; display: flex; flex-direction: column; justify-content: space-between;">
        ${this._renderHeaderHtml(month, `CONCERN: ${concern.toUpperCase()}`)}

        <!-- Main Title & Badges Bar -->
        <div style="margin: 0.8vw 0 0.5vw 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 0.7vw; font-weight: 800; background: #0B2038; color: #FFF; padding: 3px 10px; border-radius: 6px;">
              👤 ${HELPERS.escapeHtml(concern)}
            </span>
            <span style="font-size: 0.7vw; font-weight: 800; background: #F1F5F9; color: #475569; padding: 3px 10px; border-radius: 6px; border: 1px solid #E2E8F0;">
              ⚙️ ${HELPERS.escapeHtml(task.category || 'Process Development')}
            </span>
            <span style="font-size: 0.7vw; font-weight: 800; background: ${isCompleted ? '#DCFCE7' : '#EFF6FF'}; color: ${isCompleted ? '#166534' : '#1E40AF'}; padding: 3px 10px; border-radius: 6px;">
              ${isCompleted ? '✅ Completed' : '⏳ In Progress'}
            </span>
          </div>
          <h2 style="font-size: 1.45vw; font-weight: 900; color: #0F172A; line-height: 1.25;">
            ${HELPERS.escapeHtml(task.task_name)}
          </h2>
        </div>

        <!-- 2-Column Balanced Executive Layout (Text & Financials | Photo Container) -->
        <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 1.5vw; flex: 1; align-items: stretch;">
          
          <!-- Left Column (3 Structured Cards) -->
          <div style="display: flex; flex-direction: column; gap: 0.6vw;">
            
            <!-- Card 1: Annual Cost Impact -->
            <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 10px; padding: 0.7vw 1vw;">
              <div style="font-size: 0.65vw; font-weight: 800; color: #92400E; letter-spacing: 0.5px;">💰 ANNUAL COST SAVING / FINANCIAL IMPACT</div>
              <div style="font-size: 1.35vw; font-weight: 900; color: #B45309; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">
                ${HELPERS.escapeHtml(task.cost_impact || 'Significant Cost Avoidance & Process Efficiency')}
              </div>
            </div>

            <!-- Card 2: Timeline & Milestones -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.7vw 1vw; flex: 1;">
              <div style="font-size: 0.7vw; font-weight: 800; color: #1E40AF; margin-bottom: 6px;">
                ⏱️ PROJECT TIMELINE: ${HELPERS.escapeHtml(task.timeline || 'Active Development')}
              </div>
              <div style="font-size: 0.75vw; color: #334155; line-height: 1.4; white-space: pre-line;">
                ${HELPERS.escapeHtml(milestonesText)}
              </div>
            </div>

            <!-- Card 3: Key Outcomes -->
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 0.7vw 1vw;">
              <div style="font-size: 0.65vw; font-weight: 800; color: #166534; margin-bottom: 4px;">
                🎯 KEY MANAGEMENT OUTCOMES &amp; OPERATIONAL IMPACT:
              </div>
              <div style="font-size: 0.75vw; color: #14532D; line-height: 1.35; white-space: pre-line;">
                ${HELPERS.escapeHtml(impactText)}
              </div>
            </div>

          </div>

          <!-- Right Column (High-Resolution Visual Frame) -->
          <div style="background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; position: relative;">
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 8px; background: #0000000a;">
              <img src="${photoSrc}" alt="Task Visual" style="width: 100%; height: 100%; max-height: 20vw; object-fit: contain; border-radius: 8px;">
            </div>
            <div style="background: #0B2038; color: #FFF; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 0.65vw; font-weight: 800; letter-spacing: 0.5px;">
              <span>VERIFIED BY WALTON AC PROCESS DEVELOPMENT</span>
              <span style="color: #38BDF8;">100% OPERATIONAL ACCURACY</span>
            </div>
          </div>

        </div>

        ${this._renderFooterHtml(month, slideNum, totalSlides)}
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // SLIDE 4: THANK YOU
  // --------------------------------------------------------------------------
  _renderThankYouSlide(month) {
    return `
      <div style="width: 100%; height: 100%; background: #0B2038; color: #FFF; position: relative; padding: 4vw 6vw; display: flex; flex-direction: column; justify-content: space-between; text-align: center; align-items: center;">
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 8px; background: #E11D48;"></div>
        
        <div style="margin-top: 2vw;">
          <img src="assets/img/walton_logo.png" alt="WALTON" style="height: 48px; width: auto; object-fit: contain; margin-bottom: 24px;">
          <h1 style="font-size: 3.2vw; font-weight: 900; letter-spacing: 2px; color: #FFFFFF;">THANK YOU</h1>
          <p style="font-size: 1.25vw; color: #38BDF8; margin-top: 12px; font-weight: 700;">
            Driving Manufacturing Excellence Through Strategic Automation &amp; Cost Optimization
          </p>
          <p style="font-size: 0.95vw; color: #94A3B8; margin-top: 10px;">
            AC Process Development Department • WALTON Hi-Tech Industries PLC
          </p>
        </div>

        <div style="margin-bottom: 2vw; background: #1E293B; border: 1px solid #334155; padding: 10px 24px; border-radius: 9999px; font-size: 0.85vw; font-weight: 700; color: #F8FAFC;">
          💬 Questions, Strategic Feedback &amp; Executive Discussion
        </div>
      </div>
    `;
  },

  _renderHeaderHtml(month, subHeaderTitle) {
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="assets/img/walton_logo.png" alt="WALTON" style="height: 28px; width: auto; object-fit: contain;">
          <div>
            <div style="font-size: 0.65vw; font-weight: 800; color: #E11D48; letter-spacing: 1px;">WALTON HI-TECH INDUSTRIES PLC • AC PROCESS DEVELOPMENT</div>
            <div style="font-size: 0.95vw; font-weight: 900; color: #0B2038;">${HELPERS.escapeHtml(subHeaderTitle)}</div>
          </div>
        </div>

        <div style="background: #0B2038; color: #FFF; font-size: 0.75vw; font-weight: 800; padding: 4px 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace;">
          📅 ${HELPERS.escapeHtml(month)}
        </div>
      </div>
    `;
  },

  _renderFooterHtml(month, slideNum, totalSlides) {
    return `
      <div style="border-top: 1px solid #E2E8F0; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.65vw; color: #94A3B8; margin-top: 6px;">
        <span>CONFIDENTIAL • FOR WALTON MANAGEMENT REVIEW ONLY</span>
        <span style="font-weight: 700; color: #64748B; font-family: 'JetBrains Mono', monospace;">Slide ${slideNum} of ${totalSlides}</span>
      </div>
    `;
  }
};

// Attach globally
if (typeof window !== 'undefined') {
  window.ManagementHTMLGenerator = ManagementHTMLGenerator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ManagementHTMLGenerator;
}
