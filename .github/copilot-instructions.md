# Styling and UI Conventions

- **Semantic Colors Only**: ALWAYS use the semantic Tailwind color classes defined in `tailwind.config.js` and `app/globals.css`. 
- **Do not use** hardcoded hex values (e.g., `#f1e8db`) or standard Tailwind color palette classes (e.g., `text-red-500`, `bg-gray-100`, `text-blue-600`) unless absolutely necessary.
- **Base/Brand Colors**: `bg`, `surface`, `surface-strong`, `primary`, `primary-strong`, `accent`, `accent-soft`.
- **Text & Border**: `text`, `muted`, `border`.
- **Status Colors**: 
  - Error/Red: `error`, `error-strong`, `error-bg`, `error-bg-strong`, `error-border`.
  - Success/Green: `success`, `success-strong`, `success-bg`, `success-bg-strong`, `success-border`.
  - Info/Blue: `info`, `info-strong`, `info-text`, `info-bg`, `info-bg-strong`, `info-border`.
- **Category Colors**: `cat-aftercare-bg`, `cat-aftercare-text`.
- **Fonts**: Use the `font-sans` class (which maps to `var(--font-main)`).
