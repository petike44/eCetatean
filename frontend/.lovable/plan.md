## Goal
Switch the app's background from cream Paper & Ink (`#f5f3ee`/`#e8e4dd`) to a clean, professional white across all screens, while keeping the rest of the design system (Sora + Manrope typography, civic structure, amber/navy accents) intact.

## Approach
Centralize the change in the design tokens and remove hardcoded cream/dark backgrounds in components, so the whole site updates consistently.

### 1. Update tokens in `src/styles.css`
- `--bg: #FFFFFF` (page background, was `#F8FAFC`)
- `--surface: #FFFFFF` (cards stay white)
- `--surface-secondary: #F8FAFC` (very light gray for subtle separation)
- `--border: #E5E7EB` (slightly softer neutral border)
- Keep navy `#1F4E79`, amber `#F59E0B`, and text tokens unchanged.

### 2. Fix hardcoded colors on the chat home (`src/routes/chat.tsx`)
The current Paper & Ink redesign uses inline hex values that override tokens:
- Hero background `#e8e4dd` → white (`bg-background`)
- Suggestion cards `#e8e4dd` → white card with `1px solid var(--border)` and subtle shadow
- Disclaimer banner `#fcf8ed` → keep light amber (`bg-accent-light`) for contrast
- AI bubble `#0d0d0d` → navy `bg-primary` with white text (civic identity)
- User bubble stays light, with border
- Input bar dark `#f5f3ee` background → white with top border + soft shadow; send button stays navy/amber
- Replace remaining `#2d2d2d`, `#0d0d0d`, `#f5f3ee` literals with semantic tokens (`text-foreground`, `text-text-secondary`, `bg-background`, etc.)

### 3. Audit other routes for cream/dark literals
Quick scan + cleanup pass on:
- `src/routes/__root.tsx` (body wrapper)
- `src/components/BottomNav.tsx`, `TopBar.tsx`
- `src/routes/documents.tsx`, `profile.tsx`, `report.tsx`, `auth.tsx`, `action-plan.tsx`, `audit.tsx`, `document-preview.tsx`, `onboarding.tsx`, `staff.tsx`

Replace any `#f5f3ee`, `#e8e4dd`, `#0d0d0d`, `#2d2d2d`, `#fcf8ed` literals with semantic Tailwind tokens (`bg-background`, `bg-surface-secondary`, `text-foreground`, `border-border`).

### 4. Polish for "professional white" feel
- Cards: white bg + `border border-border` + `shadow-card`
- Section dividers via 1px borders, not color blocks
- Keep generous whitespace already in place
- Bottom nav: white bg with top border, active icon amber

## Out of scope
- No changes to typography, layout structure, navigation, copy, or business logic.
- No new components or routes.

## Verification
Screenshot `/chat`, `/documents`, `/profile`, `/report` at 390×844 after the change to confirm a consistent white, professional look with no leftover cream surfaces.
