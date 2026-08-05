// public_app.js

const app = {
    init() {
        // Protect route
        if (!localStorage.getItem('dtech_token') && window.location.pathname.includes('public_app')) {
            window.location.href = 'index.html';
            return;
        }

        // Set User Info
        const userStr = localStorage.getItem('dtech_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            document.getElementById('userNameDisplay').innerText = user.businessName || user.username;
        }

        this.initDarkMode();
        // Load dashboard data (which also initializes charts)
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
        const sections = ['dashboard', 'clients', 'products', 'licenses', 'quotations', 'invoices', 'payments', 'contracts', 'settings'];
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
        if (sectionId === 'settings') this.loadSettingsData();

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
    },

    async loadSettingsData() {
        try {
            const response = await API.request('/api/settings');
            if (response.success && response.settings) {
                document.getElementById('settingsBusinessName').value = response.settings.businessName || '';
                document.getElementById('settingsLogoUrl').value = response.settings.logoUrl || '';
                document.getElementById('settingsContactName').value = response.settings.contactName || '';
                document.getElementById('settingsEmail').value = response.settings.email || '';
                document.getElementById('settingsPhone').value = response.settings.phone || '';
                document.getElementById('settingsAddress').value = response.settings.address || '';
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        }
    },

    async saveSettings(e) {
        e.preventDefault();
        const saveBtn = document.getElementById('saveSettingsBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';

        try {
            const body = {
                businessName: document.getElementById('settingsBusinessName').value,
                logoUrl: document.getElementById('settingsLogoUrl').value,
                contactName: document.getElementById('settingsContactName').value,
                email: document.getElementById('settingsEmail').value,
                phone: document.getElementById('settingsPhone').value,
                address: document.getElementById('settingsAddress').value,
            };

            const response = await API.request('/api/settings', {
                method: 'PUT',
                body: JSON.stringify(body)
            });

            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Settings saved successfully',
                    timer: 1500,
                    showConfirmButton: false
                });

                // Update the user display name just in case
                const userStr = localStorage.getItem('dtech_user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    user.businessName = body.businessName;
                    localStorage.setItem('dtech_user', JSON.stringify(user));
                    document.getElementById('userNameDisplay').innerText = user.businessName;
                }
            }
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to save settings', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Settings';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('public_app')) {
        app.init();

        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => app.saveSettings(e));
        }
    }
});
