/**
 * Curated exam questions for the universal hierarchy.
 * Exam -> Subject -> Topic -> Difficulty. Real MCQs (no placeholders).
 */

export interface ExamSeedQuestion {
  stem: string;
  options: string[];
  correct: number;
  explanation: string;
  examCategory: string;
  examName: string;
  subject: string;
  topic: string;
  difficultyLabel: "EASY" | "MEDIUM" | "HARD";
  difficulty: number; // IRT b-parameter aligned to the label
  bloom: string;
  skill: string;
}

const E = -1.2;
const M = 0;
const H = 1.2;

export const EXAM_QUESTIONS: ExamSeedQuestion[] = [
  // ---------------- SSC CGL · Quantitative Aptitude ----------------
  {
    stem: "SSC CGL · Quant · Percentage: If 20% of a number is 45, what is the number?",
    options: ["225", "200", "250", "180"],
    correct: 0,
    explanation: "0.20 × N = 45, so N = 45 / 0.20 = 225.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "Quantitative Aptitude", topic: "Percentage",
    difficultyLabel: "EASY", difficulty: E, bloom: "apply", skill: "application",
  },
  {
    stem: "SSC CGL · Quant · Profit & Loss: An article bought for ₹400 is sold for ₹460. What is the profit percentage?",
    options: ["12%", "15%", "18%", "20%"],
    correct: 1,
    explanation: "Profit = 60 on cost 400 → (60/400) × 100 = 15%.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "Quantitative Aptitude", topic: "Profit & Loss",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "apply", skill: "application",
  },
  {
    stem: "SSC CGL · Quant · Time & Work: A can finish a job in 12 days and B in 18 days. Working together, how long will they take?",
    options: ["6 days", "7.2 days", "8 days", "9 days"],
    correct: 1,
    explanation: "Combined rate = 1/12 + 1/18 = 5/36, so time = 36/5 = 7.2 days.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "Quantitative Aptitude", topic: "Time & Work",
    difficultyLabel: "HARD", difficulty: H, bloom: "apply", skill: "application",
  },
  // ---------------- SSC CGL · Reasoning ----------------
  {
    stem: "SSC CGL · Reasoning · Coding-Decoding: If CAT is coded as DBU, how is DOG coded by the same rule?",
    options: ["EPH", "EPI", "DPH", "FQI"],
    correct: 0,
    explanation: "Each letter shifts forward by one: D→E, O→P, G→H gives EPH.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "Reasoning", topic: "Coding-Decoding",
    difficultyLabel: "EASY", difficulty: E, bloom: "apply", skill: "application",
  },
  {
    stem: "SSC CGL · Reasoning · Series: Find the next term: 2, 6, 12, 20, 30, ?",
    options: ["40", "42", "44", "46"],
    correct: 1,
    explanation: "Differences are 4, 6, 8, 10, 12; 30 + 12 = 42.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "Reasoning", topic: "Series",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "analyze", skill: "analysis",
  },
  // ---------------- SSC CGL · English ----------------
  {
    stem: "SSC CGL · English · Synonyms: Choose the word closest in meaning to 'mitigate'.",
    options: ["Aggravate", "Alleviate", "Postpone", "Multiply"],
    correct: 1,
    explanation: "'Mitigate' means to make less severe — 'alleviate' is the closest synonym.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "English", topic: "Synonyms & Antonyms",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "understand", skill: "recall",
  },
  {
    stem: "SSC CGL · English · Error Spotting: Identify the grammatically correct sentence.",
    options: [
      "Neither of the boys were present.",
      "Neither of the boys was present.",
      "Neither of the boys are present.",
      "Neither of the boys have present.",
    ],
    correct: 1,
    explanation: "'Neither of' takes a singular verb, so 'was' is correct.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "English", topic: "Error Spotting",
    difficultyLabel: "HARD", difficulty: H, bloom: "analyze", skill: "analysis",
  },
  // ---------------- SSC CGL · General Awareness ----------------
  {
    stem: "SSC CGL · General Awareness · Polity: Which article of the Indian Constitution guarantees equality before the law?",
    options: ["Article 12", "Article 14", "Article 19", "Article 21"],
    correct: 1,
    explanation: "Article 14 guarantees equality before the law and equal protection of the laws.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "General Awareness", topic: "Polity",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "remember", skill: "recall",
  },
  // ---------------- Class 10 · Mathematics ----------------
  {
    stem: "Class 10 · Maths · Real Numbers: The HCF of 96 and 404 is:",
    options: ["2", "4", "8", "12"],
    correct: 1,
    explanation: "Euclid's algorithm gives HCF(96, 404) = 4.",
    examCategory: "SCHOOL", examName: "CLASS_10", subject: "Mathematics", topic: "Real Numbers",
    difficultyLabel: "EASY", difficulty: E, bloom: "apply", skill: "application",
  },
  {
    stem: "Class 10 · Maths · Trigonometry: The value of sin 30° + cos 60° is:",
    options: ["0.5", "1", "1.5", "√3/2"],
    correct: 1,
    explanation: "sin 30° = 0.5 and cos 60° = 0.5, so the sum is 1.",
    examCategory: "SCHOOL", examName: "CLASS_10", subject: "Mathematics", topic: "Trigonometry",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "apply", skill: "application",
  },
  {
    stem: "Class 10 · Maths · Probability: A fair die is rolled once. What is the probability of getting a prime number?",
    options: ["1/3", "1/2", "2/3", "1/6"],
    correct: 1,
    explanation: "Primes on a die are 2, 3, 5 → 3 favourable out of 6 = 1/2.",
    examCategory: "SCHOOL", examName: "CLASS_10", subject: "Mathematics", topic: "Probability",
    difficultyLabel: "HARD", difficulty: H, bloom: "apply", skill: "application",
  },
  // ---------------- Class 10 · Science ----------------
  {
    stem: "Class 10 · Science · Light: The focal length of a plane mirror is:",
    options: ["Zero", "Infinite", "Equal to object distance", "Negative"],
    correct: 1,
    explanation: "A plane mirror has an infinite radius of curvature, hence infinite focal length.",
    examCategory: "SCHOOL", examName: "CLASS_10", subject: "Science", topic: "Light",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "understand", skill: "recall",
  },
  {
    stem: "Class 10 · Science · Electricity: According to Ohm's law, V equals:",
    options: ["I / R", "I × R", "R / I", "I²R"],
    correct: 1,
    explanation: "Ohm's law states V = I × R for a conductor at constant temperature.",
    examCategory: "SCHOOL", examName: "CLASS_10", subject: "Science", topic: "Electricity",
    difficultyLabel: "EASY", difficulty: E, bloom: "remember", skill: "recall",
  },

  // ---------------- Class 12 · Physics ----------------
  {
    stem: "Class 12 · Physics · Electrostatics: The electric field inside a charged conductor in equilibrium is:",
    options: ["Maximum at the centre", "Uniform and non-zero", "Zero", "Inversely proportional to radius"],
    correct: 2,
    explanation: "Free charges redistribute until the internal field is zero in electrostatic equilibrium.",
    examCategory: "SCHOOL", examName: "CLASS_12", subject: "Physics", topic: "Electrostatics",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "understand", skill: "analysis",
  },
  {
    stem: "Class 12 · Physics · Optics: In Young's double-slit experiment, fringe width is directly proportional to:",
    options: ["Slit separation", "Wavelength", "1 / screen distance", "Slit width"],
    correct: 1,
    explanation: "Fringe width β = λD/d, so it is directly proportional to wavelength λ.",
    examCategory: "SCHOOL", examName: "CLASS_12", subject: "Physics", topic: "Optics",
    difficultyLabel: "HARD", difficulty: H, bloom: "analyze", skill: "analysis",
  },
  // ---------------- Class 12 · Computer Science ----------------
  {
    stem: "Class 12 · Computer Science · SQL: Which SQL clause filters rows before grouping?",
    options: ["HAVING", "WHERE", "ORDER BY", "GROUP BY"],
    correct: 1,
    explanation: "WHERE filters individual rows; HAVING filters groups after aggregation.",
    examCategory: "SCHOOL", examName: "CLASS_12", subject: "Computer Science", topic: "SQL",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "understand", skill: "recall",
  },
  {
    stem: "Class 12 · Computer Science · Data Structures: A stack follows which order?",
    options: ["FIFO", "LIFO", "Random access", "Priority order"],
    correct: 1,
    explanation: "A stack is Last-In-First-Out.",
    examCategory: "SCHOOL", examName: "CLASS_12", subject: "Computer Science", topic: "Data Structures",
    difficultyLabel: "EASY", difficulty: E, bloom: "remember", skill: "recall",
  },

  // ---------------- BTech · DBMS ----------------
  {
    stem: "BTech · DBMS · Normalization: A relation in 2NF must have no:",
    options: ["Transitive dependency", "Partial dependency on a composite key", "Multivalued dependency", "Join dependency"],
    correct: 1,
    explanation: "2NF removes partial dependencies of non-key attributes on part of a composite key.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "DBMS", topic: "Normalization",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "understand", skill: "recall",
  },
  {
    stem: "BTech · DBMS · Indexing: A B+ tree index is preferred over a hash index mainly because it:",
    options: ["Uses less memory always", "Supports range queries efficiently", "Never needs reorganization", "Avoids disk I/O completely"],
    correct: 1,
    explanation: "B+ trees keep keys ordered, enabling efficient range and ordered scans.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "DBMS", topic: "Indexing",
    difficultyLabel: "HARD", difficulty: H, bloom: "analyze", skill: "analysis",
  },
  // ---------------- BTech · OS ----------------
  {
    stem: "BTech · OS · Scheduling: Which CPU scheduling algorithm can cause starvation?",
    options: ["Round Robin", "FCFS", "Priority scheduling", "FIFO"],
    correct: 2,
    explanation: "Low-priority processes may never run under strict priority scheduling.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "OS", topic: "Scheduling",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "understand", skill: "analysis",
  },
  {
    stem: "BTech · OS · Memory Management: Thrashing occurs primarily when:",
    options: ["The page size is too large", "There are too few frames for the working set", "The CPU is idle", "Cache is disabled"],
    correct: 1,
    explanation: "Insufficient frames for the active working set causes constant paging.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "OS", topic: "Memory Management",
    difficultyLabel: "HARD", difficulty: H, bloom: "analyze", skill: "analysis",
  },
  // ---------------- BTech · DSA ----------------
  {
    stem: "BTech · DSA · Graphs: Dijkstra's algorithm fails when the graph has:",
    options: ["Cycles", "Negative edge weights", "More than 1000 nodes", "Disconnected components"],
    correct: 1,
    explanation: "Negative edges break the greedy assumption; use Bellman-Ford instead.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "DSA", topic: "Graphs",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "apply", skill: "analysis",
  },
  {
    stem: "BTech · DSA · Dynamic Programming: Longest Common Subsequence of strings of length m and n runs in:",
    options: ["O(m + n)", "O(m × n)", "O(m log n)", "O(2^m)"],
    correct: 1,
    explanation: "The DP table has m×n cells, each filled in constant time.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "DSA", topic: "Dynamic Programming",
    difficultyLabel: "HARD", difficulty: H, bloom: "analyze", skill: "analysis",
  },
  // ---------------- BTech · CN ----------------
  {
    stem: "BTech · CN · TCP/IP: Which layer of the OSI model performs logical addressing (IP)?",
    options: ["Data Link", "Network", "Transport", "Session"],
    correct: 1,
    explanation: "The network layer handles logical addressing and routing (IP).",
    examCategory: "COLLEGE", examName: "BTECH", subject: "CN", topic: "TCP/IP",
    difficultyLabel: "EASY", difficulty: E, bloom: "remember", skill: "recall",
  },
  {
    stem: "BTech · CN · Routing: Which protocol is a link-state interior gateway protocol?",
    options: ["RIP", "OSPF", "BGP", "ARP"],
    correct: 1,
    explanation: "OSPF is link-state; RIP is distance-vector and BGP is an exterior gateway protocol.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "CN", topic: "Routing",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "understand", skill: "recall",
  },
  // ---------------- BTech · Software Engineering ----------------
  {
    stem: "BTech · Software Engineering · Agile: In Scrum, who owns and orders the Product Backlog?",
    options: ["Scrum Master", "Product Owner", "Development Team", "Stakeholders"],
    correct: 1,
    explanation: "The Product Owner is accountable for ordering and maximizing backlog value.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "Software Engineering", topic: "Agile",
    difficultyLabel: "EASY", difficulty: E, bloom: "remember", skill: "recall",
  },
  {
    stem: "BTech · Software Engineering · Testing: Which test validates the fully integrated system against requirements?",
    options: ["Unit testing", "System testing", "Integration testing", "Smoke testing"],
    correct: 1,
    explanation: "System testing validates the complete integrated system against requirements.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "Software Engineering", topic: "Testing",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "understand", skill: "recall",
  },

  // ---------------- Extra depth for thin subjects ----------------
  {
    stem: "SSC CGL · General Awareness · History: Who founded the Indian National Congress?",
    options: ["Bal Gangadhar Tilak", "A. O. Hume", "Gopal Krishna Gokhale", "Surendranath Banerjee"],
    correct: 1,
    explanation: "The Indian National Congress was founded in 1885 by A. O. Hume.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "General Awareness", topic: "History",
    difficultyLabel: "EASY", difficulty: E, bloom: "remember", skill: "recall",
  },
  {
    stem: "SSC CGL · General Awareness · Geography: The Tropic of Cancer passes through how many Indian states?",
    options: ["Six", "Seven", "Eight", "Nine"],
    correct: 2,
    explanation: "It passes through Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, West Bengal, Tripura and Mizoram — eight states.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "General Awareness", topic: "Geography",
    difficultyLabel: "HARD", difficulty: H, bloom: "remember", skill: "recall",
  },
  {
    stem: "SSC CGL · Reasoning · Blood Relations: A is the brother of B. B is the daughter of C. How is A related to C?",
    options: ["Son", "Daughter", "Brother", "Cannot be determined"],
    correct: 0,
    explanation: "C is B's parent, so A, who is B's brother, is C's son.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "Reasoning", topic: "Blood Relations",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "analyze", skill: "analysis",
  },
  {
    stem: "SSC CGL · English · Idioms: 'To let the cat out of the bag' means:",
    options: ["To release an animal", "To reveal a secret", "To start a fight", "To escape"],
    correct: 1,
    explanation: "The idiom means to disclose information that was meant to be kept secret.",
    examCategory: "GOVT", examName: "SSC_CGL", subject: "English", topic: "Idioms",
    difficultyLabel: "EASY", difficulty: E, bloom: "understand", skill: "recall",
  },
  {
    stem: "Class 10 · Science · Chemical Reactions: Which gas is evolved when zinc reacts with dilute sulphuric acid?",
    options: ["Oxygen", "Carbon dioxide", "Hydrogen", "Nitrogen"],
    correct: 2,
    explanation: "Zn + H₂SO₄ → ZnSO₄ + H₂, so hydrogen gas is evolved.",
    examCategory: "SCHOOL", examName: "CLASS_10", subject: "Science", topic: "Chemical Reactions",
    difficultyLabel: "EASY", difficulty: E, bloom: "apply", skill: "application",
  },
  {
    stem: "Class 12 · Physics · Current Electricity: Two resistors of 6 Ω and 3 Ω are connected in parallel. Equivalent resistance is:",
    options: ["9 Ω", "2 Ω", "1.8 Ω", "4.5 Ω"],
    correct: 1,
    explanation: "For parallel resistors, R = (6 × 3)/(6 + 3) = 18/9 = 2 Ω.",
    examCategory: "SCHOOL", examName: "CLASS_12", subject: "Physics", topic: "Current Electricity",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "apply", skill: "application",
  },
  {
    stem: "Class 12 · Computer Science · Networking: Which device forwards packets between different networks?",
    options: ["Switch", "Router", "Repeater", "Hub"],
    correct: 1,
    explanation: "A router operates at layer 3 and forwards packets between networks.",
    examCategory: "SCHOOL", examName: "CLASS_12", subject: "Computer Science", topic: "Networking",
    difficultyLabel: "EASY", difficulty: E, bloom: "remember", skill: "recall",
  },
  {
    stem: "BTech · DBMS · SQL: The result of a SELECT without an aggregate and without GROUP BY returns:",
    options: ["One arbitrary row", "One row with aggregate values", "One row per table", "No rows"],
    correct: 0,
    explanation: "Without GROUP BY, an aggregate produces a single arbitrary row from the table.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "DBMS", topic: "SQL",
    difficultyLabel: "HARD", difficulty: H, bloom: "analyze", skill: "analysis",
  },
  {
    stem: "BTech · CN · TCP/IP: Which protocol resolves domain names to IP addresses?",
    options: ["DHCP", "DNS", "ARP", "ICMP"],
    correct: 1,
    explanation: "DNS translates human-readable domain names into IP addresses.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "CN", topic: "Security Basics",
    difficultyLabel: "EASY", difficulty: E, bloom: "remember", skill: "recall",
  },
  {
    stem: "BTech · Software Engineering · OOP Design: Which SOLID principle states that a class should have only one reason to change?",
    options: ["Open/Closed", "Liskov Substitution", "Single Responsibility", "Interface Segregation"],
    correct: 2,
    explanation: "Single Responsibility Principle: one class, one reason to change.",
    examCategory: "COLLEGE", examName: "BTECH", subject: "Software Engineering", topic: "OOP Design",
    difficultyLabel: "MEDIUM", difficulty: M, bloom: "understand", skill: "recall",
  },
];
