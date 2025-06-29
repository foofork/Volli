#!/bin/bash

# Build script for Volly WASM crypto module
set -e

echo "🦀 Building Volly Crypto WASM module..."

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack is not installed. Installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf pkg pkg-node target

# Build for web target
echo "🌐 Building for web target..."
wasm-pack build --target web --out-dir pkg --release

# Build for Node.js target  
echo "📦 Building for Node.js target..."
wasm-pack build --target nodejs --out-dir pkg-node --release

# Show bundle sizes
echo "📊 Bundle sizes:"
ls -lah pkg/*.wasm
echo ""

# Calculate size reduction from target (983KB → 250KB)
WASM_SIZE=$(stat -f%z pkg/*.wasm 2>/dev/null || stat -c%s pkg/*.wasm 2>/dev/null)
WASM_SIZE_KB=$((WASM_SIZE / 1024))
TARGET_SIZE_KB=250
ORIGINAL_SIZE_KB=983

echo "🎯 Size Analysis:"
echo "  Current:  ${WASM_SIZE_KB}KB"
echo "  Target:   ${TARGET_SIZE_KB}KB"
echo "  Original: ${ORIGINAL_SIZE_KB}KB"

if [ $WASM_SIZE_KB -le $TARGET_SIZE_KB ]; then
    echo "✅ Size target achieved!"
else
    REDUCTION_NEEDED=$((WASM_SIZE_KB - TARGET_SIZE_KB))
    echo "⚠️  Need to reduce by ${REDUCTION_NEEDED}KB more"
fi

echo "✨ Build complete!"