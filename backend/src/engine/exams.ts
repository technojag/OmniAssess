/**
 * Universal exam catalog: Exam -> Subject -> Topic -> Difficulty
 * Single source of truth for assessment creation, question filtering,
 * AI generation prompts, seeds and the frontend exam picker.
 */

export type DifficultyLabel = "EASY" | "MEDIUM" | "HARD" | "MIXED";

export interface ExamSubject {
  name: string;
  topics: string[];
}

export interface ExamDef {
  examName: string; // stable key, e.g. SSC_CGL
  label: string; // display label, e.g. SSC CGL
  examCategory: string; // GOVT | SCHOOL | COLLEGE | UNIVERSITY | SKILL
  description: string;
  subjects: ExamSubject[];
}

export const DIFFICULTY_TO_IRT: Record<Exclude<DifficultyLabel, "MIXED">, { min: number; max: number; target: number }> = {
  EASY: { min: -3, max: -0.5, target: -1.2 },
  MEDIUM: { min: -0.5, max: 0.5, target: 0 },
  HARD: { min: 0.5, max: 3, target: 1.2 },
};

export function difficultyLabelToRange(label: string): { min: number; max: number } | null {
  const up = (label || "").toUpperCase();
  if (up === "EASY") return { min: -3, max: -0.5 };
  if (up === "MEDIUM") return { min: -0.5, max: 0.5 };
  if (up === "HARD") return { min: 0.5, max: 3 };
  return null; // MIXED or unknown -> no filter
}

export const EXAMS: ExamDef[] = [
  {
    examName: "SSC_CGL",
    label: "SSC CGL",
    examCategory: "GOVT",
    description: "Staff Selection Commission — Combined Graduate Level",
    subjects: [
      { name: "Quantitative Aptitude", topics: ["Percentage", "Profit & Loss", "Ratio & Proportion", "Time & Work", "Algebra", "Geometry"] },
      { name: "Reasoning", topics: ["Analogies", "Coding-Decoding", "Blood Relations", "Series", "Syllogisms"] },
      { name: "English", topics: ["Comprehension", "Error Spotting", "Synonyms & Antonyms", "Idioms", "One-word Substitution"] },
      { name: "General Awareness", topics: ["History", "Polity", "Geography", "Science", "Current Affairs"] },
    ],
  },
  {
    examName: "CLASS_10",
    label: "Class 10 (CBSE)",
    examCategory: "SCHOOL",
    description: "Class 10 board preparation",
    subjects: [
      { name: "Mathematics", topics: ["Real Numbers", "Polynomials", "Triangles", "Trigonometry", "Probability"] },
      { name: "Science", topics: ["Chemical Reactions", "Light", "Electricity", "Life Processes", "Metals & Non-metals"] },
      { name: "English", topics: ["Comprehension", "Grammar", "Writing Skills", "Literature"] },
      { name: "Social Science", topics: ["Nationalism", "Democracy", "Economics", "Geography"] },
    ],
  },
  {
    examName: "CLASS_12",
    label: "Class 12 (CBSE)",
    examCategory: "SCHOOL",
    description: "Class 12 board + CUET/competitive base",
    subjects: [
      { name: "Physics", topics: ["Electrostatics", "Current Electricity", "Optics", "Modern Physics"] },
      { name: "Chemistry", topics: ["Solutions", "Electrochemistry", "Organic Basics", "Coordination Compounds"] },
      { name: "Mathematics", topics: ["Matrices", "Calculus", "Probability", "Vectors"] },
      { name: "Computer Science", topics: ["Python", "Data Structures", "SQL", "Networking"] },
    ],
  },
  {
    examName: "BTECH",
    label: "BTech IT / CSE",
    examCategory: "COLLEGE",
    description: "Engineering core + placements",
    subjects: [
      { name: "DBMS", topics: ["SQL", "Normalization", "Indexing", "Transactions"] },
      { name: "OS", topics: ["Processes", "Scheduling", "Memory Management", "Concurrency"] },
      { name: "DSA", topics: ["Arrays", "Linked Lists", "Trees", "Graphs", "Dynamic Programming"] },
      { name: "CN", topics: ["OSI Model", "TCP/IP", "Routing", "Security Basics"] },
      { name: "Software Engineering", topics: ["SDLC", "Agile", "Testing", "OOP Design"] },
    ],
  },
  {
    examName: "DSA",
    label: "DSA / Interviews",
    examCategory: "SKILL",
    description: "Coding-interview DSA track (legacy default)",
    subjects: [{ name: "DSA", topics: ["Arrays", "Hashing", "Two Pointers", "Trees", "Graphs", "Dynamic Programming"] }],
  },
];

export function getExam(examName: string): ExamDef | undefined {
  const up = (examName || "").toUpperCase();
  return EXAMS.find((e) => e.examName === up);
}

/**
 * User-facing categories group the exam catalog. The active category is the
 * single switch that drives Skill Gap, AI Interview, Practice Arena,
 * assessment defaults and performance analysis.
 */
export interface CategoryDef {
  categoryId: string;
  label: string;
  description: string;
  exams: string[]; // examName options inside this category
  defaultExam: string;
  interviewerRole: string;
  interviewFocus: string[];
  interviewRubric: { key: string; label: string; hint: string }[];
  openingQuestions: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    categoryId: "TECHNICAL",
    label: "Technical",
    description: "Engineering and coding interviews — DSA, DBMS, OS, CN, projects.",
    exams: ["BTECH", "DSA"],
    defaultExam: "BTECH",
    interviewerRole: "a technical interviewer for a software engineering role",
    interviewFocus: [
      "Data structures and algorithms (arrays, trees, graphs, DP)",
      "DBMS (SQL, normalization, indexing, transactions)",
      "Operating systems (processes, scheduling, memory, concurrency)",
      "Computer networks (OSI/TCP-IP, routing, security)",
      "Programming fundamentals, OOP design and system design",
      "Projects, tradeoffs and real engineering judgement",
    ],
    interviewRubric: [
      { key: "relevance", label: "Relevance", hint: "Does the answer address the question asked?" },
      { key: "structure", label: "Structure", hint: "Is the reasoning organised and complete?" },
      { key: "depth", label: "Technical depth", hint: "Is the underlying concept actually understood?" },
    ],
    openingQuestions: [
      "Walk me through a data structure you used recently and why you chose it over the alternatives.",
      "Explain a database index and describe a situation where it stops being useful.",
      "How would you detect and fix memory pressure in a running service?",
    ],
  },
  {
    categoryId: "SSC_CGL",
    label: "SSC CGL",
    description: "SSC CGL personality, situational and general awareness assessment.",
    exams: ["SSC_CGL"],
    defaultExam: "SSC_CGL",
    interviewerRole: "an SSC CGL panel interviewer assessing awareness, communication and personality",
    interviewFocus: [
      "General awareness: history, polity, geography and science",
      "Current affairs and general knowledge relevant to a government role",
      "Communication clarity and structured response",
      "Situational and situational-judgement questions",
      "Confidence, composure and civic temperament",
    ],
    interviewRubric: [
      { key: "awareness", label: "General awareness", hint: "Is the factual content correct and current?" },
      { key: "communication", label: "Communication", hint: "Is the answer clear, concise and well-organised?" },
      { key: "confidence", label: "Confidence", hint: "Is the candidate composed and assertive?" },
    ],
    openingQuestions: [
      "Introduce yourself and explain why you chose the SSC CGL exam.",
      "Discuss a recent national or state-level current affair you followed and why it matters.",
      "Tell us about a situation where you had to follow a rule you did not personally agree with.",
    ],
  },
  {
    categoryId: "CLASS_10",
    label: "Class 10",
    description: "Subject-based viva across Mathematics, Science, Social Science and English.",
    exams: ["CLASS_10"],
    defaultExam: "CLASS_10",
    interviewerRole: "a Class 10 subject teacher conducting a viva",
    interviewFocus: [
      "Mathematics: real numbers, polynomials, triangles, trigonometry, probability",
      "Science: chemical reactions, light, electricity, life processes",
      "Social Science: nationalism, democracy, economics, geography",
      "English: grammar, vocabulary, comprehension and expression",
    ],
    interviewRubric: [
      { key: "subjectKnowledge", label: "Subject knowledge", hint: "Is the syllabus concept correct?" },
      { key: "clarity", label: "Clarity", hint: "Is the explanation easy to follow?" },
      { key: "confidence", label: "Confidence", hint: "Does the student answer without hesitation?" },
    ],
    openingQuestions: [
      "Explain a concept you studied this year that you found genuinely interesting.",
      "Describe how you would teach a difficult chapter to a classmate.",
      "Tell us about a project or experiment you did in school and what you learned.",
    ],
  },
  {
    categoryId: "CLASS_12",
    label: "Class 12",
    description: "Class 12 board and competitive viva across Physics, Chemistry, Mathematics and CS.",
    exams: ["CLASS_12"],
    defaultExam: "CLASS_12",
    interviewerRole: "a Class 12 subject examiner conducting a board-level viva",
    interviewFocus: [
      "Physics: electrostatics, current electricity, optics, modern physics",
      "Chemistry: solutions, electrochemistry, organic basics",
      "Mathematics: calculus, matrices, probability, vectors",
      "Computer science: Python, data structures, SQL, networking",
    ],
    interviewRubric: [
      { key: "subjectKnowledge", label: "Subject knowledge", hint: "Is the board-level concept correct?" },
      { key: "clarity", label: "Clarity", hint: "Is the derivation or explanation coherent?" },
      { key: "application", label: "Application", hint: "Can the student apply the idea, not just recall it?" },
    ],
    openingQuestions: [
      "Explain one concept from your syllabus that you can teach in two minutes.",
      "How would you approach a problem where the textbook method does not apply?",
      "Describe something you studied in class 12 that connects to real life.",
    ],
  },
];

export function getCategory(categoryId: string): CategoryDef {
  const up = (categoryId || "").toUpperCase();
  return CATEGORIES.find((c) => c.categoryId === up) || CATEGORIES[0];
}

/**
 * Resolve the active selection from the stored profile plus the caller's
 * explicit choice.
 *
 * If the caller names a category or exam, that choice is authoritative and the
 * profile is NOT merged in (otherwise a stale profile exam would win over the
 * category the user just picked). If the caller names nothing, the profile is
 * used so every module stays in sync with the saved preference.
 */
export function resolveActiveSelection(
  profile: { examCategory?: string | null; examName?: string | null; subject?: string | null } | null,
  explicit: { category?: string; examName?: string; subject?: string }
) {
  const cat = explicit.category?.trim() || undefined;
  const exam = explicit.examName?.trim() || undefined;
  const sub = explicit.subject?.trim() || undefined;
  if (!cat && !exam) {
    return resolveSelection({
      category: profile?.examCategory || undefined,
      examName: profile?.examName || undefined,
      subject: profile?.subject || undefined,
    });
  }
  return resolveSelection({ category: cat, examName: exam, subject: sub });
}
export function categoryForExam(examName: string): CategoryDef {
  const exam = getExam(examName);
  if (!exam) return CATEGORIES[0];
  return CATEGORIES.find((c) => c.exams.includes(exam.examName)) || CATEGORIES[0];
}

/**
 * Resolve a category + exam + subject triple, always internally consistent.
 * Precedence: an explicit, known examName wins (it implies its own category),
 * otherwise the category decides and its default exam is used.
 */
export function resolveSelection(input: { category?: string; examName?: string; subject?: string }) {
  const requestedExam = input.examName ? input.examName.toUpperCase() : "";
  const category = requestedExam && getExam(requestedExam)
    ? categoryForExam(requestedExam)
    : getCategory(input.category || "");
  const examName = requestedExam && category.exams.includes(requestedExam)
    ? requestedExam
    : category.defaultExam;
  const exam = getExam(examName) || getExam(category.defaultExam)!;
  const subject =
    input.subject && isValidSubject(exam.examName, input.subject)
      ? input.subject
      : exam.subjects[0]?.name || "";
  return { category, exam, subject };
}

export function isValidSubject(examName: string, subject: string): boolean {
  const exam = getExam(examName);
  if (!exam) return false;
  return exam.subjects.some((s) => s.name.toLowerCase() === (subject || "").toLowerCase());
}

export function normalizeExamSelection(input: { examName?: string; subject?: string; topic?: string; difficulty?: string }) {
  const examName = (input.examName || "DSA").toUpperCase();
  const exam = getExam(examName);
  const subject = input.subject || exam?.subjects[0]?.name || "DSA";
  const topic = input.topic || "Mixed";
  const rawDiff = (input.difficulty || "MIXED").toUpperCase();
  const difficulty: DifficultyLabel =
    rawDiff === "EASY" || rawDiff === "MEDIUM" || rawDiff === "HARD" ? (rawDiff as DifficultyLabel) : "MIXED";
  return {
    examCategory: exam?.examCategory || "SKILL",
    examName,
    subject,
    topic,
    difficulty,
  };
}
