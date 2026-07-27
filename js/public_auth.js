document.addEventListener('DOMContentLoaded', () => {
    // If already logged in on login page, redirect to app
    if (localStorage.getItem('dtech_token') && (window.location.pathname.includes('index') || window.location.pathname === '/')) {
        window.location.href = 'public_app.html';
    }

    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (tabLogin && tabSignup) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('text-dtech-600', 'border-b-2', 'border-dtech-600');
            tabLogin.classList.remove('text-gray-500');

            tabSignup.classList.remove('text-dtech-600', 'border-b-2', 'border-dtech-600');
            tabSignup.classList.add('text-gray-500');

            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        });

        tabSignup.addEventListener('click', () => {
            tabSignup.classList.add('text-dtech-600', 'border-b-2', 'border-dtech-600');
            tabSignup.classList.remove('text-gray-500');

            tabLogin.classList.remove('text-dtech-600', 'border-b-2', 'border-dtech-600');
            tabLogin.classList.add('text-gray-500');

            signupForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        });
    }

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
                        window.location.href = 'public_app.html';
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

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById('regUsername').value;
            const passwordInput = document.getElementById('regPassword').value;
            const businessNameInput = document.getElementById('regBusinessName').value;
            const signupBtn = document.getElementById('signupBtn');

            signupBtn.disabled = true;
            signupBtn.innerHTML = '<span class="animate-spin inline-block mr-2">&#9696;</span> Creating Account...';

            try {
                const response = await API.request('/api/register', {
                    method: 'POST',
                    body: JSON.stringify({ username: usernameInput, password: passwordInput, businessName: businessNameInput })
                });

                if (response.success) {
                    localStorage.setItem('dtech_token', response.token);
                    localStorage.setItem('dtech_user', JSON.stringify(response.user));

                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: 'Account created successfully.',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = 'public_app.html';
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Registration Failed',
                    text: error.message || 'Could not create account. Please try again.'
                });
            } finally {
                signupBtn.disabled = false;
                signupBtn.innerHTML = 'Create Account';
            }
        });
    }

    // Logout functionality (for public app)
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
