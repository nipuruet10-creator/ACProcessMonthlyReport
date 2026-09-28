/**
 * Process Development Monthly Report Automation System
 * Module: Settings View
 * Manages Gemini API Key, Google Sheets Cloud Database, and System Preferences
 * WALTON Hi-Tech Industries PLC
 */

const SettingsView = {
  _unlockedStaffIds: new Set(),
  _masterAdminUnlocked: false,

  render(containerId = 'settings-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentGeminiKey = HELPERS.storage.get(APP_CONFIG.AI.STORAGE_KEY_API_KEY, "");
    const aiProvider = (typeof geminiClient !== 'undefined') ? geminiClient.getProvider() : (HELPERS.storage.get("walton_pd_ai_provider", "openrouter") || "openrouter");
    const openRouterKey = (typeof geminiClient !== 'undefined') ? geminiClient.getOpenRouterKey() : (HELPERS.storage.get("walton_pd_openrouter_api_key", "") || "");
    const openRouterModel = (typeof geminiClient !== 'undefined') ? geminiClient.getOpenRouterModel() : (HELPERS.storage.get("walton_pd_openrouter_model", "google/gemini-2.0-flash-exp:free") || "google/gemini-2.0-flash-exp:free");
    const onlineDocsEmails = localStorage.getItem('walton_online_docs_emails') || '';
    const googleSlidesUrl = localStorage.getItem('walton_google_slides_url') || 'https://docs.google.com/presentation/u/0/';
    const taskSequenceMode = this.getTaskSequenceMode();
    const monthlySeq = this.getMonthlyEngineerSequence();
    const mgmtSeq = this.getMgmtEngineerSequence();

    // Firebase Realtime Status Badge
    const fbConfig = (typeof FirebaseSyncService !== 'undefined') ? FirebaseSyncService.getConfig() : null;
    const fbDbUrl = (fbConfig && fbConfig.databaseURL) ? fbConfig.databaseURL : '';
    const fbConnected = (typeof FirebaseSyncService !== 'undefined') && FirebaseSyncService.isConnected();
    let fbBadgeHtml = `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
        <span class="w-2 h-2 rounded-full bg-slate-500"></span> Not Configured
      </span>
    `;
    if (fbConnected) {
      fbBadgeHtml = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Live &lt;30ms Realtime Active
        </span>
      `;
    } else if (fbDbUrl) {
      fbBadgeHtml = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
          <span class="w-2 h-2 rounded-full bg-indigo-400"></span> Ready to Connect
        </span>
      `;
    }

    const isUnlocked = (typeof authManager !== 'undefined') ? authManager.isInputUnlocked() : true;

    container.innerHTML = `
      <div class="space-y-6 max-w-4xl text-slate-800">
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
          <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
            SYSTEM SETTINGS &amp; INTEGRATIONS
          </span>
          <h2 class="text-2xl font-black text-slate-900 mt-1">Application Configuration</h2>
          <p class="text-xs text-slate-500 mt-0.5">Manage security access, staff credentials, Firebase Realtime Database, Gemini AI, and local data persistence.</p>
        </div>

        <!-- Security, Admin Access & Sheet Protection Card -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-lg font-bold shadow-2xs">
                🔐
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                  Security, Admin Access &amp; Sheet Protection
                  ${isUnlocked ? `
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Admin Access Active (Unlocked)
                    </span>
                  ` : `
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <span class="w-2 h-2 rounded-full bg-rose-500"></span> Input Locked (Read-Only Mode)
                    </span>
                  `}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Control editing permissions for Monthly Task Grid and protect reports from unauthorized edits.</p>
              </div>
            </div>
          </div>

          <div class="pt-2 flex flex-wrap items-center gap-3">
            ${isUnlocked ? `
              <button onclick="SettingsView.handleLock()" class="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-2 shadow-2xs cursor-pointer">
                <span>🔒</span> <span>Lock Input Section Now</span>
              </button>
              <button onclick="SettingsView.openChangePasswordModal()" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs transition flex items-center gap-2 shadow-2xs cursor-pointer">
                <span>🔑</span> <span>Change Team Password</span>
              </button>
            ` : `
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                <input type="password" id="settings-admin-pass" placeholder="Enter team password..." class="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-mono flex-1" />
                <button onclick="SettingsView.handleUnlock()" class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer">
                  <span>🔓</span> <span>Unlock Admin Access</span>
                </button>
                <button onclick="SettingsView.openChangePasswordModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium transition cursor-pointer">
                  <span>🔑</span> <span>Forgot Password / OTP</span>
                </button>
              </div>
            `}
          </div>
        </div>

        <!-- Walton eService TMS Credentials & Engineer Passwords Card (White Corporate Design) -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-lg font-bold shadow-2xs">
                🔑
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                  Walton eService TMS Credentials &amp; Engineer Passwords
                  ${this._masterAdminUnlocked ? `
                    <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-bold border border-emerald-200">👑 Master Admin Unlocked</span>
                  ` : `
                    <span class="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-bold border border-blue-200">Privacy Protection Active</span>
                  `}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Each engineer can view/edit only their own TMS password using their unique security password. Master Admin (50463) can manage all.</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              ${this._masterAdminUnlocked ? `
                <button onclick="SettingsView.lockAllStaff()" class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer">
                  <span>🔒</span> <span>Lock All</span>
                </button>
              ` : `
                <button onclick="SettingsView.openMasterAdminUnlockModal()" class="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 shadow-2xs flex items-center gap-1 cursor-pointer">
                  <span>👑</span> <span>Master Admin (50463)</span>
                </button>
              `}
              <button onclick="SettingsView.openAddStaffModal()" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer">
                <span>➕ Add New Member</span>
              </button>
            </div>
          </div>

          <!-- Engineers TMS Table with Privacy Masking -->
          <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase border-b border-slate-200">
                <tr>
                  <th class="py-3 px-3 w-10 text-center">#</th>
                  <th class="py-3 px-3">Engineer / Staff Name</th>
                  <th class="py-3 px-3 w-28">Employee ID</th>
                  <th class="py-3 px-4">Walton TMS Password</th>
                  <th class="py-3 px-3 text-center w-36">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-700">
                ${(typeof MasterDataManager !== 'undefined' ? MasterDataManager.getEngineers() : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.ENGINEERS : []))
                  .filter(eng => String(eng.id) !== '44819' && (eng.name || '').toLowerCase() !== 'kamrul')
                  .map((eng, idx) => {
                    const isUnlocked = this._masterAdminUnlocked || (this._unlockedStaffIds && this._unlockedStaffIds.has(String(eng.id)));
                    return `
                    <tr class="hover:bg-blue-50/20 transition">
                      <td class="py-3 px-3 text-center font-mono text-slate-400 font-bold">${idx + 1}</td>
                      <td class="py-3 px-3 font-bold text-slate-900">
                        ${HELPERS.escapeHtml(eng.fullName || eng.name)}
                        <span class="text-[10px] text-slate-500 font-mono font-normal block">${HELPERS.escapeHtml(eng.display || eng.name)}</span>
                      </td>
                      <td class="py-3 px-3 font-mono font-bold text-blue-700">${eng.id || '—'}</td>
                      <td class="py-3 px-4">
                        ${isUnlocked ? `
                          <div class="flex items-center gap-1.5">
                            <input type="text" id="tms-pass-input-${eng.id || eng.name}" value="${HELPERS.escapeHtml(eng.tms_password || 'Sep@2026')}"
                                   class="bg-emerald-50 border border-emerald-300 focus:bg-white focus:border-emerald-600 rounded-lg px-3 py-1 text-xs text-slate-900 font-mono font-bold focus:outline-none w-40 transition shadow-2xs" />
                            <button onclick="SettingsView.saveTmsPassword('${eng.id || eng.name}')" title="Save and Sync Password" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-0.5 cursor-pointer shadow-2xs">
                              <span>💾 Save</span>
                            </button>
                            <button onclick="SettingsView.lockStaff('${eng.id || eng.name}')" title="Re-Lock Password" class="p-1 text-slate-400 hover:text-slate-700 text-xs cursor-pointer">
                              <span>🔒</span>
                            </button>
                          </div>
                        ` : `
                          <div class="flex items-center gap-2">
                            <span class="font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold tracking-widest">••••••••</span>
                            <button onclick="SettingsView.openUnlockStaffModal('${eng.id || eng.name}')" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition flex items-center gap-1 cursor-pointer">
                              <span>🔒 Unlock &amp; View</span>
                            </button>
                          </div>
                        `}
                      </td>
                      <td class="py-3 px-3 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                          ${!isUnlocked ? `
                            <button onclick="SettingsView.openUnlockStaffModal('${eng.id || eng.name}')" title="Unlock Password" class="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition flex items-center gap-0.5 cursor-pointer">
                              <span>🔑 Unlock</span>
                            </button>
                          ` : ''}
                          <button onclick="SettingsView.openEditStaffModal('${eng.id || eng.name}')" title="Edit Staff Name &amp; ID (Requires Master Admin)" class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-0.5 cursor-pointer">
                            <span>✏️ Edit</span>
                          </button>
                          <button onclick="SettingsView.deleteStaff('${eng.id || eng.name}')" title="Delete Staff (Requires Master Admin)" class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-xs font-bold transition flex items-center justify-center cursor-pointer">
                            <span>🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Department Supervisors & Section Leads Management Card -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 text-lg font-bold shadow-2xs">
                👔
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                  Department Supervisors &amp; Section Leads
                  <span class="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-mono font-bold border border-purple-200">Approvers Registry</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Supervisors assigned for task approvals and monthly report sections. Default leads are Kamrul (44819) and Sazzad (50463). Add/delete requires Master ID: 50463.</p>
              </div>
            </div>
            <button onclick="SettingsView.openAddSupervisorModal()" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer">
              <span>➕ Add New Supervisor</span>
            </button>
          </div>

          <!-- Supervisors Table -->
          <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase border-b border-slate-200">
                <tr>
                  <th class="py-3 px-3 w-10 text-center">#</th>
                  <th class="py-3 px-3">Supervisor Name</th>
                  <th class="py-3 px-3 w-28">Employee ID</th>
                  <th class="py-3 px-4">Designation / Title</th>
                  <th class="py-3 px-4">Official Email</th>
                  <th class="py-3 px-3 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-700">
                ${(typeof MasterDataManager !== 'undefined' ? MasterDataManager.getSupervisors() : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.SUPERVISORS : []))
                  .map((sup, idx) => `
                  <tr class="hover:bg-purple-50/20 transition">
                    <td class="py-3 px-3 text-center font-mono text-slate-400 font-bold">${idx + 1}</td>
                    <td class="py-3 px-3 font-bold text-slate-900">
                      ${HELPERS.escapeHtml(sup.fullName || sup.name)}
                      <span class="text-[10px] text-slate-500 font-mono font-normal block">${HELPERS.escapeHtml(sup.display || sup.name)}</span>
                    </td>
                    <td class="py-3 px-3 font-mono font-bold text-purple-700">${sup.id || '—'}</td>
                    <td class="py-3 px-4 text-slate-700 font-medium">${HELPERS.escapeHtml(sup.title || 'Supervisor')}</td>
                    <td class="py-3 px-4 text-slate-500 font-mono text-[11px]">${HELPERS.escapeHtml(sup.email || '—')}</td>
                    <td class="py-3 px-3 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <button onclick="SettingsView.openEditSupervisorModal('${sup.id || sup.name}')" title="Edit Supervisor (Requires Master Admin)" class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-0.5 cursor-pointer">
                          <span>✏️</span> <span>Edit</span>
                        </button>
                        <button onclick="SettingsView.deleteSupervisor('${sup.id || sup.name}')" title="Delete Supervisor (Requires Master Admin)" class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-xs font-bold transition flex items-center justify-center cursor-pointer">
                          <span>🗑️</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Google Firebase Realtime Database Card (Sub-50ms Collaborative Highway) -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 text-lg font-bold shadow-2xs">
                ⚡
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                  Google Firebase Realtime Database
                  ${fbBadgeHtml}
                </h3>
                <p class="text-xs text-slate-500">Enables instant &lt;50ms collaborative sync (identical to Google Docs &amp; Excel Online) across all laptops.</p>
              </div>
            </div>
            <div>
              <button onclick="SettingsView.toggleFirebaseGuide()" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1 cursor-pointer">
                <span>📖 2-Minute Setup Guide</span>
              </button>
            </div>
          </div>

          <!-- Firebase Database URL Input -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
              Firebase Realtime Database URL
            </label>
            <div class="flex flex-col sm:flex-row items-stretch gap-3">
              <input type="text" id="settings-fb-db-url" value="${HELPERS.escapeHtml(fbDbUrl)}" 
                     placeholder="https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app" 
                     class="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-mono" />
              <div class="flex gap-2">
                <button onclick="SettingsView.saveFirebaseConfig()" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer">
                  💾 Save &amp; Connect
                </button>
                <button onclick="SettingsView.testFirebaseConnection()" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 transition-colors cursor-pointer">
                  🔗 Test
                </button>
              </div>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">
              Provides zero-latency live synchronization. When any engineer types or adds a task, it updates on all other laptops within 15–30 milliseconds.
            </p>
          </div>

          <!-- Actions -->
          <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button onclick="SettingsView.pushAllToFirebase()" class="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-2 cursor-pointer">
              <span>🚀 1-Click Push Current Tasks to Firebase</span>
            </button>
          </div>

          <!-- Collapsible Firebase Setup Guide -->
          <div id="firebase-setup-guide" class="hidden bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs text-slate-700">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-slate-900 text-sm">⚡ 2-Minute Google Firebase Free Setup Guide</h4>
            </div>
            <ol class="list-decimal list-inside space-y-2 text-slate-600 leading-relaxed">
              <li>Go to <a href="https://console.firebase.google.com" target="_blank" class="text-indigo-600 underline font-bold">console.firebase.google.com</a> with your Google Account.</li>
              <li>Click <strong>"Add project"</strong>, enter project name (e.g. <span class="text-indigo-600 font-mono">walton-report</span>), and click Continue.</li>
              <li>In the left sidebar menu, click <strong>Build > Realtime Database</strong>.</li>
              <li>Click <strong>"Create Database"</strong> &bull; Choose Realtime Database Location (<span class="text-emerald-600 font-bold">Singapore / asia-southeast1</span> recommended) &bull; Click Next.</li>
              <li>In Security Rules, select <strong>"Start in test mode"</strong> &bull; Click <strong>Enable</strong>.</li>
              <li>Copy the Database URL at the top (e.g. <span class="text-indigo-600 font-mono">https://walton-report-default-rtdb.asia-southeast1.firebasedatabase.app</span>), paste it above into <strong>Firebase Realtime Database URL</strong>, and click <strong>"Save &amp; Connect"</strong>!</li>
            </ol>
          </div>
        </div>

        <!-- AI Engine & OpenRouter Free API Integration Card -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 text-lg font-bold shadow-2xs">
                🤖
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                  AI Intelligence &amp; OpenRouter Free API Integration
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    100% Free Models Available
                  </span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Powers technical milestone generation, executive impact synthesis, and management report rewriting.</p>
              </div>
            </div>
          </div>

          <!-- Provider Selector Radio Pills -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-2">Active AI Provider</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label onclick="SettingsView.setAIProvider('openrouter')" class="cursor-pointer border ${aiProvider === 'openrouter' ? 'border-purple-500 bg-purple-50/50' : 'border-slate-200 bg-slate-50/60'} rounded-2xl p-3 flex items-start gap-2.5 transition hover:border-purple-400">
                <input type="radio" name="ai_provider" value="openrouter" ${aiProvider === 'openrouter' ? 'checked' : ''} class="mt-0.5 text-purple-600 focus:ring-0" />
                <div>
                  <div class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>OpenRouter API</span>
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">FREE</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5">Gemini 2.0 Flash Free, Llama 3.3, DeepSeek, Qwen</p>
                </div>
              </label>

              <label onclick="SettingsView.setAIProvider('gemini')" class="cursor-pointer border ${aiProvider === 'gemini' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/60'} rounded-2xl p-3 flex items-start gap-2.5 transition hover:border-blue-400">
                <input type="radio" name="ai_provider" value="gemini" ${aiProvider === 'gemini' ? 'checked' : ''} class="mt-0.5 text-blue-600 focus:ring-0" />
                <div>
                  <div class="text-xs font-bold text-slate-900">Google Gemini Direct</div>
                  <p class="text-[11px] text-slate-500 mt-0.5">Direct Google AI Studio API key</p>
                </div>
              </label>

              <label onclick="SettingsView.setAIProvider('offline')" class="cursor-pointer border ${aiProvider === 'offline' ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-slate-50/60'} rounded-2xl p-3 flex items-start gap-2.5 transition hover:border-slate-300">
                <input type="radio" name="ai_provider" value="offline" ${aiProvider === 'offline' ? 'checked' : ''} class="mt-0.5 text-slate-600 focus:ring-0" />
                <div>
                  <div class="text-xs font-bold text-slate-900">Local Rule Engine</div>
                  <p class="text-[11px] text-slate-500 mt-0.5">Deterministic 100% offline rule templates</p>
                </div>
              </label>
            </div>
          </div>

          <!-- OpenRouter Configuration Panel -->
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🌐</span> OpenRouter Configuration &amp; Free Models
              </span>
              <a href="https://openrouter.ai/keys" target="_blank" class="text-[11px] text-purple-700 hover:text-purple-900 underline inline-flex items-center gap-1 font-bold">
                <span>Get Free Key on openrouter.ai</span> <span>↗</span>
              </a>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 mb-1">OpenRouter API Key</label>
                <div class="flex items-center gap-2">
                  <input type="password" id="settings-openrouter-key" value="${HELPERS.escapeHtml(openRouterKey)}" placeholder="sk-or-v1-..."
                         class="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500 font-mono" />
                  <button onclick="SettingsView.saveOpenRouterKey()" class="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-sm cursor-pointer">
                    Save Key
                  </button>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-[11px] font-semibold text-slate-600">Select Free AI Model</label>
                  <button type="button" onclick="SettingsView.loadOpenRouterModels()" class="text-[10px] text-purple-700 hover:text-purple-900 underline inline-flex items-center gap-1 cursor-pointer font-bold">
                    <span>🔄 Fetch Live Models</span>
                  </button>
                </div>
                <select id="settings-openrouter-model" onchange="SettingsView.saveOpenRouterModel(this.value)"
                        class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-purple-500">
                  <optgroup label="🆓 Recommended Free Models (Zero API Cost)">
                    <option value="openrouter/free" ${openRouterModel === 'openrouter/free' ? 'selected' : ''}>openrouter/free (Auto Free Models Router - 100% Free - Recommended)</option>
                    <option value="openrouter/auto" ${openRouterModel === 'openrouter/auto' ? 'selected' : ''}>openrouter/auto (Auto Router)</option>
                    <option value="google/gemini-2.0-flash-exp:free" ${openRouterModel === 'google/gemini-2.0-flash-exp:free' ? 'selected' : ''}>google/gemini-2.0-flash-exp:free (Fast &amp; Accurate)</option>
                    <option value="deepseek/deepseek-r1:free" ${openRouterModel === 'deepseek/deepseek-r1:free' ? 'selected' : ''}>deepseek/deepseek-r1:free (Reasoning &amp; Logic)</option>
                    <option value="meta-llama/llama-3.3-70b-instruct:free" ${openRouterModel === 'meta-llama/llama-3.3-70b-instruct:free' ? 'selected' : ''}>meta-llama/llama-3.3-70b-instruct:free (High Capability)</option>
                    <option value="qwen/qwen-2.5-coder-32b-instruct:free" ${openRouterModel === 'qwen/qwen-2.5-coder-32b-instruct:free' ? 'selected' : ''}>qwen/qwen-2.5-coder-32b-instruct:free (Technical)</option>
                    <option value="mistralai/mistral-small-24b-instruct-2501:free" ${openRouterModel === 'mistralai/mistral-small-24b-instruct-2501:free' ? 'selected' : ''}>mistralai/mistral-small-24b-instruct-2501:free</option>
                    <option value="deepseek/deepseek-chat:free" ${openRouterModel === 'deepseek/deepseek-chat:free' ? 'selected' : ''}>deepseek/deepseek-chat:free</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <div class="flex items-center gap-2">
                <button onclick="SettingsView.testAIConnection()" id="btn-test-ai" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                  <span>⚡</span> <span>Test AI Connection</span>
                </button>
                <div id="ai-test-result" class="text-xs"></div>
              </div>
              <span class="text-[11px] text-slate-400">Zero API cost with OpenRouter Free models</span>
            </div>
          </div>

          <!-- Gemini Direct Key (Optional / Alternative) -->
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-slate-700">Google Gemini Direct API Key (Optional Alternative)</label>
              <span class="text-[11px] text-slate-400">Google AI Studio Direct Endpoint</span>
            </div>
            <div class="flex items-center gap-3">
              <input type="password" id="settings-gemini-key" value="${HELPERS.escapeHtml(currentGeminiKey)}" placeholder="AIzaSy..." 
                     class="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono" />
              <button onclick="SettingsView.saveGeminiKey()" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm cursor-pointer">
                Save Key
              </button>
            </div>
          </div>
        </div>

        <!-- Online Docs Access & Permissions Card -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-xl font-bold shadow-2xs">
                🔗
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Online Docs Presentation Permissions</h3>
                <p class="text-xs text-slate-500">Configure online presentation owner and authorized email addresses.</p>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Owner: nipu.ruet10@gmail.com
            </span>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Google Slides Presentation URL (Format: https://docs.google.com/presentation/u/0/)</label>
              <input type="text" id="settings-google-slides-url" value="${HELPERS.escapeHtml(googleSlidesUrl)}" 
                     placeholder="https://docs.google.com/presentation/u/0/" 
                     class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500" />
              <p class="text-[11px] text-slate-400 mt-1">Direct link opened when clicking "Online Presentation". Defaults to <span class="text-indigo-600 font-mono">https://docs.google.com/presentation/u/0/</span>.</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Authorized Team Emails (Comma or Newline Separated)</label>
              <textarea id="settings-online-docs-emails" rows="3" placeholder="user1@waltonbd.com, user2@waltonbd.com" 
                        class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500">${HELPERS.escapeHtml(onlineDocsEmails)}</textarea>
              <p class="text-[11px] text-slate-400 mt-1">Only the owner (<strong class="text-indigo-600 font-mono">nipu.ruet10@gmail.com</strong>) and authorized emails listed above will be granted access to open the live presentation link.</p>
            </div>
            <button onclick="SettingsView.saveOnlineDocsPermissions()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm cursor-pointer">
              Save Presentation Link &amp; Permissions
            </button>
          </div>
        </div>

        <!-- Task Sequencing Mode Configuration Card -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center text-xl font-bold shadow-2xs">
                🗂️
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Task Sequencing Mode (Slide Presentation Order)</h3>
                <p class="text-xs text-slate-500">Controls whether tasks are ordered by Category first (with Engineer serial) or grouped by Engineer directly.</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label onclick="SettingsView.setTaskSequenceMode('category')" class="cursor-pointer border ${taskSequenceMode === 'category' ? 'border-purple-500 bg-purple-50/50' : 'border-slate-200 bg-slate-50/60'} rounded-2xl p-3.5 flex items-start gap-3 transition hover:border-purple-400">
              <input type="radio" name="task_sequence_mode" value="category" ${taskSequenceMode === 'category' ? 'checked' : ''} class="mt-1 text-purple-600 focus:ring-0" />
              <div>
                <div class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>By Category (with Engineer Serial)</span>
                  <span class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">Recommended</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Categories sequence: <em>Process &gt; Tools &gt; Parts &gt; Cost &gt; Manpower &gt; BOM &gt; Projects</em>.<br/>
                  Within each category, tasks are strictly ordered by Engineer: <strong>Sazzad &gt; Rafi &gt; Faiyaz &gt; Abdullah &gt; Emon &gt; Pear &gt; Hashmi &gt; Anam</strong>.
                </p>
              </div>
            </label>

            <label onclick="SettingsView.setTaskSequenceMode('engineer')" class="cursor-pointer border ${taskSequenceMode === 'engineer' ? 'border-purple-500 bg-purple-50/50' : 'border-slate-200 bg-slate-50/60'} rounded-2xl p-3.5 flex items-start gap-3 transition hover:border-purple-400">
              <input type="radio" name="task_sequence_mode" value="engineer" ${taskSequenceMode === 'engineer' ? 'checked' : ''} class="mt-1 text-purple-600 focus:ring-0" />
              <div>
                <div class="text-xs font-bold text-slate-900">By Engineer Only</div>
                <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  All tasks for an engineer appear consecutively before proceeding to the next engineer in sequence.
                </p>
              </div>
            </label>
          </div>
        </div>

        <!-- Engineer Presentation Sequence Configuration Card (Monthly Report & Management Report) -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center text-xl font-bold shadow-2xs">
                🔀
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Engineer Presentation Sequence &amp; Rotation</h3>
                <p class="text-xs text-slate-500">Controls order of task slides starting from Slide 4. Rotate or reorder engineers for presentations.</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <!-- 1. Monthly Report Sequence -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-rose-700">📅 Monthly Report Sequence</span>
                <div class="flex items-center gap-2">
                  <button onclick="SettingsView.rotateEngineerSequence('monthly')" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200 transition cursor-pointer" title="Move first engineer to bottom">
                    🔄 Rotate
                  </button>
                  <button onclick="SettingsView.resetEngineerSequence('monthly')" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[10px] text-slate-500 hover:text-slate-700 border border-slate-200 transition cursor-pointer">
                    Reset
                  </button>
                </div>
              </div>
              <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                ${monthlySeq.map((eng, idx) => `
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                    <span class="font-mono text-slate-400 font-bold mr-2">${idx + 1}.</span>
                    <span class="font-bold text-slate-800 flex-1 truncate">${HELPERS.escapeHtml(eng)}</span>
                    <div class="flex items-center gap-1">
                      <button onclick="SettingsView.moveEngineer('monthly', ${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-20 cursor-not-allowed"' : 'class="hover:text-rose-600 px-1 font-bold text-slate-500 cursor-pointer"'}>▲</button>
                      <button onclick="SettingsView.moveEngineer('monthly', ${idx}, 1)" ${idx === monthlySeq.length - 1 ? 'disabled class="opacity-20 cursor-not-allowed"' : 'class="hover:text-rose-600 px-1 font-bold text-slate-500 cursor-pointer"'}>▼</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- 2. Management Report Sequence -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-indigo-700">👔 Management Report Sequence</span>
                <div class="flex items-center gap-2">
                  <button onclick="SettingsView.rotateEngineerSequence('mgmt')" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200 transition cursor-pointer" title="Move first engineer to bottom">
                    🔄 Rotate
                  </button>
                  <button onclick="SettingsView.resetEngineerSequence('mgmt')" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[10px] text-slate-500 hover:text-slate-700 border border-slate-200 transition cursor-pointer">
                    Reset
                  </button>
                </div>
              </div>
              <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                ${mgmtSeq.map((eng, idx) => `
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                    <span class="font-mono text-slate-400 font-bold mr-2">${idx + 1}.</span>
                    <span class="font-bold text-slate-800 flex-1 truncate">${HELPERS.escapeHtml(eng)}</span>
                    <div class="flex items-center gap-1">
                      <button onclick="SettingsView.moveEngineer('mgmt', ${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-20 cursor-not-allowed"' : 'class="hover:text-indigo-600 px-1 font-bold text-slate-500 cursor-pointer"'}>▲</button>
                      <button onclick="SettingsView.moveEngineer('mgmt', ${idx}, 1)" ${idx === mgmtSeq.length - 1 ? 'disabled class="opacity-20 cursor-not-allowed"' : 'class="hover:text-indigo-600 px-1 font-bold text-slate-500 cursor-pointer"'}>▼</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Storage & Cache Controls -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 class="text-sm font-bold text-slate-900">Cache &amp; Local Persistence</h3>
          <p class="text-xs text-slate-500">Clear cached AI breakdowns or reload original seed data.</p>
          <div class="flex flex-wrap gap-3">
            <button onclick="SettingsView.clearAllHistoryAndCache()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white shadow-xs transition cursor-pointer flex items-center gap-1.5">
              <span>⚡</span> <span>Clear History &amp; Cache (Maximize Speed)</span>
            </button>
            <button onclick="SettingsView.clearAICache()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 cursor-pointer">
              🧹 Clear AI Response Cache
            </button>
            <button onclick="SettingsView.resetWorkbooks()" class="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 border border-rose-200 cursor-pointer">
              🔄 Reset Month Workbooks to Defaults
            </button>
          </div>
        </div>
      </div>
    `;
  },

  toggleFirebaseGuide() {
    const guide = document.getElementById('firebase-setup-guide');
    if (guide) {
      guide.classList.toggle('hidden');
    }
  },

  async saveFirebaseConfig() {
    const urlInput = document.getElementById('settings-fb-db-url');
    const rawUrl = urlInput ? urlInput.value.trim() : '';
    if (!rawUrl) {
      if (confirm("Disable Firebase Realtime Engine?")) {
        if (typeof FirebaseSyncService !== 'undefined') {
          FirebaseSyncService.saveConfig(null);
        }
        alert("Firebase Realtime Engine disabled.");
        this.render();
      }
      return;
    }

    const config = { databaseURL: rawUrl };
    if (typeof FirebaseSyncService !== 'undefined') {
      FirebaseSyncService.saveConfig(config);
    }
    alert("🔥 Firebase Configuration Saved!\nConnecting to real-time engine...");
    this.render();
  },

  async testFirebaseConnection() {
    const urlInput = document.getElementById('settings-fb-db-url');
    const rawUrl = urlInput ? urlInput.value.trim() : '';
    if (!rawUrl) {
      alert("Please enter a Firebase Realtime Database URL first.");
      return;
    }

    try {
      if (typeof FirebaseSyncService !== 'undefined') {
        await FirebaseSyncService.testConnection({ databaseURL: rawUrl });
        alert("✅ Success! Connected to Firebase Realtime Database!\nSub-50ms instant sync is ready.");
        this.render();
      }
    } catch (e) {
      alert("❌ Connection Test Notice:\n" + e.message + "\n\nPlease ensure you clicked 'Start in test mode' in Firebase Realtime Database Rules.");
    }
  },

  async pushAllToFirebase() {
    if (typeof FirebaseSyncService === 'undefined' || !FirebaseSyncService.isConnected()) {
      alert("Please save and connect Firebase Realtime Database first.");
      return;
    }

    try {
      const activeM = (window.appState && window.appState.workbookMgr) ? window.appState.workbookMgr.activeMonth : 'SEP-2026';
      const count = await FirebaseSyncService.pushEntireMonth(activeM);
      alert(`🚀 Successfully pushed ${count} tasks for ${activeM} to Firebase Realtime Database!\nAll connected computers are now instantly synchronized.`);
    } catch (e) {
      alert("Firebase push notice: " + e.message);
    }
  },



  setAIProvider(provider) {
    if (typeof geminiClient !== 'undefined') {
      geminiClient.setProvider(provider);
    } else {
      HELPERS.storage.set("walton_pd_ai_provider", provider);
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`AI Provider set to: ${provider.toUpperCase()}`, "info");
    }
    this.render();
  },

  saveOpenRouterKey() {
    const key = (document.getElementById('settings-openrouter-key') ? document.getElementById('settings-openrouter-key').value : '').trim();
    if (typeof geminiClient !== 'undefined') {
      geminiClient.setOpenRouterKey(key);
    } else {
      HELPERS.storage.set("walton_pd_openrouter_api_key", key);
    }
    if (typeof window.showToast === 'function') {
      window.showToast(key ? "✅ OpenRouter API Key saved!" : "OpenRouter API Key removed.", "success");
    } else {
      alert(key ? "OpenRouter API Key saved!" : "OpenRouter API Key removed.");
    }
  },

  saveOpenRouterModel(model) {
    if (typeof geminiClient !== 'undefined') {
      geminiClient.setOpenRouterModel(model);
    } else {
      HELPERS.storage.set("walton_pd_openrouter_model", model);
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`Active AI Model: ${model}`, "info");
    }
  },

  async testAIConnection() {
    const btn = document.getElementById('btn-test-ai');
    const resDiv = document.getElementById('ai-test-result');
    if (btn) btn.disabled = true;
    if (resDiv) resDiv.innerHTML = '<span class="text-amber-400 font-mono animate-pulse">⚡ Connecting and validating OpenRouter API...</span>';

    const key = (document.getElementById('settings-openrouter-key') ? document.getElementById('settings-openrouter-key').value : '').trim();
    const model = (document.getElementById('settings-openrouter-model') ? document.getElementById('settings-openrouter-model').value : '').trim();

    if (!key) {
      if (resDiv) {
        resDiv.innerHTML = `
          <div class="p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-xs mt-2 text-rose-300">
            <strong>Invalid API Key:</strong> Please enter your OpenRouter key or configure OPENROUTER_API_KEY on the server.
          </div>`;
      }
      if (btn) btn.disabled = false;
      return;
    }

    if (typeof geminiClient !== 'undefined') {
      geminiClient.setOpenRouterKey(key);
      if (model) geminiClient.setOpenRouterModel(model);
      const res = await geminiClient.testOpenRouterConnection(key, model);
      if (res.success) {
        const testInfo = {
          success: true,
          provider: "OpenRouter",
          status: "Connected",
          model: res.model || model,
          latency: res.latency,
          dateStr: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
        };
        try { localStorage.setItem('walton_openrouter_test_info', JSON.stringify(testInfo)); } catch(_) {}

        if (resDiv) {
          resDiv.innerHTML = `
            <div class="p-3.5 bg-emerald-950/70 border border-emerald-500/50 rounded-xl space-y-1 text-xs mt-2 w-full">
              <div class="flex items-center justify-between text-emerald-400 font-bold text-sm">
                <span class="flex items-center gap-1.5"><span>✓</span> <span>OpenRouter Connected</span></span>
                <span class="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">Verified</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-300 font-mono mt-1.5">
                <div>Provider: <strong class="text-white">OpenRouter</strong></div>
                <div>Status: <span class="text-emerald-400 font-bold">Connected</span></div>
                <div>Model: <strong class="text-indigo-300">${HELPERS.escapeHtml(res.model || model)}</strong></div>
                <div>Last Tested: <span class="text-slate-400">${testInfo.dateStr}</span> (${res.latency}ms)</div>
              </div>
            </div>`;
        }
        if (typeof window.showToast === 'function') {
          window.showToast("✓ OpenRouter Connected successfully!", "success");
        }
      } else {
        try { localStorage.removeItem('walton_openrouter_test_info'); } catch(_) {}
        if (resDiv) {
          resDiv.innerHTML = `
            <div class="p-3.5 bg-rose-950/70 border border-rose-500/50 rounded-xl space-y-1.5 text-xs mt-2 w-full">
              <div class="flex items-center justify-between text-rose-400 font-bold text-sm">
                <span class="flex items-center gap-1.5"><span>❌</span> <span>OpenRouter Connection Failed</span></span>
                <span class="text-[10px] font-mono text-rose-300">HTTP ${res.code || 'Error'}</span>
              </div>
              <div class="text-[11px] text-rose-200 font-semibold leading-relaxed">
                ${HELPERS.escapeHtml(res.error || 'Connection failed')}
              </div>
              ${res.details ? `<div class="text-[10px] text-slate-400 font-mono mt-1 bg-slate-900/80 p-2 rounded border border-slate-800">${HELPERS.escapeHtml(res.details)}</div>` : ''}
            </div>`;
        }
      }
    } else {
      if (resDiv) resDiv.innerHTML = '<span class="text-emerald-400 font-bold">Key saved locally</span>';
    }
    if (btn) btn.disabled = false;
  },

  saveGeminiKey() {
    const key = document.getElementById('settings-gemini-key').value.trim();
    HELPERS.storage.set(APP_CONFIG.AI.STORAGE_KEY_API_KEY, key);
    alert(key ? "Gemini API Key saved successfully!" : "Gemini API Key removed. Local rule fallback active.");
  },

  clearAICache() {
    AICacheManager.clear();
    alert("AI Cache cleared successfully.");
  },

  clearAllHistoryAndCache() {
    const confirmed = (typeof window !== 'undefined' && typeof window.confirm === 'function')
      ? window.confirm("Clear all report history, audit logs, AI breakdown caches, and temporary slide caches? Your active tasks in Firebase and local storage will remain 100% safe.")
      : true;
    if (!confirmed) return;

    try {
      const preserveKeys = new Set([
        'walton_pd_monthly_workbooks_v2',
        'walton_deleted_task_ids',
        'walton_pd_master_engineers_v2',
        'walton_pd_master_supervisors_v2',
        'walton_pd_master_categories_v1',
        'walton_firebase_db_url',
        'walton_pd_admin_password_hash',
        'walton_active_engineer_profile',
        'walton_hod_point_unlocked_until'
      ]);

      const allKeys = Object.keys(localStorage);
      let cleared = 0;
      allKeys.forEach(k => {
        if (!preserveKeys.has(k) && (
          k.includes('cache') ||
          k.includes('history') ||
          k.includes('audit') ||
          k.includes('active_slides') ||
          k.includes('breakdown') ||
          k.includes('queue') ||
          k.includes('synced_records')
        )) {
          localStorage.removeItem(k);
          cleared++;
        }
      });

      if (window.appState && window.appState.breakdownSheet) {
        window.appState.breakdownSheet.breakdowns = {};
      }

      if (typeof AICacheManager !== 'undefined' && AICacheManager.clear) {
        AICacheManager.clear();
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`🚀 Cleared ${cleared} cache & history items! System is running at max speed.`, 'success');
      } else {
        alert(`Cleared ${cleared} cache & history items! System is running at max speed.`);
      }

      this.render();
    } catch (e) {
      console.error("Clear cache notice:", e);
    }
  },

    resetWorkbooks() {
    if (confirm("Reset all monthly workbooks back to original seed data? This will overwrite local edits.")) {
      localStorage.removeItem("walton_pd_month_workbooks_v1");
      localStorage.removeItem("walton_pd_month_workbooks_v2");
      localStorage.removeItem("walton_pd_ai_breakdown_v1");
      if (window.appState && window.appState.workbookMgr) {
        window.appState.workbookMgr.init();
      }
      alert("Workbooks reset. Reloading view.");
      window.location.reload();
    }
  },

  handleLock() {
    if (typeof authManager !== 'undefined') {
      authManager.lockInput();
      if (typeof window.showToast === 'function') {
        window.showToast("🔒 Input section has been locked.", "info");
      } else {
        alert("🔒 Input section has been locked.");
      }
      this.render();
      if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
        // Keep monthly input updated as well
        MonthlyInputView.render();
      }
    }
  },

  async handleUnlock() {
    const passInput = document.getElementById('settings-admin-pass');
    const pass = passInput ? passInput.value.trim() : '';
    if (!pass) {
      alert("Please enter password to unlock.");
      return;
    }
    if (typeof authManager !== 'undefined') {
      const res = await authManager.unlockInput('admin', pass);
      if (res && res.success) {
        if (typeof window.showToast === 'function') {
          window.showToast("🔓 Admin access unlocked successfully!", "success");
        } else {
          alert("🔓 Admin access unlocked successfully!");
        }
        this.render();
        if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
          MonthlyInputView.render();
        }
      } else {
        alert((res && res.error) || "Incorrect password.");
      }
    }
  },

  openChangePasswordModal() {
    if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.openChangePasswordModal) {
      MonthlyInputView.openChangePasswordModal();
    } else {
      alert("Password change modal unavailable.");
    }
  },

  DEFAULT_ENGINEER_SEQUENCE: ['Sazzad', 'Rafi', 'Faiyaz', 'Abdullah', 'Emon', 'Pear', 'Hashmi', 'Anam'],

  getMonthlyEngineerSequence() {
    try {
      const saved = localStorage.getItem('walton_monthly_engineer_seq');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [...this.DEFAULT_ENGINEER_SEQUENCE];
  },

  saveMonthlyEngineerSequence(seq) {
    localStorage.setItem('walton_monthly_engineer_seq', JSON.stringify(seq));
  },

  getMgmtEngineerSequence() {
    try {
      const saved = localStorage.getItem('walton_mgmt_engineer_seq');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [...this.DEFAULT_ENGINEER_SEQUENCE];
  },

  saveMgmtEngineerSequence(seq) {
    localStorage.setItem('walton_mgmt_engineer_seq', JSON.stringify(seq));
  },

  moveEngineer(type, index, direction) {
    const isMonthly = (type === 'monthly');
    const seq = isMonthly ? this.getMonthlyEngineerSequence() : this.getMgmtEngineerSequence();
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= seq.length) return;
    const temp = seq[index];
    seq[index] = seq[newIdx];
    seq[newIdx] = temp;
    if (isMonthly) {
      this.saveMonthlyEngineerSequence(seq);
    } else {
      this.saveMgmtEngineerSequence(seq);
    }
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast(`Updated ${isMonthly ? 'Monthly' : 'Management'} sequence order!`, 'success');
    }
  },

  rotateEngineerSequence(type) {
    const isMonthly = (type === 'monthly');
    const seq = isMonthly ? this.getMonthlyEngineerSequence() : this.getMgmtEngineerSequence();
    if (seq.length > 1) {
      const first = seq.shift();
      seq.push(first);
      if (isMonthly) {
        this.saveMonthlyEngineerSequence(seq);
      } else {
        this.saveMgmtEngineerSequence(seq);
      }
      this.render();
      if (typeof window.showToast === 'function') {
        window.showToast(`Rotated ${isMonthly ? 'Monthly' : 'Management'} presentation sequence!`, 'info');
      }
    }
  },

  resetEngineerSequence(type) {
    const isMonthly = (type === 'monthly');
    if (isMonthly) {
      this.saveMonthlyEngineerSequence(this.DEFAULT_ENGINEER_SEQUENCE);
    } else {
      this.saveMgmtEngineerSequence(this.DEFAULT_ENGINEER_SEQUENCE);
    }
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast(`Reset ${isMonthly ? 'Monthly' : 'Management'} sequence to default!`, 'info');
    }
  },

  getTaskSequenceMode() {
    return localStorage.getItem('walton_task_sequence_mode') || 'category';
  },

  setTaskSequenceMode(mode) {
    localStorage.setItem('walton_task_sequence_mode', mode || 'category');
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast(`Task sequencing mode set to: ${mode === 'category' ? 'By Category (with Engineer Serial)' : 'By Engineer'}`, 'success');
    }
  },

  saveOnlineDocsPermissions() {
    const textarea = document.getElementById('settings-online-docs-emails');
    const val = textarea ? textarea.value.trim() : '';
    localStorage.setItem('walton_online_docs_emails', val);

    const urlInput = document.getElementById('settings-google-slides-url');
    const googleUrl = urlInput ? urlInput.value.trim() : '';
    if (googleUrl) {
      localStorage.setItem('walton_google_slides_url', googleUrl);
    }

    if (typeof window.showToast === 'function') {
      window.showToast("✅ Online Presentation link & permissions saved!", "success");
    } else {
      alert("Online Presentation link & permissions saved!");
    }
  },

  async loadOpenRouterModels() {
    const select = document.getElementById('settings-openrouter-model');
    if (!select) return;
    const originalText = select.innerHTML;
    select.innerHTML = '<option>Loading live models from OpenRouter...</option>';

    if (typeof geminiClient !== 'undefined' && geminiClient.fetchOpenRouterModels) {
      const { freeModels, otherModels } = await geminiClient.fetchOpenRouterModels();
      const currentModel = geminiClient.getOpenRouterModel();
      
      let html = `<optgroup label="🆓 Recommended Free Models (Zero API Cost)">`;
      freeModels.forEach(m => {
        html += `<option value="${m.id}" ${currentModel === m.id ? 'selected' : ''}>${m.name}</option>`;
      });
      html += `</optgroup>`;

      if (otherModels && otherModels.length > 0) {
        html += `<optgroup label="✨ All OpenRouter Models (${otherModels.length})">`;
        otherModels.slice(0, 60).forEach(m => {
          html += `<option value="${m.id}" ${currentModel === m.id ? 'selected' : ''}>${m.name}</option>`;
        });
        html += `</optgroup>`;
      }

      select.innerHTML = html;
      if (typeof window.showToast === 'function') {
        window.showToast(`Loaded ${freeModels.length} free models from OpenRouter!`, 'success');
      }
    } else {
      select.innerHTML = originalText;
    }
  },

  /**
   * Save / Modify TMS Password for an Engineer (Requirement 1)
   * Updates local registry and pushes immediately to Firebase RTDB for sub-50ms sync across all PCs
   */
  saveTmsPassword(idOrName) {
    const input = document.getElementById(`tms-pass-input-${idOrName}`);
    if (!input) return;
    const newPass = input.value.trim();
    if (!newPass) {
      alert("Password cannot be empty.");
      return;
    }
    if (typeof MasterDataManager !== 'undefined' && MasterDataManager.updateTmsPassword) {
      MasterDataManager.updateTmsPassword(idOrName, newPass);
    } else if (typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) {
      const eng = MASTER_LISTS.ENGINEERS.find(e => String(e.id) === String(idOrName) || e.name === idOrName);
      if (eng) eng.tms_password = newPass;
      localStorage.setItem("walton_pd_master_engineers_v2", JSON.stringify(MASTER_LISTS.ENGINEERS));
    }

    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.pushMasterEngineers(MASTER_LISTS.ENGINEERS);
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`✅ Saved & Synchronized TMS Password for ${idOrName} across all laptops!`, "success");
    } else {
      alert(`✅ Saved & Synchronized TMS Password for ${idOrName} across all laptops!`);
    }
    this.render();
  },

  lockStaff(idOrName) {
    if (this._unlockedStaffIds) {
      this._unlockedStaffIds.delete(String(idOrName));
    }
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast(`🔒 Re-locked TMS credentials for ${idOrName}`, "info");
    }
  },

  lockAllStaff() {
    this._masterAdminUnlocked = false;
    if (this._unlockedStaffIds) {
      this._unlockedStaffIds.clear();
    }
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast("🔒 All engineer TMS credentials have been re-locked.", "info");
    }
  },

  // -------------------------------------------------------------
  // TMS PASSWORD PRIVACY: Individual Unlock & Master Admin Modal
  // -------------------------------------------------------------
  openUnlockStaffModal(staffId) {
    const list = (typeof MasterDataManager !== 'undefined' ? MasterDataManager.getEngineers() : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.ENGINEERS : []));
    const eng = list.find(e => String(e.id) === String(staffId) || e.name === staffId) || { id: staffId, name: staffId };

    let container = document.getElementById('unlock-staff-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'unlock-staff-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">🔐</span>
              <div>
                <h3 class="text-base font-black text-slate-900">Unlock TMS Password Access</h3>
                <p class="text-xs text-slate-500">Staff Privacy Protection &bull; Enter credentials for ${HELPERS.escapeHtml(eng.fullName || eng.name)}</p>
              </div>
            </div>
            <button onclick="SettingsView.closeUnlockStaffModal()" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
          </div>

          <div class="space-y-3.5 my-4">
            <div class="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
              <p class="font-bold flex items-center gap-1.5"><span>🛡️</span> <span>Privacy &amp; Security Protocol:</span></p>
              <p class="text-[11px] text-blue-800 leading-relaxed">
                Enter the unique security password assigned to <strong>${HELPERS.escapeHtml(eng.fullName || eng.name)}</strong> or Master Admin credentials to view and manage TMS credentials.
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Employee ID:</label>
              <input type="text" id="unlock-staff-id" value="${HELPERS.escapeHtml(String(eng.id || ''))}" 
                     class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Unique Security Password / PIN:</label>
              <input type="password" id="unlock-staff-password" placeholder="Enter your Unique Password or Master Password..." 
                     class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500" />
            </div>

            <div id="unlock-staff-error" class="hidden p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold"></div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onclick="SettingsView.closeUnlockStaffModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Cancel
            </button>
            <button onclick="SettingsView.confirmUnlockStaff('${HELPERS.escapeHtml(String(eng.id || staffId))}')" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <span>🔓</span> <span>Unlock Credentials</span>
            </button>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const passIn = document.getElementById('unlock-staff-password');
      if (passIn) passIn.focus();
    }, 100);
  },

  closeUnlockStaffModal() {
    const container = document.getElementById('unlock-staff-modal-container');
    if (container) container.innerHTML = '';
  },

  confirmUnlockStaff(staffId) {
    const idEl = document.getElementById('unlock-staff-id');
    const passEl = document.getElementById('unlock-staff-password');
    const errEl = document.getElementById('unlock-staff-error');

    const inputId = idEl ? idEl.value.trim() : '';
    const inputPass = passEl ? passEl.value.trim() : '';

    if (!inputId || !inputPass) {
      if (errEl) {
        errEl.textContent = "Please enter both Employee ID and Security Password.";
        errEl.classList.remove('hidden');
      }
      return;
    }

    // Check Master Admin credentials (ID: 50463, pass: ACprocess@2026)
    if (inputId === '50463' && inputPass === 'ACprocess@2026') {
      this._masterAdminUnlocked = true;
      this.closeUnlockStaffModal();
      this.render();
      if (typeof window.showToast === 'function') {
        window.showToast("👑 Master Admin Verified! All engineer credentials unlocked.", "success");
      }
      return;
    }

    // Check individual engineer credentials
    const list = (typeof MasterDataManager !== 'undefined' ? MasterDataManager.getEngineers() : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.ENGINEERS : []));
    const eng = list.find(e => String(e.id) === String(staffId) || e.name === staffId);

    if (eng) {
      const defaultMatch = (typeof DEFAULT_ENGINEERS !== 'undefined' ? DEFAULT_ENGINEERS.find(de => de.id === String(eng.id)) : null);
      const expectedPin = eng.access_pin || (defaultMatch ? defaultMatch.access_pin : `${eng.name.substring(0, 2).toUpperCase()}#${eng.id}`);
      const validPins = new Set([
        expectedPin,
        expectedPin.replace('#', '@'),
        expectedPin.replace('@', '#'),
        defaultMatch ? defaultMatch.access_pin : '',
        defaultMatch ? defaultMatch.access_pin.replace('#', '@') : '',
        // Backward compatibility if trailing digit was entered
        defaultMatch ? `${defaultMatch.access_pin}8` : '',
        defaultMatch ? `${defaultMatch.access_pin}3` : '',
        defaultMatch ? `${defaultMatch.access_pin}9` : '',
        defaultMatch ? `${defaultMatch.access_pin}4` : '',
        defaultMatch ? `${defaultMatch.access_pin}7` : '',
        defaultMatch ? `${defaultMatch.access_pin}2` : '',
        defaultMatch ? `${defaultMatch.access_pin}5` : '',
        defaultMatch ? `${defaultMatch.access_pin}6` : '',
        defaultMatch ? `${defaultMatch.access_pin}1` : ''
      ].filter(Boolean));

      if (inputId === String(eng.id) && validPins.has(inputPass)) {
        if (!this._unlockedStaffIds) this._unlockedStaffIds = new Set();
        this._unlockedStaffIds.add(String(eng.id));
        this.closeUnlockStaffModal();
        this.render();
        if (typeof window.showToast === 'function') {
          window.showToast(`🔓 TMS Password unlocked for ${eng.fullName || eng.name}!`, "success");
        }
        return;
      }
    }

    if (errEl) {
      errEl.textContent = "❌ Incorrect Employee ID or Security Password. Please enter your assigned unique password or contact Master Admin.";
      errEl.classList.remove('hidden');
    }
  },

  openMasterAdminUnlockModal() {
    let container = document.getElementById('master-admin-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'master-admin-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">👑</span>
              <div>
                <h3 class="text-base font-black text-slate-900">Master Admin Authorization</h3>
                <p class="text-xs text-slate-500">Unlock all staff TMS passwords and modify personnel registry</p>
              </div>
            </div>
            <button onclick="SettingsView.closeMasterAdminUnlockModal()" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
          </div>

          <div class="space-y-3.5 my-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Master Employee ID:</label>
              <input type="text" id="master-admin-id" placeholder="Enter Master Employee ID..." 
                     class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Master Admin Password:</label>
              <input type="password" id="master-admin-password" placeholder="Enter Master Password..." 
                     class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500" />
            </div>

            <div id="master-admin-error" class="hidden p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold"></div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onclick="SettingsView.closeMasterAdminUnlockModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Cancel
            </button>
            <button onclick="SettingsView.confirmMasterAdminUnlock()" class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <span>👑</span> <span>Authorize Master Admin</span>
            </button>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const passIn = document.getElementById('master-admin-password');
      if (passIn) passIn.focus();
    }, 100);
  },

  closeMasterAdminUnlockModal() {
    const container = document.getElementById('master-admin-modal-container');
    if (container) container.innerHTML = '';
  },

  confirmMasterAdminUnlock() {
    const idEl = document.getElementById('master-admin-id');
    const passEl = document.getElementById('master-admin-password');
    const errEl = document.getElementById('master-admin-error');

    const id = idEl ? idEl.value.trim() : '';
    const pass = passEl ? passEl.value.trim() : '';

    if (id === '50463' && pass === 'ACprocess@2026') {
      this._masterAdminUnlocked = true;
      this.closeMasterAdminUnlockModal();
      this.render();
      if (typeof window.showToast === 'function') {
        window.showToast("👑 Master Admin Unlocked! Full access enabled.", "success");
      }
    } else {
      if (errEl) {
        errEl.textContent = "❌ Invalid Master Credentials. Incorrect Employee ID or Password.";
        errEl.classList.remove('hidden');
      }
    }
  },

  // -------------------------------------------------------------
  // MEMBER (ENGINEER) ADD, EDIT & DELETE (Protected by 50463 / ACprocess@2026)
  // -------------------------------------------------------------
  openAddStaffModal() {
    let container = document.getElementById('add-staff-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'add-staff-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">👤</span>
              <div>
                <h3 class="text-base font-black text-slate-900">Add New Team Member / Engineer</h3>
                <p class="text-xs text-slate-500">Register employee ID, unique access PIN, and Walton TMS password</p>
              </div>
            </div>
            <button onclick="SettingsView.closeAddStaffModal()" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
          </div>

          <div class="space-y-3 my-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">First Name (e.g. Sazzad):</label>
                <input type="text" id="new-staff-name" placeholder="Name" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Employee ID (e.g. 50463):</label>
                <input type="text" id="new-staff-id" placeholder="50463" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Full Designation / Title:</label>
              <input type="text" id="new-staff-fullname" placeholder="Engr. Sazzadul Islam" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Walton TMS Login Password:</label>
                <input type="password" id="new-staff-password" placeholder="Enter TMS Password..." class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Unique Security PIN / Password:</label>
                <input type="password" id="new-staff-pin" placeholder="•••••••• (Leave blank to auto-generate)" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <!-- Master Admin Authorization Box -->
            <div class="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 mt-2">
              <span class="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>🔐</span> <span>Required: Master Admin Verification</span>
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-semibold text-amber-800 mb-0.5">Master Admin ID:</label>
                  <input type="text" id="new-staff-master-id" placeholder="Enter Master ID" class="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-amber-800 mb-0.5">Master Password:</label>
                  <input type="password" id="new-staff-master-pass" placeholder="Enter Master Password..." class="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800" />
                </div>
              </div>
            </div>

            <div id="new-staff-error" class="hidden p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold"></div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onclick="SettingsView.closeAddStaffModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Cancel
            </button>
            <button onclick="SettingsView.confirmAddStaff()" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <span>➕</span> <span>Add Member &amp; Save</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closeAddStaffModal() {
    const container = document.getElementById('add-staff-modal-container');
    if (container) container.innerHTML = '';
  },

  confirmAddStaff() {
    const nameEl = document.getElementById('new-staff-name');
    const idEl = document.getElementById('new-staff-id');
    const fullEl = document.getElementById('new-staff-fullname');
    const passEl = document.getElementById('new-staff-password');
    const pinEl = document.getElementById('new-staff-pin');
    const mIdEl = document.getElementById('new-staff-master-id');
    const mPassEl = document.getElementById('new-staff-master-pass');
    const errEl = document.getElementById('new-staff-error');

    const mId = mIdEl ? mIdEl.value.trim() : '';
    const mPass = mPassEl ? mPassEl.value.trim() : '';

    if (mId !== '50463' || mPass !== 'ACprocess@2026') {
      if (errEl) {
        errEl.textContent = "❌ Invalid Master Credentials. Incorrect Master ID or Password.";
        errEl.classList.remove('hidden');
      }
      return;
    }

    if (!nameEl || !idEl || !nameEl.value.trim() || !idEl.value.trim()) {
      if (errEl) {
        errEl.textContent = "Please enter Engineer Name and Employee ID.";
        errEl.classList.remove('hidden');
      }
      return;
    }

    const name = nameEl.value.trim();
    const id = idEl.value.trim();
    const fullName = fullEl && fullEl.value.trim() ? fullEl.value.trim() : `Engr. ${name}`;
    const pass = passEl && passEl.value.trim() ? passEl.value.trim() : "Sep@2026";
    let pin = pinEl && pinEl.value.trim() ? pinEl.value.trim() : "";
    if (!pin) {
      pin = `${name.substring(0, 2).toUpperCase()}#${id}`;
    }

    if (typeof MasterDataManager !== 'undefined' && MasterDataManager.addEngineer) {
      MasterDataManager.addEngineer({
        id: id,
        name: name,
        fullName: fullName,
        display: `${name} (${id})`,
        tms_password: pass,
        access_pin: pin
      });
    }

    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.pushMasterEngineers(MASTER_LISTS.ENGINEERS);
    }

    this.closeAddStaffModal();
    this.render();

    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Added Engr. ${name} (${id}) & synced across all PCs!`, "success");
    }
  },

  deleteStaff(idOrName) {
    this.openDeleteStaffModal(idOrName);
  },

  openDeleteStaffModal(idOrName) {
    const list = (typeof MasterDataManager !== 'undefined' ? MasterDataManager.getEngineers() : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.ENGINEERS : []));
    const target = list.find(e => String(e.id) === String(idOrName) || e.name === idOrName);
    const displayName = target ? (target.fullName || target.name) : idOrName;

    let container = document.getElementById('delete-staff-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'delete-staff-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl text-rose-600">🗑️</span>
              <div>
                <h3 class="text-base font-black text-slate-900">Remove Team Member</h3>
                <p class="text-xs text-slate-500">Requires Master Admin Authorization</p>
              </div>
            </div>
            <button onclick="SettingsView.closeDeleteStaffModal()" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
          </div>

          <div class="space-y-3.5 my-4">
            <p class="text-xs text-slate-700">
              Are you sure you want to remove <strong>${HELPERS.escapeHtml(displayName)}</strong> from the active engineer registry?
            </p>

            <div class="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
              <span class="text-xs font-bold text-amber-900">Master Admin Credentials:</span>
              <div class="grid grid-cols-2 gap-2">
                <input type="text" id="del-staff-master-id" placeholder="Master ID" class="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold" />
                <input type="password" id="del-staff-master-pass" placeholder="Master Password..." class="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold" />
              </div>
            </div>

            <div id="del-staff-error" class="hidden p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold"></div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onclick="SettingsView.closeDeleteStaffModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Cancel
            </button>
            <button onclick="SettingsView.confirmDeleteStaff('${HELPERS.escapeHtml(String(idOrName))}')" class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <span>🗑️</span> <span>Authorize &amp; Delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closeDeleteStaffModal() {
    const container = document.getElementById('delete-staff-modal-container');
    if (container) container.innerHTML = '';
  },

  confirmDeleteStaff(idOrName) {
    const mId = (document.getElementById('del-staff-master-id') ? document.getElementById('del-staff-master-id').value : '').trim();
    const mPass = (document.getElementById('del-staff-master-pass') ? document.getElementById('del-staff-master-pass').value : '').trim();
    const errEl = document.getElementById('del-staff-error');

    if (mId !== '50463' || mPass !== 'ACprocess@2026') {
      if (errEl) {
        errEl.textContent = "❌ Invalid Master Credentials. Incorrect Master ID or Password.";
        errEl.classList.remove('hidden');
      }
      return;
    }

    if (typeof MasterDataManager !== 'undefined' && MasterDataManager.deleteEngineer) {
      MasterDataManager.deleteEngineer(idOrName);
    } else if (typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) {
      MASTER_LISTS.ENGINEERS = MASTER_LISTS.ENGINEERS.filter(e => String(e.id) !== String(idOrName) && e.name !== idOrName);
      localStorage.setItem("walton_pd_master_engineers_v2", JSON.stringify(MASTER_LISTS.ENGINEERS));
    }

    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.pushMasterEngineers(MASTER_LISTS.ENGINEERS);
    }

    this.closeDeleteStaffModal();
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast(`🗑️ Removed staff member and synced to all devices!`, "info");
    }
  },

  openEditStaffModal(staffId) {
    const list = (typeof MasterDataManager !== 'undefined' ? MasterDataManager.getEngineers() : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.ENGINEERS : []));
    const eng = list.find(e => String(e.id) === String(staffId) || e.name === staffId) || { id: staffId, name: staffId, fullName: `Engr. ${staffId}`, tms_password: 'Sep@2026' };

    let container = document.getElementById('edit-staff-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'edit-staff-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">✏️</span>
              <div>
                <h3 class="text-base font-black text-slate-900">Edit Member Details &amp; TMS Credentials</h3>
                <p class="text-xs text-slate-500">Modify engineer profile, unique PIN, and login credentials</p>
              </div>
            </div>
            <button onclick="SettingsView.closeEditStaffModal()" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
          </div>

          <div class="space-y-3 my-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">First Name (e.g. Sazzad):</label>
                <input type="text" id="edit-staff-name" value="${HELPERS.escapeHtml(eng.name || '')}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Employee ID (e.g. 50463):</label>
                <input type="text" id="edit-staff-id" value="${HELPERS.escapeHtml(String(eng.id || ''))}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Full Designation / Title:</label>
              <input type="text" id="edit-staff-fullname" value="${HELPERS.escapeHtml(eng.fullName || '')}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Walton TMS Login Password:</label>
                <input type="password" id="edit-staff-password" placeholder="•••••••• (Leave blank to keep existing)" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Unique Security PIN / Password:</label>
                <input type="password" id="edit-staff-pin" placeholder="•••••••• (Leave blank to keep existing)" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <!-- Master Admin Authorization Box -->
            <div class="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 mt-2">
              <span class="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>🔐</span> <span>Required: Master Admin Verification</span>
              </span>
              <div class="grid grid-cols-2 gap-2">
                <input type="text" id="edit-staff-master-id" placeholder="Master ID" class="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold" />
                <input type="password" id="edit-staff-master-pass" placeholder="Master Password..." class="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold" />
              </div>
            </div>

            <div id="edit-staff-error" class="hidden p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold"></div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onclick="SettingsView.closeEditStaffModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Cancel
            </button>
            <button onclick="SettingsView.confirmEditStaff('${HELPERS.escapeHtml(String(eng.id || staffId))}')" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <span>💾</span> <span>Update &amp; Save</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closeEditStaffModal() {
    const container = document.getElementById('edit-staff-modal-container');
    if (container) container.innerHTML = '';
  },

  confirmEditStaff(oldId) {
    const mId = (document.getElementById('edit-staff-master-id') ? document.getElementById('edit-staff-master-id').value : '').trim();
    const mPass = (document.getElementById('edit-staff-master-pass') ? document.getElementById('edit-staff-master-pass').value : '').trim();
    const errEl = document.getElementById('edit-staff-error');

    if (mId !== '50463' || mPass !== 'ACprocess@2026') {
      if (errEl) {
        errEl.textContent = "❌ Invalid Master Credentials. Incorrect Master ID or Password.";
        errEl.classList.remove('hidden');
      }
      return;
    }

    const nameEl = document.getElementById('edit-staff-name');
    const idEl = document.getElementById('edit-staff-id');
    const fullEl = document.getElementById('edit-staff-fullname');
    const passEl = document.getElementById('edit-staff-password');
    const pinEl = document.getElementById('edit-staff-pin');

    if (!nameEl || !idEl || !nameEl.value.trim() || !idEl.value.trim()) {
      if (errEl) {
        errEl.textContent = "Please enter Engineer Name and Employee ID.";
        errEl.classList.remove('hidden');
      }
      return;
    }

    const name = nameEl.value.trim();
    const newId = idEl.value.trim();
    const fullName = fullEl && fullEl.value.trim() ? fullEl.value.trim() : `Engr. ${name}`;

    const list = (typeof MasterDataManager !== 'undefined' ? MasterDataManager.getEngineers() : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.ENGINEERS : []));
    const currentEng = list.find(e => String(e.id) === String(oldId) || e.name === oldId);

    const pass = (passEl && passEl.value.trim()) ? passEl.value.trim() : (currentEng && currentEng.tms_password ? currentEng.tms_password : "Sep@2026");
    let pin = (pinEl && pinEl.value.trim()) ? pinEl.value.trim() : (currentEng && currentEng.access_pin ? currentEng.access_pin : "");
    if (!pin) {
      pin = `${name.substring(0, 2).toUpperCase()}#${newId}`;
    }

    if (typeof MasterDataManager !== 'undefined' && MasterDataManager.updateEngineer) {
      try {
        MasterDataManager.updateEngineer(oldId, {
          id: newId,
          name: name,
          fullName: fullName,
          tms_password: pass,
          access_pin: pin
        });
      } catch (err) {
        MasterDataManager.addEngineer({
          id: newId,
          name: name,
          fullName: fullName,
          display: `${name} (${newId})`,
          tms_password: pass,
          access_pin: pin
        });
      }
    }

    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.pushMasterEngineers(MASTER_LISTS.ENGINEERS);
    }

    this.closeEditStaffModal();
    this.render();

    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Updated Engr. ${name} (${newId}) successfully!`, "success");
    }
  },

  // -------------------------------------------------------------
  // SUPERVISOR ADD, EDIT & DELETE (Protected by 50463 / ACprocess@2026)
  // -------------------------------------------------------------
  openAddSupervisorModal() {
    let container = document.getElementById('add-supervisor-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'add-supervisor-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">👔</span>
              <div>
                <h3 class="text-base font-black text-slate-900">Add New Department Supervisor</h3>
                <p class="text-xs text-slate-500">Register supervisor for task verification and monthly report sections</p>
              </div>
            </div>
            <button onclick="SettingsView.closeAddSupervisorModal()" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
          </div>

          <div class="space-y-3 my-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Supervisor Name (e.g. Kamrul):</label>
                <input type="text" id="new-sup-name" placeholder="Kamrul" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Employee ID (e.g. 44819):</label>
                <input type="text" id="new-sup-id" placeholder="44819" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-purple-500" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Title / Designation:</label>
              <input type="text" id="new-sup-title" placeholder="Head of Process / Lead Engineer" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Official Email Address:</label>
              <input type="email" id="new-sup-email" placeholder="kamrulkuet50@gmail.com" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500" />
            </div>

            <!-- Master Admin Authorization Box -->
            <div class="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 mt-2">
              <span class="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>🔐</span> <span>Required: Master Admin Verification</span>
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-semibold text-amber-800 mb-0.5">Master Admin ID:</label>
                  <input type="text" id="new-sup-master-id" placeholder="Enter Master ID" class="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-amber-800 mb-0.5">Master Password:</label>
                  <input type="password" id="new-sup-master-pass" placeholder="Enter Master Password..." class="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800" />
                </div>
              </div>
            </div>

            <div id="new-sup-error" class="hidden p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold"></div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onclick="SettingsView.closeAddSupervisorModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Cancel
            </button>
            <button onclick="SettingsView.confirmAddSupervisor()" class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <span>➕</span> <span>Add Supervisor &amp; Save</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closeAddSupervisorModal() {
    const container = document.getElementById('add-supervisor-modal-container');
    if (container) container.innerHTML = '';
  },

  confirmAddSupervisor() {
    const mId = (document.getElementById('new-sup-master-id') ? document.getElementById('new-sup-master-id').value : '').trim();
    const mPass = (document.getElementById('new-sup-master-pass') ? document.getElementById('new-sup-master-pass').value : '').trim();
    const errEl = document.getElementById('new-sup-error');

    if (mId !== '50463' || mPass !== 'ACprocess@2026') {
      if (errEl) {
        errEl.textContent = "❌ Invalid Master Credentials. Incorrect Master ID or Password.";
        errEl.classList.remove('hidden');
      }
      return;
    }

    const nameEl = document.getElementById('new-sup-name');
    const idEl = document.getElementById('new-sup-id');
    const titleEl = document.getElementById('new-sup-title');
    const emailEl = document.getElementById('new-sup-email');

    if (!nameEl || !nameEl.value.trim()) {
      if (errEl) {
        errEl.textContent = "Please enter Supervisor Name.";
        errEl.classList.remove('hidden');
      }
      return;
    }

    const name = nameEl.value.trim();
    const id = idEl ? idEl.value.trim() : "";
    const title = titleEl && titleEl.value.trim() ? titleEl.value.trim() : "Section Lead / Supervisor";
    const email = emailEl ? emailEl.value.trim() : "";

    if (typeof MasterDataManager !== 'undefined' && MasterDataManager.addSupervisor) {
      MasterDataManager.addSupervisor({
        id: id,
        name: name,
        fullName: `Engr. ${name}`,
        title: title,
        email: email
      });
    }

    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.pushMasterSupervisors(MASTER_LISTS.SUPERVISORS);
    }

    this.closeAddSupervisorModal();
    this.render();

    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Added Supervisor ${name} (${id}) & synced across all laptops!`, "success");
    }
  },

  openEditSupervisorModal(supId) {
    const list = (typeof MasterDataManager !== 'undefined' ? MasterDataManager.getSupervisors() : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.SUPERVISORS : []));
    const sup = list.find(s => String(s.id) === String(supId) || s.name === supId) || { id: supId, name: supId };

    let container = document.getElementById('edit-supervisor-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'edit-supervisor-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">✏️</span>
              <div>
                <h3 class="text-base font-black text-slate-900">Edit Supervisor Details</h3>
                <p class="text-xs text-slate-500">Modify supervisor designation, ID, and department email</p>
              </div>
            </div>
            <button onclick="SettingsView.closeEditSupervisorModal()" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
          </div>

          <div class="space-y-3 my-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Supervisor Name:</label>
                <input type="text" id="edit-sup-name" value="${HELPERS.escapeHtml(sup.name || '')}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Employee ID:</label>
                <input type="text" id="edit-sup-id" value="${HELPERS.escapeHtml(String(sup.id || ''))}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-purple-500" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Title / Designation:</label>
              <input type="text" id="edit-sup-title" value="${HELPERS.escapeHtml(sup.title || '')}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Official Email:</label>
              <input type="email" id="edit-sup-email" value="${HELPERS.escapeHtml(sup.email || '')}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500" />
            </div>

            <!-- Master Admin Authorization Box -->
            <div class="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 mt-2">
              <span class="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>🔐</span> <span>Required: Master Admin Verification</span>
              </span>
              <div class="grid grid-cols-2 gap-2">
                <input type="text" id="edit-sup-master-id" placeholder="Master ID" class="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold" />
                <input type="password" id="edit-sup-master-pass" placeholder="Master Password..." class="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold" />
              </div>
            </div>

            <div id="edit-sup-error" class="hidden p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold"></div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onclick="SettingsView.closeEditSupervisorModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Cancel
            </button>
            <button onclick="SettingsView.confirmEditSupervisor('${HELPERS.escapeHtml(String(sup.id || supId))}')" class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <span>💾</span> <span>Update &amp; Save</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closeEditSupervisorModal() {
    const container = document.getElementById('edit-supervisor-modal-container');
    if (container) container.innerHTML = '';
  },

  confirmEditSupervisor(oldId) {
    const mId = (document.getElementById('edit-sup-master-id') ? document.getElementById('edit-sup-master-id').value : '').trim();
    const mPass = (document.getElementById('edit-sup-master-pass') ? document.getElementById('edit-sup-master-pass').value : '').trim();
    const errEl = document.getElementById('edit-sup-error');

    if (mId !== '50463' || mPass !== 'ACprocess@2026') {
      if (errEl) {
        errEl.textContent = "❌ Invalid Master Credentials. Incorrect Master ID or Password.";
        errEl.classList.remove('hidden');
      }
      return;
    }

    const nameEl = document.getElementById('edit-sup-name');
    const idEl = document.getElementById('edit-sup-id');
    const titleEl = document.getElementById('edit-sup-title');
    const emailEl = document.getElementById('edit-sup-email');

    if (!nameEl || !nameEl.value.trim()) {
      if (errEl) {
        errEl.textContent = "Please enter Supervisor Name.";
        errEl.classList.remove('hidden');
      }
      return;
    }

    const name = nameEl.value.trim();
    const newId = idEl ? idEl.value.trim() : "";
    const title = titleEl ? titleEl.value.trim() : "Section Lead / Supervisor";
    const email = emailEl ? emailEl.value.trim() : "";

    if (typeof MasterDataManager !== 'undefined' && MasterDataManager.updateSupervisor) {
      MasterDataManager.updateSupervisor(oldId, {
        id: newId,
        name: name,
        fullName: `Engr. ${name}`,
        title: title,
        email: email
      });
    }

    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.pushMasterSupervisors(MASTER_LISTS.SUPERVISORS);
    }

    this.closeEditSupervisorModal();
    this.render();

    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Updated Supervisor ${name} (${newId}) successfully!`, "success");
    }
  },

  deleteSupervisor(supId) {
    this.openDeleteSupervisorModal(supId);
  },

  openDeleteSupervisorModal(supId) {
    const list = (typeof MasterDataManager !== 'undefined' ? MasterDataManager.getSupervisors() : (typeof MASTER_LISTS !== 'undefined' ? MASTER_LISTS.SUPERVISORS : []));
    const target = list.find(s => String(s.id) === String(supId) || s.name === supId);
    const displayName = target ? (target.fullName || target.name) : supId;

    let container = document.getElementById('delete-sup-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'delete-sup-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div class="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-800">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl text-rose-600">🗑️</span>
              <div>
                <h3 class="text-base font-black text-slate-900">Remove Department Supervisor</h3>
                <p class="text-xs text-slate-500">Requires Master Admin Authorization</p>
              </div>
            </div>
            <button onclick="SettingsView.closeDeleteSupervisorModal()" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
          </div>

          <div class="space-y-3.5 my-4">
            <p class="text-xs text-slate-700">
              Are you sure you want to remove supervisor <strong>${HELPERS.escapeHtml(displayName)}</strong>?
            </p>

            <div class="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
              <span class="text-xs font-bold text-amber-900">Master Admin Credentials:</span>
              <div class="grid grid-cols-2 gap-2">
                <input type="text" id="del-sup-master-id" placeholder="Master ID" class="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold" />
                <input type="password" id="del-sup-master-pass" placeholder="Master Password..." class="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold" />
              </div>
            </div>

            <div id="del-sup-error" class="hidden p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold"></div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onclick="SettingsView.closeDeleteSupervisorModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Cancel
            </button>
            <button onclick="SettingsView.confirmDeleteSupervisor('${HELPERS.escapeHtml(String(supId))}')" class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <span>🗑️</span> <span>Authorize &amp; Delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closeDeleteSupervisorModal() {
    const container = document.getElementById('delete-sup-modal-container');
    if (container) container.innerHTML = '';
  },

  confirmDeleteSupervisor(supId) {
    const mId = (document.getElementById('del-sup-master-id') ? document.getElementById('del-sup-master-id').value : '').trim();
    const mPass = (document.getElementById('del-sup-master-pass') ? document.getElementById('del-sup-master-pass').value : '').trim();
    const errEl = document.getElementById('del-sup-error');

    if (mId !== '50463' || mPass !== 'ACprocess@2026') {
      if (errEl) {
        errEl.textContent = "❌ Invalid Master Credentials. Incorrect Master ID or Password.";
        errEl.classList.remove('hidden');
      }
      return;
    }

    if (typeof MasterDataManager !== 'undefined' && MasterDataManager.deleteSupervisor) {
      MasterDataManager.deleteSupervisor(supId);
    } else if (typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.SUPERVISORS) {
      MASTER_LISTS.SUPERVISORS = MASTER_LISTS.SUPERVISORS.filter(s => String(s.id) !== String(supId) && s.name !== supId);
      localStorage.setItem("walton_pd_master_supervisors_v2", JSON.stringify(MASTER_LISTS.SUPERVISORS));
    }

    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.pushMasterSupervisors(MASTER_LISTS.SUPERVISORS);
    }

    this.closeDeleteSupervisorModal();
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast(`🗑️ Removed supervisor and synced to all devices!`, "info");
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsView;
} else if (typeof window !== 'undefined') {
  window.SettingsView = SettingsView;
}
