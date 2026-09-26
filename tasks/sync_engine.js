/**
 * Process Development Monthly Report Automation System
 * Module: Synchronization Engine
 * Implements 10-Step Idempotent Synchronization Pipeline
 * Meets Specification in docs/sync-logic.md
 * WALTON Hi-Tech Industries PLC
 */

class SyncEngine {
  constructor(workbookMgr, breakdownSheet, aiClient, photoMgr) {
    this.workbookMgr = workbookMgr || (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr ? window.appState.workbookMgr : (typeof MonthWorkbookManager !== 'undefined' ? new MonthWorkbookManager() : null));
    this.breakdownSheet = breakdownSheet || (typeof window !== 'undefined' && window.appState && window.appState.breakdownSheet ? window.appState.breakdownSheet : (typeof AIBreakdownSheet !== 'undefined' ? new AIBreakdownSheet() : null));
    this.aiClient = aiClient || (typeof window !== 'undefined' && window.geminiClient ? window.geminiClient : (typeof GeminiClient !== 'undefined' ? new GeminiClient() : null));
    this.photoMgr = photoMgr || (typeof window !== 'undefined' && window.photoManager ? window.photoManager : (typeof PhotoManager !== 'undefined' ? new PhotoManager() : null));
    this.manualOverridesKey = "walton_pd_manual_overrides_v1";
    this.manualOverrides = this.loadManualOverrides();
  }

  loadManualOverrides() {
    try {
      const saved = localStorage.getItem(this.manualOverridesKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveManualOverrides() {
    try {
      localStorage.setItem(this.manualOverridesKey, JSON.stringify(this.manualOverrides));
    } catch (e) {
      console.error("Failed to save manual overrides:", e);
    }
  }

  setManualOverride(taskId, overrides = {}) {
    this.manualOverrides[taskId] = {
      ...(this.manualOverrides[taskId] || {}),
      ...overrides,
      updated_at: new Date().toISOString()
    };
    this.saveManualOverrides();
  }

  getManualOverride(taskId) {
    return this.manualOverrides[taskId] || null;
  }

  /**
   * Executes the full 10-Step Idempotent Synchronization for a specific month
   * @param {String} month - e.g. "SEP-2026"
   * @param {Boolean} forceAiRegenerate - If true, re-calls AI even if source hash matches
   * @returns {Object} Sync Report Metrics
   */
  async syncMonth(month = "SEP-2026", forceAiRegenerate = false) {
    const normalizedMonth = this.workbookMgr ? this.workbookMgr.normalizeMonth(month) : month.toUpperCase();
    const startTime = Date.now();

    // Step 1: Ingest Month-Wise Input Sheet
    const rawTasks = this.workbookMgr ? this.workbookMgr.getTasksForMonth(normalizedMonth) : [];

    let addedCount = 0;
    let updatedCount = 0;
    let excludedCount = 0;
    const activeSlides = [];

    // Process each task in sequence
    for (const task of rawTasks) {
      // Step 2 & 3: Validate Task ID & Compute Source Hash
      const taskId = task.task_id;
      const engineer = task.engineer;
      const taskName = task.task_name;
      const isIncluded = task.include_in_report !== "NO";

      const currentHash = this.breakdownSheet.computeSourceHash(engineer, taskName);
      const existingBreakdown = this.breakdownSheet.getBreakdown(taskId);

      let breakdownRecord = existingBreakdown;
      let needsAi = false;

      if (!existingBreakdown) {
        // Step 4: Detected New Task
        addedCount++;
        needsAi = true;
      } else if (existingBreakdown.source_hash !== currentHash || forceAiRegenerate) {
        // Step 4: Detected Changed Task Name
        updatedCount++;
        needsAi = true;
      }

      // Step 5: Execute AI Synthesis (Incremental Delta Only)
      if (needsAi && this.aiClient) {
        const aiOutput = await this.aiClient.transformTask(task, forceAiRegenerate);
        breakdownRecord = this.breakdownSheet.upsertBreakdown({
          task_id: taskId,
          month: normalizedMonth,
          engineer: engineer,
          original_task_name: taskName,
          split_title_1: aiOutput.split_title_1,
          split_title_2: aiOutput.split_title_2,
          ai_report_title: aiOutput.ai_report_title,
          ai_description: aiOutput.ai_description,
          ai_impact: aiOutput.ai_impact,
          metrics: aiOutput.metrics,
          quote: aiOutput.quote,
          ai_category: aiOutput.ai_category,
          ai_project_type: aiOutput.ai_project_type
        });
      }

      // Step 6: Reconcile photos
      let photos = this.photoMgr ? this.photoMgr.getTaskPhotos(taskId) : null;
      if (photos && (photos.photo_1 || photos.before_photo || photos.after_photo)) {
        breakdownRecord = this.breakdownSheet.upsertBreakdown({
          task_id: taskId,
          month: normalizedMonth,
          engineer: engineer,
          original_task_name: taskName,
          photo: photos.photo_1 || photos.after_photo,
          photo_before: photos.before_photo,
          photo_after: photos.after_photo,
          slide_status: "READY"
        });
      }

      // Always ensure we have latest breakdown record
      if (!breakdownRecord) {
        breakdownRecord = this.breakdownSheet.getBreakdown(taskId);
      }

      // Step 7 & 8: 1 Row = 1 Slide & Exclusion Filtering
      if (!isIncluded) {
        excludedCount++;
      } else {
        // Step 9: Bind Preserved Photos & Manual User Overrides
        const overrides = this.getManualOverride(taskId) || {};
        const localPhotoObj = (this.photoMgr && this.photoMgr.getTaskPhotos) ? this.photoMgr.getTaskPhotos(taskId) : null;
        
        const photoBefore = overrides.photo_before || 
                            (localPhotoObj && (localPhotoObj.before_photo || localPhotoObj.photo_1)) || 
                            (photos && (photos.before_photo || photos.photo_1)) || 
                            (breakdownRecord && typeof breakdownRecord.photo_before === 'string' && breakdownRecord.photo_before.length > 5 ? breakdownRecord.photo_before : null) || 
                            task.photo_1 || task.before_photo || null;

        const photoAfter = overrides.photo_after || 
                           (localPhotoObj && (localPhotoObj.after_photo || localPhotoObj.photo_2)) || 
                           (photos && (photos.after_photo || photos.photo_2)) || 
                           (breakdownRecord && typeof breakdownRecord.photo_after === 'string' && breakdownRecord.photo_after.length > 5 ? breakdownRecord.photo_after : null) || 
                           task.photo_2 || task.after_photo || null;

        const photoGeneral = overrides.photo || 
                             (localPhotoObj && (localPhotoObj.photo_1 || localPhotoObj.before_photo || localPhotoObj.after_photo)) || 
                             (photos && (photos.photo_1 || photos.before_photo || photos.after_photo)) || 
                             (breakdownRecord && typeof breakdownRecord.photo === 'string' && breakdownRecord.photo.length > 5 ? breakdownRecord.photo : null) || 
                             task.photo_1 || task.photo_2 || null;

        const slideData = {
          task_id: taskId,
          month: normalizedMonth,
          engineer: overrides.engineer || engineer,
          raw_task_name: taskName,
          slide_title: overrides.slide_title || (breakdownRecord ? breakdownRecord.ai_report_title : taskName),
          split_title_1: overrides.split_title_1 || (breakdownRecord ? breakdownRecord.split_title_1 : ""),
          split_title_2: overrides.split_title_2 || (breakdownRecord ? breakdownRecord.split_title_2 : ""),
          description: overrides.description || (breakdownRecord ? breakdownRecord.ai_description : ""),
          impact: overrides.impact || (breakdownRecord ? breakdownRecord.ai_impact : []),
          metrics: overrides.metrics || (breakdownRecord ? breakdownRecord.metrics : []),
          quote: overrides.quote || (breakdownRecord ? breakdownRecord.quote : "Automation for a Smarter Tomorrow"),
          category: overrides.category || task.category || (breakdownRecord ? breakdownRecord.ai_category : "Process development"),
          project_type: overrides.project_type || (breakdownRecord ? breakdownRecord.ai_project_type : "Process Improvement"),
          photo: photoGeneral,
          photo_before: photoBefore,
          photo_after: photoAfter,
          status: overrides.status || "Completed",
          investment: overrides.investment || (task.investment || "In-house / Direct Implementation"),
          has_manual_override: Object.keys(overrides).length > 0
        };

        activeSlides.push(slideData);
      }
    }

    // Step 10: Order Slides (Standard process tasks first, Completed Projects & Ongoing Projects at the end)
    const stdSlides = [];
    const projSlides = [];
    activeSlides.forEach(s => {
      const cat = (s.category || '').toLowerCase();
      const title = (s.slide_title || s.raw_task_name || '').toLowerCase();
      const isProj = Boolean(cat.includes('project') || title.includes('project'));
      if (isProj) projSlides.push(s);
      else stdSlides.push(s);
    });
    projSlides.sort((a, b) => {
      const aDone = ((a.status || '').toLowerCase().includes('complete') || (a.category || '').toLowerCase().includes('completed')) ? 0 : 1;
      const bDone = ((b.status || '').toLowerCase().includes('complete') || (b.category || '').toLowerCase().includes('completed')) ? 0 : 1;
      return aDone - bDone;
    });
    activeSlides.length = 0;
    activeSlides.push(...stdSlides, ...projSlides);

    // Step 10: Commit Idempotent Presentation State & Audit
    const syncResult = {
      month: normalizedMonth,
      total_tasks: rawTasks.length,
      added: addedCount,
      updated: updatedCount,
      excluded: excludedCount,
      active_slides: activeSlides.length,
      slides: activeSlides,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    // Cache active slides for the month (store lightweight metadata only, omit huge base64 photos to protect LocalStorage quota)
    try {
      const lightweightSlides = activeSlides.map(s => ({
        ...s,
        photo: null,
        photo_before: null,
        photo_after: null
      }));
      localStorage.setItem(`walton_pd_active_slides_${normalizedMonth}`, JSON.stringify(lightweightSlides));
    } catch (e) {
      console.warn("Could not cache active slides to localStorage:", e);
    }

    return syncResult;
  }

  getActiveSlides(month) {
    const wbMgr = this.workbookMgr || (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr ? window.appState.workbookMgr : null);
    const normalizedMonth = wbMgr ? wbMgr.normalizeMonth(month) : (month ? month.toUpperCase() : "SEP-2026");

    let deletedSet = new Set();
    try {
      const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      deletedSet = new Set(deletedList);
    } catch (e) {}

    const rawTasks = wbMgr ? wbMgr.getTasksForMonth(normalizedMonth) : [];
    const validTaskMap = new Map();
    rawTasks.forEach(t => {
      if (t && t.task_id && !deletedSet.has(t.task_id)) {
        validTaskMap.set(t.task_id, t);
      }
    });

    try {
      const saved = localStorage.getItem(`walton_pd_active_slides_${normalizedMonth}`);
      let slides = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(slides)) slides = [];

      // 1. Strictly filter out any tombstoned tasks or tasks no longer in workbook
      const originalLen = slides.length;
      slides = slides.filter(s => s && s.task_id && !deletedSet.has(s.task_id) && validTaskMap.has(s.task_id));

      // 2. Auto-include any active tasks from workbook not yet present in cached slides
      validTaskMap.forEach((t, tId) => {
        if (t.include_in_report !== "NO" && !slides.some(s => s.task_id === tId)) {
          slides.push({
            task_id: tId,
            month: normalizedMonth,
            engineer: t.concern_engineer || t.engineer || t.assignee || "Concern Engineer",
            raw_task_name: t.task_name,
            slide_title: t.task_name || `Task ${tId}`,
            description: t.task_details || "Standard operating procedure execution and engineering development.",
            impact: ["Zero defect manufacturing", "Enhanced line balancing and cycle efficiency"],
            category: t.category || "Process Development",
            status: t.status || "Completed",
            investment: t.investment || "In-house / Direct Implementation",
            has_manual_override: false
          });
        }
      });

      // Save sanitized slides if count changed
      if (slides.length !== originalLen) {
        try {
          const lightweight = slides.map(s => ({ ...s, photo: null, photo_before: null, photo_after: null }));
          localStorage.setItem(`walton_pd_active_slides_${normalizedMonth}`, JSON.stringify(lightweight));
        } catch (e) {}
      }

      // 3. Dynamically bind 100% current fresh photos from PhotoManager / IndexedDB
      const pMgr = this.photoMgr || (typeof photoManager !== 'undefined' ? photoManager : null);
      if (pMgr) {
        slides.forEach(s => {
          const p = pMgr.getTaskPhotos(s.task_id, normalizedMonth);
          if (p) {
            s.photo_before = p.before_photo || null;
            s.photo_after = p.after_photo || null;
            s.photo = p.before_photo || p.after_photo || null;
            s.has_dual_photo = Boolean(s.photo_before && s.photo_after);
          } else {
            s.photo_before = null;
            s.photo_after = null;
            s.photo = null;
            s.has_dual_photo = false;
          }
        });
      }

      return slides;
    } catch (e) {
      console.warn("getActiveSlides notice:", e);
    }
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncEngine;
} else if (typeof window !== 'undefined') {
  window.SyncEngine = SyncEngine;
}
