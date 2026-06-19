# Invoice Automator Modules

import ssl as _ssl

_ssl_patched = False


def disable_ssl_verify():
    """
    غیرفعال‌کردن بررسی گواهی TLS برای کل پردازه.

    در ایران، شبکه گاهی گواهی سرور بله/روبیکا را با یک گواهی خودامضا
    جایگزین می‌کند و باعث خطای CERTIFICATE_VERIFY_FAILED می‌شود. چون این
    برنامه فقط به سرویس‌های داخلی (بله/روبیکا) متصل می‌شود، بررسی گواهی را
    غیرفعال می‌کنیم تا اتصال برقرار شود.
    """
    global _ssl_patched
    if _ssl_patched:
        return
    try:
        _ssl._create_default_https_context = _ssl._create_unverified_context
        _orig = _ssl.create_default_context

        def _unverified(*a, **k):
            ctx = _orig(*a, **k)
            ctx.check_hostname = False
            ctx.verify_mode = _ssl.CERT_NONE
            return ctx

        _unverified._orig = _orig
        _ssl.create_default_context = _unverified
        _ssl_patched = True
    except Exception:
        pass
