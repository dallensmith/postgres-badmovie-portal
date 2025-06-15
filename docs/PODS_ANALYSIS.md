# WordPress Pods System Analysis & Schema Alignment

## Pods System Overview

Based on the pods.json file, your WordPress system has the following Custom Post Types:

### 1. **ACTOR** Pod
- **Post Type**: `actor`
- **REST Base**: `actors`
- **Key Fields**:
  - `actor_name` (text, required)
  - `profile_image` (file/image)
  - `actor_biography` (wysiwyg)
  - `actor_birthday` (date, format: mdy)
  - `actor_deathday` (date, format: mdy)
  - `actor_place_of_birth` (text, max 255)
  - `actor_movie_count` (text)
  - `actor_popularity` (text)
  - `actor_known_for_department` (text)
  - `actor_imdb_id` (text)
  - `actor_imdb_url` (website)
  - `actor_tmdb_url` (website)
  - `actor_instagram_id` (text)
  - `actor_twitter_id_` (text) [note the underscore]
  - `actor_facebook_id` (text)
  - `related_movies_actor` (pick relationship to movies, bidirectional)

### 2. **MOVIE** Pod  
- **Post Type**: `movie`
- **REST Base**: `movies`
- **Key Fields**:
  - `movie_title` (text)
  - `movie_original_title` (text)
  - `movie_year` (text, max 255)
  - `movie_release_date` (date, format: Y-m-d)
  - `movie_runtime` (number, integer)
  - `movie_tagline` (text)
  - `movie_overview` (paragraph)
  - `movie_content_rating` (text)
  - `movie_budget` (text)
  - `movie_box_office` (text)
  - `movie_poster` (file/image)
  - `movie_backdrop` (file/image)
  - `movie_trailer` (text)
  - `movie_tmdb_id` (text)
  - `movie_tmdb_url` (website)
  - `movie_tmdb_rating` (text)
  - `movie_tmdb_votes` (text)
  - `movie_imdb_id` (text)
  - `movie_imdb_url` (website)
  - `movie_characters` (text, repeatable)
  - `movie_amazon_link` (website, max 555 chars)
- **Relationships** (all bidirectional):
  - `movie_genres` → genre posts
  - `movie_studios` → studio posts  
  - `movie_actors` → actor posts
  - `movie_directors` → director posts
  - `movie_writers` → writer posts
  - `movie_countries` → country posts
  - `movie_languages` → language posts
  - `movie_experiment` → experiment posts

### 3. **EXPERIMENT** Pod
- **Post Type**: `experiment`
- **REST Base**: `experiments`
- **Key Fields**:
  - `experiment_number` (text, max 255)
  - `event_date` (date, format: fjsy, HTML5, required)
  - `event_location` (pick custom-simple, multi, repeatable, required)
    - Options: "Bigscreen VR\nDiscord \nTwitch\nYoutube\nVimeo"
  - `event_host` (pick user, single dropdown)
  - `experiment_image` (file/image)
  - `experiment_notes` (wysiwyg)
  - `experiment_movies` (pick relationship to movies, bidirectional)

### 4. **GENRE** Pod
- **Post Type**: `genre`
- **REST Base**: `genres`
- **Key Fields**:
  - `genre_name` (text, required)
  - `related_movies_genre` (pick relationship to movies, bidirectional)

### 5. **COUNTRY** Pod
- **Post Type**: `country`
- **REST Base**: `countries`
- **Key Fields**:
  - `country_name` (text, required)
  - `related_movies_country` (pick relationship to movies, bidirectional)

### 6. **LANGUAGE** Pod
- **Post Type**: `language`
- **REST Base**: `languages`
- **Key Fields**:
  - `language_name` (text, required)
  - `related_movies_language` (pick relationship to movies, bidirectional)

### 7. **STUDIO** Pod
- **Post Type**: `studio`
- **REST Base**: `studios`
- **Key Fields**:
  - `studio_name` (text, required)
  - `related_movies_studio` (pick relationship to movies, bidirectional)

### 8. **DIRECTOR** Pod
- **Post Type**: `director`
- **REST Base**: `directors`
- **Similar structure to actors**

### 9. **WRITER** Pod
- **Post Type**: `writer`  
- **REST Base**: `writers`
- **Similar structure to actors**

## Critical Schema Adjustments Needed

Our PostgreSQL schema needs these updates to match Pods exactly:

### 1. **Field Name Mismatches**
- ❌ Our `originalTitle` → ✅ Should be `movie_original_title`
- ❌ Our `tmdbVotes` → ✅ Should be `movie_tmdb_votes`
- ❌ Our `contentRating` → ✅ Should be `movie_content_rating`
- ❌ Our `boxOffice` → ✅ Should be `movie_box_office`

### 2. **Data Type Mismatches**
- ❌ Our `movie_year` (INTEGER) → ✅ Pods uses TEXT (max 255)
- ❌ Our `movie_budget` (BIGINT) → ✅ Pods uses TEXT
- ❌ Our `movie_box_office` (BIGINT) → ✅ Pods uses TEXT
- ❌ Our `movie_tmdb_rating` (DECIMAL) → ✅ Pods uses TEXT
- ❌ Our `movie_tmdb_votes` (INTEGER) → ✅ Pods uses TEXT

### 3. **Missing Fields**
- ✅ Need `movie_characters` (repeatable text field)
- ✅ Need proper handling of `event_location` as repeatable field
- ✅ Need `actor_twitter_id_` (note the underscore)

### 4. **Relationship Structure**
- ✅ Pods uses bidirectional relationships
- ✅ Need to track sister_id relationships
- ✅ WordPress post IDs need to be preserved

## WordPress REST API Integration Points

All pods have `rest_enable: "1"` with specific endpoints:
- `/wp-json/wp/v2/movies`
- `/wp-json/wp/v2/actors`
- `/wp-json/wp/v2/experiments`
- `/wp-json/wp/v2/genres`
- etc.

Each field has `rest_read: "1"` and `rest_write: "1"` permissions.

## Next Steps Required

1. **Update Prisma Schema** to match exact Pods field names and types
2. **Create WordPress Sync Service** that handles bidirectional relationships
3. **Update API endpoints** to use Pods field naming convention
4. **Add WordPress ID tracking** for all entities
5. **Handle repeatable fields** properly (movie_characters, event_location)
