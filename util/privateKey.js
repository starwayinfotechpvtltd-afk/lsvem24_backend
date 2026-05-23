const admin = require("firebase-admin");

let initPromise = null;

function initFirebase() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const serviceAccount = global.settingJSON?.privateKey;

        if (
          !serviceAccount ||
          typeof serviceAccount !== "object" ||
          !serviceAccount.project_id
        ) {
          console.warn(
            "Firebase privateKey not configured — push notifications disabled.",
          );
          return null;
        }

        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          console.log("Firebase Admin SDK initialized successfully");
        }

        return admin;
      } catch (error) {
        console.error("Failed to initialize Firebase Admin SDK:", error.message);
        return null;
      }
    })();
  }
  return initPromise;
}

module.exports = initFirebase();
