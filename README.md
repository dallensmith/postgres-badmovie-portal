# Postgres Bad Movie Portal

A PostgreSQL-first admin portal for managing "bad movie viewing experiments" - community events where groups watch intentionally terrible movies together. This portal serves as a gateway between WordPress/Pods and administrators for maintaining database integrity and organizing movie events.

## Project Vision

This system creates the definitive "so bad it's good" movie database with:
- **PostgreSQL-first architecture** for robust data management
- **Admin portal** for managing movie experiments and data integrity  
- **WordPress/Pods integration** via API gateway
- **TMDb enrichment** for comprehensive movie metadata
- **Affiliate monetization** through Amazon and streaming service links

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WordPress     │    │    Admin Portal  │    │   PostgreSQL    │
│   (Pods Plugin) │◄──►│   (This System)  │◄──►│   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲
                                │
                       ┌──────────────────┐
                       │    TMDb API      │
                       │  (Data Enrichment)│
                       └──────────────────┘
```

## Key Differences from Previous Version

1. **PostgreSQL Core**: Database-first design instead of PocketBase
2. **Direct Schema Control**: Full control over database structure and constraints
3. **Caprover Deployment**: Containerized PostgreSQL in Caprover infrastructure
4. **Enhanced Performance**: Optimized queries and indexing for complex relationships
5. **Better Data Integrity**: Foreign key constraints and transaction support

## Technology Stack

- **Database**: PostgreSQL (remote in Caprover container)
- **Backend**: Node.js/Express with TypeScript
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **ORM**: Prisma (for type-safe database operations)
- **Movie Data**: TMDb API integration
- **Authentication**: JWT with role-based access
- **Container**: Docker (deployed via Caprover)

## Getting Started

1. Clone the repository
2. Set up environment variables
3. Initialize PostgreSQL database
4. Run database migrations
5. Start development server

More detailed setup instructions will be added as development progresses.

## Database Schema

The PostgreSQL schema includes:
- **Movies** (29+ fields matching WordPress Pods)
- **Experiments** (viewing events)
- **People** (actors, directors, writers)
- **Studios & Production Companies**
- **Genres, Countries, Languages**
- **Relationship tables** for many-to-many associations
- **WordPress sync tracking**

## Development Roadmap

### Phase 1: Foundation
- [x] Project setup and Git repository
- [ ] PostgreSQL schema design
- [ ] Database migrations
- [ ] Basic API structure

### Phase 2: Core Features
- [ ] Movie CRUD operations
- [ ] Experiment management
- [ ] TMDb integration
- [ ] WordPress/Pods API gateway

### Phase 3: Advanced Features
- [ ] Complex relationship management
- [ ] Data integrity validation
- [ ] Performance optimization
- [ ] Production deployment

## Contributing

This project continues the vision of creating the ultimate "so bad it's good" movie community resource with improved architecture and scalability.

---

**"So bad it's good"** - The motto that drives us all. 🎬
