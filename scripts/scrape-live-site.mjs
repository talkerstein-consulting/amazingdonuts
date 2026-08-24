import fs from 'node:fs/promises';

const origin='https://amazingdonuts.com',delay=Number(process.env.CRAWL_DELAY_MS||10000),types=['pages','categories','news'];
const decode=value=>String(value||'').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi,' ').replace(/\s+/g,' ').trim();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const entries=[];

for(const type of types){
  const sitemap=await (await fetch(`${origin}/xmlsitemap.php?type=${type}&page=1`)).text();
  const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(found=>decode(found[1]));
  for(const url of urls){
    const html=await (await fetch(url,{headers:{'user-agent':'AmazingDonutsCatalogMigration/1.0'}})).text();
    entries.push({type,url,title:decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]),description:decode(html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1]),heading:decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]),text:decode(html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1]).slice(0,12000)});
    process.stdout.write(`[${entries.length}] ${type}: ${entries.at(-1).title||url}\n`);
    await sleep(delay);
  }
}
await fs.mkdir('website-data',{recursive:true});
await fs.writeFile('website-data/live-bigcommerce-site.json',JSON.stringify({source:origin,scrapedAt:new Date().toISOString(),count:entries.length,entries},null,2)+'\n');
process.stdout.write(`Saved ${entries.length} public pages to website-data/live-bigcommerce-site.json\n`);
