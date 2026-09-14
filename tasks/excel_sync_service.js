/**
 * Process Development Monthly Report Automation System
 * Module: Excel Synchronization & SheetJS Integration
 * Enables reading, parsing, and generating Excel (.xlsx) files matching
 * 'Process Task management entry 2025_2026.xlsx'
 * WALTON Hi-Tech Industries PLC
 */

const ExcelSyncService = {
  /**
   * Parses an uploaded .xlsx or .csv File object
   * @param {File} file
   * @returns {Object} { sheetNames: [], sheetsData: { [sheetName]: [tasks] } }
   */
  async parseExcelFile(file) {
    if (typeof XLSX === 'undefined') {
      throw new Error("SheetJS (XLSX) library is not loaded.");
    }

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

    const result = {
      sheetNames: workbook.SheetNames,
      sheetsData: {}
    };

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      
      const parsedTasks = [];
      // Search for task data rows starting from row index 15 or wherever columns contain task text
      rows.forEach((row, rIdx) => {
        if (!row || row.length < 2) return;
        const colA = String(row[0] || "").trim();
        const colB = String(row[1] || "").trim();
        const colC = String(row[2] || "").trim();
        const colD = String(row[3] || "").trim();
        const colE = String(row[4] || "").trim();

        // Check if row has a task name in Col B and looks like a valid task row
        if (colB && colB.length > 3 && !colB.toLowerCase().includes("total") && !colB.toLowerCase().includes("target")) {
          parsedTasks.push({
            sl: colA,
            task_name: colB,
            task_details: colC,
            category: colD || "Process development",
            points: parseFloat(colE) || 50,
            row_index: rIdx + 1
          });
        }
      });

      result.sheetsData[sheetName] = parsedTasks;
    });

    return result;
  },

  /**
   * Generates a downloadable Excel (.xlsx) workbook for the selected month or all months
   * Matching 'Process Task management entry 2025_2026.xlsx' format
   * @param {Object} workbookMgr
   * @param {String} targetMonth
   */
  exportWorkbookToExcel(workbookMgr, targetMonth = null) {
    if (typeof XLSX === 'undefined') {
      throw new Error("SheetJS (XLSX) library is not loaded.");
    }

    const wb = XLSX.utils.book_new();
    const months = targetMonth ? [targetMonth] : workbookMgr.getAllMonths();

    months.forEach(m => {
      const tasks = workbookMgr.getTasksForMonth(m);
      
      // Calculate engineer totals (matching rows 1-10 of original Excel)
      const engTotals = {};
      tasks.forEach(t => {
        const eng = t.engineer || "Unassigned";
        if (!engTotals[eng]) engTotals[eng] = { count: 0, points: 0 };
        engTotals[eng].count++;
        engTotals[eng].points += (parseFloat(t.points) || 50);
      });

      // Prepare Rows
      const sheetData = [];
      // Row 1: Header for engineer totals
      sheetData.push(["SL", "Target Points", "Concern Engineer", "Total Task", "Earned Points"]);
      let engIdx = 1;
      for (const [engName, stats] of Object.entries(engTotals)) {
        sheetData.push([engIdx++, 2000, engName, stats.count, stats.points]);
      }

      // Empty rows spacing
      sheetData.push([]);
      sheetData.push([]);

      // Task Table Header (matching Row 15 of original Excel)
      sheetData.push(["SL", "Task Name", "Task Details / Work Steps", "Category", "Points", "Concern Engineer", "Task ID", "Include in Report"]);

      // Task rows
      tasks.forEach((t, idx) => {
        sheetData.push([
          idx + 1,
          t.task_name,
          t.task_details || "",
          t.category || "Process development",
          t.points || 50,
          t.engineer,
          t.task_id,
          t.include_in_report || "YES"
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },   // SL
        { wch: 45 },  // Task Name
        { wch: 50 },  // Details
        { wch: 25 },  // Category
        { wch: 10 },  // Points
        { wch: 20 },  // Engineer
        { wch: 16 },  // Task ID
        { wch: 12 }   // Include
      ];

      const safeSheetName = m.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    });

    const fileName = targetMonth 
      ? `Process_Task_Management_${targetMonth}.xlsx`
      : `Process_Task_Management_2025_2026.xlsx`;

    XLSX.writeFile(wb, fileName);
    return fileName;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExcelSyncService;
} else if (typeof window !== 'undefined') {
  window.ExcelSyncService = ExcelSyncService;
}
