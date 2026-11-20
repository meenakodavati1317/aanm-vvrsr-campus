(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;$('#toasts').append(t);setTimeout(()=>t.remove(),2800)}
const H=s=>{let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const rnd=(k,a,b)=>a+H(k)%(b-a+1);
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const r0=Math.round;
const inits=n=>n.split(' ').filter(x=>!/^(Dr\.|Prof\.)$/.test(x)).map(x=>x[0]).slice(0,2).join('');
const chip=(t,c='acc')=>`<span class="chip ${c}">${esc(t)}</span>`;
const attChip=p=>p<75?chip('Low','bad'):p<85?chip('Fair','warn'):chip('Good','good');
const grade=p=>p>=85?'O':p>=75?'A+':p>=65?'A':p>=55?'B':'C';
const DAYS=['Mon','Tue','Wed','Thu','Fri'],SLOTS=['9:00','10:00','11:15','12:15','2:00'],MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ---------- data (loaded from the server after sign in) ---------- */
let TOKEN=null;
try{TOKEN=localStorage.getItem('aav_token')}catch(e){}
const saveToken=t=>{TOKEN=t;try{t?localStorage.setItem('aav_token',t):localStorage.removeItem('aav_token')}catch(e){}};
async function api(method,url,body,isForm){
  const h={};if(TOKEN)h.Authorization='Bearer '+TOKEN;
  let b;if(isForm)b=body;else if(body!==undefined){h['Content-Type']='application/json';b=JSON.stringify(body)}
  let r;try{r=await fetch('/api'+url,{method,headers:h,body:b})}catch(e){throw new Error('Cannot reach the server. Is it running?')}
  let d=null;try{d=await r.json()}catch(e){}
  if(!r.ok){const e=new Error((d&&d.message)||'Something went wrong ('+r.status+')');e.code=d&&d.code;e.status=r.status;throw e}
  return d;
}
const fail=e=>toast(e.message||'Something went wrong');
let depts=[],subjects=[],students=[],faculty=[],admins=[],notices=[],requests=[],log=[],media=[],HIST=[],attMap={},markMap={};
const SRV={classInfo:null};
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const addLog=(who,m)=>{log.unshift([new Date().toTimeString().slice(0,5),who,m])};
function load(d){
  depts=d.depts;subjects=d.subjects;students=d.students;faculty=d.faculty;admins=d.admins;notices=d.notices;requests=d.requests;log=d.log;media=d.media;
  HIST=d.history;attMap=d.att;markMap=d.marks;savedToday=d.savedToday;SRV.classInfo=d.classInfo;ME[d.me.role]=d.me.id;ME.name=d.me.name;
}
const buildings={
 Library:{x:60,y:50,w:150,h:90,info:['Open','8 am to 8 pm'],floors:'3',note:'Silent reading hall on floor 2. 42,000 books, 60 seats.'},
 'Main Block':{x:260,y:40,w:200,h:110,info:['Open','8 am to 5 pm'],floors:'4',note:'Admin office, exam cell, and classrooms A-101 to A-410.'},
 'CS Lab':{x:520,y:60,w:150,h:90,info:['Open','9 am to 6 pm'],floors:'2',note:'120 workstations. Booking needed after 4 pm.'},
 Canteen:{x:80,y:200,w:130,h:80,info:['Open','8 am to 7 pm'],floors:'1',note:'Veg and non-veg counters. UPI accepted.'},
 Auditorium:{x:280,y:210,w:170,h:90,info:['Event today','Tech Fest rehearsal, 4 pm'],floors:'1',note:'Seats 600. Booked by the Cultural Club until 6 pm.'},
 Sports:{x:520,y:210,w:150,h:90,info:['Open','6 am to 7 pm'],floors:'Ground',note:'Basketball, badminton and a 400 m track.'}};

/* derived academic data (deterministic; admin and faculty edits override) */

const subjOf=(d,s)=>subjects.filter(x=>x.dept===d&&x.sem===s);
const K=(sid,sub)=>sid+'|'+sub;
const attOf=(sid,sub)=>attMap[K(sid,sub)]??0;
const mkOf=(sid,sub)=>markMap[K(sid,sub)]??{a:0,b:0,c:0};
const tot=m=>m.a+m.b+m.c;
const avgAtt=(st,sem=st.sem)=>mean(subjOf(st.dept,sem).map(x=>attOf(st.id,x.id)));
const avgMk=(st,sem=st.sem)=>mean(subjOf(st.dept,sem).map(x=>tot(mkOf(st.id,x.id))))/50*100;
const sgpa=(st,sem)=>+(5.2+avgMk(st,sem)/100*4.6).toFixed(1);
const doneSems=st=>Array.from({length:st.sem-1},(_,i)=>i+1);
const cgpa=st=>{const d=doneSems(st);return d.length?+mean(d.map(s=>sgpa(st,s))).toFixed(2):0};
const facultyOf=sid=>{const f=faculty.find(f=>f.subs.includes(sid));if(f)return f;const d=subjects.find(x=>x.id===sid)?.dept,pool=faculty.filter(x=>x.dept===d);return pool.length?pool[H(sid)%pool.length]:null};
const subName=id=>subjects.find(x=>x.id===id)?.name||id;

/* media */
const artCache={};
function art(kind,hue){
  const k=kind+hue;if(artCache[k])return artCache[k];
  const a=`hsl(${hue},55%,22%)`,b=`hsl(${(hue+45)%360},70%,52%)`;let g='';
  if(kind==='stage'){for(let i=0;i<5;i++){const x=80+i*120;g+=`<polygon points="${x},0 ${x-60},330 ${x+60},330" fill="#fff" opacity=".13"/>`}for(let i=0;i<16;i++)g+=`<circle cx="${20+i*40}" cy="${368+(i%3)*8}" r="22" fill="#12082b" opacity=".85"/>`}
  else if(kind==='sports'){for(let i=0;i<4;i++)g+=`<ellipse cx="320" cy="260" rx="${280-i*55}" ry="${130-i*25}" fill="none" stroke="#fff" stroke-width="3" opacity=".35"/>`;g+=`<circle cx="470" cy="110" r="36" fill="#fff" opacity=".9"/><path d="M434 110h72M470 74v72" stroke="${a}" stroke-width="3"/>`}
  else if(kind==='tech'){for(let r=0;r<5;r++)for(let c=0;c<9;c++)g+=`<circle cx="${40+c*70+(r%2)*35}" cy="${50+r*70}" r="${3+(c*r)%4}" fill="#fff" opacity=".5"/>`;g+=`<path d="M0 300h180v-60h120v90h200v-50h140" stroke="#fff" stroke-width="4" fill="none" opacity=".55"/><rect x="250" y="130" width="140" height="90" rx="10" fill="none" stroke="#fff" stroke-width="4" opacity=".8"/>`}
  else if(kind==='culture'){for(let i=0;i<12;i++)g+=`<ellipse cx="320" cy="200" rx="40" ry="130" fill="#fff" opacity=".16" transform="rotate(${i*30} 320 200)"/>`;g+=`<circle cx="320" cy="200" r="46" fill="#fff" opacity=".85"/><circle cx="320" cy="200" r="22" fill="${b}"/>`}
  else if(kind==='grad'){g=`<polygon points="320,90 500,170 320,250 140,170" fill="#fff" opacity=".92"/><path d="M220 210v70c60 40 140 40 200 0v-70l-100 50z" fill="#fff" opacity=".7"/><path d="M500 170v90" stroke="#fff" stroke-width="5"/><circle cx="500" cy="270" r="9" fill="#fff"/>`}
  else{for(let r=0;r<3;r++)for(let c=0;c<9;c++)g+=`<rect x="${60+c*58}" y="${230+r*45}" width="40" height="28" rx="8" fill="#fff" opacity="${.2+r*.12}"/>`;g+=`<rect x="250" y="80" width="140" height="90" rx="8" fill="#fff" opacity=".85"/><rect x="305" y="170" width="30" height="40" fill="#fff" opacity=".6"/>`}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="400" fill="url(#g)"/>${g}</svg>`;
  return artCache[k]='data:image/svg+xml;utf8,'+encodeURIComponent(svg);
}
/* gallery items come from the server */
const upcoming=[{id:'u1',n:'Inter-college Hackathon',d:6,v:'CS Lab, 9 am'},{id:'u2',n:'Annual Sports Day',d:15,v:'Sports ground, 8 am'},{id:'u3',n:'Rang Utsav: Cultural Night',d:27,v:'Auditorium, 5 pm'},{id:'u4',n:'Convocation 2026',d:41,v:'Main lawn, 10 am'}];
const rsvp=new Set();
const dayLabel=n=>new Date(Date.now()+n*864e5).toLocaleDateString('en-IN',{day:'numeric',month:'short'});

/* ---------- classes, department art, history helpers ---------- */
const DK={CSE:'tech',ECE:'stage',ME:'sports'},DH={CSE:262,ECE:178,ME:28};
const deptArt=d=>art(DK[d]||'culture',DH[d]??H(d)%360);
const deptChip=d=>`<span class="chip ${DH[d]!==undefined?'d-'+d:'acc'}">${esc(d)}</span>`;
const deptColor=d=>DH[d]!==undefined?`var(--d-${d})`:'var(--accent)';
function classStats(key){
  const [d,sm]=key.split('-'),sem=+sm,cl=students.filter(s=>s.dept===d&&s.sem===sem);
  return {key,d,sem,cl,att:r0(mean(cl.map(s=>avgAtt(s)))),ia:r0(mean(cl.map(s=>avgMk(s)))),ct:faculty.find(f=>f.ct===key)};
}
function classInfo(st){
  const c=SRV.classInfo||{key:st.dept+'-'+st.sem,n:0,rank:0,ctId:null};
  return {key:c.key,n:c.n,ct:faculty.find(f=>f.id===c.ctId),rank:c.rank};
}
function classBanner(f){
  const c=classStats(f.ct);
  return `<div class="card cls mb"><img class="banner" src="${deptArt(c.d)}" alt=""><div class="body"><div class="row-flex" style="justify-content:space-between"><div><b style="font-family:var(--font-display);font-size:18px">You are the class teacher of ${c.d} Semester ${c.sem}</b><div style="color:var(--muted)">${c.cl.length} students · ${c.att}% attendance · ${c.ia}% internal average</div></div><button class="btn sm" data-act="fclassgo">Open my class</button></div></div></div>`;
}
function rosterRows(list){
  return list.map(s=>{const a=r0(avgAtt(s));return `<tr><td>${esc(s.roll)}</td><td><b>${esc(s.name)}</b></td><td class="num">${a}% ${a<75?chip('Low','bad'):''}</td><td class="num">${r0(avgMk(s))}%</td><td class="num">${s.sem>1?cgpa(s):'-'}</td><td class="acts"><button class="btn ghost sm" data-act="stuDetail" data-id="${s.id}">View</button></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">No students match.</td></tr>';
}
const rosterTable=list=>`<div class="roster"><table class="tbl"><thead><tr><th>Roll no.</th><th>Name</th><th>Attendance</th><th>Internals</th><th>CGPA</th><th></th></tr></thead><tbody>${rosterRows(list)}</tbody></table></div>`;
const filterCls=cl=>{const q=S.cq.toLowerCase();return cl.filter(s=>(!q||(s.name+s.roll).toLowerCase().includes(q))&&(!S.low||avgAtt(s)<75))};

/* past and present: the latest year is computed live from current data, earlier years are sample history */
const YEARS=['2021-22','2022-23','2023-24','2024-25','2025-26'];
const MET={pass:['First-class share (internals 70%+)','%'],att:['Attendance','%'],ia:['Internal marks','%'],cgpa:['Average CGPA','']};
function presentMetrics(d){
  const list=students.filter(s=>!d||s.dept===d),up=list.filter(s=>s.sem>1);
  return {att:r0(mean(list.map(s=>avgAtt(s)))),ia:r0(mean(list.map(s=>avgMk(s)))),pass:r0(list.filter(s=>avgMk(s)>=70).length/Math.max(list.length,1)*100),cgpa:+mean(up.map(s=>cgpa(s))).toFixed(2),n:list.length};
}
function histOf(d,yi,p){
  if(yi===4)return {...p,placed:null};
  const rows=HIST.filter(h=>h.year===YEARS[yi]&&(!d||h.dept===d));
  if(!rows.length)return {...p,placed:0};
  const av=k=>mean(rows.map(r=>r[k]));
  return {att:r0(av('att')),ia:r0(av('ia')),pass:r0(av('pass')),cgpa:+av('cgpa').toFixed(2),n:rows.reduce((a,r)=>a+r.n,0),placed:r0(av('placed'))};
}
function multiLine(series,labels,lo,hi,sel){
  const W=480,Hh=240,l=40,r=18,t=18,b=30;
  const x=i=>l+i*(W-l-r)/(labels.length-1),y=v=>t+(hi-Math.min(hi,Math.max(lo,v)))/(hi-lo)*(Hh-t-b);
  let g='';
  for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;g+=`<line x1="${l}" x2="${W-r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${l-6}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted)">${+v.toFixed(1)}</text>`}
  const selLine=`<line x1="${x(sel)}" x2="${x(sel)}" y1="${t}" y2="${Hh-b}" stroke="var(--accent)" stroke-dasharray="4 4" opacity=".7"/>`;
  const lines=series.map(s=>`<polyline points="${s.vals.map((v,i)=>x(i)+','+y(v)).join(' ')}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${s.vals.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="${i===sel?6:3.5}" fill="var(--surface)" stroke="${s.color}" stroke-width="2.5"/>`).join('')}<text x="${x(sel)}" y="${y(s.vals[sel])-11}" text-anchor="middle" font-size="11" font-weight="700" fill="${s.color}">${s.vals[sel]}</text>`).join('');
  const xl=labels.map((lb,i)=>`<text x="${x(i)}" y="${Hh-8}" text-anchor="middle" font-size="11" fill="${i===sel?'var(--accent)':'var(--muted)'}" font-weight="${i===sel?700:400}">${lb.slice(2)}</text>`).join('');
  return `<svg class="line-svg" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Trend by year">${g}${selLine}${lines}${xl}</svg><div class="legend-line">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}

/* state */
let role='student',tab='sdash';
const ME={student:null,faculty:null,admin:null,name:''};
const S={dept:'CSE',sem:6,sub:null,ac:null,q:'',fd:'',fs:'',mt:'all',mev:'',my:'',nf:'All',rd:'All',pd:'CSE',pg:0,hy:3,hm:'pass',cd:'',cq:'',low:false};
let sess={},savedToday={};
const curSt=()=>students.find(x=>x.id===ME.student);
const curFa=()=>faculty.find(x=>x.id===ME.faculty);
const roleInfo={student:{label:'Roll number or email',val:'AV23CSE017'},faculty:{label:'Faculty ID or email',val:'FAC-0231'},admin:{label:'Admin ID or email',val:'ADM-0007'}};
const tabsFor={
 student:[['sdash','Dashboard'],['profile','My profile'],['acad','Semesters 1 to 6'],['tt','Timetable'],['notices','Announcements'],['events','Events & media'],['map','Campus map']],
 faculty:[['fdash','My subjects'],['fclass','My class'],['fstu','My students'],['att','Attendance'],['marks','Internal marks'],['perf','Performance'],['tt','Timetable'],['notices','Notices'],['events','Events & media']],
 admin:[['adash','Dashboard'],['aapp','Approvals'],['aclass','Classes'],['astu','Students'],['afac','Faculty'],['adept','Departments'],['att','Attendance'],['marks','Internal marks'],['notices','Notices'],['media','Events & media'],['ahist','Past & present'],['reports','Reports']]};

/* ---------- login + sign up ---------- */
let loginHTML=$('#loginCard').innerHTML;
function setRole(r){
  role=r;const i=['student','faculty','admin'].indexOf(r);
  $('#pill').style.transform=`translateX(${i*100}%)`;
  $$('#roleTabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.role===r));
  $('#uidLabel').textContent=roleInfo[r].label;$('#uid').value=roleInfo[r].val;
}

function bindLogin(){
  $$('#roleTabs button').forEach(b=>b.onclick=()=>{setRole(b.dataset.role);$('#loginErr').hidden=true});
  setRole(role);
  $('#loginForm').onsubmit=async e=>{
    e.preventDefault();const box=$('#loginErr'),btn=$('#loginForm button[type=submit]');btn.disabled=true;
    try{
      const r=await api('POST','/auth/login',{role,loginId:$('#uid').value,password:$('#pw').value});
      saveToken(r.token);await enter();box.hidden=true;
    }catch(err){
      saveToken(null);box.hidden=false;box.className='err'+(err.code==='PENDING'?' warn':'');box.textContent=err.message;
    }finally{btn.disabled=false}
  };
  $('#regBtn').onclick=()=>showSignup(role);
}
function restoreLogin(prefill){
  const c=$('#loginCard');c.className='glass';c.innerHTML=loginHTML;bindLogin();
  if(prefill){$('#uid').value=prefill;$('#pw').value=''}
}
function showSignup(sr,carry={}){
  const card=$('#loginCard');card.className='glass wide';
  const dOpts=depts.map(d=>`<option value="${d.c}">${esc(d.c+' - '+d.n)}</option>`).join('');
  const sOpts=[1,2,3,4,5,6].map(n=>`<option value="${n}">Semester ${n}</option>`).join('');
  const extra={
   student:`<div><label for="su_dept">Department</label><select id="su_dept">${dOpts}</select></div><div><label for="su_sem">Semester</label><select id="su_sem">${sOpts}</select></div><div class="full"><div class="hint" id="su_class" style="text-align:left;margin:0"></div></div><div><label for="su_dob">Date of birth</label><input id="su_dob" placeholder="12 Mar 2006"></div><div><label for="su_g">Guardian name</label><input id="su_g"></div><div class="full"><label for="su_city">City</label><input id="su_city"></div>`,
   faculty:`<div><label for="su_dept">Department</label><select id="su_dept">${dOpts}</select></div><div><label for="su_desig">Designation</label><select id="su_desig"><option>Assistant Professor</option><option>Associate Professor</option><option>Professor</option></select></div><div><label for="su_q">Qualification</label><input id="su_q" placeholder="M.Tech, Ph.D."></div><div><label for="su_exp">Experience (years)</label><input id="su_exp" type="number" min="0" value="3"></div>`,
   admin:`<div><label for="su_desig">Office</label><select id="su_desig"><option>Registrar</option><option>Exam Cell Coordinator</option><option>Accounts Officer</option><option>Placement Officer</option></select></div><div><label for="su_emp">Employee ID</label><input id="su_emp" required></div><div class="full"><label for="su_code">Invite code <span style="font-weight:400;color:var(--muted)">(optional, from the principal's office)</span></label><input id="su_code" placeholder="AV-2026"></div>`};
  card.innerHTML=`<div class="brand"><div class="logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg></div><b>Create your account</b></div>
   <p class="sub">New to AANM&amp;VVRSR Campus? Your request goes to an admin for approval.</p>
   <div class="tabs" id="suTabs"><span class="pill" style="transform:translateX(${['student','faculty','admin'].indexOf(sr)*100}%)"></span>${['student','faculty','admin'].map(r=>`<button type="button" role="tab" data-role="${r}" aria-selected="${r===sr}">${cap(r)}</button>`).join('')}</div>
   <form id="suForm"><div class="fgrid"><div class="full"><label for="su_name">Full name</label><input id="su_name" required autocomplete="off"></div><div><label for="su_email">Email</label><input id="su_email" type="email" required></div><div><label for="su_phone">Phone</label><input id="su_phone"></div>${extra[sr]}<div class="full"><label for="su_pw">Password</label><input id="su_pw" type="password" minlength="6" required placeholder="At least 6 characters"></div></div><div id="suErr" class="err" hidden></div><button class="btn block" type="submit">Request account</button></form>
   <p class="hint"><button class="link" id="suBack" type="button">Back to sign in</button></p>`;
  ['su_name','su_email','su_phone','su_pw'].forEach(k=>{if(carry[k])$('#'+k).value=carry[k]});
  $$('#suTabs button').forEach(b=>b.onclick=()=>{const c={};['su_name','su_email','su_phone','su_pw'].forEach(k=>c[k]=$('#'+k).value);showSignup(b.dataset.role,c)});
  $('#suBack').onclick=()=>restoreLogin();
  if(sr==='student'){
    const upd=()=>{const d=$('#su_dept').value,s=+$('#su_sem').value;$('#su_class').textContent=`You will join the ${d} Semester ${s} class. Your class teacher is assigned once you are approved.`};
    $('#su_dept').onchange=upd;$('#su_sem').onchange=upd;upd();
  }
  $('#suForm').onsubmit=async e=>{
    e.preventDefault();
    const val=id=>($('#'+id)?.value||'').trim(),err=$('#suErr'),email=val('su_email').toLowerCase();
    const body={role:sr,name:val('su_name'),email,phone:val('su_phone'),password:$('#su_pw').value,dept:val('su_dept'),sem:val('su_sem'),dob:val('su_dob'),guardian:val('su_g'),city:val('su_city'),
      designation:val('su_desig'),qualification:val('su_q'),experience:val('su_exp'),employeeId:val('su_emp'),inviteCode:val('su_code')};
    try{await api('POST','/auth/register',body)}catch(x){err.hidden=false;err.textContent=x.message;return}
    card.innerHTML=`<div class="pending"><div class="clock"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div><h2 style="font-size:20px">Request sent</h2><p class="sub" style="margin:8px 0 16px">An admin will review your ${sr} request. Sign in with <b>${esc(email)}</b> and your password once it is approved.</p><button class="btn ghost" id="backBtn">Back to sign in</button></div>`;
    role=sr;$('#backBtn').onclick=()=>restoreLogin(email);
  };
}
function whoNow(){const n=ME.name||'Admin';return {name:n,ini:inits(n)}}
async function enter(){
  const d=await api('GET','/bootstrap');load(d);role=d.me.role;
  const w=whoNow();
  $('#login').hidden=true;$('#app').hidden=false;$('#bellDot').hidden=false;$('#bellDot').textContent='3';
  $('#avatar').textContent=w.ini;$('#avatar').title=w.name;
  $('#roleChip').textContent=role==='admin'?'Admin console':role==='faculty'?'Faculty portal':'Student portal';
  tab=tabsFor[role][0][0];renderNav();render();window.scrollTo(0,0);
  toast('Welcome, '+w.name);
}
function signOut(){saveToken(null);sess={};
  closeModal();$('#bellDrop').hidden=true;$('#app').hidden=true;$('#login').hidden=false;
  S.sub=null;S.ac=null;restoreLogin();window.scrollTo(0,0);
}
$('#out').onclick=signOut;
bindLogin();

/* ---------- shell ---------- */
function renderNav(){$('#nav').innerHTML=tabsFor[role].map(([k,l])=>`<button data-k="${k}" ${k===tab?'aria-current="page"':''}>${l}${k==='aapp'&&requests.length?` <span class="chip warn" style="margin-left:4px">${requests.length}</span>`:''}</button>`).join('');$$('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.k))}
function go(k){tab=k;renderNav();render();window.scrollTo(0,0)}
function render(keep){const y=window.scrollY;closeModal();VIEWS[tab]($('#view'));if(keep)window.scrollTo(0,y)}
$('#theme').onclick=()=>{const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark'};
function bellItems(){return({student:[['Internal marks updated','Machine Learning IA-2 is now visible'],['New announcement','Mid-semester exams begin 24 Nov'],['Event reminder','Inter-college Hackathon in 6 days']],
 faculty:[['Deadline','IA-2 marks due 22 Nov'],['Attendance reminder','CSE sem 6, Machine Learning not marked today'],['New notice','Mid-semester exams begin 24 Nov']],
 admin:[[requests.length+' pending approvals','Review new student and faculty requests'],['Media upload','Rang Utsav photos were added'],['Backup complete','Nightly backup finished']]})[role]}
$('#bell').onclick=e=>{e.stopPropagation();const d=$('#bellDrop');d.innerHTML=bellItems().map(([a,b])=>`<div><strong>${a}</strong><small>${b}</small></div>`).join('');d.hidden=!d.hidden;$('#bellDot').hidden=true};
document.addEventListener('click',()=>{$('#bellDrop').hidden=true});

/* delegated events */
const ACT={},CHG={},INP={};
$('#view').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&ACT[b.dataset.act])ACT[b.dataset.act](b.dataset.id,b,e)});
$('#view').addEventListener('change',e=>{const t=e.target.closest('[data-chg]');if(t&&CHG[t.dataset.chg])CHG[t.dataset.chg](t.value,t,e)});
$('#view').addEventListener('input',e=>{const t=e.target.closest('[data-inp]');if(t&&INP[t.dataset.inp])INP[t.dataset.inp](t.value,t,e)});
function armed(b,fn){if(b.dataset.armed){fn();return}b.dataset.armed='1';const o=b.textContent;b.textContent='Confirm?';setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent=o}},3000)}

/* ---------- modal ---------- */
let modalEl=null;
function closeModal(){if(modalEl){modalEl.remove();modalEl=null}}
function openModal(title,body,wide){
  closeModal();
  const el=document.createElement('div');el.className='modal-back';
  el.innerHTML=`<div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-h"><h2>${esc(title)}</h2><button class="icon-btn" aria-label="Close" data-close>&times;</button></div><div class="modal-body"></div></div>`;
  $('.modal-body',el).append(...(typeof body==='string'?(()=>{const d=document.createElement('div');d.innerHTML=body;return[...d.childNodes]})():[body]));
  el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-close]')){closeModal();return}const b=e.target.closest('[data-act]');if(b&&ACT[b.dataset.act])ACT[b.dataset.act](b.dataset.id,b,e)});
  document.body.append(el);modalEl=el;return el;
}
function formModal({title,fields,submit='Save',onSubmit}){
  const f=fields.map(x=>{
    const id='f_'+x.k;let input;
    if(x.type==='select')input=`<select id="${id}" name="${x.k}">${x.opts.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(x.v)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
    else if(x.type==='multi')input=`<select id="${id}" name="${x.k}" multiple>${x.opts.map(([v,l])=>`<option value="${esc(v)}" ${(x.v||[]).includes(v)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
    else if(x.type==='textarea')input=`<textarea id="${id}" name="${x.k}">${esc(x.v||'')}</textarea>`;
    else input=`<input id="${id}" name="${x.k}" type="${x.type||'text'}" value="${esc(x.v??'')}" ${x.req?'required':''} ${x.ph?`placeholder="${esc(x.ph)}"`:''} ${x.type==='number'?'min="0"':''} ${x.type==='file'?`accept="${x.accept||''}"`:''}>`;
    return `<div class="${x.full?'full':''}"><label for="${id}">${esc(x.label)}${x.hint?` <span style="font-weight:400;color:var(--muted)">${esc(x.hint)}</span>`:''}</label>${input}</div>`;
  }).join('');
  const el=openModal(title,`<form><div class="fgrid">${f}</div><div class="modal-foot"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn" type="submit">${esc(submit)}</button></div></form>`);
  $('form',el).onsubmit=e=>{
    e.preventDefault();const fd=new FormData(e.target),vals={};
    fields.forEach(x=>{vals[x.k]=x.type==='multi'?fd.getAll(x.k):x.type==='file'?e.target.elements[x.k].files[0]:fd.get(x.k)});
    if(onSubmit(vals)!==false)closeModal();
  };
  const first=$('input,select,textarea',el);if(first)first.focus();
}

/* ---------- shared pieces ---------- */
const statCard=(k,v,d)=>`<div class="card stat"><div class="k">${k}</div><div class="v num">${v}</div><div class="d">${d||''}</div></div>`;
const meter=p=>`<div class="meter"><i class="${p<75?'low':''}" style="width:${p}%"></i></div>`;
function donut(p){const r=58,c=2*Math.PI*r;return `<svg class="donut" viewBox="0 0 150 150" role="img" aria-label="Overall attendance ${p}%"><circle cx="75" cy="75" r="${r}" fill="none" stroke="var(--accent-soft)" stroke-width="16"/><circle cx="75" cy="75" r="${r}" fill="none" stroke="${p<75?'var(--bad)':'var(--accent)'}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${c*p/100} ${c}" transform="rotate(-90 75 75)"/><text x="75" y="80" text-anchor="middle" font-family="Sora" font-weight="700" font-size="28" fill="var(--ink)">${p}%</text><text x="75" y="98" text-anchor="middle" font-size="11" fill="var(--muted)">overall</text></svg>`}
function bars(items,max=100,lowBelow=0){ // items: [label,value]
  return `<div class="bars">${items.map(([,v])=>`<div class="b"><div class="bar ${v<lowBelow?'low':''}" style="height:${Math.max(2,v/max*100)}%"><span class="num">${v}</span></div></div>`).join('')}</div><div class="bar-labels">${items.map(([l])=>`<div>${esc(l)}</div>`).join('')}</div>`;
}
function lineChart(vals,labels,lo,hi){
  const W=440,Hh=210,l=34,r=16,t=26,b=30;
  const x=i=>l+(vals.length===1?(W-l-r)/2:i*(W-l-r)/(vals.length-1)),y=v=>t+(hi-v)/(hi-lo)*(Hh-t-b);
  let g='';for(let v=lo;v<=hi;v++){g+=`<line x1="${l}" x2="${W-r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${l-6}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted)">${v.toFixed(1).replace('.0','')}</text>`}
  const pts=vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
  const area=vals.length>1?`<polygon points="${x(0)},${y(lo)} ${pts} ${x(vals.length-1)},${y(lo)}" fill="var(--accent)" opacity=".1"/>`:'';
  return `<svg class="line-svg" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Trend chart">${g}${area}<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
   ${vals.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="${i===vals.length-1?6:4}" fill="var(--surface)" stroke="var(--accent)" stroke-width="3"/><text x="${x(i)}" y="${y(v)-11}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink)">${v}</text><text x="${x(i)}" y="${Hh-8}" text-anchor="middle" font-size="11" fill="var(--muted)">${labels[i]}</text>`).join('')}</svg>`;
}
function ttFor(list){
  const g=Array.from({length:5},()=>Array(5).fill(null));
  list.forEach((s,i)=>{for(let k=0;k<3;k++){let p=(i*7+k*11+H(s.id)%5)%25,n=0;while(g[Math.floor(p/5)][p%5]&&n<25){p=(p+1)%25;n++}if(n<25)g[Math.floor(p/5)][p%5]=s}});
  return g;
}
function ttHtml(g,showSem){
  const today=new Date().getDay()-1;
  return `<div class="tt-wrap"><table class="tt"><thead><tr><th></th>${SLOTS.map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${DAYS.map((d,i)=>`<tr><th class="${i===today?'today':''}">${d}</th>${g[i].map(c=>c?`<td class="${i===today?'now':''}">${esc(c.name.length>20?c.code:c.name)}<small>${showSem?c.dept+' sem '+c.sem+' · ':''}Room ${'A-'+(101+H(c.id)%300)}</small></td>`:'<td class="free"></td>').join('')}</tr>`).join('')}</tbody></table></div>`;
}
function nextClass(g){
  const now=new Date(),d=now.getDay()-1,mins=now.getHours()*60+now.getMinutes(),st=[540,600,675,735,840];
  if(d>=0&&d<5)for(let i=0;i<5;i++)if(st[i]>mins&&g[d][i]){const df=st[i]-mins;return[g[d][i],SLOTS[i],df>=60?`in ${Math.floor(df/60)}h ${df%60}m`:`in ${df} min`]}
  for(let k=1;k<=7;k++){const dd=(((d+k)%7)+7)%7;if(dd<5){const i=g[dd].findIndex(Boolean);if(i>=0)return[g[dd][i],DAYS[dd]+' '+SLOTS[i],k===1&&d>=0&&d<4?'Tomorrow':DAYS[dd]]}}
  return[null,'',''];
}
const noticeLi=n=>`<li><span class="chip ${n.pri==='High'?'bad':'acc'} tag">${esc(n.pri==='High'?'Important':n.aud)}</span><div class="grow"><strong>${esc(n.t)}</strong><p>${esc(n.b)}</p><p>${esc(n.by)} · ${esc(n.date)} · For ${esc(n.aud.toLowerCase())}</p></div></li>`;
const noticesFor=r=>notices.filter(n=>n.aud==='All'||(r==='student'&&n.aud==='Students')||(r==='faculty'&&n.aud==='Faculty')||r==='admin');
const dayStrip=()=>`<div class="strip">${media.slice(0,4).map(m=>thumb(m)).join('')}</div>`;
function thumb(m){return `<button class="thumb" data-act="open" data-id="${m.id}" aria-label="Open ${esc(m.title)}"><img src="${m.src&&m.type==='image'?m.src:art(m.kind||'stage',m.hue||262)}" alt="${esc(m.title)}" loading="lazy"><span class="badge">${m.type==='video'?'Video':'Photo'}</span>${m.type==='video'?'<span class="play"><i><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></i></span>':''}</button>`}

/* student detail (used by admin and faculty) */
function studentDetail(id){
  const st=students.find(x=>x.id===id);if(!st)return;
  const subs=subjOf(st.dept,st.sem),done=doneSems(st);
  const body=`<div class="row-flex mb" style="margin-bottom:14px"><div class="avatar lg">${inits(st.name)}</div><div><h3 style="font-size:19px">${esc(st.name)}</h3><div style="color:var(--muted)">${esc(st.roll)} · ${st.dept} · Semester ${st.sem}</div></div></div>
   <div class="grid stats" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">${statCard('Attendance',r0(avgAtt(st))+'%','')}${statCard('Internals',r0(avgMk(st))+'%','')}${statCard('CGPA',done.length?cgpa(st):'New','')}</div>
   <div class="scroll-x"><table class="tbl"><thead><tr><th>Subject</th><th>Attendance</th><th>Internal /50</th></tr></thead><tbody>${subs.map(s=>{const a=attOf(st.id,s.id),m=tot(mkOf(st.id,s.id));return `<tr><td>${esc(s.name)}</td><td class="num">${a}% ${attChip(a)}</td><td class="num">${m}</td></tr>`}).join('')}</tbody></table></div>
   ${done.length>1?`<h3 style="margin:16px 0 6px;font-size:15px">SGPA trend</h3>${lineChart(done.map(s=>sgpa(st,s)),done.map(s=>'S'+s),5,10)}`:''}`;
  openModal('Student performance',body,true);
}
ACT.stuDetail=id=>studentDetail(id);

/* subject picker (attendance, marks, performance) */
function pickSubs(){
  let opts=role==='faculty'?subjects.filter(s=>curFa().subs.includes(s.id)):subjects.filter(s=>s.dept===S.pd&&s.sem===+S.sem);
  if(!opts.find(o=>o.id===S.sub))S.sub=opts[0]?.id||null;return opts;
}
function pickerHtml(opts){
  return `<div class="toolbar">${role==='admin'?`<select data-chg="pdept" aria-label="Department">${depts.map(d=>`<option value="${d.c}" ${d.c===S.pd?'selected':''}>${d.c}</option>`).join('')}</select><select data-chg="psem" aria-label="Semester">${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${n===+S.sem?'selected':''}>Semester ${n}</option>`).join('')}</select>`:''}
  <select class="grow" data-chg="psub" aria-label="Subject">${opts.map(o=>`<option value="${o.id}" ${o.id===S.sub?'selected':''}>${esc(o.name)} (${o.dept} sem ${o.sem})</option>`).join('')||'<option>No subjects</option>'}</select></div>`;
}
CHG.pdept=v=>{S.pd=v;S.sub=null;render(true)};CHG.psem=v=>{S.sem=+v;S.sub=null;render(true)};CHG.psub=v=>{S.sub=v;render(true)};
const classOf=sub=>students.filter(s=>s.dept===sub.dept&&s.sem===sub.sem);

/* ================= STUDENT VIEWS ================= */
function sdash(v){
  const st=curSt(),subs=subjOf(st.dept,st.sem),aa=r0(avgAtt(st)),am=r0(avgMk(st)),done=doneSems(st),g=ttFor(subs),nc=nextClass(g),ci=classInfo(st);
  v.innerHTML=`
  <div class="page-h"><div><h1>Hi, ${esc(st.name.split(' ')[0])}</h1><p>B.Tech ${st.dept}, Semester ${st.sem} · ${esc(st.roll)}<br>Class ${ci.key}: ${ci.n} students · Class teacher ${esc(ci.ct?.name||'to be assigned')}</p></div>${chip('Approved student','good')}</div>
  ${nc[0]?`<div class="next"><div><small>Next class</small><br><b>${esc(nc[0].name)}</b></div><div>Room A-${101+H(nc[0].id)%300} · ${esc(nc[1])}</div><div class="t num">${esc(nc[2])}</div></div>`:''}
  <div class="grid stats">${statCard('Attendance',aa+'%',aa<75?'Below the 75% limit':'Above the 75% limit')}${statCard('CGPA',cgpa(st),'After '+done.length+' semesters')}${statCard('Internal average',am+'%','Semester '+st.sem)}${statCard('Credits earned',done.reduce((a,s)=>a+subjOf(st.dept,s).reduce((x,y)=>x+y.cr,0),0),'Of 150 required')}</div>
  <div class="grid two mb">
    <div class="card"><h3>Attendance by subject</h3><div class="donut-wrap">${donut(aa)}<div class="legend">${subs.map(s=>{const a=attOf(st.id,s.id);return `<div class="row"><span>${esc(s.name)}</span><span class="num"><b>${a}%</b></span>${meter(a)}</div>`}).join('')}</div></div></div>
    <div class="card"><h3>Internal marks (out of 50)</h3>${bars(subs.map(s=>[s.code,tot(mkOf(st.id,s.id))]),50,20)}</div>
  </div>
  <div class="grid two mb">
    <div class="card"><h3>SGPA trend <span class="chip acc">${done.length?'Semesters 1 to '+done.length:'Just started'}</span></h3>${done.length?lineChart(done.map(s=>sgpa(st,s)),done.map(s=>'Sem '+s),5,10):'<div class="empty">Your SGPA chart appears after your first semester result.</div>'}</div>
    <div class="card"><h3>Announcements</h3><ul class="list">${noticesFor('student').slice(0,3).map(noticeLi).join('')}</ul></div>
  </div>
  <div class="card"><h3>Latest from campus <button class="btn ghost sm" data-act="goev">See all</button></h3>${dayStrip()}</div>`;
}
ACT.goev=()=>go('events');
function profile(v){
  const st=curSt(),ci=classInfo(st),mentor=ci.ct;
  v.innerHTML=`<div class="page-h"><div><h1>My profile</h1><p>Your details as recorded by the admin office.</p></div></div>
  <div class="card mb" style="padding:0;overflow:hidden"><img class="banner" src="${deptArt(st.dept)}" alt=""><div class="row-flex" style="gap:18px;padding:18px"><div class="avatar lg">${inits(st.name)}</div><div><h2 style="font-size:22px">${esc(st.name)}</h2><div style="color:var(--muted)">B.Tech ${st.dept} · Semester ${st.sem} · Batch ${st.year}-${st.year+4}</div><div style="margin-top:6px">${chip(st.status,'good')} ${chip('Roll '+st.roll)}</div></div></div></div>
  <div class="grid two"><div class="card"><h3>Personal details</h3><dl class="dl"><div><dt>Email</dt><dd>${esc(st.email)}</dd></div><div><dt>Phone</dt><dd>${esc(st.phone)}</dd></div><div><dt>Date of birth</dt><dd>${esc(st.dob)}</dd></div><div><dt>Blood group</dt><dd>${esc(st.blood)}</dd></div><div><dt>Guardian</dt><dd>${esc(st.guardian)}</dd></div><div><dt>City</dt><dd>${esc(st.city)}</dd></div></dl></div>
  <div class="card"><h3>Academic details</h3><dl class="dl"><div><dt>Department</dt><dd>${esc(depts.find(d=>d.c===st.dept)?.n||st.dept)}</dd></div><div><dt>Current semester</dt><dd>${st.sem} of 6</dd></div><div><dt>Class teacher</dt><dd>${esc(mentor?.name||'Not assigned')}</dd></div><div><dt>CGPA</dt><dd>${cgpa(st)}</dd></div><div><dt>Attendance</dt><dd>${r0(avgAtt(st))}%</dd></div><div><dt>Class</dt><dd>${ci.key}, ${ci.n} students</dd></div><div><dt>Class rank</dt><dd>${ci.rank} of ${ci.n}</dd></div><div><dt>Backlogs</dt><dd>None</dd></div></dl></div></div>`;
}
function acad(v){
  const st=curSt();if(!S.ac)S.ac=st.sem;const sem=S.ac,subs=subjOf(st.dept,sem),done=doneSems(st),isNow=sem===st.sem,future=sem>st.sem;
  v.innerHTML=`<div class="page-h"><div><h1>Semesters 1 to 6</h1><p>Subjects, attendance and internal marks for every semester.</p></div>
   <span class="seg" role="group" aria-label="Semester">${[1,2,3,4,5,6].map(n=>`<button aria-pressed="${n===sem}" data-act="semPick" data-id="${n}">Sem ${n}</button>`).join('')}</span></div>
  ${future?`<div class="card empty">Semester ${sem} has not started yet.</div>`:`
  <div class="grid stats">${statCard(isNow?'Current SGPA':'SGPA',sgpa(st,sem),isNow?'Based on internals so far':'Final result')}${statCard('Attendance',r0(avgAtt(st,sem))+'%','')}${statCard('Internal average',r0(avgMk(st,sem))+'%','')}${statCard('Credits',subs.reduce((a,x)=>a+x.cr,0),subs.length+' subjects')}</div>
  <div class="card mb"><h3>Subjects ${chip(isNow?'Ongoing':'Completed',isNow?'warn':'good')}</h3><div class="scroll-x"><table class="tbl"><thead><tr><th>Code</th><th>Subject</th><th>Cr</th><th>Faculty</th><th>Attendance</th><th>IA-1 /20</th><th>IA-2 /20</th><th>Asg /10</th><th>Total /50</th><th>Grade</th></tr></thead><tbody>
  ${subs.map(s=>{const a=attOf(st.id,s.id),m=mkOf(st.id,s.id),t=tot(m);return `<tr><td>${s.code}</td><td>${esc(s.name)}</td><td>${s.cr}</td><td>${esc(facultyOf(s.id)?.name||'Visiting faculty')}</td><td><div class="mini-meter"><span class="num">${a}%</span>${meter(a)}</div></td><td class="num">${m.a}</td><td class="num">${m.b}</td><td class="num">${m.c}</td><td class="num"><b>${t}</b></td><td>${chip(grade(t*2),t*2<55?'bad':'acc')}</td></tr>`}).join('')}</tbody></table></div></div>
  <div class="grid two"><div class="card"><h3>Internal marks, semester ${sem}</h3>${bars(subs.map(s=>[s.code,tot(mkOf(st.id,s.id))]),50,20)}</div>
  <div class="card"><h3>SGPA across semesters</h3>${done.length?lineChart(done.map(s=>sgpa(st,s)),done.map(s=>'S'+s),5,10):'<div class="empty">No completed semesters yet.</div>'}</div></div>`}`;
}
ACT.semPick=id=>{S.ac=+id;render(true)};
function tt(v){
  const subs=role==='student'?subjOf(curSt().dept,curSt().sem):subjects.filter(s=>curFa().subs.includes(s.id));
  v.innerHTML=`<div class="page-h"><div><h1>Timetable</h1><p>${role==='student'?'Your weekly classes. Today is highlighted.':'Your weekly teaching schedule. Today is highlighted.'}</p></div></div><div class="card">${ttHtml(ttFor(subs),role==='faculty')}</div>`;
}
function mapView(v){
  const sel=S.b||'Main Block';
  v.innerHTML=`<div class="page-h"><div><h1>Campus map</h1><p>Tap a building for hours and what is inside.</p></div></div>
  <div class="map-grid"><div class="card"><svg id="map" viewBox="0 0 730 340" role="img" aria-label="Campus map"><path d="M0 175h730M365 0v340" stroke="var(--line)" stroke-width="14" fill="none"/>
  ${Object.entries(buildings).map(([n,b])=>`<g class="bld ${n===sel?'sel':''}" data-n="${n}" tabindex="0" role="button" aria-label="${n}"><rect class="b" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="12"/><text x="${b.x+b.w/2}" y="${b.y+b.h/2+4}" text-anchor="middle">${n}</text></g>`).join('')}</svg></div><div class="card" id="bInfo"></div></div>`;
  const show=()=>{const n=S.b||'Main Block',b=buildings[n];$('#bInfo').innerHTML=`<h3>${n} ${chip(b.info[0],b.info[0]==='Open'?'good':'warn')}</h3><p style="margin:0 0 8px;color:var(--muted)">${b.note}</p><ul class="facts"><li><span>Hours</span><b>${b.info[1]}</b></li><li><span>Floors</span><b>${b.floors}</b></li></ul>`;$$('#map .bld').forEach(g=>g.classList.toggle('sel',g.dataset.n===n))};
  $$('#map .bld').forEach(g=>{g.onclick=()=>{S.b=g.dataset.n;show()};g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){S.b=g.dataset.n;show()}}});show();
}

/* ================= SHARED: notices + events ================= */
function noticesView(v){
  const list=noticesFor(role).filter(n=>S.nf==='All'||n.aud===S.nf||(S.nf==='Important'&&n.pri==='High'));
  const manage=role==='admin';
  v.innerHTML=`<div class="page-h"><div><h1>${role==='student'?'Announcements':'Notices'}</h1><p>${manage?'Publish notices for students, faculty or everyone.':'Messages from the college office and your departments.'}</p></div>${manage?'<button class="btn" data-act="newNotice">Publish notice</button>':''}</div>
  <div class="card"><div class="toolbar"><span class="seg">${['All','Important',...(manage?['Students','Faculty']:[])].map(f=>`<button aria-pressed="${S.nf===f}" data-act="nfilter" data-id="${f}">${f}</button>`).join('')}</span></div>
  <ul class="list">${list.map(n=>noticeLi(n).replace('</li>',manage?`<button class="btn bad sm" data-act="delNotice" data-id="${n.id}">Delete</button></li>`:'</li>')).join('')||'<li class="empty" style="display:block">No notices here.</li>'}</ul></div>`;
}
ACT.nfilter=id=>{S.nf=id;render(true)};
ACT.newNotice=()=>formModal({title:'Publish notice',submit:'Publish',fields:[
 {k:'t',label:'Title',req:true,full:true,ph:'Lab viva moved to Friday'},{k:'b',label:'Message',type:'textarea',full:true},
 {k:'aud',label:'Audience',type:'select',opts:[['All','Everyone'],['Students','Students'],['Faculty','Faculty']],v:'All'},{k:'pri',label:'Priority',type:'select',opts:[['Normal','Normal'],['High','Important']],v:'Normal'}],
 onSubmit:v=>{api('POST','/notices',{title:v.t,body:v.b,audience:v.aud,priority:v.pri}).then(r=>{notices.unshift(r.notice);addLog('Admin','Published notice: '+v.t);toast('Notice published');render(true)}).catch(fail);return false}});
ACT.delNotice=(id,b)=>armed(b,()=>{api('DELETE','/notices/'+id).then(()=>{notices=notices.filter(n=>n.id!=id);toast('Notice deleted');render(true)}).catch(fail)});

function gallery(manage){
  const evs=[...new Set(media.map(m=>m.ev))];
  const list=media.filter(m=>(S.mt==='all'||m.type===S.mt)&&(!S.mev||m.ev===S.mev)&&(!S.my||m.year==S.my)).sort((a,b)=>b.year-a.year||b.id-a.id);
  return `<div class="toolbar"><span class="seg">${[['all','All'],['image','Photos'],['video','Videos']].map(([k,l])=>`<button aria-pressed="${S.mt===k}" data-act="mtype" data-id="${k}">${l}</button>`).join('')}</span>
   <select data-chg="mev" aria-label="Event"><option value="">All events</option>${evs.map(e=>`<option ${e===S.mev?'selected':''}>${esc(e)}</option>`).join('')}</select><select data-chg="myr" aria-label="Year"><option value="">All years</option>${[2026,2025,2024,2023].map(y=>`<option ${String(y)===String(S.my)?'selected':''}>${y}</option>`).join('')}</select></div>
   <div class="gal">${list.map(m=>`<div class="gcard">${thumb(m)}<div class="meta"><b>${esc(m.title)}</b><small>${esc(m.ev)} · ${esc(m.date)} ${m.year}</small>${manage?`<div class="row-flex"><button class="btn ghost sm" data-act="editMedia" data-id="${m.id}">Edit</button><button class="btn bad sm" data-act="delMedia" data-id="${m.id}">Delete</button></div>`:''}</div></div>`).join('')||'<div class="empty">No media matches these filters.</div>'}</div>`;
}
ACT.mtype=id=>{S.mt=id;render(true)};CHG.mev=v=>{S.mev=v;render(true)};CHG.myr=v=>{S.my=v;render(true)};
function events(v){
  v.innerHTML=`<div class="page-h"><div><h1>Events and media</h1><p>Photos and videos from college events, published by the admin office.</p></div></div>
  <div class="card mb"><h3>Upcoming events</h3><div class="grid three">${upcoming.map(u=>`<div class="card" style="box-shadow:none"><small style="color:var(--muted)">${dayLabel(u.d)} · in ${u.d} days</small><h3 style="margin:4px 0 2px;font-size:16px">${esc(u.n)}</h3><div style="color:var(--muted);font-size:13.5px;margin-bottom:10px">${esc(u.v)}</div><button class="btn ${rsvp.has(u.id)?'':'ghost'} sm" data-act="rsvp" data-id="${u.id}">${rsvp.has(u.id)?'Going':'Mark as going'}</button></div>`).join('')}</div></div>
  <div class="card"><h3>Gallery</h3>${gallery(false)}</div>`;
}
ACT.rsvp=id=>{rsvp.has(id)?rsvp.delete(id):rsvp.add(id);toast(rsvp.has(id)?'Added to your plans':'Removed');render(true)};
function mediaView(v){
  v.innerHTML=`<div class="page-h"><div><h1>Events and media</h1><p>Add, edit and remove the photos and videos students see.</p></div><button class="btn" data-act="addMedia">Upload media</button></div>
  <div class="grid stats">${statCard('Photos',media.filter(m=>m.type==='image').length,'')}${statCard('Videos',media.filter(m=>m.type==='video').length,'')}${statCard('Events',new Set(media.map(m=>m.ev)).size,'With media')}</div>
  <div class="card">${gallery(true)}<p class="hint" style="text-align:left">Sample items use generated artwork and a placeholder clip. Files you upload here are stored on the server and play for real.</p></div>`;
}
ACT.addMedia=()=>formModal({title:'Upload photo or video',submit:'Add to gallery',fields:[
 {k:'file',label:'File',type:'file',accept:'image/*,video/*',full:true,hint:'(photo or video from your device)'},
 {k:'title',label:'Title',req:true,full:true,ph:'Prize distribution ceremony'},
 {k:'ev',label:'Event',req:true,ph:'Annual Day 2026'},{k:'date',label:'Date',ph:'14 Nov'},{k:'year',label:'Year',type:'select',opts:[2026,2025,2024,2023].map(y=>[y,String(y)]),v:2026}],
 onSubmit:v=>{
   if(!v.file){toast('Choose an image or video first');return false}
   const fd=new FormData();fd.append('title',v.title);fd.append('event',v.ev);fd.append('date',v.date||'Today');fd.append('year',v.year);fd.append('file',v.file);
   api('POST','/media',fd,true).then(r=>{media.unshift(r.media);addLog('Admin','Uploaded '+r.media.type+': '+v.title);toast('Added to the gallery');render(true)}).catch(fail);
   return false}});
ACT.editMedia=id=>{const m=media.find(x=>x.id==id);formModal({title:'Edit media details',fields:[{k:'title',label:'Title',v:m.title,req:true,full:true},{k:'ev',label:'Event',v:m.ev,req:true},{k:'date',label:'Date',v:m.date}],
 onSubmit:v=>{api('PUT','/media/'+m.id,{title:v.title,event:v.ev,date:v.date}).then(r=>{Object.assign(m,r.media);toast('Media updated');render(true)}).catch(fail);return false}})};
ACT.delMedia=(id,b)=>armed(b,()=>{api('DELETE','/media/'+id).then(()=>{media=media.filter(m=>m.id!=id);addLog('Admin','Removed media item');toast('Removed from the gallery');render(true)}).catch(fail)});

/* lightbox */
let lbList=[],lbIdx=0,lbStop=null;
ACT.open=id=>{lbList=media.filter(m=>(S.mt==='all'||m.type===S.mt)&&(!S.mev||m.ev===S.mev)&&(!S.my||m.year==S.my)).sort((a,b)=>b.year-a.year||b.id-a.id);if(!lbList.find(m=>m.id==id))lbList=media;lbIdx=lbList.findIndex(m=>m.id==id);showLB()};
function showLB(){
  if(lbStop){lbStop();lbStop=null}
  const m=lbList[lbIdx];$('#lb').hidden=false;const host=$('#lbMedia');
  $('#lbCap').innerHTML=`<b>${esc(m.title)}</b><br><small>${esc(m.ev)} · ${esc(m.date)} · ${lbIdx+1} of ${lbList.length}</small>`;
  if(m.type==='image')host.innerHTML=`<img src="${m.src||art(m.kind,m.hue)}" alt="${esc(m.title)}">`;
  else if(m.src)host.innerHTML=`<video src="${m.src}" controls autoplay></video>`;
  else lbStop=simPlayer(m,host);
}
function simPlayer(m,host){
  host.innerHTML=`<canvas width="800" height="450"></canvas><div class="pbar"><button class="btn sm" id="pp">Pause</button><div class="prog"><i></i></div><span class="num" id="tm">0:00 / 0:12</span></div><div class="pbar" style="font-size:12px;opacity:.8">Sample clip. Upload a real video from Events and media to play it here.</div>`;
  const cv=$('canvas',host),c=cv.getContext('2d'),D=12;let t=0,last=performance.now(),playing=true,raf;
  $('#pp').onclick=()=>{playing=!playing;$('#pp').textContent=playing?'Pause':'Play'};
  (function f(now){
    const dt=(now-last)/1000;last=now;if(playing){t+=dt;if(t>D)t=0}
    const hue=(m.hue+t*12)%360,g=c.createLinearGradient(0,0,800,450);g.addColorStop(0,`hsl(${hue},55%,22%)`);g.addColorStop(1,`hsl(${(hue+50)%360},70%,50%)`);c.fillStyle=g;c.fillRect(0,0,800,450);
    for(let i=0;i<14;i++){const x=(i*97+t*(30+i*6))%900-50,y=225+Math.sin(t*1.4+i)*140;c.fillStyle=`rgba(255,255,255,${.08+.02*(i%4)})`;c.beginPath();c.arc(x,y,20+(i%5)*10,0,7);c.fill()}
    const a=Math.min(1,t/.8,(D-t)/.8);c.globalAlpha=Math.max(0,a);c.fillStyle='#fff';c.textAlign='center';c.font='600 34px Sora, sans-serif';c.fillText(m.title,400,215,720);c.font='400 20px DM Sans, sans-serif';c.fillText(m.ev+' · '+m.date,400,255,720);c.globalAlpha=1;
    $('.prog i',host).style.width=(t/D*100)+'%';$('#tm').textContent=`0:${String(Math.floor(t)).padStart(2,'0')} / 0:12`;
    raf=requestAnimationFrame(f);
  })(last);
  return()=>cancelAnimationFrame(raf);
}
function closeLB(){if(lbStop){lbStop();lbStop=null}$('#lb').hidden=true;$('#lbMedia').innerHTML=''}
$('#lbX').onclick=closeLB;$('#lbP').onclick=()=>{lbIdx=(lbIdx-1+lbList.length)%lbList.length;showLB()};$('#lbN').onclick=()=>{lbIdx=(lbIdx+1)%lbList.length;showLB()};
$('#lb').addEventListener('click',e=>{if(e.target.id==='lb')closeLB()});

/* ================= FACULTY VIEWS ================= */
function fdash(v){
  const f=curFa(),subs=subjects.filter(s=>f.subs.includes(s.id));
  const allSt=new Set();subs.forEach(s=>classOf(s).forEach(x=>allSt.add(x.id)));
  v.innerHTML=`<div class="page-h"><div><h1>Welcome, ${esc(f.name)}</h1><p>${esc(f.desig)} · ${esc(depts.find(d=>d.c===f.dept)?.n)}</p></div></div>
  <div class="grid stats">${statCard('Subjects',subs.length,'Assigned this term')}${statCard('Students',allSt.size,'Across your classes')}${statCard('Experience',f.exp+' yrs','')}${statCard('Notices',noticesFor('faculty').length,'To read')}</div>
  ${f.ct?classBanner(f):''}<div class="card mb"><h3>Assigned subjects</h3><div class="grid three">${subs.map(s=>{const cl=classOf(s),aa=r0(mean(cl.map(x=>attOf(x.id,s.id)))),am=r0(mean(cl.map(x=>tot(mkOf(x.id,s.id)))));
    return `<div class="card" style="box-shadow:none"><div class="row-flex" style="justify-content:space-between"><b>${esc(s.name)}</b>${chip(s.code)}</div><div style="color:var(--muted);font-size:13px">${s.dept} · Semester ${s.sem} · ${s.cr} credits</div>
    <div class="row-flex" style="margin:10px 0"><span><b class="num">${cl.length}</b> <small style="color:var(--muted)">students</small></span><span><b class="num">${cl.length?aa+'%':'-'}</b> <small style="color:var(--muted)">attendance</small></span><span><b class="num">${cl.length?am:'-'}</b> <small style="color:var(--muted)">avg IA /50</small></span></div>
    <div class="row-flex"><button class="btn ghost sm" data-act="fgo" data-id="att|${s.id}">Mark attendance</button><button class="btn ghost sm" data-act="fgo" data-id="marks|${s.id}">Enter marks</button></div></div>`}).join('')}</div></div>
  <div class="card"><h3>Notices for you <button class="btn ghost sm" data-act="fnotices">View all</button></h3><ul class="list">${noticesFor('faculty').slice(0,3).map(noticeLi).join('')}</ul></div>`;
}
ACT.fgo=id=>{const[t,s]=id.split('|');S.sub=s;go(t)};ACT.fnotices=()=>go('notices');
function fstu(v){
  const opts=pickSubs(),sub=subjects.find(x=>x.id===S.sub),cl=sub?classOf(sub):[];
  v.innerHTML=`<div class="page-h"><div><h1>My students</h1><p>Students in the classes you teach.</p></div></div><div class="card">${pickerHtml(opts)}
  <div class="scroll-x"><table class="tbl"><thead><tr><th>Roll no.</th><th>Name</th><th>Attendance</th><th>Internal /50</th><th>Contact</th><th></th></tr></thead><tbody>
  ${cl.map(s=>{const a=attOf(s.id,sub.id);return `<tr><td>${esc(s.roll)}</td><td><b>${esc(s.name)}</b></td><td><div class="mini-meter"><span class="num">${a}%</span>${meter(a)}</div></td><td class="num">${tot(mkOf(s.id,sub.id))}</td><td>${esc(s.phone)}</td><td class="acts"><button class="btn ghost sm" data-act="stuDetail" data-id="${s.id}">Performance</button></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">No students are enrolled in this class yet.</td></tr>'}</tbody></table></div></div>`;
}
function att(v){
  const opts=pickSubs(),sub=subjects.find(x=>x.id===S.sub),cl=sub?classOf(sub):[],admin=role==='admin';
  if(sub&&!sess[sub.id])sess[sub.id]={};
  const present=s=>sess[sub.id][s.id]!==false;
  v.innerHTML=`<div class="page-h"><div><h1>${admin?'Manage attendance':'Mark attendance'}</h1><p>${admin?'Review and correct attendance percentages for any class.':'Tap a student to switch between present and absent, then save.'}</p></div></div>
  <div class="card mb">${pickerHtml(opts)}${!sub||!cl.length?'<div class="empty">No students in this class yet.</div>':`
   <div class="row-flex" style="justify-content:space-between;margin-bottom:14px"><div><b class="num" id="cnt"></b> <span style="color:var(--muted)">for today's class</span> ${savedToday[sub.id]?chip('Saved','good'):''}</div>
   <div class="row-flex"><button class="btn ghost sm" data-act="allP">Mark all present</button><button class="btn sm" data-act="saveAtt" ${savedToday[sub.id]?'disabled':''}>Save attendance</button></div></div>
   <div class="att" id="attG">${cl.map(s=>`<button class="stu" aria-pressed="${present(s)}" data-act="togP" data-id="${s.id}"><span class="av">${inits(s.name)}</span><span><b>${esc(s.name)}</b><small>${esc(s.roll)} · ${present(s)?'Present':'Absent'}</small></span></button>`).join('')}</div>`}</div>
  ${sub&&cl.length?`<div class="card"><h3>Attendance record ${admin?'<small style="font-weight:400;color:var(--muted)">Edit a percentage to correct it</small>':''}</h3><div class="scroll-x"><table class="tbl"><thead><tr><th>Roll no.</th><th>Name</th><th>Attendance %</th><th>Status</th></tr></thead><tbody>
   ${cl.map(s=>{const a=attOf(s.id,sub.id);return `<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${admin?`<input class="cell-in num" type="number" min="0" max="100" value="${a}" data-chg="attv" data-sid="${s.id}" aria-label="Attendance for ${esc(s.name)}">`:`<div class="mini-meter"><span class="num">${a}%</span>${meter(a)}</div>`}</td><td>${attChip(a)}</td></tr>`}).join('')}</tbody></table></div></div>`:''}`;
  const c=$('#cnt');if(c&&sub)c.textContent=`${cl.filter(present).length} / ${cl.length} present`;
}
ACT.togP=id=>{const sub=S.sub;if(savedToday[sub]){toast('Today is already saved for this class');return}sess[sub][id]=sess[sub][id]===false;render(true)};
ACT.allP=()=>{if(savedToday[S.sub])return;sess[S.sub]={};render(true)};
ACT.saveAtt=async()=>{const sub=subjects.find(x=>x.id===S.sub),cl=classOf(sub);
  const records=cl.map(s=>({studentId:s.id,present:sess[sub.id][s.id]!==false})),p=records.filter(x=>x.present).length;
  try{const r=await api('POST','/attendance/session',{subjectId:sub.id,records});Object.assign(attMap,r.updates);savedToday[sub.id]=true;
    addLog(role==='admin'?'Admin':ME.name,`Marked attendance: ${sub.name}`);toast(`Saved: ${p} present, ${cl.length-p} absent`);render(true)}catch(e){fail(e)}};
CHG.attv=async(val,el)=>{try{const r=await api('PUT','/attendance/correct',{studentId:el.dataset.sid,subjectId:S.sub,percent:+val||0});attMap[K(el.dataset.sid,S.sub)]=r.percent;addLog('Admin','Corrected attendance in '+subName(S.sub));toast('Attendance updated');render(true)}catch(e){fail(e)}};

function marks(v){
  const opts=pickSubs(),sub=subjects.find(x=>x.id===S.sub),cl=sub?classOf(sub):[];
  v.innerHTML=`<div class="page-h"><div><h1>${role==='admin'?'Manage internal marks':'Enter internal marks'}</h1><p>IA-1 and IA-2 are out of 20, the assignment is out of 10.</p></div></div>
  <div class="card">${pickerHtml(opts)}${!cl.length?'<div class="empty">No students in this class yet.</div>':`<div class="scroll-x"><table class="tbl"><thead><tr><th>Roll no.</th><th>Name</th><th>IA-1</th><th>IA-2</th><th>Assignment</th><th>Total /50</th><th>Grade</th></tr></thead><tbody>
  ${cl.map(s=>{const m=mkOf(s.id,sub.id),t=tot(m);return `<tr data-row="${s.id}"><td>${esc(s.roll)}</td><td>${esc(s.name)}</td>
   ${[['a',20],['b',20],['c',10]].map(([f,mx])=>`<td><input class="cell-in num" type="number" min="0" max="${mx}" value="${m[f]}" data-inp="mk" data-f="${f}" data-max="${mx}" aria-label="${f==='a'?'IA-1':f==='b'?'IA-2':'Assignment'} for ${esc(s.name)}"></td>`).join('')}
   <td class="num"><b data-tot>${t}</b></td><td data-gr>${chip(grade(t*2),t*2<55?'bad':'acc')}</td></tr>`}).join('')}</tbody></table></div>
  <div class="modal-foot"><button class="btn" data-act="saveMarks">Save marks</button></div>`}</div>`;
}
INP.mk=(val,el)=>{const mx=+el.dataset.max;if(+val>mx)el.value=mx;if(+val<0)el.value=0;const row=el.closest('tr');const t=$$('input',row).reduce((a,i)=>a+(+i.value||0),0);$('[data-tot]',row).textContent=t;$('[data-gr]',row).innerHTML=chip(grade(t*2),t*2<55?'bad':'acc')};
ACT.saveMarks=async()=>{const sub=S.sub;
  const rows=$$('tr[data-row]').map(r=>{const o={studentId:r.dataset.row};$$('input',r).forEach(i=>o[i.dataset.f]=Math.max(0,Math.min(+i.dataset.max,+i.value||0)));return o});
  try{await api('PUT','/marks/bulk',{subjectId:sub,rows});rows.forEach(o=>markMap[K(o.studentId,sub)]={a:o.a,b:o.b,c:o.c});
    addLog(role==='admin'?'Admin':ME.name,'Updated internal marks: '+subName(sub));toast('Internal marks saved');render(true)}catch(e){fail(e)}};
function perf(v){
  const opts=pickSubs(),sub=subjects.find(x=>x.id===S.sub),cl=sub?classOf(sub):[];
  const rows=cl.map(s=>({s,a:attOf(s.id,sub.id),t:tot(mkOf(s.id,sub.id))})).sort((x,y)=>y.t-x.t);
  const bins=[['<25',0,24],['25-29',25,29],['30-34',30,34],['35-39',35,39],['40+',40,50]].map(([l,a,b])=>[l,rows.filter(r=>r.t>=a&&r.t<=b).length]);
  const avgT=r0(mean(rows.map(r=>r.t))),hist=['2022','2023','2024','2025'].map((y,i)=>[y+' batch',Math.max(18,Math.min(48,avgT-(4-i)+rnd((sub?.id||'x')+y,-2,2)))]).concat([['Now',avgT]]);
  v.innerHTML=`<div class="page-h"><div><h1>Student performance</h1><p>How each class is doing in your subjects.</p></div></div><div class="card mb">${pickerHtml(opts)}</div>
  ${!rows.length?'<div class="card empty">No students in this class yet.</div>':`
  <div class="grid stats">${statCard('Class average',r0(mean(rows.map(r=>r.t)))+' / 50','')}${statCard('Highest',rows[0].t+' / 50',rows[0].s.name)}${statCard('Pass rate',r0(rows.filter(r=>r.t>=20).length/rows.length*100)+'%','Internal 20 or more')}${statCard('Low attendance',rows.filter(r=>r.a<75).length,'Below 75%')}</div>
  <div class="grid two"><div class="card"><h3>Internal marks distribution</h3>${bars(bins,Math.max(...bins.map(b=>b[1]),1))}<p class="hint" style="text-align:left">Number of students in each marks band (out of 50).</p></div>
  <div class="card"><h3>Ranking</h3><div class="scroll-x"><table class="tbl"><thead><tr><th>#</th><th>Student</th><th>Internal</th><th>Attendance</th><th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.s.name)}</td><td class="num">${r.t}</td><td class="num">${r.a}% ${attChip(r.a)}</td><td class="acts"><button class="btn ghost sm" data-act="stuDetail" data-id="${r.s.id}">Details</button></td></tr>`).join('')}</tbody></table></div></div><div class="card"><h3>Class average vs earlier batches</h3>${bars(hist,50)}<p class="hint" style="text-align:left">Average internal marks out of 50 in this subject.</p></div></div>`}`;
}

/* ================= ADMIN VIEWS ================= */
function adash(v){
  const aa=r0(mean(students.map(s=>avgAtt(s))));
  v.innerHTML=`<div class="page-h"><div><h1>Admin dashboard</h1><p>AANM&amp;VVRSR Campus at a glance.</p></div><div class="row-flex"><button class="btn ghost sm" data-act="qa" data-id="astu">Add student</button><button class="btn ghost sm" data-act="qa" data-id="notices">Publish notice</button><button class="btn ghost sm" data-act="qa" data-id="media">Upload media</button></div></div>
  <div class="grid stats">${statCard('Students',students.length,depts.length+' departments')}${statCard('Faculty',faculty.length,'Across all departments')}${statCard('Subjects',subjects.length,'Semesters 1 to 6')}${statCard('Average attendance',aa+'%',students.filter(s=>avgAtt(s)<75).length+' students below 75%')}${statCard('Pending approvals',requests.length,'Need your review')}</div>
  <div class="grid two mb"><div class="card"><h3>Students by department</h3>${depts.map(d=>{const n=students.filter(s=>s.dept===d.c).length;return `<div class="hbar"><span>${d.c}</span><div class="m"><i style="width:${n/Math.max(students.length,1)*100}%"></i></div><b class="num">${n}</b></div>`}).join('')}
   <h3 style="margin-top:18px">Students by semester</h3>${[1,2,3,4,5,6].map(n=>{const c=students.filter(s=>s.sem===n).length;return `<div class="hbar"><span>Semester ${n}</span><div class="m"><i style="width:${c/Math.max(students.length,1)*100}%"></i></div><b class="num">${c}</b></div>`}).join('')}</div>
  <div class="card"><h3>Approval queue ${chip(requests.length+' pending','warn')}</h3><div class="appr" id="aq">${approvalHtml()}</div></div></div>
  <div class="card"><h3>Recent activity</h3><div class="scroll-x"><table class="tbl"><thead><tr><th>Time</th><th>Who</th><th>Action</th></tr></thead><tbody>${log.slice(0,7).map(l=>`<tr><td class="num">${l[0]}</td><td>${esc(l[1])}</td><td>${esc(l[2])}</td></tr>`).join('')}</tbody></table></div></div>`;
}
ACT.qa=id=>{go(id);if(id==='astu')ACT.addStu();if(id==='notices')ACT.newNotice();if(id==='media')ACT.addMedia()};
function approvalHtml(){
  return requests.length?requests.map(r=>{
    const extra=r.role==='Student'?`<br><small>Joins ${r.dept} Semester ${r.sem}, currently ${students.filter(s=>s.dept===r.dept&&s.sem===r.sem).length} students</small>`:'';
    return `<div class="req" data-id="${r.id}"><div class="avatar soft">${inits(r.n)}</div><div class="info"><b>${esc(r.n)}</b> ${chip(r.role)}<br><small>${esc(r.d)}</small>${extra}${r.email?`<br><small>${esc(r.email)}</small>`:''}</div><div class="acts"><button class="btn sm" data-act="reqOk" data-id="${r.id}">Approve</button><button class="btn bad sm" data-act="reqNo" data-id="${r.id}">Reject</button></div></div>`}).join('')
   :'<div class="empty">All caught up. No pending requests.</div>';
}
function decide(id,ok){
  const r=requests.find(x=>x.id===id),el=$(`.req[data-id="${id}"]`);
  api('POST',`/requests/${id}/${ok?'approve':'reject'}`).then(res=>{
    if(el)el.classList.add('out');
    setTimeout(()=>{
      requests=requests.filter(x=>x!==r);
      if(res.student)students.push(res.student);if(res.faculty)faculty.push(res.faculty);if(res.admin)admins.push(res.admin);
      addLog('Admin',(ok?'Approved ':'Rejected ')+r.n+' ('+r.role+')');
      toast((ok?'Approved ':'Rejected ')+r.n+(res.student?'. Roll number '+res.student.roll:res.faculty?'. Faculty ID '+res.faculty.code:''));renderNav();render(true);
    },280);
  }).catch(fail);
}
ACT.reqOk=id=>decide(id,true);ACT.reqNo=id=>decide(id,false);

/* students CRUD */
const PG=20;
function stuList(){const q=S.q.toLowerCase();return students.filter(s=>(!S.fd||s.dept===S.fd)&&(!S.fs||s.sem==S.fs)&&(!q||(s.name+' '+s.roll).toLowerCase().includes(q)))}
function stuRows(){
  const list=stuList(),pages=Math.max(1,Math.ceil(list.length/PG));if(S.pg>=pages)S.pg=pages-1;const a=S.pg*PG;
  return list.slice(a,a+PG).map(s=>`<tr><td>${esc(s.roll)}</td><td><b>${esc(s.name)}</b><br><small style="color:var(--muted)">${esc(s.email)}</small></td><td>${deptChip(s.dept)}</td><td>${s.sem}</td><td class="num">${r0(avgAtt(s))}%</td><td class="num">${doneSems(s).length?cgpa(s):'-'}</td><td>${chip(s.status,s.status==='Active'?'good':'warn')}</td>
   <td class="acts"><button class="btn ghost sm" data-act="stuDetail" data-id="${s.id}">View</button><button class="btn ghost sm" data-act="editStu" data-id="${s.id}">Edit</button><button class="btn bad sm" data-act="delStu" data-id="${s.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="8" class="empty">No students match these filters.</td></tr>';
}
function pagerHtml(){
  const n=stuList().length,pages=Math.max(1,Math.ceil(n/PG)),a=S.pg*PG;
  return `<span style="color:var(--muted);font-size:13px">Showing ${n?a+1:0} to ${Math.min(n,a+PG)} of ${n}</span><div class="row-flex"><button class="btn ghost sm" data-act="pg" data-id="-1" ${S.pg<=0?'disabled':''}>Previous</button><span class="num">Page ${S.pg+1} of ${pages}</span><button class="btn ghost sm" data-act="pg" data-id="1" ${S.pg>=pages-1?'disabled':''}>Next</button></div>`;
}
function astu(v){
  v.innerHTML=`<div class="page-h"><div><h1>Students</h1><p>${students.length} students in ${depts.length*6} classes. Add, view, update or delete records.</p></div><button class="btn" data-act="addStu">Add student</button></div>
  <div class="card"><div class="toolbar"><input class="grow" data-inp="q" placeholder="Search by name or roll number" value="${esc(S.q)}" aria-label="Search students">
  <select data-chg="fd" aria-label="Department"><option value="">All departments</option>${depts.map(d=>`<option ${d.c===S.fd?'selected':''}>${d.c}</option>`).join('')}</select>
  <select data-chg="fs" aria-label="Semester"><option value="">All semesters</option>${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${n==S.fs?'selected':''}>Semester ${n}</option>`).join('')}</select></div>
  <div class="scroll-x"><table class="tbl"><thead><tr><th>Roll no.</th><th>Student</th><th>Dept</th><th>Sem</th><th>Attendance</th><th>CGPA</th><th>Status</th><th></th></tr></thead><tbody id="stuBody">${stuRows()}</tbody></table></div><div class="pager" id="pager">${pagerHtml()}</div></div>`;
}
INP.q=v=>{S.q=v;S.pg=0;$('#stuBody').innerHTML=stuRows();$('#pager').innerHTML=pagerHtml()};
CHG.fd=v=>{S.fd=v;S.pg=0;render(true)};CHG.fs=v=>{S.fs=v;S.pg=0;render(true)};
ACT.pg=id=>{S.pg+=+id;render(true)};
const stuFields=s=>[
 {k:'name',label:'Full name',v:s?.name,req:true,full:true},{k:'dept',label:'Department',type:'select',opts:depts.map(d=>[d.c,d.n]),v:s?.dept||'CSE'},{k:'sem',label:'Semester',type:'select',opts:[1,2,3,4,5,6].map(n=>[n,'Semester '+n]),v:s?.sem||1},
 {k:'email',label:'Email',type:'email',v:s?.email},{k:'phone',label:'Phone',v:s?.phone},{k:'guardian',label:'Guardian',v:s?.guardian},{k:'city',label:'City',v:s?.city},
 {k:'dob',label:'Date of birth',v:s?.dob,ph:'12 Mar 2005'},{k:'status',label:'Status',type:'select',opts:[['Active','Active'],['Inactive','Inactive']],v:s?.status||'Active'}];
ACT.addStu=()=>formModal({title:'Add student',submit:'Add student',fields:stuFields(null),onSubmit:v=>{
  api('POST','/students',{name:v.name,dept:v.dept,sem:+v.sem,email:v.email,phone:v.phone,guardian:v.guardian,city:v.city,dob:v.dob,status:v.status})
    .then(r=>{students.push(r.student);addLog('Admin','Added student '+r.student.name);toast('Student added. Roll number '+r.student.roll);render(true)}).catch(fail);return false}});
ACT.editStu=id=>{const s=students.find(x=>x.id===id);formModal({title:'Update student',fields:stuFields(s),onSubmit:v=>{api('PUT','/students/'+id,{name:v.name,dept:v.dept,sem:+v.sem,email:v.email,phone:v.phone,guardian:v.guardian,city:v.city,dob:v.dob,status:v.status}).then(r=>{Object.assign(s,r.student);addLog('Admin','Updated student '+s.name);toast('Student updated');render(true)}).catch(fail);return false}})};
ACT.delStu=(id,b)=>armed(b,()=>{const s=students.find(x=>x.id===id);api('DELETE','/students/'+id).then(()=>{students=students.filter(x=>x.id!==id);addLog('Admin','Deleted student '+s.name);toast('Student deleted');render(true)}).catch(fail)});

/* faculty */
const facFields=f=>[{k:'name',label:'Full name',v:f?.name,req:true,full:true},{k:'dept',label:'Department',type:'select',opts:depts.map(d=>[d.c,d.n]),v:f?.dept||'CSE'},{k:'desig',label:'Designation',type:'select',opts:['Professor and HoD','Professor','Associate Professor','Assistant Professor'].map(x=>[x,x]),v:f?.desig||'Assistant Professor'},
 {k:'email',label:'Email',type:'email',v:f?.email},{k:'phone',label:'Phone',v:f?.phone},{k:'exp',label:'Experience (years)',type:'number',v:f?.exp??5},
 {k:'subs',label:'Assigned subjects',type:'multi',full:true,hint:'(hold Ctrl or Cmd to pick several)',opts:subjects.filter(s=>s.sem>=1).map(s=>[s.id,`${s.dept} sem ${s.sem}: ${s.name}`]),v:f?.subs||[]}];
function afac(v){
  v.innerHTML=`<div class="page-h"><div><h1>Faculty</h1><p>${faculty.length} faculty members. Assign subjects so they appear on each teacher's dashboard.</p></div><button class="btn" data-act="addFac">Add faculty</button></div>
  <div class="grid three">${faculty.map(f=>`<div class="card pcard"><div class="top"><div class="avatar">${inits(f.name)}</div><div><b>${esc(f.name)}</b><br><small>${esc(f.desig)} · ${f.dept}</small></div></div>
   <small>${esc(f.email)} · ${esc(f.phone)} · ${f.exp} yrs</small>${f.ct?`<div class="chips">${chip('Class teacher of '+f.ct,'good')}</div>`:''}<div class="chips">${f.subs.length?f.subs.map(s=>chip(s)).join(''):'<small>No subjects assigned</small>'}</div>
   <div class="row-flex" style="margin-top:auto"><button class="btn ghost sm" data-act="editFac" data-id="${f.id}">Edit</button><button class="btn bad sm" data-act="delFac" data-id="${f.id}">Delete</button></div></div>`).join('')}</div>`;
}
ACT.addFac=()=>formModal({title:'Add faculty',submit:'Add faculty',fields:facFields(null),onSubmit:v=>{api('POST','/faculty',{name:v.name,dept:v.dept,desig:v.desig,email:v.email,phone:v.phone,exp:+v.exp||0,subs:v.subs}).then(r=>{faculty.push(r.faculty);addLog('Admin','Added faculty '+v.name);toast('Faculty added. ID '+r.faculty.code);render(true)}).catch(fail);return false}});
ACT.editFac=id=>{const f=faculty.find(x=>x.id===id);formModal({title:'Update faculty',fields:facFields(f),onSubmit:v=>{api('PUT','/faculty/'+id,{name:v.name,dept:v.dept,desig:v.desig,email:v.email,phone:v.phone,exp:+v.exp||0,subs:v.subs}).then(r=>{Object.assign(f,r.faculty);addLog('Admin','Updated faculty '+f.name);toast('Faculty updated');render(true)}).catch(fail);return false}})};
ACT.delFac=(id,b)=>armed(b,()=>{const f=faculty.find(x=>x.id===id);api('DELETE','/faculty/'+id).then(()=>{faculty=faculty.filter(x=>x.id!==id);addLog('Admin','Removed faculty '+f.name);toast('Faculty removed');render(true)}).catch(fail)});

/* departments + subjects */
function adept(v){
  const d=depts.find(x=>x.c===S.pd)||depts[0];if(d)S.pd=d.c;
  v.innerHTML=`<div class="page-h"><div><h1>Departments and subjects</h1><p>Pick a department to manage its subjects for semesters 1 to 6.</p></div><div class="row-flex"><button class="btn ghost" data-act="addDept">Add department</button><button class="btn" data-act="addSub">Add subject</button></div></div>
  <div class="grid three mb">${depts.map(x=>`<button class="card dept-pick" aria-pressed="${x.c===S.pd}" data-act="pickDept" data-id="${x.c}" style="padding:0;overflow:hidden"><img class="banner" src="${deptArt(x.c)}" alt=""><div style="padding:14px 16px"><b style="font-family:var(--font-display);font-size:18px">${x.c}</b><div style="color:var(--muted);font-size:13.5px">${esc(x.n)}</div><div class="row-flex" style="margin-top:10px"><span>${chip('HoD '+x.hod)}</span></div><div style="margin-top:8px;font-size:13px;color:var(--muted)">${students.filter(s=>s.dept===x.c).length} students · ${faculty.filter(f=>f.dept===x.c).length} faculty · ${subjects.filter(s=>s.dept===x.c).length} subjects</div></div></button>`).join('')}</div>
  ${d?`<div class="card"><h3>${d.c} subjects ${depts.length>0?`<button class="btn bad sm" data-act="delDept" data-id="${d.c}">Delete department</button>`:''}</h3>
  ${[1,2,3,4,5,6].map(n=>`<div class="sem-block"><b>Sem ${n}</b><div class="chips">${subjOf(d.c,n).map(s=>`<span class="sub-pill">${esc(s.name)} <small style="color:var(--muted)">${s.cr}cr</small><button data-act="delSub" data-id="${s.id}" aria-label="Remove ${esc(s.name)}">&times;</button></span>`).join('')||'<small style="color:var(--muted)">No subjects yet</small>'}</div></div>`).join('')}</div>`:'<div class="card empty">No departments yet. Add one to begin.</div>'}`;
}
ACT.pickDept=id=>{S.pd=id;render(true)};
ACT.addDept=()=>formModal({title:'Add department',submit:'Add department',fields:[{k:'c',label:'Code',req:true,ph:'EEE'},{k:'hod',label:'Head of department',ph:'Dr. Name'},{k:'n',label:'Full name',req:true,full:true,ph:'Electrical and Electronics Engineering'}],
 onSubmit:v=>{const c=v.c.trim().toUpperCase();if(depts.find(d=>d.c===c)){toast('That department code already exists');return false}
  api('POST','/departments',{code:c,name:v.n,hod:v.hod}).then(r=>{depts.push(r.dept);S.pd=c;addLog('Admin','Added department '+c);toast('Department added');render(true)}).catch(fail);return false}});
ACT.delDept=(id,b)=>armed(b,()=>{if(students.some(s=>s.dept===id)||faculty.some(f=>f.dept===id)){toast('Move or remove its students and faculty first');return}
  api('DELETE','/departments/'+id).then(()=>{depts=depts.filter(d=>d.c!==id);subjects=subjects.filter(s=>s.dept!==id);S.pd=depts[0]?.c;addLog('Admin','Deleted department '+id);toast('Department deleted');render(true)}).catch(fail)});
ACT.addSub=()=>formModal({title:'Add subject',submit:'Add subject',fields:[{k:'dept',label:'Department',type:'select',opts:depts.map(d=>[d.c,d.c]),v:S.pd},{k:'sem',label:'Semester',type:'select',opts:[1,2,3,4,5,6].map(n=>[n,'Semester '+n]),v:1},{k:'name',label:'Subject name',req:true,full:true},{k:'cr',label:'Credits',type:'number',v:4}],
 onSubmit:v=>{api('POST','/subjects',{dept:v.dept,sem:+v.sem,name:v.name,credits:+v.cr||3}).then(r=>{subjects.push(r.subject);S.pd=v.dept;addLog('Admin','Added subject '+v.name);toast('Subject added');render(true)}).catch(fail);return false}});
ACT.delSub=id=>{const s=subjects.find(x=>x.id===id);api('DELETE','/subjects/'+id).then(()=>{subjects=subjects.filter(x=>x.id!==id);faculty.forEach(f=>f.subs=f.subs.filter(x=>x!==id));addLog('Admin','Removed subject '+s.name);toast('Subject removed');render(true)}).catch(fail)};

/* reports */
function reports(v){
  const list=students.filter(s=>S.rd==='All'||s.dept===S.rd);
  const def=list.filter(s=>avgAtt(s)<75).sort((a,b)=>avgAtt(a)-avgAtt(b));
  const top=[...list].sort((a,b)=>avgMk(b)-avgMk(a)).slice(0,5);
  v.innerHTML=`<div class="page-h"><div><h1>Reports</h1><p>Attendance, results and strength across the college.</p></div><select data-chg="rd" style="width:auto" aria-label="Department filter"><option>All</option>${depts.map(d=>`<option ${d.c===S.rd?'selected':''}>${d.c}</option>`).join('')}</select></div>
  <div class="grid stats">${statCard('Students in report',list.length,'')}${statCard('Average attendance',r0(mean(list.map(s=>avgAtt(s))))+'%','')}${statCard('Average internals',r0(mean(list.map(s=>avgMk(s))))+'%','')}${statCard('Attendance defaulters',def.length,'Below 75%')}</div>
  <div class="grid two mb"><div class="card"><h3>Average attendance by department</h3>${depts.map(d=>{const a=r0(mean(students.filter(s=>s.dept===d.c).map(s=>avgAtt(s))));return `<div class="hbar"><span>${d.c}</span><div class="m"><i style="width:${a}%"></i></div><b class="num">${a}%</b></div>`}).join('')}
   <h3 style="margin-top:18px">Average internals by department</h3>${depts.map(d=>{const a=r0(mean(students.filter(s=>s.dept===d.c).map(s=>avgMk(s))));return `<div class="hbar"><span>${d.c}</span><div class="m"><i style="width:${a}%"></i></div><b class="num">${a}%</b></div>`}).join('')}</div>
  <div class="card"><h3>Top performers</h3><ul class="list">${top.map((s,i)=>`<li><span class="avatar soft" style="width:34px;height:34px;font-size:13px">${i+1}</span><div class="grow"><strong>${esc(s.name)}</strong><p>${s.dept} · Semester ${s.sem}</p></div><b class="num">${r0(avgMk(s))}%</b></li>`).join('')}</ul></div></div>
  <div class="card"><h3>Attendance defaulters <small style="font-weight:400;color:var(--muted)">first 30 of ${def.length}</small> <button class="btn ghost sm" data-act="csv">Copy as CSV</button></h3><div class="scroll-x"><table class="tbl"><thead><tr><th>Roll no.</th><th>Name</th><th>Dept</th><th>Sem</th><th>Attendance</th><th></th></tr></thead><tbody>
  ${def.slice(0,30).map(s=>`<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${s.dept}</td><td>${s.sem}</td><td class="num">${r0(avgAtt(s))}% ${chip('Low','bad')}</td><td class="acts"><button class="btn ghost sm" data-act="stuDetail" data-id="${s.id}">View</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">No defaulters. Everyone is above 75%.</td></tr>'}</tbody></table></div></div>`;
}
CHG.rd=v=>{S.rd=v;render(true)};
ACT.csv=()=>{
  const list=students.filter(s=>S.rd==='All'||s.dept===S.rd).filter(s=>avgAtt(s)<75);
  const csv='Roll,Name,Dept,Sem,Attendance\n'+list.map(s=>[s.roll,s.name,s.dept,s.sem,r0(avgAtt(s))].join(',')).join('\n');
  const fallback=()=>{const ta=document.createElement('textarea');ta.value=csv;ta.rows=8;openModal('CSV ready to copy',ta);ta.select()};
  try{navigator.clipboard.writeText(csv).then(()=>toast('CSV copied to clipboard'),fallback)}catch(e){fallback()}
};

/* ================= NEW VIEWS: approvals, classes, past and present, my class ================= */
function aapp(v){
  v.innerHTML=`<div class="page-h"><div><h1>Approvals</h1><p>New students, faculty and admins join once an existing admin approves them.</p></div></div>
  <div class="grid two"><div class="card"><h3>Pending requests ${chip(requests.length+' pending','warn')}</h3><div class="appr">${approvalHtml()}</div></div>
  <div class="card"><h3>Admin team ${chip(admins.length+' admins')}</h3><ul class="list">${admins.map(a=>`<li><span class="avatar soft" style="width:36px;height:36px;font-size:13px">${inits(a.name)}</span><div class="grow"><strong>${esc(a.name)}</strong><p>${esc(a.desig)} · ${esc(a.code)}<br>${esc(a.email)}</p></div>${a.primary?chip('Primary'):`<button class="btn bad sm" data-act="delAdmin" data-id="${a.id}">Remove</button>`}</li>`).join('')}</ul></div></div>`;
}
ACT.delAdmin=(id,b)=>armed(b,()=>{if(id===ME.admin){toast('You cannot remove the account you are signed in with');return}const a=admins.find(x=>x.id===id);api('DELETE','/admins/'+id).then(()=>{admins=admins.filter(x=>x.id!==id);addLog('Admin','Removed admin '+a.name);toast('Admin removed');render(true)}).catch(fail)});

function aclass(v){
  const keys=depts.flatMap(d=>[1,2,3,4,5,6].map(n=>d.c+'-'+n)).filter(k=>!S.cd||k.startsWith(S.cd+'-'));
  v.innerHTML=`<div class="page-h"><div><h1>Classes</h1><p>Every semester is one class of 40 to 60 students with one class teacher.</p></div>
   <span class="seg"><button aria-pressed="${!S.cd}" data-act="cdept" data-id="">All</button>${depts.map(d=>`<button aria-pressed="${S.cd===d.c}" data-act="cdept" data-id="${d.c}">${d.c}</button>`).join('')}</span></div>
  <div class="grid three">${keys.map(k=>{const c=classStats(k);return `<div class="card cls"><img class="banner" src="${deptArt(c.d)}" alt=""><div class="body">
   <div class="row-flex" style="justify-content:space-between"><b style="font-family:var(--font-display);font-size:17px">${c.d} · Semester ${c.sem}</b>${deptChip(c.d)}</div>
   <div style="font-size:13.5px;color:var(--muted)">Class teacher: <b style="color:var(--ink)">${esc(c.ct?.name||'Not assigned')}</b></div>
   <div class="row-flex"><span><b class="num">${c.cl.length}</b> <small style="color:var(--muted)">students</small></span><span><b class="num">${c.att}%</b> <small style="color:var(--muted)">attendance</small></span><span><b class="num">${c.ia}%</b> <small style="color:var(--muted)">internals</small></span></div>
   ${meter(c.att)}<button class="btn ghost sm" data-act="openClass" data-id="${k}">Open class</button></div></div>`}).join('')}</div>`;
}
ACT.cdept=id=>{S.cd=id;render(true)};
ACT.openClass=key=>{
  const c=classStats(key),pool=faculty.filter(f=>f.dept===c.d);
  const body=`<div class="grid stats" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">${statCard('Students',c.cl.length,'One class')}${statCard('Attendance',c.att+'%','')}${statCard('Internals',c.ia+'%','')}</div>
   <div class="toolbar"><div class="grow"><small style="color:var(--muted)">Class teacher</small><br><b>${esc(c.ct?.name||'Not assigned')}</b></div>
   ${role==='admin'?`<select id="ctSel" aria-label="Class teacher">${pool.map(f=>`<option value="${f.id}" ${c.ct?.id===f.id?'selected':''}>${esc(f.name)}</option>`).join('')}</select><button class="btn sm" data-act="setCT" data-id="${key}">Assign</button>`:''}</div>${rosterTable(c.cl)}`;
  openModal(`${c.d} Semester ${c.sem}`,body,true);
};
ACT.setCT=key=>{
  const f=faculty.find(x=>x.id===$('#ctSel').value),prev=f.ct;
  api('PUT',`/classes/${key}/teacher`,{facultyId:f.id}).then(r=>{
    r.faculty.forEach(u=>{const x=faculty.find(y=>y.id===u.id);if(x)x.ct=u.ct});
    addLog('Admin',`Assigned ${f.name} as class teacher of ${key}`);
    toast(prev&&prev!==key?`${f.name} is now class teacher of ${key}. ${prev} has no class teacher until you assign one.`:`${f.name} is now class teacher of ${key}`);
    render(true);
  }).catch(fail);
};
function fclass(v){
  const f=curFa();
  if(!f.ct){v.innerHTML=`<div class="page-h"><div><h1>My class</h1></div></div><div class="card empty">You are not a class teacher yet. An admin can assign you a class from the Classes page.</div>`;return}
  const c=classStats(f.ct);
  v.innerHTML=`<div class="page-h"><div><h1>My class: ${c.d} Semester ${c.sem}</h1><p>All ${c.cl.length} students of this semester sit in one class under your care.</p></div></div>
  <div class="grid stats">${statCard('Students',c.cl.length,'40 to 60 per class')}${statCard('Attendance',c.att+'%','')}${statCard('Internal average',c.ia+'%','')}${statCard('Low attendance',c.cl.filter(s=>avgAtt(s)<75).length,'Below 75%')}</div>
  <div class="card"><div class="toolbar"><input class="grow" data-inp="cq" placeholder="Search by name or roll number" value="${esc(S.cq)}" aria-label="Search class"><label style="display:flex;gap:8px;align-items:center;margin:0;flex:0 0 auto"><input type="checkbox" style="width:auto" data-chg="low" ${S.low?'checked':''}> Low attendance only</label></div><div id="clsRoster">${rosterTable(filterCls(c.cl))}</div></div>`;
}
INP.cq=v=>{S.cq=v;$('#clsRoster').innerHTML=rosterTable(filterCls(classStats(curFa().ct).cl))};
CHG.low=(v,el)=>{S.low=el.checked;render(true)};
ACT.fclassgo=()=>go('fclass');

function ahist(v){
  const yi=+S.hy,m=S.hm,P={};['',...depts.map(d=>d.c)].forEach(k=>P[k]=presentMetrics(k));
  const fmt=x=>m==='cgpa'?x.toFixed(2):x+'%',val=(d,i)=>histOf(d,i,P[d])[m];
  const series=depts.map(d=>({name:d.c,color:deptColor(d.c),vals:YEARS.map((_,i)=>val(d.c,i))}));
  const all=series.flatMap(s=>s.vals),pad=m==='cgpa'?.3:3,lo=Math.floor(Math.min(...all)-pad),hi=Math.max(lo+4,Math.ceil(Math.max(...all)+pad));
  const prev=histOf('',3,P['']),now=P[''];
  const dl=(a,b,suf='')=>{const d=+(a-b).toFixed(2);return d===0?chip('No change'):chip((d>0?'+':'')+(m==='cgpa'?d.toFixed(2):d)+suf+' vs last year',d>0?'good':'bad')};
  const top=d=>yi===4?students.filter(s=>s.dept===d).sort((a,b)=>avgMk(b)-avgMk(a)).slice(0,3).map(s=>[s.name,r0(avgMk(s))+'% internals'])
    :((HIST.find(h=>h.year===YEARS[yi]&&h.dept===d)||{}).toppers||[]).map(t=>[t.name,'CGPA '+Number(t.cgpa).toFixed(2)]);
  const evCounts=[2023,2024,2025,2026].map(y=>[String(y),media.filter(x=>x.year===y).length]);
  const placed=YEARS.slice(0,4).map((y,i)=>[y.slice(2),r0(mean(depts.map(d=>histOf(d.c,i,P[d.c]).placed)))]);
  v.innerHTML=`<div class="page-h"><div><h1>Past and present</h1><p>Compare earlier academic years with the current data.</p></div>
   <span class="seg" role="group" aria-label="Metric">${Object.entries(MET).map(([k,[l]])=>`<button aria-pressed="${m===k}" data-act="hmet" data-id="${k}">${k==='pass'?'First class':l}</button>`).join('')}</span></div>
  <div class="grid stats">${statCard('Present: '+(MET[m][0]),fmt(now[m]),dl(now[m],prev[m]))}${statCard('Students now',now.n,'Last year about '+prev.n)}${statCard('Attendance now',now.att+'%',dl(now.att,prev.att).replace('<span','<span'))}${statCard('Average CGPA',now.cgpa.toFixed(2),'Across semesters 2 to 6')}</div>
  <div class="card mb"><h3>${MET[m][0]} by department <span class="seg" role="group" aria-label="Academic year">${YEARS.map((y,i)=>`<button aria-pressed="${i===yi}" data-act="hyear" data-id="${i}">${y}${i===4?' (now)':''}</button>`).join('')}</span></h3>${multiLine(series,YEARS,lo,hi,yi)}</div>
  <div class="grid two mb"><div class="card"><h3>${YEARS[yi]} compared with now</h3><div class="scroll-x"><table class="tbl"><thead><tr><th>Dept</th><th>${YEARS[yi]}</th><th>Now</th><th>Change</th></tr></thead><tbody>${depts.map(d=>{const a=val(d.c,yi),b=val(d.c,4),x=+(b-a).toFixed(2);return `<tr><td>${deptChip(d.c)}</td><td class="num">${fmt(a)}</td><td class="num"><b>${fmt(b)}</b></td><td>${x===0?chip('Same'):chip((x>0?'+':'')+(m==='cgpa'?x.toFixed(2):x),x>0?'good':'bad')}</td></tr>`}).join('')}</tbody></table></div></div>
  <div class="card"><h3>Top students, ${YEARS[yi]}</h3><div class="grid two" style="gap:10px">${depts.map(d=>`<div><div style="margin-bottom:6px">${deptChip(d.c)}</div><ul class="list">${top(d.c).map((t,i)=>`<li><span class="avatar soft" style="width:30px;height:30px;font-size:12px">${i+1}</span><div class="grow"><strong style="font-size:13.5px">${esc(t[0])}</strong><p>${esc(t[1])}</p></div></li>`).join('')}</ul></div>`).join('')}</div></div></div>
  <div class="grid two"><div class="card"><h3>Events with media each year</h3>${bars(evCounts,Math.max(...evCounts.map(e=>e[1]),1))}<p class="hint" style="text-align:left">Photos and videos in the gallery by calendar year.</p></div>
  <div class="card"><h3>Placement rate of past batches</h3>${bars(placed,100)}<p class="hint" style="text-align:left">Percent of the batch placed. The ${YEARS[4]} placement drive is still ongoing.</p></div></div>`;
}
ACT.hyear=id=>{S.hy=+id;render(true)};ACT.hmet=id=>{S.hm=id;render(true)};

const VIEWS={sdash,profile,acad,tt,notices:noticesView,events,map:mapView,fdash,fclass,fstu,att,marks,perf,adash,aapp,aclass,astu,afac,adept,media:mediaView,ahist,reports};

/* ---------- command palette ---------- */
let palSel=0;
function palItems(){const items=tabsFor[role].map(([k,l])=>['Go to '+l,()=>go(k)]);items.push(['Toggle dark mode',()=>$('#theme').click()],['Sign out',signOut]);const q=$('#palIn').value.toLowerCase();return items.filter(i=>i[0].toLowerCase().includes(q))}
function palPaint(){const it=palItems();palSel=Math.min(palSel,Math.max(0,it.length-1));$('#palList').innerHTML=it.map((x,i)=>`<button class="opt ${i===palSel?'on':''}" data-i="${i}"><span>${x[0]}</span><kbd>Enter</kbd></button>`).join('')||'<div class="empty">No matches</div>';$$('#palList .opt').forEach(b=>b.onclick=()=>{closePal();it[b.dataset.i][1]()})}
function openPal(){if($('#app').hidden)return;$('#pal').hidden=false;$('#palIn').value='';palSel=0;palPaint();$('#palIn').focus()}
function closePal(){$('#pal').hidden=true}
$('#palBtn').onclick=openPal;$('#pal').onclick=e=>{if(e.target.id==='pal')closePal()};$('#palIn').oninput=()=>{palSel=0;palPaint()};
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPal();return}
  if(!$('#lb').hidden){if(e.key==='Escape')closeLB();if(e.key==='ArrowLeft')$('#lbP').click();if(e.key==='ArrowRight')$('#lbN').click();return}
  if(e.key==='Escape'&&modalEl){closeModal();return}
  if($('#pal').hidden)return;const it=palItems();
  if(e.key==='Escape')closePal();
  if(e.key==='ArrowDown'){palSel=(palSel+1)%it.length;palPaint();e.preventDefault()}
  if(e.key==='ArrowUp'){palSel=(palSel-1+it.length)%it.length;palPaint();e.preventDefault()}
  if(e.key==='Enter'&&it[palSel]){closePal();it[palSel][1]()}
});

/* ---------- start-up ---------- */
(async()=>{
  try{const d=await api('GET','/auth/departments');depts=d.depts}catch(e){}
  if(TOKEN){try{await enter()}catch(e){saveToken(null)}}
})();
})();
