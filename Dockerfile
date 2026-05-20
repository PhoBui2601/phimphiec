# Sử dụng Node.js 20 làm base image (bản tiêu chuẩn để đảm bảo tương thích better-sqlite3)
FROM node:20

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Copy các file cấu hình package để cài đặt thư viện trước (giúp cache layer Docker)
COPY package.json package-lock.json* ./

# Cài đặt toàn bộ thư viện (bao gồm cả devDependencies để build Vite)
RUN npm install

# Copy toàn bộ mã nguồn vào thư mục làm việc
COPY . .

# Build ứng dụng Vite Frontend để ra phiên bản dành cho server
RUN npm run build

# Khai báo port ứng dụng sử dụng
EXPOSE 3000

# Chuyển môi trường sang Production (giúp server Node.js và React tối ưu hơn)
ENV NODE_ENV=production

# Chạy server với npx tsx
CMD ["npx", "tsx", "server.ts"]
