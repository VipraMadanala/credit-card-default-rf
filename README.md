# Credit Card Default Prediction Using Random Forest

**ES 335 Machine Learning course project**

**Team:** Vipra Madanala (25110351), Adarasandi Sai Ashwika (25110010)

**Live website:** https://adarasandiashwika.github.io/credit-card-default-rf/

**Repository:** https://github.com/adarasandiashwika/credit-card-default-rf

---

## 1. Project summary
We study whether information from April to September 2005 can predict whether a credit card client defaults on their October 2005 payment. One row is one client. The target is `default.payment.next.month`. We compare a majority-class baseline, a repayment-status rule and a single decision tree with a tuned random forest, evaluated with precision, recall, F1, ROC-AUC and average precision. The website presents the full reasoning and three interactive sections.

## 2. Contributions
- **Vipra Madanala (25110351):** machine-learning work in the notebook: preprocessing, data split, baselines, random forest training and tuning, final evaluation, and error analysis.
- **Adarasandi Sai Ashwika (25110010):** rechecked the notebook code and updated the export step so the notebook generates all website data and packages it as a ZIP; built the project website and its interactive sections; GitHub Pages deployment and repository organisation.
- **Both:** reviewed all results and can explain the full project.

## 3. Repository layout
```
index.html, style.css, ix.css, script.js, tryit.js  Website (static, hosted on GitHub Pages)
data/                                      Data loaded by the website's interactive sections
    tree_count_results.json
    model_comparison.json
    threshold_results.json
    tryit_model.json
exports/                                   Reproducibility files
    train_ids.csv, validation_ids.csv, test_ids.csv      Exact customer IDs of each split
    feature_importance.csv, permutation_importance.csv
    tree_count_experiment_50_100_200_300.csv
    random_forest.joblib                                 Final trained model
es335-ml-project-notebook.ipynb            Full analysis with saved outputs
requirements.txt                           Python package versions
```

## 4. Data access
- Dataset: *Default of Credit Card Clients* (UCI Machine Learning Repository; Yeh & Lien, 2009).
- Download `UCI_Credit_Card.csv` from Kaggle: `uciml/default-of-credit-card-clients-dataset`.
- The raw data file is not redistributed in this repository.

## 5. Setup and run
```
git clone https://github.com/adarasandiashwika/credit-card-default-rf
cd credit-card-default-rf
pip install -r requirements.txt
jupyter notebook es335-ml-project-notebook.ipynb
```
Place `UCI_Credit_Card.csv` where the notebook's loading cell expects it (edit the path in that cell), then choose **Run All**. The last cells write the files in `exports/` and `data/` and rebuild `project_exports.zip`.

## 6. Data split and evaluation design
- Stratified random split: 70% train (21,000), 15% validation (4,500), 15% test (4,500), `random_state=42`. The exact customer IDs are in `exports/`.
- Number of trees: the validation curve is flat from about 150 trees (F1 0.5459 at 150, 0.5454 at 300, difference far inside the bootstrap interval). We kept the 300 trees selected earlier and did not re-select after seeing the test result.
- Models are fitted on the training set, and all comparison and tuning use the validation set.
- The test set is used once, for the final selected model.

## 7. View the website locally
```
python -m http.server 5500
```
Then open `http://localhost:5500`. Opening `index.html` directly from the file system will not load the JSON data files.

## 8. AI-use disclosure
We used Claude (Anthropic) for brainstorming the interactive features, debugging and extending the notebook's export code, and writing and testing the website's HTML, CSS and JavaScript, building the Try-it scorer that runs the exported forest in the browser. We ran the notebook ourselves and checked the reported results against its outputs. We are responsible for all results and can explain any part of the work.

## 9. References
- Yeh, I. C., & Lien, C. H. (2009). The comparisons of data mining techniques for the predictive accuracy of probability of default of credit card clients. *Expert Systems with Applications*, 36(2), 2473-2480.
- Pedregosa et al. (2011). Scikit-learn: Machine Learning in Python. *JMLR*, 12, 2825-2830.