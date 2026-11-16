/* "Try it" - runs the exported final random forest (300 trees) in the browser.
   Needs data/tryit_model.json (made by the last notebook cell). */
(function () {
  "use strict";
  var mount = document.getElementById("tryit");
  if (!mount) return;
  var DATA_URL = "data/tryit_model.json";

  // 14 main inputs; the other 9 are in the "advanced" box. Together = the 23 model inputs.
  var PAYOPTS = [[-2,"-2 (undocumented code)"],[-1,"-1 paid on time"],[0,"0 (undocumented code)"],
    [1,"1 month late"],[2,"2 months late"],[3,"3 months late"],[4,"4 months late"],[5,"5 months late"],
    [6,"6 months late"],[7,"7 months late"],[8,"8 months late"]];
  var MAIN = [
    {g:"About the customer", f:[
      {k:"LIMIT_BAL",l:"Credit limit (NT$)",t:"num",step:10000,min:10000,max:1000000},
      {k:"AGE",l:"Age",t:"range",min:21,max:79,step:1},
      {k:"SEX",l:"Sex (dataset code)",t:"sel",o:[[1,"1 = male"],[2,"2 = female"]]},
      {k:"EDUCATION",l:"Education",t:"sel",o:[[1,"1 graduate school"],[2,"2 university"],[3,"3 high school"],[4,"4 other / unknown"]]},
      {k:"MARRIAGE",l:"Marital status",t:"sel",o:[[1,"1 married"],[2,"2 single"],[3,"3 other"]]}]},
    {g:"Repayment status (most recent first)", f:[
      {k:"PAY_0",l:"September",t:"sel",o:PAYOPTS},{k:"PAY_2",l:"August",t:"sel",o:PAYOPTS},
      {k:"PAY_3",l:"July",t:"sel",o:PAYOPTS},{k:"PAY_4",l:"June",t:"sel",o:PAYOPTS}]},
    {g:"Bills and payments (NT$)", f:[
      {k:"BILL_AMT1",l:"September bill",t:"num",step:1000},{k:"BILL_AMT2",l:"August bill",t:"num",step:1000},
      {k:"PAY_AMT1",l:"Paid in September",t:"num",step:500,min:0},{k:"PAY_AMT2",l:"Paid in August",t:"num",step:500,min:0},
      {k:"PAY_AMT3",l:"Paid in July",t:"num",step:500,min:0}]}
  ];
  var ADV = [
    {k:"PAY_5",l:"Repayment status, May",t:"sel",o:PAYOPTS},{k:"PAY_6",l:"Repayment status, April",t:"sel",o:PAYOPTS},
    {k:"BILL_AMT3",l:"July bill",t:"num",step:1000},{k:"BILL_AMT4",l:"June bill",t:"num",step:1000},
    {k:"BILL_AMT5",l:"May bill",t:"num",step:1000},{k:"BILL_AMT6",l:"April bill",t:"num",step:1000},
    {k:"PAY_AMT4",l:"Paid in June",t:"num",step:500,min:0},{k:"PAY_AMT5",l:"Paid in May",t:"num",step:500,min:0},
    {k:"PAY_AMT6",l:"Paid in April",t:"num",step:500,min:0}];

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls;
    if (text != null) n.textContent = text; return n; }
  function money(v) { return Math.round(v).toLocaleString("en-US"); }
  function pct(p, d) { return (p * 100).toFixed(d == null ? 1 : d) + "%"; }

  var M, base, cur, inputs = {}, out = {};

  function predict(x) {                       // average of the 300 trees = predict_proba(...)[:,1]
    var s = 0;
    for (var i = 0; i < M.trees.length; i++) {
      var t = M.trees[i], n = 0;
      for (;;) {
        var c = x[t.f[n]] <= t.t[n] ? t.l[n] : t.r[n];
        if (c < 0) { s += t.v[-1 - c]; break; }
        n = c;
      }
    }
    return s / M.trees.length;
  }
  function vec(obj) { return M.features.map(function (f) { return obj[f]; }); }

  function band(p) {
    for (var i = 0; i < M.calibration_validation.length; i++) {
      var b = M.calibration_validation[i];
      if (p >= b.lo && p < b.hi) return b;
    }
    return M.calibration_validation[M.calibration_validation.length - 1];
  }

  function build() {
    mount.textContent = "";
    var panel = el("div", "ix-panel ty");
    var pr = el("div", "ty-presets");
    pr.appendChild(el("span", "ix-label", "Start from a real test customer:"));
    M.presets.forEach(function (p, i) {
      var b = el("button", "ix-chip", p.name); b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { loadPreset(i); });
      b.dataset.i = i; pr.appendChild(b);
    });
    panel.appendChild(pr);
    panel.appendChild(el("p", "ix-note", "Each button loads the 23 recorded values of one held-out test customer. Then change any input below; the forest re-scores instantly."));

    var layout = el("div", "ty-layout");
    var form = el("div", "ty-form");
    MAIN.forEach(function (grp) {
      var fs = el("fieldset", "ty-group"); fs.appendChild(el("legend", "", grp.g));
      grp.f.forEach(function (f) { fs.appendChild(field(f)); });
      form.appendChild(fs);
    });
    var det = el("details", "ty-adv");
    det.appendChild(el("summary", "", "Advanced: the other 9 inputs (kept from the starting customer unless you change them)"));
    var fs2 = el("fieldset", "ty-group"); fs2.appendChild(el("legend", "", "Older months"));
    ADV.forEach(function (f) { fs2.appendChild(field(f)); });
    det.appendChild(fs2); form.appendChild(det);
    layout.appendChild(form);

    var res = el("div", "ty-result"); res.setAttribute("aria-live", "polite");
    out.verdict = el("div", "ty-verdict");
    out.prob = el("div", "ty-prob");
    out.gauge = el("div", "ty-gauge");
    out.fill = el("div", "ty-gauge-fill");
    out.thr = el("div", "ty-gauge-mark thr"); out.thr.title = "decision threshold 50%";
    out.bas = el("div", "ty-gauge-mark bas"); out.bas.title = "average default rate";
    out.gauge.appendChild(out.fill); out.gauge.appendChild(out.thr); out.gauge.appendChild(out.bas);
    out.legend = el("p", "ix-note", "Dark tick = 50% decision threshold. Light tick = " + pct(M.base_rate_train) + " average default rate in training data.");
    out.cal = el("p", "ty-line"); out.rule = el("p", "ty-line");
    out.warn = el("div", "ty-warn"); out.warn.hidden = true;
    out.drv = el("div", "ty-drivers");
    [out.verdict, out.prob, out.gauge, out.legend, out.cal, out.rule, out.drv, out.warn].forEach(function (n) { res.appendChild(n); });
    var note = el("p", "ix-note", "Educational model trained on 2005 Taiwanese card data. It estimates a pattern in that data, not a customer's real chance of default, and must not be used for real lending decisions. The scoring runs in your browser using the exported trees of our final 300-tree forest.");
    res.appendChild(note);
    layout.appendChild(res);
    panel.appendChild(layout);
    mount.appendChild(panel);
  }

  function field(f) {
    var w = el("div", "ty-field"), id = "ty-" + f.k;
    var lab = el("label", "", f.l); lab.htmlFor = id; w.appendChild(lab);
    var inp, vout;
    if (f.t === "sel") {
      inp = el("select"); f.o.forEach(function (o) { var op = document.createElement("option");
        op.value = o[0]; op.textContent = o[1]; inp.appendChild(op); });
    } else {
      inp = document.createElement("input"); inp.type = f.t === "range" ? "range" : "number";
      if (f.min != null) inp.min = f.min;
      if (f.max != null) inp.max = f.max;
      if (f.step) inp.step = f.step;
    }
    inp.id = id; inputs[f.k] = inp;
    w.appendChild(inp);
    if (f.t === "range") { vout = el("output", "ty-out"); vout.htmlFor = id; w.appendChild(vout); inp._out = vout; }
    inp.addEventListener("input", function () {
      var v = Number(inp.value); if (isNaN(v)) return;
      cur[f.k] = v; if (inp._out) inp._out.textContent = v; update();
    });
    return w;
  }

  function setInputs() {
    Object.keys(inputs).forEach(function (k) {
      inputs[k].value = cur[k];
      if (inputs[k]._out) inputs[k]._out.textContent = cur[k];
    });
  }

  function loadPreset(i) {
    base = Object.assign({}, M.presets[i].features); cur = Object.assign({}, base);
    Array.prototype.forEach.call(mount.querySelectorAll(".ty-presets .ix-chip"), function (b) {
      b.setAttribute("aria-pressed", String(Number(b.dataset.i) === i)); });
    setInputs(); update();
  }

  function update() {
    var p = predict(vec(cur)), isDef = p > M.decision_threshold;
    out.verdict.textContent = isDef ? "Predicted: DEFAULT next month" : "Predicted: NO DEFAULT next month";
    out.verdict.className = "ty-verdict " + (isDef ? "bad" : "good");
    out.prob.textContent = "Estimated default probability: " + pct(p);
    out.fill.style.width = (p * 100) + "%";
    out.thr.style.left = (M.decision_threshold * 100) + "%";
    out.bas.style.left = (M.base_rate_train * 100) + "%";
    var b = band(p);
    out.cal.textContent = b.n >= 20 && b.default_rate != null
      ? "Reality check: in our validation set, customers scored between " + Math.round(b.lo * 100) + "% and " +
        Math.round(b.hi * 100) + "% actually defaulted " + pct(b.default_rate, 0) + " of the time (" + b.n.toLocaleString("en-US") + " customers)."
      : "Few validation customers fall in this score range, so there is no reliable reality check here.";
    var ruleDef = cur.PAY_0 >= 1;
    out.rule.textContent = "Simple repayment rule (flag if September is late): " + (ruleDef ? "DEFAULT" : "NO DEFAULT") +
      (ruleDef === isDef ? " - agrees with the forest." : " - disagrees with the forest, so the other inputs changed the answer.");
    drivers(p); warnings();
  }

  function drivers(p) {
    out.drv.textContent = "";
    var changed = Object.keys(cur).filter(function (k) { return cur[k] !== base[k]; });
    out.drv.appendChild(el("h4", "", "What your edits did"));
    if (!changed.length) { out.drv.appendChild(el("p", "ix-note", "No edits yet. Change an input (try September repayment status).")); return; }
    var rows = changed.map(function (k) {
      var t = Object.assign({}, cur); t[k] = base[k];
      return {k: k, d: p - predict(vec(t))};
    }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); }).slice(0, 5);
    var mx = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.d); })) || 1;
    rows.forEach(function (r) {
      var row = el("div", "ty-drv"); row.appendChild(el("span", "ty-drv-name", r.k));
      var tr = el("span", "ty-drv-track"), bar = el("i", r.d >= 0 ? "up" : "down");
      bar.style.width = Math.max(3, Math.abs(r.d) / mx * 100) + "%"; tr.appendChild(bar); row.appendChild(tr);
      row.appendChild(el("span", "ty-drv-val", (r.d >= 0 ? "+" : "") + (r.d * 100).toFixed(1) + " pts"));
      out.drv.appendChild(row);
    });
    out.drv.appendChild(el("p", "ix-note", "Each bar = how much the probability changes if only that one input is put back to the starting customer's value. Effects interact, so bars need not add up."));
  }

  function warnings() {
    var msgs = [];
    Object.keys(cur).forEach(function (k) {
      var s = M.feature_stats[k];
      if (s && (cur[k] < s.min || cur[k] > s.max)) msgs.push(k + " is outside the range seen in training (" + money(s.min) + " to " + money(s.max) + ")");
    });
    if (cur.PAY_0 <= 0 && cur.PAY_2 >= 2 && cur.PAY_3 >= 2) msgs.push("a customer who is on time in September after months of delay is rare in the data");
    out.warn.hidden = !msgs.length;
    out.warn.textContent = msgs.length ? "Caution: " + msgs.join("; ") + ". A forest cannot extrapolate beyond what it saw, so treat this score as unreliable." : "";
  }

  fetch(DATA_URL).then(function (r) { if (!r.ok) throw new Error(DATA_URL + " (HTTP " + r.status + ")"); return r.json(); })
    .then(function (d) { M = d; build(); loadPreset(1); })
    .catch(function (e) { mount.textContent = "Could not load the model. Check that data/tryit_model.json exists and that you opened the site through a web server (not by double-clicking index.html). " + e.message;
      mount.classList.add("ix-error"); });
})();