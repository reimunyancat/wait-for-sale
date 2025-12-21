import GameCard, { type Game } from './GameCard';

interface GameListProps {
  title: string;
  games: Game[];
  isPredictionList?: boolean;
}

export default function GameList({ title, games, isPredictionList = false }: GameListProps) {
  if (!games || games.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-5 text-gray-200">{title}</h2>
      {/* Denser grid for more compact card layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
        {games.map(game => (
          <GameCard key={game.id} game={game} isPrediction={isPredictionList} />
        ))}
      </div>
    </section>
  );
}
