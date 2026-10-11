# Hisaab · Trip Splitter

Five friends, one Goa trip, six shared bills, and the question of who owes whom.

## Run it

```bash
npm install
npm run dev
```

Node 22 or newer. The other scripts are `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.

**What's not finished:** nothing known. Typecheck, lint, 157 tests and the build all pass cleanly. The trip title is hard-coded, as there is no trip-editing feature. I checked the layout by hand at 360px, 768px and 1280px and walked the app with the keyboard only; there are no automated browser tests.

## Three decisions, and why

**1. Money is always an integer number of paise.** ₹1,250.50 is stored as `125050`, never `1250.5`. The obvious parser, `parseFloat(text) * 100`, returns `125049.99999999999` for that value, so mine reads the string instead: split on the dot, pad the decimals to two digits, combine with integers. Splitting then follows one rule, used everywhere:

> Shares are first rounded down to whole paise. The leftover paise (always fewer than the number of people) are handed out one at a time to the people in the split, in the order of the trip's member list, skipping anyone whose share is 0.

That is why ₹100 ÷ 3 comes out as ₹33.34 + ₹33.33 + ₹33.33, why an expense's shares always add up to its amount, and why the five balances always sum to exactly ₹0. Percentages become integer basis points first, so "adds up to 100%" is an exact check, never a floating-point one.

**2. Redux holds only the members and the expenses.** Balances, totals and the newest-first list are derived with `createSelector` and never stored, so they cannot drift from their source. The form draft, field errors, category filter and the row awaiting deletion are component state: short-lived details no other page needs. localStorage is written in one place only, a `store.subscribe` listener that fires when `members` or `expenses` changes by reference. Reducers stay pure; no component touches storage.

**3. The form is a draft of strings handed to one pure function.** Every field is a string, because that is what an `<input>` holds. `validateExpenseDraft(draft, members, today)` returns a discriminated union: `{ ok: true, expense }` or `{ ok: false, errors }`. It imports no React and reads no clock — `today` is passed in — so the form and the tests share one copy of the rules.

The lint config bans `any`, `as` (except `as const`), `!` and `@ts-` comments. Nothing in `src/` needed an exception.

## With another day

Editing an expense; the filter synced to the URL so a view can be shared; settle-up suggestions that minimise the number of payments; Playwright end-to-end tests; self-hosted fonts.

## Design

The approved mockups are in [docs/design/](docs/design/). The direction is "Fontainhas walls": an ochre hero over a striped shack awning, cobalt reserved strictly for things you can press, and 3px ink outlines with hard offset shadows on a white paper receipt.

## How I used AI

<!-- WRITE THIS YOURSELF -->
