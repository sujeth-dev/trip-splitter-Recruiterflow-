# Walkthrough

Written for someone reading this code for the first time. It goes in build
order, so each section only relies on the ones above it.

---

## 1. Domain types, money and dates

**New files:** `src/domain/types.ts`, `money.ts`, `dates.ts` and their tests.

Nothing here imports React or Redux. It is plain TypeScript, so it runs in a
test without a browser and can be reasoned about on its own.

### types.ts

Just shapes. Two ideas carry their weight:

- `CATEGORIES` is a real array marked `as const`, and `Category` is *derived*
  from it with `(typeof CATEGORIES)[number]`. The list exists once, so adding a
  category updates the type, the dropdown and the filter together.
- `Split` is a **discriminated union**: three object types sharing a `type`
  field. Inside `case 'equal':` TypeScript knows `memberIds` exists and
  `shares` does not. `assertNever` sits in the `default:` branch; if a fourth
  split type is ever added, the value stops being `never` and that line becomes
  a compile error until every switch handles it.

### money.ts

Every amount is an **integer number of paise**. ₹1,250.50 is `125050`.

`parseRupeesToPaise` deliberately avoids `parseFloat(text) * 100`, because that
returns `125049.99999999999`. It splits the string on the dot, pads the decimal
part to two digits on the *right* (so `0.5` is 50 paise, not 5) and combines
with integers. It returns `{ ok: true, paise }` or `{ ok: false, reason }`, so
the compiler forces the caller to handle failure before it can reach a number.

`formatINR` passes only the whole rupees to `Intl.NumberFormat('en-IN')` for
2-2-3 grouping and pads the paise by hand, giving `₹1,00,000.00`.

### dates.ts

Dates are the string `'YYYY-MM-DD'`, never a `Date`. A `Date` is an instant and
carries a timezone; an expense happened on a calendar day. `todayLocalISO`
builds the string from `getFullYear/getMonth/getDate` rather than
`toISOString()`, which in India reports *yesterday* between midnight and 5:30am.

**Questions a reviewer might ask**

1. *Why not just use floats and round at the end?* Because the rounding error
   compounds. Five expenses split three ways is fifteen roundings, and the
   balances stop summing to zero.
2. *Why a result type instead of throwing?* A thrown error is invisible to the
   type system; a result type makes the failure a branch you must write.
3. *What does `as const` actually do?* It stops TypeScript widening the string
   literals to `string`, which is what makes the derived union possible.
4. *Why `padEnd` and not `padStart` on the decimals?* `'0.5'` means five
   *tenths* of a rupee. Padding left would turn it into 5 paise.

---

## 2. Splitting and balances

**New files:** `src/domain/split.ts`, `balances.ts` and their tests.

`allocateByWeights` is the paisa rule, written once:

> Shares are rounded down to whole paise. The leftover paise are handed out one
> at a time, in trip-member order, skipping anyone whose share is 0.

Rounding down and *then* distributing the remainder is what guarantees the
shares add up. Rounding each share to the nearest paisa independently does not.
Equal splits use weight 1 each; percentage splits use basis points as the
weight; exact splits skip it entirely, since there is nothing to round.

`computeBalances` is then two lines of bookkeeping per expense: credit the payer
the full amount, debit each participant their share. Because every expense's
shares sum to its amount, every rupee added is removed again, so the balances
always sum to exactly zero. The payer does not need to be in the split.

**Questions a reviewer might ask**

1. *Why is the leftover handed out in member order and not randomly?* So the
   result is deterministic and testable. The same input always gives the same
   split.
2. *Can the integer maths overflow?* `amount × weight` is at most 10⁸ × 10⁴ =
   10¹², and `Number.MAX_SAFE_INTEGER` is about 9 × 10¹⁵.
3. *How do you know it is right?* The test asserts the five sample balances to
   the paisa, asserts they sum to 0, and checks that shares equal the amount for
   every value from 1 to 500 paise across two split types.
4. *Why skip zero-weight members?* Someone on a 0% share should not be handed a
   stray paisa.

---

## 3. Validation

**New file:** `src/domain/validation.ts` and its test.

`ExpenseDraft` is all strings, because that is what an `<input>` holds.
Converting on every keystroke would fight the user — you could never clear a box
or type `1.` on the way to `1.5`.

`validateExpenseDraft(draft, members, today)` is pure: no React, no store, no
clock. `today` is a parameter so tests pin it and never go stale. It returns
`{ ok: true, expense }` or `{ ok: false, errors }`.

Two details worth noticing. Percentages are validated with the *money* parser,
because "two decimal places scaled by 100" is the same job — 33.33% becomes 3333
basis points exactly as ₹33.33 becomes 3333 paise, so the "totals 100" check is
pure integer arithmetic. And at the end the function re-checks each piece
individually rather than trusting that an empty error object implies they are
all set; that re-check is what lets TypeScript narrow them away from `null`
without a single `!` or cast.

**Questions a reviewer might ask**

1. *Why not a validation library?* The brief forbids one, and the rules are
   specific enough that a schema would need escape hatches anyway.
2. *Why pass `today` in?* A function that reads the clock cannot be tested
   deterministically.
3. *Why re-check at the end instead of a boolean flag?* A flag tells the
   compiler nothing. Re-checking narrows the types.
4. *Where does the error summary wording come from?* `summariseErrors`, which
   walks a list of fields in form order so the summary reads top to bottom.

---

## 4. Loading and saving data

**New files:** `src/domain/parseTripData.ts`, `src/data/sampleTripData.ts`,
`src/store/persistence.ts` and their tests.

Anything from outside the program is `unknown`. `parseTripData` checks every
field at runtime and returns `TripData | null` — no `as` anywhere. If one thing
is wrong the whole document is rejected, because half-trusted data is worse than
none.

The bundled sample JSON goes through the *same* parser. That is not paranoia:
TypeScript widens a JSON import, typing `"type": "equal"` as `string` rather
than the literal the union needs. Parsing it both proves the file is well formed
and narrows it properly. If it ever fails, the app throws at startup with a
clear message.

`loadTripData` falls back to the sample data on every possible failure: nothing
saved, storage blocked by a privacy mode, text that is not JSON, or JSON of the
wrong shape. It depends on a two-method `SimpleStorage` type, so tests hand it a
plain object and never touch a real browser store.

**Questions a reviewer might ask**

1. *Why reject the whole document rather than skip the bad expense?* Because a
   partially loaded trip shows wrong balances with no indication anything is
   missing.
2. *Why version the storage key?* Bumping `v1` to `v2` makes old browsers fall
   back to sample data instead of loading a shape the new code cannot read.
3. *Why check that exact shares add up?* They are used without rounding, so a
   document that does not add up would quietly break the sum-to-zero promise.
4. *Why does saving return a boolean?* A full disk should not stop you adding an
   expense.

---

## 5. The Redux store

**New files:** `src/store/index.ts`, `membersSlice.ts`, `expensesSlice.ts`,
`selectors.ts`, `hooks.ts`, `browserStore.ts` and `store.test.ts`.

The store holds **only** `members` and `expenses` — which is exactly `TripData`,
so loading and saving need no translation. Everything else is derived in
`selectors.ts` with `createSelector`: balances, totals, the newest-first list.
Derived state that is stored can disagree with its source; derived state that is
computed cannot.

Expense ids are made with `crypto.randomUUID()` in the page, never in the
reducer, because a reducer must be a pure function of its arguments.

localStorage is written in exactly one place: `connectPersistence` subscribes to
the store and saves only when `members` or `expenses` has changed *by reference*.
Immer only replaces an array that actually changed, so an unrelated dispatch
costs nothing.

**Questions a reviewer might ask**

1. *Why is the live store in its own file?* So that importing `makeStore` in a
   test never creates it as a side effect and touches real storage.
2. *Isn't `state.push` a mutation?* Redux Toolkit wraps reducers in Immer; the
   mutation is recorded against a draft and applied to a new array.
3. *What breaks the tie when two expenses share a date?* Position in the store,
   newest first — so an expense you just added for today appears above one that
   was already there.
4. *Why `useAppSelector` instead of `useSelector`?* It is pre-typed with
   `RootState`, so a typo in a slice name is a compile error.

---

## 6. Routing and layout

**New files:** `src/App.tsx`, `App.module.css`, `components/Navbar.tsx`,
`pages/NotFoundPage.tsx`, `test/renderWithProviders.tsx`, `App.test.tsx`.
`main.tsx` is updated.

`App.tsx` exports the routes only; the Router itself lives in `main.tsx` and, for
tests, in `renderWithProviders`. That is what lets a test start on any URL
without touching the address bar.

The navbar uses `NavLink`, which sets `aria-current="page"` itself. The CSS
styles that attribute directly, so what a sighted user sees and what a screen
reader announces come from the same source and cannot drift.

`renderWithProviders` builds a **fresh store per test**, so tests share no state
and can run in any order.

**Questions a reviewer might ask**

1. *Why not put `BrowserRouter` in `App`?* A test would then be stuck with the
   real URL bar. Separating them allows `MemoryRouter`.
2. *Why `end` on the Expenses link?* Without it, `/` matches every route and
   both links would look active.
3. *How does `*` work?* It matches anything the earlier routes did not, inside
   the same layout, so the 404 still has a navbar.

---

## 7. The expenses page

**New files:** `pages/ExpensesPage.tsx` + styles + tests, and the components
`Hero`, `BalanceTickets`, `CategoryFilter`, `ExpenseTable`, `EmptyState`,
`FlashMessage`, `ConfirmDialog`.

Three pieces of state live in the component, not Redux: the active filter, the
row pending deletion, and whether the flash has been dismissed. None is needed
by another page and all should reset on leaving.

The "added" message arrives as router state, which is `unknown`, and is read
through the `readAddedDescription` type guard. Dismissing it also replaces the
history entry so a reload does not show it again.

The receipt is one real `<table>` at every width. Below 640px CSS turns each row
into a card. Because changing `display` on table elements strips their
semantics, every element carries an explicit ARIA role so it is still announced
as a table. There is no second copy of the markup for mobile.

Deleting uses the native `<dialog>` with `showModal()`, which gives focus
trapping, Escape-to-close and a backdrop for free. jsdom does not implement
those two methods, so `src/test/setup.ts` — and only that file — supplies
minimal stand-ins. After a delete, focus moves to the bill heading so a keyboard
user is not dumped at the top of the document.

**Questions a reviewer might ask**

1. *Why `aria-pressed` on the filter buttons rather than radios?* Nothing
   navigates and nothing is submitted; they are toggles.
2. *Why is the balance bar `aria-hidden`?* It repeats what the text already
   says. A screen reader should not hear it twice.
3. *What happens to the balances when a row is deleted?* They are derived, so
   they are simply recomputed on the next render — the test asserts it.
4. *Why keep the tilt off under `prefers-reduced-motion`?* Some people find
   rotated text uncomfortable; the tilt is decoration.

---

## 8. The add expense page

**New files:** `pages/AddExpensePage.tsx` + styles + tests.

The whole form is one `ExpenseDraft` in `useState`. On every render it is run
through `validateExpenseDraft`, but the errors are only *shown* once Save has
been pressed — shouting about an empty box someone has not reached yet is not
helpful; after a failed save, live feedback is.

Failed saves are counted rather than flagged, so a second failure can send focus
back to the summary again. The focus move happens in a `useEffect`, not in the
submit handler: the summary is not in the DOM until React has re-rendered with
the new errors.

Every input has a visible `<label>`, `aria-invalid` when it is wrong, and
`aria-describedby` pointing at the message directly beneath it. The split type is
a `<fieldset>` of real radios styled as buttons, so arrow keys work natively.

**Questions a reviewer might ask**

1. *Why `noValidate` on the form?* So the browser's own bubbles do not compete
   with our messages, which are positioned, styled and announced properly.
2. *Why is `today` captured in `useState` and not `useRef`?* It is read during
   render, and reading a ref during render is a React rule violation (the lint
   rule catches it).
3. *Why does Cancel check `location.key`?* `'default'` means this is the first
   history entry, so `navigate(-1)` would leave the app.
4. *Where does the id come from?* `crypto.randomUUID()` in the submit handler,
   keeping the reducer pure.

---

## 9. Responsive and accessibility pass

What I checked, and what it changed.

**Widths.** 360px, 768px and 1280px.
- The category strip scrolled the whole page sideways at 360px because of
  negative margins; it now scrolls inside itself.
- The receipt's total row sat in a half-collapsed table on phones; the table,
  body and foot are now block-level together below 640px.
- The dotted leader between a member's name and their share box was claiming a
  grid cell on narrow screens and breaking the two-column layout; it is now
  hidden until there is room for it.
- `html { overflow-x: hidden }` is a backstop, not the fix.

**Keyboard only.** Tab and Shift+Tab reach every control in visual order; arrow
keys move within the split-type radio group; Space toggles the member
checkboxes and the filter buttons; Enter submits the form; Escape closes the
delete dialog, which is handled explicitly so React's state stays in step with
the DOM. Focus is visible everywhere via the global `:focus-visible` ring.

**Labels and roles.** Every input has a visible label. Errors sit next to their
field and are wired with `aria-describedby`. The error summary is
`role="alert"` and receives focus. The flash is `role="status"`. The table keeps
explicit roles at all widths. Decorative things — the awning, the zigzag, the
balance bars, the ₹ prefix, the 404 badge — are `aria-hidden`.

**Contrast.** White on cobalt, ink on ochre and muted grey on white all pass AA
comfortably. The destructive button is white on `--error-border`, which measures
about 4.8:1 — ink on that red would only reach 3.6:1, so white is the correct
choice there.

**Tap targets.** Everything pressable is at least 44px tall (`--tap`).

---

## 10. Docs and deployment

`README.md` (under 500 words), this walkthrough, `DECISIONS.md` and
`LIVE_CHANGE_DRILLS.md`. `vercel.json` rewrites every path to `index.html` so a
refresh on `/expenses/new` reaches the app rather than a host 404.

---

## Demo script (two minutes)

1. **Open the app.** "Five friends in Goa. The sticker is everything spent
   together — ₹42,249.99."
2. **Point at the tickets.** "Aqua means you get money back, pink means you owe.
   Aarav gets back ₹18,554.20. These always add up to exactly zero, and they're
   calculated, never stored."
3. **Filter to Food.** "Two rows, and the total underneath follows the filter,
   not the trip."
4. **Press Other.** "Clear empty state with a way out."
5. **Delete Groceries.** "It names the expense, the payer and who's affected
   before doing anything. Confirm — the row goes and Meera's balance moves by
   the full ₹1,000 she paid, immediately."
6. **Add expense, press Save on the empty form.** "Four errors, each next to its
   field, and a summary at the top that takes focus. Nothing was saved."
7. **Fill it in, switch to Exact amounts, type two of three shares.** "It tells
   me exactly how much is left to assign, live."
8. **Finish it and save.** "Back to the bill, confirmation message, balances
   already updated."
9. **Reload the page.** "Still there — it's in localStorage. Corrupt that entry
   by hand and it falls back to the sample trip rather than crashing."

---

## File map

### Domain — pure TypeScript, no React or Redux

| File | What it does |
|---|---|
| `src/domain/types.ts` | Member, Category, the Split union, Expense, TripData, `assertNever` |
| `src/domain/money.ts` | Parse rupee strings to integer paise; format `₹1,00,000.00` and percentages |
| `src/domain/dates.ts` | `'YYYY-MM-DD'` helpers that never touch a timezone |
| `src/domain/split.ts` | The paisa rule, per-expense shares, and the Split column wording |
| `src/domain/balances.ts` | Paid minus owed per member, and how to word a balance |
| `src/domain/validation.ts` | The form draft type and the one pure validator |
| `src/domain/parseTripData.ts` | Runtime type guards turning `unknown` into `TripData \| null` |

### Data and store

| File | What it does |
|---|---|
| `src/data/sample-data.json` | The sample trip, exactly as given in the brief |
| `src/data/sampleTripData.ts` | Validates that JSON at startup and exports it typed |
| `src/store/index.ts` | `makeStore`, the state types, and the persistence subscription |
| `src/store/browserStore.ts` | The one live store, wired to the real localStorage |
| `src/store/membersSlice.ts` | The trip's people (no reducers — they never change) |
| `src/store/expensesSlice.ts` | `expenseAdded`, `expenseDeleted` |
| `src/store/selectors.ts` | Memoised derived state: sorted list, balances, totals |
| `src/store/persistence.ts` | `loadTripData` / `saveTripData` and the storage key |
| `src/store/hooks.ts` | `useAppDispatch`, `useAppSelector` |

### Components — each with a `.module.css`

| File | What it does |
|---|---|
| `Navbar.tsx` | Brand and the two `NavLink`s that mark the current page |
| `Hero.tsx` | Ochre header, awning and the optional "spent together" sticker |
| `BalanceTickets.tsx` | One tilted ticket per member with a diverging bar |
| `CategoryFilter.tsx` | Six `aria-pressed` toggle buttons |
| `ExpenseTable.tsx` | The receipt table that becomes cards below 640px |
| `EmptyState.tsx` | Shared layout for both empty states |
| `FlashMessage.tsx` | The `role="status"` confirmation with a dismiss button |
| `FieldError.tsx` | One field's message, rendered only when there is one |
| `ConfirmDialog.tsx` | Native `<dialog>` + `showModal()` |

### Pages, app and tests

| File | What it does |
|---|---|
| `src/pages/ExpensesPage.tsx` | Hero, balances, filter, receipt, empty states, delete flow |
| `src/pages/AddExpensePage.tsx` | The form, three split modes, live totals, validation |
| `src/pages/NotFoundPage.tsx` | "Page not found" and the way back |
| `src/App.tsx` | Layout and routes (no Router) |
| `src/main.tsx` | Provider + BrowserRouter + routes |
| `src/test/setup.ts` | jest-dom matchers, cleanup, and the `<dialog>` stand-ins |
| `src/test/renderWithProviders.tsx` | Render with a fresh store and a MemoryRouter |
| `vercel.json` | Rewrite every path to `index.html` for client-side routing |
