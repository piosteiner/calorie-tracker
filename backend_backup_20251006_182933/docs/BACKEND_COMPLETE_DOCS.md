# Calorie Tracker Backend - Complete Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Security & Data Protection](#security--data-protection)
3. [System Architecture](#system-architecture)
4. [API Documentation](#api-documentation)
5. [Database Schema](#database-schema)
6. [File Structure](#file-structure)
7. [Food Management System](#food-management-system)
8. [Configuration Guide](#configuration-guide)
9. [Deployment Guide](#deployment-guide)
10. [Development Workflow](#development-workflow)
11. [Frontend Integration](#-frontend-integration)

---

## 🎯 Project Overview

### Enhanced Calorie Tracker Backend
Professional Node.js backend system for comprehensive nutrition tracking and food database management.

#### Key Features
- **Professional Food Database**: Complete nutrition data with 20+ local foods and 26+ cached external foods
- **Hybrid Search System**: Combines local database with Open Food Facts API
- **Admin Management**: Full CRUD operations for food database management
- **Unit Standardization**: Gram-based calculations for international compatibility
- **Swiss Prioritization**: Prioritizes Swiss/European food data for accuracy
- **Smart Caching**: External foods cached for improved performance
- **Comprehensive APIs**: RESTful endpoints for all operations

#### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: MySQL 8.0
- **Authentication**: JWT tokens
- **Process Manager**: PM2
- **External API**: Open Food Facts
- **File Processing**: Multer for uploads

---

## 🔒 Security & Data Protection

### Environment Variables Protection
The system uses a comprehensive `.gitignore` file to protect sensitive data:

```bash
# Environment files - PROTECTED
.env                    # Contains real database passwords & JWT secrets
.env.local             # Local environment overrides
.env.production        # Production-specific settings

# Dependencies - EXCLUDED
node_modules/          # Large dependency files

# Runtime Data - PROTECTED  
logs/                  # Application logs with potential sensitive data
*.log                  # Individual log files

# Database Files - PROTECTED
*.db                   # SQLite database files
*.sqlite               # Alternative SQLite extensions

# User Uploads - STRUCTURE ONLY
uploads/media/*        # Actual uploaded files excluded
uploads/optimized/*    # Processed media files excluded
uploads/temp_media_upload/*  # Temporary upload files excluded
# Keep directory structure with .gitkeep files

# Temporary Files - PROTECTED
tmp/                   # Temporary processing files
temp/                  # Alternative temp directory

# System Files - EXCLUDED
.DS_Store             # macOS system files
Thumbs.db             # Windows system files

# Development Files - EXCLUDED
.vscode/              # VS Code settings
.idea/                # IntelliJ IDEA settings
*.swp                 # Vim swap files
*.swo                 # Vim backup files

# Process Manager - PROTECTED
ecosystem.config.js.backup  # PM2 backup configurations
```

### Sensitive Data Handling
- **Database Credentials**: Stored in `.env`, never committed to git
- **JWT Secrets**: Environment-based, rotatable keys
- **API Keys**: External service credentials protected
- **User Data**: Proper validation and sanitization
- **Log Files**: Excluded from version control

### Security Features
- **Input Validation**: All endpoints validate and sanitize input
- **Rate Limiting**: Prevents abuse and DoS attacks
- **CORS Protection**: Configured for frontend domain only
- **Authentication**: JWT-based session management
- **SQL Injection Prevention**: Parameterized queries only

---

## 🏗️ System Architecture

### Core Components

```
Backend Architecture
├── 🌐 API Layer (Express.js)
│   ├── Authentication Middleware
│   ├── Rate Limiting
│   ├── Input Validation
│   └── Error Handling
├── 🎮 Controllers
│   ├── Food Management
│   ├── External Food Integration  
│   ├── User Management
│   └── Admin Operations
├── 🔧 Services
│   ├── Food Import Service
│   ├── Open Food Facts Service
│   └── Cache Management
├── 📊 Database Layer (MySQL)
│   ├── Food Database
│   ├── User Management
│   ├── Food Categories
│   └── Import History
└── 🔌 External Integrations
    ├── Open Food Facts API
    └── Swiss Food Database Priority
```

### Data Flow
1. **Frontend Request** → API Gateway
2. **Authentication** → JWT Validation  
3. **Input Validation** → Sanitization
4. **Controller Logic** → Business Rules
5. **Service Layer** → External APIs/Database
6. **Response Formatting** → JSON Output
7. **Error Handling** → Standardized Errors

---

## 📚 API Documentation

### Authentication Endpoints

#### `POST /api/auth/login`
User authentication endpoint.

**Request:**
```json
{
    "username": "demo",
    "password": "demo123"
}
```

**Response:**
```json
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 1,
        "username": "demo",
        "name": "Demo User"
    }
}
```

### Food Search Endpoints

#### `GET /api/foods/search?q={query}`
Search local food database.

**Parameters:**
- `q` (string, required): Search query
- `limit` (number, optional): Maximum results (default: 10)
- `category` (string, optional): Filter by category

**Response:**
```json
{
    "success": true,
    "foods": [
        {
            "id": "local_001",
            "name": "Swiss Apple",
            "calories": 52,
            "unit": "g",
            "source": "Local Database",
            "category": "Fruits",
            "protein_per_100g": 0.3,
            "carbs_per_100g": 13.8,
            "fat_per_100g": 0.2,
            "fiber_per_100g": 2.4,
            "sodium_per_100g": 1,
            "sugar_per_100g": 10.4,
            "brand": "Local Farm",
            "created_at": "2024-09-30T10:00:00Z"
        }
    ],
    "total": 1
}
```

#### `GET /api/external-foods/search?q={query}&limit={limit}`
Search external food databases (Open Food Facts).

**Authentication:** Optional (unauthenticated users have reduced limits)

**Parameters:**
- `q` (string, required): Search query
- `limit` (number, optional): Maximum results (authenticated: 10, unauthenticated: 5)
- `source` (string, optional): External source (default: "openfoodfacts")

**Rate Limiting:** 
- Authenticated users: No additional limits
- Unauthenticated users: 20 requests per 15 minutes

**Response:**
```json
{
    "success": true,
    "cached": false,
    "foods": [
        {
            "external_id": "7610040045442",
            "name": "Gruyère AOP",
            "calories_per_100g": 413,
            "unit": "g",
            "source": "Open Food Facts",
            "protein_per_100g": 25.5,
            "carbs_per_100g": 0.4,
            "fat_per_100g": 34.1,
            "fiber_per_100g": 0,
            "sodium_per_100g": 714,
            "sugar_per_100g": 0.4,
            "brand": "Migros",
            "country": "Switzerland"
        }
    ]
}
```

#### `POST /api/external-foods/log`
Log external food consumption with caching.

**Authentication:** Optional (unauthenticated users receive local-only response)

**Rate Limiting:** 
- Authenticated users: No additional limits (logs to database)
- Unauthenticated users: 20 requests per 15 minutes (local storage only)

**Request:**
```json
{
    "external_food_id": "7610040045442",
    "name": "Gruyère AOP", 
    "quantity": 30,
    "unit": "g",
    "calories": 124,
    "calories_per_100g": 413,
    "protein_per_100g": 25.5,
    "carbs_per_100g": 0.4,
    "fat_per_100g": 34.1,
    "brand": "Migros",
    "source": "Open Food Facts"
}
```

**Response (Authenticated):**
```json
{
    "success": true,
    "logId": 1234,
    "cached": true,
    "message": "Food logged and cached successfully"
}
```

**Response (Unauthenticated):**
```json
{
    "success": true,
    "message": "Food logged locally only (authentication required for backend storage)",
    "localOnly": true,
    "suggestion": "Please log in to save food logs to your account"
}
```

### Food Logging Endpoints

#### `POST /api/logs`
Log food consumption.

**Request:**
```json
{
    "food_id": "local_001",
    "quantity": 150,
    "unit": "g",
    "meal_type": "breakfast"
}
```

**Response:**
```json
{
    "success": true,
    "log": {
        "id": 5678,
        "food_id": "local_001",
        "quantity": 150,
        "calories": 78,
        "timestamp": "2024-09-30T08:30:00Z"
    }
}
```

#### `GET /api/logs?date={date}`
Retrieve food logs for a specific date.

**Parameters:**
- `date` (string, optional): Date in YYYY-MM-DD format (default: today)

**Response:**
```json
{
    "success": true,
    "logs": [
        {
            "id": 5678,
            "food_name": "Swiss Apple",
            "quantity": 150,
            "unit": "g", 
            "calories": 78,
            "meal_type": "breakfast",
            "timestamp": "2024-09-30T08:30:00Z"
        }
    ],
    "daily_total": 78
}
```

### Admin Endpoints (Authentication Required)

#### `GET /api/admin/foods?page={page}&limit={limit}&search={search}`
List all foods with pagination and search.

**Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50)
- `search` (string, optional): Search term

**Response:**
```json
{
    "success": true,
    "foods": [
        {
            "id": "local_001",
            "name": "Swiss Apple",
            "category": "Fruits",
            "source": "Local Database",
            "calories_per_unit": 52,
            "default_unit": "g",
            "created_at": "2024-09-30T10:00:00Z",
            "updated_at": "2024-09-30T15:30:00Z"
        }
    ],
    "pagination": {
        "current_page": 1,
        "total_pages": 3,
        "total_items": 46,
        "items_per_page": 20
    }
}
```

#### `GET /api/admin/food-categories`
Get all food categories.

**Response:**
```json
{
    "success": true,
    "categories": [
        {
            "id": 1,
            "name": "Fruits",
            "description": "Fresh and dried fruits",
            "food_count": 8
        },
        {
            "id": 2, 
            "name": "Vegetables",
            "description": "Fresh and cooked vegetables",
            "food_count": 12
        }
    ]
}
```

#### `GET /api/admin/stats`
Get system statistics.

**Response:**
```json
{
    "success": true,
    "stats": {
        "total_foods": 46,
        "local_foods": 20,
        "external_foods": 26,
        "categories": 8,
        "recent_logs": 156,
        "cache_hits": 89,
        "database_size": "2.4 MB",
        "last_import": "2024-09-25T14:20:00Z"
    }
}
```

---

## 🗄️ Database Schema

### Foods Table
```sql
CREATE TABLE foods (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INT,
    calories_per_unit DECIMAL(8,2) NOT NULL,
    default_unit VARCHAR(20) DEFAULT 'g',
    
    -- Nutrition per 100g
    protein_per_100g DECIMAL(5,2) DEFAULT 0,
    carbs_per_100g DECIMAL(5,2) DEFAULT 0, 
    fat_per_100g DECIMAL(5,2) DEFAULT 0,
    fiber_per_100g DECIMAL(5,2) DEFAULT 0,
    sodium_per_100g DECIMAL(7,2) DEFAULT 0,
    sugar_per_100g DECIMAL(5,2) DEFAULT 0,
    
    -- Metadata
    brand VARCHAR(255),
    source VARCHAR(50) DEFAULT 'Local Database',
    external_id VARCHAR(100),
    country VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_category (category_id),
    INDEX idx_source (source),
    FOREIGN KEY (category_id) REFERENCES food_categories(id)
);
```

### Food Categories Table
```sql
CREATE TABLE food_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Categories
INSERT INTO food_categories (name, description) VALUES
('Fruits', 'Fresh and dried fruits'),
('Vegetables', 'Fresh and cooked vegetables'),
('Proteins', 'Meat, fish, eggs, and protein sources'),
('Grains', 'Cereals, bread, pasta, and grain products'),
('Dairy', 'Milk, cheese, yogurt, and dairy products'),
('Snacks', 'Processed snacks and convenience foods'),
('Beverages', 'Drinks and liquid nutrition'),
('Custom', 'User-defined and specialty foods');
```

### External Foods Cache Table
```sql
CREATE TABLE external_foods_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    external_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    calories_per_100g DECIMAL(8,2),
    
    -- Nutrition data
    protein_per_100g DECIMAL(5,2) DEFAULT 0,
    carbs_per_100g DECIMAL(5,2) DEFAULT 0,
    fat_per_100g DECIMAL(5,2) DEFAULT 0,
    fiber_per_100g DECIMAL(5,2) DEFAULT 0,
    sodium_per_100g DECIMAL(7,2) DEFAULT 0,
    sugar_per_100g DECIMAL(5,2) DEFAULT 0,
    
    -- Metadata
    brand VARCHAR(255),
    source VARCHAR(50) DEFAULT 'Open Food Facts',
    country VARCHAR(100),
    search_count INT DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_external_id (external_id),
    INDEX idx_name_cache (name),
    INDEX idx_last_accessed (last_accessed)
);
```

### Food Logs Table
```sql
CREATE TABLE food_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_id VARCHAR(50),
    external_food_id VARCHAR(100),
    
    -- Consumption data
    quantity DECIMAL(8,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'g',
    calories DECIMAL(8,2) NOT NULL,
    meal_type VARCHAR(50),
    
    -- Nutrition logged
    protein_consumed DECIMAL(6,2) DEFAULT 0,
    carbs_consumed DECIMAL(6,2) DEFAULT 0,
    fat_consumed DECIMAL(6,2) DEFAULT 0,
    
    -- Timestamps
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_date (user_id, logged_at),
    INDEX idx_food_id (food_id),
    INDEX idx_external_food_id (external_food_id)
);
```

### Import History Table
```sql
CREATE TABLE foods_import_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255),
    total_records INT,
    successful_imports INT,
    failed_imports INT,
    import_type VARCHAR(50), -- 'csv', 'json', 'manual'
    imported_by VARCHAR(100),
    import_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📁 File Structure

```
backend/
├── 📋 Core Application Files
│   ├── server.js                 # Main Express server setup
│   ├── database.js               # MySQL connection and configuration
│   ├── package.json              # Dependencies and scripts
│   ├── package-lock.json         # Dependency lock file
│   └── ecosystem.config.js       # PM2 process configuration
│
├── 🎮 Controllers/ 
│   ├── adminFoodsController.js   # Admin food management operations
│   ├── externalFoodsController.js # External API integration
│   └── foodsController.js        # Local food database operations
│
├── 🛣️ Routes/
│   ├── admin.js                  # Admin endpoints (enhanced)
│   ├── adminFoods.js            # Dedicated admin food routes
│   ├── auth.js                   # Authentication endpoints
│   ├── external-foods.js        # External food API routes  
│   ├── foods.js                  # Local food search routes
│   ├── logs.js                   # Food logging endpoints
│   └── user.js                   # User management routes
│
├── 🔧 Services/
│   ├── foodsImportService.js     # CSV/JSON import processing
│   └── openFoodFactsService.js   # Open Food Facts API integration
│
├── 🛡️ Middleware/
│   ├── admin.js                  # Admin authentication middleware
│   └── auth.js                   # JWT authentication middleware
│
├── 📊 Migrations/
│   ├── enhance_foods_table.sql   # Add nutrition columns
│   ├── complete_foods_enhancement.sql # Categories & import system
│   └── standardize_to_grams.sql  # Convert units to grams
│
├── 📚 Documentation/
│   ├── BACKEND_COMPLETE_DOCS.md  # This comprehensive documentation (MAIN)
│   └── FRONTEND_INTEGRATION_PROMPT.md # Complete frontend integration guide
│
├── 📋 Templates/
│   └── foods_import_template.csv # CSV import template with examples
│
├── 📁 Uploads/
│   ├── .gitkeep                 # Preserve directory structure
│   ├── optimized/               # Processed media files
│   │   └── .gitkeep
│   └── temp_media_upload/       # Temporary upload storage
│       └── .gitkeep
│
├── 🔧 Configuration Files
│   ├── .env.example             # Environment template (safe for git)
│   ├── .gitignore              # Comprehensive security exclusions
│   └── README.md               # Enhanced project documentation
│
└── 📊 Runtime (Excluded from Git)
    ├── .env                    # Real environment variables (PROTECTED)
    ├── logs/                   # Application logs (PROTECTED)
    ├── node_modules/           # Dependencies (EXCLUDED)
    └── uploads/media/          # User files (STRUCTURE ONLY)
```

### File Purposes & Functionality

#### Core Application Files
- **`server.js`**: Main application entry point with Express setup, middleware configuration, route mounting, and error handling
- **`database.js`**: MySQL connection pool, connection retry logic, and database health checking
- **`package.json`**: Project metadata, dependencies, and npm scripts for development and production

#### Controllers (Business Logic)
- **`adminFoodsController.js`**: Complete CRUD operations for food management, bulk operations, validation, and admin statistics
- **`externalFoodsController.js`**: Open Food Facts API integration, search result caching, Swiss prioritization, and consumption logging
- **`foodsController.js`**: Local food database search, category filtering, nutrition data retrieval, and result formatting

#### Services (External Integration)
- **`foodsImportService.js`**: CSV/JSON file processing, data validation, duplicate detection, and import history tracking
- **`openFoodFactsService.js`**: External API communication, Swiss product prioritization, response parsing, and error handling

#### Security & Configuration
- **`.gitignore`**: Comprehensive protection of sensitive data, environment files, logs, and user uploads
- **`.env.example`**: Safe template with placeholder values for database credentials, JWT secrets, and API configurations

---

## 🥗 Food Management System

### Local Food Database
**Enhanced with complete nutrition profiles:**
- **20+ curated foods** with Swiss/European accuracy
- **Complete nutrition data** per 100g (protein, carbs, fat, fiber, sodium, sugar)
- **8 organized categories** for logical food organization
- **Standardized units** (grams only) for precision

### External Food Integration
**Smart hybrid system combining multiple sources:**
- **Open Food Facts API** integration with 500+ million products
- **Swiss prioritization** for local accuracy
- **Smart caching** of frequently accessed foods
- **26+ cached foods** with complete nutrition data
- **Graceful Unauthenticated Access** with rate limiting and security safeguards

### Food Categories System
```javascript
Categories = {
    1: "Fruits - Fresh and dried fruits",
    2: "Vegetables - Fresh and cooked vegetables", 
    3: "Proteins - Meat, fish, eggs, and protein sources",
    4: "Grains - Cereals, bread, pasta, and grain products",
    5: "Dairy - Milk, cheese, yogurt, and dairy products",
    6: "Snacks - Processed snacks and convenience foods",
    7: "Beverages - Drinks and liquid nutrition",
    8: "Custom - User-defined and specialty foods"
}
```

### Import System
**Professional bulk import capabilities:**
- **CSV/JSON support** with validation and Google Sheets export compatibility
- **Template provided** for easy data preparation (`/templates/foods_import_template.csv`)
- **Google Sheets Integration**: Export from Google Sheets → Download as CSV → Import to system
- **Duplicate detection** and handling
- **Import history** tracking and logging
- **Error reporting** with detailed feedback

#### Google Sheets Import Workflow
1. **Prepare Google Sheet** with columns: name, calories_per_unit, default_unit, category, brand, nutrition data
2. **Export to CSV**: File → Download → Comma Separated Values (.csv)
3. **Import via Database**: Manual MySQL import (bulk API import coming soon)
4. **Verify Import**: Use admin APIs to confirm successful import

### Unit Standardization
**Simplified from 5+ units to grams only:**
- **Before**: pieces, cups, tablespoons, ounces, grams (confusing)
- **After**: grams only (precise, international standard)
- **Benefits**: Accurate calculations, international compatibility, simplified UX

---

## ⚙️ Configuration Guide

### Environment Variables (.env)
```bash
# Server Configuration
PORT=3000                                    # Server port
NODE_ENV=production                          # Environment mode
FRONTEND_URL=https://calorie-tracker.piogino.ch  # CORS origin

# Database Configuration  
DB_HOST=localhost                            # MySQL host
DB_PORT=3306                                # MySQL port
DB_USER=calorie_tracker_user                # Database username
DB_PASSWORD=your_secure_password             # Database password (CHANGE!)
DB_NAME=calorie_tracker                     # Database name

# Authentication
JWT_SECRET=your_very_secure_jwt_secret_key_change_this_in_production  # JWT signing key (CHANGE!)

# External API Configuration
OPEN_FOOD_FACTS_USER_AGENT=CalorieTracker/1.0 (contact@piogino.ch)  # API identification
OPEN_FOOD_FACTS_TIMEOUT=5000               # API timeout in milliseconds

# Feature Flags
CACHE_CLEANUP_ENABLED=true                  # Enable automatic cache cleanup

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000                # 15 minutes window
RATE_LIMIT_MAX_REQUESTS=100                # Max requests per window

# Logging
LOG_LEVEL=info                             # Logging level
LOG_FILE=./logs/app.log                    # Log file location
```

### PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
    apps: [{
        name: 'calorie-tracker-api',
        script: 'server.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true
    }]
};
```

---

## 🚀 Deployment Guide

### Database Setup
1. **Create Database:**
   ```sql
   CREATE DATABASE calorie_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'calorie_tracker_user'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON calorie_tracker.* TO 'calorie_tracker_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Run Migrations:**
   ```bash
   mysql -u username -p calorie_tracker < migrations/enhance_foods_table.sql
   mysql -u username -p calorie_tracker < migrations/complete_foods_enhancement.sql  
   mysql -u username -p calorie_tracker < migrations/standardize_to_grams.sql
   ```

### Application Deployment
1. **Install Dependencies:**
   ```bash
   npm install --production
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name api.calorie-tracker.piogino.ch;
    
    location /api {
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

---

## 🛠️ Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Set up development environment  
cp .env.example .env
# Edit .env for local development

# Start development server
npm run dev
# OR
node server.js
```

### Testing APIs
```bash
# Test local food search
curl "http://localhost:3000/api/foods/search?q=apple"

# Test external food search  
curl "http://localhost:3000/api/external-foods/search?q=gruyere&limit=5"

# Test admin endpoints (requires auth token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" "http://localhost:3000/api/admin/stats"
```

### Database Development
```bash
# Connect to development database
mysql -u calorie_tracker_user -p calorie_tracker

# View food categories
SELECT * FROM food_categories;

# Check food count by category
SELECT c.name, COUNT(f.id) as food_count 
FROM food_categories c 
LEFT JOIN foods f ON c.id = f.category_id 
GROUP BY c.id;

# View recent external food cache
SELECT * FROM external_foods_cache ORDER BY created_at DESC LIMIT 10;
```

### Logging & Monitoring
```bash
# View PM2 logs
pm2 logs calorie-tracker-api

# Monitor PM2 processes  
pm2 monit

# Check application logs
tail -f logs/combined.log
```

### Import Development Data
```bash
# Use the provided template
cp templates/foods_import_template.csv /tmp/test_foods.csv
# Edit with your test data

# Manual import via MySQL (current method)
mysql -u username -p calorie_tracker
mysql> LOAD DATA INFILE '/tmp/test_foods.csv' INTO TABLE foods 
       FIELDS TERMINATED BY ',' 
       ENCLOSED BY '"' 
       LINES TERMINATED BY '\n' 
       IGNORE 1 ROWS;

# Bulk import API (coming soon)
curl -X POST -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "file=@/tmp/test_foods.csv" \
     "http://localhost:3000/api/admin/foods/import"
```

#### CSV Import Template Structure
Required columns for Google Sheets/CSV import:
- **name** (required): Food name
- **calories_per_unit** (required): Calories per serving
- **default_unit** (required): Unit (recommend "g" for grams)
- **category** (optional): Food category
- **brand** (optional): Brand name  
- **protein_per_100g** (optional): Protein grams per 100g
- **carbs_per_100g** (optional): Carbs grams per 100g
- **fat_per_100g** (optional): Fat grams per 100g
- **fiber_per_100g** (optional): Fiber grams per 100g
- **sodium_per_100g** (optional): Sodium mg per 100g
- **sugar_per_100g** (optional): Sugar grams per 100g

---

## 🔄 Repository Synchronization

### GitHub Integration System
The backend includes an automated system for syncing changes to your live GitHub repository.

#### Sync Script: `push-to-live-repo.sh`
**Location**: `/var/www/calorie-tracker-api/push-to-live-repo.sh`

**Purpose**: Automatically pushes enhanced backend changes to your GitHub repository while preserving existing frontend code.

#### Usage
```bash
# Basic sync with automatic commit message
./push-to-live-repo.sh

# Sync with custom commit message
./push-to-live-repo.sh "Add new food categories and admin features"

# Example: After adding new features
./push-to-live-repo.sh "Enhanced nutrition tracking and Swiss food prioritization"
```

#### What the Sync Script Does
1. **Clones Live Repository**: Downloads current state of your GitHub repository
2. **Cleans Old Backups**: Removes previous backup folders and legacy "Backend" folder
3. **Creates New Backup**: Preserves current backend in `backend_backup_YYYYMMDD_HHMMSS/`
4. **Copies Enhanced Backend**: Replaces backend folder with enhanced version
5. **Preserves Frontend**: Keeps existing frontend code untouched
6. **Commits Changes**: Creates descriptive commit with changes summary
7. **Pushes to GitHub**: Updates your live repository automatically

#### Sync Script Features
- **Safe Operation**: Always creates backups before changes
- **Clean Repository**: Removes old backups, keeps only the latest
- **Legacy Cleanup**: Removes old "Backend" folder if present
- **Selective Sync**: Only updates backend, preserves frontend
- **Comprehensive Copy**: Includes all enhanced features (controllers, services, migrations, docs)
- **Change Tracking**: Detailed commit messages with feature summaries
- **Error Handling**: Validates operations before pushing
- **Frontend Copilot Integration**: Adopts sensible frontend suggestions with security safeguards

#### Repository Structure After Sync
```
your-github-repo/
├── frontend/ (preserved - your existing code)
│   ├── index.html
│   ├── script.js
│   └── style.css
├── backend/ (enhanced version)
│   ├── controllers/
│   ├── services/
│   ├── migrations/
│   ├── docs/
│   └── [all enhanced backend files]
└── backend_backup_YYYYMMDD_HHMMSS/ (latest backup only)
    └── [previous backend version]
```

#### Repository Cleanup Strategy
- **Old Backups**: Automatically removed to prevent repository bloat
- **Legacy Folders**: Removes old "Backend" folder (capital B) if present
- **Single Backup**: Maintains only the most recent backup for safety
- **Clean History**: Repository stays organized with minimal backup clutter

#### Integration with Development Workflow
```bash
# 1. Develop new features locally
cd /var/www/calorie-tracker-api
# ... make changes ...

# 2. Test locally
npm test
curl "http://localhost:3000/api/foods/search?q=test"

# 3. Sync to GitHub repository
./push-to-live-repo.sh "Add external food caching system"

# 4. Verify on GitHub
# Visit: https://github.com/piosteiner/calorie-tracker/tree/main/backend
```

#### Automatic Deployment Benefits
- **Version Control**: All changes tracked in GitHub with proper commit history
- **Backup Safety**: Previous versions preserved in backup folders
- **Team Collaboration**: Easy sharing of backend enhancements
- **Production Deployment**: GitHub repository ready for production deployment
- **Frontend Preservation**: Existing frontend code never overwritten

#### Security Considerations
- **Authentication**: Uses your existing GitHub credentials/SSH keys
- **Selective Push**: Only pushes intended backend changes
- **Backup Creation**: Always creates safety backups
- **Clean Operation**: No sensitive data (`.env`, logs) included in sync

---

## 🔄 Migration from Basic Backend

### What Changed
- **Database Schema**: Enhanced with nutrition columns and categories
- **API Endpoints**: New admin endpoints and enhanced search
- **Food Data**: Standardized units and complete nutrition profiles  
- **External Integration**: Open Food Facts with smart caching
- **Security**: Comprehensive .gitignore and environment protection
- **Documentation**: Complete API and system documentation
- **Repository Sync**: Automated GitHub integration system

### Upgrade Steps
1. **Backup existing data** before migration
2. **Run database migrations** to add new columns and tables
3. **Update environment configuration** with new variables
4. **Deploy enhanced backend** code
5. **Test all endpoints** to ensure functionality
6. **Update frontend** to use new gram-based calculations

### Backward Compatibility
- **Existing food logs** preserved and upgraded to gram units
- **User accounts** remain unchanged
- **API authentication** uses same JWT system
- **Database structure** enhanced, not replaced

---

## 🌐 Frontend Integration

### Integration with Enhanced Backend
The enhanced backend requires frontend updates to take advantage of new features. A comprehensive frontend integration guide is available for developers.

#### Key Frontend Changes Required:
- **Unit Standardization**: Update HTML dropdown to grams-only
- **Hybrid Search Integration**: Replace direct Open Food Facts calls with backend APIs
- **Enhanced Food Logging**: Support external food logging with nutrition data
- **Admin Panel Integration**: Optional admin features for food management

#### Frontend Integration Guide
📋 **Complete Integration Instructions**: `/docs/FRONTEND_INTEGRATION_PROMPT.md`

This file contains:
- Step-by-step frontend code updates
- JavaScript method implementations  
- HTML changes for unit standardization
- API integration examples
- Admin panel integration (optional)

#### Frontend API Endpoints to Use:
- `GET /api/foods/search` - Search local foods
- `GET /api/external-foods/search` - Search external foods (replaces direct Open Food Facts calls)
- `POST /api/external-foods/log` - Log external food consumption
- `GET /api/admin/*` - Admin endpoints (optional)

#### Expected Frontend Behavior:
- **Grams-only units** for precise calculations
- **Hybrid search results** combining local + external foods
- **Swiss-prioritized results** from Open Food Facts
- **Smart caching** with backend performance optimization
- **Offline functionality** preserved with enhanced online features

---

## 📊 Performance & Optimization

### Caching Strategy
- **External Food Caching**: Frequently accessed Open Food Facts items cached locally
- **Search Result Optimization**: Database indexes on name, category, and source
- **Connection Pooling**: MySQL connection pool for optimal database performance

### Monitoring Points
- **Database Performance**: Query execution times and connection pool usage
- **External API Calls**: Open Food Facts API response times and rate limits
- **Memory Usage**: PM2 memory monitoring with automatic restart at 1GB
- **Cache Hit Rate**: Percentage of external food searches served from cache

### Scaling Considerations
- **Horizontal Scaling**: Multiple PM2 instances with load balancing
- **Database Optimization**: Proper indexing and query optimization
- **CDN Integration**: Static asset delivery for improved performance
- **Microservice Architecture**: Separate food database service for high availability

---

This comprehensive documentation provides complete coverage of the enhanced calorie tracker backend system, from security practices to deployment procedures. The system is production-ready with professional-grade food database management, comprehensive APIs, and robust security measures.

**Version**: Enhanced Backend v2.0  
**Last Updated**: September 30, 2025  
**Maintained By**: Pio Steiner (piosteiner@gmail.com)