#!/bin/bash

# Script to generate PWA icons from emoji
# This creates simple colored square icons with the camera emoji

echo "🎥 Generating PWA icons..."

# Define sizes
sizes=(72 96 128 144 152 192 384 512)

# Create icons directory if it doesn't exist
mkdir -p icons

# For macOS, we'll create simple HTML files that can be converted to PNG
# You can also use online tools or Photoshop to create proper icons

for size in "${sizes[@]}"; do
    echo "Creating ${size}x${size} icon..."
    
    # Create an HTML file for each size
    cat > "temp_icon_${size}.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            padding: 0;
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: system-ui, -apple-system, sans-serif;
        }
        .icon {
            font-size: $((size * 60 / 100))px;
            line-height: 1;
        }
    </style>
</head>
<body>
    <div class="icon">🎥</div>
</body>
</html>
EOF
done

echo "✅ HTML templates created!"
echo "📋 To create actual PNG icons:"
echo "1. Open each temp_icon_*.html file in browser"
echo "2. Take screenshot or use browser dev tools to export as PNG"
echo "3. Save as icons/icon-{size}x{size}.png"
echo "4. Delete temp_icon_*.html files"
echo ""
echo "🌐 Or use online tools like:"
echo "- favicon.io"
echo "- realfavicongenerator.net"
echo "- pwa-asset-generator"
echo ""
echo "🚀 Alternative: Use this command to install pwa-asset-generator:"
echo "npm install -g pwa-asset-generator"
echo "Then run: pwa-asset-generator logo.png icons/"
