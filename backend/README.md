# Enhanced Calorie Tracker Backend

Professional Node.js backend with comprehensive food database management, nutrition tracking, and admin APIs.

## 🆕 New Features (Enhanced Version)

### 📊 Professional Food Database
- **Complete Nutrition Data**: Protein, carbs, fat, fiber, sodium, sugar per 100g
- **Food Categories**: 8 organized categories (Fruits, Vegetables, Proteins, etc.)
- **20+ Local Foods**: Swiss/European foods with accurate nutrition data
- **26+ Cached External Foods**: From Open Food Facts with smart caching

### 🔍 Hybrid Search System
- **Local Database Search**: Instant search through curated local foods
- **External API Integration**: Open Food Facts with Swiss/European prioritization
- **Smart Caching**: External foods cached for improved performance
- **Unified Results**: Combines multiple sources into single search

### ⚖️ Unit Standardization
- **Grams Only**: Simplified from 5+ units to standardized grams
- **Per-100g Nutrition**: All nutrition data normalized to 100g basis
- **Precise Portions**: Accurate calorie calculations for any gram amount
- **International Standard**: Compatible with global nutrition standards

### 🔧 Admin Management System
- **Full CRUD Operations**: Create, read, update, delete foods
- **Category Management**: Organize foods into logical categories  
- **Import System**: CSV/JSON bulk import with validation
- **System Statistics**: Database health and usage metrics

### 📱 Enhanced APIs
- `GET /api/foods/search` - Search local food database
- `GET /api/external-foods/search` - Hybrid external food search
- `POST /api/external-foods/log` - Log external food consumption
- `GET /api/admin/foods` - Admin: List all foods with pagination
- `GET /api/admin/food-categories` - Admin: Food categories
- `GET /api/admin/stats` - Admin: System statistics

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
mysql -u username -p database_name < migrations/enhance_foods_table.sql
mysql -u username -p database_name < migrations/complete_foods_enhancement.sql
mysql -u username -p database_name < migrations/standardize_to_grams.sql

# Start server
npm start

# OR with PM2 (production)
pm2 start ecosystem.config.js
```

## 📖 Documentation

- `/docs/API.md` - Complete API documentation
- `/docs/FOOD_DATABASE_MANAGEMENT.md` - Pios Food DB management guide
- `/docs/FRONTEND_INTEGRATION_PROMPT.md` - Frontend integration
- `/migrations/` - Database migration scripts
- `/templates/` - Import templates and examples

## 🔄 Migration from Basic Backend

This enhanced version includes:
- ✅ **Enhanced MySQL Schema**: New nutrition columns and categories
- ✅ **Professional Services**: Business logic separation
- ✅ **Admin Controllers**: Complete Pios Food DB management system
- ✅ **Database Migrations**: Automated schema updates
- ✅ **Comprehensive Documentation**: API guides and examples

## 🎯 Production Ready

- Environment-based configuration
- Professional error handling
- Input validation and sanitization
- Request rate limiting
- Comprehensive logging
- PM2 process management

**Upgrade from basic food logging → Professional nutrition management! 🥗**
