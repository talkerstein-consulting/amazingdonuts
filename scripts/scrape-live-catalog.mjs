import fs from 'node:fs/promises';

const origin='https://amazingdonuts.com';
const delay=Number(process.env.CRAWL_DELAY_MS||10000);
const decode=value=>String(value||'').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const match=(html,re)=>decode(html.match(re)?.[1]);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const sitemap=await (await fetch(`${origin}/xmlsitemap.php?type=products&page=1`)).text();
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(found=>decode(found[1]));
const products=[];

for(let index=0;index<urls.length;index+=1){
  const url=urls[index],html=await (await fetch(url,{headers:{'user-agent':'AmazingDonutsCatalogMigration/1.0'}})).text();
  const optionArea=html.match(/<div data-product-option-change[^>]*>([\s\S]*?)<\/div>\s*<div class="form-field form-field--stock/)?.[1]||'';
  const options=[...optionArea.matchAll(/<div class="form-field" data-product-attribute="([^"]+)">([\s\S]*?)(?=<div class="form-field" data-product-attribute=|$)/g)].map(found=>{
    const [,type,block]=found,label=match(block,/<label[^>]*>([\s\S]*?)<\/label>/).replace(/:\s*\*?$/,':').replace(/\s*\*$/,''),required=/\brequired\b/.test(block);
    const values=[...block.matchAll(/<option[^>]*value="[^"]+"[^>]*>([\s\S]*?)<\/option>|<label[^>]*data-product-attribute-value="[^"]+"[^>]*>([\s\S]*?)<\/label>/g)].map(value=>decode(value[1]||value[2])).filter(value=>value&&value!=='Choose Options');
    const maximumBytes=Number(block.match(/Maximum file size is\s*<strong>(\d+)/)?.[1]||0)||undefined;
    return {label,type,required,...(values.length?{values}:{}),...(maximumBytes?{maximumBytes}:{})};
  });
  const bc=html.match(/var BCData = (\{.*?\});/)?.[1];let price;
  try{price=JSON.parse(bc||'{}').product_attributes?.price?.without_tax?.value}catch{}
  products.push({
    id:match(html,/name="product_id" value="([^"]+)/),
    name:match(html,/<h1[^>]*class="productView-title"[^>]*>([\s\S]*?)<\/h1>/),
    url,
    price,
    currency:'CAD',
    sku:decode(html.match(/<dt class="productView-info-name sku-label"[^>]*>[\s\S]*?<\/dt>\s*<dd[^>]*data-product-sku[^>]*>([\s\S]*?)<\/dd>/)?.[1]),
    image:html.match(/<meta property="og:image" content="([^"]+)/)?.[1]||'',
    description:match(html,/<div class="productView-description"[^>]*>([\s\S]*?)<\/div>/),
    options
  });
  process.stdout.write(`[${index+1}/${urls.length}] ${products.at(-1).name||url}\n`);
  if(index<urls.length-1)await sleep(delay);
}

await fs.mkdir('website-data',{recursive:true});
await fs.writeFile('website-data/live-bigcommerce-catalog.json',JSON.stringify({source:origin,scrapedAt:new Date().toISOString(),count:products.length,products},null,2)+'\n');
process.stdout.write(`Saved ${products.length} products to website-data/live-bigcommerce-catalog.json\n`);
