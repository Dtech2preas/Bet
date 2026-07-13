// auth.js

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in on login page, redirect to app
    if (localStorage.getItem('dtech_token') && window.location.pathname.endsWith('index.html')) {
        window.location.href = 'app.html';
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');

            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="animate-spin inline-block mr-2">&#9696;</span> Signing In...';

            try {
                const response = await API.request('/api/login', {
                    method: 'POST',
                    body: JSON.stringify({ username: usernameInput, password: passwordInput })
                });

                if (response.success) {
                    localStorage.setItem('dtech_token', response.token);
                    localStorage.setItem('dtech_user', JSON.stringify(response.user));

                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: 'Welcome back.',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = 'app.html';
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: error.message || 'Invalid credentials. Please try again.'
                });
            } finally {
                loginBtn.disabled = false;
                loginBtn.innerHTML = 'Sign In';
            }
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('dtech_token');
            localStorage.removeItem('dtech_user');
            window.location.href = 'index.html';
        });
    }
});