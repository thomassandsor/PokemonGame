// Copy this JavaScript and paste it in the browser console when you're on the ServeGame page
// This will automatically redirect you to localhost with your auth data

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const email = urlParams.get('email');
const name = urlParams.get('name');

if (token && email) {
    const localhostUrl = `http://localhost:8080/index.html?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name || '')}`;
    console.log('Redirecting to localhost with auth data...');
    window.location.href = localhostUrl;
} else {
    console.log('No auth data found, redirecting to localhost home');
    window.location.href = 'http://localhost:8080';
}
