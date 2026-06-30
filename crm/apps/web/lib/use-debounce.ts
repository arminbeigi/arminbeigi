import { useEffect, useState } from 'react';

/** مقدار با تأخیر — برای جست‌وجوی زنده بدون فشار به سرور */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
