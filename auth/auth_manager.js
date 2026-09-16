/**
 * Process Development Monthly Report Automation System
 * Module: Authentication & Role-Based Access Control (RBAC)
 * Specialized: Protected Input Section Authentication & Email OTP Recovery
 * WALTON Hi-Tech Industries PLC
 */

const INPUT_AUTH_CONFIG = {
  DEFAULT_USER: "admin",
  DEFAULT_PASS: "ACprocess@20226",
  ADMIN_EMAIL: "nipu.ruet10@gmail.com",
  STORAGE_KEY_SESSION: "walton_input_unlocked_session",
  STORAGE_KEY_CUSTOM_PASS: "walton_input_custom_pass"
};

class AuthManager {
  constructor(storageKey = (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.STORAGE_KEYS.USER : 'walton_user_auth')) {
    this.storageKey = storageKey;
    this.currentUser = this.loadUser();
    this._inMemoryUnlocked = false;
  }

  loadUser() {
    const fallback = {
      id: "admin",
      name: "Admin",
      fullName: "AC Process Administrator",
      role: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.ROLES) ? APP_CONFIG.ROLES.ADMIN : "ADMIN",
      email: INPUT_AUTH_CONFIG.ADMIN_EMAIL
    };

    if (typeof HELPERS !== 'undefined' && HELPERS.storage) {
      return HELPERS.storage.get(this.storageKey, fallback);
    }
    return fallback;
  }

  setUser(user) {
    this.currentUser = user;
    if (typeof HELPERS !== 'undefined' && HELPERS.storage) {
      HELPERS.storage.set(this.storageKey, user);
    }
  }

  getRole() {
    return this.currentUser ? this.currentUser.role : "VIEWER";
  }

  getUserName() {
    return this.currentUser ? this.currentUser.name : "Guest";
  }

  // ---------------------------------------------------------------------------
  // Dedicated Input Section Security Gate
  // ---------------------------------------------------------------------------

  /**
   * Checks whether the current session has unlocked the Input Section
   */
  isInputUnlocked() {
    if (this._inMemoryUnlocked) return true;
    if (typeof HELPERS !== 'undefined' && HELPERS.storage) {
      const session = HELPERS.storage.get(INPUT_AUTH_CONFIG.STORAGE_KEY_SESSION, null);
      if (session && session.unlocked) return true;
    }
    return false;
  }

  /**
   * Gets the active expected password (custom if saved, otherwise default)
   */
  getActivePassword() {
    if (typeof HELPERS !== 'undefined' && HELPERS.storage) {
      const custom = HELPERS.storage.get(INPUT_AUTH_CONFIG.STORAGE_KEY_CUSTOM_PASS, null);
      if (custom && typeof custom === 'string' && custom.length > 0) {
        return custom;
      }
    }
    return INPUT_AUTH_CONFIG.DEFAULT_PASS;
  }

  /**
   * Checks whether a code is an authorized Walton Admin Master PIN / Recovery Key
   */
  isMasterPin(code) {
    if (!code) return false;
    const clean = String(code).trim();
    const authorizedPins = [
      "50463",            // Engr. Md. Sazzad Hossain
      "44819",            // Kamrul Hasan
      "walton2026",       // Walton Team Key
      "ACprocess@20226",  // Default System Password
      "admin50463"
    ];
    return authorizedPins.includes(clean);
  }

  /**
   * Unlocks the Input Section with username & password (supports password or Master PIN)
   */
  async unlockInput(username, password, remember = true) {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: "Please enter both username and password." };
    }

    if (cleanUser !== INPUT_AUTH_CONFIG.DEFAULT_USER.toLowerCase()) {
      return { success: false, error: "Invalid username. Default user is 'admin'." };
    }

    // 1. Check against local active password, default password, or master PIN
    const currentExpected = this.getActivePassword();
    let isMatch = (cleanPass === currentExpected) || 
                  (cleanPass === INPUT_AUTH_CONFIG.DEFAULT_PASS) ||
                  this.isMasterPin(cleanPass);

    // 2. If mismatch but connected to Google Apps Script, verify with cloud backend
    if (!isMatch && typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getWebAppUrl()) {
      try {
        const cloudVerify = await GoogleSheetsSync.verifyInputAuth(cleanUser, cleanPass);
        if (cloudVerify && cloudVerify.valid) {
          isMatch = true;
          // Synchronize local password
          this.setCustomPasswordLocally(cleanPass);
        }
      } catch (e) {
        console.warn("Cloud auth check notice:", e.message);
      }
    }

    if (isMatch) {
      this._inMemoryUnlocked = true;
      if (remember && typeof HELPERS !== 'undefined' && HELPERS.storage) {
        HELPERS.storage.set(INPUT_AUTH_CONFIG.STORAGE_KEY_SESSION, {
          unlocked: true,
          user: INPUT_AUTH_CONFIG.DEFAULT_USER,
          timestamp: Date.now()
        });
      }
      return { success: true };
    }

    return { success: false, error: "Incorrect password. Please try again or use 'Change Password'." };
  }

  /**
   * Locks the Input Section immediately
   */
  lockInput() {
    this._inMemoryUnlocked = false;
    if (typeof HELPERS !== 'undefined' && HELPERS.storage) {
      HELPERS.storage.remove(INPUT_AUTH_CONFIG.STORAGE_KEY_SESSION);
    }
  }

  /**
   * Saves updated custom password locally
   */
  setCustomPasswordLocally(newPassword) {
    if (typeof HELPERS !== 'undefined' && HELPERS.storage) {
      HELPERS.storage.set(INPUT_AUTH_CONFIG.STORAGE_KEY_CUSTOM_PASS, newPassword);
    }
  }
  async changePasswordDirect(currentPasswordOrPin, newPassword) {
    const cleanCurrent = (currentPasswordOrPin || '').trim();
    const cleanNew = (newPassword || '').trim();

    if (!cleanCurrent) {
      return { success: false, error: "Please enter your current password or Walton Master PIN (50463)." };
    }

    if (!cleanNew || cleanNew.length < 6) {
      return { success: false, error: "New password must be at least 6 characters long." };
    }

    const currentExpected = this.getActivePassword();
    const isValidCurrent = (cleanCurrent === currentExpected) || 
                          (cleanCurrent === INPUT_AUTH_CONFIG.DEFAULT_PASS) || 
                          this.isMasterPin(cleanCurrent);

    if (!isValidCurrent) {
      return { 
        success: false, 
        error: "Incorrect current password or Master PIN. You can use Master PIN: 50463 if you forgot your password." 
      };
    }

    // Persist new password locally
    this.setCustomPasswordLocally(cleanNew);

    // Auto-unlock the session with the new password
    this._inMemoryUnlocked = true;
    if (typeof HELPERS !== 'undefined' && HELPERS.storage) {
      HELPERS.storage.set(INPUT_AUTH_CONFIG.STORAGE_KEY_SESSION, {
        unlocked: true,
        user: INPUT_AUTH_CONFIG.DEFAULT_USER,
        timestamp: Date.now()
      });
    }

    // Try cloud sync in background if Google Sheets is connected
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getWebAppUrl()) {
      try {
        if (GoogleSheetsSync.updateRemotePassword) {
          GoogleSheetsSync.updateRemotePassword(cleanNew).catch(e => console.warn("Cloud pass update:", e));
        }
      } catch (e) {
        // Ignore background sync errors
      }
    }

    return { 
      success: true, 
      message: "Password changed successfully! You can now use your new password." 
    };
  }

  /**
   * Requests a 6-digit OTP verification code sent to nipu.ruet10@gmail.com
   */
  async requestPasswordResetOtp() {
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.requestAuthOtp) {
      return await GoogleSheetsSync.requestAuthOtp(INPUT_AUTH_CONFIG.ADMIN_EMAIL);
    }
    throw new Error("Cloud sync service is not available. Please connect Google Sheets in Settings, or change password directly using Current Password / Master PIN 50463.");
  }

  /**
   * Verifies OTP code and sets the new team password across Cloud & Local
   */
  async verifyOtpAndChangePassword(otp, newPassword) {
    if (!otp || String(otp).trim().length < 4) {
      return { success: false, error: "Please enter a valid verification code." };
    }
    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, error: "New password must be at least 6 characters long." };
    }

    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.verifyOtpChangePassword) {
      const res = await GoogleSheetsSync.verifyOtpChangePassword(otp.trim(), newPassword.trim());
      if (res && res.success) {
        this.setCustomPasswordLocally(newPassword.trim());
        await this.unlockInput(INPUT_AUTH_CONFIG.DEFAULT_USER, newPassword.trim(), true);
        return { success: true, message: res.message || "Password updated successfully!" };
      } else {
        return { success: false, error: (res && res.error) ? res.error : "Invalid or expired verification code." };
      }
    }

    throw new Error("Cloud sync service is not available. Please connect Google Sheets in Settings, or change password directly using Current Password / Master PIN 50463.");
  }

  // ---------------------------------------------------------------------------
  // Standard Role & Permission Checks
  // ---------------------------------------------------------------------------
  canEditTask(task) {
    return this.isInputUnlocked();
  }

  canToggleMonthlyReport() {
    return this.isInputUnlocked();
  }

  canUploadPhoto() {
    return this.isInputUnlocked();
  }

  canRegenerateAI() {
    return this.isInputUnlocked();
  }

  canGenerateReport() {
    return true; // Reports and slides remain open for all
  }

  canManageSettings() {
    return true;
  }
}

const authManager = new AuthManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthManager, authManager, INPUT_AUTH_CONFIG };
} else if (typeof window !== 'undefined') {
  window.INPUT_AUTH_CONFIG = INPUT_AUTH_CONFIG;
  window.AuthManager = AuthManager;
  window.authManager = authManager;
}
