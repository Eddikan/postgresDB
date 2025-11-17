# Formidable Media Upload Implementation

## Overview
The media upload endpoint has been updated to use **Formidable** instead of Fastify's native multipart handling. This provides more reliable file upload processing and better error handling.

## Key Benefits
- ✅ **More Reliable**: No more timeout/abort issues with multipart processing
- ✅ **Better Error Handling**: Specific error codes for file size and type validation
- ✅ **Temporary File Management**: Automatic cleanup of temporary files
- ✅ **Built-in Validation**: File type and size validation at the parser level

## API Endpoint

### POST /media/upload

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Form Data:**
- `type` (required): Media type - must be "DRILL_HOLE"
- `file` (required): Image file (PNG, JPG, JPEG, etc.)

**Example cURL:**
```bash
curl -X POST http://localhost:3000/media/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "type=DRILL_HOLE" \
  -F "file=@your-image.jpg"
```

**Success Response (200):**
```json
{
  "message": "Media uploaded successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://your-s3-bucket.s3.amazonaws.com/drill-holes/unique-filename.jpg",
    "type": "DRILL_HOLE",
    "filename": "your-image.jpg",
    "mimetype": "image/jpeg",
    "size": 123456,
    "s3Key": "drill-holes/unique-filename.jpg",
    "uploadedAt": "2025-11-07T10:32:24.000Z"
  }
}
```

## Error Handling

### File Size Limit (400)
```json
{
  "error": "File too large. Maximum size is 10MB."
}
```

### Invalid File Type (400)
```json
{
  "error": "Invalid file type. Only image files are allowed."
}
```

### Missing Type Field (400)
```json
{
  "error": "Missing required field: type. Please specify the media type (e.g., DRILL_HOLE)."
}
```

### Invalid Type Value (400)
```json
{
  "error": "Invalid media type. Must be one of: DRILL_HOLE"
}
```

## Implementation Details

### Formidable Configuration
```typescript
const form = formidable({
  maxFileSize: 10 * 1024 * 1024, // 10MB limit
  allowEmptyFiles: false,
  keepExtensions: true,
  filter: ({ mimetype }) => {
    // Only allow image files
    return Boolean(mimetype && mimetype.startsWith('image/'));
  }
});
```

### File Processing Flow
1. **Parse Form**: Formidable parses multipart data into fields and files
2. **Validate Type**: Check the `type` field against MediaType enum
3. **Validate File**: Ensure exactly one image file is provided
4. **Read Buffer**: Read the temporary file into a buffer
5. **Upload to S3**: Use existing S3Service to upload the file
6. **Cleanup**: Remove temporary file from filesystem
7. **Return Response**: Send success response with media details

### Dependencies Added
```bash
npm install formidable @types/formidable --legacy-peer-deps
```

### Removed Dependencies
- Removed `@fastify/multipart` registration from app.ts
- No longer using `MultipartFile` interface

## Testing
You can test the endpoint using the provided test script:
```bash
./test-formidable-upload.sh
```

Or use any HTTP client like Postman, Insomnia, or cURL with the example above.