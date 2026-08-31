import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

export type Address = { addressLine1:string; addressLine2:string; locality:string; administrativeDistrictLevel1:string; postalCode:string; country:string };
export type SavedAddress = Address & { id:string; label:string; addressType:'home'|'work'|'other'; isDefault:boolean };
type Suggestion = { placeId:string; label:string; mainText:string; secondaryText:string };

async function addressApi(path:string,options?:RequestInit){const response=await fetch(`/api/house/storefront${path}`,{headers:{'Content-Type':'application/json',...(options?.headers||{})},...options});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Address search failed.');return body;}

export default function AddressAutocomplete({address,onChange,enabled=true,required=false}:{address:Address;onChange:(address:Address)=>void;enabled?:boolean;required?:boolean}){
  const [suggestions,setSuggestions]=useState<Suggestion[]>([]),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const token=useRef(crypto.randomUUID()),timer=useRef<number|undefined>(undefined);
  useEffect(()=>()=>window.clearTimeout(timer.current),[]);
  const search=(value:string)=>{onChange({...address,addressLine1:value});setError('');window.clearTimeout(timer.current);if(!enabled||value.trim().length<3){setSuggestions([]);setOpen(false);return;}timer.current=window.setTimeout(async()=>{try{const body=await addressApi('/address-search',{method:'POST',body:JSON.stringify({input:value,sessionToken:token.current})});setSuggestions(body.suggestions||[]);setOpen(true);}catch(cause){setError(cause instanceof Error?cause.message:'Address search failed.');}},250)};
  const choose=async(suggestion:Suggestion)=>{setBusy(true);setError('');try{const body=await addressApi(`/address-search/${encodeURIComponent(suggestion.placeId)}?sessionToken=${encodeURIComponent(token.current)}`);onChange({...address,...body.address,addressLine2:address.addressLine2||body.address.addressLine2||''});setOpen(false);setSuggestions([]);token.current=crypto.randomUUID();}catch(cause){setError(cause instanceof Error?cause.message:'Address search failed.');}finally{setBusy(false)}};
  return <div className="address-autocomplete">
    <input value={address.addressLine1} onChange={event=>search(event.target.value)} onFocus={()=>suggestions.length&&setOpen(true)} onBlur={()=>window.setTimeout(()=>setOpen(false),150)} autoComplete="street-address" placeholder={enabled?'Start typing an address':'Street address'} required={required}/>
    {busy&&<span className="address-autocomplete__busy">Finding address...</span>}
    {open&&suggestions.length>0&&<div className="address-autocomplete__menu" role="listbox">{suggestions.map(suggestion=><button type="button" key={suggestion.placeId} onMouseDown={event=>event.preventDefault()} onClick={()=>void choose(suggestion)}><MapPin size={18}/><span><strong>{suggestion.mainText}</strong><small>{suggestion.secondaryText}</small></span></button>)}<footer>Address suggestions by Google</footer></div>}
    {error&&<small className="address-autocomplete__error">{error}</small>}
  </div>;
}
