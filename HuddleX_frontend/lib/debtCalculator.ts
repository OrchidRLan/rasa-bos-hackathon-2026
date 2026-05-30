/**
 * Debt payoff calculator
 * Simulates month-by-month debt repayment under different strategies
 */

export interface Debt {
  id: string;
  name: string;       // e.g. "信用卡A"
  balance: number;    // current balance
  apr: number;        // annual interest rate e.g. 0.24
  minPayment: number;
}

export interface MonthEvent {
  month: number;
  debtId: string;
  debtName: string;
  type: "paid_off" | "payment";
  remainingBalance: number;
}

export interface PlanResult {
  strategy: string;
  monthsToFreedom: number | null;
  totalInterestPaid: number;
  events: MonthEvent[];            // milestone events only
  monthlySnapshots: number[];      // total debt balance each month
  investmentBalance: number;       // if split strategy, final investment value
  netWorth: number;                // investmentBalance - remaining debt
}

/**
 * Simulate the "Ramsey Snowball" or "Avalanche" method
 * Puts all surplus toward debt (smallest or highest-APR first)
 */
export function simulateDebtPayoff(
  debts: Debt[],
  monthlySurplus: number,
  method: "snowball" | "avalanche" = "avalanche",
  maxMonths = 120
): PlanResult {
  // Deep copy
  let remaining = debts.map((d) => ({ ...d }));

  // Sort order
  if (method === "snowball") {
    remaining.sort((a, b) => a.balance - b.balance);
  } else {
    remaining.sort((a, b) => b.apr - a.apr);
  }

  const events: MonthEvent[] = [];
  const monthlySnapshots: number[] = [];
  let totalInterest = 0;
  let month = 0;

  while (month < maxMonths) {
    month++;
    let paymentPool = monthlySurplus;

    // Apply monthly interest and min payments first
    for (const debt of remaining) {
      const interest = (debt.balance * debt.apr) / 12;
      debt.balance += interest;
      totalInterest += interest;

      const minPay = Math.min(debt.minPayment, debt.balance);
      debt.balance -= minPay;
      paymentPool -= minPay;
    }

    // Apply extra payment to first debt in priority order
    for (const debt of remaining) {
      if (debt.balance <= 0) continue;
      const extra = Math.min(paymentPool, debt.balance);
      debt.balance -= extra;
      paymentPool -= extra;
      if (paymentPool <= 0) break;
    }

    // Check for payoffs
    const newRemaining = [];
    for (const debt of remaining) {
      if (debt.balance <= 0.01) {
        events.push({
          month,
          debtId: debt.id,
          debtName: debt.name,
          type: "paid_off",
          remainingBalance: 0,
        });
      } else {
        newRemaining.push(debt);
      }
    }
    remaining = newRemaining;

    const totalRemaining = remaining.reduce((s, d) => s + d.balance, 0);
    monthlySnapshots.push(totalRemaining);

    if (remaining.length === 0) break;
  }

  const monthsToFreedom = remaining.length === 0 ? month : null;

  return {
    strategy: method === "snowball" ? "Ramsey Snowball" : "Avalanche",
    monthsToFreedom,
    totalInterestPaid: totalInterest,
    events,
    monthlySnapshots,
    investmentBalance: 0,
    netWorth: monthsToFreedom ? 0 : -remaining.reduce((s, d) => s + d.balance, 0),
  };
}

/**
 * Simulate a split strategy: X% to debt, Y% to investment
 */
export function simulateSplitStrategy(
  debts: Debt[],
  monthlySurplus: number,
  debtRatio: number,           // e.g. 0.36 means 36% to debt
  annualInvestmentReturn = 0.08,
  maxMonths = 120
): PlanResult {
  let remaining = debts.map((d) => ({ ...d }));
  remaining.sort((a, b) => b.apr - a.apr);

  const events: MonthEvent[] = [];
  const monthlySnapshots: number[] = [];
  let totalInterest = 0;
  let investmentBalance = 0;
  let month = 0;

  const debtPayment = monthlySurplus * debtRatio;
  const investmentContribution = monthlySurplus * (1 - debtRatio);
  const monthlyReturn = annualInvestmentReturn / 12;

  while (month < maxMonths && remaining.length > 0) {
    month++;
    let paymentPool = debtPayment;

    // Investment grows
    investmentBalance = investmentBalance * (1 + monthlyReturn) + investmentContribution;

    // Apply interest + min payments
    for (const debt of remaining) {
      const interest = (debt.balance * debt.apr) / 12;
      debt.balance += interest;
      totalInterest += interest;

      const minPay = Math.min(debt.minPayment, debt.balance);
      debt.balance -= minPay;
      paymentPool -= minPay;
    }

    // Extra to highest priority
    for (const debt of remaining) {
      if (debt.balance <= 0) continue;
      const extra = Math.min(paymentPool, debt.balance);
      debt.balance -= extra;
      paymentPool -= extra;
      if (paymentPool <= 0) break;
    }

    const newRemaining = [];
    for (const debt of remaining) {
      if (debt.balance <= 0.01) {
        events.push({ month, debtId: debt.id, debtName: debt.name, type: "paid_off", remainingBalance: 0 });
      } else {
        newRemaining.push(debt);
      }
    }
    remaining = newRemaining;

    const totalRemaining = remaining.reduce((s, d) => s + d.balance, 0);
    monthlySnapshots.push(totalRemaining);
  }

  const totalDebtRemaining = remaining.reduce((s, d) => s + d.balance, 0);

  return {
    strategy: `Split ${Math.round(debtRatio * 100)}/${Math.round((1 - debtRatio) * 100)}`,
    monthsToFreedom: remaining.length === 0 ? month : null,
    totalInterestPaid: totalInterest,
    events,
    monthlySnapshots,
    investmentBalance,
    netWorth: investmentBalance - totalDebtRemaining,
  };
}

/** Format month number as "第X个月" */
export function formatMonth(m: number) {
  return `第${m}个月`;
}

/** Format currency */
export function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}
