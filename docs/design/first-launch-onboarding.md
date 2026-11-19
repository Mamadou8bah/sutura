# First-launch introduction

Customer, agent and merchant each have three welcome slides before the existing
sign-in/registration entry. This is distinct from account registration. The user
can press Next, go Back, Skip, or Get started on the final slide. Android Back
returns to the preceding slide. There is no automatic slideshow or forced delay.

Completion is stored using AsyncStorage under `sutura_<audience>_intro_completed`.
Skip and Get started both persist completion before showing the auth entry.
The key is independent of authentication/session keys and app version, so signing
out, restarting and ordinary updates do not reset it. Already authenticated users
bypass the intro and also mark it complete. If an intro is abandoned before
completion it starts again on the next launch. Clearing app data resets it;
device backup/restore can preserve local data during reinstall.

Storage errors do not trap the user outside sign-in: the intro can complete for
the current launch even if the device cannot persist the flag. The images, copy
and navigation are bundled, so no API call or network image is required.

## Visual direction and assets

Large original AI-generated people/wallet artwork, Sutura orange, Poppins, white
and charcoal themes, rounded primary buttons and three progress indicators.
These fictional people are illustrations, not customer testimonials. Existing
payment icons, Liquid Glass navigation and registration flows are unchanged.
Artwork is decorative to screen readers; the slide title, copy, progress and
controls carry the meaning. Layout scrolls on short screens and enlarged text.

The user's [Behance reference](https://www.behance.net/gallery/169139791/3D-Icons-for-Crypto-App-Onboarding-Screens)
established the first-launch onboarding intent. Its page returned HTTP 403 during
implementation, so the result does not claim to reproduce unseen artwork.

Built-in image generation was used with transparent backgrounds. Source files
were preserved; project copies are saved in each app's `assets/onboarding/`.
Customer artwork:

- `people.png`: two West African adults using a phone, with an orange wallet.
- `wallet.png`: orange leather cash wallet and phone with a stylised scan frame.
- `confidence.png`: West African business owner holding a phone, with a check shield.

Agent and merchant have separate image sets, not reused customer illustrations:

- Agent: `agent-community.png`, `agent-scan.png`, `agent-records.png` depict a
  cash agent serving a customer, scanning across the counter and checking receipts.
- Merchant: `merchant-shop.png`, `merchant-qr.png`, `merchant-paid.png` depict
  a shop owner, QR retail checkout and a completed sale with a shopping bag.

The [exact role-specific generation prompts](onboarding-art-prompts.json) record
the built-in generator brief. The completion storage key is unchanged, so replacing
artwork does not replay the introduction for someone who already completed it.

## Generation prompt set

Shared direction: premium Sutura mobile fintech onboarding; vivid orange
`#f97316`, white, cream, charcoal and natural skin tones; generous framing; soft
studio lighting; transparent background; square composition. No text, logos,
cryptocurrency, virtual cards or private information. Figures have natural faces
and anatomically correct hands.

People prompt: a cheerful stylish young adult Black West African woman in a
crisp white shirt and orange overshirt, looking at a smartphone, beside a
confident young adult Black West African man in a cream shirt. Contemporary
Gambian city residents. Editorial photographic realism blended with refined
soft 3D studio art direction; waist-up centred composition; a small sculptural
orange leather wallet in the foreground.

Wallet prompt: a tactile matte orange leather bifold cash wallet, slightly open
with generic cream paper notes, next to a rounded charcoal smartphone tilted in
perspective. Cream screen with an abstract scan frame and rounded square shapes,
not a readable QR code. Small white and orange tokens without currency symbols.
Refined realistic stitching and subtle contact shadows, not glossy toy blobs.

Confidence prompt: a confident friendly young adult Black West African woman
business owner in a cream blouse and muted orange headwrap, holding a smartphone
at waist height. Editorial photographic realism with soft 3D studio treatment.
An orange sculptural shield with a white check is an abstract symbol of checking
details, not a security certification. Waist-up centred composition and soft light.

## Verification scope

Check completion and Skip persistence, Back/Next, signed-in bypass, storage-failure
escape, bundled image loading, both themes and 320/390/768-pixel layouts. Browser
checks establish rendered behavior, not native safe-area, Android Back or screen
reader behavior on physical devices. Native exports establish bundle compatibility.
