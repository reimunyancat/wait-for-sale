require("dotenv").config();
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const STEAM_API_KEY = process.env.STEAM_API_KEY;

async function test() {
  const gamelist = [3240220, 227300, 394360, 3241660];
  const allGamesData = [];
  for (const appId of gamelist) {
    const steamResponse = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`
    );
    const gameData = steamResponse.data;

    try {
      const cheapSharkResponse = await axios.get(
        `https://www.cheapshark.com/api/1.0/games?steamAppID=${appId}`
      );
      if (gameData[appId].success) {
        gameData[appId].data.price_history = cheapSharkResponse.data;
      }
    } catch (error) {
      console.error(
        `Could not fetch price history for app ${appId}:`,
        error.message
      );
    }

    allGamesData.push(gameData);

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const filePath = path.join(__dirname, "games-data.json");
  fs.writeFileSync(filePath, JSON.stringify(allGamesData, null, 2));

  console.log("데이터 저장 완료:", filePath);
}

test();
