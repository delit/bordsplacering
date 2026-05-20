/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
let state={guests:[],tables:[],eventName:'',seatsPerTable:10,tableShape:'rect',tableCounter:0,mode:'result'};
let undoStack=[],activeFilter='all',activeAgeFilter='all',manualGuestFilter='all',manualAgeFilter='all';
let _tableDragId=null; /* Chrome/Edge: getData() är tom under dragover */
const SK='bordsplacering_v8';
const AGE_BRACKETS=[
  {id:'0-5',label:'0–5',min:0,max:5},
  {id:'6-12',label:'6–12',min:6,max:12},
  {id:'13-17',label:'13–17',min:13,max:17},
  {id:'18-25',label:'18–25',min:18,max:25},
  {id:'36-45',label:'36–45',min:36,max:45},
  {id:'46-60',label:'46–60',min:46,max:60},
  {id:'61-70',label:'61–70',min:61,max:70},
  {id:'71+',label:'71+',min:71,max:200},
];
function ageBracketKey(age){for(const b of AGE_BRACKETS)if(age>=b.min&&age<=b.max)return b.id;return null;}
function ageBracketLabel(id){return AGE_BRACKETS.find(b=>b.id===id)?.label||id;}

const uid=()=>Math.random().toString(36).slice(2,10);
const curYear=()=>new Date().getFullYear();
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ══════════════════════════════════════
   UNDO
══════════════════════════════════════ */
const snap=()=>JSON.stringify({guests:state.guests,tables:state.tables});
function pushUndo(l){undoStack.push({l,s:snap()});if(undoStack.length>30)undoStack.shift();showUndoBar(l);}
function doUndo(){
  if(!undoStack.length)return;
  const{l,s}=undoStack.pop();
  const d=JSON.parse(s);
  state.guests=d.guests.map(g=>({...g,age:curYear()-g.birthYear}));
  state.tables=d.tables;
  persist();
  if(state.mode==='manual')renderManualView();else renderResult();
  showToast('Ångrat: '+l);hideUndoBar();
}
let _ut;
function showUndoBar(l){document.getElementById('undoMsg').textContent='Ångra: '+l;document.getElementById('undoBar').classList.add('show');clearTimeout(_ut);_ut=setTimeout(hideUndoBar,6000);}
function hideUndoBar(){document.getElementById('undoBar').classList.remove('show');}

/* ══════════════════════════════════════
   CSV
══════════════════════════════════════ */
function parseCSV(txt){
  const lines=txt.replace(/\r/g,'').split('\n').filter(l=>l.trim());
  if(!lines.length)throw new Error('Filen är tom');
  const d=lines[0].includes(';')?';':',';
  const hdr=lines[0].split(d).map(s=>s.trim().toLowerCase());
  const col=keys=>{for(const k of keys){const i=hdr.findIndex(h=>h===k||h.includes(k));if(i!==-1)return i;}return -1;};
  const iN=col(['namn','name']),iG=col(['kön','kon','gender']),iY=col(['född','fodd','år','year','birth']);
  const iS=col(['specialkost','special','kost','diet']),iO=col(['övrigt','ovrigt','other','anteckning','notering']);
  if([iN,iG,iY].includes(-1))throw new Error('CSV måste ha: Namn, Kön, Född');
  const gs=[];
  for(let i=1;i<lines.length;i++){
    const c=lines[i].split(d).map(s=>s.trim().replace(/^["']|["']$/g,''));
    if(!c[iN])continue;
    const year=parseInt(c[iY]);
    const graw=(c[iG]||'').toLowerCase();
    let gender='Annat';
    if(graw.startsWith('m'))gender='Man';
    else if(graw.startsWith('k')||graw.startsWith('f')||graw.startsWith('w'))gender='Kvinna';
    gs.push({id:uid(),name:c[iN],gender,birthYear:year,age:curYear()-year,specialDiet:iS>=0?(c[iS]||''):'',other:iO>=0?(c[iO]||''):''});
  }
  if(!gs.length)throw new Error('Inga rader hittades');
  return gs;
}

const EXAMPLE_CSV=`Namn;Kön;Född;Specialkost;Övrigt
Leif Mattsson;Man;1961;Vegan;Kommer med partner
Magnus Bergqvist;Man;2012;Vegan;Behöver nära toalett
Sofia Lindström;Kvinna;2019;Nötfri;
Daniel Persson;Man;1997;Nötfri;
Patrik Lindgren;Man;2020;Mild mat;Kommer med rullstol
Roger Mattsson;Man;1958;;
Håkan Bergman;Man;1966;Glutenfri;
Rut Nilsson;Kvinna;1978;Mild mat;
Maria Nilsson;Kvinna;1990;;
Ingrid Persson;Kvinna;1948;Nötfri;VIP-inbjudan
Christer Sjöberg;Man;1971;Glutenfri;Behöver extra benutrymme
Roger Nyström;Man;1969;;
Hedvig Holm;Kvinna;1942;;
Henrik Magnusson;Man;1971;;Önskar namnskylt på bordet
Ulrika Lindberg;Kvinna;1955;Vegan;
Ella Nilsson;Kvinna;2013;;Föredrar lugn plats
Sven Lindgren;Man;1964;Vegetarisk;Deltar ej i minglet
Sven Andersson;Man;1988;Glutenfri;Önskar plats i mitten av salen
Ulf Olsson;Man;2004;Nötfri;
Agneta Axelsson;Kvinna;2006;Vegan;Står på väntelista för plats
Erik Björk;Man;1988;;Sen ankomst ca 18:30
Lars Wikström;Man;1981;Glutenfri;
Astrid Lindgren;Kvinna;1956;;
Bengt Forsberg;Man;1962;;Önskar plats nära scen
Ida Lindström;Kvinna;1953;;
Emma Sjöberg;Kvinna;1947;;
Per Olsson;Man;2003;;
Eva Fransson;Kvinna;2010;;
Per Andersson;Man;1974;Mild mat;
Anna Magnusson;Kvinna;1980;Vegan;
Alma Johansson;Kvinna;1971;;Kommer med partner
Oskar Hansson;Man;1986;;Önskar plats nära scen
Oskar Magnusson;Man;1972;Vegan;
Ella Isaksson;Kvinna;2011;Vegetarisk;Önskar plats i mitten av salen
Karin Lindström;Kvinna;1967;Nötfri;Kommer med två gäster till
Britt Lundgren;Kvinna;1982;Vegetarisk;
Per Persson;Man;1950;;
Emil Jönsson;Man;1974;;
Monica Jansson;Kvinna;1954;Mild mat;
Hanna Lund;Kvinna;1991;;
Jan Isaksson;Man;1966;Vegan;
Arvid Holm;Man;1977;Vegetarisk;Parkering önskas
Birgitta Sandberg;Kvinna;1973;;
Ulrika Pettersson;Kvinna;2002;;Kommer från annan ort
Roger Karlsson;Man;1960;Vegetarisk;
Malin Jansson;Kvinna;2018;Laktosfri;
Hanna Fransson;Kvinna;1964;Nötfri;
Göran Wallin;Man;1997;Laktosfri;
Gustav Jansson;Man;1968;;VIP-inbjudan
Erik Forsberg;Man;1965;Glutenfri;Önskar namnskylt på bordet
Astrid Söderberg;Kvinna;1994;Mild mat;
Jenny Lindgren;Kvinna;2003;;
Christer Bergqvist;Man;1983;Laktosfri;
Johan Nilsson;Man;2017;;
Hedvig Wallin;Kvinna;1976;;Sen ankomst ca 18:30
Mats Bergqvist;Man;1952;Nötfri;
Annika Karlsson;Kvinna;1969;;Kommer från annan ort
Selma Karlsson;Kvinna;1996;;
Hanna Lindström;Kvinna;1981;;
Håkan Lindgren;Man;1988;;
Olof Sandberg;Man;1959;Glutenfri;
Britt Nilsson;Kvinna;1960;Laktosfri;
Karin Engström;Kvinna;1989;Laktosfri;Hörselnedsättning – sitt gärna till vänster
Leif Sandberg;Man;2005;Vegan;
Mats Lindberg;Man;1961;Glutenfri;
Annika Persson;Kvinna;1951;Vegetarisk;
Emma Eriksson;Kvinna;1976;;Medföljare: ett barn
Moa Axelsson;Kvinna;1945;;
Selma Fransson;Kvinna;1979;;Foto tillåts inte
Nora Lund;Kvinna;1963;Glutenfri;Kommer med rullstol
Ella Lindström;Kvinna;2009;Vegan;Bosatt utanför kommunen
Göran Lindgren;Man;1970;Glutenfri;Står på väntelista för plats
Christer Wallin;Man;1987;Vegan;
Emma Axelsson;Kvinna;1943;;Behöver extra benutrymme
Göran Jansson;Man;1990;Mild mat;Ny i föreningen
Alma Björk;Kvinna;2001;Mild mat;
Stefan Gunnarsson;Man;1946;Vegan;
Bo Isaksson;Man;1994;Laktosfri;Sen ankomst ca 18:30
Selma Persson;Kvinna;1957;Mild mat;
Erik Magnusson;Man;2015;;
Daniel Lindqvist;Man;1973;Nötfri;
Malin Sjöberg;Kvinna;1978;Mild mat;
Johan Pettersson;Man;2016;;Firar 50-årsdag
Thomas Nilsson;Man;1941;;
Jan Bergqvist;Man;1944;Laktosfri;
Lina Söderberg;Kvinna;1949;Mild mat;
Thomas Lundgren;Man;2008;Glutenfri;Behöver assistans vid inpassering
Monica Johansson;Kvinna;2014;;Deltar ej i minglet
Henrik Lund;Man;2007;;
Mats Sandberg;Man;2023;;Kommer från annan ort
Tilda Bergman;Kvinna;1975;;
Björn Björk;Man;1979;Vegan;
Oscar Berg;Man;2004;Vegan;Gäst till ordföranden
Kerstin Eriksson;Kvinna;2001;;
Leif Magnusson;Man;1985;;
Frida Isaksson;Kvinna;2021;Glutenfri;Önskar plats nära scen
Lars Nyström;Man;1998;;Behöver extra benutrymme
Karl Andersson;Man;1984;Nötfri;
Johan Wikström;Man;2022;Nötfri;Föredrar lugn plats
Astrid Bergman;Kvinna;1966;Nötfri;`;

function updateDropzoneAfterImport(label,guests){
  const dz=document.getElementById('dropzone');
  if(dz)dz.classList.add('loaded');
  const dzIcon=document.getElementById('dzIcon');if(dzIcon)dzIcon.textContent='✓';
  const dzText=document.getElementById('dzText');
  if(dzText)dzText.innerHTML=`<strong>${esc(label)}</strong> — ${guests.length} gäster`;
  const m=guests.filter(g=>g.gender==='Man').length;
  const sk=guests.filter(g=>g.specialDiet).length;
  const dzSub=document.getElementById('dzSub');
  if(dzSub)dzSub.textContent=`${m} män · ${guests.length-m} övriga · ${sk} med specialkost · klicka igen för att byta fil`;
  const btnC=document.getElementById('btnCreate');if(btnC)btnC.disabled=false;
}
function applyGuestImport(guests,label){
  uploadedGuests=guests;
  updateDropzoneAfterImport(label,guests);
}
async function loadExampleData(e){
  if(e){e.preventDefault();e.stopPropagation();}
  try{
    const res=await fetch('exempel_gaster.csv');
    if(!res.ok)throw new Error('fetch');
    applyGuestImport(parseCSV(await res.text()),'exempel_gaster.csv');
  }catch{
    applyGuestImport(parseCSV(EXAMPLE_CSV),'Exempeldata');
  }
  showToast('Exempeldata inläst');
}
async function downloadExampleCsv(e){
  if(e){e.preventDefault();e.stopPropagation();}
  let csv=EXAMPLE_CSV;
  try{
    const res=await fetch('exempel_gaster.csv');
    if(res.ok)csv=await res.text();
  }catch{}
  const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='exempel_gaster.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  showToast('exempel_gaster.csv nedladdad');
}

function guestFormFieldsHtml(birthYear=1970){
  return `<div class="modal-form-row"><label>Namn</label><input type="text" id="nN" placeholder="Förnamn Efternamn"></div>
      <div class="modal-form-row"><label>Kön</label>
        <select id="nG">
          <option value="Man">Man</option>
          <option value="Kvinna">Kvinna</option>
          <option value="Annat">Annat / Vill ej uppge</option>
        </select>
      </div>
      <div class="modal-form-row"><label>Specialkost</label><input type="text" id="nS" placeholder="valfritt"></div>
      <div class="modal-form-row"><label>Övrigt</label><input type="text" id="nO" placeholder="valfritt"></div>
      <div class="modal-form-row"><label>Födelseår</label><input type="number" id="nY" min="1920" max="${curYear()}" value="${birthYear}"></div>`;
}
function readNewGuestForm(){
  const name=document.getElementById('nN').value.trim();
  if(!name){showToast('Ange ett namn');return null;}
  const year=parseInt(document.getElementById('nY').value)||1970;
  return{id:uid(),name,gender:document.getElementById('nG').value,specialDiet:(document.getElementById('nS').value||'').trim(),other:(document.getElementById('nO').value||'').trim(),birthYear:year,age:curYear()-year,tableId:null,seatIndex:null};
}
function openAddGuestModal(){
  const root=document.getElementById('modalRoot');
  root.innerHTML=`<div class="modal-backdrop" id="mb"><div class="modal" onclick="event.stopPropagation()">
    <div class="modal-head">
      <div class="modal-name">Ny gäst</div>
      <div class="modal-tag">Läggs till i gästlistan</div>
    </div>
    <div class="modal-body">${guestFormFieldsHtml()}</div>
    <div class="modal-foot">
      <button class="ghost small" id="btnClose">Avbryt</button>
      <button class="primary small" id="btnAddNew">Lägg till</button>
    </div>
  </div></div>`;
  document.getElementById('mb').addEventListener('click',closeModal);
  document.getElementById('btnClose').addEventListener('click',closeModal);
  document.getElementById('btnAddNew').addEventListener('click',()=>{
    const ng=readNewGuestForm();if(!ng)return;
    pushUndo('Ny gäst');
    state.guests.push(ng);
    persist();
    if(state.mode==='manual'){renderNameList();renderBoardPanel();updateManualStatus();}
    else{renderStats();renderUnplaced();renderTables();}
    closeModal();showToast(ng.name+' tillagd');
  });
  setTimeout(()=>document.getElementById('nN')?.focus(),50);
}

/* ══════════════════════════════════════
   PLACEMENT ALGORITHM
══════════════════════════════════════ */
function createTables(n,seats,shape){
  const ts=[];
  for(let i=0;i<n;i++){ts.push({id:uid(),number:i+1,seats:new Array(seats).fill(null),shape});state.tableCounter=Math.max(state.tableCounter,i+1);}
  return ts;
}
function orderByAgeSpread(list){
  const a=[...list].sort((x,y)=>x.age-y.age);
  if(a.length<=1)return a;
  const out=[];let lo=0,hi=a.length-1;let takeLo=true;
  while(lo<=hi){
    if(takeLo)out.push(a[lo++]);else out.push(a[hi--]);
    takeLo=!takeLo;
  }
  return out;
}

function interleaveGenders(men,women,other){
  const m=orderByAgeSpread(men);
  const w=orderByAgeSpread(women);
  const o=orderByAgeSpread(other);
  const out=[];
  const n=Math.max(m.length,w.length);
  for(let i=0;i<n;i++){
    if(i<m.length)out.push(m[i]);
    if(i<w.length)out.push(w[i]);
  }
  o.forEach((g,oi)=>{
    if(!out.length){out.push(g);return;}
    const at=Math.min(out.length,Math.max(0,Math.floor((oi+1)*out.length/(o.length+1))));out.splice(at,0,g);
  });
  return out;
}

/** Åldersfördelning till bord, sedan per bord: kön varannan och spridd ålder. */
function autoPlace(guests,tables){
  if(!tables.length||!guests.length)return;
  const nSeats=Math.max(1,tables[0].seats.length||10);
  tables.forEach(t=>{t.seats=new Array(nSeats).fill(null);});
  guests.forEach(g=>{g.tableId=null;g.seatIndex=null;});

  const gsort=[...guests].sort((a,b)=>a.age-b.age);
  const buckets=tables.map(()=>[]);
  gsort.forEach((g,i)=>buckets[i%tables.length].push(g));

  tables.forEach((table,ti)=>{
    const pool=buckets[ti];
    if(!pool.length)return;
    const men=orderByAgeSpread(pool.filter(g=>g.gender==='Man'));
    const women=orderByAgeSpread(pool.filter(g=>g.gender==='Kvinna'));
    const other=orderByAgeSpread(pool.filter(g=>g.gender!=='Man'&&g.gender!=='Kvinna'));
    const row=interleaveGenders(men,women,other);
    row.forEach((g,si)=>{
      if(si<table.seats.length&&g){
        table.seats[si]=g.id;g.tableId=table.id;g.seatIndex=si;
      }
    });
  });

  guests.filter(g=>!g.tableId).forEach(g=>{
    for(const t of tables){
      const i=t.seats.indexOf(null);
      if(i!==-1){t.seats[i]=g.id;g.tableId=t.id;g.seatIndex=i;break;}
    }
  });
}

function removeGuestFromSeats(gid){
  for(const t of state.tables){
    for(let i=0;i<t.seats.length;i++)if(t.seats[i]===gid){t.seats[i]=null;break;}
  }
}

/** Placera delmängd i lediga rutor; samma fördelning som ovan. */
function autoPlaceIntoEmptySlots(moving,tables){
  if(!tables.length||!moving.length)return true;
  const nSeats=state.seatsPerTable||tables[0].seats.length||10;
  tables.forEach(t=>{
    while(t.seats.length<nSeats)t.seats.push(null);
    if(t.seats.length>nSeats)t.seats.length=nSeats;
  });
  const mov=[...moving];
  const idSet=new Set(mov.map(g=>g.id));
  let nNull=0;tables.forEach(t=>t.seats.forEach(s=>{if(s===null)nNull++;}));
  let nPool=0;tables.forEach(t=>t.seats.forEach(s=>{if(s&&idSet.has(s))nPool++;}));
  if(mov.length>nNull+nPool)return false;
  mov.forEach(g=>{g.tableId=null;g.seatIndex=null;removeGuestFromSeats(g.id);});
  const nullIdx=tables.map(t=>t.seats.map((s,i)=>s===null?i:-1).filter(i=>i>=0));
  const totalFree=nullIdx.reduce((a,ix)=>a+ix.length,0);
  if(mov.length>totalFree)return false;
  const pool=[...mov].sort((a,b)=>a.age-b.age);
  const assign=tables.map(()=>[]);
  for(const g of pool){
    let best=-1,bestRem=-1;
    for(let ti=0;ti<tables.length;ti++){
      const rem=nullIdx[ti].length-assign[ti].length;
      if(rem>0&&rem>bestRem){bestRem=rem;best=ti;}
    }
    if(best<0)break;
    assign[best].push(g);
  }
  tables.forEach((table,ti)=>{
    const p=assign[ti];
    if(!p.length)return;
    const men=orderByAgeSpread(p.filter(g=>g.gender==='Man'));
    const women=orderByAgeSpread(p.filter(g=>g.gender==='Kvinna'));
    const other=orderByAgeSpread(p.filter(g=>g.gender!=='Man'&&g.gender!=='Kvinna'));
    const row=interleaveGenders(men,women,other);
    const slots=nullIdx[ti].slice().sort((a,b)=>a-b);
    row.forEach((g,pi)=>{
      if(pi<slots.length){
        const si=slots[pi];
        table.seats[si]=g.id;g.tableId=table.id;g.seatIndex=si;
      }
    });
  });
  mov.filter(g=>!g.tableId).forEach(g=>{
    for(const t of tables){
      const i=t.seats.indexOf(null);
      if(i!==-1){t.seats[i]=g.id;g.tableId=t.id;g.seatIndex=i;break;}
    }
  });
  return!mov.some(x=>!x.tableId);
}

/** Yngst först; fyll bord 1 (alla platser) ordnat, därefter bord 2, osv. */
function placeByAgeInTableOrder(guests, tables){
  if(!tables.length||!guests.length)return;
  guests.forEach(g=>{g.tableId=null;g.seatIndex=null;});
  const ordered=[...guests].sort((a,b)=>a.age-b.age||a.birthYear-b.birthYear||a.name.localeCompare(b.name,'sv'));
  let i=0;
  for(const t of tables){
    t.seats=t.seats.map(()=>null);
    for(let s=0;s<t.seats.length&&i<ordered.length;s++){
      const g=ordered[i];
      t.seats[s]=g.id;g.tableId=t.id;g.seatIndex=s;i++;
    }
  }
}

/* ══════════════════════════════════════
   GENDER + GUEST META
══════════════════════════════════════ */
function genderCls(g){
  if(g.gender==='Man')return 'male';
  if(g.gender==='Kvinna')return 'female';
  return 'other';
}
function guestMetaLine(g){
  const parts=[`${g.age} år`];
  if(g.specialDiet)parts.push(g.specialDiet);
  if(g.other)parts.push(g.other);
  return parts.join(' · ');
}
function guestMarkIcons(g){
  const parts=[];
  if(g.specialDiet)parts.push(`<span class="guest-mark guest-mark--diet" title="${esc(g.specialDiet)}" aria-label="Specialkost: ${esc(g.specialDiet)}">★</span>`);
  if(g.other)parts.push(`<span class="guest-mark guest-mark--other" title="${esc(g.other)}" aria-label="Övrigt: ${esc(g.other)}">◆</span>`);
  return parts.length?`<span class="guest-marks">${parts.join('')}</span>`:'';
}
/* ══════════════════════════════════════
   RENDER: SETUP → RESULT
══════════════════════════════════════ */
function showSetup(){
  document.getElementById('setupView').style.display='';
  document.getElementById('resultView').style.display='none';
  document.getElementById('manualView').style.display='none';
  document.getElementById('bottomToolbar').classList.remove('visible');
  ['btnHome','btnExport','btnUndo'].forEach(id=>document.getElementById(id).style.display='none');
  document.querySelector('main').style.padding='';
  document.querySelector('header').style.display='none';
  const mPl=document.getElementById('manualPlacement');
  const aPl=document.getElementById('ageOrderPlacement');
  if(mPl){mPl.checked=false;mPl.disabled=false;}
  if(aPl){aPl.checked=false;aPl.disabled=false;}
  document.getElementById('manualToggleLabel')?.classList.remove('muted');
  document.getElementById('ageOrderToggleLabel')?.classList.remove('muted');
  const more=document.getElementById('morePlacementOptions');
  if(more)more.setAttribute('hidden','');
  const lnk=document.getElementById('linkFlerAlternativ');
  if(lnk)lnk.setAttribute('aria-expanded','false');
}
function renderResult(){
  state.mode='result';
  document.getElementById('setupView').style.display='none';
  document.getElementById('resultView').style.display='';
  document.getElementById('manualView').style.display='none';
  document.getElementById('bottomToolbar').classList.add('visible');
  ['btnHome','btnExport','btnUndo'].forEach(id=>document.getElementById(id).style.display='');
  document.querySelector('main').style.padding='';
  document.querySelector('header').style.display='';
  renderStats();renderFilterBar();renderUnplaced();renderTables();
}
function renderStats(){
  const placed=state.guests.filter(g=>g.tableId).length;
  const total=state.tables.reduce((a,t)=>a+t.seats.length,0);
  const men=state.guests.filter(g=>g.gender==='Man').length;
  const women=state.guests.filter(g=>g.gender==='Kvinna').length;
  document.getElementById('stats').innerHTML=`
    <div class="stat"><div class="stat-value"><em>${state.tables.length}</em></div><div class="stat-label">Bord</div></div>
    <div class="stats-divider"></div>
    <div class="stat"><div class="stat-value">${placed}</div><div class="stat-label">Placerade</div></div>
    <div class="stat"><div class="stat-value">${total-placed}</div><div class="stat-label">Lediga platser</div></div>
    <div class="stats-divider"></div>
    <div class="stat"><div class="stat-value">${men}</div><div class="stat-label">Män</div></div>
    <div class="stat"><div class="stat-value">${women}</div><div class="stat-label">Kvinnor</div></div>
    ${state.eventName?`<div class="stats-divider"></div><div class="stat"><div class="stat-value" style="font-style:italic;font-size:18px">${esc(state.eventName)}</div></div>`:''}
  `;
}
function renderFilterBar(){
  document.querySelectorAll('[data-filter]').forEach(btn=>{
    const a=btn.dataset.filter===activeFilter;
    btn.classList.toggle('active-filter',a);btn.classList.toggle('ghost',!a);
  });
  document.querySelectorAll('[data-age-filter]').forEach(btn=>{
    const a=btn.dataset.ageFilter===activeAgeFilter;
    btn.classList.toggle('active-filter',a);btn.classList.toggle('ghost',!a);
  });
}
function renderManualFilterBar(){
  document.querySelectorAll('[data-manual-filter]').forEach(btn=>{
    const a=btn.dataset.manualFilter===manualGuestFilter;
    btn.classList.toggle('active-filter',a);
    btn.classList.toggle('ghost',!a);
  });
  document.querySelectorAll('[data-manual-age-filter]').forEach(btn=>{
    const a=btn.dataset.manualAgeFilter===manualAgeFilter;
    btn.classList.toggle('active-filter',a);
    btn.classList.toggle('ghost',!a);
  });
}
function fMatch(g,genderF,ageF){
  if(genderF!=='all'&&(genderF==='Man'||genderF==='Kvinna')&&g.gender!==genderF)return false;
  if(ageF!=='all'&&ageBracketKey(g.age)!==ageF)return false;
  return true;
}
function guestDimmed(g){
  const gf=state.mode==='manual'?manualGuestFilter:activeFilter;
  const af=state.mode==='manual'?manualAgeFilter:activeAgeFilter;
  return!fMatch(g,gf,af);
}
function matchAutoGroup(g,group){
  if(group==='all')return true;
  if(group==='Man'||group==='Kvinna')return g.gender===group;
  return ageBracketKey(g.age)===group;
}
function renderUnplaced(){
  const up=state.guests.filter(g=>!g.tableId);
  const root=document.getElementById('unplacedPanel');
  if(!up.length){root.innerHTML='';return;}
  root.innerHTML=`<div class="unplaced">
    <div class="unplaced-head">
      <div class="unplaced-title">Oplacerade gäster (${up.length})</div>
      <div style="font-size:12px;color:var(--ink-faint)">Dra till bord · klicka för info</div>
    </div>
    <div class="unplaced-list">
      ${up.map(g=>{const gc=genderCls(g);const dim=guestDimmed(g)?'dimmed':'';
        return `<div class="unplaced-chip ${gc} ${dim}" draggable="true" data-guest-id="${g.id}" title="${esc(guestMetaLine(g))}">
          <div class="uc-body"><span class="uc-name">${esc(g.name)}${guestMarkIcons(g)}</span></div></div>`;
      }).join('')}
    </div>
  </div>`;
  root.querySelectorAll('.unplaced-chip').forEach(el=>{
    el.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='move';const p=JSON.stringify({guestId:el.dataset.guestId,type:'unplaced'});e.dataTransfer.setData('text/plain',p);e.dataTransfer.setData('application/seat',p);});
    el.addEventListener('click',()=>openGuestModal(el.dataset.guestId));
  });
}
function renderTables(){
  const grid=document.getElementById('tablesGrid');
  if(!state.tables.length){grid.innerHTML='<div style="padding:40px;color:var(--ink-faint);text-align:center;grid-column:1/-1">Inga bord ännu.</div>';return;}
  grid.innerHTML=state.tables.map(renderCard).join('');
  attachHandlers();
}
function renderCard(t){
  const placed=t.seats.filter(Boolean).length;
  const shape=t.shape||state.tableShape||'rect';
  const visual=shape==='round'?renderRound(t):renderRect(t);
  return `<div class="table-card" data-table-id="${t.id}" data-shape="${shape}">
    <div class="table-head">
      <div class="table-head-left">
        <div class="table-num"><em>Bord</em> ${t.number}</div>
        <button class="btn-table-info" data-open-table="${t.id}" title="Sammanställning">i</button>
      </div>
      <div class="table-meta">${placed}/${t.seats.length}</div>
    </div>
    ${visual}
    <div class="table-actions">
      <div class="table-actions-btns" style="display:flex;gap:4px">
        <button class="ghost small" data-action="add-seat" data-table-id="${t.id}">+ plats</button>
        <button class="ghost small" data-action="remove-seat" data-table-id="${t.id}">− plats</button>
        <button class="ghost-danger small" data-action="remove-table" data-table-id="${t.id}">Ta bort</button>
      </div>
      <div class="table-drag-handle" draggable="true" data-table-drag="${t.id}" role="img" aria-label="Dra för att byta bord" title="Dra för att byta position med annat bord"><svg class="table-drag-grip" draggable="false" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="6" cy="4.5" r="1.25" fill="none" stroke="currentColor"/><circle cx="6" cy="10" r="1.25" fill="none" stroke="currentColor"/><circle cx="6" cy="15.5" r="1.25" fill="none" stroke="currentColor"/><circle cx="14" cy="4.5" r="1.25" fill="none" stroke="currentColor"/><circle cx="14" cy="10" r="1.25" fill="none" stroke="currentColor"/><circle cx="14" cy="15.5" r="1.25" fill="none" stroke="currentColor"/></svg></div>
    </div>
  </div>`;
}
/** Cirkelradie i % av lådans sida. Kordan 2*R*sin(pi/n) ska ≥ lapp+gap; W ska följa .table-visual-round max-bredd (px). Få stolar: yttre ring. */
function roundRadiusPercent(n){
  if(n<1)return 0;
  const s=Math.sin(Math.PI/n);
  const w=120,gap=10; /* samma som CSS .table-visual-round .seat width */
  const W=640; /* inner ~ max-width; kvadrat så cirkel blir jämn i pixlar */
  const rMax=50-(w*100)/(2*W)-0.5; /* högermost lapps centrum+halv bredd får lika motsv. vänsterkant */
  const chordMin=((w+gap)*100)/(2*W*s);
  let r=chordMin;
  if(n<=6)r=Math.max(r,38);
  r=Math.min(r,rMax);
  return Math.max(27,Math.min(44,r));
}
function renderRound(t){
  const n=t.seats.length;
  const r=roundRadiusPercent(n);
  const seats=t.seats.map((gid,i)=>{
    const angle=(i/n)*2*Math.PI-Math.PI/2;
    const x=50+r*Math.cos(angle),y=50+r*Math.sin(angle);
    return seatHtml(gid,t.id,i,true,`left:${x}%;top:${y}%`);
  }).join('');
  return `<div class="table-visual-round"><div class="round-center" aria-hidden="true"><span class="round-center-num">${t.number}</span></div>${seats}</div>`;
}
function renderRect(t){
  // CORRECT: autoPlace produces seats as M,W,M,W,M,W (mergeAlternate).
  // Split into first-half (left col) and second-half (right col):
  //   Left  = [M,W,M,W,M] — alternates ✓
  //   Right = [W,M,W,M,W] — alternates ✓
  // This guarantees no side is all one gender.
  const n=t.seats.length;
  const half=Math.ceil(n/2);
  const leftSeats=t.seats.slice(0,half).map((gid,i)=>({gid,i}));
  const rightSeats=t.seats.slice(half).map((gid,i)=>({gid,i:half+i}));
  return `<div class="table-visual-rect">
    <div class="rect-col rect-col--seats-l">${leftSeats.map(({gid,i})=>seatHtml(gid,t.id,i,false,'','trailing')).join('')}</div>
    <div class="rect-surface">${t.number}</div>
    <div class="rect-col rect-col--seats-r">${rightSeats.map(({gid,i})=>seatHtml(gid,t.id,i,false,'','leading')).join('')}</div>
  </div>`;
}
function sCls(g){
  const gc=genderCls(g);
  const dim=guestDimmed(g)?'dimmed':'';
  return[gc,dim].filter(Boolean).join(' ');
}
/** barPos: avlångt — trailing = färgremsa höger (vänster kolum), leading = färgremsa vänster (höger kolum). Runt bord: utelämna. */
function seatHtml(gid,tableId,idx,isAbs,style,barPos){
  const leading=barPos==='leading';
  const cls=isAbs?'seat':'seat-inline';
  const barClass=leading?'seat-left-bar':'seat-right-bar';
  if(!gid){
    const bar=`<div class="${barClass} none"></div>`;
    return `<div class="${cls} empty" ${style?`style="${style}"`:''}
                 data-table-id="${tableId}" data-seat-index="${idx}">
               ${leading?bar:''}
               <div class="seat-body" style="text-align:center">+</div>
               ${leading?'':bar}
             </div>`;
  }
  const g=state.guests.find(x=>x.id===gid);if(!g)return '';
  const gc=genderCls(g);
  const bar=`<div class="${barClass} ${gc}"></div>`;
  const body=`<div class="seat-body">${esc(g.name)}<span class="seat-age">${g.age}</span>${guestMarkIcons(g)}</div>`;
  return `<div class="${cls} ${sCls(g)}" ${style?`style="${style}"`:''}
               draggable="true"
               data-guest-id="${g.id}" data-table-id="${tableId}" data-seat-index="${idx}"
               title="${esc(guestMetaLine(g))}">
             ${leading?bar:''}
             ${body}
             ${leading?'':bar}
           </div>`;
}

/* ══════════════════════════════════════
   DRAG HANDLERS (result + manual)
══════════════════════════════════════ */
function wireTableSwap(root){
  root.querySelectorAll('[data-table-drag]').forEach(handle=>{
    handle.addEventListener('dragstart',e=>{
      e.stopPropagation();
      const tid=handle.dataset.tableDrag;
      _tableDragId=tid;
      e.dataTransfer.effectAllowed='move';
      const p=JSON.stringify({type:'table-swap',tableId:tid});
      e.dataTransfer.setData('text/plain',p);
      e.dataTransfer.setData('application/tableswap',p);
      handle.closest('.table-card')?.classList.add('table-dragging-source');
    });
    handle.addEventListener('dragend',()=>{
      _tableDragId=null;
      root.querySelectorAll('.table-dragging-source,.table-drag-over').forEach(x=>x.classList.remove('table-dragging-source','table-drag-over'));
    });
  });
  root.querySelectorAll('.table-card').forEach(card=>{
    card.addEventListener('dragenter',e=>{
      if(_tableDragId&&_tableDragId!==card.dataset.tableId){e.preventDefault();e.stopPropagation();}
    });
    card.addEventListener('dragover',e=>{
      if(_tableDragId&&_tableDragId!==card.dataset.tableId){
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect='move';
        card.classList.add('table-drag-over');
      }
    });
    card.addEventListener('dragleave',e=>{if(!card.contains(e.relatedTarget))card.classList.remove('table-drag-over');});
    card.addEventListener('drop',e=>{
      card.classList.remove('table-drag-over');
      const src=_tableDragId;
      if(src&&src!==card.dataset.tableId){
        e.preventDefault();
        e.stopPropagation();
        swapTables(src,card.dataset.tableId);
      }
      _tableDragId=null;
    });
  });
}
function parseSeatDropPayload(e){
  let d=null;try{
    d=JSON.parse(
      e.dataTransfer.getData('application/seat')||
      e.dataTransfer.getData('application/mguest')||
      e.dataTransfer.getData('text/plain')
    );
  }catch{return null}
  if(!d||d.type==='table-swap')return null;
  return d;
}
function applySeatDropMutation(d,tTid,tSi){
  const tT=state.tables.find(x=>x.id===tTid);if(!tT)return;
  if(d.type==='unplaced'||d.type==='manual-guest'){
    const g=state.guests.find(x=>x.id===d.guestId);if(!g||g.tableId)return;
    const ex=tT.seats[tSi];if(ex){const eg=state.guests.find(x=>x.id===ex);if(eg){eg.tableId=null;eg.seatIndex=null;}}
    tT.seats[tSi]=g.id;g.tableId=tTid;g.seatIndex=tSi;
  }else if(d.type==='seat'){
    const sT=state.tables.find(x=>x.id===d.tableId);if(!sT)return;
    if(d.tableId===tTid&&d.seatIndex===tSi)return;
    const sId=sT.seats[d.seatIndex],tId=tT.seats[tSi];
    sT.seats[d.seatIndex]=tId;tT.seats[tSi]=sId;
    if(sId){const g=state.guests.find(x=>x.id===sId);if(g){g.tableId=tTid;g.seatIndex=tSi;}}
    if(tId){const g=state.guests.find(x=>x.id===tId);if(g){g.tableId=d.tableId;g.seatIndex=d.seatIndex;}}
  }
}
function seatDrop(e,el){
  const d=parseSeatDropPayload(e);if(!d)return;
  const tTid=el.dataset.tableId,tSi=+el.dataset.seatIndex;
  if(d.type==='unplaced'||d.type==='manual-guest'){
    const g=state.guests.find(x=>x.id===d.guestId);
    if(!g||g.tableId)return;
  }else if(d.type==='seat'){
    const sT=state.tables.find(x=>x.id===d.tableId);
    if(!sT)return;
    if(d.tableId===tTid&&d.seatIndex===tSi)return;
  }
  pushUndo('Flytta gäst');
  applySeatDropMutation(d,tTid,tSi);
  persist();renderStats();renderUnplaced();renderTables();
}
function manualSeatDrop(e,el){
  const d=parseSeatDropPayload(e);if(!d)return;
  const tTid=el.dataset.tableId,tSi=+el.dataset.seatIndex;
  if(d.type==='unplaced'||d.type==='manual-guest'){
    const g=state.guests.find(x=>x.id===d.guestId);
    if(!g||g.tableId)return;
  }else if(d.type==='seat'){
    const sT=state.tables.find(x=>x.id===d.tableId);
    if(!sT)return;
    if(d.tableId===tTid&&d.seatIndex===tSi)return;
  }
  pushUndo('Flytta gäst');
  applySeatDropMutation(d,tTid,tSi);
  persist();renderNameList();renderBoardPanel();updateManualStatus();
}
function attachHandlers(){
  const root=document.getElementById('tablesGrid');
  if(!root)return;
  root.querySelectorAll('.seat:not(.empty),.seat-inline:not(.empty)').forEach(el=>{
    let dragged=false;
    el.addEventListener('dragstart',e=>{
      dragged=true;el.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
      const p=JSON.stringify({guestId:el.dataset.guestId,tableId:el.dataset.tableId,seatIndex:+el.dataset.seatIndex,type:'seat'});
      e.dataTransfer.setData('text/plain',p);e.dataTransfer.setData('application/seat',p);
      e.stopPropagation();
    });
    el.addEventListener('dragend',()=>{el.classList.remove('dragging');root.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));setTimeout(()=>{dragged=false;},60);});
    el.addEventListener('click',e=>{if(!dragged)openGuestModal(el.dataset.guestId);});
    el.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();el.classList.add('drag-over');});
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();el.classList.remove('drag-over');seatDrop(e,el);});
  });
  root.querySelectorAll('.seat.empty,.seat-inline.empty').forEach(el=>{
    el.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();el.classList.add('drag-over');});
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();el.classList.remove('drag-over');seatDrop(e,el);});
    el.addEventListener('click',()=>openEmptySeat(el.dataset.tableId,+el.dataset.seatIndex));
  });
  root.querySelectorAll('[data-open-table]').forEach(el=>{el.addEventListener('click',e=>{e.stopPropagation();openSummary(el.dataset.openTable);});});
  root.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const a=btn.dataset.action,tid=btn.dataset.tableId;
      if(a==='add-seat')addSeat(tid);
      else if(a==='remove-seat')removeSeat(tid);
      else if(a==='remove-table'){if(!confirm(`Ta bort Bord ${state.tables.find(x=>x.id===tid)?.number}? Gästerna blir oplacerade.`))return;removeTable(tid);}
    });
  });
  wireTableSwap(root);
}
function attachManualBoardHandlers(){
  const board=document.getElementById('boardPanel');
  if(!board)return;
  board.querySelectorAll('.seat:not(.empty),.seat-inline:not(.empty)').forEach(el=>{
    let dragged=false;
    el.addEventListener('dragstart',e=>{
      dragged=true;el.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
      const p=JSON.stringify({guestId:el.dataset.guestId,tableId:el.dataset.tableId,seatIndex:+el.dataset.seatIndex,type:'seat'});
      e.dataTransfer.setData('text/plain',p);e.dataTransfer.setData('application/seat',p);
      e.stopPropagation();
    });
    el.addEventListener('dragend',()=>{el.classList.remove('dragging');board.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));setTimeout(()=>{dragged=false;},60);});
    el.addEventListener('click',e=>{if(!dragged)openGuestModal(el.dataset.guestId);});
    el.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();el.classList.add('drag-over');});
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();el.classList.remove('drag-over');manualSeatDrop(e,el);});
  });
  board.querySelectorAll('.seat.empty,.seat-inline.empty').forEach(el=>{
    el.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();el.classList.add('drag-over');});
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();el.classList.remove('drag-over');manualSeatDrop(e,el);});
    el.addEventListener('click',()=>openEmptySeat(el.dataset.tableId,+el.dataset.seatIndex));
  });
  board.querySelectorAll('[data-open-table]').forEach(el=>{el.addEventListener('click',e=>{e.stopPropagation();openSummary(el.dataset.openTable);});});
  board.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const a=btn.dataset.action,tid=btn.dataset.tableId;
      if(a==='add-seat')addSeat(tid);
      else if(a==='remove-seat')removeSeat(tid);
      else if(a==='remove-table'){if(!confirm(`Ta bort Bord ${state.tables.find(x=>x.id===tid)?.number}? Gästerna blir oplacerade.`))return;removeTable(tid);}
    });
  });
  wireTableSwap(board);
}
function swapTables(idA,idB){
  if(idA===idB)return;pushUndo('Byta bord');
  const a=state.tables.find(x=>x.id===idA),b=state.tables.find(x=>x.id===idB);if(!a||!b)return;
  const numA=a.number,numB=b.number;
  [a.seats,b.seats]=[b.seats,a.seats];[a.shape,b.shape]=[b.shape,a.shape];
  a.seats.forEach((gid,si)=>{if(gid){const g=state.guests.find(x=>x.id===gid);if(g){g.tableId=a.id;g.seatIndex=si;}}});
  b.seats.forEach((gid,si)=>{if(gid){const g=state.guests.find(x=>x.id===gid);if(g){g.tableId=b.id;g.seatIndex=si;}}});
  persist();
  if(state.mode==='manual'){renderBoardPanel();updateManualStatus();}else{renderStats();renderTables();}
  showToast(`Bord ${numA} och ${numB} bytte gästlista`);
}

/* ══════════════════════════════════════
   MANUAL PLACEMENT VIEW
══════════════════════════════════════ */
function renderManualView(){
  state.mode='manual';
  document.getElementById('setupView').style.display='none';
  document.getElementById('resultView').style.display='none';
  document.getElementById('manualView').style.display='block';
  document.getElementById('bottomToolbar').classList.remove('visible');
  ['btnHome','btnExport','btnUndo'].forEach(id=>document.getElementById(id).style.display='none');
  document.querySelector('header').style.display='none';
  document.querySelector('main').style.padding='0';
  renderNameList();
  renderBoardPanel();
  updateManualStatus();
}

function renderNameList(){
  const body=document.getElementById('nameListBody');
  const sorted=[...state.guests]
    .filter(g=>fMatch(g,manualGuestFilter,manualAgeFilter))
    .sort((a,b)=>{
      const gOrder={Man:0,Kvinna:1,Annat:2};
      const gd=(gOrder[a.gender]??2)-(gOrder[b.gender]??2);
      if(gd!==0)return gd;
      return a.name.localeCompare(b.name,'sv');
    });
  if(!sorted.length){
    body.innerHTML=`<div class="name-list-empty"><p>Inga gäster ännu.</p><button type="button" class="small primary" id="btnAddGuestEmpty">+ Lägg till gäst</button></div>`;
    document.getElementById('btnAddGuestEmpty')?.addEventListener('click',openAddGuestModal);
    renderManualFilterBar();
    updateManualStatus();
    return;
  }
  body.innerHTML=sorted.map(g=>{
    const gc=genderCls(g);
    const placed=!!g.tableId;
    return `<div class="name-card ${gc} ${placed?'placed':''}" draggable="${!placed}" data-guest-id="${g.id}" title="${esc(guestMetaLine(g))}">
      <div class="nc-body">
        <span class="nc-name">${esc(g.name)}${guestMarkIcons(g)}</span>
        <div class="nc-meta">
          <span class="nc-age">${g.age} år</span>
          ${g.specialDiet?`<span class="nc-diet">${esc(g.specialDiet)}</span>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
  renderManualFilterBar();
  // Wire drag
  body.querySelectorAll('.name-card').forEach(el=>{
    let didDrag=false;
    if(!el.classList.contains('placed')){
      el.addEventListener('dragstart',e=>{
        el.classList.add('dragging-nc');
        didDrag=true;
        e.dataTransfer.effectAllowed='copy';
        const p=JSON.stringify({guestId:el.dataset.guestId,type:'manual-guest'});
        e.dataTransfer.setData('text/plain',p);
        e.dataTransfer.setData('application/mguest',p);
      });
      el.addEventListener('dragend',()=>{el.classList.remove('dragging-nc');setTimeout(()=>{didDrag=false;},100);});
    }
    el.addEventListener('click',()=>{if(!didDrag)openGuestModal(el.dataset.guestId);});
  });
  updateManualStatus();
}

function renderBoardPanel(){
  const panel=document.getElementById('boardPanel');
  if(!state.tables.length){
    panel.innerHTML='<div style="padding:32px 20px;color:var(--ink-faint);text-align:center">Inga bord. Skapa bordsplacering från start.</div>';
    return;
  }
  panel.innerHTML=state.tables.map(renderCard).join('');
  attachManualBoardHandlers();
}

function updateManualStatus(){
  const placed=state.guests.filter(g=>g.tableId).length;
  const total=state.guests.length;
  const txt=`${placed} / ${total} gäster placerade`;
  const el=document.getElementById('manualStatus');
  if(el)el.textContent=txt;
  const sub=document.getElementById('nameListSub');
  if(sub)sub.textContent=`${total-placed} kvar att placera`;
}

function manualAutoPlace(group){
  const pool=group==='all'?state.guests:state.guests.filter(g=>matchAutoGroup(g,group));
  if(!pool.length){showToast('Inga gäster i den gruppen');return;}
  pushUndo('Auto-placera');
  if(group==='all'){
    state.guests.forEach(g=>{g.tableId=null;g.seatIndex=null;});
    autoPlace(state.guests,state.tables);
  } else {
    if(!autoPlaceIntoEmptySlots(pool,state.tables)){
      undoStack.pop();
      showToast('Inte tillräckligt med lediga platser');
      return;
    }
  }
  persist();renderNameList();renderBoardPanel();updateManualStatus();
  showToast('Gäster auto-placerade');
}

/* ══════════════════════════════════════
   TABLE ACTIONS
══════════════════════════════════════ */
function addSeat(tid){
  const t=state.tables.find(x=>x.id===tid);if(!t)return;
  pushUndo('Lägg till plats');t.seats.push(null);
  persist();
  if(state.mode==='manual'){renderBoardPanel();}else{renderStats();renderTables();}
  setTimeout(()=>openEmptySeat(tid,t.seats.length-1),80);
}
function removeSeat(tid){
  const t=state.tables.find(x=>x.id===tid);if(!t||t.seats.length<=1)return;
  pushUndo('Ta bort plats');
  const last=t.seats.pop();
  if(last){const g=state.guests.find(x=>x.id===last);if(g){g.tableId=null;g.seatIndex=null;}}
  persist();
  if(state.mode==='manual'){renderNameList();renderBoardPanel();updateManualStatus();}else{renderStats();renderUnplaced();renderTables();}
}
function removeTable(tid){
  const t=state.tables.find(x=>x.id===tid);if(!t)return;
  pushUndo(`Ta bort bord ${t.number}`);
  t.seats.forEach(gid=>{if(gid){const g=state.guests.find(x=>x.id===gid);if(g){g.tableId=null;g.seatIndex=null;}}});
  state.tables=state.tables.filter(x=>x.id!==tid);
  state.tables.forEach((tb,i)=>tb.number=i+1);
  persist();
  if(state.mode==='manual'){renderNameList();renderBoardPanel();updateManualStatus();}else{renderStats();renderUnplaced();renderTables();}
  showToast(`Bord ${t.number} borttaget`);
}
function addNewTable(){
  const shape=state.tables.length?(state.tables[0].shape||state.tableShape):state.tableShape;
  const nSeats=Math.max(1,state.seatsPerTable||10);
  pushUndo('Lägg till bord');
  const t={id:uid(),number:state.tables.length+1,seats:new Array(nSeats).fill(null),shape};
  state.tables.push(t);state.tableCounter=t.number;
  persist();
  if(state.mode==='manual'){renderBoardPanel();}else{renderStats();renderTables();}
  showToast(`Bord ${t.number} tillagt`);
}
function reshuffleAll(){
  if(!state.tables.length||!state.guests.length){showToast('Inget att placera');return;}
  if(!confirm('Slumpa om allas placering? Alla bord fylls på nytt enligt nuvarande antal platser.'))return;
  pushUndo('Slumpa placering');
  state.tables.forEach(t=>{
    const sz=Math.max(1,t.seats.length||state.seatsPerTable||10);
    t.seats=new Array(sz).fill(null);
  });
  state.guests.forEach(g=>{g.tableId=null;g.seatIndex=null;});
  const pool=[...state.guests];
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    const a=pool[i];pool[i]=pool[j];pool[j]=a;
  }
  let pi=0;
  for(const t of state.tables){
    for(let s=0;s<t.seats.length&&pi<pool.length;s++){
      const g=pool[pi];
      t.seats[s]=g.id;g.tableId=t.id;g.seatIndex=s;pi++;
    }
  }
  persist();
  if(state.mode==='manual'){renderNameList();renderBoardPanel();updateManualStatus();}else{renderStats();renderUnplaced();renderTables();}
  showToast('Placering slumpad');
}
function clearAllPlacementsOnTables(){
  if(!state.tables.length){showToast('Inga bord');return;}
  if(!confirm('Rensa alla bord? Alla gäster flyttas tillbaka till oplacerade i listan.'))return;
  pushUndo('Rensa alla bord');
  state.guests.forEach(g=>{g.tableId=null;g.seatIndex=null;});
  state.tables.forEach(t=>{for(let i=0;i<t.seats.length;i++)t.seats[i]=null;});
  persist();
  if(state.mode==='manual'){renderNameList();renderBoardPanel();updateManualStatus();}else{renderStats();renderUnplaced();renderTables();}
  showToast('Alla bord rensade');
}
function deleteGuest(gid){
  const g=state.guests.find(x=>x.id===gid);if(!g)return;
  if(g.tableId){const t=state.tables.find(x=>x.id===g.tableId);if(t)t.seats[g.seatIndex]=null;}
  state.guests=state.guests.filter(x=>x.id!==gid);
  persist();
  if(state.mode==='manual'){renderNameList();renderBoardPanel();updateManualStatus();}else{renderStats();renderUnplaced();renderTables();}
  showToast(`${g.name} borttagen`);
}

/* ══════════════════════════════════════
   MODALS
══════════════════════════════════════ */
function openGuestModal(gid,editMode=false){
  const g=state.guests.find(x=>x.id===gid);if(!g)return;
  const t=state.tables.find(x=>x.id===g.tableId);
  const root=document.getElementById('modalRoot');
  if(editMode){
    root.innerHTML=`<div class="modal-backdrop" id="mb"><div class="modal" onclick="event.stopPropagation()">
      <div class="modal-head">
        <div class="modal-name">${esc(g.name)}</div>
        <div class="modal-tag">Redigera gäst</div>
      </div>
      <div class="modal-body">
        <div class="modal-form-row"><label>Namn</label><input type="text" id="eN" value="${esc(g.name)}"></div>
        <div class="modal-form-row"><label>Kön</label>
          <select id="eG">
            <option value="Man" ${g.gender==='Man'?'selected':''}>Man</option>
            <option value="Kvinna" ${g.gender==='Kvinna'?'selected':''}>Kvinna</option>
            <option value="Annat" ${g.gender==='Annat'?'selected':''}>Annat / Vill ej uppge</option>
          </select>
        </div>
        <div class="modal-form-row"><label>Specialkost</label><input type="text" id="eS" value="${esc(g.specialDiet||'')}" placeholder="t.ex. glutenfri, vegetarisk"></div>
        <div class="modal-form-row"><label>Övrigt</label><input type="text" id="eO" value="${esc(g.other||'')}" placeholder="valfri anteckning"></div>
        <div class="modal-form-row"><label>Födelseår</label><input type="number" id="eY" min="1920" max="${curYear()}" value="${g.birthYear}"></div>
      </div>
      <div class="modal-foot">
        <button class="ghost small" id="btnClose">Avbryt</button>
        <button class="primary small" id="btnSaveEdit">Spara ändringar</button>
      </div>
    </div></div>`;
    document.getElementById('mb').addEventListener('click',closeModal);
    document.getElementById('btnClose').addEventListener('click',closeModal);
    document.getElementById('btnSaveEdit').addEventListener('click',()=>{
      pushUndo('Redigera gäst');
      const year=parseInt(document.getElementById('eY').value)||g.birthYear;
      g.name=document.getElementById('eN').value.trim()||g.name;
      g.gender=document.getElementById('eG').value;
      g.specialDiet=document.getElementById('eS').value.trim();
      g.other=document.getElementById('eO').value.trim();
      g.birthYear=year;g.age=curYear()-year;
      persist();
      if(state.mode==='manual')renderManualView();else{renderStats();renderUnplaced();renderTables();}
      closeModal();showToast('Gäst uppdaterad');
    });
    return;
  }
  root.innerHTML=`<div class="modal-backdrop" id="mb"><div class="modal" onclick="event.stopPropagation()">
    <div class="modal-head">
      <div class="modal-name">${esc(g.name)}</div>
      <div class="modal-tag">${t?`Bord ${t.number} · Plats ${g.seatIndex+1}`:'Oplacerad'}</div>
      <button class="modal-edit-btn" id="btnEdit">✎ Redigera</button>
    </div>
    <div class="modal-body">
      <div class="modal-row"><span class="label">Kön</span><span class="val">${g.gender}</span></div>
      <div class="modal-row"><span class="label">Ålder</span><span class="val" style="font-size:18px;font-family:var(--serif)">${g.age} år <span style="font-size:13px;color:var(--ink-faint);font-weight:400;font-family:var(--sans)">(f.${g.birthYear})</span></span></div>
      ${g.specialDiet?`<div class="modal-row"><span class="label">Specialkost</span><span class="val">${esc(g.specialDiet)}</span></div>`:''}
      ${g.other?`<div class="modal-row"><span class="label">Övrigt</span><span class="val">${esc(g.other)}</span></div>`:''}
      ${t?`<div class="modal-row"><span class="label">Flytta till</span>
        <span class="val"><select id="moveDest" style="font-size:13px;padding:4px 8px;width:auto;font-family:var(--sans);border:1px solid var(--line);border-radius:4px;background:#fff">
          ${state.tables.map(tb=>`<option value="${tb.id}" ${tb.id===t.id?'selected':''}>${tb.id===t.id?'Bord '+tb.number+' (nu)':'Bord '+tb.number}</option>`).join('')}
        </select></span>
      </div>`:''}
    </div>
    <div class="modal-foot">
      <button class="ghost-danger small" id="btnDel">Ta bort gäst</button>
      <div style="display:flex;gap:7px">
        ${t?`<button class="ghost small" id="btnMove">Flytta →</button>`:''}
        <button class="primary small" id="btnClose">Stäng</button>
      </div>
    </div>
  </div></div>`;
  document.getElementById('mb').addEventListener('click',closeModal);
  document.getElementById('btnClose').addEventListener('click',closeModal);
  document.getElementById('btnEdit').addEventListener('click',()=>{closeModal();openGuestModal(gid,true);});
  document.getElementById('btnDel').addEventListener('click',()=>{pushUndo('Ta bort gäst');deleteGuest(g.id);closeModal();});
  const bm=document.getElementById('btnMove');
  if(bm)bm.addEventListener('click',()=>{const dest=document.getElementById('moveDest').value;if(dest!==t.id)moveGuest(g.id,dest);closeModal();});
}
function moveGuest(gid,destTid){
  pushUndo('Flytta till bord');
  const g=state.guests.find(x=>x.id===gid);if(!g)return;
  if(g.tableId){const old=state.tables.find(x=>x.id===g.tableId);if(old)old.seats[g.seatIndex]=null;}
  const dest=state.tables.find(x=>x.id===destTid);if(!dest)return;
  dest.seats.push(gid);g.tableId=destTid;g.seatIndex=dest.seats.length-1;
  persist();
  if(state.mode==='manual'){renderNameList();renderBoardPanel();updateManualStatus();}else{renderStats();renderUnplaced();renderTables();}
  showToast(`${g.name} → Bord ${dest.number}`);
}
function openEmptySeat(tid,si){
  const t=state.tables.find(x=>x.id===tid);if(!t)return;
  const up=state.guests.filter(g=>!g.tableId);
  const root=document.getElementById('modalRoot');
  root.innerHTML=`<div class="modal-backdrop" id="mb"><div class="modal" onclick="event.stopPropagation()">
    <div class="modal-head">
      <div class="modal-name">Tom plats</div>
      <div class="modal-tag">Bord ${t.number} · Plats ${si+1}</div>
    </div>
    <div class="modal-body">
      ${up.length?`<div style="margin-bottom:14px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-faint);font-weight:600;margin-bottom:7px">Tilldela oplacerad gäst</div>
        <div style="display:flex;flex-direction:column;gap:3px;max-height:150px;overflow-y:auto">
          ${up.map(g=>`<div class="modal-row" style="cursor:pointer;padding:6px 9px" data-assign="${g.id}">
            <span class="val">${esc(g.name)}</span>
            <span class="label">${esc(guestMetaLine(g))}</span>
          </div>`).join('')}
        </div>
      </div><hr style="border:none;border-top:1px solid var(--line);margin:8px 0 12px">`:''}
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-faint);font-weight:600;margin-bottom:9px">Lägg till ny person</div>
      ${guestFormFieldsHtml()}
    </div>
    <div class="modal-foot">
      <button class="ghost small" id="btnClose">Avbryt</button>
      <button class="primary small" id="btnAddNew">Lägg till</button>
    </div>
  </div></div>`;
  document.getElementById('mb').addEventListener('click',closeModal);
  document.getElementById('btnClose').addEventListener('click',closeModal);
  root.querySelectorAll('[data-assign]').forEach(el=>{
    el.addEventListener('click',()=>{
      pushUndo('Tilldela gäst');
      const g=state.guests.find(x=>x.id===el.dataset.assign);
      if(g){t.seats[si]=g.id;g.tableId=tid;g.seatIndex=si;persist();
        if(state.mode==='manual'){renderNameList();renderBoardPanel();updateManualStatus();}else{renderStats();renderUnplaced();renderTables();}
      }
      closeModal();
    });
  });
  document.getElementById('btnAddNew').addEventListener('click',()=>{
    const ng=readNewGuestForm();if(!ng)return;
    pushUndo('Ny person');
    ng.tableId=tid;ng.seatIndex=si;
    state.guests.push(ng);t.seats[si]=ng.id;
    persist();
    if(state.mode==='manual'){renderNameList();renderBoardPanel();updateManualStatus();}else{renderStats();renderUnplaced();renderTables();}
    closeModal();showToast(ng.name+' tillagd');
  });
}
function openSummary(tid){
  const t=state.tables.find(x=>x.id===tid);if(!t)return;
  const gs=t.seats.map(gid=>state.guests.find(x=>x.id===gid)).filter(Boolean);
  const ages=gs.map(g=>g.age);
  const avg=ages.length?Math.round(ages.reduce((a,b)=>a+b,0)/ages.length):'-';
  const men=gs.filter(g=>g.gender==='Man').length,women=gs.filter(g=>g.gender==='Kvinna').length;
  const root=document.getElementById('modalRoot');
  root.innerHTML=`<div class="modal-backdrop" id="mb"><div class="modal wide" onclick="event.stopPropagation()">
    <div class="modal-head">
      <div class="modal-name">Bord ${t.number}</div>
      <div class="modal-tag">${gs.length} gäster · ${t.seats.filter(s=>!s).length} lediga</div>
    </div>
    <div class="modal-body">
      <div class="summary-grid">
        <div class="summary-box"><div class="summary-box-label">Snittålder</div><div class="summary-val-lg">${avg}</div></div>
        <div class="summary-box"><div class="summary-box-label">Kön</div><div class="summary-val-lg">${men} ♂ / ${women} ♀</div></div>
      </div>
      ${gs.some(g=>g.specialDiet)?`<div style="margin-bottom:12px"><div class="summary-box-label" style="margin-bottom:6px">Specialkost</div><div style="display:flex;gap:6px;flex-wrap:wrap">${[...new Set(gs.filter(g=>g.specialDiet).map(g=>g.specialDiet))].map(d=>{const n=gs.filter(g=>g.specialDiet===d).length;return`<span style="background:var(--bg-soft);border:1px solid var(--line);border-radius:4px;padding:3px 9px;font-size:13px"><strong>${n}</strong> ${esc(d)}</span>`}).join('')}</div></div>`:''}
      <table class="summary-table">
        <thead><tr><th>Namn</th><th>Kön</th><th>Ålder</th><th>Specialkost</th><th>Övrigt</th></tr></thead>
        <tbody>
          ${gs.map((g,i)=>`<tr><td style="font-weight:500">${esc(g.name)}</td><td>${g.gender}</td><td>${g.age} år</td><td>${esc(g.specialDiet||'—')}</td><td>${esc(g.other||'—')}</td></tr>`).join('')}
          ${t.seats.filter(s=>!s).map(()=>`<tr><td colspan="5" style="color:var(--ink-faint);font-style:italic">— ledig plats —</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="modal-foot" style="justify-content:flex-end"><button class="primary small" id="btnClose">Stäng</button></div>
  </div></div>`;
  document.getElementById('mb').addEventListener('click',closeModal);
  document.getElementById('btnClose').addEventListener('click',closeModal);
}
function closeModal(){document.getElementById('modalRoot').innerHTML='';}

/* ══════════════════════════════════════
   STORAGE
══════════════════════════════════════ */
function persist(){
  const d={guests:state.guests,tables:state.tables,eventName:state.eventName,seatsPerTable:state.seatsPerTable,tableShape:state.tableShape,tableCounter:state.tableCounter,mode:state.mode};
  const s=JSON.stringify(d);window._ss=s;try{localStorage.setItem(SK,s);}catch(e){}
}
function loadPersisted(){
  let raw=null;try{raw=localStorage.getItem(SK);}catch(e){}
  if(!raw)try{raw=localStorage.getItem('bordsplacering_v6');if(raw)try{localStorage.setItem(SK,raw);}catch(e){}}catch(e){}
  if(!raw)raw=window._ss;if(!raw)return false;
  try{
    const d=JSON.parse(raw);
    state.guests=(d.guests||[]).map(g=>({...g,age:curYear()-g.birthYear,specialDiet:g.specialDiet||'',other:g.other||''}));
    state.tables=d.tables||[];state.eventName=d.eventName||'';
    state.seatsPerTable=d.seatsPerTable||10;state.tableShape=d.tableShape||'rect';
    state.tableCounter=d.tableCounter||state.tables.length;
    state.mode=d.mode||'result';
    return state.tables.length>0;
  }catch(e){return false;}
}
function clearPersisted(){try{localStorage.removeItem(SK);}catch(e){}window._ss=null;}

/* ══════════════════════════════════════
   EXPORT (.docx)
══════════════════════════════════════ */
const DOCX_CONTENT_TYPES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="htm" ContentType="text/html"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
const DOCX_RELS_ROOT=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
const DOCX_RELS_DOCUMENT=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="afchunk.htm"/>
</Relationships>`;
const DOCX_DOCUMENT=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body><w:altChunk r:id="rId1"/>
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body></w:document>`;

function buildExportHtml(){
  const date=new Date().toLocaleDateString('sv-SE');
  let html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Bordsplacering</title>
  <style>body{font-family:Georgia,serif;color:#1a1a1a}h1{font-size:22pt;font-weight:normal;border-bottom:1pt solid #b8874d;padding-bottom:6pt}h2{font-size:12pt;font-weight:normal;font-style:italic;color:#8f6537;margin-top:20pt}
  table{border-collapse:collapse;width:100%}th,td{padding:5pt 8pt;text-align:left;border-bottom:.5pt solid #ddd;font-size:10pt;font-family:Arial}th{background:#f5efe3;font-weight:bold;font-size:8pt;text-transform:uppercase;color:#8f6537}.meta{color:#666;font-size:9pt}</style></head><body>
  <h1>Bordsplacering${state.eventName?` &mdash; <i>${esc(state.eventName)}</i>`:''}</h1>
  <p class="meta">${date} &middot; ${state.tables.length} bord &middot; ${state.guests.filter(g=>g.tableId).length} gäster</p>`;
  state.tables.forEach(t=>{
    const gs=t.seats.map(gid=>state.guests.find(x=>x.id===gid)).filter(Boolean);
    const avg=gs.length?Math.round(gs.reduce((a,g)=>a+g.age,0)/gs.length):'-';
    html+=`<h2>Bord ${t.number} &mdash; snittålder ${avg}</h2><table><thead><tr><th>Plats</th><th>Namn</th><th>Kön</th><th>Ålder</th><th>Specialkost</th><th>Övrigt</th></tr></thead><tbody>`;
    t.seats.forEach((gid,i)=>{if(!gid)html+=`<tr><td>${i+1}</td><td colspan="5" style="color:#aaa;font-style:italic">— ledig —</td></tr>`;else{const g=state.guests.find(x=>x.id===gid);if(g)html+=`<tr><td>${i+1}</td><td><b>${esc(g.name)}</b></td><td>${g.gender}</td><td>${g.age}</td><td>${esc(g.specialDiet||'')}</td><td>${esc(g.other||'')}</td></tr>`;}});
    html+=`</tbody></table>`;
  });
  const up=state.guests.filter(g=>!g.tableId);
  if(up.length){html+=`<h2>Oplacerade</h2><table><thead><tr><th>Namn</th><th>Kön</th><th>Ålder</th><th>Specialkost</th><th>Övrigt</th></tr></thead><tbody>`;up.forEach(g=>{html+=`<tr><td><b>${esc(g.name)}</b></td><td>${g.gender}</td><td>${g.age}</td><td>${esc(g.specialDiet||'')}</td><td>${esc(g.other||'')}</td></tr>`;});html+=`</tbody></table>`;}
  html+=`<p class="meta" style="margin-top:26pt">Genererad ${date}</p></body></html>`;
  return{html,date};
}
function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}
function exportWordLegacyDoc(html,date){
  const blob=new Blob(['\ufeff',html],{type:'application/msword'});
  downloadBlob(blob,`bordsplacering_${date.replace(/-/g,'')}.doc`);
  showToast('Word-fil (.doc) exporterad');
}
function ensureJSZip(){
  if(window.JSZip)return Promise.resolve(window.JSZip);
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.onload=()=>resolve(window.JSZip);
    s.onerror=()=>reject(new Error('JSZip'));
    document.head.appendChild(s);
  });
}
async function exportWord(){
  const{html,date}=buildExportHtml();
  const filename=`bordsplacering_${date.replace(/-/g,'')}.docx`;
  try{
    const JSZip=await ensureJSZip();
    const zip=new JSZip();
    zip.file('[Content_Types].xml',DOCX_CONTENT_TYPES);
    zip.folder('_rels').file('.rels',DOCX_RELS_ROOT);
    const word=zip.folder('word');
    word.file('document.xml',DOCX_DOCUMENT);
    word.folder('_rels').file('document.xml.rels',DOCX_RELS_DOCUMENT);
    word.file('afchunk.htm',html);
    const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    downloadBlob(blob,filename);
    showToast('Word-fil exporterad');
  }catch{
    exportWordLegacyDoc(html,date);
  }
}

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
let _tt;
function showToast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),2400);}

/* ══════════════════════════════════════
   WIRING
══════════════════════════════════════ */
let uploadedGuests=null;
function syncPlacementToggles(){
  const mPl=document.getElementById('manualPlacement');
  const aPl=document.getElementById('ageOrderPlacement');
  if(!mPl||!aPl)return;
  const mL=document.getElementById('manualToggleLabel');
  const aL=document.getElementById('ageOrderToggleLabel');
  if(mPl.checked&&aPl.checked)aPl.checked=false;
  if(mPl.checked){
    aPl.disabled=true;if(aL)aL.classList.add('muted');
    mPl.disabled=false;if(mL)mL.classList.remove('muted');
  }else if(aPl.checked){
    mPl.disabled=true;if(mL)mL.classList.add('muted');
    aPl.disabled=false;if(aL)aL.classList.remove('muted');
  }else{
    mPl.disabled=false;aPl.disabled=false;
    if(mL)mL.classList.remove('muted');if(aL)aL.classList.remove('muted');
  }
}
/** Hem: rensa localStorage + in-memory, återställ gästfil-UI. */
function goToStartScreenFromApp(){
  if(!confirm('Gå till startsidan? Allt i webbläsaren rensas: uppladdad gästlista, bord och placeringsdata. Exportera till Word först om du vill spara en kopia på datorn.'))return;
  state.guests=[];state.tables=[];state.eventName='';
  state.seatsPerTable=10;state.tableShape='rect';state.tableCounter=0;state.mode='result';
  manualGuestFilter='all';manualAgeFilter='all';activeFilter='all';activeAgeFilter='all';
  undoStack=[];uploadedGuests=null;
  clearPersisted();
  const fi=document.getElementById('fileInput');
  if(fi)fi.value='';
  const dz=document.getElementById('dropzone');
  if(dz)dz.classList.remove('loaded','hover');
  const dzIcon=document.getElementById('dzIcon');if(dzIcon)dzIcon.textContent='↑';
  const dzText=document.getElementById('dzText');
  if(dzText)dzText.innerHTML='<strong>Klicka eller dra hit</strong> en CSV-fil';
  const dzSub=document.getElementById('dzSub');
  if(dzSub)dzSub.textContent='Semikolon-separerad: Namn; Kön; Född; Specialkost; Övrigt';
  const ntb=document.getElementById('numTables');
  if(ntb)ntb.value=10;
  const spt=document.getElementById('seatsPerTable');
  if(spt)spt.value=10;
  document.querySelectorAll('.shape-opt').forEach(o=>o.classList.remove('selected'));
  const shapeR=document.getElementById('shapeRect');
  if(shapeR)shapeR.classList.add('selected');
  const rInp=document.querySelector('input[name=tableShape][value=rect]');
  if(rInp)rInp.checked=true;
  showSetup();
  syncPlacementToggles();
  hideUndoBar();
}
function wireSetup(){
  const dz=document.getElementById('dropzone'),fi=document.getElementById('fileInput');
  dz.addEventListener('click',()=>fi.click());
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('hover');});
  dz.addEventListener('dragleave',()=>dz.classList.remove('hover'));
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('hover');const f=e.dataTransfer.files[0];if(f)handleFile(f);});
  fi.addEventListener('change',e=>{const f=e.target.files[0];if(f)handleFile(f);});
  const btnEx=document.getElementById('btnLoadExample');
  if(btnEx)btnEx.addEventListener('click',loadExampleData);
  const btnDl=document.getElementById('btnDownloadExample');
  if(btnDl)btnDl.addEventListener('click',downloadExampleCsv);
  document.querySelectorAll('.shape-opt').forEach(opt=>{
    opt.addEventListener('click',()=>{document.querySelectorAll('.shape-opt').forEach(o=>o.classList.remove('selected'));opt.classList.add('selected');state.tableShape=opt.querySelector('input').value;});
  });
  document.getElementById('btnCreate').addEventListener('click',()=>{
    const n=parseInt(document.getElementById('numTables').value);
    const s=parseInt(document.getElementById('seatsPerTable').value);
    const evEl=document.getElementById('eventName');const ev=evEl?evEl.value.trim():'';
    let manual=document.getElementById('manualPlacement').checked;
    const byAge=document.getElementById('ageOrderPlacement').checked;
    const hasGuests=uploadedGuests&&uploadedGuests.length>0;
    if(!n||n<1){showToast('Ange antal bord');return;}
    if(manual&&byAge){showToast('Välj endast ett av alternativen i Fler alternativ');return;}
    if(byAge&&!hasGuests){showToast('Lägg till gäster först (CSV, exempeldata eller manuellt)');return;}
    state.guests=hasGuests?uploadedGuests.map(g=>({...g,tableId:null,seatIndex:null})):[];
    state.seatsPerTable=s;state.eventName=ev;
    state.tables=createTables(n,s,state.tableShape);
    if(!hasGuests)manual=true;
    if(manual){
      state.mode='manual';
      persist();
      renderManualView();
      if(!hasGuests)showToast('Lägg till gäster med + Lägg till gäst');
    }else if(byAge){
      state.mode='result';
      placeByAgeInTableOrder(state.guests,state.tables);
      persist();
      renderResult();
    }else{
      state.mode='result';
      autoPlace(state.guests,state.tables);
      persist();
      renderResult();
    }
  });
  const mPl=document.getElementById('manualPlacement');
  const aPl=document.getElementById('ageOrderPlacement');
  mPl.addEventListener('change',()=>{if(mPl.checked)aPl.checked=false;syncPlacementToggles();});
  aPl.addEventListener('change',()=>{if(aPl.checked)mPl.checked=false;syncPlacementToggles();});
  syncPlacementToggles();
  const lnk=document.getElementById('linkFlerAlternativ');
  const more=document.getElementById('morePlacementOptions');
  if(lnk&&more){
    lnk.addEventListener('click',e=>{
      e.preventDefault();
      const o=!more.hasAttribute('hidden');
      if(o){more.setAttribute('hidden','');lnk.setAttribute('aria-expanded','false');}
      else{more.removeAttribute('hidden');lnk.setAttribute('aria-expanded','true');}
    });
  }
}
function handleFile(f){
  const r=new FileReader();
  r.onload=e=>{
    try{applyGuestImport(parseCSV(e.target.result),f.name);}
    catch(err){showToast('Fel: '+err.message);}
  };
  r.readAsText(f,'UTF-8');
}
function wireHeader(){
  document.getElementById('btnHome').addEventListener('click',()=>{goToStartScreenFromApp();});
  document.getElementById('btnExport').addEventListener('click',exportWord);
  document.getElementById('btnUndo').addEventListener('click',doUndo);
  document.getElementById('btnAddTable').addEventListener('click',addNewTable);
  document.getElementById('btnReshuffle').addEventListener('click',()=>{reshuffleAll();});
  document.getElementById('btnUndoAction').addEventListener('click',doUndo);
  document.getElementById('btnDismissUndo').addEventListener('click',hideUndoBar);
  document.getElementById('filterBar').addEventListener('click',e=>{
    const btn=e.target.closest('[data-filter]');if(btn){activeFilter=btn.dataset.filter;renderFilterBar();renderUnplaced();renderTables();return;}
    const ab=e.target.closest('[data-age-filter]');if(ab){activeAgeFilter=ab.dataset.ageFilter;renderFilterBar();renderUnplaced();renderTables();}
  });
  const ageFb=document.getElementById('ageFilterBar');
  if(ageFb){
    ageFb.addEventListener('click',e=>{
      const ab=e.target.closest('[data-age-filter]');if(!ab)return;
      activeAgeFilter=ab.dataset.ageFilter;renderFilterBar();renderUnplaced();renderTables();
    });
  }
  document.getElementById('btnAutoPlace').addEventListener('click',()=>{
    const g=document.getElementById('autoGroup').value;
    if(!g){showToast('Välj en grupp');return;}
    manualAutoPlace(g);
  });
  // Manual view internal buttons
  document.getElementById('btnHomeManual').addEventListener('click',()=>{goToStartScreenFromApp();});
  document.getElementById('btnDoneManual').addEventListener('click',()=>{
    persist();renderResult();
  });
  document.getElementById('btnUndoManual').addEventListener('click',doUndo);
  document.getElementById('btnSlumpaManual').addEventListener('click',()=>{reshuffleAll();});
  document.getElementById('btnRensaAllaManual').addEventListener('click',()=>{clearAllPlacementsOnTables();});
  document.getElementById('btnAddGuest')?.addEventListener('click',openAddGuestModal);
  const mfb=document.getElementById('manualFilterBar');
  if(mfb){
    mfb.addEventListener('click',e=>{
      const b=e.target.closest('[data-manual-filter]');
      if(b){manualGuestFilter=b.dataset.manualFilter;renderNameList();if(state.mode==='manual')renderBoardPanel();return;}
      const ab=e.target.closest('[data-manual-age-filter]');
      if(ab){manualAgeFilter=ab.dataset.manualAgeFilter;renderNameList();if(state.mode==='manual')renderBoardPanel();}
    });
  }
  const mafb=document.getElementById('manualAgeFilterBar');
  if(mafb){
    mafb.addEventListener('click',e=>{
      const ab=e.target.closest('[data-manual-age-filter]');if(!ab)return;
      manualAgeFilter=ab.dataset.manualAgeFilter;renderNameList();if(state.mode==='manual')renderBoardPanel();
    });
  }
  const nlb=document.getElementById('nameListBody');
  if(nlb){
    nlb.addEventListener('dragover',e=>{if(state.mode!=='manual')return;e.preventDefault();e.dataTransfer.dropEffect='move';});
    nlb.addEventListener('drop',e=>{
      if(state.mode!=='manual')return;
      e.preventDefault();
      let d=null;try{d=JSON.parse(e.dataTransfer.getData('application/seat')||e.dataTransfer.getData('text/plain'));}catch{}
      if(!d||d.type!=='seat'||!d.guestId)return;
      pushUndo('Flytta tillbaka i listan');
      const t=state.tables.find(x=>x.id===d.tableId);if(!t)return;
      t.seats[d.seatIndex]=null;const g=state.guests.find(x=>x.id===d.guestId);
      if(g){g.tableId=null;g.seatIndex=null;}
      persist();renderNameList();renderBoardPanel();updateManualStatus();
    });
  }
}

wireSetup();wireHeader();
if(loadPersisted()){
  if(state.mode==='manual'){document.querySelector('header').style.display='none';renderManualView();}
  else renderResult();
  showToast('Tidigare placering laddad');
}else{
  document.querySelector('header').style.display='none';
  showSetup();
}
