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

  getTaskPhotos(taskId, month = null) {
    let m = month;
    if (!m && typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      m = window.appState.workbookMgr.activeMonth;
    }
    if (!m && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.selectedMonth) {
      m = MonthlyInputView.selectedMonth;
    }
    const monthKey = m ? `${m}_${taskId}` : null;
    const memMonth = monthKey ? this.photoMap[monthKey] : null;

    let t = null;
    let taskP1 = null;
    let taskP2 = null;
    if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      const wbMgr = window.appState.workbookMgr;
      t = m ? wbMgr.getTask(m, taskId) : wbMgr.getTask(wbMgr.activeMonth, taskId);
      if (t) {
        taskP1 = (!t.clear_photos && !t._photoDeleted_before && t.photo_1) ? t.photo_1 : null;
        taskP2 = (!t.clear_photos && !t._photoDeleted_after && t.photo_2) ? t.photo_2 : null;
      }
    }

    // Determine Before Photo (p1)
    let p1 = null;
    if (memMonth && (memMonth.before_photo !== undefined || memMonth.photo_1 !== undefined)) {
      p1 = memMonth.before_photo || memMonth.photo_1 || null;
    } else if (this.photoMap[taskId] && (this.photoMap[taskId].before_photo !== undefined || this.photoMap[taskId].photo_1 !== undefined)) {
      p1 = this.photoMap[taskId].before_photo || this.photoMap[taskId].photo_1 || null;
    } else {
      p1 = taskP1;
    }

    // Determine After Photo (p2)
    let p2 = null;
    if (memMonth && (memMonth.after_photo !== undefined || memMonth.photo_2 !== undefined)) {
      p2 = memMonth.after_photo || memMonth.photo_2 || null;
    } else if (this.photoMap[taskId] && (this.photoMap[taskId].after_photo !== undefined || this.photoMap[taskId].photo_2 !== undefined)) {
      p2 = this.photoMap[taskId].after_photo || this.photoMap[taskId].photo_2 || null;
    } else {
      p2 = taskP2;
    }

    // Hard defensive safeguard: if task in workbook is marked with empty string or cleared photos, never return a ghost photo
    if (t) {
      if (t.photo_1 === "" || t.before_photo === "" || t._photoDeleted_before || t.clear_photos) {
        p1 = null;
        if (this.photoMap[taskId]) {
          this.photoMap[taskId].before_photo = null;
          this.photoMap[taskId].photo_1 = null;
        }
        if (monthKey && this.photoMap[monthKey]) {
          this.photoMap[monthKey].before_photo = null;
          this.photoMap[monthKey].photo_1 = null;
        }
      }
      if (t.photo_2 === "" || t.after_photo === "" || t._photoDeleted_after || t.clear_photos) {
        p2 = null;
        if (this.photoMap[taskId]) {
          this.photoMap[taskId].after_photo = null;
          this.photoMap[taskId].photo_2 = null;
        }
        if (monthKey && this.photoMap[monthKey]) {
          this.photoMap[monthKey].after_photo = null;
          this.photoMap[monthKey].photo_2 = null;
        }
      }
    }

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
  async savePhotoFile(taskId, slot, file, month = null) {
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

    return this.setTaskPhoto(taskId, slot, compressedData, syncThumbnail, month);
  }

  async setTaskPhoto(taskId, slot, base64Url, syncThumbnail = null, month = null) {
    if (!taskId || !base64Url) return null;
    let m = month;
    if (!m && typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      m = window.appState.workbookMgr.activeMonth;
    }
    if (!m && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.selectedMonth) {
      m = MonthlyInputView.selectedMonth;
    }
    const monthKey = m ? `${m}_${taskId}` : null;
    const isBefore = (slot === 'before_photo' || slot === 'photo_1');
    const isAfter = (slot === 'after_photo' || slot === 'photo_2');

    if (!this.photoMap[taskId]) {
      this.photoMap[taskId] = { photo_1: null, photo_2: null, before_photo: null, after_photo: null };
    }
    if (isBefore) {
      this.photoMap[taskId].before_photo = base64Url;
      this.photoMap[taskId].photo_1 = base64Url;
    }
    if (isAfter) {
      this.photoMap[taskId].after_photo = base64Url;
      this.photoMap[taskId].photo_2 = base64Url;
    }

    if (monthKey) {
      if (!this.photoMap[monthKey]) {
        this.photoMap[monthKey] = { photo_1: null, photo_2: null, before_photo: null, after_photo: null };
      }
      if (isBefore) {
        this.photoMap[monthKey].before_photo = base64Url;
        this.photoMap[monthKey].photo_1 = base64Url;
      }
      if (isAfter) {
        this.photoMap[monthKey].after_photo = base64Url;
        this.photoMap[monthKey].photo_2 = base64Url;
      }
    }

    // 1. Asynchronously persist to IndexedDB (Gigabytes quota)
    if (typeof PhotoIndexedDB !== 'undefined') {
      PhotoIndexedDB.saveTaskPhotos(taskId, this.photoMap[taskId]).catch(err => {
        console.warn("IndexedDB async save notice:", err);
      });
      if (monthKey) {
        PhotoIndexedDB.saveTaskPhotos(monthKey, this.photoMap[monthKey]).catch(err => {
          console.warn("IndexedDB month async save notice:", err);
        });
      }
    }

    // 2. Safely update AI Breakdown sheet metadata
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.breakdownSheet) {
        const updates = { task_id: taskId, slide_status: "READY" };
        if (isBefore) updates.photo_before = base64Url;
        if (isAfter) updates.photo_after = base64Url;
        window.appState.breakdownSheet.upsertBreakdown(updates);
      }
    } catch (e) {
      console.warn("Breakdown update notice:", e);
    }

    // 3. Update in-memory active presentation slides immediately so Monthly Report reflects changes
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.syncEngine) {
        const slideMonth = m || (window.appState.workbookMgr ? window.appState.workbookMgr.activeMonth : "SEP-2026");
        const slides = window.appState.syncEngine.getActiveSlides(slideMonth);
        const target = slides.find(s => s.task_id === taskId);
        if (target) {
          if (isBefore) target.photo_before = base64Url;
          if (isAfter) target.photo_after = base64Url;
          target.photo = base64Url;
          target.has_dual_photo = Boolean(target.photo_before && target.photo_after);
          try {
            localStorage.setItem(`walton_pd_active_slides_${slideMonth}`, JSON.stringify(slides));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("Active slides memory update notice:", e);
    }

    // 4. Synchronize thumbnail to MonthWorkbookManager & broadcast to Firebase & Google Sheets!
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
        const wbMgr = window.appState.workbookMgr;
        const activeM = m || wbMgr.activeMonth || "SEP-2026";
        let targetTask = wbMgr.getTask(activeM, taskId);
        if (!targetTask) {
          const allMonths = (wbMgr.getAllMonths && typeof wbMgr.getAllMonths === 'function')
            ? wbMgr.getAllMonths()
            : [activeM];
          for (const mon of allMonths) {
            const t = wbMgr.getTask(mon, taskId);
            if (t) { targetTask = t; break; }
          }
        }

        if (targetTask) {
          const photoKey = isBefore ? 'photo_1' : 'photo_2';
          
          if (isBefore) {
            targetTask.photo_1 = base64Url;
            targetTask.before_photo = base64Url;
            delete targetTask._photoDeleted_before;
          }
          if (isAfter) {
            targetTask.photo_2 = base64Url;
            targetTask.after_photo = base64Url;
            delete targetTask._photoDeleted_after;
          }
          targetTask._lastPhotoEditTime = Date.now();
          delete targetTask.clear_photos;
          targetTask.last_updated = new Date().toISOString();
          wbMgr.save();

          // Real-time Firebase Broadcast (syncs uploaded photo immediately to peer laptops!)
          if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
            FirebaseSyncService.updateCell(activeM, taskId, photoKey, base64Url);
            FirebaseSyncService.pushTask(activeM, targetTask);
          }

          // Push to cloud in background: prefer Google Drive direct CDN link, fallback to sharp thumbnail
          (async () => {
            let cloudPhotoRef = null;
            if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.uploadPhoto) {
              cloudPhotoRef = await GoogleSheetsSync.uploadPhoto(taskId, slot, base64Url);
            }

            if (cloudPhotoRef) {
              targetTask[photoKey] = cloudPhotoRef;
              targetTask.last_updated = new Date().toISOString();
              wbMgr.save();
              if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
                GoogleSheetsSync.pushTask(targetTask);
              }
            } else {
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
      console.warn("Photo sync notice:", syncErr);
    }

    if (typeof MonthlyReportView !== 'undefined' && MonthlyReportView.render) {
      MonthlyReportView.render();
    }

    return base64Url;
  }

  async removePhoto(taskId, slot, month = null) {
    if (!taskId || !slot) return false;
    let m = month;
    if (!m && typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      m = window.appState.workbookMgr.activeMonth;
    }
    if (!m && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.selectedMonth) {
      m = MonthlyInputView.selectedMonth;
    }
    const monthKey = m ? `${m}_${taskId}` : null;
    const isBefore = (slot === 'before_photo' || slot === 'photo_1');
    const isAfter = (slot === 'after_photo' || slot === 'photo_2');

    // 1. Clear MonthWorkbookManager FIRST so no fallback can resurrect stale photo!
    let targetTask = null;
    let activeM = m || "SEP-2026";
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
        const wbMgr = window.appState.workbookMgr;
        activeM = m || wbMgr.activeMonth || "SEP-2026";
        const allMonths = (wbMgr.getAllMonths && typeof wbMgr.getAllMonths === 'function')
          ? wbMgr.getAllMonths()
          : [activeM];

        for (const mon of allMonths) {
          const t = wbMgr.getTask(mon, taskId);
          if (t) {
            if (isBefore) {
              t.photo_1 = "";
              t.before_photo = "";
              t._photoDeleted_before = Date.now();
            }
            if (isAfter) {
              t.photo_2 = "";
              t.after_photo = "";
              t._photoDeleted_after = Date.now();
            }
            if (!t.photo_1 && !t.photo_2) {
              t.clear_photos = true;
            } else {
              delete t.clear_photos;
            }
            t._lastPhotoEditTime = Date.now();
            t.last_updated = new Date().toISOString();
            if (mon === activeM) targetTask = t;
          }
        }
        wbMgr.save();
      }
    } catch (e) {
      console.warn("Workbook photo removal notice:", e);
    }

    // 2. Purge In-Memory PhotoMap on BOTH canonical and alias keys with explicit NULL!
    if (!this.photoMap[taskId]) this.photoMap[taskId] = {};
    if (isBefore) {
      this.photoMap[taskId].before_photo = null;
      this.photoMap[taskId].photo_1 = null;
    }
    if (isAfter) {
      this.photoMap[taskId].after_photo = null;
      this.photoMap[taskId].photo_2 = null;
    }

    if (monthKey) {
      if (!this.photoMap[monthKey]) this.photoMap[monthKey] = {};
      if (isBefore) {
        this.photoMap[monthKey].before_photo = null;
        this.photoMap[monthKey].photo_1 = null;
      }
      if (isAfter) {
        this.photoMap[monthKey].after_photo = null;
        this.photoMap[monthKey].photo_2 = null;
      }
    }

    // Also purge any other keys matching `_${taskId}`
    Object.keys(this.photoMap).forEach(k => {
      if (k === taskId || k.endsWith(`_${taskId}`)) {
        if (!this.photoMap[k]) this.photoMap[k] = {};
        if (isBefore) {
          this.photoMap[k].before_photo = null;
          this.photoMap[k].photo_1 = null;
        }
        if (isAfter) {
          this.photoMap[k].after_photo = null;
          this.photoMap[k].photo_2 = null;
        }
      }
    });

    // 3. Persist deletion / nulls to IndexedDB (Gigabytes quota)
    if (typeof PhotoIndexedDB !== 'undefined') {
      try {
        const remainingGlobal = this.photoMap[taskId];
        if (remainingGlobal && !remainingGlobal.before_photo && !remainingGlobal.after_photo && !remainingGlobal.photo_1 && !remainingGlobal.photo_2) {
          await PhotoIndexedDB.deleteTaskPhotos(taskId).catch(() => {});
          delete this.photoMap[taskId];
        } else if (remainingGlobal) {
          await PhotoIndexedDB.saveTaskPhotos(taskId, remainingGlobal).catch(() => {});
        }

        if (monthKey) {
          const remainingMonth = this.photoMap[monthKey];
          if (remainingMonth && !remainingMonth.before_photo && !remainingMonth.after_photo && !remainingMonth.photo_1 && !remainingMonth.photo_2) {
            await PhotoIndexedDB.deleteTaskPhotos(monthKey).catch(() => {});
            delete this.photoMap[monthKey];
          } else if (remainingMonth) {
            await PhotoIndexedDB.saveTaskPhotos(monthKey, remainingMonth).catch(() => {});
          }
        }
      } catch (idbErr) {
        console.warn("IndexedDB photo delete notice:", idbErr);
      }
    }

    // 4. Clear AI Breakdown Sheet photos so they never resurrect
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.breakdownSheet) {
        const remaining = this.getTaskPhotos(taskId, m);
        const hasAny = Boolean(remaining.photo_1 || remaining.photo_2 || remaining.before_photo || remaining.after_photo);
        const updates = {
          task_id: taskId,
          slide_status: hasAny ? "READY" : "PHOTO PENDING"
        };
        if (isBefore) {
          updates.photo_before = null;
          updates.photo = remaining.after_photo || null;
        }
        if (isAfter) {
          updates.photo_after = null;
          updates.photo = remaining.before_photo || null;
        }
        window.appState.breakdownSheet.upsertBreakdown(updates);
      }
    } catch (e) {
      console.warn("Breakdown photo removal notice:", e);
    }

    // 5. Update SyncEngine Manual Overrides and Active Slides immediately
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.syncEngine) {
        const syncEngine = window.appState.syncEngine;
        if (syncEngine.manualOverrides && syncEngine.manualOverrides[taskId]) {
          if (isBefore) {
            delete syncEngine.manualOverrides[taskId].photo_before;
            delete syncEngine.manualOverrides[taskId].photo_1;
          }
          if (isAfter) {
            delete syncEngine.manualOverrides[taskId].photo_after;
            delete syncEngine.manualOverrides[taskId].photo_2;
          }
          syncEngine.saveManualOverrides();
        }

        const slides = syncEngine.getActiveSlides(activeM);
        const targetSlide = slides.find(s => s.task_id === taskId);
        if (targetSlide) {
          if (isBefore) targetSlide.photo_before = null;
          if (isAfter) targetSlide.photo_after = null;
          targetSlide.photo = targetSlide.photo_before || targetSlide.photo_after || null;
          targetSlide.has_dual_photo = Boolean(targetSlide.photo_before && targetSlide.photo_after);
          try {
            localStorage.setItem(`walton_pd_active_slides_${activeM}`, JSON.stringify(slides));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("Slide photo removal notice:", e);
    }

    // 6. Push real-time deletion broadcast to Firebase & Google Sheets!
    try {
      const photoField = isBefore ? 'photo_1' : 'photo_2';
      
      // REAL-TIME FIREBASE BROADCAST DELETION:
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
        await FirebaseSyncService.updateCell(activeM, taskId, photoField, "");
        if (targetTask) {
          await FirebaseSyncService.pushTask(activeM, targetTask);
        }
      }

      // Push to Google Sheets if configured
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask && targetTask) {
        GoogleSheetsSync.pushTask(targetTask, true);
      }
    } catch (e) {
      console.warn("Cloud photo broadcast removal notice:", e);
    }

    if (typeof MonthlyReportView !== 'undefined' && MonthlyReportView.render) {
      MonthlyReportView.render();
    }

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
