/**
 * Logic Puzzles Database
 * ======================
 * 
 * Defines structured metadata, clues, constraints, expected outcomes,
 * and branch evaluation prompts for the reasoning solver agents.
 */

export const PUZZLES = [
  {
    id: "three-boxes",
    name: "The Three Boxes Gold Riddle",
    description: "There are three boxes: Red, Blue, and Green. One box contains gold. Each box has a label on it, but only one label is true.",
    clues: [
      "Red Box Label: 'The gold is not in the Blue box.'",
      "Blue Box Label: 'The gold is in this box.'",
      "Green Box Label: 'The gold is not in this box.'"
    ],
    rules: [
      "Rule 1: Exactly one box contains the gold.",
      "Rule 2: Exactly one label is true (and the other two are false)."
    ],
    candidateBranches: ["Red", "Blue", "Green"],
    evaluatorInstructions: (candidate) => `
You are a logic validator. We are evaluating a branch in a Tree-of-Thoughts.
Hypothesis: The gold is in the **${candidate}** box.

Using this hypothesis, analyze the truth value (True or False) of each label:
1. Red Box Label ("The gold is not in the Blue box."): Is it True or False?
2. Blue Box Label ("The gold is in this box."): Is it True or False?
3. Green Box Label ("The gold is not in this box."): Is it True or False?

Count how many labels are True under this assumption.
Does this violate the rule that exactly ONE label is True?

Output your response strictly in the following JSON format:
{
  "assumption": "${candidate}",
  "redLabel": "True or False",
  "blueLabel": "True or False",
  "greenLabel": "True or False",
  "trueLabelCount": 0,
  "hasContradiction": true or false,
  "explanation": "Brief explanation of the truth values"
}
`,
    expectedAnswer: "Green"
  },
  {
    id: "knights-knaves",
    name: "The Island of Knights and Knaves",
    description: "You meet two inhabitants, A and B, on an island. Knights always tell the truth; Knaves always lie.",
    clues: [
      "Person A says: 'We are both knaves.'"
    ],
    rules: [
      "Rule 1: Every person is either a Knight (always tells the truth) or a Knave (always lies).",
      "Rule 2: The truth value of a person's statement must match their identity (True if Knight, False if Knave)."
    ],
    candidateBranches: [
      "A is a Knight, B is a Knight",
      "A is a Knight, B is a Knave",
      "A is a Knave, B is a Knight",
      "A is a Knave, B is a Knave"
    ],
    evaluatorInstructions: (candidate) => `
You are a logic validator. We are evaluating a branch in a Tree-of-Thoughts.
Hypothesis: **${candidate}**

Using this hypothesis, evaluate Person A's statement ("We are both knaves."):
1. Is A's statement actually True or False under this assumption? (Since A is assumed to be ${candidate.includes("A is a Knave") ? "a Knave" : "a Knight"} and B is assumed to be ${candidate.endsWith("Knight") ? "a Knight" : "a Knave"})
2. Does the truth value of A's statement match A's assumed identity?
   - If A is assumed to be a Knight, A's statement must be True.
   - If A is assumed to be a Knave, A's statement must be False.
3. Is there a contradiction? (i.e. does the statement truth value mismatch the identity?)

Output your response strictly in the following JSON format:
{
  "assumption": "${candidate}",
  "statementTruthValue": "True or False",
  "matchesIdentity": true or false,
  "hasContradiction": true or false,
  "explanation": "Brief step-by-step logic explaining the matching or contradiction"
}
`,
    expectedAnswer: "A is a Knave, B is a Knight"
  }
];
