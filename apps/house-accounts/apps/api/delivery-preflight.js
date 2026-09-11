const paths = new Set([
  '/api/storefront/quote', '/api/storefront/checkout',
  '/api/public/storefront/quote', '/api/public/storefront/checkout',
]);

export function deliveryPreflight(config, uberDirect) {
  return async (request, _response, next) => {
    if (request.method !== 'POST' || !paths.has(request.path) ||
        request.body?.fulfillment?.type !== 'delivery' || !config.uberDirectAutoDispatch) return next();
    try {
      await uberDirect.accessToken();
      next();
    } catch (error) {
      console.error('Uber delivery authentication preflight failed', error.code || 'UBER_AUTH_FAILED');
      next(Object.assign(new Error('Delivery is temporarily unavailable. No payment has been taken. Please choose pickup or contact the bakery.'), { status:503, code:'DELIVERY_AUTH_UNAVAILABLE' }));
    }
  };
}
