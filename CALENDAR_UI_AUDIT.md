# Calendar UI Audit & Redesign Plan

## A. Current UI Analysis

### Design Language

The Personal OS application uses a **minimalist, text-first design** with:

**Color Palette:**
- `ink` (#1D2824) - Primary text, dark gray-green
- `muted` (#718078) - Secondary text, sage gray
- `paper` (#F7F5F0) - Background, off-white/cream
- `card` (#FFFDF9) - Card backgrounds, near-white
- `line` (#E3E6DE) - Borders/dividers, very light sage
- `sage` (#B5C9B2) - Light background accent (hero sections)
- `sageDark` (#607A62) - Interactive elements, buttons
- `coral` (#D8755B) - Danger/alerts/emphasis
- `amber` (#D3A34B) - Secondary highlights

**Typography:**
- Headers: 34px, weight 800 (bold) in `ink`
- Section titles: 20px, weight 800 in `ink`
- Card titles: 15-17px, weight 700-800
- Body text: 13-16px, weight 400-700
- Labels/metadata: 10-13px, weight 700-800, often `muted`
- All-caps accents: 12px, weight 800, letterSpacing 2, `sageDark`

**Spacing Scale:**
- `xs`: 6px
- `sm`: 10px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px

**Components:**
- Border radius: 14-20px (rounded, not sharp)
- Cards: light background with subtle borders
- Buttons: full-width or flex with padding
- Lists: stacked cards or rows with time indicators
- Icons: Unicode/emoji (⌂, ◷, ◌, %, ?, etc.)

### Existing UI Patterns

**Home Screen:**
- Header with kicker (small caps label) + large title
- Hero section with sage background
- Section headers with "see more" links
- Card-based list items with left accent (colored dots or bars)
- CTA buttons: dark (ink) background, light text
- Empty states with larger copy
- Bottom FAB-style buttons (dark background, centered text + icon)

**Timeline Screen:**
- Same header pattern (kicker + title + subtitle)
- Filter chips in card background
- Grouped by date with date headings
- Rows with left time indicator + right card content
- Card type labels (uppercase, coral colored, small)
- Edit/delete inline actions at bottom of cards
- Inline edit forms (TextInput in card)

**Areas Screen:**
- Same header
- Grid layout (2 columns) for built-in areas
- Custom areas list below
- Form section (different background color)
- Reusable card/form component patterns

### Existing Calendar Implementation Issues

**Visual Inconsistencies:**
1. **Header mismatch:** Calendar uses standard navigation, not the kicker + title pattern
2. **Color usage:** Events hardcoded event type colors (not aligned with areas system)
3. **Card density:** Month view has tiny cells, hard to tap/interact
4. **Typography hierarchy:** Not consistent with app (missing kicker, subtitle)
5. **Navigation:** "+ Create" button added via header modification, not a primary pattern
6. **Event display:** Events shown as dots in month view, not scannable
7. **Reminder UI:** Built separately as modal, not integrated into event flow
8. **Spacing:** Uses raw pixel values, not consistent spacing scale

**Why It Feels Disconnected:**
- Uses different header pattern than other tabs
- Event type colors are generic, not tied to areas
- Month view optimization (small cells) conflicts with mobile-first philosophy
- Event creation flow is separate from main flow
- Reminder system tacked on as afterthought
- No day/agenda view that matches timeline pattern

---

## B. Proposed Calendar Design

### Design Principles

1. **Consistent with app language** - Use existing patterns
2. **Mobile-first** - Scannable, easy to tap, not cramped
3. **Google Calendar UX, Personal OS visual** - Behavior inspired, not copied
4. **Progressive disclosure** - Basic first, advanced optional
5. **Integration** - Events, reminders, areas work together

### Screen-by-Screen Design

#### 1. Calendar Tab Header

```
Standard header (matches timeline/home):

┌─────────────────────────────────────┐
│ CALENDAR (kicker)                   │
│ Your Schedule (title)               │
│ See what's ahead and plan your day. │
│ (subtitle)                          │
│                                     │
│ [Today] [Month] [Week] [Day] filter │
│ chips in card background            │
│                                     │
│ + Create Event button (dark card)   │
└─────────────────────────────────────┘
```

#### 2. Month View (Default)

**Design Approach:** Simple, uncluttered, shows events as indicators

```
┌─────────────────────────────────────┐
│ September 2026                      │
│ ‹  ›  (navigation arrows)            │
│                                     │
│ Su  Mo  Tu  We  Th  Fr  Sa          │
│  1   2   3   4   5   6   7          │
│  8   9  10  11  12  13  14          │
│ 15  16  17  18  19  20  21          │
│ 22  23  24  25  26  27  28  ◉ today │
│ 29  30                              │
│                                     │
│ Date selected: light background    │
│ Today: colored dot/highlight       │
│ Events: 1-2 small dots at bottom   │
│  If 3+: show "3+" indicator        │
└─────────────────────────────────────┘
```

**Implementation:**
- Clean grid, 7 columns (Sun-Sat)
- Each day cell: date number + event indicators
- Event indicators: 2-3 small dots (colors from area system)
- "More" indicator if 4+ events
- Selected date has subtle background
- Today has emphasis (colored circle or background)
- Tap day to go to Day View below

#### 3. Day Schedule View (Below Month)

When user scrolls or taps a date, show today/selected day's schedule:

```
┌─────────────────────────────────────┐
│ September 5, 2026 (date)            │
│                                     │
│ 09:00                               │
│ ┌──────────────────────────────────┐ │
│ │ Study Machine Learning           │ │
│ │ 9:00 AM – 11:00 AM               │ │
│ │ 🔔 30 min before                 │ │
│ └──────────────────────────────────┘ │
│                                     │
│ 12:30                               │
│ ┌──────────────────────────────────┐ │
│ │ Lunch with Sarah                 │ │
│ │ 12:30 PM – 1:30 PM               │ │
│ └──────────────────────────────────┘ │
│                                     │
│ 18:00                               │
│ ┌──────────────────────────────────┐ │
│ │ Gym                              │ │
│ │ 6:00 PM – 7:30 PM                │ │
│ └──────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Implementation:**
- Time labels on left (like timeline)
- Event cards stacked vertically
- Card shows: title, time range, reminder badge
- Tap card to open details
- Scrollable if many events
- All-day events at top

#### 4. Event Detail Screen

When user taps an event:

```
┌─────────────────────────────────────┐
│ ‹ Back                              │
│                                     │
│ ■ Study Machine Learning            │
│ [area indicator - color bar]        │
│                                     │
│ Tuesday, September 5                │
│ 9:00 AM – 11:00 AM                  │
│                                     │
│ Location: My Desk                   │
│                                     │
│ REMINDERS                           │
│ 🔔 30 minutes before                │
│ 📧 1 day before                     │
│ + Add notification                  │
│                                     │
│ RECURRENCE                          │
│ Every week on Tuesday               │
│                                     │
│ NOTES                               │
│ Review deep learning chapter 3      │
│                                     │
│ [✎ Edit Event]                     │
│ [🗑 Delete Event]                   │
└─────────────────────────────────────┘
```

**Implementation:**
- Clean detail layout (similar to timeline/activity detail)
- Area indicator (color bar or badge)
- Reminders inline (not modal)
- Edit/delete buttons at bottom

#### 5. Event Creation Flow

**Step 1: Quick Create Modal (Bottom Sheet)**

```
┌─────────────────────────────────────┐
│ ✕  New Event                        │
├─────────────────────────────────────┤
│                                     │
│ Title *                             │
│ [Study Machine Learning_____________]│
│                                     │
│ Date                                │
│ [Tomorrow_______] [Change]          │
│                                     │
│ Time                                │
│ [9:00 AM] – [11:00 AM]              │
│                                     │
│ Area                                │
│ [Learning ▼]                        │
│                                     │
│ Reminder                            │
│ [30 minutes before ▼]               │
│                                     │
│ [More options...] (if needed)       │
│                                     │
│ [Cancel] [Create Event]             │
└─────────────────────────────────────┘
```

**Implementation:**
- Bottom sheet modal (dismiss by swiping)
- Only essential fields visible
- "More options" expands for advanced settings
- Quick defaults (today, 1 hour duration, first area)
- Tap to edit date/time with native pickers

**Step 2: Advanced Options (Optional)**

Expanded view shows:
- Recurrence settings
- Description
- Color/area
- Additional reminders
- All-day toggle

---

## C. Files for Modification

### Files to Create

1. **`app/(tabs)/calendar.tsx`** (REWRITE)
   - New calendar UI following design language
   - Month/week/day views
   - Navigation and state management
   - Day schedule display

2. **`app/event/[id].tsx`** (CREATE)
   - Event detail screen
   - Edit functionality
   - Reminder management (inline)
   - Delete confirmation

3. **`app/event/create.tsx`** (CREATE)
   - Event creation flow
   - Quick create modal
   - Advanced options
   - Form validation

4. **`src/lib/calendar-utils.ts`** (CREATE)
   - Calendar calculations
   - Date formatting
   - Event grouping
   - Reminder scheduling

### Files to Modify (Minimally)

1. **`app/(tabs)/_layout.tsx`**
   - Keep reminders tab separate OR remove if integrated
   - Note: Currently has reminders tab added in session

2. **`src/types.ts`** (REVIEW)
   - May need to add event type definitions
   - Check if existing Activity type is used for events

3. **`supabase/schema.sql`** (REVIEW)
   - Check calendar_events table exists
   - Verify RLS policies
   - Check event_reminders table

### Files to Leave Untouched

- `app/(tabs)/home.tsx`
- `app/(tabs)/timeline.tsx`
- `app/(tabs)/areas.tsx`
- `src/theme.ts`
- `src/providers/AuthProvider.tsx`
- All other non-calendar screens

---

## D. Reusable Components & Patterns

The app uses direct React Native components, not a component library. Reuse these patterns:

**Header Pattern:**
```tsx
<Text style={styles.kicker}>CALENDAR</Text>
<Text style={styles.title}>Your Schedule</Text>
<Text style={styles.subtitle}>...</Text>
```

**Card Pattern:**
```tsx
<View style={styles.card}>
  {/* content */}
</View>
```

**Button Pattern:**
```tsx
<Pressable style={[styles.button, condition && styles.disabled]} onPress={handler}>
  <Text style={styles.buttonText}>Action</Text>
</Pressable>
```

**Filter Chips Pattern:**
```tsx
<View style={styles.filters}>
  {options.map(opt => (
    <Pressable
      key={opt}
      style={[styles.filter, selected === opt && styles.selectedFilter]}
      onPress={() => setSelected(opt)}
    >
      <Text style={[styles.filterText, selected === opt && styles.selectedFilterText]}>
        {opt}
      </Text>
    </Pressable>
  ))}
</View>
```

**List with Time Pattern:**
```tsx
<View style={styles.row}>
  <View style={styles.time}>
    <Text style={styles.timeText}>{time}</Text>
  </View>
  <View style={styles.card}>
    {/* content */}
  </View>
</View>
```

---

## E. Minimal Implementation Plan

### Phase 1: Core Calendar UI

1. Create `app/(tabs)/calendar.tsx` with:
   - Month view (grid layout)
   - Day schedule view (scrollable list below month)
   - Navigation (prev/next month)
   - Today indicator
   - Selected date state
   - Static layout (no events yet)

2. Styling:
   - Use existing theme (colors, spacing)
   - Follow header pattern from home/timeline
   - Filter chips for view mode selection
   - Match card radius and spacing

### Phase 2: Event Data Integration

1. Query calendar_events from Supabase
2. Display events in month (dot indicators)
3. Display events in day view (time-based cards)
4. Add tap handler to show event detail

### Phase 3: Event Detail Screen

1. Create `app/event/[id].tsx`
2. Show event information
3. Integrate reminder UI (inline)
4. Add edit/delete buttons

### Phase 4: Event Creation

1. Create `app/event/create.tsx`
2. Bottom sheet modal with quick create
3. Form validation
4. Save to database

### Phase 5: Reminders & Polish

1. Reminder scheduling
2. Notification integration
3. Edge case handling
4. Mobile testing

---

## F. Key Design Decisions

**Why not Google Calendar UI exactly:**
- Google Calendar uses Material Design
- This app uses custom minimalist design
- Copy only UX principles, adapt visuals

**Why month + day combined view:**
- Mobile phones have limited height
- Timeline pattern shows list below header
- Matches existing navigation mental model

**Why bottom sheet for create:**
- Doesn't break navigation flow
- Consistent with iOS/Material patterns
- Can be dismissed easily

**Why reminders inline in detail:**
- Not a separate system
- Faster than modal
- Matches activity detail patterns

**Why areas instead of event types:**
- App already has areas system
- Colors/categories already exist
- Reuse existing data model

---

## G. Expected Result

A calendar that:
- ✅ Looks like it belongs in Personal OS (same colors, typography, spacing)
- ✅ Functions like Google Calendar (month → day → event → detail)
- ✅ Integrates reminders naturally
- ✅ Reuses existing areas/categories
- ✅ Mobile-optimized (not cramped)
- ✅ Uses existing components/patterns
- ✅ Minimal database schema changes
- ✅ Clear user mental model

---

## H. Success Criteria

When complete, the calendar should:

1. **Visual integration**: Indistinguishable from other tabs
2. **Functionality**: All major interactions work (create, view, edit, delete, remind)
3. **Performance**: Smooth scrolling, quick loads
4. **Usability**: Users don't need instructions
5. **Mobile**: Works well on actual phones (not just emulators)

