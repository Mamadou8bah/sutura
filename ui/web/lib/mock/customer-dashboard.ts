// Customer web types. Sample balances were removed: the customer view only
// shows data returned by the API (see app/app/customer-app-view.tsx).

export type CustomerTransaction = {
  id: string;
  reference: string;
  type: "TRANSFER_IN" | "TRANSFER_OUT" | "DEPOSIT" | "WITHDRAWAL" | "OTHER";
  rawType: string;
  counterparty: string;
  amount: number;
  currency: string;
  status: string;
  time: string;
};

export type CustomerWallet = {
  id: number;
  name: string;
  currency: string;
  balance: number;
  status: string;
};

export type CustomerDashboardData = {
  wallet: CustomerWallet | null;
  transactions: CustomerTransaction[];
};

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
