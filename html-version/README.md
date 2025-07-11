# Pokemon Game - HTML Version

A retro Super Nintendo-style Pokemon game built with pure HTML, CSS, and JavaScript.

## 🎮 Features

- **Retro SNES Aesthetic**: Pixel-perfect styling with classic Pokemon colors
- **Mobile Optimized**: Works seamlessly on all devices
- **Secure Authentication**: Integrates with existing Azure Functions backend
- **Pokemon Collection**: View and manage your caught Pokemon
- **Pokemon Browser**: Browse all available Pokemon with filters
- **QR Scanner**: Catch Pokemon using camera-based QR scanning
- **Demo Mode**: Test without authentication

## 🚀 Quick Start

1. **Open the login page**: Open `index.html` in your browser
2. **Demo Mode**: Click "Demo Mode" for instant testing
3. **Real Auth**: Click "Start Your Journey" for Azure AD authentication

## 📁 File Structure

```
html-version/
├── index.html              # Login page
├── my-pokemon.html         # User's Pokemon collection
├── pokemon-browser.html    # Browse all Pokemon
├── styles/
│   ├── pokemon-retro.css   # Main SNES-style theme
│   ├── login.css          # Login page styles
│   ├── my-pokemon.css     # My Pokemon page styles
│   └── pokemon-browser.css # Browser page styles
└── js/
    ├── auth.js            # Authentication service
    ├── login.js           # Login page logic
    ├── pokemon-service.js # Pokemon data service
    └── my-pokemon.js      # My Pokemon page logic
```

## 🎨 Design Features

- **Press Start 2P Font**: Authentic retro gaming feel
- **Pokemon Color Palette**: Red, Blue, Yellow, Green, Purple
- **Type Badges**: Color-coded Pokemon types
- **Animated Buttons**: Hover and click effects
- **Responsive Grid**: Adapts to any screen size
- **Loading Animations**: Spinning Pokemon icons
- **Modal Dialogs**: Detailed Pokemon information

## 🔧 Technical Features

- **No Build Process**: Pure HTML/CSS/JS
- **Async/Await**: Modern JavaScript patterns
- **Local Storage**: Demo mode persistence
- **Fetch API**: RESTful backend integration
- **CSS Grid**: Responsive layouts
- **CSS Animations**: Smooth transitions

## 🛡️ Security

- Maintains existing Azure Functions authentication
- Secure cookie-based sessions
- HTTPS-only production endpoints
- Demo mode for safe testing

## 📱 Mobile Features

- Touch-friendly buttons (40px+ touch targets)
- Responsive typography (scales with viewport)
- Optimized image loading
- Swipe-friendly navigation

## 🎯 Getting Started

1. **Test Demo**: Open `index.html` → "Demo Mode"
2. **Real Auth**: Configure Azure Functions endpoints
3. **Add Pokemon**: Use QR scanner or admin tools
4. **Customize**: Modify CSS for your theme

## 🎮 Next Steps

- Add QR scanner page
- Implement battle system
- Add evolution mechanics
- Create admin panel
- Add sound effects

## 🚀 Deployment

Simply upload the `html-version` folder to any web server. No build process required!

For HTTPS (required for camera access):
- Use GitHub Pages
- Deploy to Azure Static Web Apps
- Use Netlify or Vercel
