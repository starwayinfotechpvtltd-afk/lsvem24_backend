module.exports = () => {
  return (req, res, next) => {
    const token = req.headers.key || req.body.key || req.query.key;

    if (token) {
      if (token == process?.env?.SECRET_KEY) {
        next();
      } else {
        return res.status(400).json({ status: false, error: "Unauthorized access!" });
      }
    } else {
      return res.status(400).json({ status: false, error: "Unauthorized access!" });
    }
  };
};
