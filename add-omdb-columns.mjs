import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addOMDbColumns() {
  console.log('🚀 Starting to add OMDb columns...');
  
  try {
    console.log('Adding OMDb columns to movies table...');
    
    // Add each column with IF NOT EXISTS to avoid errors if they already exist
    const columns = [
      'ALTER TABLE movies ADD COLUMN IF NOT EXISTS rotten_tomatoes_rating VARCHAR(10)',
      'ALTER TABLE movies ADD COLUMN IF NOT EXISTS rotten_tomatoes_url TEXT',
      'ALTER TABLE movies ADD COLUMN IF NOT EXISTS imdb_rating VARCHAR(10)',
      'ALTER TABLE movies ADD COLUMN IF NOT EXISTS imdb_votes VARCHAR(20)',
      'ALTER TABLE movies ADD COLUMN IF NOT EXISTS metacritic_rating VARCHAR(10)',
      'ALTER TABLE movies ADD COLUMN IF NOT EXISTS awards TEXT',
      'ALTER TABLE movies ADD COLUMN IF NOT EXISTS dvd_release VARCHAR(50)',
      'ALTER TABLE movies ADD COLUMN IF NOT EXISTS website_url TEXT',
      'ALTER TABLE movies ADD COLUMN IF NOT EXISTS box_office_enhanced TEXT',
      'ALTER TABLE movies ADD COLUMN IF NOT EXISTS plot_enhanced TEXT'
    ];
    
    for (const sql of columns) {
      console.log(`Executing: ${sql}`);
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ Success: ${sql}`);
    }
    
    console.log('✅ All OMDb columns added successfully!');
  } catch (error) {
    console.error('❌ Error adding OMDb columns:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    console.log('🔄 Disconnecting from database...');
    await prisma.$disconnect();
    console.log('✅ Disconnected');
  }
}

console.log('📋 Script started');
addOMDbColumns()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
