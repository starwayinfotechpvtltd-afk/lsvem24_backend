//mongoose
const mongoose = require("mongoose");

mongoose.connect(process?.env?.MONGODB_CONNECTION_STRING, {});

//mongoose connection
const db = mongoose.connection;

module.exports = db;
