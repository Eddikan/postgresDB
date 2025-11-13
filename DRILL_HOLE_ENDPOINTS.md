# 🚀 Complete Drill Hole API Documentation

## Base URL: `/api/drillholes`

All endpoints use **Sequelize ORM** for database operations instead of raw SQL for better type safety and maintainability.

---

## 📋 **Endpoint Overview**

### **1. POST /api/drillholes** - Create Drill Hole ✨
**Purpose:** Create a new drill hole with photo uploads  
**Auth:** Required  
**Content-Type:** multipart/form-data

**Example Postman FormData:**
```
Authorization: Bearer your-jwt-token

projectId | b28fb9fa-77e6-4465-8ac7-ba33d910fdab
drillingPlatform | Platform Alpha-7
contractor | DeepDrill Solutions Ltd
mobilisationDate | 2025-11-10
shift | Day Shift (8:00AM - 17:00PM)
holeId | DH-2025-001
startDate | 2025-11-12
expectedDepth | 250.5
metersDrilled | 185.75
machineHours | 12.5
standbyHours | 2.25
drillingHours | 10.25
downtime | 2.25
downtimeCategory | Mechanical
reason | Hydraulic pump maintenance
penetrationRate | 18.2
utilisation | 82.0
waterUsed | 1250.5
additives | Bentonite clay, Polymer mud
fuelUsed | 85.75
fieldTopUp | 15.25
operationalComment | Smooth drilling operation
notes | Encountered hard rock layer at 150m
photos | [File] - Select image files
```

**Response (201):**
```json
{
  "message": "Drill hole created successfully",
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "holeId": "DH-2025-001",
    "drillingPlatform": "Platform Alpha-7",
    "contractor": "DeepDrill Solutions Ltd",
    "photos": ["https://s3-url/photo1.jpg"],
    "createdAt": "2025-11-06T10:00:00Z"
  }
}
```

---

### **2. GET /api/drillholes** - List All Drill Holes 📊
**Purpose:** Get paginated list with filtering and search  
**Auth:** Required

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `projectId` (UUID, optional)
- `search` (string, optional) - Search holeId, contractor, platform

**Example:**
```bash
GET /api/drillholes?page=1&limit=10&search=DH&projectId=uuid-here
Authorization: Bearer your-jwt-token
```

**Response (200):**
```json
{
  "message": "Drill holes retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "holeId": "DH-2025-001",
      "drillingPlatform": "Platform Alpha-7",
      "contractor": "DeepDrill Solutions",
      "expectedDepth": 250.5,
      "metersDrilled": 185.75,
      "utilisation": 82.0,
      "project": {
        "projectName": "Mining Project A",
        "projectCode": "MPA-001"
      },
      "photos": ["https://s3-url/photo1.jpg"],
      "createdAt": "2025-11-06T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### **3. GET /api/drillholes/project/:projectId** - Get Drill Holes by Project 🎯
**Purpose:** Get all drill holes for a specific project  
**Auth:** Required

**Example:**
```bash
GET /api/drillholes/project/b28fb9fa-77e6-4465-8ac7-ba33d910fdab
Authorization: Bearer your-jwt-token
```

**Response (200):**
```json
{
  "message": "Drill holes retrieved successfully",
  "project": {
    "id": "uuid",
    "name": "Mining Project A",
    "code": "MPA-001"
  },
  "data": [
    {
      "id": "uuid",
      "holeId": "DH-2025-001",
      "expectedDepth": 250.5,
      "metersDrilled": 185.75,
      "penetrationRate": 18.2,
      "utilisation": 82.0,
      "photos": ["https://s3-url/photo1.jpg"]
    }
  ],
  "total": 5
}
```

---

### **4. GET /api/drillholes/:id** - Get Specific Drill Hole 🔍
**Purpose:** Get detailed information about a drill hole  
**Auth:** Required

**Example:**
```bash
GET /api/drillholes/drill-hole-uuid-here
Authorization: Bearer your-jwt-token
```

**Response (200):**
```json
{
  "message": "Drill hole retrieved successfully",
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "drillingPlatform": "Platform Alpha-7",
    "contractor": "DeepDrill Solutions Ltd",
    "mobilisationDate": "2025-11-10",
    "shift": "Day Shift (8:00AM - 17:00PM)",
    "holeId": "DH-2025-001",
    "startDate": "2025-11-12",
    "expectedDepth": 250.5,
    "metersDrilled": 185.75,
    "machineHours": 12.5,
    "standbyHours": 2.25,
    "drillingHours": 10.25,
    "downtime": 2.25,
    "downtimeCategory": "Mechanical",
    "reason": "Hydraulic pump maintenance",
    "penetrationRate": 18.2,
    "utilisation": 82.0,
    "waterUsed": 1250.5,
    "additives": "Bentonite clay, Polymer mud",
    "fuelUsed": 85.75,
    "fieldTopUp": 15.25,
    "operationalComment": "Smooth drilling operation",
    "notes": "Hard rock layer at 150m",
    "photos": ["https://s3-url/photo1.jpg"],
    "project": {
      "projectName": "Mining Project A",
      "projectCode": "MPA-001"
    },
    "createdAt": "2025-11-06T10:00:00Z",
    "updatedAt": "2025-11-06T10:00:00Z"
  }
}
```

---

### **5. PUT /api/drillholes/:id** - Update Drill Hole ✏️
**Purpose:** Update drill hole with optional new photos  
**Auth:** Required  
**Content-Type:** multipart/form-data

**Example Postman FormData:**
```
Authorization: Bearer your-jwt-token

metersDrilled | 200.5
utilisation | 85.0
operationalComment | Updated progress report
notes | Reached target depth successfully
replacePhotos | false
photos | [File] - New image files (optional)
```

**Response (200):**
```json
{
  "message": "Drill hole updated successfully",
  "data": {
    "id": "uuid",
    "metersDrilled": 200.5,
    "utilisation": 85.0,
    "operationalComment": "Updated progress report",
    "photos": ["https://s3-url/existing.jpg", "https://s3-url/new.jpg"],
    "updatedAt": "2025-11-06T11:00:00Z"
  }
}
```

---

### **6. DELETE /api/drillholes/:id** - Delete Drill Hole 🗑️
**Purpose:** Delete drill hole and all S3 photos  
**Auth:** Required

**Example:**
```bash
DELETE /api/drillholes/drill-hole-uuid-here
Authorization: Bearer your-jwt-token
```

**Response (200):**
```json
{
  "message": "Drill hole deleted successfully"
}
```

---

### **7. POST /api/drillholes/:id/photos** - Add Photos 📸
**Purpose:** Add additional photos to existing drill hole  
**Auth:** Required  
**Content-Type:** multipart/form-data

**Example Postman FormData:**
```
Authorization: Bearer your-jwt-token

photos | [File] - Select multiple image files
```

**Response (200):**
```json
{
  "message": "Photos added successfully",
  "data": {
    "id": "uuid",
    "photos": ["https://s3-url/existing.jpg", "https://s3-url/new1.jpg", "https://s3-url/new2.jpg"],
    "updatedAt": "2025-11-06T11:30:00Z"
  },
  "newPhotos": ["https://s3-url/new1.jpg", "https://s3-url/new2.jpg"]
}
```

---

### **8. DELETE /api/drillholes/:id/photos** - Remove Photos 🖼️
**Purpose:** Remove specific photos from drill hole  
**Auth:** Required  
**Content-Type:** application/json

**Example:**
```bash
DELETE /api/drillholes/drill-hole-uuid-here/photos
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "photoUrls": [
    "https://s3-url/photo-to-delete1.jpg",
    "https://s3-url/photo-to-delete2.png"
  ]
}
```

**Response (200):**
```json
{
  "message": "Photos removed successfully",
  "data": {
    "id": "uuid",
    "photos": ["https://s3-url/remaining-photo.jpg"],
    "updatedAt": "2025-11-06T12:00:00Z"
  }
}
```

---

### **9. GET /api/drillholes/create-data** - Get Dropdown Data 📋
**Purpose:** Get all dropdown options for creating drill holes  
**Auth:** Public (No authentication required)

**Example:**
```bash
GET /api/drillholes/create-data
```

**Response (200):**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Mining Project A",
      "code": "MPA-001"
    },
    {
      "id": "uuid",
      "name": "Drilling Project B", 
      "code": "DPB-002"
    }
  ],
  "shifts": [
    "Day Shift (8:00AM - 17:00PM)",
    "Night Shift (18:00PM - 7:00AM)"
  ],
  "downtimeCategories": [
    "Mechanical",
    "Equipment Failure",
    "Weather",
    "Logistics",
    "Personnel",
    "Operational Delay",
    "Drilling Problems",
    "Standby"
  ]
}
```

---

### **10. GET /api/drillholes/stats/:projectId** - Get Project Statistics 📈
**Purpose:** Get drilling analytics and statistics for a project  
**Auth:** Required

**Example:**
```bash
GET /api/drillholes/stats/b28fb9fa-77e6-4465-8ac7-ba33d910fdab
Authorization: Bearer your-jwt-token
```

**Response (200):**
```json
{
  "message": "Drilling statistics retrieved successfully",
  "project": {
    "id": "uuid",
    "name": "Mining Project A",
    "code": "MPA-001"
  },
  "stats": {
    "totalHoles": 15,
    "totalMetersDrilled": 2500.5,
    "totalExpectedDepth": 3000.0,
    "avgPenetrationRate": 18.5,
    "avgUtilisation": 87.3,
    "totalMachineHours": 150.5,
    "totalDrillingHours": 120.0,
    "totalDowntime": 30.5,
    "totalWaterUsed": 7500.0,
    "totalFuelUsed": 750.0,
    "completionPercentage": 83.35
  }
}
```

---

## 🔧 **Quick Test Data**

### **Sample FormData for Postman (Copy-Paste Ready):**

```
projectId | b28fb9fa-77e6-4465-8ac7-ba33d910fdab
drillingPlatform | Platform Alpha-7
contractor | DeepDrill Solutions Ltd
mobilisationDate | 2025-11-10
shift | Day Shift (8:00AM - 17:00PM)
holeId | DH-TEST-001
startDate | 2025-11-12
expectedDepth | 250.5
metersDrilled | 185.75
machineHours | 12.5
standbyHours | 2.25
drillingHours | 10.25
downtime | 2.25
downtimeCategory | Mechanical
reason | Routine maintenance check
penetrationRate | 18.2
utilisation | 82.0
waterUsed | 1250.5
additives | Bentonite clay, Polymer mud
fuelUsed | 85.75
fieldTopUp | 15.25
operationalComment | Test drill hole creation
notes | Sample data for testing
```

---

## 🚀 **Key Features**

✅ **Sequelize ORM** - Type-safe database operations  
✅ **AWS S3 Integration** - Secure photo storage  
✅ **FormData Support** - File uploads with form data  
✅ **Comprehensive Search** - Filter by project, search text  
✅ **Pagination** - Efficient data loading  
✅ **Statistics** - Project drilling analytics  
✅ **Photo Management** - Add/remove individual photos  
✅ **Validation** - Input validation and error handling  
✅ **Authentication** - JWT-based security  

---

## 🔒 **Authentication**

All protected endpoints require a valid JWT token:
```
Authorization: Bearer your-jwt-token-here
```

Public endpoints:
- `GET /api/drillholes/create-data`

---

## 📱 **Error Responses**

**400 Bad Request:**
```json
{
  "error": "Missing required field: holeId"
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**404 Not Found:**
```json
{
  "error": "Drill hole not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to create drill hole"
}
```

---

## 🏗️ **Sequelize vs Raw SQL Benefits**

1. **Type Safety** - Better TypeScript integration
2. **Associations** - Easy relationship handling
3. **Validation** - Built-in model validation
4. **Migrations** - Better schema management
5. **Security** - Automatic SQL injection prevention
6. **Maintainability** - Cleaner, more readable code

Ready to test! 🚀