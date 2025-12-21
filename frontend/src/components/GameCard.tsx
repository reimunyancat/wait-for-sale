// Updated interface to support strikethrough pricing
export interface Game {
  id: string;
  name: string;
  developer: string;
  header_image: string;
  original_price?: number; // Price in cents
  current_price?: number; // Price in cents
  predicted_discount?: number;
  predicted_period?: string;
}

interface GameCardProps {
  game: Game;
  isPrediction: boolean;
}

// Helper to format price from cents to a currency string
const formatPrice = (priceInCents: number) => `₩${(priceInCents / 100).toLocaleString()}`;

export default function GameCard({ game, isPrediction }: GameCardProps) {
  // Determine if there's a discount to show
  const hasDiscount = typeof game.original_price === 'number' && typeof game.current_price === 'number' && game.original_price > game.current_price;

  return (
    <div className="bg-slate-800/50 rounded-lg shadow-md hover:shadow-blue-400/20 transition-all duration-300 transform hover:-translate-y-1 group cursor-pointer flex flex-col">
      <img src={game.header_image} alt={game.name} className="w-full h-28 object-cover rounded-t-lg" />
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="text-base font-bold text-gray-100 truncate flex-grow min-h-[40px]">{game.name}</h3>
        <p className="text-xs text-gray-400 mt-1">{game.developer}</p>
        
        {isPrediction && game.predicted_discount && (
          <div className="my-2 p-2 bg-blue-900/30 rounded-md">
            <p className="text-xs font-bold text-blue-300">AI 할인 예측</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-cyan-400">-{game.predicted_discount}%</span>
              <span className="text-xs text-gray-400">{game.predicted_period}</span>
            </div>
          </div>
        )}

        <div className="mt-auto pt-2 flex justify-end items-center gap-2">
          {hasDiscount ? (
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 line-through">{formatPrice(game.original_price!)}</span>
              <span className="text-base font-semibold text-green-400">{formatPrice(game.current_price!)}</span>
            </div>
          ) : (
            <span className="text-base font-semibold text-gray-300">
              {game.current_price ? formatPrice(game.current_price) : 'N/A'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
