---
name: makers-klub-design
description: Use this skill to generate well-branded interfaces and assets for Makers Klub, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping the Makers Klub landing page and members-app.
user-invocable: true
---

# Makers Klub Design Skill

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Direction
Makers Klub uses a **light editorial direction** — cream surface (`#f5f1ea`), navy ink (`#0f1e3d`), ochre action (`#f4a833`), lavender italic accent (`#cdbcf5`). Headlines are heavy serif (Fraunces 800, Recoleta substitute) with italic `<em>` accents that get a hand-drawn underline. Body is Inter.

## Quick reference

- **Brand colors:** blue `#013dc4`, lavender `#e2d3f4`, ink `#080810`, cream `#f5f3ef`. See `colors_and_type.css`.
- **Fonts:** Fraunces (display, weight 200–300, italic accents in lavender), DM Sans (app body), Inter (landing body). All Google Fonts.
- **Signature move:** every display headline contains an `<em>` for the punchline noun phrase, rendered in italic Fraunces in lavender. Don't ship a Makers Klub headline without one.
- **Logo:** `assets/logo.svg` (circular MK roundel). Use at 64px tall in nav.
- **Two surfaces:** marketing landing page (dark only, sharp 2px CTAs, editorial) + members app (light + dark, pill-shaped 100px buttons, utilitarian). See `ui_kits/landing/` and `ui_kits/app/`.
- **Voice:** confident, direct, em-dash heavy, short sentences with italicised payoffs ("Two sides. *One table.*"). No emoji in app chrome.
