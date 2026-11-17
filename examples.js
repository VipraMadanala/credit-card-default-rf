
/* Final Random Forest example explorer.
   Loads saved predictions exported from the notebook. */

(function () {
  "use strict";

  var mount = document.getElementById("rf-examples");

  if (!mount) return;

  var DATA_URL = "data/examples.json";

  // These are the exact 23 input features used in the notebook.
  var FEATURE_GROUPS = [
    {
      title: "Customer details",
      fields: [
        "LIMIT_BAL",
        "SEX",
        "EDUCATION",
        "MARRIAGE",
        "AGE"
      ]
    },
    {
      title: "Repayment status",
      fields: [
        "PAY_0",
        "PAY_2",
        "PAY_3",
        "PAY_4",
        "PAY_5",
        "PAY_6"
      ]
    },
    {
      title: "Bill amounts",
      fields: [
        "BILL_AMT1",
        "BILL_AMT2",
        "BILL_AMT3",
        "BILL_AMT4",
        "BILL_AMT5",
        "BILL_AMT6"
      ]
    },
    {
      title: "Payment amounts",
      fields: [
        "PAY_AMT1",
        "PAY_AMT2",
        "PAY_AMT3",
        "PAY_AMT4",
        "PAY_AMT5",
        "PAY_AMT6"
      ]
    }
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);

    if (className) {
      node.className = className;
    }

    if (text !== undefined && text !== null) {
      node.textContent = text;
    }

    return node;
  }

  function fmt(value) {
    if (value === null || value === undefined) {
      return "Not available";
    }

    if (typeof value === "number") {
      return value.toLocaleString("en-US", {
        maximumFractionDigits: 2
      });
    }

    return String(value);
  }

  function outcome(value) {
    return Number(value) === 1 ? "Default" : "No Default";
  }

  function addMetric(host, label, value) {
    var card = el("div", "rf-metric");

    card.appendChild(
      el("span", "rf-metric-label", label)
    );

    card.appendChild(
      el("strong", "rf-metric-value", Number(value).toFixed(3))
    );

    host.appendChild(card);
  }

  function render(data) {
    if (!data.examples || !data.examples.length) {
      throw new Error("No examples were found in examples.json.");
    }

    if (!data.test_metrics) {
      throw new Error("Test metrics are missing from examples.json.");
    }

    mount.textContent = "";

    // ---- Overall test-set metrics ----

    var metrics = el("div", "rf-metrics");

    metrics.appendChild(
      el(
        "h3",
        "rf-subheading",
        "Final Random Forest — overall test-set metrics"
      )
    );

    var metricGrid = el("div", "rf-metric-grid");

    var metricValues = [
      ["Accuracy", data.test_metrics.accuracy],
      ["Precision", data.test_metrics.precision],
      ["Recall", data.test_metrics.recall],
      ["F1-score", data.test_metrics.f1],
      ["ROC-AUC", data.test_metrics.roc_auc],
      ["PR-AUC", data.test_metrics.pr_auc]
    ];

    metricValues.forEach(function (item) {
      addMetric(metricGrid, item[0], item[1]);
    });

    metrics.appendChild(metricGrid);
    mount.appendChild(metrics);

    // ---- Example selector ----

    var controls = el("div", "rf-controls");

    var label = el(
      "label",
      "rf-select-label",
      "Select a test-set example"
    );

    label.htmlFor = "rf-example-select";

    var select = el("select", "rf-select");
    select.id = "rf-example-select";

    data.examples.forEach(function (example) {
      var option = document.createElement("option");

      option.value = String(example.example);

      option.textContent =
        "Example " +
        String(example.example).padStart(2, "0") +
        " — predicted " +
        outcome(example.predicted);

      select.appendChild(option);
    });

    controls.appendChild(label);
    controls.appendChild(select);

    mount.appendChild(controls);

    // ---- Prediction display ----

    var result = el("div", "rf-result");

    result.setAttribute("aria-live", "polite");

    mount.appendChild(result);

    function showExample() {
      var example = data.examples.find(function (item) {
        return String(item.example) === select.value;
      });

      if (!example) return;

      result.textContent = "";

      var top = el("div", "rf-result-top");

      // Model prediction
      var prediction = el("div", "rf-prediction");

      prediction.appendChild(
        el("span", "rf-eyebrow", "Final model prediction")
      );

      prediction.appendChild(
        el("strong", "rf-predicted", outcome(example.predicted))
      );

      prediction.appendChild(
        el(
          "span",
          "rf-probability",
          "Estimated default probability: " +
          (Number(example.default_probability) * 100).toFixed(1) +
          "%"
        )
      );

      top.appendChild(prediction);

      // Actual outcome
      var actual = el("div", "rf-actual");

      actual.appendChild(
        el("span", "rf-eyebrow", "Actual test-set outcome")
      );

      actual.appendChild(
        el("strong", "", outcome(example.actual))
      );

      actual.appendChild(
        el(
          "span",
          "rf-correct",
          example.correct
            ? "Correct prediction"
            : "Incorrect prediction"
        )
      );

      top.appendChild(actual);

      result.appendChild(top);

      // Probability bar
      var meter = el("div", "rf-meter");

      var meterFill = el("div", "rf-meter-fill");

      var probability = Math.max(
        0,
        Math.min(1, Number(example.default_probability))
      );

      meterFill.style.width = (probability * 100) + "%";

      meter.appendChild(meterFill);

      result.appendChild(meter);

      // Expandable feature details
      var details = el("details", "rf-details");

      var summary = el(
        "summary",
        "",
        "View the 23 input features used for this prediction"
      );

      details.appendChild(summary);

      FEATURE_GROUPS.forEach(function (group) {
        var heading = el(
          "h4",
          "rf-feature-heading",
          group.title
        );

        details.appendChild(heading);

        var table = el("table", "rf-feature-table");

        group.fields.forEach(function (field) {
          var tr = document.createElement("tr");

          var th = el("th", "", field);

          var value = example.features[field];

          var td = el("td", "", fmt(value));

          tr.appendChild(th);
          tr.appendChild(td);

          table.appendChild(tr);
        });

        details.appendChild(table);
      });

      result.appendChild(details);
    }

    select.addEventListener("change", showExample);

    showExample();
  }

  // ---- Load examples.json ----

  fetch(DATA_URL)
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          DATA_URL + " (HTTP " + response.status + ")"
        );
      }

      return response.json();
    })
    .then(render)
    .catch(function (error) {
      mount.textContent =
        "Could not load the example predictions. " +
        "Check that data/examples.json exists. " +
        error.message;

      mount.classList.add("rf-error");
    });

})();
