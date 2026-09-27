/**
 * Process Development Monthly Report Automation System
 * Module: Monthly Report View (Slide Deck Sequence & Editorial Overrides Hub)
 * Requirement 3: Dedicated Monthly Report section displaying complete slide-by-slide sequence,
 * live editorial overrides/modifications, full deck preview, and 1-click export (PPTX, PDF, HTML).
 * WALTON Hi-Tech Industries PLC
 */

const REPORT_CATEGORY_META = {
  "process development": {
    label: "Process Developed",
    icon: "⚙️",
    note: "SOP & Method Engineering",
    bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
    border: "#60A5FA",
    valColor: "#1D4ED8",
    labelColor: "#1E3A8A",
    shadow: "rgba(59,130,246,0.16)"
  },
  "major developments - process": {
    label: "Process Developed",
    icon: "⚙️",
    note: "SOP & Method Engineering",
    bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
    border: "#60A5FA",
    valColor: "#1D4ED8",
    labelColor: "#1E3A8A",
    shadow: "rgba(59,130,246,0.16)"
  },
  "major developments - tools": {
    label: "Tools Developed",
    icon: "🔧",
    note: "Jigs, Dies & Fixtures",
    bg: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
    border: "#818CF8",
    valColor: "#4338CA",
    labelColor: "#312E81",
    shadow: "rgba(99,102,241,0.16)"
  },
  "major developments - parts": {
    label: "Parts Developed",
    icon: "🔩",
    note: "Components & Sheet Metal",
    bg: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
    border: "#34D399",
    valColor: "#047857",
    labelColor: "#064E3B",
    shadow: "rgba(16,185,129,0.16)"
  },
  "major developments - materials": {
    label: "Materials Development",
    icon: "🧪",
    note: "Raw Materials & Metallurgy",
    bg: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
    border: "#4ADE80",
    valColor: "#15803D",
    labelColor: "#14532D",
    shadow: "rgba(34,197,94,0.16)"
  },
  "major developments - chemical": {
    label: "Chemical Development",
    icon: "🔬",
    note: "SWAAT Trials & Chemicals",
    bg: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)",
    border: "#22D3EE",
    valColor: "#0E7490",
    labelColor: "#164E63",
    shadow: "rgba(6,182,212,0.16)"
  },
  "bom verification": {
    label: "BOM Verification",
    icon: "📋",
    note: "Physical Audit & Reconciliation",
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
  "cost saving": {
    label: "Cost Optimization",
    icon: "💰",
    note: "Financial & Yield Savings",
    bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
    border: "#FBBF24",
    valColor: "#B45309",
    labelColor: "#78350F",
    shadow: "rgba(245,158,11,0.16)"
  },
  "cost savings (local)": {
    label: "Cost Savings (Local)",
    icon: "🪙",
    note: "Domestic Plant Saving",
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

const MonthlyReportView = {
  selectedMonth: "SEP-2026",
  filterEngineer: "",
  filterCategory: "",
  searchQuery: "",

  handleMonthSelect(month) {
    this.selectedMonth = month;
    if (typeof FinalEditorView !== 'undefined') FinalEditorView.selectedMonth = month;
    if (typeof MonthlyInputView !== 'undefined') MonthlyInputView.selectedMonth = month;
    this.render();
  },

  handleEngineerFilter(eng) {
    this.filterEngineer = eng || "";
    this.render();
  },

  handleCategoryFilter(cat) {
    if (this.filterCategory === (cat || "")) {
      this.filterCategory = "";
    } else {
      this.filterCategory = cat || "";
    }
    this.render();
  },

  handleSearch(query) {
    this.searchQuery = (query || "").trim().toLowerCase();
    this.filterSlidesLocally();
  },

  filterSlidesLocally() {
    const q = this.searchQuery;
    const cards = document.querySelectorAll('.task-slide-card');
    let visibleCount = 0;
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (!q || text.includes(q)) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });
    const counter = document.getElementById('monthly-report-filtered-counter');
    if (counter) {
      counter.textContent = q ? `Showing ${visibleCount} of ${cards.length} task slides` : `Showing all ${cards.length} task slides`;
    }
  },

  renderContainer() {
    let container = document.getElementById('monthly-report-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'monthly-report-modal-container';
      document.body.appendChild(container);
    }
    return container;
  },

  /**
   * Auto-generates concise 5-step process breakdown and short bullet points derived from task name
   * Requirement 1: "Monthly report theke task details generate korar option rakhio. Bullet point will be short and as per task name."
   */
  generateSlideDetails(taskId) {
    const titleInput = document.getElementById('edit-slide-title');
    const taskName = (titleInput ? titleInput.value.trim() : '') || taskId;
    if (!taskName) {
      if (typeof window.showToast === 'function') {
        window.showToast("Please enter a slide title or task name first.", "warning");
      }
      return;
    }

    const lower = taskName.toLowerCase();
    let desc = "";
    let bullets = [];

    if (lower.includes("die") || lower.includes("fixture") || lower.includes("jig") || lower.includes("cutter") || lower.includes("mold") || lower.includes("tool")) {
      desc = `Designed, fabricated, and verified precision tooling fixture for ${taskName.toLowerCase()}. Verified dimensional tolerance and commissioned on the active production line.`;
      bullets = [
        `Tooling design & 3D fabrication finalized`,
        `Verified fitment & dimensional tolerance`,
        `Reduced changeover & manual setup time`,
        `Commissioned on active production line`
      ];
    } else if (lower.includes("robot") || lower.includes("automation") || lower.includes("punch") || lower.includes("press") || lower.includes("turret") || lower.includes("sensor") || lower.includes("motor")) {
      desc = `Engineered and integrated automated control mechanism for ${taskName.toLowerCase()}. Successfully tested safety interlocks and commissioned on the active line.`;
      bullets = [
        `Automated cycle & safety interlock setup`,
        `Increased continuous line throughput`,
        `Enhanced operator safety & handling speed`,
        `Validated operational reliability on line`
      ];
    } else if (lower.includes("foil") || lower.includes("cutting") || lower.includes("vacuum") || lower.includes("brazing") || lower.includes("jacket") || lower.includes("coil")) {
      desc = `Developed and implemented specialized process mechanism for ${taskName.toLowerCase()}. Commissioned for daily manufacturing with zero quality deviation.`;
      bullets = [
        `Process flow & cycle parameters optimized`,
        `Eliminated manual handling bottlenecks`,
        `Improved cutting & assembly consistency`,
        `Ensured zero-defect line handover`
      ];
    } else if (lower.includes("bom") || lower.includes("audit") || lower.includes("sfg") || lower.includes("verification")) {
      desc = `Conducted physical inspection, BOM verification, and structure audit for ${taskName.toLowerCase()}. Reconciled line usage against engineering drawing specifications.`;
      bullets = [
        `Physical line observation & part count verified`,
        `ERP & engineering BOM structure reconciled`,
        `Discrepancies rectified with store & planning`,
        `Audit sign-off completed for running models`
      ];
    } else if (lower.includes("model") || lower.includes("trial") || lower.includes("pilot") || lower.includes("sample")) {
      desc = `Executed pilot production trial, tooling readiness, and assembly flow for ${taskName.toLowerCase()}. Addressed line balancing issues and confirmed commercial readiness.`;
      bullets = [
        `Tooling & component readiness verified`,
        `Pilot trial assembly completed on line`,
        `Cycle time & line balance verified`,
        `Approved for commercial mass production`
      ];
    } else {
      const cleanWords = taskName.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
      const subject = cleanWords.slice(0, 3).join(' ') || taskName;
      desc = `Engineered, verified, and standardized operational workflow for ${taskName.toLowerCase()}. Successfully implemented on the active manufacturing line.`;
      bullets = [
        `Layout & process study finalized for ${subject}`,
        `Implemented standardized operating mechanism`,
        `Eliminated manual bottleneck & reduced cycle time`,
        `Production validation & operator training done`
      ];
    }

    const descEl = document.getElementById('edit-slide-desc');
    const impactEl = document.getElementById('edit-slide-impact');
    if (descEl) descEl.value = desc;
    if (impactEl) impactEl.value = bullets.join("\n");

    this.renderModalLivePreview(taskId);
    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Generated concise details & short bullets for "${taskName}"!`, "success");
    }
  },

  /**
   * Renders the Before/After photo management slots inside the unified modal
   */
  renderModalPhotoSlots(taskId) {
    const container = document.getElementById('modal-photos-slot-container');
    if (!container) return;

    let beforePhoto = null;
    let afterPhoto = null;
    if (typeof photoManager !== 'undefined') {
      const p = photoManager.getTaskPhotos(taskId, this.selectedMonth);
      if (p) {
        beforePhoto = p.before_photo || p.photo_1 || null;
        afterPhoto = p.after_photo || p.photo_2 || null;
      }
    }

    container.innerHTML = `
      <!-- Before Photo (Present Condition) -->
      <div class="bg-white border ${beforePhoto ? 'border-slate-200' : 'border-dashed border-slate-300 hover:border-blue-400'} rounded-2xl p-3 flex flex-col justify-between shadow-xs transition group">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${beforePhoto ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
            <span>1. Present Condition (Before)</span>
          </span>
          <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${beforePhoto ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'}">
            ${beforePhoto ? 'ATTACHED' : 'EMPTY'}
          </span>
        </div>

        <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
          ${beforePhoto ? `
            <img src="${beforePhoto}" class="w-full h-full object-cover" alt="Before Photo" />
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition backdrop-blur-[1px]">
              <label for="modal-photo-file-before" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold cursor-pointer shadow transition">
                🔄 Replace
              </label>
              <button type="button" onclick="MonthlyReportView.deleteModalPhoto('${taskId}', 'before_photo')" class="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow transition">
                🗑 Delete
              </button>
            </div>
          ` : `
            <label for="modal-photo-file-before" class="cursor-pointer flex flex-col items-center justify-center p-4 text-center w-full h-full hover:bg-blue-50/30 transition">
              <span class="text-2xl mb-1 text-slate-400 group-hover:scale-110 transition">📸</span>
              <span class="text-xs font-bold text-slate-700">Add Before Photo</span>
              <span class="text-[10px] text-slate-400 mt-0.5">Click or Browse</span>
            </label>
          `}
          <input type="file" id="modal-photo-file-before" accept="image/*" class="hidden" onchange="MonthlyReportView.uploadModalPhoto(event, '${taskId}', 'before_photo')" />
        </div>

        <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
          <span class="text-slate-400 font-mono">16:9 Slide Canvas</span>
          <div class="flex items-center gap-1.5">
            <label for="modal-photo-file-before" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition">
              ${beforePhoto ? '🔄 Replace' : '➕ Upload'}
            </label>
            ${beforePhoto ? `
              <button type="button" onclick="MonthlyReportView.deleteModalPhoto('${taskId}', 'before_photo')" class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition">
                🗑
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- After Photo (Proposed Project / Hero) -->
      <div class="bg-white border ${afterPhoto ? 'border-slate-200' : 'border-dashed border-slate-300 hover:border-blue-400'} rounded-2xl p-3 flex flex-col justify-between shadow-xs transition group">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${afterPhoto ? 'bg-sky-500' : 'bg-slate-300'}"></span>
            <span>2. Proposed Project (After / Hero)</span>
          </span>
          <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${afterPhoto ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-400'}">
            ${afterPhoto ? 'ATTACHED' : 'EMPTY'}
          </span>
        </div>

        <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
          ${afterPhoto ? `
            <img src="${afterPhoto}" class="w-full h-full object-cover" alt="After Photo" />
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition backdrop-blur-[1px]">
              <label for="modal-photo-file-after" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold cursor-pointer shadow transition">
                🔄 Replace
              </label>
              <button type="button" onclick="MonthlyReportView.deleteModalPhoto('${taskId}', 'after_photo')" class="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow transition">
                🗑 Delete
              </button>
            </div>
          ` : `
            <label for="modal-photo-file-after" class="cursor-pointer flex flex-col items-center justify-center p-4 text-center w-full h-full hover:bg-blue-50/30 transition">
              <span class="text-2xl mb-1 text-slate-400 group-hover:scale-110 transition">📸</span>
              <span class="text-xs font-bold text-slate-700">Add After Photo</span>
              <span class="text-[10px] text-slate-400 mt-0.5">Click or Browse</span>
            </label>
          `}
          <input type="file" id="modal-photo-file-after" accept="image/*" class="hidden" onchange="MonthlyReportView.uploadModalPhoto(event, '${taskId}', 'after_photo')" />
        </div>

        <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
          <span class="text-slate-400 font-mono">16:9 Hero Image</span>
          <div class="flex items-center gap-1.5">
            <label for="modal-photo-file-after" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition">
              ${afterPhoto ? '🔄 Replace' : '➕ Upload'}
            </label>
            ${afterPhoto ? `
              <button type="button" onclick="MonthlyReportView.deleteModalPhoto('${taskId}', 'after_photo')" class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition">
                🗑
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  async uploadModalPhoto(event, taskId, slot) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      if (typeof photoManager !== 'undefined') {
        if (photoManager.savePhotoFile) {
          await photoManager.savePhotoFile(taskId, slot, file, this.selectedMonth);
        } else if (photoManager.setTaskPhoto || photoManager.savePhoto) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Url = e.target.result;
            if (photoManager.savePhoto) {
              await photoManager.savePhoto(taskId, slot, base64Url, this.selectedMonth);
            } else {
              await photoManager.setTaskPhoto(taskId, slot, base64Url, null, this.selectedMonth);
            }
            this.renderModalPhotoSlots(taskId);
            this.renderModalLivePreview(taskId);
            if (typeof window.showToast === 'function') {
              window.showToast("📷 Photo attached! Live preview updated.", "success");
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }
      this.renderModalPhotoSlots(taskId);
      this.renderModalLivePreview(taskId);
      if (typeof window.showToast === 'function') {
        window.showToast("📷 Photo attached! Live preview updated.", "success");
      }
    } catch (err) {
      console.error("Photo upload error:", err);
    }
  },

  async deleteModalPhoto(taskId, slot) {
    if (typeof photoManager !== 'undefined' && photoManager.removePhoto) {
      await photoManager.removePhoto(taskId, slot, this.selectedMonth);
    }
    this.renderModalPhotoSlots(taskId);
    this.renderModalLivePreview(taskId);
    if (typeof window.showToast === 'function') {
      window.showToast("🗑 Photo removed. Live preview updated.", "info");
    }
  },

  /**
   * Format compact override timestamp (Requirement 5)
   */
  formatOverrideTime(ts) {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts).slice(0, 16);
      const day = String(d.getDate()).padStart(2, '0');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mon = monthNames[d.getMonth()];
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${mon} ${hours}:${mins}`;
    } catch (e) {
      return "";
    }
  },

  /**
   * Opens the slide override editor for a specific task slide with live in-modal preview
   * Requirement 4: Unified single modal for text edit, photo upload, and live preview
   */
  openModal(taskId) {
    if (!taskId) return;

    const breakdown = window.appState && window.appState.breakdownSheet
      ? window.appState.breakdownSheet.getBreakdown(taskId)
      : null;
    const overrides = window.appState && window.appState.syncEngine
      ? window.appState.syncEngine.getManualOverride(taskId) || {}
      : {};
    const task = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr.getTask(this.selectedMonth, taskId)
      : null;
    const allSlides = window.appState && window.appState.syncEngine
      ? window.appState.syncEngine.getActiveSlides(this.selectedMonth)
      : [];
    const currentSlide = allSlides.find(s => s && s.task_id === taskId) || null;

    const rawTaskName = (task && task.task_name) ? task.task_name : (breakdown ? breakdown.original_task_name : "Task " + taskId);
    const currentTitle = overrides.slide_title || (breakdown ? breakdown.ai_report_title : rawTaskName);
    const currentDesc = overrides.description || (breakdown ? breakdown.ai_description : ((task && task.task_details) ? task.task_details : ""));
    const currentImpact = overrides.impact
      ? (Array.isArray(overrides.impact) ? overrides.impact.join("\n") : overrides.impact)
      : (breakdown && Array.isArray(breakdown.ai_impact) ? breakdown.ai_impact.join("\n") : "");
    const currentEngineer = overrides.engineer || (task ? (task.concern_engineer || task.assignee || task.engineer) : null) || (breakdown ? breakdown.engineer : "Concern Engineer");

    const allCategories = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getCategories)
      ? MasterDataManager.getCategories()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.CATEGORIES) ? MASTER_LISTS.CATEGORIES : ["Process development", "Completed Projects", "Ongoing Projects"]);

    const currentCategory = overrides.category || (task ? task.category : null) || (currentSlide ? currentSlide.category : null) || (breakdown ? breakdown.ai_category : "Process development");

    const container = this.renderContainer();
    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md">
        <div class="relative w-full max-w-6xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-800 flex flex-col max-h-[95vh] overflow-hidden">
          
          <!-- Top Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-blue-500/20">
                🎨
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    SLIDE STUDIO &amp; EDITORIAL
                  </span>
                  <span class="text-xs font-mono text-slate-400">ID: ${taskId}</span>
                  ${(overrides && overrides.updated_at) ? `
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      ✏️ Overridden at ${this.formatOverrideTime(overrides.updated_at)}
                    </span>
                  ` : ''}
                </div>
                <h3 class="text-base font-black text-slate-900 mt-0.5">Customize Slide Content, Photos &amp; Live In-Modal Preview</h3>
              </div>
            </div>
            <button onclick="MonthlyReportView.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition">&times;</button>
          </div>

          <!-- Body: Split 2-Column (Controls on Left, Real-Time Preview on Right) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 py-4 overflow-y-auto flex-1">
            
            <!-- Left: Unified Editorial & Photo Form -->
            <form id="slide-override-form" onsubmit="MonthlyReportView.saveOverrides(event, '${taskId}')" class="space-y-4 text-xs">
              
              <!-- Slide Title -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block font-bold text-slate-700">Slide Title (Headline) <span class="text-red-500">*</span></label>
                  <span class="text-[10px] text-slate-400 font-mono">Live updates on right →</span>
                </div>
                <input type="text" id="edit-slide-title" value="${HELPERS.escapeHtml(currentTitle)}" 
                       oninput="MonthlyReportView.renderModalLivePreview('${taskId}')"
                       class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-bold shadow-xs" required />
              </div>

              <!-- 5-Step Description + AI Generation Button (Requirement 1) -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="block font-bold text-slate-700">5-Step Process Breakdown / Description</label>
                  <button type="button" onclick="MonthlyReportView.generateSlideDetails('${taskId}')"
                          title="Auto-generate concise steps and short bullet points based on task name"
                          class="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer">
                    <span>✨</span> <span>Auto-Generate Details &amp; Bullets</span>
                  </button>
                </div>
                <textarea id="edit-slide-desc" rows="3" 
                          oninput="MonthlyReportView.renderModalLivePreview('${taskId}')"
                          class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 leading-relaxed font-sans shadow-xs resize-none">${HELPERS.escapeHtml(currentDesc)}</textarea>
              </div>

              <!-- Key Outcomes (Short bullets) -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Project Impact &amp; Outcomes (One bullet per line)</label>
                <textarea id="edit-slide-impact" rows="3" 
                          oninput="MonthlyReportView.renderModalLivePreview('${taskId}')"
                          class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-sans shadow-xs resize-none">${HELPERS.escapeHtml(currentImpact)}</textarea>
              </div>

              <!-- Slide Category (Requirement 1: Category dropdown in Monthly Report) -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Slide Category (Auto-updates Report Metrics)</label>
                <select id="edit-slide-category" 
                        onchange="MonthlyReportView.renderModalLivePreview('${taskId}')"
                        class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-bold shadow-xs cursor-pointer">
                  ${allCategories.map(c => `<option value="${c}" ${c === currentCategory ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>

              <!-- Concern Engineer (Requirement 2: Investment/Budget Note removed) -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Concern Engineer</label>
                <input type="text" id="edit-slide-engineer" value="${HELPERS.escapeHtml(currentEngineer)}" 
                       oninput="MonthlyReportView.renderModalLivePreview('${taskId}')"
                       class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-medium shadow-xs" />
              </div>

              <!-- PHOTO MANAGEMENT SECTION (Requirement 4: Integrated Photo Studio) -->
              <div class="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-base">📷</span>
                    <span class="font-bold text-slate-800 text-xs">Slide Photo Attachments (Before &amp; After)</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">16:9 Slide Canvas</span>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="modal-photos-slot-container">
                  <!-- Rendered dynamically via renderModalPhotoSlots -->
                </div>
              </div>

              <!-- Actions -->
              <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button type="button" onclick="MonthlyReportView.resetOverrides('${taskId}')" class="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer">
                  Reset to AI Defaults
                </button>
                <div class="flex items-center gap-2">
                  <button type="button" onclick="MonthlyReportView.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" class="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-xs font-black text-white shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5">
                    <span>💾</span> <span>Save Slide Overrides</span>
                  </button>
                </div>
              </div>
            </form>

            <!-- Right: Real-Time In-Modal Live Preview (Requirement 4: 1:1 Report Slide Format) -->
            <div class="bg-slate-900 rounded-2xl p-3 sm:p-4 flex flex-col justify-between border border-slate-800 shadow-inner overflow-hidden">
              <div class="flex items-center justify-between pb-2 border-b border-slate-800 mb-2 flex-shrink-0">
                <div class="flex items-center gap-2">
                  <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Exact Presentation Slide Preview</span>
                </div>
                <button type="button" onclick="MonthlyReportView.openModalFullScreenPreview('${taskId}')" 
                        class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 transition flex items-center gap-1 cursor-pointer">
                  <span>👁️</span> <span>Full Screen</span>
                </button>
              </div>

              <!-- Presentation Stage inside Modal (Responsive 16:9 Presentation Slide Canvas) -->
              <div id="modal-slide-live-preview" class="w-full flex-1 flex items-center justify-center max-h-[620px] overflow-y-auto my-auto rounded-xl shadow-2xl">
                <!-- Injected via renderModalLivePreview -->
              </div>

              <div class="pt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono flex-shrink-0">
                <span>Walton Executive Theme &bull; 16:9 Slide Canvas</span>
                <span class="text-emerald-400 font-bold">✨ Real-time synced</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;

    // Render photo slots and live preview
    this.renderModalPhotoSlots(taskId);
    this.renderModalLivePreview(taskId);
  },

  /**
   * Real-time in-modal 16:9 live slide preview renderer
   * Requirement 4: Authentic report slide layout with live photos
   * Requirement 2: Investment/Budget note completely removed
   */
  renderModalLivePreview(taskId) {
    const previewEl = document.getElementById('modal-slide-live-preview');
    if (!previewEl) return;

    const titleEl = document.getElementById('edit-slide-title');
    const descEl = document.getElementById('edit-slide-desc');
    const impactEl = document.getElementById('edit-slide-impact');
    const engineerEl = document.getElementById('edit-slide-engineer');
    const catEl = document.getElementById('edit-slide-category');

    const title = titleEl ? titleEl.value.trim() : `Task ${taskId}`;
    const desc = descEl ? descEl.value.trim() : "Standard operating procedure execution and engineering development.";
    const impactLines = impactEl ? impactEl.value.trim().split("\n").filter(l => l.trim().length > 0) : [];
    const engineer = engineerEl ? engineerEl.value.trim() : "Concern Engineer";
    const category = catEl ? catEl.value.trim() : "Process development";

    // Fetch photos
    let photoBefore = null;
    let photoAfter = null;
    if (typeof photoManager !== 'undefined') {
      const p = photoManager.getTaskPhotos(taskId, this.selectedMonth);
      if (p) {
        photoBefore = p.before_photo || p.photo_1 || null;
        photoAfter = p.after_photo || p.photo_2 || null;
      }
    }

    const isCompleted = (category === 'Completed Projects' || category.toLowerCase().includes('completed project'));
    const isProj = Boolean(category && category.toLowerCase().includes('project'));

    const slideData = {
      task_id: taskId,
      month: this.selectedMonth,
      slide_title: title,
      raw_task_name: title,
      description: desc,
      impact: impactLines,
      engineer: engineer,
      category: category,
      status: isCompleted ? "Completed" : (isProj ? "Ongoing" : "Completed"),
      is_project: isProj,
      photo_before: photoBefore,
      photo_after: photoAfter,
      photo: photoBefore || photoAfter,
      has_dual_photo: Boolean(photoBefore && photoAfter),
      has_manual_override: true,
      project_type: isProj ? (isCompleted ? "Strategic Project • Completed" : "Strategic Project • Ongoing") : category
    };

    if (typeof SlideLayoutEngine !== 'undefined') {
      previewEl.innerHTML = `
        <div class="w-full flex items-center justify-center p-1" style="max-width: 680px; width: 100%;">
          ${SlideLayoutEngine.renderTaskSlide(slideData, 1, 1)}
        </div>
      `;
    } else {
      previewEl.innerHTML = `<div class="p-6 text-center text-slate-400 font-mono text-xs">SlideLayoutEngine not available</div>`;
    }
  },

  /**
   * Pop-out full screen 16:9 preview for the draft slide currently in the modal
   */
  openModalFullScreenPreview(taskId) {
    const titleEl = document.getElementById('edit-slide-title');
    const descEl = document.getElementById('edit-slide-desc');
    const impactEl = document.getElementById('edit-slide-impact');
    const engineerEl = document.getElementById('edit-slide-engineer');
    const catEl = document.getElementById('edit-slide-category');

    let photoBefore = null;
    let photoAfter = null;
    if (typeof photoManager !== 'undefined') {
      const p = photoManager.getTaskPhotos(taskId, this.selectedMonth);
      if (p) {
        photoBefore = p.before_photo || null;
        photoAfter = p.after_photo || null;
      }
    }

    const category = catEl ? catEl.value.trim() : "Process development";
    const isCompleted = (category === 'Completed Projects' || category.toLowerCase().includes('completed project'));
    const isProj = Boolean(category && category.toLowerCase().includes('project'));

    const draftSlide = {
      task_id: taskId,
      month: this.selectedMonth,
      slide_title: titleEl ? titleEl.value.trim() : `Task ${taskId}`,
      raw_task_name: titleEl ? titleEl.value.trim() : `Task ${taskId}`,
      description: descEl ? descEl.value.trim() : "",
      impact: impactEl ? impactEl.value.trim().split("\n").filter(l => l.trim().length > 0) : [],
      engineer: engineerEl ? engineerEl.value.trim() : "Concern Engineer",
      category: category,
      status: isCompleted ? "Completed" : (isProj ? "Ongoing" : "Completed"),
      is_project: isProj,
      photo_before: photoBefore,
      photo_after: photoAfter,
      photo: photoBefore || photoAfter,
      has_dual_photo: Boolean(photoBefore && photoAfter),
      has_manual_override: true,
      project_type: isProj ? (isCompleted ? "Strategic Project • Completed" : "Strategic Project • Ongoing") : category
    };

    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openSingle) {
      SlidePreviewModal.openSingle(draftSlide);
    }
  },

  closeModal() {
    const container = document.getElementById('monthly-report-modal-container');
    if (container) container.innerHTML = '';
  },

  saveOverrides(event, taskId) {
    if (event) event.preventDefault();

    const titleEl = document.getElementById('edit-slide-title');
    const descEl = document.getElementById('edit-slide-desc');
    const impactEl = document.getElementById('edit-slide-impact');
    const engineerEl = document.getElementById('edit-slide-engineer');
    const catEl = document.getElementById('edit-slide-category');

    const newCategory = catEl ? catEl.value.trim() : null;

    const overrides = {
      slide_title: titleEl ? titleEl.value.trim() : "",
      description: descEl ? descEl.value.trim() : "",
      impact: impactEl ? impactEl.value.trim().split("\n").filter(l => l.trim().length > 0) : [],
      engineer: engineerEl ? engineerEl.value.trim() : "",
      ...(newCategory ? { category: newCategory } : {})
    };

    // 1. Save to SyncEngine overrides map
    if (window.appState && window.appState.syncEngine) {
      if (typeof window.appState.syncEngine.saveManualOverride === 'function') {
        window.appState.syncEngine.saveManualOverride(taskId, overrides);
      } else if (typeof window.appState.syncEngine.setManualOverride === 'function') {
        window.appState.syncEngine.setManualOverride(taskId, overrides);
      }
    }

    // 2. Permanently sync category to underlying workbook task so system never overwrites it
    if (newCategory && window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.updateTask(this.selectedMonth, taskId, {
        category: newCategory,
        last_updated: new Date().toISOString()
      });
      window.appState.workbookMgr.save();
    }

    // 3. Real-time Firebase broadcast if online
    if (newCategory && typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'category', newCategory);
    }

    // 4. Direct cache synchronization for instant presentation reload
    try {
      const cacheKey = `walton_pd_active_slides_${this.selectedMonth}`;
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const cachedSlides = JSON.parse(saved);
        const idx = cachedSlides.findIndex(s => s && s.task_id === taskId);
        if (idx !== -1) {
          cachedSlides[idx] = {
            ...cachedSlides[idx],
            ...overrides,
            has_manual_override: true,
            manual_override_time: new Date().toISOString()
          };
          localStorage.setItem(cacheKey, JSON.stringify(cachedSlides));
        }
      }
    } catch (e) {
      console.warn("Could not patch local active slides cache:", e);
    }

    this.closeModal();
    this.render();

    // 5. Automatically refresh Dashboard metrics and category counts
    if (typeof DashboardController !== 'undefined' && DashboardController.render) {
      DashboardController.render(this.selectedMonth);
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Slide overrides saved for task ${taskId}! Presentation preview updated.`, "success");
    }
  },

  resetOverrides(taskId) {
    if (window.appState && window.appState.syncEngine) {
      if (typeof window.appState.syncEngine.removeManualOverride === 'function') {
        window.appState.syncEngine.removeManualOverride(taskId);
      }
    }
    this.closeModal();
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast(`Reset task ${taskId} to original AI defaults.`, "info");
    }
  },

  previewFullDeck() {
    const month = this.selectedMonth;
    if (typeof ReportBuilderView !== 'undefined' && ReportBuilderView.previewFullDeck) {
      ReportBuilderView.previewFullDeck(month);
    } else if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openFullDeck) {
      const activeSlides = window.appState && window.appState.syncEngine
        ? window.appState.syncEngine.getActiveSlides(month)
        : [];
      if (typeof photoManager !== 'undefined') {
        activeSlides.forEach(s => {
          const p = photoManager.getTaskPhotos(s.task_id, month);
          s.photo_before = p ? (p.before_photo || null) : null;
          s.photo_after = p ? (p.after_photo || null) : null;
          s.photo = p ? (p.before_photo || p.after_photo || null) : null;
          s.has_dual_photo = Boolean(s.photo_before && s.photo_after);
        });
      }
      SlidePreviewModal.openFullDeck({ month, slides: activeSlides });
    } else {
      ExportController.exportHTML(month);
    }
  },

  render() {
    const container = document.getElementById('monthly-report-view-container');
    if (!container) return;

    const month = this.selectedMonth;
    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : (typeof MonthWorkbookManager !== 'undefined' ? new MonthWorkbookManager() : null);

    const months = workbookMgr ? workbookMgr.getAllMonths() : ["SEP-2026"];
    const allTasks = workbookMgr ? workbookMgr.getTasksForMonth(month) : [];

    // Get active slides using SyncEngine or fallback
    let activeSlides = (window.appState && window.appState.syncEngine)
      ? window.appState.syncEngine.getActiveSlides(month)
      : [];

    if (activeSlides.length === 0 && allTasks.length > 0) {
      activeSlides = allTasks.filter(t => t.include_in_report !== "NO" && t.monthly_report !== "NO").map((t, idx) => ({
        task_id: t.task_id || `${month}-${idx + 1}`,
        slide_title: t.task_name || `Task ${idx + 1}`,
        description: t.task_details || "Standard operating procedure execution and engineering development.",
        impact: ["Zero defect manufacturing", "Enhanced line balancing and cycle efficiency"],
        engineer: t.concern_engineer || t.engineer || t.assignee || "Concern Engineer",
        category: t.category || "Process Development",
        status: t.status || "Completed",
        photo_before: t.photo_before || t.photo || null,
        photo_after: t.photo_after || null,
        has_manual_override: false
      }));
    }

    // Dynamic Photo Binding: Always pull 100% current fresh photos from photoManager
    if (typeof photoManager !== 'undefined') {
      activeSlides.forEach(s => {
        const p = photoManager.getTaskPhotos(s.task_id, month);
        s.photo_before = p ? (p.before_photo || null) : null;
        s.photo_after = p ? (p.after_photo || null) : null;
        s.photo = p ? (p.before_photo || p.after_photo || null) : null;
        s.has_dual_photo = Boolean(s.photo_before && s.photo_after);
      });
    }

    // Filter by engineer if selected
    const norm = s => (s || '').trim().toLowerCase();
    const filterNorm = norm(this.filterEngineer);
    const filterFirst = filterNorm.split(/[\s(]/)[0];
    const isEngMatch = eng => {
      if (!filterNorm) return true;
      const e = norm(eng);
      if (e.includes(filterNorm)) return true;
      const eFirst = e.split(/[\s(]/)[0];
      return Boolean(eFirst && filterFirst && eFirst === filterFirst);
    };

    // Dynamic Category Highlights (Requirement 6 & 7: Only categories with tasks > 0)
    const reportCategoryCounts = {};
    let reportCompletedProjects = 0;
    let reportOngoingProjects = 0;

    activeSlides.forEach(s => {
      const cat = (s.category || 'Process Development').trim();
      const normCat = cat.replace(/–/g, '-').trim();
      const lowerCat = normCat.toLowerCase();
      
      if (s.is_project || lowerCat.includes('project')) {
        if ((s.status || '').toLowerCase() === 'completed' || lowerCat.includes('complete')) {
          reportCompletedProjects++;
        } else {
          reportOngoingProjects++;
        }
      } else {
        reportCategoryCounts[normCat] = (reportCategoryCounts[normCat] || 0) + 1;
      }
    });

    const highlightCards = [];
    Object.entries(reportCategoryCounts).forEach(([catName, cnt]) => {
      if (cnt <= 0) return;
      const normKey = catName.toLowerCase().replace(/–/g, '-').trim();
      const meta = (typeof REPORT_CATEGORY_META !== 'undefined' && (REPORT_CATEGORY_META[normKey] || REPORT_CATEGORY_META[catName.toLowerCase()])) || {
        label: catName,
        icon: "⚙️",
        note: "Process Report Task",
        bg: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
        border: "#94A3B8",
        valColor: "#334155",
        labelColor: "#1E293B",
        shadow: "rgba(100,116,139,0.16)"
      };
      highlightCards.push({
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
      });
    });

    if (reportCompletedProjects > 0) {
      highlightCards.push({
        id: "comp_proj",
        val: reportCompletedProjects,
        label: "Completed Projects",
        icon: "🏆",
        note: "Shop-Floor Commissioned",
        bg: "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)",
        border: "#F87171",
        valColor: "#B91C1C",
        labelColor: "#7F1D1D",
        shadow: "rgba(239,68,68,0.16)",
        filterCategory: "Completed Projects"
      });
    }

    if (reportOngoingProjects > 0) {
      highlightCards.push({
        id: "ongoing_proj",
        val: reportOngoingProjects,
        label: "New Projects / Ongoing",
        icon: "🚀",
        note: "Active Line Trials",
        bg: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)",
        border: "#22D3EE",
        valColor: "#0E7490",
        labelColor: "#164E63",
        shadow: "rgba(6,182,212,0.16)",
        filterCategory: "Ongoing Projects"
      });
    }

    highlightCards.sort((a, b) => b.val - a.val);

    let displayedSlides = this.filterEngineer
      ? activeSlides.filter(s => isEngMatch(s.engineer))
      : activeSlides;

    if (this.filterCategory) {
      const fCat = this.filterCategory.toLowerCase().replace(/–/g, '-').trim();
      displayedSlides = displayedSlides.filter(s => {
        const sCat = (s.category || '').toLowerCase().replace(/–/g, '-');
        if (fCat.includes('complete') && (s.is_project || sCat.includes('project'))) {
          return (s.status || '').toLowerCase() === 'completed' || sCat.includes('complete');
        }
        if (fCat.includes('ongoing') && (s.is_project || sCat.includes('project'))) {
          return (s.status || '').toLowerCase() !== 'completed' && !sCat.includes('complete');
        }
        return sCat.includes(fCat) || (s.category || '').toLowerCase() === fCat;
      });
    }

    // Unique engineers for filter pills
    const uniqueEngineers = Array.from(new Set(activeSlides.map(s => {
      const raw = s.engineer || 'Unassigned';
      return raw.split('(')[0].trim();
    }))).filter(Boolean);

    // Total sequence slide count calculation
    const totalPresentationSlides = activeSlides.length + 4; // Cover + Executive Dashboard + Tasks + Top 5 + Closing

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header Banner & Slide Hub Controls -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div class="flex items-center gap-4">
              <img src="assets/img/walton_logo.png" alt="WALTON" class="h-12 w-auto object-contain flex-shrink-0 drop-shadow-sm">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    EXECUTIVE SLIDE DECK HUB
                  </span>
                  <span class="text-xs text-slate-500 font-mono font-bold">${month}</span>
                </div>
                <h2 class="text-2xl font-black text-slate-900 mt-1">Monthly Report Presentation Hub</h2>
                <p class="text-xs text-slate-500 mt-0.5">
                  Complete slide-by-slide sequence review, live editorial overrides, full deck preview, and 1-click presentation download.
                </p>
              </div>
            </div>

            <!-- Export & Presentation Buttons -->
            <div class="flex flex-wrap items-center gap-2.5">
              <button onclick="MonthlyReportView.previewFullDeck()" class="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                <span>👁️</span> <span>Preview Full Deck</span>
              </button>
              <button onclick="ExportController.exportPPTX('${month}')" title="100% Native Editable PPTX" class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-black text-white shadow-md shadow-red-200/50 transition flex items-center gap-1 cursor-pointer">
                <span>📊</span> <span>Download PPTX</span>
              </button>
              <button onclick="ExportController.exportPDF('${month}')" class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1 shadow-sm cursor-pointer">
                <span>🖨️</span> <span>PDF</span>
              </button>
              <button onclick="ExportController.exportHTML('${month}')" class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1 shadow-sm cursor-pointer">
                <span>🌐</span> <span>HTML</span>
              </button>
            </div>
          </div>

          <!-- Month Selector UI (Running Month + Archive Dropdown) -->
          <div class="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              ${HELPERS.renderMonthSelectorUI(months, this.selectedMonth, 'MonthlyReportView.handleMonthSelect')}
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold">
                📑 Total Deck: <strong>${totalPresentationSlides} Slides</strong>
              </span>
              <span class="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                ⚙️ Task Slides: <strong>${activeSlides.length}</strong>
              </span>
            </div>
          </div>
        </div>

        <!-- SLIDE PRESENTATION DECK OVERVIEW SECTION (Requirement 3: Sequential Slide-by-Slide Cards) -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
          
          <!-- Section Title & Filters -->
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  🗂️
                </span>
                <h3 class="text-base font-black text-slate-900">Monthly Report Complete Slide Sequence</h3>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                Every slide is listed in exact presentation order. Click <span class="font-bold text-blue-600">✏️ Edit Slide</span> to override texts or milestones before export.
              </p>
            </div>

            <!-- Search Box & Counter -->
            <div class="flex items-center gap-3 w-full md:w-auto">
              <div class="relative flex-1 md:w-64">
                <input type="text" oninput="MonthlyReportView.handleSearch(this.value)" placeholder="Search slides by title, engineer..." 
                       class="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 font-medium" />
                <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>
              <span id="monthly-report-filtered-counter" class="text-xs font-mono text-slate-500 whitespace-nowrap">
                Showing all ${displayedSlides.length} task slides
              </span>
            </div>
          </div>

          <!-- Engineer Filter Pills -->
          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            <span class="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider pr-1">Filter Concern:</span>
            <button onclick="MonthlyReportView.handleEngineerFilter('')" 
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition border ${!this.filterEngineer ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
              All Engineers (${activeSlides.length})
            </button>
            ${uniqueEngineers.map(eng => {
              const isSel = (this.filterEngineer.toLowerCase() === eng.toLowerCase());
              const count = activeSlides.filter(s => isEngMatch(s.engineer)).length;
              return `
                <button onclick="MonthlyReportView.handleEngineerFilter('${HELPERS.escapeHtml(eng)}')" 
                        class="px-3 py-1.5 rounded-xl text-xs font-bold transition border ${isSel ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
                  👤 ${HELPERS.escapeHtml(eng)}
                </button>
              `;
            }).join('')}
          </div>

          <!-- SEQUENTIAL SLIDE DECK GRID -->
          <div class="space-y-4">
            
            <!-- Slide 1: Cover Slide Card -->
            <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <span class="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-400 font-mono font-black text-sm flex items-center justify-center flex-shrink-0">
                  #1
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500 text-white">COVER SLIDE</span>
                    <span class="text-xs font-mono text-slate-400">Opening Presentation</span>
                  </div>
                  <h4 class="text-base font-black text-white mt-1">AC Process Development Monthly Report</h4>
                  <p class="text-xs text-slate-300">Walton Hi-Tech Industries PLC &bull; Department of Process Development &bull; ${month}</p>
                </div>
              </div>
              <button onclick="MonthlyReportView.previewFullDeck()" class="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 border border-white/20">
                <span>👁️</span> <span>Preview Cover</span>
              </button>
            </div>

            <!-- Slide 2: Executive Dashboard & Performance Summary Card -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <span class="w-10 h-10 rounded-xl bg-blue-600 text-white font-mono font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                  #2
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-600 text-white">DASHBOARD SLIDE</span>
                    <span class="text-xs font-mono text-indigo-700">Executive Performance Matrix</span>
                  </div>
                  <h4 class="text-base font-black text-slate-900 mt-1">Executive Summary, Points &amp; Process Metrics</h4>
                  <p class="text-xs text-slate-600">Total Registered Tasks: <strong>${allTasks.length}</strong> &bull; Total Slide Candidates: <strong>${activeSlides.length}</strong> &bull; Departmental KPI Analysis</p>
                </div>
              </div>
              <button onclick="MonthlyReportView.previewFullDeck()" class="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 shadow-xs">
                <span>👁️</span> <span>Preview Dashboard</span>
              </button>
            </div>

            <!-- Slides 3+: Task Slides Sequence Grid (Editorial Overrides Hub) -->
            <div class="space-y-3">
              <div class="flex items-center justify-between pt-2">
                <span class="text-xs font-mono font-black text-slate-700 uppercase tracking-wider">
                  📋 Task Presentation Slides (Slides #3 to #${activeSlides.length + 2})
                </span>
                <span class="text-xs text-slate-500 font-medium">1 Task = 1 Presentation Slide</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${displayedSlides.length === 0 ? `
                  <div class="col-span-full py-12 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 text-xs font-mono">
                    No active slides match the current filter in ${month}.
                  </div>
                ` : displayedSlides.map((s, idx) => {
                  const hasPhoto = Boolean(s.photo_before || s.photo_after || s.photo);
                  const isOverridden = Boolean(s.has_manual_override);

                  return `
                    <div class="task-slide-card bg-white border ${isOverridden ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'} rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:border-blue-300 hover:shadow-sm transition space-y-3">
                      <div>
                        <!-- Slide Top Indicator -->
                        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span class="text-[10px] font-mono font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            Slide #${idx + 3}
                          </span>
                          <div class="flex items-center gap-1.5">
                            ${s.is_project ? `
                              <span class="text-[9px] font-mono font-bold ${s.status === 'Completed' ? 'text-emerald-700 bg-emerald-100' : 'text-purple-700 bg-purple-100'} px-1.5 py-0.2 rounded" title="Strategic Project Slide appended at end">
                                ${s.status === 'Completed' ? '✔ Completed Project' : '🚀 Ongoing Project'}
                              </span>
                            ` : ''}
                            ${isOverridden ? `
                              <span class="text-[9px] font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded shadow-xs" title="Slide content edited manually at ${s.manual_override_time || ''}">
                                ✏️ Overridden ${this.formatOverrideTime(s.manual_override_time)}
                              </span>
                            ` : ''}
                            <span class="text-[10px] font-mono text-slate-400">${s.task_id}</span>
                          </div>
                        </div>

                        <!-- Title & Meta -->
                        <h4 class="text-xs font-bold text-slate-900 mt-2 line-clamp-2 leading-snug" title="${HELPERS.escapeHtml(s.slide_title)}">
                          ${HELPERS.escapeHtml(s.slide_title)}
                        </h4>
                        
                        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span class="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            👤 ${HELPERS.escapeHtml(s.engineer)}
                          </span>
                          <span class="text-[10px] text-slate-500 font-medium">
                            ⚙️ ${HELPERS.escapeHtml(s.category || 'Process')}
                          </span>
                          <span class="text-[10px] font-mono ${hasPhoto ? 'text-emerald-600' : 'text-slate-400'}">
                            ${hasPhoto ? '📷 Photo Added' : '📷 No Photo'}
                          </span>
                        </div>

                        <!-- Description Preview -->
                        <p class="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                          ${HELPERS.escapeHtml(s.description || 'No milestone description')}
                        </p>
                      </div>

                      <!-- Slide Card Action (Unified Studio: Text, Photos & Live Preview) -->
                      <div class="pt-3 border-t border-slate-100">
                        <button onclick="MonthlyReportView.openModal('${s.task_id}')" class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-xs font-black text-white shadow-sm shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer">
                          <span>🎨</span> <span>Customize Slide (Text &amp; Photos)</span>
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Slide N+1: Top 5 Completed & Ongoing Summary Slide Card -->
            <div class="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <span class="w-10 h-10 rounded-xl bg-red-600 text-white font-mono font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                  #${activeSlides.length + 3}
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white">SUMMARY SLIDE</span>
                    <span class="text-xs font-mono text-red-700">Strategic Milestones</span>
                  </div>
                  <h4 class="text-base font-black text-slate-900 mt-1">Top 5 Completed &amp; Ongoing Works Summary</h4>
                  <p class="text-xs text-slate-600">Headline completed works and active carried-over projects with timeline targets.</p>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button onclick="App.switchTab('top5-summary')" class="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-red-700 border border-red-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                  <span>✏️</span> <span>Edit Top 5</span>
                </button>
                <button onclick="MonthlyReportView.previewFullDeck()" class="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                  <span>👁️</span> <span>Preview</span>
                </button>
              </div>
            </div>

            <!-- Slide N+2: Concluding Slide Card -->
            <div class="bg-slate-900 text-white rounded-2xl p-5 border border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <span class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono font-black text-sm flex items-center justify-center flex-shrink-0">
                  #${activeSlides.length + 4}
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-700 text-white">CLOSING SLIDE</span>
                    <span class="text-xs font-mono text-slate-400">Final Slide</span>
                  </div>
                  <h4 class="text-base font-black text-white mt-1">Thank You &bull; Continuous Process Improvement</h4>
                  <p class="text-xs text-slate-400">Process Development Team &bull; Walton Hi-Tech Industries PLC</p>
                </div>
              </div>
              <button onclick="MonthlyReportView.previewFullDeck()" class="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 border border-white/20">
                <span>👁️</span> <span>Preview Closing</span>
              </button>
            </div>

          </div>
        </div>

        <!-- PROCESS ENGINEERING CORE WORK HIGHLIGHTS (Requirement 3: Positioned at Bottom of Monthly Report Hub) -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center text-xl flex-shrink-0">
                ⚙️
              </div>
              <div>
                <h3 class="text-lg sm:text-xl font-black text-slate-900">
                  Process Engineering Core Work Highlights (${month})
                </h3>
                <p class="text-xs sm:text-sm text-slate-500 font-medium">
                  Categories with tasks approved for monthly presentation. Click any card to filter slide sequence.
                </p>
              </div>
            </div>
            ${this.filterCategory ? `
              <button onclick="MonthlyReportView.handleCategoryFilter('')" class="px-3.5 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold border border-red-200 transition flex items-center gap-1.5 cursor-pointer">
                <span>✕</span> <span>Reset Category Filter (${HELPERS.escapeHtml(this.filterCategory)})</span>
              </button>
            ` : `
              <span class="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                ${highlightCards.length} Active Categories
              </span>
            `}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${highlightCards.length === 0 ? `
              <div class="col-span-full py-8 text-center text-xs font-mono text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                No active categories with tasks found for ${month}.
              </div>
            ` : highlightCards.map((c, idx) => {
              const totalCards = highlightCards.length;
              const isOddTotal = (totalCards % 2 !== 0);
              const isLast = (idx === totalCards - 1);
              const spanClass = (isOddTotal && isLast) ? 'col-span-1 sm:col-span-2 lg:col-span-2' : '';
              const isSelected = (this.filterCategory && this.filterCategory.toLowerCase() === c.filterCategory.toLowerCase());
              return `
                <div onclick="MonthlyReportView.handleCategoryFilter('${HELPERS.escapeHtml(c.filterCategory)}')"
                     class="cursor-pointer rounded-2xl p-5 transition hover:scale-[1.02] hover:shadow-lg relative overflow-hidden flex flex-col justify-between ${spanClass} ${isSelected ? 'ring-2 ring-blue-600 shadow-md' : ''}"
                     style="background: ${c.bg}; border: 1.5px solid ${c.border}; box-shadow: 0 4px 12px ${c.shadow};"
                     title="Click to filter slide sequence by ${HELPERS.escapeHtml(c.filterCategory)}">
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
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonthlyReportView;
} else if (typeof window !== 'undefined') {
  window.MonthlyReportView = MonthlyReportView;
}
