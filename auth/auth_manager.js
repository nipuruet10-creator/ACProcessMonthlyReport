/**
 * Process Development Monthly Report Automation System
 * Module: Authentication & Role-Based Access Control (RBAC)
 * WALTON Hi-Tech Industries PLC
 */

class AuthManager {
  constructor(storageKey = APP_CONFIG.STORAGE_KEYS.USER) {
    this.storageKey = storageKey;
    this.currentUser = this.loadUser();
  }

  loadUser() {
    return HELPERS.storage.get(this.storageKey, {
      id: "50463",
      name: "Sazzad",
      fullName: "Engr. Sazzadul Islam",
      role: APP_CONFIG.ROLES.REPORT_OWNER, // Default to Report Owner for full workflow testing
      email: "sazzad50463@waltonbd.com"
    });
  }

  setUser(user) {
    this.currentUser = user;
    HELPERS.storage.set(this.storageKey, user);
  }

  getRole() {
    return this.currentUser ? this.currentUser.role : APP_CONFIG.ROLES.VIEWER;
  }

  getUserName() {
    return this.currentUser ? this.currentUser.name : "Guest";
  }

  // Permission Checks
  canEditTask(task) {
    const role = this.getRole();
    if (role === APP_CONFIG.ROLES.ADMIN || role === APP_CONFIG.ROLES.REPORT_OWNER) return true;
    if (role === APP_CONFIG.ROLES.ENGINEER) {
      if (!task || !task.concern_engineer) return true;
      return task.concern_engineer.includes(this.currentUser.name) || task.concern_engineer.includes(this.currentUser.id);
    }
    return false; // VIEWER
  }

  canToggleMonthlyReport() {
    const role = this.getRole();
    return role === APP_CONFIG.ROLES.ADMIN || role === APP_CONFIG.ROLES.REPORT_OWNER || role === APP_CONFIG.ROLES.ENGINEER;
  }

  canUploadPhoto() {
    const role = this.getRole();
    return role === APP_CONFIG.ROLES.ADMIN || role === APP_CONFIG.ROLES.REPORT_OWNER || role === APP_CONFIG.ROLES.ENGINEER;
  }

  canRegenerateAI() {
    const role = this.getRole();
    return role === APP_CONFIG.ROLES.ADMIN || role === APP_CONFIG.ROLES.REPORT_OWNER;
  }

  canGenerateReport() {
    const role = this.getRole();
    return role === APP_CONFIG.ROLES.ADMIN || role === APP_CONFIG.ROLES.REPORT_OWNER;
  }

  canManageSettings() {
    return this.getRole() === APP_CONFIG.ROLES.ADMIN;
  }
}

const authManager = new AuthManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthManager, authManager };
} else if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
  window.authManager = authManager;
}
