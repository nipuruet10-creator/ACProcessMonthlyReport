/**
 * Process Development Monthly Report Automation System
 * Google Apps Script Web App API Router
 * WALTON Hi-Tech Industries PLC
 */

function doGet(e) {
  try {
    const action = e.parameter.action || 'getTasks';
    let responseData = {};

    if (action === 'getTasks') {
      const month = e.parameter.month;
      responseData = SheetsDB.getTasks(month);
    } else if (action === 'getMasterLists') {
      responseData = SheetsDB.getMasterLists();
    } else if (action === 'getReportHistory') {
      responseData = SheetsDB.getReportHistory();
    } else if (action === 'health') {
      responseData = { status: 'OK', system: 'Process Report Automation GAS Backend', timestamp: new Date() };
    } else {
      responseData = { error: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message, stack: err.stack }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;
    let result = {};

    if (action === 'SAVE') {
      result = SheetsDB.saveTask(payload);
    } else if (action === 'DELETE') {
      result = SheetsDB.deleteTask(payload.task_id);
    } else if (action === 'GENERATE_AI') {
      result = GeminiService.generateReportContent(payload);
    } else if (action === 'UPLOAD_PHOTO') {
      result = DriveStorage.uploadPhoto(payload);
    } else if (action === 'BUILD_SLIDES') {
      result = SlidesEngine.createMonthlyReportDeck(payload);
    } else {
      result = { error: 'Unsupported POST action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
