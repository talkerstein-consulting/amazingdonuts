import { Store, Truck } from 'lucide-react';
import { useFulfillmentChoice } from '../lib/fulfillment';

export default function PickupBanner() {
  const mode = useFulfillmentChoice({ shopBannerOnly: true });
  if (!mode) return null;

  return (
    <div className={`pickup-banner${mode === 'delivery' ? ' pickup-banner--delivery' : ''}`} role="status">
      <div className="pickup-banner__inner">
        {mode === 'delivery' ? <Truck size={15} strokeWidth={2.6} aria-hidden="true" /> : <Store size={15} strokeWidth={2.6} aria-hidden="true" />}
        <span className="pickup-banner__lead">{mode === 'delivery' ? 'Local delivery' : 'Pickup'}</span>
        <span className="pickup-banner__note">Date and time confirmed at checkout</span>
      </div>
    </div>
  );
}
