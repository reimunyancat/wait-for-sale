import GameCard, { type Game } from './GameCard';

interface GameListProps {
  title: string;
  games: Game[];
  isPredictionList?: boolean;
  onGameClick?: (id: string) => void;
}

export default function GameList({ title, games, isPredictionList = false, onGameClick }: GameListProps) {
  if (!games || games.length === 0) return null;

  return (
    <section className="game-section">
      {title && <h2 className="game-section__title">{title}</h2>}
      <div className="game-grid">
        {games.map(game => (
          <GameCard key={game.id} game={game} isPrediction={isPredictionList} onClick={onGameClick} />
        ))}
      </div>
    </section>
  );
}
