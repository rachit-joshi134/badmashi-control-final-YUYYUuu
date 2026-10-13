(() => {
 const $=s=>document.querySelector(s);
 const $$=s=>[...document.querySelectorAll(s)];
 const config=window.NEXTLAYER_CONFIG||{};
 const tables={
  drivers:{label:"Drivers",cols:["public_id","full_name","category","leaderboard_points","published"],fields:[["public_id","Public driver ID","text"],["full_name","Full name","text"],["nickname","Nickname","text"],["category","Category","text"],["discipline","Discipline","text"],["team","Team","text"],["slug","Profile slug","text"],["biography","Biography","textarea"],["leaderboard_points","Leaderboard points","number"],["published","Published","checkbox"],["featured","Featured driver","checkbox"]]},
  driver_applications:{label:"Applications",cols:["reference","full_name","category","status","created_at"],fields:[["status","Status","select","Submitted|Under Review|More Information Required|Approved|Rejected|Withdrawn"],["review_notes","Internal review notes","textarea","",true]]},
  events:{label:"Events",cols:["title","category","venue","event_date","published"],fields:[["title","Title","text"],["slug","Slug","text"],["description","Description","textarea"],["category","Category","text"],["venue","Venue","text"],["event_date","Event date","date"],["status","Status","select","Draft|Scheduled|Completed|Cancelled"],["published","Published","checkbox"]]},
  race_results:{label:"Race results",cols:["event_id","driver_id","position","points","published"],fields:[["event_id","Event ID","text"],["driver_id","Driver database ID","text"],["position","Position","number"],["points","Points","number"],["published","Published","checkbox"]]},
  news_articles:{label:"News",cols:["title","slug","status","published_at"],fields:[["title","Title","text"],["slug","Slug","text"],["summary","Summary","textarea"],["body","Article body","textarea"],["category","Category","text"],["status","Status","select","Draft|Published|Archived"],["published_at","Published date","date"]]},
  certificates:{label:"Certificates",cols:["certificate_id","driver_name","certificate_type","status","issue_date"],fields:[["certificate_id","Certificate ID","text"],["driver_name","Driver name","text"],["driver_id","Driver database ID","text"],["certificate_type","Certificate type","text"],["issue_date","Issue date","date"],["status","Status","select","Valid|Revoked|Expired"]]},
  enquiries:{label:"Enquiries",cols:["reference","name","email","service","created_at"],fields:[["status","Status","select","New|In Review|Replied|Closed"],["internal_notes","Internal notes","textarea","",true]]},
  site_settings:{label:"Site settings",cols:["key","value","updated_at"],fields:[["key","Setting key","text"],["value","Setting value","textarea"]]}
 };
 let client=null, active="drivers", editing=null, records=[];
 const msg=(s,kind="")=>{const n=$("#admin-message");n.textContent=s;n.className=`form-status ${kind}`;};
 const safe=(v)=>v===null||v===undefined?"":String(v);
 const cell=(tr,value)=>{const td=document.createElement("td");td.textContent=safe(value);tr.append(td);};
 function showDashboard(user){$("#login-panel").hidden=true;$("#dashboard").hidden=false;msg(`Signed in as ${user.email}.`,"success");loadTable(active);}
 async function init(){
  if(!config.supabaseUrl||!config.supabaseAnonKey||!window.supabase?.createClient){$("#login-form").querySelector(".form-status").textContent="Setup required: configure window.NEXTLAYER_CONFIG with your Supabase project URL and anon key.";$("#login-form button").disabled=true;return;}
  client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);
  const {data:{session}}=await client.auth.getSession(); if(session)showDashboard(session.user);
  client.auth.onAuthStateChange((_event,session)=>{if(session)showDashboard(session.user);else{$("#dashboard").hidden=true;$("#login-panel").hidden=false;}});
 }
 $("#login-form").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget;const btn=$("button",f);btn.disabled=true;const fd=new FormData(f);const {error}=await client.auth.signInWithPassword({email:fd.get("email"),password:fd.get("password")});const n=$(".form-status",f);n.textContent=error?error.message:"";n.className=`form-status ${error?"error":"success"}`;btn.disabled=false;});
 $("#logout").addEventListener("click",async()=>{await client.auth.signOut();});
 async function loadTable(name){
  active=name;const spec=tables[name];$("#table-title").textContent=spec.label;$("#admin-head").replaceChildren();$("#admin-rows").replaceChildren();$("#record-form").hidden=true;
  $$(".admin-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.table===name));
  const hr=document.createElement("tr");[...spec.cols,"Actions"].forEach(x=>{const th=document.createElement("th");th.textContent=x.replaceAll("_"," ").toUpperCase();hr.append(th);});$("#admin-head").append(hr);
  msg("Loading records…");
  let query=client.from(name).select("*").order("created_at",{ascending:false,nullsFirst:false}).limit(100);
  if(name==="site_settings")query=client.from(name).select("*").order("key").limit(100);
  const {data,error}=await query;
  if(error){msg(`Could not load ${spec.label.toLowerCase()}: ${error.message}`,"error");cellRow("Access denied or table not configured.");return;}
  records=data||[];
  if(!records.length){cellRow("No records found.");msg("No records yet.");return;}
  records.forEach(r=>{const tr=document.createElement("tr");spec.cols.forEach(c=>cell(tr,r[c]));const td=document.createElement("td");const edit=document.createElement("button");edit.className="row-action";edit.textContent="Edit";edit.addEventListener("click",()=>editRecord(r));td.append(edit);if(!["driver_applications","enquiries"].includes(name)){const del=document.createElement("button");del.className="row-action";del.textContent="Delete";del.addEventListener("click",()=>deleteRecord(r));td.append(del);}tr.append(td);$("#admin-rows").append(tr);});
  msg(`${records.length} record(s) loaded. Showing up to 100.`);
 }
 function cellRow(text){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=12;td.textContent=text;tr.append(td);$("#admin-rows").append(tr);}
 function editRecord(record){editing=record;$("#form-title").textContent=record?"Edit record":"New record";const holder=$("#record-fields");holder.replaceChildren();tables[active].fields.forEach(([key,label,type,opts,wide])=>{const l=document.createElement("label");if(wide)l.classList.add("wide");l.textContent=label;let input;if(type==="textarea")input=document.createElement("textarea");else if(type==="select"){input=document.createElement("select");(opts||"").split("|").forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;input.append(o);});}else{input=document.createElement("input");input.type=type==="checkbox"?"checkbox":type;}input.name=key;if(type==="checkbox")input.checked=!!record?.[key];else input.value=safe(record?.[key]);if(key==="public_id"&&record)input.readOnly=true;l.append(input);holder.append(l);});$("#record-form").hidden=false;$("#record-form").scrollIntoView({behavior:"smooth",block:"start"});}
 $("#new-record").addEventListener("click",()=>editRecord(null));$("#refresh").addEventListener("click",()=>loadTable(active));$("#cancel-edit").addEventListener("click",()=>$("#record-form").hidden=true);
 $("#record-form").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget;const btn=$("button[type=submit]",form);btn.disabled=true;const body={};tables[active].fields.forEach(([key,,type])=>{const el=form.elements[key];body[key]=type==="checkbox"?el.checked:el.value; if(type==="number"&&el.value!=="")body[key]=Number(el.value);if(el.value===""&&type!=="checkbox")body[key]=null;});let query;if(editing){const key=editing.id?"id":active==="site_settings"?"key":active==="drivers"?"id":null;if(!key){$(".form-status",form).textContent="This record cannot be safely updated without a primary key.";btn.disabled=false;return;}query=client.from(active).update(body).eq(key,editing[key]);}else query=client.from(active).insert(body);const {error}=await query;const n=$(".form-status",form);n.textContent=error?`Save failed: ${error.message}`:"Record saved.";n.className=`form-status ${error?"error":"success"}`;btn.disabled=false;if(!error){$("#record-form").hidden=true;await loadTable(active);}});
 async function deleteRecord(r){if(!confirm("Delete this record permanently? This cannot be undone."))return;const key=r.id?"id":active==="site_settings"?"key":null;if(!key){msg("Cannot delete: no supported primary key found.","error");return;}const {error}=await client.from(active).delete().eq(key,r[key]);if(error)msg(`Delete failed: ${error.message}`,"error");else{msg("Record deleted.","success");loadTable(active);}}
 $$(".admin-tabs button").forEach(b=>b.addEventListener("click",()=>loadTable(b.dataset.table)));
 init();
})();
