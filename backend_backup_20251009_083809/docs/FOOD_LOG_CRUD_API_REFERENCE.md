# Food Log CRUD API - Quick Reference

## Complete CRUD Operations for Food Logs

All endpoints require: `Authorization: Bearer YOUR_TOKEN`

---

## CREATE - Add New Food Log

```bash
POST /api/logs
Content-Type: application/json

{
  "name": "Banana",
  "quantity": 1,
  "unit": "piece",
  "calories": 105,
  "logDate": "2025-10-05"  // Optional, defaults to today
}

Response:
{
  "success": true,
  "message": "Food log entry created",
  "logId": 11
}
```

**Use Case:** Add food to any date (today, past, or future)

---

## READ - Get Food Logs for Date

```bash
GET /api/logs?date=2025-10-05

Response:
{
  "success": true,
  "logs": [
    {
      "id": 11,
      "food_name": "Banana",
      "quantity": "1.00",
      "unit": "piece",
      "calories": "105.00",
      "log_date": "2025-10-05T00:00:00.000Z"
    }
  ],
  "totalCalories": 105,
  "date": "2025-10-05"
}
```

**Use Case:** View all food items for a specific day

---

## UPDATE - Edit Food Log Entry

```bash
PUT /api/logs/11
Content-Type: application/json

{
  "quantity": 2,
  "calories": 210
}

Response:
{
  "success": true,
  "message": "Food log entry updated",
  "log": { ... updated log data ... }
}
```

**Updatable Fields (all optional):**
- `name` - Food name
- `quantity` - Amount
- `unit` - Unit of measurement  
- `calories` - Calorie count
- `logDate` - Move to different date

**Use Case:** Modify existing food log entry

---

## DELETE - Remove Food Log Entry

```bash
DELETE /api/logs/11

Response:
{
  "success": true,
  "message": "Food log entry deleted"
}
```

**Use Case:** Permanently delete food log entry

---

## Testing Commands

### 1. Login and Get Token
```bash
TOKEN=$(curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}' \
  | jq -r '.token')
```

### 2. Create Food Log (Past Date)
```bash
curl -X POST "http://localhost:3000/api/logs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Apple",
    "quantity": 1,
    "unit": "piece",
    "calories": 95,
    "logDate": "2025-10-05"
  }'
```

### 3. Get Logs for Specific Date
```bash
curl -X GET "http://localhost:3000/api/logs?date=2025-10-05" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Update Food Log
```bash
curl -X PUT "http://localhost:3000/api/logs/11" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 2,
    "calories": 190
  }'
```

### 5. Delete Food Log
```bash
curl -X DELETE "http://localhost:3000/api/logs/11" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "details": [ /* validation errors if applicable */ ]
}
```

**Common Status Codes:**
- `200` - Success (GET, PUT, DELETE)
- `201` - Created (POST)
- `400` - Validation error
- `401` - Unauthorized (invalid/missing token)
- `404` - Not found (log doesn't exist or doesn't belong to user)
- `500` - Server error

---

## JavaScript Quick Reference

```javascript
const API_BASE = '/api';
const token = localStorage.getItem('authToken');

// CREATE
async function createLog(data) {
  return fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }).then(r => r.json());
}

// READ
async function getLogs(date) {
  return fetch(`${API_BASE}/logs?date=${date}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());
}

// UPDATE
async function updateLog(id, updates) {
  return fetch(`${API_BASE}/logs/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  }).then(r => r.json());
}

// DELETE
async function deleteLog(id) {
  return fetch(`${API_BASE}/logs/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());
}
```

---

## Important Notes

### Security
- ✅ All endpoints verify user ownership
- ✅ Users can only edit/delete their own logs
- ✅ Authentication required for all operations

### Data Validation
- Quantity must be > 0
- Calories must be ≥ 0
- Unit is required (max 20 chars)
- Name is required (max 100 chars) unless foodId provided
- Date must be in YYYY-MM-DD format

### Behavior
- **POST** with `logDate` can add entries to any date
- **PUT** can move entries to different dates
- **PUT** with partial data only updates specified fields
- **DELETE** is permanent and cannot be undone

---

## Full CRUD Flow Example

```bash
# 1. Create entry
curl -X POST "$API/logs" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Banana","quantity":1,"unit":"piece","calories":105,"logDate":"2025-10-05"}'
# Returns: {"logId": 11}

# 2. Read entries
curl -X GET "$API/logs?date=2025-10-05" -H "Authorization: Bearer $TOKEN"
# Returns: List of logs with id 11

# 3. Update entry
curl -X PUT "$API/logs/11" -H "Authorization: Bearer $TOKEN" \
  -d '{"quantity":2,"calories":210}'
# Returns: Updated log data

# 4. Delete entry
curl -X DELETE "$API/logs/11" -H "Authorization: Bearer $TOKEN"
# Returns: {"success": true}
```

---

## Status: Production Ready ✅

All CRUD operations tested and verified:
- ✅ CREATE new logs (any date)
- ✅ READ logs by date
- ✅ UPDATE existing logs
- ✅ DELETE logs

Ready for frontend implementation!
