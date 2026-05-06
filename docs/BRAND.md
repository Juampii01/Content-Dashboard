# Brand tokens

The two brand colors are defined as CSS custom properties in
`app/globals.css` and **must be referenced through those variables**.

| Token                    | Value     | Use for                              |
| ------------------------ | --------- | ------------------------------------ |
| `--accent`               | `#8E1F2F` | Primary brand red (buttons, accents) |
| `--accent-foreground`    | `#F5EDE3` | Foreground that sits on `--accent`   |

## Rule

**Never** hardcode `#8E1F2F` or `#F5EDE3` (in any case) outside of
`app/globals.css`. Always use the CSS variable:

```tsx
// ✅ correct
<div style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }} />

// ✅ correct (Tailwind utility wired to the same token)
<button className="bg-accent text-accent-foreground" />

// ❌ wrong — bypasses the token, breaks theming
<div style={{ background: '#8E1F2F' }} />
```

Hardcoding the literal means the value diverges the moment the brand changes,
and the inconsistency is invisible at review time. Past audits have caught
components (`ReelFilters`, `TimeFilter`) shipping with hardcoded literals while
the rest of the app already used the token.

## Enforcement

`scripts/check-brand-consistency.mjs` greps `components/**` and `app/**`
(excluding `app/globals.css`) for the literals and exits non-zero if any are
found.

```bash
npm run check:brand
```

Run it before opening a PR that touches styling. Wire it into CI to make the
guardrail unskippable.
