const mysql = require('mysql2/promise');

class Database {
    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'calorie_tracker',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    async query(sql, params = []) {
        try {
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async transaction(callback) {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async close() {
        await this.pool.end();
    }

    // User queries
    async createUser(username, passwordHash, email = null, calorieGoal = 2000) {
        const sql = `
            INSERT INTO users (username, password_hash, email, daily_calorie_goal) 
            VALUES (?, ?, ?, ?)
        `;
        return await this.query(sql, [username, passwordHash, email, calorieGoal]);
    }

    async getUserByUsername(username) {
        const sql = 'SELECT * FROM users WHERE username = ? AND is_active = TRUE';
        const results = await this.query(sql, [username]);
        return results[0];
    }

    async getUserById(id) {
        const sql = 'SELECT * FROM users WHERE id = ? AND is_active = TRUE';
        const results = await this.query(sql, [id]);
        return results[0];
    }

    // Session queries
    async createSession(sessionId, userId, expiresAt) {
        const sql = `
            INSERT INTO sessions (id, user_id, expires_at) 
            VALUES (?, ?, ?)
        `;
        return await this.query(sql, [sessionId, userId, expiresAt]);
    }

    async getSession(sessionId) {
        const sql = `
            SELECT s.*, u.username, u.daily_calorie_goal 
            FROM sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = ? AND s.is_active = TRUE AND s.expires_at > NOW()
        `;
        const results = await this.query(sql, [sessionId]);
        return results[0];
    }

    async deleteSession(sessionId) {
        const sql = 'UPDATE sessions SET is_active = FALSE WHERE id = ?';
        return await this.query(sql, [sessionId]);
    }

    // Food queries
    async getAllFoods() {
        const sql = 'SELECT * FROM foods ORDER BY name ASC';
        return await this.query(sql);
    }

    async searchFoods(searchTerm) {
        const sql = `
            SELECT * FROM foods 
            WHERE name LIKE ? 
            ORDER BY name ASC 
            LIMIT 20
        `;
        return await this.query(sql, [`%${searchTerm}%`]);
    }

    async getFoodById(id) {
        const sql = 'SELECT * FROM foods WHERE id = ?';
        const results = await this.query(sql, [id]);
        return results[0];
    }

    async createFood(name, caloriesPerUnit, defaultUnit, category = null, brand = null) {
        const sql = `
            INSERT INTO foods (name, calories_per_unit, default_unit, category, brand) 
            VALUES (?, ?, ?, ?, ?)
        `;
        return await this.query(sql, [name, caloriesPerUnit, defaultUnit, category, brand]);
    }

    // Food log queries
    async createFoodLog(userId, foodId, quantity, unit, calories, logDate) {
        const sql = `
            INSERT INTO food_logs (user_id, food_id, quantity, unit, calories, log_date) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        return await this.query(sql, [userId, foodId, quantity, unit, calories, logDate]);
    }

    async getFoodLogsByDate(userId, date) {
        const sql = `
            SELECT fl.*, f.name as food_name, f.category 
            FROM food_logs fl 
            JOIN foods f ON fl.food_id = f.id 
            WHERE fl.user_id = ? AND fl.log_date = ? 
            ORDER BY fl.logged_at DESC
        `;
        return await this.query(sql, [userId, date]);
    }

    async getDailySummary(userId, date) {
        const sql = `
            SELECT 
                COUNT(*) as meals_count,
                SUM(calories) as total_calories,
                DATE(log_date) as date
            FROM food_logs 
            WHERE user_id = ? AND log_date = ?
            GROUP BY DATE(log_date)
        `;
        const results = await this.query(sql, [userId, date]);
        return results[0] || { meals_count: 0, total_calories: 0, date };
    }

    async deleteFoodLog(id, userId) {
        const sql = 'DELETE FROM food_logs WHERE id = ? AND user_id = ?';
        return await this.query(sql, [id, userId]);
    }

    async getWeeklySummary(userId, startDate, endDate) {
        const sql = `
            SELECT 
                log_date,
                SUM(calories) as total_calories,
                COUNT(*) as meals_count
            FROM food_logs 
            WHERE user_id = ? AND log_date BETWEEN ? AND ?
            GROUP BY log_date
            ORDER BY log_date DESC
        `;
        return await this.query(sql, [userId, startDate, endDate]);
    }
}

module.exports = new Database();