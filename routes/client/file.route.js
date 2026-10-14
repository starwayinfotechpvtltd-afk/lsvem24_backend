//express
const express = require("express");
const route = express.Router();

//s3multer
const upload = require("../../util/uploadMiddleware");

//checkAccessWithSecretKey
const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const FileController = require("../../controllers/client/file.controller");

//upload content to storage
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

module.exports = route;
