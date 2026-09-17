/**
 * Process Development Monthly Report Automation System
 * Module: Standalone HTML Report Generator
 * Generates portable, self-contained single-file HTML presentation
 * WALTON Hi-Tech Industries PLC
 */

const HTMLReportGenerator = {
  /**
   * Generates a complete self-contained HTML presentation
   */
  /**
   * Generates a complete self-contained HTML presentation
   * Incorporates full sequential deck:
   * Slide 1: Cover Page (Executive Red)
   * Slide 2: Table of Contents & Agenda
   * Slide 3: Executive Management Dashboard (Image 1 pattern)
   * Slides 4..N: Task Slides (1 Row = 1 Slide, Image 3 pattern)
   * Slide N+1: Top 5 Completed Works + Ongoing Projects (Image 2 pattern)
   */
  generateStandaloneHTML(reportData = {}, template = "walton_executive_crimson") {
    const activeTemplate = reportData.template || template || "walton_executive_crimson";
    const month = reportData.month || "SEPTEMBER 2026";
    const rawSlides = reportData.slides || [];

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

    // Task Sequencing Mode: 'category' (By Category with Engineer serial) vs 'engineer' (By Engineer)
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
      const eng = (task.concern_engineer || task.concern || '').toLowerCase();
      for (let i = 0; i < engineerSeq.length; i++) {
        if (eng.includes(engineerSeq[i].toLowerCase())) return i;
      }
      return 999;
    };

    let sequencedStandardTasks = [];

    if (sequenceMode === 'category') {
      const processTasks = [];
      const toolsTasks = [];
      const partsTasks = [];
      const costTasks = [];
      const manpowerTasks = [];
      const bomTasks = [];
      const otherTasks = [];

      standardTaskSlides.forEach(task => {
        const cat = (task.category || '').toLowerCase();
        const title = (task.slide_title || task.task_name || '').toLowerCase();

        if (cat.includes('process') || title.includes('process')) {
          processTasks.push(task);
        } else if (cat.includes('tool') || cat.includes('jig') || cat.includes('die') || cat.includes('fixture') || title.includes('tool') || title.includes('die') || title.includes('fixture')) {
          toolsTasks.push(task);
        } else if (cat.includes('part') || cat.includes('material') || cat.includes('component') || title.includes('part')) {
          partsTasks.push(task);
        } else if (cat.includes('cost') || cat.includes('saving') || title.includes('cost') || title.includes('saving')) {
          costTasks.push(task);
        } else if (cat.includes('manpower') || title.includes('manpower')) {
          manpowerTasks.push(task);
        } else if (cat.includes('bom') || title.includes('bom')) {
          bomTasks.push(task);
        } else {
          otherTasks.push(task);
        }
      });

      [processTasks, toolsTasks, partsTasks, costTasks, manpowerTasks, bomTasks, otherTasks].forEach(bucket => {
        bucket.sort((a, b) => getEngRank(a) - getEngRank(b));
      });

      sequencedStandardTasks = [
        ...processTasks,
        ...toolsTasks,
        ...partsTasks,
        ...costTasks,
        ...manpowerTasks,
        ...bomTasks,
        ...otherTasks
      ];
    } else {
      const matchedTaskIds = new Set();
      engineerSeq.forEach(engName => {
        const cleanEng = (engName || '').trim().toLowerCase();
        if (!cleanEng) return;
        standardTaskSlides.forEach(task => {
          const tEng = (task.concern_engineer || task.concern || '').toLowerCase();
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

    completedProjectSlides.sort((a, b) => getEngRank(a) - getEngRank(b));
    ongoingProjectSlides.sort((a, b) => getEngRank(a) - getEngRank(b));

    const orderedSlides = [...sequencedStandardTasks, ...completedProjectSlides, ...ongoingProjectSlides];
    const reportDataOrdered = { ...reportData, slides: orderedSlides };

    // Render the complete sequential deck via SlideLayoutEngine
    const slides = SlideLayoutEngine.renderDeck(reportDataOrdered, activeTemplate);
    const totalSlides = slides.length;

    // Generate readable titles for navigation dropdown (Cover + TOC + Dashboard + Tasks + Top 5 Works = 4 + N)
    const titles = [
      "1. Executive Cover Page",
      "2. Table of Contents & Agenda",
      "3. Operations & Financial Dashboard"
    ];
    orderedSlides.forEach((t, i) => {
      const cleanTitle = (t.slide_title || t.task_name || `Task ${i + 1}`).replace(/<[^>]*>?/gm, '');
      const eng = t.concern_engineer || t.concern || '';
      const cat = (t.category || '').toLowerCase();
      const status = (t.status || t.project_status || '').toLowerCase();
      const isProj = Boolean(t.is_project || cat.includes('project') || (t.task_name || '').toLowerCase().includes('project'));
      let prefix = eng ? `[${eng}]` : '[Task]';
      if (isProj) {
        if (status.includes('complete') || cat.includes('completed project')) {
          prefix = '[Completed Project]';
        } else {
          prefix = '[Ongoing Project]';
        }
      }
      titles.push(`${i + 4}. ${prefix} ${cleanTitle}`);
    });
    titles.push(`${totalSlides}. Top 5 Completed Works & Ongoing Projects`);

    const slidesJson = JSON.stringify(slides);
    const titlesJson = JSON.stringify(titles);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Process Monthly Report - ${month} | WALTON Hi-Tech Industries PLC</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: landscape;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: 'Lexend', sans-serif;
      background: #0A0E17;
      color: #0F172A;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
    }
    .screen-stage {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 64px);
      padding: 24px;
    }
    .slide-frame {
      width: 100%;
      max-width: 1400px;
      aspect-ratio: 16/9;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
      border-radius: 14px;
      overflow: hidden;
      background: #FFFFFF;
    }
    #print-container {
      display: none;
    }
    @media print {
      body {
        background: #FFFFFF !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .screen-stage {
        display: none !important;
      }
      #print-container {
        display: block !important;
      }
      .print-page {
        page-break-after: always !important;
        break-after: page !important;
        width: 100vw !important;
        height: 100vh !important;
        max-height: 100vh !important;
        overflow: hidden !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
        margin: 0 !important;
        background: #FFFFFF !important;
      }
      .print-page > div {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        aspect-ratio: 16/9 !important;
        border-radius: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body class="selection:bg-red-600 selection:text-white">
  
  <!-- Interactive Header Bar (Screen only) -->
  <header class="no-print sticky top-0 left-0 right-0 z-50 bg-[#0B0F19]/95 backdrop-blur-xl border-b border-slate-800 px-6 py-3 flex items-center justify-between text-white shadow-2xl">
    <div class="flex items-center gap-3">
      <img src="assets/img/walton_logo.png" alt="WALTON" class="h-9 w-auto object-contain flex-shrink-0 drop-shadow">
      <div>
        <div class="flex items-center gap-2">
          <span class="font-black text-red-500 text-xs tracking-widest font-mono">WALTON</span>
          <span class="text-slate-600">&bull;</span>
          <span class="text-xs font-semibold text-slate-300">AC Process Monthly Report (${month})</span>
        </div>
        <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
          <span class="px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 font-bold border border-red-500/20 font-mono">EXECUTIVE MASTER</span>
          <span>&bull;</span>
          <span class="text-slate-300 font-medium">${activeTemplate === 'industrial_innovation_blue' ? 'Industrial Innovation Blue Edition' : 'Walton Executive Crimson Edition'}</span>
        </div>
      </div>
    </div>
    
    <!-- Slide Selector & Controls -->
    <div class="flex items-center gap-3">
      <!-- Jump to slide selector -->
      <select id="slide-jump-select" onchange="renderSlide(parseInt(this.value))" class="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500 max-w-xs truncate">
      </select>

      <button onclick="prevSlide()" title="Previous Slide (Left Arrow)" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition">
        &larr; Prev
      </button>
      <span id="slide-indicator" class="text-xs font-mono text-red-400 font-bold px-2 whitespace-nowrap">
        1 / ${totalSlides}
      </span>
      <button onclick="nextSlide()" title="Next Slide (Right Arrow)" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition">
        Next &rarr;
      </button>

      <button onclick="toggleFullScreen()" title="Full Screen Presentation (F)" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition">
        ⛶ Fullscreen
      </button>

      <button onclick="window.print()" title="Print or Save All Slides as PDF" class="ml-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-red-900/30 flex items-center gap-1.5 transition">
        <span>🖨</span> <span>Print / PDF</span>
      </button>
    </div>
  </header>

  <!-- Interactive Slide Stage (Screen View) -->
  <main class="screen-stage">
    <div id="viewport" class="slide-frame"></div>
  </main>

  <!-- Print Container (Multi-Page PDF & Print Only) -->
  <div id="print-container">
    ${slides.map((s, idx) => `
      <section class="print-page" id="print-slide-${idx + 1}">
        ${s}
      </section>
    `).join('')}
  </div>

  <script>
    const slides = ${slidesJson};
    const titles = ${titlesJson};
    let currentIndex = 0;

    // Populate slide jump selector
    const jumpSelect = document.getElementById('slide-jump-select');
    if (jumpSelect) {
      jumpSelect.innerHTML = titles.map((t, idx) => '<option value="' + idx + '">' + t + '</option>').join('');
    }

    function renderSlide(idx) {
      if (idx < 0) idx = 0;
      if (idx >= slides.length) idx = slides.length - 1;
      currentIndex = idx;
      
      const viewport = document.getElementById('viewport');
      if (viewport) {
        viewport.innerHTML = slides[currentIndex];
      }
      
      const indicator = document.getElementById('slide-indicator');
      if (indicator) {
        indicator.textContent = (currentIndex + 1) + ' / ' + slides.length;
      }
      
      if (jumpSelect) {
        jumpSelect.value = currentIndex;
      }
    }

    function prevSlide() { renderSlide(currentIndex - 1); }
    function nextSlide() { renderSlide(currentIndex + 1); }

    function toggleFullScreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Space' || e.key === 'PageDown') {
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        prevSlide();
      } else if (e.key === 'Home') {
        renderSlide(0);
      } else if (e.key === 'End') {
        renderSlide(slides.length - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullScreen();
      }
    });

    // Initial render
    renderSlide(0);
  </script>
</body>
</html>`;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HTMLReportGenerator;
} else if (typeof window !== 'undefined') {
  window.HTMLReportGenerator = HTMLReportGenerator;
}
