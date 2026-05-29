export const chatMessages = [
  { role: "user" as const, text: "What should I do with my savings?" },
  { role: "assistant" as const, text: "Let's look at your current financial situation first." },
];

export const experts = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    subtitle: "Value Investor",
    initials: "WB",
    avatarColor: "from-blue-500 to-blue-700",
    xSource: "@WarrenBuffett",
    wikipedia: "Warren_Buffett",
    financialAccount: "Berkshire",
    lastUpdated: "2 min ago",
  },
];

export const userProfile = {
  name: "User",
  initials: "U",
  subtitle: "Premium Member",
  xSource: "@user",
  wikipedia: "—",
  financialAccount: "Connected",
  lastUpdated: "Just now",
};

export const activeExpert = {
  id: "warren-buffett",
  name: "Warren Buffett",
  subtitle: "Value Investor",
  initials: "WB",
  avatarColor: "from-blue-500 to-blue-700",
};

export const suggestions: string[] = [
  "Review your portfolio",
  "Check market news",
];

export const transcriptStream = [
  "Listening for voice input...",
  "Processing your request...",
];

export const ongoingTasks = [
  { id: "1", title: "Weekly budget review", status: "In progress", progress: 60 },
];
