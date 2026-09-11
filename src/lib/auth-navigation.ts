export function isCheckoutPath(pathname: string) {
  return /^\/checkout(?:\/|$)/.test(pathname);
}

export function authReturnTo(location: Pick<Location, 'pathname' | 'search' | 'hash'>) {
  if (!isCheckoutPath(location.pathname)) return '/account/';
  return `${location.pathname}${location.search}${location.hash}`;
}
