// Quick login script - run this in browser console to login immediately
sessionStorage.setItem('pokemonGame_user', JSON.stringify({
    token: 'eyJlbWFpbCI6InNhbmRzb3JAb3V0bG9vay5jb20iLCJuYW1lIjoiVGhvbWFzIFNhbmRzXHUwMEY4ciIsImV4cCI6MTc1MjM1MzQ0Nn0=',
    email: 'sandsor@outlook.com',
    name: 'Thomas Sandsør'
}));
sessionStorage.setItem('pokemonGame_authenticated', 'true');
console.log('Login complete! Refresh the page.');
window.location.reload();
