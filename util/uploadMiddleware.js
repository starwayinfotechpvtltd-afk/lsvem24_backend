const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const fs = require("fs");
const path = require("path");

const createS3Instance = (hostname, accessKeyId, secretAccessKey) => {
  if (!hostname || !accessKeyId || !secretAccessKey) return null;
  return new aws.S3({
    accessKeyId,
    secretAccessKey,
    endpoint: new aws.Endpoint(hostname),
    s3ForcePathStyle: true,
  });
};

const localStoragePath = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(localStoragePath)) {
  fs.mkdirSync(localStoragePath, { recursive: true });
}

const getStorage = (activeStorage) => {
  if (activeStorage === "digitalocean") {
    const doS3 = createS3Instance(settingJSON.doHostname, settingJSON.doAccessKey, settingJSON.doSecretKey);
    if (doS3 && settingJSON.doBucketName) {
      return multerS3({
        s3: doS3,
        bucket: settingJSON.doBucketName,
        acl: "public-read",
        key: (req, file, cb) => {
          const folder = req.body.folderStructure || "uploads";
          cb(null, `${folder}/${file.originalname}`);
        },
      });
    }
  }

  if (activeStorage === "aws") {
    const awsClient = createS3Instance(settingJSON.awsHostname, settingJSON.awsAccessKey, settingJSON.awsSecretKey);
    if (awsClient && settingJSON.awsBucketName) {
      return multerS3({
        s3: awsClient,
        bucket: settingJSON.awsBucketName,
        key: (req, file, cb) => {
          const folder = req.body.folderStructure || "uploads";
          cb(null, `${folder}/${file.originalname}`);
        },
      });
    }
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, localStoragePath);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  });
};

const getActiveStorage = async () => {
  const settings = settingJSON || {};
  if (settings.storage?.local) return "local";
  if (settings.storage?.awsS3) return "aws";
  if (settings.storage?.digitalOcean) return "digitalocean";
  return "local"; // Fallback to local storage if no storage is active
};

const uploadMiddleware = async (req, res, next) => {
  try {
    const activeStorage = await getActiveStorage();

    const upload = multer({
      storage: getStorage(activeStorage),
      limits: {
        fileSize: Infinity, // Support any file size
        fieldSize: 500 * 1024 * 1024, // 500MB field limit
        fields: 100,
        files: 20,
      },
    }).single("content");

    upload(req, res, (err) => {
      if (err) {
        console.error("Multer upload error:", err);
        return res.status(500).json({
          status: false,
          message: err.message || "File upload failed",
        });
      }
      next();
    });
  } catch (error) {
    console.error("uploadMiddleware error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = uploadMiddleware;
