const express=require("express"),session=require("express-session"),fs=require("fs"),path=require("path"),crypto=require("crypto"),market=require("./market");
const app=express(),PORT=process.env.PORT||3000,FILE=path.join(__dirname,"data.json"),APP_URL=(process.env.APP_URL||`http://localhost:${PORT}`).replace(/\/$/,"");
let db=JSON.parse(fs.readFileSync(FILE,"utf8"));
db.settings={siteName:"DMITRASHDROP",accent:"#8b5cf6",dailyBonusHours:24,referralPercent:3,referralMinPayout:5,...(db.settings||{})};
db.promos=db.promos||{WELCOME:{type:"percent",value:10,min:0,max:100,uses:0,limit:10000,perUser:{}}};
db.battles=db.battles||[];
db.analytics=db.analytics||{visits:0,opens:0,deposit:0};
const save=()=>fs.writeFileSync(FILE,JSON.stringify(db,null,2));
const ensureUser=u=>{
  if(!u)return;
  u.fair=u.fair||{clientSeed:crypto.randomBytes(12).toString("hex"),nonce:0,history:[]};
  u.refCode=u.refCode||("DM"+crypto.randomBytes(4).toString("hex").toUpperCase());
  u.referrerId=u.referrerId||null; u.referral=u.referral||{pending:0,paid:0};
  u.dailyBonus=u.dailyBonus||{last:0}; u.promoUses=u.promoUses||{};
  u.stats=u.stats||{opens:0,upgrades:0,contracts:0};
};
db.users.forEach(ensureUser); save();
const sha256=x=>crypto.createHash("sha256").update(x).digest("hex");
const fairRoll=(serverSeed,clientSeed,nonce)=>{
  const h=crypto.createHmac("sha256",serverSeed).update(`${clientSeed}:${nonce}`).digest("hex");
  return parseInt(h.slice(0,13),16)/0x1fffffffffffff;
};
app.use(express.json());
app.set("trust proxy", 1);
const isHttps=(process.env.APP_URL||"").startsWith("https://");
app.use(session({
 secret:process.env.SESSION_SECRET||"dev-change-this",
 resave:false,
 saveUninitialized:false,
 proxy:true,
 cookie:{httpOnly:true,sameSite:isHttps?"none":"lax",secure:isHttps,maxAge:7*24*60*60*1000}
}));app.use(express.static(path.join(__dirname,"public")));
const me=r=>db.users.find(u=>u.id===r.session.uid), auth=(r,s,n)=>me(r)?n():s.status(401).json({error:"auth_required"}), admin=(r,s,n)=>me(r)?.role==="admin"?n():s.status(403).json({error:"admin_required"});
// --- пароли: хеш scryptSync (без внешних зависимостей) ---
const hashPw=pw=>{const salt=crypto.randomBytes(8).toString("hex");return salt+":"+crypto.scryptSync(pw,salt,32).toString("hex")};
const verifyPw=(pw,stored)=>{if(!stored)return false;if(!stored.includes(":"))return pw===stored;const[salt,hash]=stored.split(":");try{return crypto.timingSafeEqual(Buffer.from(hash,"hex"),crypto.scryptSync(pw,salt,32))}catch{return false}};
let migrated=false;db.users.forEach(u=>{if(u.password&&!u.password.includes(":")){u.password=hashPw(u.password);migrated=true}});if(migrated)save();
// --- Steam OpenID (реальный вход, только с публичным доменом и ключом STEAM_API_KEY: https://steamcommunity.com/dev/apikey) ---
let steam=null;
if(process.env.STEAM_API_KEY){
 try{
  const passport=require("passport"),SteamStrategy=require("passport-steam").Strategy;
  passport.use(new SteamStrategy({returnURL:`${APP_URL}/auth/steam/return`,realm:APP_URL,apiKey:process.env.STEAM_API_KEY},
   (id,profile,done)=>{let sid=profile.id,u=db.users.find(x=>x.steamId===sid);
    if(!u){u={id:Math.max(0,...db.users.map(x=>x.id))+1,username:profile.displayName||("Player"+sid.slice(-5)),password:null,role:"user",balance:1000,inventory:[],tx:[],avatar:profile.photos?.[2]?.value||profile.photos?.[0]?.value||null,steamId:sid,history:[],caseCounts:{},stats:{opens:0,upgrades:0,contracts:0},notifs:[]};db.users.push(u)}
    else{u.username=profile.displayName||u.username;u.avatar=profile.photos?.[2]?.value||u.avatar}
    save();done(null,u)})); 
  app.use(passport.initialize());
  app.get("/auth/steam",passport.authenticate("steam",{session:false}));
  app.get("/auth/steam/return",passport.authenticate("steam",{session:false,failureRedirect:"/"}),(r,s)=>{r.session.uid=r.user.id;s.redirect("/")});
  steam=true;
 }catch(e){console.warn("[steam] passport-steam не установлен — выполните npm install:",e.message)}
}
app.get("/api/config",(r,s)=>s.json({steamEnabled:!!steam,appearance:db.settings}));
app.get("/api/fair/commit",(r,s)=>auth(r,s,()=>{
  let u=me(r),serverSeed=crypto.randomBytes(32).toString("hex"),commit=sha256(serverSeed),nonce=u.fair.nonce;
  r.session.fairPending={serverSeed,commit,nonce,created:Date.now()};
  s.json({commit,clientSeed:u.fair.clientSeed,nonce});
}));
app.post("/api/fair/client-seed",(r,s)=>auth(r,s,()=>{
  let v=String(r.body.clientSeed||"").trim().slice(0,64);
  if(!/^[a-zA-Z0-9_-]{4,64}$/.test(v))return s.status(400).json({error:"Некорректный client seed"});
  let u=me(r);u.fair.clientSeed=v;u.fair.nonce=0;save();s.json({clientSeed:v,nonce:0});
}));
app.get("/api/fair/history",(r,s)=>auth(r,s,()=>{
  let u=me(r);s.json({clientSeed:u.fair.clientSeed,nonce:u.fair.nonce,history:(u.fair.history||[]).slice(0,50)});
}));
const PERIOD={day:864e5,week:6048e5,all:1e15};
const txlog=(u,amount)=>{u.tx=(u.tx||[]).filter(t=>Date.now()-t.ts<PERIOD.week*6);u.tx.push({ts:Date.now(),amount});};
const feedPush=(u,it,source)=>{db.feed.unshift({ts:Date.now(),username:u.username,avatar:u.avatar,name:it.name,price:it.price,img:it.img,source});db.feed=db.feed.slice(0,150)};
const histPush=(u,it,source)=>{u.history=(u.history||[]);u.history.unshift({ts:Date.now(),name:it.name,price:it.price,img:it.img,source});u.history=u.history.slice(0,60)};
const notify=(u,type,text)=>{u.notifs=(u.notifs||[]);u.notifs.unshift({id:Date.now()+Math.random(),ts:Date.now(),type,text,read:false});u.notifs=u.notifs.slice(0,40)};
app.get("/api/leaderboard",(r,s)=>{let p=PERIOD[r.query.period]||PERIOD.week,cut=Date.now()-p;
 let rows=db.users.map(u=>({username:u.username,avatar:u.avatar,wagered:(u.tx||[]).filter(t=>t.ts>=cut).reduce((a,t)=>a+t.amount,0)})).filter(x=>x.wagered>0).sort((a,b)=>b.wagered-a.wagered).slice(0,20);
 s.json({rows,updated:Date.now()})});
app.get("/api/feed",(r,s)=>s.json({items:db.feed.slice(0,+r.query.limit||30)}));
app.get("/api/stats",(r,s)=>s.json({...db.stats,users:db.users.length,cases:db.cases.length}));
const WEAR=/ \((?:Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/,base=n=>n.replace(/StatTrak™ |Souvenir /,"").replace(WEAR,"");
const dist=(g,share,e)=>{let k=g.map(x=>x.price**-e),t=k.reduce((a,b)=>a+b,0);return g.map((x,i)=>({...x,odds:share*100*k[i]/t}))},ev=l=>l.reduce((s,x)=>s+x.odds/100*x.price,0);
function tune(list,c){let P=c.price,W=c.winChance,R=c.rtp??.88,win=list.filter(x=>x.price>=P),lose=list.filter(x=>x.price<P);if(!win.length||!lose.length)return dist(list,1,.5);
 let lo=.2,hi=5,best;for(let i=0;i<30;i++){let e=(lo+hi)/2;best=[...dist(win,W,e),...dist(lose,1-W,1)];ev(best)>R*P?lo=e:hi=e}return best}
function items(c){let st=x=>({odds:0,...market.info(x[0],x[2])}),fx=(c.fixed||[]).map(x=>({name:x[0],...st(x),odds:db.overrides[`${c.id}:${x[0]}`]??x[1]})),l=[];
 if(c.bases){let b=new Set(c.bases);l=market.all(n=>b.has(base(n)))}
 if(l.length)return[...fx,...(c.winChance!=null?tune(l,c):dist(l,Math.max(0,100-fx.reduce((t,x)=>t+x.odds,0))/100,.5))];
 return c.items?c.items.map(x=>({name:x[0],...st(x),odds:db.overrides[`${c.id}:${x[0]}`]??x[1]})):c.bases?[]:fx}
function summary(c){let l=items(c),t=l.reduce((s,x)=>s+x.odds,0)||1;return{id:c.id,name:c.name,price:c.price,n:l.length,art:c.img||null,rtp:l.reduce((s,x)=>s+x.odds/t*x.price,0)/c.price,win:l.filter(x=>x.price>=c.price).reduce((s,x)=>s+x.odds,0)/t}}
const slim=x=>({name:x.name,price:x.price,img:x.img});
const WIN=42,LEN=56,reel=(l,w)=>Array.from({length:LEN},(_,i)=>i===WIN?w:pick(l));
const pool=()=>{const m=new Map();db.cases.forEach(c=>items(c).forEach(x=>m.set(x.name,x)));return[...m.values()]};
function pick(a){let t=a.reduce((s,x)=>s+Math.max(0,x.odds),0),r=Math.random()*t;for(const x of a){r-=Math.max(0,x.odds);if(r<=0)return x}return a.at(-1)}
app.get("/api/state",(r,s)=>{db.analytics.visits++; let u=me(r);s.json({user:u?{username:u.username,role:u.role,balance:u.balance,inventory:u.inventory,avatar:u.avatar,unread:(u.notifs||[]).filter(x=>!x.read).length}:null,cases:db.cases.map(summary)})});
app.get("/api/cases/:id",(r,s)=>{let c=db.cases.find(x=>x.id==r.params.id);if(!c)return s.status(404).json({error:"case_not_found"});let l=items(c),t=l.reduce((a,x)=>a+x.odds,0)||1;s.json({...summary(c),items:l.map(x=>({...slim(x),odds:x.odds/t*100,live:x.live})).sort((a,b)=>b.price-a.price).slice(0,120)})});
app.post("/api/login",(r,s)=>{let u=db.users.find(x=>x.username===r.body.username);if(!u||!verifyPw(r.body.password,u.password))return s.status(401).json({error:"Неверный логин или пароль"});ensureUser(u);r.session.uid=u.id;let ref=String(r.body.ref||"").trim().toUpperCase(),owner=db.users.find(x=>x.refCode===ref);if(owner&&owner.id!==u.id&&!u.referrerId){u.referrerId=owner.id;save()}r.session.save(()=>s.json({ok:true}))});
app.post("/api/register",(r,s)=>{let un=String(r.body.username||"").trim(),pw=String(r.body.password||"");
 if(!/^[a-zA-Z0-9_]{3,20}$/.test(un))return s.status(400).json({error:"Логин: 3-20 символов, латиница/цифры/_"});
 if(pw.length<4)return s.status(400).json({error:"Пароль минимум 4 символа"});
 if(db.users.some(x=>x.username.toLowerCase()===un.toLowerCase()))return s.status(400).json({error:"Логин уже занят"});
 let u={id:Math.max(0,...db.users.map(x=>x.id))+1,username:un,password:hashPw(pw),role:"user",balance:1000,inventory:[],tx:[],avatar:null,steamId:null,history:[],caseCounts:{},stats:{opens:0,upgrades:0,contracts:0},notifs:[]}; ensureUser(u);
 let ref=String(r.body.ref||"").trim().toUpperCase(),owner=db.users.find(x=>x.refCode===ref);
 if(owner&&owner.id!==u.id)u.referrerId=owner.id;
 db.users.push(u);db.stats.users=db.users.length;save();r.session.uid=u.id;r.session.save(()=>s.json({ok:true}))});
app.post("/api/logout",(r,s)=>r.session.destroy(()=>s.json({ok:true})));
app.post("/api/cases/:id/open",(r,s)=>auth(r,s,()=>{let u=me(r),c=db.cases.find(x=>x.id==r.params.id);if(!c)return s.status(404).json({error:"case_not_found"});
 let n=Math.min(5,Math.max(1,+r.body.count||1)),l=items(c);if(!l.length)return s.status(503).json({error:"Каталог маркета ещё загружается, подождите минуту"});
 let total=c.price*n;if(u.balance<total)return s.status(400).json({error:"Недостаточно демо-баланса"});
 let pending=r.session.fairPending;
 if(!pending || Date.now()-pending.created>120000 || pending.nonce!==u.fair.nonce){let serverSeed=crypto.randomBytes(32).toString("hex");pending={serverSeed,commit:sha256(serverSeed),nonce:u.fair.nonce,created:Date.now()};r.session.fairPending=pending;}
 u.balance-=total; if(u.referrerId){let ref=db.users.find(x=>x.id===u.referrerId);if(ref)ref.referral.pending+=total*db.settings.referralPercent/100} db.analytics.opens+=n; let results=[],startIndex=u.inventory.length,proof=[];
 for(let i=0;i<n;i++){
   let roll=fairRoll(pending.serverSeed,u.fair.clientSeed,u.fair.nonce+i);
   let ticket=roll*100, acc=0,it=l[l.length-1];
   for(const x of l){acc+=Math.max(0,x.odds);if(ticket<=acc){it=x;break}}
   u.inventory.push({...slim(it),case:c.name,at:Date.now(),nonce:u.fair.nonce+i});
   results.push(slim(it));proof.push({nonce:u.fair.nonce+i,roll,serverSeed:pending.serverSeed,commit:pending.commit,item:slim(it)});
   histPush(u,it,"Кейс: "+c.name);feedPush(u,it,"case: "+c.name)
 }
 u.fair.nonce+=n;u.fair.history.unshift(...proof);u.fair.history=u.fair.history.slice(0,50);delete r.session.fairPending;
 u.caseCounts[c.id]=(u.caseCounts[c.id]||0)+n;u.stats.opens+=n;txlog(u,total);db.stats.opens+=n;save();
 s.json({items:results,reel:n===1?reel(l,results[0]).map(slim):null,winIndex:n===1?WIN:null,startIndex,balance:u.balance,fair:proof})}));
app.post("/api/contract",(r,s)=>auth(r,s,()=>{let u=me(r),ix=[...new Set((r.body.indexes||[]).map(Number))].filter(i=>u.inventory[i]);if(ix.length<5||ix.length>10)return s.status(400).json({error:"Нужно от 5 до 10 предметов"});
let st=ix.reduce((t,i)=>t+u.inventory[i].price,0);if(st<1||st>100000)return s.status(400).json({error:"Сумма контракта: от $1 до $100 000"});
let want=Math.random()<.35,m=want?Math.min(8,1-Math.log(1-Math.random())*.46):.3+Math.random()*.65;if(want)m=Math.max(1.02,m);let near=market.near(st*m,8);if(!near.length)return s.status(503).json({error:"Каталог маркета ещё загружается"});
let c=near.filter(x=>want?x.price>=st:x.price<st),it=(c.length?c:near)[Math.floor(Math.random()*(c.length||near.length))];
ix.sort((a,b)=>b-a).forEach(i=>u.inventory.splice(i,1));u.inventory.push({...slim(it),case:"Контракт",at:Date.now()});txlog(u,st);feedPush(u,it,"контракт");histPush(u,it,"Контракт");u.stats.contracts++;db.stats.contracts++;save();s.json({win:it.price>=st,item:slim(it),stake:st,index:u.inventory.length-1,mult:it.price/st})}));
app.post("/api/upgrade",(r,s)=>auth(r,s,()=>{let u=me(r),ix=[...new Set((r.body.indexes||[]).map(Number))].filter(i=>u.inventory[i]);if(!ix.length||ix.length>4)return s.status(400).json({error:"Выберите от 1 до 4 предметов"});
let stake=ix.reduce((t,i)=>t+u.inventory[i].price,0),tg=market.find(r.body.target)||pool().find(x=>x.name===r.body.target);if(!tg||tg.price<=stake)return s.status(400).json({error:"Цель должна быть дороже вложенного"});
let chance=Math.min(.95,Math.max(.01,stake/tg.price)),roll=Math.random(),win=roll<chance;ix.sort((a,b)=>b-a).forEach(i=>u.inventory.splice(i,1));
if(win){u.inventory.push({name:tg.name,price:tg.price,img:tg.img,case:"Апгрейд",at:Date.now()});histPush(u,tg,"Апгрейд")}
txlog(u,stake);if(win)feedPush(u,tg,"апгрейд");u.stats.upgrades++;db.stats.upgrades++;save();s.json({win,chance,roll,stake,target:tg})}));
app.post("/api/sell",(r,s)=>auth(r,s,()=>{let u=me(r),ix=[...new Set((r.body.indexes||[]).map(Number))].filter(i=>u.inventory[i]).sort((a,b)=>b-a),sum=0;
ix.forEach(i=>{let it=u.inventory[i];sum+=market.info(it.name,it.price).price;u.inventory.splice(i,1)});u.balance+=sum;save();s.json({sold:ix.length,sum,balance:u.balance})}));
app.get("/api/suggest",(r,s)=>auth(r,s,()=>{let st=+r.query.stake,ch=Math.min(95,Math.max(1,+r.query.chance));if(!(st>0))return s.status(400).json({error:"Выберите предметы"});s.json({items:market.near(st/(ch/100),12).filter(x=>x.price>st)})}));
app.get("/api/similar",(r,s)=>auth(r,s,()=>{let it=me(r).inventory[+r.query.index];if(!it)return s.status(404).json({error:"not_found"});s.json({items:market.near(it.price,40,[it.name]).filter(x=>Math.abs(x.price-it.price)<=it.price*.15).slice(0,12)})}));
app.post("/api/swap",(r,s)=>auth(r,s,()=>{let u=me(r),it=u.inventory[+r.body.index],n=market.find(r.body.name);if(!it||!n||n.name===it.name||Math.abs(n.price-it.price)>it.price*.15)return s.status(400).json({error:"Замена недоступна"});
u.inventory[+r.body.index]={name:n.name,price:n.price,img:n.img,case:"Замена",at:Date.now()};save();s.json({ok:true})}));
app.post("/api/withdraw",(r,s)=>auth(r,s,()=>{let u=me(r),i=+r.body.index,it=u.inventory[i];if(!it)return s.status(404).json({error:"Предмет не найден"});
u.inventory.splice(i,1);notify(u,"withdraw",`Трейд отправлен: ${it.name} (${it.price.toFixed(2)}$) — примите обмен в Steam (демо)`);save();s.json({item:it,balance:u.balance})}));
// --- Депозит криптой: ДЕМО. Адреса генерируются случайно и никем не отслеживаются — реальные переводы на них уйдут безвозвратно. ---
const COINS={BTC:{name:"Bitcoin",addr:()=>"bc1q"+crypto.randomBytes(20).toString("hex").slice(0,38)},
 ETH:{name:"Ethereum",addr:()=>"0x"+crypto.randomBytes(20).toString("hex")},
 USDT:{name:"USDT (TRC20)",addr:()=>"T"+crypto.randomBytes(17).toString("hex").slice(0,33)},
 LTC:{name:"Litecoin",addr:()=>"ltc1q"+crypto.randomBytes(19).toString("hex").slice(0,36)},
 TON:{name:"Toncoin",addr:()=>"UQ"+crypto.randomBytes(24).toString("base64url").slice(0,44)}};
app.get("/api/coins",(r,s)=>s.json(Object.entries(COINS).map(([code,v])=>({code,name:v.name}))));
app.post("/api/deposit/create",(r,s)=>auth(r,s,()=>{let c=COINS[r.body.coin];if(!c)return s.status(400).json({error:"Неизвестная монета"});s.json({address:c.addr(),coin:r.body.coin,demo:true})}));
app.post("/api/deposit/confirm",(r,s)=>auth(r,s,()=>{let u=me(r),amt=Math.min(5000,Math.max(1,+r.body.amount||0));if(!amt)return s.status(400).json({error:"Введите сумму от $1 до $5000"});
let bonus=0,code=String(r.body.promo||"").trim().toUpperCase(),p=db.promos[code];
 if(p&&!u.promoUses[code]&&amt>=(p.min||0)){bonus=p.type==="percent"?Math.min(amt*p.value/100,p.max||1e9):p.value;u.promoUses[code]=1;p.uses=(p.uses||0)+1}
 if(!bonus&&u.dailyBonus?.discount){bonus=Math.min(amt*u.dailyBonus.discount/100,amt);u.dailyBonus.discount=0}
 u.balance+=amt+bonus;
 if(u.referrerId){let ref=db.users.find(x=>x.id===u.referrerId);if(ref){ref.referral.pending+=amt*db.settings.referralPercent/100}}
 db.analytics.deposit+=(amt);
 notify(u,"deposit",`Зачислено ${(amt+bonus).toFixed(2)}$ (${COINS[r.body.coin]?.name||"крипта"}, демо-баланс)`);
 save();s.json({balance:u.balance,amount:amt,bonus})}));
app.get("/api/notifications",(r,s)=>auth(r,s,()=>{let u=me(r);s.json({items:(u.notifs||[]).slice(0,30),unread:(u.notifs||[]).filter(x=>!x.read).length})}));
app.post("/api/notifications/read",(r,s)=>auth(r,s,()=>{let u=me(r);(u.notifs||[]).forEach(x=>x.read=true);save();s.json({ok:true})}));
app.get("/api/profile",(r,s)=>auth(r,s,()=>{let u=me(r),fav=Object.entries(u.caseCounts||{}).sort((a,b)=>b[1]-a[1])[0],fc=fav&&db.cases.find(c=>c.id==fav[0]);
s.json({stats:u.stats||{opens:0,upgrades:0,contracts:0},history:(u.history||[]).slice(0,24),favorite:fc?{id:fc.id,name:fc.name,img:fc.img,count:fav[1]}:null})}));
app.get("/api/bonus",(r,s)=>auth(r,s,()=>{
 let u=me(r),left=Math.max(0,(u.dailyBonus.last||0)+db.settings.dailyBonusHours*3600000-Date.now());
 s.json({available:left===0,left,discount:u.dailyBonus.discount||0,prizes:[{type:"money",value:5,label:"$5"},{type:"money",value:15,label:"$15"},{type:"money",value:30,label:"$30"},{type:"discount",value:10,label:"-10%"}]});
}));
app.post("/api/bonus/spin",(r,s)=>auth(r,s,()=>{
 let u=me(r),now=Date.now(),cd=db.settings.dailyBonusHours*3600000;
 if(now-(u.dailyBonus.last||0)<cd)return s.status(429).json({error:"Бонус уже получен",left:u.dailyBonus.last+cd-now});
 const prizes=[{type:"money",value:5},{type:"money",value:15},{type:"money",value:30},{type:"discount",value:10}];
 let prize=prizes[Math.floor(fairRoll(crypto.randomBytes(32).toString("hex"),u.fair.clientSeed,u.fair.nonce)*prizes.length)];
 u.dailyBonus.last=now;
 if(prize.type==="money")u.balance+=prize.value; else u.dailyBonus.discount=prize.value;
 notify(u,"bonus",prize.type==="money"?`Ежедневный бонус: +$${prize.value}`:`Ежедневный бонус: скидка ${prize.value}%`);
 save();s.json({prize,balance:u.balance,left:cd});
}));
app.post("/api/referral/attach",(r,s)=>auth(r,s,()=>{let u=me(r),code=String(r.body.code||"").trim().toUpperCase(),owner=db.users.find(x=>x.refCode===code);if(!owner||owner.id===u.id)return s.status(400).json({error:"Реферальный код недействителен"});if(u.referrerId)return s.status(400).json({error:"Реферал уже привязан"});u.referrerId=owner.id;save();s.json({ok:true,referrer:owner.username})}));
app.get("/api/referral",(r,s)=>auth(r,s,()=>{
 let u=me(r);s.json({code:u.refCode,referrer:u.referrerId?db.users.find(x=>x.id===u.referrerId)?.username:null,pending:u.referral.pending,paid:u.referral.paid,percent:db.settings.referralPercent,minPayout:db.settings.referralMinPayout});
}));
app.post("/api/referral/claim",(r,s)=>auth(r,s,()=>{
 let u=me(r),v=+u.referral.pending;if(v<db.settings.referralMinPayout)return s.status(400).json({error:`Минимальная выплата $${db.settings.referralMinPayout}`});
 u.balance+=v;u.referral.paid+=v;u.referral.pending=0;txlog(u,v);save();s.json({balance:u.balance,paid:v});
}));
app.post("/api/promo/apply",(r,s)=>auth(r,s,()=>{
 let u=me(r),code=String(r.body.code||"").trim().toUpperCase(),p=db.promos[code];
 if(!p)return s.status(400).json({error:"Промокод не найден"});
 if((p.limit||0)>0&&p.uses>=p.limit)return s.status(400).json({error:"Лимит промокода исчерпан"});
 if(u.promoUses[code])return s.status(400).json({error:"Вы уже использовали этот промокод"});
 u.promoUses[code]=1;p.uses=(p.uses||0)+1;save();s.json({ok:true,code,type:p.type,value:p.value,min:p.min||0,max:p.max||0});
}));
app.get("/api/appearance",(r,s)=>s.json(db.settings));
app.get("/api/analytics",admin,(r,s)=>s.json({visits:db.analytics.visits,opens:db.stats.opens,contracts:db.stats.contracts,upgrades:db.stats.upgrades,users:db.users.length,balance:db.users.reduce((a,u)=>a+u.balance,0)}));
app.post("/api/battle/bot",(r,s)=>auth(r,s,()=>{
 let u=me(r),caseId=+r.body.caseId,c=db.cases.find(x=>x.id===caseId),seats=Math.min(4,Math.max(2,+r.body.seats||2));
 if(!c)return s.status(404).json({error:"Кейс не найден"});
 let stake=c.price;if(u.balance<stake)return s.status(400).json({error:"Недостаточно баланса"});
 let l=items(c),players=Array.from({length:seats},(_,i)=>({name:i===0?u.username:`BOT ${i}`,sum:0,drops:[]}));
 for(const p of players){for(let j=0;j<1;j++){let roll=Math.random(),acc=0,it=l[l.length-1];for(const x of l){acc+=x.odds/100;if(roll<=acc){it=x;break}}p.drops.push(slim(it));p.sum+=it.price}}
 u.balance-=stake;let winner=players.reduce((a,b)=>b.sum>a.sum?b:a,players[0]);
 if(winner.name===u.username){let all=players.flatMap(p=>p.drops);all.forEach(it=>u.inventory.push({...it,case:"Батл",at:Date.now()}));all.forEach(it=>histPush(u,it,"Батл"))}
 txlog(u,stake);save();s.json({players,winner:winner.name,balance:u.balance,won:winner.name===u.username});
}));
app.get("/api/admin",admin,(r,s)=>s.json({cases:db.cases.map(c=>({id:c.id,name:c.name,price:c.price,winChance:c.winChance??null,fixed:(c.fixed||[]).map(x=>({name:x[0],odds:db.overrides[`${c.id}:${x[0]}`]??x[1]}))})),audit:db.audit.slice(-50).reverse()}));
app.post("/api/admin/case",admin,(r,s)=>{let c=db.cases.find(x=>x.id==r.body.id),n=String(r.body.name||"").trim().slice(0,40),p=+r.body.price,w=r.body.winChance;if(!c||!n||!(p>=.01&&p<=1e6))return s.status(400).json({error:"Неверные данные"});
 c.name=n;c.price=p;if(c.winChance!=null&&w!=null&&w!==""){c.winChance=Math.min(.9,Math.max(.01,+w/100))}db.audit.push({time:new Date().toISOString(),admin:me(r).username,caseId:c.id,name:n,price:p,winChance:c.winChance,mode:"TEST"});save();s.json({ok:true})});
app.post("/api/admin/odds",admin,(r,s)=>{let {caseId,name,odds}=r.body,n=+odds,c=db.cases.find(x=>x.id==caseId);if(!c||!(c.fixed||c.items||[]).some(x=>x[0]===name)||!Number.isFinite(n)||n<0)return s.status(400).json({error:"bad_data"});db.overrides[`${caseId}:${name}`]=n;db.audit.push({time:new Date().toISOString(),admin:me(r).username,caseId,name,odds:n,mode:"TEST"});save();s.json({ok:true})});
app.post("/api/admin/reset",admin,(r,s)=>{db.overrides={};db.audit.push({time:new Date().toISOString(),admin:me(r).username,action:"reset",mode:"TEST"});save();s.json({ok:true})});
app.get("/api/prices",(r,s)=>s.json(market.status()));
market.init([...new Set(db.cases.flatMap(c=>[...(c.items||[]),...(c.fixed||[])].map(x=>x[0])))]);
app.listen(PORT,()=>console.log("http://localhost:"+PORT));
