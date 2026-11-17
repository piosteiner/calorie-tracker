# Points, levels and badges

Since 2026-11-17 (`START_DATE` in `backend/services/progressService.js`). The older system (points per
item, multipliers, a shop, daily claim button) was removed; its tables were dropped after a backup.

## Points are per day

A day's points are worked out from what is logged for it, every time a food log, weigh-in or goal of
that day is added, changed or deleted (`ProgressService.refreshDays`). Deleting takes back what a log
earned; logging yesterday's dinner the next morning still counts. Points are never spent.

| For | Points |
|---|---|
| At least one food logged | 10 |
| Breakfast, lunch and dinner logged | +15 |
| On target: all 3 meals and 80–105 % of the day's goal | +15 |
| A weigh-in | 10 |

Stored per day in `daily_progress` (user_id, day, logged, complete, on_target, weighed, points).
The day's goal is `daily_goals.goal_calories` for that date, else `users.daily_calorie_goal`.

## Levels

Level n starts at 50·n·(n−1) points: 0, 100, 300, 600, 1000, 1500, …

## Badges

Counted from `daily_progress`, kept once earned (in `user_achievements`). No streaks: a missed day never
takes anything away.

| Code | Badge | For |
|---|---|---|
| days_1 / days_7 / days_30 / days_100 | First day, Seven days, One month, 100 days | days logged |
| full_week | Full week | every day of one Mon–Sun week logged |
| complete_10 / complete_50 | Three meals, Meal planner | days with breakfast, lunch and dinner |
| target_10 / target_50 | On target, Steady | days on target |
| weigh_4 / weigh_12 | Regular weigh-ins, Keeping track | different weeks with a weigh-in |

## API

- `GET /api/rewards/progress?today=YYYY-MM-DD` — points, level, today's checklist, badges, totals.
- Food log, weight and goal responses carry `progress: { change, gained, total, level, levelUp, newBadges }`;
  `web/progress.js` shows a short note from it and refreshes the points chip.
