# AI Handoff Document: PostgreSQL Bad Movie Portal

## Project Overview

This is a PostgreSQL-first admin portal for managing bad movie viewing experiments. The application is built with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (remote server)
- **ORM**: Prisma
- **API Integration**: TMDb (The Movie Database)

## Current Critical Issue

**PROBLEM**: The MovieFormModal edit functionality is not properly displaying movie data in form fields, even though the data exists in the database and is being fetched correctly.

**STATUS**: 
- ✅ Data exists in database correctly
- ✅ API endpoints work correctly (`/api/movies/:id` returns full movie data)
- ✅ Data is being fetched when edit button is clicked
- ✅ Data is passed to MovieFormModal component
- ❌ Form fields show placeholder text instead of actual values

**EVIDENCE**: Debug logs show form state contains correct data, but input fields display placeholders (lighter text) instead of values (darker text).

## Architecture

### Frontend Structure
```
src/
├── components/
│   ├── MovieCard.tsx           # Movie display component + Movie interface
│   ├── MovieDetailModal.tsx    # Movie details view + TMDb sync
│   ├── MovieFormModal.tsx      # Movie add/edit form (BROKEN)
│   ├── SearchFilters.tsx       # Search and filter controls
│   └── Pagination.tsx          # Pagination component
├── pages/
│   └── Movies.tsx              # Main movie management page
└── App.tsx                     # Main app component
```

### Backend Structure
```
server/
├── routes/
│   ├── movies.ts               # Movie CRUD + batch sync
│   ├── tmdb.ts                 # TMDb API proxy
│   ├── dashboard.ts            # Dashboard stats
│   └── [other routes]
└── index.ts                    # Express server setup
```

### Database Schema (Prisma)
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
