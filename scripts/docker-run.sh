#!/bin/bash

# Docker Run Script - Start the application locally for testing

set -e

IMAGE_NAME="gdi-eld-ui:latest"
CONTAINER_NAME="gdi-eld-ui"
PORT=3000

echo "🐳 Starting GDI ELD UI in Docker..."

# Stop existing container if running
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
  echo "⚠️  Stopping existing container..."
  docker stop $CONTAINER_NAME
  docker rm $CONTAINER_NAME
fi

# Run container
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:3000 \
  -e NEXT_PUBLIC_API_BASE_URL=https://api-ccrdev.insight.com \
  --restart unless-stopped \
  $IMAGE_NAME

echo ""
echo "✅ Container started successfully!"
echo ""
echo "📊 Container Status:"
docker ps | grep $CONTAINER_NAME
echo ""
echo "🌐 Application URL: http://localhost:$PORT"
echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker logs -f $CONTAINER_NAME"
echo "   Stop:         docker stop $CONTAINER_NAME"
echo "   Restart:      docker restart $CONTAINER_NAME"
echo "   Remove:       docker rm -f $CONTAINER_NAME"
echo ""
