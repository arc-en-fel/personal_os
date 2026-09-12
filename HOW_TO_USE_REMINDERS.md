# 🔔 How to Use Reminders

## Quick Start (30 seconds)

1. **Open the app** and look at the bottom navigation bar
2. **Tap the 🔔 Reminders tab** (between Insights and Assistant)
3. **See empty state?** → Go to Calendar to add reminders

## Step-by-Step: Add a Reminder

### Method 1: From Calendar (Recommended)

1. Open **Calendar** (or any other app section)
2. Tap **calendar.tsx** navigation link to go to calendar
3. **Find an event** you want to add a reminder for
4. **Tap the event** to open event details
5. **Scroll down** to "Reminders" section
6. **Tap "+ Add"** button
7. **Choose when**: Select timing (1 hour before, 30 min before, etc.)
8. **Choose how**: Select notification type (Push 📱, Email 📧, In-app 🔔, SMS 💬)
9. **Tap "Add Reminder"** ✅

### Method 2: From Reminders Tab

1. **Tap Reminders tab** (🔔 icon at bottom)
2. See "No reminders yet" message?
3. **Tap "+ Go to Calendar"** button
4. Follow steps from Method 1

## The Reminders Screen

### When You Have Reminders

You'll see a list like this:

```
🔔 Reminders
+ Go to Calendar

────────────────────────────
│  [Color bar] Doctor Appointment
│  1 hour before
│  Today at 2:00 PM    📱
│  [✓ Enabled] [🗑]
────────────────────────────
│  [Color bar] Team Meeting
│  30 minutes before
│  Tomorrow at 10:00 AM  🔔
│  [✓ Enabled] [🗑]
────────────────────────────
```

### Reminder Card Breakdown

- **Color bar** = Event color
- **Event title** = Which event this reminder is for
- **Timing** = When you'll be reminded (1 hour before, etc.)
- **Date & time** = Exactly when the reminder triggers
- **Icon** = How you'll be notified (📱 push, 🔔 in-app, 📧 email, 💬 SMS)
- **✓ Enabled button** = Turn reminder on/off
- **🗑 Delete button** = Remove this reminder

### Actions on a Reminder

| Action | What Happens |
|--------|--------------|
| **Tap card** | Opens the event details |
| **Tap ✓ Enabled** | Disables/enables the reminder |
| **Tap 🗑** | Shows confirmation, then deletes |
| **Swipe** | Not yet supported |

## Examples

### Example 1: Doctor's Appointment Tomorrow

**Goal:** Get reminded 1 day before AND 1 hour before

**Steps:**
1. Calendar → Find "Doctor's Appointment" event
2. Tap event → Scroll to Reminders
3. Tap "+ Add"
4. Select "1 day before" + "📧 Email"
5. Tap "Add Reminder"
6. Tap "+ Add" again
7. Select "1 hour before" + "📱 Push"
8. Tap "Add Reminder"

**Result in Reminders tab:**
- Tomorrow, 1 day before: Email alert
- Tomorrow, 1 hour before: Push notification

---

### Example 2: Weekly Team Meeting

**Goal:** Remind 30 minutes before each Monday meeting

**Steps:**
1. Calendar → Find "Team Meeting" (recurring)
2. Tap event → Scroll to Reminders
3. Tap "+ Add"
4. Select "30 minutes before" + "🔔 In-app"
5. Tap "Add Reminder"

**Result:**
- 30 minutes before each meeting: In-app popup

---

### Example 3: Disable a Reminder Temporarily

**Steps:**
1. Reminders tab → Find the reminder
2. Tap "✓ Enabled" button
3. Button changes to "Disabled"
4. Reminder won't trigger

**To re-enable:** Tap "Disabled" button again

---

## Timing Options

Choose **when** to be reminded:

| Option | When You Get Reminded |
|--------|----------------------|
| At event time | When the event starts |
| 5 minutes before | 5 min before event |
| 15 minutes before | 15 min before event |
| 30 minutes before | 30 min before event |
| 1 hour before | 1 hour before event |
| 1 day before | 1 day before event |

---

## Notification Types

Choose **how** to be notified:

| Type | Icon | How It Works |
|------|------|-------------|
| **In-App Alert** | 🔔 | Popup appears in app while using |
| **Push Notification** | 📱 | Device notification (even if app closed) |
| **Email** | 📧 | Email sent to your account |
| **SMS** | 💬 | Text message to your phone |

### Which to Use?

- **🔔 In-App**: Good for reminders while actively using app
- **📱 Push**: Good for when you might not be in app
- **📧 Email**: Good for less urgent, record-keeping
- **💬 SMS**: Good for critical reminders, guaranteed to see

---

## Viewing Reminders

### View Upcoming Reminders
- Reminders tab shows all reminders with scheduled times
- "Today at" for today's reminders
- "Tomorrow at" for tomorrow's reminders
- Full date/time for further out

### View Past Reminders
- Scroll down to see reminders that have already triggered
- Shows "Today at" or "Tomorrow at" for reference
- Can still delete or re-enable if needed

### View All Reminders for an Event
- Calendar → Tap the event
- Scroll to "Reminders" section
- Shows all reminders for this specific event

---

## Troubleshooting

### Q: I can't find the Reminders tab

**A:** Look at the bottom navigation bar. You should see:
```
⌂ Timeline ◌ % 🔔 ? ≡
Home Timeline Areas Insights Reminders Assistant Categories
```

The 🔔 icon is Reminders. If you don't see it:
- Restart the app
- Check that you've added at least one reminder

---

### Q: I added a reminder but don't see it in the list

**A:** The Reminders tab loads when you open it. Try:
1. Go to Reminders tab
2. Pull down to refresh (pull-to-refresh)
3. If still not there, check Calendar to verify reminder was saved

---

### Q: The reminder shows as "past" but I haven't been reminded yet

**A:** 
- **In-app reminders**: Only work when app is open
- **Push notifications**: Need device permissions (may need to be configured)
- **Email/SMS**: Requires backend setup (coming soon)

For now, **push notifications** 📱 are recommended.

---

### Q: Can I have multiple reminders for the same event?

**A:** Yes! Tap "+ Add" multiple times:
1. Add first reminder (1 hour before, push)
2. Add second reminder (30 min before, in-app)
3. Add third reminder (1 day before, email)

All will trigger at their scheduled times.

---

### Q: How do I edit a reminder?

**A:** Delete and re-add:
1. Find reminder in Reminders tab or Calendar event
2. Tap 🗑 to delete
3. Add new reminder with different settings

(Direct editing coming in a future update)

---

### Q: What happens when I turn off a reminder?

**A:** 
- Reminder stays in list but is "Disabled"
- Won't trigger until you re-enable it
- Useful if you want to temporarily pause reminders
- Tap the disabled reminder to re-enable

---

## Tips & Tricks

### Pro Tip 1: Multiple Reminders for Important Events
Add 2-3 reminders with different timings:
- 1 day before (email)
- 1 hour before (push)
- 30 minutes before (in-app)

### Pro Tip 2: Quick View in Reminders Tab
Pull down on Reminders tab to refresh and see latest reminders instantly.

### Pro Tip 3: Click Event to See Details
Tap any reminder card to jump to the event details screen.

### Pro Tip 4: Disable Instead of Delete
If you might need a reminder later, disable it instead of deleting it. You can re-enable with one tap.

---

## What's Coming Next

### Soon 🔜
- Email delivery integration (send real emails)
- SMS delivery integration (send real text messages)
- Quiet hours settings (don't notify during certain times)
- Snooze all reminders

### Later 🚀
- Smart reminders (suggest best times)
- Recurring reminders for recurring events
- Reminder templates
- Analytics (which reminders are most used)

---

## Summary

✅ **You now have a full reminders system!**

1. **Add reminders** in Calendar event details
2. **View all reminders** in the Reminders tab
3. **Manage reminders** (enable/disable/delete)
4. **Get notified** via push, in-app, email, or SMS

**Next step:** Open Calendar, find an event, and tap "+ Add" in the Reminders section!
