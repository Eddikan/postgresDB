#!/bin/bash

echo "🔍 Render Deployment Diagnostics"
echo "================================"

echo "📁 Current directory:"
pwd

echo ""
echo "📂 Directory contents:"
ls -la

echo ""
echo "🏗️ Checking if dist folder exists:"
if [ -d "dist" ]; then
    echo "✅ dist folder exists"
    echo "📄 dist contents:"
    ls -la dist/
    
    if [ -f "dist/server.js" ]; then
        echo "✅ dist/server.js exists"
        echo "📊 File size: $(du -h dist/server.js)"
    else
        echo "❌ dist/server.js NOT found"
    fi
else
    echo "❌ dist folder NOT found"
fi

echo ""
echo "📦 Package.json check:"
if [ -f "package.json" ]; then
    echo "✅ package.json exists"
    echo "🔧 Scripts:"
    cat package.json | grep -A 20 '"scripts"'
else
    echo "❌ package.json NOT found"
fi

echo ""
echo "🔧 Node.js version:"
node --version

echo ""
echo "📦 NPM version:"
npm --version

echo ""
echo "🌍 Environment variables:"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_URL: ${DATABASE_URL:0:20}... (truncated)"

echo ""
echo "🧪 Testing server file:"
if [ -f "dist/server.js" ]; then
    echo "✅ Attempting to require server.js..."
    node -e "try { require('./dist/server.js'); console.log('✅ Server file loads successfully'); } catch(e) { console.log('❌ Server file error:', e.message); }"
else
    echo "❌ Cannot test - dist/server.js not found"
fi

echo ""
echo "🎯 Deployment recommendations:"
echo "1. Ensure 'npm run build' completes successfully"
echo "2. Verify dist/server.js exists and is valid"
echo "3. Check environment variables are set correctly"
echo "4. Use 'node dist/server.js' as start command"