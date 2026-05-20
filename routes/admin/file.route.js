//express
const express = require("express");
const route = express.Router();

//s3multer
const upload = require("../../util/uploadMiddleware");

//checkAccessWithSecretKey
const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const FileController = require("../../controllers/admin/file.controller");

//upload content to digital ocean storage
route.post(
  "/upload-file",
  function (request, response, next) {
    upload(request, response, function (error) {
      if (error) {
        console.log("error in file ", error);
      } else {
        console.log("File uploaded successfully.");
        next();
      }
    });
  },
  checkAccessWithSecretKey(),
  FileController.uploadContent
);

module.exports = route;
