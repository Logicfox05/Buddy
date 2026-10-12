# Buddy - CS Mastery PWA

A free, phone-first Progressive Web Application for mastering computer science concepts.

## Current Implementation Status

### ✅ Completed (Task 1.1 - 1.4)

**Project Foundation:**
- Next.js 14+ with TypeScript (strict mode)
- Tailwind CSS configured
- PWA manifest created
- Testing infrastructure (Vitest, Playwright, fast-check)
- Project structure established

**Type Definitions:**
- Complete TypeScript interfaces for all core types
- Concept, Assessment, Progress, Schedule, Engagement, Session, Execution types
- Full type safety across the codebase

**Dexie Database:**
- BuddyDatabase schema with 6 tables
- Export/import functionality
- Clear all data functionality
- IndexedDB persistence layer

**Core Business Logic:**
- `KnowledgeGraphManager` - Curriculum management, prerequisite checking
- `MasteryStateMachine` - State transitions, confidence calculation
- `SpacedRepetitionScheduler` - FSRS and SM-2 algorithms
- `AssessmentEngine` - Question grading, assessment management
- `EngagementEngine` - XP, streaks, levels, weekly recaps
- `SessionBuilder` - Session creation with interleaving

**Seed Data:**
- Curriculum with 14+ CS concepts across DSA and OS
- Assessment bank with questions, explanations, coding problems
- Real learning content for arrays and linked lists

### 🚧 In Progress

Currently building toward a minimal working MVP with:
- Basic UI components
- Knowledge map visualization
- Micro-lesson cards
- Quiz interface
- Code execution environment

### 📋 Next Steps

1. Complete UI components (React components for lessons, assessments)
2. Implement code execution workers (Pyodide for Python, sandboxed JS)
3. Add LLM provider integration
4. Build navigation and routing
5. Implement offline caching
6. Add comprehensive tests

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run type-check
```

## Architecture

- **App Router**: Next.js 14+ with TypeScript
- **State**: Zustand for global state
- **Database**: Dexie (IndexedDB) for local-first storage
- **Styling**: Tailwind CSS with dark mode
- **Testing**: Vitest + fast-check + Playwright

## Key Features (Planned)

✅ Offline-first PWA
✅ Privacy-first (on-device only)
✅ Mobile-optimized UI
✅ Spaced repetition (FSRS algorithm)
- Multi-type assessments (quiz, explanation, applied, coding)
- Code execution in browser (Python & JavaScript)
- LLM-enhanced content (optional)
- Progress tracking with XP and streaks

## License

This is a learning project built to specification.
