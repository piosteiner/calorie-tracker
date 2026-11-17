const db = require('../database');

/**
 * Progress: points per day, levels and badges (2026-11 redesign).
 *
 * A day's points are worked out from what is logged on that day, every time a food log, weight log or
 * goal for that day changes. So deleting a log takes back what it earned, logging yesterday's dinner the
 * next morning still counts, and many small entries earn no more than one. Points are never spent.
 * Badges count habits (days, weeks), not streaks: a missed day never takes anything away.
 */

// Everyone started from zero on this day; earlier days earn nothing.
const START_DATE = '2026-11-17';

const POINTS = {
    DAY_LOGGED: 10,     // at least one food logged
    COMPLETE_DAY: 15,   // breakfast, lunch and dinner logged
    ON_TARGET: 15,      // complete day and 80–105 % of the day's goal
    WEIGH_IN: 10        // a weight logged that day
};
const TARGET_MIN = 0.8;
const TARGET_MAX = 1.05;

// Points needed for level n: 50·n·(n−1) → 0, 100, 300, 600, 1000, 1500, …
const levelStart = (n) => 50 * n * (n - 1);
function levelFor(total) {
    let n = 1;
    while (total >= levelStart(n + 1)) n++;
    return n;
}

// metric → how the count is read from the stats below
const BADGES = [
    { code: 'days_1',     name: 'First day',          description: 'Logged your food for a day',             metric: 'daysLogged',    target: 1 },
    { code: 'days_7',     name: 'Seven days',         description: '7 days logged',                          metric: 'daysLogged',    target: 7 },
    { code: 'full_week',  name: 'Full week',          description: 'Every day of one week (Mon–Sun) logged',  metric: 'fullWeeks',     target: 1 },
    { code: 'complete_10', name: 'Three meals',       description: '10 days with breakfast, lunch and dinner', metric: 'completeDays', target: 10 },
    { code: 'target_10',  name: 'On target',          description: '10 days on target',                      metric: 'onTargetDays',  target: 10 },
    { code: 'weigh_4',    name: 'Regular weigh-ins',  description: 'Weighed in during 4 different weeks',     metric: 'weighInWeeks',  target: 4 },
    { code: 'days_30',    name: 'One month',          description: '30 days logged',                         metric: 'daysLogged',    target: 30 },
    { code: 'complete_50', name: 'Meal planner',      description: '50 days with breakfast, lunch and dinner', metric: 'completeDays', target: 50 },
    { code: 'target_50',  name: 'Steady',             description: '50 days on target',                      metric: 'onTargetDays',  target: 50 },
    { code: 'weigh_12',   name: 'Keeping track',      description: 'Weighed in during 12 different weeks',    metric: 'weighInWeeks',  target: 12 },
    { code: 'days_100',   name: '100 days',           description: '100 days logged',                        metric: 'daysLogged',    target: 100 }
];

const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

class ProgressService {
    static get START_DATE() { return START_DATE; }
    static get POINTS() { return POINTS; }

    static async ensureTable() {
        if (this._ready) return;
        await db.query(`
            CREATE TABLE IF NOT EXISTS daily_progress (
                user_id INT NOT NULL,
                day DATE NOT NULL,
                logged TINYINT(1) NOT NULL DEFAULT 0,
                complete TINYINT(1) NOT NULL DEFAULT 0,
                on_target TINYINT(1) NOT NULL DEFAULT 0,
                weighed TINYINT(1) NOT NULL DEFAULT 0,
                points INT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, day),
                CONSTRAINT daily_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        this._ready = true;
    }

    /** What a day is worth, read from its logs and goal */
    static async scoreDay(userId, day) {
        const food = await db.query(`
            SELECT COUNT(*) AS n,
                   COUNT(DISTINCT CASE WHEN meal_category IN ('breakfast', 'lunch', 'dinner') THEN meal_category END) AS meals,
                   COALESCE(SUM(calories), 0) AS kcal
            FROM food_logs WHERE user_id = ? AND log_date = ?`, [userId, day]);
        const weight = await db.query('SELECT 1 FROM weight_logs WHERE user_id = ? AND log_date = ? LIMIT 1', [userId, day]);
        const goalRow = await db.query(`
            SELECT COALESCE(dg.goal_calories, u.daily_calorie_goal, 2000) AS goal
            FROM users u LEFT JOIN daily_goals dg ON dg.user_id = u.id AND dg.goal_date = ?
            WHERE u.id = ?`, [day, userId]);

        const n = Number(food[0]?.n || 0);
        const kcal = Number(food[0]?.kcal || 0);
        const goal = Number(goalRow[0]?.goal || 2000);
        const logged = n > 0;
        const complete = Number(food[0]?.meals || 0) === 3;
        const onTarget = complete && kcal >= goal * TARGET_MIN && kcal <= goal * TARGET_MAX;
        const weighed = weight.length > 0;
        const points = (logged ? POINTS.DAY_LOGGED : 0) + (complete ? POINTS.COMPLETE_DAY : 0)
            + (onTarget ? POINTS.ON_TARGET : 0) + (weighed ? POINTS.WEIGH_IN : 0);
        return { logged, complete, onTarget, weighed, points, kcal, goal };
    }

    static async totalPoints(userId) {
        const rows = await db.query('SELECT COALESCE(SUM(points), 0) AS total FROM daily_progress WHERE user_id = ?', [userId]);
        return Number(rows[0]?.total || 0);
    }

    /**
     * Recalculate the given days after a change; returns what changed, for the "+15" note in the app.
     * Never throws: progress must not break logging.
     */
    static async refreshDays(userId, days) {
        try {
            await this.ensureTable();
            const list = [...new Set(days.filter(isDate))].filter((d) => d >= START_DATE);
            if (!list.length) return null;
            const before = await this.totalPoints(userId);
            const gained = [];   // what became true, e.g. ['complete', 'onTarget'], for the note in the app
            for (const day of list) {
                const old = (await db.query('SELECT logged, complete, on_target, weighed FROM daily_progress WHERE user_id = ? AND day = ?', [userId, day]))[0] || {};
                const s = await this.scoreDay(userId, day);
                if (s.logged && !old.logged) gained.push('logged');
                if (s.complete && !old.complete) gained.push('complete');
                if (s.onTarget && !old.on_target) gained.push('onTarget');
                if (s.weighed && !old.weighed) gained.push('weighed');
                if (s.points > 0) {
                    await db.query(`
                        INSERT INTO daily_progress (user_id, day, logged, complete, on_target, weighed, points)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE logged = VALUES(logged), complete = VALUES(complete),
                            on_target = VALUES(on_target), weighed = VALUES(weighed), points = VALUES(points)`,
                        [userId, day, s.logged, s.complete, s.onTarget, s.weighed, s.points]);
                } else {
                    await db.query('DELETE FROM daily_progress WHERE user_id = ? AND day = ?', [userId, day]);
                }
            }
            const after = await this.totalPoints(userId);
            const newBadges = await this.awardBadges(userId);
            return {
                change: after - before,
                gained,
                total: after,
                level: levelFor(after),
                levelUp: levelFor(after) > levelFor(before),
                newBadges
            };
        } catch (error) {
            console.error('Progress refresh failed:', error.message);
            return null;
        }
    }

    static async stats(userId) {
        const rows = await db.query(`
            SELECT COALESCE(SUM(logged), 0) AS daysLogged,
                   COALESCE(SUM(complete), 0) AS completeDays,
                   COALESCE(SUM(on_target), 0) AS onTargetDays,
                   COUNT(DISTINCT CASE WHEN weighed THEN YEARWEEK(day, 3) END) AS weighInWeeks
            FROM daily_progress WHERE user_id = ?`, [userId]);
        const weeks = await db.query(`
            SELECT COUNT(*) AS n FROM (
                SELECT YEARWEEK(day, 3) AS w FROM daily_progress WHERE user_id = ? AND logged = 1
                GROUP BY w HAVING COUNT(*) = 7) full`, [userId]);
        const r = rows[0] || {};
        return {
            daysLogged: Number(r.daysLogged || 0),
            completeDays: Number(r.completeDays || 0),
            onTargetDays: Number(r.onTargetDays || 0),
            weighInWeeks: Number(r.weighInWeeks || 0),
            fullWeeks: Number(weeks[0]?.n || 0)
        };
    }

    /** Badges are kept once earned, even if a log is deleted later */
    static async awardBadges(userId) {
        const stats = await this.stats(userId);
        const have = new Set((await db.query('SELECT achievement_code FROM user_achievements WHERE user_id = ?', [userId]))
            .map((r) => r.achievement_code));
        const earned = [];
        for (const b of BADGES) {
            if (have.has(b.code) || stats[b.metric] < b.target) continue;
            await db.query(`
                INSERT IGNORE INTO user_achievements (user_id, achievement_code, achievement_name, achievement_description, points_awarded)
                VALUES (?, ?, ?, ?, 0)`, [userId, b.code, b.name, b.description]);
            earned.push({ code: b.code, name: b.name, description: b.description });
        }
        return earned;
    }

    /** Everything the Progress tab shows */
    static async getProgress(userId, today) {
        await this.ensureTable();
        const day = isDate(today) ? today : new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' });
        // today is recalculated on every view (also covers a goal changed without a log change)
        await this.refreshDays(userId, [day]);
        const todayScore = day >= START_DATE ? await this.scoreDay(userId, day) : null;
        const total = await this.totalPoints(userId);
        const level = levelFor(total);
        const stats = await this.stats(userId);
        const earnedRows = await db.query(`
            SELECT achievement_code, DATE_FORMAT(unlocked_at, '%Y-%m-%d') AS earned_on
            FROM user_achievements WHERE user_id = ?`, [userId]);
        const earned = new Map(earnedRows.map((r) => [r.achievement_code, r.earned_on]));
        const recent = await db.query(`
            SELECT DATE_FORMAT(day, '%Y-%m-%d') AS day, logged, complete, on_target, weighed, points
            FROM daily_progress WHERE user_id = ? ORDER BY day DESC LIMIT 14`, [userId]);

        return {
            points: total,
            level,
            levelStart: levelStart(level),
            nextLevelAt: levelStart(level + 1),
            startDate: START_DATE,
            rules: { ...POINTS, targetMin: TARGET_MIN, targetMax: TARGET_MAX },
            today: todayScore && { date: day, ...todayScore },
            stats,
            badges: BADGES.map((b) => ({
                code: b.code, name: b.name, description: b.description, target: b.target,
                progress: Math.min(stats[b.metric], b.target),
                earned: earned.has(b.code), earnedOn: earned.get(b.code) || null
            })),
            recentDays: recent.map((r) => ({
                day: r.day, logged: !!r.logged, complete: !!r.complete, onTarget: !!r.on_target, weighed: !!r.weighed, points: r.points
            }))
        };
    }
}

module.exports = ProgressService;
