const $ = (id) => document.getElementById(id);
const state = { token: localStorage.getItem('presenze_token') || '', user: null };

function apiUrl(){
  const url = window.APP_CONFIG?.API_URL || '';
  if (!url || url.includes('PASTE_')) throw new Error('Configura API_URL in config.js');
  return url;
}
async function api(action, data={}){
  const payload = { action, token: state.token, ...data };
  const r = await fetch(apiUrl(), { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Errore');
  return j;
}
function show(id){ $(id).classList.remove('hidden'); }
function hide(id){ $(id).classList.add('hidden'); }
function isoDate(d=new Date()){ const z=new Date(d.getTime()-d.getTimezoneOffset()*60000); return z.toISOString().slice(0,10); }
function hhmmNow(){ return new Date().toTimeString().slice(0,5); }
function minutes(v){ if(!v) return null; const [h,m]=v.split(':').map(Number); return h*60+m; }
function totalMinutes(){
  let t=0;
  [[ $('in1').value,$('out1').value ],[$('in2').value,$('out2').value ]].forEach(([a,b])=>{ if(a&&b){ let x=minutes(b)-minutes(a); if(x<0)x+=1440; t+=x; }});
  return t;
}
function fmtMin(m){ return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`; }
function updateTotal(){ $('dailyTotal').textContent=fmtMin(totalMinutes()); }
function setMessage(el, text, isError=false){ el.textContent=text; el.classList.remove('hidden'); el.style.background=isError?'#ffe6e6':'#edf6ff'; el.style.color=isError?'#8d1616':'#164f7a'; }
function clearMessage(el){ el.classList.add('hidden'); el.textContent=''; }

async function login(){
  clearMessage($('loginError'));
  try{
    const res=await api('login',{ employeeCode:$('employeeCode').value.trim(), pin:$('pin').value.trim() });
    state.token=res.token; state.user=res.user; localStorage.setItem('presenze_token',state.token); renderAuthenticated();
  }catch(e){ setMessage($('loginError'), e.message, true); }
}
async function bootstrap(){
  if(!state.token) return renderLogin();
  try{ const res=await api('me'); state.user=res.user; renderAuthenticated(); }
  catch(e){ logout(); }
}
function logout(){ localStorage.removeItem('presenze_token'); state.token=''; state.user=null; renderLogin(); }
function renderLogin(){ show('loginView'); hide('workerView'); hide('adminView'); hide('logoutBtn'); }
async function renderAuthenticated(){
  hide('loginView'); show('logoutBtn');
  if(state.user.role==='RESPONSABILE' || state.user.role==='ADMIN'){ hide('workerView'); show('adminView'); await loadAdminBootstrap(); }
  else { hide('adminView'); show('workerView'); await loadWorker(); }
}
async function loadWorker(){
  const d=new Date();
  $('todayLabel').textContent = d.toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).toUpperCase();
  $('welcomeTitle').textContent=`Ciao ${state.user.firstName || state.user.name || ''}`.trim();
  $('workerMeta').textContent=[state.user.cdc,state.user.appalto,state.user.sede].filter(Boolean).join(' · ');
  const r=await api('getDay',{date:isoDate()});
  const p=r.presence;
  ['in1','out1','in2','out2','notes'].forEach(k=>$(k).value=p?.[k]||'');
  $('confirmCheck').checked=!!p;
  $('statusBadge').textContent=p?'Compilato':'Da compilare'; $('statusBadge').classList.toggle('ok',!!p);
  updateTotal(); await loadMonth();
}
async function savePresence(){
  clearMessage($('saveMessage'));
  if(!$('confirmCheck').checked) return setMessage($('saveMessage'),'Devi confermare la dichiarazione prima di salvare.',true);
  if(!$('in1').value || !$('out1').value) return setMessage($('saveMessage'),'Inserisci almeno entrata e uscita della 1ª fascia.',true);
  try{
    await api('savePresence',{date:isoDate(),in1:$('in1').value,out1:$('out1').value,in2:$('in2').value,out2:$('out2').value,notes:$('notes').value.trim()});
    setMessage($('saveMessage'),'Presenza salvata correttamente.');
    $('statusBadge').textContent='Compilato'; $('statusBadge').classList.add('ok'); await loadMonth();
  }catch(e){ setMessage($('saveMessage'),e.message,true); }
}
async function loadMonth(){
  const d=new Date(); const r=await api('getMonth',{year:d.getFullYear(),month:d.getMonth()+1});
  const el=$('monthList'); el.innerHTML='';
  r.days.forEach(x=>{ const row=document.createElement('div'); row.className='month-item'; row.innerHTML=`<span><span class="day">${String(x.day).padStart(2,'0')}</span> ${x.weekday||''}</span><span>${x.present?`✓ ${x.total||''}`:'—'}</span>`; el.appendChild(row); });
}

async function loadAdminBootstrap(){
  $('adminMeta').textContent=state.user.name || state.user.employeeCode;
  $('adminDate').value=isoDate(); $('pdfMonth').value=isoDate().slice(0,7);
  const r=await api('adminBootstrap');
  $('adminCdc').innerHTML='<option value="">Tutti</option>'+r.cdc.map(x=>`<option>${x}</option>`).join('');
  $('pdfWorker').innerHTML=r.workers.map(w=>`<option value="${w.employeeCode}">${w.name} — ${w.cdc||''}</option>`).join('');
  await loadAdmin();
}
async function loadAdmin(){
  try{
    const r=await api('adminDay',{date:$('adminDate').value,cdc:$('adminCdc').value});
    $('adminSummary').textContent=`Presenti: ${r.summary.present} · Mancanti: ${r.summary.missing} · Totale lavoratori: ${r.summary.total}`;
    $('adminRows').innerHTML=r.rows.map(x=>`<tr><td>${x.name}</td><td>${x.cdc||''}</td><td>${x.present?`${x.in1||''}-${x.out1||''}${x.in2?` / ${x.in2}-${x.out2}`:''}`:'—'}</td><td>${x.total||'—'}</td><td class="${x.present?'status-ok':'status-miss'}">${x.present?'Compilato':'Manca'}</td><td>${x.present&&!x.approved?`<button class="ghost" onclick="approve('${x.employeeCode}','${$('adminDate').value}')">Approva</button>`:(x.approved?'✓ Approvato':'')}</td></tr>`).join('');
  }catch(e){ $('adminSummary').textContent=e.message; }
}
async function approve(employeeCode,date){ await api('approve',{employeeCode,date}); await loadAdmin(); }
window.approve=approve;
async function generatePdf(){
  clearMessage($('pdfMessage'));
  try{
    const r=await api('generatePdf',{employeeCode:$('pdfWorker').value,month:$('pdfMonth').value});
    setMessage($('pdfMessage'),`PDF creato: ${r.fileName}`);
    if(r.url) window.open(r.url,'_blank');
  }catch(e){ setMessage($('pdfMessage'),e.message,true); }
}

document.addEventListener('DOMContentLoaded',()=>{
  $('loginBtn').addEventListener('click',login); $('logoutBtn').addEventListener('click',logout); $('saveBtn').addEventListener('click',savePresence); $('refreshMonthBtn').addEventListener('click',loadMonth); $('loadAdminBtn').addEventListener('click',loadAdmin); $('pdfBtn').addEventListener('click',generatePdf);
  ['in1','out1','in2','out2'].forEach(id=>$(id).addEventListener('input',updateTotal));
  document.querySelectorAll('[data-fill]').forEach(b=>b.addEventListener('click',()=>{ const id=b.dataset.fill.split('-').slice(1).join('-'); $(id).value=hhmmNow(); updateTotal(); }));
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  bootstrap();
});
