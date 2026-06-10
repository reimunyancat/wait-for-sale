import React, { useState, useEffect } from 'react';
import { searchSteamGames, addGame, SteamSearchItem } from '../services/api';
import './AddGameModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGameAdded: () => void;
}

export default function AddGameModal({ isOpen, onClose, onGameAdded }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SteamSearchItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
      setAddingId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        handleSearch(query);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSearch = async (q: string) => {
    setLoadingSearch(true);
    setError(null);
    try {
      const items = await searchSteamGames(q);
      setResults(items);
    } catch (err: any) {
      setError(err.response?.data?.message || '검색 중 오류가 발생했습니다.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleAdd = async (appid: number) => {
    setAddingId(appid);
    setError(null);
    try {
      const res = await addGame(appid);
      if (res.success) {
        alert(`${res.name ? res.name + '이(가)' : '게임이'} 추가되었습니다!`);
        onGameAdded();
        onClose();
      } else {
        setError(res.message || '추가에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '게임 추가 중 서버 오류가 발생했습니다.');
    } finally {
      setAddingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>새 게임 등록</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <input
            type="text"
            className="search-input full-width"
            placeholder="게임 이름 또는 Steam App ID 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          
          {error && <div className="modal-error">{error}</div>}
          
          <div className="search-results">
            {loadingSearch && <div className="modal-loading">검색 중...</div>}
            {!loadingSearch && results.length === 0 && query.trim() !== '' && !error && (
              <div className="modal-empty">검색 결과가 없습니다.</div>
            )}
            {!loadingSearch && results.map((item) => (
              <div key={item.id} className="search-item">
                <img src={item.tiny_image} alt={item.name} className="search-item-img" />
                <div className="search-item-info">
                  <div className="search-item-name">{item.name}</div>
                  <div className="search-item-price">
                    {item.price ? `${(item.price.final / 100).toLocaleString()} ${item.price.currency}` : '무료/가격 정보 없음'}
                  </div>
                </div>
                <button 
                  className="add-btn" 
                  onClick={() => handleAdd(item.id)}
                  disabled={addingId !== null}
                >
                  {addingId === item.id ? '추가 중...' : '추가'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
