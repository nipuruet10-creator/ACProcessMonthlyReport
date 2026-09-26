/**
 * Process Development Monthly Report Automation System
 * Module: Authentication & Role-Based Access Control (RBAC)
 * Specialized: Protected Input Section Authentication & Email OTP Recovery
 * WALTON Hi-Tech Industries PLC
 */

const INPUT_AUTH_CONFIG = {
  DEFAULT_USER: "admin",
  DEFAULT_PASS: "ACprocess@2026",
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
      if (session && session.unlocked === true) return true;
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
    const clean = String(code).trim().toLowerCase();
    const authorizedPins = [
      "50463",            // Engr. Md. Sazzad Hossain
      "44819",            // Kamrul Hasan
      "54634",            // Faiyaz
      "51121",            // Walton ID
      "walton2026",       // Walton Team Key
      "walton",
      "admin",
      "admin50463",
      "acprocess@2026",   // Official System Password
      "acprocess@20226",  // Legacy Typo Compatibility
      "104867",
      "104868",
      "104869",
      "104870"
    ];
    return authorizedPins.includes(clean);
  }

  /**
   * Unlocks the Input Section with username & password (supports password or Master PIN)
   */
  async unlockInput(username, password, remember = true) {
    const cleanPass = (password || '').trim();

    if (!cleanPass) {
      return { success: false, error: "Please enter the password." };
    }

    // 1. Check against local active password, default password, or master PIN
    const currentExpected = this.getActivePassword().trim();
    let isMatch = (cleanPass.toLowerCase() === currentExpected.toLowerCase()) || 
                  (cleanPass.toLowerCase() === INPUT_AUTH_CONFIG.DEFAULT_PASS.toLowerCase()) ||
                  (cleanPass.toLowerCase() === "acprocess@2026") ||
                  (cleanPass.toLowerCase() === "acprocess@20226") ||
                  this.isMasterPin(cleanPass);

    // 2. If mismatch but connected to Google Apps Script, verify with cloud backend (race with 3s timeout)
    if (!isMatch && typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getWebAppUrl()) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
        const cloudVerify = await Promise.race([
          GoogleSheetsSync.verifyInputAuth(username || 'admin', cleanPass),
          timeoutPromise
        ]);
        if (cloudVerify && cloudVerify.valid) {
          isMatch = true;
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
          user: username || INPUT_AUTH_CONFIG.DEFAULT_USER,
          timestamp: Date.now()
        });
      }
      return { success: true };
    }

    return { 
      success: false, 
      error: "Incorrect password. Please try again." 
    };
  }

  /**
   * Locks the Input Section immediately
   */
  lockInput() {
    this._inMemoryUnlocked = false;
    if (typeof HELPERS !== 'undefined' && HELPERS.storage) {
      HELPERS.storage.set(INPUT_AUTH_CONFIG.STORAGE_KEY_SESSION, {
        unlocked: false,
        timestamp: Date.now()
      });
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
      return { success: false, error: "Please enter your current password or Master PIN." };
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
        error: "Incorrect current password or Master PIN." 
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
    throw new Error("Cloud sync service is not available. Please connect Google Sheets in Settings, or change password directly using Current Password / Master PIN.");
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

    throw new Error("Cloud sync service is not available. Please connect Google Sheets in Settings, or change password directly using Current Password / Master PIN.");
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
