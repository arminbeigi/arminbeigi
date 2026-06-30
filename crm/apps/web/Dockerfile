# ── شفازح CRM — Web (Next.js 14 / standalone) ───────────────────────────────
# مرحله‌ی ساخت
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# NEXT_PUBLIC_API_URL در زمان build در باندل تزریق می‌شود.
# پیش‌فرض «/api» ⇒ هم‌مبدأ پشت Nginx (بدون نیاز به دامنه‌ی جداگانه).
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# مرحله‌ی اجرا — خروجی standalone فقط فایل‌های لازم را دارد
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
