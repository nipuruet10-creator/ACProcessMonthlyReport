/**
 * Process Development Monthly Report Automation System
 * Module: Photo Manager Tab View (White Professional Theme)
 * Visual gallery and drag-and-drop upload manager for task photos
 * Features: Concern Engineer Filter, Direct Drag & Drop for Before/After photos
 * WALTON Hi-Tech Industries PLC
 */

const PhotoManagerView = {
  selectedMonth: "SEP-2026",
  filterEngineer: "",

  async handleMonthChange(m) {
    this.selectedMonth = m;
    await this.render();
  },

  handleEngineerFilter(eng) {
    this.filterEngineer = eng || "";
    this.render();
  },

  async handleSlotDrop(event, taskId, slot) {
    event.preventDefault();
    event.stopPropagation();
    const zone = event.currentTarget;
    if (zone) zone.classList.remove('border-red-500', 'bg-red-50');

    const files = event.dataTransfer ? event.dataTransfer.files : null;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    try {
      await photoManager.savePhotoFile(taskId, slot, file);
      if (typeof window.showToast === 'function') {
        window.showToast(`📸 ${slot === 'before_photo' ? 'Before' : 'After'} photo updated for ${taskId}!`, "success");
      }
      await this.render();
    } catch (err) {
      alert("Photo upload failed: " + err.message);
    }
  },

  async handleSlotFile(event, taskId, slot) {
    const files = event.target ? event.target.files : null;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      await photoManager.savePhotoFile(taskId, slot, file);
      if (typeof window.showToast === 'function') {
        window.showToast(`📸 ${slot === 'before_photo' ? 'Before' : 'After'} photo updated for ${taskId}!`, "success");
      }
      await this.render();
    } catch (err) {
      alert("Photo upload failed: " + err.message);
    }
  },

  async removeSlotPhoto(taskId, slot) {
    if (confirm("Remove this photo?")) {
      photoManager.removePhoto(taskId, slot);
      if (typeof window.showToast === 'function') {
        window.showToast(`Removed photo from ${taskId}`, "info");
      }
      await this.render();
    }
  },

  async render(containerId = 'photo-manager-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : new MonthWorkbookManager();

    const month = this.selectedMonth;
    const allTasks = workbookMgr.getTasksForMonth(month);
    const months = workbookMgr.getAllMonths();

    const engineers = typeof MasterDataManager !== 'undefined' 
      ? MasterDataManager.getEngineers() 
      : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.ENGINEERS : []);

    const tasks = this.filterEngineer 
      ? allTasks.filter(t => t.engineer === this.filterEngineer) 
      : allTasks;

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header Banner & Filter -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <img src="assets/img/walton_logo.png" alt="WALTON" class="h-12 w-auto object-contain flex-shrink-0 drop-shadow-sm">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-600 border border-red-200">
                  PHOTO ATTACHMENT HUB
                </span>
                <span class="text-xs text-slate-400 font-mono">${month}</span>
              </div>
              <h2 class="text-2xl font-black text-slate-800 mt-1">Task Visual Attachment Gallery</h2>
              <p class="text-xs text-slate-500 mt-0.5">Drag &amp; drop or click to upload Before (Present Condition) and After (Proposed Project) photos.</p>
            </div>
          </div>

          <!-- Controls: Month Selector & Concern Engineer Filter -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-slate-500 font-mono">Month:</span>
              <select onchange="PhotoManagerView.handleMonthChange(this.value)" class="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 font-mono font-bold shadow-sm">
                ${months.map(m => `<option value="${m}" ${this.selectedMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-slate-500 font-mono">Concern Engineer:</span>
              <select onchange="PhotoManagerView.handleEngineerFilter(this.value)" class="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 shadow-sm">
                <option value="">All Engineers (${allTasks.length})</option>
                ${engineers.map(e => `
                  <option value="${e.name}" ${this.filterEngineer === e.name ? 'selected' : ''}>
                    ${e.name} (${allTasks.filter(t => t.engineer === e.name).length})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Task Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${tasks.length === 0 ? `
            <div class="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 shadow-sm">
              No tasks found in ${month}${this.filterEngineer ? ` for ${this.filterEngineer}` : ''}.
            </div>
          ` : tasks.map(t => {
            const photos = photoManager.getTaskPhotos(t.task_id);
            const hasAny = photos.before_photo || photos.after_photo || photos.photo_1;
            return `
              <div class="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-mono text-red-600 font-bold text-xs">${t.task_id}</span>
                    <span class="px-2.5 py-0.5 rounded text-[10px] font-bold ${hasAny ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}">
                      ${hasAny ? 'PHOTO ATTACHED' : 'PHOTO PENDING'}
                    </span>
                  </div>
                  <h4 class="text-sm font-bold text-slate-800 line-clamp-2" title="${HELPERS.escapeHtml(t.task_name)}">
                    ${HELPERS.escapeHtml(t.task_name)}
                  </h4>
                  <p class="text-xs text-slate-400 mt-1">Concern: <span class="text-slate-700 font-semibold">${t.engineer}</span> &bull; <span class="text-slate-500">${t.category}</span></p>
                  
                  <!-- Dual Dropzones (Before & After) -->
                  <div class="grid grid-cols-2 gap-3 mt-4 h-36">
                    
                    <!-- Slot 1: Before / Present Condition (Requirement 7: Ctrl+C / Ctrl+V Paste Supported) -->
                    <div class="relative rounded-xl border border-dashed ${photos.before_photo ? 'border-slate-200 bg-slate-50' : 'border-slate-300 bg-slate-50/60 hover:border-red-400'} flex flex-col items-center justify-center overflow-hidden transition group cursor-pointer"
                         data-task-id="${t.task_id}" data-slot="before_photo" tabindex="0"
                         onmouseenter="PhotoManagerView._activeSlot={taskId:'${t.task_id}', slot:'before_photo'}; PhotoManagerView._lastHoveredTaskId='${t.task_id}';"
                         onmouseleave="PhotoManagerView._activeSlot=null;"
                         ondragover="event.preventDefault(); this.classList.add('border-red-500', 'bg-red-50');"
                         ondragleave="this.classList.remove('border-red-500', 'bg-red-50');"
                         ondrop="PhotoManagerView.handleSlotDrop(event, '${t.task_id}', 'before_photo')">
                      
                      ${photos.before_photo ? `
                        <img src="${photos.before_photo}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition">
                          <button onclick="PhotoManagerView.copyPhotoToClipboard('${t.task_id}', 'before_photo')" title="Copy image to Clipboard (Ctrl+C)" class="p-1.5 rounded-lg bg-white/90 text-slate-800 text-[10px] font-bold hover:bg-white flex items-center gap-0.5">
                            📋 Copy
                          </button>
                          <label for="slot-file-${t.task_id}-before" class="p-1.5 rounded-lg bg-white/90 text-slate-800 text-[10px] font-bold cursor-pointer hover:bg-white">
                            Change
                          </label>
                          <button onclick="PhotoManagerView.removeSlotPhoto('${t.task_id}', 'before_photo')" class="p-1.5 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-500">
                            ✕
                          </button>
                        </div>
                        <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white font-bold">
                          Before (Ctrl+V Paste)
                        </span>
                      ` : `
                        <label for="slot-file-${t.task_id}-before" class="cursor-pointer flex flex-col items-center justify-center p-2 text-center w-full h-full">
                          <span class="text-lg">📷</span>
                          <span class="text-[10px] font-bold text-slate-500 mt-1">Before Photo</span>
                          <span class="text-[9px] text-slate-400">Drop, Click or Ctrl+V</span>
                        </label>
                      `}
                      <input type="file" id="slot-file-${t.task_id}-before" accept="image/*" class="hidden" onchange="PhotoManagerView.handleSlotFile(event, '${t.task_id}', 'before_photo')">
                    </div>

                    <!-- Slot 2: After / Proposed Project (Requirement 7: Ctrl+C / Ctrl+V Paste Supported) -->
                    <div class="relative rounded-xl border border-dashed ${photos.after_photo ? 'border-slate-200 bg-slate-50' : 'border-slate-300 bg-slate-50/60 hover:border-sky-400'} flex flex-col items-center justify-center overflow-hidden transition group cursor-pointer"
                         data-task-id="${t.task_id}" data-slot="after_photo" tabindex="0"
                         onmouseenter="PhotoManagerView._activeSlot={taskId:'${t.task_id}', slot:'after_photo'}; PhotoManagerView._lastHoveredTaskId='${t.task_id}';"
                         onmouseleave="PhotoManagerView._activeSlot=null;"
                         ondragover="event.preventDefault(); this.classList.add('border-sky-500', 'bg-sky-50');"
                         ondragleave="this.classList.remove('border-sky-500', 'bg-sky-50');"
                         ondrop="PhotoManagerView.handleSlotDrop(event, '${t.task_id}', 'after_photo')">
                      
                      ${photos.after_photo ? `
                        <img src="${photos.after_photo}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition">
                          <button onclick="PhotoManagerView.copyPhotoToClipboard('${t.task_id}', 'after_photo')" title="Copy image to Clipboard (Ctrl+C)" class="p-1.5 rounded-lg bg-white/90 text-slate-800 text-[10px] font-bold hover:bg-white flex items-center gap-0.5">
                            📋 Copy
                          </button>
                          <label for="slot-file-${t.task_id}-after" class="p-1.5 rounded-lg bg-white/90 text-slate-800 text-[10px] font-bold cursor-pointer hover:bg-white">
                            Change
                          </label>
                          <button onclick="PhotoManagerView.removeSlotPhoto('${t.task_id}', 'after_photo')" class="p-1.5 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-500">
                            ✕
                          </button>
                        </div>
                        <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-sky-600 text-[9px] font-mono text-white font-bold">
                          After (Ctrl+V Paste)
                        </span>
                      ` : `
                        <label for="slot-file-${t.task_id}-after" class="cursor-pointer flex flex-col items-center justify-center p-2 text-center w-full h-full">
                          <span class="text-lg">📸</span>
                          <span class="text-[10px] font-bold text-slate-500 mt-1">After Photo</span>
                          <span class="text-[9px] text-slate-400">Drop, Click or Ctrl+V</span>
                        </label>
                      `}
                      <input type="file" id="slot-file-${t.task_id}-after" accept="image/*" class="hidden" onchange="PhotoManagerView.handleSlotFile(event, '${t.task_id}', 'after_photo')">
                    </div>

                  </div>
                </div>

                <div class="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span class="text-[10px] font-mono text-slate-400">16:9 Slide Ready</span>
                  <button onclick="photoViewModal.open('${t.task_id}')" class="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200 shadow-sm transition flex items-center gap-1">
                    🔍 Advanced Editor
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.initPasteListener();
  },

  _activeSlot: null,
  _lastHoveredTaskId: null,
  _pasteInitialized: false,

  initPasteListener() {
    if (this._pasteInitialized) return;
    this._pasteInitialized = true;

    document.addEventListener('paste', async (event) => {
      const items = (event.clipboardData || window.clipboardData) ? (event.clipboardData || window.clipboardData).items : [];
      let imageFile = null;
      if (items) {
        for (const item of items) {
          if (item.type && item.type.startsWith('image/')) {
            imageFile = item.getAsFile();
            break;
          }
        }
      }

      if (!imageFile && event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
        const f = event.clipboardData.files[0];
        if (f.type.startsWith('image/')) imageFile = f;
      }

      if (!imageFile) return;

      let target = this._activeSlot;

      if (!target && window.photoViewModal && photoViewModal._activeSlot) {
        target = photoViewModal._activeSlot;
      }

      if (!target && document.activeElement) {
        const el = document.activeElement.closest('[data-task-id][data-slot]');
        if (el) {
          target = { taskId: el.getAttribute('data-task-id'), slot: el.getAttribute('data-slot') };
        }
      }

      if (!target && window.photoViewModal && photoViewModal.activeTaskId) {
        target = { taskId: photoViewModal.activeTaskId, slot: 'before_photo' };
      }

      if (!target && this._lastHoveredTaskId) {
        target = { taskId: this._lastHoveredTaskId, slot: 'before_photo' };
      }

      if (target && target.taskId && target.slot) {
        event.preventDefault();
        try {
          await photoManager.savePhotoFile(target.taskId, target.slot, imageFile);
          const slotLabel = target.slot === 'before_photo' ? 'Before' : 'After';
          if (typeof window.showToast === 'function') {
            window.showToast(`📋 Pasted photo into ${slotLabel} Photo for task ${target.taskId}!`, "success");
          }
          if (document.getElementById('photo-manager-view-container')) {
            await this.render();
          }
          if (window.photoViewModal && photoViewModal.isOpen) {
            photoViewModal.open(target.taskId);
          }
        } catch (err) {
          alert("Failed to paste photo: " + err.message);
        }
      }
    });
  },

  async copyPhotoToClipboard(taskId, slot) {
    const photos = photoManager.getTaskPhotos(taskId);
    const dataUrl = photos ? (photos[slot] || photos.photo_1) : null;
    if (!dataUrl) return;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      if (typeof window.showToast === 'function') {
        window.showToast(`📋 Photo copied to clipboard! (Ctrl+C)`, "success");
      }
    } catch (e) {
      console.warn("Clipboard copy fallback:", e);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhotoManagerView;
} else if (typeof window !== 'undefined') {
  window.PhotoManagerView = PhotoManagerView;
}
