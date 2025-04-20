#!/bin/bash

echo "Starting local Jekyll server with Docker..."
echo "Rebuilding containers to ensure dependencies are up to date..."
echo "Site will be available at http://localhost:4000"

# Remove old containers and build new ones
docker-compose down
docker-compose build --no-cache
docker-compose up 