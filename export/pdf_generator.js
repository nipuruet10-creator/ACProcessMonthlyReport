/**
 * Process Development Monthly Report Automation System
 * Module: PDF Report Generator
 * Generates vector print-ready executive PDF reports
 * WALTON Hi-Tech Industries PLC
 */

const PDFReportGenerator = {
  /**
   * Generates PDF report by rendering a clean vector printable window or downloading
   */
  async generatePDF(reportData) {
    const html = HTMLReportGenerator.generateStandaloneHTML(reportData);
    
    // Method 1: Invisible Print Iframe (immune to popup blockers)
    try {
      let iframe = document.getElementById('pdf-print-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'pdf-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 600);
      return { success: true, method: 'iframe_print' };
    } catch (e) {
      // Fallback: window.open
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        setTimeout(() => {
          printWin.focus();
          printWin.print();
        }, 500);
        return { success: true, method: 'print_window' };
      } else {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Monthly_Report_${reportData.month.replace(/\s+/g, '_')}_Print_Ready.html`;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true, method: 'html_fallback' };
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFReportGenerator;
} else if (typeof window !== 'undefined') {
  window.PDFReportGenerator = PDFReportGenerator;
}
