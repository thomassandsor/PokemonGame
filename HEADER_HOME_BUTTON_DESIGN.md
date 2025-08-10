# Header with Home Button Design Guide

## Overview
This document describes the standardized header design with pokeball home navigation button used across the Pokemon Game application.

## Visual Design

```
[🎯 Pokeball]        ⚔️ Page Title        [     Space     ]
```

The header consists of:
- **Left**: Circular pokeball home button 
- **Center**: Page title with appropriate emoji/icon
- **Right**: Empty spacer for balanced layout

## HTML Structure

```html
<header class="pokemon-header">
    <div class="pokemon-header-content">
        <button class="home-nav-btn" onclick="window.location.href='index.html'" title="Go Home">
            <img src="assets/pokeball.svg" alt="Home" class="pokeball-icon">
        </button>
        <h1 class="pokemon-title">[ICON] Page Title</h1>
        <div class="header-spacer"></div>
    </div>
</header>
```

### Key Elements:
- `pokemon-header`: Main header container
- `pokemon-header-content`: Flex container for layout
- `home-nav-btn`: Clickable pokeball home button
- `pokemon-title`: Centered page title
- `header-spacer`: Right-side spacer for balance

## CSS Styles

```css
/* Home navigation button */
.home-nav-btn {
    background: #ffffff;
    border: 2px solid #e0e0e0;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 0;
}

.home-nav-btn:hover {
    background: #f8f9fa;
    border-color: #3b82f6;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.home-nav-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pokeball-icon {
    width: 28px;
    height: 28px;
    transition: transform 0.2s;
}

.home-nav-btn:hover .pokeball-icon {
    transform: rotate(10deg);
}

/* Header layout */
.pokemon-header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.header-spacer {
    width: 48px; /* Match home button width for balanced layout */
}

.pokemon-title {
    margin: 0;
    flex: 1;
    text-align: center;
}
```

## Implementation Examples

### Battle Arena
```html
<h1 class="pokemon-title">⚔️ Battle Arena</h1>
```

### Pokemon Collection
```html
<h1 class="pokemon-title">🎯 My Pokemon</h1>
```

### Game Dashboard
```html
<h1 class="pokemon-title">🎮 Pokemon Game</h1>
```

### Catch Pokemon
```html
<h1 class="pokemon-title">🎣 Catch Pokemon</h1>
```

## Interactive Features

### Home Button Behavior:
- **Click**: Navigates to `index.html`
- **Hover**: 
  - Button elevates slightly (`translateY(-1px)`)
  - Border changes to blue (`#3b82f6`)
  - Background lightens to `#f8f9fa`
  - Pokeball rotates 10 degrees
  - Enhanced shadow for depth
- **Active**: Returns to normal position
- **Accessibility**: Includes tooltip "Go Home" and alt text

### Design Principles:
- **Consistent**: Same button style across all pages
- **Intuitive**: Pokeball universally recognizes as "home" in Pokemon context
- **Responsive**: Works on mobile and desktop
- **Accessible**: Proper ARIA labels and keyboard navigation
- **Smooth**: All transitions are 0.2s for polished feel

## File Dependencies

### Required Assets:
- `assets/pokeball.svg` - Home button icon
- `styles/pokemon-design-system.css` - Base Pokemon styling (if using shared styles)

### Required Functionality:
- Navigation to `index.html` on home button click
- Responsive header layout
- Hover animations and transitions

## Usage Notes

1. **Page Title Icons**: Choose appropriate emoji/icon for each page context
2. **Responsive Design**: Header adapts to mobile screens with proper spacing
3. **Consistent Spacing**: Always use `header-spacer` div for balanced layout
4. **Asset Path**: Ensure `assets/pokeball.svg` path is correct relative to page location
5. **Navigation Target**: Adjust `onclick` destination if main page isn't `index.html`

## Implementation Checklist

- [ ] Add HTML header structure
- [ ] Include all required CSS styles
- [ ] Verify pokeball.svg asset path
- [ ] Test home button navigation
- [ ] Verify responsive layout on mobile
- [ ] Test hover animations
- [ ] Ensure accessibility (alt text, tooltips)
- [ ] Choose appropriate page title icon

## Browser Compatibility

This implementation works on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential improvements:
- Add breadcrumb navigation for deeper pages
- Implement user avatar in header spacer area
- Add notification indicators
- Dark mode support for header

## Standardized Pokemon Card Design

### Card Structure
The Pokemon cards used in modals and selection interfaces follow this standardized design:

```html
<div class="pokemon-card" onclick="selectPokemon(pokemon)">
    <img src="pokemon-sprite-url" alt="Pokemon Name">
    <h4>Pokemon Name</h4>
    <p>HP: current/max</p>
    <p>Level: level</p>
</div>
```

### Card CSS Styles
```css
.pokemon-card {
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
    min-width: 120px;
}

.pokemon-card:hover {
    border-color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pokemon-card.selected {
    border-color: #10b981;
    background: #f0fdf4;
}

.pokemon-card.unavailable {
    border-color: #e0e0e0;
    background: #f8f9fa;
    cursor: not-allowed;
    opacity: 0.7;
}

.pokemon-card img {
    width: 60px;
    height: 60px;
    object-fit: contain;
}

.pokemon-card h4 {
    margin: 8px 0 4px 0;
    font-size: 14px;
    color: #333;
    font-weight: 600;
}

.pokemon-card p {
    margin: 0;
    font-size: 12px;
    color: #666;
}
```

### Card Grid Layout
```css
.pokemon-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
    margin: 16px 0;
}
```

### Usage Examples
- **Battle Arena**: Pokemon selection modal
- **Battle Join**: Pokemon selection for joining battles
- **My Pokemon**: Pokemon collection display
- **Catch Pokemon**: Recently caught Pokemon display
