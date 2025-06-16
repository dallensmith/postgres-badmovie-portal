# AI Handoff Document: PostgreSQL Bad Movie Portal

## Project Overview

**PRIMARY GOAL**: Build a comprehensive admin portal and content management system for the Big Screen Bad Movies community. This will serve as the central hub for managing all aspects of bad movie viewing experiments, including movies, people, experiments, and community data.

**BIG PICTURE VISION**:
- Complete movie database with rich metadata (actors, directors, writers, genres, ratings, etc.)
- Experiment management system for tracking movie viewing sessions with notes, attendees, and outcomes
- People management for actors, directors, writers, and community members
- Integration with external APIs (TMDb, WordPress) for data enrichment and synchronization
- Modern, user-friendly interface for browsing, searching, and managing all content
- Robust backend API supporting the portal and potentially mobile apps or other clients
- Data accuracy and consistency as the authoritative source for the community

**TECHNOLOGY STACK**:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript  
- **Database**: PostgreSQL (remote server)
- **ORM**: Prisma
- **API Integration**: TMDb (The Movie Database), WordPress

## Current Focus: Data Validation & WordPress Integration

**CURRENT PHASE**: We're working on ensuring data accuracy and building tools to cross-reference with the existing WordPress site (the current source of truth). This is foundational work to ensure the portal becomes the reliable system of record.

**RECENT ACCOMPLISHMENTS**:
- ✅ Built core portal architecture with PostgreSQL backend and React frontend
- ✅ Implemented movie management with TMDb integration for rich metadata
- ✅ Created experiment management system with proper database relationships
- ✅ Fixed data consistency issues - portal now always reflects true database state
- ✅ Moved experiment filtering/sorting from client-side to server-side for performance
- ✅ Fixed missing movie-experiment links in database (resolved issues with experiments 393, 381)
- ✅ Built WordPress scraper foundation to cross-reference with existing community data
- ✅ Successfully identified correct data extraction patterns from WordPress posts

**CURRENT TASK**: WordPress scraper bulk processing needs content selector fix to extract all historical experiment data

## Broader Project Roadmap (Future Work)

**PHASE 1: Core Foundation** ✅ (Mostly Complete)
- Movie database with TMDb integration
- Experiment management system  
- Basic portal functionality
- Data consistency and accuracy

**PHASE 2: Data Enrichment** 🔄 (In Progress)
- WordPress data cross-reference and migration
- Complete people management (actors, directors, writers)
- Advanced search and filtering
- Data validation and cleanup tools

**PHASE 3: Community Features** 📋 (Planned)
- User authentication and roles
- Community member profiles
- Experiment attendance tracking
- Notes and comments system
- Rating and review system

**PHASE 4: Advanced Features** 📋 (Future)
- Public-facing website integration
- Mobile app support
- Analytics and reporting
- API for third-party integrations
- Automated content recommendations

**PHASE 5: Scale & Polish** 📋 (Future)
- Performance optimization
- Advanced caching
- Full test coverage
- Documentation and training materials

## Current WordPress Data Integration Status

**CONTEXT**: The existing WordPress site (https://bigscreenbadmovies.com/archive/) contains years of historical experiment data that needs to be cross-referenced with our database to ensure completeness and accuracy.
**WHAT WE DISCOVERED**:
- WordPress site contains the historical authoritative source of experiment data (hundreds of experiments)
- Individual experiment posts use `.et_pb_post_content_0_tb_body` as the main content selector
- Date extraction needs specific selector `.et_pb_title_meta_container .published` to avoid concatenation
- Movies are linked via TMDb/IMDb URLs within the post content
- Test extraction from experiment 196 works perfectly and returns correct data structure
- This will enable complete historical data migration and ongoing synchronization

**CURRENT TECHNICAL ISSUE**: 
The bulk scraper (`scrape-wordpress-complete.mjs`) completed but found no movies for any experiments. Root cause: it uses wrong content selectors (`.entry-content, .post-content, .content`) instead of the correct `.et_pb_post_content_0_tb_body` that we identified in testing.

**IMMEDIATE NEXT STEP FOR CONTINUING AI**: 
Fix the content selector in `scrape-wordpress-complete.mjs` and re-run to extract all historical experiment data for database cross-reference and migration.

**SPECIFIC TECHNICAL TASK**:
1. Open `/home/das/dev/postgres-badmovie-portal/scrape-wordpress-complete.mjs`
2. Find the content selector around line 64 (currently uses `.entry-content, .post-content, .content`)
3. Replace with the correct selector: `.et_pb_post_content_0_tb_body`
4. Re-run the scraper: `node scrape-wordpress-complete.mjs`
5. Verify the output contains movies for experiments (should extract hundreds of experiments with complete data)

**REFERENCE FILES**:
- `test-exp196-proper.mjs` - Working test script showing correct extraction pattern
- `test-date-extraction.mjs` - Working date extraction test
- `wordpress-complete-data.json` - Current (incorrect) scraped data that needs to be regenerated

## Key Architecture & Technical Decisions

### Database Schema (Prisma)
```prisma
model Movie {
  id          Int      @id @default(autoincrement())
  title       String
  year        Int?
  tmdbId      Int?     @unique
  imdbId      String?
  genres      Json?    // Array of genre objects
  actors      Json?    // Array of actor objects  
  directors   Json?    // Array of director objects
  writers     Json?    // Array of writer objects
  experiments Json?    // Array of experiment IDs
  // ... other fields
}

model Experiment {
  id          Int      @id @default(autoincrement())
  number      Int      @unique
  title       String?
  date        DateTime?
  host        String?
  notes       String?
  movies      Json?    // Array of movie IDs
  // ... other fields
}

model Actor {
  id          Int      @id @default(autoincrement())
  name        String
  tmdbId      Int?     @unique
  movies      Json?    // Array of movie IDs
}
// Similar for Director, Writer models
```

### Database Design Philosophy
- **PostgreSQL-first**: Database as single source of truth for all data
- **JSON Fields**: Used for array data (actors, genres, etc.) while maintaining relational integrity
- **Bidirectional Relationships**: Proper foreign keys with JSON field support for complex relationships
- **Prisma ORM**: Type-safe database operations with migration management

### API Design
- **RESTful endpoints** with consistent response formats
- **Server-side pagination, filtering, and sorting** for performance
- **External API integration** (TMDb) with proper error handling and rate limiting
- **Type-safe** request/response handling throughout
Key models:
- `Movie` - Main movie data with JSON fields for arrays
- `Actor`, `Director`, `Writer` - People entities
- `Experiment` - Movie viewing experiments
- Bidirectional relationships using JSON fields

## Technical Specifications

### Frontend Styling Guidelines
- **Framework**: Tailwind CSS with custom dark theme
- **Color Scheme**: Dark theme with these key colors:
  - Background: `bg-dark-800`, `bg-dark-700`
  - Text: `text-white`, `text-gray-300`, `text-gray-400`
  - Primary: `bg-primary-600`, `text-primary-400`
  - Accent colors: `bg-blue-600`, `bg-green-600`, `bg-red-600`
- **Form Inputs**: 
  ```jsx
  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
  ```
- **Buttons**:
  ```jsx
  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
  ```

### Data Flow Patterns

#### Movie List → Edit Flow (BROKEN)
1. `Movies.tsx` fetches partial movie data (`/api/movies` with limited fields)
2. User clicks "Edit" → `handleMovieEdit()` called
3. Fetches complete movie data (`/api/movies/:id`)
4. Opens `MovieFormModal` with full data
5. **ISSUE**: Form fields don't populate despite data being present

#### TMDb Sync Flow (WORKING)
1. `MovieDetailModal` → "Sync with TMDb" button
2. Fetches TMDb data (`/api/tmdb/movie/:id`)
3. Maps TMDb format to database format
4. Updates movie via PUT `/api/movies/:id`
5. Refreshes display

### API Endpoints

#### Movie Management
- `GET /api/movies` - List movies (partial fields for performance)
- `GET /api/movies/:id` - Get complete movie data
- `PUT /api/movies/:id` - Update movie
- `POST /api/movies` - Create movie
- `DELETE /api/movies/:id` - Delete movie
- `POST /api/movies/batch-sync-tmdb` - Batch sync all movies with TMDb

#### TMDb Integration
- `GET /api/tmdb/movie/:id` - Get movie data from TMDb
- `GET /api/tmdb/search/movie` - Search TMDb movies

### Database Configuration
- **Connection**: Remote PostgreSQL server
- **Environment**: Database URL in `.env` file
- **Schema**: Managed via Prisma migrations
- **Key Feature**: JSON fields for array data (actors, genres, etc.)

## Current State Analysis

### What Works ✅
1. **Backend APIs**: All endpoints tested and working
2. **Database**: Data is correctly stored and retrieved
3. **TMDb Integration**: Sync functionality works perfectly
4. **Movie Display**: MovieDetailModal shows all data correctly
5. **Movie List**: Loading and pagination work
6. **Data Mapping**: TMDb → Database format conversion works

### What's Broken ❌
1. **MovieFormModal**: Edit form fields are empty despite receiving data
2. **Form State Management**: React state timing/update issues

### Debugging Done
- Added extensive console logging
- Verified API responses
- Confirmed data flows to component
- Added debug UI elements showing state values
- Confirmed form state contains correct data but inputs show placeholders

## Development Environment

### Ports
- Frontend: `http://localhost:3001` (Vite)
- Backend: `http://localhost:3007` (Express)
- Proxy: Vite proxies `/api/*` to backend

### Scripts
```bash
npm run dev          # Start both frontend and backend
npm run dev:client   # Frontend only
npm run dev:server   # Backend only
```

### Environment Variables
```
DATABASE_URL=postgresql://[connection string]
TMDB_API_KEY=[api key]
TMDB_BASE_URL=https://api.themoviedb.org/3
```

## Immediate Next Steps

### Priority 1: Fix MovieFormModal
**Problem**: Form inputs not displaying values despite correct state.

**Suspected Issues**:
1. React controlled component timing issues
2. State initialization race conditions  
3. useEffect dependency problems
4. Form input binding issues

**Files to Focus On**:
- `src/components/MovieFormModal.tsx` (lines 80-160 - form data initialization)
- `src/pages/Movies.tsx` (handleMovieEdit function)

**Debugging Already Added**:
- Console logs showing data flow
- Debug UI showing form state values
- Key prop for component re-mounting

### Priority 2: Code Cleanup
- Remove debug console.logs and yellow debug text
- Remove setTimeout workarounds
- Clean up state management approach

### Priority 3: Missing Features
- Implement experiment display in MovieDetailModal
- Add experiment management functionality
- Complete the bidirectional relationship sync

## Code Style Requirements

### TypeScript
- Strict typing required
- Interface definitions for all data structures
- Proper error handling with try/catch

### React Patterns
- Functional components with hooks
- Proper dependency arrays in useEffect
- Controlled components for forms
- State management with useState

### File Organization
- One main component per file
- Interfaces at top of files
- Logical grouping of related functions
- Clear import/export structure

## Testing Approach

### Manual Testing
1. Start both frontend and backend
2. Navigate to movie list
3. Click "Edit Movie" on a synced movie
4. Verify all fields populate correctly
5. Test save functionality

### API Testing
```bash
# Test movie fetch
curl "http://localhost:3007/api/movies/[id]"

# Test TMDb integration  
curl "http://localhost:3007/api/tmdb/movie/[tmdb_id]"
```

## Known Working Solutions

### TMDb Sync (Reference Implementation)
The TMDb sync in `MovieDetailModal.tsx` works perfectly and can serve as a reference for proper data handling patterns.

### Batch Operations
The batch sync functionality demonstrates proper async handling and error management patterns.

## Final Notes

This is a well-architected application with a clear separation of concerns. The main blocker is a React form state management issue that should be solvable with proper component lifecycle management. The database schema and API design are solid foundations for continued development.

The user has been very patient and clear about the specific issue - form fields showing placeholder text instead of actual values despite data being present in component state. This is likely a React rendering/state update timing issue rather than a data flow problem.

Good luck! The foundation is strong, just needs this one critical form issue resolved.
