--- Accuracy at Each Budget ---
Budget     Accuracy     Correct    Total
----------------------------------------
b=  0%     0.2375       95         400
b= 10%     0.2550       102        400
b= 20%     0.2600       104        400
b= 30%     0.2600       104        400
b=100%     0.2775       111        400

Baseline (direct-only): 0.2375
b=10%: 0.2550 (gain: +0.0175, +7.4%)
b=20%: 0.2600 (gain: +0.0225, +9.5%)
b=30%: 0.2600 (gain: +0.0225, +9.5%)

============================================================
EVALUATION SUMMARY — Reworked Intent-SIM (9B Model)
Method: T=0.5, 9B oracle, few-shot clarification
============================================================
Metric                         Value
---------------------------------------------
AUROC                          0.5514
Direct Accuracy (b=0%)         0.2375
Accuracy (b=10%)               0.2550 (+0.0175)
Accuracy (b=20%)               0.2600 (+0.0225)
Accuracy (b=30%)               0.2600 (+0.0225)
Clarify-All Accuracy (b=100%)  0.2775
---------------------------------------------
Ambiguous Direct Correct       39/200
Ambiguous Clarified Correct    55/200
Unambiguous Direct Correct     56/200
============================================================
