/**
 * Process Development Monthly Report Automation System
 * Module: DriveStorage - Google Drive Photo & Report Archive Storage
 * WALTON Hi-Tech Industries PLC
 */

const DriveStorage = {
  getReportFolder() {
    const props = PropertiesService.getScriptProperties();
    const folderId = props.getProperty('DRIVE_FOLDER_ID');
    if (folderId) {
      return DriveApp.getFolderById(folderId);
    }
    const folders = DriveApp.getFoldersByName('WALTON_Process_Monthly_Reports');
    if (folders.hasNext()) {
      return folders.next();
    }
    return DriveApp.createFolder('WALTON_Process_Monthly_Reports');
  },

  getPhotosFolder() {
    const root = this.getReportFolder();
    const sub = root.getFoldersByName('Task_Photos');
    if (sub.hasNext()) return sub.next();
    return root.createFolder('Task_Photos');
  },

  uploadPhoto(payload) {
    // payload: { task_id, photoType: 'photo_1'|'before'|'after', base64Data, mimeType, fileName }
    const photosFolder = this.getPhotosFolder();
    const data = Utilities.base64Decode(payload.base64Data.split(',')[1] || payload.base64Data);
    const blob = Utilities.newBlob(data, payload.mimeType || 'image/jpeg', `${payload.task_id}_${payload.photoType}_${payload.fileName}`);
    const file = photosFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileUrl = file.getUrl();
    // Update task in SheetsDB
    const task = SheetsDB.getTasks().find(t => t.task_id === payload.task_id);
    if (task) {
      task[payload.photoType] = fileUrl;
      task.last_updated = new Date().toISOString();
      SheetsDB.saveTask(task);
    }

    return {
      success: true,
      fileId: file.getId(),
      fileUrl: fileUrl,
      downloadUrl: file.getDownloadUrl()
    };
  }
};
