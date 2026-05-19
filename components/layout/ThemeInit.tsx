/**
 * @deprecated ThemeInit is no longer used.
 *
 * Theme persistence moved to:
 *   - localStorage 'admin_theme' (written by ThemeProvider / ThemePicker)
 *   - Inline <script> in app/layout.tsx <head> for FOUC prevention
 *   - components/theme/ThemeProvider.tsx for React state
 *
 * This file is kept temporarily to avoid import errors during deploy.
 * It can be deleted once no component imports it.
 */
export function ThemeInit() {
  return null
}
