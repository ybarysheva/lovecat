# lovecat

Send someone a little cat that tells them nice things when they pet it.

- `/` is a demo cat, so visitors can pet it and see how it works first. Its first note says hello; the rest are in `DEMO_NOTES` in `lib/starter-notes.ts`. A **make your own cat** button at the bottom goes to the builder.
- `/make` is the builder. The sender enters the recipient's name (and optionally their own), writes notes or picks from a starter list, previews the cat, and taps **Create link**. Their draft is kept in the browser until the link is made.
- `/c/<id>` is a sent cat. Pet it for a note (shuffled, no repeats until every note has been shown), throw it a treat, or play with the laser pointer. The label reads `[ pet the cat to receive love, <name> ]`.
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

## Deploy

1. Import this repo in Vercel. Pushes to the production branch deploy production.
2. Add storage: Vercel dashboard, the project, **Storage**, **Create Database**, **Upstash** (Redis), plan **Free**, connect to all environments (Production, Preview, Development). Choose the option where Vercel creates the Upstash account, so no separate signup is needed. This sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` on the project. `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` also work.
3. Redeploy so the new env vars take effect.
4. Make production public: project, Settings, **Deployment Protection**. Vercel Authentication must not cover production, or recipients get a Vercel login screen. "Standard Protection" (previews only) is fine; "All Deployments" is not.

On Vercel, if the Redis env vars are missing, creating a cat returns a clear "Storage isn't connected" error instead of silently using a file.

## Where things are

- `components/Cat.tsx` and `components/cat.css`: the cat (markup, behaviour, sounds).
- `components/Builder.tsx`: the builder page.
- `lib/starter-notes.ts`: the notes senders can pick from, and what the demo cat says. Edit freely; existing cats keep their own copy.
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
