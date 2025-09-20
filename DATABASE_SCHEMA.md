# Calorie Tracker Database Schema

## Overview
This document outlines the database schema for the Calorie Tracker web application.

## Database Tables

### 1. Users Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    daily_calorie_goal INT DEFAULT 2000,
    is_active BOOLEAN DEFAULT TRUE
);
```

### 2. Foods Table
```sql
CREATE TABLE foods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    calories_per_unit DECIMAL(8,2) NOT NULL,
    default_unit VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    brand VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_food_name (name)
);
```

### 3. Food_Logs Table
```sql
CREATE TABLE food_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    food_id INT NOT NULL,
    quantity DECIMAL(8,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    calories DECIMAL(8,2) NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    log_date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE RESTRICT,
    INDEX idx_user_date (user_id, log_date),
    INDEX idx_log_date (log_date)
);
```

### 4. Sessions Table (for authentication)
```sql
CREATE TABLE sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_expires (expires_at)
);
```

## Sample Data

### Users
```sql
INSERT INTO users (username, password_hash, email, daily_calorie_goal) VALUES
('demo', '$2b$10$hashedpasswordhere', 'demo@example.com', 2000),
('testuser', '$2b$10$anotherhashedpassword', 'test@example.com', 1800);
```

### Foods
```sql
INSERT INTO foods (name, calories_per_unit, default_unit, category) VALUES
('apple', 95, 'piece', 'fruit'),
('banana', 105, 'piece', 'fruit'),
('chicken breast', 165, '100g', 'protein'),
('rice', 130, 'cup', 'grain'),
('bread', 80, 'slice', 'grain'),
('egg', 70, 'piece', 'protein'),
('milk', 150, 'cup', 'dairy'),
('cheese', 113, '100g', 'dairy'),
('salmon', 208, '100g', 'protein'),
('broccoli', 55, 'cup', 'vegetable'),
('pasta', 220, 'cup', 'grain'),
('yogurt', 150, 'cup', 'dairy'),
('almonds', 164, '28g', 'nuts'),
('orange', 62, 'piece', 'fruit'),
('spinach', 7, 'cup', 'vegetable'),
('potato', 161, 'medium', 'vegetable'),
('tomato', 22, 'medium', 'vegetable'),
('avocado', 234, 'piece', 'fruit'),
('oatmeal', 147, 'cup', 'grain'),
('peanut butter', 188, '2 tbsp', 'nuts');
```

## API Endpoints Design

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify session

### Foods
- `GET /api/foods` - Get all foods
- `GET /api/foods/search?q={query}` - Search foods
- `POST /api/foods` - Add new food (admin)

### Food Logs
- `GET /api/logs?date={date}` - Get user's food logs for a date
- `POST /api/logs` - Add food log entry
- `DELETE /api/logs/{id}` - Delete food log entry
- `GET /api/logs/summary?date={date}` - Get daily summary

### User Data
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/stats?from={date}&to={date}` - Get user statistics

## Environment Variables
```
DB_HOST=your_database_host
DB_PORT=3306
DB_NAME=calorie_tracker
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret_key
API_PORT=3000
FRONTEND_URL=https://calorie-tracker.piogino.ch
```

## Security Considerations
1. Use bcrypt for password hashing
2. Implement JWT tokens for session management
3. Use HTTPS for all communications
4. Implement rate limiting
5. Validate and sanitize all inputs
6. Use prepared statements to prevent SQL injection

## Tech Stack Recommendations
- **Backend**: Node.js with Express.js
- **Database**: MySQL or PostgreSQL
- **Authentication**: JWT tokens
- **Password Hashing**: bcrypt
- **ORM**: Sequelize or Prisma
- **Validation**: Joi or express-validator