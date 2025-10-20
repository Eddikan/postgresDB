#!/bin/bash
# Pre-deployment script to prepare Lambda package structure

echo "🚀 Preparing Lambda deployment..."

# Remove old src if it exists
if [ -e "src" ]; then
  echo "Removing old src..."
  rm -rf src
fi

# Copy compiled src files (JS only, no TS)
echo "Copying compiled src files..."
mkdir -p src
rsync -av --exclude='*.ts' --include='*.js' --include='*.js.map' --include='*/' --exclude='*' ../src/ ./src/

# Create node_modules symlink if it doesn't exist
if [ ! -L "node_modules" ]; then
  echo "Creating symlink to node_modules..."
  ln -s ../node_modules node_modules
fi

# Copy package.json to help with dependency resolution
if [ ! -f "package.json" ]; then
  echo "Copying package.json..."
  cp ../package.json package.json
fi

echo "✅ Pre-deployment preparation complete"
