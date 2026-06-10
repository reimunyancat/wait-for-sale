import GameCard, { type Game } from './GameCard';

interface GameListProps {
  title: string;
  games: Game[];
  isPredictionList?: boolean;
}

export default function GameList({ title, games, isPredictionList = false }: GameListProps) {
  if (!games || games.length === 0) return null;

  return (
    <section className="game-section">
      <h2 className="game-section__title">{title}</h2>
      <div className="game-grid">
        {games.map(game => (
          <GameCard key={game.id} game={game} isPrediction={isPredictionList} />
        ))}
      </div>
    </section>
  );
}
