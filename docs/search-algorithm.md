# Bounded candidate search

Both Python and PHP use `bounded-search-v1`, with the same anchor recipes,
32-bit linear congruential generator, seed and candidate budget. Internal anchors
are projected into the requested bounds. Generated quantities are represented at
0.01 kg/m3, retaining exact boundaries when a narrower bound has no cent-grid
point. A validated user starting recipe retains its original precision.

Each unique candidate is evaluated once, up to the declared budget. Missing
factors for positive-quantity ingredients exclude that candidate from ranking.
Feasibility requires the predicted-strength threshold, separate w/c and w/b
limits, supported ingredient bounds and a plausible w/b interval [0.20, 1.00].
Only feasible candidates are recommended. If none is found, the closest checked
candidate is diagnostic and the result explicitly says the budget found none;
it does not prove the continuous problem infeasible.

The score is a normalized weighted sum:
`(alpha * CO2 / CO2_reference + beta * cost / cost_reference) / (alpha + beta)`.
Defaults are 400 kg CO2e/m3 and 100 currency units/m3. The cost reference must use
the factor table's currency; convert it with the prices when changing units.
References are fixed per request, not estimated from the candidate set.
Ties use lexicographic ingredient order from the versioned search contract.

`success` means a feasible candidate was found. `is_optimum` remains false:
this method establishes only the best score among evaluated candidates, not a
global optimum or physical laboratory suitability. `search` records settings,
normalization, generated/evaluated/feasible counts and the numerical tolerance.
Normal execution and tests use the same algorithm without test-runner detection.
