/**
 * Process Development Monthly Report Automation System
 * Module: Photo Manager Tab View (Engineer-Wise Grouping & Foolproof Paste Hub)
 * Features:
 * - Engineer-wise grouping & dedicated filter tabs
 * - Foolproof photo paste targeting (click to activate target box, glowing indicator)
 * - 1-Click "📋 Paste Image" button directly reading clipboard via navigator.clipboard.read()
 * - Visual Before (Amber) and After (Sky/Emerald) distinction
 * - Prevents pasting into the wrong task or slot
 * WALTON Hi-Tech Industries PLC
 */

const PhotoManagerView = {
  selectedMonth: "SEP-2026",
  filterEngineer: "",
  selectedTarget: null, // { taskId, slot }

  async handleMonthChange(m) {
    this.selectedMonth = m;
    this.selectedTarget = null;
    await this.render();
  },

  handleEngineerFilter(eng) {
    this.filterEngineer = eng || "";
    this.selectedTarget = null;
    this.render();
  },

  selectSlot(taskId, slot, event = null) {
    if (event) {
      // Don't override if user clicked an action button like delete or copy
      if (event.target && event.target.closest('button, label, input')) return;
    }
    this.selectedTarget = { taskId, slot };

    // Update active highlight classes in DOM immediately without full re-render
    document.querySelectorAll('[data-photo-slot]').forEach(el => {
      const elTaskId = el.getAttribute('data-task-id');
      const elSlot = el.getAttribute('data-slot');
      const indicator = el.querySelector('.active-target-badge');

      if (elTaskId === taskId && elSlot === slot) {
        el.classList.add('ring-4', 'ring-blue-500', 'border-blue-600', 'bg-blue-50/70', 'shadow-md');
        if (indicator) indicator.classList.remove('hidden');
      } else {
        el.classList.remove('ring-4', 'ring-blue-500', 'border-blue-600', 'bg-blue-50/70', 'shadow-md');
        if (indicator) indicator.classList.add('hidden');
      }
    });

    if (typeof window.showToast === 'function') {
      const slotName = slot === 'before_photo' ? 'Before Photo' : 'After Photo';
      window.showToast(`🎯 Box Selected: ${slotName} for Task ${taskId}. Press Ctrl+V or click Paste!`, "info");
    }
  },

  async pasteFromClipboard(taskId, slot) {
    this.selectedTarget = { taskId, slot };

    if (navigator.clipboard && navigator.clipboard.read) {
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const ext = imageType.split('/')[1] || 'png';
            const file = new File([blob], `pasted_${Date.now()}.${ext}`, { type: imageType });
            await photoManager.savePhotoFile(taskId, slot, file, this.selectedMonth);
            
            const slotName = slot === 'before_photo' ? 'Before (Present)' : 'After (Project)';
            if (typeof window.showToast === 'function') {
              window.showToast(`✅ Successfully pasted into ${slotName} for ${taskId}!`, "success");
            }
            await this.render();
            return;
          }
        }
        if (typeof window.showToast === 'function') {
          window.showToast("⚠️ No image found in clipboard. Please copy an image (Ctrl+C / Snipping Tool) first.", "warning");
        }
      } catch (err) {
        console.warn("navigator.clipboard.read notification:", err);
        this.selectSlot(taskId, slot);
        if (typeof window.showToast === 'function') {
          window.showToast("🎯 Target box is active! Now press Ctrl+V to paste your image.", "info");
        }
      }
    } else {
      this.selectSlot(taskId, slot);
      if (typeof window.showToast === 'function') {
        window.showToast("🎯 Target box is active! Now press Ctrl+V to paste your image.", "info");
      }
    }
  },

  async handleSlotDrop(event, taskId, slot) {
    event.preventDefault();
    event.stopPropagation();
    const zone = event.currentTarget;
    if (zone) zone.classList.remove('border-red-500', 'bg-red-50', 'border-sky-500', 'bg-sky-50');

    const files = event.dataTransfer ? event.dataTransfer.files : null;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    try {
      await photoManager.savePhotoFile(taskId, slot, file, this.selectedMonth);
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
      await photoManager.savePhotoFile(taskId, slot, file, this.selectedMonth);
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
      await photoManager.removePhoto(taskId, slot, this.selectedMonth);
      if (typeof window.showToast === 'function') {
        window.showToast(`Removed photo from ${taskId}`, "info");
      }
      await this.render();
    }
  },

  async copyPhotoToClipboard(taskId, slot) {
    const photos = photoManager.getTaskPhotos(taskId, this.selectedMonth);
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
  },

  renderTaskCardHtml(t, photos) {
    const hasBefore = Boolean(photos.before_photo);
    const hasAfter = Boolean(photos.after_photo);
    const hasAny = hasBefore || hasAfter || Boolean(photos.photo_1);

    const isSelectedBefore = this.selectedTarget && this.selectedTarget.taskId === t.task_id && this.selectedTarget.slot === 'before_photo';
    const isSelectedAfter = this.selectedTarget && this.selectedTarget.taskId === t.task_id && this.selectedTarget.slot === 'after_photo';

    return `
      <div class="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 shadow-xs flex flex-col justify-between transition group">
        <div>
          <!-- Card Header -->
          <div class="flex items-center justify-between gap-2 mb-2 pb-2.5 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <span class="font-mono text-red-600 font-black text-xs px-2 py-0.5 rounded-lg bg-red-50 border border-red-100">${t.task_id}</span>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                👤 ${HELPERS.escapeHtml(t.engineer || 'Unassigned')}
              </span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${hasAny ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
              ${hasAny ? (hasBefore && hasAfter ? '✓ BOTH ATTACHED' : 'PARTIAL ATTACHED') : 'PENDING'}
            </span>
          </div>

          <!-- Task Name & Category -->
          <h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-2 min-h-[32px]" title="${HELPERS.escapeHtml(t.task_name)}">
            ${HELPERS.escapeHtml(t.task_name)}
          </h4>
          <div class="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span class="truncate">${HELPERS.escapeHtml(t.category || 'General')}</span>
          </div>
          
          <!-- Dual Dropzones (Before & After) -->
          <div class="grid grid-cols-2 gap-3 mt-4">
            
            <!-- Slot 1: Before / Present Condition -->
            <div data-photo-slot="true" data-task-id="${t.task_id}" data-slot="before_photo"
                 onclick="PhotoManagerView.selectSlot('${t.task_id}', 'before_photo', event)"
                 ondragover="event.preventDefault(); this.classList.add('border-amber-500', 'bg-amber-50');"
                 ondragleave="this.classList.remove('border-amber-500', 'bg-amber-50');"
                 ondrop="PhotoManagerView.handleSlotDrop(event, '${t.task_id}', 'before_photo')"
                 class="relative h-44 rounded-2xl border-2 border-dashed ${hasBefore ? 'border-amber-200 bg-amber-50/20' : 'border-amber-300 bg-amber-50/40 hover:border-amber-400'} ${isSelectedBefore ? 'ring-4 ring-blue-500 border-blue-600 bg-blue-50/70 shadow-md' : ''} flex flex-col items-center justify-center overflow-hidden transition cursor-pointer select-none">
              
              <!-- Active Target Badge -->
              <div class="active-target-badge ${isSelectedBefore ? '' : 'hidden'} absolute top-1 inset-x-1 z-20 bg-blue-600 text-white text-[9px] font-black text-center py-0.5 rounded-md shadow-xs animate-pulse">
                🎯 ACTIVE TARGET (Ctrl+V)
              </div>

              ${hasBefore ? `
                <img src="${photos.before_photo}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-slate-950/60 opacity-0 hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition p-2">
                  <span class="text-white text-[10px] font-bold">Before Photo Attached</span>
                  <div class="flex items-center gap-1">
                    <button onclick="PhotoManagerView.copyPhotoToClipboard('${t.task_id}', 'before_photo')" title="Copy to Clipboard" class="p-1 px-2 rounded-lg bg-white/95 text-slate-800 text-[10px] font-bold hover:bg-white">
                      📋 Copy
                    </button>
                    <label for="slot-file-${t.task_id}-before" class="p-1 px-2 rounded-lg bg-white/95 text-slate-800 text-[10px] font-bold cursor-pointer hover:bg-white">
                      Change
                    </label>
                    <button onclick="PhotoManagerView.removeSlotPhoto('${t.task_id}', 'before_photo')" class="p-1 px-2 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-500">
                      ✕
                    </button>
                  </div>
                </div>
                <span class="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white font-bold backdrop-blur-xs">
                  Before
                </span>
              ` : `
                <div class="flex flex-col items-center justify-center p-2 text-center w-full h-full">
                  <span class="text-xl">📷</span>
                  <span class="text-[11px] font-bold text-amber-800 mt-1">Before Photo</span>
                  <span class="text-[9px] text-amber-600/80 mb-2">Present Condition</span>
                  
                  <div class="flex items-center gap-1 mt-auto z-10">
                    <button type="button" onclick="PhotoManagerView.pasteFromClipboard('${t.task_id}', 'before_photo')" class="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shadow-xs transition flex items-center gap-0.5">
                      <span>📋</span> <span>Paste</span>
                    </button>
                    <label for="slot-file-${t.task_id}-before" class="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold cursor-pointer shadow-xs transition">
                      Browse
                    </label>
                  </div>
                </div>
              `}
              <input type="file" id="slot-file-${t.task_id}-before" accept="image/*" class="hidden" onchange="PhotoManagerView.handleSlotFile(event, '${t.task_id}', 'before_photo')">
            </div>

            <!-- Slot 2: After / Proposed Project -->
            <div data-photo-slot="true" data-task-id="${t.task_id}" data-slot="after_photo"
                 onclick="PhotoManagerView.selectSlot('${t.task_id}', 'after_photo', event)"
                 ondragover="event.preventDefault(); this.classList.add('border-sky-500', 'bg-sky-50');"
                 ondragleave="this.classList.remove('border-sky-500', 'bg-sky-50');"
                 ondrop="PhotoManagerView.handleSlotDrop(event, '${t.task_id}', 'after_photo')"
                 class="relative h-44 rounded-2xl border-2 border-dashed ${hasAfter ? 'border-sky-200 bg-sky-50/20' : 'border-sky-300 bg-sky-50/40 hover:border-sky-400'} ${isSelectedAfter ? 'ring-4 ring-blue-500 border-blue-600 bg-blue-50/70 shadow-md' : ''} flex flex-col items-center justify-center overflow-hidden transition cursor-pointer select-none">
              
              <!-- Active Target Badge -->
              <div class="active-target-badge ${isSelectedAfter ? '' : 'hidden'} absolute top-1 inset-x-1 z-20 bg-blue-600 text-white text-[9px] font-black text-center py-0.5 rounded-md shadow-xs animate-pulse">
                🎯 ACTIVE TARGET (Ctrl+V)
              </div>

              ${hasAfter ? `
                <img src="${photos.after_photo}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-slate-950/60 opacity-0 hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition p-2">
                  <span class="text-white text-[10px] font-bold">After Photo Attached</span>
                  <div class="flex items-center gap-1">
                    <button onclick="PhotoManagerView.copyPhotoToClipboard('${t.task_id}', 'after_photo')" title="Copy to Clipboard" class="p-1 px-2 rounded-lg bg-white/95 text-slate-800 text-[10px] font-bold hover:bg-white">
                      📋 Copy
                    </button>
                    <label for="slot-file-${t.task_id}-after" class="p-1 px-2 rounded-lg bg-white/95 text-slate-800 text-[10px] font-bold cursor-pointer hover:bg-white">
                      Change
                    </label>
                    <button onclick="PhotoManagerView.removeSlotPhoto('${t.task_id}', 'after_photo')" class="p-1 px-2 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-500">
                      ✕
                    </button>
                  </div>
                </div>
                <span class="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-sky-700 text-[9px] font-mono text-white font-bold backdrop-blur-xs">
                  After
                </span>
              ` : `
                <div class="flex flex-col items-center justify-center p-2 text-center w-full h-full">
                  <span class="text-xl">📸</span>
                  <span class="text-[11px] font-bold text-sky-900 mt-1">After Photo</span>
                  <span class="text-[9px] text-sky-600/80 mb-2">Project / Improvement</span>
                  
                  <div class="flex items-center gap-1 mt-auto z-10">
                    <button type="button" onclick="PhotoManagerView.pasteFromClipboard('${t.task_id}', 'after_photo')" class="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold shadow-xs transition flex items-center gap-0.5">
                      <span>📋</span> <span>Paste</span>
                    </button>
                    <label for="slot-file-${t.task_id}-after" class="px-2 py-1 rounded-lg bg-white hover:bg-sky-100 text-sky-900 border border-sky-300 text-[10px] font-bold cursor-pointer shadow-xs transition">
                      Browse
                    </label>
                  </div>
                </div>
              `}
              <input type="file" id="slot-file-${t.task_id}-after" accept="image/*" class="hidden" onchange="PhotoManagerView.handleSlotFile(event, '${t.task_id}', 'after_photo')">
            </div>

          </div>
        </div>

        <div class="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-[10px] font-mono text-slate-400">16:9 Presentation Ready</span>
          <button onclick="photoViewModal.open('${t.task_id}')" class="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 shadow-xs transition flex items-center gap-1">
            <span>🔍</span> <span>Full Preview</span>
          </button>
        </div>
      </div>
    `;
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

    const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers)
      ? MasterDataManager.getEngineers()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS : []);

    // Calculate engineer stats (tasks count & photos count)
    const engStats = {};
    engineers.forEach(e => {
      engStats[e.name] = { tasks: 0, photos: 0, display: e.display || e.name };
    });

    allTasks.forEach(t => {
      const eng = (t.engineer || t.assignee || '').split(/[\s(]/)[0];
      if (engStats[eng]) {
        engStats[eng].tasks++;
        const p = photoManager.getTaskPhotos(t.task_id, month);
        if (p.before_photo || p.after_photo || p.photo_1) engStats[eng].photos++;
      }
    });

    const isFiltered = Boolean(this.filterEngineer);
    const filteredTasks = isFiltered
      ? allTasks.filter(t => (t.engineer || '').includes(this.filterEngineer) || (t.assignee || '').includes(this.filterEngineer))
      : allTasks;

    // Group tasks engineer-wise
    const groupedByEngineer = {};
    if (!isFiltered) {
      allTasks.forEach(t => {
        const eng = (t.engineer || t.assignee || 'Unassigned').split(/[\s(]/)[0] || 'Unassigned';
        if (!groupedByEngineer[eng]) groupedByEngineer[eng] = [];
        groupedByEngineer[eng].push(t);
      });
    }

    container.innerHTML = `
      <div class="space-y-6 pb-12 animate-fade-in">
        
        <!-- Header Banner & Controls -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-red-500/25 flex-shrink-0">
              📸
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-50 text-red-600 border border-red-200 shadow-xs">
                  EASY PHOTO MANAGER
                </span>
                <span class="text-xs text-slate-500 font-mono font-bold">${month}</span>
              </div>
              <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">Engineer Task Photo Gallery</h2>
              <p class="text-xs text-slate-500 mt-0.5">Click any box to activate it for Ctrl+V paste, or click the "📋 Paste" button directly to attach photos.</p>
            </div>
          </div>

          <!-- Controls: Month Selector -->
          <div class="flex flex-wrap items-center gap-3">
            <div>
              ${HELPERS.renderMonthSelectorUI(months, this.selectedMonth, 'PhotoManagerView.handleMonthChange', 'MonthlyInputView.openAddMonthModal')}
            </div>
            ${this.selectedTarget ? `
              <div class="px-3 py-1.5 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <span>🎯</span>
                <span>Active: ${this.selectedTarget.slot === 'before_photo' ? 'Before' : 'After'} (${this.selectedTarget.taskId})</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Requirement 3: Engineer-Wise Navigation Bar / Filter Tabs -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>👨‍💼</span> <span>Filter Tasks by Concern Engineer:</span>
            </span>
            <span class="text-[11px] text-slate-400">Total ${allTasks.length} tasks in ${month}</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- All Engineers Tab -->
            <button onclick="PhotoManagerView.handleEngineerFilter('')"
                    class="px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${!this.filterEngineer ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
              <span>👥</span>
              <span>All Personnel (${allTasks.length})</span>
            </button>

            <!-- Each Engineer Tab -->
            ${engineers.map(e => {
              const count = allTasks.filter(t => (t.engineer || '').includes(e.name) || (t.assignee || '').includes(e.name)).length;
              const isSelected = this.filterEngineer === e.name;
              return `
                <button onclick="PhotoManagerView.handleEngineerFilter('${e.name}')"
                        class="px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${isSelected ? 'bg-blue-600 text-white ring-2 ring-blue-500/30' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'}">
                  <span>👤</span>
                  <span>${e.name}</span>
                  <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}">${count}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Task Cards Display Area -->
        ${isFiltered ? `
          <!-- Single Engineer Focus View -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-black text-slate-800 flex items-center gap-2">
                <span>👨‍💼</span>
                <span>Tasks Assigned to Engr. ${this.filterEngineer} (${filteredTasks.length} tasks)</span>
              </h3>
              <button onclick="PhotoManagerView.handleEngineerFilter('')" class="text-xs text-blue-600 font-bold hover:underline">
                ← View All Engineers
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              ${filteredTasks.length === 0 ? `
                <div class="col-span-full py-16 text-center bg-white border border-slate-200 rounded-3xl text-slate-400 shadow-xs">
                  No tasks assigned to ${this.filterEngineer} in ${month}.
                </div>
              ` : filteredTasks.map(t => {
                const photos = photoManager.getTaskPhotos(t.task_id, month);
                return this.renderTaskCardHtml(t, photos);
              }).join('')}
            </div>
          </div>
        ` : `
          <!-- All Engineers: Clear Grouped Sections -->
          <div class="space-y-8">
            ${Object.keys(groupedByEngineer).length === 0 ? `
              <div class="py-16 text-center bg-white border border-slate-200 rounded-3xl text-slate-400 shadow-xs">
                No tasks found in ${month}.
              </div>
            ` : Object.entries(groupedByEngineer).map(([engName, engTasks]) => {
              const withPhotos = engTasks.filter(t => {
                const p = photoManager.getTaskPhotos(t.task_id, month);
                return p.before_photo || p.after_photo || p.photo_1;
              }).length;

              return `
                <div class="space-y-4">
                  <!-- Engineer Group Header -->
                  <div class="flex items-center justify-between bg-gradient-to-r from-slate-100 to-white px-5 py-3 rounded-2xl border border-slate-200/90 shadow-xs">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        👨‍💼
                      </div>
                      <div>
                        <span class="text-sm font-black text-slate-900 tracking-tight">Engr. ${engName}</span>
                        <span class="text-xs text-slate-500 font-mono ml-2">&bull; ${engTasks.length} Tasks &bull; ${withPhotos} Photos Attached</span>
                      </div>
                    </div>
                    <button onclick="PhotoManagerView.handleEngineerFilter('${engName}')" class="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                      <span>Focus on ${engName}</span>
                      <span>→</span>
                    </button>
                  </div>

                  <!-- Engineer's Task Cards Grid -->
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    ${engTasks.map(t => {
                      const photos = photoManager.getTaskPhotos(t.task_id, month);
                      return this.renderTaskCardHtml(t, photos);
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;

    this.initPasteListener();
  },

  _pasteInitialized: false,

  initPasteListener() {
    if (this._pasteInitialized) return;
    this._pasteInitialized = true;

    document.addEventListener('paste', async (event) => {
      // Find image file from clipboard event
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

      // Requirement 3: Use explicit selectedTarget first to avoid placing photo in wrong box!
      let target = this.selectedTarget;

      // Modal fallback
      if (!target && window.photoViewModal && photoViewModal._activeSlot) {
        target = photoViewModal._activeSlot;
      }

      if (!target && document.activeElement) {
        const el = document.activeElement.closest('[data-photo-slot]');
        if (el) {
          target = { taskId: el.getAttribute('data-task-id'), slot: el.getAttribute('data-slot') };
        }
      }

      if (!target) {
        if (typeof window.showToast === 'function') {
          window.showToast("⚠️ Please click on a Before or After photo box first to select where to paste the image!", "warning");
        }
        return;
      }

      if (target && target.taskId && target.slot) {
        event.preventDefault();
        try {
          await photoManager.savePhotoFile(target.taskId, target.slot, imageFile, this.selectedMonth);
          const slotLabel = target.slot === 'before_photo' ? 'Before (Present)' : 'After (Project)';
          if (typeof window.showToast === 'function') {
            window.showToast(`✅ Pasted photo into ${slotLabel} Photo for task ${target.taskId}!`, "success");
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
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhotoManagerView;
} else if (typeof window !== 'undefined') {
  window.PhotoManagerView = PhotoManagerView;
}
