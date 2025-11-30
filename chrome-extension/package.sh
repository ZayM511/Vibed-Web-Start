#!/bin/bash

# JobFiltr Chrome Extension Packaging Script
# This script packages the extension into a ZIP file for distribution

echo "==================================="
echo "JobFiltr Extension Packager"
echo "==================================="
echo ""

# Set variables
EXTENSION_NAME="jobfiltr-extension"
VERSION="1.0.0"
OUTPUT_DIR="../public"
TEMP_DIR="temp_package"

# Create temporary directory
echo "Creating temporary packaging directory..."
mkdir -p "$TEMP_DIR"

# Copy extension files
echo "Copying extension files..."
cp manifest.json "$TEMP_DIR/"
cp popup.html "$TEMP_DIR/"
cp -r src "$TEMP_DIR/"
cp -r styles "$TEMP_DIR/"
cp -r icons "$TEMP_DIR/"
cp README.md "$TEMP_DIR/"

# Remove any development files
echo "Cleaning development files..."
find "$TEMP_DIR" -name ".DS_Store" -delete
find "$TEMP_DIR" -name "*.md" -not -name "README.md" -delete

# Create ZIP file
echo "Creating ZIP archive..."
cd "$TEMP_DIR"
ZIP_NAME="${EXTENSION_NAME}-v${VERSION}.zip"
zip -r "../$OUTPUT_DIR/$ZIP_NAME" . -x "*.git*" "*.DS_Store"
cd ..

# Create a copy named chrome-extension.zip for the download button
cp "$OUTPUT_DIR/$ZIP_NAME" "$OUTPUT_DIR/chrome-extension.zip"

# Clean up
echo "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo ""
echo "==================================="
echo "✓ Extension packaged successfully!"
echo "==================================="
echo ""
echo "Output files:"
echo "  - $OUTPUT_DIR/$ZIP_NAME"
echo "  - $OUTPUT_DIR/chrome-extension.zip"
echo ""
echo "To install the extension:"
echo "  1. Unzip the file"
echo "  2. Open Chrome and go to chrome://extensions/"
echo "  3. Enable 'Developer mode'"
echo "  4. Click 'Load unpacked'"
echo "  5. Select the unzipped folder"
echo ""
