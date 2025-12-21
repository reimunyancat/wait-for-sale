import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSearchClick = () => {
    onSearch(query);
  };

  return (
    <div className="p-4">
      <div className="flex justify-center">
        <input
          type="text"
          placeholder="게임 이름을 입력하세요..."
          className="w-full max-w-md p-2 rounded-l-lg bg-gray-700 text-white border-2 border-gray-600 focus:outline-none focus:border-blue-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-r-lg border-2 border-blue-600 hover:border-blue-700"
          onClick={handleSearchClick}
        >
          검색
        </button>
      </div>
    </div>
  );
}
