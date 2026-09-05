const admin = require("firebase-admin");

const initFirebase = async () => {
  try {
    if (admin.apps && admin.apps.length > 0) {
      return admin;
    }

    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        if (typeof process.env.FIREBASE_SERVICE_ACCOUNT === "object") {
          serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
        } else {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT.trim());
        }
      } catch (parseError) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT from .env:", parseError.message);
      }
    }

    if (!serviceAccount || !serviceAccount.project_id || !serviceAccount.private_key) {
      console.warn("⚠️ Firebase Admin SDK: FIREBASE_SERVICE_ACCOUNT is not configured in .env or missing project_id. Push notifications disabled.");
      return admin;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully from .env");
    return admin;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error.message || error);
    return admin;
  }
};

module.exports = initFirebase();
