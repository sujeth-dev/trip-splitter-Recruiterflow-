# Live change drills

Six small changes a reviewer might ask for on the call. Each lists the files to
touch and a hint — no code, so practising them is worth something.

---

## 1. Add a category called "Shopping"

**Files:** `src/domain/types.ts`, and a colour in `src/styles/tokens.css` plus the
two stylesheets that map category names to colours.

**Hint:** `CATEGORIES` is the single source of truth and `Category` is derived
from it with `as const`, so one word in that array updates the type, the form's
`<select>` and the filter buttons at once. What it cannot do is invent a colour:
the chip classes are named after the categories in
`src/components/CategoryFilter.module.css` and
`src/components/ExpenseTable.module.css`, and a new one needs a matching token.
Afterwards, ask yourself what should happen to an expense already saved under a
category you later remove — `parseTripData` would reject the whole document.

---

## 2. Change the description limit to 40 characters

**Files:** `src/domain/validation.ts` (and the test that pins it).

**Hint:** there is one constant for this, and the error message is built from it
with a template string, so the message follows the number automatically. The
test asserting that 60 passes and 61 fails will fail until you update it — that
is the test doing its job. Check whether anything else mentions 60.

---

## 3. Give the extra paisa to the payer instead

**Files:** `src/domain/split.ts`, and whatever calls into it.

**Hint:** the remainder loop in `allocateByWeights` walks `memberOrder` and hands
out one paisa at a time. To favour the payer, that function needs to know who
the payer is — look at what `computeShares` already has in hand and what it
passes down. Keep the skip for anyone whose weight is 0, and keep the rule that
the payer only gets a paisa if they are actually in the split. The test that
checks shares always sum to the amount should still pass untouched; the ₹100 ÷ 3
test will need new expected values.

---

## 4. Show "settled up" in grey

**Files:** `src/components/BalanceTickets.module.css` (and possibly
`src/styles/tokens.css`).

**Hint:** `describeBalance` already returns a `kind` of `'settled'`, and the
component maps that kind to a class through `TONE_CLASS`. The class exists and
currently paints the ticket white. You should not need to touch any `.tsx`.
Add the grey as a token rather than hard-coding a hex value, and check the text
still has enough contrast against it.

---

## 5. Add an optional "Notes" field

**Files:** `src/domain/types.ts`, `src/domain/validation.ts`,
`src/domain/parseTripData.ts`, `src/pages/AddExpensePage.tsx`, and wherever you
decide to display it.

**Hint:** optional is the interesting part. The field is optional on `Expense`,
but the draft still holds a string, because an empty input is `''` and not
`undefined` — decide where that conversion happens. `parseTripData` must accept
documents saved before the field existed, so a missing note is valid while a
note that is not a string is not. Give the input a visible label like every
other field, and decide whether an over-long note is an error or simply
truncated on the table.

---

## 6. Sort the table oldest first

**Files:** `src/store/selectors.ts` (and its test).

**Hint:** one comparator, in one memoised selector. Think about the tie-break as
well as the dates: if the list now reads oldest first, should two expenses on
the same day still show the most recently added at the top, or should that flip
too? Whatever you choose, the receipt header says "newest first" in
`src/pages/ExpensesPage.tsx` and would be lying. A reviewer may follow up by
asking you to make the direction a toggle — where would that state live, and
why not in Redux?
