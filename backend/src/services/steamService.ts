import axios from "axios";
import path from "path";
import fs from "fs/promises";
import { query } from "../db";

const STEAM_API_KEY = process.env.STEAM_API_KEY;

async function saveGameToDb(gameDetails: any) {
  const game = {
    id: gameDetails.steam_appid,
    name: gameDetails.name,
    developer: gameDetails.developers?.[0] || null,
    publisher: gameDetails.publishers?.[0] || null,
    release_date: gameDetails.release_date?.date || null,
    genres: gameDetails.genres?.map((g: any) => g.description) || null,
    tags: gameDetails.categories?.map((c: any) => c.description) || null,
    platforms: Object.keys(gameDetails.platforms).filter(
      (p) => gameDetails.platforms[p]
    ),
    metascore: gameDetails.metacritic?.score || null,
    user_reviews: gameDetails.recommendations?.total || null,
    overall_review: null,
  };

  const gameInsertQuery = `
    INSERT INTO games (id, name, developer, publisher, release_date, genres, tags, platforms, metascore, user_reviews, overall_review)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      developer = EXCLUDED.developer,
      publisher = EXCLUDED.publisher,
      release_date = EXCLUDED.release_date,
      genres = EXCLUDED.genres,
      tags = EXCLUDED.tags,
      platforms = EXCLUDED.platforms,
      metascore = EXCLUDED.metascore,
      user_reviews = EXCLUDED.user_reviews;
  `;

  const priceHistoryInsertQuery = `
    INSERT INTO price_history (game_id, price, discount_price, discount_percent, is_on_sale)
    VALUES ($1, $2, $3, $4, $5);
  `;

  try {
    await query(gameInsertQuery, [
      game.id,
      game.name,
      game.developer,
      game.publisher,
      game.release_date,
      game.genres,
      game.tags,
      game.platforms,
      game.metascore,
      game.user_reviews,
      game.overall_review,
    ]);
    console.log(`[DB] ✅ 게임 정보 저장 성공: ${game.name}`);

    if (gameDetails.price_overview) {
      const price = {
        game_id: game.id,
        price: gameDetails.price_overview.initial / 100,
        discount_price: gameDetails.price_overview.final / 100,
        discount_percent: gameDetails.price_overview.discount_percent,
        is_on_sale: gameDetails.price_overview.discount_percent > 0,
      };

      await query(priceHistoryInsertQuery, [
        price.game_id,
        price.price,
        price.discount_price,
        price.discount_percent,
        price.is_on_sale,
      ]);
      console.log(`[DB] ✅ 가격 정보 저장 성공: ${game.name}`);
    }
  } catch (error) {
    console.error(`[DB] ❌ 데이터베이스 저장 실패: ${game.name}`, error);
  }
}

export async function saveGameData() {
  const appsToProcess = [
    { appid: 1245620 },  // Elden Ring
    { appid: 413150  },  // Stardew Valley
    { appid: 1091500 },  // Cyberpunk 2077
    { appid: 271590  },  // GTA V
    { appid: 292030  },  // The Witcher 3
    { appid: 105600  },  // Terraria
    { appid: 281990  },  // Stellaris
    { appid: 255710  },  // Cities: Skylines
    { appid: 1145360 },  // Hades
    { appid: 1174180 },  // Red Dead Redemption 2
    { appid: 814380  },  // Sekiro
    { appid: 359550  },  // Rainbow Six Siege
    { appid: 367520 },  // Hollow Knight
    { appid: 1868140 },  // Dave the Diver
    { appid: 2050650 },  // Resident Evil 4 Remake
    { appid: 394360  },  // Hearts of Iron IV
    { appid: 22380   },  // Fallout: New Vegas
    { appid: 377160  },  // Fallout 4
    { appid: 1237970 },  // Titanfall® 2
    { appid: 230410  },  // Warframe
  ];

  let successCount = 0;
  let failCount = 0;

  for (const app of appsToProcess) {
    const appId = app.appid;
    try {
      const steamResponse = await axios.get(
        `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=kr`
      );
      const gameData = steamResponse.data;

      if (gameData && gameData[appId] && gameData[appId].success) {
        const details = gameData[appId].data;

        console.log(
          `- ✅ 상세 정보 가져오기 성공: ${details.name} (Type: ${details.type})`
        );
        await saveGameToDb(details);
        successCount++;
      } else {
        console.log(
          `- ❌ 앱 ID ${appId}는 유효하지 않거나 정보를 가져올 수 없습니다.`
        );
        failCount++;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`- ❌ 앱 ID ${appId} 처리 중 오류 발생.`);
      failCount++;
    }
  }

  const resultMessage = `\n데이터 처리 완료: 총 ${appsToProcess.length}개 중 ${successCount}개 성공, ${failCount}개 실패.`;
  console.log(resultMessage);

  return {
    success: true,
    message: resultMessage,
    total: appsToProcess.length,
    successCount,
    failCount,
  };
}

async function getSteamAppList(): Promise<{ appid: number; name: string }[]> {
  try {
    const response = await axios.get(
      `https://api.steampowered.com/IStoreService/GetAppList/v1?key=${STEAM_API_KEY}`
    );

    if (response.data?.response?.apps) {
      return response.data.response.apps;
    }
    return [];
  } catch (error) {
    console.error("스팀 앱 목록을 가져오는데 실패했습니다:", error);
    return [];
  }
}
