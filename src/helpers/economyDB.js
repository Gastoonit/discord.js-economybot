const Economy = require("discord-economy-super/mongodb");
const config = require(`${process.cwd()}/src/json/client/bot.json`);

let eco = new Economy({
  connection: {
    connectionURI: config.MONGO_URL,
    collectionName: "Economy",
    dbName: "Economy",
  },
  deprecationWarnings: true,
  sellingItemPercent: 75,
  savePurchasesHistory: true,
  dailyAmount: 550,
  workAmount: [67, 999],
  weeklyAmount: 1000,
  dailyCooldown: 60000 * 60 * 24,
  workCooldown: 300000,
  weeklyCooldown: 60000 * 60 * 24 * 7,
  dateLocale: "es",
  errorHandler: {
		handleErrors: true,
		attempts: 5,
		time: 3000,
	},
	optionsChecker: {
		ignoreInvalidTypes: false,
		ignoreUnspecifiedOptions: true,
		ignoreInvalidOptions: false,
		showProblems: true,
		sendLog: true,
		sendSuccessLog: false,
	},
});

eco.on("ready", async (economy) => {
  eco = economy;
  console.log("👍 | Economy!");
});
module.exports = eco;
