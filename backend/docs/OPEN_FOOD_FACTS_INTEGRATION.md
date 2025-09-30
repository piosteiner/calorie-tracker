# Open Food Facts Integration API Documentation

## Overview

The Calorie Tracker API now includes integration with Open Food Facts, providing access to a vast database of food products with nutritional information. This hybrid approach combines local food data with external sources, prioritizing Swiss and European products.

## New API Endpoints

### External Foods Search

**Endpoint:** `GET /api/external-foods/search`

**Description:** Search for foods from external sources (currently Open Food Facts)

**Parameters:**
- `q` (required): Search query (2-100 characters)
- `limit` (optional): Number of results to return (1-50, default: 10)
- `source` (optional): External source to search ('openfoodfacts', default: 'openfoodfacts')

**Example Request:**
```bash
GET /api/external-foods/search?q=swiss%20chocolate&limit=5
```

**Example Response:**
```json
{
  "success": true,
  "foods": [
    {
      "external_id": "7610040045916",
      "name": "Swiss Dark Chocolate",
      "calories_per_100g": 534,
      "protein_per_100g": 6.2,
      "carbs_per_100g": 47.0,
      "fat_per_100g": 34.0,
      "fiber_per_100g": 8.5,
      "brand": "Lindt",
      "countries": "Switzerland",
      "source": "Open Food Facts"
    }
  ],
  "source": "openfoodfacts",
  "cached": true,
  "count": 1
}
```

### External Food Details

**Endpoint:** `GET /api/external-foods/details/:id`

**Description:** Get detailed information about a specific external food product

**Parameters:**
- `id` (required): External food ID (in URL path)
- `source` (optional): External source ('openfoodfacts', default: 'openfoodfacts')

**Example Request:**
```bash
GET /api/external-foods/details/7610040045916?source=openfoodfacts
```

### Log External Food

**Endpoint:** `POST /api/external-foods/log`

**Description:** Log consumption of an external food product

**Request Body:**
```json
{
  "external_food_id": "7610040045916",
  "name": "Swiss Dark Chocolate",
  "quantity": 25,
  "unit": "g",
  "calories": 133,
  "brand": "Lindt",
  "protein_per_100g": 6.2,
  "carbs_per_100g": 47.0,
  "fat_per_100g": 34.0,
  "fiber_per_100g": 8.5,
  "source": "Open Food Facts",
  "log_date": "2025-09-21"
}
```

**Example Response:**
```json
{
  "success": true,
  "logId": 1234,
  "message": "External food logged successfully"
}
```

### Health Check

**Endpoint:** `GET /api/external-foods/health`

**Description:** Check the health status of external food services

**Example Response:**
```json
{
  "success": true,
  "services": {
    "open_food_facts": "healthy"
  },
  "timestamp": "2025-09-21T10:30:00.000Z"
}
```

## Admin Endpoints

### External Food Statistics

**Endpoint:** `GET /api/external-foods/admin/stats`

**Description:** Get comprehensive statistics about external food usage (admin only)

**Example Response:**
```json
{
  "success": true,
  "usage_stats": [
    {
      "source_name": "Open Food Facts",
      "unique_foods": 1250,
      "total_logs": 5340,
      "total_calories": 2847920,
      "avg_calories_per_log": 533.14
    }
  ],
  "cache_stats": [
    {
      "source_name": "Open Food Facts",
      "cached_foods": 890,
      "total_usage": 12450,
      "avg_usage_per_food": 13.99,
      "last_cached": "2025-09-21T08:15:30.000Z"
    }
  ],
  "recent_logs": [
    {
      "name": "Swiss Dark Chocolate",
      "brand": "Lindt",
      "calories": 133,
      "logged_at": "2025-09-21T10:15:00.000Z",
      "username": "user123"
    }
  ]
}
```

### Cache Management

**Endpoint:** `POST /api/admin/cache/cleanup`

**Description:** Manually trigger cache cleanup (admin only)

**Example Response:**
```json
{
  "success": true,
  "lastRun": "2025-09-21T10:30:00.000Z",
  "message": "Manual cache cleanup completed"
}
```

**Endpoint:** `GET /api/admin/cache/status`

**Description:** Get cache status and statistics (admin only)

**Example Response:**
```json
{
  "success": true,
  "cleanup_status": {
    "enabled": true,
    "isRunning": false,
    "lastRun": "2025-09-21T02:00:00.000Z"
  },
  "cache_stats": {
    "total_cached_foods": 890,
    "avg_usage_count": 13.99,
    "max_usage_count": 245,
    "oldest_cache": "2025-08-15T10:30:00.000Z",
    "newest_cache": "2025-09-21T08:15:30.000Z"
  }
}
```

## Database Schema Changes

### New Tables

#### external_food_sources
```sql
CREATE TABLE external_food_sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(255),
    api_key VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### cached_external_foods
```sql
CREATE TABLE cached_external_foods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    external_id VARCHAR(100) NOT NULL,
    external_source_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    calories_per_100g INT NOT NULL,
    protein_per_100g DECIMAL(8,2),
    carbs_per_100g DECIMAL(8,2),
    fat_per_100g DECIMAL(8,2),
    fiber_per_100g DECIMAL(8,2),
    brand VARCHAR(255),
    countries TEXT,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    usage_count INT DEFAULT 1,
    FOREIGN KEY (external_source_id) REFERENCES external_food_sources(id),
    UNIQUE KEY unique_external_food (external_id, external_source_id)
);
```

### Updated Tables

#### food_logs (new columns)
```sql
ALTER TABLE food_logs 
ADD COLUMN external_food_id VARCHAR(100),
ADD COLUMN external_source_id INT,
ADD COLUMN brand VARCHAR(255),
ADD COLUMN protein_per_100g DECIMAL(8,2),
ADD COLUMN carbs_per_100g DECIMAL(8,2),
ADD COLUMN fat_per_100g DECIMAL(8,2),
ADD COLUMN fiber_per_100g DECIMAL(8,2),
ADD COLUMN name VARCHAR(255);
```

## Features

### Swiss Food Prioritization
The system prioritizes Swiss and European food products in search results:
1. First searches Swiss products
2. Then searches broader European products
3. Finally searches global products if needed

### Intelligent Caching
- Frequently accessed foods are cached locally
- Cache is automatically cleaned up daily at 2 AM
- Weekly deep cleanup on Sundays at 3 AM
- Admin can manually trigger cleanup

### Performance Optimization
- Database indexes for fast searches
- Async caching to avoid blocking requests
- Configurable timeouts and limits
- Rate limiting protection

### Error Handling
- Graceful fallbacks when external services are unavailable
- Comprehensive logging for debugging
- Validation for all input parameters
- Proper HTTP status codes

## Environment Variables

Add these to your `.env` file:

```env
# Open Food Facts Configuration
OPEN_FOOD_FACTS_USER_AGENT=CalorieTracker/1.0 (contact@piogino.ch)
OPEN_FOOD_FACTS_TIMEOUT=5000

# Cache Configuration
CACHE_CLEANUP_ENABLED=true
```

## Migration Instructions

1. Run the database migration:
   ```sql
   source ./migrations/add_external_foods_support.sql
   ```

2. Install new dependencies:
   ```bash
   npm install axios node-cron
   ```

3. Update environment variables in `.env`

4. Restart the server

The system will automatically start the cache cleanup job and be ready to serve external food requests.