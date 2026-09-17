/**
 * Process Development Monthly Report Automation System
 * Module: Photo Manager (Enterprise Hybrid Storage)
 * Stores full-resolution compressed photos in IndexedDB (Gigabytes quota)
 * Keeps lightweight in-memory cache for zero-latency synchronous slide rendering
 * Completely immune to browser 5MB LocalStorage quota limitations
 * WALTON Hi-Tech Industries PLC
 */

class PhotoManager {
  constructor(storageKey = "walton_pd_task_photos_v1") {
    this.storageKey = storageKey;
    this.photoMap = {}; // In-memory map of taskId -> { photo_1, photo_2, before_photo, after_photo }
    this.isReady = false;
    this.init();
  }

  async init() {
    // 1. First, check and migrate any legacy photos from LocalStorage to IndexedDB
    try {
      const legacySaved = localStorage.getItem(this.storageKey);
      if (legacySaved) {
        const parsed = JSON.parse(legacySaved);
        if (parsed && typeof parsed === 'object') {
          this.photoMap = { ...parsed };
          // Migrate each to IndexedDB
          if (typeof PhotoIndexedDB !== 'undefined') {
            for (const [tId, pData] of Object.entries(parsed)) {
              if (pData) await PhotoIndexedDB.saveTaskPhotos(tId, pData);
            }
          }
        }
        // Remove massive photo blobs from localStorage to free up the 5MB browser quota!
        localStorage.removeItem(this.storageKey);
        console.log("Migrated photos from LocalStorage to IndexedDB and cleared LocalStorage quota.");
      }
    } catch (e) {
      console.warn("Legacy photo migration notice:", e);
    }

    // 2. Clean up any bloated active slides in LocalStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("walton_pd_active_slides_")) {
          const val = localStorage.getItem(key);
          if (val && val.length > 500000) { // If larger than 500KB, strip base64
            const slides = JSON.parse(val);
            if (Array.isArray(slides)) {
              slides.forEach(s => {
                s.photo = null;
                s.photo_before = null;
                s.photo_after = null;
              });
              localStorage.setItem(key, JSON.stringify(slides));
              console.log(`Optimized storage for ${key}`);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Storage quota optimization notice:", e);
    }

    // 3. Load all photos from IndexedDB into memory
    try {
      if (typeof PhotoIndexedDB !== 'undefined') {
        const idbPhotos = await PhotoIndexedDB.getAllPhotos();
        if (idbPhotos && Object.keys(idbPhotos).length > 0) {
          this.photoMap = { ...this.photoMap, ...idbPhotos };
        }
      }
    } catch (e) {
      console.warn("Could not read photos from IndexedDB:", e);
    }

    this.isReady = true;
  }

  getTaskPhotos(taskId) {
    const mem = this.photoMap[taskId] || {};
    let taskP1 = null;
    let taskP2 = null;
    if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      const wbMgr = window.appState.workbookMgr;
      const t = wbMgr.getTask(wbMgr.activeMonth, taskId);
      if (t) {
        taskP1 = t.photo_1 || null;
        taskP2 = t.photo_2 || null;
      }
    }
    const p1 = mem.photo_1 || mem.before_photo || taskP1 || null;
    const p2 = mem.photo_2 || mem.after_photo || taskP2 || null;
    return {
      photo_1: p1,
      photo_2: p2,
      before_photo: p1,
      after_photo: p2
    };
  }

  /**
   * Compress and save photo file to IndexedDB and sync thumbnail to Google Sheets
   * Full resolution photo stored in IndexedDB; compact thumbnail synced across devices.
   */
  async savePhotoFile(taskId, slot, file) {
    if (!taskId || !file) return null;

    let compressedData = "";
    if (typeof PhotoStorageProvider !== 'undefined' && PhotoStorageProvider.compressImageFile) {
      compressedData = await PhotoStorageProvider.compressImageFile(file);
    } else if (typeof PhotoStorageProvider !== 'undefined' && PhotoStorageProvider.fileToBase64) {
      compressedData = await PhotoStorageProvider.fileToBase64(file);
    } else {
      compressedData = "";
    }

    let syncThumbnail = "";
    if (typeof PhotoStorageProvider !== 'undefined' && PhotoStorageProvider.generateSyncThumbnail) {
      syncThumbnail = await PhotoStorageProvider.generateSyncThumbnail(file);
    } else if (compressedData && compressedData.length < 35000) {
      syncThumbnail = compressedData;
    }

    return this.setTaskPhoto(taskId, slot, compressedData, syncThumbnail);
  }

  async setTaskPhoto(taskId, slot, base64Url, syncThumbnail = null) {
    if (!this.photoMap[taskId]) {
      this.photoMap[taskId] = { photo_1: null, photo_2: null, before_photo: null, after_photo: null };
    }
    this.photoMap[taskId][slot] = base64Url;

    // 1. Asynchronously persist to IndexedDB (Gigabytes quota)
    if (typeof PhotoIndexedDB !== 'undefined') {
      PhotoIndexedDB.saveTaskPhotos(taskId, this.photoMap[taskId]).catch(err => {
        console.warn("IndexedDB async save notice:", err);
      });
    }

    // 2. Safely update AI Breakdown sheet metadata without saving massive blobs to LocalStorage
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.breakdownSheet) {
        const updates = { task_id: taskId, slide_status: "READY" };
        window.appState.breakdownSheet.upsertBreakdown(updates);
      }
    } catch (e) {
      console.warn("Breakdown update notice:", e);
    }

    // 3. Update in-memory active presentation slides without crashing LocalStorage
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.syncEngine) {
        const month = window.appState.workbookMgr ? window.appState.workbookMgr.activeMonth : "SEP-2026";
        const slides = window.appState.syncEngine.getActiveSlides(month);
        const target = slides.find(s => s.task_id === taskId);
        if (target) {
          if (slot === 'before_photo') target.photo_before = base64Url;
          else if (slot === 'after_photo') target.photo_after = base64Url;
          else target.photo = base64Url;
        }
      }
    } catch (e) {
      console.warn("Active slides memory update notice:", e);
    }

    // 4. Synchronize thumbnail to MonthWorkbookManager & push to Google Sheets!
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
        const wbMgr = window.appState.workbookMgr;
        const activeM = wbMgr.activeMonth || "SEP-2026";
        const allMonths = (wbMgr.getAllMonths && typeof wbMgr.getAllMonths === 'function')
          ? wbMgr.getAllMonths()
          : [activeM];
        let targetTask = wbMgr.getTask(activeM, taskId);
        if (!targetTask) {
          for (const m of allMonths) {
            const t = wbMgr.getTask(m, taskId);
            if (t) { targetTask = t; break; }
          }
        }

        if (targetTask) {
          const photoKey = (slot === 'after_photo' || slot === 'photo_2') ? 'photo_2' : 'photo_1';
          
          // ALWAYS preserve full resolution photo locally in targetTask!
          targetTask[photoKey] = base64Url;
          targetTask.last_updated = new Date().toISOString();
          wbMgr.save();

          // Push to cloud in background: prefer Google Drive direct CDN link, fallback to sharp thumbnail
          (async () => {
            let cloudPhotoRef = null;
            if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.uploadPhoto) {
              cloudPhotoRef = await GoogleSheetsSync.uploadPhoto(taskId, slot, base64Url);
            }

            if (cloudPhotoRef) {
              // Google Drive successfully stored original photo! Update targetTask with high-res Drive CDN link
              targetTask[photoKey] = cloudPhotoRef;
              targetTask.last_updated = new Date().toISOString();
              wbMgr.save();
              if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
                GoogleSheetsSync.pushTask(targetTask);
              }
            } else {
              // Fallback for Google Sheets cell: generate sharp thumbnail fitting in cell
              let th = syncThumbnail;
              if (!th && typeof PhotoStorageProvider !== 'undefined' && PhotoStorageProvider.generateSyncThumbnail) {
                th = await PhotoStorageProvider.generateSyncThumbnail(base64Url);
              }
              const taskToPush = { ...targetTask, [photoKey]: th || base64Url };
              if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
                GoogleSheetsSync.pushTask(taskToPush);
              }
            }
          })().catch(err => console.warn("Background photo cloud sync notice:", err));
        }
      }
    } catch (syncErr) {
      console.warn("Photo sync to Google Sheets notice:", syncErr);
    }

    return base64Url;
  }

  async removePhoto(taskId, slot) {
    if (this.photoMap[taskId]) {
      this.photoMap[taskId][slot] = null;
      if (typeof PhotoIndexedDB !== 'undefined') {
        await PhotoIndexedDB.saveTaskPhotos(taskId, this.photoMap[taskId]);
      }
    }

    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.breakdownSheet) {
        const remaining = this.getTaskPhotos(taskId);
        const hasAny = remaining.photo_1 || remaining.photo_2 || remaining.before_photo || remaining.after_photo;
        window.appState.breakdownSheet.upsertBreakdown({
          task_id: taskId,
          [slot]: null,
          slide_status: hasAny ? "READY" : "PHOTO PENDING"
        });
      }
    } catch (e) {}

    // Also remove from MonthWorkbookManager and push deletion to Google Sheets
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
        const wbMgr = window.appState.workbookMgr;
        const activeM = wbMgr.activeMonth || "SEP-2026";
        const allMonths = (wbMgr.getAllMonths && typeof wbMgr.getAllMonths === 'function')
          ? wbMgr.getAllMonths()
          : [activeM];
        let targetTask = wbMgr.getTask(activeM, taskId);
        if (!targetTask) {
          for (const m of allMonths) {
            const t = wbMgr.getTask(m, taskId);
            if (t) { targetTask = t; break; }
          }
        }
        if (targetTask) {
          const photoKey = (slot === 'after_photo' || slot === 'photo_2') ? 'photo_2' : 'photo_1';
          targetTask[photoKey] = "";
          targetTask.last_updated = new Date().toISOString();
          wbMgr.save();
          if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
            GoogleSheetsSync.pushTask(targetTask);
          }
        }
      }
    } catch (e) {}

    return true;
  }

  hasPhoto(taskId) {
    const photos = this.getTaskPhotos(taskId);
    return Boolean(photos.photo_1 || photos.photo_2 || photos.before_photo || photos.after_photo);
  }
}

const photoManager = new PhotoManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PhotoManager, photoManager };
} else if (typeof window !== 'undefined') {
  window.PhotoManager = PhotoManager;
  window.photoManager = photoManager;
}
