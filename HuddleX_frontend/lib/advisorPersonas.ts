/**
 * Advisor persona definitions + stance logic
 * Used by AdvisorDivergenceCard and MetaAdvisorCard
 */

export type RiskLevel = "low" | "medium" | "high";

export interface AdvisorStance {
  advisorId: string;
  name: string;
  initials: string;
  color: string;        // tailwind bg color
  label: string;        // short stance label e.g. "还债优先"
  quote: string;        // 1-2 sentence reasoning
  risk: RiskLevel;
  monthlyDebtPayment: number;    // how much they'd put toward debt
  monthlyInvestment: number;     // how much they'd invest
  reasoning: string;             // longer explanation for meta-advisor
}

export interface UserProfile {
  monthlySurplus: number;
  riskLevel: RiskLevel;
  pastAbandonedPlans: number;   // times user gave up on a plan
  focusSectors: string[];
}

const DEFAULT_PROFILE: UserProfile = {
  monthlySurplus: 1100,
  riskLevel: "medium",
  pastAbandonedPlans: 0,
  focusSectors: ["tech", "crypto"],
};

/**
 * Given a monthly surplus and question context,
 * returns each advisor's stance.
 */
export function getAdvisorStances(
  surplus: number,
  _questionContext = ""
): AdvisorStance[] {
  return [
    {
      advisorId: "dave-ramsey",
      name: "Dave Ramsey",
      initials: "DR",
      color: "bg-emerald-500",
      label: "还债优先",
      quote: "先清零再投资，没有例外。债务是财富最大的敌人。",
      risk: "low",
      monthlyDebtPayment: surplus,
      monthlyInvestment: 0,
      reasoning:
        "24% 信用卡利率跑赢任何稳健投资。行为上，无债一身轻能让你更果断投资。",
    },
    {
      advisorId: "warren-buffett",
      name: "Warren Buffett",
      initials: "WB",
      color: "bg-blue-500",
      label: "还债优先",
      quote: "24% 的利率是你能找到的最好的无风险投资回报。",
      risk: "low",
      monthlyDebtPayment: surplus,
      monthlyInvestment: 0,
      reasoning:
        "没有任何投资能稳定跑赢 24% 的债务成本，先还债是最理性的选择。",
    },
    {
      advisorId: "elon-musk",
      name: "Elon Musk",
      initials: "EM",
      color: "bg-slate-600",
      label: "分拆投资",
      quote: "错误的成本是机会成本。$700 投资，$400 还债，同时推进。",
      risk: "medium",
      monthlyDebtPayment: Math.round(surplus * 0.36),
      monthlyInvestment: Math.round(surplus * 0.64),
      reasoning:
        "科技股牛市窗口有时限，错过比利息成本更贵。分拆执行两条线。",
    },
    {
      advisorId: "cathie-wood",
      name: "Cathie Wood",
      initials: "CW",
      color: "bg-purple-500",
      label: "激进投资",
      quote: "创新科技的复利回报将远超任何债务利率。",
      risk: "high",
      monthlyDebtPayment: Math.round(surplus * 0.2),
      monthlyInvestment: Math.round(surplus * 0.8),
      reasoning:
        "ARK 模型预测颠覆性科技五年回报 15-20x。但波动极大，需要强心理承受力。",
    },
    {
      advisorId: "ray-dalio",
      name: "Ray Dalio",
      initials: "RD",
      color: "bg-amber-500",
      label: "均衡配置",
      quote: "风险平价原则：债务是风险，但机会也有时限，均衡分配。",
      risk: "medium",
      monthlyDebtPayment: Math.round(surplus * 0.55),
      monthlyInvestment: Math.round(surplus * 0.45),
      reasoning:
        "全天候策略：55% 还债降风险，45% 多元投资捕捉机会，不极端。",
    },
  ];
}

/**
 * Meta-advisor: pick best stance based on user profile
 */
export function getMetaRecommendation(
  stances: AdvisorStance[],
  profile: UserProfile = DEFAULT_PROFILE
) {
  const scores = stances.map((s) => {
    let score = 0;

    // Risk alignment
    if (s.risk === profile.riskLevel) score += 3;
    if (profile.riskLevel === "low" && s.risk === "low") score += 2;
    if (profile.riskLevel === "high" && s.risk === "high") score += 2;

    // Penalize high risk if user abandoned plans before
    if (profile.pastAbandonedPlans >= 2 && s.risk === "high") score -= 4;
    if (profile.pastAbandonedPlans >= 1 && s.risk === "high") score -= 2;

    return { stance: s, score };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0].stance;

  const ignored = stances
    .filter((s) => s.advisorId !== best.advisorId)
    .map((s) => {
      let reason = "";
      if (s.risk === "high" && profile.pastAbandonedPlans >= 1) {
        reason = `你过去有放弃计划的记录，高风险策略成功率低`;
      } else if (s.risk === "high" && profile.riskLevel === "low") {
        reason = `风险偏好不匹配`;
      } else if (s.monthlyInvestment > profile.monthlySurplus * 0.6 && profile.riskLevel !== "high") {
        reason = `投资比例过高，债务利率 24% 仍高于预期回报`;
      } else {
        reason = `与 ${best.name} 策略高度相似，合并采纳`;
      }
      return { stance: s, reason };
    });

  // Build suggested action
  const months = best.monthlyDebtPayment > 0
    ? Math.ceil(12400 / best.monthlyDebtPayment)
    : null;

  const suggestedAction =
    best.monthlyInvestment === 0
      ? `每月 $${best.monthlyDebtPayment} 全力还债，约 ${months} 个月后债务自由。之后 $800 定投科技 ETF + $300 现金储备`
      : `每月 $${best.monthlyDebtPayment} 还债 + $${best.monthlyInvestment} 投资，同步推进`;

  const adoptedAdvisors = stances.filter(
    (s) => s.risk === best.risk && s.label === best.label
  );

  return { best, ignored, suggestedAction, adoptedAdvisors };
}

export { DEFAULT_PROFILE };
export type { UserProfile as MetaUserProfile };
