/**
 * Process Development Monthly Report Automation System
 * Module: Dedicated Projects View (Ongoing & Completed Projects)
 * Manages Multi-Month Strategic Projects (4-5 months deadline)
 * Supports Month-to-Month Carryover Synchronization & Task Entry
 * WALTON Hi-Tech Industries PLC
 */

const ProjectsView = {
  selectedMonth: "SEP-2026",
  activeFilter: "all", // 'all', 'ongoing', 'completed'

  async handleMonthSelect(month) {
    this.selectedMonth = month;
    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.activeMonth = month;
    }
    await this.render();
  },

  setFilter(filter) {
    this.activeFilter = filter;
    this.render();
  },

  async handleSyncFromPreviousMonth() {
    if (!window.appState || !window.appState.workbookMgr) return;
    const res = window.appState.workbookMgr.syncOngoingProjectsFromPreviousMonth(this.selectedMonth);
    
    if (res.added > 0) {
      if (window.appState.syncEngine) {
        await window.appState.syncEngine.syncMonth(this.selectedMonth);
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`\u{1F504} Carried forward ${res.added} ongoing project(s) from ${res.prevMonth}!`, "success");
      } else {
        alert(res.message);
      }
    } else {
      if (typeof window.showToast === 'function') {
        window.showToast(`No new ongoing projects to carry forward from ${res.prevMonth || 'previous month'}.`, "info");
      } else {
        alert("No new ongoing projects to carry forward.");
      }
    }
    await this.render();
  },

  async toggleProjectStatus(taskId) {
    if (!window.appState || !window.appState.workbookMgr) return;
    const task = window.appState.workbookMgr.getTask(this.selectedMonth, taskId);
    if (!task) return;

    const isCurrentlyCompleted = task.status === 'Completed' || task.category === 'Completed Projects' || task.project_status === 'Completed';
    const newStatus = isCurrentlyCompleted ? 'Ongoing' : 'Completed';
    const newCategory = isCurrentlyCompleted ? 'Ongoing Projects' : 'Completed Projects';

    window.appState.workbookMgr.updateTask(this.selectedMonth, taskId, {
      status: newStatus,
      project_status: newStatus,
      category: newCategory,
      last_updated: new Date().toISOString()
    });

    if (window.appState.syncEngine) {
      await window.appState.syncEngine.syncMonth(this.selectedMonth);
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`Project marked as ${newStatus}!`, "success");
    }
    await this.render();
  },

  async deleteProject(taskId) {
    if (!window.appState || !window.appState.workbookMgr) return;
    if (confirm(`Are you sure you want to delete this project (${taskId}) from ${this.selectedMonth}?`)) {
      window.appState.workbookMgr.deleteTask(this.selectedMonth, taskId);
      if (window.appState.syncEngine) {
        await window.appState.syncEngine.syncMonth(this.selectedMonth);
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`Deleted project ${taskId}`, "info");
      }
      await this.render();
    }
  },

  generateAiDetails(event) {
    if (event && event.preventDefault) event.preventDefault();
    const nameInput = document.getElementById('proj-name');
    const detailsArea = document.getElementById('proj-details');
    const categorySelect = document.getElementById('proj-category');
    if (!nameInput || !detailsArea) return;

    const taskName = nameInput.value.trim();
    if (!taskName) {
      if (typeof window.showToast === 'function') {
        window.showToast("Please enter a Project Name first to generate AI details!", "warning");
      } else {
        alert("Please enter a Project Name first!");
      }
      nameInput.focus();
      return;
    }

    const category = categorySelect ? categorySelect.value : "Ongoing Projects";
    let steps = "";
    if (typeof PROMPT_TEMPLATES !== 'undefined' && typeof PROMPT_TEMPLATES.generateEngineeringSteps === 'function') {
      steps = PROMPT_TEMPLATES.generateEngineeringSteps(taskName, category);
    } else {
      steps = `1. Conduct engineering feasibility & design study for ${taskName}. 2. Procure tooling & fabricate pilot components. 3. Execute trial run & validate process parameters. 4. Complete quality sign-off and SOP documentation.`;
    }

    detailsArea.value = steps;
    if (typeof window.showToast === 'function') {
      window.showToast("\u2728 AI generated tailored milestone details!", "success");
    }
  },

  openNewProjectModal() {
    let modal = document.getElementById('project-entry-modal-container');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'project-entry-modal-container';
      document.body.appendChild(modal);
    }

    const supervisors = (typeof MasterDataManager !== 'undefined') ? MasterDataManager.getSupervisors() : [];
    const engineers = (typeof MasterDataManager !== 'undefined') ? MasterDataManager.getEngineers() : [];
    const defaultSup = supervisors[0] ? supervisors[0].display : "Kamrul (44819)";
    const defaultEng = engineers[0] ? engineers[0].display : "Sazzad (50463)";

    modal.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 flex flex-col font-sans">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center text-xl shadow-sm">
                \u{1F680}
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900">Add Strategic Automation Project</h3>
                <p class="text-xs text-slate-400">Target Month: <strong class="text-slate-700">${this.selectedMonth}</strong> &bull; Multi-month carryover enabled</p>
              </div>
            </div>
            <button onclick="ProjectsView.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-sm flex items-center justify-center transition">&times;</button>
          </div>

          <form id="project-entry-form" onsubmit="ProjectsView.saveProjectEntry(event)" class="mt-5 space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Project Name <span class="text-red-500">*</span></label>
              <input type="text" id="proj-name" required placeholder="e.g. CNC Turret Punch Machine Automation & Setup"
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-sky-500 focus:bg-white shadow-sm" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Project Category / Type</label>
                <select id="proj-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500">
                  <option value="Ongoing Projects" selected>New / Ongoing Project (In Progress)</option>
                  <option value="Completed Projects">Completed Project</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Target Deadline / Duration</label>
                <input type="text" id="proj-deadline" placeholder="e.g. 4-5 Months (Target: Dec, 2026)"
                       class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500" />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-slate-700">Milestone Details / Action Steps</label>
                <button type="button" onclick="ProjectsView.generateAiDetails(event)" class="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-lg transition shadow-xs">
                  <span>\u2728</span> <span>AI Generate Details</span>
                </button>
              </div>
              <textarea id="proj-details" rows="3" placeholder="1. Technical study & punch matrix 2. Fabrication trial 3. Safety inspection..."
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500 resize-none"></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Supervisor</label>
                <select id="proj-supervisor" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500">
                  ${supervisors.map(s => `<option value="${s.display}" ${s.display === defaultSup ? 'selected' : ''}>${s.display}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Assignee</label>
                <select id="proj-assignee" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500">
                  ${engineers.map(e => `<option value="${e.display}" ${e.display === defaultEng ? 'selected' : ''}>${e.display}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Task Point</label>
                <input type="number" id="proj-points" placeholder="&mdash;" step="5" min="0" max="200"
                       class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono font-bold focus:outline-none focus:border-sky-500" />
              </div>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-100">
              <span class="text-[11px] text-slate-400">Project tasks are automatically scheduled at the end of monthly report decks.</span>
              <div class="flex items-center gap-2">
                <button type="button" onclick="ProjectsView.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition">Cancel</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black shadow-md shadow-sky-200/50 transition flex items-center gap-1.5">
                  <span>\u{1F4BE}</span> <span>Save Project</span>
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    `;
  },

  closeModal() {
    const modal = document.getElementById('project-entry-modal-container');
    if (modal) modal.innerHTML = '';
  },

  async saveProjectEntry(event) {
    event.preventDefault();
    const name = document.getElementById('proj-name').value.trim();
    if (!name) return;

    const category = document.getElementById('proj-category').value;
    const deadline = document.getElementById('proj-deadline').value.trim();
    const details = document.getElementById('proj-details').value.trim();
    const supervisor = document.getElementById('proj-supervisor').value;
    const assignee = document.getElementById('proj-assignee').value;
    const points = document.getElementById('proj-points').value;

    const isCompleted = (category === 'Completed Projects');

    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.addTask(
        this.selectedMonth,
        assignee,
        name,
        "YES",
        details,
        category,
        points,
        supervisor,
        {
          is_project: true,
          project_status: isCompleted ? "Completed" : "Ongoing",
          deadline: deadline,
          last_updated: new Date().toISOString()
        }
      );

      if (window.appState.syncEngine) {
        await window.appState.syncEngine.syncMonth(this.selectedMonth);
      }
    }

    this.closeModal();
    if (typeof window.showToast === 'function') {
      window.showToast(`\u{1F680} Added project task: ${name}`, "success");
    }
    await this.render();
  },

  async render(containerId = 'projects-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : new MonthWorkbookManager();

    const month = this.selectedMonth;
    const months = workbookMgr.getAllMonths();
    const allTasks = workbookMgr.getTasksForMonth(month);

    // Extract project tasks
    const projectTasks = allTasks.filter(t => {
      const cat = (t.category || '').toLowerCase();
      const name = (t.task_name || '').toLowerCase();
      return Boolean(t.is_project || cat.includes('project') || name.includes('project'));
    });

    const ongoingProjects = projectTasks.filter(t => {
      const status = (t.status || t.project_status || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      return !status.includes('complete') && !cat.includes('completed project');
    });

    const completedProjects = projectTasks.filter(t => {
      const status = (t.status || t.project_status || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      return status.includes('complete') || cat.includes('completed project');
    });

    const prevMonth = workbookMgr.getPreviousMonth(month);

    container.innerHTML = `
      <div class="space-y-6 font-sans">
        
        <!-- Header Bar with Walton Branding, Month Navigation & Actions -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div class="flex items-center gap-4">
              <img src="assets/img/walton_logo.png" alt="WALTON" class="h-12 w-auto object-contain flex-shrink-0 drop-shadow-sm">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    STRATEGIC AUTOMATION
                  </span>
                  <span class="text-xs text-slate-400 font-mono">Multi-Month Project Management</span>
                </div>
                <h2 class="text-2xl font-black text-slate-800 mt-1">Department Projects: ${month}</h2>
                <p class="text-xs text-slate-400 mt-0.5">
                  Track multi-month engineering projects. Ongoing projects automatically carry forward month-to-month and appear at the end of report decks.
                </p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center gap-2.5">
              ${prevMonth ? `
                <button onclick="ProjectsView.handleSyncFromPreviousMonth()" title="Carry forward active ongoing projects from ${prevMonth} into ${month}"
                        class="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                  <span>\u{1F504}</span> <span>Sync from ${prevMonth}</span>
                </button>
              ` : ''}

              <button onclick="ProjectsView.openNewProjectModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-black text-xs shadow-md shadow-sky-200/50 transition flex items-center gap-1.5">
                <span>\u2795</span> <span>New Project Task</span>
              </button>
            </div>
          </div>

          <!-- Controls: Month Selector + Filter Tabs -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
            ${HELPERS.renderMonthSelectorUI(months, this.selectedMonth, 'ProjectsView.handleMonthSelect', 'MonthlyInputView.openAddMonthModal')}

            <!-- Filter Pills -->
            <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button onclick="ProjectsView.setFilter('all')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${this.activeFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                All Projects (${projectTasks.length})
              </button>
              <button onclick="ProjectsView.setFilter('ongoing')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${this.activeFilter === 'ongoing' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                Ongoing (${ongoingProjects.length})
              </button>
              <button onclick="ProjectsView.setFilter('completed')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${this.activeFilter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                Completed (${completedProjects.length})
              </button>
            </div>
          </div>
        </div>

        <!-- KPI SUMMARY CARDS -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Card 1: New / Ongoing Projects -->
          <div class="bg-gradient-to-br from-sky-500/10 to-blue-500/5 border border-sky-200 rounded-3xl p-6 shadow-sm flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-sky-500 shadow-sm shadow-sky-200"></span>
                <span class="text-xs font-mono font-bold uppercase tracking-wider text-sky-800">New Projects / Ongoing</span>
              </div>
              <div class="text-4xl font-black text-sky-900 font-mono mt-2">${ongoingProjects.length}</div>
              <p class="text-xs text-slate-600 mt-1 font-medium">Strategic automation tasks currently active in ${month}</p>
              <div class="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-[11px] font-semibold">
                <span>\u23F1\uFE0F</span> <span>Typical duration: 4-5 months &bull; Auto-carries over</span>
              </div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center text-2xl flex-shrink-0 text-sky-600">
              \u{1F680}
            </div>
          </div>

          <!-- Card 2: Completed Projects -->
          <div class="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-200 rounded-3xl p-6 shadow-sm flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
                <span class="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">Completed Projects</span>
              </div>
              <div class="text-4xl font-black text-emerald-900 font-mono mt-2">${completedProjects.length}</div>
              <p class="text-xs text-slate-600 mt-1 font-medium">Fully verified & implemented milestone completions</p>
              <div class="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-semibold">
                <span>\u2705</span> <span>Milestone verification finished</span>
              </div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-2xl flex-shrink-0 text-emerald-600">
              \u{1F3C6}
            </div>
          </div>
        </div>

        <!-- SECTION 1: ONGOING PROJECTS -->
        ${(this.activeFilter === 'all' || this.activeFilter === 'ongoing') ? `
          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center text-lg shadow-sm">
                  \u23F3
                </div>
                <div>
                  <h3 class="text-base font-black text-slate-800">Active Ongoing Projects (${ongoingProjects.length})</h3>
                  <p class="text-xs text-slate-400">These tasks carry forward across months until marked as Completed</p>
                </div>
              </div>
            </div>

            ${ongoingProjects.length === 0 ? `
              <div class="py-12 text-center text-slate-400 font-mono text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                No active ongoing projects recorded for ${month}.<br>
                ${prevMonth ? `
                  <button onclick="ProjectsView.handleSyncFromPreviousMonth()" class="mt-3 px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs inline-flex items-center gap-1.5 transition">
                    <span>\u{1F504}</span> <span>Carry forward ongoing projects from ${prevMonth}</span>
                  </button>
                ` : `
                  <button onclick="ProjectsView.openNewProjectModal()" class="mt-3 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition">
                    <span>\u2795</span> <span>Add First Project</span>
                  </button>
                `}
              </div>
            ` : `
              <div class="overflow-x-auto rounded-2xl border border-slate-200">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-sky-50 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th class="py-3 px-3 w-12 text-center border-r border-slate-200">SL</th>
                      <th class="py-3 px-4 border-r border-slate-200 w-64">Project Name</th>
                      <th class="py-3 px-4 border-r border-slate-200">Milestone Details</th>
                      <th class="py-3 px-3 border-r border-slate-200 w-36">Timeline / Target</th>
                      <th class="py-3 px-3 border-r border-slate-200 w-36">Supervisor</th>
                      <th class="py-3 px-3 border-r border-slate-200 w-36">Assignee</th>
                      <th class="py-3 px-3 text-center border-r border-slate-200 w-20">Pts</th>
                      <th class="py-3 px-3 text-center border-r border-slate-200 w-28">Status</th>
                      <th class="py-3 px-3 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    ${ongoingProjects.map((p, idx) => `
                      <tr class="hover:bg-slate-50/80 transition">
                        <td class="py-3 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-100">${idx + 1}</td>
                        <td class="py-3 px-4 font-black text-slate-800 border-r border-slate-100">${HELPERS.escapeHtml(p.task_name)}</td>
                        <td class="py-3 px-4 text-slate-600 border-r border-slate-100">${HELPERS.escapeHtml(p.task_details || '\u2014')}</td>
                        <td class="py-3 px-3 font-mono text-slate-600 border-r border-slate-100">${HELPERS.escapeHtml(p.deadline || '4-5 Months')}</td>
                        <td class="py-3 px-3 font-medium text-slate-700 border-r border-slate-100">${HELPERS.escapeHtml(p.supervisor || 'Kamrul (44819)')}</td>
                        <td class="py-3 px-3 font-bold text-slate-800 border-r border-slate-100">${HELPERS.escapeHtml(p.assignee || p.engineer || '\u2014')}</td>
                        <td class="py-3 px-3 text-center font-mono font-black text-sky-700 border-r border-slate-100">${(p.points !== "" && p.points !== undefined && p.points !== null) ? p.points : '\u2014'}</td>
                        <td class="py-3 px-3 text-center border-r border-slate-100">
                          <button onclick="ProjectsView.toggleProjectStatus('${p.task_id}')" title="Click to mark as Completed"
                                  class="px-2.5 py-1 rounded-full bg-sky-100 hover:bg-emerald-100 text-sky-800 hover:text-emerald-800 font-bold text-[11px] transition inline-flex items-center gap-1">
                            <span>\u23F3</span> <span>Ongoing</span>
                          </button>
                        </td>
                        <td class="py-3 px-3 text-center">
                          <div class="flex items-center justify-center gap-1.5">
                            <button onclick="ProjectsView.toggleProjectStatus('${p.task_id}')" title="Mark Completed" class="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition">
                              \u2705
                            </button>
                            <button onclick="ProjectsView.deleteProject('${p.task_id}')" title="Delete Project" class="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition">
                              \u{1F5D1}\uFE0F
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        ` : ''}

        <!-- SECTION 2: COMPLETED PROJECTS -->
        ${(this.activeFilter === 'all' || this.activeFilter === 'completed') ? `
          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-lg shadow-sm">
                  \u{1F3C6}
                </div>
                <div>
                  <h3 class="text-base font-black text-slate-800">Completed Projects (${completedProjects.length})</h3>
                  <p class="text-xs text-slate-400">Finished automation milestones documented with verified outcomes</p>
                </div>
              </div>
            </div>

            ${completedProjects.length === 0 ? `
              <div class="py-12 text-center text-slate-400 font-mono text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                No completed projects recorded for ${month}. When an ongoing project finishes, click "Ongoing" to mark it completed.
              </div>
            ` : `
              <div class="overflow-x-auto rounded-2xl border border-slate-200">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-emerald-50 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th class="py-3 px-3 w-12 text-center border-r border-slate-200">SL</th>
                      <th class="py-3 px-4 border-r border-slate-200 w-64">Project Name</th>
                      <th class="py-3 px-4 border-r border-slate-200">Milestone Summary</th>
                      <th class="py-3 px-3 border-r border-slate-200 w-36">Supervisor</th>
                      <th class="py-3 px-3 border-r border-slate-200 w-36">Assignee</th>
                      <th class="py-3 px-3 text-center border-r border-slate-200 w-20">Pts</th>
                      <th class="py-3 px-3 text-center border-r border-slate-200 w-28">Status</th>
                      <th class="py-3 px-3 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    ${completedProjects.map((p, idx) => `
                      <tr class="hover:bg-slate-50/80 transition">
                        <td class="py-3 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-100">${idx + 1}</td>
                        <td class="py-3 px-4 font-black text-slate-800 border-r border-slate-100">${HELPERS.escapeHtml(p.task_name)}</td>
                        <td class="py-3 px-4 text-slate-600 border-r border-slate-100">${HELPERS.escapeHtml(p.task_details || '\u2014')}</td>
                        <td class="py-3 px-3 font-medium text-slate-700 border-r border-slate-100">${HELPERS.escapeHtml(p.supervisor || 'Kamrul (44819)')}</td>
                        <td class="py-3 px-3 font-bold text-slate-800 border-r border-slate-100">${HELPERS.escapeHtml(p.assignee || p.engineer || '\u2014')}</td>
                        <td class="py-3 px-3 text-center font-mono font-black text-emerald-700 border-r border-slate-100">${(p.points !== "" && p.points !== undefined && p.points !== null) ? p.points : '\u2014'}</td>
                        <td class="py-3 px-3 text-center border-r border-slate-100">
                          <button onclick="ProjectsView.toggleProjectStatus('${p.task_id}')" title="Click to reopen as Ongoing"
                                  class="px-2.5 py-1 rounded-full bg-emerald-100 hover:bg-sky-100 text-emerald-800 hover:text-sky-800 font-bold text-[11px] transition inline-flex items-center gap-1">
                            <span>\u2705</span> <span>Completed</span>
                          </button>
                        </td>
                        <td class="py-3 px-3 text-center">
                          <div class="flex items-center justify-center gap-1.5">
                            <button onclick="ProjectsView.toggleProjectStatus('${p.task_id}')" title="Delete Project" class="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition">
                              \u{1F5D1}\uFE0F
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        ` : ''}

      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProjectsView;
} else if (typeof window !== 'undefined') {
  window.ProjectsView = ProjectsView;
}