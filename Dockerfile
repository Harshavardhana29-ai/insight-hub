FROM node:22-alpine AS builder
 
WORKDIR /app
 
COPY package.json pnpm-lock.yaml* package-lock.json* bun.lock* bun.lockb* ./
RUN corepack enable && pnpm install --frozen-lockfile
 
COPY . .
RUN VITE_API_BASE=https://mra-backend-gateway-bnwb9717.uc.gateway.dev/api \
    VITE_MCP_BASE=https://bdo-saarthi-sso-mcp-dev.azurewebsites.net \
    VITE_REDIRECT_URI=https://mra-frontend-gateway-bnwb9717.uc.gateway.dev/auth/callback \
    pnpm build
 
FROM nginx:1.27-alpine
 
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
 
EXPOSE 8080
CMD ["sh", "-c", "sed -i \"s/listen       80;/listen       ${PORT:-8080};/\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]