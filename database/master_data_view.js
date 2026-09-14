/**
 * Process Development Monthly Report Automation System
 * Module: Master Data View (Interactive Management)
 * Allows adding, editing, and deleting Concern Engineers and Categories
 * WALTON Hi-Tech Industries PLC
 */

const MasterDataView = {
  editingEngineerId: null,
  editingSupervisorId: null,

  render(containerId = 'master-data-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const engineers = typeof MasterDataManager !== 'undefined' 
      ? MasterDataManager.getEngineers() 
      : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.ENGINEERS : []);

    const categories = typeof MasterDataManager !== 'undefined' 
      ? MasterDataManager.getCategories() 
      : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.CATEGORIES : []);

    const supervisors = typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.SUPERVISORS : [];

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header Banner -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-600 border border-red-200">
                CENTRAL MASTER REGISTRY
              </span>
              <span class="text-xs text-slate-400 font-mono">WALTON AC PROCESS DEVELOPMENT</span>
            </div>
            <h2 class="text-2xl font-black text-slate-800 mt-1">Master Data Configuration</h2>
            <p class="text-xs text-slate-500 mt-0.5">Manage and customize Concern Engineers, IDs, and Department Categories.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="MasterDataView.resetDefaults()" class="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold transition shadow-sm">
              ↺ Reset to Defaults
            </button>
            <button onclick="MasterDataView.openAddEngineerModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-black text-white shadow-lg shadow-red-200/50 transition flex items-center gap-1.5">
              <span>➕</span> <span>Add Concern Engineer</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <!-- Concern Engineers Management (7 cols) -->
          <div class="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 class="text-sm font-bold text-slate-800">Concern Engineers (${engineers.length})</h3>
                <p class="text-[11px] text-slate-400">Available in task entry dropdowns and slide concern badges</p>
              </div>
              <button onclick="MasterDataView.openAddEngineerModal()" class="text-xs font-bold text-red-600 hover:text-red-700 transition">
                + Add Engineer
              </button>
            </div>

            <div class="divide-y divide-slate-100 overflow-y-auto max-h-[500px] pr-1">
              ${engineers.map(e => `
                <div class="py-3 flex items-center justify-between group hover:bg-slate-50/80 px-2 rounded-xl transition">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold flex items-center justify-center text-xs">
                      ${(e.name || "?").charAt(0)}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-800 text-xs">${e.name}</span>
                        <span class="font-mono text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          ID: ${e.id}
                        </span>
                      </div>
                      <div class="text-[11px] text-slate-400 mt-0.5">
                        ${e.fullName || `Engr. ${e.name}`} &bull; <span class="font-mono text-[10px]">${e.email || 'No email'}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button onclick="MasterDataView.openEditEngineerModal('${e.id}')" title="Edit Engineer" class="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition">
                      ✏️
                    </button>
                    <button onclick="MasterDataView.deleteEngineer('${e.id}', '${e.name}')" title="Delete Engineer" class="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition">
                      🗑
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Categories & Supervisors (5 cols) -->
          <div class="lg:col-span-5 space-y-6">
            
            <!-- Categories Management -->
            <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h3 class="text-sm font-bold text-slate-800">Department Categories (${categories.length})</h3>
                <span class="text-[10px] font-mono text-slate-400">Click ✕ to delete</span>
              </div>

              <!-- Inline Add Category Input -->
              <div class="flex items-center gap-2 mb-4">
                <input type="text" id="new-category-input" placeholder="e.g. Kaizen / Cost Reduction" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 shadow-sm" onkeydown="if(event.key==='Enter') MasterDataView.handleAddCategory()">
                <button onclick="MasterDataView.handleAddCategory()" class="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-sm">
                  Add
                </button>
              </div>

              <div class="flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-1">
                ${categories.map(c => `
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium hover:border-slate-300 transition">
                    <span>${c}</span>
                    <button onclick="MasterDataView.deleteCategory('${c}')" class="text-slate-400 hover:text-red-500 p-0.5 rounded transition" title="Remove Category">
                      ✕
                    </button>
                  </span>
                `).join('')}
              </div>
            </div>

            <!-- Supervisors & Section Leads Management -->
            <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div>
                  <h3 class="text-sm font-bold text-slate-800">Supervisors &amp; Section Leads (${supervisors.length})</h3>
                  <p class="text-[11px] text-slate-400">Department management & leadership roster</p>
                </div>
                <button onclick="MasterDataView.openAddSupervisorModal()" class="text-xs font-bold text-red-600 hover:text-red-700 transition">
                  + Add Lead
                </button>
              </div>
              <div class="divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto pr-1">
                ${supervisors.map(s => `
                  <div class="py-2.5 flex items-center justify-between group hover:bg-slate-50 px-2 rounded-xl transition">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-800">${s.name}</span>
                        ${s.id ? `<span class="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">${s.id}</span>` : ''}
                      </div>
                      <span class="text-slate-400 text-[11px]">${s.title}</span>
                    </div>
                    <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button onclick="MasterDataView.openEditSupervisorModal('${s.id || s.name}')" title="Edit Supervisor" class="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition">
                        ✏️
                      </button>
                      <button onclick="MasterDataView.deleteSupervisor('${s.id || s.name}', '${s.name}')" title="Delete Supervisor" class="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition">
                        🗑
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>

        </div>

        <!-- Dynamic Modal Container for Add/Edit -->
        <div id="master-data-modal-container"></div>

      </div>
    `;
  },

  openAddEngineerModal() {
    this.editingEngineerId = null;
    this.renderEngineerModal("Add New Concern Engineer", { id: "", name: "", fullName: "", email: "" });
  },

  openEditEngineerModal(id) {
    const engineers = MasterDataManager.getEngineers();
    const target = engineers.find(e => String(e.id) === String(id));
    if (!target) return;
    this.editingEngineerId = id;
    this.renderEngineerModal("Edit Concern Engineer", target);
  },

  renderEngineerModal(title, data) {
    const modalContainer = document.getElementById('master-data-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 text-slate-800">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-800">${title}</h3>
            <button onclick="MasterDataView.closeModal()" class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition">
              ✕
            </button>
          </div>

          <form onsubmit="MasterDataView.handleEngineerSubmit(event)" class="mt-4 space-y-3.5">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Short Name (Required) *</label>
              <input type="text" id="modal-eng-name" required value="${data.name || ''}" placeholder="e.g. Sazzad" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Employee ID *</label>
              <input type="text" id="modal-eng-id" required value="${data.id || ''}" placeholder="e.g. 50463" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Full Name with Title</label>
              <input type="text" id="modal-eng-fullname" value="${data.fullName || ''}" placeholder="e.g. Engr. Sazzadul Islam" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Corporate Email</label>
              <input type="email" id="modal-eng-email" value="${data.email || ''}" placeholder="e.g. sazzad50463@waltonbd.com" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100">
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button type="button" onclick="MasterDataView.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-black text-white shadow-md shadow-red-200/50 transition">
                Save Engineer
              </button>
            </div>
          </form>

        </div>
      </div>
    `;
  },

  closeModal() {
    const modalContainer = document.getElementById('master-data-modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
    this.editingEngineerId = null;
  },

  handleEngineerSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('modal-eng-name').value.trim();
    const id = document.getElementById('modal-eng-id').value.trim();
    const fullName = document.getElementById('modal-eng-fullname').value.trim();
    const email = document.getElementById('modal-eng-email').value.trim();

    if (!name || !id) {
      alert("Name and ID are required.");
      return;
    }

    try {
      if (this.editingEngineerId) {
        MasterDataManager.updateEngineer(this.editingEngineerId, { name, id, fullName, email });
        if (typeof window.showToast === 'function') window.showToast(`Updated engineer ${name} (${id})`, "success");
      } else {
        MasterDataManager.addEngineer({ name, id, fullName, email });
        if (typeof window.showToast === 'function') window.showToast(`Added engineer ${name} (${id})`, "success");
      }
      this.closeModal();
      this.render();
    } catch (err) {
      alert("Error saving engineer: " + err.message);
    }
  },

  deleteEngineer(id, name) {
    if (confirm(`Are you sure you want to remove engineer "${name} (${id})" from Master Data?`)) {
      MasterDataManager.deleteEngineer(id);
      if (typeof window.showToast === 'function') window.showToast(`Removed engineer ${name}`, "success");
      this.render();
    }
  },

  openAddSupervisorModal() {
    this.editingSupervisorId = null;
    this.renderSupervisorModal("Add Supervisor / Section Lead", { id: "", name: "", title: "", email: "" });
  },

  openEditSupervisorModal(id) {
    const supervisors = MasterDataManager.getSupervisors();
    const target = supervisors.find(s => String(s.id) === String(id) || s.name === id);
    if (!target) return;
    this.editingSupervisorId = id;
    this.renderSupervisorModal("Edit Supervisor / Section Lead", target);
  },

  renderSupervisorModal(title, data) {
    const modalContainer = document.getElementById('master-data-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 text-slate-800">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-800">${title}</h3>
            <button onclick="MasterDataView.closeModal()" class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition">
              ✕
            </button>
          </div>

          <form onsubmit="MasterDataView.handleSupervisorSubmit(event)" class="mt-4 space-y-3.5">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Supervisor Name (Required) *</label>
              <input type="text" id="modal-sup-name" required value="${data.name || ''}" placeholder="e.g. Kamrul" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Role / Designation Title *</label>
              <input type="text" id="modal-sup-title" required value="${data.title || ''}" placeholder="e.g. Head of Process / Lead Engineer" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Employee ID</label>
              <input type="text" id="modal-sup-id" value="${data.id || ''}" placeholder="e.g. 44819" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Corporate Email</label>
              <input type="email" id="modal-sup-email" value="${data.email || ''}" placeholder="e.g. kamrulkuet50@gmail.com" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100">
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button type="button" onclick="MasterDataView.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-black text-white shadow-md shadow-red-200/50 transition">
                Save Supervisor
              </button>
            </div>
          </form>

        </div>
      </div>
    `;
  },

  handleSupervisorSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('modal-sup-name').value.trim();
    const title = document.getElementById('modal-sup-title').value.trim();
    const id = document.getElementById('modal-sup-id').value.trim();
    const email = document.getElementById('modal-sup-email').value.trim();

    if (!name || !title) {
      alert("Name and Title are required.");
      return;
    }

    try {
      if (this.editingSupervisorId) {
        MasterDataManager.updateSupervisor(this.editingSupervisorId, { name, title, id, email });
        if (typeof window.showToast === 'function') window.showToast(`Updated supervisor ${name}`, "success");
      } else {
        MasterDataManager.addSupervisor({ name, title, id, email });
        if (typeof window.showToast === 'function') window.showToast(`Added supervisor ${name}`, "success");
      }
      this.closeModal();
      this.render();
    } catch (err) {
      alert("Error saving supervisor: " + err.message);
    }
  },

  deleteSupervisor(id, name) {
    if (confirm(`Are you sure you want to remove supervisor "${name}" from Master Data?`)) {
      MasterDataManager.deleteSupervisor(id);
      if (typeof window.showToast === 'function') window.showToast(`Removed supervisor ${name}`, "success");
      this.render();
    }
  },

  handleAddCategory() {
    const input = document.getElementById('new-category-input');
    if (!input || !input.value.trim()) return;
    const cat = input.value.trim();
    try {
      MasterDataManager.addCategory(cat);
      input.value = '';
      if (typeof window.showToast === 'function') window.showToast(`Added category "${cat}"`, "success");
      this.render();
    } catch (err) {
      alert(err.message);
    }
  },

  deleteCategory(cat) {
    if (confirm(`Are you sure you want to remove category "${cat}"?`)) {
      MasterDataManager.deleteCategory(cat);
      if (typeof window.showToast === 'function') window.showToast(`Removed category "${cat}"`, "success");
      this.render();
    }
  },

  resetDefaults() {
    if (confirm("Reset all Concern Engineers, Categories, and Supervisors back to factory default Walton roster?")) {
      MasterDataManager.resetDefaults();
      if (typeof window.showToast === 'function') window.showToast("Reset master lists to default", "success");
      this.render();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MasterDataView;
} else if (typeof window !== 'undefined') {
  window.MasterDataView = MasterDataView;
}
