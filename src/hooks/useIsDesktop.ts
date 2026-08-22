import { useEffect, useState } from 'react';

export function useIsDesktop(breakpoint = 900) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= breakpoint
  );

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isDesktop;
}
