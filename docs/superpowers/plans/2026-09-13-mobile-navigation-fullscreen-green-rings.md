# Mobile Fullscreen Green-Ring Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile drawer navigation with a full-viewport navigation surface and green leaf-ring interaction, without changing page-level contact actions.

**Architecture:** Keep `SiteHeader` responsible for menu state, routing, focus restoration, and tracking. Remove the menu-only visual and contact elements from its markup; make `responsive.css` own the complete mobile overlay geometry and `mobile-navigation.css` own the menu-row and leaf-ring styling.

**Tech Stack:** React 19, React Router, CSS, Vite.

---

### Task 1: Remove drawer-only content

**Files:**
- Modify: `src/components/layout/SiteHeader.jsx:1-13,219-270`

- [ ] **Step 1: Remove unused image imports and props**

```jsx
import { Link, useLocation } from 'react-router-dom'
import { navigation } from '../../data/navigation'
import LeafIcon from '../ui/LeafIcon'
import { trackEvent } from '../../lib/analytics'

export default function SiteHeader({ brand, navigationImage, navigationImageAlt, menuOpen: controlledMenuOpen, onMenuOpenChange }) {
```

Replace it with the same imports excluding `BrandImage`, and the component parameters `brand`, `menuOpen`, and `onMenuOpenChange` only.

- [ ] **Step 2: Add the menu masthead and remove menu-only visual/contact markup**

```jsx
          <div className="site-nav__masthead" aria-hidden="true">
            <img src={brand.logoSrc} alt="" />
            <span>
              <strong>{brand.shortName}</strong>
              <small>{brand.englishName}</small>
            </span>
          </div>
          <div className="site-nav__index">
            {navigation.map((item, index) => (
              // existing navigation links remain unchanged
            ))}
          </div>
```

Insert the masthead before the menu metadata. Delete the conditional `.site-nav__visual` block and the `.site-nav__contacts` block that follows it. Remove the `navigationVisualReady` state and stop setting it when opening the menu.

- [ ] **Step 3: Commit the React cleanup**

```bash
git add src/components/layout/SiteHeader.jsx
git commit -m "refactor: remove mobile navigation contact drawer"
```

### Task 2: Make the mobile menu a full viewport panel

**Files:**
- Modify: `src/styles/responsive.css:187-262,575-580`

- [ ] **Step 1: Remove the narrow backdrop reveal**

```css
.nav-backdrop { display: none; }
```

Within the mobile media query, replace the backdrop geometry and visibility rules with this non-rendering rule because the full navigation itself blocks the page.

- [ ] **Step 2: Replace drawer geometry with viewport geometry**

```css
.site-nav {
  position: fixed;
  z-index: 45;
  inset: 0;
  min-height: 100dvh;
  max-height: none;
  padding: 24px clamp(24px, 7vw, 44px) calc(30px + env(safe-area-inset-bottom));
  background: radial-gradient(circle at 100% 100%, rgba(214, 234, 214, .8), transparent 36%), var(--paper-bright);
  border: 0;
  border-radius: 0;
  box-shadow: none;
  clip-path: inset(0 0 0 100%);
  transform: translateX(18px);
}

.site-nav.is-open {
  clip-path: inset(0 0 0 0);
}
```

Keep existing visibility, opacity, pointer-event, transition, focus, and reduced-motion behavior. Delete the short-viewport `.site-nav` padding override that references drawer-specific `gap` values.

Add a `.site-nav__masthead` rule that presents the existing gold logo and brand wording inside the panel. It is the visible brand identity while the full-viewport layer covers the header's normal brand mark.

- [ ] **Step 3: Keep the close control above the panel**

```css
.nav-toggle { z-index: 46; }
```

This preserves a visible, operable close control above the opened navigation surface.

- [ ] **Step 4: Commit the fullscreen surface**

```bash
git add src/styles/responsive.css
git commit -m "feat: make mobile navigation fullscreen"
```

### Task 3: Style navigation entries as deep-and-light-green leaf rings

**Files:**
- Modify: `src/styles/mobile-navigation.css:13-44`

- [ ] **Step 1: Remove visual and contact CSS**

Delete all `.site-nav__visual` and `.site-nav__contacts` rules from the mobile query, including the short-viewport variants.

- [ ] **Step 2: Replace the arrow treatment**

```css
.site-nav__arrow {
  position: relative;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  overflow: visible;
  border: 1.5px solid var(--moss-800);
  border-radius: 50%;
  background: #dcebdc;
  box-shadow: inset 0 0 0 4px #f3f8f0, 0 2px 7px rgba(36, 81, 60, .1);
  color: var(--forest-900);
  transform: none;
}

.site-nav__arrow::before {
  position: absolute;
  width: 24px;
  height: 24px;
  border: 1.4px dashed #75a980;
  border-radius: 50%;
  content: '';
  transform: rotate(-18deg);
}
```

Add paired hover, focus-visible, and active rules that rotate only the ring, darken its background to `var(--moss-800)`, and set its icon color to `var(--paper-bright)`. Do not transform the full menu item outside its existing text movement.

- [ ] **Step 3: Add a stable lower brand detail**

```css
.site-nav::after {
  margin-top: auto;
  padding-top: 24px;
  color: var(--moss-800);
  font-family: var(--font-utility);
  font-size: .54rem;
  font-weight: 700;
  letter-spacing: .18em;
  content: 'YAO SHENG LANDSCAPE DESIGN';
}
```

The pseudo-element creates a quiet finish without restoring the removed contact buttons or photo card.

- [ ] **Step 4: Commit the visual update**

```bash
git add src/styles/mobile-navigation.css
git commit -m "feat: add green leaf ring mobile navigation"
```

### Task 4: Build, inspect locally, and publish

**Files:**
- Verify: `src/components/layout/SiteHeader.jsx`
- Verify: `src/styles/responsive.css`
- Verify: `src/styles/mobile-navigation.css`

- [ ] **Step 1: Build the static site**

```bash
npm run build
```

Expected: Vite emits `dist/` with no build errors.

- [ ] **Step 2: Open the local production preview**

```bash
npm run preview -- --host 127.0.0.1
```

Inspect the mobile menu manually: it covers the viewport, leaves no old page strip, has no menu contacts, and each leaf ring responds to hover/focus.

- [ ] **Step 3: Publish the approved branch to production**

```bash
git push origin HEAD:master
```

Expected: Cloudflare Pages receives the `master` update and serves the new static bundle.
