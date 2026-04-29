--- Accuracy at Each Budget ---
Budget     Accuracy     Correct    Total
----------------------------------------
b=  0%     0.0875       35         400
b= 10%     0.0900       36         400
b= 20%     0.0900       36         400
b= 30%     0.0875       35         400
b=100%     0.1075       43         400

Baseline (direct-only): 0.0875
b=10%: 0.0900 (gain: +0.0025, +2.9%)
b=20%: 0.0900 (gain: +0.0025, +2.9%)
b=30%: 0.0875 (gain: +0.0000, +0.0%)

============================================================
EVALUATION SUMMARY — Reworked Intent-SIM (2B Model)
Method: T=0.5, 9B oracle, few-shot clarification
============================================================
Metric                         Value
---------------------------------------------
AUROC                          0.5273
Direct Accuracy (b=0%)         0.0875
Accuracy (b=10%)               0.0900 (+0.0025)
Accuracy (b=20%)               0.0900 (+0.0025)
Accuracy (b=30%)               0.0875 (+0.0000)
Clarify-All Accuracy (b=100%)  0.1075
---------------------------------------------
Ambiguous Direct Correct       15/200
Ambiguous Clarified Correct    23/200
Unambiguous Direct Correct     20/200
============================================================
