# Build prompt: Hisaab · Trip Splitter

Paste everything below the line into your AI coding tool (Claude Code, Cursor, Copilot Chat and so on), opened in the `trip-splitter` folder. This file is also at `docs/BUILD_PROMPT.md` in the starter kit, so you can just say: *"Read docs/BUILD_PROMPT.md and follow it."*

---

## 0. Your role and how to work

You are helping me finish a take-home assignment: **Section C, Trip Splitter**, for a Frontend Developer Intern role. I will be asked to **explain every line** in a follow-up call and to **make a live change without AI**. So:

- **Write simple, boring, readable code.** Prefer small named functions, early returns and plain `if` statements. Avoid clever one-liners, generics gymnastics and abstractions used only once.
- **Comment the *why*, not the *what*,** wherever a reader could ask "why like this?" (rounding, type guards, where state lives).
- **Work milestone by milestone (section 7).** After each milestone:
  1. Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`. **All four must pass** before moving on.
  2. Make one git commit with a clear message.
  3. Append a section to `docs/WALKTHROUGH.md` explaining, in plain English for a beginner: each new file, the key concepts it uses, and 3–5 questions a reviewer might ask with short answers.
  4. Give me a short summary, then **continue to the next milestone** unless I said "pause after each milestone".
- **Never** weaken a lint rule, add `eslint-disable`, add `any`, `as`, `!`, `@ts-ignore` or `@ts-expect-error` to make something pass. Fix the code instead. If you believe an exception is truly unavoidable, stop and ask me.
- **If a requirement is ambiguous,** use the decisions in this file. If something isn't covered, pick the simplest reasonable option, note it in `docs/DECISIONS.md`, and keep going.

## 1. What already exists (the starter kit)

The project is already set up. Read these files before writing anything:

| File | What it gives you |
|---|---|
| `package.json` | React 19, Vite 8, TypeScript 6, Redux Toolkit 2, react-redux 9, **React Router 7** (package `react-router`), ESLint 10 + typescript-eslint (strictTypeChecked), Vitest 5, jsdom, Testing Library (react, dom, user-event, jest-dom). Scripts: `dev`, `build`, `typecheck` (`tsc -b`), `lint` (`eslint .`), `test` (`vitest run`), `test:watch`. |
| `tsconfig.app.json` | `"strict": true` plus extra checks. Don't loosen anything. |
| `eslint.config.js` | Bans `any`, `!`, `as` casts (except `as const`) and `@ts-*` comments. Don't edit it to make code pass. |
| `vite.config.ts` | Vitest config: `environment: 'jsdom'`, setup file `src/test/setup.ts`. |
| `src/test/setup.ts` | jest-dom matchers and RTL cleanup after each test. |
| `src/styles/tokens.css` | **All design tokens** (colours, radii, shadows, spacing, fonts). Use `var(--token)`; don't hard-code colours in components. |
| `src/index.css` | Global base styles, visible `:focus-visible` ring, `.money` (tabular numbers). |
| `index.html` | Loads the Lilita One and DM Sans fonts. |
| `src/main.tsx` | React entry, using a null check instead of `!`. You'll wrap it with the Redux `Provider` and `BrowserRouter`. |
| `src/data/sample-data.json` | **The official sample data, exactly as given in the brief.** Don't change it. |
| `docs/design/*.html` + `*.png` | **The approved visual design** (desktop, phone, Add expense with errors, empty / 404 / delete states). Open the PNGs to see it. Match the look using CSS Modules and the tokens. Where the design and the brief disagree, **the brief wins** (for example, the table column order). |

**Don't install** any form, validation or component library (React Hook Form, Formik, Zod, Yup, MUI, Ant Design, Chakra, shadcn/ui, Tailwind UI kits and so on). They're forbidden. Don't add new runtime dependencies at all without asking me.

## 2. The brief (requirements to meet exactly)

**Pages and nav**
- A navbar with links to **Expenses** (`/`) and **Add expense** (`/expenses/new`). The current page is visibly marked (use `NavLink`, which sets `aria-current="page"`; style that).
- Any other URL shows **"Page not found"** with a link back to Expenses.

**Add expense form fields:** Description (text); Amount in ₹ (up to 2 decimals); Paid by (choose a member); Date; Category (**Food, Travel, Stay, Activities, Other**); Split, one of:
- **Equally** between the members the user selects
- **Exact amounts** in ₹ for each member
- **Percentages** for each member

**Save** adds the expense, then goes to Expenses with a message that it was added. **Cancel** goes back without saving.

**Expenses page**
- A balance for each member: **"gets back ₹X"**, **"owes ₹X"** or **"settled up"**.
- A table of expenses, **newest date first**, with columns in this exact order: **Date, Description, Category, Paid by, Amount, Split**. The Split column reads like "Equally, 4 people", "Exact amounts, 3 people" or "Percentages, 3 people".
- A **category filter** for the table, and the **total of the expenses currently shown**.
- **Delete** an expense after the user confirms. Balances update straight away.
- A clear **empty state** when there are no expenses, and another when none match the chosen category.

**Validation** (when the user presses Save, show an error next to every field that breaks a rule, and save nothing):
- Description: required, at most 60 characters.
- Amount: required, more than ₹0, at most ₹10,00,000, no more than 2 decimals. A negative amount shows exactly **"Amount must be more than ₹0"**.
- Paid by, date and category are required. The date can't be in the future.
- Equally: at least one member is selected.
- Exact amounts: each is ₹0 or more, and together they equal the expense amount exactly. Otherwise show how much is left or over, for example **"₹12.50 left to assign"** or **"₹5.00 over"**.
- Percentages: each is 0–100 with up to 2 decimals, and together they total exactly 100 (otherwise e.g. "5.00% left to assign" or "2.50% over").

**Money**
- A member's balance = what they paid − their share of every expense they're part of. Positive means they get money back.
- The payer doesn't have to be in the split.
- Splitting never loses or invents a paisa. ₹100 ÷ 3 = ₹33.34 + ₹33.33 + ₹33.33. One rule, used everywhere (section 4).
- Balances across all members always add up to exactly ₹0.
- Every amount displays in **Indian format**, e.g. `₹1,00,000.00`.

**Data**
- No backend. Start from `src/data/sample-data.json`.
- Changes must survive a reload: save to **localStorage**. If nothing is saved, or the saved data can't be read or is invalid, start from the sample data.
- A member is `{ id: string; name: string }`. An expense is `{ id, description, amount (integer paise), paidBy (member id), date ("YYYY-MM-DD"), category, split }`, where `split` is one of:
  - `{ type: "equal", memberIds: string[] }`
  - `{ type: "exact", shares: Record<string, number> }` (paise per member)
  - `{ type: "percent", shares: Record<string, number> }` (percent per member, e.g. 33.33)

**Technical**
- Strict TypeScript; `npm run typecheck` gives 0 errors. No `any`, `@ts-ignore` or `@ts-expect-error`; avoid `as` and `!`.
- Redux Toolkit holds the **members and expenses**, with typed hooks `useAppDispatch` and `useAppSelector`.
- **Logic outside components:** money parsing, splitting, balances and validation are plain TypeScript functions, testable without React. Components only render and handle events.
- Tests with Vitest + React Testing Library. At minimum: split and balance logic including ₹100 ÷ 3; the form showing errors for invalid input; the form saving valid input.
- `npm run lint` passes.
- Responsive down to **360 px** wide. Every input has a **visible label**, errors appear **next to their field**, and the whole app **works with a keyboard**.
- README of about **500 words max** (section 9).

## 3. Architecture (follow this structure)

```
src/
  data/sample-data.json            (exists)
  domain/                          ← pure TypeScript, NO React or Redux imports
    types.ts                       Member, Category, CATEGORIES, Split (union), Expense, TripData
    money.ts                       parseRupeesToPaise, formatINR, formatPercent
    split.ts                       computeShares (the paisa rule), describeSplit
    balances.ts                    computeBalances, describeBalance
    validation.ts                  validateExpenseDraft (form draft → Result)
    parseTripData.ts               runtime check of unknown JSON → TripData | null (type guards)
    dates.ts                       todayLocalISO, formatShortDate
    *.test.ts                      unit tests next to each file
  store/
    index.ts                       makeStore(preloadedState?), store, RootState, AppDispatch, localStorage subscription
    hooks.ts                       useAppDispatch, useAppSelector (typed)
    membersSlice.ts                members (read-only for this app)
    expensesSlice.ts               expenseAdded, expenseDeleted
    selectors.ts                   memoised selectors: newest-first list, balances, totals
    persistence.ts                 loadTripData(storage), saveTripData(storage, data), STORAGE_KEY
    persistence.test.ts
  components/                      small presentational pieces, each with a .module.css
    Navbar, Hero (title, awning, "spent together" sticker), BalanceTickets,
    CategoryFilter, ExpenseTable, EmptyState, ConfirmDialog, FlashMessage, FieldError
  pages/
    ExpensesPage.tsx (+ .module.css, .test.tsx)
    AddExpensePage.tsx (+ .module.css, .test.tsx)
    NotFoundPage.tsx
  App.tsx                          <AppRoutes/>: layout (Navbar + <Outlet/>) and the routes; no Router here
  main.tsx                         Provider + BrowserRouter + <AppRoutes/>
  test/renderWithProviders.tsx     render(ui, { route, preloadedState }) with a fresh store and MemoryRouter
```

**Key design decisions (use these, and explain them in the README):**
1. **Types.** `Split` is a **discriminated union** on `type`. Use `switch (split.type)` with an exhaustive `never` check in a `default` branch, so adding a fourth split type becomes a compile error until it's handled. `Category` is derived from `export const CATEGORIES = ['Food','Travel','Stay','Activities','Other'] as const`.
2. **Money is always integer paise.** User input is a string; `parseRupeesToPaise` parses it **by string manipulation** (split on `.`, pad to 2 digits), never `parseFloat(x) * 100`. It returns a result type such as `{ ok: true; paise: number } | { ok: false; reason: 'empty' | 'invalid' | 'negative' | 'too_many_decimals' }`. Accept optional commas and spaces ("1,250.50"). `formatINR(paise)` builds the string from integers: rupees via `Intl.NumberFormat('en-IN')` on the whole-rupee part, plus a zero-padded 2-digit paise part, giving `₹1,00,000.00`.
3. **Percentages are converted to integer basis points** (`Math.round(pct * 100)`: 33.33 → 3333) before any maths or comparisons, so "totals exactly 100" means "basis points sum to 10000". No floating-point equality checks anywhere.
4. **Redux holds only `members` and `expenses`.** Everything else is **derived** with `createSelector` (balances, totals, sorted list) and never stored, so it can't go out of sync. **Component state** holds the form draft, field errors, whether the form has been submitted once, the active category filter, and which expense is pending deletion. These are short-lived UI details no other page needs.
5. **localStorage lives in one place:** `store/index.ts` builds the store with `preloadedState` from `loadTripData(window.localStorage)`, and a `store.subscribe` listener calls `saveTripData` **only when `state.expenses` or `state.members` has changed by reference**. Reducers stay pure, and components never touch storage. Key: `"hisaab.trip.v1"`. `loadTripData` wraps `getItem` and `JSON.parse` in try/catch and runs `parseTripData` (type guards, no `as`); on any failure it returns the sample data. Also validate the imported sample JSON through the same `parseTripData`, since TypeScript widens JSON imports (for example `type` becomes `string`). If it fails, throw a clear error at startup.
6. **Expense IDs:** `crypto.randomUUID()`, created in the page or a `prepare` callback, not inside the reducer, so reducers stay pure.
7. **Form model:** a `ExpenseDraft` type where every field is a **string** (exactly what the inputs hold), plus `splitType`, `selectedMemberIds: string[]`, `exactShares: Record<string,string>` and `percentShares: Record<string,string>`. `validateExpenseDraft(draft, members, today)` returns `{ ok: true; expense: NewExpense } | { ok: false; errors: DraftErrors }`. It's pure, and `today` is passed in so tests are deterministic.
8. **"Added" message:** after a save, `navigate('/', { state: { addedDescription } })`. ExpensesPage reads `useLocation().state` (typed `unknown`) through a **type guard** `isAddedState`, shows the FlashMessage in a `role="status"` region, and clears it with `navigate('.', { replace: true, state: null })` when dismissed.
9. **Delete confirmation:** a small `ConfirmDialog` built on the native **`<dialog>` element** with `showModal()`. That gives focus trapping and Escape-to-close for free and is real semantic HTML. If jsdom lacks `showModal` or `close`, add a minimal polyfill **in `src/test/setup.ts` only**. The dialog names the expense, the amount and who it affects. After deleting, return focus somewhere sensible (the table heading).

## 4. The paisa rule (one rule, used everywhere)

> Shares are first **rounded down** to whole paise. The leftover paise (always fewer than the number of people) are handed out **one at a time** to the people in the split, **in the order of the trip's member list** (Aarav, Diya, Kabir, Meera, Rohan), skipping anyone whose share is 0.

- Implement it once: `allocateByWeights(amountPaise, weights: Map<memberId, integerWeight>, memberOrder)`.
  - Equal split = weight 1 for each selected member.
  - Percent split = weight = basis points.
  - Exact split = no rounding; the shares are used as-is.
- `computeShares(expense, memberOrder)` returns a `Map<string, number>` or `Record` of paise per member whose values **always sum to `expense.amount`**. Assert this in tests.
- Integer maths only: `Math.floor(amount * weight / totalWeight)`. With amounts ≤ 10⁸ paise and weights ≤ 10⁴, this stays well within safe-integer range; add a comment saying so.

**Acceptance check: with the sample data, the balances must be exactly:**

| Member | Balance (paise) | Display |
|---|---|---|
| Aarav (m1) | +1855420 | gets back ₹18,554.20 |
| Diya (m2) | −369578 | owes ₹3,695.78 |
| Kabir (m3) | +55408 | gets back ₹554.08 |
| Meera (m4) | −811250 | owes ₹8,112.50 |
| Rohan (m5) | −730000 | owes ₹7,300.00 |
| **Sum** | **0** | |

Shares to expect: e5 Groceries ₹1,000 ÷ 3 → m1 33334, m2 33333, m3 33333. e6 Airport cab 149999 at 33.33/33.33/33.34% → m1 49995, m2 49995, m3 50009. The total of all expenses is ₹42,249.99.

## 5. Exact UI copy (use these strings)

- Brand: **hisaab!** Hero title: **Goa, 12–15 March**. Sub-line: *Five friends, six shared bills. Here's who owes whom.* (Hard-coding the trip title is fine, since there's no trip-editing feature.)
- Hero sticker: **spent together** + total of all expenses.
- Section titles: **Who owes what**, **The bill**. Receipt header: **Table for five**, *N items, newest first*.
- Balance text: `gets back ₹X` / `owes ₹X` / `settled up` (X is the absolute value).
- Filter: buttons **All, Food, Travel, Stay, Activities, Other**, each with `aria-pressed`. Total row: **Total shown** + the filtered total.
- Flash: *Added "{description}" to the bill. Balances are up to date.* plus a dismiss button with `aria-label="Dismiss message"`.
- Empty (no expenses): **Nothing on the bill yet** / *Add the first expense and everyone's balance appears here.* plus an **Add expense** link.
- Empty (filter): **No expenses in {Category}** / *Total for this filter is ₹0.00. Pick another category to see more.* plus a **Show all categories** button.
- 404: **Page not found** / *This address doesn't match any page in the app.* plus a **Back to Expenses** link.
- Delete dialog: **Take {description} off the bill?** / *{Payer} paid ₹X, split {how} between {names}. Their balances change straight away.* Buttons **Keep it** / **Delete expense**. Each row's delete button: `aria-label="Delete {description}"`.
- Form page title: **Add to the bill**. Split legend: **How should it be split?** Options: **Equally**, **Exact amounts**, **Percentages**.
- Error summary (top of form, `role="alert"`, receives focus after a failed Save): *Fix {n} field(s) to save this expense: {list}.*
- Field errors:
  - Description: "Description is required" / "Description must be 60 characters or fewer"
  - Amount: "Amount is required" / **"Amount must be more than ₹0"** (for 0 and negatives) / "Amount can be at most ₹10,00,000.00" / "Use at most 2 decimal places" / "Enter an amount like 1250.50"
  - Paid by: "Choose who paid". Category: "Choose a category". Date: "Date is required" / "Date can't be in the future"
  - Equal: "Choose at least one person to split with"
  - Exact (per member): "Can't be negative" / "Use at most 2 decimal places" / "Enter an amount like 250.00"; total: **"₹X left to assign"** / **"₹X over"**
  - Percent (per member): "Must be between 0 and 100" / "Use at most 2 decimal places"; total: "X.XX% left to assign" / "X.XX% over"
- Buttons: **Cancel** (goes back with `navigate(-1)`, or to `/` if there's no history) and **Save expense**.

## 6. Visual design and accessibility

Match `docs/design/*.png`. **Fontainhas walls** theme: ochre hero (`--wall`), striped cobalt-and-white awning under the hero, pale peach page, white receipt, 3 px ink outlines, hard offset shadows, Lilita One headings, DM Sans body. **Cobalt (`--action`) is used only for things you can press.**

- **CSS Modules** (`Component.module.css`) plus the tokens. The only inline styles allowed are truly dynamic values, such as a bar's width: `style={{ width: \`${percent}%\` }}`. (Don't use CSS custom properties in `style`; React's types would force an `as` cast.)
- **Balance tickets:** aqua (`--gets-back`) or pink (`--owes`) cards, slightly tilted (alternate ±1.5°, but **not** under `prefers-reduced-motion: reduce`, and never so much that text gets hard to read), with a dashed divider and a small **diverging bar** (fill right for gets back, left for owes) scaled to the largest absolute balance. The bar is `aria-hidden`; the text says it all.
- **The bill:** a white receipt card with dotted row dividers, a **Total shown** row and a zigzag bottom edge (CSS gradient). It uses a real `<table>` with `<th scope="col">`. **Under 640 px**, use CSS to stack each row into a card: date, category chip, description … amount on one line, then "{Payer} paid. {Split}" (use `data-label` attributes if helpful). Keep a single table in the DOM; don't render a second copy for mobile.
- **Form:** one column on phones, two-column grid for Amount/Date/Paid by/Category on wider screens. The ₹ prefix sits inside the amount box. The split type is a **radio group** (`<fieldset>` + `<legend>`) styled as three buttons. For exact and percent splits, show one input per member with a visible label, plus a live "₹1,237.50 of ₹1,250.00 assigned" line and the left/over message.
- Every error: `aria-invalid="true"` on the input, and `aria-describedby` pointing to the error text right under it.
- Everything clickable is at least 44 px tall (`--tap`), and focus is always visible.
- No horizontal page scroll at 360 px.
- No animation needed. If you add any, respect `prefers-reduced-motion`.

## 7. Milestones (in this order; all four checks green and a commit after each)

1. **Domain types and money** (`types.ts`, `money.ts`, `dates.ts`) + tests: parsing (`"1250"`, `"1,250.50"`, `"0.5"` → 50, `"-5"` → negative, `"1.234"` → too many decimals, `"abc"`, `""`), formatting (`₹0.00`, `₹1,250.50`, `₹1,00,000.00`, `₹10,00,000.00`).
2. **Split and balances** (`split.ts`, `balances.ts`) + tests: ₹100 ÷ 3; the e6 percent case; exact passes through; payer outside the split; a 0% member gets no extra paisa; shares always sum to the amount; **the sample-data balances table in section 4**; the sum of balances = 0; settled up.
3. **Validation** (`validation.ts`) + tests for every rule and message in section 5, including "₹12.50 left to assign", "₹5.00 over", a future date, 61 characters, ₹10,00,000.01, and a valid draft producing the correct `NewExpense` (exact/percent store only non-zero shares; equal stores the selected IDs in member order).
4. **Data loading** (`parseTripData.ts`, `store/persistence.ts`) + tests: empty storage → sample; invalid JSON → sample; wrong shape (e.g. amount `"12"`, unknown split type, missing field) → sample; valid saved data → used; saving writes the key.
5. **Redux store** (slices, typed hooks, selectors, `makeStore`, subscription) + tests for reducers and selectors (newest first; ties broken by most recently added first; the filtered total).
6. **Routing and layout:** `AppRoutes` with Navbar + Outlet, `/`, `/expenses/new`, `*` → NotFound; `main.tsx` with Provider + BrowserRouter. Tests: the active link has `aria-current="page"`; an unknown URL shows "Page not found".
7. **Expenses page:** hero, tickets, filter, receipt table, empty states, flash message, delete dialog. RTL tests: balances shown; filter changes rows and total; delete → confirm → row gone and balances updated; "Keep it" cancels; the no-expenses empty state.
8. **Add expense page:** the form, the three split modes, live assigned/remaining line, validation on Save, error summary focus, Save and Cancel. RTL tests (with `userEvent`): Save on an empty form shows errors next to fields and **adds nothing to the store**; a negative amount shows "Amount must be more than ₹0"; exact split remainder message; a **valid save** adds the expense, navigates to `/`, shows the flash message and updates a balance.
9. **Responsive and accessibility pass:** check at 360, 768 and 1280 px; keyboard-only run-through (Tab, Shift+Tab, Space/Enter, arrow keys in the radio group, Escape on the dialog); labels; contrast. Fix anything found and list what you checked in `docs/WALKTHROUGH.md`.
10. **README, decisions and walkthrough** (section 9), then a final run of all four scripts plus `npm run dev` smoke check.

## 8. Testing rules

- Test **behaviour**, not implementation: query by role, label and text (`getByRole('button', { name: 'Save expense' })`, `getByLabelText('Amount')`). Avoid test IDs unless there's no accessible alternative.
- Every page test uses `renderWithProviders` with a **fresh store** (and optionally a custom `preloadedState`), so tests never share state or real localStorage. Clear localStorage in `beforeEach` where the store subscription is involved.
- Use a fixed `today` in validation tests. In page tests, choose dates safely in the past (e.g. `2026-03-15`).
- No snapshot tests.

## 9. Final deliverables

**`README.md` (≤ 500 words, in my voice, first person, honest).** Sections:
1. **Run it:** `npm install`, `npm run dev`; the other scripts; Node 22+. **What's not finished** (be honest; "nothing known" if true).
2. **Three decisions and why:**
   - (a) integer paise plus one paisa rule (quote the rule from section 4);
   - (b) what lives in Redux vs. component state, and why localStorage is handled in a single store subscription;
   - (c) the form model: string draft → pure `validateExpenseDraft` → discriminated-union result, so the form and the tests share one source of truth.
   - Optionally mention the lint config that forbids `any`, `as` and `!`.
3. **With another day:** e.g. edit expenses, URL-synced filter, settle-up suggestions, Playwright end-to-end tests, self-hosted fonts.
4. **How I used AI (2–3 sentences):** leave a clearly marked placeholder: `<!-- WRITE THIS YOURSELF -->`. I'll write it.

Also add a link to `docs/design/` and one sentence on the design direction.

**`docs/WALKTHROUGH.md`:** the per-milestone explanations from section 0, ending with a 2-minute "how to demo this app" script and a "file map" (one line per file).

**`docs/DECISIONS.md`:** any assumptions you made beyond this prompt.

**`docs/LIVE_CHANGE_DRILLS.md`:** 6 realistic small change requests a reviewer might ask me to make live, each with **which file(s) to touch and a hint, but not the code**. Examples:
- add a category "Shopping";
- change the description limit to 40 characters;
- give the extra paisa to the payer instead;
- show "settled up" in grey;
- add a "Notes" optional field;
- sort the table oldest first.

**Definition of done:**
- [ ] `npm install && npm run dev` works on a fresh clone.
- [ ] `typecheck`, `lint`, `test` and `build` all pass with zero errors and zero warnings.
- [ ] No `any`, `as` (except `as const`), `!`, `@ts-ignore`, `@ts-expect-error` or `eslint-disable` in `src/`. Run `grep -rnE "\bany\b|@ts-|eslint-disable|\)!|\w!\." src` and explain any hits.
- [ ] Sample balances match section 4 exactly and sum to 0.
- [ ] Data survives a reload; corrupting localStorage by hand falls back to the sample data.
- [ ] Works at 360 px with no sideways page scroll; fully usable by keyboard.
- [ ] README ≤ 500 words with the AI section left for me.
