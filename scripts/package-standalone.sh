#!/bin/bash

# Package Standalone Next.js Application
# This script creates a deployment-ready tarball for Node.js servers

set -e

echo "📦 Packaging Standalone Next.js Application..."

# Check if build exists
if [ ! -d ".next/standalone" ]; then
  echo "❌ Error: .next/standalone directory not found"
  echo "   Please run 'npm run build' first"
  exit 1
fi

# Create deployment directory
DEPLOY_DIR="deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

echo "📋 Copying standalone server..."
cp -r .next/standalone/* $DEPLOY_DIR/

echo "📋 Copying static assets..."
mkdir -p $DEPLOY_DIR/.next
cp -r .next/static $DEPLOY_DIR/.next/static

echo "📋 Copying build metadata..."
cp .next/BUILD_ID $DEPLOY_DIR/.next/ 2>/dev/null || true
cp .next/build-manifest.json $DEPLOY_DIR/.next/ 2>/dev/null || true
cp .next/routes-manifest.json $DEPLOY_DIR/.next/ 2>/dev/null || true
cp .next/prerender-manifest.json $DEPLOY_DIR/.next/ 2>/dev/null || true

echo "📋 Copying public files..."
if [ -d "public" ]; then
  cp -r public $DEPLOY_DIR/public
fi

# Create .env.production template
cat > $DEPLOY_DIR/.env.production << 'EOF'
# Production Environment Variables
# Copy this to .env.local on the server and update values

NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://api-ccrprod.insight.com

# Application Insights (Optional)
# NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=...

# Add other environment variables as needed
EOF

# Create README for deployment
cat > $DEPLOY_DIR/README.md << 'EOF'
# GDI ELD UI - Deployment Package

## Quick Start

1. Extract this package:
   ```bash
   tar -xzf gdi-eld-ui.tar.gz
   cd deploy
   ```

2. Configure environment:
   ```bash
   cp .env.production .env.local
   # Edit .env.local with your production values
   ```

3. Start the application:
   ```bash
   # Option 1: Direct with Node.js
   node server.js
   
   # Option 2: With PM2 (recommended)
   pm2 start server.js --name gdi-eld-ui
   
   # Option 3: With systemd (see systemd service file)
   ```

4. Application will be running on http://localhost:3000

## Requirements

- Node.js 18.17 or higher
- 512MB RAM minimum (1GB recommended)
- Port 3000 available (or configure PORT env variable)

## Environment Variables

See `.env.production` for all available configuration options.

Required variables:
- `NEXT_PUBLIC_API_BASE_URL` - Backend API URL

## Process Management

### Using PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Start
pm2 start server.js --name gdi-eld-ui

# View logs
pm2 logs gdi-eld-ui

# Restart
pm2 restart gdi-eld-ui

# Stop
pm2 stop gdi-eld-ui

# Auto-start on server reboot
pm2 startup
pm2 save
```

### Using systemd
See `gdi-eld-ui.service` file for systemd configuration.

## Health Check

```bash
curl http://localhost:3000
```

Should return HTML content.

## Troubleshooting

### Port already in use
```bash
# Change port
export PORT=3001
node server.js
```

### Application not starting
```bash
# Check Node.js version
node --version  # Should be 18.17+

# Check logs
tail -f /var/log/gdi-eld-ui.log
```

## Support

Contact: mkotapal@insight.com
EOF

# Create systemd service file
cat > $DEPLOY_DIR/gdi-eld-ui.service << 'EOF'
[Unit]
Description=GDI ELD UI Next.js Application
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/gdi-eld-ui
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

# Environment variables
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0

# Logging
StandardOutput=append:/var/log/gdi-eld-ui.log
StandardError=append:/var/log/gdi-eld-ui-error.log

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Create PM2 ecosystem file
cat > $DEPLOY_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'gdi-eld-ui',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '512M',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TARBALL_NAME="gdi-eld-ui-${VERSION}-${TIMESTAMP}.tar.gz"

# Create tarball
echo "📦 Creating tarball: $TARBALL_NAME"
tar -czf $TARBALL_NAME -C $DEPLOY_DIR .

# Calculate size
SIZE=$(du -h $TARBALL_NAME | cut -f1)

echo ""
echo "✅ Package created successfully!"
echo ""
echo "📦 Package: $TARBALL_NAME"
echo "📊 Size: $SIZE"
echo ""
echo "📋 Contents:"
echo "   - server.js (Next.js server)"
echo "   - .next/ (compiled application)"
echo "   - public/ (static assets)"
echo "   - .env.production (environment template)"
echo "   - README.md (deployment instructions)"
echo "   - gdi-eld-ui.service (systemd service file)"
echo "   - ecosystem.config.js (PM2 configuration)"
echo ""
echo "🚀 To deploy:"
echo "   1. Copy $TARBALL_NAME to production server"
echo "   2. Extract: tar -xzf $TARBALL_NAME"
echo "   3. Configure: cp .env.production .env.local && vi .env.local"
echo "   4. Start: node server.js (or use PM2/systemd)"
echo ""
