# Decisions

Assumptions and judgement calls made beyond what the brief specified.

## Where the brief and the mockups disagree

**Table column order.** The mockups show `Date, Description, Category, Paid by, Split, Amount`. The brief requires `Date, Description, Category, Paid by, Amount, Split`. The brief wins, so Amount sits before Split.

**Tie-break on the expenses list.** The brief says same-date expenses show the most recently added first. The mockup happens to show the sample data in its original file order, which is the opposite for the two 13 March rows. The brief wins: position in the store is the tie-breaker, newest first. It matters in practice — add an expense dated today when one already exists for today, and yours appears on top.

## Parsing and validation

**Order of amount checks.** The parser checks the shape of the string, then the sign, then the number of decimals. So `-1.234` reports "negative" rather than "too many decimals": being below zero is the more fundamental problem, and it means any numeric-looking negative always gives the same message.

**Zero and negative share a message.** Both `0` and `-5` produce "Amount must be more than ₹0". To someone filling the form they are the same mistake, and the brief fixes that wording for negatives.

**A malformed date reports "Date is required".** The brief gives only two date messages. A native date input yields either a valid date or an empty string, so a malformed value can only come from a hand-edited DOM; sending it down the "required" path keeps the message set to the two the brief names.

**Empty share boxes count as zero.** In exact and percentage splits an empty box is read as 0 rather than an error, so a split between three of five people needs no typing for the other two. A box with unreadable text in it is still an error.

**Percentages reuse the money parser.** "A number with at most two decimal places, scaled by 100" is the same job for ₹33.33 → 3333 paise and 33.33% → 3333 basis points. One parser means one set of rules and one place to fix a bug.

## Data

**Stored data is validated strictly.** `parseTripData` rejects a document if any part of it is wrong, including exact shares that do not add up to the amount and percentages that do not total 100. Those two checks are stricter than the brief asks for, but they protect the promise that balances always sum to zero: an exact split is used without rounding, so a document that does not add up would silently break it. Anything rejected falls back to the sample data.

**Referential integrity is checked too.** A payer or split member who is not on the trip makes the document invalid, rather than being silently dropped.

## Structure

**The live store lives in `store/browserStore.ts`, not `store/index.ts`.** The brief's layout puts the singleton in `index.ts`. Splitting it out means importing `makeStore` — which every test does — never creates the real store as a side effect, so no test can touch the browser's actual localStorage by accident. `makeStore`, the types and `connectPersistence` are all still in `store/index.ts`.

**ARIA roles are written out on the table.** The receipt table collapses into cards below 640px by changing `display` on its rows and cells. That change strips a table's built-in semantics in most browsers, so each element carries its explicit role (`table`, `rowgroup`, `row`, `columnheader`, `rowheader`, `cell`) to keep it announced as a table at every width. There is still only one table in the DOM.

**`today` is read once per page visit.** The Add expense page captures the date on its first render via `useState` with an initialiser, so the form cannot shift underneath someone who has it open at midnight.

## Deployment

**`vercel.json` rewrites everything to `index.html`.** This is a single-page app, so without the rewrite a refresh on `/expenses/new` would ask the host for a file that does not exist and return a 404 instead of the app's own "Page not found" screen.
