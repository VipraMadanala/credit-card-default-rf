# Credit Card Default Prediction Using Random Forest (ES 335)

Team: Vipra Madanala (25110351), Adarasandi Sai Ashwika (25110010)

Live website: https://adarasandiashwika.github.io/credit-card-default-rf/

## Question
Can information from April-September 2005 predict whether a credit card client defaults in October 2005? One row = one client. Target: `default.payment.next.month`.

## Repository layout
```
index.html, style.css, ix.css, script.js   website (static, GitHub Pages)
data/                                  tree_count_results.json, model_comparison.json, threshold_results.json
exports/                               train_ids.csv, validation_ids.csv, test_ids.csv, feature_importance.csv,
                                       permutation_importance.csv, tree_count_experiment_50_100_200_300.csv, random_forest.joblib
es335-ml-project-notebook.ipynb        full analysis with saved outputs
requirements.txt                       pandas==2.3.3, numpy==2.1.3, scikit-learn==1.6.1, matplotlib, seaborn, joblib
```

## Data access
Download `UCI_Credit_Card.csv` from Kaggle (`uciml/default-of-credit-card-clients-dataset`), original source UCI Machine Learning Repository. The raw data is not redistributed here.

## Setup and run
```
pip install -r requirements.txt
jupyter notebook es335-ml-project-notebook.ipynb   # edit the CSV path in the loading cell, then Run All
```
Splits: stratified 70/15/15, `random_state=42`; exact IDs are in `exports/`. Test set is used once, for the final model.

## View the website locally 
```
python -m http.server     # then open http://localhost:8000
```
(Opening index.html directly will not load the JSON data files.)

## AI-use disclosure
Claude (Anthropic) was used for brainstorming interactions, debugging the export code, and writing/testing the website HTML, CSS and JavaScript. We ran the notebook ourselves and checked the outputs. (Edit to match your actual use.)

## References
- Yeh, I. C., & Lien, C. H. (2009). Expert Systems with Applications, 36(2), 2473-2480.
- Pedregosa et al. (2011). Scikit-learn: Machine Learning in Python. JMLR 12, 2825-2830.