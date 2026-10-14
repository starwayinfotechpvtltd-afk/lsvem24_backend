//express
const express = require("express");
const route = express.Router();

//s3multer
const upload = require("../../util/uploadMiddleware");

//checkAccessWithSecretKey
const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const FileController = require("../../controllers/admin/file.controller");

//upload content to storage
route.post(
  "/upload-file",
  checkAccessWithSecretKey(),
  function (request, response, next) {
    upload(request, response, function (error) {
      if (error) {
        console.error("error in admin file upload: ", error);
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
