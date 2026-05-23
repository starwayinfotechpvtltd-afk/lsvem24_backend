const getFirebaseAdmin = require("./privateKey");

/**
 * Send FCM push safely — never throws (avoids crashing API after res.json).
 */
async function sendFcmMessage(payload) {
  try {
    const adminInstance = await getFirebaseAdmin;
    if (!adminInstance?.messaging) {
      return;
    }
    const response = await adminInstance.messaging().send(payload);
    console.log("FCM sent:", response);
  } catch (error) {
    console.log("FCM send skipped:", error?.message || error);
  }
}

module.exports = { sendFcmMessage };
