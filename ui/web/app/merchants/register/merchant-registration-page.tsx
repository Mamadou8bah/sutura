import Link from "next/link";
import { AuthShell } from "../../auth-shell";

const steps = [
  ["Verify your phone", "We send a code to the business phone number."],
  ["Add business details", "Name, category, region and address. A registration number is optional."],
  ["Add the owner", "The owner's name and ID document. Sutura checks the ID before the account goes live."],
  ["Wait for review", "You'll be told if anything needs correcting, and you can fix it and resubmit."],
];

export default function MerchantRegisterPage() {
  return (
    <AuthShell
      heading="Register your business"
      description="Merchants register in the Sutura Merchant app. Here is what you'll need and what happens next."
    >
      <ol className="mt-6 space-y-4">
        {steps.map(([title, text], i) => (
          <li key={title} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-ink tabular-nums">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-0.5 text-sm text-ink-2">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-card border border-line bg-surface-2 p-4 text-sm text-ink-2">
        <p className="font-semibold text-ink">The merchant app is coming soon</p>
        <p className="mt-1">
          It isn&apos;t in the app stores yet. To join the merchant rollout,{" "}
          <Link href="/contact" className="font-semibold text-accent-ink underline underline-offset-2">
            contact us
          </Link>
          .
        </p>
      </div>
      <p className="mt-6 text-sm text-ink-2">
        Building an integration instead?{" "}
        <Link href="/signup" className="font-semibold text-accent-ink underline underline-offset-2">
          Create a developer account
        </Link>
      </p>
    </AuthShell>
  );
}
