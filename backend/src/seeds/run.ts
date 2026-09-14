import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

type Q = {
  stem: string;
  options: string[];
  correct: number;
  explanation: string;
  topic: string;
  subtopic: string;
  concept: string;
  difficulty: number;
  discrimination: number;
  bloom: string;
  skill: string;
};

const CONCEPTS: {
  slug: string;
  name: string;
  domain: string;
  description: string;
  dimension: string;
}[] = [
  { slug: "complexity", name: "Time & Space Complexity", domain: "DSA", description: "Big-O analysis", dimension: "complexity" },
  { slug: "arrays", name: "Arrays", domain: "DSA", description: "Contiguous sequences", dimension: "data_structures" },
  { slug: "hashing", name: "Hashing", domain: "DSA", description: "Hash maps and sets", dimension: "data_structures" },
  { slug: "two-pointers", name: "Two Pointers", domain: "DSA", description: "Paired index techniques", dimension: "algorithms" },
  { slug: "sliding-window", name: "Sliding Window", domain: "DSA", description: "Subarray windows", dimension: "algorithms" },
  { slug: "strings", name: "Strings", domain: "DSA", description: "String processing", dimension: "data_structures" },
  { slug: "linked-list", name: "Linked Lists", domain: "DSA", description: "Singly/doubly linked lists", dimension: "data_structures" },
  { slug: "stack", name: "Stacks", domain: "DSA", description: "LIFO structures", dimension: "data_structures" },
  { slug: "queue", name: "Queues", domain: "DSA", description: "FIFO structures", dimension: "data_structures" },
  { slug: "recursion", name: "Recursion", domain: "DSA", description: "Recursive thinking", dimension: "problem_solving" },
  { slug: "sorting", name: "Sorting", domain: "DSA", description: "Comparison and linear sorts", dimension: "algorithms" },
  { slug: "searching", name: "Searching", domain: "DSA", description: "Binary search variants", dimension: "algorithms" },
  { slug: "trees", name: "Trees", domain: "DSA", description: "Binary trees and traversals", dimension: "data_structures" },
  { slug: "bst", name: "Binary Search Trees", domain: "DSA", description: "Ordered trees", dimension: "data_structures" },
  { slug: "heaps", name: "Heaps", domain: "DSA", description: "Priority queues", dimension: "data_structures" },
  { slug: "graphs", name: "Graphs", domain: "DSA", description: "BFS, DFS, weighted graphs", dimension: "algorithms" },
  { slug: "dp", name: "Dynamic Programming", domain: "DSA", description: "Optimal substructure", dimension: "algorithms" },
  { slug: "greedy", name: "Greedy Algorithms", domain: "DSA", description: "Locally optimal choices", dimension: "algorithms" },
  { slug: "oop", name: "Object-Oriented Design", domain: "SWE", description: "Classes, SOLID", dimension: "systems" },
  { slug: "dbms", name: "Databases", domain: "SWE", description: "SQL and indexing", dimension: "systems" },
  { slug: "os", name: "Operating Systems", domain: "SWE", description: "Processes, memory, concurrency", dimension: "systems" },
  { slug: "communication", name: "Engineering Communication", domain: "SWE", description: "Explaining tradeoffs", dimension: "communication" },
];

const PREREQS: [string, string][] = [
  ["complexity", "arrays"],
  ["arrays", "two-pointers"],
  ["arrays", "sliding-window"],
  ["hashing", "strings"],
  ["arrays", "sorting"],
  ["sorting", "searching"],
  ["recursion", "trees"],
  ["trees", "bst"],
  ["trees", "heaps"],
  ["graphs", "dp"],
  ["recursion", "dp"],
  ["complexity", "graphs"],
];

function q(partial: Q): Q {
  return partial;
}

function bank(): Q[] {
  const items: Q[] = [];

  items.push(
    q({
      stem: "What is the average-case time complexity of accessing an element by index in an array?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correct: 0,
      explanation: "Index access in a contiguous array is constant time.",
      topic: "Complexity",
      subtopic: "Arrays",
      concept: "complexity",
      difficulty: -1.2,
      discrimination: 1.1,
      bloom: "remember",
      skill: "recall",
    }),
    q({
      stem: "Mergesort's typical time complexity is:",
      options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"],
      correct: 1,
      explanation: "Mergesort divides in half and merges in linear time, giving O(n log n).",
      topic: "Sorting",
      subtopic: "Mergesort",
      concept: "sorting",
      difficulty: -0.4,
      discrimination: 1.2,
      bloom: "understand",
      skill: "analysis",
    }),
    q({
      stem: "Which structure is best for implementing an undo feature?",
      options: ["Queue", "Stack", "Heap", "Hash set"],
      correct: 1,
      explanation: "Undo is last-in, first-out — a stack.",
      topic: "Stacks",
      subtopic: "Applications",
      concept: "stack",
      difficulty: -1.0,
      discrimination: 1.0,
      bloom: "apply",
      skill: "application",
    }),
    q({
      stem: "BFS on an unweighted graph finds:",
      options: ["Minimum spanning tree", "Shortest path in hops", "Longest path", "Maximum flow"],
      correct: 1,
      explanation: "BFS layers correspond to hop distance from the source.",
      topic: "Graphs",
      subtopic: "BFS",
      concept: "graphs",
      difficulty: 0.1,
      discrimination: 1.3,
      bloom: "understand",
      skill: "analysis",
    }),
    q({
      stem: "A hash map expected lookup is O(1) assuming:",
      options: ["Perfect balance only", "Uniform hashing and light load", "Sorted keys", "No collisions ever"],
      correct: 1,
      explanation: "Expected O(1) needs a good hash and load factor; worst case can degrade.",
      topic: "Hashing",
      subtopic: "Complexity",
      concept: "hashing",
      difficulty: 0.3,
      discrimination: 1.2,
      bloom: "analyze",
      skill: "analysis",
    }),
    q({
      stem: "In a max-heap, the parent of index i (0-based) is at:",
      options: ["2i", "2i+1", "floor((i-1)/2)", "i-1"],
      correct: 2,
      explanation: "Binary heap parent index is floor((i-1)/2).",
      topic: "Heaps",
      subtopic: "Indexing",
      concept: "heaps",
      difficulty: 0.2,
      discrimination: 1.1,
      bloom: "remember",
      skill: "recall",
    }),
    q({
      stem: "Which traversal of a BST yields sorted keys?",
      options: ["Preorder", "Inorder", "Postorder", "Level order"],
      correct: 1,
      explanation: "Inorder on a BST visits keys in non-decreasing order.",
      topic: "BST",
      subtopic: "Traversals",
      concept: "bst",
      difficulty: -0.6,
      discrimination: 1.2,
      bloom: "understand",
      skill: "recall",
    }),
    q({
      stem: "0/1 knapsack is typically solved with:",
      options: ["Greedy by value", "DP over capacity", "BFS", "Union-find"],
      correct: 1,
      explanation: "0/1 knapsack needs DP because greedy can be suboptimal.",
      topic: "DP",
      subtopic: "Knapsack",
      concept: "dp",
      difficulty: 0.6,
      discrimination: 1.4,
      bloom: "apply",
      skill: "application",
    }),
    q({
      stem: "Which SQL clause filters groups after aggregation?",
      options: ["WHERE", "HAVING", "JOIN", "LIMIT"],
      correct: 1,
      explanation: "HAVING filters aggregated groups; WHERE filters rows first.",
      topic: "Databases",
      subtopic: "SQL",
      concept: "dbms",
      difficulty: -0.2,
      discrimination: 1.0,
      bloom: "remember",
      skill: "recall",
    }),
    q({
      stem: "A deadlock requires which of the following?",
      options: ["Only mutual exclusion", "Circular wait among other Coffman conditions", "A single CPU", "Paging"],
      correct: 1,
      explanation: "Deadlock needs the Coffman conditions, including circular wait.",
      topic: "OS",
      subtopic: "Deadlock",
      concept: "os",
      difficulty: 0.5,
      discrimination: 1.1,
      bloom: "understand",
      skill: "analysis",
    })
  );

  const templates: { concept: string; topic: string; subtopic: string; make: (n: number) => Q }[] = [
    {
      concept: "arrays",
      topic: "Arrays",
      subtopic: "Prefix sums",
      make: (n) => ({
        stem: `You compute prefix sums of an array of length n. Querying the sum of a subarray [L, R] then costs: (variant ${n})`,
        options: ["O(n)", "O(1) after O(n) preprocess", "O(log n) always", "O(n^2)"],
        correct: 1,
        explanation: "Prefix sums answer range-sum queries in O(1) after O(n) preprocessing.",
        topic: "Arrays",
        subtopic: "Prefix sums",
        concept: "arrays",
        difficulty: -0.8 + (n % 5) * 0.15,
        discrimination: 1.0 + (n % 3) * 0.1,
        bloom: "apply",
        skill: "application",
      }),
    },
    {
      concept: "two-pointers",
      topic: "Two Pointers",
      subtopic: "Pair sum",
      make: (n) => ({
        stem: `Given a sorted array, finding if two numbers sum to target with two pointers is typically: (set ${n})`,
        options: ["O(n^2)", "O(n)", "O(n log n) required", "O(1)"],
        correct: 1,
        explanation: "Left/right pointers scan once on a sorted array for O(n).",
        topic: "Two Pointers",
        subtopic: "Pair sum",
        concept: "two-pointers",
        difficulty: -0.3 + (n % 4) * 0.2,
        discrimination: 1.2,
        bloom: "apply",
        skill: "application",
      }),
    },
    {
      concept: "sliding-window",
      topic: "Sliding Window",
      subtopic: "Maximum window",
      make: (n) => ({
        stem: `Maximum sum of any contiguous subarray of fixed length k is best found by: (case ${n})`,
        options: ["Recomputing each window in O(nk)", "Sliding window O(n)", "Sorting then scanning", "DFS"],
        correct: 1,
        explanation: "Add the entering element and drop the leaving one for O(n).",
        topic: "Sliding Window",
        subtopic: "Fixed window",
        concept: "sliding-window",
        difficulty: -0.1 + (n % 5) * 0.18,
        discrimination: 1.15,
        bloom: "apply",
        skill: "application",
      }),
    },
    {
      concept: "strings",
      topic: "Strings",
      subtopic: "Anagrams",
      make: (n) => ({
        stem: `Checking if two strings are anagrams is commonly done with: (item ${n})`,
        options: ["Sorting both or frequency maps", "KMP only", "BFS on characters", "Binary search on index"],
        correct: 0,
        explanation: "Equal character counts (or identical sorted forms) define anagrams.",
        topic: "Strings",
        subtopic: "Anagrams",
        concept: "strings",
        difficulty: -0.7 + (n % 4) * 0.2,
        discrimination: 1.05,
        bloom: "understand",
        skill: "application",
      }),
    },
    {
      concept: "linked-list",
      topic: "Linked Lists",
      subtopic: "Fast/slow pointers",
      make: (n) => ({
        stem: `Detecting a cycle in a singly linked list with O(1) extra memory uses: (v${n})`,
        options: ["Hashing every node only", "Floyd's fast/slow pointers", "Recursion stack", "Converting to array first"],
        correct: 1,
        explanation: "Tortoise and hare meet if a cycle exists, using constant extra space.",
        topic: "Linked Lists",
        subtopic: "Cycles",
        concept: "linked-list",
        difficulty: 0.2 + (n % 3) * 0.15,
        discrimination: 1.25,
        bloom: "apply",
        skill: "application",
      }),
    },
    {
      concept: "stack",
      topic: "Stacks",
      subtopic: "Valid parentheses",
      make: (n) => ({
        stem: `Valid parentheses matching is classically implemented with a: (set ${n})`,
        options: ["Queue", "Stack", "Priority queue", "Disjoint set"],
        correct: 1,
        explanation: "Push openers and pop on matching closers.",
        topic: "Stacks",
        subtopic: "Matching",
        concept: "stack",
        difficulty: -0.9 + (n % 4) * 0.1,
        discrimination: 1.0,
        bloom: "apply",
        skill: "application",
      }),
    },
    {
      concept: "queue",
      topic: "Queues",
      subtopic: "BFS",
      make: (n) => ({
        stem: `Level-order tree traversal uses which structure? (${n})`,
        options: ["Stack", "Queue", "Heap", "Union-find"],
        correct: 1,
        explanation: "BFS/level order is queue-driven.",
        topic: "Queues",
        subtopic: "Level order",
        concept: "queue",
        difficulty: -0.8 + (n % 3) * 0.1,
        discrimination: 1.0,
        bloom: "remember",
        skill: "recall",
      }),
    },
    {
      concept: "recursion",
      topic: "Recursion",
      subtopic: "Call stack",
      make: (n) => ({
        stem: `Naive recursive Fibonacci without memoization is: (variant ${n})`,
        options: ["O(n)", "O(log n)", "Exponential time", "O(n^2) guaranteed best"],
        correct: 2,
        explanation: "The recursion tree branches overlapping subproblems exponentially.",
        topic: "Recursion",
        subtopic: "Fibonacci",
        concept: "recursion",
        difficulty: 0.0 + (n % 4) * 0.2,
        discrimination: 1.2,
        bloom: "analyze",
        skill: "analysis",
      }),
    },
    {
      concept: "sorting",
      topic: "Sorting",
      subtopic: "Quicksort",
      make: (n) => ({
        stem: `Quicksort worst-case time (unbalanced pivots) is: (${n})`,
        options: ["O(n log n)", "O(n^2)", "O(n)", "O(1)"],
        correct: 1,
        explanation: "Always picking a worst pivot yields quadratic partitions.",
        topic: "Sorting",
        subtopic: "Quicksort",
        concept: "sorting",
        difficulty: 0.15 + (n % 5) * 0.12,
        discrimination: 1.15,
        bloom: "analyze",
        skill: "analysis",
      }),
    },
    {
      concept: "searching",
      topic: "Searching",
      subtopic: "Binary search",
      make: (n) => ({
        stem: `Binary search on a sorted array of n elements is: (item ${n})`,
        options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
        correct: 1,
        explanation: "Halving the search space each step is logarithmic.",
        topic: "Searching",
        subtopic: "Binary search",
        concept: "searching",
        difficulty: -1.1 + (n % 4) * 0.15,
        discrimination: 1.05,
        bloom: "remember",
        skill: "recall",
      }),
    },
    {
      concept: "trees",
      topic: "Trees",
      subtopic: "Height",
      make: (n) => ({
        stem: `Height of a complete binary tree with n nodes is on the order of: (${n})`,
        options: ["O(n)", "O(log n)", "O(n log n)", "O(sqrt(n)) always"],
        correct: 1,
        explanation: "A complete binary tree is balanced, so height is logarithmic.",
        topic: "Trees",
        subtopic: "Height",
        concept: "trees",
        difficulty: -0.2 + (n % 4) * 0.18,
        discrimination: 1.1,
        bloom: "understand",
        skill: "analysis",
      }),
    },
    {
      concept: "bst",
      topic: "BST",
      subtopic: "Operations",
      make: (n) => ({
        stem: `Average BST search in a reasonably random tree is: (v${n})`,
        options: ["O(1)", "O(log n)", "O(n^2)", "O(n log n)"],
        correct: 1,
        explanation: "Expected height is logarithmic for random insertion order; worst case is a chain.",
        topic: "BST",
        subtopic: "Search",
        concept: "bst",
        difficulty: 0.1 + (n % 3) * 0.2,
        discrimination: 1.2,
        bloom: "analyze",
        skill: "analysis",
      }),
    },
    {
      concept: "heaps",
      topic: "Heaps",
      subtopic: "Priority queue",
      make: (n) => ({
        stem: `Insert into a binary heap is typically: (${n})`,
        options: ["O(1) worst case", "O(log n)", "O(n)", "O(n log n)"],
        correct: 1,
        explanation: "Bubble-up along the height of the heap.",
        topic: "Heaps",
        subtopic: "Insert",
        concept: "heaps",
        difficulty: -0.35 + (n % 4) * 0.16,
        discrimination: 1.1,
        bloom: "remember",
        skill: "recall",
      }),
    },
    {
      concept: "graphs",
      topic: "Graphs",
      subtopic: "DFS",
      make: (n) => ({
        stem: `DFS on a graph with V vertices and E edges using adjacency lists is: (${n})`,
        options: ["O(V^2) always", "O(V+E)", "O(E log V) required", "O(1)"],
        correct: 1,
        explanation: "Each vertex and edge is processed a constant number of times.",
        topic: "Graphs",
        subtopic: "DFS",
        concept: "graphs",
        difficulty: 0.25 + (n % 4) * 0.15,
        discrimination: 1.3,
        bloom: "analyze",
        skill: "analysis",
      }),
    },
    {
      concept: "dp",
      topic: "DP",
      subtopic: "LIS",
      make: (n) => ({
        stem: `Classic DP for Longest Increasing Subsequence (O(n^2)) stores: (${n})`,
        options: ["Only a scalar", "Best LIS ending at each index", "A BFS queue", "Union-find parents"],
        correct: 1,
        explanation: "lis[i] is the best length ending at i, computed from earlier indices.",
        topic: "DP",
        subtopic: "LIS",
        concept: "dp",
        difficulty: 0.8 + (n % 3) * 0.12,
        discrimination: 1.35,
        bloom: "apply",
        skill: "application",
      }),
    },
    {
      concept: "greedy",
      topic: "Greedy",
      subtopic: "Interval scheduling",
      make: (n) => ({
        stem: `Selecting the maximum number of non-overlapping intervals is greedy by: (${n})`,
        options: ["Earliest start", "Earliest finish", "Longest interval first", "Random"],
        correct: 1,
        explanation: "Earliest-finishing interval is the canonical optimal greedy.",
        topic: "Greedy",
        subtopic: "Intervals",
        concept: "greedy",
        difficulty: 0.4 + (n % 4) * 0.14,
        discrimination: 1.25,
        bloom: "apply",
        skill: "application",
      }),
    },
    {
      concept: "oop",
      topic: "OOP",
      subtopic: "SOLID",
      make: (n) => ({
        stem: `The Open/Closed Principle says software entities should be: (${n})`,
        options: ["Open for modification, closed for extension", "Open for extension, closed for modification", "Closed entirely", "Open only to tests"],
        correct: 1,
        explanation: "OCP: extend behavior without changing existing source.",
        topic: "OOP",
        subtopic: "SOLID",
        concept: "oop",
        difficulty: -0.25 + (n % 3) * 0.1,
        discrimination: 0.95,
        bloom: "remember",
        skill: "recall",
      }),
    },
    {
      concept: "dbms",
      topic: "Databases",
      subtopic: "Indexes",
      make: (n) => ({
        stem: `A B-tree index primarily helps: (${n})`,
        options: ["Guarantee denormalization", "Speed equality/range lookups", "Remove the need for keys", "Replace transactions"],
        correct: 1,
        explanation: "B-trees support ordered search and range scans efficiently.",
        topic: "Databases",
        subtopic: "Indexing",
        concept: "dbms",
        difficulty: 0.05 + (n % 4) * 0.12,
        discrimination: 1.05,
        bloom: "understand",
        skill: "analysis",
      }),
    },
    {
      concept: "os",
      topic: "OS",
      subtopic: "Scheduling",
      make: (n) => ({
        stem: `Round-robin CPU scheduling is characterized by: (${n})`,
        options: ["Shortest job first only", "Time slices / quantum", "Priority inversion required", "No preemption ever"],
        correct: 1,
        explanation: "RR cycles ready processes with a time quantum.",
        topic: "OS",
        subtopic: "Scheduling",
        concept: "os",
        difficulty: -0.15 + (n % 3) * 0.15,
        discrimination: 1.0,
        bloom: "understand",
        skill: "recall",
      }),
    },
    {
      concept: "communication",
      topic: "Communication",
      subtopic: "Tradeoffs",
      make: (n) => ({
        stem: `When explaining an algorithm in an interview, the strongest answer usually includes: (${n})`,
        options: ["Code only, no complexity", "Approach, complexity, and edge cases", "Only Big-O with no idea", "Memorized trivia only"],
        correct: 1,
        explanation: "Interviewers look for a clear approach, analysis, and edges — not just syntax.",
        topic: "Communication",
        subtopic: "Interviews",
        concept: "communication",
        difficulty: -0.5 + (n % 4) * 0.1,
        discrimination: 0.9,
        bloom: "evaluate",
        skill: "communication",
      }),
    },
    {
      concept: "complexity",
      topic: "Complexity",
      subtopic: "Space",
      make: (n) => ({
        stem: `An in-place algorithm typically uses extra memory: (${n})`,
        options: ["O(n) extra always", "O(1) extra (ignoring output)", "O(n^2)", "Unbounded"],
        correct: 1,
        explanation: "In-place usually means constant extra memory besides the input.",
        topic: "Complexity",
        subtopic: "Space",
        concept: "complexity",
        difficulty: -0.4 + (n % 5) * 0.1,
        discrimination: 1.0,
        bloom: "understand",
        skill: "analysis",
      }),
    },
    {
      concept: "hashing",
      topic: "Hashing",
      subtopic: "Two-sum",
      make: (n) => ({
        stem: `Two-sum in O(n) expected time uses: (${n})`,
        options: ["Nested loops only", "A hash map of seen values", "Heapsort mandatory", "DFS"],
        correct: 1,
        explanation: "Store complements in a hash map while scanning once.",
        topic: "Hashing",
        subtopic: "Two-sum",
        concept: "hashing",
        difficulty: -0.15 + (n % 4) * 0.18,
        discrimination: 1.2,
        bloom: "apply",
        skill: "application",
      }),
    },
  ];

  let n = 0;
  while (items.length < 200) {
    const t = templates[n % templates.length];
    items.push(t.make(n));
    n += 1;
  }
  return items.slice(0, 200);
}

async function main() {
  console.log("Seeding OmniAssess…");
  await prisma.questionAttempt.deleteMany();
  await prisma.mistakeRecord.deleteMany();
  await prisma.questionMetadata.deleteMany();
  await prisma.question.deleteMany();
  await prisma.knowledgeEdge.deleteMany();
  await prisma.knowledgeState.deleteMany();
  await prisma.knowledgeConcept.deleteMany();
  await prisma.userTarget.deleteMany();
  await prisma.target.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();

  const targets = await Promise.all(
    [
      {
        type: "JOB",
        name: "Software Developer (DSA)",
        slug: "software-developer-dsa",
        description: "Coding interviews: data structures, algorithms, and core CS.",
        domain: "DSA",
      },
      {
        type: "EXAM",
        name: "SSC CGL Quantitative Aptitude (placeholder)",
        slug: "ssc-cgl-quant",
        description: "Reserved target — this prototype seeds DSA, not SSC items.",
        domain: "QUANT",
      },
    ].map((t) => prisma.target.create({ data: t }))
  );

  const conceptRows = [];
  for (const c of CONCEPTS) {
    conceptRows.push(await prisma.knowledgeConcept.create({ data: c }));
  }
  const bySlug = Object.fromEntries(conceptRows.map((c) => [c.slug, c]));

  for (const [from, to] of PREREQS) {
    await prisma.knowledgeEdge.create({
      data: { fromId: bySlug[from].id, toId: bySlug[to].id, relation: "PREREQ", weight: 1 },
    });
  }

  const questions = bank();
  for (const item of questions) {
    const created = await prisma.question.create({
      data: {
        stem: item.stem,
        optionsJson: JSON.stringify(item.options),
        correctIndex: item.correct,
        explanation: item.explanation,
        topic: item.topic,
        subtopic: item.subtopic,
        conceptId: bySlug[item.concept].id,
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        tagsJson: JSON.stringify([item.topic, item.subtopic]),
      },
    });
    await prisma.questionMetadata.create({
      data: {
        questionId: created.id,
        bloomLevel: item.bloom,
        skillType: item.skill,
        prereqJson: JSON.stringify([]),
      },
    });
  }

  for (const b of [
    { slug: "seven-day-streak", name: "7-Day Streak", description: "Practiced seven days in a row." },
    { slug: "concept-master", name: "Concept Master", description: "Reached high mastery on a concept." },
    { slug: "fifty-attempts", name: "Fifty Attempts", description: "Answered 50 questions." },
  ]) {
    await prisma.badge.create({ data: b });
  }

  const demoHash = await bcrypt.hash("password123", 10);
  const demo = await prisma.user.upsert({
    where: { email: "demo@omniassess.dev" },
    update: {},
    create: {
      email: "demo@omniassess.dev",
      passwordHash: demoHash,
      name: "Demo Learner",
      profile: {
        create: {
          experienceLevel: "INTERMEDIATE",
          dailyMinutes: 45,
          onboardedAt: new Date(),
          hasCompletedOnboarding: true,
          category: "COLLEGE",
          degree: "B.Tech",
          semester: "5",
          domain: "Computer Science",
          subjectsJson: JSON.stringify(["DSA", "DBMS"]),
          customFocus: "DSA Trees",
          candidateContextJson: JSON.stringify({
            summary: "Category: COLLEGE | B.Tech sem 5 domain Computer Science subjects: DSA, DBMS | Focus: DSA Trees",
            category: "COLLEGE",
            focus: "DSA Trees",
            generatedAt: new Date().toISOString(),
            source: "demo-seed",
          }),
        },
      },
      streaks: { create: {} },
    },
  });
  await prisma.userTarget.upsert({
    where: { userId_targetId: { userId: demo.id, targetId: targets[0].id } },
    update: {},
    create: { userId: demo.id, targetId: targets[0].id, isPrimary: true },
  });
  for (const c of conceptRows) {
    await prisma.knowledgeState.upsert({
      where: { userId_conceptId: { userId: demo.id, conceptId: c.id } },
      update: {},
      create: { userId: demo.id, conceptId: c.id, mastery: 0.32 },
    });
  }

  console.log(`Seeded ${questions.length} questions, ${conceptRows.length} concepts. Demo: demo@omniassess.dev / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
