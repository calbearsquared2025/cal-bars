# Cal Golden Bars Brand Standards

**Status:** Working brand reference derived from the current CGB v2 implementation and approved assets  
**Version:** 2026-08-25

## 1. Purpose

This document centralizes the visual and verbal standards already established by the Cal Golden Bars product. It is a reference for the website, social/share graphics, Google Forms, and other CGB-owned surfaces.

It does **not** create a new identity system. When this guide conflicts with the current implemented product, approved production asset, or a later explicit product decision, the current implementation/approved decision wins and this guide should be updated.

## 2. Source references

Primary implemented references:

- `assets/cgb-mark.svg` — approved production logo mark.
- Approved supplied master logo: `Bear Logo.svg`.
- `css/design-system.css` — canonical implemented color and typography tokens.
- `scripts/generate-social-cards.mjs` — established social/share graphic composition.
- Current site header — approved compact lockup treatment with the gold mark and white `CAL GOLDEN BARS` name.
- Product Specification / Decision Log — semantic visual treatments for Watch Parties, Cal Bars, and Community Locations.

Do not infer a new logo, mascot, badge, bridge illustration, or decorative identity from older or experimental artwork.

## 3. Brand character

CGB should feel:

- clear and useful first;
- distinctly Cal without imitating official Cal Athletics branding;
- confident, restrained, and contemporary;
- fan-made and community-oriented without looking amateur;
- map-centric and information-led rather than decorative.

Avoid unnecessary visual spectacle. The product's strongest identity comes from the approved mark, navy/gold palette, crisp typography, and direct fan language.

## 4. Logo

### Approved mark

Use the approved CGB mark exactly as supplied in `assets/cgb-mark.svg` / the approved `Bear Logo.svg` master.

### Allowed uses

- Mark alone when space is constrained.
- Mark paired with `CAL GOLDEN BARS`.
- Mark paired with the brand name and the established line `FIND YOUR CAL CROWD` on branded marketing/external graphics when space permits.

### Lockup behavior

For the primary application/header lockup:

- approved mark in its native gold/navy treatment;
- `CAL GOLDEN BARS` in white on a dark navy field;
- uppercase, bold sans serif;
- generous but not exaggerated tracking.

For social/share graphics, the existing generator may use gold brand text where that treatment is already implemented. Do not treat that as permission to invent additional color lockups.

### Clear space

Keep at least roughly one-quarter of the mark's width free around the mark. Do not crowd it with borders, form titles, icons, or edge crops.

### Do not

- redraw or regenerate the mark with AI;
- substitute a different bear, paw, bridge, crest, badge, or mascot;
- stretch, skew, rotate, outline, bevel, emboss, or add glow effects;
- recolor individual internal parts unless an explicitly approved production variant exists;
- place the mark on visually busy photography without a deliberate high-contrast container.

## 5. Color system

### Primary colors

| Token / role | Hex | Use |
|---|---|---|
| Navy 950 | `#06152F` | Deep branded surfaces, social/external graphics |
| Navy 900 | `#071E41` | Primary Cal Bar / UI navy |
| Navy 800 | `#0A2D57` | Supporting navy |
| Navy 700 | `#123F73` | Muted dividers and secondary navy |
| Gold 400 | `#FDB515` | Primary gold accent / Watch Party emphasis |
| White | `#FFFFFF` | Primary type on navy |

### Supporting colors

| Role | Hex |
|---|---|
| Navy 100 | `#DCE7F3` |
| Navy 50 | `#EEF4FA` |
| Ink 900 | `#121A28` |
| Ink 700 | `#354052` |
| Ink 500 | `#657083` |
| Neutral 300 | `#CFD5DD` |
| Neutral 200 | `#E2E6EB` |
| Neutral 100 | `#EDF0F3` |
| Neutral 50 | `#F7F8F9` |
| Warm 50 | `#FBFAF7` |

### Semantic color rules

These meanings are product rules, not decoration:

- **Watch Party:** gold star or equivalent gold event treatment.
- **Cal Bar:** solid navy location treatment.
- **Community Location:** outlined location treatment.

Do not use gold indiscriminately. Gold should signal brand emphasis, a primary action, or Watch Party/event status. Navy carries most structural brand weight.

## 6. Typography

### Product UI

The implemented UI stack is:

`"Avenir Next", Avenir, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif`

Use it for application controls, labels, cards, navigation, data, and most product copy.

### Display/editorial

The implemented display stack is:

`"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif`

Use only where the current product already uses editorial/display typography. Do not introduce serif type into utility interfaces or Google Forms solely for decoration.

### Google Forms and external utility surfaces

Use **Inter** consistently for:

- Header
- Question
- Text/helper copy

Recommended hierarchy:

- Header: Inter Bold / largest available size
- Question: Inter Medium or Semi Bold
- Text: Inter Regular

The visual distinction should come from size, weight, spacing, and color—not from mixing unrelated font families.

### Case and tracking

- Brand name: `CAL GOLDEN BARS` in uppercase.
- Eyebrows and compact category labels may use uppercase with restrained letter spacing.
- Body copy and questions use normal sentence case.
- Avoid all-caps paragraphs.

## 7. Layout and composition

### General

- Favor clean geometric alignment and strong whitespace.
- Keep content density appropriate for mobile first.
- Use one dominant hierarchy per surface.
- Do not add decorative objects simply to fill empty space.
- Avoid ornamental collegiate, vintage-sports, skyline, bridge, stadium, or texture treatments unless they are already part of an approved production asset.

### Dark branded surfaces

Default branded graphic treatment:

- flat Navy 950 (`#06152F`) background;
- approved CGB mark;
- white primary brand text;
- gold as the accent;
- optional Navy 700 (`#123F73`) divider;
- no gradients unless reproducing an already approved product treatment.

## 8. Google Forms

CGB Google Forms should look like one family.

### Theme

- Font: Inter
- Theme color: CGB navy
- Page/background: white or very light neutral
- Header image: one reusable CGB-branded image across forms unless a specific exception is approved

### Header image standard

- Canvas: **1600 × 400 px**
- Background: Navy 950 `#06152F`
- Use the exact approved logo mark
- Primary lockup: `CAL GOLDEN BARS` in white
- Optional supporting line: `FIND YOUR CAL CROWD` in gold
- Keep all important content comfortably inside the central crop-safe zone
- Keep the form-specific title out of the image; Google Forms provides the title below it
- Do not create a different illustrated banner for each form

### Form copy

Form titles and questions should be direct and descriptive. Helper text should be concise and explain only what the user needs to know.

When privacy matters, state it locally and plainly, for example `Your email (optional, kept private)`.

## 9. Social and share graphics

The current social-card generator is the composition reference.

Established characteristics:

- flat navy field;
- approved mark as a strong left-side anchor;
- bold sans-serif typography;
- white and gold hierarchy;
- restrained muted-navy divider;
- one clear headline;
- concise supporting text;
- no stock photography or invented decorative illustration.

Generated game cards may contain game-specific metrics and titles. Generic brand graphics should remain simpler.

## 10. Photography

Venue photography supports the map/profile experience; it should not replace the identity system.

Use:

- authentic venue and fan-environment photography;
- images with permission to publish;
- natural color and recognizable atmosphere;
- crops that work in the product's existing 3:2 presentation.

Avoid:

- heavy filters;
- fake crowd additions;
- AI-generated venue scenes presented as real places;
- unrelated stock photography;
- screenshots or images with unnecessary private information.

Photo credit and optional credit links follow the product's existing publication workflow.

## 11. Voice and copy

CGB language is practical, specific, and fan-facing.

Preferred established language includes:

- `Find your Cal crowd`
- `I'll be here`
- `Watch Party`
- `Cal Bar`
- `Community Location`
- `Bears`

### Voice rules

- Tell users what they can do.
- Prefer natural language over database or moderation language.
- Keep calls to action short.
- Use positive contribution framing.
- Distinguish permanent venue identity from game-specific Watch Parties.
- Do not imply automatic review/approval when the workflow is manual.
- Do not imply CGB is affiliated with Cal Athletics.

Avoid generic marketing filler, exaggerated hype, corporate jargon, and unnecessary disclaimers.

## 12. Accessibility

- Maintain strong contrast, especially white/gold on navy.
- Never rely on color alone for venue/event meaning; pair color with shape, label, icon, or text.
- Keep body text readable on mobile.
- Preserve visible keyboard focus treatment in the application.
- Decorative image content should not carry information that is unavailable in text.
- External forms should remain easy to complete on mobile and should not use dense header artwork that competes with the form title.

## 13. Quick do / don't reference

### Do

- Use the approved CGB logo exactly.
- Use Navy 950/900, Gold 400, white, and the implemented neutral system.
- Use white `CAL GOLDEN BARS` in the primary header/utility lockup.
- Use Inter for Google Forms.
- Keep graphics flat, restrained, and crop-safe.
- Use the social-card generator and current site header as composition references.
- Preserve Watch Party / Cal Bar / Community Location visual semantics.

### Don't

- Invent alternate CGB logos or mascots.
- Add arbitrary bridges, city skylines, crests, stars, stadiums, textures, bevels, or metallic effects.
- Use gold as the default color for every heading or surface.
- Mix decorative fonts into utility forms.
- Overfill banners with copy.
- Use old planning screenshots as visual authority when they differ from the current product.
- Change product terminology just to fit a graphic.

## 14. Maintenance

When the implemented design system materially changes, update this document in the same milestone/PR.

For visual implementation questions, inspect in this order:

1. current production/review branch implementation;
2. approved logo/master assets;
3. `css/design-system.css`;
4. `scripts/generate-social-cards.mjs`;
5. applicable Product Specification / Decision Log rules;
6. this guide.

This document records the existing system; it should follow approved implementation, not supersede it.
