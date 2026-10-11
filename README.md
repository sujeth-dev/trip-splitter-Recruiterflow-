# Hisaab · Trip Splitter

Five friends, one Goa trip, and the question of who owes whom.

**Live:** <https://trip-splitter-recruiterflow.vercel.app>

## How I work

My strength is product and interaction design: turning a brief into an experience that feels alive and is easy to use. For this project I spent most of my effort deciding what the app should do and how it should feel. I explored several visual directions and chose a Goa "beach-shack bill" theme. I designed how balances, errors and empty states should read. I wrote a detailed specification of the behaviour, rules and edge cases ([docs/BUILD_PROMPT.md](docs/BUILD_PROMPT.md)), and the approved designs are in [docs/design/](docs/design/).

## Run it

```bash
npm install
npm run dev
```

Node 22+. Also `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.

**What's not finished:** nothing known — all four checks pass. The trip title is hard-coded, as there is no trip-editing feature. I checked 360/768/1280px and keyboard-only use by hand; no automated browser tests.

## Three decisions, and why

**1. Money is always integer paise.** ₹1,250.50 is stored as `125050`. The obvious parser, `parseFloat(text) * 100`, returns `125049.99999999999`, so mine reads the string instead. Splitting follows one rule, used everywhere:

> Shares are rounded down to whole paise. The leftover paise are handed out one at a time, in the order of the trip's member list, skipping anyone whose share is 0.

That is why ₹100 ÷ 3 is ₹33.34 + ₹33.33 + ₹33.33, and why the balances always sum to exactly ₹0. Percentages become integer basis points first, so "totals 100%" is an exact check.

**2. Redux holds only the members and the expenses.** Balances, totals and the sorted list are derived with `createSelector`, never stored, so they cannot drift. The form draft, errors, filter and pending deletion are component state. localStorage is written in one place: a `store.subscribe` listener firing on a reference change, so reducers stay pure.

**3. The form is a draft of strings fed to one pure function.** `validateExpenseDraft(draft, members, today)` returns `{ ok: true, expense }` or `{ ok: false, errors }`. No React, no clock — `today` is a parameter — so the form and the tests share one copy of the rules.

The lint config bans `any`, `as` (except `as const`), `!` and `@ts-` comments. Nothing in `src/` needed an exception.

## With another day

Editing an expense; the filter synced to the URL; settle-up suggestions; Playwright end-to-end tests; self-hosted fonts.

## How I used AI tools

I used an AI coding assistant to turn my designs and specification into code, working in a loop of plan → build → test → review, milestone by milestone. My part was writing the prompts and the spec, keeping context across separate documents (spec, decisions, walkthrough), defining checks the AI had to pass, such as the exact sample balances and a lint rule banning `any`/`as`/`!`, and reviewing the results. Writing code by hand is where I'm actively growing; reading, reasoning about and changing it is where I already feel at home, and this project is proof of that.
