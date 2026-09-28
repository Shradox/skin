const express=require("express"),session=require("express-session"),fs=require("fs"),path=require("path"),market=require("./market");
const app=express(),PORT=process.env.PORT||3000,FILE=path.join(__dirname,"data.json");
let db=JSON.parse(fs.readFileSync(FILE,"utf8")); const save=()=>fs.writeFileSync(FILE,JSON.stringify(db,null,2));
app.use(express.json());app.use(session({secret:process.env.SESSION_SECRET||"dev",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));app.use(express.static(path.join(__dirname,"public")));
const me=r=>db.users.find(u=>u.id===r.session.uid), auth=(r,s,n)=>me(r)?n():s.status(401).json({error:"auth_required"}), admin=(r,s,n)=>me(r)?.role==="admin"?n():s.status(403).json({error:"admin_required"});
function items(c){return c.items.map(([name,odds,fb])=>({name,odds:db.overrides[`${c.id}:${name}`]??odds,...market.info(name,fb)}))}
const WIN=42,LEN=56,reel=(l,w)=>Array.from({length:LEN},(_,i)=>i===WIN?w:pick(l));
const pool=()=>{const m=new Map();db.cases.forEach(c=>items(c).forEach(x=>m.set(x.name,x)));return[...m.values()]};
function pick(a){let t=a.reduce((s,x)=>s+Math.max(0,x.odds),0),r=Math.random()*t;for(const x of a){r-=Math.max(0,x.odds);if(r<=0)return x}return a.at(-1)}
app.get("/api/state",(r,s)=>{let u=me(r);s.json({user:u?{username:u.username,role:u.role,balance:u.balance,inventory:u.inventory}:null,cases:db.cases.map(c=>({...c,items:items(c)}))})});
app.post("/api/login",(r,s)=>{let u=db.users.find(x=>x.username===r.body.username&&x.password===r.body.password);if(!u)return s.status(401).json({error:"Неверный логин или пароль"});r.session.uid=u.id;s.json({ok:true})});
app.post("/api/logout",(r,s)=>r.session.destroy(()=>s.json({ok:true})));
app.post("/api/cases/:id/open",(r,s)=>auth(r,s,()=>{let u=me(r),c=db.cases.find(x=>x.id==r.params.id);if(!c)return s.status(404).json({error:"case_not_found"});if(u.balance<c.price)return s.status(400).json({error:"Недостаточно демо-баланса"});u.balance-=c.price;let l=items(c),it=pick(l);u.inventory.push({name:it.name,price:it.price,img:it.img,case:c.name,at:Date.now()});save();s.json({item:it,reel:reel(l,it),winIndex:WIN,balance:u.balance})}));
app.post("/api/upgrade",(r,s)=>auth(r,s,()=>{let u=me(r),ix=[...new Set((r.body.indexes||[]).map(Number))].filter(i=>u.inventory[i]);if(!ix.length||ix.length>4)return s.status(400).json({error:"Выберите от 1 до 4 предметов"});
let stake=ix.reduce((t,i)=>t+u.inventory[i].price,0),tg=pool().find(x=>x.name===r.body.target)||market.find(r.body.target);if(!tg||tg.price<=stake)return s.status(400).json({error:"Цель должна быть дороже вложенного"});
let chance=Math.min(.95,Math.max(.01,stake/tg.price)),roll=Math.random(),win=roll<chance;ix.sort((a,b)=>b-a).forEach(i=>u.inventory.splice(i,1));
if(win)u.inventory.push({name:tg.name,price:tg.price,img:tg.img,case:"Апгрейд",at:Date.now()});save();s.json({win,chance,roll,stake,target:tg})}));
app.post("/api/sell",(r,s)=>auth(r,s,()=>{let u=me(r),ix=[...new Set((r.body.indexes||[]).map(Number))].filter(i=>u.inventory[i]).sort((a,b)=>b-a),sum=0;
ix.forEach(i=>{let it=u.inventory[i];sum+=market.info(it.name,it.price).price;u.inventory.splice(i,1)});u.balance+=sum;save();s.json({sold:ix.length,sum,balance:u.balance})}));
app.get("/api/suggest",(r,s)=>auth(r,s,()=>{let st=+r.query.stake,ch=Math.min(95,Math.max(1,+r.query.chance));if(!(st>0))return s.status(400).json({error:"Выберите предметы"});s.json({items:market.near(st/(ch/100),10).filter(x=>x.price>st)})}));
app.get("/api/similar",(r,s)=>auth(r,s,()=>{let it=me(r).inventory[+r.query.index];if(!it)return s.status(404).json({error:"not_found"});s.json({items:market.near(it.price,40,[it.name]).filter(x=>Math.abs(x.price-it.price)<=it.price*.15).slice(0,12)})}));
app.post("/api/swap",(r,s)=>auth(r,s,()=>{let u=me(r),it=u.inventory[+r.body.index],n=market.find(r.body.name);if(!it||!n||n.name===it.name||Math.abs(n.price-it.price)>it.price*.15)return s.status(400).json({error:"Замена недоступна"});
u.inventory[+r.body.index]={name:n.name,price:n.price,img:n.img,case:"Замена",at:Date.now()};save();s.json({ok:true})}));
app.get("/api/admin",admin,(r,s)=>s.json({cases:db.cases.map(c=>({id:c.id,name:c.name,items:items(c)})),audit:db.audit.slice(-50).reverse()}));
app.post("/api/admin/odds",admin,(r,s)=>{let {caseId,name,odds}=r.body,n=+odds,c=db.cases.find(x=>x.id==caseId);if(!c||!c.items.some(x=>x[0]===name)||!Number.isFinite(n)||n<0)return s.status(400).json({error:"bad_data"});db.overrides[`${caseId}:${name}`]=n;db.audit.push({time:new Date().toISOString(),admin:me(r).username,caseId,name,odds:n,mode:"TEST"});save();s.json({ok:true})});
app.post("/api/admin/reset",admin,(r,s)=>{db.overrides={};db.audit.push({time:new Date().toISOString(),admin:me(r).username,action:"reset",mode:"TEST"});save();s.json({ok:true})});
app.get("/api/prices",(r,s)=>s.json(market.status()));
market.init([...new Set(db.cases.flatMap(c=>c.items.map(x=>x[0])))]);
app.listen(PORT,()=>console.log("http://localhost:"+PORT));
