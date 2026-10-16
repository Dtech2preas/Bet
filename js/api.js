// api.js

const API_BASE_URL = 'https://lively-limit-786e.testd1x24.workers.dev';

const API = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('dtech_token');

        const defaultHeaders = {
            'Content-Type': 'application/json',
        };

        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 && endpoint !== '/api/login') {
                    // Unauthorized, clear token and redirect to login
                    localStorage.removeItem('dtech_token');
                    localStorage.removeItem('dtech_user');
                    window.location.href = window.location.pathname.endsWith('public_app.html') ? 'index.html' : 'admin.html';
                }

                if (response.status === 403 && window.location.pathname.includes('public_app.html')) {
                    if (data.code === 'LIMIT_REACHED' || data.code === 'FEATURE_LOCKED' || data.code === 'OVER_LIMIT_FROZEN') {
                         Swal.fire({
                             icon: 'lock',
                             title: 'Upgrade Required',
                             text: data.message || 'You have reached a limit on your Free plan. Please upgrade to Premium to continue.',
                             confirmButtonText: 'View Plans',
                             confirmButtonColor: '#2563eb',
                             showCancelButton: true,
                             cancelButtonText: 'Cancel'
                         }).then((result) => {
                             if (result.isConfirmed && window.app && window.app.showSection) {
                                 window.app.showSection('plan');
                             }
                         });
                         // We throw an error so the calling function halts its execution (e.g. doesn't close modal)
                         const err = new Error(data.message || 'Plan limit reached');
                         err.isLimitError = true;
                         throw err;
                    }
                }

                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};