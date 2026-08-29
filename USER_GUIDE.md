# BGFC Intramurals Tabulation System — User Guide

This guide explains how to use the Web-Based Intramurals Tabulation System once it has been deployed. It covers everything from setting up a season for the first time to scoring a live match and reading the final standings.

---

## 1. Who Uses This System

| Role | Can do | Needs an account? |
|---|---|---|
| **Administrator** | Full control: seasons, teams, events, tabulators, scoring, results, user accounts | Yes |
| **Tabulator** | Score live matches, but only for events they've been assigned to | Yes |
| **Public / Spectators** | View live scores, standings, and schedules | No — no login required |

Everyone — students, parents, faculty, visitors — can open the site and watch scores update live without signing in. Only event organizers need an account.

---

## 2. Getting Started

1. Open the site in a web browser (desktop or mobile).
2. You'll land on the **public home page**, showing the current season and quick links to **Live**, **Standings**, and **Schedule**.
3. If you're an organizer or scorer, click **Staff Sign In** in the top-right corner and log in with the email and password your administrator gave you.

> An administrator must create every account ahead of time (see [Section 5.7](#57-managing-user-accounts)) — there is no public sign-up page and no self-service "forgot password" link. If you're locked out, ask an administrator to reset your password from the **Users** page.

---

## 3. For Spectators — Watching Without an Account

No login is needed for any of the following pages, reachable from the navigation bar on every public page:

- **Home** — a snapshot of the active season with quick links.
- **Live** — every match currently in progress, with scores that refresh automatically every few seconds. If nothing is being played, it says so.
- **Standings** — the overall team rankings, ranked by total points earned across every finalized event this season. Teams tied on points share the same rank number.
- **Schedule** — every event in the season. Click an event to see its match list (with running scores and final results) or, for placement-style events, the finalized results.

Scores and standings are **not instant to the millisecond** — the page checks for updates every 3–15 seconds depending on the page, so allow a brief delay after a point is scored.

---

## 4. First-Time Setup Checklist (Administrators)

Before any scoring can happen, an administrator needs to set things up in this order:

1. **Create and activate a season** — [4.1](#41-seasons)
2. **Add teams** to that season — [4.2](#42-teams)
3. **Create tabulator accounts** for the people who will run the scoreboard — [5.7](#57-managing-user-accounts)
4. **Set the points-per-placement rules** for how overall champion points are awarded — [5.5](#55-points-rules)
5. **Create events** (the individual sports/competitions) — [4.3](#43-events)
6. **Assign a tabulator** to each event — [4.4](#44-assigning-tabulators-to-an-event)
7. **Schedule matches** for team-vs-team events — [4.5](#45-scheduling-a-match)

Once this is done, tabulators can start scoring and the public pages start showing real data.

### 4.1 Seasons

Go to **Seasons** in the sidebar.

- Click **New Season**, give it a name (e.g. "Intramurals 2027"), and set a start and end date.
- Only **one season can be active at a time**. Click **Set as active** on a season's card to make it the one everyone sees — this automatically deactivates whichever season was active before.
- Everything else in the system (teams, events, standings) belongs to a specific season, so make sure the right one is active before adding teams or events.

### 4.2 Teams

Go to **Teams**, pick the season from the dropdown at the top, then click **New Team**.

- Give the team a name and pick a color (used as its badge color everywhere in the system, including the public scoreboard).
- Team names must be unique within a season.
- A team can be deleted only if it has **no matches or results recorded yet**. If you try to delete a team that's already played, you'll get an error explaining why — remove or reassign those matches/results first, or simply leave the team in place as part of the season's history.

### 4.3 Events

Go to **Events**, pick the season, then click **New Event**. An event is one sport or competition — e.g. "Men's Basketball" or "Folk Dance Competition."

Choose a **type**:
- **Team vs. Team** — for sports played as head-to-head matches (basketball, volleyball, chess, etc.). You'll be able to schedule individual matches and score them live.
- **Placement** — for competitions judged on a final ranking rather than matches (dance, cheering, track and field). No matches are scheduled; results are entered directly once the competition is over.

Each event card shows its type, current status (Upcoming / Ongoing / Completed / Cancelled), and how many matches or results it has. Click into an event to manage it.

### 4.4 Assigning Tabulators to an Event

Open an event and find the **Assigned Tabulators** card.

- Pick a tabulator from the **Assign a tabulator** dropdown. Only accounts with the Tabulator role appear here.
- A tabulator can only score matches for events they're assigned to — if they try to open a match outside their assignments, the system blocks it.
- An administrator can always score any match, assigned or not, as a fallback.
- Click the **×** on a tabulator's badge to unassign them.

### 4.5 Scheduling a Match

Only for **Team vs. Team** events.

From inside the event page, click **Schedule Match** (or use the **Matches** page in the sidebar for a season-wide view across all team events). Fill in:
- Home team and away team (must be two different teams)
- Date and time
- Venue (optional)

The match starts in **Scheduled** status. A match can only be edited or deleted while it's still Scheduled — once it goes live, those details are locked in as part of the record.

### 4.6 The Overview Dashboard

The **Dashboard** page (the first thing you see after logging in) shows a live snapshot:
- **Total Teams**, **Ongoing Events**, and **Live Matches Now** for the active season
- **Current Point Leader** — the team on top of the standings right now, or "X teams tied" if there's a tie at the top

Tabulators see a simpler version scoped to just their own assignments: **My Assigned Events** and **My Live Matches**.

---

## 5. Running an Event Day (Administrators & Tabulators)

### 5.1 Starting a Match

1. Go to **Scoreboard** in the sidebar (shows every match you're allowed to control — assigned events only for tabulators, everything for admins).
2. Click a match card to open its live control panel.
3. Click **Start Match**. The match status changes to **Live**, and the score buttons become active. The public **Live** page will now show this match automatically.

### 5.2 Scoring Live

On the control panel, each team has its own panel with its color, name, and current score in large type. Tap:
- **+1 / +2 / +3** to add points (covers free throws, field goals, three-pointers, or any point value your sport uses)
- **−1** to correct a mistaken point

Every tap updates the score immediately for you and, within a few seconds, on the public Live page too. Scores can never go below zero, and the buttons only work while the match is Live — you can't accidentally score a match that hasn't started or has already ended.

### 5.3 Finishing a Match

When play is over, click **Finish Match**. The system automatically works out the winner from the final score (or records it as a draw if the scores are tied) and locks the match as **Finished** — it can no longer be scored.

### 5.4 Finalizing Event Results

Once a **Team vs. Team** event's matches are *all* finished (or immediately, for a **Placement** event), an administrator finalizes the official results:

1. Open the event page. The card at the bottom will say **Finalize Results** (it becomes **Results** afterward, and stays editable).
2. Enter a placement number (1st, 2nd, 3rd, …) next to each team that competed in this event. Leave a team blank if it didn't place.
3. Click **Finalize Results**.

This assigns each placed team a number of overall points, based on your season's points-rules table, and immediately updates the public standings. If a team's placement doesn't have a points rule configured, it's recorded as 0 points and you'll see a warning — go set that up in **Points Rules** ([5.5](#55-points-rules)) and re-finalize.

> **Team vs. Team events won't let you finalize until every scheduled match is Finished.** This is deliberate — it stops incomplete results from becoming official.
>
> You can re-finalize an event later (e.g. to correct a data-entry mistake) — just re-enter the placements and click the button again. Past points already awarded aren't affected by later changes to the points-rules table, only by re-finalizing that specific event.

### 5.5 Points Rules

Go to **Points Rules**, pick a season, and set how many overall points each placement is worth (e.g. 1st = 10, 2nd = 7, 3rd = 5). Use **Add Row** for more placements and **Save** when done. This table is what every event's finalized results are scored against.

### 5.6 Standings

The **Standings** page (public, and also visible to staff) simply adds up each team's finalized points across every event in the season. There's nothing to configure here beyond the points rules — it always reflects the latest finalized results.

### 5.7 Managing User Accounts

Go to **Users** (administrators only).

- Click **New User**, fill in name, email, password, and role (**Admin** or **Tabulator**).
- Change someone's role or deactivate their account directly from the table — deactivating an account (toggle off **Active**) blocks them from signing in without deleting their history.
- There's no self-service password reset — to help someone who's forgotten their password, an administrator should create the account fresh or ask your deployment operator for a manual reset.

---

## 6. Troubleshooting & FAQ

**"I can't delete a team / event / season."**
The system won't let you delete anything that already has matches or results attached, to protect the historical record. This is expected — either leave it in place (it doesn't hurt anything to keep old teams/events around) or remove the matches/results referencing it first.

**"The Finalize Results button is greyed out."**
For a Team vs. Team event, every scheduled match must be Finished first. Check the event's Matches list for anything still Scheduled or Live.

**"The score doesn't match what I just entered."**
Live pages refresh every few seconds rather than instantly — wait a moment and it will catch up. If it's still wrong after refreshing the page, double-check the scoreboard control panel is showing the correct match.

**"A tabulator says they can't score their match."**
Confirm they've been assigned to that match's event (see [4.4](#44-assigning-tabulators-to-an-event)) and that their account is still Active.

**"Two teams are tied for first place — who's the champion?"**
The standings page shows both teams at rank 1 rather than arbitrarily picking one. Deciding a real-world tiebreaker (head-to-head, a runoff, co-champions) is a policy call for your organizing committee — the system reports the tie accurately rather than guessing.

**"I activated the wrong season."**
Just activate the correct one — activating any season automatically deactivates whichever one was active before. No data is lost; teams and events stay attached to whichever season they were created under.
