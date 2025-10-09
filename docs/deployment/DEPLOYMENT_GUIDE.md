# Calorie Tracker - Deployment Guide

## Overview
This guide will help you deploy the Calorie Tracker application with the frontend on GitHub Pages and the backend on your cloud server.

## Prerequisites
- Cloud server with Node.js (version 16+)
- MySQL or PostgreSQL database
- Domain name configured (calorie-tracker.piogino.ch)

## Backend Deployment

### 1. Server Setup
```bash
# On your cloud server
sudo apt update
sudo apt install nodejs npm mysql-server nginx

# Clone or upload the backend files
mkdir /var/www/calorie-tracker-api
cd /var/www/calorie-tracker-api
# Upload your backend files here
```

### 2. Database Setup
```sql
-- Connect to MySQL and run these commands:
CREATE DATABASE calorie_tracker;
USE calorie_tracker;

-- Create tables (from DATABASE_SCHEMA.md)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    daily_calorie_goal INT DEFAULT 2000,
    is_active BOOLEAN DEFAULT TRUE
);

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

CREATE TABLE sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_expires (expires_at)
);

-- Insert sample users and foods
INSERT INTO users (username, password_hash, email, daily_calorie_goal) VALUES
('demo', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewI5A6QQ.D9.zKa2', 'demo@example.com', 2000);
-- Password: demo123

-- Insert sample foods (from DATABASE_SCHEMA.md)
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

### 3. Environment Configuration
```bash
# Create .env file
cp .env.example .env
nano .env

# Update with your actual values:
DB_HOST=localhost
DB_PORT=3306
DB_NAME=calorie_tracker
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=generate-a-long-random-secret-here
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://calorie-tracker.piogino.ch
```

### 4. Install Dependencies and Start
```bash
npm install
npm start

# To run with PM2 (recommended for production):
npm install -g pm2
pm2 start server.js --name "calorie-tracker-api"
pm2 startup
pm2 save
```

### 5. Nginx Configuration
```nginx
# /etc/nginx/sites-available/calorie-tracker-api
server {
    listen 80;
    server_name api.your-domain.com;  # Replace with your API domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/calorie-tracker-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com
```

## Frontend Updates

### Update script.js to use backend API
The frontend is already prepared for backend integration. You just need to update the API base URL.

## Testing

### 1. Test Backend API
```bash
# Health check
curl https://api.your-domain.com/health

# Test login
curl -X POST https://api.your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}'

# Test foods endpoint
curl https://api.your-domain.com/api/foods
```

### 2. Test Frontend
1. Visit https://calorie-tracker.piogino.ch
2. Login with demo/demo123
3. Add some food items
4. Check that data persists

## Monitoring

### 1. Check API Status
```bash
pm2 status
pm2 logs calorie-tracker-api
```

### 2. Check Database
```sql
USE calorie_tracker;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM foods;
SELECT COUNT(*) FROM food_logs;
```

### 3. Check Nginx
```bash
sudo nginx -t
sudo systemctl status nginx
tail -f /var/log/nginx/access.log
```

## Security Checklist

- [ ] Database user has minimal required permissions
- [ ] JWT secret is long and random
- [ ] API server is behind reverse proxy (Nginx)
- [ ] SSL certificates are installed and auto-renewing
- [ ] Rate limiting is enabled
- [ ] Input validation is working
- [ ] CORS is properly configured
- [ ] Database connections are using SSL (if remote)

## Backup Strategy

### Database Backup
```bash
#!/bin/bash
# Create daily backup script
mysqldump -u username -p calorie_tracker > /backups/calorie_tracker_$(date +%Y%m%d).sql
```

### Application Backup
```bash
# Backup application files and environment
tar -czf /backups/calorie-tracker-api_$(date +%Y%m%d).tar.gz /var/www/calorie-tracker-api
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check FRONTEND_URL in .env file
2. **Database Connection**: Verify credentials and MySQL service status
3. **JWT Errors**: Ensure JWT_SECRET is set and consistent
4. **Rate Limiting**: Check if requests are being blocked

### Logs
```bash
# API logs
pm2 logs calorie-tracker-api

# Nginx logs
tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx
```

## Performance Optimization

1. **Database Indexing**: Already included in schema
2. **API Caching**: Consider Redis for session storage
3. **CDN**: Use CloudFlare for static assets
4. **Compression**: Enable gzip in Nginx
5. **Database Connection Pooling**: Already implemented