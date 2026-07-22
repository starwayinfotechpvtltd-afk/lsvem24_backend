const Video = require("../../models/video.model");
const User = require("../../models/user.model");
const mongoose = require("mongoose");

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.lsvem24.app&pcampaignid=web_share";

function getSmartAppRedirectHtml({ title, description, image, deepLinkUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || "LSVEM24"}</title>
  <meta property="og:title" content="${title || "LSVEM24"}" />
  <meta property="og:description" content="${description || "Watch on LSVEM24"}" />
  ${image ? `<meta property="og:image" content="${image}" />` : ""}
  <meta http-equiv="refresh" content="1;url=${PLAY_STORE_URL}" />
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f0f0f;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
      padding: 20px;
    }
    .spinner {
      border: 4px solid rgba(255,255,255,0.1);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border-left-color: #ff0000;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .btn {
      background-color: #ff0000;
      color: #fff;
      padding: 12px 24px;
      border-radius: 25px;
      text-decoration: none;
      font-weight: bold;
      margin-top: 15px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2>Opening LSVEM24...</h2>
  <p>If the app is not installed, you will be redirected to the Play Store to download LSVEM24.</p>
  <a id="downloadBtn" href="${PLAY_STORE_URL}" class="btn">Get LSVEM24 on Play Store</a>

  <script>
    (function() {
      var playStoreUrl = "${PLAY_STORE_URL}";
      var deepLink = "${deepLinkUrl}";

      if (/android/i.test(navigator.userAgent)) {
        var intentUrl = "intent://" + deepLink.replace(/^https?:\/\//, "") + "#Intent;scheme=https;package=com.lsvem24.app;S.browser_fallback_url=" + encodeURIComponent(playStoreUrl) + ";end;";
        window.location.href = intentUrl;
      } else {
        window.location.replace(playStoreUrl);
      }

      setTimeout(function() {
        window.location.replace(playStoreUrl);
      }, 800);
    })();
  </script>
</body>
</html>`;
}

exports.openVideoShareLink = async (req, res) => {
  try {
    const { slugOrId } = req.params;

    if (!slugOrId) {
      return res.redirect(PLAY_STORE_URL);
    }

    let filter = {
      $or: [
        { slug: slugOrId },
        { uniqueVideoId: slugOrId }
      ]
    };

    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      filter.$or.push({ _id: slugOrId });
    }

    const video = await Video.findOne(filter);

    if (!video) {
      return res.redirect(PLAY_STORE_URL);
    }

    const isShort = video.videoType === 2;
    const prefix = isShort ? "shorts" : "videos";
    const slugVal = video.slug || video._id;
    const deepLinkUrl = `https://lsvem24.com/${prefix}/${slugVal}`;

    const html = getSmartAppRedirectHtml({
      title: video.title || "LSVEM24 Video",
      description: video.description || "Watch this video on LSVEM24 app",
      image: video.videoImage || "",
      deepLinkUrl,
    });

    return res.status(200).send(html);
  } catch (error) {
    console.error("openVideoShareLink error:", error);
    return res.redirect(PLAY_STORE_URL);
  }
};

exports.openReferralShareLink = async (req, res) => {
  try {
    const { referralCode } = req.params;

    if (!referralCode) {
      return res.redirect(PLAY_STORE_URL);
    }

    const user = await User.findOne({
      referralCode: referralCode.trim(),
      isActive: true,
    });

    if (!user) {
      return res.redirect(PLAY_STORE_URL);
    }

    const deepLinkUrl = `https://lsvem24.com/invite/${user.referralCode}`;

    const html = getSmartAppRedirectHtml({
      title: `Join ${user.fullName || "LSVEM24"}`,
      description: `Use referral code ${user.referralCode} when joining LSVEM24!`,
      image: user.image || "",
      deepLinkUrl,
    });

    return res.status(200).send(html);
  } catch (error) {
    console.error("openReferralShareLink error:", error);
    return res.redirect(PLAY_STORE_URL);
  }
};
