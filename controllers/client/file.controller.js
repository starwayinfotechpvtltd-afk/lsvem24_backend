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
