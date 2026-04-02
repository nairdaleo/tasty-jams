#!/bin/bash
# Start local HTTP server for testing i18n and other features

echo "🚀 Starting local server..."
echo "📍 Visit: http://localhost:8000"
echo "🛑 Press Ctrl+C to stop"
echo ""

cd "$(dirname "$0")" || exit
python3 -m http.server 8000
