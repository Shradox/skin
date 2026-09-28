// Реальные цены (Skinport → резерв CSGO Market) и картинки (Steam CDN через ByMykel CSGO-API → резерв Steam Market)
const https=require("https"),zlib=require("zlib"),fs=require("fs"),path=require("path");
const CACHE=path.join(__dirname,"market-cache.json"),IMG=i=>"https://community.cloudflare.steamstatic.com/economy/image/"+i+"/360fx360f";
let S={prices:{},images:{},cat:{},provider:"none",updated:0},ALL=[];
try{S={...S,...JSON.parse(fs.readFileSync(CACHE,"utf8"))}}catch{}
const wait=ms=>new Promise(r=>setTimeout(r,ms)),warn=(...a)=>console.warn("[market]",...a);
function get(url,redirects=3){return new Promise((ok,no)=>{https.get(url,{timeout:60000,headers:{"User-Agent":"skinbox-demo","Accept-Encoding":"br, gzip","Accept":"application/json"}},r=>{
  if(r.statusCode>=300&&r.statusCode<400&&r.headers.location&&redirects)return ok(get(new URL(r.headers.location,url).href,redirects-1));
  if(r.statusCode!==200){r.resume();return no(Error(url.split("?")[0]+" → HTTP "+r.statusCode))}
  const e=r.headers["content-encoding"],s=e==="br"?r.pipe(zlib.createBrotliDecompress()):e==="gzip"?r.pipe(zlib.createGunzip()):r,b=[];
  s.on("data",c=>b.push(c));s.on("end",()=>{try{ok(JSON.parse(Buffer.concat(b)))}catch(x){no(x)}});s.on("error",no)}).on("error",no).on("timeout",function(){this.destroy(Error("timeout"))})})}
async function loadPrices(names){const want=new Set(names);
  const src=[["Skinport",async()=>(await get("https://api.skinport.com/v1/items?app_id=730&currency=USD")).map(x=>[x.market_hash_name,x.min_price??x.suggested_price])],
    ["CSGO Market",async()=>(await get("https://market.csgo.com/api/v2/prices/USD.json")).items.map(x=>[x.market_hash_name,x.price])]];
  for(const[prov,f]of src)try{const out={},list=await f();ALL=list.filter(([n,p])=>+p>=.2&&/ \| /.test(n)&&!/^(StatTrak|Souvenir)/.test(n)).map(([n,p])=>[n,+p]);for(const[n,p]of list)if(want.has(n)&&+p>0)out[n]=+p;
    if(Object.keys(out).length){S.prices={...S.prices,...out};S.provider=prov;S.updated=Date.now();return}warn(prov,"не вернул нужных предметов")}catch(e){warn(prov,e.message)}}
async function loadImages(names){const need=names.filter(n=>!S.images[n]);if(!need.length&&Object.keys(S.cat).length)return;
  try{const w=new Set(need),cat={};for(const x of await get("https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins_not_grouped.json")){if(w.has(x.market_hash_name)&&x.image&&!S.images[x.market_hash_name])S.images[x.market_hash_name]=x.image;if(x.image)cat[x.market_hash_name]=x.image}
   if(ALL.length){S.cat={};for(const[n,p]of ALL)if(cat[n])S.cat[n]=[p,cat[n]]}}catch(e){warn("CSGO-API",e.message)}
  for(const n of need.filter(n=>!S.images[n])){try{const ic=(await get("https://steamcommunity.com/market/search/render/?appid=730&norender=1&count=1&query="+encodeURIComponent(n))).results?.[0]?.asset_description?.icon_url;if(ic)S.images[n]=IMG(ic)}catch(e){warn("Steam",n,e.message)}await wait(3500)}}
let running=false;
function init(names){const run=async()=>{if(running)return;running=true;try{await loadPrices(names);await loadImages(names);fs.writeFileSync(CACHE,JSON.stringify(S));console.log(`[market] ${S.provider}: цен ${Object.keys(S.prices).length}, картинок ${Object.keys(S.images).length}`)}finally{running=false}};run();setInterval(run,10*60e3).unref()}
const info=(name,fb)=>({price:S.prices[name]??fb,img:S.images[name]||null,live:name in S.prices});
const status=()=>({provider:S.provider,updated:S.updated,prices:Object.keys(S.prices).length,images:Object.keys(S.images).length});
const row=([name,[price,img]])=>({name,price,img,live:true});
const near=(price,n,skip=[])=>Object.entries(S.cat).filter(([k])=>!skip.includes(k)).map(row).sort((a,b)=>Math.abs(a.price-price)-Math.abs(b.price-price)).slice(0,n);
const find=name=>S.cat[name]?row([name,S.cat[name]]):null;
module.exports={init,info,status,near,find};
