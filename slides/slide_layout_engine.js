/**
 * Process Development Monthly Report Automation System
 * Module: Slide Layout Engine
 * Generates 16:9 Lexend Master Presentation Slides matching the Walton Reference Slide
 * Enforces 1 Row = 1 Slide Invariant
 * WALTON Hi-Tech Industries PLC
 */

const SlideLayoutEngine = {
  theme: typeof SLIDE_THEME !== 'undefined' ? SLIDE_THEME : {
    COLORS: {
      BG_SLIDE: "#FFFFFF",
      NAVY_PRIMARY: "#0B2038",
      NAVY_DARK: "#07172B",
      BLUE_CORPORATE: "#0284C7",
      BLUE_DARK: "#0052CC",
      ORANGE_ACCENT: "#FF6B00",
      ORANGE_VIBRANT: "#F97316",
      GREEN_SUCCESS: "#10B981",
      CARD_BG_BLUE: "#F0F9FF",
      CARD_BORDER_BLUE: "#BAE6FD",
      CARD_BG_GREY: "#F8FAFC",
      BORDER_LIGHT: "#E2E8F0",
      TEXT_MUTED: "#64748B",
      TEXT_DARK: "#0F172A"
    }
  },

  /**
   * Highlights the primary action verb in an executive title with orange accent
   */
  formatTitleWithAccent(title = "") {
    if (!title) return "Process Development Engineering Work";
    const words = title.split(" ");
    if (words.length <= 2) return `<span>${title}</span>`;

    // Action verbs to prioritize highlighting
    const actionWords = ["Optimized", "Optimization", "Developed", "Development", "Automated", "Automation", "Upgraded", "Modified", "Trial", "Integrated", "Designed", "Fabricated"];
    let highlighted = false;
    const formatted = words.map(w => {
      const clean = w.replace(/[.,]/g, "");
      if (!highlighted && actionWords.some(a => a.toLowerCase() === clean.toLowerCase())) {
        highlighted = true;
        return `<span style="color: #FF6B00; font-weight: 800;">${w}</span>`;
      }
      return w;
    });

    // If no specific verb matched, highlight the second or third word
    if (!highlighted && words.length > 3) {
      formatted[2] = `<span style="color: #FF6B00; font-weight: 800;">${formatted[2]}</span>`;
    }

    return formatted.join(" ");
  },

  /**
   * Handles interactive drag-and-drop image replacement on pre-defined slide frames
   */
  async handleImageDrop(event, taskId, photoType = 'before_photo') {
    if (!event) return;
    event.preventDefault();
    event.stopPropagation();
    const frame = event.currentTarget;
    if (frame) frame.classList.remove('drag-over');

    const dt = event.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) return;
    const file = dt.files[0];
    if (!file.type || !file.type.startsWith('image/')) {
      alert('Please drop an image file (PNG, JPG, WebP).');
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.photoManager && window.photoManager.savePhotoFile) {
        await window.photoManager.savePhotoFile(taskId, photoType, file);
      } else if (typeof window !== 'undefined' && window.appState && window.appState.photoManager) {
        await window.appState.photoManager.savePhotoFile(taskId, photoType, file);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (frame) {
          const img = frame.querySelector('img');
          if (img) {
            img.src = e.target.result;
            img.style.display = 'block';
          }
        }
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
          window.showToast(`📸 Photo auto-adjusted & replaced for ${taskId}!`, 'success');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Image drop failed:', err);
    }
  },

  /**
   * Toggles image fit mode between 'cover' (fill entire frame) and 'contain' (fit aspect ratio)
   */
  togglePhotoFit(btn) {
    if (!btn) return;
    const frame = btn.closest('.slide-photo-frame') || btn.closest('.col-span-6') || btn.parentElement.parentElement;
    if (!frame) return;
    const img = frame.querySelector('img');
    if (!img) return;
    const label = btn.querySelector('.mode-label');
    if (img.classList.contains('object-contain')) {
      img.classList.remove('object-contain');
      img.classList.add('object-cover');
      if (label) label.textContent = 'Fit';
      else btn.textContent = '📐 Fit';
    } else {
      img.classList.remove('object-cover');
      img.classList.add('object-contain');
      if (label) label.textContent = 'Fill';
      else btn.textContent = '📐 Fill';
    }
  },

  /**
   * Handles direct file picker upload on slide photo frames
   */
  async handleFrameFileInput(input, taskId, photoType = 'before_photo') {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file.type || !file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }
    const frame = input.closest('.slide-photo-frame') || input.closest('.col-span-6') || input.parentElement;
    try {
      if (typeof window !== 'undefined' && window.photoManager && window.photoManager.savePhotoFile) {
        await window.photoManager.savePhotoFile(taskId, photoType, file);
      } else if (typeof window !== 'undefined' && window.appState && window.appState.photoManager) {
        await window.appState.photoManager.savePhotoFile(taskId, photoType, file);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (frame) {
          const img = frame.querySelector('img');
          if (img) {
            img.src = e.target.result;
            img.style.display = 'block';
          }
        }
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
          window.showToast(`📸 Photo uploaded & updated for ${taskId}!`, 'success');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File upload failed:', err);
    }
  },

  /**
   * Renders the Walton Process Development Executive Red Master Slide
   * Matching the authoritative executive reference design (media_1789014742407.jpg)
   * 16:9 Widescreen, Lexend typography, Walton Red palette, Split Title,
   * Overview, 4 Impact Bullets, 3 Metric Trend Pills, Photo Frame with Quote Overlay, 3 Pillars
   */
  renderExecutiveRedSlide(slideData, slideIndex = 1, totalSlides = 1) {
    const rawTitle = slideData.slide_title || slideData.task_name || "Process Development Project";
    
    // Split Title (Line 1 = Charcoal, Line 2 = Walton Red)
    let titleLine1 = slideData.split_title_1;
    let titleLine2 = slideData.split_title_2;
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

    const rawEng = slideData.engineer || slideData.assignee || "Sazzad (50463)";
    const engineer = (typeof HELPERS !== 'undefined' && HELPERS.formatPersonnelName) 
      ? HELPERS.formatPersonnelName(rawEng) 
      : rawEng;
    const category = slideData.category || "Process Development";
    const status = slideData.status || "Completed";
    const description = slideData.description || slideData.ai_description || 
      "Developed and implemented an automatic foil cutting system for compressor jacket production. The system was designed, fabricated and handed over to production for regular use.";
    
    // 4 Key Impact Bullet points
    let impacts = Array.isArray(slideData.impact) && slideData.impact.length > 0
      ? slideData.impact
      : (typeof slideData.impact === 'string' && slideData.impact.trim()
          ? slideData.impact.split(';')
          : [
              "Improved cutting accuracy and consistency",
              "Increased production efficiency",
              "Reduced manual handling",
              "Better quality control and less material waste"
            ]);
    while (impacts.length < 4) {
      impacts.push("Continuous operational reliability improvement");
    }

    // 3 Metric Trend Pills
    const metrics = Array.isArray(slideData.metrics) && slideData.metrics.length >= 3
      ? slideData.metrics
      : [
          { name: "Production Efficiency", change: "Improved", trend: "up", color: "green" },
          { name: "Quality Consistency", change: "Enhanced", trend: "up", color: "green" },
          { name: "Material Waste", change: "Reduced", trend: "down", color: "red" }
        ];

    // Quote for photo banner
    const quote = slideData.quote || "Automation for a Smarter Tomorrow";
    const quoteParts = quote.split(" for ");
    const quoteL1 = quoteParts.length > 1 ? quoteParts[0] : quote;
    const quoteL2 = quoteParts.length > 1 ? `for ${quoteParts[1]}` : "";

    // Dual Photo detection (Before & After)
    const photoBefore = slideData.photo_before || slideData.photo_1 || null;
    const photoAfter = slideData.photo_after || slideData.photo_2 || null;
    const photoSingle = slideData.photo || photoAfter || photoBefore || "assets/images/walton_red_reference_sample.jpg";
    const hasDualPhoto = Boolean(photoBefore && photoAfter && photoBefore !== photoAfter);

    // Month
    const month = (slideData.month || "SEPTEMBER 2026").toUpperCase();

    return `
    <div class="walton-task-slide walton-red-executive bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200" 
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 20px 28px 14px 28px; display: flex; flex-direction: column; justify-content: space-between; background: #FFFFFF;">
      
      <!-- TOP BACKGROUND GEOMETRY (Subtle header accent lines) -->
      <svg class="absolute top-0 left-1/3 w-1/2 h-16 opacity-30 pointer-events-none" viewBox="0 0 500 60" fill="none">
        <path d="M0,0 L200,60 L500,10" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="4 4" />
        <path d="M50,0 L260,50 L480,0" stroke="#E2E8F0" stroke-width="1" />
      </svg>

      <!-- 1. TOP HEADER BAR -->
      <div class="flex items-center justify-between pb-2 border-b border-slate-100 relative z-10 flex-shrink-0" style="min-height: 48px;">
        <!-- Top Left: Red Diamond Emblem + Department Branding -->
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 flex-shrink-0">
            <svg viewBox="0 0 40 40" fill="none" class="w-full h-full">
              <path d="M20 2L38 20L20 38L2 20Z" fill="#C5161D"/>
              <path d="M20 2L38 20L20 20Z" fill="#E11D48"/>
              <path d="M2 20L20 20L20 38Z" fill="#991B1B"/>
              <path d="M20 20L38 20L20 38Z" fill="#B91C1C"/>
              <path d="M20 7L33 20L20 33L7 20Z" fill="#FFFFFF" fill-opacity="0.25"/>
            </svg>
          </div>
          <div>
            <div style="font-size: 13.5px; font-weight: 800; color: #0F172A; line-height: 1.15; letter-spacing: 0.04em; text-transform: uppercase;">
              PROCESS DEVELOPMENT DEPARTMENT
            </div>
            <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 1px;">
              INNOVATE &nbsp;|&nbsp; IMPROVE &nbsp;|&nbsp; DELIVER
            </div>
          </div>
        </div>

        <!-- Top Right: Small Changes Big Impact -->
        <div class="text-right">
          <div style="font-size: 9.5px; font-weight: 700; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase; line-height: 1;">
            SMALL CHANGES
          </div>
          <div style="font-size: 17px; font-weight: 900; color: #C5161D; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.15;">
            BIG IMPACT
          </div>
          <div style="height: 2px; width: 68px; background: #C5161D; margin-left: auto; margin-top: 2px; border-radius: 2px;"></div>
        </div>
      </div>

      <!-- 2. MAIN BODY: 2-COLUMN SPLIT (52% LEFT, 48% RIGHT) -->
      <div class="grid grid-cols-12 gap-5 flex-1 min-h-0 my-2 items-stretch relative z-10 overflow-hidden">
        
        <!-- LEFT COLUMN: CONTENT, OVERVIEW & IMPACT (6 COLS) -->
        <div class="col-span-6 flex flex-col justify-between gap-2 h-full min-h-0 overflow-hidden">
          
          <!-- Top Pill Badge + Split Title -->
          <div class="flex-shrink-0">
            <!-- Crimson Pill Badge -->
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-white font-bold text-xs uppercase tracking-wider mb-1" 
                 style="background: linear-gradient(135deg, #C5161D 0%, #B91C1C 100%); box-shadow: 0 2px 4px rgba(197,22,29,0.2);">
              <span>PROCESS IMPROVEMENT PROJECT</span>
            </div>

            <!-- Split Title with Red Left Accent Bar -->
            <div class="flex items-stretch gap-3 my-1">
              <div style="width: 5px; background: #C5161D; border-radius: 4px; flex-shrink: 0;"></div>
              <div>
                <h1 style="font-size: 23px; font-weight: 800; color: #0F172A; line-height: 1.15; margin: 0; letter-spacing: -0.01em;">
                  ${titleLine1}
                </h1>
                <h1 style="font-size: 23px; font-weight: 800; color: #C5161D; line-height: 1.15; margin: 0; letter-spacing: -0.01em;">
                  ${titleLine2}
                </h1>
              </div>
            </div>
          </div>

          <!-- 3-Column Metadata Bar -->
          <div class="grid grid-cols-3 gap-2 py-2 px-3.5 rounded-xl border border-slate-200 bg-slate-50/90 flex-shrink-0">
            <!-- Concern Engineer -->
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
              </div>
              <div class="overflow-hidden">
                <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em;">Concern Engineer</div>
                <div style="font-size: 12.5px; font-weight: 800; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${engineer}</div>
              </div>
            </div>

            <!-- Category -->
            <div class="flex items-center gap-2 border-l border-slate-200 pl-2.5">
              <div class="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
              </div>
              <div class="overflow-hidden">
                <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em;">Category</div>
                <div style="font-size: 12.5px; font-weight: 800; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${category}</div>
              </div>
            </div>

            <!-- Status -->
            <div class="flex items-center gap-2 border-l border-slate-200 pl-2.5">
              <div class="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
              </div>
              <div>
                <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em;">Status</div>
                <div class="flex items-center gap-1.5" style="font-size: 12.5px; font-weight: 800; color: #0F172A;">
                  <span style="display:inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
                  <span>${status}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Project Overview Card (Flexible vertical space with line clamping) -->
          <div class="px-4 py-2.5 rounded-xl border border-slate-200 flex-shrink-0 flex flex-col justify-center overflow-hidden" style="background: #F8FAFC; max-height: 98px;">
            <div class="flex items-center gap-2 mb-1 flex-shrink-0">
              <div class="w-4.5 h-4.5 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>
              </div>
              <span style="font-size: 13.5px; font-weight: 800; color: #0F172A;">Project Overview</span>
            </div>
            <p style="font-size: 13px; line-height: 1.5; color: #1E293B; margin: 0; font-weight: 500; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
              ${description}
            </p>
          </div>

          <!-- Key Impact Card (4 Bullets + 3 Trend Pills, clamped to prevent pushing footer) -->
          <div class="px-4 py-2.5 rounded-xl border border-slate-200 bg-white flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            <div class="flex items-center gap-2 mb-1 flex-shrink-0">
              <div class="w-4.5 h-4.5 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
              </div>
              <span style="font-size: 13.5px; font-weight: 800; color: #0F172A;">Key Impact</span>
            </div>

            <div class="grid grid-cols-12 gap-3 items-center flex-1 min-h-0 overflow-hidden">
              <!-- Left: 4 Red Checkmark Bullets (7 cols) -->
              <div class="col-span-7 flex flex-col justify-around h-full gap-1 overflow-hidden">
                ${impacts.slice(0, 4).map(imp => `
                  <div class="flex items-start gap-2 overflow-hidden">
                    <span class="w-4 h-4 rounded bg-red-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style="line-height: 1;">✔</span>
                    <span style="font-size: 12px; font-weight: 600; color: #1E293B; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${imp.trim()}</span>
                  </div>
                `).join("")}
              </div>

              <!-- Right: 3 Trend Metric Cards (5 cols) -->
              <div class="col-span-5 flex flex-col justify-around h-full gap-1.5 border-l border-slate-100 pl-2.5 overflow-hidden">
                ${metrics.map(m => {
                  const isUp = m.trend === "up";
                  const isGreen = m.color === "green" || (isUp && !m.color);
                  const arrowColor = isGreen ? "#10B981" : "#EF4444";
                  const arrowIcon = isUp ? "▲" : "▼";
                  return `
                  <div class="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div style="font-size: 10px; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.name}</div>
                    <div style="font-size: 10.5px; font-weight: 800; color: ${arrowColor}; white-space: nowrap;">${arrowIcon} ${m.change}</div>
                  </div>`;
                }).join("")}
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN: MACHINE / PROCESS PHOTO (6 COLS) -->
        ${hasDualPhoto ? `
        <div class="col-span-6 grid grid-cols-2 gap-3 h-full items-stretch" style="min-height: 340px;">
          <!-- Left Subframe: Present Condition (Before) -->
          <div class="flex flex-col h-full rounded-2xl overflow-hidden border border-slate-200 relative shadow-md bg-slate-950 slide-photo-frame group"
               ondragover="event.preventDefault(); this.classList.add('ring-2', 'ring-amber-500', 'ring-inset');"
               ondragleave="this.classList.remove('ring-2', 'ring-amber-500', 'ring-inset');"
               ondrop="this.classList.remove('ring-2', 'ring-amber-500', 'ring-inset'); SlideLayoutEngine.handleImageDrop(event, '${slideData.task_id}', 'before_photo');">
            <div class="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-md bg-amber-600/95 backdrop-blur-sm text-white font-extrabold text-[8.5px] uppercase tracking-wider shadow">
              1. PRESENT CONDITION (BEFORE)
            </div>
            <img src="${photoBefore}" alt="Present Condition" class="w-full h-full object-cover transition-all duration-200" 
                 onerror="this.src='assets/images/walton_red_reference_sample.jpg'; this.onerror=null;" />
            <!-- Floating Adjust Tool -->
            <div class="absolute top-2.5 right-2.5 z-20 opacity-0 group-hover:opacity-100 transition">
              <button onclick="SlideLayoutEngine.togglePhotoFit(this)" title="Toggle Fit/Fill" 
                      class="px-2 py-0.5 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[9px] font-mono border border-white/20 shadow">
                📐 <span class="mode-label">Fit</span>
              </button>
            </div>
          </div>

          <!-- Right Subframe: Proposed Project (After) -->
          <div class="flex flex-col h-full rounded-2xl overflow-hidden border border-slate-200 relative shadow-md bg-slate-950 slide-photo-frame group"
               ondragover="event.preventDefault(); this.classList.add('ring-2', 'ring-red-500', 'ring-inset');"
               ondragleave="this.classList.remove('ring-2', 'ring-red-500', 'ring-inset');"
               ondrop="this.classList.remove('ring-2', 'ring-red-500', 'ring-inset'); SlideLayoutEngine.handleImageDrop(event, '${slideData.task_id}', 'after_photo');">
            <div class="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-md bg-red-600/95 backdrop-blur-sm text-white font-extrabold text-[8.5px] uppercase tracking-wider shadow">
              2. PROPOSED PROJECT (AFTER)
            </div>
            <img src="${photoAfter}" alt="Proposed Project" class="w-full h-full object-cover transition-all duration-200" 
                 onerror="this.src='assets/images/walton_red_reference_sample.jpg'; this.onerror=null;" />
            <!-- Floating Adjust Tool -->
            <div class="absolute top-2.5 right-2.5 z-20 opacity-0 group-hover:opacity-100 transition">
              <button onclick="SlideLayoutEngine.togglePhotoFit(this)" title="Toggle Fit/Fill" 
                      class="px-2 py-0.5 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[9px] font-mono border border-white/20 shadow">
                📐 <span class="mode-label">Fit</span>
              </button>
            </div>
            <!-- Smaller, semi-transparent quote badge -->
            <div class="absolute bottom-0 right-0 py-1.5 px-3 text-right text-white" 
                 style="background: rgba(197, 22, 29, 0.45); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-top-left-radius: 10px; border-left: 1px solid rgba(255, 255, 255, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.3); max-width: 170px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
              <div style="font-size: 9.5px; font-weight: 800; font-style: italic; line-height: 1.2; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                "${quoteL1}<br/>${quoteL2}"
              </div>
            </div>
          </div>
        </div>
        ` : `
        <div class="col-span-6 flex flex-col h-full rounded-2xl overflow-hidden border border-slate-200 relative shadow-md slide-photo-frame group" 
             style="min-height: 340px; background: #0F172A;"
             ondragover="event.preventDefault(); this.classList.add('ring-2', 'ring-red-500', 'ring-inset');"
             ondragleave="this.classList.remove('ring-2', 'ring-red-500', 'ring-inset');"
             ondrop="this.classList.remove('ring-2', 'ring-red-500', 'ring-inset'); SlideLayoutEngine.handleImageDrop(event, '${slideData.task_id}', 'before_photo');">
          
          <!-- Main Equipment Photo -->
          <img src="${photoSingle}" alt="Process Development Implementation" class="w-full h-full object-cover transition-all duration-200" 
               onerror="this.src='assets/images/walton_red_reference_sample.jpg'; this.onerror=null;" />

          <!-- Frame Toolbar: Fit/Fill Toggle & Direct Replace Button -->
          <div class="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition">
            <button onclick="SlideLayoutEngine.togglePhotoFit(this)" title="Toggle Fit / Fill (adjust aspect ratio)" 
                    class="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[10px] font-mono font-bold border border-white/25 shadow-md flex items-center gap-1 transition">
              <span>📐</span><span class="mode-label">Fit</span>
            </button>
            <button onclick="document.getElementById('frame-file-input-${slideData.task_id}').click()" title="Upload or Replace Image"
                    class="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[10px] font-mono font-bold border border-white/25 shadow-md flex items-center gap-1 transition">
              <span>📷</span><span>Replace</span>
            </button>
            <input type="file" id="frame-file-input-${slideData.task_id}" accept="image/*" class="hidden" 
                   onchange="SlideLayoutEngine.handleFrameFileInput(this, '${slideData.task_id}', 'before_photo')" />
          </div>

          <!-- Drag Drop Hint Badge -->
          <div class="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm text-white/80 font-mono text-[9px] pointer-events-none flex items-center gap-1">
            <span>📂</span><span>Drag & drop image to adjust</span>
          </div>

          <!-- Bottom-Right Smaller, Transparent Red Quote Badge -->
          <div class="absolute bottom-0 right-0 py-1.5 px-3.5 text-right text-white" 
               style="background: rgba(197, 22, 29, 0.45); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-top-left-radius: 12px; border-left: 1px solid rgba(255, 255, 255, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.3); max-width: 220px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
            <div style="font-size: 10.5px; font-weight: 800; font-style: italic; line-height: 1.25; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
              "${quoteL1}<br/>${quoteL2}"
            </div>
          </div>
        </div>
        `}

      </div>

      <!-- 3. BOTTOM FOOTER BAR (Anchored & protected against content overflow) -->
      <div class="flex items-center justify-between pt-1.5 border-t border-slate-200 relative z-20 bg-white flex-shrink-0 min-h-[36px]">
        
        <!-- Left: Process Development Department Only -->
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-slate-800" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
          <div style="font-size: 11px; font-weight: 800; color: #0F172A; text-transform: uppercase; line-height: 1.1; letter-spacing: 0.04em;">
            PROCESS DEVELOPMENT DEPARTMENT
          </div>
        </div>

        <!-- Center: 2 Department Pillars (Reduced from 3 to 2) -->
        <div class="flex items-center gap-5">
          <!-- Pillar 1: Continuous Improvement -->
          <div class="flex items-center gap-1.5">
            <span class="text-xs">🏆</span>
            <span style="font-size: 9.5px; font-weight: 700; color: #334155;">Continuous Improvement</span>
          </div>
          <div style="width: 1px; height: 14px; background: #CBD5E1;"></div>
          <!-- Pillar 2: Stronger Together -->
          <div class="flex items-center gap-1.5">
            <span class="text-xs">👥</span>
            <span style="font-size: 9.5px; font-weight: 700; color: #334155;">Stronger Together</span>
          </div>
        </div>

        <!-- Right: Angled Red Month Badge -->
        <div class="flex items-center">
          <div class="py-1.5 px-4 rounded-l-full text-white text-right" 
               style="background: #C5161D; min-width: 140px; box-shadow: 0 2px 4px rgba(197,22,29,0.25);">
            <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
              ${month}
            </div>
            <div style="font-size: 8px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.9;">
              MONTHLY REPORT
            </div>
          </div>
        </div>

      </div>
    </div>`;
  },

  /**
   * Dedicated Dual Before & After Slide Layout (Image 2 Replica: media_1789208020843.png)
   * Rendered when a task has both photo_before and photo_after attached
   */
  renderDualBeforeAfterSlide(slideData, slideIndex = 1, totalSlides = 1) {
    const title = slideData.slide_title || slideData.task_name || "RAC Vacuum Station Optimized with Booster Pump";
    const status = slideData.status || "Completed";
    const category = slideData.category || "Process Improvement";
    const rawEng = slideData.engineer || slideData.assignee || "Sazzad (50463)";
    const engineer = (typeof HELPERS !== 'undefined' && HELPERS.formatPersonnelName) 
      ? HELPERS.formatPersonnelName(rawEng) 
      : rawEng;
    const description = slideData.description || slideData.task_details || slideData.ai_description || "With UNDP Investment, we get new booster pump. After installation, NG will be reduced, productivity will increase. Vacuum time will be reduced from 8 min to 5 min.";
    const investment = slideData.investment || (slideData.savings ? `BDT ${slideData.savings}` : "2000 USD");
    const photoBefore = slideData.photo_before || slideData.before_photo || "assets/images/walton_red_reference_sample.jpg";
    const photoAfter = slideData.photo_after || slideData.after_photo || "assets/images/walton_red_reference_sample.jpg";
    const progress = slideData.progress || (status.toLowerCase().includes("complete") ? 100 : 75);

    return `
    <div class="walton-dual-before-after-slide bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200"
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 16px 24px 10px 24px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; height: 100%; max-height: 100%;">
      
      <!-- TOP HEADER BAR (Project Name at Start, Focused & Bold) -->
      <div class="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 flex-shrink-0" style="min-height: 44px;">
        <!-- Left: Project Name at the Front + Category Pill -->
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z"/></svg>
          </div>
          <h2 style="font-size: 19px; font-weight: 900; color: #0B2038; margin: 0; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${HELPERS.escapeHtml(title)}">
            ${this.formatTitleWithAccent(title)}
          </h2>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-sky-800 bg-sky-100 border border-sky-200 flex-shrink-0">
            ${HELPERS.escapeHtml(category)}
          </span>
        </div>

        <!-- Right Kaizen Logo/Slogan -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm">
            ⚙️
          </div>
          <div class="text-right leading-tight">
            <div style="font-size: 10px; font-weight: 900; color: #0B2038;">Continuous Improvement</div>
            <div style="font-size: 8.5px; font-weight: 700; color: #0284C7;">for Better Production</div>
          </div>
        </div>
      </div>

      <!-- MAIN STAGE: Dedicated Left Status Pillar + Right Content Area (Image 2 Replica) -->
      <div class="flex-1 min-h-0 flex gap-3 py-1.5 items-stretch overflow-hidden">
        
        <!-- FULL-HEIGHT LEFT STATUS PILLAR (width ~ 135px) -->
        <div class="flex flex-col justify-between items-stretch flex-shrink-0" style="width: 135px;">
          <!-- Status Card 1: Present Status -->
          <div class="w-full bg-[#E0F2FE] border border-[#BAE6FD] rounded-xl p-2.5 text-center shadow-sm">
            <div class="text-xl">📋</div>
            <div class="text-[11px] font-black text-[#0369A1] uppercase tracking-wider mt-1">Present Status</div>
          </div>

          <!-- Status Card 2: Completed / Ongoing -->
          <div class="w-full bg-[#E0F2FE] border border-[#BAE6FD] rounded-xl p-2.5 text-center shadow-sm">
            <div class="text-xl text-[#0284C7] font-black leading-none">✓</div>
            <div class="text-[11px] font-black text-[#0284C7] uppercase tracking-wider mt-1">${status}</div>
          </div>

          <!-- Small Changes Big Impact Ribbon -->
          <div class="w-full py-2.5 px-2 rounded-xl text-center font-black text-white shadow-md flex-shrink-0"
               style="background: linear-gradient(135deg, #0B2038 0%, #0052CC 100%);">
            <div class="italic text-xs tracking-wider" style="font-family: 'Lexend', sans-serif;">Small Changes</div>
            <div class="text-sm tracking-wide text-amber-300 font-extrabold">Big Impact</div>
          </div>
        </div>

        <!-- RIGHT CONTENT AREA: Photo Stage + Bottom Functional Cards -->
        <div class="flex-1 min-w-0 flex flex-col justify-between h-full gap-2 overflow-hidden">
          
          <!-- TOP ROW: Side-by-Side Photo Frames with Center Chevron (Fixed bounded height, never blows out) -->
          <div class="flex-1 min-h-0 flex items-stretch gap-2 overflow-hidden" style="max-height: 58%;">
            
            <!-- Left Photo Card: Present Condition -->
            <div class="flex-1 min-w-0 flex flex-col h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950">
              <div class="py-1 px-3 text-white font-extrabold text-xs text-center uppercase tracking-wider flex-shrink-0"
                   style="background: #E65100;">
                Present Condition
              </div>
              <div class="slide-photo-frame flex-1 min-h-0 relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center"
                   ondragover="event.preventDefault(); this.classList.add('drag-over');"
                   ondragleave="this.classList.remove('drag-over');"
                   ondrop="SlideLayoutEngine.handleImageDrop(event, '${slideData.task_id}', 'before_photo')">
                <img src="${photoBefore}" alt="Present Condition" 
                     style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #0F172A;"
                     onerror="this.src='assets/images/walton_red_reference_sample.jpg'; this.onerror=null;" />
                <span class="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[8px] text-white font-mono pointer-events-none z-10 shadow">
                  Drop to replace
                </span>
              </div>
            </div>

            <!-- Center Divider: Chevron Arrow with dotted guidelines -->
            <div class="w-7 flex-shrink-0 flex flex-col items-center justify-center">
              <div class="w-0.5 flex-1 border-r-2 border-dashed border-sky-300"></div>
              <div class="w-7 h-7 rounded-full border-2 border-[#0284C7] bg-white text-[#0284C7] flex items-center justify-center font-black text-xs shadow-md my-0.5 z-10">
                ▶
              </div>
              <div class="w-0.5 flex-1 border-r-2 border-dashed border-sky-300"></div>
            </div>

            <!-- Right Photo Card: Proposed Project -->
            <div class="flex-1 min-w-0 flex flex-col h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950">
              <div class="py-1 px-3 text-white font-extrabold text-xs text-center uppercase tracking-wider flex-shrink-0"
                   style="background: #0052CC;">
                Proposed Project
              </div>
              <div class="slide-photo-frame flex-1 min-h-0 relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center"
                   ondragover="event.preventDefault(); this.classList.add('drag-over');"
                   ondragleave="this.classList.remove('drag-over');"
                   ondrop="SlideLayoutEngine.handleImageDrop(event, '${slideData.task_id}', 'after_photo')">
                <img src="${photoAfter}" alt="Proposed Project" 
                     style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #0F172A;"
                     onerror="this.src='assets/images/walton_red_reference_sample.jpg'; this.onerror=null;" />
                <span class="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[8px] text-white font-mono pointer-events-none z-10 shadow">
                  Drop to replace
                </span>
              </div>
            </div>

          </div>

          <!-- BOTTOM ROW: Summary & Investment | Radial Completion Gauge | Project Impact Matrix -->
          <div class="grid grid-cols-12 gap-2.5 flex-shrink-0 items-stretch overflow-hidden" style="height: 128px; min-height: 125px; max-height: 135px;">
            
            <!-- Left Card: Summary, Engineer & Investment (5 cols) -->
            <div class="col-span-5 flex flex-col justify-between gap-1.5 p-2.5 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD]">
              <div class="flex items-start gap-2 flex-1 min-h-0 overflow-hidden">
                <div class="w-6 h-6 rounded-full bg-[#0284C7] text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  📝
                </div>
                <div class="flex-1 min-h-0 overflow-hidden">
                  <div class="text-xs font-black text-[#0369A1] uppercase tracking-wider">Project Summary</div>
                  <p class="text-[11.5px] font-medium text-slate-800 leading-snug mt-0.5" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                    ${HELPERS.escapeHtml(description)}
                  </p>
                </div>
              </div>

              <!-- Lower Section: Concern Engineer & Investment side by side -->
              <div class="flex items-center gap-2 pt-1 border-t border-[#BAE6FD] flex-shrink-0 mt-0.5">
                <div class="flex-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 flex items-center gap-1.5 shadow-xs overflow-hidden">
                  <span class="text-xs flex-shrink-0">👤</span>
                  <span class="text-[11px] font-bold text-slate-800 truncate" title="Concern Engineer: ${HELPERS.escapeHtml(engineer)}">
                    ${HELPERS.escapeHtml(engineer)}
                  </span>
                </div>
                <div class="px-2.5 py-1 rounded-lg bg-white border border-[#BAE6FD] flex items-center gap-1 shadow-xs flex-shrink-0">
                  <span class="text-xs">💰</span>
                  <span class="text-[11px] font-black text-[#0369A1] truncate">${HELPERS.escapeHtml(investment)}</span>
                </div>
              </div>
            </div>

            <!-- Center Card: Radial Completion Ring (3 cols) -->
            <div class="col-span-3 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-center">
              <div class="relative w-16 h-16 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path class="text-slate-200" stroke-width="3.5" stroke="currentColor" fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="text-emerald-500" stroke-dasharray="${progress}, 100" stroke-width="3.5" stroke-linecap="round" stroke="currentColor" fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-sm font-black text-emerald-600">${progress}%</span>
                  <span class="text-[8.5px] font-extrabold text-slate-600 uppercase">Completed</span>
                </div>
              </div>
            </div>

            <!-- Right Card: Project Impact Panel (4 cols) -->
            <div class="col-span-4 rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between bg-white shadow-sm">
              <div class="py-1 px-3 bg-[#0052CC] text-white font-black text-xs flex items-center gap-1.5 flex-shrink-0">
                <span>📈</span> <span>Project Impact</span>
              </div>
              <div class="p-1.5 flex flex-col justify-between flex-1 gap-1">
                <div class="flex items-center justify-between py-0.5 px-2 rounded bg-slate-50 text-[11px]">
                  <span class="font-bold text-slate-800 flex items-center gap-1.5"><span>⚙️</span> Productivity Increase</span>
                  <span class="w-3.5 h-1.5 rounded-full border border-sky-400 bg-sky-200 flex-shrink-0"></span>
                </div>
                <div class="flex items-center justify-between py-0.5 px-2 rounded bg-amber-50 text-[11px]">
                  <span class="font-bold text-amber-950 flex items-center gap-1.5"><span>⭐</span> Vacuum Quality improve</span>
                  <span class="w-3.5 h-1.5 rounded-full border border-amber-400 bg-amber-200 flex-shrink-0"></span>
                </div>
                <div class="flex items-center justify-between py-0.5 px-2 rounded bg-slate-50 text-[11px]">
                  <span class="font-bold text-slate-800 flex items-center gap-1.5"><span>📊</span> Capacity Increase</span>
                  <span class="w-3.5 h-1.5 rounded-full border border-slate-400 bg-slate-200 flex-shrink-0"></span>
                </div>
                <div class="flex items-center justify-between py-0.5 px-2 rounded bg-emerald-50 text-[11px]">
                  <span class="font-black text-emerald-950 flex items-center gap-1.5 truncate"><span>💰</span> Saving BDT 10,00,000</span>
                  <span class="w-3.5 h-1.5 rounded-full border border-emerald-500 bg-emerald-200 flex-shrink-0"></span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-400 text-[10px] font-semibold flex-shrink-0">
        <div class="font-bold text-slate-800 uppercase tracking-wider">⚙ PROCESS DEVELOPMENT DEPARTMENT</div>
        <div class="flex items-center gap-3 text-slate-500">
          <span>🏆 Continuous Improvement</span>
          <span>•</span>
          <span>💡 A Smarter Tomorrow</span>
        </div>
        <div>Slide ${slideIndex} of ${totalSlides}</div>
      </div>

    </div>`;
  },

  /**
   * Alias for Industrial Dual Before/After Slide
   */
  renderIndustrialDualBeforeAfterSlide(slideData, slideIndex = 1, totalSlides = 1) {
    return this.renderDualBeforeAfterSlide(slideData, slideIndex, totalSlides);
  },

  /**
   * Executive Crimson Dual Before & After Task Slide in HTML (Pattern 1)
   */
  renderExecutiveDualBeforeAfterSlide(slideData, slideIndex = 1, totalSlides = 1) {
    const title = slideData.slide_title || slideData.task_name || "Process Improvement Project";
    const status = slideData.status || "Completed";
    const category = slideData.category || "Process Improvement";
    const rawEng = slideData.engineer || slideData.assignee || "Sazzad (50463)";
    const engineer = (typeof HELPERS !== 'undefined' && HELPERS.formatPersonnelName) 
      ? HELPERS.formatPersonnelName(rawEng) 
      : rawEng;
    const description = slideData.description || slideData.task_details || slideData.ai_description || "Implemented engineering process improvement for regular production.";
    const investment = slideData.investment || (slideData.savings ? `BDT ${slideData.savings}` : "In-house / Direct");
    const photoBefore = slideData.photo_before || slideData.before_photo || "assets/images/walton_red_reference_sample.jpg";
    const photoAfter = slideData.photo_after || slideData.after_photo || "assets/images/walton_red_reference_sample.jpg";
    const progress = slideData.progress || (status.toLowerCase().includes("complete") ? 100 : 75);

    return `
    <div class="walton-dual-before-after-slide walton-crimson-dual bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200"
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 16px 24px 10px 24px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; height: 100%; max-height: 100%;">
      
      <!-- TOP HEADER BAR (Project Name at Start, Focused & Bold) -->
      <div class="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 flex-shrink-0" style="min-height: 44px;">
        <!-- Left: Project Name at the Front + Category Pill -->
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z"/></svg>
          </div>
          <h2 style="font-size: 19px; font-weight: 900; color: #0F172A; margin: 0; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${HELPERS.escapeHtml(title)}">
            ${this.formatTitleWithAccent(title)}
          </h2>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 flex-shrink-0">
            ${HELPERS.escapeHtml(category)}
          </span>
        </div>

        <!-- Right Slogan -->
        <div class="text-right leading-tight flex-shrink-0">
          <div style="font-size: 9.5px; font-weight: 700; color: #64748B;">SMALL CHANGES</div>
          <div style="font-size: 16px; font-weight: 900; color: #C5161D; line-height: 1;">BIG IMPACT</div>
        </div>
      </div>

      <!-- MAIN STAGE -->
      <div class="flex-1 min-h-0 flex gap-3 py-1.5 items-stretch overflow-hidden">
        
        <!-- FULL-HEIGHT LEFT STATUS PILLAR (width ~ 135px) -->
        <div class="flex flex-col justify-between items-stretch flex-shrink-0" style="width: 135px;">
          <!-- Status Card 1: Present Status -->
          <div class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center shadow-sm">
            <div class="text-xl">📋</div>
            <div class="text-[11px] font-black text-slate-700 uppercase tracking-wider mt-1">Present Status</div>
          </div>

          <!-- Status Card 2: Completed / Ongoing -->
          <div class="w-full bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center shadow-sm">
            <div class="text-xl text-[#C5161D] font-black leading-none">✓</div>
            <div class="text-[11px] font-black text-[#C5161D] uppercase tracking-wider mt-1">${status}</div>
          </div>

          <!-- Small Changes Big Impact Ribbon -->
          <div class="w-full py-2.5 px-2 rounded-xl text-center font-black text-white shadow-md flex-shrink-0"
               style="background: linear-gradient(135deg, #0F172A 0%, #C5161D 100%);">
            <div class="italic text-xs tracking-wider" style="font-family: 'Lexend', sans-serif;">Small Changes</div>
            <div class="text-sm tracking-wide text-amber-300 font-extrabold">Big Impact</div>
          </div>
        </div>

        <!-- RIGHT CONTENT AREA -->
        <div class="flex-1 min-w-0 flex flex-col justify-between h-full gap-2 overflow-hidden">
          
          <!-- TOP ROW: Side-by-Side Photo Frames -->
          <div class="flex-1 min-h-0 flex items-stretch gap-2 overflow-hidden" style="max-height: 58%;">
            
            <!-- Left Photo Card: Present Condition -->
            <div class="flex-1 min-w-0 flex flex-col h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950">
              <div class="py-1 px-3 text-white font-extrabold text-xs text-center uppercase tracking-wider flex-shrink-0"
                   style="background: #D97706;">
                1. Present Condition (Before)
              </div>
              <div class="slide-photo-frame flex-1 min-h-0 relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center"
                   ondragover="event.preventDefault(); this.classList.add('drag-over');"
                   ondragleave="this.classList.remove('drag-over');"
                   ondrop="SlideLayoutEngine.handleImageDrop(event, '${slideData.task_id}', 'before_photo')">
                <img src="${photoBefore}" alt="Present Condition" 
                     style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #0F172A;"
                     onerror="this.src='assets/images/walton_red_reference_sample.jpg'; this.onerror=null;" />
                <span class="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[8px] text-white font-mono pointer-events-none z-10 shadow">
                  Drop to replace
                </span>
              </div>
            </div>

            <!-- Center Divider: Chevron Arrow -->
            <div class="w-7 flex-shrink-0 flex flex-col items-center justify-center">
              <div class="w-0.5 flex-1 border-r-2 border-dashed border-rose-300"></div>
              <div class="w-7 h-7 rounded-full border-2 border-[#C5161D] bg-white text-[#C5161D] flex items-center justify-center font-black text-xs shadow-md my-0.5 z-10">
                ▶
              </div>
              <div class="w-0.5 flex-1 border-r-2 border-dashed border-rose-300"></div>
            </div>

            <!-- Right Photo Card: Proposed Project -->
            <div class="flex-1 min-w-0 flex flex-col h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950">
              <div class="py-1 px-3 text-white font-extrabold text-xs text-center uppercase tracking-wider flex-shrink-0"
                   style="background: #C5161D;">
                2. Proposed Project (After)
              </div>
              <div class="slide-photo-frame flex-1 min-h-0 relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center"
                   ondragover="event.preventDefault(); this.classList.add('drag-over');"
                   ondragleave="this.classList.remove('drag-over');"
                   ondrop="SlideLayoutEngine.handleImageDrop(event, '${slideData.task_id}', 'after_photo')">
                <img src="${photoAfter}" alt="Proposed Project" 
                     style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #0F172A;"
                     onerror="this.src='assets/images/walton_red_reference_sample.jpg'; this.onerror=null;" />
                <span class="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[8px] text-white font-mono pointer-events-none z-10 shadow">
                  Drop to replace
                </span>
              </div>
            </div>

          </div>

          <!-- BOTTOM ROW: Summary & Investment | Radial Completion Gauge | Project Impact Matrix -->
          <div class="grid grid-cols-12 gap-2.5 flex-shrink-0 items-stretch overflow-hidden" style="height: 125px; min-height: 120px; max-height: 130px;">
            
            <!-- Left Card: Summary, Engineer & Investment (5 cols) -->
            <div class="col-span-5 flex flex-col justify-between gap-1.5 p-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
              <div class="flex items-start gap-2 flex-1 min-h-0 overflow-hidden">
                <div class="w-6 h-6 rounded-full bg-[#C5161D] text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  📝
                </div>
                <div class="flex-1 min-h-0 overflow-hidden">
                  <div class="text-[11px] font-extrabold text-[#C5161D] uppercase tracking-wider">Project Summary</div>
                  <p class="text-[10px] font-medium text-slate-700 leading-tight mt-0.5" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                    ${HELPERS.escapeHtml(description)}
                  </p>
                </div>
              </div>

              <!-- Lower Section: Concern Engineer & Investment side by side -->
              <div class="flex items-center gap-1.5 pt-1 border-t border-[#FECACA] flex-shrink-0 mt-0.5">
                <div class="flex-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 flex items-center gap-1.5 shadow-xs overflow-hidden">
                  <span class="text-xs flex-shrink-0">👤</span>
                  <span class="text-[10px] font-bold text-slate-700 truncate" title="Concern Engineer: ${HELPERS.escapeHtml(engineer)}">
                    ${HELPERS.escapeHtml(engineer)}
                  </span>
                </div>
                <div class="px-2 py-0.5 rounded-lg bg-white border border-[#FECACA] flex items-center gap-1 shadow-xs flex-shrink-0">
                  <span class="text-xs">💰</span>
                  <span class="text-[10px] font-black text-[#C5161D] truncate">${HELPERS.escapeHtml(investment)}</span>
                </div>
              </div>
            </div>

            <!-- Center Card: Radial Completion Ring (3 cols) -->
            <div class="col-span-3 flex flex-col items-center justify-center bg-rose-50/50 border border-rose-200 rounded-xl p-1 text-center">
              <div class="relative w-16 h-16 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path class="text-slate-200" stroke-width="3.5" stroke="currentColor" fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="text-[#C5161D]" stroke-dasharray="${progress}, 100" stroke-width="3.5" stroke-linecap="round" stroke="currentColor" fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-xs font-black text-[#C5161D]">${progress}%</span>
                  <span class="text-[7.5px] font-extrabold text-slate-500 uppercase">Completed</span>
                </div>
              </div>
            </div>

            <!-- Right Card: Project Impact Panel (4 cols) -->
            <div class="col-span-4 rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between bg-white shadow-sm">
              <div class="py-0.5 px-2.5 bg-[#C5161D] text-white font-extrabold text-[10.5px] flex items-center gap-1.5 flex-shrink-0">
                <span>📈</span> <span>Project Impact</span>
              </div>
              <div class="p-1 flex flex-col justify-between flex-1 gap-0.5">
                <div class="flex items-center justify-between py-0.5 px-1.5 rounded bg-rose-50 text-[9.5px]">
                  <span class="font-bold text-rose-900 flex items-center gap-1"><span>⚙️</span> Process Consistency</span>
                  <span class="w-3.5 h-1.5 rounded-full border border-rose-400 bg-rose-200 flex-shrink-0"></span>
                </div>
                <div class="flex items-center justify-between py-0.5 px-1.5 rounded bg-amber-50 text-[9.5px]">
                  <span class="font-bold text-amber-900 flex items-center gap-1"><span>⚡</span> Cycle Time Reduction</span>
                  <span class="w-3.5 h-1.5 rounded-full border border-amber-400 bg-amber-200 flex-shrink-0"></span>
                </div>
                <div class="flex items-center justify-between py-0.5 px-1.5 rounded bg-slate-50 text-[9.5px]">
                  <span class="font-bold text-slate-800 flex items-center gap-1"><span>📊</span> Capacity & OEE Increase</span>
                  <span class="w-3.5 h-1.5 rounded-full border border-slate-400 bg-slate-200 flex-shrink-0"></span>
                </div>
                <div class="flex items-center justify-between py-0.5 px-1.5 rounded bg-emerald-50 text-[9.5px]">
                  <span class="font-black text-emerald-900 flex items-center gap-1 truncate"><span>💰</span> Material & Labor Savings</span>
                  <span class="w-3.5 h-1.5 rounded-full border border-emerald-500 bg-emerald-200 flex-shrink-0"></span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-400 text-[10px] font-semibold flex-shrink-0">
        <div class="font-bold text-slate-800 uppercase tracking-wider">⚙ PROCESS DEVELOPMENT DEPARTMENT</div>
        <div class="flex items-center gap-3 text-slate-500">
          <span>🏆 Continuous Improvement</span>
          <span>•</span>
          <span>💡 A Smarter Tomorrow</span>
        </div>
        <div>Slide ${slideIndex} of ${totalSlides}</div>
      </div>

    </div>`;
  },

  /**
   * Renders a single 16:9 Walton Reference Task Slide
   * Auto-routes to dedicated Dual Before/After Layout (Image 2) when 2 photos are present.
   * Otherwise renders single-photo layout.
   */
  renderTaskSlide(slideData, slideIndex = 1, totalSlides = 1) {
    const isBlue = (slideData.template === "industrial_innovation_blue" || slideData.template === "walton_blue_dual");
    const hasDualPhoto = Boolean(
      (slideData.photo_before && slideData.photo_after) ||
      (slideData.before_photo && slideData.after_photo) ||
      slideData.has_dual_photo
    );
    if (hasDualPhoto) {
      if (isBlue) {
        return this.renderIndustrialDualBeforeAfterSlide(slideData, slideIndex, totalSlides);
      } else {
        return this.renderExecutiveDualBeforeAfterSlide(slideData, slideIndex, totalSlides);
      }
    }
    if (isBlue) {
      return this.renderIndustrialBlueSlide(slideData, slideIndex, totalSlides);
    }
    return this.renderExecutiveRedSlide(slideData, slideIndex, totalSlides);
  },

  /**
   * Industrial Innovation Blue Layout (Image 3: media_1789184008531.jpg)
   * High-tech modern industrial blue layout with project cards and hero image
   */
  renderIndustrialBlueSlide(slideData, slideIndex = 1, totalSlides = 1) {
    const title = slideData.slide_title || slideData.task_name || "RAC Vacuum Station Optimized with Booster Pump";
    const subtitle = slideData.subtitle || "Enhancing production stability through innovative engineering solutions.";
    const rawEng = slideData.engineer || slideData.assignee || "Sazzad (50463)";
    const engineer = (typeof HELPERS !== 'undefined' && HELPERS.formatPersonnelName) 
      ? HELPERS.formatPersonnelName(rawEng) 
      : (slideData.employee_id ? `${rawEng} (${slideData.employee_id})` : rawEng);
    const category = slideData.category || "Process Development";
    const status = slideData.status || "Completed";
    const description = slideData.description || slideData.ai_description || "Optimized the RAC vacuum station by installing a booster pump. The system was redesigned and implemented to improve vacuum performance and stability for regular production.";
    
    let impacts = ["Higher vacuum efficiency", "Reduced cycle time", "Improved production stability", "Lower maintenance requirement"];
    if (Array.isArray(slideData.impact) && slideData.impact.length > 0) {
      impacts = slideData.impact;
    } else if (typeof slideData.impact === 'string' && slideData.impact.trim()) {
      impacts = slideData.impact.split(';').map(s => s.trim()).filter(Boolean);
    }
    while (impacts.length < 4) {
      impacts.push("Standardized operating procedure executed");
    }

    // Photos
    const photoBefore = slideData.photo_before || slideData.photo_1 || null;
    const photoAfter = slideData.photo_after || slideData.photo_2 || null;
    const photoSingle = slideData.photo || photoAfter || photoBefore || "assets/img/blue_template_ref.jpg";
    const hasDualPhoto = Boolean(photoBefore && photoAfter && photoBefore !== photoAfter);
    const month = (slideData.month || "SEPTEMBER 2026").toUpperCase();

    return `
    <div class="walton-task-slide bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200" 
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 20px 28px 14px 28px; display: flex; flex-direction: column; justify-content: space-between; background: radial-gradient(circle at 100% 0%, rgba(2, 132, 199, 0.05) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(2, 132, 199, 0.04) 0%, transparent 40%), #FFFFFF;">
      
      <!-- TOP HEADER BAR -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-shrink-0">
        <!-- Brand & Department Identifier -->
        <div class="flex items-center gap-2.5">
          <!-- 4-Facet Modern Blue Diamond Icon -->
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none" class="flex-shrink-0">
            <polygon points="20,2 38,20 20,20" fill="#0284C7" />
            <polygon points="2,20 20,2 20,20" fill="#2563EB" />
            <polygon points="2,20 20,38 20,20" fill="#1D4ED8" />
            <polygon points="20,38 38,20 20,20" fill="#38BDF8" />
          </svg>
          <div>
            <div style="font-size: 13px; font-weight: 900; color: #0F172A; letter-spacing: 0.5px; line-height: 1.1;">WALTON</div>
            <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">PROCESS DEVELOPMENT DEPARTMENT</div>
          </div>
        </div>

        <!-- Corporate Pillars -->
        <div style="font-size: 10px; font-weight: 700; color: #475569; letter-spacing: 1.2px; font-family: 'JetBrains Mono', monospace;">
          INNOVATION &nbsp;|&nbsp; EFFICIENCY &nbsp;|&nbsp; SUSTAINABILITY
        </div>
      </div>

      <!-- MAIN CONTENT ROW (LEFT CARDS + RIGHT HERO PHOTO) -->
      <div style="display: flex; gap: 20px; flex: 1; align-items: stretch; margin-top: 10px; margin-bottom: 8px; min-height: 0;">
        
        <!-- LEFT COLUMN: PROJECT DETAILS & IMPACT CARDS (53% width) -->
        <div style="flex: 1.15; display: flex; flex-direction: column; justify-content: space-between; min-width: 0;">
          
          <!-- Pill Badge + Title + Subtitle -->
          <div>
            <span style="display: inline-block; background: linear-gradient(135deg, #2563EB, #0284C7); color: #FFFFFF; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; padding: 3px 14px; border-radius: 9999px; box-shadow: 0 2px 5px rgba(2, 132, 199, 0.25);">
              ${HELPERS.escapeHtml(category).toUpperCase()}
            </span>

            <div style="display: flex; align-items: stretch; gap: 10px; margin-top: 6px;">
              <div style="width: 4px; background: #0284C7; border-radius: 3px; flex-shrink: 0;"></div>
              <div>
                <h2 style="font-size: 21px; font-weight: 900; color: #0F172A; line-height: 1.2; margin: 0;">
                  ${HELPERS.escapeHtml(title)}
                </h2>
                <p style="font-size: 11px; color: #64748B; font-weight: 500; margin-top: 2px; margin-bottom: 0;">
                  ${HELPERS.escapeHtml(subtitle)}
                </p>
              </div>
            </div>
          </div>

          <!-- 3 Info Chips in a Row -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 6px;">
            
            <!-- Chip 1: Concern Engineer -->
            <div style="display: flex; align-items: center; gap: 7px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 6px 10px;">
              <div style="width: 26px; height: 26px; border-radius: 50%; background: #E0F2FE; color: #0284C7; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">
                👤
              </div>
              <div style="min-width: 0;">
                <div style="font-size: 9.5px; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">Concern Engineer</div>
                <div style="font-size: 12px; font-weight: 800; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${HELPERS.escapeHtml(engineer)}</div>
              </div>
            </div>

            <!-- Chip 2: Category -->
            <div style="display: flex; align-items: center; gap: 7px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 6px 10px;">
              <div style="width: 26px; height: 26px; border-radius: 50%; background: #E0F2FE; color: #0284C7; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">
                ⚙️
              </div>
              <div style="min-width: 0;">
                <div style="font-size: 9.5px; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">Category</div>
                <div style="font-size: 12px; font-weight: 800; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${HELPERS.escapeHtml(category)}</div>
              </div>
            </div>

            <!-- Chip 3: Status -->
            <div style="display: flex; align-items: center; gap: 7px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 6px 10px;">
              <div style="width: 26px; height: 26px; border-radius: 50%; background: #DCFCE7; color: #10B981; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">
                📊
              </div>
              <div style="min-width: 0;">
                <div style="font-size: 9.5px; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">Status</div>
                <div style="font-size: 12px; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 4px;">
                  <span style="color: #10B981; font-size: 13px;">●</span> ${status}
                </div>
              </div>
            </div>

          </div>

          <!-- Card 1: Project Description -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 12px 16px; margin-top: 6px;">
            <div style="display: flex; align-items: center; gap: 7px;">
              <div style="width: 22px; height: 22px; border-radius: 50%; background: #0284C7; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 11px;">
                📄
              </div>
              <span style="font-size: 14px; font-weight: 800; color: #0284C7;">Project Description</span>
            </div>
            <p style="font-size: 13px; line-height: 1.5; color: #1E293B; margin-top: 5px; margin-bottom: 0; font-weight: 500;">
              ${HELPERS.escapeHtml(description)}
            </p>
          </div>

          <!-- Card 2: Key Impact -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 12px 16px; margin-top: 6px;">
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 8px;">
              <div style="width: 22px; height: 22px; border-radius: 50%; background: #0284C7; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 11px;">
                🎯
              </div>
              <span style="font-size: 14px; font-weight: 800; color: #0284C7;">Key Impact</span>
            </div>

            <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px;">
              
              <!-- Left: 4 Bullet Checks -->
              <div style="display: flex; flex-direction: column; gap: 5px;">
                ${impacts.slice(0, 4).map(imp => `
                  <div style="display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: #1E293B;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 4px; background: #0284C7; color: #FFFFFF; font-size: 10px; font-weight: 900; flex-shrink: 0;">✓</span>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${HELPERS.escapeHtml(imp)}</span>
                  </div>
                `).join('')}
              </div>

              <!-- Right: 3 Metric Trend Badges -->
              <div style="display: flex; flex-direction: column; gap: 4px; justify-content: center; border-left: 1px solid #E2E8F0; padding-left: 10px;">
                <div style="display: flex; items-center; justify-content: space-between; font-size: 11px; color: #334155; font-weight: 600;">
                  <span>📈 Efficiency</span>
                  <span style="color: #10B981; font-weight: 800;">▲ Increased</span>
                </div>
                <div style="display: flex; items-center; justify-content: space-between; font-size: 11px; color: #334155; font-weight: 600;">
                  <span>🛡️ Quality</span>
                  <span style="color: #10B981; font-weight: 800;">▲ Improved</span>
                </div>
                <div style="display: flex; items-center; justify-content: space-between; font-size: 11px; color: #334155; font-weight: 600;">
                  <span>🔧 Maintenance</span>
                  <span style="color: #EF4444; font-weight: 800;">▼ Reduced</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN: HERO PHOTO WITH DOCK OVERLAYS (47% width) -->
        <!-- RIGHT COLUMN: HERO PHOTO WITH DOCK OVERLAYS (47% width) -->
        ${hasDualPhoto ? `
        <div style="flex: 0.95; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-height: 0;">
          <!-- Frame 1: Before -->
          <div style="position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.1); border: 1px solid #E2E8F0; background: #0F172A;">
            <div style="position: absolute; top: 0; left: 0; z-index: 5; background: #D97706; color: #FFFFFF; font-size: 8.5px; font-weight: 800; letter-spacing: 0.5px; padding: 5px 10px; border-bottom-right-radius: 10px;">
              1. PRESENT CONDITION (BEFORE)
            </div>
            <img src="${photoBefore}" alt="Present Condition" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <!-- Frame 2: After -->
          <div style="position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.1); border: 1px solid #E2E8F0; background: #0F172A; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="position: absolute; top: 0; left: 0; z-index: 5; background: #0284C7; color: #FFFFFF; font-size: 8.5px; font-weight: 800; letter-spacing: 0.5px; padding: 5px 10px; border-bottom-right-radius: 10px;">
              2. PROPOSED PROJECT (AFTER)
            </div>
            <img src="${photoAfter}" alt="Proposed Project" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1;">
            <div style="flex: 1;"></div>
            <div style="position: relative; z-index: 5; background: linear-gradient(to top, rgba(11, 32, 56, 0.95), rgba(11, 32, 56, 0.8)); padding: 6px 10px; display: flex; align-items: center; justify-content: space-around; border-top: 1px solid rgba(255,255,255,0.15);">
              <span style="color: #FFFFFF; font-size: 9px; font-weight: 700;">⚙️ Reliable</span>
              <span style="color: #FFFFFF; font-size: 9px; font-weight: 700;">🍃 Green</span>
            </div>
          </div>
        </div>
        ` : `
        <div style="flex: 0.95; position: relative; border-radius: 18px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; display: flex; flex-direction: column; justify-content: space-between; background: #0F172A;">
          <!-- Background Image -->
          <img src="${photoSingle}" alt="Task photo" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1;">

          <!-- Top-Right Navy Mission Badge -->
          <div style="position: absolute; top: 0; right: 0; z-index: 5; background: #0B2038; color: #FFFFFF; font-size: 9.5px; font-weight: 800; letter-spacing: 0.6px; padding: 8px 14px; border-bottom-left-radius: 14px; text-align: right; line-height: 1.25; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
            ENGINEERING SOLUTIONS<br>FOR A BETTER TOMORROW
          </div>

          <!-- Spacer to push overlay to bottom -->
          <div style="flex: 1;"></div>

          <!-- Bottom Overlaid Action Bar -->
          <div style="position: relative; z-index: 5; background: linear-gradient(to top, rgba(11, 32, 56, 0.95), rgba(11, 32, 56, 0.82)); backdrop-filter: blur(8px); padding: 8px 14px; display: flex; align-items: center; justify-content: space-around; border-top: 1px solid rgba(255,255,255,0.15);">
            <div style="display: flex; align-items: center; gap: 5px; color: #FFFFFF; font-size: 10px; font-weight: 700;">
              <span style="font-size: 13px;">⚙️</span> <span>Stable Production</span>
            </div>
            <div style="width: 1px; height: 14px; background: rgba(255,255,255,0.2);"></div>
            <div style="display: flex; align-items: center; gap: 5px; color: #FFFFFF; font-size: 10px; font-weight: 700;">
              <span style="font-size: 13px;">👥</span> <span>Reliable Process</span>
            </div>
            <div style="width: 1px; height: 14px; background: rgba(255,255,255,0.2);"></div>
            <div style="display: flex; align-items: center; gap: 5px; color: #FFFFFF; font-size: 10px; font-weight: 700;">
              <span style="font-size: 13px;">🍃</span> <span>Sustainable Growth</span>
            </div>
          </div>
        </div>
        `}

      </div>

      <!-- BOTTOM CORPORATE FOOTER -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #E2E8F0; pt-2 flex-shrink: 0; min-height: 24px;">
        
        <!-- Left: Process Development Department Only -->
        <div style="display: flex; align-items: center; gap: 6px; color: #0F172A; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">
          <span>⚙ PROCESS DEVELOPMENT DEPARTMENT</span>
        </div>

        <!-- Center: 2 Department Values -->
        <div style="display: flex; align-items: center; gap: 14px; color: #475569; font-size: 9.5px; font-weight: 600;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span>💡</span> <span>Continuous Improvement</span>
          </div>
          <span>•</span>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span>👥</span> <span>Stronger Together</span>
          </div>
        </div>

        <!-- Right: Monthly Report Badge Ribbon -->
        <div style="background: linear-gradient(135deg, #1D4ED8, #0284C7); color: #FFFFFF; padding: 4px 16px; font-size: 9.5px; font-weight: 800; font-family: 'JetBrains Mono', monospace; border-top-left-radius: 12px; letter-spacing: 0.5px;">
          📅 ${month} MONTHLY REPORT
        </div>

      </div>

    </div>`;
  },

  /**
   * Classic Blue Dual-Photo Layout (media_1789013397250.png)
   */
  renderClassicBlueSlide(slideData, slideIndex = 1, totalSlides = 1) {
    const title = slideData.slide_title || slideData.task_name || "Process Development Project";
    const engineer = slideData.engineer || "Concern Engineer";
    const empId = slideData.employee_id ? `(${slideData.employee_id})` : "";
    const description = slideData.description || slideData.ai_description || "Conducted process trial, engineering verification, and implementation.";
    const impacts = Array.isArray(slideData.impact) && slideData.impact.length > 0
      ? slideData.impact
      : (typeof slideData.impact === 'string' && slideData.impact.trim() ? slideData.impact.split(';') : ["Process workflow enhancement", "Production capacity increase", "Tooling precision improved"]);
    
    const investment = slideData.investment || "In-house / Direct Implementation";
    const percent = slideData.percent !== undefined ? slideData.percent : 100;
    const projectType = slideData.project_type || "Process Improvement";
    const category = slideData.category || "Ongoing Project";

    // Photos
    const photo1 = slideData.photo_before || slideData.photo_1 || slideData.photo || null;
    const photo2 = slideData.photo_after || slideData.photo_2 || null;

    // SVG Radial Gauge
    const radialSvg = typeof RadialGaugeComponent !== 'undefined'
      ? RadialGaugeComponent.renderSVG(percent, "Completed", 140)
      : `<div style="font-size:24px; font-weight:800; color:#10B981;">${percent}% Completed</div>`;

    return `
    <div class="walton-task-slide bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200" 
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 24px 32px 18px 24px; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- TOP HEADER ROW -->
      <div class="flex items-center justify-between gap-4 pb-2 border-b border-slate-100" style="min-height: 56px;">
        <!-- Left Badges -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold text-xs uppercase tracking-wider" 
               style="background: linear-gradient(135deg, #FF6B00 0%, #F97316 100%); box-shadow: 0 2px 4px rgba(249,115,22,0.25);">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
            <span>Ongoing Project</span>
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider" 
               style="background: #F1F5F9; color: #334155; border: 1px solid #E2E8F0;">
            <svg class="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
            <span>${projectType}</span>
          </div>
        </div>

        <!-- Center Main Headline -->
        <div class="flex-grow px-4 text-center">
          <h1 style="font-size: 24px; font-weight: 800; color: #0B2038; line-height: 1.25; margin: 0; letter-spacing: -0.01em;">
            ${this.formatTitleWithAccent(title)}
          </h1>
        </div>

        <!-- Right Slogan & Gears Logo -->
        <div class="flex items-center gap-3 pl-4 border-l border-slate-200 flex-shrink-0">
          <div class="flex items-center gap-1 text-sky-600">
            <svg class="w-7 h-7 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <div class="text-right">
            <div style="font-size: 11.5px; font-weight: 800; color: #0B2038; line-height: 1.15;">
              Continuous Improvement
            </div>
            <div style="font-size: 10.5px; font-weight: 700; color: #0284C7; line-height: 1.15;">
              for Better Production
            </div>
            <div style="height: 2px; width: 100%; background: linear-gradient(90deg, #FF6B00, transparent); margin-top: 2px; border-radius: 2px;"></div>
          </div>
        </div>
      </div>

      <!-- MAIN BODY GRID: LEFT STATUS BAR + CENTER/RIGHT WORKSPACE -->
      <div class="grid grid-cols-12 gap-5 flex-grow my-3 items-stretch">
        
        <!-- LEFT COLUMN: WALTON SIGNATURE STATUS STRIPE (2 COLS) -->
        <div class="col-span-2 flex flex-col justify-between items-center rounded-xl p-3 text-center border border-slate-200"
             style="background: #F8FAFC;">
          <!-- Top Present Status Badge -->
          <div class="w-full flex flex-col items-center py-2 px-1 rounded-lg border-2 border-dashed border-sky-400 bg-white">
            <svg class="w-6 h-6 text-sky-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            <span style="font-size: 11px; font-weight: 800; color: #0B2038; text-transform: uppercase;">Present Status</span>
          </div>

          <!-- Middle Completed Checkmark Badge -->
          <div class="w-full flex flex-col items-center py-3 px-2 rounded-xl text-white my-2" 
               style="background: linear-gradient(180deg, #0284C7 0%, #0369A1 100%); box-shadow: 0 4px 6px -1px rgba(2,132,199,0.3);">
            <div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center mb-1">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            </div>
            <span style="font-size: 13px; font-weight: 800; letter-spacing: 0.02em;">Completed</span>
          </div>

          <!-- Concern Engineer Tag -->
          <div class="w-full py-1.5 px-2 bg-white rounded-lg border border-slate-200">
            <div style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase;">Concern Engineer</div>
            <div style="font-size: 11px; font-weight: 800; color: #0B2038;">${engineer} ${empId}</div>
          </div>

          <!-- Bottom Navy Script Ribbon -->
          <div class="w-full py-2.5 px-2 rounded-xl text-white relative overflow-hidden" 
               style="background: #07172B;">
            <div style="font-family: 'Segoe Script', 'Brush Script MT', cursive, sans-serif; font-size: 13px; font-weight: 700; color: #FFFFFF; line-height: 1.2;">
              Small Changes<br/>Big Impact
            </div>
            <div style="height: 2px; width: 60%; background: #FF6B00; margin: 3px auto 0 auto; border-radius: 2px;"></div>
          </div>
        </div>

        <!-- CENTER/RIGHT WORKSPACE: PHOTOS + FUNCTIONAL CARDS (10 COLS) -->
        <div class="col-span-10 flex flex-col justify-between gap-3">
          
          <!-- TOP SECTION: PHOTO AREA (SPLIT OR PANORAMA) -->
          <div class="grid grid-cols-2 gap-4 flex-grow items-center">
            
            <!-- Left Photo Container: Present Condition (Before) -->
            <div class="flex flex-col h-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 relative" style="min-height: 210px;">
              <div class="px-4 py-1.5 text-center text-white font-bold text-xs uppercase tracking-wider" 
                   style="background: #FF6B00;">
                Present Condition
              </div>
              <div class="flex-grow flex items-center justify-center p-2 overflow-hidden relative">
                ${photo1 ? `
                  <img src="${photo1}" alt="Present Condition" class="w-full h-full object-contain rounded-lg" style="max-height: 180px;" />
                ` : `
                  <div class="flex flex-col items-center justify-center text-slate-300 w-full h-full border border-dashed border-slate-200 rounded-lg bg-white/50">
                    <svg class="w-10 h-10 mb-1 opacity-40 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span style="font-size: 10px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">Engineering Reference</span>
                  </div>
                `}
              </div>
            </div>

            <!-- Right Photo Container: Proposed Project (After) -->
            <div class="flex flex-col h-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 relative" style="min-height: 210px;">
              <div class="px-4 py-1.5 text-center text-white font-bold text-xs uppercase tracking-wider" 
                   style="background: #0284C7;">
                Proposed Project
              </div>
              <div class="flex-grow flex items-center justify-center p-2 overflow-hidden relative">
                ${photo2 || photo1 ? `
                  <img src="${photo2 || photo1}" alt="Proposed Project" class="w-full h-full object-contain rounded-lg" style="max-height: 180px;" />
                ` : `
                  <div class="flex flex-col items-center justify-center text-slate-300 w-full h-full border border-dashed border-slate-200 rounded-lg bg-white/50">
                    <svg class="w-10 h-10 mb-1 opacity-40 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                    <span style="font-size: 10px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">Implemented Verification</span>
                  </div>
                `}
              </div>
            </div>

          </div>

          <!-- BOTTOM ROW: SUMMARY (4 COLS) + RADIAL GAUGE (3 COLS) + IMPACT PILLS (5 COLS) -->
          <div class="grid grid-cols-12 gap-3 items-stretch">
            
            <!-- Summary & Investment Card (5 cols) -->
            <div class="col-span-5 flex flex-col justify-between p-3 rounded-xl border border-sky-200" 
                 style="background: #F0F9FF;">
              <div>
                <div class="flex items-center gap-2 mb-1.5">
                  <div class="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center flex-shrink-0">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"/><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"/></svg>
                  </div>
                  <span style="font-size: 13px; font-weight: 800; color: #0C4A6E;">Summary</span>
                </div>
                <p style="font-size: 10.5px; line-height: 1.45; color: #0F172A; margin: 0; font-weight: 500;">
                  ${description}
                </p>
              </div>

              <!-- Investment Bar -->
              <div class="flex items-center gap-2 mt-2 pt-1.5 border-t border-sky-100">
                <svg class="w-4 h-4 text-sky-700 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/></svg>
                <span style="font-size: 10.5px; font-weight: 800; color: #075985;">
                  Investment: <span style="font-weight: 600; color: #0C4A6E;">${investment}</span>
                </span>
              </div>
            </div>

            <!-- Radial Progress Donut (3 cols) -->
            <div class="col-span-3 flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white">
              ${radialSvg}
            </div>

            <!-- Project Impact Pill Stack (4 cols) -->
            <div class="col-span-4 flex flex-col justify-between rounded-xl overflow-hidden border border-slate-200 bg-white">
              <div class="px-3 py-1.5 text-white font-bold text-xs uppercase flex items-center gap-1.5" 
                   style="background: #0284C7;">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
                <span>Project Impact</span>
              </div>
              <div class="p-2 flex flex-col gap-1.5 flex-grow justify-around">
                ${impacts.slice(0, 4).map((imp, idx) => {
                  const configs = [
                    { bg: "#E0F2FE", text: "#0369A1", icon: `<svg class="w-3 h-3 text-sky-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>` },
                    { bg: "#FEF3C7", text: "#B45309", icon: `<svg class="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>` },
                    { bg: "#F1F5F9", text: "#334155", icon: `<svg class="w-3 h-3 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>` },
                    { bg: "#DCFCE7", text: "#15803D", icon: `<svg class="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>` }
                  ];
                  const c = configs[idx % configs.length];
                  return `
                  <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg" style="background: ${c.bg};">
                    <span class="flex-shrink-0">${c.icon}</span>
                    <span style="font-size: 10px; font-weight: 700; color: ${c.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${imp.trim()}
                    </span>
                  </div>`;
                }).join("")}
              </div>
            </div>

          </div>

        </div>

      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-400 text-[10px] font-semibold" style="min-height: 20px;">
        <div class="font-bold text-slate-800 uppercase tracking-wider">⚙ PROCESS DEVELOPMENT DEPARTMENT</div>
        <div class="flex items-center gap-3 text-slate-500">
          <span>🏆 Continuous Improvement</span>
          <span>•</span>
          <span>💡 A Smarter Tomorrow</span>
        </div>
        <div>Slide ${slideIndex} of ${totalSlides}</div>
      </div>

    </div>`;
  },

  /**
   * Renders the Walton Departmental Projects Cover Slide (Image 3 Replica: media_1789208293987.png)
   * Official Walton Logo, Departmental Projects, Process Development badge, Gazipur location, factory skyline & dual waves
   */
  renderExecutiveRedCoverSlide(month = "SEPTEMBER 2026", year = "2026") {
    const monthUpper = (month || "SEPTEMBER 2026").toUpperCase();
    return `
    <div class="walton-executive-cover bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200" 
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 36px 52px; display: flex; flex-direction: column; justify-content: space-between; position: relative; background: #FFFFFF;">
      
      <!-- TOP-LEFT GEOMETRIC CHEVRONS (ORANGE & BLUE ACCENTS) -->
      <div style="position: absolute; top: 0; left: 0; z-index: 10; pointer-events: none;">
        <svg width="220" height="130" viewBox="0 0 220 130" fill="none">
          <polygon points="0,0 150,0 60,85 0,85" fill="#FF6B00" />
          <polygon points="0,20 190,0 220,0 100,120 0,120" fill="#0052CC" />
        </svg>
      </div>

      <!-- TOP RIGHT SUBTLE LOGO ACCENT -->
      <div class="text-right z-10">
        <span class="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">WALTON AC PROCESS DEVELOPMENT</span>
      </div>

      <!-- CENTER STAGE (IMAGE 3 REPLICA) -->
      <div class="flex-1 flex flex-col items-center justify-center text-center z-10 py-2">
        <!-- Walton Logo & Slogan -->
        <div class="flex flex-col items-center justify-center mb-1">
          <img src="assets/img/walton_logo.png" alt="WALTON" class="h-16 w-auto object-contain drop-shadow-sm mb-1"
               onerror="this.style.display='none'; document.getElementById('walton-logo-cover-fallback').style.display='flex';" />
          <div id="walton-logo-cover-fallback" style="display:none;" class="items-center gap-2 mb-1">
            <span class="text-3xl font-black text-red-600">W</span>
            <span class="text-3xl font-black text-[#0052CC]">ALTON</span>
          </div>

          <div class="flex items-center justify-center gap-3 my-1">
            <span class="w-16 h-[1.5px] bg-slate-300 inline-block"></span>
            <span class="text-[11px] font-bold text-slate-500 tracking-[0.25em] uppercase font-mono">BETTER PRODUCTS &nbsp;|&nbsp; BRIGHTER FUTURE</span>
            <span class="w-16 h-[1.5px] bg-slate-300 inline-block"></span>
          </div>
        </div>

        <!-- Main Title: DEPARTMENTAL PROJECTS -->
        <h1 style="font-size: 40px; font-weight: 900; color: #0B2038; letter-spacing: -0.01em; margin: 12px 0 6px 0; text-transform: uppercase; line-height: 1.1;">
          DEPARTMENTAL PROJECTS
        </h1>

        <!-- Sleeker, Semi-Transparent Badge (Image 3 Request) -->
        <div class="inline-flex items-center justify-center px-7 py-1.5 rounded-full font-black text-sm tracking-wider uppercase text-white shadow-md my-2"
             style="background: rgba(0, 82, 204, 0.88); backdrop-filter: blur(6px); border: 1px solid rgba(255, 255, 255, 0.4);">
          <span>PROCESS DEVELOPMENT</span>
          <span class="ml-2.5 w-1.5 h-3.5 bg-white/80 inline-block transform skew-x-[-20deg]"></span>
        </div>

        <!-- Corporate Entity & Location -->
        <div style="font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 8px;">
          Walton Hi-Tech Industries PLC.
        </div>
        <div class="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 mt-1">
          <svg class="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
          <span>Chandra, Kaliakoir, Gazipur, Bangladesh</span>
        </div>

        <!-- Month Pill -->
        <div class="mt-2.5">
          <span class="px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono font-bold text-slate-700 shadow-xs">
            ${monthUpper}
          </span>
        </div>
      </div>

      <!-- BOTTOM FACTORY SKYLINE & DUAL FLOWING WAVES (ORANGE & WALTON BLUE) -->
      <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 160px; pointer-events: none; overflow: hidden; z-index: 1;">
        <svg viewBox="0 0 1200 240" preserveAspectRatio="none" style="width: 100%; height: 100%;">
          <!-- Industrial Plant & City Silhouette -->
          <g fill="#CBD5E1" opacity="0.6">
            <rect x="730" y="70" width="40" height="90" />
            <rect x="780" y="50" width="70" height="110" />
            <rect x="860" y="30" width="50" height="130" />
            <rect x="920" y="75" width="80" height="85" />
            <polygon points="780,50 815,30 850,50" />
            <rect x="1010" y="60" width="45" height="100" />
          </g>
          <g fill="#94A3B8" opacity="0.75">
            <rect x="810" y="90" width="130" height="70" rx="4" />
            <rect x="950" y="100" width="90" height="60" rx="4" />
            <line x1="820" y1="50" x2="820" y2="90" stroke="#EF4444" stroke-width="4" />
            <line x1="840" y1="40" x2="840" y2="90" stroke="#EF4444" stroke-width="4" />
          </g>
          <!-- Trees / Green landscaping -->
          <g fill="#10B981" opacity="0.8">
            <circle cx="700" cy="160" r="15" />
            <circle cx="725" cy="155" r="18" />
            <circle cx="755" cy="160" r="14" />
            <circle cx="1070" cy="160" r="18" />
            <circle cx="1100" cy="155" r="15" />
          </g>
          <!-- Dual Waves: Orange Upper Wave & Walton Blue Lower Wave -->
          <path d="M0,170 C300,150 650,195 950,165 C1080,152 1150,160 1200,165 L1200,240 L0,240 Z" fill="#FF6B00" />
          <path d="M0,185 C250,170 600,210 900,180 C1050,168 1140,176 1200,180 L1200,240 L0,240 Z" fill="#0052CC" />
        </svg>
      </div>

    </div>`;
  },

  /**
   * Executive FY Performance & Strategic Target Comparison Slide (Image 4 Replica: media_1789208619402.png)
   * Rendered at the beginning of executive presentations
   */
  renderExecutiveComparisonSlide(month = "SEPTEMBER 2026", data = null) {
    return `
    <div class="walton-comparison-slide bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200"
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 22px 36px; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- TOP PILLS HEADER -->
      <div class="grid grid-cols-2 gap-8 mb-2 flex-shrink-0">
        <!-- FY 25/26 Pill (Blue) -->
        <div class="py-2 px-6 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2.5 shadow-md"
             style="background: linear-gradient(135deg, #0052CC 0%, #0284C7 100%);">
          <span>📅</span> <span>|</span> <span>FY - 25/26</span>
        </div>
        <!-- FY 26/27 Pill (Green) -->
        <div class="py-2 px-6 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2.5 shadow-md"
             style="background: linear-gradient(135deg, #00875A 0%, #10B981 100%);">
          <span>📅</span> <span>|</span> <span>FY - 26/27</span>
        </div>
      </div>

      <!-- TWO MAIN COMPARISON CARDS -->
      <div class="grid grid-cols-2 gap-8 flex-1 min-h-0 items-stretch">
        
        <!-- LEFT COLUMN: FY 25/26 (Blue / Orange Theme) -->
        <div class="flex flex-col justify-between h-full gap-2">
          <!-- Category Metric Box with Gold/Orange Border -->
          <div class="rounded-2xl border-2 p-3 bg-white flex flex-col justify-between flex-1 shadow-sm"
               style="border-color: #F6AD55;">
            <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div class="flex items-center justify-between py-1 px-2 rounded bg-amber-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">⚙️</span> Material Optimization</span>
                <span class="px-2 py-0.5 rounded font-black text-amber-900 bg-amber-200/70">12</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-amber-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">🚚</span> Non Moving Utilization</span>
                <span class="px-2 py-0.5 rounded font-black text-amber-900 bg-amber-200/70">7</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-amber-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">📄</span> BOM Tolerance</span>
                <span class="px-2 py-0.5 rounded font-black text-amber-900 bg-amber-200/70">17</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-amber-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">📈</span> Capacity Increase</span>
                <span class="px-2 py-0.5 rounded font-black text-amber-900 bg-amber-200/70">6</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-amber-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">💡</span> New Development</span>
                <span class="px-2 py-0.5 rounded font-black text-amber-900 bg-amber-200/70">11</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-amber-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">💰</span> Utility Savings</span>
                <span class="px-2 py-0.5 rounded font-black text-amber-900 bg-amber-200/70">7</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-amber-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">🏭</span> Manpower Optimization</span>
                <span class="px-2 py-0.5 rounded font-black text-amber-900 bg-amber-200/70">6</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-amber-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">🔀</span> Process Optimization</span>
                <span class="px-2 py-0.5 rounded font-black text-amber-900 bg-amber-200/70">3</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-amber-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">♻️</span> Wastage Reduction</span>
                <span class="px-2 py-0.5 rounded font-black text-amber-900 bg-amber-200/70">8</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-amber-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px]">🦾</span> Automation</span>
                <span class="px-2 py-0.5 rounded font-black text-amber-900 bg-amber-200/70">8</span>
              </div>
            </div>

            <!-- Target Banner -->
            <div class="mt-2 py-1.5 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm"
                 style="background: #FF6B00;">
              <span>🎯</span> <span>|</span> <span>Total - 85</span>
            </div>
          </div>

          <!-- Lower Card: Top 5 Projects (Blue) -->
          <div class="rounded-2xl border-2 border-blue-200 bg-[#F0F9FF] p-2.5 shadow-sm">
            <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#0052CC] text-white font-black text-[11px] uppercase mb-1.5 shadow-sm">
              <span>🏆</span> <span>Top 5 Projects</span>
            </div>
            <div class="space-y-0.5 text-[11px] font-semibold text-slate-800">
              <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">1</span> 5mm Evaporator Development</div>
              <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">2</span> Spiral Tube Manufacturing</div>
              <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">3</span> Double Row Implementation in CAB Furnace</div>
              <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">4</span> Booster Pump Implementation (Under UNDP)</div>
              <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">5</span> MFC 3TR &amp; C ODU Development for Sanhua &amp; Kasun</div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: FY 26/27 (Green Theme) -->
        <div class="flex flex-col justify-between h-full gap-2">
          <!-- Category Metric Box with Green Border -->
          <div class="rounded-2xl border-2 p-3 bg-white flex flex-col justify-between flex-1 shadow-sm"
               style="border-color: #68D391;">
            <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div class="flex items-center justify-between py-1 px-2 rounded bg-emerald-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">⚙️</span> Material Optimization</span>
                <span class="px-2 py-0.5 rounded font-black text-emerald-900 bg-emerald-200/70">3</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-emerald-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">🚚</span> Non Moving Utilization</span>
                <span class="px-2 py-0.5 rounded font-black text-emerald-900 bg-emerald-200/70">1</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-emerald-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">📄</span> BOM Tolerance</span>
                <span class="px-2 py-0.5 rounded font-black text-emerald-900 bg-emerald-200/70">6</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-emerald-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">📈</span> Capacity Increase</span>
                <span class="px-2 py-0.5 rounded font-black text-emerald-900 bg-emerald-200/70">1</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-emerald-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">💡</span> New Development</span>
                <span class="px-2 py-0.5 rounded font-black text-emerald-900 bg-emerald-200/70">17</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-emerald-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">💰</span> Utility Savings</span>
                <span class="px-2 py-0.5 rounded font-black text-emerald-900 bg-emerald-200/70">3</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-emerald-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">🔀</span> Process Optimization</span>
                <span class="px-2 py-0.5 rounded font-black text-emerald-900 bg-emerald-200/70">14</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-emerald-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">♻️</span> Wastage Reduction</span>
                <span class="px-2 py-0.5 rounded font-black text-emerald-900 bg-emerald-200/70">11</span>
              </div>
              <div class="flex items-center justify-between py-1 px-2 rounded bg-emerald-50/70">
                <span class="font-bold text-slate-700 flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px]">🦾</span> Automation</span>
                <span class="px-2 py-0.5 rounded font-black text-emerald-900 bg-emerald-200/70">4</span>
              </div>
            </div>

            <!-- Target Banner -->
            <div class="mt-2 py-1.5 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm"
                 style="background: #00875A;">
              <span>🎯</span> <span>|</span> <span>Total - 60</span>
            </div>
          </div>

          <!-- Lower Card: Top 5 Projects (Green) -->
          <div class="rounded-2xl border-2 border-emerald-200 bg-[#E8F8F0] p-2.5 shadow-sm">
            <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#00875A] text-white font-black text-[11px] uppercase mb-1.5 shadow-sm">
              <span>🏆</span> <span>Top 5 Projects</span>
            </div>
            <div class="space-y-0.5 text-[11px] font-semibold text-slate-800">
              <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold">1</span> Powder Coating Recycle Project</div>
              <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold">2</span> New Turret Punch Machine Implementation</div>
              <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold">3</span> SS &amp; AL Tube Implementation</div>
              <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold">4</span> New Golden Fin Development</div>
              <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold">5</span> MPE Tube Usability Through Pretreatment</div>
            </div>
          </div>
        </div>

      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-400 text-[9px]">
        <div>Walton AC Process Development &bull; Strategic Performance Comparison</div>
        <div style="font-style: italic;">Walton Hi-Tech Industries PLC</div>
      </div>

    </div>`;
  },

  /**
   * Executive Closing & Financial Impact Slide (Image 5 Replica: media_1789208633235.png)
   * Rendered at the end of executive presentations
   */
  renderExecutiveClosingSlide(month = "SEPTEMBER 2026", data = null) {
    return `
    <div class="walton-closing-slide bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200"
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 22px 36px; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- TOP HEADER PILLS -->
      <div class="grid grid-cols-2 gap-10 mb-1 flex-shrink-0">
        <div class="py-2 px-6 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2.5 shadow-md"
             style="background: linear-gradient(135deg, #0052CC 0%, #0284C7 100%);">
          <span>📅</span> <span>FY - 25/26</span>
        </div>
        <div class="py-2 px-6 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2.5 shadow-md"
             style="background: linear-gradient(135deg, #00875A 0%, #10B981 100%);">
          <span>📅</span> <span>FY - 26/27</span>
        </div>
      </div>

      <!-- MAIN CONTENT: DUAL COMPARISON FLOW -->
      <div class="grid grid-cols-2 gap-10 flex-1 min-h-0 items-center py-2">
        
        <!-- LEFT COLUMN: FY 25/26 -->
        <div class="flex flex-col items-center justify-between h-full gap-1.5">
          <div class="text-blue-600 text-lg font-black">⬇</div>

          <!-- Total Projects Box -->
          <div class="w-full py-2 px-6 rounded-2xl bg-[#EBF3FF] border-2 border-blue-300 flex items-center justify-center gap-3 shadow-sm">
            <span class="text-2xl">📄</span>
            <span class="text-lg font-black text-slate-800">Total Projects - <span class="text-[#0052CC]">85</span></span>
          </div>

          <div class="text-blue-600 text-lg font-black">⬇</div>

          <!-- Project Categorization Split Box -->
          <div class="w-full rounded-2xl border-2 border-[#F6AD55] bg-amber-50/40 p-3 shadow-sm space-y-2">
            <div class="flex items-center justify-between py-1 px-3 rounded-xl bg-white shadow-xs">
              <span class="font-extrabold text-xs text-slate-800 flex items-center gap-2.5">
                <span class="w-6 h-6 rounded-full bg-[#FF6B00] text-white flex items-center justify-center text-xs">⭐</span>
                Major Projects
              </span>
              <span class="font-black text-sm text-slate-900">- 7</span>
            </div>
            <div class="flex items-center justify-between py-1 px-3 rounded-xl bg-white shadow-xs">
              <span class="font-extrabold text-xs text-slate-800 flex items-center gap-2.5">
                <span class="w-6 h-6 rounded-full bg-[#0052CC] text-white flex items-center justify-center text-xs">⚙️</span>
                Moderate Projects
              </span>
              <span class="font-black text-sm text-slate-900">- 25</span>
            </div>
            <div class="flex items-center justify-between py-1 px-3 rounded-xl bg-white shadow-xs">
              <span class="font-extrabold text-xs text-slate-800 flex items-center gap-2.5">
                <span class="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center text-xs">📊</span>
                Minor Projects
              </span>
              <span class="font-black text-sm text-slate-900">- 53</span>
            </div>
          </div>

          <div class="text-blue-600 text-lg font-black">⬇</div>

          <!-- Total Savings Capsule -->
          <div class="w-full py-2.5 px-6 rounded-full text-white font-black text-sm flex items-center justify-center gap-3 shadow-lg"
               style="background: linear-gradient(135deg, #0052CC 0%, #0284C7 100%);">
            <span class="text-xl">💰</span>
            <div class="leading-tight text-center">
              <span class="text-[10px] uppercase tracking-wider text-blue-100">Total Savings (BDT) - </span>
              <span class="text-lg font-extrabold text-amber-300">5.86 Crore</span>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: FY 26/27 -->
        <div class="flex flex-col items-center justify-between h-full gap-1.5">
          <div class="text-emerald-600 text-lg font-black">⬇</div>

          <!-- Total Projects Box -->
          <div class="w-full py-2 px-6 rounded-2xl bg-[#E8F8F0] border-2 border-emerald-300 flex items-center justify-center gap-3 shadow-sm">
            <span class="text-2xl">📄</span>
            <span class="text-lg font-black text-slate-800">Total Projects - <span class="text-[#00875A]">60</span></span>
          </div>

          <div class="text-emerald-600 text-lg font-black">⬇</div>

          <!-- Project Categorization Split Box -->
          <div class="w-full rounded-2xl border-2 border-[#68D391] bg-emerald-50/40 p-3 shadow-sm space-y-2">
            <div class="flex items-center justify-between py-1 px-3 rounded-xl bg-white shadow-xs">
              <span class="font-extrabold text-xs text-slate-800 flex items-center gap-2.5">
                <span class="w-6 h-6 rounded-full bg-[#FF6B00] text-white flex items-center justify-center text-xs">⭐</span>
                Major Projects
              </span>
              <span class="font-black text-sm text-slate-900">- 9</span>
            </div>
            <div class="flex items-center justify-between py-1 px-3 rounded-xl bg-white shadow-xs">
              <span class="font-extrabold text-xs text-slate-800 flex items-center gap-2.5">
                <span class="w-6 h-6 rounded-full bg-[#0052CC] text-white flex items-center justify-center text-xs">⚙️</span>
                Moderate Projects
              </span>
              <span class="font-black text-sm text-slate-900">- 16</span>
            </div>
            <div class="flex items-center justify-between py-1 px-3 rounded-xl bg-white shadow-xs">
              <span class="font-extrabold text-xs text-slate-800 flex items-center gap-2.5">
                <span class="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center text-xs">📊</span>
                Minor Projects
              </span>
              <span class="font-black text-sm text-slate-900">- 35</span>
            </div>
          </div>

          <div class="text-emerald-600 text-lg font-black">⬇</div>

          <!-- Total Savings Capsule -->
          <div class="w-full py-2.5 px-6 rounded-full text-white font-black text-sm flex items-center justify-center gap-3 shadow-lg"
               style="background: linear-gradient(135deg, #00875A 0%, #10B981 100%);">
            <span class="text-xl">💰</span>
            <div class="leading-tight text-center">
              <span class="text-[10px] uppercase tracking-wider text-emerald-100">Total Savings (BDT) - </span>
              <span class="text-lg font-extrabold text-amber-300">8.13 Crore</span>
              <span class="text-[9px] text-emerald-100 block font-normal">(Prediction)</span>
            </div>
          </div>
        </div>

      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-400 text-[9px]">
        <div>Walton AC Process Development &bull; Executive Project Scale &amp; Savings Closing</div>
        <div style="font-style: italic;">Walton Hi-Tech Industries PLC</div>
      </div>

    </div>`;
  },

  /**
   * Renders the Table of Contents Slide (Slide 2)
   */
  renderTableOfContentsSlide(month = "SEPTEMBER 2026", taskCount = 8) {
    const monthUpper = (month || "SEPTEMBER 2026").toUpperCase();
    return `
    <div class="walton-toc-slide bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200" 
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 30px 48px; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- HEADER -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
            <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z"/></svg>
          </div>
          <div>
            <div style="font-size: 13px; font-weight: 900; color: #0F172A;">PROCESS DEVELOPMENT DEPARTMENT</div>
            <div style="font-size: 8.5px; font-weight: 700; color: #64748B; letter-spacing: 0.18em;">INNOVATE &bull; IMPROVE &bull; DELIVER</div>
          </div>
        </div>
        <div class="text-right">
          <div style="font-size: 10px; font-weight: 700; color: #64748B;">SMALL CHANGES</div>
          <div style="font-size: 17px; font-weight: 900; color: #C5161D; line-height: 1;">BIG IMPACT</div>
        </div>
      </div>

      <!-- MAIN CONTENT (Fills 16:9 vertical space cleanly) -->
      <div class="flex-1 min-h-0 flex flex-col justify-between my-2 gap-3.5">
        <div class="flex-shrink-0">
          <div class="inline-block px-3.5 py-1 rounded-full bg-red-50 text-red-600 font-bold text-xs uppercase tracking-wider mb-1">
            EXECUTIVE AGENDA & OVERVIEW
          </div>
          <h2 style="font-size: 26px; font-weight: 900; color: #0F172A; margin: 0;">
            Table of Contents &bull; <span style="color: #C5161D;">Report Structure</span>
          </h2>
        </div>

        <div class="grid grid-cols-3 gap-5 flex-1 min-h-0 items-stretch">
          <!-- Item 1: Management Dashboard (Purple / Fuchsia Gradient - Image 3) -->
          <div class="rounded-2xl p-5 lg:p-6 transition flex flex-col justify-between shadow-md hover:shadow-xl relative overflow-hidden text-white"
               style="background: linear-gradient(135deg, #7C3AED 0%, #C026D3 100%);">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm text-white font-black text-base flex items-center justify-center shadow-sm border border-white/20">
                  01
                </div>
                <span class="text-[11px] font-mono font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-white">
                  Dashboard
                </span>
              </div>
              <h3 class="text-xl font-black text-white">Management Dashboard</h3>
              <p class="text-xs text-purple-100 mt-2 leading-relaxed font-medium">
                Plant-wide monthly financial cost savings, FY 26-27 cumulative impact, and 8 core engineering development KPIs.
              </p>
              <div class="mt-4 space-y-2 text-xs text-white/90 font-medium">
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Monthly Cost Savings: BDT 234,200</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> FY 26-27 Cumulative: BDT 2,812,151</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> 8 Core Development KPIs</div>
              </div>
            </div>
            <div class="pt-3 border-t border-white/20 mt-4 flex items-center justify-between text-xs">
              <span class="font-bold text-purple-100">Financial &amp; KPI Overview</span>
              <span class="font-mono font-extrabold text-white bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-0.5 rounded-full">Slide 3</span>
            </div>
          </div>

          <!-- Item 2: Task Slides (Sunset Orange Gradient - Image 3) -->
          <div class="rounded-2xl p-5 lg:p-6 transition flex flex-col justify-between shadow-md hover:shadow-xl relative overflow-hidden text-white"
               style="background: linear-gradient(135deg, #EA580C 0%, #F59E0B 100%);">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm text-white font-black text-base flex items-center justify-center shadow-sm border border-white/20">
                  02
                </div>
                <span class="text-[11px] font-mono font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-white">
                  1 Row = 1 Slide
                </span>
              </div>
              <h3 class="text-xl font-black text-white">Process Engineering Tasks</h3>
              <p class="text-xs text-amber-100 mt-2 leading-relaxed font-medium">
                Individual task breakdown slides (1 Row = 1 Slide) featuring split technical headlines, 4 key impacts, trend metrics, and photo evidence.
              </p>
              <div class="mt-4 space-y-2 text-xs text-white/90 font-medium">
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Focused Project Name Header</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> 4 Key Impact Points &amp; 3 Trend Pills</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Dual Before/After or Hero Photo Frame</div>
              </div>
            </div>
            <div class="pt-3 border-t border-white/20 mt-4 flex items-center justify-between text-xs">
              <span class="font-bold text-amber-100">${taskCount} Active Projects</span>
              <span class="font-mono font-extrabold text-white bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-0.5 rounded-full">Slides 4 &ndash; ${taskCount + 3}</span>
            </div>
          </div>

          <!-- Item 3: Top 5 Works (Emerald / Teal Gradient - Image 3) -->
          <div class="rounded-2xl p-5 lg:p-6 transition flex flex-col justify-between shadow-md hover:shadow-xl relative overflow-hidden text-white"
               style="background: linear-gradient(135deg, #059669 0%, #0D9488 100%);">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm text-white font-black text-base flex items-center justify-center shadow-sm border border-white/20">
                  03
                </div>
                <span class="text-[11px] font-mono font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-white">
                  Strategic
                </span>
              </div>
              <h3 class="text-xl font-black text-white">Top 5 Works &amp; Projects</h3>
              <p class="text-xs text-emerald-100 mt-2 leading-relaxed font-medium">
                Summary of top 5 completed development works and strategic ongoing automation projects tracking milestones and deadlines.
              </p>
              <div class="mt-4 space-y-2 text-xs text-white/90 font-medium">
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Top 5 Completed Process Works</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Top 5 Strategic Line Automation Projects</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Progress Status &amp; Tentative Deadlines</div>
              </div>
            </div>
            <div class="pt-3 border-t border-white/20 mt-4 flex items-center justify-between text-xs">
              <span class="font-bold text-emerald-100">Strategic Projects Summary</span>
              <span class="font-mono font-extrabold text-white bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-0.5 rounded-full">Slide ${taskCount + 4}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER (PROCESS DEVELOPMENT DEPARTMENT ONLY - 2 TAGLINES) -->
      <div class="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold flex-shrink-0">
        <div class="text-slate-800 font-bold uppercase tracking-wider">⚙ PROCESS DEVELOPMENT DEPARTMENT</div>
        <div class="flex items-center gap-4 text-slate-500">
          <span>🏆 Continuous Improvement</span>
          <span>•</span>
          <span>💡 A Smarter Tomorrow</span>
        </div>
        <div class="text-red-600 font-mono font-bold">${monthUpper}</div>
      </div>

    </div>`;
  },

  /**
   * Renders the Executive Management Dashboard Slide (Slide 3, replicating Image 1)
   */
  renderExecutiveDashboardSlide(month = "SEPTEMBER 2026", data = null) {
    const monthUpper = (month || "SEPTEMBER 2026").toUpperCase();
    
    // 1. Resolve Monthly Cost Savings (Prioritize passed data, fallback to CostSavingTracker)
    let savings = (data && data.monthlySavings);
    let currentImpact = (data && data.currentImpact);
    let currentMonthLabel = (data && data.currentMonthLabel) || monthUpper;
    let yearlyImpact = (data && data.yearlyImpact);

    if (!savings || !currentImpact || !yearlyImpact) {
      if (typeof CostSavingTracker !== 'undefined') {
        const ct = CostSavingTracker.calculate([], month);
        savings = savings || ct.monthlySavings || ct.monthlySavingsTable;
        currentImpact = currentImpact || ct.currentImpact || ct.displayMonthlySaving;
        yearlyImpact = yearlyImpact || ct.yearlyImpact || ct.displayCumulativeYTD;
      }
    }

    if (!Array.isArray(savings)) {
      savings = [
        { m: "April", val: "BDT 0" },
        { m: "May", val: "BDT 0" },
        { m: "June", val: "BDT 0" },
        { m: "July", val: "BDT 0" },
        { m: "August", val: "BDT 0" },
        { m: "September", val: "BDT 0" }
      ];
      currentImpact = currentImpact || "0 TK";
      yearlyImpact = yearlyImpact || "0 TK";
    }

    // 2. Dynamic Category Counting for the 8 KPI Cards
    let kpis = (data && data.kpis);
    if (!kpis) {
      let tasksList = (data && (data.slides || data.tasks));
      if (!tasksList && typeof MonthWorkbookManager !== 'undefined') {
        try {
          const mgr = new MonthWorkbookManager();
          tasksList = mgr.getTasksForMonth(month);
        } catch(e) {}
      }
      tasksList = tasksList || [];

      let processCount = 0;
      let toolsCount = 0;
      let partsCount = 0;
      let costCount = 0;
      let manpowerCount = 0;
      let bomCount = 0;
      let completedCount = 0;
      let ongoingCount = 0;

      tasksList.forEach(t => {
        const cat = (t.category || '').toLowerCase();
        const title = (t.slide_title || t.task_name || '').toLowerCase();
        const status = (t.status || '').toLowerCase();

        if (cat.includes('process') || title.includes('process')) processCount++;
        if (cat.includes('tool') || title.includes('tool') || title.includes('die') || title.includes('fixture')) toolsCount++;
        if (cat.includes('part') || cat.includes('component') || title.includes('part')) partsCount++;
        if (cat.includes('cost') || cat.includes('saving') || title.includes('cost') || title.includes('saving')) costCount++;
        if (cat.includes('manpower') || title.includes('manpower')) manpowerCount++;
        if (cat.includes('bom') || title.includes('bom')) bomCount++;

        if (status.includes('complete') || status.includes('done')) {
          completedCount++;
        } else {
          ongoingCount++;
        }
      });

      // Check top works manager for ongoing if needed
      if (ongoingCount === 0 && typeof TopWorksManager !== 'undefined') {
        const tw = TopWorksManager.getTopWorksForMonth(month);
        if (tw && tw.ongoingTop5) {
          ongoingCount = tw.ongoingTop5.filter(p => p.name && p.name.trim()).length;
        }
      }

      kpis = [
        { val: `${processCount}`, label: "Process Developed", note: null },
        { val: `${toolsCount}`, label: "Tools Developed", note: null },
        { val: `${partsCount}`, label: "Parts Developed", note: null },
        { val: `${costCount}`, label: "Cost Optimisation", note: (yearlyImpact && yearlyImpact !== "0 TK" ? `Cost Saved: BDT ${yearlyImpact}/Year` : null) },
        { val: `${manpowerCount}`, label: "Manpower Optimization", note: null },
        { val: `${bomCount}`, label: "BOM Verification", note: null },
        { val: `${completedCount}`, label: "Completed Projects", note: (currentImpact && currentImpact !== "0 TK" ? `Cost Saved: ${currentImpact}` : null) },
        { val: `${ongoingCount}`, label: "New Projects / Ongoing", note: "Cost Save Scope: Target FY 26-27" }
      ];
    }

    return `
    <div class="walton-dashboard-slide bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200" 
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 22px 36px 16px 36px; display: flex; flex-direction: column; justify-content: space-between; background: #FFFFFF;">
      
      <!-- TOP HEADER BAR -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-2 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 flex-shrink-0">
            <svg viewBox="0 0 40 40" fill="none" class="w-full h-full">
              <path d="M20 2L38 20L20 38L2 20Z" fill="#C5161D"/>
              <path d="M20 2L38 20L20 20Z" fill="#E11D48"/>
              <path d="M2 20L20 20L20 38Z" fill="#991B1B"/>
              <path d="M20 20L38 20L20 38Z" fill="#B91C1C"/>
              <path d="M20 7L33 20L20 33L7 20Z" fill="#FFFFFF" fill-opacity="0.25"/>
            </svg>
          </div>
          <div>
            <div style="font-size: 13.5px; font-weight: 900; color: #0F172A; letter-spacing: 0.04em;">PROCESS DEVELOPMENT DEPARTMENT</div>
            <div style="font-size: 8.5px; font-weight: 700; color: #64748B; letter-spacing: 0.18em;">INNOVATE &bull; IMPROVE &bull; DELIVER</div>
          </div>
        </div>
        <div class="text-right">
          <div style="font-size: 9.5px; font-weight: 700; color: #64748B; letter-spacing: 0.08em;">SMALL CHANGES</div>
          <div style="font-size: 17px; font-weight: 900; color: #C5161D; line-height: 1; letter-spacing: 0.02em;">BIG IMPACT</div>
        </div>
      </div>

      <!-- SUBHEADER TITLE BAR (Matching Image 2) -->
      <div class="flex items-center gap-3 my-1.5 flex-shrink-0">
        <span class="ac-product-dashboard" data-title="AC Product Dashboard" style="background: #FEE2E2; color: #C5161D; border: 1px solid #FCA5A5; font-size: 11px; font-weight: 800; padding: 3.5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
          AC PRODUCT &bull; MANAGEMENT DASHBOARD <!-- AC Product Dashboard -->
        </span>
        <h2 style="font-size: 21px; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.2;">
          Executive Performance &amp; Cost Savings
        </h2>
      </div>

      <!-- MAIN CONTENT: UPPER SECTION (TABLE + 2 FINANCIAL IMPACT CARDS) -->
      <div style="display: grid; grid-template-columns: 4.4fr 3.8fr 3.8fr; gap: 16px; margin: 4px 0 10px 0; min-height: 175px; align-items: stretch; flex: 1.1;">
        
        <!-- Left: Monthly Savings Table -->
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="background: #0F172A; color: #FFFFFF; padding: 7px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; flex-shrink: 0;">
            <span>Month</span>
            <span>Impact (BDT)</span>
          </div>
          <div style="display: flex; flex-direction: column; justify-content: space-around; flex: 1; padding: 2px 0;">
            ${savings.map((s, idx) => `
              <div style="padding: 5px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; font-weight: 600; color: #334155; border-bottom: ${idx === savings.length - 1 ? 'none' : '1px solid #F1F5F9'}; background: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
                <span>${s.m}</span>
                <span style="font-family: 'JetBrains Mono', monospace; font-weight: 800; color: #0F172A;">${s.val}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Middle: Monthly Financial Impact Card (Sunset Orange Gradient - High Contrast) -->
        <div style="background: linear-gradient(135deg, #EA580C 0%, #F59E0B 100%); border-radius: 14px; padding: 16px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 14px rgba(234,88,12,0.22); color: #FFFFFF;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="background: #FFFFFF; color: #9A3412; padding: 3.5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 900; font-family: 'JetBrains Mono', monospace; box-shadow: 0 2px 5px rgba(0,0,0,0.12); display: flex; align-items: center; gap: 5px;">🪙 ${currentMonthLabel}</span>
            <span style="background: rgba(0,0,0,0.25); color: #FFFFFF; padding: 3px 10px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; border: 1px solid rgba(255,255,255,0.25); letter-spacing: 0.5px;">MONTHLY SAVINGS</span>
          </div>
          <div style="margin: 6px 0;">
            <div style="font-size: 38px; font-weight: 900; color: #FFFFFF; font-family: 'JetBrains Mono', monospace; line-height: 1.05; letter-spacing: -0.5px; text-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              ${currentImpact}
            </div>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 900; color: #FFFFFF; line-height: 1.2; text-shadow: 0 1px 3px rgba(0,0,0,0.25);">Monthly Financial Impact</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #FFF7ED; margin-top: 2px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">Plant-wide Optimization (100% Realized)</div>
          </div>
        </div>

        <!-- Right: Yearly Cumulative Impact Card (Emerald / Teal Gradient - High Contrast) -->
        <div style="background: linear-gradient(135deg, #059669 0%, #0D9488 100%); border-radius: 14px; padding: 16px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 14px rgba(5,150,105,0.22); color: #FFFFFF;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="background: #FFFFFF; color: #065F46; padding: 3.5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 900; font-family: 'JetBrains Mono', monospace; box-shadow: 0 2px 5px rgba(0,0,0,0.12); display: flex; align-items: center; gap: 5px;">📈 YEARLY IMPACT (FY 26-27)</span>
            <span style="background: rgba(0,0,0,0.25); color: #FFFFFF; padding: 3px 10px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; border: 1px solid rgba(255,255,255,0.25); letter-spacing: 0.5px;">CUMULATIVE YTD</span>
          </div>
          <div style="margin: 6px 0;">
            <div style="font-size: 38px; font-weight: 900; color: #FFFFFF; font-family: 'JetBrains Mono', monospace; line-height: 1.05; letter-spacing: -0.5px; text-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              ${yearlyImpact}
            </div>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 900; color: #FFFFFF; line-height: 1.2; text-shadow: 0 1px 3px rgba(0,0,0,0.25);">Cumulative Realized Savings</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #F0FDF4; margin-top: 2px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">Direct Process Engineering Value Add</div>
          </div>
        </div>

      </div>

      <!-- LOWER SECTION: 8 COLORFUL KPI METRIC CARDS (4x2 Grid) -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(2, 1fr); gap: 12px; min-height: 175px; align-items: stretch; flex: 1;">
        ${(() => {
          const kpiPalettes = [
            { bg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: '#60A5FA', valColor: '#1D4ED8', labelColor: '#1E3A8A', shadow: 'rgba(59,130,246,0.14)', icon: '⚙️' },
            { bg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', border: '#818CF8', valColor: '#4338CA', labelColor: '#312E81', shadow: 'rgba(99,102,241,0.14)', icon: '🔧' },
            { bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '#34D399', valColor: '#047857', labelColor: '#064E3B', shadow: 'rgba(16,185,129,0.14)', icon: '🔩' },
            { bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '#FBBF24', valColor: '#B45309', labelColor: '#78350F', shadow: 'rgba(245,158,11,0.14)', icon: '💰' },
            { bg: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)', border: '#C084FC', valColor: '#7E22CE', labelColor: '#581C87', shadow: 'rgba(168,85,247,0.14)', icon: '👥' },
            { bg: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)', border: '#FB7185', valColor: '#BE123C', labelColor: '#881337', shadow: 'rgba(244,63,94,0.14)', icon: '📋' },
            { bg: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', border: '#F87171', valColor: '#B91C1C', labelColor: '#7F1D1D', shadow: 'rgba(239,68,68,0.16)', icon: '🏆' },
            { bg: 'linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)', border: '#22D3EE', valColor: '#0E7490', labelColor: '#164E63', shadow: 'rgba(6,182,212,0.14)', icon: '🚀' }
          ];
          return kpis.map((k, idx) => {
            const pal = kpiPalettes[idx % kpiPalettes.length];
            return `
            <div style="background: ${pal.bg}; border: 1.5px solid ${pal.border}; border-radius: 12px; padding: 10px 16px; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 3px 8px ${pal.shadow}; position: relative; overflow: hidden;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 32px; font-weight: 900; color: ${pal.valColor}; font-family: 'JetBrains Mono', monospace; line-height: 1;">${k.val}</div>
                <span style="font-size: 16px; opacity: 0.85;">${pal.icon}</span>
              </div>
              <div style="font-size: 13px; font-weight: 800; color: ${pal.labelColor}; margin-top: 5px; line-height: 1.2;">${k.label}</div>
              ${k.note ? `<div style="font-size: 10.5px; font-weight: 800; color: ${pal.valColor}; margin-top: 3px; line-height: 1.2; background: rgba(255,255,255,0.75); padding: 1.5px 6px; border-radius: 6px; display: inline-block; width: fit-content; border: 1px solid rgba(0,0,0,0.06);">${k.note}</div>` : ''}
            </div>
            `;
          }).join('');
        })()}
      </div>

      <!-- FOOTER (PROCESS DEVELOPMENT DEPARTMENT ONLY - 2 TAGLINES) -->
      <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] font-semibold flex-shrink-0">
        <div class="font-bold text-[#0F172A] uppercase tracking-wider">⚙ PROCESS DEVELOPMENT DEPARTMENT</div>
        <div class="flex items-center gap-4 text-slate-500">
          <span>🏆 Continuous Improvement</span>
          <span>•</span>
          <span>💡 A Smarter Tomorrow</span>
        </div>
        <div class="text-red-600 font-mono font-bold">${monthUpper}</div>
      </div>

    </div>`;
  },

  /**
   * Renders Top 5 Works & Projects Slide (Last Slide, replicating Image 2)
   */
  renderTopWorksSummarySlide(month = "SEPTEMBER 2026", data = null) {
    const monthUpper = (month || "SEPTEMBER 2026").toUpperCase();

    // Resolve Top Works Data (Prioritize passed data, fallback to TopWorksManager)
    let completedTop5 = (data && data.completedTop5);
    let ongoingTop5 = (data && data.ongoingTop5);

    if ((!completedTop5 || !ongoingTop5) && typeof TopWorksManager !== 'undefined') {
      const tw = TopWorksManager.getTopWorksForMonth(month);
      completedTop5 = completedTop5 || tw.completedTop5;
      ongoingTop5 = ongoingTop5 || tw.ongoingTop5;
    }

    completedTop5 = completedTop5 || [
      "Compressor Jacket Foil Cutting System Development",
      "Die Development for new design Compressor Jacket",
      "Double Coating trial, process and BOM confirmation",
      "Reduce Tolerance of Hollow Plug Pin",
      "MPE Tube Acid Treatment process development"
    ];

    ongoingTop5 = ongoingTop5 || [
      { sl: 1, name: "CNC Tube Bending & End Shaping M/C Automation Development", progress: "Trail run and modification ongoing", deadline: "Oct, 2026" },
      { sl: 2, name: "CNC Turret Punch Machine Project", progress: "Machine manufacturing almost done; PSI preparation ongoing", deadline: "Oct, 2026" },
      { sl: 3, name: "Evaporator Brazing Fixture for without water brazing", progress: "One model running under observation and working for rest model", deadline: "Sep, 2026" },
      { sl: 4, name: "MPE Tube rust repair process development", progress: "Mass production trial ongoing", deadline: "Oct, 2026" },
      { sl: 5, name: "New fin material (Aluzinc Sheet) supplier (MAX) development for Evaporator and condenser", progress: "All test completed, Trial production lot order is ongoing", deadline: "Dec, 2026" }
    ];

    return `
    <div class="walton-top5-slide bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200" 
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 25px 40px; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- HEADER -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 flex-shrink-0">
            <svg viewBox="0 0 40 40" fill="none" class="w-full h-full">
              <path d="M20 2L38 20L20 38L2 20Z" fill="#C5161D"/>
              <path d="M20 2L38 20L20 20Z" fill="#E11D48"/>
              <path d="M2 20L20 20L20 38Z" fill="#991B1B"/>
              <path d="M20 20L38 20L20 38Z" fill="#B91C1C"/>
              <path d="M20 7L33 20L20 33L7 20Z" fill="#FFFFFF" fill-opacity="0.25"/>
            </svg>
          </div>
          <div>
            <div style="font-size: 13px; font-weight: 900; color: #0F172A;">PROCESS DEVELOPMENT DEPARTMENT</div>
            <div style="font-size: 8.5px; font-weight: 700; color: #64748B; letter-spacing: 0.18em;">INNOVATE &bull; IMPROVE &bull; DELIVER</div>
          </div>
        </div>

        <div class="px-4 py-1.5 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-sm">
          Top 5 WORKS & PROJECTS
        </div>

        <div class="text-right">
          <div style="font-size: 9.5px; font-weight: 700; color: #64748B;">SMALL CHANGES</div>
          <div style="font-size: 16px; font-weight: 900; color: #C5161D; line-height: 1;">BIG IMPACT</div>
        </div>
      </div>

      <!-- MAIN CONTENT: 2 SECTIONS (Fills vertical height cleanly without empty voids) -->
      <div class="flex-1 min-h-0 flex flex-col justify-between my-2 gap-3.5">
        
        <!-- SECTION 1: COMPLETED WORKS (TOP FIVE) -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <div class="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">⚙️</div>
            <h3 class="text-xs font-black text-[#0F172A] uppercase tracking-wide">Development Works Completed (Top Five)</h3>
          </div>
          <div class="grid grid-cols-5 gap-3 items-stretch">
            ${completedTop5.map((item, idx) => {
              const palettes = [
                { bg: 'linear-gradient(135deg, #991B1B 0%, #C5161D 100%)', border: '#EF4444', shadow: 'rgba(197, 22, 29, 0.35)' },
                { bg: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', border: '#60A5FA', shadow: 'rgba(37, 99, 235, 0.35)' },
                { bg: 'linear-gradient(135deg, #065F46 0%, #059669 100%)', border: '#34D399', shadow: 'rgba(5, 150, 105, 0.35)' },
                { bg: 'linear-gradient(135deg, #C2410C 0%, #D97706 100%)', border: '#FBBF24', shadow: 'rgba(217, 119, 6, 0.35)' },
                { bg: 'linear-gradient(135deg, #581C87 0%, #7C3AED 100%)', border: '#A78BFA', shadow: 'rgba(124, 58, 237, 0.35)' }
              ];
              const pal = palettes[idx % palettes.length];
              const hasItem = item && item.trim();
              return `
              <div class="rounded-xl p-3.5 flex flex-col justify-between shadow-md transition h-full min-h-[118px] text-white relative overflow-hidden group hover:scale-[1.02] duration-200"
                   style="background: ${pal.bg}; border: 1.5px solid ${pal.border}; box-shadow: 0 6px 16px ${pal.shadow};">
                <div class="flex items-center justify-between mb-1.5 relative z-10">
                  <div class="w-6 h-6 rounded-lg bg-white/25 backdrop-blur-sm text-white font-black text-xs flex items-center justify-center border border-white/35 shadow-sm">
                    0${idx + 1}
                  </div>
                </div>
                <div class="text-[14.5px] sm:text-[15.5px] font-black text-white leading-snug my-auto drop-shadow-sm line-clamp-3 relative z-10 tracking-tight">
                  ${hasItem ? item : '— (Pending completion)'}
                </div>
                <div class="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-white/10 pointer-events-none"></div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- SECTION 2: ON-GOING WORKS (TOP FIVE) -->
        <div class="flex-1 min-h-0 flex flex-col justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px]">📋</div>
            <h3 class="text-xs font-black text-[#0F172A] uppercase tracking-wide">On-going Works (Top Five):</h3>
          </div>
          <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 min-h-0 flex flex-col justify-between">
            <table class="w-full text-xs border-collapse h-full">
              <thead class="bg-[#0F172A] text-white font-bold text-[12px] uppercase tracking-wider">
                <tr>
                  <th class="py-2.5 px-1.5 w-9 text-center">Sl</th>
                  <th class="py-2.5 px-3.5 text-left w-[42%]">Project Name</th>
                  <th class="py-2.5 px-3.5 text-left w-[40%]">Progress</th>
                  <th class="py-2.5 px-2.5 text-center w-[15%]">Tentative Deadline</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${ongoingTop5.map((p, idx) => {
                  const hasName = p.name && p.name.trim();
                  return `
                  <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-red-50/20 transition">
                    <td class="py-2.5 px-2 text-center font-bold text-red-600 font-mono align-middle text-[13px]">${p.sl || idx + 1}</td>
                    <td class="py-2.5 px-3.5 text-[13.5px] ${hasName ? 'font-bold text-[#0F172A]' : 'font-medium text-slate-400 italic'} align-middle">${hasName ? p.name : '—'}</td>
                    <td class="py-2.5 px-3.5 text-[13px] ${p.progress && p.progress.trim() ? 'text-slate-700 font-semibold' : 'text-slate-400 italic'} align-middle">${p.progress && p.progress.trim() ? p.progress : '—'}</td>
                    <td class="py-2.5 px-2.5 text-center font-mono font-bold text-slate-700 align-middle">
                      <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11.5px] font-bold">
                        ${p.deadline && p.deadline.trim() ? p.deadline : '—'}
                      </span>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- FOOTER -->
      <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] font-semibold text-slate-400 flex-shrink-0">
        <div class="flex items-center gap-2">
          <span class="font-bold text-[#0F172A]">⚙ PROCESS DEVELOPMENT DEPARTMENT</span>
        </div>
        <div class="flex items-center gap-4">
          <span>🏆 Continuous Improvement</span>
          <span>&bull;</span>
          <span>👥 Stronger Together</span>
        </div>
        <div class="text-red-600 font-mono font-bold">${monthUpper}</div>
      </div>

    </div>`;
  },

  /**
   * Pattern 2: Industrial Innovation Blue Cover Slide
   */
  renderIndustrialBlueCoverSlide(month = "SEPTEMBER 2026") {
    const monthUpper = (month || "SEPTEMBER 2026").toUpperCase();
    return `
    <div class="walton-executive-cover walton-blue-cover bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200"
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 36px 52px; display: flex; flex-direction: column; justify-content: space-between; position: relative; background: #FFFFFF;">
      
      <!-- TOP-LEFT GEOMETRIC CHEVRONS (ORANGE & COBALT BLUE - IMAGE 2) -->
      <div style="position: absolute; top: 0; left: 0; z-index: 10; pointer-events: none;">
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <polygon points="0,0 160,0 65,95 0,95" fill="#FF6B00" />
          <polygon points="0,22 205,0 240,0 110,130 0,130" fill="#0052CC" />
        </svg>
      </div>

      <!-- Top Right Identifier -->
      <div class="text-right z-10">
        <span class="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">WALTON AC PROCESS DEVELOPMENT</span>
      </div>

      <!-- CENTER STAGE (IMAGE 2 REPLICA) -->
      <div class="flex-1 flex flex-col items-center justify-center text-center z-10 py-2">
        <!-- Walton Logo & Slogan -->
        <div class="flex flex-col items-center justify-center mb-1">
          <img src="assets/img/walton_logo.png" alt="WALTON" class="h-16 w-auto object-contain drop-shadow-sm mb-1"
               onerror="this.style.display='none'; document.getElementById('walton-logo-blue-cover-fallback').style.display='flex';" />
          <div id="walton-logo-blue-cover-fallback" style="display:none;" class="items-center gap-2 mb-1">
            <svg class="h-10 w-10" viewBox="0 0 40 40" fill="none">
              <polygon points="2,20 20,2 20,20" fill="#0052CC" />
              <polygon points="20,2 38,20 20,20" fill="#C5161D" />
              <polygon points="2,20 20,38 20,20" fill="#0052CC" />
              <polygon points="20,38 38,20 20,20" fill="#C5161D" />
            </svg>
            <span class="text-3xl font-black text-[#0052CC] tracking-wider">WALTON</span>
          </div>

          <div class="flex items-center justify-center gap-3 my-1">
            <span class="w-16 h-[1.5px] bg-slate-300 inline-block"></span>
            <span class="text-[11px] font-bold text-slate-500 tracking-[0.25em] uppercase font-mono">BETTER PRODUCTS &nbsp;|&nbsp; BRIGHTER FUTURE</span>
            <span class="w-16 h-[1.5px] bg-slate-300 inline-block"></span>
          </div>
        </div>

        <!-- Main Title: DEPARTMENTAL PROJECTS -->
        <h1 style="font-size: 40px; font-weight: 900; color: #0B2038; letter-spacing: -0.01em; margin: 12px 0 6px 0; text-transform: uppercase; line-height: 1.1;">
          DEPARTMENTAL PROJECTS
        </h1>

        <!-- Sleek Cobalt Blue Pill Badge with White Accent (Image 2) -->
        <div class="inline-flex items-center justify-center px-7 py-1.5 rounded-full font-black text-sm tracking-wider uppercase text-white shadow-md my-2"
             style="background: linear-gradient(135deg, #0052CC 0%, #0284C7 100%); border: 1px solid rgba(255, 255, 255, 0.4);">
          <span>PROCESS DEVELOPMENT</span>
          <span class="ml-2.5 w-1.5 h-3.5 bg-cyan-300 inline-block transform skew-x-[-20deg]"></span>
        </div>

        <!-- Corporate Entity & Location -->
        <div style="font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 8px;">
          Walton Hi-Tech Industries PLC.
        </div>
        <div class="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 mt-1">
          <svg class="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
          <span>Chandra, Kaliakoir, Gazipur, Bangladesh</span>
        </div>

        <!-- Month Pill -->
        <div class="mt-2.5">
          <span class="px-3.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-[11px] font-mono font-bold text-sky-800 shadow-xs">
            ${monthUpper} &bull; INDUSTRIAL BLUE EDITION
          </span>
        </div>
      </div>

      <!-- BOTTOM FACTORY SKYLINE & DUAL FLOWING WAVES (ORANGE UPPER & COBALT BLUE LOWER - IMAGE 2) -->
      <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 160px; pointer-events: none; overflow: hidden; z-index: 1;">
        <svg viewBox="0 0 1200 240" preserveAspectRatio="none" style="width: 100%; height: 100%;">
          <!-- Industrial Plant & City Silhouette -->
          <g fill="#CBD5E1" opacity="0.6">
            <rect x="730" y="70" width="40" height="90" />
            <rect x="780" y="50" width="70" height="110" />
            <rect x="860" y="30" width="50" height="130" />
            <rect x="920" y="75" width="80" height="85" />
            <polygon points="780,50 815,30 850,50" />
            <rect x="1010" y="60" width="45" height="100" />
          </g>
          <g fill="#94A3B8" opacity="0.75">
            <rect x="810" y="90" width="130" height="70" rx="4" />
            <rect x="950" y="100" width="90" height="60" rx="4" />
            <line x1="820" y1="50" x2="820" y2="90" stroke="#0284C7" stroke-width="4" />
            <line x1="840" y1="40" x2="840" y2="90" stroke="#0284C7" stroke-width="4" />
          </g>
          <!-- Trees / Green landscaping -->
          <g fill="#10B981" opacity="0.8">
            <circle cx="700" cy="160" r="15" />
            <circle cx="725" cy="155" r="18" />
            <circle cx="755" cy="160" r="14" />
            <circle cx="1070" cy="160" r="18" />
            <circle cx="1100" cy="155" r="15" />
          </g>
          <!-- Dual Waves: Orange Upper Wave & Cobalt Blue Lower Wave (Image 2) -->
          <path d="M0,170 C300,150 650,195 950,165 C1080,152 1150,160 1200,165 L1200,240 L0,240 Z" fill="#FF6B00" />
          <path d="M0,185 C250,170 600,210 900,180 C1050,168 1140,176 1200,180 L1200,240 L0,240 Z" fill="#0052CC" />
        </svg>
      </div>

    </div>`;
  },

  /**
   * Pattern 2: Industrial Innovation Blue Table of Contents Slide
   */
  renderIndustrialBlueTableOfContentsSlide(month = "SEPTEMBER 2026", taskCount = 8) {
    const monthUpper = (month || "SEPTEMBER 2026").toUpperCase();
    return `
    <div class="walton-toc-slide walton-blue-toc bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200" 
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 30px 48px; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- HEADER -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-shrink-0">
        <div class="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" class="flex-shrink-0">
            <polygon points="20,2 38,20 20,20" fill="#0284C7" />
            <polygon points="2,20 20,2 20,20" fill="#2563EB" />
            <polygon points="2,20 20,38 20,20" fill="#1D4ED8" />
            <polygon points="20,38 38,20 20,20" fill="#38BDF8" />
          </svg>
          <div>
            <div style="font-size: 13px; font-weight: 900; color: #0F172A;">PROCESS DEVELOPMENT DEPARTMENT</div>
            <div style="font-size: 8.5px; font-weight: 700; color: #64748B; letter-spacing: 0.18em;">INNOVATION &bull; EFFICIENCY &bull; SUSTAINABILITY</div>
          </div>
        </div>
        <div class="text-right">
          <div style="font-size: 10px; font-weight: 700; color: #64748B;">CONTINUOUS IMPROVEMENT</div>
          <div style="font-size: 16px; font-weight: 900; color: #0052CC; line-height: 1;">FOR BETTER PRODUCTION</div>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="flex-1 min-h-0 flex flex-col justify-between my-2 gap-3.5">
        <div class="flex-shrink-0">
          <div class="inline-block px-3.5 py-1 rounded-full bg-sky-50 text-sky-700 font-bold text-xs uppercase tracking-wider mb-1">
            INDUSTRIAL AGENDA &amp; ARCHITECTURE
          </div>
          <h2 style="font-size: 26px; font-weight: 900; color: #0F172A; margin: 0;">
            Table of Contents &bull; <span style="color: #0052CC;">Report Structure</span>
          </h2>
        </div>

        <div class="grid grid-cols-3 gap-5 flex-1 min-h-0 items-stretch">
          <!-- Item 1: Management Dashboard (Purple / Fuchsia Gradient - Image 3) -->
          <div class="rounded-2xl p-5 lg:p-6 transition flex flex-col justify-between shadow-md hover:shadow-xl relative overflow-hidden text-white"
               style="background: linear-gradient(135deg, #7C3AED 0%, #C026D3 100%);">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm text-white font-black text-base flex items-center justify-center shadow-sm border border-white/20">
                  01
                </div>
                <span class="text-[11px] font-mono font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-white">
                  Dashboard
                </span>
              </div>
              <h3 class="text-xl font-black text-white">Management Dashboard</h3>
              <p class="text-xs text-purple-100 mt-2 leading-relaxed font-medium">
                Plant-wide monthly financial cost savings, cumulative realized savings, and 8 core engineering development KPIs with industrial monitoring.
              </p>
              <div class="mt-4 space-y-2 text-xs text-white/90 font-medium">
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Monthly Cost Savings Realized</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Yearly Impact &amp; Cumulative YTD</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> 8 Core Development KPIs</div>
              </div>
            </div>
            <div class="pt-3 border-t border-white/20 mt-4 flex items-center justify-between text-xs">
              <span class="font-bold text-purple-100">Financial Overview</span>
              <span class="font-mono font-extrabold text-white bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-0.5 rounded-full">Slide 3</span>
            </div>
          </div>

          <!-- Item 2: Task Slides (Sunset Orange Gradient - Image 3) -->
          <div class="rounded-2xl p-5 lg:p-6 transition flex flex-col justify-between shadow-md hover:shadow-xl relative overflow-hidden text-white"
               style="background: linear-gradient(135deg, #EA580C 0%, #F59E0B 100%);">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm text-white font-black text-base flex items-center justify-center shadow-sm border border-white/20">
                  02
                </div>
                <span class="text-[11px] font-mono font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-white">
                  1 Row = 1 Slide
                </span>
              </div>
              <h3 class="text-xl font-black text-white">Process Engineering Tasks</h3>
              <p class="text-xs text-amber-100 mt-2 leading-relaxed font-medium">
                Individual task breakdown slides (1 Row = 1 Slide) featuring industrial specifications, 4 key impacts, trend metrics, and photo verification.
              </p>
              <div class="mt-4 space-y-2 text-xs text-white/90 font-medium">
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> High-Tech Blue Industrial Layout</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> 4 Key Impact Points &amp; Trend Cards</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Dual Before/After or Hero Photo Frame</div>
              </div>
            </div>
            <div class="pt-3 border-t border-white/20 mt-4 flex items-center justify-between text-xs">
              <span class="font-bold text-amber-100">${taskCount} Active Projects</span>
              <span class="font-mono font-extrabold text-white bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-0.5 rounded-full">Slides 4 &ndash; ${taskCount + 3}</span>
            </div>
          </div>

          <!-- Item 3: Top 5 Works (Emerald / Teal Gradient - Image 3) -->
          <div class="rounded-2xl p-5 lg:p-6 transition flex flex-col justify-between shadow-md hover:shadow-xl relative overflow-hidden text-white"
               style="background: linear-gradient(135deg, #059669 0%, #0D9488 100%);">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm text-white font-black text-base flex items-center justify-center shadow-sm border border-white/20">
                  03
                </div>
                <span class="text-[11px] font-mono font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-white">
                  Strategic
                </span>
              </div>
              <h3 class="text-xl font-black text-white">Top 5 Works &amp; Projects</h3>
              <p class="text-xs text-emerald-100 mt-2 leading-relaxed font-medium">
                High-impact summary tracking the top 5 completed process works and 5 strategic line automation projects with milestones and target dates.
              </p>
              <div class="mt-4 space-y-2 text-xs text-white/90 font-medium">
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Top 5 Completed Process Works</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Top 5 Strategic Line Automation Projects</div>
                <div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">✔</span> Progress Status &amp; Tentative Deadlines</div>
              </div>
            </div>
            <div class="pt-3 border-t border-white/20 mt-4 flex items-center justify-between text-xs">
              <span class="font-bold text-emerald-100">Strategic Milestone Tracking</span>
              <span class="font-mono font-extrabold text-white bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-0.5 rounded-full">Slide ${taskCount + 4}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER (PROCESS DEVELOPMENT DEPARTMENT ONLY - 2 TAGLINES) -->
      <div class="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold flex-shrink-0">
        <div class="text-slate-800 font-bold uppercase tracking-wider">⚙ PROCESS DEVELOPMENT DEPARTMENT</div>
        <div class="flex items-center gap-4 text-slate-500">
          <span>🏆 Continuous Improvement</span>
          <span>•</span>
          <span>💡 A Smarter Tomorrow</span>
        </div>
        <div class="text-[#0052CC] font-mono font-bold">${monthUpper}</div>
      </div>

    </div>`;
  },

  /**
   * Pattern 2: Industrial Innovation Blue Dashboard Slide
   */
  renderIndustrialBlueDashboardSlide(month = "SEPTEMBER 2026", data = null) {
    const monthUpper = (month || "SEPTEMBER 2026").toUpperCase();
    
    let savings = (data && data.monthlySavings);
    let currentImpact = (data && data.currentImpact);
    let currentMonthLabel = (data && data.currentMonthLabel) || monthUpper;
    let yearlyImpact = (data && data.yearlyImpact);

    if (!savings || !currentImpact || !yearlyImpact) {
      if (typeof CostSavingTracker !== 'undefined') {
        const ct = CostSavingTracker.calculate([], month);
        savings = savings || ct.monthlySavings || ct.monthlySavingsTable;
        currentImpact = currentImpact || ct.currentImpact || ct.displayMonthlySaving;
        yearlyImpact = yearlyImpact || ct.yearlyImpact || ct.displayCumulativeYTD;
      }
    }

    if (!Array.isArray(savings)) {
      savings = [
        { m: "April", val: "BDT 0" },
        { m: "May", val: "BDT 0" },
        { m: "June", val: "BDT 0" },
        { m: "July", val: "BDT 0" },
        { m: "August", val: "BDT 0" },
        { m: "September", val: "BDT 0" }
      ];
      currentImpact = currentImpact || "0 TK";
      yearlyImpact = yearlyImpact || "0 TK";
    }

    let kpis = (data && data.kpis);
    if (!kpis) {
      let tasksList = (data && (data.slides || data.tasks)) || [];
      let processCount = 0, toolsCount = 0, partsCount = 0, costCount = 0, manpowerCount = 0, bomCount = 0, completedCount = 0, ongoingCount = 0;

      tasksList.forEach(t => {
        const cat = (t.category || '').toLowerCase();
        const title = (t.slide_title || t.task_name || '').toLowerCase();
        const status = (t.status || '').toLowerCase();

        if (cat.includes('process') || title.includes('process')) processCount++;
        if (cat.includes('tool') || title.includes('tool') || title.includes('die') || title.includes('fixture')) toolsCount++;
        if (cat.includes('part') || cat.includes('component') || title.includes('part')) partsCount++;
        if (cat.includes('cost') || cat.includes('saving') || title.includes('cost') || title.includes('saving')) costCount++;
        if (cat.includes('manpower') || title.includes('manpower')) manpowerCount++;
        if (cat.includes('bom') || title.includes('bom')) bomCount++;

        if (status.includes('complete') || status.includes('done')) {
          completedCount++;
        } else {
          ongoingCount++;
        }
      });

      kpis = [
        { val: `${processCount}`, label: "Process Developed", note: null },
        { val: `${toolsCount}`, label: "Tools Developed", note: null },
        { val: `${partsCount}`, label: "Parts Developed", note: null },
        { val: `${costCount}`, label: "Cost Optimisation", note: (yearlyImpact && yearlyImpact !== "0 TK" ? `Cost Saved: BDT ${yearlyImpact}/Year` : null) },
        { val: `${manpowerCount}`, label: "Manpower Optimization", note: null },
        { val: `${bomCount}`, label: "BOM Verification", note: null },
        { val: `${completedCount}`, label: "Completed Projects", note: null },
        { val: `${ongoingCount}`, label: "New Projects / Ongoing", note: null }
      ];
    }

    return `
    <div class="walton-dashboard-slide walton-blue-dashboard bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200" 
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 25px 40px; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- HEADER -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-shrink-0">
        <div class="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" class="flex-shrink-0">
            <polygon points="20,2 38,20 20,20" fill="#0284C7" />
            <polygon points="2,20 20,2 20,20" fill="#2563EB" />
            <polygon points="2,20 20,38 20,20" fill="#1D4ED8" />
            <polygon points="20,38 38,20 20,20" fill="#38BDF8" />
          </svg>
          <div>
            <div style="font-size: 13px; font-weight: 900; color: #0F172A;">PROCESS DEVELOPMENT DEPARTMENT</div>
            <div style="font-size: 8.5px; font-weight: 700; color: #64748B; letter-spacing: 0.18em;">INNOVATE &bull; IMPROVE &bull; DELIVER</div>
          </div>
        </div>

        <div class="px-4 py-1.5 rounded-full bg-[#0052CC] text-white font-black text-xs uppercase tracking-wider shadow-sm">
          AC PRODUCT DASHBOARD
        </div>

        <div class="text-right">
          <div style="font-size: 9.5px; font-weight: 700; color: #64748B;">CONTINUOUS IMPROVEMENT</div>
          <div style="font-size: 16px; font-weight: 900; color: #0052CC; line-height: 1;">FOR BETTER PRODUCTION</div>
        </div>
      </div>

      <!-- UPPER ROW: SAVINGS TABLE + FINANCIAL CARDS -->
      <div class="grid grid-cols-12 gap-5 my-2 flex-shrink-0" style="height: 175px;">
        <!-- Left Table: Monthly Cost Saving (5 cols) -->
        <div class="col-span-5 bg-white border border-sky-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm">
          <div class="bg-[#0052CC] text-white px-3.5 py-1.5 flex items-center justify-between text-xs font-extrabold flex-shrink-0">
            <span>Month</span>
            <span>Impact (BDT)</span>
          </div>
          <div class="divide-y divide-sky-100 overflow-y-auto flex-1 text-xs">
            ${savings.map((s, idx) => `
              <div class="flex items-center justify-between px-3.5 py-1.5 ${idx % 2 === 0 ? 'bg-white' : 'bg-sky-50/30'}">
                <span class="font-medium text-slate-700">${s.m}</span>
                <span class="font-bold text-slate-900 font-mono">${s.val}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Center Card: Monthly Financial Impact (Sunset Orange Gradient - High Contrast) -->
        <div class="col-span-3 lg:col-span-3 flex flex-col justify-between p-4 rounded-2xl shadow-md text-white"
             style="background: linear-gradient(135deg, #EA580C 0%, #F59E0B 100%); box-shadow: 0 4px 14px rgba(234,88,12,0.22);">
          <div>
            <div class="text-[11px] font-mono font-black uppercase tracking-wide flex items-center justify-between">
              <span style="background: #FFFFFF; color: #9A3412; padding: 3px 10px; border-radius: 9999px; font-weight: 900; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">🪙 ${currentMonthLabel.toUpperCase()}</span>
              <span style="background: rgba(0,0,0,0.25); color: #FFFFFF; padding: 3px 8px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; border: 1px solid rgba(255,255,255,0.25);">MONTHLY SAVINGS</span>
            </div>
            <div class="text-2xl lg:text-3xl font-black text-white mt-2 font-mono tracking-tight leading-none" style="text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              ${currentImpact}
            </div>
          </div>
          <div class="text-xs font-semibold text-white/95 mt-2">
            Monthly Financial Impact<br>
            <span class="text-[10px] text-amber-100 font-medium font-mono">Plant-wide Optimization (100% Realized)</span>
          </div>
        </div>

        <!-- Right Card: Yearly Impact (Emerald / Teal Gradient - High Contrast) -->
        <div class="col-span-4 lg:col-span-4 flex flex-col justify-between p-4 rounded-2xl shadow-md text-white"
             style="background: linear-gradient(135deg, #059669 0%, #0D9488 100%); box-shadow: 0 4px 14px rgba(5,150,105,0.22);">
          <div>
            <div class="text-[11px] font-mono font-black uppercase tracking-wide flex items-center justify-between">
              <span style="background: #FFFFFF; color: #065F46; padding: 3px 10px; border-radius: 9999px; font-weight: 900; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">📈 YEARLY IMPACT (FY 26-27)</span>
              <span style="background: rgba(0,0,0,0.25); color: #FFFFFF; padding: 3px 8px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; border: 1px solid rgba(255,255,255,0.25);">CUMULATIVE YTD</span>
            </div>
            <div class="text-2xl lg:text-3xl font-black text-white mt-2 font-mono tracking-tight leading-none" style="text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              ${yearlyImpact}
            </div>
          </div>
          <div class="text-xs font-semibold text-white/95 mt-2">
            Cumulative Realized Savings<br>
            <span class="text-[10px] text-emerald-100 font-medium font-mono">Direct Process Engineering Value Add</span>
          </div>
        </div>
      </div>

      <!-- LOWER ROW: 8 COLORFUL CORE KPI CARDS (4x2 Grid) -->
      <div class="grid grid-cols-4 gap-3 my-1 flex-1 items-stretch">
        ${(() => {
          const kpiPalettes = [
            { bg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: '#60A5FA', valColor: '#1D4ED8', labelColor: '#1E3A8A', shadow: 'rgba(59,130,246,0.14)', icon: '⚙️' },
            { bg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', border: '#818CF8', valColor: '#4338CA', labelColor: '#312E81', shadow: 'rgba(99,102,241,0.14)', icon: '🔧' },
            { bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '#34D399', valColor: '#047857', labelColor: '#064E3B', shadow: 'rgba(16,185,129,0.14)', icon: '🔩' },
            { bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '#FBBF24', valColor: '#B45309', labelColor: '#78350F', shadow: 'rgba(245,158,11,0.14)', icon: '💰' },
            { bg: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)', border: '#C084FC', valColor: '#7E22CE', labelColor: '#581C87', shadow: 'rgba(168,85,247,0.14)', icon: '👥' },
            { bg: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)', border: '#FB7185', valColor: '#BE123C', labelColor: '#881337', shadow: 'rgba(244,63,94,0.14)', icon: '📋' },
            { bg: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', border: '#F87171', valColor: '#B91C1C', labelColor: '#7F1D1D', shadow: 'rgba(239,68,68,0.16)', icon: '🏆' },
            { bg: 'linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)', border: '#22D3EE', valColor: '#0E7490', labelColor: '#164E63', shadow: 'rgba(6,182,212,0.14)', icon: '🚀' }
          ];
          return kpis.map((k, idx) => {
            const pal = kpiPalettes[idx % kpiPalettes.length];
            return `
            <div style="background: ${pal.bg}; border: 1.5px solid ${pal.border}; border-radius: 12px; padding: 10px 16px; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 3px 8px ${pal.shadow}; position: relative; overflow: hidden;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 32px; font-weight: 900; color: ${pal.valColor}; font-family: 'JetBrains Mono', monospace; line-height: 1;">${k.val}</div>
                <span style="font-size: 16px; opacity: 0.85;">${pal.icon}</span>
              </div>
              <div style="font-size: 13px; font-weight: 800; color: ${pal.labelColor}; margin-top: 5px; line-height: 1.2;">${k.label}</div>
              ${k.note ? `<div style="font-size: 10.5px; font-weight: 800; color: ${pal.valColor}; margin-top: 3px; line-height: 1.2; background: rgba(255,255,255,0.75); padding: 1.5px 6px; border-radius: 6px; display: inline-block; width: fit-content; border: 1px solid rgba(0,0,0,0.06);">${k.note}</div>` : ''}
            </div>
            `;
          }).join('');
        })()}
      </div>

      <!-- FOOTER (PROCESS DEVELOPMENT DEPARTMENT ONLY - 2 TAGLINES) -->
      <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] font-semibold flex-shrink-0">
        <div class="font-bold text-[#0F172A] uppercase tracking-wider">⚙ PROCESS DEVELOPMENT DEPARTMENT</div>
        <div class="flex items-center gap-4 text-slate-500">
          <span>🏆 Continuous Improvement</span>
          <span>•</span>
          <span>💡 A Smarter Tomorrow</span>
        </div>
        <div class="text-[#0052CC] font-mono font-bold">${monthUpper}</div>
      </div>

    </div>`;
  },

  /**
   * Pattern 2: Industrial Innovation Blue Top 5 Works Slide
   */
  renderIndustrialBlueTopWorksSlide(month = "SEPTEMBER 2026", data = null) {
    const monthUpper = (month || "SEPTEMBER 2026").toUpperCase();

    let completedTop5 = (data && data.completedTop5);
    let ongoingTop5 = (data && data.ongoingTop5);

    if ((!completedTop5 || !ongoingTop5) && typeof TopWorksManager !== 'undefined') {
      const tw = TopWorksManager.getTopWorksForMonth(month);
      completedTop5 = completedTop5 || tw.completedTop5;
      ongoingTop5 = ongoingTop5 || tw.ongoingTop5;
    }

    completedTop5 = completedTop5 || [
      "Compressor Jacket Foil Cutting System Development",
      "Die Development for new design Compressor Jacket",
      "Double Coating trial, process and BOM confirmation",
      "Reduce Tolerance of Hollow Plug Pin",
      "MPE Tube Acid Treatment process development"
    ];

    ongoingTop5 = ongoingTop5 || [
      { sl: 1, name: "CNC Tube Bending & End Shaping M/C Automation Development", progress: "Trail run and modification ongoing", deadline: "Oct, 2026" },
      { sl: 2, name: "CNC Turret Punch Machine Project", progress: "Machine manufacturing almost done; PSI preparation ongoing", deadline: "Oct, 2026" },
      { sl: 3, name: "Evaporator Brazing Fixture for without water brazing", progress: "One model running under observation and working for rest model", deadline: "Sep, 2026" },
      { sl: 4, name: "MPE Tube rust repair process development", progress: "Mass production trial ongoing", deadline: "Oct, 2026" },
      { sl: 5, name: "New fin material (Aluzinc Sheet) supplier (MAX) development for Evaporator and condenser", progress: "All test completed, Trial production lot order is ongoing", deadline: "Dec, 2026" }
    ];

    return `
    <div class="walton-top5-slide walton-blue-top5 bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200" 
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 25px 40px; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- HEADER -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-shrink-0">
        <div class="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" class="flex-shrink-0">
            <polygon points="20,2 38,20 20,20" fill="#0284C7" />
            <polygon points="2,20 20,2 20,20" fill="#2563EB" />
            <polygon points="2,20 20,38 20,20" fill="#1D4ED8" />
            <polygon points="20,38 38,20 20,20" fill="#38BDF8" />
          </svg>
          <div>
            <div style="font-size: 13px; font-weight: 900; color: #0F172A;">PROCESS DEVELOPMENT DEPARTMENT</div>
            <div style="font-size: 8.5px; font-weight: 700; color: #64748B; letter-spacing: 0.18em;">INNOVATION &bull; EFFICIENCY &bull; SUSTAINABILITY</div>
          </div>
        </div>

        <div class="px-4 py-1.5 rounded-full bg-[#0052CC] text-white font-black text-xs uppercase tracking-wider shadow-sm">
          TOP 5 STRATEGIC WORKS &amp; PROJECTS
        </div>

        <div class="text-right">
          <div style="font-size: 9.5px; font-weight: 700; color: #64748B;">CONTINUOUS IMPROVEMENT</div>
          <div style="font-size: 16px; font-weight: 900; color: #0052CC; line-height: 1;">FOR BETTER PRODUCTION</div>
        </div>
      </div>

      <!-- MAIN CONTENT: 2 SECTIONS -->
      <div class="flex-1 min-h-0 flex flex-col justify-between my-2 gap-3.5">
        
        <!-- SECTION 1: COMPLETED WORKS (TOP FIVE) -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <div class="w-5 h-5 rounded-full bg-[#0052CC] text-white flex items-center justify-center text-[10px]">⚙️</div>
            <h3 class="text-xs font-black text-[#0F172A] uppercase tracking-wide">Development Works Completed (Top Five)</h3>
          </div>
          <div class="grid grid-cols-5 gap-3 items-stretch">
            ${completedTop5.map((item, idx) => {
              const palettes = [
                { bg: 'linear-gradient(135deg, #0F172A 0%, #0052CC 100%)', border: '#2563EB', shadow: 'rgba(0, 82, 204, 0.35)' },
                { bg: 'linear-gradient(135deg, #0369A1 0%, #0284C7 100%)', border: '#38BDF8', shadow: 'rgba(2, 132, 199, 0.35)' },
                { bg: 'linear-gradient(135deg, #047857 0%, #0D9488 100%)', border: '#14B8A6', shadow: 'rgba(13, 148, 136, 0.35)' },
                { bg: 'linear-gradient(135deg, #581C87 0%, #7C3AED 100%)', border: '#A855F7', shadow: 'rgba(124, 58, 237, 0.35)' },
                { bg: 'linear-gradient(135deg, #9A3412 0%, #EA580C 100%)', border: '#FB923C', shadow: 'rgba(234, 88, 12, 0.35)' }
              ];
              const pal = palettes[idx % palettes.length];
              const hasItem = item && item.trim();
              return `
              <div class="rounded-xl p-3.5 flex flex-col justify-between shadow-md transition h-full min-h-[118px] text-white relative overflow-hidden group hover:scale-[1.02] duration-200"
                   style="background: ${pal.bg}; border: 1.5px solid ${pal.border}; box-shadow: 0 6px 16px ${pal.shadow};">
                <div class="flex items-center justify-between mb-1.5 relative z-10">
                  <div class="w-6 h-6 rounded-lg bg-white/25 backdrop-blur-sm text-white font-black text-xs flex items-center justify-center border border-white/35 shadow-sm">
                    0${idx + 1}
                  </div>
                </div>
                <div class="text-[14.5px] sm:text-[15.5px] font-black text-white leading-snug my-auto drop-shadow-sm line-clamp-3 relative z-10 tracking-tight">
                  ${hasItem ? item : '— (Pending completion)'}
                </div>
                <div class="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-white/10 pointer-events-none"></div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- SECTION 2: ON-GOING WORKS (TOP FIVE) -->
        <div class="flex-1 min-h-0 flex flex-col justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="w-5 h-5 rounded-full bg-[#0B2038] text-white flex items-center justify-center text-[10px]">📋</div>
            <h3 class="text-xs font-black text-[#0F172A] uppercase tracking-wide">On-going Works (Top Five):</h3>
          </div>
          <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 min-h-0 flex flex-col justify-between">
            <table class="w-full text-xs border-collapse h-full">
              <thead class="bg-[#0052CC] text-white font-bold text-[12px] uppercase tracking-wider">
                <tr>
                  <th class="py-2.5 px-1.5 w-9 text-center">Sl</th>
                  <th class="py-2.5 px-3.5 text-left w-[42%]">Project Name</th>
                  <th class="py-2.5 px-3.5 text-left w-[40%]">Progress</th>
                  <th class="py-2.5 px-2.5 text-center w-[15%]">Tentative Deadline</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${ongoingTop5.map((p, idx) => {
                  const hasName = p.name && p.name.trim();
                  return `
                  <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-sky-50/20'} hover:bg-sky-50/40 transition">
                    <td class="py-2.5 px-2 text-center font-bold text-[#0284C7] font-mono align-middle text-[13px]">${p.sl || idx + 1}</td>
                    <td class="py-2.5 px-3.5 text-[13.5px] ${hasName ? 'font-bold text-[#0F172A]' : 'font-medium text-slate-400 italic'} align-middle">${hasName ? p.name : '—'}</td>
                    <td class="py-2.5 px-3.5 text-[13px] ${p.progress && p.progress.trim() ? 'text-slate-700 font-semibold' : 'text-slate-400 italic'} align-middle">${p.progress && p.progress.trim() ? p.progress : '—'}</td>
                    <td class="py-2.5 px-2.5 text-center font-mono font-bold text-slate-700 align-middle">
                      <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11.5px] font-bold">
                        ${p.deadline && p.deadline.trim() ? p.deadline : '—'}
                      </span>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- FOOTER -->
      <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] font-semibold text-slate-400 flex-shrink-0">
        <div class="flex items-center gap-2">
          <span class="font-bold text-[#0F172A]">⚙ PROCESS DEVELOPMENT DEPARTMENT</span>
        </div>
        <div class="flex items-center gap-4">
          <span>🏆 Continuous Improvement</span>
          <span>&bull;</span>
          <span>👥 Stronger Together</span>
        </div>
        <div class="text-[#0052CC] font-mono font-bold">${monthUpper}</div>
      </div>

    </div>`;
  },

  /**
   * Renders the complete sequential slide deck (Cover, TOC, Dashboard, Tasks, Top 5 Works)
   * Supports both: 'walton_executive_crimson' and 'industrial_innovation_blue'
   */
  renderDeck(reportData = {}, template = "walton_executive_crimson") {
    const activeTemplate = reportData.template || template || "walton_executive_crimson";
    const isBlue = (activeTemplate === "industrial_innovation_blue" || activeTemplate === "walton_blue_dual");
    const month = reportData.month || "SEPTEMBER 2026";
    const taskSlides = reportData.slides || [];
    const deck = [];
    const totalSlideCount = taskSlides.length + 4; // Cover + TOC + Dashboard + Tasks + Top 5 Works

    // Slide 1: Cover Page (Crimson or Blue)
    if (isBlue) {
      deck.push(this.renderIndustrialBlueCoverSlide(month));
    } else {
      deck.push(this.renderExecutiveRedCoverSlide(month));
    }

    // Slide 2: Table of Contents (Crimson or Blue)
    if (isBlue) {
      deck.push(this.renderIndustrialBlueTableOfContentsSlide(month, taskSlides.length));
    } else {
      deck.push(this.renderTableOfContentsSlide(month, taskSlides.length));
    }

    // Slide 3: Executive Management Dashboard (Crimson or Blue)
    if (isBlue) {
      deck.push(this.renderIndustrialBlueDashboardSlide(month, reportData.dashboardData));
    } else {
      deck.push(this.renderExecutiveDashboardSlide(month, reportData.dashboardData));
    }

    // Slides 4 to N+3: Task Slides (1 Row = 1 Slide, Crimson or Blue)
    taskSlides.forEach((task, idx) => {
      const taskWithTpl = { ...task, template: task.template || activeTemplate };
      deck.push(this.renderTaskSlide(taskWithTpl, idx + 4, totalSlideCount));
    });

    // Slide N+4: Top 5 Works & Projects Summary (Crimson or Blue)
    if (isBlue) {
      deck.push(this.renderIndustrialBlueTopWorksSlide(month, reportData.topWorksData));
    } else {
      deck.push(this.renderTopWorksSummarySlide(month, reportData.topWorksData));
    }

    return deck;
  },

  /**
   * Backward compatible Cover Slide
   */
  renderCoverSlide(month = "SEPTEMBER 2026", year = "2026") {
    return this.renderExecutiveRedCoverSlide(month, year);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SlideLayoutEngine;
} else if (typeof window !== 'undefined') {
  window.SlideLayoutEngine = SlideLayoutEngine;
}
