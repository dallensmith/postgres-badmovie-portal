import { PrismaClient } from '@prisma/client';
import { WordPressPodsSyncService } from './wordpressSync';

const prisma = new PrismaClient();

/**
 * Actor-specific sync service extending the base WordPress sync
 */
export class ActorSyncService extends WordPressPodsSyncService {
  
  /**
   * Sync an actor from our database to WordPress Pods
   */
  async syncActorToWordPress(actorId: number): Promise<void> {
    try {
      const actor = await prisma.actor.findUnique({
        where: { id: actorId },
      });

      if (!actor) {
        throw new Error(`Actor with ID ${actorId} not found`);
      }

      // Transform our data to Pods format
      const podsData = this.transformActorToPodsFormat(actor);

      let response;
      if (actor.wordpressId) {
        // Update existing WordPress post
        response = await this.client.put(`/actors/${actor.wordpressId}`, podsData);
      } else {
        // Create new WordPress post
        response = await this.client.post('/actors', podsData);
        
        // Update our record with the WordPress ID
        await prisma.actor.update({
          where: { id: actorId },
          data: { 
            wordpressId: response.data.id,
            syncStatus: 'synced',
            lastSynced: new Date(),
          },
        });
      }

      // Log successful sync
      await this.logSyncOperation('actor', actorId, response.data.id, 'to_wordpress', 'success');

    } catch (error) {
      await this.logSyncOperation('actor', actorId, null, 'to_wordpress', 'failed', 
        error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Sync an actor from WordPress Pods to our database
   */
  async syncActorFromWordPress(wordpressId: number): Promise<void> {
    try {
      // Fetch from WordPress
      const response = await this.client.get(`/actors/${wordpressId}`);
      const wordpressData = response.data;

      // Transform Pods data to our format
      const actorData = this.transformPodsToActorFormat(wordpressData);

      // Check if we already have this actor
      const existingActor = await prisma.actor.findUnique({
        where: { wordpressId },
      });

      let actorId;
      if (existingActor) {
        // Update existing record
        await prisma.actor.update({
          where: { wordpressId },
          data: {
            ...actorData,
            syncStatus: 'synced',
            lastSynced: new Date(),
            podsData: wordpressData, // Store original Pods data
          },
        });
        actorId = existingActor.id;
      } else {
        // Create new record
        const newActor = await prisma.actor.create({
          data: {
            ...actorData,
            wordpressId,
            syncStatus: 'synced',
            lastSynced: new Date(),
            podsData: wordpressData, // Store original Pods data
          },
        });
        actorId = newActor.id;
      }

      // Log successful sync
      await this.logSyncOperation('actor', actorId, wordpressId, 'from_wordpress', 'success');

    } catch (error) {
      await this.logSyncOperation('actor', null, wordpressId, 'from_wordpress', 'failed',
        error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Transform our Actor model to WordPress Pods format
   */
  private transformActorToPodsFormat(actor: any): any {
    return {
      title: actor.actorName,
      status: 'publish',
      meta: {
        actor_name: actor.actorName,
        profile_image: actor.profileImage,
        actor_biography: actor.actorBiography,
        actor_birthday: actor.actorBirthday?.toISOString().split('T')[0],
        actor_deathday: actor.actorDeathday?.toISOString().split('T')[0],
        actor_place_of_birth: actor.actorPlaceOfBirth,
        actor_movie_count: actor.actorMovieCount,
        actor_popularity: actor.actorPopularity,
        actor_known_for_department: actor.actorKnownForDepartment,
        actor_imdb_id: actor.actorImdbId,
        actor_imdb_url: actor.actorImdbUrl,
        actor_tmdb_url: actor.actorTmdbUrl,
        actor_instagram_id: actor.actorInstagramId,
        actor_twitter_id_: actor.actorTwitterId, // Note the underscore!
        actor_facebook_id: actor.actorFacebookId,
        related_movies_actor: actor.relatedMoviesActor,
      },
    };
  }

  /**
   * Transform WordPress Pods data to our Actor model format
   */
  private transformPodsToActorFormat(podsData: any): any {
    const meta = podsData.meta || {};
    
    return {
      actorName: meta.actor_name || podsData.title?.rendered,
      profileImage: meta.profile_image,
      actorBiography: meta.actor_biography,
      actorBirthday: meta.actor_birthday ? new Date(meta.actor_birthday) : null,
      actorDeathday: meta.actor_deathday ? new Date(meta.actor_deathday) : null,
      actorPlaceOfBirth: meta.actor_place_of_birth,
      actorMovieCount: meta.actor_movie_count,
      actorPopularity: meta.actor_popularity,
      actorKnownForDepartment: meta.actor_known_for_department,
      actorImdbId: meta.actor_imdb_id,
      actorImdbUrl: meta.actor_imdb_url,
      actorTmdbUrl: meta.actor_tmdb_url,
      actorInstagramId: meta.actor_instagram_id,
      actorTwitterId: meta.actor_twitter_id_, // Note the underscore!
      actorFacebookId: meta.actor_facebook_id,
      relatedMoviesActor: meta.related_movies_actor,
    };
  }

  /**
   * Bulk sync all actors from WordPress
   */
  async bulkSyncActorsFromWordPress(): Promise<void> {
    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get(`/actors?page=${page}&per_page=100`);
        const actors = response.data;

        if (actors.length === 0) {
          hasMore = false;
          break;
        }

        for (const actor of actors) {
          try {
            await this.syncActorFromWordPress(actor.id);
            console.log(`Synced actor ${actor.id}: ${actor.title?.rendered}`);
          } catch (error) {
            console.error(`Failed to sync actor ${actor.id}:`, error);
          }
        }

        page++;
      }
    } catch (error) {
      console.error('Bulk actor sync failed:', error);
      throw error;
    }
  }
}

export default ActorSyncService;
