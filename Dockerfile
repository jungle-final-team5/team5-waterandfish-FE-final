# 1단계: 빌드
FROM node:18.20.2-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --mode production
# 2단계: 정적 파일 서빙
FROM nginx:1.25.3-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# ✅ .env.production은 필요 없음 (Vite는 build 시점에만 읽음)

# ✅ SPA 라우팅용 Nginx 설정 필요 시 아래 줄 활성화
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
