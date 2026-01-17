# Watchlist, Notifications & UX Polish Design

> **Status:** Validated design ready for implementation

## Overview

Complete the Grant Agent feature set with watchlist functionality, notifications system, and UX polish to prepare for production deployment.

## Feature 1: Watchlist

### Save to Watchlist Flow

**Entry Points:**
- Heart/bookmark icon on grant cards in `/grants` listing
- "Save to Watchlist" button on `/grants/[id]` detail page

**Quick Options Modal:**
When user clicks save, show modal with:
- "Notify me about deadline" checkbox (default: checked)
- "Notify me about changes" checkbox (default: checked)
- Save / Cancel buttons

Visual feedback: filled icon indicates saved state.

### Watchlist Page (`/watchlist`)

**Layout:**
- Header with title and saved grant count
- Filter bar: deadline (upcoming/all), sector, notification status
- List of saved grants showing:
  - Grant name and provider
  - Deadline date
  - Notification toggle switches
- Actions per item: view grant, edit notifications, remove

**Empty State:**
- Illustration or icon
- "No grants saved yet"
- CTA button to browse grants

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/watchlist` | Add grant with notification prefs |
| GET | `/api/watchlist` | List user's watchlist with filters |
| PATCH | `/api/watchlist/[id]` | Update notification preferences |
| DELETE | `/api/watchlist/[id]` | Remove from watchlist |

---

## Feature 2: Weekly Digest Email

**Schedule:** Every Monday at 9am IST (Inngest cron)

**Contents:**
1. **New Grants** - Grants added in last 7 days matching user's sector/stage
2. **Upcoming Deadlines** - Watchlisted grants with deadlines in next 14 days

**Behavior:**
- Skip users with no relevant content (no empty digests)
- Sent via Resend with clean HTML template
- Links to grant detail pages

**Future Enhancement:** Add personalized recommendations based on full profile (sector, stage, location, DPIIT status, women-led).

---

## Feature 3: Notifications System

### Bell Icon (Header)

**Location:** Top navigation bar, next to user avatar

**Behavior:**
- Unread count badge (red dot with number)
- Dropdown on click showing last 5-10 notifications
- Each item shows: type icon, title, time ago, unread indicator
- Footer links: "Mark all read" and "View all"

### Notifications Page (`/notifications`)

**Layout:**
- Full paginated list of all notifications
- Filter tabs: All, Deadline Reminders, New Grants, Updates
- Actions: mark individual as read, mark all as read
- Click notification → navigate to relevant grant

### Notification Types

| Type | Trigger | Example Message |
|------|---------|-----------------|
| `deadline_reminder` | Cron job | "Startup India Seed Fund deadline in 7 days" |
| `new_grant` | Weekly digest | "New grant matches your profile: SIDBI Fund" |
| `grant_update` | Grant change detected | "Startup India Seed Fund has been updated" |

### Deadline Reminder Cron (Inngest)

**Schedule:** Daily at 9am IST

**Logic:**
1. Find watchlisted grants with deadlines in exactly 7 days or 1 day
2. For each match:
   - Create in-app notification
   - Send email via Resend (if user has `notify_deadline` enabled)

**Default Reminders:** 7 days and 1 day before deadline

**Settings Page Addition:**
Let users customize reminder timing with checkboxes:
- [ ] 14 days before
- [x] 7 days before (default)
- [ ] 3 days before
- [x] 1 day before (default)

---

## Feature 4: UX Polish

### Priority 1: Error Boundaries

- Global error boundary in root layout
- Page-level `error.tsx` for dashboard routes
- UI: "Something went wrong" message + retry button + home link
- Console logging (future: error tracking service)

### Priority 2: Dashboard Content (`/`)

**Sections:**
1. **Welcome** - "Welcome back, {startup name}"
2. **Upcoming Deadlines** - Top 3 watchlisted grants with nearest deadlines
3. **Application Progress** - In-progress applications with completion percentage
4. **Recent Grants** - 3-5 newest grants matching user's sector
5. **Quick Actions** - Cards: "Browse Grants", "Upload Documents", "My Applications"

### Priority 3: Loading States

Add skeleton loaders for:
- Grants list and detail
- KB documents list
- Applications list
- Watchlist
- Notifications dropdown and page

Use existing `<Skeleton>` component from shadcn/ui.

### Priority 4: Mobile Navigation

- Hamburger menu icon in header (visible below `lg` breakpoint)
- Slide-out drawer with same nav items as desktop sidebar
- Auto-close on route change or outside click

### Priority 5: Dark Mode

- Sun/moon toggle icon in header (next to bell icon)
- Uses `next-themes` (already installed)
- Default: follow system preference
- User can override with toggle (persisted in localStorage)
- All components already use Tailwind `dark:` variants via shadcn/ui

---

## Database

Existing tables already support this design:
- `watchlist` - startup_id, grant_id, notify_deadline, notify_changes
- `notifications` - startup_id, type, title, message, grant_id, is_read, sent_at

No schema changes required.

---

## Implementation Order

1. Watchlist API routes
2. Watchlist UI (save modal, page)
3. Notifications API routes
4. Notifications UI (bell, page)
5. Deadline reminder cron job
6. Weekly digest cron job
7. Error boundaries
8. Dashboard content
9. Loading states
10. Mobile navigation
11. Dark mode toggle
