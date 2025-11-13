# Drill Hole API Endpoints Documentation

## Base URL
All drill hole endpoints are prefixed with `/api/drillholes`

## Authentication
Most endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer your-jwt-token
```

## Endpoints Overview

### 1. **POST /api/drillholes** - Create Drill Hole
Create a new drill hole with photo uploads using FormData.

**Authentication:** Required  
**Content-Type:** multipart/form-data

**Form Fields:**
```
projectId: string (UUID, required)
drillingPlatform: string (required)
contractor: string (required)
mobilisationDate: string (YYYY-MM-DD, required)
shift: string (enum: "Day Shift (8:00AM - 17:00PM)" | "Night Shift (18:00PM - 7:00AM)", required)
holeId: string (required, unique per project)
startDate: string (YYYY-MM-DD, required)
expectedDepth: number (required)
metersDrilled: number (required)
machineHours: number (required)
standbyHours: number (required)
drillingHours: number (required)
downtime: number (required)
downtimeCategory: string (enum, required)
reason: string (required)
penetrationRate: number (required)
utilisation: number (0-100, required)
waterUsed: number (required)
additives: string (required)
fuelUsed: number (required)
fieldTopUp: number (required)
operationalComment: string (optional)
notes: string (optional)
```

**Files:**
- Multiple image files can be uploaded as `photos`

**Example using curl:**
```bash
curl -X POST "http://localhost:3000/api/drillholes" \
  -H "Authorization: Bearer your-token" \
  -F "projectId=uuid-here" \
  -F "drillingPlatform=Platform A" \
  -F "contractor=ABC Drilling" \
  -F "mobilisationDate=2025-11-06" \
  -F "shift=Day Shift (8:00AM - 17:00PM)" \
  -F "holeId=DH-001" \
  -F "startDate=2025-11-07" \
  -F "expectedDepth=200" \
  -F "metersDrilled=180" \
  -F "machineHours=10" \
  -F "standbyHours=2" \
  -F "drillingHours=8" \
  -F "downtime=2" \
  -F "downtimeCategory=Mechanical" \
  -F "reason=Routine maintenance" \
  -F "penetrationRate=20" \
  -F "utilisation=90" \
  -F "waterUsed=500" \
  -F "additives=Bentonite" \
  -F "fuelUsed=50" \
  -F "fieldTopUp=10" \
  -F "operationalComment=Smooth drilling day" \
  -F "notes=No major issues" \
  -F "photos=@image1.jpg" \
  -F "photos=@image2.png"
```

**Response (201 Created):**
```json
{
  "message": "Drill hole created successfully",
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "drillingPlatform": "Platform A",
    "contractor": "ABC Drilling",
    "holeId": "DH-001",
    "photos": ["https://s3-url/photo1.jpg", "https://s3-url/photo2.png"],
    "createdAt": "2025-11-06T10:00:00Z",
    "updatedAt": "2025-11-06T10:00:00Z"
  }
}
```

---

### 2. **GET /api/drillholes** - List All Drill Holes
Get all drill holes with pagination and filtering.

**Authentication:** Required

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `projectId` (UUID, optional)
- `search` (string, optional) - Search by holeId, contractor, or platform

**Example:**
```bash
curl -X GET "http://localhost:3000/api/drillholes?page=1&limit=10&projectId=uuid&search=DH" \
  -H "Authorization: Bearer your-token"
```

**Response (200 OK):**
```json
{
  "message": "Drill holes retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "projectName": "Mining Project",
      "projectCode": "MP-001",
      "holeId": "DH-001",
      "drillingPlatform": "Platform A",
      "contractor": "ABC Drilling",
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

### 3. **GET /api/drillholes/project/:projectId** - Get Drill Holes by Project
Get all drill holes for a specific project.

**Authentication:** Required

**Parameters:**
- `projectId` (UUID, required)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/drillholes/project/uuid-here" \
  -H "Authorization: Bearer your-token"
```

**Response (200 OK):**
```json
{
  "message": "Drill holes retrieved successfully",
  "project": {
    "id": "uuid",
    "name": "Mining Project",
    "code": "MP-001"
  },
  "data": [
    {
      "id": "uuid",
      "holeId": "DH-001",
      "drillingPlatform": "Platform A",
      "contractor": "ABC Drilling",
      "expectedDepth": 200,
      "metersDrilled": 180,
      "photos": ["https://s3-url/photo1.jpg"]
    }
  ],
  "total": 5
}
```

---

### 4. **GET /api/drillholes/:id** - Get Specific Drill Hole
Get detailed information about a specific drill hole.

**Authentication:** Required

**Parameters:**
- `id` (UUID, required)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/drillholes/uuid-here" \
  -H "Authorization: Bearer your-token"
```

**Response (200 OK):**
```json
{
  "message": "Drill hole retrieved successfully",
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "projectName": "Mining Project",
    "projectCode": "MP-001",
    "drillingPlatform": "Platform A",
    "contractor": "ABC Drilling",
    "mobilisationDate": "2025-11-06",
    "shift": "Day Shift (8:00AM - 17:00PM)",
    "holeId": "DH-001",
    "startDate": "2025-11-07",
    "expectedDepth": 200,
    "metersDrilled": 180,
    "machineHours": 10,
    "standbyHours": 2,
    "drillingHours": 8,
    "downtime": 2,
    "downtimeCategory": "Mechanical",
    "reason": "Routine maintenance",
    "penetrationRate": 20,
    "utilisation": 90,
    "waterUsed": 500,
    "additives": "Bentonite",
    "fuelUsed": 50,
    "fieldTopUp": 10,
    "operationalComment": "Smooth drilling day",
    "notes": "No major issues",
    "photos": ["https://s3-url/photo1.jpg", "https://s3-url/photo2.png"],
    "createdAt": "2025-11-06T10:00:00Z",
    "updatedAt": "2025-11-06T10:00:00Z"
  }
}
```

---

### 5. **PUT /api/drillholes/:id** - Update Drill Hole
Update a drill hole with optional new photo uploads.

**Authentication:** Required  
**Content-Type:** multipart/form-data

**Parameters:**
- `id` (UUID, required)

**Form Fields:** (all optional)
- Any field from the create endpoint
- `replacePhotos` (boolean) - If true, replaces all existing photos with new ones

**Example:**
```bash
curl -X PUT "http://localhost:3000/api/drillholes/uuid-here" \
  -H "Authorization: Bearer your-token" \
  -F "metersDrilled=200" \
  -F "operationalComment=Updated progress" \
  -F "photos=@new-photo.jpg"
```

**Response (200 OK):**
```json
{
  "message": "Drill hole updated successfully",
  "data": {
    "id": "uuid",
    "metersDrilled": 200,
    "operationalComment": "Updated progress",
    "photos": ["https://s3-url/existing-photo.jpg", "https://s3-url/new-photo.jpg"],
    "updatedAt": "2025-11-06T11:00:00Z"
  }
}
```

---

### 6. **DELETE /api/drillholes/:id** - Delete Drill Hole
Delete a drill hole and all associated photos from S3.

**Authentication:** Required

**Parameters:**
- `id` (UUID, required)

**Example:**
```bash
curl -X DELETE "http://localhost:3000/api/drillholes/uuid-here" \
  -H "Authorization: Bearer your-token"
```

**Response (200 OK):**
```json
{
  "message": "Drill hole deleted successfully"
}
```

---

### 7. **POST /api/drillholes/:id/photos** - Add Photos
Add additional photos to an existing drill hole.

**Authentication:** Required  
**Content-Type:** multipart/form-data

**Parameters:**
- `id` (UUID, required)

**Files:**
- Multiple image files

**Example:**
```bash
curl -X POST "http://localhost:3000/api/drillholes/uuid-here/photos" \
  -H "Authorization: Bearer your-token" \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.png"
```

**Response (200 OK):**
```json
{
  "message": "Photos added successfully",
  "data": {
    "id": "uuid",
    "photos": ["https://s3-url/existing.jpg", "https://s3-url/photo1.jpg", "https://s3-url/photo2.png"],
    "updatedAt": "2025-11-06T11:30:00Z"
  },
  "newPhotos": ["https://s3-url/photo1.jpg", "https://s3-url/photo2.png"]
}
```

---

### 8. **DELETE /api/drillholes/:id/photos** - Remove Photos
Remove specific photos from a drill hole.

**Authentication:** Required  
**Content-Type:** application/json

**Parameters:**
- `id` (UUID, required)

**Body:**
```json
{
  "photoUrls": [
    "https://s3-url/photo-to-delete1.jpg",
    "https://s3-url/photo-to-delete2.png"
  ]
}
```

**Example:**
```bash
curl -X DELETE "http://localhost:3000/api/drillholes/uuid-here/photos" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "photoUrls": ["https://s3-url/photo1.jpg"]
  }'
```

**Response (200 OK):**
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

### 9. **GET /api/drillholes/create-data** - Get Dropdown Data
Get all dropdown options needed for creating drill holes.

**Authentication:** Not required (Public endpoint)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/drillholes/create-data"
```

**Response (200 OK):**
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

### 10. **GET /api/drillholes/stats/:projectId** - Get Project Statistics
Get drilling statistics and analytics for a project.

**Authentication:** Required

**Parameters:**
- `projectId` (UUID, required)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/drillholes/stats/uuid-here" \
  -H "Authorization: Bearer your-token"
```

**Response (200 OK):**
```json
{
  "message": "Drilling statistics retrieved successfully",
  "project": {
    "id": "uuid",
    "name": "Mining Project",
    "code": "MP-001"
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

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "error": "Validation error message"
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
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error message"
}
```

## File Upload Specifications

**Supported Image Formats:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

**File Size Limits:**
- Maximum file size: 10MB per image
- Maximum files per request: 10 images

**S3 Storage:**
- All photos are stored in AWS S3
- Files are organized by project: `drill-holes/{projectId}/`
- Automatic file naming with UUIDs
- Server-side encryption enabled