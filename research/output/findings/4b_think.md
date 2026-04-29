--- Accuracy at Each Budget ---
Budget     Accuracy     Correct    Total
----------------------------------------
b=  0%     0.2050       82         400
b= 10%     0.2100       84         400
b= 20%     0.2150       86         400
b= 30%     0.2150       86         400
b=100%     0.2200       88         400

Baseline (direct-only): 0.2050
b=10%: 0.2100 (gain: +0.0050, +2.4%)
b=20%: 0.2150 (gain: +0.0100, +4.9%)
b=30%: 0.2150 (gain: +0.0100, +4.9%)

============================================================
EVALUATION SUMMARY — Reasoning-Based (4B Model)
Method: Single reasoning prompt, direct probability output
============================================================
Metric                         Value
---------------------------------------------
AUROC                          0.6081
Direct Accuracy (b=0%)         0.2050
Accuracy (b=10%)               0.2100 (+0.0050)
Accuracy (b=20%)               0.2150 (+0.0100)
Accuracy (b=30%)               0.2150 (+0.0100)
Clarify-All Accuracy (b=100%)  0.2200
---------------------------------------------
Ambiguous Direct Correct       35/200
Ambiguous Clarified Correct    41/200
Unambiguous Direct Correct     47/200
============================================================

=== TOP 5 HIGHEST UNCERTAINTY (should be ambiguous) ===
  [+] entropy=2.020 | Who sang there's a meeting in the ladies room?
      0.15 — The user is asking for the artist of a specific song with the title 'T
      0.45 — The user is trying to recall a song where the lyrics contain this phra
      0.20 — The user is referring to a scene from a movie or TV show rather than a
      0.15 — The user is misremembering a different song title, such as 'There's a
      0.05 — The user is asking about a specific viral audio clip or meme that uses

  [-] entropy=1.977 | Where does the coin go in a french drop?
      0.45 — The user is asking about a specific magic trick or sleight-of-hand tec
      0.25 — The user is asking about a specific game mechanic or rule in a video g
      0.15 — The user has confused the term and is actually asking about a 'French
      0.10 — The user is referring to a specific coin handling technique in currenc
      0.05 — The user is asking about a physical location named 'French Drop' where

  [+] entropy=1.977 | Who plays the skin changer in the hobbit?
      0.45 — The user is asking about the actor who plays Smaug, but has misremembe
      0.25 — The user is referring to a specific minor character in The Hobbit movi
      0.15 — The user is confusing the movie title 'The Hobbit' with another fantas
      0.10 — The user is asking about the actor who plays Gandalf, potentially misr
      0.05 — The user is referring to a specific scene or prop involving skin chang

  [-] entropy=1.883 | Who is the actor that plays brick heck?
      0.35 — The user is asking about the actor who plays the character 'Brick' fro
      0.25 — The user is referring to a specific, possibly obscure character named
      0.30 — The user has misspelled the name of a well-known character (e.g., 'Bro
      0.10 — The user is asking about the actor who plays the character 'Brick' fro

  [-] entropy=1.857 | Who plays marilyn in battle of the sexes?
      0.35 — The user is asking about the actress who portrays Marilyn Monroe in a
      0.35 — The user is asking about the actress who plays Billie Jean King in the
      0.20 — The user is asking about a specific scene or sketch within the 1974 TV
      0.10 — The user is referring to the 1974 TV special 'Battle of the Sexes' and

=== TOP 5 LOWEST UNCERTAINTY (should be unambiguous) ===
  [-] entropy=0.000 | The association of more than one ribosome with a single mole
      1.00 — The user is asking for the biological term 'polysome' or 'polyribosome

  [+] entropy=0.000 | Which religion has the highest population in africa?
      1.00 — The user wants to know which specific religious faith has the largest

  [-] entropy=0.000 | Who gave the concept of ingroup and outgroup?
      1.00 — The user is asking for the originator of the specific terminology and

  [+] entropy=0.000 | Who is won the most super bowl games?
      1.00 — The user is asking for the name of the individual (person) who has won

  [+] entropy=0.000 | Number of cigarettes in a pack in usa?
      1.00 — The user wants to know the standard number of cigarettes found in a si