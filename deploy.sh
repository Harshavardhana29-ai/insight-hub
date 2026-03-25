#!/bin/bash
# Frontend Deployment Script for Google Cloud Shell (Cloud Run)
 
set -e
 
echo "=== MRA Frontend Deployment ==="
echo ""
 
REGION="us-central1"
DEFAULT_SERVICE_NAME="mra-frontend"
 
PROJECT_ID=$(gcloud config get-value project)
echo "Project ID: $PROJECT_ID"
echo ""
 
ensure_file() {
  local file_path="$1"
  local file_content="$2"
 
  if [ ! -f "$file_path" ]; then
    echo "Creating missing $file_path..."
    cat > "$file_path" <<EOF
$file_content
EOF
    echo "✓ Created $file_path"
  fi
}
 
read -p "Enter backend API URL (e.g., https://mra-backend-xxx-uc.a.run.app/api): " BACKEND_URL
echo ""
read -p "Enter frontend Cloud Run service name [$DEFAULT_SERVICE_NAME]: " SERVICE_NAME
SERVICE_NAME=${SERVICE_NAME:-$DEFAULT_SERVICE_NAME}
 
if [ -z "$BACKEND_URL" ]; then
  echo "Error: Backend API URL is required. Exiting."
  exit 1
fi
 
echo "Step 0: Verifying Cloud Shell tools..."
command -v gcloud >/dev/null 2>&1 || { echo "Error: gcloud is not installed."; exit 1; }
echo "✓ Cloud Shell tools available"
 
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found. Run this script from the Frontend project root."
  exit 1
fi
 
echo "Step 0.1: Ensuring frontend container files exist..."
ensure_file "Dockerfile" "FROM node:22-alpine AS builder
 
WORKDIR /app
 
COPY package.json pnpm-lock.yaml* package-lock.json* bun.lock* bun.lockb* ./
RUN corepack enable && pnpm install --frozen-lockfile
 
COPY . .
ARG VITE_API_BASE
ENV VITE_API_BASE=\$VITE_API_BASE
RUN pnpm build
 
FROM nginx:1.27-alpine
 
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
 
EXPOSE 8080
CMD [\"sh\", \"-c\", \"sed -i \\\"s/listen       80;/listen       \${PORT:-8080};/\\\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'\"]"
 
ensure_file "nginx.conf" "server {
  listen       80;
  server_name  _;
 
  root   /usr/share/nginx/html;
  index  index.html;
 
  location / {
    try_files \$uri \$uri/ /index.html;
  }
 
  location /assets/ {
    expires 1y;
    add_header Cache-Control \"public, immutable\";
  }
}"
 
ensure_file ".dockerignore" "node_modules/
dist/
.git/
.gitignore
.env
.env.*
coverage/
playwright-report/
test-results/"
 
echo "Step 1: Creating production environment..."
cat > .env.production <<EOF
VITE_API_BASE=$BACKEND_URL
EOF
 
echo "Step 2: Building frontend container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME
 
echo "Step 3: Deploying frontend to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080
 
FRONTEND_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")
 
echo ""
echo "=== Deployment Complete ==="
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "Test your application by opening the URL above!"
echo "If backend CORS is restricted, add this URL to CORS_ORIGINS in the backend deployment."
echo ""