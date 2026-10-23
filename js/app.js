// app.js

const app = {
    init() {
        // Protect route
        if (!localStorage.getItem('dtech_token')) {
            window.location.href = 'admin.html';
            return;
        }

        // Set User Info
        const userStr = localStorage.getItem('dtech_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const unDisp = document.getElementById('userNameDisplay'); if (unDisp) unDisp.innerText = user.username;
        }

        this.initDarkMode();

        // Load specific data based on current page
        const path = window.location.pathname;
        if (path.includes('clients.html')) clientsManager.loadClients();
        else if (path.includes('products.html')) productsManager.loadProducts();
        else if (path.includes('licenses.html')) licensesManager.loadLicenses();
        else if (path.includes('quotations.html')) quotationsManager.loadQuotations();
        else if (path.includes('invoices.html')) invoicesManager.loadInvoices();
        else if (path.includes('payments.html')) paymentsManager.loadPayments();
        else if (path.includes('contracts.html')) contractsManager.loadContracts();
        else if (path.includes('financials.html')) {
            financialsManager.loadTransactions();
            financialsManager.switchTab('ledger');
        }
        else if (path.includes('dashboard.html')) this.loadDashboardData();
        else if (path.includes('plan.html') && typeof planManager !== 'undefined') planManager.loadPlanData();

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
        window.location.href = '' + sectionId + '.html';
    },


    logActivity(message) {
        console.log("Activity:", message);

        // Find activity container
        const activityContainer = document.querySelector('#section-dashboard .space-y-4');
        if (!activityContainer) return;

        const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        const activityHtml = `
            <div class="flex">
                <div class="flex-shrink-0">
                    <span class="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <i class="fas fa-info-circle"></i>
                    </span>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium">${message}</p>
                    <p class="text-xs text-gray-500">${timeStr}</p>
                </div>
            </div>
        `;

        // Insert at beginning
        activityContainer.insertAdjacentHTML('afterbegin', activityHtml);

        // Keep only last 10 activities (for simplicity)
        if (activityContainer.children.length > 10) {
            activityContainer.removeChild(activityContainer.lastElementChild);
        }
    },

    initDarkMode() {
        if (localStorage.theme === 'dark') {
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
                if (document.getElementById('stat-today-rev')) document.getElementById('stat-today-rev').innerText = 'R ' + (data.stats.todayRevenue || 0).toLocaleString();
                if (document.getElementById('stat-week-rev')) document.getElementById('stat-week-rev').innerText = 'R ' + (data.stats.weekRevenue || 0).toLocaleString();
                if (document.getElementById('stat-monthly-rev')) document.getElementById('stat-monthly-rev').innerText = 'R ' + (data.stats.monthlyRevenue || 0).toLocaleString();
                if (document.getElementById('stat-last-month-rev')) document.getElementById('stat-last-month-rev').innerText = 'R ' + (data.stats.lastMonthRevenue || 0).toLocaleString();
                if (document.getElementById('stat-year-rev')) document.getElementById('stat-year-rev').innerText = 'R ' + (data.stats.yearRevenue || 0).toLocaleString();
                if (document.getElementById('stat-total-rev')) document.getElementById('stat-total-rev').innerText = 'R ' + (data.stats.totalRevenue || 0).toLocaleString();
            }
        } catch (error) {
            console.error('Failed to load dashboard stats', error);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.endsWith('admin.html') && !window.location.pathname.endsWith('index.html')) {
        app.init();
    }
});
