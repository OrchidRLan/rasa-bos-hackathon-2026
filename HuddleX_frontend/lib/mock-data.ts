// Placeholder data — components will fetch from the real API once wired up.

export const activeExpert = {
  id: "sam_altman",
  name: "Sam Altman",
  subtitle: "CEO, OpenAI · @sama",
  initials: "SA",
  avatarColor: "from-blue-700 to-blue-900",
};

export const suggestions = [
  "What's your take on AGI?",
  "How do you think about startups?",
  "What should I focus on this week?",
  "Tell me about your recent thinking",
];

export const experts = [
  {
    id: "sam_altman",
    name: "Sam Altman",
    subtitle: "CEO, OpenAI · @sama",
    initials: "SA",
    avatarColor: "from-blue-700 to-blue-900",
    xSource: "@sama",
    wikipedia: "en.wikipedia.org/wiki/Sam_Altman",
    lastUpdated: "Today",
  },
  {
    id: "elon_musk",
    name: "Elon Musk",
    subtitle: "CEO, Tesla & SpaceX · @elonmusk",
    initials: "EM",
    avatarColor: "from-slate-700 to-slate-900",
    xSource: "@elonmusk",
    wikipedia: "en.wikipedia.org/wiki/Elon_Musk",
    lastUpdated: "Today",
  },
  {
    id: "paul_graham",
    name: "Paul Graham",
    subtitle: "Co-founder, YC · @paulg",
    initials: "PG",
    avatarColor: "from-orange-600 to-red-700",
    xSource: "@paulg",
    wikipedia: "en.wikipedia.org/wiki/Paul_Graham_(programmer)",
    lastUpdated: "Today",
  },
  {
    id: "naval_ravikant",
    name: "Naval Ravikant",
    subtitle: "Co-founder, AngelList · @naval",
    initials: "NR",
    avatarColor: "from-violet-700 to-purple-900",
    xSource: "@naval",
    wikipedia: "en.wikipedia.org/wiki/Naval_Ravikant",
    lastUpdated: "Today",
  },
  {
    id: "jensen_huang",
    name: "Jensen Huang",
    subtitle: "CEO, NVIDIA · @jensenhuang",
    initials: "JH",
    avatarColor: "from-green-700 to-emerald-900",
    xSource: "@jensenhuang",
    wikipedia: "en.wikipedia.org/wiki/Jensen_Huang",
    lastUpdated: "Today",
  },
];

export const userProfile = {
  initials: "ME",
  name: "You",
  subtitle: "HuddleX User",
  xSource: "Not connected",
  wikipedia: "—",
  financialAccount: "—",
  lastUpdated: "—",
};

export const ongoingTasks = [
  { id: "t1", title: "Chat with Sam Altman", status: "In progress", progress: 60 },
  { id: "t2", title: "Explore AI startup ideas", status: "In progress", progress: 30 },
];

export const chatMessages = [
  { role: "user", text: "What do you think about AGI timelines?" },
  {
    role: "assistant",
    text: "I think AGI is closer than most people expect. The progress in the last few years has been remarkable.",
  },
  { role: "user", text: "How should I think about building an AI startup?" },
  {
    role: "assistant",
    text: "Find a problem where AI gives you a 10x advantage. Don't build a wrapper — go deep on the use case.",
  },
];

export const transcriptStream = [
  "What's your take on the future of AI?",
  "How do you think about long-term memory in agents?",
  "Tell me about your recent focus areas.",
  "What would you do if you were starting a company today?",
];
