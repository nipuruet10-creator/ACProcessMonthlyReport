/**
 * Process Development Monthly Report Automation System
 * Module: Application Configuration
 * WALTON Hi-Tech Industries PLC
 */

const APP_CONFIG = {
  SYSTEM_NAME: "Process Development Monthly Report Automation System",
  SHORT_NAME: "Process Report AI",
  VERSION: "1.0.0",
  ORGANIZATION: "WALTON Hi-Tech Industries PLC",
  DEPARTMENT: "Process Development Department (AC)",
  
  // Storage Keys
  STORAGE_KEYS: {
    TASKS: "walton_pd_tasks_v1",
    HISTORY: "walton_pd_history_v1",
    AUDIT: "walton_pd_audit_v1",
    SETTINGS: "walton_pd_settings_v1",
    USER: "walton_pd_active_user_v1",
    AI_CACHE: "walton_pd_ai_cache_v1"
  },

  // Current Active Operating Month
  DEFAULT_MONTH: "2026-09",
  SUPPORTED_MONTHS: [
    { id: "2026-08", label: "August 2026", status: "Closed", code: "AUG-2026" },
    { id: "2026-09", label: "September 2026", status: "Active", code: "SEP-2026" }
  ],

  // Gemini AI Settings
  AI: {
    DEFAULT_MODEL: "gemini-3.8-flash",
    BACKUP_MODEL: "gemini-2.5-flash",
    API_ENDPOINT: "https://generativelanguage.googleapis.com/v1beta/models",
    TEMPERATURE: 0.2, // Low temperature for deterministic, factual rewriting
    MAX_OUTPUT_TOKENS: 1024,
    PROMPT_TIMEOUT_MS: 15000,
    STORAGE_KEY_API_KEY: "walton_pd_gemini_api_key"
  },

  // Presentation Defaults
  SLIDES: {
    ASPECT_RATIO: "16:9",
    WIDTH: 13.333, // Standard PPTX 16:9 width in inches
    HEIGHT: 7.5,    // Standard PPTX 16:9 height in inches
    PRIMARY_FONT: "Lexend",
    SECONDARY_FONT: "sans-serif"
  },

  // Roles & RBAC
  ROLES: {
    ADMIN: "ADMIN",
    REPORT_OWNER: "REPORT_OWNER",
    ENGINEER: "ENGINEER",
    VIEWER: "VIEWER"
  },

  // Google Workspace Endpoints (configured when deploying Apps Script)
  GOOGLE_WORKSPACE: {
    APPS_SCRIPT_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbzYotH409TJW1JtDdY0gctfYh2nSH0D8dKk0rQiwI6mfxCbwrvw7QzCDr3qhrTWDCh1/exec",
    SPREADSHEET_ID: "",
    DRIVE_FOLDER_ID: "",
    ENABLED: true
  },

  // Google Firebase Realtime Database Engine (Sub-50ms Collaborative Sync)
  FIREBASE: {
    DATABASE_URL: "https://ac-monthly-report-default-rtdb.asia-southeast1.firebasedatabase.app",
    API_KEY: "",
    PROJECT_ID: "ac-monthly-report",
    ENABLED: true
  }
};

// Freeze configuration to prevent accidental runtime modification
if (typeof Object.freeze === 'function') {
  Object.freeze(APP_CONFIG);
  Object.freeze(APP_CONFIG.STORAGE_KEYS);
  Object.freeze(APP_CONFIG.AI);
  Object.freeze(APP_CONFIG.SLIDES);
  Object.freeze(APP_CONFIG.ROLES);
}

// Support CommonJS export for Node/PowerShell testing and browser window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APP_CONFIG;
} else if (typeof window !== 'undefined') {
  window.APP_CONFIG = APP_CONFIG;
}
