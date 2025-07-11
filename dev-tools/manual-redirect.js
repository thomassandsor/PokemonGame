// Manual redirect script - paste this in browser console while on the ServeGame page
(function() {
    console.log('Starting manual redirect...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    const name = urlParams.get('name');
    
    if (token && email) {
        const localhostUrl = `http://localhost:8080/index.html?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name || '')}`;
        console.log('Redirecting to:', localhostUrl);
        window.location.href = localhostUrl;
    } else {
        console.error('Missing authentication data');
        window.location.href = 'http://localhost:8080';
    }
})();
