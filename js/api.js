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
                    window.location.href = 'index.html';
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