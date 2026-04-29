--- Accuracy at Each Budget ---
Budget     Accuracy     Correct    Total
----------------------------------------
b=  0%     0.2025       81         400
b= 10%     0.2025       81         400
b= 20%     0.2050       82         400
b= 30%     0.2050       82         400
b=100%     0.2350       94         400

Baseline (direct-only): 0.2025
b=10%: 0.2025 (gain: +0.0000, +0.0%)
b=20%: 0.2050 (gain: +0.0025, +1.2%)
b=30%: 0.2050 (gain: +0.0025, +1.2%)

============================================================
EVALUATION SUMMARY — Reworked Intent-SIM (4B Model)
Method: T=0.5, 9B oracle, few-shot clarification
============================================================
Metric                         Value
---------------------------------------------
AUROC                          0.5006
Direct Accuracy (b=0%)         0.2025
Accuracy (b=10%)               0.2025 (+0.0000)
Accuracy (b=20%)               0.2050 (+0.0025)
Accuracy (b=30%)               0.2050 (+0.0025)
Clarify-All Accuracy (b=100%)  0.2350
---------------------------------------------
Ambiguous Direct Correct       34/200
Ambiguous Clarified Correct    47/200
Unambiguous Direct Correct     47/200
============================================================
