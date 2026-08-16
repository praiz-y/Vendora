---
target: admin section
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-13T10-18-59Z
slug: frontend-src-app-admin
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | 6 of 7 mutation flows (suspend, reactivate, approve, reject, archive, feature) give zero success confirmation — only Hero Slides shows one |
| 2 | Match System / Real World | 3 | Domain terms map cleanly to how an ops team actually talks |
| 3 | User Control and Freedom | 2 | "Suspend account" toggles a reveal-form via the same button but never relabels to "Cancel" |
| 4 | Consistency and Standards | 1 | Button's primary variant is black, never the brand orange used everywhere else; 3 UI primitives still carry pre-dark-mode-removal `dark:` classes while others were migrated |
| 5 | Error Prevention | 2 | Suspend/Reject require a typed reason; Category Archive (equally state-changing) requires neither reason nor confirmation |
| 6 | Recognition Rather Than Recall | 3 | Side-by-side list+detail and consistent status badges reduce recall load well |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts, no bulk actions, no sort, Previous/Next-only pagination |
| 8 | Aesthetic and Minimalist Design | 2 | Clean cards undermined by 1.32:1 border contrast — structure reads as under-designed |
| 9 | Error Recovery | 2 | Errors surface inline but as one global message, not field-level |
| 10 | Help and Documentation | 1 | Zero tooltips or contextual help anywhere in admin |
| **Total** | | **19/40** | **Poor** |

19/40 (47.5%) lands in the Poor band (12–19) — consistent with, and corroborating, your own 3/10 read.

## Design Specificity Verdict

**Design review**: This reads as a generic admin template with Naira currency and Nigerian domain nouns bolted onto otherwise placeholder-grade UI. The tell is the contrast with Vendora's own consumer-facing site — `globals.css` carries hand-tuned comments for a marquee announcement bar and a hero crossfade animation, real design investment that never crosses into `/admin`. Every list is the same bordered-card-with-badge pattern, the primary button is flat black rather than the brand's orange, Overview has zero data visualization beyond four identically-weighted stat tiles, and there's no motion anywhere. Strip the copy and this could be any CRUD-admin Tailwind starter kit. The one place it *is* genuinely authored is the master-detail URL architecture (see Strengths).

**Deterministic scan**: The static/regex CLI scan (`detect.mjs` against 37 files across `admin/`, `components/admin/`, `components/ui/`) came back **completely clean — 0 findings**. That's a real result, not a null one, but don't read it as "the UI passed": the static scanner works on source text and structurally cannot see computed styles, resolved CSS variables, or rendered layout — exactly the class of problem this UI actually has. Proof of the gap: `hero-slides/page.tsx` and `Dropzone.tsx` are both inside the scanned tree, and the static pass said nothing about them, yet rendering the page found a real, precisely-countable issue there (see below).

**Live browser evidence** (captured via an automated overlay pass, not a browser tab left open for you to look at directly): injecting the detector into the *rendered* Overview, Users, Products, and Hero Slides pages surfaced findings the static scan missed entirely:
- **`low-contrast` — white text on brand orange measures 3.9:1**, under the 4.5:1 AA minimum, on every page tested. Traced to source: the `bg-primary text-white` class combo is copy-pasted (not shared via a component) across 6 separate admin page files for the active status-filter tab.
- **`cream-palette` — background is `rgb(255,255,235)`** on every page. Confirmed exact: `globals.css`'s `--background: #ffffeb`.
- **`nested-cards` (×4) on Hero Slides** — each of the 4 slide cards (bordered, rounded, padded) contains a `Dropzone` whose own root is *also* bordered, rounded, and padded — a box nested inside an identically-styled box, 4 times. This is the same root problem the design review flagged independently as a cognitive-load "chunking" failure on that page.
- **`flat-type-hierarchy`** — type sizes cluster in a narrow 1.8:1 ratio band (10–18px) on every page.
- One finding, `text-occlusion` on the Users detail panel (sidebar nav reported as covering "low contrast text" 78%), traced the *occluder* to the real sidebar component exactly, but the *victim* text couldn't be located anywhere in the source — likely dynamic/seeded content or a text-extraction artifact. Flagging as unresolved rather than asserting it's real or a false positive.

## Overall Impression

Functionally competent, visually unfinished. The underlying architecture — URL-driven master-detail, status-gated actions, a real design-token system — is sound and in places genuinely well-engineered. But the execution stalled partway through: one shared `Button` component was never brought onto the brand's own color, three UI primitives were never migrated off pre-dark-mode-removal styling, contrast wasn't checked anywhere, and *every* mutation in the app except one gives the admin zero feedback that it worked. The single biggest opportunity is also the cheapest to fix: there's an unused `Toast` component already sitting in this codebase, unimported into `/admin` — wiring it into every mutation's `onSuccess`/`onError` would move the heuristic score more than almost anything else on this list, for a fraction of the effort.

## What's Working

1. **URL-driven master-detail (`useAdminDetailSelection`)** — the selected row lives in `?id=`, not local state, so the drill-down is shareable, survives refresh, and browser back/forward works naturally while other filters are preserved. A deliberate architectural decision, not copy-pasted boilerplate.
2. **`ProductDetail`'s real image gallery** — replaced a raw comma-joined URL string with actual thumbnails, directly fixing a named workflow blocker ("an admin deciding whether to approve a product currently can't see the product"). Concrete and need-driven.
3. **`Badge` component** — every status badge pairs color with a text label, and all five variants measured 4.8–6.8:1 contrast — genuinely accessible, the one part of the design system fully executed.

## Priority Issues

**[P0] Zero confirmation on financially/administratively irreversible-feeling actions, while lower-stakes actions require more friction.**
- **Why it matters**: "Approve & Process" on a refund fires immediately on a single click — a real payment-provider action with no recovery step — while Category "Archive" (fully reversible via a separate Activate toggle) gets the same unconfirmed single-click treatment. Meanwhile "Reject," which reverses nothing, is gated behind a typed reason. The friction budget is inverted relative to actual stakes.
- **Fix**: gate refund-approve and account/store-suspend behind an explicit confirm step sized to their real consequence; give Archive the same reason-field treatment Suspend/Reject already have.
- **Suggested command**: `/impeccable harden`

**[P0] Keyboard and screen-reader users get trapped or lost in navigation chrome.**
- **Why it matters**: the account-menu dropdown has no `aria-expanded`/`aria-haspopup`/`role="menu"`, closes only via a `mousedown` listener with no `Escape` handler and no focus trap — a keyboard-only admin who opens it has no keyboard way to close it. The mobile nav sheet is the last element in the layout's DOM order (after all page content) with no focus trap and no `inert`/`aria-hidden` on the background while open — tabbing forward after opening it keeps moving through the now-hidden page instead of reaching the sheet. This blocks task completion outright for that user population, not just an inconvenience.
- **Fix**: add `aria-expanded`/`aria-haspopup`/`role="menu"` and an `Escape` handler to the account menu; move focus into the mobile sheet on open and trap it there, marking the background `inert` while it's open.
- **Suggested command**: `/impeccable audit`

**[P1] Silent success on nearly every mutation.**
- **Why it matters**: suspend, reactivate, approve, reject, archive, and feature/unfeature all give zero explicit confirmation — the admin infers success only from a badge quietly changing color. This invites duplicate clicks and erodes trust, and it's a total blocker for screen-reader users since there's no `aria-live` region anywhere in `/admin`.
- **Fix**: this codebase already has a `Toast` component used elsewhere in the app — it's simply never imported into `/admin`. Wire it into every mutation's `onSuccess`/`onError`.
- **Suggested command**: `/impeccable polish`

**[P1] Real, measured WCAG contrast failures, plus an unfinished brand/token migration.**
- **Why it matters**: white text on the brand orange measures 3.9:1 against a 4.5:1 requirement, on every active status tab, duplicated across 6 files. Card/table borders measure 1.32:1 against a 3:1 requirement for UI boundaries — cards read as nearly borderless in the actual screenshots. Active sidebar/tab text measures 3.49:1 against 4.5:1. Underneath all three: the shared `Button` component's "primary" variant renders plain black and never uses the brand orange at all, while `Textarea`, `FormMessage`, and `Button`'s secondary variant still carry classes from before the app's dark-mode removal, even though `TextField`, `Badge`, and `Dropzone` were fully migrated to the token system.
- **Fix**: darken `--color-border` and increase contrast on the active-nav text/background pairing; finish the token migration on `Button`/`Textarea`/`FormMessage`; decide deliberately whether `Button`'s primary variant should actually be the brand orange.
- **Suggested command**: `/impeccable audit`

**[P2] No bulk actions, sort, or keyboard shortcuts anywhere, and filters reset on navigation.**
- **Why it matters**: an admin triaging a queue of 50 pending products must open, click, and reload 50 times with no way to select-and-batch; Users/Products/Audit Log have no column sort; status/search filters live in component `useState` rather than the URL, so leaving a filtered list and returning resets it to the default tab.
- **Fix**: add checkbox multi-select + bulk approve/reject on Products/Product Reports/Refunds, basic sort on Audit Log/Users, and move list filters into the URL alongside the existing `?id=` pattern.
- **Suggested command**: `/impeccable shape`

## Persona Red Flags

**Alex (Power User)**: No keyboard shortcuts anywhere — no row navigation, no keyboard-driven approve, everything is mouse-click-through. No bulk select/approve on any list. No sort on Users, Products, or Audit Log. Pagination has no jump-to-page or page-size control. Status/search filters reset on navigation since they live in component state, not the URL — forcing Alex to re-select "Pending Review" or retype a search term every session. No quick-reason presets for reject/suspend, so even the reason Alex types every time has to be typed out in full.

**Sam (Accessibility-Dependent)**: The account-menu dropdown and mobile nav sheet both fail keyboard/focus handling as described above (P0). Zero `<h1>` anywhere under `/admin` — every page jumps straight to `<h2>`, giving screen readers a flat, ambiguous heading outline with no page-title landmark. No `aria-live` region anywhere, so the one success message that does exist (Hero Slides' "Slide updated.") is silent to assistive tech. Border and active-nav-text contrast both measured under WCAG minimums (numbers above, not a hunch). One genuine counterpoint: status badges pair color with text and measure 4.8–6.8:1, so core *data* legibility is fine — the failures concentrate in interactive chrome (menus, nav, borders), not in reading the data itself.

## Minor Observations

- The Naira glyph (₦) at small sizes visually resembles a strikethrough over the following digit (e.g. "₦42000" in the Products list) — a font-rendering quirk, not a functional bug.
- On the Users detail panel, "View store" is a bare text link sitting inline with two padded buttons — inconsistent tap-target sizing, visibly cramped at 390px.
- Category "Archive" uses the same red "danger" button weight as "Suspend account," despite archiving being reversible and suspension being far higher-stakes — identical visual alarm level for two very different consequences.
- Only the Users list has a search box; Products, Product Reports, Refunds, and Seller Applications rely on status tabs alone.
- Hero Slides has 4 independently-saved forms with no page-level "unsaved changes" warning if you edit two cards but only save one.
- Type sizes cluster in a narrow 1.8:1 ratio (10–18px) across every page tested — a flatter hierarchy than the content actually needs.

## Questions to Consider

- If every primary action in admin (Save, Approve, Reactivate) renders black rather than the brand's Naira-orange, what is the orange actually *for* in this surface — a deliberate reservation for "needs attention," or an accident of which components got migrated to the token system and which didn't?
- The consumer-facing site earned a hero carousel, a marquee, and a crossfade animation; the admin got flat cards and no motion at all. Is "back-office tools should look boring" a real decision here, or did the admin section simply run out of design budget — and does that answer change once you remember an ops team spends hours a day in this tool?
- Approving a refund moves real money in one unconfirmed click, while rejecting it (which reverses nothing) requires typing a reason first. Was that friction budget allocated by how hard each flow was to build, or by how much it should actually cost to get wrong?
