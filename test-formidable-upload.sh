#!/bin/bash

# Test script for the new Formidable-based media upload endpoint
# This will create a test image and upload it

echo "🧪 Testing Formidable Media Upload Endpoint"
echo "==========================================="

# Get JWT token (you'll need to replace this with a valid token)
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"

# Create a small test image file (1x1 pixel PNG)
echo "Creating test image..."
echo -n "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > test-image.png

# Test the upload endpoint
echo "Uploading test image with Formidable..."
curl -X POST http://localhost:3000/media/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "type=DRILL_HOLE" \
  -F "file=@test-image.png" \
  -v

# Clean up
rm -f test-image.png

echo ""
echo "Test completed!"