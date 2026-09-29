/**
 * Process Development Monthly Report Automation System
 * Module: Master Lists & Dynamic Organizational Reference Data
 * Derived from Walton AC Process Department Master Data
 * Provides Add/Edit/Delete persistence for Engineers and Categories
 * WALTON Hi-Tech Industries PLC
 */

const DEFAULT_ENGINEERS = [
  { id: "50463", name: "Sazzad", fullName: "Engr. Md Sazzad Mahmud", display: "Sazzad (50463)", email: "sazzad50463@waltonbd.com", tms_password: "Sep@2026", access_pin: "SZ#50463" },
  { id: "45127", name: "Rafi", fullName: "Engr. Sajjadul Islam Rafi", display: "Rafi (45127)", email: "rafi45127@waltonbd.com", tms_password: "Sep@2026", access_pin: "RF#45127" },
  { id: "54634", name: "Faiyaz", fullName: "Engr. Ahmed Intisar Fiyaz", display: "Faiyaz (54634)", email: "faiyaz54634@waltonbd.com", tms_password: "619684!Me", access_pin: "FY#54634" },
  { id: "58102", name: "Abdullah", fullName: "Engr. Abdullah Jashim", display: "Abdullah (58102)", email: "abdullah58102@waltonbd.com", tms_password: "Sep@2026", access_pin: "AJ#58102" },
  { id: "58279", name: "Emon", fullName: "Engr. Yousof Ahmed Emon", display: "Emon (58279)", email: "emon58279@waltonbd.com", tms_password: "Sep@2026", access_pin: "EM#58279" },
  { id: "56880", name: "Hashmi", fullName: "Engr. Abuzar Hashmi", display: "Hashmi (56880)", email: "hashmi56880@waltonbd.com", tms_password: "sep@2026", access_pin: "HS#56880" },
  { id: "52800", name: "Anam", fullName: "Engr. Md. Rafiul Anam", display: "Anam (52800)", email: "mdrafiulanam@gmail.com", tms_password: "Sep@26", access_pin: "AN#52800" },
  { id: "7686", name: "Jowel", fullName: "Engr. Jowel", display: "Jowel (7686)", email: "jowel7686@waltonbd.com", tms_password: "Sep@2026", access_pin: "JW#7686" },
  { id: "54636", name: "Pear", fullName: "Engr. Md. Pearul Islam", display: "Pear (54636)", email: "pear54636@waltonbd.com", tms_password: "Walton@9", access_pin: "PR#54636" }
];

const MASTER_ADMIN_CREDENTIALS = {
  ID: "50463",
  PASSWORD: "ACprocess@2026"
};

const DEFAULT_CATEGORIES = [
  "Process development",
  "BOM verification",
  "Cost savings (Local)",
  "Cost Savings (IBU)",
  "FG BOM/ SFG",
  "New model(Local)",
  "Process optimization",
  "Process extension",
  "Project",
  "Major Developments – Process",
  "Major Developments – Tools",
  "Major Developments – Parts",
  "Major Developments – Materials",
  "Major Developments – Chemical",
  "Cost Saving",
  "Ongoing Projects",
  "Completed Projects",
  "Top 5 Works & Projects",
  "Others"
];

const REMOVED_ENGINEER_IDS = new Set(["28117", "37486", "40121", "39635", "46484", "51121", "2571", "44819", "51020"]);
const REMOVED_ENGINEER_NAMES = new Set(["shishir", "rana", "mehedi", "shahria", "kasfia", "takvir", "nurul", "kamrul", "mahmud"]);

const SAZZAD_PROTECTED_TASK_IDS = new Set([
  'SEP-2026-142-FJTG', 'SEP-2026-143-IUSP', 'SEP-2026-144-FSAF', 'SEP-2026-145-Y4FB',
  'SEP-2026-146-N2WQ', 'SEP-2026-147-L7GA', 'SEP-2026-148-JTPO', 'SEP-2026-149-SORS',
  'SEP-2026-150-M8CG', 'SEP-2026-151-YQBW', 'SEP-2026-152-9DLZ', 'SEP-2026-153-82EE',
  'SEP-2026-154-Z2U6', 'SEP-2026-155-EPQ0', 'SEP-2026-156-AU13', 'SEP-2026-157-B1B0',
  'SEP-2026-158-U38B', 'SEP-2026-159-GKBY', 'SEP-2026-160-O9XW', 'SEP-2026-161-CM3U',
  'SEP-2026-162-MR1M', 'SEP-2026-163-YGIQ', 'SEP-2026-164-IZE1', 'SEP-2026-165-B8QB',
  'SEP-2026-166-EVWA'
]);
if (typeof window !== 'undefined') {
  window.SAZZAD_PROTECTED_TASK_IDS = SAZZAD_PROTECTED_TASK_IDS;
  try {
    const raw = localStorage.getItem('walton_deleted_task_ids');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const cleaned = arr.filter(id => !SAZZAD_PROTECTED_TASK_IDS.has(id));
        if (cleaned.length !== arr.length) {
          localStorage.setItem('walton_deleted_task_ids', JSON.stringify(cleaned));
        }
      }
    }
  } catch (e) {}
}

function loadMasterEngineers() {
  try {
    const saved = localStorage.getItem("walton_pd_master_engineers_v2");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed
          .filter(e => !REMOVED_ENGINEER_IDS.has(String(e.id)) && !REMOVED_ENGINEER_NAMES.has(e.name.toLowerCase()))
          .map(e => {
            let pass = e.tms_password || "Sep@2026";
            if (String(e.id) === "54634") {
              pass = (pass === "Sep@2026" || !pass) ? "619684!Me" : pass;
            }
            const cleanId = String(e.id);
            const defaultMatch = DEFAULT_ENGINEERS.find(de => de.id === cleanId);
            let pin = e.access_pin;
            // Upgrade old predictable Name@ID pin or legacy pin to clean short pattern
            if (!pin || pin.includes('@') || (defaultMatch && defaultMatch.access_pin)) {
              pin = defaultMatch ? defaultMatch.access_pin : pin;
            }
            if (!pin) {
              pin = `${e.name.substring(0, 2).toUpperCase()}#${cleanId}`;
            }
            return {
              ...e,
              fullName: defaultMatch ? defaultMatch.fullName : (e.fullName || `Engr. ${e.name}`),
              tms_password: pass,
              access_pin: pin
            };
          });
        return filtered.length > 0 ? filtered : [...DEFAULT_ENGINEERS];
      }
    }
    // Clean legacy v1 cache if exists
    localStorage.removeItem("walton_pd_master_engineers_v1");
  } catch (e) {
    console.warn("Could not load master engineers:", e);
  }
  return [...DEFAULT_ENGINEERS];
}

function loadMasterCategories() {
  try {
    const saved = localStorage.getItem("walton_pd_master_categories_v1");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_CATEGORIES, ...parsed]));
      }
    }
  } catch (e) {
    console.warn("Could not load master categories:", e);
  }
  return [...DEFAULT_CATEGORIES];
}

const DEFAULT_SUPERVISORS = [
  { id: "44819", name: "Kamrul", fullName: "Engr. Kamrul Hasan", title: "Head of Process / Lead Engineer", display: "Kamrul (44819)", email: "kamrulkuet50@gmail.com" },
  { id: "50463", name: "Sazzad", fullName: "Engr. Md Sazzad Mahmud", title: "Process Lead / Supervisor", display: "Sazzad (50463)", email: "sazzad50463@waltonbd.com" }
];

function loadMasterSupervisors() {
  try {
    const saved = localStorage.getItem("walton_pd_master_supervisors_v2");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter(s => !REMOVED_ENGINEER_IDS.has(String(s.id)) && !REMOVED_ENGINEER_NAMES.has((s.name || '').toLowerCase()));
        return filtered.length > 0 ? filtered : [...DEFAULT_SUPERVISORS];
      }
    }
    // Clean legacy v1 cache if exists
    localStorage.removeItem("walton_pd_master_supervisors_v1");
  } catch (e) {
    console.warn("Could not load master supervisors:", e);
  }
  return [...DEFAULT_SUPERVISORS];
}

const MASTER_LISTS = {
  ENGINEERS: loadMasterEngineers(),
  CATEGORIES: loadMasterCategories(),
  SUPERVISORS: loadMasterSupervisors(),

  // Recurring Report Sections
  REPORT_SECTIONS: [
    { id: "sec_summary", code: "01", name: "Summary", title: "Executive Performance Summary" },
    { id: "sec_process", code: "02", name: "Major Developments – Process", title: "Major Developments (Process & Others)" },
    { id: "sec_materials", code: "03", name: "Major Developments – Materials", title: "Major Developments (Materials & Chemical Development)" },
    { id: "sec_chemical", code: "03b", name: "Major Developments – Chemical", title: "Chemical Development & SWAAT Trials" },
    { id: "sec_tools", code: "04", name: "Major Developments – Tools", title: "Major Developments (Tools & Fixtures)" },
    { id: "sec_parts", code: "04b", name: "Major Developments – Parts", title: "Major Developments (Parts Development)" },
    { id: "sec_bom", code: "05", name: "BOM Verification", title: "BOM Verification & Physical Observation Audit" },
    { id: "sec_ongoing", code: "06", name: "Ongoing Projects", title: "Ongoing Strategic Projects & Automation" },
    { id: "sec_completed", code: "06b", name: "Completed Projects", title: "Completed Engineering Projects" },
    { id: "sec_cost", code: "07", name: "Cost Saving", title: "Cost Optimization & Financial Impact" },
    { id: "sec_top5", code: "08", name: "Top 5 Works & Projects", title: "Top 5 Works & Projects" }
  ],

  // Task Statuses
  STATUSES: [
    { id: "Completed", label: "Completed", color: "emerald", badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { id: "Ongoing", label: "Ongoing", color: "sky", badgeClass: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
    { id: "In Progress", label: "In Progress", color: "indigo", badgeClass: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
    { id: "Scheduled", label: "Scheduled", color: "amber", badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    { id: "On Hold", label: "On Hold", color: "slate", badgeClass: "bg-slate-500/20 text-slate-400 border-slate-500/30" }
  ],

  // Priority Levels
  PRIORITIES: ["High", "Medium", "Low"],

  // Monthly Report Toggle Values
  MONTHLY_REPORT_CHOICES: ["NO", "YES"]
};

const MasterDataManager = {
  getEngineers() {
    return MASTER_LISTS.ENGINEERS;
  },

  addEngineer(engineer) {
    if (!engineer || !engineer.name || !engineer.id) {
      throw new Error("Name and ID are required.");
    }
    const cleanId = String(engineer.id).trim();
    const cleanName = engineer.name.trim();
    const defaultMatch = DEFAULT_ENGINEERS.find(de => de.id === cleanId);
    const fallbackPin = `${cleanName.substring(0, 2).toUpperCase()}#${cleanId}`;
    const pin = engineer.access_pin ? engineer.access_pin.trim() : (defaultMatch ? defaultMatch.access_pin : fallbackPin);
    const newEng = {
      id: cleanId,
      name: cleanName,
      fullName: engineer.fullName ? engineer.fullName.trim() : (defaultMatch ? defaultMatch.fullName : `Engr. ${cleanName}`),
      display: `${cleanName} (${cleanId})`,
      email: engineer.email ? engineer.email.trim() : `${cleanName.toLowerCase()}${cleanId}@waltonbd.com`,
      tms_password: engineer.tms_password ? engineer.tms_password.trim() : (defaultMatch ? defaultMatch.tms_password : "Sep@2026"),
      access_pin: pin
    };
    MASTER_LISTS.ENGINEERS.push(newEng);
    this.saveEngineers();
    return newEng;
  },

  updateEngineer(id, updates) {
    const idx = MASTER_LISTS.ENGINEERS.findIndex(e => String(e.id) === String(id));
    if (idx === -1) throw new Error("Engineer not found");
    const current = MASTER_LISTS.ENGINEERS[idx];
    const name = updates.name ? updates.name.trim() : current.name;
    const newId = updates.id ? String(updates.id).trim() : current.id;
    const defaultMatch = DEFAULT_ENGINEERS.find(de => de.id === newId);
    const fallbackPin = `${name.substring(0, 2).toUpperCase()}#${newId}`;
    const updated = {
      ...current,
      ...updates,
      id: newId,
      name: name,
      fullName: updates.fullName ? updates.fullName.trim() : (current.fullName || (defaultMatch ? defaultMatch.fullName : `Engr. ${name}`)),
      display: `${name} (${newId})`,
      email: updates.email ? updates.email.trim() : current.email,
      tms_password: updates.tms_password !== undefined ? updates.tms_password.trim() : (current.tms_password || "Sep@2026"),
      access_pin: updates.access_pin !== undefined ? updates.access_pin.trim() : (current.access_pin || (defaultMatch ? defaultMatch.access_pin : fallbackPin))
    };
    MASTER_LISTS.ENGINEERS[idx] = updated;
    this.saveEngineers();
    return updated;
  },

  verifyMasterAdmin(id, password) {
    const cleanId = String(id || '').trim();
    const cleanPass = String(password || '').trim();
    return (cleanId === MASTER_ADMIN_CREDENTIALS.ID && cleanPass === MASTER_ADMIN_CREDENTIALS.PASSWORD);
  },

  verifyEngineerAccess(engId, inputId, inputPassword) {
    const cleanInputId = String(inputId || '').trim();
    const cleanPass = String(inputPassword || '').trim();
    if (this.verifyMasterAdmin(cleanInputId, cleanPass)) {
      return { success: true, isMasterAdmin: true };
    }
    const eng = MASTER_LISTS.ENGINEERS.find(e => String(e.id) === String(engId) || e.name === engId);
    if (!eng) {
      return { success: false, error: "Engineer record not found." };
    }
    const defaultMatch = DEFAULT_ENGINEERS.find(de => de.id === String(eng.id));
    const expectedPin = eng.access_pin || (defaultMatch ? defaultMatch.access_pin : "");
    const validPins = new Set([
      expectedPin,
      expectedPin.replace('#', '@'),
      expectedPin.replace('@', '#'),
      defaultMatch ? defaultMatch.access_pin : '',
      defaultMatch ? defaultMatch.access_pin.replace('#', '@') : '',
      // Backward compatibility for trailing digit
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

    if (cleanInputId === String(eng.id) && validPins.has(cleanPass)) {
      return { success: true, isMasterAdmin: false, engineer: eng };
    }
    return { success: false, error: "Invalid Employee ID or Security Password." };
  },

  getMasterCredentialsList() {
    return MASTER_LISTS.ENGINEERS.map(e => {
      const defaultMatch = DEFAULT_ENGINEERS.find(de => de.id === String(e.id));
      return {
        id: e.id,
        name: e.name,
        fullName: e.fullName || `Engr. ${e.name}`,
        access_pin: e.access_pin || (defaultMatch ? defaultMatch.access_pin : ""),
        tms_password: e.tms_password || "Sep@2026"
      };
    });
  },

  getEngineerCredentials(idOrName) {
    if (!idOrName) return null;
    const clean = String(idOrName).trim().toLowerCase();
    const cleanId = (clean.match(/\b(\d{4,6})\b/) || [])[1] || clean;
    const eng = MASTER_LISTS.ENGINEERS.find(e => 
      String(e.id) === cleanId || 
      e.name.toLowerCase() === clean || 
      e.display.toLowerCase().includes(clean)
    );
    if (eng) {
      return {
        id: eng.id,
        name: eng.name,
        fullName: eng.fullName,
        display: eng.display || `${eng.name} (${eng.id})`,
        password: eng.tms_password || "Sep@2026"
      };
    }
    return null;
  },

  updateEngineerCredentials(id, password) {
    return this.updateEngineer(id, { tms_password: (password || '').trim() });
  },

  updateTmsPassword(idOrName, password) {
    const clean = String(idOrName).trim().toLowerCase();
    const idMatch = (clean.match(/\b(\d{4,6})\b/) || [])[1];
    const eng = MASTER_LISTS.ENGINEERS.find(e => 
      (idMatch && String(e.id) === idMatch) ||
      String(e.id).toLowerCase() === clean ||
      e.name.toLowerCase() === clean ||
      clean.includes(e.name.toLowerCase())
    );
    if (eng) {
      eng.tms_password = (password || '').trim();
      this.saveEngineers();
      return eng;
    }
    return null;
  },

  setGlobalTmsPassword(newPassword) {
    const pass = (newPassword || '').trim();
    if (!pass) throw new Error("Password cannot be empty");
    MASTER_LISTS.ENGINEERS.forEach(e => {
      e.tms_password = pass;
    });
    this.saveEngineers();
    return MASTER_LISTS.ENGINEERS;
  },

  deleteEngineer(id) {
    const initialLen = MASTER_LISTS.ENGINEERS.length;
    MASTER_LISTS.ENGINEERS = MASTER_LISTS.ENGINEERS.filter(e => String(e.id) !== String(id));
    if (MASTER_LISTS.ENGINEERS.length !== initialLen) {
      this.saveEngineers();
      return true;
    }
    return false;
  },

  saveEngineers() {
    try {
      localStorage.setItem("walton_pd_master_engineers_v2", JSON.stringify(MASTER_LISTS.ENGINEERS));
    } catch (e) {
      console.error("Failed to save master engineers:", e);
    }
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.pushMasterEngineers) {
      FirebaseSyncService.pushMasterEngineers(MASTER_LISTS.ENGINEERS);
    }
  },

  getCategories() {
    return MASTER_LISTS.CATEGORIES;
  },

  isProjectCategory(category) {
    if (!category) return false;
    const cat = String(category).trim().toLowerCase();
    return cat === 'project' || cat === 'ongoing projects' || cat === 'completed projects' || (cat.includes('project') && !cat.includes('top 5'));
  },

  getRoutineCategories() {
    return this.getCategories().filter(c => !this.isProjectCategory(c));
  },

  getProjectCategories() {
    return ["Ongoing Projects", "Completed Projects", "Project"];
  },

  addCategory(category) {
    const cat = (category || "").trim();
    if (!cat) throw new Error("Category name required");
    if (!MASTER_LISTS.CATEGORIES.includes(cat)) {
      MASTER_LISTS.CATEGORIES.push(cat);
      this.saveCategories();
    }
    return MASTER_LISTS.CATEGORIES;
  },

  deleteCategory(category) {
    MASTER_LISTS.CATEGORIES = MASTER_LISTS.CATEGORIES.filter(c => c !== category);
    this.saveCategories();
    return MASTER_LISTS.CATEGORIES;
  },

  saveCategories() {
    try {
      localStorage.setItem("walton_pd_master_categories_v1", JSON.stringify(MASTER_LISTS.CATEGORIES));
    } catch (e) {
      console.error("Failed to save master categories:", e);
    }
  },

  getSupervisors() {
    return MASTER_LISTS.SUPERVISORS;
  },

  getDefaultSupervisor() {
    const sups = this.getSupervisors();
    if (sups && sups.length > 0) {
      return sups[0].display || sups[0].name || "Kamrul (44819)";
    }
    return "Kamrul (44819)";
  },

  addSupervisor(sup) {
    if (!sup || !sup.name) {
      throw new Error("Supervisor Name is required.");
    }
    const cleanName = sup.name.trim();
    const cleanId = sup.id ? String(sup.id).trim() : "";
    const cleanTitle = sup.title ? sup.title.trim() : "Section Lead / Supervisor";
    const newSup = {
      id: cleanId,
      name: cleanName,
      fullName: sup.fullName ? sup.fullName.trim() : `Engr. ${cleanName}`,
      title: cleanTitle,
      display: cleanId ? `${cleanName} (${cleanId})` : cleanName,
      email: sup.email ? sup.email.trim() : ""
    };
    MASTER_LISTS.SUPERVISORS.push(newSup);
    this.saveSupervisors();
    return newSup;
  },

  updateSupervisor(id, updates) {
    const idx = MASTER_LISTS.SUPERVISORS.findIndex(s => String(s.id) === String(id) || s.name === id);
    if (idx === -1) throw new Error("Supervisor not found");
    const current = MASTER_LISTS.SUPERVISORS[idx];
    const name = updates.name ? updates.name.trim() : current.name;
    const newId = updates.id !== undefined ? String(updates.id).trim() : current.id;
    const updated = {
      ...current,
      ...updates,
      id: newId,
      name: name,
      fullName: updates.fullName ? updates.fullName.trim() : current.fullName,
      title: updates.title ? updates.title.trim() : current.title,
      display: newId ? `${name} (${newId})` : name,
      email: updates.email !== undefined ? updates.email.trim() : current.email
    };
    MASTER_LISTS.SUPERVISORS[idx] = updated;
    this.saveSupervisors();
    return updated;
  },

  deleteSupervisor(id) {
    const initialLen = MASTER_LISTS.SUPERVISORS.length;
    MASTER_LISTS.SUPERVISORS = MASTER_LISTS.SUPERVISORS.filter(s => String(s.id) !== String(id) && s.name !== id);
    if (MASTER_LISTS.SUPERVISORS.length !== initialLen) {
      this.saveSupervisors();
      return true;
    }
    return false;
  },

  saveSupervisors() {
    try {
      localStorage.setItem("walton_pd_master_supervisors_v2", JSON.stringify(MASTER_LISTS.SUPERVISORS));
    } catch (e) {
      console.error("Failed to save master supervisors:", e);
    }
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.pushMasterSupervisors) {
      FirebaseSyncService.pushMasterSupervisors(MASTER_LISTS.SUPERVISORS);
    }
  },

  getAllPersonnel() {
    const list = [];
    const seen = new Set();
    const addPerson = (p) => {
      const key = (p.id || p.name).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        const disp = p.id ? `${p.name} (${p.id})` : p.name;
        list.push({
          id: p.id || "",
          name: p.name,
          fullName: p.fullName || `Engr. ${p.name}`,
          display: disp,
          title: p.title || "Engineer"
        });
      }
    };
    (MASTER_LISTS.SUPERVISORS || []).forEach(addPerson);
    (MASTER_LISTS.ENGINEERS || []).forEach(addPerson);
    return list;
  },

  formatNameWithId(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return "";
    const clean = rawInput.trim();
    if (!clean) return "";

    // If already in "Name (ID)" format, normalize spacing and check canonical name
    const matchWithId = clean.match(/^([A-Za-z\s.]+)\s*\((\d+)\)$/);
    if (matchWithId) {
      const namePart = matchWithId[1].trim().replace(/^Engr\.\s*/i, "");
      const idPart = matchWithId[2].trim();
      const all = this.getAllPersonnel();
      const foundById = all.find(p => String(p.id) === idPart);
      if (foundById && foundById.name) {
        return `${foundById.name} (${idPart})`;
      }
      return `${namePart} (${idPart})`;
    }

    // Extract potential ID or clean name
    const idMatch = clean.match(/\b(\d{4,6})\b/);
    const pureName = clean.replace(/^Engr\.\s*/i, "").replace(/\s*\(\d+\)$/, "").trim().toLowerCase();

    // Look up in MASTER_LISTS
    const all = this.getAllPersonnel();
    
    // 1. Match by ID if found
    if (idMatch) {
      const foundById = all.find(p => String(p.id) === String(idMatch[1]));
      if (foundById && foundById.id) return `${foundById.name} (${foundById.id})`;
    }

    // 2. Match by exact or partial name
    const foundByName = all.find(p => {
      const pName = (p.name || "").toLowerCase();
      const pFull = (p.fullName || "").toLowerCase();
      return pName === pureName || pureName === pName || (pureName.length >= 3 && pName.includes(pureName));
    });

    if (foundByName && foundByName.id) {
      return `${foundByName.name} (${foundByName.id})`;
    }

    // Fallback lookup in default lists
    const fallbackAll = [...DEFAULT_ENGINEERS, ...DEFAULT_SUPERVISORS];
    const foundFallback = fallbackAll.find(p => {
      const pName = (p.name || "").toLowerCase();
      return pName === pureName || (pureName.length >= 3 && pName.includes(pureName)) || (idMatch && String(p.id) === String(idMatch[1]));
    });

    if (foundFallback && foundFallback.id) {
      return `${foundFallback.name} (${foundFallback.id})`;
    }

    return clean;
  },

  resetDefaults() {
    MASTER_LISTS.ENGINEERS = [...DEFAULT_ENGINEERS];
    MASTER_LISTS.CATEGORIES = [...DEFAULT_CATEGORIES];
    MASTER_LISTS.SUPERVISORS = [...DEFAULT_SUPERVISORS];
    localStorage.removeItem("walton_pd_master_engineers_v1");
    localStorage.removeItem("walton_pd_master_categories_v1");
    localStorage.removeItem("walton_pd_master_supervisors_v1");
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MASTER_LISTS, MasterDataManager };
} else if (typeof window !== 'undefined') {
  window.MASTER_LISTS = MASTER_LISTS;
  window.MasterDataManager = MasterDataManager;
}
