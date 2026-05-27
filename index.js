//express
require("dotenv").config()
const express = require("express");
const app = express();

//cors
const cors = require("cors");

const allowedOrigins = process.env.FRONTEND_URLS?.split(",");

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // allow requests without origin (Postman, mobile apps)
//       if (!origin) return callback(null, true);

//       if (allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   })
// );

app.use(cors({
  origin: true,
  credentials: true
}));

// Razorpay webhook must use raw body for signature verification (before express.json)
const { razorpayWebhook } = require("./controllers/client/paymentWebhook.controller");
app.post(
  "/api/client/payment/razorpay/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    const raw =
      Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    req.rawBody = raw;
    try {
      req.body = raw ? JSON.parse(raw) : {};
    } catch {
      req.body = {};
    }
    next();
  },
  razorpayWebhook,
);

//logging middleware
var logger = require("morgan");
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//path
const path = require("path");


//node-cron
const cron = require("node-cron");

//moment
const moment = require("moment");

//connection.js
const db = require("./util/connection");

//fs
const fs = require("fs");

//socket io
const http = require("http");
const server = http.createServer(app);
global.io = require("socket.io")(server);

//import model
const Setting = require("./models/setting.model");

//settingJson
// const settingJson = require("./setting");

//Declare global variable
global.settingJSON = {};

//handle global.settingJSON when pm2 restart
async function initializeSettings() {
  try {
    const setting = await Setting.findOne().sort({ createdAt: -1 });
    if (setting) {
      console.log("In setting initialize Settings");
      global.settingJSON = setting;
    } else {
      global.settingJSON = {}; //settingJson
    }
  } catch (error) {
    console.error("Failed to initialize settings:", error);
  }
}  

//Declare the function as a global variable to update the setting.js file
// global.updateSettingFile = (settingData) => {
//   const settingJSON = JSON.stringify(settingData, null, 2);
//   fs.writeFileSync("setting.js", `module.exports = ${settingJSON};`, "utf8");

//   global.settingJSON = settingData; // Update global variable
//   console.log("Settings file updated.");
// };

db.on("error", console.error.bind(console, "Connection Error: "));
db.once("open", async () => {
  console.log("Mongo: successfully connected to db");

  try {
    await initializeSettings();
    console.log("Settings initialized on startup");
  } catch (e) {
    console.error("initializeSettings failed on startup:", e);
  }

  require("./socket");

  const routes = require("./routes/index");
  
  app.use('/api', routes);

  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  app.use(express.static(path.join(__dirname, "public")));
  
  // ✅ FIX: This catch-all route should be LAST and should NOT catch API routes
  app.get("/", (req, res) => {
    // Check if it's an API route
    // if (req.path.startsWith('/api')) {
    //   return res.status(404).json({ status: false, message: 'API route not found' });
    // }
    // res.status(200).sendFile(path.join(__dirname, "public", "index.html"));
    res.status(200).json({status: true, message: "Backend is running "})
  });

  const PORT = process.env.PORT || 5001;
  server.listen(PORT, '0.0.0.0', () => {
    console.log("Hello World ! listening on " + PORT);
  });
});



//import model
const Video = require("./models/video.model");
const User = require("./models/user.model");
const UserWiseSubscription = require("./models/userWiseSubscription.model");

//Schedule a task to run every 10 minutes for update scheduleType from 1 to 2
cron.schedule("*/10 * * * *", async () => {
  console.log("this function will run every 10 minutes...");

  const currentTime = moment().toISOString(); //get the current date and time
  console.log("currentTime: ", currentTime);

  await Video.updateMany(
    {
      scheduleType: 1,
      scheduleTime: { $lt: currentTime }, //less than today's date and time
    },
    { $set: { scheduleType: 2 } }
  );
});

//Schedule a task to update user's daily watch Ads
cron.schedule("0 0 * * *", async () => {
  await User.updateMany(
    {
      "watchAds.count": { $gt: 0 },
      "watchAds.date": { $ne: null },
    },
    {
      $set: {
        "watchAds.count": 0,
        "watchAds.date": null,
      },
    }
  );
});

//Schedule a task automatically unsubscribed from channel (less than 30 days)
cron.schedule("0 0 * * *", async () => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Find subscriptions older than 30 days
    const expiredSubscriptions = await UserWiseSubscription.find({ createdAt: { $lt: oneMonthAgo }, isPublic: false });

    // Unsubscribe all users with expired subscriptions
    for (const subscription of expiredSubscriptions) {
      await UserWiseSubscription.deleteOne({ _id: subscription._id });
      console.log(`User ${subscription.userId} automatically unsubscribed from channel ${subscription.channelId}`);
    }
  } catch (error) {
    console.error("Error in the cron job:", error);
  }
});
