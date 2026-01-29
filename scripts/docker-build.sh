#!/bin/bash

# Docker Build Script for GDI ELD UI

set -e

VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_NAME="gdi-eld-ui"

echo "🐳 Building Docker Image..."
echo "   Version: $VERSION"
echo "   Timestamp: $TIMESTAMP"
echo ""

# Build the image
docker build \
  --build-arg BUILD_ENV=production \
  -t ${IMAGE_NAME}:latest \
  -t ${IMAGE_NAME}:${VERSION} \
  -t ${IMAGE_NAME}:${VERSION}-${TIMESTAMP} \
  .

echo ""
echo "✅ Docker image built successfully!"
echo ""
echo "📦 Images created:"
docker images | grep $IMAGE_NAME | head -3
echo ""
echo "🚀 To run locally:"
echo "   docker run -p 3000:3000 ${IMAGE_NAME}:latest"
echo ""
echo "🚀 Or with docker-compose:"
echo "   docker-compose up -d"
echo ""
echo "📤 To push to registry:"
echo "   docker tag ${IMAGE_NAME}:${VERSION} your-registry.insight.com/${IMAGE_NAME}:${VERSION}"
echo "   docker push your-registry.insight.com/${IMAGE_NAME}:${VERSION}"
echo ""
