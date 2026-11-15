/* ==========================================================================
   SYSTEM PORTAL — Runtime configuration
   --------------------------------------------------------------------------
   To enable real Google sign-in / account creation:

     1. Open https://console.cloud.google.com/apis/credentials
     2. Create an OAuth 2.0 Client ID of type "Web application".
     3. Authorise these origins in the client:
          https://system-portal.netlify.app
          https://appassets.androidplatform.net   (for the MONARCH app)
        Add http://127.0.0.1:8091 (and http://127.0.0.1:8090 if used) for local testing.
     4. Paste the client ID below (it ends in .apps.googleusercontent.com),
        then redeploy and rebuild MONARCH.apk.

   Until a real client ID is present, Google sign-in stays hidden and only
   local accounts (stored in this browser/device) and the admin account work.
   ========================================================================== */
window.SYSTEM_CONFIG = {
  appName: 'MONARCH',
  googleClientId: '',
  sessionHours: 12,
  // Built-in admin account for this local install.
  adminEmail: 'admin@system.local',
  adminName: 'System Admin',
  adminPassword: 'AriseAdmin#2026'
};
