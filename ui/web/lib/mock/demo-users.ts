export type DemoRole = "admin" | "merchant" | "developer" | "customer";

export type DemoUser = {
  email: string;
  password: string;
  role: DemoRole;
  name: string;
  phone?: string;
};

export const DEMO_PASSWORD = "demo123";
