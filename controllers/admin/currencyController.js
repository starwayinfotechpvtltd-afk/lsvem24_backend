const Currency = require("../../models/currency.model");

//import model
const Setting = require("../../models/setting.model");

exports.store = async (req, res) => {
  try {
    if (!req.body.name || !req.body.symbol || !req.body.countryCode || !req.body.currencyCode) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const currency = new Currency();

    currency.name = req.body.name;
    currency.symbol = req.body.symbol;
    currency.countryCode = req.body.countryCode;
    currency.currencyCode = req.body.currencyCode;
    await currency.save();

    return res.status(200).json({
      status: true,
      message: "currency create Successfully",
      currency,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server error",
    });
  }
};

exports.get = async (req, res) => {
  try {
    const currency = await Currency.find().sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "Currency fetch Successfully",
      currency,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

exports.update = async (req, res) => {
  try {
    const currencyId = req.query.currencyId;
    if (!currencyId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const currency = await Currency.findById(currencyId);
    if (!currency) {
      return res.status(200).json({ status: false, message: "Currency does not found." });
    }

    currency.name = req.body.name ? req.body.name : req.body.name;
    currency.symbol = req.body.symbol ? req.body.symbol : req.body.symbol;
    currency.countryCode = req.body.countryCode ? req.body.countryCode : req.body.countryCode;
    currency.currencyCode = req.body.currencyCode ? req.body.currencyCode : req.body.currencyCode;
    await currency.save();

    return res.status(200).json({
      status: true,
      message: "Currency updated Successfully",
      currency,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server error",
    });
  }
};

exports.defaultCurrency = async (req, res) => {
  try {
    const currencyId = req.query.currencyId;
    if (!currencyId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const [currency, setting, updateCurrencies] = await Promise.all([Currency.findById(currencyId), Setting.findOne().sort({ createdAt: -1 }), Currency.updateMany({}, { isDefault: false })]);

    if (!currency) {
      return res.status(200).json({ status: false, message: "Currency does not found." });
    }

    if (!setting) {
      return res.status(200).json({ status: false, message: "Setting does not found." });
    }

    currency.isDefault = true;
    setting.currency = {
      name: currency.name,
      symbol: currency.symbol,
      countryCode: currency.countryCode,
      currencyCode: currency.currencyCode,
      isDefault: currency.isDefault,
    };

    await Promise.all([currency.save(), setting.save()]);

    const allCurrency = await Currency.find().sort({ createdAt: -1 });

    res.status(200).json({
      status: true,
      message: "Default Currency updated Successfully",
      allCurrency,
    });

    updateSettingFile(setting);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server error",
    });
  }
};

exports.destroy = async (req, res) => {
  try {
    const currencyId = req.query.currencyId;
    if (!currencyId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const [currency, currencyCount] = await Promise.all([Currency.findById(currencyId), Currency.countDocuments()]);

    if (!currency) {
      return res.status(200).json({ status: false, message: "Oops ! Currency does not found." });
    }

    if (currencyCount === 1) {
      return res.status(200).json({ status: false, message: "You cannot delete the last currency." });
    }

    if (currency.isDefault) {
      return res.status(200).json({ status: false, message: "The default currency could not be deleted." });
    }

    await currency.deleteOne();

    return res.status(200).json({ status: true, message: "Currency deleted Successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server error" });
  }
};

exports.getDefault = async (req, res) => {
  try {
    const currency = await Currency.findOne({ isDefault: true });

    return res.status(200).json({
      status: true,
      message: "Currency fetch Successfully",
      currency,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
