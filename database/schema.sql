-- ================================================
-- BAD MOVIES PORTAL - POSTGRESQL SCHEMA
-- ================================================
-- A comprehensive schema for managing "bad movie viewing experiments"
-- Based on learnings from the previous PocketBase implementation
-- Designed for WordPress/Pods integration and TMDb enrichment

-- ================================================
-- CORE TABLES
-- ================================================

-- Movies table - The heart of the system
-- Contains all movie metadata, matching WordPress Pods structure
CREATE TABLE movies (
    id SERIAL PRIMARY KEY,
    
    -- Core movie information
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    slug VARCHAR(255) UNIQUE,
    year INTEGER,
    release_date DATE,
    runtime INTEGER, -- in minutes
    tagline TEXT,
    overview TEXT,
    content_rating VARCHAR(10), -- PG, PG-13, R, etc.
    
    -- Financial information
    budget BIGINT,
    box_office BIGINT,
    revenue BIGINT,
    
    -- Media assets
    poster_url TEXT,
    backdrop_url TEXT,
    trailer_url TEXT,
    
    -- External API integration
    tmdb_id INTEGER UNIQUE,
    tmdb_url TEXT,
    tmdb_rating DECIMAL(3,1), -- 0.0 to 10.0
    tmdb_votes INTEGER,
    tmdb_popularity DECIMAL(8,3),
    imdb_id VARCHAR(20),
    imdb_url TEXT,
    
    -- Affiliate monetization
    amazon_link TEXT,
    netflix_link TEXT,
    hulu_link TEXT,
    disney_plus_link TEXT,
    prime_video_link TEXT,
    
    -- Metadata
    status VARCHAR(20) DEFAULT 'released', -- released, in_production, post_production, etc.
    language_code VARCHAR(5), -- ISO language code
    adult BOOLEAN DEFAULT FALSE,
    video BOOLEAN DEFAULT FALSE, -- is it a TV movie/video release
    
    -- WordPress integration
    wordpress_id INTEGER UNIQUE,
    pods_data JSONB, -- Store original Pods data structure
    
    -- System fields
    sync_status VARCHAR(20) DEFAULT 'pending', -- pending, synced, error
    last_synced TIMESTAMP,
    last_tmdb_fetch TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- People table - Actors, Directors, Writers, etc.
CREATE TABLE people (
    id SERIAL PRIMARY KEY,
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    gender INTEGER, -- 0=unknown, 1=female, 2=male, 3=non-binary
    birthday DATE,
    deathday DATE,
    place_of_birth TEXT,
    biography TEXT,
    
    -- Career info
    known_for_department VARCHAR(50), -- Acting, Directing, Writing, etc.
    popularity DECIMAL(8,3),
    
    -- Media
    profile_image_url TEXT,
    
    -- External IDs
    tmdb_id INTEGER UNIQUE,
    tmdb_url TEXT,
    imdb_id VARCHAR(20),
    imdb_url TEXT,
    
    -- Social media
    instagram_id VARCHAR(100),
    twitter_id VARCHAR(100),
    facebook_id VARCHAR(100),
    
    -- WordPress integration
    wordpress_id INTEGER,
    
    -- System fields
    sync_status VARCHAR(20) DEFAULT 'pending',
    last_synced TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Studios/Production Companies
CREATE TABLE studios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    headquarters TEXT,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    
    -- External IDs
    tmdb_id INTEGER UNIQUE,
    
    -- WordPress integration
    wordpress_id INTEGER,
    
    -- System fields
    sync_status VARCHAR(20) DEFAULT 'pending',
    last_synced TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Genres
CREATE TABLE genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    tmdb_id INTEGER UNIQUE,
    wordpress_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Countries
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    iso_code VARCHAR(2) UNIQUE, -- ISO 3166-1 alpha-2
    wordpress_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Languages
CREATE TABLE languages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    iso_code VARCHAR(5) UNIQUE, -- ISO 639-1
    english_name VARCHAR(100),
    wordpress_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Experiments - The core "bad movie viewing events"
CREATE TABLE experiments (
    id SERIAL PRIMARY KEY,
    
    -- Event details
    experiment_number VARCHAR(50),
    event_date DATE,
    event_location TEXT,
    event_host VARCHAR(255),
    experiment_notes TEXT,
    experiment_image_url TEXT,
    
    -- Metadata
    status VARCHAR(20) DEFAULT 'planned', -- planned, completed, cancelled
    participant_count INTEGER,
    
    -- WordPress integration
    wordpress_id INTEGER UNIQUE,
    
    -- System fields
    sync_status VARCHAR(20) DEFAULT 'pending',
    last_synced TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- RELATIONSHIP TABLES (Many-to-Many)
-- ================================================

-- Movie cast (actors)
CREATE TABLE movie_cast (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    character_name VARCHAR(255),
    cast_order INTEGER, -- for ordering in credits
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(movie_id, person_id, character_name)
);

-- Movie crew (directors, writers, producers, etc.)
CREATE TABLE movie_crew (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    job VARCHAR(100) NOT NULL, -- Director, Writer, Producer, etc.
    department VARCHAR(100), -- Directing, Writing, Production, etc.
    credit_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(movie_id, person_id, job)
);

-- Movie genres
CREATE TABLE movie_genres (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(movie_id, genre_id)
);

-- Movie studios/production companies
CREATE TABLE movie_studios (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(movie_id, studio_id)
);

-- Movie countries
CREATE TABLE movie_countries (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(movie_id, country_id)
);

-- Movie languages
CREATE TABLE movie_languages (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(movie_id, language_id)
);

-- Experiment movies (movies watched in experiments)
CREATE TABLE experiment_movies (
    id SERIAL PRIMARY KEY,
    experiment_id INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    watch_order INTEGER, -- order watched in the experiment
    notes TEXT, -- experiment-specific notes about this movie
    rating INTEGER CHECK (rating >= 1 AND rating <= 10), -- experiment rating
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(experiment_id, movie_id)
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Movies indexes
CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_movies_year ON movies(year);
CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX idx_movies_imdb_id ON movies(imdb_id);
CREATE INDEX idx_movies_wordpress_id ON movies(wordpress_id);
CREATE INDEX idx_movies_sync_status ON movies(sync_status);
CREATE INDEX idx_movies_created_at ON movies(created_at);

-- People indexes
CREATE INDEX idx_people_name ON people(name);
CREATE INDEX idx_people_tmdb_id ON people(tmdb_id);
CREATE INDEX idx_people_department ON people(known_for_department);

-- Relationship indexes
CREATE INDEX idx_movie_cast_movie_id ON movie_cast(movie_id);
CREATE INDEX idx_movie_cast_person_id ON movie_cast(person_id);
CREATE INDEX idx_movie_crew_movie_id ON movie_crew(movie_id);
CREATE INDEX idx_movie_crew_person_id ON movie_crew(person_id);
CREATE INDEX idx_movie_crew_job ON movie_crew(job);
CREATE INDEX idx_movie_genres_movie_id ON movie_genres(movie_id);
CREATE INDEX idx_movie_genres_genre_id ON movie_genres(genre_id);
CREATE INDEX idx_experiment_movies_experiment_id ON experiment_movies(experiment_id);
CREATE INDEX idx_experiment_movies_movie_id ON experiment_movies(movie_id);

-- Full text search indexes
CREATE INDEX idx_movies_title_fts ON movies USING gin(to_tsvector('english', title));
CREATE INDEX idx_movies_overview_fts ON movies USING gin(to_tsvector('english', overview));
CREATE INDEX idx_people_name_fts ON people USING gin(to_tsvector('english', name));

-- ================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON movies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_studios_updated_at BEFORE UPDATE ON studios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- SAMPLE DATA INSERTS
-- ================================================

-- Insert some genres
INSERT INTO genres (name, tmdb_id) VALUES
('Horror', 27),
('Comedy', 35),
('Action', 28),
('Thriller', 53),
('Science Fiction', 878),
('Fantasy', 14),
('Drama', 18),
('Crime', 80),
('Adventure', 12),
('Mystery', 9648);

-- Insert some countries
INSERT INTO countries (name, iso_code) VALUES
('United States', 'US'),
('United Kingdom', 'GB'),
('Canada', 'CA'),
('Australia', 'AU'),
('Germany', 'DE'),
('France', 'FR'),
('Japan', 'JP'),
('South Korea', 'KR'),
('Italy', 'IT'),
('Spain', 'ES');

-- Insert some languages
INSERT INTO languages (name, iso_code, english_name) VALUES
('English', 'en', 'English'),
('Spanish', 'es', 'Spanish'),
('French', 'fr', 'French'),
('German', 'de', 'German'),
('Italian', 'it', 'Italian'),
('Japanese', 'ja', 'Japanese'),
('Korean', 'ko', 'Korean'),
('Mandarin', 'zh', 'Chinese'),
('Portuguese', 'pt', 'Portuguese'),
('Russian', 'ru', 'Russian');

-- ================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================

-- Movie details with counts
CREATE VIEW movie_details AS
SELECT 
    m.*,
    COUNT(DISTINCT mc.person_id) as cast_count,
    COUNT(DISTINCT mcr.person_id) as crew_count,
    COUNT(DISTINCT mg.genre_id) as genre_count,
    COUNT(DISTINCT em.experiment_id) as experiment_count
FROM movies m
LEFT JOIN movie_cast mc ON m.id = mc.movie_id
LEFT JOIN movie_crew mcr ON m.id = mcr.movie_id
LEFT JOIN movie_genres mg ON m.id = mg.movie_id
LEFT JOIN experiment_movies em ON m.id = em.movie_id
GROUP BY m.id;

-- Experiment summary
CREATE VIEW experiment_summary AS
SELECT 
    e.*,
    COUNT(em.movie_id) as movie_count,
    AVG(em.rating) as average_rating
FROM experiments e
LEFT JOIN experiment_movies em ON e.id = em.experiment_id
GROUP BY e.id;
