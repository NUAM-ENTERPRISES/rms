#!/bin/bash

# Setup environment variables for Affiniks RMS Backend
# This script sets up the required environment variables for development and testing

echo "Setting up environment variables for Affiniks RMS Backend..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/affiniks_rms?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_REFRESH_EXPIRES_IN="7d"

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN="http://localhost:5173"

# Seed Configuration
SEED_ADMIN_PASSWORD="admin123"

# Redis Configuration (for BullMQ - optional for Phase 1)
REDIS_URL="redis://localhost:6379"

# Logging
LOG_LEVEL="info"
EOF
    echo "✅ .env file created successfully!"
else
    echo "ℹ️  .env file already exists"
fi

echo ""
echo "🔧 Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update DATABASE_URL with your PostgreSQL credentials"
echo "2. Change JWT_SECRET and JWT_REFRESH_SECRET for production"
echo "3. Run 'npm run db:seed' to seed the database"
echo "4. Run 'npm run test:cov' to check test coverage"
echo "5. Run 'npm run start:dev' to start the development server"
echo ""
echo "⚠️  Remember to never commit .env files to version control!"
