// Subscription pricing, and the savings shown against buying every issue
// separately. Plan prices must match subscription_orders_before_insert() in
// supabase/migrations/0001_init.sql, which is what actually charges them.
export const SINGLE_ISSUE_PRICE = 14900;

export const PLAN_PRICES = {
  quarterly: { issues: 3, price: 41000 },
  'half-year': { issues: 6, price: 76000 },
  yearly: { issues: 12, price: 149000 },
} as const;

export type PlanId = keyof typeof PLAN_PRICES;

export function planSavings(id: PlanId) {
  const { issues, price } = PLAN_PRICES[id];
  const separately = SINGLE_ISSUE_PRICE * issues;
  const saved = separately - price;
  return {
    separately,
    saved,
    percent: Math.round((saved / separately) * 100),
    perIssue: Math.round(price / issues),
  };
}
