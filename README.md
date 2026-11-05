# send-a-cat

Send someone a little cat that tells them nice things when they pet it.

- `/` is a demo cat, so visitors can pet it and see how it works first. For now it says the starter notes (set in `app/page.tsx`). A **send someone a cat** button at the bottom goes to the builder.
- `/make` is the builder. The sender enters the recipient's name (and optionally their own), writes notes or picks from a starter list, previews the cat, and taps **Create link**. Their draft is kept in the browser until the link is made.
- `/c/<id>` is a sent cat. Pet it for a note (shuffled, no repeats until every note has been shown), throw it a treat, or play with the laser pointer: tap it to turn it on, then move the mouse or drag a finger and the cat's eyes and head follow the dot (fast moves make it swipe). After 5 swipes, moving the dot near its front paws makes it pounce and catch the dot: stars burst, it closes its eyes and purr-vibrates like after a treat, and the laser turns off. Tapping the laser again turns it off early, without the catch. Under the usual `[ pet the cat to receive love ]` it says `a message from <sender> for <recipient>` (or just `for <recipient>` when there is no sender name).
- Pasting a cat link in a chat shows a preview: "A cat for <name>".

The cat is ported from the original single-page lil cat ([ybarysheva/love](https://github.com/ybarysheva/love)).

There are no accounts. Anyone with a cat's link can see it. Links use a random 10-character id, so they can't be guessed, and cat pages aren't indexed by search engines. Creating cats is rate limited per IP (10 a minute). Notes are stored as plain text for now.

## Stack

Next.js (App Router, TypeScript), plain CSS, and Upstash Redis from the Vercel Marketplace for storage. Runtime dependencies: `next`, `react`, `react-dom`, `@upstash/redis`.

## Run locally

```bash
npm install
npm run dev    # http://localhost:3000
```

Without Upstash credentials, local dev stores cats in `.data/local-db.json` (git-ignored). To use the real store locally instead:

```bash
vercel link
vercel env pull .env.local
npm run dev
```

## Checks

```bash
npm run check      # lint, formatting, types and unit tests
npm run test:e2e   # browser smoke tests (desktop and phone) against a production build
npm run format     # fix formatting
```

The first time on a new machine, run `npx playwright install chromium` before the browser tests. GitHub Actions runs both on every push (`.github/workflows/ci.yml`).

## Deploy

1. Import this repo in Vercel. Pushes to the production branch deploy production.
2. Add storage: Vercel dashboard, the project, **Storage**, **Create Database**, **Upstash** (Redis), plan **Free**, connect to all environments (Production, Preview, Development). Choose the option where Vercel creates the Upstash account, so no separate signup is needed. This sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` on the project. `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` also work.
3. Redeploy so the new env vars take effect.
4. Make production public: project, Settings, **Deployment Protection**. Vercel Authentication must not cover production, or recipients get a Vercel login screen. "Standard Protection" (previews only) is fine; "All Deployments" is not.

On Vercel, if the Redis env vars are missing, creating a cat returns a clear "Storage isn't connected" error instead of silently using a file.

## Where things are

- `components/cat/`: the cat and its room.
  - `Cat.tsx`: the markup, and `startCat`, which wires the parts below together. `cat.css` styles it all.
  - `bubble.ts` (speech bubble and the note shuffle), `body.ts` (eyes, head tilt, the happy state), `treat.ts`, `laser.ts` (the laser and the catch), `particles.ts` (hearts and stars), `timers.ts` (timers that stop when the cat goes away).
  - `tail.ts`: the tail's shape and swish (a tapered curve with a wave running along it; faster during laser play, wild while a fly is around).
  - `fly.ts`: the occasional fly (every 25–50s, first after 8–20s): it darts around above the cat and zips off. The cat's pupils follow it and its tail goes wild. No flies while the laser is on.
  - `room.ts`: the background: light wallpaper of paw prints and fish-bone skeletons, a prewar Brooklyn-style baseboard, and hardwood strip flooring in gentle perspective, all in fine light dither, fading out toward the sides.
  - `vines.ts`: pothos vines: a rounded swag across the top-left corner with a long strand trailing from it, and a short strand further right. Only the ends of the two strands move.
- `components/builder/`: the builder page (`Builder.tsx`), the "cat is ready" screen (`ReadyScreen.tsx`), and the draft kept in the browser (`useDraft.ts`).
- `lib/palette.ts`: the two colours (ink and paper) and the dither helpers shared by everything drawn on the page and the texture script. The CSS has the same colours as `--ink` and `--paper` in `app/globals.css`.
- `scripts/dither-textures.ts` and `public/tex/`: the shaded 1-bit textures for the cat, treat bag and laser pointer (Obra Dinn-style: each part lit from the upper left and ordered-dithered into ink and paper). After changing a part's size or position in `cat.css`, run `npm run textures` to regenerate them.
- `lib/starter-notes.ts`: the notes senders can pick from.
- `app/page.tsx`: the landing page (demo cat). `app/make/page.tsx`: the builder.
- `lib/card.ts`: the shape of a cat and its limits (name 40 characters, up to 50 notes of 200 characters), shared by the builder and the API.
- `app/api/cards/route.ts`: creates a cat (rate limit, validation, save).
- `app/c/[id]/`: the cat page and its link-preview image.

## Data

Each cat is one Redis key, `cat:<id>`, holding JSON: `{ id, to, from, notes, createdAt }`. Cats don't expire and can't be edited; making changes means making a new cat.

## Ideas for later

- Encrypt notes in the browser, with the key kept after the `#` in the link, so the server never sees them.
- A content check on create (e.g. an AI filter for abuse that lets affectionate and naughty notes through). It would go in `app/api/cards/route.ts` before the cat is saved.
- Editing or deleting a cat via a private edit link.
