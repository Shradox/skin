let S,sel=null,tg=null,busy=false;const $=x=>document.querySelector(x),money=x=>"$"+(+x).toFixed(2);
const tier=p=>p>=100?"gold":p>=25?"red":p>=8?"pink":p>=2?"purple":p>=.5?"blue":"gray";
const PH="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><text x="50" y="40" font-size="32" text-anchor="middle" fill="#ffffff33">★</text></svg>');
const img=x=>`<img src="${x.img||PH}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PH}'">`;
const nm=n=>{let m=n.match(/^(.*) \(([^)]+)\)$/);return m?`<b>${m[1]}</b><small>${m[2]}</small>`:`<b>${n}</b>`};
async function api(u,o={}){let r=await fetch(u,{headers:{"Content-Type":"application/json"},...o}),d=await r.json();if(!r.ok)throw Error(d.error||"Ошибка");return d}
const modal=h=>{$("#modal").hidden=false;$("#m").innerHTML=h};function closeM(){if(!busy)$("#modal").hidden=true}
async function load(){S=await api("/api/state");$("#bal").textContent=S.user?money(S.user.balance):"$0.00";$("#login").textContent=S.user?S.user.username:"Войти";draw();if(S.user?.role==="admin"){$("#admin").hidden=false;admin()}}
const best=c=>[...c.items].sort((a,b)=>b.price-a.price).find(x=>x.img)||c.items[0];
function draw(){let q=$("#q").value.toLowerCase();
 $("#casesGrid").innerHTML=S.cases.filter(c=>c.name.toLowerCase().includes(q)).map(c=>`<article class=card><div class=art onclick="preview(${c.id})" style=cursor:pointer>${img(best(c))}</div><div class=name>${c.name}</div><div class=meta><span>${c.items.length} предметов</span><b>${money(c.price)}</b></div><button class=open onclick="openCase(${c.id})">Открыть</button><a class=lnk onclick="preview(${c.id})">Что внутри</a></article>`).join("");
 let inv=S.user?.inventory||[];
 $("#invgrid").innerHTML=inv.length?inv.map(x=>`<div class="item ${tier(x.price)}"><div class=art>${img(x)}</div><div class=name>${nm(x.name)}</div><div class=price>${money(x.price)}</div></div>`).join(""):"<span class=muted>Войдите и откройте кейс.</span>";
 if(sel!==null&&!inv[sel])sel=null;renderUp()}
function preview(id){let c=S.cases.find(x=>x.id==id),t=c.items.reduce((s,x)=>s+x.odds,0),rtp=c.items.reduce((s,x)=>s+x.odds/t*x.price,0)/c.price*100;
 modal(`<h2>${c.name} · ${money(c.price)}</h2><div class=plist>${[...c.items].sort((a,b)=>a.price-b.price).map(x=>`<div class="prow ${tier(x.price)}">${img(x)}<span>${nm(x.name)}</span><em>${(x.odds/t*100).toFixed(2)}%</em><strong>${money(x.price)}${x.live?"":" ~"}</strong></div>`).join("")}</div><p class=muted>Средняя отдача по текущим ценам: ${rtp.toFixed(0)}%</p><button onclick="closeM();openCase(${c.id})">Открыть за ${money(c.price)}</button>`)}
async function openCase(id){if(!S.user)return login();if(busy)return;let c=S.cases.find(x=>x.id==id);busy=true;let d;
 try{d=await api("/api/cases/"+id+"/open",{method:"POST"})}catch(e){busy=false;return alert(e.message)}
 modal(`<h2>${c.name}</h2><div class=reelwrap><div class=marker></div><div class=track id=track>${d.reel.map(x=>`<div class="rc ${tier(x.price)}">${img(x)}<span>${nm(x.name)}</span></div>`).join("")}</div></div>`);
 $("#bal").textContent=money(d.balance);
 const tr=$("#track"),card=tr.children[d.winIndex];let done=false;
 const fin=()=>{if(done)return;done=true;busy=false;card.classList.add("win");setTimeout(()=>{modal(`<h2>Вы выиграли</h2><div class="prize ${tier(d.item.price)}">${img(d.item)}</div><h3>${nm(d.item.name)}</h3><p class=price>${money(d.item.price)}</p><button onclick=closeM()>Забрать</button>`);load()},900)};
 setTimeout(()=>{const to=card.offsetLeft+card.offsetWidth*(.12+Math.random()*.76)-tr.parentElement.clientWidth/2;
  tr.style.transition="transform 6.5s cubic-bezier(.08,.7,.12,1)";tr.style.transform=`translateX(${-to}px)`;tr.addEventListener("transitionend",fin,{once:true});setTimeout(fin,7200)},60)}
function renderUp(){let inv=S.user?.inventory||[];if(!inv.length){$("#up").innerHTML="<span class=muted>Нет предметов — откройте кейс.</span>";return}
 let it=inv[sel],all=new Map();S.cases.forEach(c=>c.items.forEach(x=>all.set(x.name,x)));
 let goals=[...all.values()].filter(x=>!it||x.price>it.price).sort((a,b)=>a.price-b.price).slice(0,12),t=tg&&all.get(tg);if(t&&it&&t.price<=it.price)t=tg=null;
 let ch=it&&t?Math.min(.95,Math.max(.01,it.price/t.price)):0;
 $("#up").innerHTML=`<div class=upg><div><h3>Ваш предмет</h3><div class=pick>${inv.map((x,i)=>`<div class="pk ${tier(x.price)} ${i===sel?"on":""}" onclick="pickMine(${i})">${img(x)}<span>${nm(x.name)}</span><em>${money(x.price)}</em></div>`).join("")}</div></div>
 <div class=wheelbox><div class=wheel style="--p:${ch*100}"><div class=arrow id=arrow></div><div class=wc id=wc>${ch?(ch*100).toFixed(1)+"%":"—"}</div></div><button id=go onclick=upgrade() ${ch?"":"disabled"}>Апгрейд</button></div>
 <div><h3>Цель</h3><div class=pick>${it?goals.map(x=>`<div class="pk ${tier(x.price)} ${x.name===tg?"on":""}" data-n="${x.name.replace(/"/g,"&quot;")}" onclick="pickGoal(this.dataset.n)">${img(x)}<span>${nm(x.name)}</span><em>${money(x.price)}</em></div>`).join("")||"<span class=muted>Нет предметов дороже.</span>":"<span class=muted>Сначала выберите свой предмет.</span>"}</div></div></div>`}
const pickMine=i=>{if(!busy){sel=i;tg=null;renderUp()}},pickGoal=n=>{if(!busy){tg=n;renderUp()}};
async function upgrade(){if(busy||sel===null||!tg)return;busy=true;$("#go").disabled=true;let d;
 try{d=await api("/api/upgrade",{method:"POST",body:JSON.stringify({index:sel,target:tg})})}catch(e){busy=false;renderUp();return alert(e.message)}
 const ar=$("#arrow"),wc=$("#wc");wc.textContent="…";ar.getBoundingClientRect();ar.style.transition="transform 5.5s cubic-bezier(.12,.6,.08,1)";ar.style.transform=`rotate(${360*6+d.roll*360}deg)`;
 setTimeout(()=>{wc.textContent=d.win?"✔ УСПЕХ":"✖ НЕУДАЧА";wc.className="wc "+(d.win?"okk":"bad");setTimeout(()=>{busy=false;sel=null;tg=null;load()},1800)},5700)}
function login(){modal(`<h2>Вход</h2><input id=u placeholder=Логин style="padding:12px;width:100%"><input id=p type=password placeholder=Пароль style="padding:12px;width:100%;margin:8px 0"><button onclick=doLogin()>Войти</button><p class=muted>demo / demo</p>`)}
async function doLogin(){try{await api("/api/login",{method:"POST",body:JSON.stringify({username:$("#u").value,password:$("#p").value})});closeM();load()}catch(e){alert(e.message)}}
async function admin(){let d=await api("/api/admin");$("#adminbox").innerHTML=d.cases.map(c=>`<h3>${c.name}</h3>`+c.items.map((i,k)=>`<div class=row><span>${i.name}</span><input id="o-${c.id}-${k}" value="${i.odds}"><button class=save data-c=${c.id} data-k=${k} data-n="${i.name.replace(/"/g,"&quot;")}">Сохранить</button></div>`).join("")).join("")}
$("#adminbox").onclick=async e=>{let b=e.target.closest("button[data-c]");if(!b)return;await api("/api/admin/odds",{method:"POST",body:JSON.stringify({caseId:b.dataset.c,name:b.dataset.n,odds:+$(`#o-${b.dataset.c}-${b.dataset.k}`).value})});load()};
async function resetOdds(){await api("/api/admin/reset",{method:"POST"});load()}
$("#q").oninput=draw;$("#login").onclick=()=>S?.user?api("/api/logout",{method:"POST"}).then(load):login();load();
