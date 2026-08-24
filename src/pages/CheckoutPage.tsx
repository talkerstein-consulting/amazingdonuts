import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Building2, CreditCard, LockKeyhole, ShoppingBag, Store, Truck } from 'lucide-react';
import { ShopProvider, money, useShop } from '../lib/shop';
import AuthModal from '../shop/AuthModal';
import CommerceLogo from './CommerceLogo';
import '../index.css';
import '../components/brand/brand.css';
import '../shop/shop.css';
import './commerce.css';
import './delivery.css';

type Address = { addressLine1:string; addressLine2:string; locality:string; administrativeDistrictLevel1:string; postalCode:string; country:string };
type Session = { user:null|{firstName:string;lastName:string;email:string}; profile:null|{default_phone?:string;default_address?:Partial<Address>}; houseAccount:null|{id:string;organizationName:string;status:string;credit:{available:number}} };
type SquareCard = { attach:(selector:string)=>Promise<void>; tokenize:(details:unknown)=>Promise<{status:string;token?:string;errors?:{message?:string}[]}>; destroy:()=>Promise<boolean> };
declare global { interface Window { Square?: { payments:(appId:string,locationId:string)=>{card:()=>Promise<SquareCard>} } } }

const blankAddress:Address={addressLine1:'',addressLine2:'',locality:'Toronto',administrativeDistrictLevel1:'ON',postalCode:'',country:'CA'};
const tomorrow=()=>{const d=new Date(Date.now()+86400000);d.setHours(9,0,0,0);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
async function api(path:string,options?:RequestInit){const response=await fetch(`/api/house${path}`,{headers:{'Content-Type':'application/json',...(options?.headers||{})},...options});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Request failed.');return body}

function Checkout(){
  const {lines,subtotal,clear}=useShop();
  const [session,setSession]=useState<Session>();
  const [authOpen,setAuthOpen]=useState(false);
  const [method,setMethod]=useState<'card'|'house_account'>('card');
  const [fulfillment,setFulfillment]=useState<'pickup'|'delivery'>('pickup');
  const [scheduledAt,setScheduledAt]=useState(tomorrow);
  const [phone,setPhone]=useState('');
  const [address,setAddress]=useState<Address>(blankAddress);
  const [deliveryInstructions,setDeliveryInstructions]=useState('');
  const [noContact,setNoContact]=useState(false);
  const [config,setConfig]=useState<any>();
  const [quote,setQuote]=useState<any>();
  const [quoteError,setQuoteError]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [success,setSuccess]=useState<any>();
  const card=useRef<SquareCard|undefined>(undefined);

  const loadSession=()=>api('/storefront/session').then(body=>{setSession(body);setPhone(body.profile?.default_phone||'');setAddress({...blankAddress,...(body.profile?.default_address||{})});if(!body.user)setAuthOpen(true)}).catch(cause=>setError(cause.message));
  useEffect(()=>{void loadSession();void api('/storefront/config').then(setConfig).catch(cause=>setError(cause.message))},[]);
  useEffect(()=>{if(!config?.applicationId||method!=='card'||!session?.user)return;let cancelled=false;const mount=async()=>{if(!window.Square){const script=document.createElement('script');script.src=config.environment==='sandbox'?'https://sandbox.web.squarecdn.com/v1/square.js':'https://web.squarecdn.com/v1/square.js';script.async=true;await new Promise<void>((resolve,reject)=>{script.onload=()=>resolve();script.onerror=()=>reject(new Error('Secure card fields could not load.'));document.head.appendChild(script)})}if(cancelled||!window.Square)return;card.current=await window.Square.payments(config.applicationId,config.locationId).card();await card.current.attach('#square-card')};void mount().catch(cause=>setError(cause.message));return()=>{cancelled=true;void card.current?.destroy().catch(()=>{});card.current=undefined}},[config,method,session?.user]);

  const items=()=>lines.map(line=>({name:line.product.name,quantity:line.qty}));
  const fulfillmentBody=()=>({type:fulfillment,scheduledAt:new Date(scheduledAt).toISOString(),recipient:{displayName:`${session?.user?.firstName||''} ${session?.user?.lastName||''}`.trim(),email:session?.user?.email||'',phone},...(fulfillment==='delivery'?{address,deliveryInstructions,noContact}:{})});
  useEffect(()=>{
    if(!session?.user||!lines.length||!phone||!scheduledAt||(fulfillment==='delivery'&&(!address.addressLine1||address.postalCode.replace(/\s/g,'').length<6))){setQuote(undefined);setQuoteError('');return}
    const controller=new AbortController();
    const timer=window.setTimeout(()=>{api('/storefront/quote',{method:'POST',signal:controller.signal,body:JSON.stringify({items:items(),fulfillment:fulfillmentBody()})}).then(body=>{setQuote(body);setQuoteError('')}).catch(cause=>{if(cause.name!=='AbortError'){setQuote(undefined);setQuoteError(cause.message)}})},350);
    return()=>{window.clearTimeout(timer);controller.abort()};
  },[session?.user,lines,phone,scheduledAt,fulfillment,address,deliveryInstructions,noContact]);

  const place=async(event:React.FormEvent)=>{event.preventDefault();if(!session?.user){setAuthOpen(true);return}if(!lines.length||!quote)return;setBusy(true);setError('');try{let sourceId:string|undefined;if(method==='card'){if(!card.current)throw new Error('The secure card form is still loading.');const token=await card.current.tokenize({amount:(quote.order.total/100).toFixed(2),currencyCode:quote.order.currency,intent:'CHARGE',customerInitiated:true,sellerKeyedIn:false,billingContact:{givenName:session.user.firstName,familyName:session.user.lastName,email:session.user.email,phone,addressLines:[address.addressLine1,address.addressLine2].filter(Boolean),city:address.locality,state:address.administrativeDistrictLevel1,postalCode:address.postalCode,countryCode:address.country}});if(token.status!=='OK'||!token.token)throw new Error(token.errors?.[0]?.message||'Card authorization failed.');sourceId=token.token}const result=await api('/storefront/checkout',{method:'POST',body:JSON.stringify({idempotencyKey:crypto.randomUUID(),items:items(),fulfillment:fulfillmentBody(),paymentMethod:method,sourceId})});clear();setSuccess({...result.order,delivery:result.delivery})}catch(cause){setError(cause instanceof Error?cause.message:'Checkout failed.')}finally{setBusy(false)}};

  if(success)return <main className="commerce-shell"><section className="commerce-success"><ShoppingBag/><p>Order confirmed</p><h1>Your box is on the bakery's list.</h1><strong>Order #{success.id.slice(-8)}</strong><span>{money(success.total/100)} · {fulfillment}</span>{success.delivery&&<small>Delivery is awaiting assignment by the bakery.</small>}<a href="/account/">View my orders</a></section></main>;
  const payable=quote?.order?.total/100;
  return <main className="commerce-shell">
    <header className="commerce-top"><a href="/shop/"><ArrowLeft/> Back to the shop</a><CommerceLogo/><a href="/account/">My account</a></header>
    <div className="checkout-grid"><form className="checkout-form" onSubmit={place}>
      <div className="commerce-heading"><p>Secure checkout</p><h1>Finish your order</h1><span><LockKeyhole/> Sign-in is required. Guest checkout is not available.</span></div>
      {session?.user?<section className="signed-row"><div><strong>{session.user.firstName} {session.user.lastName}</strong><span>{session.user.email}</span></div><a href="/account/">Manage account</a></section>:<section className="signin-gate"><h2>Sign in to continue</h2><p>Your cart is saved while you sign in or create an account.</p><button type="button" onClick={()=>setAuthOpen(true)}>Sign in or create account</button></section>}
      <fieldset disabled={!session?.user||busy}><legend>Fulfillment</legend>
        <div className="segment"><button type="button" className={fulfillment==='pickup'?'active':''} onClick={()=>setFulfillment('pickup')}><Store/> Pickup</button><button type="button" className={fulfillment==='delivery'?'active':''} disabled={config?.delivery?.enabled===false} onClick={()=>setFulfillment('delivery')}><Truck/> Delivery</button></div>
        {fulfillment==='delivery'&&config?.delivery&&<p className="delivery-policy">Local delivery is {money(config.delivery.feeAmount/100)} and free on merchandise orders of {money(config.delivery.freeThreshold/100)} or more. {money(config.delivery.minimumAmount/100)} minimum.</p>}
        <label><span>Date and time</span><input type="datetime-local" min={tomorrow()} value={scheduledAt} onChange={event=>setScheduledAt(event.target.value)} required/></label>
        <label><span>Phone</span><input type="tel" value={phone} onChange={event=>setPhone(event.target.value)} required/></label>
        {fulfillment==='delivery'&&<div className="address-fields"><label><span>Street address</span><input value={address.addressLine1} onChange={event=>setAddress({...address,addressLine1:event.target.value})} required/></label><label><span>Unit</span><input value={address.addressLine2} onChange={event=>setAddress({...address,addressLine2:event.target.value})}/></label><label><span>City</span><input value={address.locality} onChange={event=>setAddress({...address,locality:event.target.value})} required/></label><label><span>Postal code</span><input value={address.postalCode} onChange={event=>setAddress({...address,postalCode:event.target.value.toUpperCase()})} autoComplete="postal-code" required/></label><label className="delivery-instructions"><span>Drop-off instructions</span><textarea value={deliveryInstructions} onChange={event=>setDeliveryInstructions(event.target.value)} maxLength={500} rows={3}/></label><label className="no-contact"><input type="checkbox" checked={noContact} onChange={event=>setNoContact(event.target.checked)}/><span>No-contact delivery</span></label></div>}
      </fieldset>
      <fieldset disabled={!session?.user||busy}><legend>Payment</legend><div className="payment-options"><button type="button" className={method==='card'?'active':''} onClick={()=>setMethod('card')}><CreditCard/><span><strong>Card</strong><small>Securely processed by Square</small></span></button>{session?.houseAccount?.status==='active'&&<button type="button" className={method==='house_account'?'active':''} onClick={()=>setMethod('house_account')}><Building2/><span><strong>Charge house account</strong><small>{session.houseAccount.organizationName} · {money(session.houseAccount.credit.available/100)} available</small></span></button>}</div>{method==='card'&&<div id="square-card" className="square-card"/>}{method==='house_account'&&<p className="house-note">This order will appear in Square and on your next house-account statement.</p>}</fieldset>
      {(quoteError||error)&&<p className="checkout-error" role="alert">{quoteError||error}</p>}
      <button className="place-order" disabled={!session?.user||!lines.length||!quote||busy}>{busy?'Placing order...':quote?`Place order · ${money(payable)}`:'Calculating Square total...'}</button>
    </form><aside className="order-summary"><p>Your box</p><h2>{lines.reduce((total,line)=>total+line.qty,0)} items</h2>{lines.map(line=><div className="summary-line" key={line.product.id}><img src={line.product.img} alt=""/><span><strong>{line.product.name}</strong><small>Qty {line.qty}</small></span><b>{money(Number(line.product.price.replace(/[^0-9.]/g,''))*line.qty)}</b></div>)}<div className="summary-breakdown"><span>Merchandise</span><b>{quote?money((quote.order.subtotal-(quote.delivery?.fee||0))/100):money(subtotal)}</b>{quote?.delivery&&<><span>Delivery</span><b>{quote.delivery.free?'Free':money(quote.delivery.fee/100)}</b></>}{quote&&<><span>HST</span><b>{money(quote.order.tax/100)}</b></>}</div><div className="summary-total"><span>{quote?'Total':'Estimated subtotal'}</span><strong>{money(quote?payable:subtotal)}</strong></div><small>{quote?.delivery?'The bakery assigns the driver after payment. Square does not dispatch the courier.':'Square confirms catalog pricing, HST, discounts, and the final total before payment.'}</small></aside></div>
    <AuthModal open={authOpen} onClose={()=>setAuthOpen(false)} onSuccess={loadSession}/>
  </main>;
}

export default function CheckoutPage(){return <ShopProvider><Checkout/></ShopProvider>}
