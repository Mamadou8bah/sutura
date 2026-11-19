export type SiteNavGroup = {
  label: string;
  links: Array<{ label: string; href: string }>;
};

export const headerNavGroups: SiteNavGroup[] = [
  {
    label: "Developers",
    links: [
      { label: "Developer docs", href: "/docs" },
      { label: "Integration guide", href: "/developers/integration" },
      { label: "API reference", href: "/docs#api" },
    ],
  },
  {
    label: "Trust",
    links: [
      { label: "How reconciliation works", href: "/operations/reconciliation" },
      { label: "Security", href: "/company/security" },
      { label: "Compliance", href: "/company/compliance" },
    ],
  },
  {
    label: "Resources",
    links: [
      { label: "Help center", href: "/help" },
      { label: "Contact", href: "/contact" },
      { label: "Status", href: "/status" },
    ],
  },
];

export const footerColumns: Array<{
  title: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    title: "Product",
    links: [
      { label: "Customer checkout", href: "/#audiences" },
      { label: "Merchant collections", href: "/#audiences" },
      { label: "Wallet transfers", href: "/#audiences" },
      { label: "Developer docs", href: "/docs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Sutura", href: "/company/about" },
      { label: "Security", href: "/company/security" },
      { label: "Compliance", href: "/company/compliance" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "API reference", href: "/docs#api" },
      { label: "Service status", href: "/status" },
      { label: "Help center", href: "/help" },
      { label: "Release notes", href: "/release-notes" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Terms of service", href: "/legal/terms" },
      { label: "Cookie policy", href: "/legal/cookies" },
    ],
  },
];
