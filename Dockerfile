# 1단계: 빌드
FROM node:20.14.0-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY .env.production .env.production
RUN npm install
COPY . .
RUN npm run build -- --mode production
# 2단계: 정적 파일 서빙
FROM nginx:1.25.3-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

COPY ssl/certificate.crt /etc/nginx/ssl/certificate.crt
COPY ssl/private.key /etc/nginx/ssl/private.key
COPY ssl/ca_bundle.crt /etc/nginx/ssl/ca_bundle.crt

# ✅ SPA 라우팅용 Nginx 설정 필요 시 아래 줄 활성화
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
