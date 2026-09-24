/**
 * Process Development Monthly Report Automation System
 * Module: Photo View Modal & Interactive Image Studio Panel
 * Allows seamless Drag & Drop, Upload, Replace, and Delete for Before & After photos
 * Uses High-Capacity IndexedDB & Automatic Image Downscaling
 * WALTON Hi-Tech Industries PLC
 */

const PhotoViewModal = {
  activeTaskId: null,
  activeMonth: null,

  renderContainer() {
    let container = document.getElementById('photo-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'photo-modal-container';
      document.body.appendChild(container);
    }
    return container;
  },

  async open(taskId, month = null) {
    let targetMonth = month || (window.appState && window.appState.workbookMgr ? window.appState.workbookMgr.activeMonth : "SEP-2026");
    this.activeMonth = targetMonth;

    let monthTasks = [];
    if (window.appState && window.appState.workbookMgr) {
      monthTasks = window.appState.workbookMgr.getTasksForMonth(targetMonth);
    }

    if (!taskId && monthTasks.length > 0) {
      taskId = monthTasks[0].task_id;
    }

    this.activeTaskId = taskId;

    let taskName = "Task " + (taskId || "Unassigned");
    let engineer = "Concern Engineer";
    let category = "Process Development";

    if (window.appState && window.appState.workbookMgr) {
      const allMonths = window.appState.workbookMgr.getAllMonths();
      for (const m of allMonths) {
        const tasks = window.appState.workbookMgr.getTasksForMonth(m);
        const t = tasks.find(x => x.task_id === taskId);
        if (t) {
          taskName = t.task_name;
          engineer = t.engineer;
          category = t.category || category;
          this.activeMonth = m;
          break;
        }
      }
    }

    const container = this.renderContainer();
    this._renderModalContent(container, { task_id: taskId, task_name: taskName, engineer, category }, monthTasks);
  },

  close() {
    const container = document.getElementById('photo-modal-container');
    if (container) container.innerHTML = '';
    this.activeTaskId = null;
  },

  _renderModalContent(container, task, monthTasks = []) {
    const photos = (this.activeTaskId && typeof photoManager !== 'undefined') ? photoManager.getTaskPhotos(this.activeTaskId, this.activeMonth) : {};
    const beforePhoto = photos.before_photo || photos.photo_1 || "";
    const afterPhoto = photos.after_photo || photos.photo_2 || "";

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
        <div class="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 flex flex-col max-h-[92vh] overflow-y-auto">
          
          <!-- Header Bar -->
          <div class="flex items-start justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                📷
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white shadow-sm">
                    ${task.task_id || 'STUDIO'}
                  </span>
                  <span class="text-xs font-bold text-slate-700 font-mono">
                    Concern: ${task.engineer}
                  </span>
                  <span class="text-slate-300">&bull;</span>
                  <span class="text-xs text-slate-400 font-medium">${task.category}</span>
                </div>
                <h2 class="text-lg sm:text-xl font-black text-slate-800 mt-1 line-clamp-1" title="${HELPERS.escapeHtml(task.task_name)}">
                  ${HELPERS.escapeHtml(task.task_name)}
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">
                  Interactive Photo Studio: Insert, replace, or delete Before and After photos for this project slide.
                </p>
              </div>
            </div>

            <button onclick="PhotoViewModal.close()" class="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Task Selector Dropdown (Quickly jump between tasks in studio) -->
          ${monthTasks.length > 1 ? `
            <div class="flex flex-wrap items-center justify-between gap-3 pt-3 pb-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-bold text-slate-500">Jump to Task:</span>
                <select onchange="PhotoViewModal.open(this.value, '${this.activeMonth}')" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-red-400 max-w-md shadow-sm">
                  ${monthTasks.map(t => `
                    <option value="${t.task_id}" ${t.task_id === this.activeTaskId ? 'selected' : ''}>
                      ${t.task_id} &bull; ${t.engineer}: ${HELPERS.escapeHtml(t.task_name)}
                    </option>
                  `).join('')}
                </select>
              </div>
              <span class="text-[11px] font-mono text-slate-400">Month: ${this.activeMonth} (${monthTasks.length} tasks)</span>
            </div>
          ` : ''}

          <!-- Dual Photo Studio Panels (Before & After) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            
            <!-- PANEL 1: Before Photo (Present Condition) -->
            <div class="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
              <div>
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full ${beforePhoto ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                    <h3 class="text-sm font-bold text-slate-800">1. Present Condition (Before)</h3>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${beforePhoto ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400'}">
                    ${beforePhoto ? 'ATTACHED' : 'NOT ATTACHED'}
                  </span>
                </div>

                <!-- Dropzone / Image Container (Ctrl+V Paste Supported) -->
                <div id="modal-dropzone-before"
                     data-task-id="${task.task_id}" data-slot="before_photo"
                     onmouseenter="PhotoViewModal._activeSlot={taskId:'${task.task_id}', slot:'before_photo'};"
                     onmouseleave="PhotoViewModal._activeSlot=null;"
                     ondragover="event.preventDefault(); this.classList.add('border-red-500', 'bg-red-50/50');"
                     ondragleave="this.classList.remove('border-red-500', 'bg-red-50/50');"
                     ondrop="PhotoViewModal.handleDrop(event, 'before_photo')"
                     class="relative w-full aspect-video rounded-xl border-2 border-dashed ${beforePhoto ? 'border-slate-200 bg-white' : 'border-slate-300 bg-white/80 hover:border-red-400'} flex items-center justify-center overflow-hidden transition group">
                  
                  ${beforePhoto ? `
                    <img src="${beforePhoto}" alt="Before Photo" class="w-full h-full object-contain p-1">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition backdrop-blur-[2px]">
                      <label for="modal-file-before" class="px-3 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-bold cursor-pointer hover:bg-slate-100 shadow-md transition">
                        🔄 Replace
                      </label>
                      <button onclick="PhotoViewModal.deletePhoto('before_photo')" class="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 shadow-md transition">
                        🗑 Delete
                      </button>
                    </div>
                  ` : `
                    <label for="modal-file-before" class="cursor-pointer flex flex-col items-center justify-center p-6 text-center w-full h-full hover:bg-red-50/20 transition">
                      <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-2 text-slate-500 group-hover:scale-110 transition">
                        📸
                      </div>
                      <span class="text-xs font-bold text-slate-700">Drag &amp; Drop or Ctrl+V Paste Before Photo</span>
                      <span class="text-[11px] text-slate-400 mt-1">or click to browse from device</span>
                    </label>
                  `}
                  <input type="file" id="modal-file-before" accept="image/*" class="hidden" onchange="PhotoViewModal.handleFileInput(event, 'before_photo')">
                </div>
              </div>

              <!-- Action Toolbar for Before Photo -->
              <div class="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <span class="text-[11px] text-slate-400 font-mono">16:9 Aspect Ready</span>
                <div class="flex items-center gap-2">
                  <label for="modal-file-before" class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 cursor-pointer shadow-sm transition">
                    ${beforePhoto ? '🔄 Replace Photo' : '➕ Upload Photo'}
                  </label>
                  ${beforePhoto ? `
                    <button onclick="PhotoViewModal.deletePhoto('before_photo')" class="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-bold text-red-600 border border-red-200 transition">
                      🗑 Delete
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- PANEL 2: After Photo (Proposed Project / Main) -->
            <div class="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
              <div>
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full ${afterPhoto ? 'bg-sky-500' : 'bg-slate-300'}"></span>
                    <h3 class="text-sm font-bold text-slate-800">2. Proposed Project (After / Hero)</h3>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${afterPhoto ? 'bg-sky-50 text-sky-600 border border-sky-200' : 'bg-slate-100 text-slate-400'}">
                    ${afterPhoto ? 'ATTACHED' : 'NOT ATTACHED'}
                  </span>
                </div>

                <!-- Dropzone / Image Container (Ctrl+V Paste Supported) -->
                <div id="modal-dropzone-after"
                     data-task-id="${task.task_id}" data-slot="after_photo"
                     onmouseenter="PhotoViewModal._activeSlot={taskId:'${task.task_id}', slot:'after_photo'};"
                     onmouseleave="PhotoViewModal._activeSlot=null;"
                     ondragover="event.preventDefault(); this.classList.add('border-sky-500', 'bg-sky-50/50');"
                     ondragleave="this.classList.remove('border-sky-500', 'bg-sky-50/50');"
                     ondrop="PhotoViewModal.handleDrop(event, 'after_photo')"
                     class="relative w-full aspect-video rounded-xl border-2 border-dashed ${afterPhoto ? 'border-slate-200 bg-white' : 'border-slate-300 bg-white/80 hover:border-sky-400'} flex items-center justify-center overflow-hidden transition group">
                  
                  ${afterPhoto ? `
                    <img src="${afterPhoto}" alt="After Photo" class="w-full h-full object-contain p-1">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition backdrop-blur-[2px]">
                      <label for="modal-file-after" class="px-3 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-bold cursor-pointer hover:bg-slate-100 shadow-md transition">
                        🔄 Replace
                      </label>
                      <button onclick="PhotoViewModal.deletePhoto('after_photo')" class="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 shadow-md transition">
                        🗑 Delete
                      </button>
                    </div>
                  ` : `
                    <label for="modal-file-after" class="cursor-pointer flex flex-col items-center justify-center p-6 text-center w-full h-full hover:bg-sky-50/20 transition">
                      <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-2 text-slate-500 group-hover:scale-110 transition">
                        📸
                      </div>
                      <span class="text-xs font-bold text-slate-700">Drag &amp; Drop or Ctrl+V Paste After Photo</span>
                      <span class="text-[11px] text-slate-400 mt-1">or click to browse from device</span>
                    </label>
                  `}
                  <input type="file" id="modal-file-after" accept="image/*" class="hidden" onchange="PhotoViewModal.handleFileInput(event, 'after_photo')">
                </div>
              </div>

              <!-- Action Toolbar for After Photo -->
              <div class="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <span class="text-[11px] text-slate-400 font-mono">Hero Photo for Image 3</span>
                <div class="flex items-center gap-2">
                  <label for="modal-file-after" class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 cursor-pointer shadow-sm transition">
                    ${afterPhoto ? '🔄 Replace Photo' : '➕ Upload Photo'}
                  </label>
                  ${afterPhoto ? `
                    <button onclick="PhotoViewModal.deletePhoto('after_photo')" class="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-bold text-red-600 border border-red-200 transition">
                      🗑 Delete
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>

          </div>

          <!-- Bottom Footer -->
          <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2 text-slate-500">
              <span class="text-emerald-600 font-bold">✔ Auto-Saved</span>
              <span>&bull;</span>
              <span>High-Capacity IndexedDB active (Zero quota limits)</span>
            </div>
            <button onclick="PhotoViewModal.close()" class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-sm">
              Done &amp; Close
            </button>
          </div>

        </div>
      </div>
    `;
  },

  async handleDrop(event, slot) {
    event.preventDefault();
    event.stopPropagation();
    const zone = event.currentTarget;
    if (zone) zone.classList.remove('border-red-500', 'bg-red-50/50', 'border-sky-500', 'bg-sky-50/50');

    const files = event.dataTransfer ? event.dataTransfer.files : null;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    try {
      await photoManager.savePhotoFile(this.activeTaskId, slot, file, this.activeMonth);
      if (typeof window.showToast === 'function') {
        window.showToast(`📸 ${slot === 'before_photo' ? 'Before' : 'After'} photo updated!`, "success");
      }
      this.refreshUI();
    } catch (e) {
      alert("Failed to save photo: " + e.message);
    }
  },

  async handleFileInput(event, slot) {
    const files = event.target ? event.target.files : null;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      await photoManager.savePhotoFile(this.activeTaskId, slot, file, this.activeMonth);
      if (typeof window.showToast === 'function') {
        window.showToast(`📸 ${slot === 'before_photo' ? 'Before' : 'After'} photo updated!`, "success");
      }
      this.refreshUI();
    } catch (e) {
      alert("Failed to save photo: " + e.message);
    }
  },

  async deletePhoto(slot) {
    if (confirm(`Are you sure you want to delete the ${slot === 'before_photo' ? 'Before' : 'After'} photo?`)) {
      await photoManager.removePhoto(this.activeTaskId, slot, this.activeMonth);
      if (typeof window.showToast === 'function') {
        window.showToast("Photo deleted", "info");
      }
      this.refreshUI();
    }
  },

  refreshUI() {
    this.open(this.activeTaskId, this.activeMonth);
    if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
      MonthlyInputView.render();
    }
    if (typeof PhotoManagerView !== 'undefined' && PhotoManagerView.render) {
      PhotoManagerView.render();
    }
    if (typeof MonthlyReportView !== 'undefined' && MonthlyReportView.render) {
      MonthlyReportView.render();
    }
  }
};

const photoViewModal = PhotoViewModal;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PhotoViewModal, photoViewModal };
} else if (typeof window !== 'undefined') {
  window.PhotoViewModal = PhotoViewModal;
  window.photoViewModal = photoViewModal;
}
