# Open Food Facts Integration

This backend implements a hybrid approach to food data, combining local database foods with Open Food Facts API integration.

## Features

### Swiss Food Prioritization
- Searches Swiss foods first
- Falls back to European foods
- Finally searches global foods
- Prioritizes local and regional food data

### API Endpoints

#### Search External Foods
```
GET /api/external-foods/search?q=chocolate&limit=20
```
- Searches Open Food Facts with Swiss prioritization
- Returns standardized nutrition data
- Includes caching for performance

#### Log External Food
```
POST /api/external-foods/log
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "external_food_id": "3046920029759",
  "name": "Lindt Excellence 90%",
  "quantity": 30,
  "unit": "g",
  "calories": 178,
  "calories_per_100g": 592,
  "protein_per_100g": 10,
  "carbs_per_100g": 14,
  "fat_per_100g": 55,
  "fiber_per_100g": 5,
  "brand": "Lindt&Sprüngli",
  "source": "Open Food Facts"
}
```

#### Health Check
```
GET /api/external-foods/health
```
- Checks Open Food Facts API connectivity
- Returns service status

### Database Schema

The integration adds three new tables:

1. **external_food_sources** - Tracks external API sources
2. **cached_external_foods** - Caches search results for performance
3. Enhanced **food_logs** - Includes nutrition data columns

### Caching System

- Intelligent caching of search results
- Usage count tracking for popular foods
- Daily cleanup job removes old cache entries
- Configurable cache duration

### Configuration

Environment variables:
- `OPEN_FOOD_FACTS_USER_AGENT` - User agent for API requests
- `OPEN_FOOD_FACTS_TIMEOUT` - Request timeout (default: 10000ms)
- `CACHE_CLEANUP_HOUR` - Hour for daily cache cleanup (default: 2)
- `CACHE_CLEANUP_MINUTE` - Minute for cache cleanup (default: 0)

## Database Migration

Run the migration to add external food support:

```bash
mysql -u your_user -p your_database < migrations/add_external_foods_support.sql
```

## Development

Install dependencies:
```bash
npm install
```

Start development server:
```bash
npm run dev
```

Start production server:
```bash
npm start
```

## Production Deployment

The backend is designed to run with PM2 for process management:

```bash
pm2 start server.js --name calorie-tracker-api
```

Ensure proper environment configuration and database access.