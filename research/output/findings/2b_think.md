--- Accuracy at Each Budget ---
Budget     Accuracy     Correct    Total
----------------------------------------
b=  0%     0.0925       37         400
b= 10%     0.0925       37         400
b= 20%     0.0950       38         400
b= 30%     0.0950       38         400
b=100%     0.1100       44         400

Baseline (direct-only): 0.0925
b=10%: 0.0925 (gain: +0.0000, +0.0%)
b=20%: 0.0950 (gain: +0.0025, +2.7%)
b=30%: 0.0950 (gain: +0.0025, +2.7%)

============================================================
EVALUATION SUMMARY — Reasoning-Based (2B Model)
Method: Single reasoning prompt, direct probability output
============================================================
Metric                         Value
---------------------------------------------
AUROC                          0.5737
Direct Accuracy (b=0%)         0.0925
Accuracy (b=10%)               0.0925 (+0.0000)
Accuracy (b=20%)               0.0950 (+0.0025)
Accuracy (b=30%)               0.0950 (+0.0025)
Clarify-All Accuracy (b=100%)  0.1100
---------------------------------------------
Ambiguous Direct Correct       17/200
Ambiguous Clarified Correct    24/200
Unambiguous Direct Correct     20/200
============================================================

=== TOP 5 HIGHEST UNCERTAINTY (should be ambiguous) ===
  [+] entropy=2.267 | In the dream of the rood what is the rood eventually drenche
      0.35 — The question refers to a specific literary or historical reference whe
      0.25 — The question contains a typo and should be interpreted as asking about
      0.25 — The question is a riddle where 'rood' refers to water or blood in a me
      0.15 — The question asks about the physical state of an object (wooden beam)
      0.20 — The question is unambiguous and refers to a specific religious or bibl

  [-] entropy=2.243 | Which character in les miserables sings on my own?
      0.15 — The user is asking about a specific character named 'On My Own' who ap
      0.35 — The user is asking which character sings the song titled 'On My Own' w
      0.25 — The user is asking about a specific scene or lyric in Les Misérables w
      0.15 — The user is confused and referring to a song title that does not exist
      0.20 — The user is asking about a character named 'Marius' who sings a song r

  [-] entropy=2.121 | The pectoralis minor is located deep to which muscle?
      0.35 — Identify the specific muscle that lies superficial to the pectoralis m
      0.25 — Identify the anatomical relationship between the pectoralis minor and
      0.15 — Determine if the question refers to the deep layer of the chest wall o
      0.20 — Identify the muscle that lies superficial to the pectoralis minor in t
      0.05 — Clarify the anatomical depth relationship between the pectoralis minor

  [+] entropy=2.068 | What instrument do you blow into with a keyboard?
      0.45 — The user is referring to a specific musical instrument that uses keys
      0.30 — The user is asking about the organ, specifically a wind organ where ke
      0.25 — The user is asking about a trick question or riddle with no real instr
      0.15 — The user is confusing the term 'keyboard' with an electronic device an
      0.05 — The user is referring to a specific type of keyboard instrument like a

  [-] entropy=2.054 | Kid who plays jonah in sleepless in seattle?
      0.45 — The user is asking for the name of the character 'Jonah' in the TV sho
      0.30 — The user is looking for information about a specific episode or scene
      0.20 — The user is asking about the actor who played the character 'Jonah' in
      0.15 — The user has made a typo and meant to ask about a different show or ch
      0.05 — The user is asking for trivia regarding the child actor's name who pla

=== TOP 5 LOWEST UNCERTAINTY (should be unambiguous) ===
  [+] entropy=0.000 | Who sings the song you got to keep your head up?
      1.00 — Who sings the song you got to keep your head up?

  [-] entropy=0.000 | Who plays harry in 3rd rock from the sun?
      1.00 — Who is the actor who plays the character Harry in the TV show '3rd Roc

  [-] entropy=0.000 | Who won the most games between the packers and the bears?
      1.00 — Who won the most games between the packers and the bears?

  [-] entropy=0.000 | Who was the winner of britain's got talent season 8?
      1.00 — Identify the specific individual who won the competition in Season 8 o

  [-] entropy=0.000 | How many episodes of switched at birth season 1?
      1.00 — How many episodes of switched at birth season 1?