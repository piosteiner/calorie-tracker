'use strict';

/**
 * jobs/mealReminders.js
 *
 * Cron-based meal reminder push notifications.
 *
 * Schedule (all times server-local, adjust TZ env var as needed):
 *   08:30 — Breakfast reminder (no breakfast logged yet today)
 *   13:00 — Lunch reminder     (no lunch logged yet today)
 *   19:00 — Dinner reminder    (no dinner logged yet today)
 *
 * Only users who have at least one active push subscription AND
 * have logged food at least once in the last 7 days are reminded
 * (avoids spamming users who have stopped using the app).
 */

const cron        = require('node-cron');
const db          = require('../database');
const pushService = require('../services/pushService');

const REMINDERS = [
    {
        cronExpr: '30 8 * * *',
        category: 'breakfast',
        title:    "Don't skip breakfast! 🍳",
        body:     "You haven't logged breakfast yet. Start your day right!"
    },
    {
        cronExpr: '0 13 * * *',
        category: 'lunch',
        title:    'Time for lunch! 🥗',
        body:     "You haven't logged lunch yet. Keep your energy up!"
    },
    {
        cronExpr: '0 19 * * *',
        category: 'dinner',
        title:    'Dinner time! 🍽️',
        body:     "You haven't logged dinner yet. Complete your day's tracking!"
    }
];

/**
 * Find all users who:
 *  - have at least one push subscription
 *  - have NOT logged the given meal category today
 *  - have logged at least once in the past 7 days (active user)
 */
async function findUsersToRemind(category) {
    const today = new Date().toISOString().split('T')[0];

    const rows = await db.query(
        `SELECT DISTINCT ps.user_id
         FROM push_subscriptions ps
         -- active user check
         INNER JOIN food_logs fl_active
             ON fl_active.user_id = ps.user_id
            AND fl_active.log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         -- has NOT logged this meal today
         WHERE ps.user_id NOT IN (
             SELECT user_id
             FROM food_logs
             WHERE log_date = ?
               AND meal_category = ?
         )`,
        [today, category]
    );

    return rows.map(r => r.user_id);
}

async function sendReminder(reminder) {
    const userIds = await findUsersToRemind(reminder.category);

    if (userIds.length === 0) return;

    console.log('[mealReminders] Sending %s reminder to %d user(s)', reminder.category, userIds.length);

    for (const userId of userIds) {
        try {
            await pushService.notifyUser(userId, {
                title: reminder.title,
                body:  reminder.body,
                icon:  '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                data:  { url: '/', category: reminder.category }
            });
        } catch (e) {
            console.error('[mealReminders] Error notifying user %d: %s', userId, e.message);
        }
    }
}

function start() {
    REMINDERS.forEach(function (reminder) {
        cron.schedule(reminder.cronExpr, function () {
            sendReminder(reminder).catch(function (e) {
                console.error('[mealReminders] Scheduler error:', e.message);
            });
        });
        console.log('[mealReminders] Scheduled %s reminder (%s)', reminder.category, reminder.cronExpr);
    });
}

module.exports = { start };
