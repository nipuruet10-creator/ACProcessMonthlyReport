/**
 * Process Development Monthly Report Automation System
 * Module: Slide Preview Modal
 * Live 16:9 interactive slide deck presentation viewer
 * Matches Walton Reference Slide (media_1789013397250.png)
 * WALTON Hi-Tech Industries PLC
 */

const SlidePreviewModal = {
  activeSlides: [],
  deckHtmlList: [],
  deckTitles: [],
  isDeckMode: false,
  currentSlideIndex: 0,
  currentMonth: "SEP-2026",

  renderContainer() {
    let container = document.getElementById('slide-preview-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'slide-preview-modal-container';
      document.body.appendChild(container);
    }
    return container;
  },

  /**
   * Opens preview modal for the complete sequential slide deck:
   * Slide 1: Executive Cover (Walton Executive Red)
   * Slide 2: Table of Contents & Agenda
   * Slide 3: Executive Management Dashboard (Image 1 pattern)
   * Slides 4..N: Task Slides (1 Row = 1 Slide, Image 3 pattern)
   * Slide N+1: Top 5 Completed Works + Ongoing Projects (Image 2 pattern)
   */
  openFullDeck(reportData = {}, template = null) {
    if (!reportData) return;
    const tmpl = template || reportData.template || "walton_executive_crimson";
    this.isDeckMode = true;
    this.currentMonth = reportData.month || "SEP-2026";
    this.deckHtmlList = SlideLayoutEngine.renderDeck(reportData, tmpl);
    this.activeSlides = reportData.slides || [];
    this.currentSlideIndex = 0;

    const total = this.deckHtmlList.length;
    const taskSlides = this.activeSlides;

    this.deckTitles = [
      "1. Executive Cover Page",
      "2. Table of Contents & Agenda",
      "3. Executive Management Dashboard"
    ];
    taskSlides.forEach((t, i) => {
      const cleanTitle = (t.slide_title || t.task_name || `Task ${i + 1}`).replace(/<[^>]*>?/gm, '');
      this.deckTitles.push(`${i + 4}. [Task] ${cleanTitle}`);
    });
    this.deckTitles.push(`${total}. Top 5 Works & Projects Summary`);

    const container = this.renderContainer();
    this._renderModal(container);
  },

  /**
   * Opens the preview modal for a single slide
   */
  openSingle(slideData) {
    if (!slideData) return;
    this.isDeckMode = false;
    this.activeSlides = [slideData];
    this.deckHtmlList = [];
    this.currentSlideIndex = 0;
    const container = this.renderContainer();
    this._renderModal(container);
  },

  /**
   * Opens the preview modal with an array of task slides (1 Row = 1 Slide)
   */
  open(slides = [], initialTaskId = null) {
    if (!Array.isArray(slides) || slides.length === 0) {
      alert("No slides available for preview. Please ensure tasks are synced and included.");
      return;
    }

    this.isDeckMode = false;
    this.activeSlides = slides;
    this.deckHtmlList = [];
    this.currentSlideIndex = 0;

    if (initialTaskId) {
      const idx = this.activeSlides.findIndex(s => s.task_id === initialTaskId);
      if (idx >= 0) this.currentSlideIndex = idx;
    }

    const container = this.renderContainer();
    this._renderModal(container);
  },

  prev() {
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
      this._renderModal(this.renderContainer());
    }
  },

  next() {
    const total = this.isDeckMode ? this.deckHtmlList.length : this.activeSlides.length;
    if (this.currentSlideIndex < total - 1) {
      this.currentSlideIndex++;
      this._renderModal(this.renderContainer());
    }
  },

  goToSlide(idx) {
    const total = this.isDeckMode ? this.deckHtmlList.length : this.activeSlides.length;
    if (idx >= 0 && idx < total) {
      this.currentSlideIndex = idx;
      this._renderModal(this.renderContainer());
    }
  },

  close() {
    const container = document.getElementById('slide-preview-modal-container');
    if (container) container.innerHTML = '';
  },

  _renderModal(container) {
    const total = this.isDeckMode ? this.deckHtmlList.length : this.activeSlides.length;
    const isDeck = this.isDeckMode;

    let slideHtml = "";
    let headerTitle = "";
    let currentTask = null;

    if (isDeck) {
      slideHtml = this.deckHtmlList[this.currentSlideIndex] || "<div>Slide unavailable</div>";
      headerTitle = this.deckTitles[this.currentSlideIndex] || `Slide ${this.currentSlideIndex + 1}`;
      // Check if current slide is an active task slide (indices 3 to 3 + taskCount - 1)
      if (this.currentSlideIndex >= 3 && this.currentSlideIndex < 3 + this.activeSlides.length) {
        currentTask = this.activeSlides[this.currentSlideIndex - 3];
      }
    } else {
      currentTask = this.activeSlides[this.currentSlideIndex];
      slideHtml = typeof SlideLayoutEngine !== 'undefined'
        ? SlideLayoutEngine.renderTaskSlide(currentTask, this.currentSlideIndex + 1, total)
        : `<div>Slide Preview: ${currentTask ? currentTask.slide_title : ''}</div>`;
      headerTitle = currentTask ? (currentTask.slide_title || currentTask.task_name) : `Slide ${this.currentSlideIndex + 1}`;
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/95 backdrop-blur-md">
        <div class="relative w-full max-w-7xl bg-[#0B0F19] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 text-slate-100 flex flex-col max-h-[98vh]">
          
          <!-- Modal Top Control Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            
            <!-- Left Branding & Slide Info -->
            <div class="flex items-center gap-3">
              <span class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-red-600 text-white shadow-sm">
                ${isDeck ? 'FULL EXECUTIVE DECK' : '16:9 SLIDE PREVIEW'}
              </span>
              <div class="max-w-md truncate">
                <span class="text-xs font-bold text-white">${HELPERS.escapeHtml(headerTitle)}</span>
                ${currentTask ? `<span class="text-[10px] text-slate-400 ml-2 font-mono">ID: ${currentTask.task_id} &bull; ${currentTask.engineer}</span>` : ''}
              </div>
            </div>

            <!-- Slide Navigation & Jump Controls -->
            <div class="flex items-center gap-2">
              ${isDeck ? `
                <select onchange="SlidePreviewModal.goToSlide(parseInt(this.value))" class="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-red-500 max-w-[200px] truncate">
                  ${this.deckTitles.map((t, idx) => `<option value="${idx}" ${this.currentSlideIndex === idx ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
              ` : ''}

              <button onclick="SlidePreviewModal.prev()" ${this.currentSlideIndex === 0 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold disabled:opacity-30 border border-slate-700">
                &larr; Prev
              </button>
              <span class="text-xs font-mono text-red-400 font-bold px-1 whitespace-nowrap">
                ${this.currentSlideIndex + 1} / ${total}
              </span>
              <button onclick="SlidePreviewModal.next()" ${this.currentSlideIndex === total - 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold disabled:opacity-30 border border-slate-700">
                Next &rarr;
              </button>
              <button onclick="SlidePreviewModal.close()" class="ml-2 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

          </div>

          <!-- Slide Presentation Stage -->
          <div class="my-3 flex-1 flex items-center justify-center overflow-auto p-1 bg-[#070A11] rounded-xl border border-slate-900 shadow-inner">
            <div class="w-full max-w-5xl aspect-video bg-white rounded-lg overflow-hidden shadow-2xl flex items-center justify-center">
              ${slideHtml}
            </div>
          </div>

          <!-- Bottom Action Bar -->
          <div class="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2 text-slate-400">
              <span class="font-bold text-red-500">16:9 Master Presentation</span>
              <span>&bull;</span>
              <span>Walton Executive Theme</span>
              <span>&bull;</span>
              <span>Total Deck: <strong class="text-white">${total}</strong> Slides</span>
            </div>

            <div class="flex items-center gap-2">
              ${currentTask ? `
                <button onclick="SlidePreviewModal.editCurrentSlide()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700">
                  ✏️ Edit Slide
                </button>
                <button onclick="SlidePreviewModal.uploadPhotoCurrent()" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow">
                  📸 Upload Photo
                </button>
              ` : ''}

              <!-- Discrete Quick Export Actions -->
              <button onclick="ExportController.exportPPTX('${this.currentMonth}')" title="Download 100% Editable PowerPoint" class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow flex items-center gap-1">
                <span>📊</span> <span>PPTX</span>
              </button>
              <button onclick="ExportController.exportPDF('${this.currentMonth}')" title="Vector Print & Save as PDF" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1">
                <span>🖨</span> <span>PDF</span>
              </button>
              <button onclick="ExportController.exportHTML('${this.currentMonth}')" title="Download Standalone HTML Presentation" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1">
                <span>🌐</span> <span>HTML</span>
              </button>

              <button onclick="SlidePreviewModal.close()" class="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold">
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  editCurrentSlide() {
    let task = null;
    if (this.isDeckMode) {
      if (this.currentSlideIndex >= 3 && this.currentSlideIndex < 3 + this.activeSlides.length) {
        task = this.activeSlides[this.currentSlideIndex - 3];
      }
    } else {
      task = this.activeSlides[this.currentSlideIndex];
    }

    if (task && typeof FinalEditorView !== 'undefined') {
      this.close();
      FinalEditorView.openModal(task.task_id);
    } else {
      alert("Edit modal available for task slides.");
    }
  },

  uploadPhotoCurrent() {
    let task = null;
    if (this.isDeckMode) {
      if (this.currentSlideIndex >= 3 && this.currentSlideIndex < 3 + this.activeSlides.length) {
        task = this.activeSlides[this.currentSlideIndex - 3];
      }
    } else {
      task = this.activeSlides[this.currentSlideIndex];
    }

    if (task && typeof photoViewModal !== 'undefined') {
      photoViewModal.open(task.task_id);
    } else {
      alert("Photo upload available for task slides.");
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SlidePreviewModal;
} else if (typeof window !== 'undefined') {
  window.SlidePreviewModal = SlidePreviewModal;
}
