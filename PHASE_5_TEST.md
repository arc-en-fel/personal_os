# Phase 5: Knowledge Base Integration - End-to-End Test

## Test Objectives
- Verify notes can be created and indexed
- Confirm full-text search works in knowledge screen
- Validate AI assistant can search the knowledge base
- Test end-to-end knowledge retrieval flow

## Test Steps

### 1. Create Test Notes
Create 3 test notes in the Knowledge screen:

**Note 1:**
- Title: "React Hooks Best Practices"
- Content: "Use useCallback for event handlers to prevent unnecessary re-renders. Use useMemo for expensive computations. Always track dependencies carefully in dependency arrays."

**Note 2:**
- Title: "Database Performance Tips"
- Content: "Add indexes on frequently queried columns. Use EXPLAIN ANALYZE to understand query plans. Consider denormalization for read-heavy workloads. Monitor slow query logs regularly."

**Note 3:**
- Title: "Personal Fitness Goals 2026"
- Content: "Target: Run 5K three times per week. Strength training twice weekly. Maintain 70kg weight. Increase resting heart rate stability. Track sleep quality daily."

### 2. Test Knowledge Screen Search
In the Knowledge screen:

1. **Search "React"**
   - Expected: Note 1 appears in results
   - Verify: Title and snippet are visible

2. **Search "database"**
   - Expected: Note 2 appears in results
   - Verify: Search is case-insensitive

3. **Search "fitness"**
   - Expected: Note 3 appears in results
   - Verify: Full-text search works

### 3. Test AI Assistant Search Integration
In the Assistant screen, ask queries that should trigger search_notes:

**Query 1:** "What's my fitness goal for 2026?"
- Expected: Assistant calls search_notes tool with query like "fitness goals"
- Should find: Note 3 about fitness goals
- Response: Should include fitness targets from the note

**Query 2:** "Tell me about database performance optimization."
- Expected: Assistant calls search_notes tool
- Should find: Note 2 about database performance
- Response: Should reference indexing, EXPLAIN ANALYZE, etc.

**Query 3:** "What are the best practices for React hooks?"
- Expected: Assistant calls search_notes tool
- Should find: Note 1 about React hooks
- Response: Should mention useCallback, useMemo, dependencies

### 4. Verification Checklist
- [ ] All 3 test notes created successfully
- [ ] Search in knowledge screen finds all notes
- [ ] Search is case-insensitive
- [ ] Search results display title and content snippet
- [ ] AI assistant receives search_notes tool calls in logs
- [ ] AI assistant returns relevant notes from search_notes
- [ ] AI responses incorporate information from found notes
- [ ] No errors in Supabase function logs

## Success Criteria
Phase 5 is complete when:
1. ✓ Notes are searchable via full-text search in knowledge screen
2. ✓ AI assistant has access to search_notes tool
3. ✓ AI assistant can answer questions using knowledge base
4. ✓ End-to-end flow works: create note → search → AI uses it

## Known Limitations
- Search is full-text (ilike) not semantic
- AI assistant LLM endpoint still has issues (Gemini 404 errors)
- Vector embeddings not yet implemented
- Can upgrade to semantic search in future phase

## Notes
- If LLM endpoints fail, the search_notes tool will still be called but responses may be limited
- Full-text search is production-ready for MVP
- Semantic search can be added later when LLM access is stable
