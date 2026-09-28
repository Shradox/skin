const express=require("express"),session=require("express-session"),fs=require("fs"),path=require("path"),market=require("./market");
const app=express(),PORT=process.env.PORT||3000,FILE=path.join(__dirname,"data.json");
let db=JSON.parse(fs.readFileSync(FILE,"utf8")); const save=()=>fs.writeFileSync(FILE,JSON.stringify(db,null,2));
app.use(express.json());app.use(session({secret:process.env.SESSION_SECRET||"dev",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));app.use(express.static(path.join(__dirname,"public")));
const me=r=>db.users.find(u=>u.id===r.session.uid), auth=(r,s,n)=>me(r)?n():s.status(401).json({error:"auth_required"}), admin=(r,s,n)=>me(r)?.role==="admin"?n():s.status(403).json({error:"admin_required"});
const WEAR=/ \((?:Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/,base=n=>n.replace(/StatTrak™ |Souvenir /,"").replace(WEAR,"");
const dist=(g,share,e)=>{let k=g.map(x=>x.price**-e),t=k.reduce((a,b)=>a+b,0);return g.map((x,i)=>({...x,odds:share*100*k[i]/t}))},ev=l=>l.reduce((s,x)=>s+x.odds/100*x.price,0);
function tune(list,c){let P=c.price,W=c.winChance,R=c.rtp??.88,win=list.filter(x=>x.price>=P),lose=list.filter(x=>x.price<P);if(!win.length||!lose.length)return dist(list,1,.5);
 let lo=.2,hi=5,best;for(let i=0;i<30;i++){let e=(lo+hi)/2;best=[...dist(win,W,e),...dist(lose,1-W,1)];ev(best)>R*P?lo=e:hi=e}return best}
function items(c){let st=x=>({odds:0,...market.info(x[0],x[2])}),fx=(c.fixed||[]).map(x=>({name:x[0],...st(x),odds:db.overrides[`${c.id}:${x[0]}`]??x[1]})),l=[];
 if(c.bases){let b=new Set(c.bases);l=market.all(n=>b.has(base(n)))}
 if(l.length)return[...fx,...(c.winChance!=null?tune(l,c):dist(l,Math.max(0,100-fx.reduce((t,x)=>t+x.odds,0))/100,.5))];
 return c.items?c.items.map(x=>({name:x[0],...st(x),odds:db.overrides[`${c.id}:${x[0]}`]??x[1]})):c.bases?[]:fx}
function summary(c){let l=items(c),b=[...l].sort((a,b)=>b.price-a.price).find(x=>x.img),t=l.reduce((s,x)=>s+x.odds,0)||1;return{id:c.id,name:c.name,price:c.price,n:l.length,art:b?.img||null,rtp:l.reduce((s,x)=>s+x.odds/t*x.price,0)/c.price,win:l.filter(x=>x.price>=c.price).reduce((s,x)=>s+x.odds,0)/t}}
const slim=x=>({name:x.name,price:x.price,img:x.img});
const WIN=42,LEN=56,reel=(l,w)=>Array.from({length:LEN},(_,i)=>i===WIN?w:pick(l));
const pool=()=>{const m=new Map();db.cases.forEach(c=>items(c).forEach(x=>m.set(x.name,x)));return[...m.values()]};
function pick(a){let t=a.reduce((s,x)=>s+Math.max(0,x.odds),0),r=Math.random()*t;for(const x of a){r-=Math.max(0,x.odds);if(r<=0)return x}return a.at(-1)}
app.get("/api/state",(r,s)=>{let u=me(r);s.json({user:u?{username:u.username,role:u.role,balance:u.balance,inventory:u.inventory}:null,cases:db.cases.map(summary)})});
app.get("/api/cases/:id",(r,s)=>{let c=db.cases.find(x=>x.id==r.params.id);if(!c)return s.status(404).json({error:"case_not_found"});let l=items(c),t=l.reduce((a,x)=>a+x.odds,0)||1;s.json({...summary(c),items:l.map(x=>({...slim(x),odds:x.odds/t*100,live:x.live})).sort((a,b)=>b.price-a.price).slice(0,120)})});
app.post("/api/login",(r,s)=>{let u=db.users.find(x=>x.username===r.body.username&&x.password===r.body.password);if(!u)return s.status(401).json({error:"Неверный логин или пароль"});r.session.uid=u.id;s.json({ok:true})});
app.post("/api/logout",(r,s)=>r.session.destroy(()=>s.json({ok:true})));
app.post("/api/cases/:id/open",(r,s)=>auth(r,s,()=>{let u=me(r),c=db.cases.find(x=>x.id==r.params.id);if(!c)return s.status(404).json({error:"case_not_found"});let l=items(c);if(!l.length)return s.status(503).json({error:"Каталог маркета ещё загружается, подождите минуту"});if(u.balance<c.price)return s.status(400).json({error:"Недостаточно демо-баланса"});
u.balance-=c.price;let it=pick(l);u.inventory.push({...slim(it),case:c.name,at:Date.now()});save();s.json({item:slim(it),reel:reel(l,it).map(slim),winIndex:WIN,index:u.inventory.length-1,balance:u.balance})}));
app.post("/api/contract",(r,s)=>auth(r,s,()=>{let u=me(r),ix=[...new Set((r.body.indexes||[]).map(Number))].filter(i=>u.inventory[i]);if(ix.length<5||ix.length>10)return s.status(400).json({error:"Нужно от 5 до 10 предметов"});
let st=ix.reduce((t,i)=>t+u.inventory[i].price,0);if(st<1||st>1000)return s.status(400).json({error:"Сумма контракта: от $1 до $1000"});
let want=Math.random()<.35,m=want?Math.min(8,1-Math.log(1-Math.random())*.46):.3+Math.random()*.65;if(want)m=Math.max(1.02,m);let near=market.near(st*m,8);if(!near.length)return s.status(503).json({error:"Каталог маркета ещё загружается"});
let c=near.filter(x=>want?x.price>=st:x.price<st),it=(c.length?c:near)[Math.floor(Math.random()*(c.length||near.length))];
ix.sort((a,b)=>b-a).forEach(i=>u.inventory.splice(i,1));u.inventory.push({...slim(it),case:"Контракт",at:Date.now()});save();s.json({win:it.price>=st,item:slim(it),stake:st,index:u.inventory.length-1,mult:it.price/st})}));
app.post("/api/upgrade",(r,s)=>auth(r,s,()=>{let u=me(r),ix=[...new Set((r.body.indexes||[]).map(Number))].filter(i=>u.inventory[i]);if(!ix.length||ix.length>4)return s.status(400).json({error:"Выберите от 1 до 4 предметов"});
let stake=ix.reduce((t,i)=>t+u.inventory[i].price,0),tg=market.find(r.body.target)||pool().find(x=>x.name===r.body.target);if(!tg||tg.price<=stake)return s.status(400).json({error:"Цель должна быть дороже вложенного"});
let chance=Math.min(.95,Math.max(.01,stake/tg.price)),roll=Math.random(),win=roll<chance;ix.sort((a,b)=>b-a).forEach(i=>u.inventory.splice(i,1));
if(win)u.inventory.push({name:tg.name,price:tg.price,img:tg.img,case:"Апгрейд",at:Date.now()});save();s.json({win,chance,roll,stake,target:tg})}));
app.post("/api/sell",(r,s)=>auth(r,s,()=>{let u=me(r),ix=[...new Set((r.body.indexes||[]).map(Number))].filter(i=>u.inventory[i]).sort((a,b)=>b-a),sum=0;
ix.forEach(i=>{let it=u.inventory[i];sum+=market.info(it.name,it.price).price;u.inventory.splice(i,1)});u.balance+=sum;save();s.json({sold:ix.length,sum,balance:u.balance})}));
app.get("/api/suggest",(r,s)=>auth(r,s,()=>{let st=+r.query.stake,ch=Math.min(95,Math.max(1,+r.query.chance));if(!(st>0))return s.status(400).json({error:"Выберите предметы"});s.json({items:market.near(st/(ch/100),12).filter(x=>x.price>st)})}));
app.get("/api/similar",(r,s)=>auth(r,s,()=>{let it=me(r).inventory[+r.query.index];if(!it)return s.status(404).json({error:"not_found"});s.json({items:market.near(it.price,40,[it.name]).filter(x=>Math.abs(x.price-it.price)<=it.price*.15).slice(0,12)})}));
app.post("/api/swap",(r,s)=>auth(r,s,()=>{let u=me(r),it=u.inventory[+r.body.index],n=market.find(r.body.name);if(!it||!n||n.name===it.name||Math.abs(n.price-it.price)>it.price*.15)return s.status(400).json({error:"Замена недоступна"});
u.inventory[+r.body.index]={name:n.name,price:n.price,img:n.img,case:"Замена",at:Date.now()};save();s.json({ok:true})}));
app.get("/api/admin",admin,(r,s)=>s.json({cases:db.cases.map(c=>({id:c.id,name:c.name,price:c.price,winChance:c.winChance??null,fixed:(c.fixed||[]).map(x=>({name:x[0],odds:db.overrides[`${c.id}:${x[0]}`]??x[1]}))})),audit:db.audit.slice(-50).reverse()}));
app.post("/api/admin/case",admin,(r,s)=>{let c=db.cases.find(x=>x.id==r.body.id),n=String(r.body.name||"").trim().slice(0,40),p=+r.body.price,w=r.body.winChance;if(!c||!n||!(p>=.01&&p<=1e6))return s.status(400).json({error:"Неверные данные"});
 c.name=n;c.price=p;if(c.winChance!=null&&w!=null&&w!==""){c.winChance=Math.min(.9,Math.max(.01,+w/100))}db.audit.push({time:new Date().toISOString(),admin:me(r).username,caseId:c.id,name:n,price:p,winChance:c.winChance,mode:"TEST"});save();s.json({ok:true})});
app.post("/api/admin/odds",admin,(r,s)=>{let {caseId,name,odds}=r.body,n=+odds,c=db.cases.find(x=>x.id==caseId);if(!c||!(c.fixed||c.items||[]).some(x=>x[0]===name)||!Number.isFinite(n)||n<0)return s.status(400).json({error:"bad_data"});db.overrides[`${caseId}:${name}`]=n;db.audit.push({time:new Date().toISOString(),admin:me(r).username,caseId,name,odds:n,mode:"TEST"});save();s.json({ok:true})});
app.post("/api/admin/reset",admin,(r,s)=>{db.overrides={};db.audit.push({time:new Date().toISOString(),admin:me(r).username,action:"reset",mode:"TEST"});save();s.json({ok:true})});
app.get("/api/prices",(r,s)=>s.json(market.status()));
market.init([...new Set(db.cases.flatMap(c=>[...(c.items||[]),...(c.fixed||[])].map(x=>x[0])))]);
app.listen(PORT,()=>console.log("http://localhost:"+PORT));
