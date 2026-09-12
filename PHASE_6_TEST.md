# Phase 6: Analytics & Insights - End-to-End Test

## Test Objectives
- Verify query logging works in AI assistant
- Confirm pattern detection extracts topics correctly
- Validate insights generation produces accurate metrics
- Test UI displays analytics correctly
- Verify caching performance

## Test Setup

### Prerequisites
1. App is built and running
2. User is logged in
3. Supabase functions deployed:
   - ai-assistant (updated with logging)
   - generate-insights (new)
   - update-patterns (new)
4. Database migrations applied
5. RLS policies enabled

## Test Execution

### Test 1: Query Logging

**Objective**: Verify that queries are logged with metadata

**Steps**:
1. Open Assistant screen
2. Ask query: "What did I do this week?"
3. Wait for response
4. Check Supabase dashboard → assistant_queries table

**Expected Result**:
- New row in assistant_queries
- Fields populated:
  - `query`: "What did I do this week?"
  - `tools_used`: ["activity_summary"]
  - `response_time_ms`: > 0
  - `success`: true
  - `user_id`: matches current user
  - `created_at`: recent timestamp

**Pass/Fail**: ___

---

### Test 2: Multiple Query Logging

**Objective**: Verify multiple queries are logged separately

**Steps**:
1. Ask at least 5 different queries in the assistant:
   - "How much did I spend this week?"
   - "What are my active goals?"
   - "How am I doing overall?"
   - "Search my notes for 'React'"
   - "Compare my spending with last week"

2. Check assistant_queries table in Supabase

**Expected Result**:
- 5+ rows created
- Each with correct query text
- Tools vary based on query (finance_summary, goal_status, search_notes, compare_periods)
- Success rates tracked
- Response times recorded

**Pass/Fail**: ___

---

### Test 3: Pattern Detection

**Objective**: Verify topics are extracted from queries

**Steps**:
1. From Insights screen, tap refresh or reload
2. Function update-patterns should run automatically
3. Check Supabase dashboard → query_patterns table

**Expected Result**:
- Topics extracted: finance, learning, productivity, fitness, comparison
- pattern_type = 'topic'
- frequency > 0
- last_seen recently updated
- Examples:
  - pattern: "finance", frequency: 2+
  - pattern: "goal", frequency: 1+
  - pattern: "compare", frequency: 1+

**Pass/Fail**: ___

---

### Test 4: Tool Pattern Detection

**Objective**: Verify tools used are tracked

**Steps**:
1. Check query_patterns for tool entries
2. Should have rows where pattern_type = 'tool'

**Expected Result**:
- Entries like:
  - pattern: "activity_summary", type: "tool", frequency: 2
  - pattern: "finance_summary", type: "tool", frequency: 2
  - pattern: "goal_status", type: "tool", frequency: 1
  - pattern: "compare_periods", type: "tool", frequency: 1
- Reflects actual tool usage from queries

**Pass/Fail**: ___

---

### Test 5: Insights Generation

**Objective**: Verify insights are generated correctly

**Steps**:
1. Open Insights screen
2. Observe "Assistant Usage" section loads
3. Check for:
   - Total Questions count
   - Success rate %
   - Avg Response Time ms
   - Top Topics list
   - Recommendations

**Expected Result**:
- "Assistant Usage" section visible
- Total Questions: 5+ (from previous tests)
- Success rate: 80-100%
- Avg Response Time: 1000-5000ms range
- Top Topics: Shows "finance", "goal", etc.
- Recommendations visible and relevant
- Data loaded within 2-3 seconds

**Pass/Fail**: ___

---

### Test 6: Metrics Accuracy

**Objective**: Verify metrics are calculated correctly

**Steps**:
1. Count queries in assistant_queries table manually
2. Compare with "Total Questions" in UI
3. Calculate success rate:
   - Count where success = true
   - Divide by total
   - Compare with displayed rate
4. Check avg response time calculation

**Expected Result**:
- Total Questions matches actual query count
- Success rate calculation correct (e.g., 5 of 5 = 100%)
- Response time is reasonable average
- No data mismatches

**Calculation Example**:
```
If queries: 5 total, 4 successful
- Total Questions: 5 ✓
- Success Rate: 4/5 = 80% ✓
- Avg Response: sum of all response_time_ms / 5
```

**Pass/Fail**: ___

---

### Test 7: Top Topics Display

**Objective**: Verify top topics are displayed and ranked

**Steps**:
1. Look at "Top Topics" section in Insights
2. Note the order and counts
3. Verify against query_patterns table

**Expected Result**:
- Topics listed in frequency order (highest first)
- Correct counts shown
- Visual bar shows relative frequency
- Example display:
  ```
  Finance [████░░░░] 3
  Activity [██░░░░░░] 2
  Goal [██░░░░░░] 1
  ```

**Pass/Fail**: ___

---

### Test 8: Recommendations Generation

**Objective**: Verify recommendations are contextual

**Steps**:
1. Check Recommendations section
2. Read each recommendation
3. Verify they relate to user's patterns

**Expected Examples**:
- "You ask about finance frequently. Consider setting up finance reminders."
- "Your success rate is 100%. Keep asking specific questions."
- "Explore the compare_periods tool for trend analysis."
- "You primarily use activity_summary tool. Explore other tools."

**Expected Result**:
- 2-3 relevant recommendations
- Based on actual query patterns
- Actionable and helpful
- Not generic boilerplate

**Pass/Fail**: ___

---

### Test 9: Cache Performance

**Objective**: Verify insights cache works

**Steps**:
1. Open Insights screen (loads and caches)
2. Note load time: ____ms
3. Refresh/reload Insights screen
4. Note load time: ____ms
5. Check if "cached: true" in analytics data

**Expected Result**:
- First load: 2-3 seconds (queries database)
- Second load: <500ms (from cache)
- Cache expires after 1 hour
- Data identical between loads

**Pass/Fail**: ___

---

### Test 10: Period Selector

**Objective**: Verify period filtering works

**Steps**:
1. Open Insights screen
2. Click "1M" (30 days) button
3. Verify metrics update
4. Click "1W" (7 days) button
5. Verify different metrics

**Expected Result**:
- Metrics change when period changes
- 7-day metrics ≤ 30-day metrics
- Total questions different
- Success rate may differ
- Recommendations regenerated
- No errors

**Pass/Fail**: ___

---

### Test 11: Error Handling

**Objective**: Verify errors are handled gracefully

**Steps**:
1. Simulate network error (offline mode)
2. Try to load Insights
3. Reconnect
4. Reload
5. Try with invalid token (logout/login cycle)

**Expected Result**:
- No crashes
- Graceful error messages
- Can retry after error
- Data loads correctly after reconnect
- UI remains responsive

**Pass/Fail**: ___

---

### Test 12: UI Integration

**Objective**: Verify analytics displays in Insights tab properly

**Steps**:
1. Open Insights tab
2. Scroll through entire screen
3. Check all sections load:
   - Overview stats (Activities, Spending, etc.)
   - Assistant Usage section
   - Top Topics
   - Recommendations
   - Recurring Payments
   - Spending by Category
   - Active items

**Expected Result**:
- All sections visible
- Proper spacing and layout
- No overlapping text
- Readable fonts and colors
- Consistent with app theme
- Scrolls smoothly

**Pass/Fail**: ___

---

## Success Criteria

Phase 6 is complete when:
- ✓ Queries are logged with full metadata
- ✓ Patterns are correctly extracted from queries
- ✓ Insights metrics are accurate
- ✓ UI displays all analytics correctly
- ✓ Caching improves performance
- ✓ Error handling works gracefully
- ✓ Period selector filters data correctly
- ✓ Recommendations are contextual and helpful

## Known Limitations

- Pattern detection uses keyword matching (not ML)
- Recommendations are templated, not AI-generated
- Cache is user-local (not shared)
- Time patterns require 7+ days of data
- LLM issues may affect some queries, but logging still works

## Notes

- All test data can be cleared by deleting rows from assistant_queries
- Cache invalidates after 1 hour
- Pattern detection runs on insights screen refresh
- Functions are idempotent (safe to call multiple times)

## Sign-Off

- Date tested: ___________
- Tester: ___________
- Result: ✓ PASS / ✗ FAIL
- Notes: ___________________________________________________________
