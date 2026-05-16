# Baseball Scorekeeping Platform Overview

## High-Level Platform Overview

This platform will allow users to log in, create/manage games, enter team lineups, and score baseball games using a digital version of a traditional baseball scorebook.

The core experience should feel familiar to someone who has used a paper scorebook, while also making scoring faster, easier to edit, and capable of producing game summaries and statistics automatically.

---

## Core User Flow

1. User creates an account / logs in
2. User creates or selects a team
3. User creates a new game
4. User enters both teams’ lineups
5. User starts scoring the game
6. User records each plate appearance and play
7. The system updates the scorebook grid, count, outs, inning, score, and runners
8. User can review, edit, or finalize the game
9. Stats and game summaries are generated

---

## Main Areas of the Platform

### 1. Authentication & User Accounts

Users need to be able to securely access their games and teams.

Needed features:

- Sign up
- Log in / log out
- Password reset
- User profile
- Saved games per user
- Optional roles later:
  - Coach
  - Parent/fan
  - Scorekeeper
  - Team admin

---

### 2. Team Management

Users should be able to create and manage teams.

Needed features:

- Create a team
- Edit team name, season, division, etc.
- Add players to roster
- Manage player details:
  - Name
  - Jersey number
  - Batting order eligibility
  - Positions
  - Throws/bats
- Save teams for future games

This prevents users from re-entering lineups every game.

---

### 3. Game Setup

Before scoring starts, the user creates a game.

Needed features:

- Select home team
- Select away team
- Set game date/time
- Choose number of innings
- Identify home/away batting order
- Enter or import lineups
- Assign starting fielding positions
- Set scoring rules:
  - Youth baseball rules
  - Extra hitters
  - DH
  - Re-entry rules
  - Mercy rule
  - Pitch count tracking, if needed

---

## 4. Lineup Entry

Users need a simple way to enter and manage batting orders.

Needed features:

- Batting order list
- Player name
- Jersey number
- Defensive position
- Substitute tracking
- Bench players
- Ability to edit lineup before or during the game
- Mark current batter
- Highlight previous and upcoming batters

The scoring screen should always show the current batting team’s lineup.

---

## 5. Main Scorekeeping Interface

This is the heart of the application.

The screen should include:

### Current Game State

- Inning
- Top/bottom half
- Score
- Outs
- Balls
- Strikes
- Base runners
- Current batter
- Current pitcher
- Current defensive alignment, optional

### Batting Team Lineup

- Full batting order
- Current batter highlighted
- Batters who already hit in the inning
- Player substitutions
- Quick navigation to a player’s scorebook row

### Traditional Scorebook Grid

A digital grid that resembles a paper scorebook:

- Rows = players in lineup
- Columns = innings / plate appearances
- Each cell = result of a batter’s plate appearance
- Cell should show scorekeeping notation, such as:
  - 1B
  - 2B
  - 3B
  - HR
  - BB
  - K
  - F8
  - 6-3
  - FC
  - E5
  - HBP
  - SAC
  - SB
  - CS
  - RBI markers
  - Runs scored
  - Outs recorded

The grid should support:

- Adding plays
- Editing plays
- Undoing last play
- Reviewing inning-by-inning history
- Showing runner movement
- Marking runs and RBIs

---

## 6. Pitch Count / Balls and Strikes Tracking

Users should be able to track each pitch or just plate appearance results.

Needed features:

- Ball button
- Strike button
- Foul button
- In-play button
- Automatic count updates
- Automatic walk on 4 balls
- Automatic strikeout on 3 strikes
- Optional pitch-by-pitch history
- Pitch count per pitcher
- Reset count after plate appearance

Optional advanced features:

- Pitch type
- Pitch location
- Swinging/called strike
- Contact quality

---

## 7. Play Scoring System

Users need a fast way to score baseball plays.

Common play input options:

### Basic Offensive Outcomes

- Single
- Double
- Triple
- Home run
- Walk
- Strikeout
- Hit by pitch
- Error
- Fielder’s choice
- Sacrifice bunt
- Sacrifice fly
- Groundout
- Flyout
- Lineout
- Popout

### Defensive Scoring

- Select fielder(s) involved:
  - 1 = pitcher
  - 2 = catcher
  - 3 = first base
  - 4 = second base
  - 5 = third base
  - 6 = shortstop
  - 7 = left field
  - 8 = center field
  - 9 = right field
- Examples:
  - 6-3 groundout
  - F8 flyout
  - 5-4-3 double play
  - E6 error

### Runner Advancement

After a ball is put in play, the app should ask or infer:

- Where did the batter end up?
- Where did each runner advance?
- Was a runner out?
- Did a run score?
- Was there an RBI?
- Was there an error?
- Was there a stolen base, passed ball, wild pitch, balk, etc.?

---

## 8. Game State Engine

A key technical part of the platform is the engine that manages the game state.

It should track:

- Current inning
- Top/bottom
- Outs
- Balls
- Strikes
- Batting order position
- Base occupancy
- Score
- Runs by inning
- Plate appearance history
- Pitch history
- Substitutions
- Player stats
- Team stats

The engine should be responsible for:

- Moving to the next batter
- Advancing innings
- Updating outs
- Updating count
- Moving runners
- Updating score
- Updating scorebook cells
- Validating impossible plays
- Supporting undo/edit

This should be separated from the UI so the rules can be tested independently.

---

## 9. Game Review and Editing

Scorekeeping mistakes happen often, so editing is important.

Needed features:

- Undo last pitch
- Undo last play
- Edit plate appearance
- Edit runner advancement
- Correct lineup changes
- View play-by-play log
- Recalculate game state after edits
- Mark game as final

A play/event log is very important because it allows you to rebuild the game state from the beginning.

---

## 10. Statistics and Reporting

Once games are scored, the app can automatically generate stats.

Basic batting stats:

- At-bats
- Hits
- Singles
- Doubles
- Triples
- Home runs
- Runs
- RBIs
- Walks
- Strikeouts
- Hit by pitch
- Sacrifice flies
- Sacrifice bunts
- Stolen bases
- Batting average
- On-base percentage
- Slugging percentage
- OPS

Pitching stats:

- Innings pitched
- Hits allowed
- Runs
- Earned runs
- Walks
- Strikeouts
- Hit batters
- Pitch count
- ERA
- WHIP

Fielding stats:

- Putouts
- Assists
- Errors
- Double plays

Reports:

- Box score
- Line score
- Traditional scorebook view
- Play-by-play summary
- Team/player season stats

---

## Suggested Technical Architecture

### Frontend

A modern web app framework:

- React / Next.js
- Vue / Nuxt
- SvelteKit

Main frontend components:

- Login/register screens
- Dashboard
- Team manager
- Roster manager
- Game setup wizard
- Scorekeeping screen
- Scorebook grid component
- Lineup panel
- Count/base/out controls
- Play entry modal
- Game summary/stat pages

---

### Backend

Needed backend capabilities:

- User authentication
- Database access
- Game persistence
- Team/roster storage
- Event log storage
- Stats calculation
- API endpoints for game actions

Possible backend choices:

- Node.js with Express/NestJS
- Next.js API routes
- Ruby on Rails
- Django
- Laravel

---

### Database

Main database tables/models:

- Users
- Teams
- Players
- Team rosters
- Games
- Game teams
- Lineups
- Lineup spots
- Game events
- Plate appearances
- Pitches
- Runner advancements
- Substitutions
- Game stats
- Player stats

Recommended database:

- PostgreSQL

---

## Important Design Recommendation

Use an **event-based scoring model**.

Instead of only storing the current game state, store every scoring action as an event:

Examples:

- Pitch thrown
- Batter walked
- Batter singled
- Runner advanced
- Runner scored
- Out recorded
- Substitution made
- Inning ended

Then the current game state can be rebuilt from the event history.

Benefits:

- Easier undo
- Easier editing
- Accurate game history
- Easier stats generation
- Better debugging
- Allows replaying the game later

---

## MVP Feature Set

For the first version, focus on:

1. User authentication
2. Team and roster creation
3. Game creation
4. Lineup entry
5. Main scorekeeping screen
6. Balls, strikes, outs tracking
7. Basic play scoring:
   - Single
   - Double
   - Triple
   - Home run
   - Walk
   - Strikeout
   - Out
   - Error
8. Runner advancement
9. Scorebook grid display
10. Undo last play
11. Save/resume game
12. Basic box score

---

## Later Advanced Features

- Live game sharing
- Mobile/tablet-optimized scoring
- Offline mode
- Pitch charts
- Spray charts
- Defensive positioning
- League/team management
- Multiple scorekeepers
- Stat exports
- PDF scorebook export
- GameChanger-style live updates
- Video tagging
- AI-assisted scoring suggestions
- Mobile app

---

## Key Challenge

The hardest part will not be login or database setup. The hardest part will be the **baseball game state and scoring logic**.

You should invest early in:

- A well-designed event model
- A tested scoring engine
- Clear handling of runner advancement
- Undo/edit support
- A flexible scorebook cell data structure

That foundation will make the rest of the platform much easier to build.
