const History = require("../models/history.model");
const WalletHistory = require("../models/walletHistory.model");

async function generateHistoryUniqueId() {
  let uniqueId;
  let exists = true;
  const length = 10;

  while (exists) {
    uniqueId =
      "#" +
      Math.random()
        .toString(36)
        .substring(2, 2 + length)
        .toUpperCase();

    exists = (await History.findOne({ uniqueId: uniqueId }).lean()) || (await WalletHistory.findOne({ uniqueId: uniqueId }).lean());
  }

  return uniqueId;
}

module.exports = { generateHistoryUniqueId };
