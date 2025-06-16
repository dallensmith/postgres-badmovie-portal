import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'badmovie_portal',
  password: 'password',
  port: 5432,
});

async function checkCurrentState() {
  try {
    console.log('=== CURRENT STATE OF RECENT EXPERIMENTS ===\n');
    
    // Check recent experiments
    const result = await pool.query(`
      SELECT experiment_number, COUNT(*) as record_count, 
             STRING_AGG(DISTINCT title, ', ' ORDER BY title) as all_movies
      FROM experiments 
      WHERE experiment_number IN (504, 505, 506, 507, 508)
      GROUP BY experiment_number 
      ORDER BY experiment_number DESC
    `);
    
    result.rows.forEach(row => {
      console.log(`Exp #${row.experiment_number}: ${row.record_count} records`);
      console.log(`Movies: ${row.all_movies}`);
      console.log('---');
    });
    
    // Check for any duplicates
    console.log('\n=== CHECKING FOR DUPLICATES ===\n');
    const duplicates = await pool.query(`
      SELECT experiment_number, title, COUNT(*) as count
      FROM experiments 
      WHERE experiment_number IN (504, 505, 506, 507, 508)
      GROUP BY experiment_number, title
      HAVING COUNT(*) > 1
      ORDER BY experiment_number
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('Found duplicates:');
      duplicates.rows.forEach(row => {
        console.log(`Exp #${row.experiment_number} - ${row.title}: ${row.count} copies`);
      });
    } else {
      console.log('No duplicates found in these experiments.');
    }
    
    // Show total experiment count
    console.log('\n=== TOTAL EXPERIMENT COUNT ===\n');
    const total = await pool.query(`
      SELECT COUNT(DISTINCT experiment_number) as total_experiments,
             COUNT(*) as total_records
      FROM experiments
    `);
    
    console.log(`Total experiments: ${total.rows[0].total_experiments}`);
    console.log(`Total records: ${total.rows[0].total_records}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkCurrentState();
