import axios from "axios";
import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config();

const STEAM_API_KEY = process.env.STEAM_API_KEY;

export async function saveGameData() {
  console.log("스팀 전체 게임 목록을 가져오는 중...");
  const apps = await getSteamAppList();

  console.log(`총 ${apps.length}개의 게임을 찾았습니다.`);
  const appsToProcess = apps.slice(1000, 1020);
  console.log(`Processing the first ${appsToProcess.length} games...`);

  const allGamesData: any[] = [];

  for (const app of appsToProcess) {
    const appId = app.appid;
    try {
      const steamResponse = await axios.get(
        `https://store.steampowered.com/api/appdetails?appids=${appId}`
      );
      const gameData = steamResponse.data;

      if (gameData && gameData[appId] && gameData[appId].success) {
        const details = gameData[appId].data;
        console.log(`- 상세 정보 가져오기 성공: ${details.name}`);

        try {
          const cheapSharkResponse = await axios.get(
            `https://www.cheapshark.com/api/1.0/games?steamAppID=${appId}`
          );
          details.price_history = cheapSharkResponse.data;
        } catch (error) {
          console.error(`  - ${details.name}의 가격 정보 조회를 실패했습니다.`);
        }

        allGamesData.push(details);
      } else {
        console.log(`- 앱 ID ${appId}의 데이터를 가져오지 못했습니다.`);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`- 앱 ID ${appId} 처리 중 오류 발생.`);
    }
  }

  const filePath = path.join(__dirname, "..", "..", "games-data.json");
  await fs.writeFile(filePath, JSON.stringify(allGamesData, null, 2));

  console.log(
    `\n데이터 저장 완료: ${allGamesData.length}개의 게임 정보가 ${filePath}에 저장되었습니다.`
  );
  return {
    success: true,
    message: "Game data fetched and saved.",
    count: allGamesData.length,
    path: filePath,
  };
}

async function getSteamAppList(): Promise<{ appid: number; name: string }[]> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    throw new Error("STEAM_API_KEY가 .env 파일에 없습니다");
  }

  try {
    const response = await axios.get(
      `https://api.steampowered.com/IStoreService/GetAppList/v1?key=${apiKey}`
    );

    if (response.data && response.data.response && response.data.response.apps)
      return response.data.response.apps;

    return [];
  } catch (error) {
    console.error("스팀 앱 목록을 가져오는데 실패했습니다:", error);
    return [];
  }
}
