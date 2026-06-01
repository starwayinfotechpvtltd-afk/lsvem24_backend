const admin = require("firebase-admin");

let initPromise = null;

function initFirebase() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const serviceAccountString =
          process.env.FIREBASE_SERVICE_ACCOUNT;

        if (!serviceAccountString) {
          console.warn(
            "Firebase privateKey not configured — push notifications disabled."
          );
          return null;
        }

        const serviceAccount = JSON.parse(
          serviceAccountString
        );

        if (!serviceAccount.project_id) {
          console.warn(
            "Firebase privateKey not configured — push notifications disabled."
          );
          return null;
        }

        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(
              serviceAccount
            ),
          });

          console.log(
            "Firebase Admin SDK initialized successfully"
          );
        }

        return admin;
      } catch (error) {
        console.error(
          "Failed to initialize Firebase Admin SDK:",
          error
        );
        return null;
      }
    })();
  }

  return initPromise;
}

module.exports = initFirebase();