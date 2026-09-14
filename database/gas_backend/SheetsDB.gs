/**
 * Process Development Monthly Report Automation System
 * Module: SheetsDB - Google Sheets Source of Truth Adapter
 * WALTON Hi-Tech Industries PLC
 */

const SheetsDB = {
  getSpreadsheet() {
    const props = PropertiesService.getScriptProperties();
    const sheetId = props.getProperty('SPREADSHEET_ID');
    if (sheetId) {
      return SpreadsheetApp.openById(sheetId);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  },

  getTasksSheet() {
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName('TASKS');
    if (!sheet) {
      sheet = ss.insertSheet('TASKS');
      // Create Header Row (33 fields)
      const headers = [
        'task_id', 'entry_date', 'task_month', 'task_name', 'task_details',
        'category', 'task_point', 'supervisor', 'concern_engineer', 'assignee_2',
        'start_date', 'end_date', 'status', 'progress_percent', 'impact',
        'cost_impact', 'annual_saving', 'deadline', 'monthly_report', 'report_section',
        'report_priority', 'photo_required', 'photo_1', 'photo_2', 'before_photo',
        'after_photo', 'ai_report_title', 'ai_report_description', 'ai_report_impact',
        'report_ready', 'report_order', 'remarks', 'last_updated'
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1E293B').setFontColor('#F8FAFC');
      sheet.setFrozenRows(1);
    }
    return sheet;
  },

  getTasks(month) {
    const sheet = this.getTasksSheet();
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];

    const headers = values[0];
    const tasks = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const task = {};
      headers.forEach((h, colIdx) => {
        task[h] = row[colIdx];
      });
      if (!month || task.task_month === month) {
        tasks.push(task);
      }
    }
    return tasks;
  },

  saveTask(taskData) {
    const sheet = this.getTasksSheet();
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    let rowIndex = -1;

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === taskData.task_id) {
        rowIndex = i + 1;
        break;
      }
    }

    const rowData = headers.map(h => taskData[h] !== undefined ? taskData[h] : "");

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    return { success: true, task_id: taskData.task_id };
  },

  deleteTask(taskId) {
    const sheet = this.getTasksSheet();
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === taskId) {
        sheet.deleteRow(i + 1);
        return { success: true, deleted: taskId };
      }
    }
    return { success: false, message: 'Task not found' };
  }
};
