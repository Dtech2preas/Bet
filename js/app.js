// app.js

const app = {
    init() {
        // Protect route
        if (!localStorage.getItem('dtech_token') && window.location.pathname.endsWith('app.html')) {
            window.location.href = 'index.html';
            return;
        }

        // Set User Info
        const userStr = localStorage.getItem('dtech_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            document.getElementById('userNameDisplay').innerText = user.username;
        }

        this.initDarkMode();
        this.initCharts();
        this.loadDashboardData();
    },

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (sidebar.classList.contains('-translate-x-full')) {
            // Open sidebar
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
            // Prevent body scroll
            document.body.classList.add('overflow-hidden');
        } else {
            // Close sidebar
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
            // Restore body scroll
            document.body.classList.remove('overflow-hidden');
        }
    },

    showSection(sectionId) {
        // Hide all sections
        const sections = ['dashboard', 'clients', 'products', 'licenses', 'quotations', 'invoices', 'payments', 'contracts'];
        sections.forEach(sec => {
            document.getElementById(`section-${sec}`).classList.add('hidden');
            document.getElementById(`nav-${sec}`).classList.remove('active', 'bg-dtech-700', 'text-white');
            document.getElementById(`nav-${sec}`).classList.add('text-gray-700', 'dark:text-gray-300');
            document.getElementById(`nav-${sec}`).style.backgroundColor = '';
            document.getElementById(`nav-${sec}`).style.color = '';
        });

        // Show target section
        document.getElementById(`section-${sectionId}`).classList.remove('hidden');
        const navItem = document.getElementById(`nav-${sectionId}`);
        navItem.classList.add('active');
        navItem.classList.remove('text-gray-700', 'dark:text-gray-300');
        navItem.style.backgroundColor = '#1e3a8a';
        navItem.style.color = 'white';

        // Load specific data if needed
        if (sectionId === 'clients') clientsManager.loadClients();
        if (sectionId === 'products') productsManager.loadProducts();
        if (sectionId === 'licenses') licensesManager.loadLicenses();
        if (sectionId === 'quotations') quotationsManager.loadQuotations();
        if (sectionId === 'invoices') invoicesManager.loadInvoices();
        if (sectionId === 'payments') paymentsManager.loadPayments();
        if (sectionId === 'contracts') contractsManager.loadContracts();
        if (sectionId === 'dashboard') this.loadDashboardData();

        // Close sidebar on mobile after navigating
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
                this.toggleSidebar();
            }
        }
    },

    initDarkMode() {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            document.getElementById('theme-icon').classList.replace('fa-moon', 'fa-sun');
        } else {
            document.documentElement.classList.remove('dark');
        }
    },

    toggleDarkMode() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            document.getElementById('theme-icon').classList.replace('fa-sun', 'fa-moon');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            document.getElementById('theme-icon').classList.replace('fa-moon', 'fa-sun');
        }
    },

    initCharts() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue (ZAR)',
                    data: [12000, 19000, 15000, 22000, 18000, 25000],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    },

    async loadDashboardData() {
        try {
            const data = await API.request('/api/dashboard');
            if (data.success && data.stats) {
                document.getElementById('stat-clients').innerText = data.stats.totalClients;
                document.getElementById('stat-licenses').innerText = data.stats.activeLicenses;
                // Formatting currency
                document.getElementById('stat-monthly-rev').innerText = 'R ' + data.stats.monthlyRevenue.toLocaleString();
                document.getElementById('stat-total-rev').innerText = 'R ' + data.stats.totalRevenue.toLocaleString();
            }
        } catch (error) {
            console.error('Failed to load dashboard stats', error);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('app.html')) {
        app.init();
    }
});