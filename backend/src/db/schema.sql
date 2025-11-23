CREATE TABLE IF NOT EXISTS games (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    developer VARCHAR(255),
    publisher VARCHAR(255),
    release_date DATE,
    genres TEXT[],
    tags TEXT[],
    platforms TEXT[],
    metascore INTEGER,
    user_reviews INTEGER,
    overall_review VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL REFERENCES games(id),
    price NUMERIC(10, 2) NOT NULL,
    discount_price NUMERIC(10, 2),
    discount_percent NUMERIC(5, 2),
    is_on_sale BOOLEAN NOT NULL,
    recorded_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
