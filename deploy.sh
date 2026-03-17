#!/bin/bash
# Frontend Deployment Script for Google Cloud Shell

set -e

echo "=== MRA Frontend Deployment ==="
echo ""

# Configuration
BUCKET_NAME=""

read -p "Enter your GCS bucket name (e.g., mra-frontend-staging): " BUCKET_NAME
echo ""
read -p "Enter backend API URL (e.g., https://mra-backend-xxx-uc.a.run.app/api): " BACKEND_URL
echo ""

# Verify bucket exists
if ! gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
  echo "Bucket gs://$BUCKET_NAME does not exist."
  read -p "Create it now? (y/n): " CREATE_BUCKET
  if [ "$CREATE_BUCKET" = "y" ]; then
    echo "Creating bucket..."
    gsutil mb -l us-central1 gs://$BUCKET_NAME
    echo "✓ Bucket created"
  else
    echo "Error: Bucket required. Exiting."
    exit 1
  fi
fi

echo "Step 1: Installing dependencies..."
npm install -g pnpm
pnpm install

echo "Step 2: Creating production environment..."
cat > .env.production <<EOF
VITE_API_BASE=$BACKEND_URL
EOF

echo "Step 3: Building production bundle..."
pnpm build

echo "Step 4: Uploading to GCS bucket..."
gsutil -m rsync -r dist/ gs://$BUCKET_NAME

echo "Step 5: Configuring bucket for static website..."
gsutil web set -m index.html -e index.html gs://$BUCKET_NAME
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# Get the public URL
PUBLIC_URL="https://storage.googleapis.com/$BUCKET_NAME/index.html"

echo ""
echo "=== Deployment Complete ==="
echo "Frontend URL: $PUBLIC_URL"
echo ""
echo "Test your application by opening the URL above!"
echo ""
