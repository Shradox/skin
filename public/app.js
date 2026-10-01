let S,sel=[],csel=[],tg=null,sug=null,mult=null,busy=false;const $=x=>document.querySelector(x),money=x=>"$"+(+x).toFixed(2),esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const tier=p=>p>=100?"gold":p>=25?"red":p>=8?"pink":p>=2?"purple":p>=.5?"blue":"gray";
const PH="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><text x="50" y="40" font-size="32" text-anchor="middle" fill="#ffffff33">★</text></svg>');
const img=x=>`<img src="${x.img||PH}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PH}'">`;
const nm=n=>{let m=n.match(/^(.*) \(([^)]+)\)$/);return m?`<b>${m[1]}</b><small>${m[2]}</small>`:`<b>${n}</b>`};
const CAR_SVG=`<svg viewBox="0 0 140 64" xmlns="http://www.w3.org/2000/svg">
 <ellipse cx="70" cy="59" rx="56" ry="3.5" fill="#000" opacity=".3"/>
 <path d="M10 46 Q8 30 22 26 L34 26 Q40 14 54 12 L92 12 Q104 12 110 22 L124 26 Q134 28 134 38 L134 46 Z" fill="#e7e9ee"/>
 <path d="M40 26 Q46 16 56 15 L88 15 Q98 15 104 24 L108 26 Z" fill="#20242f"/>
 <path d="M46 25 Q50 18 57 17 L69 17 L69 25 Z" fill="#8fd7ff"/>
 <path d="M72 25 L72 17 L87 17 Q96 17 101 25 Z" fill="#8fd7ff"/>
 <rect x="119" y="29" width="9" height="5" rx="2" fill="#fde68a"/>
 <path d="M12 41 L133 41" stroke="var(--a)" stroke-width="3"/>
 <g class="wheel"><circle cx="36" cy="48" r="11" fill="#14161c"/><circle cx="36" cy="48" r="4.5" fill="#9aa0ad"/></g>
 <g class="wheel"><circle cx="107" cy="48" r="11" fill="#14161c"/><circle cx="107" cy="48" r="4.5" fill="#9aa0ad"/></g>
</svg>`;
function spawnPuff(car,black){let p=document.createElement("div");p.className="puff"+(black?" bk":"");let dx=(Math.random()*34-10).toFixed(0);p.style.cssText=`left:${58+Math.random()*10}px;top:2px;--dx:${dx}px`;car.appendChild(p);setTimeout(()=>p.remove(),1100)}
const WIN_TXT="РТП заработало? Да нет просто повезло))",LOSE_TXT="Додеп Дмитриж!!";
// ---- Звуки (синтез через Web Audio API, свои оригинальные эффекты — без чужих аудиофайлов) ----
let SND=(()=>{try{return localStorage.getItem("snd")!=="0"}catch{return true}})(),AC=null;
function ac(){if(!SND)return null;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume();return AC}catch{return null}}
function tone(f,t0,d,type,vol,f2,dest){const c=ac();if(!c)return;const o=c.createOscillator(),g=c.createGain(),n=c.currentTime+t0;o.type=type||"sine";o.frequency.setValueAtTime(f,n);if(f2)o.frequency.exponentialRampToValueAtTime(f2,n+d);g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(vol||.06,n+.01);g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g);g.connect(dest||c.destination);o.start(n);o.stop(n+d+.05)}
function noise(t0,d,vol,f0,f1,dest){const c=ac();if(!c)return;const len=Math.max(1,c.sampleRate*d|0),buf=c.createBuffer(1,len,c.sampleRate),a=buf.getChannelData(0);for(let i=0;i<len;i++)a[i]=Math.random()*2-1;const sr=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),n=c.currentTime+t0;sr.buffer=buf;f.type="bandpass";f.Q.value=1.2;f.frequency.setValueAtTime(f0,n);f.frequency.exponentialRampToValueAtTime(f1,n+d);g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(vol||.05,n+d*.15);g.gain.exponentialRampToValueAtTime(.0001,n+d);sr.connect(f);f.connect(g);g.connect(dest||c.destination);sr.start(n)}
const SFX={
 reel(T){const c=ac();if(!c)return()=>{};const rg=c.createGain();rg.connect(c.destination);noise(0,T,.035,300,2200,rg);for(let i=1;i<=32;i++){const t=T*(1-Math.pow(1-i/32,1/3));tone(i%2?900:760,t,.035,"square",.025,null,rg)}
  return()=>{try{rg.gain.cancelScheduledValues(0);rg.gain.setValueAtTime(0,c.currentTime);setTimeout(()=>rg.disconnect(),60)}catch{}}},
 flip(){noise(0,.16,.045,600,3000);tone(280,0,.12,"triangle",.04,520)},
 reveal(t){const N={gray:[523],blue:[523,659],purple:[523,659,784],pink:[523,659,784,988],red:[392,523,659,784,1047],gold:[392,523,659,784,1047,1319]}[t]||[523];N.forEach((f,i)=>tone(f,i*.09,.35,"triangle",.07));if(t==="gold"||t==="red"){tone(110,0,.9,"sawtooth",.05,55);noise(0,.7,.05,400,5000)}},
 sell(){tone(1480,0,.08,"square",.04);tone(1976,.07,.16,"square",.04)},
 win(){[523,659,784,1047].forEach((f,i)=>tone(f,i*.1,.3,"triangle",.07));tone(1568,.4,.5,"triangle",.06)},
 lose(){tone(330,0,.25,"sawtooth",.05,165);tone(220,.22,.45,"sawtooth",.05,110)},
 engine(T){noise(0,T,.03,100,900);tone(70,0,T,"sawtooth",.025,160)}
};
function toggleSnd(){SND=!SND;try{localStorage.setItem("snd",SND?"1":"0")}catch{}document.querySelectorAll(".sndIco").forEach(e=>e.textContent=SND?"🔊":"🔇");if(SND){ac();SFX.sell()}}
document.addEventListener("pointerdown",()=>{ac()},{passive:true});
setTimeout(()=>document.querySelectorAll(".sndIco").forEach(e=>e.textContent=SND?"🔊":"🔇"),0);

const API_BASE=(()=>{try{
  if(window.location.protocol==="file:") return "http://localhost:3000";
  return "";
}catch{return ""}})();
async function api(u,o={}){let url=API_BASE+u;try{let r=await fetch(url,{credentials:"same-origin",headers:{"Content-Type":"application/json",...(o.headers||{})},...o}),ct=r.headers.get("content-type")||"",d=ct.includes("application/json")?await r.json():{error:await r.text()};if(!r.ok){
  if(r.status===401){S={...(S||{}),user:null};throw Error("Сессия пользователя не найдена. Войдите в аккаунт заново.");}
  throw Error(d.error||"Ошибка сервера");
}
return d}catch(e){if(e instanceof TypeError)throw Error("Не удалось подключиться к серверу. Запустите сайт через npm start и откройте http://localhost:3000");throw e}}
const post=(u,b)=>api(u,{method:"POST",body:JSON.stringify(b||{})});
const modal=h=>{$("#modal").hidden=false;$("#m").innerHTML=h};function closeM(){if(!busy)$("#modal").hidden=true}
const PAGES=["cases","upgrade","contracts","leaderboard","inventory","bonus","referral","battle","fair","admin","profile","casepage"];
function route(){let h=location.hash.slice(1),p=h;
 if(h.startsWith("case-")){p="casepage";if(S)loadCasePage(+h.slice(5))}
 else if(h.startsWith("user-")){p="profile";loadProfile(decodeURIComponent(h.slice(5)))}
 else if(p==="profile"){if(!S?.user){location.hash="cases";return}loadProfile()}
 if(!PAGES.includes(p)||(p==="admin"&&S?.user?.role!=="admin"))p="cases";
 document.querySelectorAll(".page").forEach(e=>e.classList.toggle("on",e.id===p));
 document.querySelectorAll("nav a,.sideLink").forEach(a=>a.classList.toggle("on",a.hash==="#"+p));window.scrollTo(0,0)}
function toggleMenu(){$("#sidebar").classList.toggle("open");$("#sideBackdrop").classList.toggle("show")}
function closeMenu(){$("#sidebar").classList.remove("open");$("#sideBackdrop").classList.remove("show")}
document.querySelectorAll(".sideLink").forEach(a=>a.addEventListener("click",closeMenu));
let CFG={steamEnabled:false};
let REF="";try{REF=(new URL(window.location.href)).searchParams.get("ref")||""}catch{};if(/^[A-Z0-9_-]{4,64}$/i.test(REF)){try{localStorage.setItem("ref",REF)}catch{}} async function load(){[S,CFG]=await Promise.all([api("/api/state"),api("/api/config").catch(()=>CFG)]);document.documentElement.style.setProperty("--a",CFG.appearance?.accent||"#8b5cf6"); document.title=CFG.appearance?.siteName||"DmitrashDrop"; $("#bal").textContent=S.user?money(S.user.balance):"$0.00";$("#login").textContent=S.user?"Выйти":"Войти";
 $("#who").innerHTML=S.user?`<span class="who" onclick="location.hash='profile'" style=cursor:pointer>${S.user.avatar?`<img class=ava src="${S.user.avatar}">`:`<b class=ava>${esc(S.user.username[0].toUpperCase())}</b>`}${esc(S.user.username)}</span>`:"";
 $("#depositBtn").hidden=!S.user;$("#bell").hidden=!S.user;
 let bc=$("#bellcount");if(S.user?.unread){bc.hidden=false;bc.textContent=S.user.unread}else bc.hidden=true;
 $("#adminlink").hidden=S.user?.role!=="admin";draw();route();if(S.user?.role==="admin")admin();if(S.user)pollNotifs()}
async function loadStats(){try{let d=await api("/api/stats");$("#statbar").innerHTML=[["Кейсов",d.cases],["Игроков",d.users],["Открытий",d.opens],["Апгрейдов",d.upgrades]].map(([l,v])=>`<div><b>${v}</b><span>${l}</span></div>`).join("")}catch{}}
let tickSeen=new Set();
const avaH=(u,cls)=>u.avatar?`<img class="${cls}" src="${esc(u.avatar)}" alt="" data-user="${esc(u.username)}" title="${esc(u.username)}">`:`<b class="${cls}" data-user="${esc(u.username)}" title="${esc(u.username)}">${esc(u.username[0].toUpperCase())}</b>`;
function goUser(n){location.hash="user-"+encodeURIComponent(n)}
document.addEventListener("click",e=>{let t=e.target.closest("[data-user]");if(t){e.preventDefault();goUser(t.dataset.user)}});
async function loadTicker(){try{let d=await api("/api/feed?limit=25"),fresh=d.items.filter(x=>!tickSeen.has(x.ts));fresh.forEach(x=>tickSeen.add(x.ts));
 $("#tickTrack").innerHTML=d.items.map(x=>`<div class="tk ${tier(x.price)} ${fresh.includes(x)?"tknew":""}">${avaH(x,"tkAva")}<img src="${x.img||PH}" onerror="this.src='${PH}'"><span>${nm(x.name)}</span><em>${money(x.price)}</em></div>`).join("")||`<div class=tk-empty>Пока пусто — откройте первый кейс.</div>`;
 const sl=$("#sideLive");if(sl)sl.innerHTML=d.items.slice(0,6).map(x=>`<div class=feedItem>${avaH(x,"tkAva")}<div><b>${esc(x.name)}</b><small data-user="${esc(x.username)}" style="cursor:pointer">${esc(x.username)}</small></div><em>${money(x.price)}</em></div>`).join("")||'<p class="muted">Пока пусто.</p>';
 const rd=$("#recentDropTrack");if(rd)rd.innerHTML=d.items.slice(0,8).map(x=>`<div class=recentItem><img src="${x.img||PH}" onerror="this.src='${PH}'"><div><b>${esc(x.name)}</b><em>${money(x.price)}</em></div></div>`).join("")}catch{}}
let lbPeriod="day";
async function loadLB(){try{let d=await api("/api/leaderboard?period="+lbPeriod);$("#lb").innerHTML=d.rows.length?`<div class=lbrows>${d.rows.map((u,i)=>`<div class="lbrow ${i<3?"top"+(i+1):""}"><span class=rk>#${i+1}</span>${u.avatar?`<img class=ava src="${u.avatar}">`:`<b class=ava>${esc(u.username[0].toUpperCase())}</b>`}<span class=un data-user="${esc(u.username)}" style="cursor:pointer">${esc(u.username)}</span><b>${money(u.wagered)}</b></div>`).join("")}</div>`:"<span class=muted>Пока нет активности за этот период.</span>"; const side=$("#sideLb"); if(side) side.innerHTML=d.rows.slice(0,5).map((u,i)=>`<div class="winner"><span class="rank">${i+1}</span>${u.avatar?`<img src="${u.avatar}">`:`<b class="ava">${u.username[0].toUpperCase()}</b>`}<b data-user="${esc(u.username)}" style="cursor:pointer">${esc(u.username)}</b><strong>${money(u.wagered)}</strong></div>`).join("")||'<p class="muted">Пока пусто.</p>'}catch{}}
$("#lbtabs")?.addEventListener("click",e=>{let b=e.target.closest("button");if(!b)return;lbPeriod=b.dataset.p;document.querySelectorAll("#lbtabs .chip").forEach(x=>x.classList.toggle("on",x===b));loadLB()});
setInterval(loadTicker,5000);setInterval(loadStats,15000);setInterval(()=>{if(location.hash==="#leaderboard")loadLB()},7000);
let notifSeen=new Set(),notifTimer=null;
function toast(text,type){let e=document.createElement("div");e.className="toast "+(type||"info");e.textContent=text;document.body.appendChild(e);requestAnimationFrame(()=>e.classList.add("show"));setTimeout(()=>{e.classList.remove("show");setTimeout(()=>e.remove(),300)},5000)}
async function pollNotifs(){if(!S?.user)return;try{let d=await api("/api/notifications");let bc=$("#bellcount");if(d.unread){bc.hidden=false;bc.textContent=d.unread}else bc.hidden=true;
 d.items.filter(x=>!x.read&&!notifSeen.has(x.id)).reverse().forEach(x=>{notifSeen.add(x.id);toast((x.type==="deposit"?"💰 ":"📦 ")+x.text,x.type==="deposit"?"ok":"info")});
 d.items.forEach(x=>notifSeen.add(x.id))}catch{}}
if(!notifTimer)notifTimer=setInterval(pollNotifs,5000);
async function openNotifs(){let d=await api("/api/notifications").catch(()=>({items:[]}));
 modal(`<h2>Уведомления</h2>${d.items.length?`<div class=plist>${d.items.map(x=>`<div class="prow notifrow ${x.read?"":"unread"}"><span>${x.type==="deposit"?"💰":"📦"}</span><span>${x.text}</span><em>${new Date(x.ts).toLocaleTimeString()}</em></div>`).join("")}</div>`:"<span class=muted>Пока пусто.</span>"}`);
 post("/api/notifications/read").then(()=>{load()})}
const COIN_ICON={BTC:["#f7931a","₿"],ETH:["#627eea","Ξ"],USDT:["#26a17b","₮"],LTC:["#bfbbbb","Ł"],TON:["#0088cc","T"]};
async function openDeposit(){let coins=await api("/api/coins").catch(()=>[]);
 modal(`<h2>Пополнить баланс</h2><p class=muted>Демо-режим: адреса ниже сгенерированы случайно и не отслеживаются — реальные переводы на них будут потеряны безвозвратно. Зачисление происходит только по кнопке «Я оплатил» ниже.</p><div class=coinlist>${coins.map(c=>{let[col,sym]=COIN_ICON[c.code]||["#888","?"];return `<div class=coin onclick="pickCoin('${c.code}','${esc(c.name)}')"><span class=coinicon style="background:${col}">${sym}</span><b>${c.code}</b><small>${c.name}</small></div>`}).join("")}</div>`)}
async function pickCoin(code,name){modal("<p class=muted>Генерируем адрес…</p>");let d;try{d=await post("/api/deposit/create",{coin:code})}catch(e){return alert(e.message)}
 let[col,sym]=COIN_ICON[code]||["#888","?"];
 modal(`<h2><span class=coinicon style="background:${col}">${sym}</span> Пополнение · ${name}</h2><p class="muted warnbox">⚠ ДЕМО: этот адрес нерабочий и никем не отслеживается. Не отправляйте сюда реальные средства — они будут потеряны без возврата.</p>
 <div class=addrbox><code id=addr>${d.address}</code><button class=save onclick="navigator.clipboard.writeText('${d.address}');this.textContent='Скопировано'">Копировать</button></div>
 <p class=muted style="margin-top:14px">Введите сумму — для демонстрации баланс зачислится сразу по кнопке ниже (сети/блокчейн не проверяются).</p>
 <input id=depAmt type=number min=1 max=5000 placeholder="Сумма в $ (1–5000)" style="padding:12px;width:100%;margin:8px 0"><input id=promo type=text placeholder="Промокод или реферальный код друга" style="padding:12px;width:100%;margin:0 0 8px">
 <button onclick="confirmDeposit('${code}')">Я оплатил (демо)</button>`)}
async function confirmDeposit(code){let amt=+$("#depAmt").value;if(!amt)return alert("Введите сумму");
 modal("<p class=muted>Проверяем сеть…</p>");
 setTimeout(async()=>{try{let d=await post("/api/deposit/confirm",{coin:code,amount:amt,promo:$("#promo")?.value||""});closeM();boom("#22c55e",40);SFX.sell();toast(`💰 Зачислено ${money(d.amount+(d.bonus||0))}`+(d.refAttached?` · код друга ${d.refAttached} засчитан`:""),"ok");load()}catch(e){alert(e.message)}},1800)}
const inv=()=>S.user?.inventory||[];
let curCat="Все";
function setCat(c){curCat=c;draw()}
function draw(){let q=$("#q").value.toLowerCase();
 let cats=["Все",...new Set(S.cases.map(c=>c.category||"Общее"))];if(!cats.includes(curCat))curCat="Все";
 $("#catTabs").innerHTML=cats.length>2?cats.map(c=>`<button class="chip ${c===curCat?"on":""}" data-c="${esc(c)}" onclick="setCat(this.dataset.c)">${esc(c)}</button>`).join(""):"";
 $("#casesGrid").innerHTML=S.cases.filter(c=>(curCat==="Все"||(c.category||"Общее")===curCat)&&c.name.toLowerCase().includes(q)).map(c=>`<article class=card><div class="art caseart" onclick="location.hash='case-${c.id}'" style=cursor:pointer><img src="${c.art}" alt=""></div><div class=name onclick="location.hash='case-${c.id}'" style=cursor:pointer>${c.name}</div><div class=meta><span>${c.n} предм. · окуп ${(c.win*100).toFixed(0)}%</span><b>${money(c.price)}</b></div><div class=acts><button class=open onclick="openCase(${c.id})" ${c.n?"":"disabled"}>Открыть</button><button class=save title="Без анимации" onclick="openCase(${c.id},true)" ${c.n?"":"disabled"}>⚡ Быстро</button></div><a class=lnk href="#case-${c.id}">Страница кейса →</a></article>`).join("");
 let l=inv();$("#invsum").textContent=l.length?`· ${l.length} шт · ${money(l.reduce((t,x)=>t+x.price,0))}`:"";
 $("#invgrid").innerHTML=invCardsHTML(l);
 sel=sel.filter(i=>l[i]);csel=csel.filter(i=>l[i]);renderUp();renderCt()}
function invCardsHTML(l){return l.length?l.map((x,i)=>`<div class="item ${tier(x.price)}"><div class=art>${img(x)}</div><div class=name>${nm(x.name)}</div><div class=price>${money(x.price)}</div><div class="acts itemActs"><button class=btnGreen onclick="sell(${i})"><i>$</i>Продать</button><button class=btnGhost onclick="swap(${i})"><i>⇄</i>Заменить</button></div><div class="acts itemActs"><button class=btnViolet onclick="toUp(${i})"><i>⚡</i>Апгрейд</button><button class=btnRed onclick="withdraw(${i})"><i>↗</i>Вывести</button></div></div>`).join(""):"<span class=muted>Пусто. Откройте кейс на странице «Кейсы».</span>"}
async function withdraw(i){let it=inv()[i];if(!it)return;if(!confirm(`Вывести ${it.name} (${money(it.price)}) — демо-трейд в Steam?`))return;
 try{await post("/api/withdraw",{index:i})}catch(e){return alert(e.message)}
 sel=[];csel=[];load();setTimeout(()=>{toast("📦 Трейд отправлен: "+it.name,"info");pollNotifs()},4500+Math.random()*2500)}
async function sell(i){await post("/api/sell",{indexes:[i]});SFX.sell();sel=[];csel=[];boom("#22c55e",20);load()}
async function sellAll(){let n=inv().length;if(!n||!confirm(`Продать все предметы (${n}) по рыночной цене?`))return;await post("/api/sell",{indexes:inv().map((_,i)=>i)});sel=[];csel=[];boom("#22c55e",40);load()}
async function sellOne(i){try{let d=await post("/api/sell",{indexes:[i]});SFX.sell();closeM();boom("#22c55e",40);load()}catch(e){alert(e.message)}}
async function toUp(i){closeM();await load();sel=[i];tg=null;sug=null;mult=null;location.hash="upgrade";renderUp()}
async function swap(i){let x=inv()[i];modal(`<h2>Замена</h2><p class=muted>${x.name} · ${money(x.price)}. Аналоги ±15% по цене:</p><div id=sw class=plist>Загрузка…</div>`);
 try{let d=await api("/api/similar?index="+i);$("#sw").innerHTML=d.items.length?d.items.map(y=>`<div class="prow ${tier(y.price)}" style=cursor:pointer data-n="${esc(y.name)}" onclick="doSwap(${i},this.dataset.n)">${img(y)}<span>${nm(y.name)}</span><em></em><strong>${money(y.price)}</strong></div>`).join(""):"<span class=muted>Аналогов пока нет (каталог маркета ещё грузится).</span>"}catch(e){$("#sw").textContent=e.message}}
async function doSwap(i,n){try{await post("/api/swap",{index:i,name:n});closeM();boom("#9d5cff",25);load()}catch(e){alert(e.message)}}
function boom(c="#fbbf24",n=50){for(let k=0;k<n;k++){let e=document.createElement("i");e.className="cf";e.style.cssText=`--x:${(Math.random()-.5)*700}px;--y:${-200-Math.random()*400}px;--r:${Math.random()*720}deg;left:50%;top:60%;background:${k%3?c:"#fff"};animation-delay:${Math.random()*.15}s`;document.body.appendChild(e);setTimeout(()=>e.remove(),1800)}}
function flash(c){let e=document.createElement("div");e.className="flash";e.style.background=c;document.body.appendChild(e);setTimeout(()=>e.remove(),900)}
let fastOpen=false,openN=1,cpCase=null;
async function loadCasePage(id){$("#cpHead").innerHTML="<p class=muted>Загрузка…</p>";$("#cpItems").innerHTML="";
 let c;try{c=await api("/api/cases/"+id)}catch(e){$("#cpHead").innerHTML=`<p class=muted>${e.message}</p>`;return}
 cpCase=c;renderCaseHead();
 $("#cpItems").innerHTML=`<h3>Что внутри · ${c.n} предметов</h3><div class=plist>${c.items.map(x=>`<div class="prow ${tier(x.price)} ${x.price>=c.price?"okp":""}">${img(x)}<span>${nm(x.name)}</span><em>${x.odds<.01?"<0.01":x.odds.toFixed(2)}%</em><strong>${money(x.price)}</strong></div>`).join("")}</div>`}
function renderCaseHead(){let c=cpCase,total=c.price*openN;
 $("#cpHead").innerHTML=`<div class=cphero><div class="art caseart cpart"><img src="${c.art}" alt=""></div><div><h1>${c.name}</h1><p class=muted>Окуп: ${(c.win*100).toFixed(0)}% · средняя отдача ${(c.rtp*100).toFixed(0)}% · ${c.n} предметов</p>
 <label class=toggle><input type=checkbox id=fastToggle ${fastOpen?"checked":""} onchange="fastOpen=this.checked"><span class=slider></span>Быстрое открытие (без анимации)</label>
 <div class=chips>Кейсов за раз: ${[1,2,3,4,5].map(n=>`<button class="chip ${openN===n?"on":""}" onclick="setOpenN(${n})">${n}</button>`).join("")}</div>
 <button id=cpgo class=go onclick="openCase(${c.id},fastOpen,openN)" ${c.n?"":"disabled"}>Открыть ${openN>1?openN+" кейса":""} за ${money(total)}</button></div></div>`}
function setOpenN(n){openN=n;renderCaseHead()}
function prize(it,index,title,verdict){if(verdict===false)SFX.lose();else{SFX.reveal(tier(it.price));if(verdict===true)setTimeout(SFX.win,350)}let d=verdict===undefined?"":`<p class="verdict ${verdict?"okk":"bad"}">${verdict?WIN_TXT:LOSE_TXT}</p>`;
 modal(`<h2>${title}</h2>${d}<div class="prize ${tier(it.price)}">${img(it)}</div><h3>${nm(it.name)}</h3><p class=price>${money(it.price)}</p>
 <div class="acts prizeActs">
  <button class=btnGreen onclick="sellOne(${index})"><i>$</i>Продать за ${money(it.price)}</button>
  <button class=btnViolet onclick="toUp(${index})"><i>⚡</i>В апгрейд</button>
  <button class=btnGhost onclick="closeM();load()"><i>✓</i>Забрать</button>
  <button class=btnGold onclick="closeM();load();location.hash='cases'"><i>↻</i>Ещё кейс</button>
 </div>
 <p class="muted fairNote">Результат защищён fair-roll. Проверить можно в разделе «Fair».</p>`);boom(getComputedStyle($(".prize")).getPropertyValue("--r")||"#fbbf24",40)}
async function openCase(id,fast,count){if(!S.user)return login();if(busy)return;let c=S.cases.find(x=>x.id==id)||(cpCase?.id==id?cpCase:null);busy=true;let d,n=count||1,useFast=!!fast;
 try{d=await post(`/api/cases/${id}/open`,{count:n})}catch(e){busy=false;return alert(e.message)}
 $("#bal").textContent=money(d.balance);
 if(n>1){busy=false;return multiPrize(d.items,d.startIndex,c?.name||"Кейс",!useFast)}
 if(useFast){busy=false;return prize(d.items[0],d.startIndex,"Быстрое открытие")}
 modal(`<h2>${c?.name||""}</h2><div class=reelwrap><div class=marker></div><div class=track id=track>${d.reel.map(x=>`<div class="rc ${tier(x.price)}">${img(x)}<span>${nm(x.name)}</span></div>`).join("")}</div></div><button class=save onclick="skip()">Пропустить</button>`);
 const tr=$("#track"),card=tr.children[d.winIndex];let done=false,stopReel=()=>{};window.skip=()=>{stopReel();tr.style.transition="none";fin()};
 const fin=()=>{if(done)return;done=true;busy=false;card.classList.add("win");flash("#fbbf2455");setTimeout(()=>prize(d.items[0],d.startIndex,"Вы выиграли"),700)};
 setTimeout(()=>{if(done)return;const to=card.offsetLeft+card.offsetWidth*(.12+Math.random()*.76)-tr.parentElement.clientWidth/2;
  stopReel=SFX.reel(6.5);tr.style.transition="transform 6.5s cubic-bezier(.08,.7,.12,1)";tr.style.transform=`translateX(${-to}px)`;tr.addEventListener("transitionend",fin,{once:true});setTimeout(fin,7200)},60)}
function multiPrize(items,startIndex,caseName,animate){let total=items.reduce((t,x)=>t+x.price,0);
 let cards=items.map((x,k)=>`<div class="flipcard" id=fc${k}><div class=fcInner><div class=fcBack>?</div><div class="fcFront ${tier(x.price)}">${img(x)}<b>${nm(x.name)}</b><em>${money(x.price)}</em></div></div></div>`).join("");
 modal(`<h2>${caseName} · ${items.length} шт</h2><p class=muted>Итого выигрыша: ${money(total)}</p><div class="grid mpgrid">${cards}</div><div class="acts prizeActs" id=mpActs${animate?" style=visibility:hidden":""}><button class=btnGhost onclick="closeM();load()"><i>✓</i>Забрать всё</button><button class=btnGreen onclick="sellRange(${startIndex},${items.length})"><i>$</i>Продать всё за ${money(total)}</button></div>`);
 const bestT=tier(Math.max(...items.map(x=>x.price)));
 if(!animate){SFX.reveal(bestT);boom("#fbbf24",50);return}
 items.forEach((x,k)=>setTimeout(()=>{let el=$("#fc"+k);if(!el)return;el.classList.add("flip");SFX.flip();
  if(k===items.length-1)setTimeout(()=>{let a=$("#mpActs");if(a)a.style.visibility="visible";SFX.reveal(bestT);boom("#fbbf24",40)},650)},220*k+250))}
async function sellRange(start,n){let ix=Array.from({length:n},(_,i)=>start+i);try{await post("/api/sell",{indexes:ix});SFX.sell()}catch(e){return alert(e.message)}closeM();boom("#22c55e",30);load()}
function pickList(l,chosen,fn,max){return `<div class=pick>${l.map((x,i)=>`<div class="pk ${tier(x.price)} ${chosen.includes(i)?"on":""}" onclick="${fn}(${i})">${img(x)}<span>${nm(x.name)}</span><em>${money(x.price)}</em></div>`).join("")||"<span class=muted>Нет предметов — откройте кейс.</span>"}</div>`}
function renderCt(){let l=inv(),st=csel.reduce((t,i)=>t+l[i].price,0),ok=csel.length>=5&&csel.length<=10&&st>=1&&st<=100000;
 $("#ct").innerHTML=`<p class=muted>Положите от 5 до 10 предметов на сумму $1–$100 000 — получите 1 случайный скин. ~35% — окуп (в среднем ×1.5, до ×8), ~65% — слив (×0.3–×0.95). Средняя отдача ≈ 90%.</p><div class=cbar><b>${csel.length}/10 · ${money(st)}</b><button id=cgo onclick=signContract() ${ok?"":"disabled"}>Подписать контракт</button></div>${pickList(l,csel,"pickC")}`}
const pickC=i=>{if(!busy){csel=csel.includes(i)?csel.filter(x=>x!==i):csel.length<10?[...csel,i]:csel;renderCt()}};
async function signContract(){if(busy)return;busy=true;let l=inv(),imgs=csel.map(i=>l[i]);let d;
 try{d=await post("/api/contract",{indexes:csel})}catch(e){busy=false;return alert(e.message)}
 modal(`<h2>Контракт · ${money(d.stake)}</h2><div class="prize spinning" id=slot></div><p class=muted>Крутим…</p>`);let k=0,t=setInterval(()=>{$("#slot").innerHTML=img(imgs[k++%imgs.length]);$("#slot").style.setProperty("--r",["#4b8bff","#9d5cff","#e04bd6","#ef4444","#f5b400"][k%5])},90);
 setTimeout(()=>{clearInterval(t);busy=false;csel=[];flash(d.win?"#22c55e55":"#ef444466");prize(d.item,d.index,`Контракт ×${d.mult.toFixed(2)}`,d.win)},3200)}
function renderUp(){let l=inv(),stake=sel.reduce((t,i)=>t+l[i].price,0),t=tg&&(sug||[]).find(x=>x.name===tg),ch=stake&&t?Math.min(.95,Math.max(.01,stake/t.price)):0;
 $("#up").innerHTML=`<div class=upg><div><h3>Ваши предметы (до 4) · ${money(stake)}</h3>${pickList(l,sel,"pickMine")}</div>
 <div class=racebox><div class=chancebadge id=wc>${ch?"Шанс "+(ch*100).toFixed(1)+"%":"—"}</div><div class=race id=race><div class=road></div><div class=finish></div><div class=car id=car>${CAR_SVG}</div></div><div class=verdict id=vd></div><button id=go onclick=upgrade() ${ch?"":"disabled"}>Апгрейд</button>
 <div class=chips>${[1.5,2,3,5,10].map(m=>`<button class="chip ${mult===m?"on":""}" onclick="suggest(${100/m},${m})">x${m}</button>`).join("")}</div>
 <div class=tune><input id=want type=number min=1 max=95 placeholder="Свой шанс, %"><button onclick="suggest(+$('#want').value)">Подобрать</button></div></div>
 <div><h3>Цель${t?" · "+money(t.price):""}</h3>${stake?pickListG():"<span class=muted>Выберите свои предметы.</span>"}</div></div>`}
function pickListG(){let g=sug||[];return g.length?`<div class=pick>${g.map(x=>`<div class="pk ${tier(x.price)} ${x.name===tg?"on":""}" data-n="${esc(x.name)}" onclick="pickGoal(this.dataset.n)">${img(x)}<span>${nm(x.name)}</span><em>${money(x.price)} · ${Math.min(95,sel.reduce((t,i)=>t+inv()[i].price,0)/x.price*100).toFixed(0)}%</em></div>`).join("")}</div>`:"<span class=muted>Нажмите x1.5 … x10 или введите свой шанс — покажу подходящие скины с маркета.</span>"}
const pickMine=i=>{if(busy)return;sel=sel.includes(i)?sel.filter(x=>x!==i):sel.length<4?[...sel,i]:sel;tg=null;sug=null;mult=null;renderUp()},pickGoal=n=>{if(!busy){tg=n;renderUp()}};
async function suggest(c,m){let st=sel.reduce((t,i)=>t+inv()[i].price,0);if(!st||!c)return alert("Выберите предметы и шанс");try{let x=await api(`/api/suggest?stake=${st}&chance=${c}`);sug=x.items;tg=null;mult=m||null;renderUp();if(!m)$("#want").value=c}catch(e){alert(e.message)}}
async function upgrade(){if(busy||!sel.length||!tg)return;busy=true;$("#go").disabled=true;let d;
 try{d=await post("/api/upgrade",{indexes:sel,target:tg})}catch(e){busy=false;renderUp();return alert(e.message)}
 const race=$("#race"),car=$("#car"),wc=$("#wc"),rb=race.getBoundingClientRect(),cw=car.getBoundingClientRect().width;
 const startPx=14,finishPx=Math.max(startPx,rb.width-cw-28),crashPx=startPx+(finishPx-startPx)*(.32+Math.random()*.3);
 wc.textContent="Погнали…";SFX.engine(3.4);race.classList.remove("stopped");car.classList.remove("crash");
 requestAnimationFrame(()=>{car.style.transition="left 3.5s cubic-bezier(.32,.08,.28,1)";car.style.left=(d.win?finishPx:crashPx)+"px"});
 let puffT;
 setTimeout(()=>{race.classList.add("stopped");
  if(d.win){wc.textContent="🏁 Финиш!";boom("#22c55e",60)}
  else{car.classList.add("crash");wc.textContent="Заглох…";puffT=setInterval(()=>spawnPuff(car,Math.random()<.5),220)}
 },3550);
 setTimeout(()=>{clearInterval(puffT);
  $("#vd").className="verdict "+(d.win?"okk":"bad");$("#vd").textContent=d.win?WIN_TXT:LOSE_TXT;flash(d.win?"#22c55e55":"#ef444466");if(!d.win)SFX.lose();
  setTimeout(()=>{busy=false;sel=[];tg=null;sug=null;mult=null;load();if(d.win)load().then(()=>prize(d.target,inv().length-1,"Апгрейд удался!",true))},d.win?1300:2600)},d.win?3700:4550)}
let authTab="login";
function login(){authTab="login";renderAuth()}
function renderAuth(){modal(`<div class=tabs><button class="tab ${authTab==="login"?"on":""}" onclick="authTab='login';renderAuth()">Вход</button><button class="tab ${authTab==="reg"?"on":""}" onclick="authTab='reg';renderAuth()">Регистрация</button></div>
 ${authTab==="login"&&CFG.steamEnabled?`<a class="steambtn" href="/auth/steam">🎮 Войти через Steam</a><p class=muted style="margin:14px 0 6px">или тестовый вход</p>`:authTab==="login"?`<p class=muted>Steam-вход выключен (нет STEAM_API_KEY на сервере) — используйте вход по паролю.</p>`:""}
 <input id=u placeholder=Логин style="padding:12px;width:100%"><input id=p type=password placeholder=Пароль style="padding:12px;width:100%;margin:8px 0">
 ${authTab==="login"?`<button onclick=doLogin()>Войти</button><p class=muted>demo / demo</p>`:`<button onclick=doRegister()>Создать аккаунт</button><p class=muted>Логин 3–20 символов (латиница/цифры/_), пароль от 4 символов. Стартовый демо-баланс $1000.</p>`}`)}
async function doLogin(){try{await post("/api/login",{username:$("#u").value,password:$("#p").value,ref:(()=>{try{return localStorage.getItem("ref")||""}catch{return ""}})()});closeM();load()}catch(e){alert(e.message)}}
async function doRegister(){try{await post("/api/register",{username:$("#u").value,password:$("#p").value,ref:(()=>{try{return localStorage.getItem("ref")||""}catch{return ""}})()}); localStorage.removeItem("ref");closeM();boom("#22c55e",30);load()}catch(e){alert(e.message)}}
async function renderBonus(){
 if(!S?.user){$("#bonusbox").innerHTML="<p class=muted>Войдите, чтобы получить бонус.</p>";return}
 try{let d=await api("/api/bonus");$("#bonusbox").innerHTML=`<div class="featureCard"><div class="bonusWheel" id="bonusWheel">🎁</div><h2>${d.available?"Ежедневный бонус доступен":"Бонус уже получен"}</h2><p class=muted>${d.available?"Одно вращение каждые 24 часа.":"Следующее вращение через "+Math.ceil(d.left/3600000)+" ч."}${d.discount?`<br>Активна скидка ${d.discount}% на следующее пополнение.`:""}</p><button ${d.available?"":"disabled"} onclick="spinBonus()">Крутить колесо</button><div class=chips>${d.prizes.map(x=>`<span class=chip>${x.label}</span>`).join("")}</div></div>`}catch(e){$("#bonusbox").innerHTML=`<p class=muted>${e.message}</p>`}
}
async function spinBonus(){if(busy)return;busy=true;try{let d=await post("/api/bonus/spin");$("#bonusWheel").classList.add("spinning");setTimeout(()=>{busy=false;alert(d.prize.type==="money"?`Бонус: +$${d.prize.value}`:`Бонус: скидка ${d.prize.value}%`);load().then(renderBonus)},1800)}catch(e){busy=false;alert(e.message)}}
async function renderReferral(){
 if(!S?.user){$("#refbox").innerHTML="<p class=muted>Войдите, чтобы получить реферальную ссылку.</p>";return}
 try{let d=await api("/api/referral");let link=location.origin+"/?ref="+d.code;let incoming=(()=>{try{return localStorage.getItem("ref")||""}catch{return ""}})();let attach=incoming&&!d.referrer?`<div class="row"><input id="incomingRef" value="${esc(incoming)}" placeholder="Код реферала"><button onclick="attachRef()">Привязать</button></div>`:"";$("#refbox").innerHTML=`<div class=featureCard><h3>Реферальная программа</h3><p>Ваш код: <b>${d.code}</b></p>${attach}<input id=refLink value="${esc(link)}" readonly><p class=muted>Комиссия ${d.percent}% · минимум выплаты ${money(d.minPayout)}</p><div class=statbar><div><b>${money(d.pending)}</b><span>Накоплено</span></div><div><b>${money(d.paid)}</b><span>Выплачено</span></div></div><button onclick="claimRef()">Забрать комиссию</button></div>`}catch(e){$("#refbox").innerHTML=`<p class=muted>${e.message}</p>`}
}
async function attachRef(){try{let code=$("#incomingRef").value;await post("/api/referral/attach",{code});try{localStorage.removeItem("ref")}catch{};toast("Реферал успешно привязан","ok");renderReferral()}catch(e){alert(e.message)}}
async function claimRef(){try{let d=await post("/api/referral/claim");alert(`Начислено ${money(d.paid)}`);load().then(renderReferral)}catch(e){alert(e.message)}}
let BT={sel:{},seats:2,view:null,timer:null,anim:{}};
function stopBT(){if(BT.timer){clearInterval(BT.timer);BT.timer=null}}
function btCount(){return Object.values(BT.sel).reduce((a,b)=>a+b,0)}
function btQty(id,d){let q=(BT.sel[id]||0)+d;if(d>0&&btCount()>=12)return toast("Максимум 12 кейсов в одном батле","info");if(q<=0)delete BT.sel[id];else BT.sel[id]=Math.min(12,q);renderBattle()}
async function renderBattle(){
 stopBT();if(BT.view)return battleView();
 let cases=S?.cases||[],total=Object.entries(BT.sel).reduce((t,[id,q])=>t+(cases.find(c=>c.id==id)?.price||0)*q,0);
 $("#battlebox").innerHTML=`<div class=featureCard><h3>Создать батл</h3><p class=muted>Выберите кейсы (можно разные и по несколько штук, до 12) и число мест. Каждый участник платит полную стоимость набора, победитель забирает все дропы. Лобби открыто для других игроков, свободные места можно заполнить ботами.</p>
 <div class=bcases>${cases.map(c=>{let q=BT.sel[c.id]||0;return `<div class="bcase ${q?"on":""}"><img src="${esc(c.art||"")}" alt=""><b>${esc(c.name)}</b><span class=muted>${money(c.price)}</span><div class=qty><button onclick="btQty(${c.id},-1)">−</button><b>${q}</b><button onclick="btQty(${c.id},1)">+</button></div></div>`}).join("")}</div>
 <div class=chips>Мест: ${[2,3,4].map(n=>`<button class="chip ${BT.seats===n?"on":""}" onclick="BT.seats=${n};renderBattle()">${n}</button>`).join("")}</div>
 <p>Кейсов: <b>${btCount()}</b> · стоимость участия: <b>${money(total)}</b></p>
 <button class=btnGold style="width:100%" onclick="createBattle()" ${total?"":"disabled"}>⚔ Создать батл</button></div>
 <h3>Открытые лобби</h3><div id=lobbyList class=lobbyList><span class=muted>Загрузка…</span></div>`;
 loadLobbies();BT.timer=setInterval(loadLobbies,3000)}
async function loadLobbies(){if(location.hash!=="#battle"||BT.view){stopBT();return}let box=$("#lobbyList");if(!box)return;
 try{let d=await api("/api/battles");box.innerHTML=d.battles.length?d.battles.map(b=>{let me=S?.user?.username,inB=b.players.some(p=>!p.isBot&&p.username===me);
  return `<div class=lobby><div class=lcases>${b.caseImgs.slice(0,5).map(i=>`<img src="${esc(i||"")}" alt="">`).join("")}${b.caseImgs.length>5?`<span class=muted>+${b.caseImgs.length-5}</span>`:""}</div>
  <div class=lmeta><b>${esc(b.caseNames.slice(0,3).join(", "))}${b.caseNames.length>3?"…":""}</b>Вход ${money(b.stake)} · ${b.status==="waiting"?"ожидание игроков":b.status==="done"?"завершён":"идёт"}</div>
  <div class=lseats>${Array.from({length:b.seats},(_,i)=>{let p=b.players[i];return p?`<div class="seat ${p.isBot?"bot":""}" title="${esc(p.username)}">${p.isBot?"🤖":p.avatar?`<img src="${esc(p.avatar)}">`:esc(p.username[0].toUpperCase())}</div>`:`<div class=seat>+</div>`}).join("")}</div>
  ${b.status==="waiting"&&!inB?`<button class=btnGreen onclick="joinBattle('${b.id}')">Войти · ${money(b.stake)}</button>`:""}<button class=btnGhost onclick="viewBattle('${b.id}')">${b.status==="done"?"Смотреть":"Открыть"}</button></div>`}).join(""):"<span class=muted>Пока нет открытых лобби — создайте первое.</span>"}catch{}}
async function createBattle(){if(!S?.user)return login();let ids=[];Object.entries(BT.sel).forEach(([id,q])=>{for(let i=0;i<q;i++)ids.push(+id)});
 try{let d=await post("/api/battle/create",{caseIds:ids,seats:BT.seats});BT.sel={};BT.view=d.id;await load();renderBattle()}catch(e){alert(e.message)}}
async function joinBattle(id){if(!S?.user)return login();try{await post(`/api/battle/${id}/join`);BT.view=id;await load();renderBattle()}catch(e){alert(e.message)}}
function viewBattle(id){BT.view=id;renderBattle()}
function leaveBattleView(){BT.view=null;stopBT();renderBattle()}
async function battleAddBot(id){try{await post(`/api/battle/${id}/addbot`);battleView()}catch(e){alert(e.message)}}
async function battleCancel(id){if(!confirm("Отменить батл? Всем участникам вернётся ставка."))return;try{await post(`/api/battle/${id}/cancel`);await load();leaveBattleView()}catch(e){alert(e.message)}}
async function battleView(){stopBT();if(location.hash!=="#battle")return;
 let b;try{b=await api("/api/battle/"+BT.view)}catch(e){BT.view=null;return renderBattle()}
 let me=S?.user?.username,inB=b.players.some(p=>!p.isBot&&p.username===me),host=b.players[0]&&!b.players[0].isBot&&b.players[0].username===me;
 let head=`<div class=head><button class=chip onclick="leaveBattleView()">← К лобби</button><h3 style="margin:0">Батл · вход ${money(b.stake)}</h3></div><div class=lcases style="margin:10px 0">${b.caseImgs.map((i,k)=>`<img src="${esc(i||"")}" title="${esc(b.caseNames[k])}" alt="" style="width:46px;height:46px;object-fit:cover;border-radius:8px">`).join("")}</div>`;
 if(b.status==="cancelled"){$("#battlebox").innerHTML=head+"<p class=muted>Батл отменён, ставки возвращены.</p>";return}
 if(b.status==="waiting"){
  $("#battlebox").innerHTML=head+`<div class=featureCard><h3>Ожидание игроков (${b.players.length}/${b.seats})</h3><div class=lseats style="gap:10px;margin:14px 0">${Array.from({length:b.seats},(_,i)=>{let p=b.players[i];return `<div class="seat ${p?.isBot?"bot":""}" style="width:56px;height:56px;font-size:20px" title="${p?esc(p.username):"Свободно"}">${p?(p.isBot?"🤖":p.avatar?`<img src="${esc(p.avatar)}">`:esc(p.username[0].toUpperCase())):"+"}</div>`}).join("")}</div>
   <p class=muted>Лобби обновляется само. Батл стартует, когда заполнятся все места.</p>
   <div class=acts>${!inB?`<button class=btnGreen onclick="joinBattle('${b.id}')">Войти · ${money(b.stake)}</button>`:""}${host?`<button class=btnViolet onclick="battleAddBot('${b.id}')">🤖 Добавить бота</button><button class=btnRed onclick="battleCancel('${b.id}')">Отменить</button>`:""}</div></div>`;
  BT.timer=setInterval(battleView,2000);return}
 let rounds=b.caseIds.length,played=!!BT.anim[b.id],wi=0;b.players.forEach((p,i)=>{if(p.sum>b.players[wi].sum)wi=i});
 $("#battlebox").innerHTML=head+`<div class=bArena>${b.players.map((p,pi)=>`<div class=bPlayer id=bp${pi}><div class=bPHead>${p.isBot?'<b class=ava>🤖</b>':avaH(p,"ava")}<span>${esc(p.username)}</span></div>${p.drops.map((x,k)=>`<div class="flipcard ${played?"flip":""}" id=bf${pi}_${k}><div class=fcInner><div class=fcBack>?</div><div class="fcFront ${tier(x.price)}">${img(x)}<b>${nm(x.name)}</b><em>${money(x.price)}</em></div></div></div>`).join("")}<div class=bPSum id=bs${pi}>${played?money(p.sum):"$0.00"}</div></div>`).join("")}</div><div id=bBanner class=verdict></div>`;
 const finish=()=>{b.players.forEach((p,i)=>{let el=$("#bp"+i);if(el)el.classList.add(i===wi?"winner":"loser")});let bn=$("#bBanner");if(!bn)return;
  if(b.players[wi].username===me&&!b.players[wi].isBot){bn.className="verdict okk";bn.textContent="🏆 "+WIN_TXT}else if(inB){bn.className="verdict bad";bn.textContent=LOSE_TXT}else{bn.className="verdict";bn.textContent="Победил "+b.players[wi].username}};
 if(played){finish();return}
 BT.anim[b.id]=1;let acc=b.players.map(()=>0);
 for(let r=0;r<rounds;r++)b.players.forEach((p,pi)=>setTimeout(()=>{let el=$(`#bf${pi}_${r}`);if(!el)return;el.classList.add("flip");SFX.flip();acc[pi]+=p.drops[r]?.price||0;let sm=$("#bs"+pi);if(sm)sm.textContent=money(acc[pi])},r*900+pi*180+300));
 setTimeout(()=>{finish();let won=b.players[wi].username===me&&!b.players[wi].isBot;if($("#bBanner")){if(won){SFX.win();boom("#fbbf24",70)}else if(inB)SFX.lose();else SFX.reveal("blue")}load()},rounds*900+b.players.length*180+900)}
async function renderFair(){
 if(!S?.user){$("#fairbox").innerHTML="<p class=muted>Войдите, чтобы проверить свои роллы.</p>";return}
 try{let d=await api("/api/fair/history");$("#fairbox").innerHTML=`<div class=featureCard><h3>Provably Fair</h3><p class=muted>Client seed</p><div class=row><input id=clientSeed value="${esc(d.clientSeed)}"><button onclick="saveSeed()">Сохранить seed</button></div><p>Nonce: <b>${d.nonce}</b></p><h3>Последние результаты</h3>${d.history.map(x=>`<div class=row><span>nonce ${x.nonce}</span><span>roll ${(x.roll*100).toFixed(5)}%</span><span>${esc(x.item.name)}</span><code>${x.commit.slice(0,16)}…</code></div>`).join("")||"<p class=muted>Откройте кейс — здесь появится доказательство.</p>"}</div>`}catch(e){$("#fairbox").innerHTML=`<p class=muted>${e.message}</p>`}
}
async function saveSeed(){try{await post("/api/fair/client-seed",{clientSeed:$("#clientSeed").value});renderFair()}catch(e){alert(e.message)}}
function featureRoute(){
 if(location.hash==="#bonus")renderBonus();
 if(location.hash==="#referral")renderReferral();
 if(location.hash==="#battle")renderBattle();
 if(location.hash==="#fair")renderFair();
}
let adminTab="cases",ADMIN_D=null;
$("#adminTabs")?.addEventListener("click",e=>{let b=e.target.closest("button");if(!b)return;adminTab=b.dataset.t;document.querySelectorAll("#adminTabs .tab").forEach(x=>x.classList.toggle("on",x===b));renderAdminTab()});
async function admin(){ADMIN_D=await api("/api/admin");renderAdminTab()}
function renderAdminTab(){if(!ADMIN_D)return;
 if(adminTab==="cases")return adminCases();
 if(adminTab==="create")return adminCreate();
 if(adminTab==="users")return adminUsers();
 if(adminTab==="audit")return adminAudit();}
function adminCases(){let d=ADMIN_D,byCat={};d.cases.forEach(c=>{(byCat[c.category]=byCat[c.category]||[]).push(c)});
 $("#adminbox").innerHTML=Object.entries(byCat).map(([cat,cs])=>`<h3>${esc(cat)}</h3>`+cs.map(c=>`
  <div class="adminCase" id=ac${c.id}>
   <div class="acHead"><img class=acThumb src="${c.img||'/img/cases/_placeholder.svg'}" onclick="document.getElementById('acfile${c.id}').click()"><input type=file accept="image/*" id=acfile${c.id} hidden onchange="uploadCaseImage(${c.id},this)">
    <div class=acFields>
     <input id="n-${c.id}" value="${esc(c.name)}" placeholder="Название">
     <input id="cat-${c.id}" value="${esc(c.category)}" placeholder="Категория" list=catlist>
     <input id="p-${c.id}" type=number step=0.01 value="${c.price}" title="Цена $">
     <input id="w-${c.id}" type=number ${c.winChance==null?"disabled placeholder=—":`value="${(c.winChance*100).toFixed(0)}"`} title="Шанс окупа %">
     <button class=btnGreen data-case=${c.id}>Сохранить</button>
     <button class=btnRed onclick="deleteCase(${c.id},'${esc(c.name)}')">Удалить</button>
    </div></div>
   <details><summary>Наполнение (${c.bases?c.bases.length+" base-имён с маркета":(c.fixed||[]).length+" фикс. предметов"})</summary>
    ${c.bases?`<p class=muted>По одному базовому названию на строку (без степени износа), подтягивается с маркета автоматически:</p><textarea id=bases-${c.id} rows=6>${c.bases.join("\n")}</textarea><button class=btnViolet onclick="saveBases(${c.id})">Сохранить список</button>`
    :`<div id=fixedRows-${c.id}>${c.fixed.map((i,k)=>`<div class=row><input class=fxName value="${esc(i.name)}" placeholder="Точное название с маркета"><input class=fxOdds type=number value="${i.odds}" placeholder="Шанс %"><input class=fxPrice type=number value="${i.price||''}" placeholder="Цена $ (запасная)"></div>`).join("")}</div><button class=chip onclick="addFixedRow(${c.id})">+ строка</button><button class=btnViolet onclick="saveFixed(${c.id})">Сохранить список</button>`}
   </details>
  </div>`).join("")).join("")+`<datalist id=catlist>${(d.categories||[]).map(c=>`<option value="${esc(c)}">`).join("")}</datalist>`
  +d.cases.filter(c=>c.fixed?.length).map(c=>`<h3>Точечные шансы: ${esc(c.name)}</h3>`+c.fixed.map((i,k)=>`<div class=row><span>${esc(i.name)}</span><input id="o-${c.id}-${k}" value="${i.odds}"><button class=save data-c=${c.id} data-k=${k} data-n="${esc(i.name)}">Сохранить</button></div>`).join("")).join("");
 $("#adminbox").onclick=async e=>{let b=e.target.closest("button");if(!b)return;try{
   if(b.dataset.case){let i=b.dataset.case;await post("/api/admin/case",{id:i,name:$("#n-"+i).value,price:$("#p-"+i).value,category:$("#cat-"+i).value,winChance:$("#w-"+i).value})}
   else if(b.dataset.c)await post("/api/admin/odds",{caseId:b.dataset.c,name:b.dataset.n,odds:+$(`#o-${b.dataset.c}-${b.dataset.k}`).value});
   else return;flash("#22c55e33");admin()}catch(x){alert(x.message)}};}
async function deleteCase(id,name){if(!confirm(`Удалить кейс «${name}»? Это необратимо.`))return;try{await post("/api/admin/case/delete",{id});admin()}catch(e){alert(e.message)}}
async function saveBases(id){try{await post("/api/admin/case/bases",{id,bases:$("#bases-"+id).value});flash("#22c55e33");admin()}catch(e){alert(e.message)}}
function addFixedRow(id){let w=$("#fixedRows-"+id),d=document.createElement("div");d.className="row";d.innerHTML=`<input class=fxName placeholder="Точное название с маркета"><input class=fxOdds type=number placeholder="Шанс %"><input class=fxPrice type=number placeholder="Цена $ (запасная)">`;w.appendChild(d)}
async function saveFixed(id){let rows=[...$("#fixedRows-"+id).querySelectorAll(".row")].map(r=>({name:r.querySelector(".fxName").value.trim(),odds:+r.querySelector(".fxOdds").value,price:+r.querySelector(".fxPrice").value})).filter(x=>x.name&&x.price>0);
 try{await post("/api/admin/case/fixed",{id,fixed:rows});flash("#22c55e33");admin()}catch(e){alert(e.message)}}
function uploadCaseImage(id,input){let f=input.files[0];if(!f)return;let fr=new FileReader();fr.onload=async()=>{try{await post("/api/admin/case/image",{id,dataUrl:fr.result});flash("#22c55e33");admin()}catch(e){alert(e.message)}};fr.readAsDataURL(f)}
function adminCreate(){$("#adminbox").innerHTML=`<div class=featureCard><h3>Создать новый кейс</h3>
  <input id=ncName placeholder="Название кейса"><input id=ncCat placeholder="Категория" list=catlist2><input id=ncPrice type=number step=0.01 placeholder="Цена $"><input id=ncWin type=number placeholder="Шанс окупа % (необязательно — если пусто, шансы считаются от цен предметов)">
  <p class=muted>Предметы — по одному базовому названию на строку (как на торговой площадке Steam, без степени износа), например:<br><code>AK-47 | Redline</code><br><code>AWP | Asiimov</code><br>Цены и все степени износа подтянутся с маркета автоматически.</p>
  <textarea id=ncBases rows=8 placeholder="AK-47 | Redline&#10;AWP | Asiimov&#10;..."></textarea>
  <button onclick="createCase()">Создать кейс</button>
  <datalist id=catlist2>${(ADMIN_D.categories||[]).map(c=>`<option value="${esc(c)}">`).join("")}</datalist>
  </div>`}
async function createCase(){let body={name:$("#ncName").value,category:$("#ncCat").value||"Общее",price:$("#ncPrice").value,winChance:$("#ncWin").value,bases:$("#ncBases").value};
 try{let d=await post("/api/admin/case/create",body);flash("#22c55e33");alert("Кейс создан (#"+d.id+"). Фото и точные шансы можно поправить во вкладке «Кейсы».");adminTab="cases";document.querySelectorAll("#adminTabs .tab").forEach(x=>x.classList.toggle("on",x.dataset.t==="cases"));admin()}catch(e){alert(e.message)}}
function adminUsers(){$("#adminbox").innerHTML=`<div class=row style="font-weight:800;color:var(--m);font-size:11px"><span>Игрок</span><span>Удача</span><span>Баланс</span></div>`+ADMIN_D.users.map(u=>`
  <div class=row><span>${esc(u.username)} ${u.role==="admin"?"★":""}<br><small>${u.opens} откр.</small></span>
   <span><input id=luck-${u.id} type=number step=0.1 min=0.2 max=3 value="${u.luckMod}" style="width:70px"> <button class=chip onclick="setLuck(${u.id})">OK</button></span>
   <span><input id=bal-${u.id} type=number step=1 value="${u.balance.toFixed(2)}" style="width:90px"> <button class=chip onclick="setBalance(${u.id})">OK</button></span>
  </div>`).join("")+`<p class=muted style="margin-top:10px">Удача 1 = как у всех. Меньше 1 — реже окупаемые предметы, больше 1 — чаще (до 3×).</p>`}
async function setLuck(id){try{await post("/api/admin/user/luck",{id,luck:$("#luck-"+id).value});flash("#22c55e33");admin()}catch(e){alert(e.message)}}
async function setBalance(id){try{await post("/api/admin/user/balance",{id,balance:$("#bal-"+id).value});flash("#22c55e33");admin()}catch(e){alert(e.message)}}
function adminAudit(){$("#adminbox").innerHTML=ADMIN_D.audit.length?ADMIN_D.audit.map(a=>`<div class=row style="grid-template-columns:140px 1fr"><span>${new Date(a.time).toLocaleString()}</span><span>${esc(a.admin)} — ${esc(JSON.stringify(a).slice(0,160))}</span></div>`).join(""):"<span class=muted>Журнал пуст.</span>"}
async function resetOdds(){await post("/api/admin/reset");admin()}
async function loadProfile(uname){
 let own=!uname||(S?.user&&S.user.username.toLowerCase()===String(uname).toLowerCase());
 if(own&&!S?.user){location.hash="cases";return}
 let p;try{p=own?await api("/api/profile"):await api("/api/users/"+encodeURIComponent(uname)+"/public")}catch(e){$("#profHead").innerHTML=`<p class=muted>${esc(e.message)}</p>`;return}
 let name=own?S.user.username:p.username,av=own?S.user.avatar:p.avatar;
 $("#profPrivate").style.display=own?"":"none";
 $("#profHead").innerHTML=`<div class=profhero>${av?`<img class="ava avaL" src="${esc(av)}">`:`<b class="ava avaL">${esc(name[0].toUpperCase())}</b>`}<div><h1>${esc(name)}</h1><p class=muted>${own?"Баланс: "+money(S.user.balance):"Профиль игрока"}</p></div></div>
 <div class=statbar><div><b>${p.stats.opens}</b><span>Кейсов открыто</span></div><div><b>${p.stats.upgrades}</b><span>Апгрейдов</span></div><div><b>${p.stats.contracts}</b><span>Контрактов</span></div>${own?`<div><b>${inv().length}</b><span>В инвентаре</span></div>`:""}</div>`;
 $("#profFav").innerHTML=p.favorite?`<article class=card style="max-width:260px"><div class="art caseart"><img src="${esc(p.favorite.img)}" alt=""></div><div class=name>${esc(p.favorite.name)}</div><div class=meta><span>Открыт ${p.favorite.count} раз</span></div><a class=lnk href="#case-${p.favorite.id}">Открыть кейс →</a></article>`:"<span class=muted>Ещё не открывали кейсы.</span>";
 $("#profTop").innerHTML=p.topDrop?`<div class="item topdrop ${tier(p.topDrop.price)}"><div class=art>${img(p.topDrop)}</div><div class=name>${nm(p.topDrop.name)}</div><div class=price>${money(p.topDrop.price)}</div><div class=meta><span>${esc(p.topDrop.source)}</span></div></div>`:"<span class=muted>Пока нет дропов.</span>";
 if(own){$("#profDrops").innerHTML=p.history.length?p.history.map(x=>`<div class="item ${tier(x.price)}"><div class=art>${img(x)}</div><div class=name>${nm(x.name)}</div><div class=price>${money(x.price)}</div><div class=meta><span>${esc(x.source)}</span></div></div>`).join(""):"<span class=muted>Пока нет дропов.</span>";
  $("#profInv").innerHTML=invCardsHTML(inv())}}
$("#q").oninput=draw;$("#login").onclick=()=>S?.user?post("/api/logout").then(load):login();
function route2(){route();if(location.hash==="#leaderboard")loadLB();featureRoute()}
addEventListener("hashchange",route2);
load().then(()=>{loadStats();loadTicker();loadLB();route2()});
