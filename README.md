# Credit Card Default Prediction Using Random Forest

**ES 335 : Machine Learning Course Project**

**Team:** Vipra Madanala (25110351) and Adarasandi Sai Ashwika (25110010)

**[Live Website](https://adarasandiashwika.github.io/credit-card-default-rf/)** | **[GitHub Repository](https://github.com/adarasandiashwika/credit-card-default-rf)**

## 1. Project Overview

This project uses the UCI Default of Credit Card Clients dataset to predict October 2005 payment defaults from customer information and repayment history.

We developed and tuned a Random Forest classifier, compared it with simpler baseline models, and evaluated its performance using precision, recall, F1-score, ROC-AUC, and average precision.

The website presents our methodology, experimental results, error analysis, limitations, and interactive model demonstrations.

## 2. Key Results

The final Random Forest uses 300 trees, a maximum depth of 12, balanced class weights, and a minimum of 10 samples per leaf.

| Metric | Test Score |
|---|---:|
| Accuracy | 0.7924 |
| Precision | 0.5291 |
| Recall | 0.5663 |
| F1-score | 0.5470 |
| ROC-AUC | 0.7774 |
| Average Precision | 0.5535 |

The model achieved a higher validation F1-score than the majority-class, repayment-rule, and decision-tree baselines. Its test performance is also comparable to other publicly available implementations using the same dataset.

Detailed comparisons and findings are available on the project website.

## 3. Individual Contributions

**Vipra Madanala**

Conducted exploratory data analysis, data quality checks, preprocessing, and dataset splitting. Developed the baseline models and carried out Random Forest training, hyperparameter tuning, and final model selection. Also contributed to result interpretation and website content.

**Adarasandi Sai Ashwika**

Conducted model evaluation using classification metrics, confusion matrices, and precision-recall analysis. Worked on error analysis, feature importance, and threshold-based performance evaluation. Also developed the interactive website and integrated the model results.

## 4. Repository Contents

- `es335-ml-project-notebook.ipynb` - Complete machine learning workflow, experiments, and results.
- `index.html`, `style.css`, `ix.css`, `script.js`, `tryit.js` - Website implementation.
- `data/` - Exported results and model data for interactive visualizations.
- `exports/` - Trained model, dataset split IDs, and analysis outputs.
- `requirements.txt` - Python dependencies.

## 5. Dataset and Reproducibility

**Dataset:** [UCI Default of Credit Card Clients - Kaggle copy](https://www.kaggle.com/datasets/uciml/default-of-credit-card-clients-dataset)

The dataset contains 30,000 customers and 23 input features. We used a stratified 70/15/15 train-validation-test split with `random_state=42`.

To reproduce the analysis:

```bash
git clone https://github.com/adarasandiashwika/credit-card-default-rf
cd credit-card-default-rf
pip install -r requirements.txt
jupyter notebook es335-ml-project-notebook.ipynb
```

Download `UCI_Credit_Card.csv`, update the dataset path in the notebook if needed, and run all cells.

To view the website locally:

```bash
python -m http.server 5500
```

Open `http://localhost:5500` in your browser.

## 6. References

1. Yeh, I. C., & Lien, C. H. (2009). *The comparisons of data mining techniques for the predictive accuracy of probability of default of credit card clients.* Expert Systems with Applications, 36(2), 2473–2480.
2. Pedregosa et al. (2011). *Scikit-learn: Machine Learning in Python.* JMLR, 12, 2825–2830.

Additional implementation references are linked in the website's comparison section.
