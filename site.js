(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const status = (form, message, kind="") => {
    const node = $(".form-status", form);
    if (node) { node.textContent = message; node.className = `form-status ${kind}`.trim(); }
  };
  const api = async (path, body) => {
    const res = await fetch(`/api/${path}`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data = await res.json().catch(()=>({error:"The server returned an unreadable response."}));
    if (!res.ok) throw new Error(data.error || "Request failed. Please try again.");
    return data;
  };
  $("#year").textContent = new Date().getFullYear();
  const menu = $("#menu-toggle"), nav = $("#main-nav");
  menu?.addEventListener("click", () => { const open=nav.classList.toggle("open"); menu.setAttribute("aria-expanded",String(open)); });
  $$("#main-nav a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");menu?.setAttribute("aria-expanded","false");}));
  $$("[data-service]").forEach(a=>a.addEventListener("click",()=>{const select=$('select[name="service"]'); if(select) select.value=a.dataset.service;}));

  $("#quote-form")?.addEventListener("submit", async e => {
    e.preventDefault(); const form=e.currentTarget, button=$("button[type=submit]",form);
    if(!form.reportValidity()) return;
    button.disabled=true; status(form,"Sending enquiry…");
    const fd=new FormData(form); const body=Object.fromEntries(fd.entries()); body.consent=fd.has("consent");
    try { const result=await api("submit-enquiry",body); status(form,`Enquiry received. Reference: ${result.reference}.`,"success"); form.reset(); }
    catch(err){status(form,err.message,"error");}
    finally{button.disabled=false;}
  });

  $("#driver-form")?.addEventListener("submit", async e => {
    e.preventDefault(); const form=e.currentTarget, button=$("button[type=submit]",form);
    if(!form.reportValidity()) return;
    const dob=form.elements.date_of_birth.value;
    if(dob && new Date(dob)>new Date()){status(form,"Date of birth cannot be in the future.","error");return;}
    button.disabled=true; status(form,"Submitting application…");
    const fd=new FormData(form), body=Object.fromEntries(fd.entries());
    body.guardian_consent=fd.has("guardian_consent"); body.consent=fd.has("consent");
    try {const result=await api("register-driver",body);status(form,`Application stored. Reference: ${result.reference}. Save this reference to check status.`,"success");form.reset();}
    catch(err){status(form,err.message,"error");}
    finally{button.disabled=false;}
  });

  $("#verify-form")?.addEventListener("submit", async e=>{
    e.preventDefault(); const form=e.currentTarget, ref=form.elements.reference.value.trim(), out=$("#verify-result"), btn=$("button",form);
    if(!ref)return; btn.disabled=true; out.textContent="LOOKING UP RECORD…";
    try{
      const res=await fetch(`/api/application-status?reference=${encodeURIComponent(ref)}`);
      const data=await res.json(); if(!res.ok)throw new Error(data.error||"No matching public record was found.");
      out.textContent="";
      const title=document.createElement("div"); title.textContent=data.type==="certificate"?"CERTIFICATE RECORD FOUND.":"APPLICATION STATUS.";
      const p=document.createElement("p"); p.textContent=data.type==="certificate"?`Certificate ${data.certificate_id}: ${data.status}. Issued ${data.issue_date||"date not listed"}.`:`Application ${data.reference}: ${data.status}. Submitted ${data.submitted_at||"date not listed"}.`;
      out.append(title,p);
      status(form,"Record lookup completed.","success");
    }catch(err){out.textContent="NO MATCHING RECORD.";const p=document.createElement("p");p.textContent=err.message;out.append(p);status(form,"Check the reference and try again.","error");}
    finally{btn.disabled=false;}
  });

  // Public directory only displays published, explicitly approved rows from Supabase.
  const loadDrivers = async () => {
    const cfg=window.NEXTLAYER_CONFIG||{};
    if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase?.createClient)return;
    try{
      const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
      const {data,error}=await client.from("drivers_public").select("public_id,full_name,nickname,category,team,leaderboard_points,slug").order("leaderboard_points",{ascending:false}).limit(60);
      if(error)throw error;
      const grid=$("#driver-grid");grid.replaceChildren();
      const rows=data||[];$("#driver-count").textContent=`${rows.length} RECORD${rows.length===1?"":"S"}`;
      const search=$("#driver-search"), filter=$("#category-filter");
      const render=()=>{
        const term=(search.value||"").toLowerCase(), cat=filter.value;
        const list=rows.filter(d=>(`${d.full_name} ${d.public_id} ${d.nickname||""}`).toLowerCase().includes(term)&&(!cat||d.category===cat));
        grid.replaceChildren();
        if(!list.length){const p=document.createElement("p");p.className="empty-state";p.textContent="No published drivers match this search.";grid.append(p);return;}
        list.forEach((d,i)=>{
          const card=document.createElement("article");card.className="driver-card";
          const visual=document.createElement("div");visual.className="driver-visual";
          const n=document.createElement("span");n.textContent=`#${String(i+1).padStart(2,"0")}`;
          const initials=document.createElement("b");initials.textContent=(d.full_name||"ISRO").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();visual.append(n,initials);
          const info=document.createElement("div");info.className="driver-info";
          const small=document.createElement("small");small.textContent=d.public_id||"ISRO DRIVER";
          const h=document.createElement("h3");h.textContent=d.full_name;
          const p=document.createElement("p");p.textContent=[d.nickname?`“${d.nickname}”`:null,d.category,d.team].filter(Boolean).join(" · ");
          const points=document.createElement("p");points.textContent=`POINTS · ${Number(d.leaderboard_points)||0}`;
          info.append(small,h,p,points);card.append(visual,info);grid.append(card);
        });
        const body=$("#leaderboard-body");body.replaceChildren();
        rows.slice().sort((a,b)=>(Number(b.leaderboard_points)||0)-(Number(a.leaderboard_points)||0)).forEach((d,i)=>{
          const tr=document.createElement("tr");[`${i+1}`,d.full_name,d.public_id,d.category,Number(d.leaderboard_points)||0].forEach(value=>{const td=document.createElement("td");td.textContent=value??"";tr.append(td);});body.append(tr);
        });
      };
      search.addEventListener("input",render);filter.addEventListener("change",render);render();
    }catch(err){$("#driver-count").textContent="Directory temporarily unavailable";console.warn("Public directory could not load:",err.message);}
  };
  loadDrivers();
})();
