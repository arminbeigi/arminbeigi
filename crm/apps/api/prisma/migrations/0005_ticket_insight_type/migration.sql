-- ماژول پشتیبانی: افزودن نوع بینش دسته‌بندی تیکت (افزودنی و سازگار با عقب)
ALTER TYPE "InsightType" ADD VALUE IF NOT EXISTS 'TICKET_CLASSIFICATION';
