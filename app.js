(function(){
  "use strict";
  var doc = document, root = doc.documentElement, body = doc.body;
  function id(x){ return doc.getElementById(x); }
  function el(tag, cls){ var e = doc.createElement(tag); if (cls) e.className = cls; return e; }

  var empty     = id("empty");
  var dataView  = id("dataView");
  var codeView  = id("codeView");
  var codeInner = id("codeInner");
  var gutter    = id("gutter");
  var fileInput = id("fileInput");
  var overlay   = id("dropOverlay");
  var toastEl   = id("toast");
  var docTitle  = id("docTitle");
  var hoverZone = id("hoverZone");
  var bgPicker  = id("bgPicker");
  var themeColor= id("themeColor");
  var btnView   = id("btnView");
  var btnFormat = id("btnFormat");
  var iconCode  = id("viewIconCode");
  var iconTree  = id("viewIconTree");
  var footerEl  = id("footer");
  var topbar    = doc.querySelector(".topbar");
  var brandIcon = id("brandIcon");

  var favLink = doc.querySelector('link[rel="icon"]');
  if (brandIcon && favLink) brandIcon.src = favLink.href;

  var BASE_TITLE = "Cert Viewer";

  var rawText = "", currentName = "", parseErr = "";
  var hasRendered = false;       // does this file have a rendered plane?
  var mode = "source";           // "rendered" | "source"
  var codeBuiltFor = null;
  var beautified = false, beautifyCache = null;
  var toastTimer = null;

  // Accepted data types (this viewer only).
  var ACCEPT_EXT = { pem:1, crt:1, cer:1, der:1, csr:1, cert:1, p7b:1, p12:1, pfx:1 };
  // highlight.js language per extension.
  // How each type is rendered: "tree" | "table" | "xml" | "" (source-only).
  // Types the Format toggle can pretty-print in the source plane.
  var FORMAT_KIND = {
    json:"json", jsonc:"json", json5:"json", jsonld:"json", ndjson:"ndjson",
    yaml:"yaml", yml:"yaml", xml:"xml", rss:"xml", atom:"xml"
  };

  // ---------- Family router data (§6.10) — shared across the whole family ----------
      /* FV-MAP-START — generated from family-map.json (canonical); deep-equality enforced by the harness */
    var FAMILY = {
      audio:    { domain:"audio-viewer.us"     , label:"Audio Viewer"     , kind:"an audio file" },
      cert:     { domain:"cert-viewer.us"      , label:"Cert Viewer"      , kind:"a certificate" },
      data:     { domain:"data-viewer.us"      , label:"Data Viewer"      , kind:"a data file" },
      docx:     { domain:"docx-viewer.us"      , label:"DOCX Viewer"      , kind:"a Word document" },
      eml:      { domain:"eml-viewer.us"       , label:"EML Viewer"       , kind:"an email file" },
      epub:     { domain:"epub-viewer.us"      , label:"EPUB Viewer"      , kind:"an e-book" },
      html:     { domain:"html-viewer.us"      , label:"HTML Viewer"      , kind:"a web or source-code file" },
      image:    { domain:"image-viewer.us"     , label:"Image Viewer"     , kind:"an image" },
      log:      { domain:"log-viewer.us"       , label:"Log Viewer"       , kind:"a log file" },
      markdown: { domain:"markdown-viewer.us"  , label:"Markdown Viewer"  , kind:"a Markdown or text file" },
      pdf:      { domain:"pdf-viewer.us"       , label:"PDF Viewer"       , kind:"a PDF" },
      pptx:     { domain:"pptx-viewer.us"      , label:"PPTX Viewer"      , kind:"a presentation" },
      pub:      { domain:"pub-viewer.us"       , label:"PUB Viewer"       , kind:"a Publisher file" },
      sheets:   { domain:"sheets-viewer.us"    , label:"Sheets Viewer"    , kind:"a spreadsheet" },
      video:    { domain:"video-viewer.us"     , label:"Video Viewer"     , kind:"a video" }
    };
    var FAMILY_HUB = "file-viewer.us";
    var FAMILY_NAMES = {"robots.txt":"html"};
    var FAMILY_MAP = {
      // sheets
      "123":"sheets", xlsx:"sheets", xlsm:"sheets", xlsb:"sheets", xls:"sheets", xlt:"sheets", xltx:"sheets", xltm:"sheets",
      xlam:"sheets", ods:"sheets", fods:"sheets", dif:"sheets", prn:"sheets", dbf:"sheets", numbers:"sheets", xlml:"sheets",
      wk1:"sheets", wk3:"sheets", wks:"sheets", et:"sheets", uos:"sheets",
      // cert
      pem:"cert", crt:"cert", cer:"cert", der:"cert", csr:"cert", cert:"cert", p7b:"cert", p12:"cert",
      pfx:"cert",
      // data
      json:"data", jsonc:"data", json5:"data", jsonld:"data", ndjson:"data", yaml:"data", yml:"data", toml:"data",
      csv:"data", tsv:"data", xml:"data", rss:"data", atom:"data", graphql:"data", gql:"data",
      // docx
      docx:"docx", docm:"docx", dotx:"docx", dotm:"docx", doc:"docx", dot:"docx", rtf:"docx", odt:"docx",
      // eml
      eml:"eml", mbox:"eml", emlx:"eml", msg:"eml",
      // epub
      epub:"epub",
      // html
      html:"html", htm:"html", xhtml:"html", xht:"html", shtml:"html", shtm:"html", stm:"html", hta:"html",
      mhtml:"html", mht:"html", css:"html", scss:"html", sass:"html", less:"html", styl:"html", pcss:"html",
      postcss:"html", js:"html", mjs:"html", cjs:"html", jsx:"html", ts:"html", mts:"html", cts:"html",
      tsx:"html", coffee:"html", htaccess:"html", htpasswd:"html", env:"html", ini:"html", conf:"html", webmanifest:"html",
      map:"html", php:"html", phtml:"html", asp:"html", aspx:"html", ascx:"html", cshtml:"html", vbhtml:"html",
      jsp:"html", jspx:"html", cfm:"html", erb:"html", rhtml:"html", ejs:"html", hbs:"html", handlebars:"html",
      mustache:"html", njk:"html", liquid:"html", jinja:"html", j2:"html", twig:"html", pug:"html", jade:"html",
      haml:"html", slim:"html", vue:"html", svelte:"html", astro:"html",
      // image
      png:"image", jpg:"image", jpeg:"image", jpe:"image", jfif:"image", gif:"image", webp:"image", avif:"image",
      svg:"image", svgz:"image", bmp:"image", dib:"image", ico:"image", cur:"image", tif:"image", tiff:"image",
      tga:"image", targa:"image", icb:"image", vda:"image", vst:"image", qoi:"image", pcx:"image", ppm:"image",
      pgm:"image", pbm:"image", pnm:"image", pam:"image", ff:"image", dds:"image", heic:"image", heif:"image",
      jxl:"image", psd:"image",
      // log
      log:"log", out:"log", err:"log", trace:"log", syslog:"log",
      // markdown
      md:"markdown", markdown:"markdown", mdx:"markdown", txt:"markdown", rst:"markdown", adoc:"markdown",
      // pdf
      pdf:"pdf",
      // pptx
      pptx:"pptx", pptm:"pptx", ppsx:"pptx", ppsm:"pptx", potx:"pptx", potm:"pptx", ppt:"pptx",
      // pub
      pub:"pub",
      // audio
      mp3:"audio", wav:"audio", flac:"audio", m4a:"audio", aac:"audio", ogg:"audio", oga:"audio", opus:"audio",
      weba:"audio", mka:"audio", aif:"audio", aiff:"audio", wma:"audio", mid:"audio", midi:"audio",
      // video
      webm:"video", mp4:"video", m4v:"video", ogv:"video", mov:"video", mkv:"video", avi:"video", wmv:"video"
    };
    /* FV-MAP-END */
  var FAMILY_ORIGINS = Object.keys(FAMILY).map(function (k) { return "https://" + FAMILY[k].domain; })
    .concat("https://" + FAMILY_HUB);
  var DOMAIN = "cert-viewer.us";

  function extOf(name){ var m = /\.([a-z0-9_]+)$/i.exec(name || ""); return m ? m[1].toLowerCase() : ""; }
  function isAccepted(name){
    if (!name) return true;
    var base = String(name).toLowerCase().split("/").pop().split("\\").pop();
    return ACCEPT_EXT[extOf(base)] === 1;
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>]/g, function(c){ return c==="&"?"&amp;":c==="<"?"&lt;":"&gt;"; });
  }
  function toast(msg){
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove("show"); }, 2200);
  }

  // ---------- Parsing ----------
  function stripJsonc(t){ // remove // and /* */ comments (string-aware)
    return t.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n\r]*|\/\*[\s\S]*?\*\//g, function(m, str){ return str ? str : ""; });
  }

  // ---------- Rendered plane ----------

  /* buildRendered() provided by the Cert adapter above */

  // ---------- Source plane ----------
  function doFormat(text, ext){
    var kind = FORMAT_KIND[ext];
    if (kind === "json")  return JSON.stringify(JSON.parse(extOf(currentName)==="jsonc"?stripJsonc(text):text), null, 2);
    if (kind === "ndjson") return text.split(/\r?\n/).filter(function(l){return l.trim();}).map(function(l){ return JSON.stringify(JSON.parse(l), null, 2); }).join("\n");
    if (kind === "xml")   return prettyXml(text);
    return text;
  }
  function prettyXml(text){
    var d = new DOMParser().parseFromString(text, "application/xml");
    if (d.getElementsByTagName("parsererror").length) throw new Error("XML parse error");
    var out = [];
    (function walk(node, depth){
      var pad = new Array(depth+1).join("  ");
      for (var i=0;i<node.childNodes.length;i++){
        var c = node.childNodes[i];
        if (c.nodeType === 1){
          var elChildren = [], txt = "";
          for (var j=0;j<c.childNodes.length;j++){ if (c.childNodes[j].nodeType===1) elChildren.push(c.childNodes[j]); else if (c.childNodes[j].nodeType===3) txt += c.childNodes[j].nodeValue; }
          var attrs = "";
          if (c.attributes) for (var a=0;a<c.attributes.length;a++) attrs += " " + c.attributes[a].name + "=\"" + c.attributes[a].value + "\"";
          txt = txt.trim();
          if (elChildren.length){
            out.push(pad + "<" + c.nodeName + attrs + ">");
            walk(c, depth+1);
            out.push(pad + "</" + c.nodeName + ">");
          } else if (txt){
            out.push(pad + "<" + c.nodeName + attrs + ">" + txt + "</" + c.nodeName + ">");
          } else {
            out.push(pad + "<" + c.nodeName + attrs + "/>");
          }
        }
      }
    })(d, 0);
    return out.join("\n");
  }
  function displayText(){
    if (beautified && beautifyCache && beautifyCache.src === rawText) return beautifyCache.out;
    return rawText;
  }
  function canFormatCurrent(){ return mode === "source" && !!FORMAT_KIND[extOf(currentName)]; }
  function updateFormatBtn(){
    btnFormat.hidden = !canFormatCurrent();
    btnFormat.classList.toggle("active", beautified);
    btnFormat.setAttribute("aria-pressed", beautified ? "true" : "false");
    btnFormat.setAttribute("data-tip", beautified ? "Show raw source" : "Format / beautify");
  }
  function buildCode(){
    var key = rawText + " " + beautified;
    if (codeBuiltFor === key) return;
    var text = String(displayText()).replace(/\n$/, "");
    var htmlOut, usedLang = "";
    htmlOut = escapeHtml(text);
    codeInner.innerHTML = htmlOut;
    codeInner.className = "hljs" + (usedLang ? " language-" + usedLang : "");
    var n = text.length ? text.split("\n").length : 1, g = "";
    for (var i=1;i<=n;i++) g += i + "\n";
    gutter.textContent = g;
    codeBuiltFor = key;
  }

  // ---------- View orchestration ----------
  var certObj = null;

  // Reflect the loaded file's name into the URL (?name=), so a bookmarked or
  // shared link says what was being viewed. history.replaceState only, and
  // URLSearchParams does its own percent-encoding — this never touches the
  // DOM, so it carries no XSS risk on its own. The value becomes untrusted
  // input again the moment it is read back (see the on-load block near the
  // bottom of this script), and that path must stay textContent-only.
  function syncQueryName(name){
    var url = new URL(location.href);
    if (name) url.searchParams.set("name", name);
    else url.searchParams.delete("name");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function show(data, name){
    currentName = name || ""; rawText = ""; parseErr = ""; certObj = null;
    syncQueryName(currentName);
    var ext = extOf(name);
    empty.hidden = true;
    docTitle.textContent = name || BASE_TITLE;
    doc.title = name ? name + " — " + BASE_TITLE : BASE_TITLE;
    body.classList.add("viewing"); mode = "rendered";
    btnView.hidden = true; btnFormat.hidden = true;
    codeView.hidden = true; dataView.hidden = false;
    dataView.innerHTML = ""; dataView.className = "dataview cert";
    if (ext === "p12" || ext === "pfx"){ certNotice("PKCS#12", "“." + ext + "” bundles (PFX/PKCS#12) are password-protected key stores. Export the certificate as PEM/DER (openssl pkcs12 -in file." + ext + " -clcerts -nokeys -out cert.pem) and drop that here."); return; }
    var bytes = new Uint8Array(data);
    try { certObj = CERTCORE.parseAny(bytes, name); }
    catch (e){ certNotice("Couldn’t parse this file", "It doesn’t look like a valid certificate or CSR. (" + (e && e.message || e) + ")"); return; }
    hasRendered = true;
    renderCert(certObj);
    CERTCORE.fingerprints(certObj.der).then(function (fp){ fillFingerprints(fp); }).catch(function(){});
    if (typeof revealHeader === "function") revealHeader();
  }

  function certStatus(c){
    if (c.kind !== "certificate" || !c.notAfter) return null;
    var now = new Date();
    if (c.notBefore && now < c.notBefore) return { cls: "warn", label: "NOT YET VALID" };
    if (now > c.notAfter) return { cls: "bad", label: "EXPIRED" };
    var days = Math.floor((c.notAfter - now) / 86400000);
    return { cls: days < 30 ? "warn" : "ok", label: "VALID", days: days };
  }
  function kv(label, value){
    if (value == null || value === "") return null;
    var row = el("div", "cv-row");
    var l = el("span", "cv-k"); l.textContent = label;
    var v = el("span", "cv-v"); v.textContent = value;
    row.appendChild(l); row.appendChild(v); return row;
  }
  function section(title){
    var s = el("div", "cert-sec");
    var h = el("div", "cert-sec-h"); h.textContent = title; s.appendChild(h);
    return s;
  }
  function chips(title, items, cls){
    if (!items || !items.length) return null;
    var s = section(title), box = el("div", "cert-chips");
    for (var i = 0; i < items.length; i++){ var c = el("span", "cert-chip" + (cls ? " " + cls : "")); c.textContent = items[i]; box.appendChild(c); }
    s.appendChild(box); return s;
  }
  function dnSection(title, dn){
    var s = section(title);
    for (var i = 0; i < dn._order.length; i++){ var r = kv(dn._order[i][0], dn._order[i][1]); if (r) s.appendChild(r); }
    return s;
  }
  function fmtDate(d){ return d ? d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC") : ""; }

  function renderCert(c){
    dataView.innerHTML = "";
    var isCsr = c.kind === "csr";
    // summary
    var sum = el("div", "cert-summary");
    var cn = el("div", "cert-cn"); cn.textContent = (c.subject.CN || c.subjectStr || (isCsr ? "Certificate request" : "Certificate")); sum.appendChild(cn);
    var st = certStatus(c);
    if (isCsr){ var b0 = el("span", "cert-badge na"); b0.textContent = "CSR"; sum.appendChild(b0); }
    else if (st){
      var b = el("span", "cert-badge " + st.cls);
      b.textContent = st.label + (st.days != null ? " · " + (st.days >= 0 ? st.days + "d left" : "expired") : "");
      sum.appendChild(b);
    }
    var subline = el("div", "cert-subline");
    subline.textContent = isCsr ? "Certificate signing request" : "Issued by " + (c.issuer.CN || c.issuer.O || c.issuerStr);
    sum.appendChild(subline);
    dataView.appendChild(sum);

    var grid = el("div", "cert-grid");
    grid.appendChild(dnSection("Subject", c.subject));
    if (!isCsr) grid.appendChild(dnSection("Issuer", c.issuer));
    if (!isCsr){
      var vs = section("Validity");
      vs.appendChild(kv("Not before", fmtDate(c.notBefore)));
      vs.appendChild(kv("Not after", fmtDate(c.notAfter)));
      if (st) vs.appendChild(kv("Status", st.label + (st.days != null ? " (" + st.days + " days left)" : "")));
      grid.appendChild(vs);
    }
    var pk = section("Public key");
    pk.appendChild(kv("Algorithm", c.publicKey.algo));
    if (c.publicKey.size) pk.appendChild(kv("Key size", c.publicKey.size + " bits"));
    if (c.publicKey.curve) pk.appendChild(kv("Curve", c.publicKey.curve));
    grid.appendChild(pk);
    var san = chips("Subject alternative names", c.ext.san, "mono"); if (san) grid.appendChild(san);
    var ku = chips("Key usage", c.ext.keyUsage); if (ku) grid.appendChild(ku);
    var eku = chips("Extended key usage", c.ext.extKeyUsage); if (eku) grid.appendChild(eku);
    if (c.ext.basicConstraints){
      var bc = section("Basic constraints");
      bc.appendChild(kv("CA", c.ext.basicConstraints.ca ? "true" : "false"));
      if (c.ext.basicConstraints.pathLen != null) bc.appendChild(kv("Path length", c.ext.basicConstraints.pathLen));
      grid.appendChild(bc);
    }
    var det = section("Details");
    if (!isCsr){ det.appendChild(kv("Version", "v" + c.version)); det.appendChild(kv("Serial", c.serial)); det.appendChild(kv("Signature", c.sigAlgo)); }
    else det.appendChild(kv("Type", "PKCS#10 request"));
    if (c.ext.ski) det.appendChild(kv("Subject key id", c.ext.ski));
    if (c.ext.aki) det.appendChild(kv("Authority key id", c.ext.aki));
    grid.appendChild(det);
    if (!isCsr){
      var fp = section("Fingerprints");
      fp.id = "certFp";
      fp.appendChild(kv("SHA-1", "…")); fp.appendChild(kv("SHA-256", "…"));
      grid.appendChild(fp);
    }
    dataView.appendChild(grid);
  }
  function fillFingerprints(fp){
    var sec = doc.getElementById("certFp"); if (!sec) return;
    sec.innerHTML = ""; var h = el("div", "cert-sec-h"); h.textContent = "Fingerprints"; sec.appendChild(h);
    var r1 = kv("SHA-1", fp.sha1); if (r1){ r1.querySelector(".cv-v").className = "cv-v mono"; sec.appendChild(r1); }
    var r2 = kv("SHA-256", fp.sha256); if (r2){ r2.querySelector(".cv-v").className = "cv-v mono"; sec.appendChild(r2); }
  }
  function certNotice(title, msg){
    dataView.innerHTML = ""; dataView.className = "dataview cert";
    var box = el("div", "cert-notice");
    var h = el("div", "cert-notice-title"); h.textContent = title;
    var p = el("p"); p.textContent = msg;
    var q = el("p", "cert-notice-sub"); q.textContent = "Your file was not uploaded anywhere.";
    box.appendChild(h); box.appendChild(p); box.appendChild(q); dataView.appendChild(box);
  }
  function buildRendered(){ if (certObj) renderCert(certObj); }
  function readFile(file){
    if (!file) return;
    if (!isAccepted(file.name)){ if (!familyRoute(file)) toast("“" + file.name + "” isn’t a supported certificate file"); return; }
    var reader = new FileReader();
    reader.onload  = function(e){ show(e.target.result, file.name); };
    reader.onerror = function(){ toast("Could not read that file"); };
    reader.readAsArrayBuffer(file);
  }
  function setMode(m){
    mode = m;
    clearTimeout(hdrIdleTimer);
    lastPos.win = lastPos.code = lastPos.data = 0;
    if (m === "rendered"){
      buildRendered();
      codeView.hidden = true; dataView.hidden = false;
      dataView.scrollTop = 0;
      // If parsing failed, fall back to source automatically.
      if (parseErr){ mode = "source"; dataView.hidden = true; }
    }
    if (mode === "source"){
      buildCode();
      dataView.hidden = true; codeView.hidden = false;
      codeView.scrollTop = 0; codeView.scrollLeft = 0;
    }
    if (mode === "rendered") revealHeader(); else { showHeader(); clearTimeout(hdrIdleTimer); }
    updateViewBtn(); updateFormatBtn();
  }
  function updateViewBtn(){
    var toCode = (mode === "rendered");
    iconCode.hidden = !toCode; iconTree.hidden = toCode;
    btnView.setAttribute("data-tip", toCode ? "View source" : "View data");
    btnView.setAttribute("aria-label", toCode ? "View source" : "View rendered data");
  }
  function clearAll(){
    rawText = ""; currentName = ""; parseErr = "";
    syncQueryName("");
    codeBuiltFor = null; beautified = false; beautifyCache = null; hasRendered = false;
    dataView.hidden = true; dataView.innerHTML = "";
    codeView.hidden = true; codeInner.textContent = ""; codeInner.className = "hljs"; gutter.textContent = "";
    btnView.hidden = true; btnFormat.hidden = true;
    empty.hidden = false;
    docTitle.textContent = BASE_TITLE; doc.title = BASE_TITLE;
    body.classList.remove("viewing", "hdr-hidden");
    clearTimeout(hdrIdleTimer);
  }

  /* readFile() provided by the Cert adapter above */
  function openDialog(){ fileInput.click(); }

  fileInput.addEventListener("change", function(e){ var f = e.target.files && e.target.files[0]; if (f) readFile(f); fileInput.value = ""; });
  btnView.addEventListener("click", function(){ if (!hasRendered) return; setMode(mode === "rendered" ? "source" : "rendered"); });
  btnFormat.addEventListener("click", function(){
    if (!canFormatCurrent()) return;
    if (!beautified){
      var out; try { out = doFormat(rawText, extOf(currentName)); } catch (e){ toast("Couldn’t format: " + (e && e.message || e)); return; }
      beautifyCache = { src: rawText, out: out }; beautified = true; toast("Formatted");
    } else { beautified = false; toast("Showing raw source"); }
    codeBuiltFor = null; buildCode(); codeView.scrollTop = 0; codeView.scrollLeft = 0; updateFormatBtn();
  });
  id("btnCopy").addEventListener("click", function(){
    if (!rawText){ toast("Nothing to copy yet"); return; }
    var t = displayText();
    if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(function(){ toast("Source copied"); }, function(){ fallbackCopy(t); }); }
    else fallbackCopy(t);
  });
  function fallbackCopy(text){
    var ta = doc.createElement("textarea"); ta.value = text; ta.setAttribute("readonly","");
    ta.style.position = "fixed"; ta.style.opacity = "0"; doc.body.appendChild(ta); ta.select();
    try { doc.execCommand("copy"); toast("Source copied"); } catch (err){ toast("Copy not supported"); }
    doc.body.removeChild(ta);
  }
  id("btnClear").addEventListener("click", clearAll);
  empty.addEventListener("click", openDialog);
  empty.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " "){ e.preventDefault(); openDialog(); } });

  // ---------- Header: rendered views auto-hide after 3s (collapse to a handle); ----------
  // ---------- hover / touch / scroll-up brings it back. Source view keeps it. ------------
  var HDR_IDLE_MS = 3000, HDR_THRESH = 6, hdrIdleTimer = null;
  var lastPos = { win:0, code:0, data:0 };
  function showHeader(){ body.classList.remove("hdr-hidden"); }
  function hideHeader(){ if (body.classList.contains("viewing") && mode === "rendered") body.classList.add("hdr-hidden"); }
  function armIdleHide(){ clearTimeout(hdrIdleTimer); hdrIdleTimer = setTimeout(hideHeader, HDR_IDLE_MS); }
  function revealHeader(){ showHeader(); armIdleHide(); }
  function onScroll(k, pos){
    if (!body.classList.contains("viewing")) return;
    var d = pos - lastPos[k]; lastPos[k] = pos;
    if (d > HDR_THRESH){ hideHeader(); }
    else if (d < -HDR_THRESH){ revealHeader(); }
  }
  window.addEventListener("scroll", function(){ onScroll("win", window.pageYOffset || root.scrollTop || 0); }, { passive:true });
  codeView.addEventListener("scroll", function(){ onScroll("code", codeView.scrollTop); }, { passive:true });
  dataView.addEventListener("scroll", function(){ onScroll("data", dataView.scrollTop); }, { passive:true });
  hoverZone.addEventListener("mouseenter", revealHeader);
  hoverZone.addEventListener("click", revealHeader);
  hoverZone.addEventListener("touchstart", function(){ revealHeader(); }, { passive:true });
  topbar.addEventListener("mouseenter", function(){ showHeader(); clearTimeout(hdrIdleTimer); });
  topbar.addEventListener("mouseleave", function(){ armIdleHide(); });
  function measureHeader(){ root.style.setProperty("--hdr-h", (topbar ? topbar.offsetHeight : 56) + "px"); }
  measureHeader(); window.addEventListener("resize", measureHeader);
  id("btnHideFooter").addEventListener("click", function(){ if (footerEl) footerEl.hidden = true; });

  // ---------- Hamburger flyout nav ----------
  var btnMenu = id("btnMenu"), navBackdrop = id("navBackdrop");
  function setNav(open){ body.classList.toggle("nav-open", open); btnMenu.setAttribute("aria-expanded", open ? "true" : "false"); }
  btnMenu.addEventListener("click", function(){ setNav(!body.classList.contains("nav-open")); });
  navBackdrop.addEventListener("click", function(){ setNav(false); });
  doc.addEventListener("keydown", function(e){
    if (!id("routeCard").hidden){                    // family-router card is modal (§6.10)
      if (e.key === "Escape"){ hideRouteCard(); return; }
      if (e.key === "Tab"){                          // Tab/Shift+Tab cycle the two buttons
        e.preventDefault();
        var go = id("routeGo"), no = id("routeDismiss");
        (doc.activeElement === go || go.disabled ? no : go).focus();
      }
      return;
    }
    if (e.key === "Escape") setNav(false);
  });

  // ---------- Background color (remembered) ----------
  function setCookie(name, val){ doc.cookie = name + "=" + encodeURIComponent(val) + "; max-age=31536000; path=/; SameSite=Lax"; }
  function getCookie(name){ var m = doc.cookie.match("(?:^|; )" + name.replace(/([.*+?^${}()|[\]\\])/g, "\\$1") + "=([^;]*)"); return m ? decodeURIComponent(m[1]) : null; }
  function hexToRgb(h){ h = h.replace("#",""); if (h.length===3) h = h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2); var n = parseInt(h,16); return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 }; }
  function srgb(c){ c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
  function luminance(rgb){ return 0.2126*srgb(rgb.r) + 0.7152*srgb(rgb.g) + 0.0722*srgb(rgb.b); }
  function mix(a, b, t){ return "rgb(" + Math.round(a.r+(b.r-a.r)*t) + "," + Math.round(a.g+(b.g-a.g)*t) + "," + Math.round(a.b+(b.b-a.b)*t) + ")"; }
  function rgbStr(c){ return "rgb(" + c.r + "," + c.g + "," + c.b + ")"; }
  var HL_LIGHT = { comment:"#6e7781", keyword:"#cf222e", tag:"#116329", attr:"#0550ae", string:"#0a3069", number:"#0550ae", title:"#8250df", built:"#953800" };
  var HL_DARK  = { comment:"#8b949e", keyword:"#ff7b72", tag:"#7ee787", attr:"#79c0ff", string:"#a5d6ff", number:"#79c0ff", title:"#d2a8ff", built:"#ffa657" };
  function applyColor(hex){
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) hex = "#ffffff";
    var bg = hexToRgb(hex);
    var lightText = luminance(bg) <= 0.179;
    var text = lightText ? { r:240, g:243, b:246 } : { r:31, g:35, b:40 };
    var accentHex = lightText ? "#8b93ff" : "#4f46e5";
    var ac = hexToRgb(accentHex), hl = lightText ? HL_DARK : HL_LIGHT, s = root.style;
    s.setProperty("--bg", hex); s.setProperty("--surface", hex);
    s.setProperty("--text", rgbStr(text)); s.setProperty("--code-text", rgbStr(text));
    s.setProperty("--muted", mix(bg, text, 0.45)); s.setProperty("--border", mix(bg, text, 0.24));
    s.setProperty("--border-soft", mix(bg, text, 0.13)); s.setProperty("--code-bg", mix(bg, text, 0.07));
    s.setProperty("--hover", mix(bg, text, 0.10)); s.setProperty("--accent", accentHex);
    s.setProperty("--accent-contrast", lightText ? "#0d1117" : "#ffffff");
    s.setProperty("--overlay", "rgba(" + ac.r + "," + ac.g + "," + ac.b + ",0.12)");
    s.setProperty("--shadow", lightText ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.12)");
    s.setProperty("--header-bg", "rgba(" + bg.r + "," + bg.g + "," + bg.b + ",0.9)");
    s.setProperty("--hl-comment", hl.comment); s.setProperty("--hl-keyword", hl.keyword);
    s.setProperty("--hl-tag", hl.tag); s.setProperty("--hl-attr", hl.attr);
    s.setProperty("--hl-string", hl.string); s.setProperty("--hl-number", hl.number);
    s.setProperty("--hl-title", hl.title); s.setProperty("--hl-built", hl.built);
    s.colorScheme = lightText ? "dark" : "light";
    themeColor.setAttribute("content", hex);
  }
  function isHex6(v){ return /^#([0-9a-f]{6})$/i.test(v || ""); }
  function saveColor(val){ setCookie("mykk-bg", val); try { localStorage.setItem("mykk-bg", val); } catch (e) { /* private mode; the cookie above is the fallback */ } }
  function loadColor(){ var v = getCookie("mykk-bg"); if (!isHex6(v)) { try { v = localStorage.getItem("mykk-bg"); } catch (e) { v = null; } } return isHex6(v) ? v : ((window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "#0d1117" : "#ffffff"); }
  var saved = loadColor(); bgPicker.value = saved; applyColor(saved);
  bgPicker.addEventListener("input", function(){ applyColor(bgPicker.value); saveColor(bgPicker.value); syncThemeToggle(); });
  var themeToggle=document.getElementById("themeToggle"),themeIconSun=document.getElementById("themeIconSun"),themeIconMoon=document.getElementById("themeIconMoon");
  function isDarkBg(){ try { return luminance(hexToRgb(bgPicker.value)) <= 0.179; } catch(e){ return false; } }
  function syncThemeToggle(){ if(!themeToggle) return; var dark=isDarkBg(); themeToggle.setAttribute("aria-pressed", dark?"true":"false"); themeToggle.setAttribute("aria-label", dark?"Switch to light theme":"Switch to dark theme"); if(themeIconSun){ if(dark) themeIconSun.setAttribute("hidden",""); else themeIconSun.removeAttribute("hidden"); } if(themeIconMoon){ if(dark) themeIconMoon.removeAttribute("hidden"); else themeIconMoon.setAttribute("hidden",""); } }
  if(themeToggle){ themeToggle.addEventListener("click", function(){ var next=isDarkBg()?"#ffffff":"#0d1117"; bgPicker.value=next; applyColor(next); saveColor(next); syncThemeToggle(); }); }
  syncThemeToggle();

  // ---------- Family router (§6.10): offer card, sender, and hand-off receiver ----------
  var routeFile = null, routeKey = "", routePrevFocus = null, handoff = null;
  function cancelHandoff(){                    // tear down a pending hand-off (sender below)
    if (!handoff) return;
    window.removeEventListener("message", handoff.onMsg);
    clearTimeout(handoff.timer);
    handoff = null;
  }
  function showRouteCard(file, key){
    cancelHandoff();                           // a new offer aborts any pending hand-off
    if (id("routeCard").hidden) routePrevFocus = doc.activeElement;  // don't capture our own button
    routeFile = file; routeKey = key;
    var t = FAMILY[key];
    // FSI…PDI bidi-isolate the untrusted name so U+202E-style overrides
    // can't visually reorder the sentence.
    id("routeMsg").textContent = "“\u2068" + file.name + "\u2069” looks like " + t.kind + " — it belongs to " + t.label + ".";
    id("routeGo").textContent = "Open " + t.domain + " ↗";
    id("routeSub").textContent = "Your file stays on this device — nothing is uploaded.";
    id("routeGo").disabled = false;
    id("routeBackdrop").hidden = false; id("routeCard").hidden = false;
    id("routeGo").focus();
  }
  function hideRouteCard(){
    cancelHandoff();                           // dismissal aborts a pending hand-off
    id("routeBackdrop").hidden = true; id("routeCard").hidden = true;
    routeFile = null; routeKey = "";
    if (routePrevFocus && routePrevFocus.focus) routePrevFocus.focus();
  }
  function familyRoute(file){
    var n = String(file && file.name || "").toLowerCase();
    var key = FAMILY_NAMES[n];
    if (!key){
      var i = n.lastIndexOf(".");
      var ext = i >= 0 ? n.slice(i + 1) : "";
      key = FAMILY_MAP[ext];
    }
    if (!key || FAMILY[key].domain === DOMAIN) return false;  // unknown type, or our own → caller keeps its toast
    showRouteCard(file, key);
    return true;
  }
  id("routeGo").addEventListener("click", function(){
    if (!routeFile || id("routeGo").disabled) return;               // no double-fire
    cancelHandoff();
    var t = FAMILY[routeKey], origin = "https://" + t.domain, file = routeFile;
    var w = window.open(origin + "/#fvh=" + encodeURIComponent(file.name));
    if (!w){ id("routeSub").textContent = "Couldn’t open the tab — allow pop-ups for this site and try again."; return; }
    id("routeGo").disabled = true;
    var h = {};
    h.onMsg = function(e){
      if (e.source !== w || e.origin !== origin || !e.data) return;
      if (e.data.type === "fv-ready") w.postMessage({ type:"fv-file", file:file }, origin);
      else if (e.data.type === "fv-ack"){ hideRouteCard(); toast("Sent to " + t.label); }  // hideRouteCard tears the handshake down
    };
    h.timer = setTimeout(function(){
      if (handoff !== h) return;
      cancelHandoff();
      id("routeSub").textContent = "Tab opened — drop the file there.";   // Level-1 fallback
    }, 10000);
    handoff = h;
    window.addEventListener("message", h.onMsg);
  });
  id("routeDismiss").addEventListener("click", hideRouteCard);
  id("routeBackdrop").addEventListener("click", hideRouteCard);

  // Receiver — a sibling family tab hands a File across via postMessage (§6.10).
  window.addEventListener("message", function(e){
    if (FAMILY_ORIGINS.indexOf(e.origin) === -1) return;      // family origins only
    var d = e.data;
    if (d && d.type === "fv-file" && d.file instanceof File){ // clone re-creates a real File in this realm
      readFile(d.file);
      e.source.postMessage({ type:"fv-ack" }, e.origin);      // ack = received and handed to the loader
    }
  });
  var fvh = /[#&]fvh=([^&]*)/.exec(location.hash);
  if (fvh){
    var fvhName = fvh[1];                                   // ⚠️ stranger-controlled — textContent only
    try { fvhName = decodeURIComponent(fvhName); } catch (_) { /* malformed %-escape: keep the raw value */ }  // malformed %-escapes must not abort the receiver
    history.replaceState(null, "", location.pathname + location.search);  // always clear, opener or not
    if (window.opener){
      try { window.opener.postMessage({ type:"fv-ready" }, "*"); } catch(_){ /* opener may be cross-origin */ }
      window.opener = null;    // sever the reverse-navigation channel once the ping is out
      var fvhSub = doc.querySelector(".empty-sub");           // "Receiving …" while the hand-off is pending
      if (fvhSub){
        var fvhSubPrev = fvhSub.textContent;
        fvhSub.textContent = "Receiving “\u2068" + fvhName + "\u2069”…";
        setTimeout(function(){ fvhSub.textContent = fvhSubPrev; }, 10000);
      }
    }
  }

  // A bookmarked or shared link can carry the name of the file last viewed
  // (?name=, set by syncQueryName above). No content is ever recoverable
  // from a name alone -- this only labels the empty state, and it never
  // fetches or renders anything on the strength of it. Skipped when an
  // #fvh hand-off is already customizing the same element.
  if (!fvh && !currentName){
    var qName = new URLSearchParams(location.search).get("name");
    if (qName){
      var lastSub = doc.querySelector(".empty-sub");
      if (lastSub){
        // Display-only, and it must stay that way: this string is read
        // straight from the URL, so it is exactly as stranger-controlled as
        // fvhName above. No fact is asserted about whether anyone actually
        // viewed it -- only that the link names it.
        lastSub.textContent = "This link was shared for “⁨" + qName + "⁩”.";
      }
    }
  }

  // ---------- Drag & drop / paste ----------
  var dragDepth = 0;
  function showOverlay(s){ overlay.classList.toggle("show", s); }
  window.addEventListener("dragenter", function(e){
    if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") === -1) return;
    e.preventDefault(); dragDepth++; showOverlay(true);
  });
  window.addEventListener("dragover", function(e){ e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; });
  window.addEventListener("dragleave", function(e){ e.preventDefault(); dragDepth--; if (dragDepth <= 0){ dragDepth = 0; showOverlay(false); } });
  window.addEventListener("drop", function(e){
    e.preventDefault(); dragDepth = 0; showOverlay(false);
    var dt = e.dataTransfer; if (!dt) return;
    if (dt.files && dt.files.length){ readFile(dt.files[0]); return; }
    var txt = dt.getData && dt.getData("text"); if (txt) show(txt, "");
  });
  window.addEventListener("paste", function(e){
    var cd = e.clipboardData || window.clipboardData; if (!cd) return;
    if (cd.files && cd.files.length){ e.preventDefault(); readFile(cd.files[0]); return; }
    var txt = cd.getData && cd.getData("text"); if (txt){ e.preventDefault(); show(txt, ""); }
  });
})();
