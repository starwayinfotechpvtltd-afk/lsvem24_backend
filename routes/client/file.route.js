//express
const express = require("express");
const route = express.Router();

//s3multer
const upload = require("../../util/uploadMiddleware");

//checkAccessWithSecretKey
const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const FileController = require("../../controllers/client/file.controller");

//upload content to storage (regular single-file upload)
route.put(
  "/upload-file",
  checkAccessWithSecretKey(),
  function (request, response, next) {
    upload(request, response, function (error) {
      if (error) {
        console.error("error in file upload: ", error);
        return response.status(500).json({
          status: false,
          message: error.message || "File upload failed",
        });
      } else {
        console.log("File uploaded successfully.");
        next();
      }
    });
  },
  FileController.uploadContent
);

// Chunked upload endpoint — each request carries one chunk of the final file.
// Multer stores the chunk to disk; controller assembles when all chunks arrive.
route.put(
  "/upload-chunk",
  checkAccessWithSecretKey(),
  function (request, response, next) {
    upload(request, response, function (error) {
      if (error) {
        console.error("error in chunk upload: ", error);
        return response.status(500).json({
          status: false,
          message: error.message || "Chunk upload failed",
        });
      } else {
        next();
      }
    });
  },
  FileController.uploadChunk
);

module.exports = route;
