-- ============================================================
-- سیستم پیگیری سرنخ‌های ابزار محاسبه بار حرارتی (shofazh.com)
-- اسکیمای دیتابیس MySQL (utf8mb4)
-- ============================================================

CREATE TABLE IF NOT EXISTS heat_calc_leads (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    phone           VARCHAR(11)      NOT NULL COMMENT 'شماره موبایل با فرمت 09xxxxxxxxx',
    heat_load       INT UNSIGNED     NOT NULL COMMENT 'نتیجه بار حرارتی (BTU/hr یا کیلوکالری)',
    suggested_model VARCHAR(120)     NOT NULL COMMENT 'مدل رادیاتور/پکیج پیشنهادی',
    suggested_fins  SMALLINT UNSIGNED DEFAULT NULL COMMENT 'تعداد پره پیشنهادی',
    product_url     VARCHAR(500)     NOT NULL COMMENT 'لینک محصول (بدون UTM؛ UTM موقع ارسال اضافه می‌شود)',
    ip_address      VARBINARY(16)    DEFAULT NULL COMMENT 'IP ثبت‌کننده برای rate-limit (INET6_ATON)',
    optout_token    CHAR(32)         NOT NULL COMMENT 'توکن یکتای لینک لغو پیامک',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sms1_sent_at    DATETIME         DEFAULT NULL COMMENT 'زمان ارسال پیامک اول (نتیجه + لینک)',
    sms2_sent_at    DATETIME         DEFAULT NULL COMMENT 'زمان ارسال پیامک دوم (پیگیری ۲۴ ساعته)',
    converted       TINYINT(1)       NOT NULL DEFAULT 0 COMMENT '۱ = سفارش داد یا تماس گرفت',
    opted_out       TINYINT(1)       NOT NULL DEFAULT 0 COMMENT '۱ = لغو دریافت پیامک',
    PRIMARY KEY (id),
    KEY idx_phone (phone),
    KEY idx_optout_token (optout_token),
    -- ایندکس اصلی کوئری کرون پیگیری:
    KEY idx_followup (converted, opted_out, sms2_sent_at, created_at),
    KEY idx_ip_created (ip_address, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- لاگ تمام ارسال‌های پیامک (پاسخ API و کد HTTP) + مبنای سقف ارسال به هر شماره
CREATE TABLE IF NOT EXISTS sms_log (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    lead_id     BIGINT UNSIGNED DEFAULT NULL,
    phone       VARCHAR(11)     NOT NULL,
    sms_type    VARCHAR(20)     NOT NULL COMMENT 'sms1 | sms2 | other',
    message     TEXT            NOT NULL,
    http_code   SMALLINT        DEFAULT NULL,
    api_response TEXT           DEFAULT NULL,
    success     TINYINT(1)      NOT NULL DEFAULT 0,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_phone_created (phone, created_at),
    KEY idx_lead (lead_id),
    CONSTRAINT fk_smslog_lead FOREIGN KEY (lead_id)
        REFERENCES heat_calc_leads (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
