import { AptitudeQuestion, TechnicalInterviewQuestion, HRInterviewQuestion } from '@/types/interview';

export const APTITUDE_QUESTION_BANK: AptitudeQuestion[] = [
  // Quantitative
  {
    id: 'apt-quant-1',
    phase: 'phase1_aptitude',
    category: 'quantitative',
    topic: 'Time and Work',
    difficulty: 'medium',
    prompt: 'A can complete a piece of work in 12 days, and B can complete the same work in 18 days. If they work together for 4 days, what fraction of the work remains unfinished?',
    type: 'mcq',
    options: ['5/9', '4/9', '7/18', '1/3'],
    correctIndex: 1, // 4 * (1/12 + 1/18) = 4 * (5/36) = 20/36 = 5/9 done => 4/9 remains
    explanation: 'A\'s 1 day work = 1/12, B\'s 1 day work = 1/18. Combined 1 day work = (3 + 2)/36 = 5/36. In 4 days, work completed = 4 × (5/36) = 20/36 = 5/9. Remaining work = 1 - 5/9 = 4/9.',
    shortcutTip: 'Efficiency method: LCM of 12 and 18 is 36 units. A does 3 units/day, B does 2 units/day. Total = 5 units/day. In 4 days, 20 units done. Remaining = 16 units out of 36 = 4/9.'
  },
  {
    id: 'apt-quant-2',
    phase: 'phase1_aptitude',
    category: 'quantitative',
    topic: 'Speed, Distance & Time',
    difficulty: 'medium',
    prompt: 'A train 150 meters long passes a telegraph pole in 10 seconds and takes 25 seconds to cross a railway platform. What is the length of the platform?',
    type: 'mcq',
    options: ['200 meters', '225 meters', '250 meters', '300 meters'],
    correctIndex: 1, // Speed = 150m / 10s = 15 m/s. Platform cross: (150 + L) / 15 = 25 => 150 + L = 375 => L = 225m
    explanation: 'Train speed = Length / Time to pass pole = 150 / 10 = 15 m/s. Time to cross platform = (Train Length + Platform Length) / Speed => 25 = (150 + L) / 15 => 375 = 150 + L => L = 225 meters.',
    shortcutTip: 'Speed is constant: (150)/10 = (150 + L)/25. Multiply both sides by 50: 750 = 300 + 2L => L = 225m.'
  },
  {
    id: 'apt-quant-3',
    phase: 'phase1_aptitude',
    category: 'quantitative',
    topic: 'Permutations & Probability',
    difficulty: 'easy',
    prompt: 'Two fair 6-sided dice are rolled simultaneously. What is the probability that the sum of the numbers appearing on the dice is prime?',
    type: 'mcq',
    options: ['5/12', '7/18', '15/36', '1/2'],
    correctIndex: 0, // Sums: 2 (1), 3 (2), 5 (4), 7 (6), 11 (2) => Total = 1+2+4+6+2 = 15. 15/36 = 5/12
    explanation: 'Possible prime sums are {2, 3, 5, 7, 11}. Frequency: Sum 2: (1,1)=1; Sum 3: (1,2),(2,1)=2; Sum 5: (1,4),(2,3),(3,2),(4,1)=4; Sum 7: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1)=6; Sum 11: (5,6),(6,5)=2. Total favorable outcomes = 1 + 2 + 4 + 6 + 2 = 15 out of 36. 15/36 = 5/12.',
    shortcutTip: 'Remember the standard triangular sum frequencies: 2->1, 3->2, 4->3, 5->4, 6->5, 7->6. Primes up to 12 are 2, 3, 5, 7, 11.'
  },
  {
    id: 'apt-quant-4',
    phase: 'phase1_aptitude',
    category: 'quantitative',
    topic: 'Percentages & Profit/Loss',
    difficulty: 'easy',
    prompt: 'A software license is marked up by 25% above cost price and then sold with a 10% promotional discount. What is the overall percentage profit earned?',
    type: 'mcq',
    options: ['12.5%', '15%', '14.2%', '10%'],
    correctIndex: 0, // CP=100 -> MP=125 -> SP=125 * 0.9 = 112.5 -> Profit = 12.5%
    explanation: 'Let Cost Price = $100. Marked Price = $125. Selling Price = 125 - 10% of 125 = 125 - 12.5 = $112.50. Profit = 112.50 - 100 = 12.5%.',
    shortcutTip: 'Successive percentage formula: a + b + (ab/100) = +25 - 10 - (250/100) = 15 - 2.5 = 12.5%.'
  },

  // Logical Reasoning
  {
    id: 'apt-log-1',
    phase: 'phase1_aptitude',
    category: 'logical_reasoning',
    topic: 'Syllogism',
    difficulty: 'medium',
    prompt: 'Statements:\n1. All algorithms are programs.\n2. Some programs are scalable.\nConclusions:\nI. Some algorithms are scalable.\nII. Some programs are algorithms.',
    type: 'mcq',
    options: [
      'Only conclusion I follows',
      'Only conclusion II follows',
      'Both conclusion I and II follow',
      'Neither conclusion follows'
    ],
    correctIndex: 1, // Only II follows
    explanation: 'From "All algorithms are programs", the immediate conversion is "Some programs are algorithms" (Conclusion II is valid). The "scalable" subset of programs may not overlap with the "algorithms" subset, so Conclusion I does not necessarily follow.',
    shortcutTip: 'A universal affirmative "All A are B" guarantees "Some B are A". It does not chain with a particular affirmative "Some B are C" unless the middle term is distributed.'
  },
  {
    id: 'apt-log-2',
    phase: 'phase1_aptitude',
    category: 'logical_reasoning',
    topic: 'Blood Relations',
    difficulty: 'medium',
    prompt: 'Pointing to a photograph, Rahul said, "She is the daughter of the only son of my grandfather." How is the woman in the photograph related to Rahul?',
    type: 'mcq',
    options: ['Daughter', 'Sister', 'Mother', 'Aunt'],
    correctIndex: 1,
    explanation: '"Only son of Rahul\'s grandfather" is Rahul\'s father. Daughter of Rahul\'s father is Rahul\'s sister.',
    shortcutTip: 'Decode backward: Grandfather -> Only son (= Father) -> Daughter (= Sister).'
  },
  {
    id: 'apt-log-3',
    phase: 'phase1_aptitude',
    category: 'logical_reasoning',
    topic: 'Number & Pattern Series',
    difficulty: 'easy',
    prompt: 'Find the next number in the sequence: 4, 9, 25, 49, 121, 169, ?',
    type: 'mcq',
    options: ['225', '256', '289', '361'],
    correctIndex: 2, // 2^2, 3^2, 5^2, 7^2, 11^2, 13^2, 17^2 = 289
    explanation: 'The sequence consists of squares of consecutive prime numbers: 2²=4, 3²=9, 5²=25, 7²=49, 11²=121, 13²=169. The next prime number is 17, and 17² = 289.',
    shortcutTip: 'Notice these are squares of primes, not odd numbers (note absence of 9²=81).'
  },

  // Verbal Ability
  {
    id: 'apt-verb-1',
    phase: 'phase1_aptitude',
    category: 'verbal_ability',
    topic: 'Sentence Correction & Grammar',
    difficulty: 'medium',
    prompt: 'Identify the sentence with correct grammatical structure and subject-verb agreement:\n(A) Neither the database administrator nor the backend engineers was able to resolve the deadlock.\n(B) Neither the database administrator nor the backend engineers were able to resolve the deadlock.\n(C) Neither the database administrator or the backend engineers were able to resolve the deadlock.\n(D) Neither the database administrator nor the backend engineers has been able to resolve the deadlock.',
    type: 'mcq',
    options: ['Sentence (A)', 'Sentence (B)', 'Sentence (C)', 'Sentence (D)'],
    correctIndex: 1,
    explanation: 'When using "Neither... nor", the verb agrees with the closer subject. Here, "the backend engineers" is plural and closer to the verb, requiring the plural auxiliary "were able".',
    shortcutTip: 'Rule of proximity: In "Neither A nor B", look at B. Plural B -> plural verb.'
  },
  {
    id: 'apt-verb-2',
    phase: 'phase1_aptitude',
    category: 'verbal_ability',
    topic: 'Vocabulary & Contextual Meaning',
    difficulty: 'easy',
    prompt: 'In software architecture, an operation is described as "IDEMPOTENT". What is the most accurate synonym or meaning of this term?',
    type: 'mcq',
    options: [
      'Executes asynchronously in a non-blocking thread',
      'Produces the exact same state outcome regardless of how many times it is repeated',
      'Guarantees constant-time O(1) worst-case performance',
      'Encrypts sensitive payload data in transit and at rest'
    ],
    correctIndex: 1,
    explanation: 'An idempotent operation can be applied multiple times without altering the result beyond the initial application (e.g., HTTP PUT/DELETE or f(f(x)) = f(x)).'
  }
];

export const TECHNICAL_QUESTION_BANK: TechnicalInterviewQuestion[] = [
  // Operating Systems
  {
    id: 'tech-os-1',
    phase: 'phase2_technical',
    category: 'os',
    topic: 'Process Synchronization',
    difficulty: 'medium',
    prompt: 'What are the four necessary Coffman conditions for a deadlock to occur in an operating system?',
    type: 'explain',
    rubric: [
      'Mutual Exclusion (resources cannot be shared concurrently)',
      'Hold and Wait (processes holding allocated resources while waiting for others)',
      'No Preemption (resources cannot be forcibly confiscated)',
      'Circular Wait (a closed chain of processes waiting on each other)'
    ],
    sampleModelAnswer: 'The four Coffman conditions are: 1) Mutual Exclusion: at least one resource must be non-shareable. 2) Hold and Wait: a process currently holding at least one resource is requesting additional resources. 3) No Preemption: resources cannot be preempted; they can only be released voluntarily. 4) Circular Wait: a closed cycle of processes exists where P0 waits for P1, P1 for P2, and Pn for P0.'
  },
  {
    id: 'tech-os-2',
    phase: 'phase2_technical',
    category: 'os',
    topic: 'Virtual Memory & Paging',
    difficulty: 'medium',
    prompt: 'When a page fault occurs, what exact sequence of operations does the OS perform?',
    type: 'mcq',
    options: [
      'Terminates the offending process immediately with a segmentation fault',
      'Traps to OS kernel, locates the missing page in swap space, loads it into a free RAM frame, updates the page table, and restarts the faulting instruction',
      'Allocates virtual memory directly from the L1 CPU cache without disk I/O',
      'Flushes the TLB cache and halts all threads until system reboot'
    ],
    correctIndex: 1,
    explanation: 'A page fault triggers an interrupt/trap. The OS traps into kernel mode, saves process context, fetches the page from swap/backing storage into an available physical frame, marks the valid bit in the page table, updates TLB, and resumes the instruction that triggered the fault.'
  },

  // DBMS
  {
    id: 'tech-db-1',
    phase: 'phase2_technical',
    category: 'dbms',
    topic: 'Database Normalization',
    difficulty: 'medium',
    prompt: 'Explain the difference between 3NF (Third Normal Form) and BCNF (Boyce-Codd Normal Form) with respect to functional dependencies.',
    type: 'explain',
    rubric: [
      'Defines 3NF: For every functional dependency X -> Y, either X is a superkey OR Y is a prime attribute (part of candidate key)',
      'Defines BCNF: Stricter than 3NF; for every X -> Y, X MUST be a superkey',
      'Mentions that BCNF eliminates all anomalies due to functional dependencies but may not always preserve functional dependencies'
    ],
    sampleModelAnswer: 'In 3NF, for any non-trivial functional dependency X -> Y, X must either be a superkey OR Y must be a prime attribute (a member of some candidate key). BCNF removes the second lenient condition: in BCNF, for every functional dependency X -> Y, X MUST be a superkey. Therefore, every BCNF relation is in 3NF, but not every 3NF relation is in BCNF.'
  },
  {
    id: 'tech-db-2',
    phase: 'phase2_technical',
    category: 'dbms',
    topic: 'ACID Properties & Isolation',
    difficulty: 'hard',
    prompt: 'Which transaction isolation level prevents Dirty Reads and Non-Repeatable Reads, but may still allow Phantom Reads in ANSI SQL-92?',
    type: 'mcq',
    options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'],
    correctIndex: 2,
    explanation: 'Repeatable Read prevents Dirty Reads (reading uncommitted changes) and Non-Repeatable Reads (row updates changing during read), but range inserts by other transactions can still produce Phantom Rows. Serializable prevents all anomalies.'
  },

  // Computer Networks
  {
    id: 'tech-cn-1',
    phase: 'phase2_technical',
    category: 'networks',
    topic: 'Transport Layer Protocols',
    difficulty: 'medium',
    prompt: 'What happens during the TCP 3-Way Handshake, and why cannot a 2-way handshake reliably establish a full-duplex connection?',
    type: 'explain',
    rubric: [
      'SYN from client with initial sequence number (ISN_c)',
      'SYN-ACK from server acknowledging ISN_c + 1 and sending its own sequence number (ISN_s)',
      'ACK from client acknowledging ISN_s + 1',
      'Explains why 2-way fails: both sides need confirmation that their respective sequence numbers and send/receive channels are verified'
    ],
    sampleModelAnswer: 'In the 3-Way Handshake: 1) Client sends SYN(seq=x) to Server. 2) Server responds with SYN(seq=y) + ACK(x+1). 3) Client replies with ACK(y+1). A 2-way handshake fails because delayed or duplicate SYN packets could cause the server to open phantom connections without knowing whether the client actually initiated or acknowledged the session.'
  },
  {
    id: 'tech-cn-2',
    phase: 'phase2_technical',
    category: 'networks',
    topic: 'OSI & Network Layer',
    difficulty: 'easy',
    prompt: 'At which OSI layer do Routers operate, and which protocol addresses do they inspect to forward packets?',
    type: 'mcq',
    options: [
      'Data Link Layer (Layer 2) — MAC Addresses',
      'Network Layer (Layer 3) — IP Addresses',
      'Transport Layer (Layer 4) — Port Numbers',
      'Physical Layer (Layer 1) — Bit streams'
    ],
    correctIndex: 1,
    explanation: 'Routers are Layer 3 (Network Layer) devices that inspect IP addresses in packet headers and use routing tables (e.g. OSPF, BGP) to determine the next hop.'
  },

  // OOP & System Design
  {
    id: 'tech-oop-1',
    phase: 'phase2_technical',
    category: 'oops_system_design',
    topic: 'SOLID Principles',
    difficulty: 'medium',
    prompt: 'What is the Liskov Substitution Principle (LSP), and what is a classic violation example?',
    type: 'explain',
    rubric: [
      'States LSP: Subtypes must be substitutable for their base types without altering program correctness',
      'Mentions that preconditions cannot be strengthened and postconditions cannot be weakened in subclasses',
      'Gives classic Square-inheriting-from-Rectangle or Bird-Penguin fly() example'
    ],
    sampleModelAnswer: 'Liskov Substitution Principle (LSP) states that objects of a superclass should be replaceable with objects of a subclass without affecting the correctness of the program. A classic violation is the Square-Rectangle problem: if class Square inherits from Rectangle with setWidth and setHeight, setting width on a Square modifies height too, violating the contract expectations of Rectangle.'
  },

  // DSA Coding Problem
  {
    id: 'tech-dsa-code-1',
    phase: 'phase2_technical',
    category: 'dsa',
    topic: 'Two Pointer / Hash Map',
    difficulty: 'medium',
    prompt: 'Implement a function twoSum(nums, target) that returns the 0-based indices of the two numbers such that they add up to target. Each input has exactly one solution and you may not use the same element twice.',
    type: 'code',
    codeStarter: {
      language: 'javascript',
      functionName: 'twoSum',
      initialCode: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
      testCases: [
        { input: [[2, 7, 11, 15], 9], expected: [0, 1], description: 'nums = [2,7,11,15], target = 9' },
        { input: [[3, 2, 4], 6], expected: [1, 2], description: 'nums = [3,2,4], target = 6' },
        { input: [[3, 3], 6], expected: [0, 1], description: 'nums = [3,3], target = 6' }
      ]
    }
  }
];

export const HR_QUESTION_BANK: HRInterviewQuestion[] = [
  {
    id: 'hr-star-1',
    phase: 'phase3_hr',
    category: 'star_story',
    topic: 'Technical Challenge & Problem Solving',
    competency: 'Problem-solving & Grace Under Pressure',
    difficulty: 'medium',
    prompt: 'Tell me about a time you faced a complex technical bug or tight deadline during a project. Walk me through using the STAR method: Situation, Task, Action, and Result.',
    type: 'behavioral',
    starGuidelines: {
      situation: 'Set the context: what project, what tech stack, and what obstacle arose?',
      task: 'Define your specific responsibility and what needed to be accomplished.',
      action: 'Detail the concrete technical steps, debugging strategies, and tools YOU employed.',
      result: 'Quantify the outcome: performance improvement, deadline met, lessons learned.'
    },
    rubric: [
      'Clear context with defined technical challenge (Situation)',
      'Specific personal role and goal distinguished from team (Task)',
      'Concrete engineering actions: root cause analysis, tools used, collaboration (Action)',
      'Measurable results and key technical insights gained (Result)'
    ],
    sampleStarResponse: 'S: In our 3rd-year DBMS project, our payment service suffered frequent database deadlocks during load testing.\nT: My task was to identify the root cause within 48 hours before our live demo.\nA: I used query profiling and pg_stat_activity to find two concurrent transactions updating account balances in opposite order. I enforced a strict canonical ordering of resource locking and added index scans to reduce transaction hold duration.\nR: Deadlocks dropped to 0%, p99 latency improved by 40%, and we successfully delivered the demo on time with full team accolades.'
  },
  {
    id: 'hr-star-2',
    phase: 'phase3_hr',
    category: 'conflict_resolution',
    topic: 'Team Collaboration & Disagreement',
    competency: 'Empathy & Constructive Conflict Resolution',
    difficulty: 'medium',
    prompt: 'Describe a situation where you had a strong technical disagreement with a team member or project partner. How did you handle it and what was the resolution?',
    type: 'behavioral',
    starGuidelines: {
      situation: 'What was the conflicting architectural decision or feature approach?',
      task: 'What was at stake for the project timeline or product quality?',
      action: 'How did you listen, benchmark data, communicate respectfully, and find consensus?',
      result: 'How did the project benefit and what did it do for your working relationship?'
    },
    rubric: [
      'Focuses on technical merits and project goals rather than personal ego',
      'Demonstrates active listening and objective evaluation (e.g. prototyping or benchmarking)',
      'Shows willingness to disagree and commit or build an optimal hybrid solution',
      'Maintains positive relationship with colleague'
    ],
    sampleStarResponse: 'S: During our compiler design project, my teammate wanted to implement an LR(1) parser by hand, while I advocated for generating an LALR table via an automated generator to save time for code optimization.\nT: We were on a 3-week milestone and could not afford wasted effort.\nA: Instead of debating opinions, I set up a 1-day spike where each of us timed table generation for a small subset of grammar rules. The data showed the manual approach would take 2 extra weeks of debugging.\nR: My teammate agreed with the data, we used the generator, and we finished the front-end early, allowing us to implement extra register allocation optimizations together.'
  },
  {
    id: 'hr-star-3',
    phase: 'phase3_hr',
    category: 'cultural_fit',
    topic: 'Self-Awareness & Growth Mindset',
    competency: 'Constructive Self-Critique & Continuous Improvement',
    difficulty: 'easy',
    prompt: 'What is your greatest technical strength, and what is one real weakness or gap you are actively working on improving?',
    type: 'behavioral',
    starGuidelines: {
      situation: 'Provide a genuine reflection of your computer science skills.',
      task: 'Show balance between confidence and humility.',
      action: 'State tangible steps you take daily or weekly to bridge the weakness.',
      result: 'Show progress made so far.'
    },
    rubric: [
      'Mentions a genuine, thoughtful technical weakness (not a cliché fake weakness like "I work too hard")',
      'Pairs the weakness with proactive, concrete learning habits (courses, projects, open-source)',
      'Highlights a core strength with supporting evidence'
    ],
    sampleStarResponse: 'My greatest strength is my curiosity and first-principles debugging skills—when an issue occurs in distributed systems, I trace through network packets, OS logs, and code rather than guessing. My weakness has been premature optimization—early in college I spent too much time tuning micro-benchmarks before proving the bottleneck. To improve, I now strictly adhere to profiling first using tools like Chrome DevTools and cProfile, only optimizing after identifying verified hotspots.'
  }
];
