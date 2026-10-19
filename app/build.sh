#!/bin/bash
mkdir -p www
cp ../*.html ../*.png ../*.txt ../*.js www/ || true
cp -r ../js www/ || true
npx esbuild capacitor-bridge.js --bundle --minify=false --format=iife --outfile=www/capacitor-bundle.js
# Inject bundle into HTML
for file in www/*.html; do
    if ! grep -q "capacitor-bundle.js" "$file"; then
        sed -i 's|</head>|    <script src="capacitor-bundle.js"></script>\n</head>|' "$file"
    fi
done
