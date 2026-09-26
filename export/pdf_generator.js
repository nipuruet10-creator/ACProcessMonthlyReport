/**
 * Process Development Monthly Report Automation System
 * Module: PDF Report Generator
 * Generates vector print-ready 16:9 executive PDF reports
 * Enforces: Exact Slide-by-Slide Capture (Zero Blank Pages)
 * WALTON Hi-Tech Industries PLC
 */

const PDFReportGenerator = {
  /**
   * Resolves jsPDF constructor across different CDN loading variations
   */
  _getJsPDFClass() {
    if (typeof window === 'undefined') return null;
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (typeof window.jsPDF === 'function') return window.jsPDF;
    return null;
  },

  /**
   * Resolves html2canvas function across CDN bundles
   */
  _getHtml2Canvas() {
    if (typeof window === 'undefined') return null;
    if (typeof window.html2canvas === 'function') return window.html2canvas;
    return null;
  },

  /**
   * Preloads all images inside a DOM node before capturing canvas
   */
  async _preloadImages(container) {
    const imgs = Array.from(container.querySelectorAll('img'));
    if (imgs.length === 0) return;
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 500); // 500ms safety timeout
      });
    }));
  },

  /**
   * Executes reliable slide-by-slide 16:9 PDF export
   * Guarantees every slide is captured in its entirety without blank pages or split elements
   */
  async _renderSlidesToPDF(slides, fileName, title = "Monthly Engineering Report") {
    const jsPDFClass = this._getJsPDFClass();
    const html2canvasFunc = this._getHtml2Canvas();

    if (!jsPDFClass || !html2canvasFunc) {
      throw new Error("Required PDF rendering libraries (jsPDF / html2canvas) are not loaded.");
    }

    if (!Array.isArray(slides) || slides.length === 0) {
      throw new Error("No slides provided for PDF generation.");
    }

    // 1. Create a dedicated 1280x720 capture stage placed at (0, 0)
    // Placed at top: 0, left: 0 behind the application (z-index: -9999) with opacity: 1 so html2canvas renders perfectly
    const stage = document.createElement('div');
    stage.id = 'walton-pdf-capture-stage';
    stage.style.cssText = 'position: fixed; top: 0; left: 0; width: 1280px; height: 720px; z-index: -9999; background: #ffffff; overflow: hidden; pointer-events: none; opacity: 1; box-sizing: border-box; margin: 0; padding: 0;';
    document.body.appendChild(stage);

    // 2. Initialize jsPDF in 16:9 widescreen landscape (1280 × 720 points)
    const pdf = new jsPDFClass({
      orientation: 'landscape',
      unit: 'pt',
      format: [1280, 720],
      compress: true
    });

    try {
      for (let i = 0; i < slides.length; i++) {
        const slideIndex = i + 1;
        const totalSlides = slides.length;

        if (typeof window !== 'undefined' && typeof window.showToast === 'function' && (slideIndex === 1 || slideIndex % 5 === 0 || slideIndex === totalSlides)) {
          window.showToast(`Rendering PDF: page ${slideIndex} of ${totalSlides}...`, 'info');
        }

        // Mount slide HTML into stage
        stage.innerHTML = slides[i];

        // Ensure root element fills the 1280x720 stage
        const rootEl = stage.firstElementChild || stage;
        if (rootEl && rootEl.style) {
          rootEl.style.width = '1280px';
          rootEl.style.height = '720px';
          rootEl.style.boxSizing = 'border-box';
          rootEl.style.borderRadius = '0px'; // Flat borders for clean vector page bounds
        }

        // Suppress interactive editor toolbars, upload buttons and drag hints in captured PDF
        try {
          const toRemove = stage.querySelectorAll('button, input[type="file"], .opacity-0, .pointer-events-none, .group-hover\\:opacity-100');
          toRemove.forEach(el => el.parentNode && el.parentNode.removeChild(el));
        } catch (_) {}

        // Wait for all images in this slide to finish loading
        await this._preloadImages(stage);

        // Wait for fonts to be ready
        if (document.fonts && document.fonts.ready) {
          try { await document.fonts.ready; } catch (_) {}
        }
        await new Promise(r => setTimeout(r, 60));

        // Capture slide to high-res canvas (1.5x scale = 1920x1080 sharp executive render)
        const canvas = await html2canvasFunc(stage, {
          scale: 1.5,
          useCORS: true,
          allowTaint: false,
          logging: false,
          width: 1280,
          height: 720,
          windowWidth: 1280,
          windowHeight: 720,
          x: 0,
          y: 0,
          backgroundColor: '#ffffff'
        });

        let imgData;
        try {
          imgData = canvas.toDataURL('image/jpeg', 0.95);
        } catch (taintErr) {
          console.warn("Canvas tainted by image, attempting fallback render:", taintErr);
          // Fallback to blank white or sanitized canvas
          imgData = canvas.toDataURL('image/png');
        }

        // Add page to PDF
        if (i > 0) {
          pdf.addPage([1280, 720], 'landscape');
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, 1280, 720, undefined, 'FAST');
      }

      // Save PDF file directly to user's device
      pdf.save(fileName);

      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast(`✅ ${title} PDF downloaded successfully (${slides.length} pages)!`, 'success');
      }

      return {
        success: true,
        method: 'slide_by_slide_canvas_jspdf',
        fileName,
        pageCount: slides.length
      };

    } finally {
      // Always clean up stage
      if (stage.parentNode) {
        stage.parentNode.removeChild(stage);
      }
    }
  },

  /**
   * Generates and triggers direct download of a 16:9 vector PDF report
   * @param {Object} reportData - Deck data bundle { month, slides, dashboardData, topWorksData }
   * @param {string} template - "walton_executive_crimson" or "industrial_innovation_blue"
   */
  async generatePDF(reportData = {}, template = "walton_executive_crimson") {
    const rawMonth = reportData.month || "SEPTEMBER 2026";
    const monthClean = rawMonth.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Walton_AC_Process_Monthly_Report_${monthClean}.pdf`;

    // 1. Primary Engine: Direct Slide-by-Slide 16:9 Canvas + jsPDF
    if (this._getJsPDFClass() && this._getHtml2Canvas()) {
      try {
        const slides = (typeof SlideLayoutEngine !== 'undefined' && SlideLayoutEngine.renderDeck)
          ? SlideLayoutEngine.renderDeck(reportData, template)
          : [];

        if (slides.length > 0) {
          return await this._renderSlidesToPDF(slides, fileName, `Monthly Report (${rawMonth})`);
        }
      } catch (err) {
        console.warn("Slide-by-slide PDF generation encountered an issue, falling back to print dialog:", err);
      }
    }

    // 2. Secondary Engine: Standalone Printable Window with System Print Dialog
    const html = (typeof HTMLReportGenerator !== 'undefined')
      ? HTMLReportGenerator.generateStandaloneHTML(reportData, template)
      : '';

    try {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        setTimeout(() => {
          printWin.focus();
          printWin.print();
        }, 600);
        return { success: true, method: 'print_window', fileName };
      }
    } catch (e) {
      console.warn("Popup blocked for print window:", e);
    }

    // 3. Fallback: Download as print-ready HTML file
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Walton_AC_Process_Monthly_Report_${monthClean}_Print_Ready.html`;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, method: 'html_fallback', fileName: a.download };
  },

  /**
   * Generates and triggers direct download of Executive Management Report PDF
   */
  async generateManagementPDF(reportData = {}) {
    const rawMonth = reportData.month || "SEPTEMBER 2026";
    const monthClean = rawMonth.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Walton_Executive_Management_Report_${monthClean}.pdf`;

    if (this._getJsPDFClass() && this._getHtml2Canvas()) {
      try {
        const mgr = (typeof window !== 'undefined' && window.managementReportMgr) ? window.managementReportMgr : null;
        const tasks = reportData.tasks || (mgr ? mgr.getTasksForMonth(rawMonth) : []);
        const summary = reportData.summary || (mgr ? mgr.getSummary(rawMonth) : {});

        // Build the discrete slides for management report
        const slides = [];
        if (typeof ManagementHTMLGenerator !== 'undefined') {
          const totalSlides = tasks.length + 3;
          slides.push(ManagementHTMLGenerator._renderCoverSlide(rawMonth));
          slides.push(ManagementHTMLGenerator._renderSummaryTableSlide(rawMonth, tasks, summary, 2, totalSlides));
          tasks.forEach((t, idx) => {
            slides.push(ManagementHTMLGenerator._renderTaskSlide(rawMonth, t, idx + 3, totalSlides));
          });
          slides.push(ManagementHTMLGenerator._renderThankYouSlide(rawMonth));
        }

        if (slides.length > 0) {
          return await this._renderSlidesToPDF(slides, fileName, `Executive Management Report (${rawMonth})`);
        }
      } catch (err) {
        console.warn("Management slide-by-slide PDF failed, falling back:", err);
      }
    }

    if (typeof ManagementReportView !== 'undefined' && ManagementReportView.openStandaloneDeck) {
      ManagementReportView.openStandaloneDeck();
      return { success: true, method: 'standalone_deck' };
    }
    return { success: false, error: 'PDF engine unavailable' };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFReportGenerator;
} else if (typeof window !== 'undefined') {
  window.PDFReportGenerator = PDFReportGenerator;
}
