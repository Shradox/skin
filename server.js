const express=require("express"),session=require("express-session"),fs=require("fs"),path=require("path");
const app=express(),PORT=process.env.PORT||3000,FILE=path.join(__dirname,"data.json");
let db=JSON.parse(fs.readFileSync(FILE,"utf8")); const save=()=>fs.writeFileSync(FILE,JSON.stringify(db,null,2));
app.use(express.json());app.use(session({secret:process.env.SESSION_SECRET||"dev",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));app.use(express.static(path.join(__dirname,"public")));
const me=r=>db.users.find(u=>u.id===r.session.uid), auth=(r,s,n)=>me(r)?n():s.status(401).json({error:"auth_required"}), admin=(r,s,n)=>me(r)?.role==="admin"?n():s.status(403).json({error:"admin_required"});
function items(c){return c.items.map(([name,odds,price])=>({name,odds:db.overrides[`${c.id}:${name}`]??odds,price}))}
function pick(a){let t=a.reduce((s,x)=>s+Math.max(0,x.odds),0),r=Math.random()*t;for(const x of a){r-=Math.max(0,x.odds);if(r<=0)return x}return a.at(-1)}
app.get("/api/state",(r,s)=>{let u=me(r);s.json({user:u?{username:u.username,role:u.role,balance:u.balance,inventory:u.inventory}:null,cases:db.cases.map(c=>({...c,items:items(c)}))})});
app.post("/api/login",(r,s)=>{let u=db.users.find(x=>x.username===r.body.username&&x.password===r.body.password);if(!u)return s.status(401).json({error:"Неверный логин или пароль"});r.session.uid=u.id;s.json({ok:true})});
app.post("/api/logout",(r,s)=>r.session.destroy(()=>s.json({ok:true})));
app.post("/api/cases/:id/open",(r,s)=>auth(r,s,()=>{let u=me(r),c=db.cases.find(x=>x.id==r.params.id);if(!c)return s.status(404).json({error:"case_not_found"});if(u.balance<c.price)return s.status(400).json({error:"Недостаточно демо-баланса"});u.balance-=c.price;let it=pick(items(c));u.inventory.push({name:it.name,price:it.price,case:c.name,at:Date.now()});save();s.json({item:it,balance:u.balance})}));
app.post("/api/upgrade",(r,s)=>auth(r,s,()=>{let u=me(r),i=+r.body.index,target=+r.body.target,it=u.inventory[i];if(!it||!target||target<=it.price)return s.status(400).json({error:"Некорректная цель"});let chance=Math.min(.95,it.price/target),win=Math.random()<chance;if(win)u.inventory[i]={...it,name:"UPGRADE → $"+target.toFixed(2),price:target};else u.inventory.splice(i,1);save();s.json({win,chance,inventory:u.inventory})}));
app.get("/api/admin",admin,(r,s)=>s.json({cases:db.cases.map(c=>({id:c.id,name:c.name,items:items(c)})),audit:db.audit.slice(-50).reverse()}));
app.post("/api/admin/odds",admin,(r,s)=>{let {caseId,name,odds}=r.body,n=+odds,c=db.cases.find(x=>x.id==caseId);if(!c||!c.items.some(x=>x[0]===name)||!Number.isFinite(n)||n<0)return s.status(400).json({error:"bad_data"});db.overrides[`${caseId}:${name}`]=n;db.audit.push({time:new Date().toISOString(),admin:me(r).username,caseId,name,odds:n,mode:"TEST"});save();s.json({ok:true})});
app.post("/api/admin/reset",admin,(r,s)=>{db.overrides={};db.audit.push({time:new Date().toISOString(),admin:me(r).username,action:"reset",mode:"TEST"});save();s.json({ok:true})});
app.get("/api/prices",(r,s)=>s.json({provider:process.env.PRICE_SOURCE_URL?"external":"demo",items:[],note:"Configure a legitimate JSON/API price feed; Yandex yabs count URLs are tracking links, not price APIs."}));
app.listen(PORT,()=>console.log("http://localhost:"+PORT));
