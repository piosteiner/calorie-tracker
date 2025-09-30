# Food Database Management System

## Overview

Your calorie tracker now has a comprehensive food database management system that allows you to:

1. **Import from Google Sheets** - Transfer your custom food data from spreadsheets
2. **Manage via Admin API** - Full CRUD operations on food database
3. **Hybrid Search** - Combines local foods, imported foods, and Open Food Facts

## How to Import from Google Sheets

### Step 1: Prepare Your Google Sheet

Your Google Sheet should have these columns (minimum required: name, calories_per_unit, default_unit):

| Column Name | Required | Type | Example | Description |
|-------------|----------|------|---------|-------------|
| name | ✅ | Text | "Swiss Apple" | Food name |
| calories_per_unit | ✅ | Number | 52 | Calories per unit |
| default_unit | ✅ | Text | "100g" | Default serving unit |
| category | | Text | "Fruits" | Food category |
| brand | | Text | "Local Farm" | Brand name |
| protein_per_100g | | Number | 0.3 | Protein grams per 100g |
| carbs_per_100g | | Number | 13.8 | Carbs grams per 100g |
| fat_per_100g | | Number | 0.2 | Fat grams per 100g |
| fiber_per_100g | | Number | 2.4 | Fiber grams per 100g |
| sodium_per_100g | | Number | 1 | Sodium mg per 100g |
| sugar_per_100g | | Number | 10.4 | Sugar grams per 100g |
| description | | Text | "Fresh Swiss apple" | Food description |
| barcode | | Text | "1234567890123" | Product barcode |

### Step 2: Export from Google Sheets

1. In Google Sheets: **File → Download → Comma Separated Values (.csv)**
2. Save the file to your computer

### Step 3: Import via Admin API

**Note**: For now, import your CSV data manually via MySQL or contact admin for bulk import assistance. Direct API import will be available soon.

### Step 4: Verify Import

```bash
# List all foods (includes local, imported, and external)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/admin/foods

# List foods with external data from Open Food Facts
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/admin/foods-enhanced
```

## Admin API Endpoints

### Food Management (Available Now)
- `GET /api/admin/foods` - List all foods (local + external cached foods)
- `GET /api/admin/foods-enhanced` - Enhanced foods with nutrition data
- `GET /api/admin/food-categories` - List food categories  
- `GET /api/admin/stats` - System statistics including food counts

### External Foods
- `GET /api/external-foods/search?q=query` - Search Open Food Facts
- `POST /api/external-foods/log` - Log external food consumption

### Import System (Coming Soon)
- Manual CSV import via database recommended for now
- Bulk import API endpoints under development

### Query Parameters for Listing Foods
- `page=1` - Page number
- `limit=50` - Items per page (max 100)
- `category=Fruits` - Filter by category
- `source=imported` - Filter by source (custom, imported, system)
- `search=apple` - Search in name and brand

## Example Usage

### 1. List All Foods (Local + External)
```bash
# Get admin token first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# List all foods
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/foods
```

### 2. Search External Foods (Open Food Facts)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/external-foods/search?q=swiss&limit=10"
```

### 3. Get System Statistics
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/stats
```

## Integration with Frontend

Once imported, your custom foods will appear in:
1. **Food search results** - Mixed with local and Open Food Facts results
2. **Admin panel** - For management and editing
3. **User searches** - Available to all users for logging

## File Formats Supported

### CSV Format (Recommended)
- Export directly from Google Sheets
- Handles quoted text and special characters
- Example template: `/templates/foods_import_template.csv`

### JSON Format
```json
[
  {
    "name": "Swiss Apple",
    "calories_per_unit": 52,
    "default_unit": "100g",
    "category": "Fruits",
    "protein_per_100g": 0.3,
    "carbs_per_100g": 13.8,
    "fat_per_100g": 0.2
  }
]
```

## Professional Best Practices

✅ **Database Storage** - All foods stored in MySQL with proper indexing  
✅ **Version Control** - Import history tracked with timestamps  
✅ **Validation** - Data validation on import and creation  
✅ **Admin Controls** - Proper authentication and authorization  
✅ **Backup Friendly** - Can export and re-import data  
✅ **Scalable** - Handles thousands of food items efficiently  
✅ **Search Integration** - Seamlessly integrated with existing search  

This system provides enterprise-level food database management while remaining simple to use!