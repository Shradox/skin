let S,sel=[],csel=[],tg=null,sug=null,mult=null,busy=false;const $=x=>document.querySelector(x),money=x=>"$"+(+x).toFixed(2),esc=s=>String(s).replace(/"/g,"&quot;");
const tier=p=>p>=100?"gold":p>=25?"red":p>=8?"pink":p>=2?"purple":p>=.5?"blue":"gray";
const PH="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><text x="50" y="40" font-size="32" text-anchor="middle" fill="#ffffff33">★</text></svg>');
const img=x=>`<img src="${x.img||PH}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PH}'">`;
const nm=n=>{let m=n.match(/^(.*) \(([^)]+)\)$/);return m?`<b>${m[1]}</b><small>${m[2]}</small>`:`<b>${n}</b>`};
const WIN_TXT="РТП заработало? Да нет просто повезло))",LOSE_TXT="Додеп Дмитриж!!";
async function api(u,o={}){let r=await fetch(u,{headers:{"Content-Type":"application/json"},...o}),d=await r.json();if(!r.ok)throw Error(d.error||"Ошибка");return d}
const post=(u,b)=>api(u,{method:"POST",body:JSON.stringify(b||{})});
const modal=h=>{$("#modal").hidden=false;$("#m").innerHTML=h};function closeM(){if(!busy)$("#modal").hidden=true}
const PAGES=["cases","upgrade","contracts","leaderboard","inventory","admin"];
function route(){let p=location.hash.slice(1);if(!PAGES.includes(p)||(p==="admin"&&S?.user?.role!=="admin"))p="cases";document.querySelectorAll(".page").forEach(e=>e.classList.toggle("on",e.id===p));document.querySelectorAll("nav a").forEach(a=>a.classList.toggle("on",a.hash==="#"+p));window.scrollTo(0,0)}
addEventListener("hashchange",route);
let CFG={steamEnabled:false};
async function load(){[S,CFG]=await Promise.all([api("/api/state"),api("/api/config").catch(()=>CFG)]);$("#bal").textContent=S.user?money(S.user.balance):"$0.00";$("#login").textContent=S.user?"Выйти":"Войти";
 $("#who").innerHTML=S.user?`<span class="who">${S.user.avatar?`<img class=ava src="${S.user.avatar}">`:`<b class=ava>${S.user.username[0].toUpperCase()}</b>`}${S.user.username}</span>`:"";
 $("#adminlink").hidden=S.user?.role!=="admin";draw();route();if(S.user?.role==="admin")admin()}
async function loadStats(){try{let d=await api("/api/stats");$("#statbar").innerHTML=[["Кейсов",d.cases],["Игроков",d.users],["Открытий",d.opens],["Апгрейдов",d.upgrades]].map(([l,v])=>`<div><b>${v}</b><span>${l}</span></div>`).join("")}catch{}}
let tickSeen=new Set();
async function loadTicker(){try{let d=await api("/api/feed?limit=25"),fresh=d.items.filter(x=>!tickSeen.has(x.ts));fresh.forEach(x=>tickSeen.add(x.ts));
 $("#tickTrack").innerHTML=d.items.map(x=>`<div class="tk ${tier(x.price)} ${fresh.includes(x)?"tknew":""}"><img src="${x.img||PH}" onerror="this.src='${PH}'"><span>${nm(x.name)}</span><em>${money(x.price)}</em></div>`).join("")||`<div class=tk-empty>Пока пусто — откройте первый кейс.</div>`}catch{}}
let lbPeriod="day";
async function loadLB(){try{let d=await api("/api/leaderboard?period="+lbPeriod);$("#lb").innerHTML=d.rows.length?`<div class=lbrows>${d.rows.map((u,i)=>`<div class="lbrow ${i<3?"top"+(i+1):""}"><span class=rk>#${i+1}</span>${u.avatar?`<img class=ava src="${u.avatar}">`:`<b class=ava>${u.username[0].toUpperCase()}</b>`}<span class=un>${u.username}</span><b>${money(u.wagered)}</b></div>`).join("")}</div>`:"<span class=muted>Пока нет активности за этот период.</span>"}catch{}}
$("#lbtabs")?.addEventListener("click",e=>{let b=e.target.closest("button");if(!b)return;lbPeriod=b.dataset.p;document.querySelectorAll("#lbtabs .chip").forEach(x=>x.classList.toggle("on",x===b));loadLB()});
setInterval(loadTicker,5000);setInterval(loadStats,15000);setInterval(()=>{if(location.hash==="#leaderboard")loadLB()},7000);
const inv=()=>S.user?.inventory||[];
function draw(){let q=$("#q").value.toLowerCase();
 $("#casesGrid").innerHTML=S.cases.filter(c=>c.name.toLowerCase().includes(q)).map(c=>`<article class=card><div class="art caseart" onclick="preview(${c.id})" style=cursor:pointer><img src="${c.art}" alt=""></div><div class=name>${c.name}</div><div class=meta><span>${c.n} предм. · окуп ${(c.win*100).toFixed(0)}%</span><b>${money(c.price)}</b></div><div class=acts><button class=open onclick="openCase(${c.id})" ${c.n?"":"disabled"}>Открыть</button><button class=save title="Без анимации" onclick="openCase(${c.id},true)" ${c.n?"":"disabled"}>⚡ Быстро</button></div><a class=lnk onclick="preview(${c.id})">Что внутри</a></article>`).join("");
 let l=inv();$("#invsum").textContent=l.length?`· ${l.length} шт · ${money(l.reduce((t,x)=>t+x.price,0))}`:"";
 $("#invgrid").innerHTML=l.length?l.map((x,i)=>`<div class="item ${tier(x.price)}"><div class=art>${img(x)}</div><div class=name>${nm(x.name)}</div><div class=price>${money(x.price)}</div><div class=acts><button class=save onclick="sell(${i})">Продать</button><button class=open onclick="swap(${i})">Заменить</button></div><div class=acts><button class=go onclick="toUp(${i})">⚡ Апгрейд</button></div></div>`).join(""):"<span class=muted>Пусто. Откройте кейс на странице «Кейсы».</span>";
 sel=sel.filter(i=>l[i]);csel=csel.filter(i=>l[i]);renderUp();renderCt()}
async function sell(i){await post("/api/sell",{indexes:[i]});sel=[];csel=[];boom("#22c55e",20);load()}
async function sellAll(){let n=inv().length;if(!n||!confirm(`Продать все предметы (${n}) по рыночной цене?`))return;await post("/api/sell",{indexes:inv().map((_,i)=>i)});sel=[];csel=[];boom("#22c55e",40);load()}
async function sellOne(i){try{let d=await post("/api/sell",{indexes:[i]});closeM();boom("#22c55e",40);load()}catch(e){alert(e.message)}}
async function toUp(i){closeM();await load();sel=[i];tg=null;sug=null;mult=null;location.hash="upgrade";renderUp()}
async function swap(i){let x=inv()[i];modal(`<h2>Замена</h2><p class=muted>${x.name} · ${money(x.price)}. Аналоги ±15% по цене:</p><div id=sw class=plist>Загрузка…</div>`);
 try{let d=await api("/api/similar?index="+i);$("#sw").innerHTML=d.items.length?d.items.map(y=>`<div class="prow ${tier(y.price)}" style=cursor:pointer data-n="${esc(y.name)}" onclick="doSwap(${i},this.dataset.n)">${img(y)}<span>${nm(y.name)}</span><em></em><strong>${money(y.price)}</strong></div>`).join(""):"<span class=muted>Аналогов пока нет (каталог маркета ещё грузится).</span>"}catch(e){$("#sw").textContent=e.message}}
async function doSwap(i,n){try{await post("/api/swap",{index:i,name:n});closeM();boom("#9d5cff",25);load()}catch(e){alert(e.message)}}
function boom(c="#fbbf24",n=50){for(let k=0;k<n;k++){let e=document.createElement("i");e.className="cf";e.style.cssText=`--x:${(Math.random()-.5)*700}px;--y:${-200-Math.random()*400}px;--r:${Math.random()*720}deg;left:50%;top:60%;background:${k%3?c:"#fff"};animation-delay:${Math.random()*.15}s`;document.body.appendChild(e);setTimeout(()=>e.remove(),1800)}}
function flash(c){let e=document.createElement("div");e.className="flash";e.style.background=c;document.body.appendChild(e);setTimeout(()=>e.remove(),900)}
async function preview(id){modal("<p class=muted>Загрузка…</p>");let c=await api("/api/cases/"+id);
 modal(`<h2>${c.name} · ${money(c.price)}</h2><p class=muted>Окуп: ${(c.win*100).toFixed(0)}% · средняя отдача ${(c.rtp*100).toFixed(0)}% · зелёная рамка = окупаемые предметы. Показаны самые дорогие.</p><div class=plist>${c.items.map(x=>`<div class="prow ${tier(x.price)} ${x.price>=c.price?"okp":""}">${img(x)}<span>${nm(x.name)}</span><em>${x.odds<.01?"<0.01":x.odds.toFixed(2)}%</em><strong>${money(x.price)}</strong></div>`).join("")}</div><button onclick="closeM();openCase(${c.id})">Открыть за ${money(c.price)}</button>`)}
function prize(it,index,title,verdict){let d=verdict===undefined?"":`<p class="verdict ${verdict?"okk":"bad"}">${verdict?WIN_TXT:LOSE_TXT}</p>`;
 modal(`<h2>${title}</h2>${d}<div class="prize ${tier(it.price)}">${img(it)}</div><h3>${nm(it.name)}</h3><p class=price>${money(it.price)}</p><div class=acts><button onclick="closeM();load()">Забрать</button><button class=save onclick="sellOne(${index})">Продать за ${money(it.price)}</button></div><div class=acts><button class=go onclick="toUp(${index})">⚡ В апгрейд</button><button class=open onclick="closeM();load();location.hash='cases'">Ещё кейс</button></div>`);boom(getComputedStyle($(".prize")).getPropertyValue("--r")||"#fbbf24",40)}
async function openCase(id,fast){if(!S.user)return login();if(busy)return;let c=S.cases.find(x=>x.id==id);busy=true;let d;
 try{d=await post(`/api/cases/${id}/open`)}catch(e){busy=false;return alert(e.message)}
 $("#bal").textContent=money(d.balance);if(fast){busy=false;return prize(d.item,d.index,"Быстрое открытие")}
 modal(`<h2>${c.name}</h2><div class=reelwrap><div class=marker></div><div class=track id=track>${d.reel.map(x=>`<div class="rc ${tier(x.price)}">${img(x)}<span>${nm(x.name)}</span></div>`).join("")}</div></div><button class=save onclick="skip()">Пропустить</button>`);
 const tr=$("#track"),card=tr.children[d.winIndex];let done=false;window.skip=()=>{tr.style.transition="none";fin()};
 const fin=()=>{if(done)return;done=true;busy=false;card.classList.add("win");flash("#fbbf2455");setTimeout(()=>prize(d.item,d.index,"Вы выиграли"),700)};
 setTimeout(()=>{if(done)return;const to=card.offsetLeft+card.offsetWidth*(.12+Math.random()*.76)-tr.parentElement.clientWidth/2;
  tr.style.transition="transform 6.5s cubic-bezier(.08,.7,.12,1)";tr.style.transform=`translateX(${-to}px)`;tr.addEventListener("transitionend",fin,{once:true});setTimeout(fin,7200)},60)}
function pickList(l,chosen,fn,max){return `<div class=pick>${l.map((x,i)=>`<div class="pk ${tier(x.price)} ${chosen.includes(i)?"on":""}" onclick="${fn}(${i})">${img(x)}<span>${nm(x.name)}</span><em>${money(x.price)}</em></div>`).join("")||"<span class=muted>Нет предметов — откройте кейс.</span>"}</div>`}
function renderCt(){let l=inv(),st=csel.reduce((t,i)=>t+l[i].price,0),ok=csel.length>=5&&csel.length<=10&&st>=1&&st<=1000;
 $("#ct").innerHTML=`<p class=muted>Положите от 5 до 10 предметов на сумму $1–$1000 — получите 1 случайный скин. ~35% — окуп (в среднем ×1.5, до ×8), ~65% — слив (×0.3–×0.95). Средняя отдача ≈ 90%.</p><div class=cbar><b>${csel.length}/10 · ${money(st)}</b><button id=cgo onclick=signContract() ${ok?"":"disabled"}>Подписать контракт</button></div>${pickList(l,csel,"pickC")}`}
const pickC=i=>{if(!busy){csel=csel.includes(i)?csel.filter(x=>x!==i):csel.length<10?[...csel,i]:csel;renderCt()}};
async function signContract(){if(busy)return;busy=true;let l=inv(),imgs=csel.map(i=>l[i]);let d;
 try{d=await post("/api/contract",{indexes:csel})}catch(e){busy=false;return alert(e.message)}
 modal(`<h2>Контракт · ${money(d.stake)}</h2><div class="prize spinning" id=slot></div><p class=muted>Крутим…</p>`);let k=0,t=setInterval(()=>{$("#slot").innerHTML=img(imgs[k++%imgs.length]);$("#slot").style.setProperty("--r",["#4b8bff","#9d5cff","#e04bd6","#ef4444","#f5b400"][k%5])},90);
 setTimeout(()=>{clearInterval(t);busy=false;csel=[];flash(d.win?"#22c55e55":"#ef444466");prize(d.item,d.index,`Контракт ×${d.mult.toFixed(2)}`,d.win)},3200)}
function renderUp(){let l=inv(),stake=sel.reduce((t,i)=>t+l[i].price,0),t=tg&&(sug||[]).find(x=>x.name===tg),ch=stake&&t?Math.min(.95,Math.max(.01,stake/t.price)):0;
 $("#up").innerHTML=`<div class=upg><div><h3>Ваши предметы (до 4) · ${money(stake)}</h3>${pickList(l,sel,"pickMine")}</div>
 <div class=wheelbox><div class=wheel id=wheel style="--p:${ch*100}"><div class=arrow id=arrow></div><div class=wc id=wc>${ch?(ch*100).toFixed(1)+"%":"—"}</div></div><div class=verdict id=vd></div><button id=go onclick=upgrade() ${ch?"":"disabled"}>Апгрейд</button>
 <div class=chips>${[1.5,2,3,5,10].map(m=>`<button class="chip ${mult===m?"on":""}" onclick="suggest(${100/m},${m})">x${m}</button>`).join("")}</div>
 <div class=tune><input id=want type=number min=1 max=95 placeholder="Свой шанс, %"><button onclick="suggest(+$('#want').value)">Подобрать</button></div></div>
 <div><h3>Цель${t?" · "+money(t.price):""}</h3>${stake?pickListG():"<span class=muted>Выберите свои предметы.</span>"}</div></div>`}
function pickListG(){let g=sug||[];return g.length?`<div class=pick>${g.map(x=>`<div class="pk ${tier(x.price)} ${x.name===tg?"on":""}" data-n="${esc(x.name)}" onclick="pickGoal(this.dataset.n)">${img(x)}<span>${nm(x.name)}</span><em>${money(x.price)} · ${Math.min(95,sel.reduce((t,i)=>t+inv()[i].price,0)/x.price*100).toFixed(0)}%</em></div>`).join("")}</div>`:"<span class=muted>Нажмите x1.5 … x10 или введите свой шанс — покажу подходящие скины с маркета.</span>"}
const pickMine=i=>{if(busy)return;sel=sel.includes(i)?sel.filter(x=>x!==i):sel.length<4?[...sel,i]:sel;tg=null;sug=null;mult=null;renderUp()},pickGoal=n=>{if(!busy){tg=n;renderUp()}};
async function suggest(c,m){let st=sel.reduce((t,i)=>t+inv()[i].price,0);if(!st||!c)return alert("Выберите предметы и шанс");try{let x=await api(`/api/suggest?stake=${st}&chance=${c}`);sug=x.items;tg=null;mult=m||null;renderUp();if(!m)$("#want").value=c}catch(e){alert(e.message)}}
async function upgrade(){if(busy||!sel.length||!tg)return;busy=true;$("#go").disabled=true;let d;
 try{d=await post("/api/upgrade",{indexes:sel,target:tg})}catch(e){busy=false;renderUp();return alert(e.message)}
 const ar=$("#arrow"),wc=$("#wc"),wh=$("#wheel");wh.classList.add("spin");wc.textContent="…";ar.getBoundingClientRect();ar.style.transition="transform 5.5s cubic-bezier(.12,.6,.08,1)";ar.style.transform=`rotate(${360*6+d.roll*360}deg)`;
 setTimeout(()=>{wh.classList.remove("spin");wh.classList.add(d.win?"won":"lost");wc.textContent=d.win?"✔":"✖";wc.className="wc "+(d.win?"okk":"bad");
  $("#vd").className="verdict "+(d.win?"okk":"bad");$("#vd").textContent=d.win?WIN_TXT:LOSE_TXT;flash(d.win?"#22c55e55":"#ef444466");if(d.win)boom("#22c55e",70);
  setTimeout(()=>{busy=false;sel=[];tg=null;sug=null;mult=null;load();if(d.win)load().then(()=>prize(d.target,inv().length-1,"Апгрейд удался!",true))},d.win?1500:3500)},5700)}
function login(){modal(`<h2>Вход</h2>${CFG.steamEnabled?`<a class="steambtn" href="/auth/steam">🎮 Войти через Steam</a><p class=muted style="margin:14px 0 6px">или тестовый вход</p>`:`<p class=muted>Steam-вход выключен (нет STEAM_API_KEY на сервере) — используйте тестовый вход.</p>`}<input id=u placeholder=Логин style="padding:12px;width:100%"><input id=p type=password placeholder=Пароль style="padding:12px;width:100%;margin:8px 0"><button onclick=doLogin()>Войти</button><p class=muted>demo / demo</p>`)}
async function doLogin(){try{await post("/api/login",{username:$("#u").value,password:$("#p").value});closeM();load()}catch(e){alert(e.message)}}
async function admin(){let d=await api("/api/admin");$("#adminbox").innerHTML=`<h3>Кейсы</h3>`+d.cases.map(c=>`<div class=row><span>#${c.id}</span><input id="n-${c.id}" value="${esc(c.name)}"><input id="p-${c.id}" type=number step=0.01 value="${c.price}" title="Цена $"><input id="w-${c.id}" type=number ${c.winChance==null?"disabled placeholder=—":`value="${(c.winChance*100).toFixed(0)}"`} title="Шанс окупа %"><button class=save data-case=${c.id}>Сохранить</button></div>`).join("")+d.cases.filter(c=>c.fixed.length).map(c=>`<h3>Шансы: ${c.name}</h3>`+c.fixed.map((i,k)=>`<div class=row><span>${i.name}</span><input id="o-${c.id}-${k}" value="${i.odds}"><button class=save data-c=${c.id} data-k=${k} data-n="${esc(i.name)}">Сохранить</button></div>`).join("")).join("")}
$("#adminbox").onclick=async e=>{let b=e.target.closest("button");if(!b)return;try{if(b.dataset.case){let i=b.dataset.case;await post("/api/admin/case",{id:i,name:$("#n-"+i).value,price:$("#p-"+i).value,winChance:$("#w-"+i).value})}else if(b.dataset.c)await post("/api/admin/odds",{caseId:b.dataset.c,name:b.dataset.n,odds:+$(`#o-${b.dataset.c}-${b.dataset.k}`).value});else return;flash("#22c55e33");load()}catch(x){alert(x.message)}};
async function resetOdds(){await post("/api/admin/reset");load()}
$("#q").oninput=draw;$("#login").onclick=()=>S?.user?post("/api/logout").then(load):login();
function route2(){route();if(location.hash==="#leaderboard")loadLB()}
addEventListener("hashchange",route2);
load().then(()=>{loadStats();loadTicker();loadLB();route2()});
