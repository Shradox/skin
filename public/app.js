let S,sel=[],csel=[],tg=null,sug=null,mult=null,busy=false;const $=x=>document.querySelector(x),money=x=>"$"+(+x).toFixed(2),esc=s=>String(s).replace(/"/g,"&quot;");
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
 else if(p==="profile"){if(!S?.user){location.hash="cases";return}loadProfile()}
 if(!PAGES.includes(p)||(p==="admin"&&S?.user?.role!=="admin"))p="cases";
 document.querySelectorAll(".page").forEach(e=>e.classList.toggle("on",e.id===p));
 document.querySelectorAll("nav a").forEach(a=>a.classList.toggle("on",a.hash==="#"+p));window.scrollTo(0,0)}
let CFG={steamEnabled:false};
let REF="";try{REF=(new URL(window.location.href)).searchParams.get("ref")||""}catch{};if(/^[A-Z0-9_-]{4,64}$/i.test(REF)){try{localStorage.setItem("ref",REF)}catch{}} async function load(){[S,CFG]=await Promise.all([api("/api/state"),api("/api/config").catch(()=>CFG)]);document.documentElement.style.setProperty("--a",CFG.appearance?.accent||"#8b5cf6"); document.title=CFG.appearance?.siteName||"DmitrashDrop"; $("#bal").textContent=S.user?money(S.user.balance):"$0.00";$("#login").textContent=S.user?"Выйти":"Войти";
 $("#who").innerHTML=S.user?`<span class="who" onclick="location.hash='profile'" style=cursor:pointer>${S.user.avatar?`<img class=ava src="${S.user.avatar}">`:`<b class=ava>${S.user.username[0].toUpperCase()}</b>`}${S.user.username}</span>`:"";
 $("#depositBtn").hidden=!S.user;$("#bell").hidden=!S.user;
 let bc=$("#bellcount");if(S.user?.unread){bc.hidden=false;bc.textContent=S.user.unread}else bc.hidden=true;
 $("#adminlink").hidden=S.user?.role!=="admin";draw();route();if(S.user?.role==="admin")admin();if(S.user)pollNotifs()}
async function loadStats(){try{let d=await api("/api/stats");$("#statbar").innerHTML=[["Кейсов",d.cases],["Игроков",d.users],["Открытий",d.opens],["Апгрейдов",d.upgrades]].map(([l,v])=>`<div><b>${v}</b><span>${l}</span></div>`).join("")}catch{}}
let tickSeen=new Set();
async function loadTicker(){try{let d=await api("/api/feed?limit=25"),fresh=d.items.filter(x=>!tickSeen.has(x.ts));fresh.forEach(x=>tickSeen.add(x.ts));
 $("#tickTrack").innerHTML=d.items.map(x=>`<div class="tk ${tier(x.price)} ${fresh.includes(x)?"tknew":""}"><img src="${x.img||PH}" onerror="this.src='${PH}'"><span>${nm(x.name)}</span><em>${money(x.price)}</em></div>`).join("")||`<div class=tk-empty>Пока пусто — откройте первый кейс.</div>`}catch{}}
let lbPeriod="day";
async function loadLB(){try{let d=await api("/api/leaderboard?period="+lbPeriod);$("#lb").innerHTML=d.rows.length?`<div class=lbrows>${d.rows.map((u,i)=>`<div class="lbrow ${i<3?"top"+(i+1):""}"><span class=rk>#${i+1}</span>${u.avatar?`<img class=ava src="${u.avatar}">`:`<b class=ava>${u.username[0].toUpperCase()}</b>`}<span class=un>${u.username}</span><b>${money(u.wagered)}</b></div>`).join("")}</div>`:"<span class=muted>Пока нет активности за этот период.</span>"}catch{}}
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
 <input id=depAmt type=number min=1 max=5000 placeholder="Сумма в $ (1–5000)" style="padding:12px;width:100%;margin:8px 0"><input id=promo type=text placeholder="Промокод (например WELCOME)" style="padding:12px;width:100%;margin:0 0 8px">
 <button onclick="confirmDeposit('${code}')">Я оплатил (демо)</button>`)}
async function confirmDeposit(code){let amt=+$("#depAmt").value;if(!amt)return alert("Введите сумму");
 modal("<p class=muted>Проверяем сеть…</p>");
 setTimeout(async()=>{try{let d=await post("/api/deposit/confirm",{coin:code,amount:amt,promo:$("#promo")?.value||""});closeM();boom("#22c55e",40);toast(`💰 Зачислено ${money(d.amount)}`,"ok");load()}catch(e){alert(e.message)}},1800)}
const inv=()=>S.user?.inventory||[];
function draw(){let q=$("#q").value.toLowerCase();
 $("#casesGrid").innerHTML=S.cases.filter(c=>c.name.toLowerCase().includes(q)).map(c=>`<article class=card><div class="art caseart" onclick="location.hash='case-${c.id}'" style=cursor:pointer><img src="${c.art}" alt=""></div><div class=name onclick="location.hash='case-${c.id}'" style=cursor:pointer>${c.name}</div><div class=meta><span>${c.n} предм. · окуп ${(c.win*100).toFixed(0)}%</span><b>${money(c.price)}</b></div><div class=acts><button class=open onclick="openCase(${c.id})" ${c.n?"":"disabled"}>Открыть</button><button class=save title="Без анимации" onclick="openCase(${c.id},true)" ${c.n?"":"disabled"}>⚡ Быстро</button></div><a class=lnk href="#case-${c.id}">Страница кейса →</a></article>`).join("");
 let l=inv();$("#invsum").textContent=l.length?`· ${l.length} шт · ${money(l.reduce((t,x)=>t+x.price,0))}`:"";
 $("#invgrid").innerHTML=invCardsHTML(l);
 sel=sel.filter(i=>l[i]);csel=csel.filter(i=>l[i]);renderUp();renderCt()}
function invCardsHTML(l){return l.length?l.map((x,i)=>`<div class="item ${tier(x.price)}"><div class=art>${img(x)}</div><div class=name>${nm(x.name)}</div><div class=price>${money(x.price)}</div><div class=acts><button class=save onclick="sell(${i})">Продать</button><button class=open onclick="swap(${i})">Заменить</button></div><div class=acts><button class=go onclick="toUp(${i})">⚡ Апгрейд</button><button class=red2 onclick="withdraw(${i})">Вывести</button></div></div>`).join(""):"<span class=muted>Пусто. Откройте кейс на странице «Кейсы».</span>"}
async function withdraw(i){let it=inv()[i];if(!it)return;if(!confirm(`Вывести ${it.name} (${money(it.price)}) — демо-трейд в Steam?`))return;
 try{await post("/api/withdraw",{index:i})}catch(e){return alert(e.message)}
 sel=[];csel=[];load();setTimeout(()=>{toast("📦 Трейд отправлен: "+it.name,"info");pollNotifs()},4500+Math.random()*2500)}
async function sell(i){await post("/api/sell",{indexes:[i]});sel=[];csel=[];boom("#22c55e",20);load()}
async function sellAll(){let n=inv().length;if(!n||!confirm(`Продать все предметы (${n}) по рыночной цене?`))return;await post("/api/sell",{indexes:inv().map((_,i)=>i)});sel=[];csel=[];boom("#22c55e",40);load()}
async function sellOne(i){try{let d=await post("/api/sell",{indexes:[i]});closeM();boom("#22c55e",40);load()}catch(e){alert(e.message)}}
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
 <button id=cpgo class=go onclick="openCase(${c.id},null,openN)" ${c.n?"":"disabled"}>Открыть ${openN>1?openN+" кейса":""} за ${money(total)}</button></div></div>`}
function setOpenN(n){openN=n;renderCaseHead()}
function prize(it,index,title,verdict){let d=verdict===undefined?"":`<p class="verdict ${verdict?"okk":"bad"}">${verdict?WIN_TXT:LOSE_TXT}</p>`;
 modal(`<h2>${title}</h2>${d}<div class="prize ${tier(it.price)}">${img(it)}</div><h3>${nm(it.name)}</h3><p class=price>${money(it.price)}</p><div class=acts><button onclick="closeM();load()">Забрать</button><button class=save onclick="sellOne(${index})">Продать за ${money(it.price)}</button></div><p class="muted">Результат защищён fair-roll. Проверить можно в разделе «Fair».</p><div class=acts><button class=go onclick="toUp(${index})">⚡ В апгрейд</button><button class=open onclick="closeM();load();location.hash='cases'">Ещё кейс</button></div>`);boom(getComputedStyle($(".prize")).getPropertyValue("--r")||"#fbbf24",40)}
async function openCase(id,fast,count){if(!S.user)return login();if(busy)return;let c=S.cases.find(x=>x.id==id)||(cpCase?.id==id?cpCase:null);busy=true;let d,n=count||1,useFast=!!fast;
 try{d=await post(`/api/cases/${id}/open`,{count:n})}catch(e){busy=false;return alert(e.message)}
 $("#bal").textContent=money(d.balance);
 if(n>1){busy=false;return multiPrize(d.items,d.startIndex,c?.name||"Кейс")}
 if(useFast){busy=false;return prize(d.items[0],d.startIndex,"Быстрое открытие")}
 modal(`<h2>${c?.name||""}</h2><div class=reelwrap><div class=marker></div><div class=track id=track>${d.reel.map(x=>`<div class="rc ${tier(x.price)}">${img(x)}<span>${nm(x.name)}</span></div>`).join("")}</div></div><button class=save onclick="skip()">Пропустить</button>`);
 const tr=$("#track"),card=tr.children[d.winIndex];let done=false;window.skip=()=>{tr.style.transition="none";fin()};
 const fin=()=>{if(done)return;done=true;busy=false;card.classList.add("win");flash("#fbbf2455");setTimeout(()=>prize(d.items[0],d.startIndex,"Вы выиграли"),700)};
 setTimeout(()=>{if(done)return;const to=card.offsetLeft+card.offsetWidth*(.12+Math.random()*.76)-tr.parentElement.clientWidth/2;
  tr.style.transition="transform 6.5s cubic-bezier(.08,.7,.12,1)";tr.style.transform=`translateX(${-to}px)`;tr.addEventListener("transitionend",fin,{once:true});setTimeout(fin,7200)},60)}
function multiPrize(items,startIndex,caseName){let total=items.reduce((t,x)=>t+x.price,0);
 modal(`<h2>${caseName} · ${items.length} шт</h2><p class=muted>Итого выигрыша: ${money(total)}</p><div class="grid mpgrid">${items.map((x,k)=>`<div class="item ${tier(x.price)} popin" style="animation-delay:${k*90}ms"><div class=art>${img(x)}</div><div class=name>${nm(x.name)}</div><div class=price>${money(x.price)}</div></div>`).join("")}</div><div class=acts><button onclick="closeM();load()">Забрать всё</button><button class=save onclick="sellRange(${startIndex},${items.length})">Продать всё за ${money(total)}</button></div>`);
 boom("#fbbf24",50)}
async function sellRange(start,n){let ix=Array.from({length:n},(_,i)=>start+i);try{await post("/api/sell",{indexes:ix})}catch(e){return alert(e.message)}closeM();boom("#22c55e",30);load()}
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
 wc.textContent="Погнали…";race.classList.remove("stopped");car.classList.remove("crash");
 requestAnimationFrame(()=>{car.style.transition="left 3.5s cubic-bezier(.32,.08,.28,1)";car.style.left=(d.win?finishPx:crashPx)+"px"});
 let puffT;
 setTimeout(()=>{race.classList.add("stopped");
  if(d.win){wc.textContent="🏁 Финиш!";boom("#22c55e",60)}
  else{car.classList.add("crash");wc.textContent="Заглох…";puffT=setInterval(()=>spawnPuff(car,Math.random()<.5),220)}
 },3550);
 setTimeout(()=>{clearInterval(puffT);
  $("#vd").className="verdict "+(d.win?"okk":"bad");$("#vd").textContent=d.win?WIN_TXT:LOSE_TXT;flash(d.win?"#22c55e55":"#ef444466");
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
async function renderBattle(){
 let cases=S?.cases||[];$("#battlebox").innerHTML=`<div class=featureCard><h3>Кейс-батлы</h3><p class=muted>Выберите кейс и количество мест. В демо-режиме остальные места занимают боты; победитель забирает все дропы.</p><div class=chips>${cases.slice(0,8).map(c=>`<button class=chip onclick="startBattle(${c.id})">${esc(c.name)} · ${money(c.price)}</button>`).join("")}</div><div id=battleresult></div></div>`;
}
async function startBattle(id){if(busy)return;busy=true;try{let seats=+(prompt("Количество мест: 2, 3 или 4","2")||2);let d=await post("/api/battle/bot",{caseId:id,seats});$("#battleresult").innerHTML=`<h3>${d.won?"🏆 Победа!":"💥 Победил соперник"}</h3><div class=lbrows>${d.players.map(p=>`<div class=lbrow><span>${esc(p.name)}</span><b>${money(p.sum)}</b></div>`).join("")}</div>`;load()}catch(e){alert(e.message)}finally{busy=false}}
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
async function admin(){let d=await api("/api/admin");$("#adminbox").innerHTML=`<h3>Кейсы</h3>`+d.cases.map(c=>`<div class=row><span>#${c.id}</span><input id="n-${c.id}" value="${esc(c.name)}"><input id="p-${c.id}" type=number step=0.01 value="${c.price}" title="Цена $"><input id="w-${c.id}" type=number ${c.winChance==null?"disabled placeholder=—":`value="${(c.winChance*100).toFixed(0)}"`} title="Шанс окупа %"><button class=save data-case=${c.id}>Сохранить</button></div>`).join("")+d.cases.filter(c=>c.fixed.length).map(c=>`<h3>Шансы: ${c.name}</h3>`+c.fixed.map((i,k)=>`<div class=row><span>${i.name}</span><input id="o-${c.id}-${k}" value="${i.odds}"><button class=save data-c=${c.id} data-k=${k} data-n="${esc(i.name)}">Сохранить</button></div>`).join("")).join("")}
$("#adminbox").onclick=async e=>{let b=e.target.closest("button");if(!b)return;try{if(b.dataset.case){let i=b.dataset.case;await post("/api/admin/case",{id:i,name:$("#n-"+i).value,price:$("#p-"+i).value,winChance:$("#w-"+i).value})}else if(b.dataset.c)await post("/api/admin/odds",{caseId:b.dataset.c,name:b.dataset.n,odds:+$(`#o-${b.dataset.c}-${b.dataset.k}`).value});else return;flash("#22c55e33");load()}catch(x){alert(x.message)}};
async function resetOdds(){await post("/api/admin/reset");load()}
async function loadProfile(){if(!S?.user)return;let p;try{p=await api("/api/profile")}catch(e){return}
 $("#profHead").innerHTML=`<div class=profhero>${S.user.avatar?`<img class="ava avaL" src="${S.user.avatar}">`:`<b class="ava avaL">${S.user.username[0].toUpperCase()}</b>`}<div><h1>${S.user.username}</h1><p class=muted>Баланс: ${money(S.user.balance)}</p></div></div>
 <div class=statbar><div><b>${p.stats.opens}</b><span>Кейсов открыто</span></div><div><b>${p.stats.upgrades}</b><span>Апгрейдов</span></div><div><b>${p.stats.contracts}</b><span>Контрактов</span></div><div><b>${inv().length}</b><span>В инвентаре</span></div></div>`;
 $("#profFav").innerHTML=p.favorite?`<article class=card style="max-width:260px"><div class="art caseart"><img src="${p.favorite.img}" alt=""></div><div class=name>${p.favorite.name}</div><div class=meta><span>Открыт ${p.favorite.count} раз</span></div><a class=lnk href="#case-${p.favorite.id}">Открыть кейс →</a></article>`:"<span class=muted>Ещё не открывали кейсы.</span>";
 $("#profDrops").innerHTML=p.history.length?p.history.map(x=>`<div class="item ${tier(x.price)}"><div class=art>${img(x)}</div><div class=name>${nm(x.name)}</div><div class=price>${money(x.price)}</div><div class=meta><span>${x.source}</span></div></div>`).join(""):"<span class=muted>Пока нет дропов.</span>";
 $("#profInv").innerHTML=invCardsHTML(inv())}
$("#q").oninput=draw;$("#login").onclick=()=>S?.user?post("/api/logout").then(load):login();
function route2(){route();if(location.hash==="#leaderboard")loadLB();featureRoute()}
addEventListener("hashchange",route2);
load().then(()=>{loadStats();loadTicker();loadLB();route2()});
