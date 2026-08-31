import { useEffect, useState } from 'react';

/** Public navigation follows the same publishing switch as the Careers page. */
export function useCareersVisibility() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/house/public/careers?tenantSlug=amazing-donuts', { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Careers are unavailable.')))
      .then(body => setVisible(body.pageEnabled !== false))
      .catch(error => {
        if (error.name !== 'AbortError') setVisible(false);
      });
    return () => controller.abort();
  }, []);

  return visible;
}
