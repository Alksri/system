/* ==========================================================================
   SYSTEM PORTAL — Runtime configuration
   --------------------------------------------------------------------------
   To enable real Google Sign-In:
     1. Open https://console.cloud.google.com/apis/credentials
     2. Create an OAuth 2.0 Client ID of type "Web application".
     3. Add http://localhost:8090 to "Authorised JavaScript origins".
     4. Paste the client ID below (it ends in .apps.googleusercontent.com).
   Until a real client ID is present, Google Sign-In stays disabled and the
   site uses local accounts only. Nothing is faked.
   ========================================================================== */
window.SYSTEM_CONFIG = {
  appName: 'System Portal',
  googleClientId: '',
  sessionHours: 12,
  // Built-in admin account for this local install.
  // Change these if you want different credentials.
  adminEmail: 'admin@system.local',
  adminName: 'System Admin',
  adminPassword: 'AriseAdmin#2026'
};
