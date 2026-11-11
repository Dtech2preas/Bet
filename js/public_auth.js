document.addEventListener('DOMContentLoaded', () => {
    // Check if user is opening a password reset link
    const resetToken = new URLSearchParams(window.location.search).get('reset_token');
    if (resetToken) {
        Swal.fire({
            title: 'Set New Password',
            html: `
                <p class="text-sm text-gray-600 mb-3">Please choose a new password for your account.</p>
                <input type="password" id="resetNewPass" class="swal2-input" placeholder="New Password (min 6 characters)">
                <input type="password" id="resetNewPassConfirm" class="swal2-input" placeholder="Confirm New Password">
            `,
            confirmButtonText: 'Reset Password',
            confirmButtonColor: '#2563eb',
            showCancelButton: true,
            allowOutsideClick: false,
            preConfirm: () => {
                const p1 = document.getElementById('resetNewPass').value;
                const p2 = document.getElementById('resetNewPassConfirm').value;
                if (!p1 || p1.length < 6) {
                    Swal.showValidationMessage('Password must be at least 6 characters');
                    return false;
                }
                if (p1 !== p2) {
                    Swal.showValidationMessage('Passwords do not match');
                    return false;
                }
                return p1;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    Swal.showLoading();
                    const res = await API.request('/api/complete-password-reset', {
                        method: 'POST',
                        body: JSON.stringify({ resetToken, newPassword: result.value })
                    });
                    if (res.success) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                        Swal.fire({
                            icon: 'success',
                            title: 'Password Updated!',
                            text: 'Your password has been reset successfully. You can now log in.',
                            confirmButtonColor: '#2563eb'
                        });
                    }
                } catch (err) {
                    Swal.fire('Error', err.message || 'Invalid or expired reset link. Please request a new one.', 'error');
                }
            }
        });
    }

    // If already logged in on login page, redirect to app
    if (localStorage.getItem('dtech_token') && (window.location.pathname.includes('index') || window.location.pathname === '/')) {
        window.location.href = 'public_dashboard.html';
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
                        window.location.href = 'public_dashboard.html';
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
                    localStorage.setItem('dtech_new_user', 'true');

                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: 'Account created successfully.',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = 'public_dashboard.html';
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

    // Forgot password (WhatsApp Option A workflow)
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    if (forgotBtn) {
        forgotBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const { value: username } = await Swal.fire({
                title: 'Password Recovery',
                text: 'Enter your registered Username to generate a WhatsApp verification code:',
                input: 'text',
                inputPlaceholder: 'Your username',
                showCancelButton: true,
                confirmButtonText: 'Generate Code',
                confirmButtonColor: '#2563eb',
                inputValidator: (value) => {
                    if (!value || !value.trim()) {
                        return 'Please enter your username';
                    }
                }
            });

            if (!username) return;

            try {
                Swal.fire({
                    title: 'Generating Code...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                const res = await API.request('/api/request-password-reset', {
                    method: 'POST',
                    body: JSON.stringify({ username: username.trim() })
                });

                if (res.success) {
                    const msg = encodeURIComponent(`Hi D-TECH, I need to reset my password for account "${res.username}". My verification code is: ${res.code}`);
                    const waUrl = `https://wa.me/${res.dtechWhatsApp}?text=${msg}`;

                    Swal.fire({
                        title: 'WhatsApp Verification',
                        html: `
                            <div class="text-left space-y-3">
                                <p class="text-sm text-gray-600">Your verification code has been generated:</p>
                                <div class="text-center py-2 px-4 bg-gray-100 rounded font-mono text-xl font-bold tracking-wider text-dtech-700 select-all border">
                                    ${res.code}
                                </div>
                                <p class="text-xs text-gray-500">Tap below to message D-TECH Support directly on WhatsApp from your registered number. We will verify your identity and reply with your secure reset link.</p>
                                <div class="pt-2 text-center">
                                    <a href="${waUrl}" target="_blank" class="inline-flex items-center justify-center px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm transition-colors text-sm w-full">
                                        <i class="fab fa-whatsapp text-lg mr-2"></i> Message Support on WhatsApp
                                    </a>
                                </div>
                            </div>
                        `,
                        showConfirmButton: true,
                        confirmButtonText: 'Done',
                        confirmButtonColor: '#2563eb'
                    });
                }
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Request Failed',
                    text: err.message || 'Could not find an account with that username.'
                });
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
