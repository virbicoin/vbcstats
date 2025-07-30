#!/bin/bash

# Create data directory if it doesn't exist
mkdir -p .next/server/app/api/data

# Copy geoip-lite data files to the build directory
if [ -d "node_modules/geoip-lite/data" ]; then
    echo "Copying geoip-lite data files..."
    cp -r node_modules/geoip-lite/data/* .next/server/app/api/data/
    echo "GeoIP data files copied successfully"
else
    echo "Warning: geoip-lite data directory not found"
fi
