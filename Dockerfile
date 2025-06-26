# 1단계: 빌드
FROM node:18.20.2-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2단계: 정적 파일 서빙
FROM nginx:1.25.3-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# ✅ 이 줄 추가
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]