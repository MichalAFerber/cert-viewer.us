/* cert-core — DOM-free ASN.1 DER + X.509 / PKCS#10 parser. No eval, no deps. */
(function (root) {
  "use strict";

  function parseTLV(b, s, e){
    var out = [], p = s;
    while (p < e){
      var tag = b[p++], tagNum = tag & 0x1f, constructed = (tag >> 5) & 1;
      var len = b[p++];
      if (len & 0x80){ var n = len & 0x7f; len = 0; while (n-- > 0) len = (len * 256) + b[p++]; }
      var cs = p, ce = p + len;
      var node = { tag: tag, tagNum: tagNum, cls: tag >> 6, constructed: !!constructed, start: cs, end: ce };
      if (constructed) node.children = parseTLV(b, cs, ce); else node.value = b.subarray(cs, ce);
      out.push(node); p = ce;
    }
    return out;
  }
  function decodeOID(bytes){
    if (!bytes.length) return "";
    var v = [Math.floor(bytes[0] / 40), bytes[0] % 40], val = 0;
    for (var i = 1; i < bytes.length; i++){
      val = (val * 128) + (bytes[i] & 0x7f);
      if (!(bytes[i] & 0x80)){ v.push(val); val = 0; }
    }
    return v.join(".");
  }
  function toHex(bytes, sep){
    var s = ""; sep = sep || "";
    for (var i = 0; i < bytes.length; i++){ s += (i ? sep : "") + ("0" + bytes[i].toString(16)).slice(-2); }
    return s.toUpperCase();
  }
  function decodeStr(bytes){
    try { return new TextDecoder("utf-8").decode(bytes); }
    catch (e){ var s = ""; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return s; }
  }

  var OID = {
    "2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST", "2.5.4.10": "O", "2.5.4.11": "OU",
    "2.5.4.5": "serialNumber", "2.5.4.4": "SN", "2.5.4.42": "GN", "1.2.840.113549.1.9.1": "E",
    "2.5.29.17": "subjectAltName", "2.5.29.15": "keyUsage", "2.5.29.37": "extKeyUsage",
    "2.5.29.19": "basicConstraints", "2.5.29.14": "subjectKeyIdentifier", "2.5.29.35": "authorityKeyIdentifier",
    "2.5.29.31": "cRLDistributionPoints", "1.3.6.1.5.5.7.1.1": "authorityInfoAccess", "2.5.29.32": "certificatePolicies",
    "1.2.840.113549.1.1.1": "RSA", "1.2.840.10045.2.1": "EC", "1.3.101.112": "Ed25519",
    "1.2.840.113549.1.1.11": "SHA256withRSA", "1.2.840.113549.1.1.5": "SHA1withRSA",
    "1.2.840.113549.1.1.12": "SHA384withRSA", "1.2.840.113549.1.1.13": "SHA512withRSA",
    "1.2.840.113549.1.1.10": "RSASSA-PSS",
    "1.2.840.10045.4.3.2": "ECDSAwithSHA256", "1.2.840.10045.4.3.3": "ECDSAwithSHA384", "1.2.840.10045.4.3.4": "ECDSAwithSHA512",
    "1.3.6.1.5.5.7.3.1": "serverAuth", "1.3.6.1.5.5.7.3.2": "clientAuth", "1.3.6.1.5.5.7.3.3": "codeSigning",
    "1.3.6.1.5.5.7.3.4": "emailProtection", "1.3.6.1.5.5.7.3.8": "timeStamping", "1.3.6.1.5.5.7.3.9": "OCSPSigning",
    "1.2.840.10045.3.1.7": "P-256", "1.3.132.0.34": "P-384", "1.3.132.0.35": "P-521"
  };
  function oidName(o){ return OID[o] || o; }

  function parseDN(node){
    var out = { _order: [] };
    var rdns = node.children || [];
    for (var i = 0; i < rdns.length; i++){
      var atvs = rdns[i].children || [];
      for (var j = 0; j < atvs.length; j++){
        var atv = atvs[j].children; if (!atv || atv.length < 2) continue;
        var key = oidName(decodeOID(atv[0].value)), val = decodeStr(atv[1].value);
        out[key] = out[key] ? out[key] + " + " + val : val;
        out._order.push([key, val]);
      }
    }
    return out;
  }
  function dnString(dn){
    return dn._order.map(function (p){ return p[0] + "=" + p[1]; }).join(", ");
  }
  function parseTime(node){
    var s = decodeStr(node.value), m;
    if (node.tag === 0x17){ // UTCTime YYMMDDHHMMSSZ
      m = /^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?Z?/.exec(s); if (!m) return null;
      var yy = +m[1], yr = yy < 50 ? 2000 + yy : 1900 + yy;
      return new Date(Date.UTC(yr, +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0)));
    }
    m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?/.exec(s); if (!m) return null; // GeneralizedTime
    return new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0)));
  }
  function bitBytes(node){ // BIT STRING: first byte = unused bits count
    return node.value.subarray(1);
  }
  function parsePublicKey(spki){
    var algOid = decodeOID(spki.children[0].children[0].value);
    var name = oidName(algOid), info = { algo: name, oid: algOid, size: 0, curve: "" };
    if (name === "RSA"){
      var inner = parseTLV(bitBytes(spki.children[1]), 0, spki.children[1].end - spki.children[1].start - 1)[0];
      if (inner && inner.children){
        var mod = inner.children[0].value;
        var start = 0; while (start < mod.length && mod[start] === 0) start++;
        info.size = (mod.length - start) * 8;
      }
    } else if (name === "EC"){
      var params = spki.children[0].children[1];
      if (params && params.value) info.curve = oidName(decodeOID(params.value));
      info.size = ({ "P-256": 256, "P-384": 384, "P-521": 521 })[info.curve] || 0;
    }
    return info;
  }
  var KU = ["digitalSignature","nonRepudiation","keyEncipherment","dataEncipherment","keyAgreement","keyCertSign","cRLSign","encipherOnly","decipherOnly"];
  function parseGeneralNames(seq){
    var names = [];
    var kids = seq.children || [];
    for (var i = 0; i < kids.length; i++){
      var g = kids[i], t = g.tagNum;
      if (t === 2) names.push("DNS:" + decodeStr(g.value));
      else if (t === 1) names.push("email:" + decodeStr(g.value));
      else if (t === 6) names.push("URI:" + decodeStr(g.value));
      else if (t === 7){
        var v = g.value;
        if (v.length === 4) names.push("IP:" + v[0]+"."+v[1]+"."+v[2]+"."+v[3]);
        else names.push("IP:" + toHex(v, ":"));
      } else if (t === 0) names.push("otherName");
    }
    return names;
  }
  function parseExtensions(seqOfExt){
    var ext = { san: [], keyUsage: [], extKeyUsage: [], basicConstraints: null, ski: "", aki: "", _list: [] };
    var items = seqOfExt.children || [];
    for (var i = 0; i < items.length; i++){
      var e = items[i].children; if (!e) continue;
      var oid = decodeOID(e[0].value), name = oidName(oid), critical = false, valIdx = 1;
      if (e[1] && e[1].tag === 0x01){ critical = e[1].value[0] !== 0; valIdx = 2; }
      var octet = e[valIdx]; if (!octet) continue;
      var inner = parseTLV(octet.value, 0, octet.value.length);
      ext._list.push({ name: name, oid: oid, critical: critical });
      if (name === "subjectAltName" && inner[0]) ext.san = parseGeneralNames(inner[0]);
      else if (name === "keyUsage" && inner[0]){
        var bits = bitBytes(inner[0]);
        for (var k = 0; k < KU.length; k++){ if (bits[k >> 3] & (0x80 >> (k & 7))) ext.keyUsage.push(KU[k]); }
      } else if (name === "extKeyUsage" && inner[0]){
        var us = inner[0].children || [];
        for (var u = 0; u < us.length; u++) ext.extKeyUsage.push(oidName(decodeOID(us[u].value)));
      } else if (name === "basicConstraints"){
        var ca = false, pl = null, bc = inner[0] && inner[0].children || [];
        for (var q = 0; q < bc.length; q++){ if (bc[q].tag === 0x01) ca = bc[q].value[0] !== 0; else if (bc[q].tag === 0x02) pl = bc[q].value[0]; }
        ext.basicConstraints = { ca: ca, pathLen: pl };
      } else if (name === "subjectKeyIdentifier" && inner[0]) ext.ski = toHex(inner[0].value, ":");
      else if (name === "authorityKeyIdentifier" && inner[0] && inner[0].children){
        for (var a = 0; a < inner[0].children.length; a++){ if (inner[0].children[a].tagNum === 0) ext.aki = toHex(inner[0].children[a].value, ":"); }
      }
    }
    return ext;
  }

  function parseCertificate(der){
    var top = parseTLV(der, 0, der.length)[0];
    var tbs = top.children[0], c = tbs.children, i = 0, version = 1;
    if (c[0].cls === 2 && c[0].tagNum === 0){ version = (c[0].children[0].value[c[0].children[0].value.length-1]) + 1; i = 1; }
    var serial = toHex(c[i++].value, ":");
    var sigAlgo = oidName(decodeOID(c[i++].children[0].value));
    var issuer = parseDN(c[i++]);
    var val = c[i++], notBefore = parseTime(val.children[0]), notAfter = parseTime(val.children[1]);
    var subject = parseDN(c[i++]);
    var pk = parsePublicKey(c[i++]);
    var ext = { san: [], keyUsage: [], extKeyUsage: [], basicConstraints: null, ski: "", aki: "", _list: [] };
    for (; i < c.length; i++){ if (c[i].cls === 2 && c[i].tagNum === 3) ext = parseExtensions(c[i].children[0]); }
    return { kind: "certificate", version: version, serial: serial, sigAlgo: sigAlgo,
      issuer: issuer, issuerStr: dnString(issuer), subject: subject, subjectStr: dnString(subject),
      notBefore: notBefore, notAfter: notAfter, publicKey: pk, ext: ext, der: der };
  }
  function parseCSR(der){
    var top = parseTLV(der, 0, der.length)[0], cri = top.children[0], c = cri.children;
    var subject = parseDN(c[1]);
    var pk = parsePublicKey(c[2]);
    var ext = { san: [], keyUsage: [], extKeyUsage: [], basicConstraints: null, ski: "", aki: "", _list: [] };
    // attributes [0] may carry extensionRequest with SAN — best-effort
    for (var i = 3; i < c.length; i++){
      if (c[i].cls === 2 && c[i].tagNum === 0){
        var attrs = c[i].children || [];
        for (var a = 0; a < attrs.length; a++){
          var at = attrs[a].children; if (!at) continue;
          var setv = at[1] && at[1].children && at[1].children[0];
          if (setv && setv.children) { ext = parseExtensions(setv); }
        }
      }
    }
    return { kind: "csr", subject: subject, subjectStr: dnString(subject), publicKey: pk, ext: ext, der: der };
  }

  function pemToDer(text){
    var m = /-----BEGIN ([^-]+)-----([\s\S]*?)-----END/.exec(text);
    if (!m) return null;
    var type = m[1].trim(), b64 = m[2].replace(/[^A-Za-z0-9+/=]/g, "");
    var bin = (typeof atob === "function") ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    var der = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i) & 0xff;
    return { type: type, der: der };
  }
  function isDer(bytes){ return bytes.length > 4 && bytes[0] === 0x30 && (bytes[1] & 0x80 || bytes[1] < 0x82 || true); }

  function parseAny(bytesOrText, name){
    var der, type = "";
    if (typeof bytesOrText === "string" || (bytesOrText && /-----BEGIN/.test(decodeStr(bytesOrText.subarray ? bytesOrText.subarray(0, 40) : bytesOrText)))){
      var text = typeof bytesOrText === "string" ? bytesOrText : decodeStr(bytesOrText);
      var p = pemToDer(text); if (!p) throw new Error("no PEM block found");
      der = p.der; type = p.type;
    } else { der = bytesOrText; }
    var isCsr = /REQUEST/i.test(type) || /\.csr$/i.test(name || "");
    return isCsr ? parseCSR(der) : parseCertificate(der);
  }

  function fingerprints(der){
    var subtle = (typeof crypto !== "undefined" && crypto.subtle) ? crypto.subtle
               : (typeof root.crypto !== "undefined" && root.crypto.subtle) ? root.crypto.subtle : null;
    if (!subtle) return Promise.resolve({ sha1: "", sha256: "" });
    return Promise.all([subtle.digest("SHA-1", der), subtle.digest("SHA-256", der)]).then(function (r){
      return { sha1: toHex(new Uint8Array(r[0]), ":"), sha256: toHex(new Uint8Array(r[1]), ":") };
    });
  }

  root.CERTCORE = { parseAny: parseAny, parseCertificate: parseCertificate, parseCSR: parseCSR,
    pemToDer: pemToDer, fingerprints: fingerprints, dnString: dnString, toHex: toHex };
})(typeof window !== "undefined" ? window : globalThis);
