import OpenAI from "openai";
import { CHATBOT_INSTRUCTIONS } from
  "../app/config/chatbot.server";

type EvalCase = {
  name: string;
  input: string;
  requiredConcepts: string[][];
  forbiddenTerms?: string[];
};

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL;
const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;


if (!apiKey) {
  throw new Error("OPENAI_API_KEY is missing");
}

if (!model) {
  throw new Error("OPENAI_MODEL is missing");
}


if (!vectorStoreId) {
  throw new Error(
    "OPENAI_VECTOR_STORE_ID is missing",
  );
}

const openai = new OpenAI({ apiKey });

const evalCases: EvalCase[] = [
  {
    name: "Delivery policy",
    input: "How long does normal delivery take?",
    requiredConcepts: [
      ["2", "two"],
      ["5", "five"],
      ["business day"],
    ],
  },
  {
    name: "Return policy",
    input: "What is the return window?",
    requiredConcepts: [
      ["14", "fourteen"],
      ["return"],
    ],
  },
  {
    name: "Order escalation",
    input: "Where is my order #1234?",
    requiredConcepts: [
      ["support@example.com"],
    ],
    forbiddenTerms: [
      "your order has shipped",
      "your order is delivered",
      "your order is processing",
    ],
  },
  {
    name: "Unknown stock",
    input: "Is the black T-shirt currently in stock?",
    requiredConcepts: [
      ["stock", "inventory"],
      [
        "cannot confirm",
        "can't confirm",
        "unable to confirm",
        "don't have access",
        "do not have access",
        "no access to live",
        "stock information isn't available",
        "stock information is not available",
        "inventory information isn't available",
        "inventory information is not available",
      ],
    ],
  },
  {
    name: "Backpack capacity",
    input:
      "What is the capacity of the Nimbus Travel Backpack?",
    requiredConcepts: [
      ["22 litres", "22 liters", "22l"],
    ],
  },
  {
    name: "Backpack laptop size",
    input:
      "Will the Nimbus backpack fit a 15-inch laptop?",
    requiredConcepts: [
      ["14 inches", "14-inch", "up to 14"],
      [
        "will not",
        "won't",
        "may not",
        "not designed",
        "only fits",
      ],
    ],
  },
  {
    name: "Outside-Dhaka delivery cost",
    input:
      "How much is delivery outside Dhaka?",
    requiredConcepts: [
      ["150", "one hundred fifty"],
      ["bdt", "taka"],
    ],
  },
  {
    name: "T-shirt care",
    input:
      "How should I wash the Everyday Cotton T-shirt?",
    requiredConcepts: [
      ["cold water"],
      ["do not use bleach", "don't use bleach", "avoid bleach"],
      ["air dry", "air drying"],
    ],
  },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function evaluateAnswer(
  answer: string,
  testCase: EvalCase,
): {
  passed: boolean;
  missingConcepts: string[][];
  foundForbiddenTerms: string[];
} {
  const normalizedAnswer = normalize(answer);

  const missingConcepts =
    testCase.requiredConcepts.filter(
      (alternatives) =>
        !alternatives.some((term) =>
          normalizedAnswer.includes(
            normalize(term),
          ),
        ),
    );

  const foundForbiddenTerms = (
    testCase.forbiddenTerms ?? []
  ).filter((term) =>
    normalizedAnswer.includes(normalize(term)),
  );

  return {
    passed:
      missingConcepts.length === 0 &&
      foundForbiddenTerms.length === 0,
    missingConcepts,
    foundForbiddenTerms,
  };
}

let passedCount = 0;

for (const testCase of evalCases) {
  const response = await openai.responses.create({
    model,
    instructions: CHATBOT_INSTRUCTIONS,
    input: testCase.input,
    tools: [
      {
        type: "file_search",
        vector_store_ids: [vectorStoreId],
        max_num_results: 5,
      },
    ],
    max_output_tokens: 200,
  });

  const answer = response.output_text;
  const result = evaluateAnswer(answer, testCase);

  if (result.passed) {
    passedCount += 1;
  }

  console.log(
    `\n${result.passed ? "PASS" : "FAIL"}: ${testCase.name}`,
  );
  console.log(`Question: ${testCase.input}`);
  console.log(`Answer: ${answer}`);

  if (result.missingConcepts.length > 0) {
    console.log(
      "Missing concepts:",
      result.missingConcepts,
    );
  }

  if (result.foundForbiddenTerms.length > 0) {
    console.log(
      "Forbidden claims:",
      result.foundForbiddenTerms,
    );
  }
}

console.log(
  `\nResult: ${passedCount}/${evalCases.length} passed`,
);

if (passedCount !== evalCases.length) {
  process.exitCode = 1;
}