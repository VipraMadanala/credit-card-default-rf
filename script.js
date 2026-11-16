/* ==========================================================================
   ix.js  -  interactive sections for the credit-card default project
   Plain JavaScript, no libraries, works on GitHub Pages.

   Put these three files next to your index.html under a data/ folder:
     data/tree_count_results.json   (from the new notebook cell)
     data/model_comparison.json     (from the new notebook cell)
     data/threshold_results.json    (already in your ZIP)

   The script looks for these mount points in your HTML:
     <div data-ix="trees"></div>
     <div data-ix="models"></div>
     <div data-ix="threshold"></div>
   Any mount point that is missing is simply skipped.
   ========================================================================== */
(function () {
  "use strict";

  var DATA = {
    trees: "data/tree_count_results.json",
    models: "data/model_comparison.json",
    threshold: "data/threshold_results.json"
  };

  /* ---------------------------------------------------------------- helpers */
  var SVGNS = "http://www.w3.org/2000/svg";

  function addKids(e, kids) {
    (kids || []).forEach(function (c) {
      if (c == null) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
  }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      var v = attrs[k];
      if (v == null) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;            // only used with our own static strings
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    addKids(e, kids);
    return e;
  }
  function svg(tag, attrs, kids) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in (attrs || {})) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    addKids(e, kids);
    return e;
  }

  function f3(x) { return x == null ? "n/a" : x.toFixed(3); }
  function f4(x) { return x == null ? "n/a" : x.toFixed(4); }
  function pct(x, d) { return (x * 100).toFixed(d == null ? 1 : d) + "%"; }
  function signed(x, d) { return (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(d == null ? 3 : d); }
  function nfmt(n) { return Number(n).toLocaleString("en-US"); }

  function loadJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + " (HTTP " + r.status + ")");
      return r.json();
    });
  }
  function showError(mount, err) {
    mount.innerHTML = "";
    mount.appendChild(h("p", { class: "ix-error", role: "alert" }, [
      "This interactive section could not load its data file. ",
      String(err && err.message ? err.message : err),
      ". If you opened the page directly from your computer, start a local server instead " +
      "(run \"python -m http.server\" in the site folder) - browsers block data files on file:// pages."
    ]));
  }

  function niceTicks(lo, hi, n) {
    var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
    var step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag, t = [];
    for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) t.push(+v.toFixed(10));
    return t;
  }
  function nearestIndex(values, x, log) {
    var best = 0, bd = Infinity;
    values.forEach(function (v, i) {
      var d = log ? Math.abs(Math.log(v) - Math.log(x)) : Math.abs(v - x);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function chip(label, pressed, onClick) {
    return h("button", { type: "button", class: "ix-chip", "aria-pressed": String(!!pressed), onclick: onClick }, [label]);
  }
  function setPressed(container, label) {
    Array.prototype.forEach.call(container.children, function (b) {
      b.setAttribute("aria-pressed", String(b.textContent === label));
    });
  }
  function card(label, value, delta) {
    return h("div", { class: "ix-card" }, [
      h("div", { class: "ix-card-label", text: label }),
      h("div", { class: "ix-card-value", text: value }),
      h("div", { class: "ix-card-delta", text: delta || " " })
    ]);
  }
  function tableFrom(rows, cols, caption) {
    var t = h("table");
    t.appendChild(h("caption", { text: caption }));
    t.appendChild(h("thead", null, [h("tr", null, cols.map(function (c) { return h("th", { scope: "col", text: c[1] }); }))]));
    t.appendChild(h("tbody", null, rows.map(function (r) {
      return h("tr", null, cols.map(function (c) {
        var v = r[c[0]];
        return h("td", { text: v == null ? "n/a" : (c[2] === "int" ? String(v) : v.toFixed(4)) });
      }));
    })));
    return h("div", { class: "ix-table-wrap" }, [t]);
  }

  /* ---------------------------------------------------- generic SVG line chart
     o = { xType:'log'|'linear', xMin,xMax,yMin,yMax, xTicks, yTicks, xFmt,
           xLabel, yLabel, label, bands:[{pts:[[x,lo,hi]]}], lines:[{pts:[[x,y]],cls,dots}],
           diamonds:[[x,y]], cursorX, cursorDots:[[x,y,cls]], stars:[[x,y]], onPick(x) }
     The <div> host stays in the page; only the <svg> inside it is redrawn, so
     dragging on the chart keeps working while it updates.                      */
  function drawChart(host, o) {
    var W = Math.max(280, host.clientWidth || 600);
    var H = Math.round(Math.min(360, Math.max(240, W * 0.5)));
    var m = { l: 62, r: 16, t: 14, b: 46 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    var log = o.xType === "log", tx = log ? Math.log : function (v) { return v; };
    var a = tx(o.xMin), b = tx(o.xMax);
    function X(v) { return m.l + (tx(v) - a) / (b - a) * iw; }
    function Y(v) { return m.t + (1 - (v - o.yMin) / (o.yMax - o.yMin)) * ih; }

    var s = svg("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": o.label || "chart" });
    var dec = (o.yTicks.length > 1 && o.yTicks[1] - o.yTicks[0] < 0.02) ? 3 : 2;

    o.yTicks.forEach(function (v) {
      s.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), "class": "ix-grid" }));
      s.appendChild(svg("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end", "class": "ix-tick" }, [v.toFixed(dec)]));
    });
    o.xTicks.forEach(function (v) {
      s.appendChild(svg("line", { x1: X(v), x2: X(v), y1: m.t + ih, y2: m.t + ih + 5, "class": "ix-axis" }));
      s.appendChild(svg("text", { x: X(v), y: m.t + ih + 19, "text-anchor": "middle", "class": "ix-tick" }, [o.xFmt ? o.xFmt(v) : String(v)]));
    });
    s.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: m.t + ih, y2: m.t + ih, "class": "ix-axis" }));
    s.appendChild(svg("line", { x1: m.l, x2: m.l, y1: m.t, y2: m.t + ih, "class": "ix-axis" }));
    s.appendChild(svg("text", { x: m.l + iw / 2, y: H - 6, "text-anchor": "middle", "class": "ix-axis-label" }, [o.xLabel || ""]));
    s.appendChild(svg("text", { x: 12, y: m.t + ih / 2, "text-anchor": "middle", "class": "ix-axis-label",
      transform: "rotate(-90 12 " + (m.t + ih / 2) + ")" }, [o.yLabel || ""]));

    (o.bands || []).forEach(function (bd) {
      var up = bd.pts.map(function (p) { return X(p[0]) + "," + Y(Math.min(o.yMax, p[2])); });
      var dn = bd.pts.slice().reverse().map(function (p) { return X(p[0]) + "," + Y(Math.max(o.yMin, p[1])); });
      s.appendChild(svg("polygon", { points: up.concat(dn).join(" "), "class": "ix-band" }));
    });
    (o.lines || []).forEach(function (ln) {
      var d = ln.pts.map(function (p, i) { return (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); }).join("");
      s.appendChild(svg("path", { d: d, "class": "ix-line-" + (ln.cls || "a") }));
      if (ln.dots) ln.pts.forEach(function (p) {
        s.appendChild(svg("circle", { cx: X(p[0]), cy: Y(p[1]), r: 3, "class": "ix-dot-" + (ln.cls || "a") }));
      });
    });
    (o.diamonds || []).forEach(function (p) {
      var x = X(p[0]), y = Y(p[1]), r = 5.5;
      s.appendChild(svg("path", { d: "M" + x + " " + (y - r) + "L" + (x + r) + " " + y + "L" + x + " " + (y + r) + "L" + (x - r) + " " + y + "Z", "class": "ix-diamond" }));
    });
    if (o.cursorX != null) {
      s.appendChild(svg("line", { x1: X(o.cursorX), x2: X(o.cursorX), y1: m.t, y2: m.t + ih, "class": "ix-cursor" }));
      (o.cursorDots || []).forEach(function (p) {
        s.appendChild(svg("circle", { cx: X(p[0]), cy: Y(p[1]), r: 6, "class": "ix-dot-sel" }));
      });
    }
    (o.stars || []).forEach(function (p) {
      var x = X(p[0]), y = m.t + ih - 2;
      s.appendChild(svg("path", { d: "M" + x + " " + (y - 11) + "L" + (x + 6) + " " + y + "L" + (x - 6) + " " + y + "Z", "class": "ix-star" }));
    });

    host.innerHTML = "";
    host.appendChild(s);

    // pointer picking is attached to the persistent host, once
    host._ix = { m: m, iw: iw, a: a, b: b, log: log, onPick: o.onPick };
    if (!host._ixBound) {
      host._ixBound = true;
      var down = false;
      var pick = function (ev) {
        var g = host._ix; if (!g.onPick) return;
        var px = ev.clientX - host.getBoundingClientRect().left;
        px = Math.min(Math.max(px, g.m.l), g.m.l + g.iw);
        var t = g.a + (px - g.m.l) / g.iw * (g.b - g.a);
        g.onPick(g.log ? Math.exp(t) : t);
      };
      host.addEventListener("pointerdown", function (e) { down = true; try { host.setPointerCapture(e.pointerId); } catch (_) {} pick(e); });
      host.addEventListener("pointermove", function (e) { if (down) pick(e); });
      host.addEventListener("pointerup", function () { down = false; });
      host.addEventListener("pointercancel", function () { down = false; });
    }
  }
  // redraw when the width changes (rotating a phone, resizing the window)
  function onWidthChange(host, redraw) {
    var last = host.clientWidth;
    var check = function () { if (host.clientWidth !== last) { last = host.clientWidth; redraw(); } };
    if (window.ResizeObserver) new ResizeObserver(check).observe(host);
    else window.addEventListener("resize", check);
  }
  function legendItem(cls, text) {
    return h("li", null, [h("span", { class: "ix-swatch " + (cls || "") }), text]);
  }

  /* ============================================================ 1. TREES */
  function initTrees(mount) {
    loadJSON(DATA.trees).then(function (d) {
      var curve = d.curve;
      if (!curve || !curve.length) throw new Error("tree_count_results.json has no \"curve\" rows");
      var sep = d.retrained_selected_config || [];
      var d15 = d.retrained_depth15_leaf20 || [];
      var METRICS = [["val_f1", "F1-score"], ["val_recall", "Recall"], ["val_precision", "Precision"],
                     ["val_pr_auc", "Average precision"], ["val_accuracy", "Accuracy"]];
      var last = curve.length - 1, metric = "val_f1";
      var finalN = d.final_n_estimators || curve[last].n_estimators;
      var finalIdx = curve.findIndex(function (r) { return r.n_estimators === finalN; });
      if (finalIdx < 0) finalIdx = last;
      var idx = finalIdx;
      var sizes = curve.map(function (r) { return r.n_estimators; });
      var maxN = Math.max.apply(null, sizes.concat(sep.map(function (r) { return r.n_estimators; })));

      var out = h("output", { class: "ix-big", "for": "ix-trees-slider" });
      var slider = h("input", { type: "range", id: "ix-trees-slider", min: 0, max: last, step: 1, value: idx,
        "aria-label": "Number of trees in the forest" });
      var jumps = h("div", { class: "ix-chips", role: "group", "aria-label": "Jump to a size" });
      [1, 50, 100, 200, 300, 400, 500].forEach(function (n) {
        var i = sizes.indexOf(n);
        if (i >= 0) jumps.appendChild(h("button", { type: "button", class: "ix-chip", onclick: function () { idx = i; render(); } }, [n + (n === 1 ? " tree" : " trees")]));
      });
      var cards = h("div", { class: "ix-cards", "aria-live": "polite" });
      var metricChips = h("div", { class: "ix-chips", role: "group", "aria-label": "Metric shown on the chart" });
      METRICS.forEach(function (mt) {
        metricChips.appendChild(chip(mt[1], mt[0] === metric, function () { metric = mt[0]; render(); }));
      });
      var chartHost = h("div", { class: "ix-chart" });
      var legend = h("ul", { class: "ix-legend" });
      var readout = h("p", { class: "ix-readout", "aria-live": "polite" });

      var details = h("details", null, [h("summary", { text: "Show the separately trained forests from the notebook" })]);
      var cols = [["n_estimators", "Trees", "int"], ["val_f1", "F1"], ["val_recall", "Recall"], ["val_precision", "Precision"],
                  ["val_pr_auc", "Avg. precision"], ["val_accuracy", "Accuracy"], ["oob_accuracy", "OOB accuracy"]];
      if (sep.length) details.appendChild(tableFrom(sep, cols,
        "Forests trained from scratch with the selected settings (depth " + d.selected_config.max_depth +
        ", min. leaf " + d.selected_config.min_samples_leaf + "). Validation set; OOB = out-of-bag accuracy on training data."));
      if (d15.length) details.appendChild(tableFrom(d15, cols,
        "Earlier one-factor experiment: depth 15, min. leaf 20, only the number of trees changes."));

      mount.innerHTML = "";
      mount.appendChild(h("div", { class: "ix-panel" }, [
        h("div", { class: "ix-row" }, [h("label", { class: "ix-label", "for": "ix-trees-slider", text: "Number of trees:" }), out]),
        slider, jumps, cards,
        h("p", { class: "ix-label", text: "Chart metric" }), metricChips,
        chartHost, legend,
        h("p", { class: "ix-note", text: "Drag on the chart or use the slider. Horizontal axis is logarithmic. Validation set (4,500 customers); the test set is not used here." }),
        readout, details
      ]));

      function render() {
        var row = curve[idx], fin = curve[finalIdx];
        out.textContent = row.n_estimators + (row.n_estimators === 1 ? " tree" : " trees");
        slider.value = idx;
        slider.setAttribute("aria-valuetext", out.textContent);

        // cards
        cards.innerHTML = "";
        [["val_f1", "F1-score"], ["val_recall", "Recall"], ["val_precision", "Precision"],
         ["val_pr_auc", "Avg. precision"], ["val_accuracy", "Accuracy"]].forEach(function (mt) {
          cards.appendChild(card(mt[1], f3(row[mt[0]]),
           idx === finalIdx ? "final model" : signed(row[mt[0]] - fin[mt[0]]) + " vs " + fin.n_estimators + " trees"));});
        setPressed(metricChips, METRICS.filter(function (x) { return x[0] === metric; })[0][1]);

        // chart
        var useBand = metric === "val_f1" && curve[0].val_f1_lo != null;
        var vals = curve.map(function (r) { return r[metric]; })
          .concat(sep.map(function (r) { return r[metric]; }));
        if (useBand) vals = vals.concat(curve.map(function (r) { return r.val_f1_lo; }), curve.map(function (r) { return r.val_f1_hi; }));
        var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * 0.08 || 0.01;
        var yMin = lo - pad, yMax = hi + pad;
        var xt = [1, 10, 100, 300, 1000].filter(function (v) { return v <= maxN * 1.001; });
        drawChart(chartHost, {
          xType: "log", xMin: 1, xMax: maxN, yMin: yMin, yMax: yMax,
          xTicks: xt, yTicks: niceTicks(yMin, yMax, 5), xLabel: "Number of trees",
          yLabel: METRICS.filter(function (x) { return x[0] === metric; })[0][1] + " (validation)",
          label: "Line chart of validation " + metric.replace("val_", "") + " against number of trees",
          bands: useBand ? [{ pts: curve.map(function (r) { return [r.n_estimators, r.val_f1_lo, r.val_f1_hi]; }) }] : [],
          lines: [{ pts: curve.map(function (r) { return [r.n_estimators, r[metric]]; }), cls: "a", dots: true }],
          diamonds: sep.map(function (r) { return [r.n_estimators, r[metric]]; }),
          cursorX: row.n_estimators, cursorDots: [[row.n_estimators, row[metric]]],
          onPick: function (x) { var i = nearestIndex(sizes, x, true); if (i !== idx) { idx = i; render(); } }
        });
        legend.innerHTML = "";
        legend.appendChild(legendItem("", "First k trees of one 1000-tree forest (first 300 = final model)"));
        if (useBand) legend.appendChild(legendItem("band", "95% bootstrap interval (F1)"));
        if (sep.length) legend.appendChild(legendItem("dia", "Forests trained separately (selected settings)"));

        // plain-English readout
        var diff = row.val_f1 - fin.val_f1, half = (row.val_f1_hi != null) ? (row.val_f1_hi - row.val_f1_lo) / 2 : null;
        var txt = "With <strong>" + row.n_estimators + (row.n_estimators === 1 ? " tree" : " trees") + "</strong> the forest finds <strong>" +
          pct(row.val_recall) + "</strong> of the real defaulters (recall) and <strong>" + pct(row.val_precision) +
          "</strong> of the customers it flags are real defaulters (precision). F1 = <strong>" + f3(row.val_f1) + "</strong>" +
          (half != null ? " (95% interval " + f3(row.val_f1_lo) + " to " + f3(row.val_f1_hi) + ")" : "") + ". ";
        if (idx === finalIdx) {
          txt += "This is the final model.";
          var bigger = sep.filter(function (r) { return r.n_estimators > fin.n_estimators; });
          if (bigger.length && half != null) {
            var gain = Math.max.apply(null, bigger.map(function (r) { return r.val_f1 - fin.val_f1; }));
            txt += gain < half
              ? " Forests trained with more trees (diamonds) did not beat it by more than the sampling noise."
              : " A forest trained with more trees (diamonds) scored noticeably higher, so more trees may be worth testing.";
          }
        } else if (half != null && Math.abs(diff) < half) {
          txt += "Compared with the final " + fin.n_estimators + "-tree forest, F1 differs by " + signed(diff) +
            ", which is smaller than the sampling noise of the validation set, so this is not evidence that either size is better.";
        } else {
          txt += "Compared with the final " + fin.n_estimators + "-tree forest, F1 differs by " + signed(diff) +
            ", which is larger than the sampling noise, so at this size adding trees does help.";
        }
        readout.innerHTML = txt;
      }
      slider.addEventListener("input", function () { idx = +slider.value; render(); });
      onWidthChange(chartHost, render);
      render();
    }).catch(function (e) { showError(mount, e); });
  }

  /* =========================================================== 2. MODELS */
  var MODEL_INFO = {
    majority: {
      idea: "Always predicts \"no default\". It needs no learning and shows how much accuracy comes from class imbalance alone.",
      limit: "It never identifies a defaulter, so it is useless for the actual goal."
    },
    rule: {
      idea: "Predicts default whenever September's repayment status (PAY_0) is 1 or more, that is, the customer was already late. No training involved.",
      limit: "Uses one variable only, so it cannot use bill amounts, payments or credit limit."
    },
    decision_tree: {
      idea: "One shallow, regularised decision tree (depth 5, at least 20 customers per leaf, balanced class weights) learned from the training set.",
      limit: "A single tree is unstable: small changes in the data can change its splits."
    },
    rf_initial: {
      idea: "100 fully grown trees with default settings. Each tree sees a bootstrap sample and a random subset of features; the forest averages their votes.",
      limit: "It fits the training data almost perfectly, a sign of overfitting, and misses many defaulters at the 0.5 threshold."
    },
    rf_final: {
      idea: "300 trees, maximum depth 12, at least 10 customers per leaf, half of the features tried at each split, balanced class weights. Chosen using validation F1.",
      limit: "Improvement over the simple rule is moderate, and most missed defaults are customers with no recorded late payment."
    }
  };

  function initModels(mount) {
    loadJSON(DATA.models).then(function (d) {
      var models = d.models;
      if (!models || !models.length) throw new Error("model_comparison.json has no \"models\"");
      var METRICS = [["f1", "F1-score"], ["recall", "Recall"], ["precision", "Precision"], ["accuracy", "Accuracy"],
                     ["roc_auc", "ROC-AUC"], ["pr_auc", "Average precision"]];
      var metric = "f1", selKey = "rf_final";

      var metricChips = h("div", { class: "ix-chips", role: "group", "aria-label": "Metric to compare" });
      METRICS.forEach(function (mt) { metricChips.appendChild(chip(mt[1], mt[0] === metric, function () { metric = mt[0]; render(); })); });
      var bars = h("div", { class: "ix-bars", role: "group", "aria-label": "Models. Select one for details" });
      var detail = h("div", { class: "ix-detail", "aria-live": "polite" });
      var note = h("p", { class: "ix-note" });

      mount.innerHTML = "";
      mount.appendChild(h("div", { class: "ix-panel" }, [
        h("p", { class: "ix-label", text: "Compare models on:" }), metricChips, bars, note, detail
      ]));

      function render() {
        setPressed(metricChips, METRICS.filter(function (x) { return x[0] === metric; })[0][1]);
        bars.innerHTML = "";
        models.forEach(function (m) {
          var v = m[metric];
          var track = h("div", { class: "ix-bar-track" });
          if (v != null) {
            track.appendChild(h("div", { class: "ix-bar-fill", style: "width:" + (v * 100).toFixed(1) + "%" }));
            if (metric === "f1" && m.f1_lo != null) {
              track.appendChild(h("div", { class: "ix-bar-whisker", style: "left:" + (m.f1_lo * 100).toFixed(1) + "%;width:" + ((m.f1_hi - m.f1_lo) * 100).toFixed(1) + "%" }));
            }
            track.appendChild(h("span", { class: "ix-bar-value", text: f3(v) }));
          } else {
            track.appendChild(h("span", { class: "ix-bar-value", text: "n/a (hard 0/1 output)", style: "left:.4rem;right:auto" }));
          }
          bars.appendChild(h("button", { type: "button", class: "ix-bar-row", "aria-pressed": String(m.key === selKey),
            onclick: function () { selKey = m.key; render(); } }, [h("span", { class: "ix-bar-name", text: m.name }), track]));
        });
        note.textContent = metric === "f1"
          ? "Black whiskers: 95% bootstrap interval for F1 on the 4,500 validation customers. Overlapping whiskers mean the difference may be noise."
          : metric === "accuracy"
            ? "Accuracy looks similar for every model because about four in five customers do not default; compare recall and F1 as well."
            : "All numbers are validation-set results. Click a model for details.";
        renderDetail();
      }

      function renderDetail() {
        var m = models.filter(function (x) { return x.key === selKey; })[0], info = MODEL_INFO[m.key] || { idea: "", limit: "" };
        var nDef = d.n_validation_defaults, n = d.n_validation;
        var cm = h("div", { class: "ix-cm", role: "table", "aria-label": "Confusion matrix on the validation set" }, [
          h("div"), h("div", { class: "hd", text: "Predicted: no default" }), h("div", { class: "hd", text: "Predicted: default" }),
          h("div", { class: "hd", text: "Actual: no default" }), h("div", { class: "cell good" }, [h("b", { text: nfmt(m.TN) }), "correct rejections"]),
          h("div", { class: "cell bad" }, [h("b", { text: nfmt(m.FP) }), "false alarms"]),
          h("div", { class: "hd", text: "Actual: default" }), h("div", { class: "cell bad" }, [h("b", { text: nfmt(m.FN) }), "missed defaults"]),
          h("div", { class: "cell good" }, [h("b", { text: nfmt(m.TP) }), "caught defaults"])
        ]);
        var sentence = "It catches " + nfmt(m.TP) + " of the " + nfmt(nDef) + " customers who defaulted and raises " + nfmt(m.FP) + " false alarms.";
        var kids = [
          h("div", null, [
            h("h3", { text: m.name }),
            h("p", { text: info.idea }),
            h("p", null, [h("strong", { text: "Result: " }), sentence]),
            h("p", null, [h("strong", { text: "Limitation: " }), info.limit]),
            (m.key === "rf_final" && d.test_rf_final)
              ? h("p", { class: "ix-note" }, ["Final test-set result (used once, after the model was chosen): F1 " + f3(d.test_rf_final.f1) +
                  ", recall " + f3(d.test_rf_final.recall) + ", precision " + f3(d.test_rf_final.precision) + "."])
              : null
          ]),
          h("div", null, [cm, h("p", { class: "ix-note", text: "Accuracy " + f3(m.accuracy) + " | Precision " + f3(m.precision) + " | Recall " + f3(m.recall) +
            " | F1 " + f3(m.f1) + " | ROC-AUC " + f3(m.roc_auc) + " | Avg. precision " + f3(m.pr_auc) })])
        ];
        detail.innerHTML = "";
        kids.forEach(function (k) { detail.appendChild(k); });
      }
      render();
    }).catch(function (e) { showError(mount, e); });
  }

  /* ======================================================== 3. THRESHOLD */
  function initThreshold(mount) {
    loadJSON(DATA.threshold).then(function (rows) {
      if (!rows || !rows.length) throw new Error("threshold_results.json is empty");
      var ths = rows.map(function (r) { return r.threshold; });
      var idx = Math.max(0, ths.indexOf(0.5)); if (idx === 0 && ths.indexOf(0.5) < 0) idx = Math.floor(rows.length / 2);
      var costK = 1;
      var P = rows[0].TP + rows[0].FN;  // number of real defaulters in validation set

      var out = h("output", { class: "ix-big", "for": "ix-th-slider" });
      var slider = h("input", { type: "range", id: "ix-th-slider", min: 0, max: rows.length - 1, step: 1, value: idx,
        "aria-label": "Decision threshold" });
      var cards = h("div", { class: "ix-cards", "aria-live": "polite" });
      var chartHost = h("div", { class: "ix-chart" });
      var legend = h("ul", { class: "ix-legend" }, [legendItem("", "Precision"), legendItem("b", "Recall"), legendItem("c", "F1-score")]);
      var cmHost = h("div");
      var readout = h("p", { class: "ix-readout", "aria-live": "polite" });
      var costOut = h("output", { class: "ix-label", "for": "ix-cost-slider" });
      var costSlider = h("input", { type: "range", id: "ix-cost-slider", min: 1, max: 10, step: 1, value: costK, "aria-label": "Cost of a missed default relative to a false alarm" });
      var costText = h("p", { class: "ix-note" });
      var jump = h("button", { type: "button", class: "ix-link", text: "Jump to that threshold" });

      mount.innerHTML = "";
      mount.appendChild(h("div", { class: "ix-panel" }, [
        h("div", { class: "ix-row" }, [h("label", { class: "ix-label", "for": "ix-th-slider", text: "Decision threshold:" }), out]),
        h("p", { class: "ix-note", text: "A customer is flagged as a likely defaulter when the forest's predicted probability is at least this value. The model's default is 0.5." }),
        slider, cards, chartHost, legend, cmHost, readout,
        h("div", { class: "ix-cost" }, [
          h("div", { class: "ix-row" }, [h("label", { class: "ix-label", "for": "ix-cost-slider", text: "What if a missed default is costlier?" }), costOut]),
          costSlider, costText, h("p", { class: "ix-note", text: "Illustrative assumption only (the dataset has no money values for these errors). Cost = (cost ratio x missed defaults) + false alarms." }),
          h("p", null, [jump])
        ])
      ]));

      function best() {
        var bi = 0, bc = Infinity;
        rows.forEach(function (r, i) { var c = costK * r.FN + r.FP; if (c < bc) { bc = c; bi = i; } });
        return bi;
      }
      function render() {
        var r = rows[idx];
        out.textContent = r.threshold.toFixed(2);
        slider.value = idx; slider.setAttribute("aria-valuetext", "threshold " + r.threshold.toFixed(2));
        cards.innerHTML = "";
        [["Precision", r.precision], ["Recall", r.recall], ["F1-score", r.f1], ["Accuracy", r.accuracy]].forEach(function (x) {
          cards.appendChild(card(x[0], f3(x[1])));
        });
        drawChart(chartHost, {
          xType: "linear", xMin: ths[0], xMax: ths[ths.length - 1], yMin: 0, yMax: 1,
          xTicks: [0.1, 0.3, 0.5, 0.7, 0.9].filter(function (v) { return v >= ths[0] - 1e-9 && v <= ths[ths.length - 1] + 1e-9; }),
          yTicks: [0, 0.25, 0.5, 0.75, 1], xFmt: function (v) { return v.toFixed(1); },
          xLabel: "Threshold", yLabel: "Score (validation)",
          label: "Precision, recall and F1 against decision threshold",
          lines: [
            { pts: rows.map(function (x) { return [x.threshold, x.precision]; }), cls: "a" },
            { pts: rows.map(function (x) { return [x.threshold, x.recall]; }), cls: "b" },
            { pts: rows.map(function (x) { return [x.threshold, x.f1]; }), cls: "c" }
          ],
          cursorX: r.threshold, cursorDots: [[r.threshold, r.precision], [r.threshold, r.recall], [r.threshold, r.f1]],
          stars: [[rows[best()].threshold, 0]],
          onPick: function (x) { var i = nearestIndex(ths, x, false); if (i !== idx) { idx = i; render(); } }
        });
        cmHost.innerHTML = "";
        cmHost.appendChild(h("div", { class: "ix-cm", role: "table", "aria-label": "Confusion matrix at this threshold" }, [
          h("div"), h("div", { class: "hd", text: "Predicted: no default" }), h("div", { class: "hd", text: "Predicted: default" }),
          h("div", { class: "hd", text: "Actual: no default" }), h("div", { class: "cell good" }, [h("b", { text: nfmt(r.TN) }), "correct rejections"]),
          h("div", { class: "cell bad" }, [h("b", { text: nfmt(r.FP) }), "false alarms"]),
          h("div", { class: "hd", text: "Actual: default" }), h("div", { class: "cell bad" }, [h("b", { text: nfmt(r.FN) }), "missed defaults"]),
          h("div", { class: "cell good" }, [h("b", { text: nfmt(r.TP) }), "caught defaults"])
        ]));
        var flagged = r.TP + r.FP;
        readout.innerHTML = "At threshold <strong>" + r.threshold.toFixed(2) + "</strong> the model flags <strong>" + nfmt(flagged) +
          "</strong> customers. <strong>" + nfmt(r.TP) + "</strong> of the " + nfmt(P) + " real defaulters are caught and <strong>" + nfmt(r.FN) +
          "</strong> are missed. " + (r.TP > 0 ? "It raises about <strong>" + (r.FP / r.TP).toFixed(1) + "</strong> false alarms for every default it catches. " : "") +
          "Lowering the threshold catches more defaulters but flags more reliable customers by mistake.";

        // cost what-if
        var bi = best(), br = rows[bi], cur = costK * r.FN + r.FP, bc = costK * br.FN + br.FP;
        costOut.textContent = "1 missed default = " + costK + (costK === 1 ? " false alarm" : " false alarms");
        costText.textContent = "Under this assumption the lowest total cost is at threshold " + br.threshold.toFixed(2) +
          " (cost " + nfmt(bc) + "); at the current threshold it is " + nfmt(cur) + ". The orange triangle on the chart marks the best threshold.";
        jump.onclick = function () { idx = bi; render(); };
      }
      slider.addEventListener("input", function () { idx = +slider.value; render(); });
      costSlider.addEventListener("input", function () { costK = +costSlider.value; render(); });
      onWidthChange(chartHost, render);
      render();
    }).catch(function (e) { showError(mount, e); });
  }

  /* -------------------------------------------------------------- start up */
  function start() {
    var map = { trees: initTrees, models: initModels, threshold: initThreshold };
    Array.prototype.forEach.call(document.querySelectorAll("[data-ix]"), function (el) {
      var fn = map[el.getAttribute("data-ix")];
      if (fn) { el.classList.add("ix"); el.appendChild(h("p", { class: "ix-loading", text: "Loading interactive section…" })); fn(el); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();