const path = require("path");
const fs = require("fs");

const getActiveStorage = async () => {
  const settings = settingJSON; // Replace this with actual settings loading logic if necessary

  if (settings.storage.local) return "local";
  if (settings.storage.awsS3) return "aws";
  if (settings.storage.digitalOcean) return "digitalocean";

  return "local"; // Fallback to local storage if no active storage is found
};

//uploadContent
exports.uploadContent = async (req, res) => {
  try {
    if (!req.body?.folderStructure) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    if (!req?.file) {
      return res.status(200).json({ status: false, message: "Please upload a valid files." });
    }

    let url = "";
    const activeStorage = await getActiveStorage();

    if (activeStorage === "local") {
      url = `${process.env.baseURL}/uploads/${req.file.originalname}`;
    } else if (activeStorage === "digitalocean") {
      url = `${settingJSON?.doEndpoint}/${req.body.folderStructure}/${req.file.originalname}`;
    } else if (activeStorage === "aws") {
      url = `${settingJSON.awsEndpoint}/${req.body.folderStructure}/${req.file.originalname}`;
    }

    return res.status(200).json({
      status: true,
      message: "File uploaded successfully",
      url,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Chunked Upload  (handles videos of any size without timeout failures)
// ─────────────────────────────────────────────────────────────────────────────
// Flow:
//   1. Client sends each chunk as:  PUT /upload-chunk
//      fields:  uploadId, chunkIndex, totalChunks, folderStructure, keyName
//      file:    content  (the raw chunk bytes)
//   2. When all chunks arrive the server assembles them into the final file.
//   3. The server returns { status: true, url, done: true } on the last chunk.
// ─────────────────────────────────────────────────────────────────────────────

const CHUNK_TMP_DIR = path.join(__dirname, "../../uploads/chunks");

// Ensure chunk temp dir exists on startup
if (!fs.existsSync(CHUNK_TMP_DIR)) {
  fs.mkdirSync(CHUNK_TMP_DIR, { recursive: true });
}

exports.uploadChunk = async (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, folderStructure, keyName } = req.body;

    if (!uploadId || chunkIndex === undefined || !totalChunks || !folderStructure || !keyName) {
      return res.status(200).json({ status: false, message: "Missing required chunk fields." });
    }

    if (!req?.file) {
      return res.status(200).json({ status: false, message: "No chunk data received." });
    }

    const idx = parseInt(chunkIndex, 10);
    const total = parseInt(totalChunks, 10);

    // Save the incoming chunk with its index so parallel/out-of-order chunks work
    const chunkDir = path.join(CHUNK_TMP_DIR, uploadId);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }

    const chunkPath = path.join(chunkDir, `chunk_${idx}`);
    // req.file.path is set by multer diskStorage (uploadMiddleware saves to uploads/)
    // Move it into our chunk directory
    fs.renameSync(req.file.path, chunkPath);

    console.log(`[ChunkUpload] Received chunk ${idx + 1}/${total} for uploadId=${uploadId}`);

    // Check how many chunks we have so far
    const received = fs.readdirSync(chunkDir).filter((f) => f.startsWith("chunk_")).length;

    if (received < total) {
      // More chunks to come — just acknowledge
      return res.status(200).json({
        status: true,
        done: false,
        message: `Chunk ${idx + 1}/${total} received`,
        received,
        total,
      });
    }

    // ── All chunks received — assemble the final file ──────────────────────
    console.log(`[ChunkUpload] All ${total} chunks received for ${uploadId}. Assembling...`);

    const uploadsDir = path.join(__dirname, "../../uploads");
    const finalFileName = keyName;
    const finalFilePath = path.join(uploadsDir, finalFileName);

    const writeStream = fs.createWriteStream(finalFilePath);

    for (let i = 0; i < total; i++) {
      const cp = path.join(chunkDir, `chunk_${i}`);
      if (!fs.existsSync(cp)) {
        writeStream.destroy();
        return res.status(200).json({ status: false, message: `Missing chunk ${i} during assembly.` });
      }
      const data = fs.readFileSync(cp);
      writeStream.write(data);
    }

    await new Promise((resolve, reject) => {
      writeStream.end();
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Cleanup chunk temp directory
    try {
      fs.rmSync(chunkDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn("[ChunkUpload] Chunk cleanup warning:", cleanupErr.message);
    }

    console.log(`[ChunkUpload] Assembly complete: ${finalFilePath}`);

    // Build the public URL exactly as the regular upload does
    const activeStorage = await getActiveStorage();
    let url = "";

    if (activeStorage === "local") {
      url = `${process.env.baseURL}/uploads/${finalFileName}`;
    } else if (activeStorage === "digitalocean") {
      url = `${settingJSON?.doEndpoint}/${folderStructure}/${finalFileName}`;
    } else if (activeStorage === "aws") {
      url = `${settingJSON.awsEndpoint}/${folderStructure}/${finalFileName}`;
    }

    return res.status(200).json({
      status: true,
      done: true,
      message: "File assembled successfully",
      url,
    });
  } catch (error) {
    console.error("[ChunkUpload] Error:", error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};
