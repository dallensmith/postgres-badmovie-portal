-- CreateTable
CREATE TABLE "movies" (
    "id" SERIAL NOT NULL,
    "movie_title" VARCHAR(255),
    "movie_original_title" VARCHAR(255),
    "movie_year" VARCHAR(255),
    "movie_release_date" DATE,
    "movie_runtime" INTEGER,
    "movie_tagline" TEXT,
    "movie_overview" TEXT,
    "movie_content_rating" VARCHAR(255),
    "movie_budget" TEXT,
    "movie_box_office" TEXT,
    "movie_poster" TEXT,
    "movie_backdrop" TEXT,
    "movie_trailer" TEXT,
    "movie_tmdb_id" TEXT,
    "movie_tmdb_url" TEXT,
    "movie_tmdb_rating" TEXT,
    "movie_tmdb_votes" TEXT,
    "movie_imdb_id" TEXT,
    "movie_imdb_url" TEXT,
    "movie_characters" JSONB,
    "movie_amazon_link" VARCHAR(555),
    "movie_actors" JSONB,
    "movie_directors" JSONB,
    "movie_writers" JSONB,
    "movie_genres" JSONB,
    "movie_countries" JSONB,
    "movie_languages" JSONB,
    "movie_studios" JSONB,
    "wordpress_id" INTEGER,
    "pods_data" JSONB,
    "slug" VARCHAR(255),
    "sync_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "exclude_from_tmdb_sync" BOOLEAN NOT NULL DEFAULT false,
    "shown_3d" BOOLEAN NOT NULL DEFAULT false,
    "last_synced" TIMESTAMP(3),
    "last_tmdb_fetch" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actors" (
    "id" SERIAL NOT NULL,
    "actor_name" VARCHAR(255) NOT NULL,
    "profile_image" TEXT,
    "actor_biography" TEXT,
    "actor_birthday" DATE,
    "actor_deathday" DATE,
    "actor_place_of_birth" VARCHAR(255),
    "actor_movie_count" TEXT,
    "actor_popularity" TEXT,
    "actor_known_for_department" VARCHAR(255),
    "actor_imdb_id" TEXT,
    "actor_imdb_url" TEXT,
    "actor_tmdb_url" TEXT,
    "actor_instagram_id" VARCHAR(255),
    "actor_twitter_id_" VARCHAR(255),
    "actor_facebook_id" VARCHAR(255),
    "related_movies_actor" JSONB,
    "wordpress_id" INTEGER,
    "pods_data" JSONB,
    "sync_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "last_synced" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directors" (
    "id" SERIAL NOT NULL,
    "director_name" VARCHAR(255) NOT NULL,
    "director_biography" TEXT,
    "director_movie_count" TEXT,
    "director_birthday" DATE,
    "director_deathday" DATE,
    "director_place_of_birth" VARCHAR(255),
    "director_popularity" TEXT,
    "director_profile_image" TEXT,
    "director_imdb_id" TEXT,
    "director_imdb_url" TEXT,
    "director_tmdb_url" TEXT,
    "director_instagram_id" VARCHAR(255),
    "director_twitter_id" VARCHAR(255),
    "director_facebook_id" VARCHAR(255),
    "related_movies_director" JSONB,
    "wordpress_id" INTEGER,
    "pods_data" JSONB,
    "sync_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "last_synced" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "writers" (
    "id" SERIAL NOT NULL,
    "writer_name" VARCHAR(255) NOT NULL,
    "writer_biography" TEXT,
    "writer_movie_count" TEXT,
    "writer_birthday" DATE,
    "writer_deathday" DATE,
    "writer_place_of_birth" VARCHAR(255),
    "writer_popularity" TEXT,
    "writer_profile_image" TEXT,
    "writer_imdb_id" TEXT,
    "writer_imdb_url" TEXT,
    "writer_tmdb_url" TEXT,
    "writer_instagram_id" VARCHAR(255),
    "writer_twitter_id" VARCHAR(255),
    "writer_facebook_id" VARCHAR(255),
    "related_movies_writer" JSONB,
    "wordpress_id" INTEGER,
    "pods_data" JSONB,
    "sync_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "last_synced" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "writers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studios" (
    "id" SERIAL NOT NULL,
    "studio_name" VARCHAR(255) NOT NULL,
    "related_movies_studio" JSONB,
    "wordpress_id" INTEGER,
    "pods_data" JSONB,
    "sync_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "last_synced" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" SERIAL NOT NULL,
    "genre_name" VARCHAR(255) NOT NULL,
    "related_movies_genre" JSONB,
    "wordpress_id" INTEGER,
    "pods_data" JSONB,
    "sync_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "last_synced" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" SERIAL NOT NULL,
    "country_name" VARCHAR(255) NOT NULL,
    "iso_code" VARCHAR(10),
    "related_movies_country" JSONB,
    "wordpress_id" INTEGER,
    "pods_data" JSONB,
    "sync_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "last_synced" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" SERIAL NOT NULL,
    "language_name" VARCHAR(255) NOT NULL,
    "related_movies_language" JSONB,
    "wordpress_id" INTEGER,
    "pods_data" JSONB,
    "sync_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "last_synced" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" SERIAL NOT NULL,
    "experiment_number" VARCHAR(10) NOT NULL,
    "event_date" DATE NOT NULL,
    "event_host" VARCHAR(255) NOT NULL,
    "post_url" TEXT,
    "event_encore" BOOLEAN NOT NULL DEFAULT false,
    "event_location" VARCHAR(255) NOT NULL,
    "event_image_wp_id" INTEGER,
    "event_image" TEXT,
    "event_notes" TEXT,
    "event_attendees" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_experiments" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "experiment_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" SERIAL NOT NULL,
    "operation" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "wordpress_id" INTEGER,
    "direction" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,
    "sync_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pods_config" (
    "id" SERIAL NOT NULL,
    "pod_name" VARCHAR(100) NOT NULL,
    "wordpress_url" TEXT NOT NULL,
    "rest_base" VARCHAR(100) NOT NULL,
    "field_mappings" JSONB NOT NULL,
    "last_sync" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pods_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "movies_wordpress_id_key" ON "movies"("wordpress_id");

-- CreateIndex
CREATE UNIQUE INDEX "movies_slug_key" ON "movies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "actors_wordpress_id_key" ON "actors"("wordpress_id");

-- CreateIndex
CREATE UNIQUE INDEX "directors_wordpress_id_key" ON "directors"("wordpress_id");

-- CreateIndex
CREATE UNIQUE INDEX "writers_wordpress_id_key" ON "writers"("wordpress_id");

-- CreateIndex
CREATE UNIQUE INDEX "studios_wordpress_id_key" ON "studios"("wordpress_id");

-- CreateIndex
CREATE UNIQUE INDEX "genres_wordpress_id_key" ON "genres"("wordpress_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_wordpress_id_key" ON "countries"("wordpress_id");

-- CreateIndex
CREATE UNIQUE INDEX "languages_wordpress_id_key" ON "languages"("wordpress_id");

-- CreateIndex
CREATE UNIQUE INDEX "experiments_experiment_number_key" ON "experiments"("experiment_number");

-- CreateIndex
CREATE UNIQUE INDEX "movie_experiments_movie_id_experiment_id_key" ON "movie_experiments"("movie_id", "experiment_id");

-- CreateIndex
CREATE UNIQUE INDEX "pods_config_pod_name_key" ON "pods_config"("pod_name");

-- AddForeignKey
ALTER TABLE "movie_experiments" ADD CONSTRAINT "movie_experiments_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_experiments" ADD CONSTRAINT "movie_experiments_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

