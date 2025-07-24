# Pokemon Game Design System & Style Guide

## Overview
This document serves as the comprehensive style guide for the Pokemon Game project. Use this as a reference when creating or updating any UI components to ensure visual consistency across the entire application.

## 🎨 Design Philosophy

### Core Principles
1. **Pokemon-Themed**: All designs should feel authentic to the Pokemon universe
2. **Retro Nintendo Style**: Sharp edges, bold colors, pixelated aesthetic inspired by Game Boy/NES era
3. **Mobile-First**: Prioritize iPhone screen experience, then enhance for larger devices
4. **Accessible**: Ensure good contrast and readable text sizes with retro styling
5. **Consistent**: Use the design system components for all new features
6. **Performant**: Keep animations smooth and lightweight

### Color Psychology
- **Yellow (#ffd700)**: Primary brand color, energy, excitement - more vibrant than modern Pokemon
- **Blue (#0066cc)**: Trust, reliability, stability - classic Nintendo blue
- **Red (#ff3333)**: Action, urgency, Pokeball theme - bright and bold
- **Green (#00aa44)**: Success, nature, growth - classic 8-bit green
- **Purple (#6633cc)**: Mystery, evolution, premium features - retro purple
- **Orange (#ff8800)**: Secondary accent, warmth, energy

### Retro Design Elements
- **Sharp edges**: Minimal border radius for pixel-perfect look
- **Bold shadows**: Hard drop shadows instead of soft blurs
- **High contrast**: Strong color contrasts for retro appeal
- **Monospace fonts**: Courier New for that classic computer feel
- **Block layouts**: Grid-based, structured layouts
- **Pixelated imagery**: All images should use `image-rendering: pixelated`

## 🔧 Implementation Guide

### Required CSS Import
**Always include this in your HTML `<head>`:**
```html
<link rel="stylesheet" href="styles/pokemon-design-system.css">
```

### Basic Page Structure Template
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title - Pokemon Game</title>
    <link rel="stylesheet" href="styles/pokemon-design-system.css">
</head>
<body>
    <div class="pokemon-container">
        <div class="pokemon-card-header">
            <h1 class="pokemon-title">🎮 Page Title</h1>
            <p class="pokemon-text">Page description</p>
        </div>
        
        <div class="pokemon-card">
            <!-- Main content here -->
        </div>
    </div>
</body>
</html>
```

## 📱 Component Library

### Typography
```html
<!-- Page Titles -->
<h1 class="pokemon-title">Main Page Title</h1>

<!-- Section Headers -->
<h2 class="pokemon-subtitle">Section Title</h2>

<!-- Body Text -->
<p class="pokemon-text">Regular content text</p>
<p class="pokemon-text-small">Smaller text for details</p>
<p class="pokemon-text-xs">Very small text for captions</p>
```

### Buttons
```html
<!-- Primary Action Button (most important actions) -->
<button class="pokemon-btn pokemon-btn-primary">Catch Pokemon</button>

<!-- Secondary Button (supporting actions) -->
<button class="pokemon-btn pokemon-btn-secondary">View Details</button>

<!-- Success Button (positive actions) -->
<button class="pokemon-btn pokemon-btn-success">Save Changes</button>

<!-- Danger Button (destructive actions) -->
<button class="pokemon-btn pokemon-btn-danger">Release Pokemon</button>

<!-- Button Sizes -->
<button class="pokemon-btn pokemon-btn-primary pokemon-btn-large">Large Button</button>
<button class="pokemon-btn pokemon-btn-primary pokemon-btn-small">Small Button</button>
```

### Navigation
```html
<!-- Retro Grid Navigation (2x2 on mobile, 1x4 on tablet+) -->
<nav class="pokemon-nav">
    <a href="index.html" class="pokemon-nav-item">🏠 HOME</a>
    <a href="my-pokemon.html" class="pokemon-nav-item active">📦 MY POKEMON</a>
    <a href="catch-pokemon.html" class="pokemon-nav-item">⚡ CATCH</a>
    <a href="battle-arena.html" class="pokemon-nav-item">⚔️ BATTLE</a>
</nav>
```

### Cards & Layout
```html
<!-- Main Container -->
<div class="pokemon-container">
    <!-- Header Card -->
    <div class="pokemon-card-header">
        <h1 class="pokemon-title">Page Title</h1>
    </div>
    
    <!-- Content Card -->
    <div class="pokemon-card">
        <div class="pokemon-card-body">
            <p class="pokemon-text">Card content</p>
        </div>
        <div class="pokemon-card-footer">
            <button class="pokemon-btn pokemon-btn-primary">Action</button>
        </div>
    </div>
</div>

<!-- Grid Layout -->
<div class="pokemon-grid pokemon-grid-3">
    <div class="pokemon-card">Item 1</div>
    <div class="pokemon-card">Item 2</div>
    <div class="pokemon-card">Item 3</div>
</div>

<!-- Flex Layout -->
<div class="pokemon-flex-center">
    <button class="pokemon-btn pokemon-btn-primary">Button 1</button>
    <button class="pokemon-btn pokemon-btn-secondary">Button 2</button>
</div>
```

### Forms
```html
<form class="pokemon-form">
    <label class="pokemon-label" for="pokemonName">Pokemon Name</label>
    <input type="text" class="pokemon-input" id="pokemonName" placeholder="Enter Pokemon name...">
    
    <div class="pokemon-flex-center mt-lg">
        <button type="submit" class="pokemon-btn pokemon-btn-primary">Submit</button>
        <button type="button" class="pokemon-btn pokemon-btn-secondary">Cancel</button>
    </div>
</form>
```

### Modals
```html
<div class="pokemon-modal">
    <div class="pokemon-modal-content">
        <button class="pokemon-modal-close">&times;</button>
        <h2 class="pokemon-subtitle">Modal Title</h2>
        <p class="pokemon-text">Modal content goes here...</p>
        <div class="pokemon-flex-center mt-lg">
            <button class="pokemon-btn pokemon-btn-primary">Confirm</button>
            <button class="pokemon-btn pokemon-btn-secondary">Cancel</button>
        </div>
    </div>
</div>
```

### Pokemon-Specific Components
```html
<!-- Scanner Frame for QR Code -->
<div class="pokemon-scanner-frame">
    <div class="pokemon-scanner-inner">
        <video id="qrVideo"></video>
    </div>
</div>

<!-- Pokeball Icon -->
<span class="pokeball-icon"></span>

<!-- Pokemon Stats -->
<div class="pokemon-stat-bar">
    <div class="pokemon-stat-fill" style="width: 75%;"></div>
</div>
```

## 🎨 CSS Custom Properties (Variables)

### When to Use Variables
Always use CSS custom properties for:
- Colors: `var(--pokemon-yellow)` instead of `#ffcc02`
- Spacing: `var(--space-lg)` instead of `1.5rem`
- Typography: `var(--font-size-lg)` instead of `1.125rem`
- Shadows: `var(--shadow-md)` instead of custom shadows

### Available Variables
```css
/* Colors */
--pokemon-yellow: #ffcc02
--pokemon-blue: #3d7dca
--pokemon-red: #ff6b6b
--pokemon-green: #4ecdc4

/* Spacing */
--space-xs: 0.25rem
--space-sm: 0.5rem
--space-md: 1rem
--space-lg: 1.5rem
--space-xl: 2rem

/* Typography */
--font-size-sm: 0.875rem
--font-size-base: 1rem
--font-size-lg: 1.125rem
--font-size-xl: 1.25rem
```

## 📐 Layout Patterns

### 1. Standard Page Layout
```html
<div class="pokemon-container">
    <div class="pokemon-card-header text-center">
        <h1 class="pokemon-title">🎮 Page Title</h1>
        <p class="pokemon-text">Description</p>
    </div>
    
    <nav class="pokemon-nav">
        <!-- Navigation items -->
    </nav>
    
    <div class="pokemon-card">
        <!-- Main content -->
    </div>
</div>
```

### 2. Dashboard/Grid Layout
```html
<div class="pokemon-container-wide">
    <div class="pokemon-card-header text-center">
        <h1 class="pokemon-title">Dashboard</h1>
    </div>
    
    <div class="pokemon-grid pokemon-grid-3">
        <div class="pokemon-card">Card 1</div>
        <div class="pokemon-card">Card 2</div>
        <div class="pokemon-card">Card 3</div>
    </div>
</div>
```

### 3. Mobile Scanner Layout
```html
<div class="pokemon-container">
    <div class="pokemon-scanner-frame">
        <div class="pokemon-scanner-inner">
            <video id="scanner"></video>
        </div>
    </div>
    
    <div class="pokemon-card mt-lg">
        <div class="pokemon-flex-center">
            <button class="pokemon-btn pokemon-btn-primary">Start Scan</button>
        </div>
    </div>
</div>
```

## 🎯 Animation Guidelines

### Available Animations
```html
<!-- Floating Animation (for hero elements) -->
<div class="pokemon-float">Content floats gently</div>

<!-- Pulse Animation (for call-to-action) -->
<button class="pokemon-btn pokemon-btn-primary pokemon-pulse">Important Button</button>

<!-- Loading Animation -->
<div class="pokemon-loading">Loading content...</div>
```

### Animation Rules
1. **Subtle**: Animations should enhance, not distract
2. **Purposeful**: Every animation should serve a UX purpose
3. **Fast**: Keep animations under 0.5s for interactions
4. **Accessible**: Respect `prefers-reduced-motion`

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px (primary target)
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile-First CSS
```css
/* Mobile first (default) */
.my-component {
    font-size: var(--font-size-base);
    padding: var(--space-md);
}

/* Tablet and up */
@media (min-width: 768px) {
    .my-component {
        font-size: var(--font-size-lg);
        padding: var(--space-lg);
    }
}
```

### Container Guidelines
- Use `pokemon-container` for standard pages
- Use `pokemon-container-narrow` for forms/focused content
- Use `pokemon-container-wide` for dashboards/grids

## ✅ Development Checklist

When creating a new page or component, ensure:

### HTML Structure
- [ ] Includes `pokemon-design-system.css`
- [ ] Uses semantic HTML elements
- [ ] Has proper viewport meta tag
- [ ] Uses pokemon-container for layout

### CSS Classes
- [ ] Uses design system classes instead of custom CSS
- [ ] Uses CSS variables for colors/spacing
- [ ] Follows BEM naming for custom classes
- [ ] Includes hover states for interactive elements

### Accessibility
- [ ] Proper color contrast (test with tools)
- [ ] Keyboard navigation works
- [ ] Screen reader friendly markup
- [ ] Focus indicators visible

### Mobile Experience
- [ ] Touch targets are 44px minimum
- [ ] Text is readable without zooming
- [ ] Layout works on 320px width
- [ ] Interactions work with touch

### Pokemon Theming
- [ ] Uses Pokemon brand colors
- [ ] Includes Pokemon-themed emojis where appropriate
- [ ] Maintains brand consistency
- [ ] Feels authentic to Pokemon universe

## 🚀 Quick Start Examples

### Example 1: Retro Pokemon Info Page
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pokemon Info - Pokemon Game</title>
    <link rel="stylesheet" href="styles/pokemon-design-system.css">
</head>
<body>
    <div class="pokemon-container">
        <div class="pokemon-card-header text-center">
            <h1 class="pokemon-title">🔍 POKEMON INFO</h1>
            <p class="pokemon-text">DISCOVER • ANALYZE • LEARN</p>
        </div>
        
        <div class="pokemon-card">
            <h2 class="pokemon-subtitle">PIKACHU #025</h2>
            <p class="pokemon-text">TYPE: ELECTRIC</p>
            <p class="pokemon-text-small">The Electric Mouse Pokemon</p>
            
            <div class="pokemon-flex-center mt-lg">
                <button class="pokemon-btn pokemon-btn-primary">⚡ VIEW STATS</button>
                <button class="pokemon-btn pokemon-btn-secondary">🔙 BACK</button>
            </div>
        </div>
    </div>
</body>
</html>
```

### Example 2: Form Page
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings - Pokemon Game</title>
    <link rel="stylesheet" href="styles/pokemon-design-system.css">
</head>
<body>
    <div class="pokemon-container-narrow">
        <div class="pokemon-card-header text-center">
            <h1 class="pokemon-title">⚙️ Settings</h1>
        </div>
        
        <form class="pokemon-form">
            <label class="pokemon-label" for="trainerName">Trainer Name</label>
            <input type="text" class="pokemon-input" id="trainerName" placeholder="Enter your trainer name...">
            
            <label class="pokemon-label" for="favoriteType">Favorite Pokemon Type</label>
            <select class="pokemon-input" id="favoriteType">
                <option value="">Select a type...</option>
                <option value="electric">Electric</option>
                <option value="fire">Fire</option>
                <option value="water">Water</option>
            </select>
            
            <div class="pokemon-flex-center mt-xl">
                <button type="submit" class="pokemon-btn pokemon-btn-success">Save Settings</button>
                <button type="button" class="pokemon-btn pokemon-btn-secondary">Cancel</button>
            </div>
        </form>
    </div>
</body>
</html>
```

## 💡 Pro Tips

1. **Always test on mobile first** - Use browser dev tools mobile view
2. **Use the design system** - Don't create custom styles unless absolutely necessary
3. **Keep it Pokemon-themed** - Use emojis, Pokemon colors, and terminology
4. **Performance matters** - Avoid unnecessary animations on mobile
5. **Consistency is key** - When in doubt, follow existing patterns

## 🔄 Updating This Guide

When adding new components or patterns:
1. Add the CSS to `pokemon-design-system.css`
2. Document the component here with HTML examples
3. Update the quick start examples if needed
4. Test on mobile devices

---

**Remember**: This design system is living documentation. Keep it updated as the game evolves!
