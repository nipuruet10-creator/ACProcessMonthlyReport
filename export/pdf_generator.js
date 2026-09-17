/**
 * Process Development Monthly Report Automation System
 * Module: PDF Report Generator
 * Generates vector print-ready executive PDF reports
 * WALTON Hi-Tech Industries PLC
 */

const PDFReportGenerator = {
  /**
   * Generates and triggers direct download of a 16:9 vector PDF report
   * @param {Object} reportData - Deck data bundle { month, slides, dashboardData, topWorksData }
   * @param {string} template - "walton_executive_crimson" or "industrial_innovation_blue"
   */
  async generatePDF(reportData = {}, template = "walton_executive_crimson") {
    const rawMonth = reportData.month || "SEPTEMBER 2026";
    const monthClean = rawMonth.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Walton_AC_Process_Monthly_Report_${monthClean}.pdf`;

    // Priority 1: Direct Client-Side PDF File Download via html2pdf.js
    if (typeof html2pdf !== 'undefined') {
      try {
        const slides = (typeof SlideLayoutEngine !== 'undefined' && SlideLayoutEngine.renderDeck)
          ? SlideLayoutEngine.renderDeck(reportData, template)
          : [];

        if (slides.length > 0) {
          const container = document.createElement('div');
          container.id = 'walton-pdf-export-container';
          container.style.cssText = 'position: fixed; left: -99999px; top: 0; width: 1280px; z-index: -9999; background: #ffffff; color: #0f172a;';

          // Render each 16:9 slide as a distinct page
          container.innerHTML = `
            <style>
              .pdf-page {
                width: 1280px !important;
                height: 720px !important;
                page-break-after: always !important;
                break-after: page !important;
                overflow: hidden !important;
                position: relative !important;
                box-sizing: border-box !important;
                background: #ffffff !important;
              }
              .pdf-page:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
            </style>
            ${slides.map(slideHtml => `
              <div class="pdf-page">
                ${slideHtml}
              </div>
            `).join('')}
          `;

          document.body.appendChild(container);

          const opt = {
            margin: 0,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              letterRendering: true,
              logging: false,
              allowTaint: true
            },
            jsPDF: {
              unit: 'px',
              format: [1280, 720],
              orientation: 'landscape',
              hotfixes: ['px_scaling']
            }
          };

          await html2pdf().set(opt).from(container).save();
          document.body.removeChild(container);
          return { success: true, method: 'html2pdf_direct_download', fileName };
        }
      } catch (err) {
        console.warn("Direct html2pdf generation encountered an issue, trying window fallback:", err);
      }
    }

    // Priority 2: Standalone Printable Window with System Print Dialog
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

    // Priority 3: Download as print-ready HTML file
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

    if (typeof html2pdf !== 'undefined') {
      try {
        const mgr = (typeof window !== 'undefined' && window.managementReportMgr) ? window.managementReportMgr : null;
        const tasks = reportData.tasks || (mgr ? mgr.getTasksForMonth(rawMonth) : []);
        const summary = reportData.summary || (mgr ? mgr.getSummary(rawMonth) : {});

        const html = (typeof ManagementHTMLGenerator !== 'undefined')
          ? ManagementHTMLGenerator.generateStandaloneHTML({ month: rawMonth, tasks, summary })
          : '';

        const container = document.createElement('div');
        container.id = 'mgmt-pdf-container';
        container.style.cssText = 'position: fixed; left: -99999px; top: 0; width: 1280px; z-index: -9999; background: #ffffff;';
        container.innerHTML = html;
        document.body.appendChild(container);

        const opt = {
          margin: 0,
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'px', format: [1280, 720], orientation: 'landscape', hotfixes: ['px_scaling'] }
        };

        await html2pdf().set(opt).from(container).save();
        document.body.removeChild(container);
        return { success: true, method: 'html2pdf_direct_download', fileName };
      } catch (err) {
        console.warn("Management html2pdf failed, falling back to window print:", err);
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
