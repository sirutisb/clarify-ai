--- Accuracy at Each Budget ---
Budget     Accuracy     Correct    Total
----------------------------------------
b=  0%     0.2375       95         400
b= 10%     0.2450       98         400
b= 20%     0.2500       100        400
b= 30%     0.2550       102        400
b=100%     0.2850       113        400

Baseline (direct-only): 0.2375
b=10%: 0.2450 (gain: +0.0075, +3.2%)
b=20%: 0.2500 (gain: +0.0125, +5.3%)
b=30%: 0.2550 (gain: +0.0175, +7.4%)

============================================================
EVALUATION SUMMARY — Reasoning-Based (9B Model)
Method: Single reasoning prompt, direct probability output
============================================================
Metric                         Value
---------------------------------------------
AUROC                          0.5994
Direct Accuracy (b=0%)         0.2375
Accuracy (b=10%)               0.2450 (+0.0075)
Accuracy (b=20%)               0.2500 (+0.0125)
Accuracy (b=30%)               0.2550 (+0.0175)
Clarify-All Accuracy (b=100%)  0.2850
---------------------------------------------
Ambiguous Direct Correct       38/200
Ambiguous Clarified Correct    57/200
Unambiguous Direct Correct     57/200
============================================================

=== TOP 5 HIGHEST UNCERTAINTY (should be ambiguous) ===
  [+] entropy=2.121 | Who was the first person who discovered electricity?
      0.35 — The user is asking about Thales of Miletus, who is credited with the e
      0.25 — The user is asking about William Gilbert, who systematically studied e
      0.20 — The user is referring to Benjamin Franklin, based on the popular misco
      0.15 — The user holds a misconception that electricity was discovered by a si
      0.05 — The user is actually asking about the discovery of electric current or

  [+] entropy=2.104 | When did frontier take over verizon in california?
      0.40 — The user is asking about a corporate acquisition where Frontier Commun
      0.25 — The user is asking about a specific service migration or contract chan
      0.15 — The user is confused about the entities and actually means when anothe
      0.10 — The user is asking about a regulatory or infrastructure sharing agreem
      0.10 — The user is referring to a specific historical event involving bankrup

  [+] entropy=2.104 | Who plays the skin changer in the hobbit?
      0.40 — The user is asking about a specific character named 'Skin Changer' in
      0.25 — The user is referring to an actor known for playing a role involving s
      0.15 — The user is asking about a character that changes appearance (like Gol
      0.10 — The user is referring to a specific actor who plays a minor role or cr
      0.10 — The question is based on misinformation, as there is no character name

  [-] entropy=2.020 | What is the families last name on this is us?
      0.45 — The user is asking for the family's last name on a United States docum
      0.20 — The user is asking about a specific entity or person named 'Us' and wa
      0.15 — The user is asking if the people in the image ('this') are 'us' (the u
      0.15 — The user made a typo and meant to ask 'What is the family's last name
      0.05 — The user is referring to a specific field or label named 'US' within a

  [+] entropy=1.977 | When was the last time england win the world cup?
      0.45 — The user is asking about the FIFA Men's Football World Cup, likely und
      0.25 — The user is actually referring to the UEFA European Championship (Euro
      0.15 — The user is asking about a different sport's World Cup, such as Rugby
      0.10 — The user is asking about the FIFA Women's World Cup, omitting the word
      0.05 — The user is testing the AI's ability to handle false premises or factu

=== TOP 5 LOWEST UNCERTAINTY (should be unambiguous) ===
  [-] entropy=0.000 | Who is though she be but little she is fierce about?
      1.00 — Who is though she be but little she is fierce about?

  [-] entropy=0.000 | What is the fourth letter of the greek alphabet?
      1.00 — The user is asking for the name of the fourth letter in the standard s

  [+] entropy=0.000 | What is the musculoskeletal system and what does it do?
      1.00 — The user is asking for a general biological definition and functional

  [-] entropy=0.000 | How many episodes in season 4 agents of shield?
      1.00 — How many episodes in season 4 agents of shield?

  [-] entropy=0.000 | The association of more than one ribosome with a single mole
      1.00 — The user is asking for the specific biological term used to describe a