import Header from "./components/Header";
import GameList from "./components/GameList";
import type { Game } from "./components/GameCard";

// Mock data with new price structure (prices in cents)
const mockGames: Game[] = [
  {
    id: '1091500',
    name: 'Cyberpunk 2077',
    developer: 'CD PROJEKT RED',
    header_image: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
    original_price: 6680000,
    current_price: 3340000,
    predicted_discount: 50,
    predicted_period: '여름 세일'
  },
  {
    id: '1086940',
    name: "Baldur's Gate 3",
    developer: 'Larian Studios',
    header_image: 'https://cdn.akamai.steamstatic.com/steam/apps/1086940/header.jpg',
    original_price: 6600000,
    current_price: 6600000,
    predicted_discount: 15,
    predicted_period: '연말'
  },
  {
    id: '1145360',
    name: 'Hades',
    developer: 'Supergiant Games',
    header_image: 'https://cdn.akamai.steamstatic.com/steam/apps/1145360/header.jpg',
    original_price: 2600000,
    current_price: 1300000,
    predicted_discount: 50,
    predicted_period: '여름 세일'
  },
  {
    id: '413150',
    name: 'Stardew Valley',
    developer: 'ConcernedApe',
    header_image: 'https://cdn.akamai.steamstatic.com/steam/apps/413150/header.jpg',
    original_price: 1600000,
    current_price: 1600000,
    predicted_discount: 30,
    predicted_period: '시즌 오프'
  },
  {
    id: '292030',
    name: 'The Witcher 3: Wild Hunt',
    developer: 'CD PROJEKT RED',
    header_image: 'https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg',
    original_price: 4480000,
    current_price: 1120000,
    predicted_discount: 80,
    predicted_period: '특별 할인'
  }
];

// Filter games that have a prediction for the "Predicted" list
const predictedGames = mockGames.filter(g => g.predicted_discount);


function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto p-4 sm:p-6">
        <GameList title="곧 할인 예측" games={predictedGames} isPredictionList={true} />
        <GameList title="지금 인기있는 게임" games={mockGames} />
      </main>
    </div>
  );
}

export default App;
