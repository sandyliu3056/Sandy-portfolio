/* Serve deploy/ and check every asset + internal link actually resolves. */
const http=require("http"),fs=require("fs"),path=require("path");
const {chromium}=require("playwright");
const ROOT=path.join(process.cwd(),"deploy");
const BASE=process.env.BASE||"";   // e.g. BASE=/Sandy-Profilo
const MIME={".html":"text/html",".png":"image/png",".svg":"image/svg+xml",".css":"text/css",".js":"text/javascript"};
const srv=http.createServer((req,res)=>{
  let u=decodeURIComponent(req.url.split("?")[0]);
  if(BASE){
    if(u===BASE) { res.writeHead(302,{location:BASE+"/"}); return res.end(); }
    if(!u.startsWith(BASE+"/")) { res.writeHead(404,{"content-type":"text/plain"}); return res.end("404 outside base: "+u); }
    u=u.slice(BASE.length);
  }
  let f=path.join(ROOT, u==="/"?"index.html":u);
  if(!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f,(e,b)=>{
    if(e){ res.writeHead(404,{"content-type":"text/plain"}); return res.end("404 "+u); }
    res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});
    res.end(b);
  });
});
srv.listen(8099, async ()=>{
  const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"}).catch(()=>chromium.launch());
  const p=await b.newPage({viewport:{width:1100,height:800}});
  const bad=[],errs=[];
  p.on("console",m=>{ if(m.type()==="error") errs.push(m.text()); });
  p.on("pageerror",e=>errs.push(String(e.message)));
  p.on("response",r=>{ if(r.status()>=400) bad.push(r.status()+" "+r.url()); });
  await p.goto("http://localhost:8099"+(BASE||"")+"/",{waitUntil:"networkidle"});

  // collect every link the page offers and probe it
  const links=await p.$$eval("a[href]",as=>as.map(a=>a.getAttribute("href")));
  const probes=[];
  for(const h of [...new Set(links)]){
    if(/^(mailto:|https?:)/.test(h)) { probes.push([h,"external / skipped"]); continue; }
    const abs=new URL(h,"http://localhost:8099"+(BASE||"")+"/").toString();
    const r=await p.request.get(abs).catch(()=>null);
    probes.push([h, r? String(r.status()) : "request failed"]);
  }
  // assets declared in <head>
  /* Probe whatever the page ACTUALLY references, rather than a hardcoded list:
     a stale list reports 404 for a file that was deliberately removed, and
     stays silent about a new asset nobody added to the list. */
  const assets = await p.evaluate(()=>{
    const out=new Set();
    document.querySelectorAll("img[src],link[href],script[src]").forEach(e=>{
      const u=e.getAttribute("src")||e.getAttribute("href");
      if(u && !/^(data:|https?:|mailto:|#)/.test(u)) out.add(u);
    });
    const og=document.querySelector('meta[property="og:image"]');
    if(og){ const c=og.getAttribute("content"); if(c && !/^data:/.test(c)) out.add(c); }
    return [...out];
  });
  for(const a of assets){
    const abs=new URL(a,"http://localhost:8099"+(BASE||"")+"/").toString();
    if(!abs.startsWith("http://localhost:8099")){ probes.push([a,"external / skipped"]); continue; }
    const r=await p.request.get(abs).catch(()=>null);
    probes.push([abs.replace("http://localhost:8099",""), r?String(r.status()):"failed"]);
  }
  // inline data-URI icons need no request, but confirm the browser decodes them
  const icons = await p.evaluate(()=>[...document.querySelectorAll('link[rel~="icon"]')]
      .map(l=>l.getAttribute("href")).filter(h=>/^data:/.test(h)));
  for(const u of icons){
    const ok=await p.evaluate(src=>new Promise(res=>{const i=new Image();
      i.onload=()=>res(i.naturalWidth>0); i.onerror=()=>res(false); i.src=src;}), u);
    probes.push(["inline favicon (data URI)", ok?"200":"DECODE FAILED"]);
  }
  // every sub-page must actually boot, not just return 200
  const subErrs={};
  for(const page of ["/3pl-training.html","/reprice-platform.html"]){
    const pp=await b.newPage({viewport:{width:1100,height:800}});
    const e2=[]; pp.on("pageerror",e=>e2.push(String(e.message)));
    await pp.goto(new URL("."+page,"http://localhost:8099"+(BASE||"")+"/").toString(),{waitUntil:"networkidle"});
    await pp.waitForTimeout(400);
    subErrs[page]=e2;
    await pp.screenshot({path:"deploy_"+page.replace(/[^a-z0-9]/gi,"_")+".png"});
    await pp.close();
  }
  const tabs=0;

  console.log("--- serving at "+(BASE||"/")+" ---");
  console.log("--- links & assets ---");
  probes.forEach(([h,s])=>console.log("  "+String(s).padEnd(18)+h));
  console.log("\n--- http failures on load ---");
  console.log(bad.length?bad.map(x=>"  "+x).join("\n"):"  none");
  console.log("\n--- js errors ---");
  console.log("  index.html: "+(errs.length?errs.join(" | "):"none"));
  for(const k in subErrs) console.log("  "+k.slice(1)+": "+(subErrs[k].length?subErrs[k].join(" | "):"none"));
  await b.close(); srv.close();
  const missing=probes.filter(([,s])=>s!=="200"&&s!=="external / skipped");
  const subBad=Object.values(subErrs).some(a=>a.length);
  process.exit(missing.length||errs.length||subBad?1:0);
});
