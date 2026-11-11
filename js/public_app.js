// public_app.js

const app = {
    userPlan: 'Free',
    async init() {
        // Protect route
        if (!localStorage.getItem('dtech_token') && window.location.pathname.includes('public_app')) {
            window.location.href = 'index.html';
            return;
        }

        // Set User Info
        const userStr = localStorage.getItem('dtech_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const unDisp = document.getElementById('userNameDisplay'); if (unDisp) unDisp.innerText = user.businessName || user.username;
        }

        this.initDarkMode();
        this.highlightActiveNavLink();

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
        else if (path.includes('financials-config.html')) {
            if (typeof financialsManager !== 'undefined') {
                financialsManager.loadFinancialSettings().then(() => {
                    financialsManager.renderConfigTab();
                });
            }
        }
        else if (path.includes('csv-upload.html')) {
            if (typeof financialsManager !== 'undefined') {
                financialsManager.loadFinancialSettings();
            }
        }
        else if (path.includes('dashboard.html')) this.loadDashboardData();
        else if (path.includes('plan.html') && typeof planManager !== 'undefined') planManager.loadPlanData();
        else if (path.includes('settings.html')) this.loadSettingsData();

        this.checkPaymentStatus();

        // Fetch plan state
        try {
            const subData = await API.request('/api/subscription');
            if (subData.success) {
                this.userPlan = subData.subscription.plan || "Free";
                this.updateNavLocks();
            }
        } catch (e) {
            console.error("Failed to load subscription plan", e);
        }

        try {
            localStorage.removeItem('dtech_tour_step');
        } catch (e) {}

        this.initTourUI();
        if ((path.includes('dashboard.html') || path === '/' || path.endsWith('/')) && !localStorage.getItem('portal_guide_viewed') && localStorage.getItem('dtech_new_user') !== 'true') {
            setTimeout(() => this.showInteractiveGuide(false), 800);
        }

        // Guided Onboarding for new users
        if (localStorage.getItem('dtech_new_user') === 'true') {
            localStorage.removeItem('dtech_new_user');
            setTimeout(() => {
                Swal.fire({
                    icon: 'info',
                    title: 'Welcome!',
                    text: 'Please set up your business profile and banking details so you can start generating invoices.',
                    confirmButtonText: 'Go to Settings',
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.showSection('settings');
                    }
                });
            }, 500);
        }
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

    updateNavLocks() {
        const lockContainers = document.querySelectorAll('.lock-container');
        lockContainers.forEach(container => {
            if (this.userPlan === 'Premium' || this.userPlan === 'Pro') {
                container.innerHTML = '';
            } else {
                container.innerHTML = '<i class="fas fa-lock text-gray-400 text-xs"></i>';
            }
        });

        const templateSelect = document.getElementById('settingsPdfTemplate');
        const premiumLockIcons = document.querySelectorAll('.premium-lock-icon');

        if (templateSelect) {
            if (this.userPlan === 'Premium') {
                templateSelect.disabled = false;
                premiumLockIcons.forEach(icon => icon.classList.add('hidden'));
            } else {
                templateSelect.disabled = true;
                templateSelect.value = 'Standard';
                premiumLockIcons.forEach(icon => icon.classList.remove('hidden'));
            }
        }

        const exportBtns = document.querySelectorAll('.export-btn');
        if (this.userPlan === 'Premium') {
            exportBtns.forEach(btn => btn.classList.remove('hidden'));

            const btnBulkDeleteQuotations = document.getElementById('btn-bulk-delete-quotations');
            if (btnBulkDeleteQuotations) btnBulkDeleteQuotations.classList.remove('hidden');

            const btnBulkDeleteInvoices = document.getElementById('btn-bulk-delete-invoices');
            if (btnBulkDeleteInvoices) btnBulkDeleteInvoices.classList.remove('hidden');
        } else {
            exportBtns.forEach(btn => btn.classList.add('hidden'));

            const btnBulkDeleteQuotations = document.getElementById('btn-bulk-delete-quotations');
            if (btnBulkDeleteQuotations) btnBulkDeleteQuotations.classList.add('hidden');

            const btnBulkDeleteInvoices = document.getElementById('btn-bulk-delete-invoices');
            if (btnBulkDeleteInvoices) btnBulkDeleteInvoices.classList.add('hidden');
        }

        const proPremiumStats = document.querySelectorAll('.stat-pro-premium');
        if (this.userPlan === 'Pro' || this.userPlan === 'Premium') {
            proPremiumStats.forEach(el => el.classList.remove('hidden'));
        } else {
            proPremiumStats.forEach(el => el.classList.add('hidden'));
        }

        const premiumStats = document.querySelectorAll('.stat-premium');
        if (this.userPlan === 'Premium') {
            premiumStats.forEach(el => el.classList.remove('hidden'));
        } else {
            premiumStats.forEach(el => el.classList.add('hidden'));
        }
    },

    handleLockedSection(sectionId, event) {
        if (event) event.preventDefault();

        if (this.userPlan === 'Premium' || this.userPlan === 'Pro') {
            this.showSection(sectionId);
        } else {
            Swal.fire({
                icon: 'lock',
                title: 'Locked Feature',
                text: `The ${sectionId} module is locked. Upgrade to Pro or Premium to unlock this and other advanced features.`,
                confirmButtonText: 'View Plans',
                confirmButtonColor: '#2563eb',
                showCancelButton: true,
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.showSection('plan');
                }
            });
        }
    },

    showSection(sectionId) {
        window.location.href = 'public_' + sectionId + '.html';
    },

    highlightActiveNavLink() {
        const currentPath = window.location.pathname.split('/').pop() || 'public_dashboard.html';
        const navLinks = document.querySelectorAll('#nav-dropdown a');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href === currentPath || (currentPath === '' && href.includes('dashboard')))) {
                link.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-800');
                link.classList.add('bg-dtech-50', 'dark:bg-dtech-900/40', 'text-dtech-600', 'dark:text-dtech-400', 'font-semibold', 'rounded-md');
            }
        });
    },

    async exportData() {
        if (this.userPlan !== 'Premium') {
            Swal.fire({
                icon: 'warning',
                title: 'Premium Feature',
                text: 'Exporting data is available on the Premium plan.'
            });
            return;
        }

        try {
            const data = await API.request('/api/dashboard');
            if (data.success && data.stats) {
                const stats = data.stats;
                let csvContent = `Metric,Value\n`;
                csvContent += `Total Clients,${stats.totalClients}\n`;
                csvContent += `Active Licenses,${stats.activeLicenses}\n`;
                csvContent += `Today Revenue,${stats.todayRevenue || 0}\n`;
                csvContent += `This Week Revenue,${stats.weekRevenue || 0}\n`;
                csvContent += `This Month Revenue,${stats.monthlyRevenue || 0}\n`;
                csvContent += `Last Month Revenue,${stats.lastMonthRevenue || 0}\n`;
                csvContent += `This Year Revenue,${stats.yearRevenue || 0}\n`;
                csvContent += `Total Revenue,${stats.totalRevenue || 0}\n`;

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `dashboard_export_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Failed to export dashboard data', error);
            Swal.fire('Error', 'Failed to export data', 'error');
        }
    },

    async exportCSV(type) {
        if (this.userPlan !== 'Premium') return;

        let data = [];
        let filename = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;

        if (type === 'clients' && typeof clientsManager !== 'undefined') {
            data = clientsManager.clients;
        } else if (type === 'invoices' && typeof invoicesManager !== 'undefined') {
            data = invoicesManager.invoices;
        } else if (type === 'payments' && typeof paymentsManager !== 'undefined') {
            data = paymentsManager.payments;
        }

        if (!data || data.length === 0) {
            Swal.fire({icon: 'info', title: 'Nothing to export', text: 'No records found to export.'});
            return;
        }

        const escapeCSV = (str) => {
            if (str === null || str === undefined) return '';
            const s = String(str);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };

        const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');

        let csvContent = headers.map(escapeCSV).join(',') + '\n';

        data.forEach(row => {
            const rowArr = headers.map(header => escapeCSV(row[header]));
            csvContent += rowArr.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    _lastChartData: null,

    renderChart(chartData) {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        if (typeof Chart === 'undefined') {
            console.warn("Chart.js library not loaded");
            return;
        }

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#9ca3af' : '#4b5563';
        const gridColor = isDark ? '#374151' : '#e5e7eb';

        const labels = (chartData && chartData.labels && chartData.labels.length) ? chartData.labels : ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
        const dataVals = (chartData && chartData.data && chartData.data.length) ? chartData.data : [0, 0, 0, 0, 0, 0];

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Revenue (ZAR)',
                    data: dataVals,
                    backgroundColor: '#0284c7',
                    hoverBackgroundColor: '#0369a1',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: (val) => 'R ' + Number(val).toLocaleString()
                        },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` Revenue: R ${Number(ctx.raw || 0).toLocaleString()}`
                        }
                    }
                }
            }
        });
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
            document.getElementById('theme-icon')?.classList.replace('fa-sun', 'fa-moon');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            document.getElementById('theme-icon')?.classList.replace('fa-moon', 'fa-sun');
        }
        if (this.chartInstance && this._lastChartData) {
            this.renderChart(this._lastChartData);
        }
    },



    setBillingInterval(interval) {
        const btnMonthly = document.getElementById('btn-monthly');
        const btnQuarterly = document.getElementById('btn-quarterly');
        const btnYearly = document.getElementById('btn-yearly');

        const pricePro = document.getElementById('price-pro');
        const pricePremium = document.getElementById('price-premium');
        const periodPro = document.getElementById('period-pro');
        const periodPremium = document.getElementById('period-premium');

        // Reset all buttons
        [btnMonthly, btnQuarterly, btnYearly].forEach(btn => {
            btn.className = "px-4 py-2 text-sm font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all";
        });
        // Special case for yearly text
        btnYearly.innerHTML = 'Yearly <span class="ml-2 bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded">SAVE</span>';

        // Set active button
        if (interval === 'monthly') {
            btnMonthly.className = "px-4 py-2 text-sm font-medium rounded-md bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white transition-all";
            pricePro.innerText = 'R49';
            pricePremium.innerText = 'R129';
            periodPro.innerText = '/mo';
            periodPremium.innerText = '/mo';
            this.currentBillingInterval = 'monthly';
        } else if (interval === 'quarterly') {
            btnQuarterly.className = "px-4 py-2 text-sm font-medium rounded-md bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white transition-all";
            pricePro.innerText = 'R135';
            pricePremium.innerText = 'R350';
            periodPro.innerText = '/3mo';
            periodPremium.innerText = '/3mo';
            this.currentBillingInterval = 'quarterly';
        } else if (interval === 'yearly') {
            btnYearly.className = "px-4 py-2 text-sm font-medium rounded-md bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white transition-all flex items-center";
            btnYearly.innerHTML = 'Yearly <span class="ml-2 bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded">SAVE</span>';
            pricePro.innerText = 'R490';
            pricePremium.innerText = 'R1,290';
            periodPro.innerText = '/yr';
            periodPremium.innerText = '/yr';
            this.currentBillingInterval = 'yearly';
        }
    },

async paySubscription(planTier) {
        let amount = 0;
        const interval = this.currentBillingInterval || 'monthly';

        if (planTier === 'Pro') {
            if (interval === 'monthly') amount = 49;
            if (interval === 'quarterly') amount = 135;
            if (interval === 'yearly') amount = 490;
        } else if (planTier === 'Premium') {
            if (interval === 'monthly') amount = 129;
            if (interval === 'quarterly') amount = 350;
            if (interval === 'yearly') amount = 1290;
        }

        try {
            // Save amount locally so we can update the subscription on return
            localStorage.setItem('dtech_pending_payment', amount);

            const response = await API.request('/api/checkout', {
                method: 'POST',
                body: JSON.stringify({
                    amount: amount,
                    type: 'subscription',
                    platform: window.Capacitor && window.Capacitor.isNativePlatform() ? 'capacitor' : 'web'
                })
            });

            if (response.success && response.redirectUrl) {
                // Redirect user to Yoco Checkout
                if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                    const { Browser } = window.Capacitor.Plugins;
                    await Browser.open({ url: response.redirectUrl });
                } else {
                    window.location.href = response.redirectUrl;
                }
            } else {
                throw new Error(response.message || 'Could not initiate payment');
            }
        } catch (error) {
            Swal.fire('Payment Error', error.message, 'error');
        }
    },

    async checkPaymentStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        const token = urlParams.get('token');

        if (paymentStatus === 'success' && token) {
            localStorage.removeItem('dtech_pending_payment'); // clear it just in case

            try {
                const res = await API.request('/api/subscription', {
                    method: 'POST',
                    body: JSON.stringify({ token: token })
                });

                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Payment Successful',
                        text: 'Thank you! Your subscription plan has been updated.',
                    });
                } else {
                     throw new Error(res.message || 'Payment verification failed.');
                }
            } catch (err) {
                console.error("Failed to update subscription", err);
                Swal.fire({
                    icon: 'error',
                    title: 'Verification Error',
                    text: err.message || 'We received your payment but there was an issue verifying it. Please contact support.',
                });
            }

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            this.showSection('plan');
        } else if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
            localStorage.removeItem('dtech_pending_payment');
            Swal.fire({
                icon: 'error',
                title: 'Payment Failed',
                text: 'Your payment was cancelled or failed. Please try again.',
            });
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            this.showSection('plan');
        } else if (paymentStatus === 'success' && !token) {
            // Success but no token, just clear URL and ignore as it might be a manual tamper
            window.history.replaceState({}, document.title, window.location.pathname);
            this.showSection('plan');
        }

        // Fetch and Update subscription UI
        try {
            const res = await API.request('/api/subscription');
            if (res.success && res.subscription) {
                const sub = res.subscription;
                const nbDate = document.getElementById('nextBillingDate');
                const badge = document.getElementById('planBadge');
                const price = document.getElementById('planPriceDisplay');
                const status = document.getElementById('planStatusText');
                const featuresList = document.getElementById('planFeaturesList');

                const btnFree = document.getElementById('btn-sub-free');
                const btnPro = document.getElementById('btn-sub-pro');
                const btnPremium = document.getElementById('btn-sub-premium');

                if (btnFree) {
                    btnFree.innerText = 'Current Plan';
                    btnFree.disabled = true;
                    btnFree.className = 'w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 cursor-not-allowed';
                }
                if (btnPro) {
                    btnPro.innerHTML = '<i class="fas fa-lock mr-2"></i> Subscribe Pro';
                    btnPro.disabled = false;
                    btnPro.className = 'w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
                }
                if (btnPremium) {
                    btnPremium.innerHTML = '<i class="fas fa-lock mr-2"></i> Subscribe Premium';
                    btnPremium.disabled = false;
                    btnPremium.className = 'w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white';
                }

                if (sub.plan === 'Premium') {
                    if (btnPremium) {
                        btnPremium.innerText = 'Current Plan';
                        btnPremium.disabled = true;
                        btnPremium.className = 'w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 cursor-not-allowed';
                    }
                    if (btnFree) {
                        btnFree.innerText = 'Subscribe Free';
                        btnFree.disabled = false;
                        btnFree.className = 'w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50';
                    }

                    if (badge) {
                        badge.className = "bg-gray-900 text-white text-xs font-semibold mr-2 px-2.5 py-0.5 rounded";
                        badge.innerText = "Premium";
                    }
                    if (price) price.innerHTML = `Premium <span class="text-sm font-normal text-gray-500">/ active</span>`;

                    const endDate = new Date(sub.endDate);
                    const now = new Date();

                    if (endDate > now) {
                        if (status) {
                            status.className = "text-green-600";
                            status.innerText = "Active";
                        }
                        if (nbDate) nbDate.innerText = "Next billing date: " + endDate.toLocaleDateString();
                    } else {
                        if (status) {
                            status.className = "text-red-600";
                            status.innerText = "Expired";
                        }
                        if (nbDate) nbDate.innerText = "Your subscription has expired. Please renew.";
                    }
                } else if (sub.plan === 'Pro') {
                    if (btnPro) {
                        btnPro.innerText = 'Current Plan';
                        btnPro.disabled = true;
                        btnPro.className = 'w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 cursor-not-allowed';
                    }
                    if (btnFree) {
                        btnFree.innerText = 'Subscribe Free';
                        btnFree.disabled = false;
                        btnFree.className = 'w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50';
                    }

                    if (badge) {
                        badge.className = "bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800";
                        badge.innerText = "Pro";
                    }
                    if (price) price.innerHTML = `Pro <span class="text-sm font-normal text-gray-500">/ active</span>`;

                    const endDate = new Date(sub.endDate);
                    const now = new Date();

                    if (endDate > now) {
                        if (status) {
                            status.className = "text-green-600";
                            status.innerText = "Active";
                        }
                        if (nbDate) nbDate.innerText = "Next billing date: " + endDate.toLocaleDateString();
                    } else {
                        if (status) {
                            status.className = "text-red-600";
                            status.innerText = "Expired";
                        }
                        if (nbDate) nbDate.innerText = "Your subscription has expired. Please renew.";
                    }
                } else {
                    // Free Plan defaults
                    if (badge) {
                        badge.className = "bg-gray-100 text-gray-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300";
                        badge.innerText = "Free";
                    }
                    if (price) price.innerHTML = `R0 <span class="text-sm font-normal text-gray-500">/ forever</span>`;
                    if (status) {
                        status.className = "text-gray-600 dark:text-gray-400";
                        status.innerText = "Basic";
                    }
                    if (nbDate) nbDate.innerText = "Upgrade your plan for higher limits and features.";
                }
            }
        } catch(e) {
            console.error("Could not fetch subscription", e);
        }
    },

    dismissProfileCompleteness() {
        localStorage.setItem('dtech_profile_completeness_dismissed', 'true');
        const widget = document.getElementById('profile-completeness-widget');
        if (widget) widget.classList.add('hidden');
    },

    async checkProfileCompleteness() {
        if (this.userPlan === 'Premium' || localStorage.getItem('dtech_profile_completeness_dismissed') === 'true') {
            return;
        }

        try {
            const response = await API.request('/api/settings');
            let score = 0;
            if (response.success && response.settings) {
                if (response.settings.logoUrl) score += 33.3;
                if (response.settings.brandColor && response.settings.brandColor !== '#2563eb') score += 33.3;
                if (response.settings.accountNumber && response.settings.bank) score += 33.4;
            }

            score = Math.min(100, Math.round(score));

            if (score < 100) {
                const widget = document.getElementById('profile-completeness-widget');
                const bar = document.getElementById('profile-completeness-bar');
                const text = document.getElementById('profile-completeness-text');
                if (widget && bar && text) {
                    widget.classList.remove('hidden');
                    setTimeout(() => {
                        bar.style.width = `${score}%`;
                    }, 100);
                    text.innerText = `Setup your business profile to 100% to start generating documents. (Current: ${score}%)`;
                }
            } else {
                localStorage.setItem('dtech_profile_completeness_dismissed', 'true');
            }
        } catch (e) {
            console.warn('Could not check profile completeness', e);
        }
    },

    async loadDashboardData() {
        this.checkProfileCompleteness();

        let queryParams = '';
        if (this.userPlan === 'Premium') {
            const filterContainer = document.getElementById('dashboard-filter-container');
            if (filterContainer) filterContainer.classList.remove('hidden');

            const startDate = document.getElementById('dashboardStartDate')?.value;
            const endDate = document.getElementById('dashboardEndDate')?.value;

            if (startDate && endDate) {
                queryParams = `?filter=custom&start=${startDate}&end=${endDate}`;
            }
        }

        try {
            const data = await API.request(`/api/dashboard${queryParams}`);
            if (data.success && data.stats) {
                const stats = { ...data.stats };

                // Ensure ledger income transactions are counted if current worker hasn't been redeployed
                try {
                    const txRes = await API.request('/api/transactions?limit=1000');
                    if (txRes && txRes.success && txRes.transactions && txRes.transactions.length > 0) {
                        const txs = txRes.transactions;
                        const incomeTxs = txs.filter(t => t.type === 'Income' || (Number(t.amount) > 0 && t.type !== 'Expense'));
                        const totalTxIncome = incomeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

                        if (totalTxIncome > 0) {
                            const now = new Date();
                            const todayStr = now.toISOString().split('T')[0];
                            const currentMonth = now.toISOString().slice(0, 7);
                            const currentYear = now.getFullYear();

                            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                            const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);

                            let txToday = 0, txMonth = 0, txLastMonth = 0, txYear = 0, txTotal = 0;
                            incomeTxs.forEach(t => {
                                const amt = Number(t.amount) || 0;
                                const dStr = t.date || (t.dateAdded ? t.dateAdded.split('T')[0] : '');
                                txTotal += amt;
                                if (dStr) {
                                    if (dStr === todayStr) txToday += amt;
                                    if (dStr.startsWith(currentMonth)) txMonth += amt;
                                    if (dStr.startsWith(lastMonthStr)) txLastMonth += amt;
                                    if (dStr.startsWith(String(currentYear))) txYear += amt;
                                }
                            });

                            if ((stats.totalRevenue || 0) < txTotal) {
                                stats.todayRevenue = Math.max(stats.todayRevenue || 0, txToday);
                                stats.monthlyRevenue = Math.max(stats.monthlyRevenue || 0, txMonth);
                                stats.lastMonthRevenue = Math.max(stats.lastMonthRevenue || 0, txLastMonth);
                                stats.yearRevenue = Math.max(stats.yearRevenue || 0, txYear);
                                stats.totalRevenue = Math.max(stats.totalRevenue || 0, txTotal);
                            }
                        }
                    }
                } catch (txErr) {
                    console.warn('Could not cross-check transactions for dashboard stats', txErr);
                }

                document.getElementById('stat-clients').innerText = stats.totalClients || 0;
                document.getElementById('stat-licenses').innerText = stats.activeLicenses || 0;
                // Formatting currency
                if (document.getElementById('stat-today-rev')) document.getElementById('stat-today-rev').innerText = 'R ' + (stats.todayRevenue || 0).toLocaleString();
                if (document.getElementById('stat-week-rev')) document.getElementById('stat-week-rev').innerText = 'R ' + (stats.weekRevenue || 0).toLocaleString();
                if (document.getElementById('stat-monthly-rev')) document.getElementById('stat-monthly-rev').innerText = 'R ' + (stats.monthlyRevenue || 0).toLocaleString();
                if (document.getElementById('stat-last-month-rev')) document.getElementById('stat-last-month-rev').innerText = 'R ' + (stats.lastMonthRevenue || 0).toLocaleString();
                if (document.getElementById('stat-year-rev')) document.getElementById('stat-year-rev').innerText = 'R ' + (stats.yearRevenue || 0).toLocaleString();
                if (document.getElementById('stat-total-rev')) document.getElementById('stat-total-rev').innerText = 'R ' + (stats.totalRevenue || 0).toLocaleString();

                const chartData = data.chartData || (stats && stats.chartData);
                if (chartData) {
                    this._lastChartData = chartData;
                    this.renderChart(chartData);
                }
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

                const previewContainer = document.getElementById('logoPreviewContainer');
                const previewImg = document.getElementById('logoPreview');
                if (response.settings.logoUrl) {
                    previewImg.src = response.settings.logoUrl;
                    previewContainer.classList.remove('hidden');
                } else {
                    previewContainer.classList.add('hidden');
                }

                document.getElementById('settingsContactName').value = response.settings.contactName || '';
                document.getElementById('settingsEmail').value = response.settings.email || '';
                document.getElementById('settingsPhone').value = response.settings.phone || '';
                document.getElementById('settingsWhatsApp').value = response.settings.whatsapp || '';
                document.getElementById('settingsWebsite').value = response.settings.website || '';
                document.getElementById('settingsAddress').value = response.settings.address || '';

                if (response.settings.brandColor) {
                    const colorInput = document.getElementById('settingsBrandColor');
                    if(colorInput) colorInput.value = response.settings.brandColor;
                    const colorDisplay = document.getElementById('brandColorDisplay');
                    if(colorDisplay) colorDisplay.textContent = response.settings.brandColor;
                }

                if (response.settings.pdfTemplate) {
                    const templateSelect = document.getElementById('settingsPdfTemplate');
                    if (templateSelect) templateSelect.value = response.settings.pdfTemplate;
                }

                document.getElementById('settingsAccountHolder').value = response.settings.accountHolder || '';


                // Set bank value correctly considering "Other"
                const bankSelect = document.getElementById('settingsBank');
                const bankOther = document.getElementById('settingsBankOther');
                const knownBanks = ['FNB', 'Standard Bank', 'Absa', 'Nedbank', 'Capitec', 'Investec', 'TymeBank', 'Discovery Bank'];

                if (response.settings.bank) {
                    if (knownBanks.includes(response.settings.bank)) {
                        bankSelect.value = response.settings.bank;
                        bankOther.classList.add('hidden');
                    } else {
                        bankSelect.value = 'Other';
                        bankOther.classList.remove('hidden');
                        bankOther.value = response.settings.bank;
                    }
                } else {
                    bankSelect.value = '';
                }

                const typeSelect = document.getElementById('settingsAccountType');
                const typeOther = document.getElementById('settingsAccountTypeOther');
                const knownTypes = ['Current/Cheque', 'Savings', 'Transmission'];
                if (response.settings.accountType) {
                    if (knownTypes.includes(response.settings.accountType)) {
                        typeSelect.value = response.settings.accountType;
                        typeOther.classList.add('hidden');
                    } else {
                        typeSelect.value = 'Other';
                        typeOther.classList.remove('hidden');
                        typeOther.value = response.settings.accountType;
                    }
                }

                document.getElementById('settingsAccountNumber').value = response.settings.accountNumber || '';
                document.getElementById('settingsBranchCode').value = response.settings.branchCode || '';
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
            let logoUrl = document.getElementById('settingsLogoUrl').value;
            const logoFile = document.getElementById('settingsLogoFile').files[0];

            if (logoFile) {
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Uploading Image...';

                const reader = new FileReader();
                const imageBase64 = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(logoFile);
                });

                const uploadResponse = await API.request('/api/upload', { method: 'POST', body: JSON.stringify({ image: imageBase64 }) });
                if (uploadResponse.success && uploadResponse.url) {
                    logoUrl = uploadResponse.url;
                    document.getElementById('settingsLogoUrl').value = logoUrl;
                    const previewContainer = document.getElementById('logoPreviewContainer');
                    const previewImg = document.getElementById('logoPreview');
                    previewImg.src = logoUrl;
                    previewContainer.classList.remove('hidden');
                } else {
                    throw new Error(uploadResponse.message || 'Image upload failed');
                }
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
            }

            const body = {
                businessName: document.getElementById('settingsBusinessName').value,
                logoUrl: logoUrl,
                contactName: document.getElementById('settingsContactName').value,
                email: document.getElementById('settingsEmail').value,
                phone: document.getElementById('settingsPhone').value,
                whatsapp: document.getElementById('settingsWhatsApp').value,
                website: document.getElementById('settingsWebsite').value,
                address: document.getElementById('settingsAddress').value,
                brandColor: document.getElementById('settingsBrandColor') ? document.getElementById('settingsBrandColor').value : '#2563eb',
                pdfTemplate: document.getElementById('settingsPdfTemplate') ? document.getElementById('settingsPdfTemplate').value : 'Standard',
                accountHolder: document.getElementById('settingsAccountHolder').value,
                bank: document.getElementById('settingsBank').value === 'Other' ? document.getElementById('settingsBankOther').value : document.getElementById('settingsBank').value,
                accountType: document.getElementById('settingsAccountType').value === 'Other' ? document.getElementById('settingsAccountTypeOther').value : document.getElementById('settingsAccountType').value,
                accountNumber: document.getElementById('settingsAccountNumber').value,
                branchCode: document.getElementById('settingsBranchCode').value,
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
                    const unDisp = document.getElementById('userNameDisplay'); if (unDisp) unDisp.innerText = user.businessName;
                }
            }
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to save settings', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Settings';
        }
    },

    initTourUI() {
        // 1. Add Quick Guide button next to theme icon if not present
        const themeIcon = document.getElementById('theme-icon');
        const themeBtn = themeIcon ? themeIcon.closest('button') : null;
        if (themeBtn && !document.getElementById('headerQuickGuideBtn')) {
            const guideBtn = document.createElement('button');
            guideBtn.id = 'headerQuickGuideBtn';
            guideBtn.type = 'button';
            guideBtn.className = 'w-10 h-10 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-1';
            guideBtn.title = 'Interactive Visual Guide';
            guideBtn.setAttribute('aria-label', 'Interactive Visual Guide');
            guideBtn.onclick = () => this.showInteractiveGuide(true);
            guideBtn.innerHTML = '<i class="fas fa-question-circle text-lg text-blue-500"></i>';
            themeBtn.parentNode.insertBefore(guideBtn, themeBtn);
        }

        // 2. Add Quick Guide item in nav dropdown menu if not present
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn && !document.getElementById('navQuickGuideBtn')) {
            const navBtn = document.createElement('button');
            navBtn.id = 'navQuickGuideBtn';
            navBtn.type = 'button';
            navBtn.className = 'w-full text-left text-gray-700 dark:text-gray-300 block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors';
            navBtn.onclick = () => {
                const navDropdown = document.getElementById('nav-dropdown');
                if (navDropdown) navDropdown.classList.add('hidden');
                this.showInteractiveGuide(true);
            };
            navBtn.innerHTML = '<i class="fas fa-question-circle mr-2 w-4 text-center text-blue-500"></i> Interactive Guide';
            logoutBtn.parentNode.insertBefore(navBtn, logoutBtn);
        }
    },

    showInteractiveGuide(force = false) {
        if (!force && localStorage.getItem('portal_guide_viewed') === 'true') {
            return;
        }

        let modal = document.getElementById('interactiveGuideModal');
        if (modal) modal.remove();

        const isPublic = window.location.pathname.includes('public_');
        const dashboardUrl = isPublic ? 'public_dashboard.html' : 'dashboard.html';
        const settingsUrl = isPublic ? 'public_settings.html' : 'financials-config.html';
        const invoicesUrl = isPublic ? 'public_invoices.html' : 'invoices.html';
        const csvUrl = isPublic ? 'public_csv-upload.html' : 'csv-upload.html';

        modal = document.createElement('div');
        modal.id = 'interactiveGuideModal';
        modal.setAttribute('style', 'position: fixed; inset: 0; z-index: 999999 !important; background-color: rgba(15, 23, 42, 0.75); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); transition: opacity 0.25s ease;');
        modal.onclick = (e) => {
            if (e.target === modal) this.closeInteractiveGuide(true);
        };

        modal.innerHTML = `
            <div class="relative w-full max-w-xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden flex flex-col max-h-[92vh] animate-fade-in" id="guideModalCard" onclick="event.stopPropagation()">
                <!-- Header with Steps Navigation -->
                <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/50">
                    <div class="flex items-center gap-1 sm:gap-2 overflow-x-auto text-xs font-semibold py-1">
                        <button type="button" onclick="app.setGuideStep(1)" id="guideStepTab1" class="guide-tab-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full transition bg-blue-600 text-white shadow-xs">
                            <span class="w-4 h-4 rounded-full bg-white/25 text-[10px] flex items-center justify-center font-bold">1</span>
                            <span class="hidden sm:inline">Dashboard</span>
                        </button>
                        <i class="fas fa-arrow-right text-[9px] text-gray-400"></i>
                        <button type="button" onclick="app.setGuideStep(2)" id="guideStepTab2" class="guide-tab-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full transition text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800">
                            <span class="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] flex items-center justify-center font-bold">2</span>
                            <span class="hidden sm:inline">Settings</span>
                        </button>
                        <i class="fas fa-arrow-right text-[9px] text-gray-400"></i>
                        <button type="button" onclick="app.setGuideStep(3)" id="guideStepTab3" class="guide-tab-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full transition text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800">
                            <span class="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] flex items-center justify-center font-bold">3</span>
                            <span class="hidden sm:inline">Invoices</span>
                        </button>
                        <i class="fas fa-arrow-right text-[9px] text-gray-400"></i>
                        <button type="button" onclick="app.setGuideStep(4)" id="guideStepTab4" class="guide-tab-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full transition text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800">
                            <span class="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] flex items-center justify-center font-bold">4</span>
                            <span class="hidden sm:inline">Reconcile</span>
                        </button>
                    </div>

                    <div class="flex items-center gap-2 pl-2">
                        <button type="button" onclick="app.closeInteractiveGuide(true)" class="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition px-1.5 py-1 hidden sm:inline-block">
                            Skip
                        </button>
                        <button type="button" onclick="app.closeInteractiveGuide(true)" class="w-7 h-7 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition" aria-label="Close guide">
                            <i class="fas fa-times text-sm"></i>
                        </button>
                    </div>
                </div>

                <!-- Slide Content Body -->
                <div class="p-5 sm:p-6 overflow-y-auto flex-1">
                    <!-- Slide 1: Dashboard -->
                    <div id="guideSlide1" class="guide-slide space-y-4">
                        <div class="bg-gradient-to-br from-blue-50 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 shadow-inner">
                            <div class="flex items-center justify-between pb-2 mb-2.5 border-b border-blue-100/80 dark:border-blue-900/40 text-[11px] font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                                <span class="flex items-center gap-1.5"><i class="fas fa-chart-line text-blue-500"></i> Command Center Preview</span>
                                <span class="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded text-[10px]">Step 1 of 4</span>
                            </div>
                            <div class="grid grid-cols-3 gap-2 text-center">
                                <div class="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-100 dark:border-gray-700 shadow-xs">
                                    <div class="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Today's Rev</div>
                                    <div class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">R 12,450</div>
                                </div>
                                <div class="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-100 dark:border-gray-700 shadow-xs">
                                    <div class="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Monthly Rev</div>
                                    <div class="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">R 84,200</div>
                                </div>
                                <div class="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-100 dark:border-gray-700 shadow-xs">
                                    <div class="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Active Clients</div>
                                    <div class="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">38</div>
                                </div>
                            </div>
                            <div class="mt-2.5 text-center">
                                <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                                    <i class="fas fa-arrow-up text-[10px] animate-bounce text-blue-500"></i> Real-time revenue cards & cashflow health graphs
                                </span>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                1. Business Dashboard
                            </h3>
                            <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                Welcome! Your dashboard is your financial command center. Monitor daily, weekly, and monthly revenue, track client activity, and see quick cashflow indicators at a glance.
                            </p>
                        </div>

                        <div class="flex items-center justify-between pt-1">
                            <button type="button" onclick="app.jumpToGuideSection('${dashboardUrl}')" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5">
                                <i class="fas fa-external-link-alt text-[10px]"></i> Open Dashboard
                            </button>
                            <span class="text-[11px] text-gray-400">Next: Business Profile & Banking ➔</span>
                        </div>
                    </div>

                    <!-- Slide 2: Settings -->
                    <div id="guideSlide2" class="guide-slide space-y-4 hidden">
                        <div class="bg-gradient-to-br from-emerald-50 to-teal-50/70 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-4 shadow-inner">
                            <div class="flex items-center justify-between pb-2 mb-2.5 border-b border-emerald-100/80 dark:border-emerald-900/40 text-[11px] font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                                <span class="flex items-center gap-1.5"><i class="fas fa-building text-emerald-500"></i> Business Profile Setup</span>
                                <span class="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded text-[10px]">Step 2 of 4</span>
                            </div>
                            <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2 text-xs">
                                <div class="flex items-center justify-between">
                                    <span class="font-medium text-gray-500 dark:text-gray-400 text-[11px]">Logo & Branding</span>
                                    <span class="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">✔ Active</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="font-medium text-gray-500 dark:text-gray-400 text-[11px]">CIPC & SARS VAT</span>
                                    <span class="text-gray-800 dark:text-gray-200 font-mono text-[11px]">4710293847</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="font-medium text-gray-500 dark:text-gray-400 text-[11px]">EFT Bank Details</span>
                                    <span class="text-gray-800 dark:text-gray-200 text-[11px]">FNB Cheque ••••4102</span>
                                </div>
                            </div>
                            <div class="mt-2.5 text-center">
                                <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                    <i class="fas fa-arrow-up text-[10px] animate-bounce text-emerald-500"></i> Automatically injected into every invoice & quote PDF!
                                </span>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                2. Business Profile & Bank Details
                            </h3>
                            <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                Upload your company logo, set your South African CIPC registration and SARS VAT number, and configure your EFT banking account details. All generated invoices will include your payment details automatically.
                            </p>
                        </div>

                        <div class="flex items-center justify-between pt-1">
                            <button type="button" onclick="app.jumpToGuideSection('${settingsUrl}')" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5">
                                <i class="fas fa-external-link-alt text-[10px]"></i> Open Settings
                            </button>
                            <span class="text-[11px] text-gray-400">Next: Invoicing & Quotes ➔</span>
                        </div>
                    </div>

                    <!-- Slide 3: Invoices -->
                    <div id="guideSlide3" class="guide-slide space-y-4 hidden">
                        <div class="bg-gradient-to-br from-sky-50 to-blue-50/70 dark:from-sky-950/40 dark:to-blue-950/40 border border-sky-100 dark:border-sky-900/40 rounded-xl p-4 shadow-inner">
                            <div class="flex items-center justify-between pb-2 mb-2.5 border-b border-sky-100/80 dark:border-sky-900/40 text-[11px] font-bold text-sky-900 dark:text-sky-200 uppercase tracking-wider">
                                <span class="flex items-center gap-1.5"><i class="fas fa-file-invoice text-sky-500"></i> Invoicing & Quotations</span>
                                <span class="bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 px-2 py-0.5 rounded text-[10px]">Step 3 of 4</span>
                            </div>
                            <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between text-xs">
                                <div>
                                    <div class="font-bold text-gray-900 dark:text-white">INV-2026-0042</div>
                                    <div class="text-[11px] text-gray-500 dark:text-gray-400">Acme Technologies • R 8,500.00</div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 text-[10px] px-2 py-0.5 rounded-full font-bold">PAID</span>
                                    <span class="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800"><i class="fas fa-file-pdf"></i> PDF</span>
                                </div>
                            </div>
                            <div class="mt-2.5 text-center">
                                <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                                    <i class="fas fa-arrow-up text-[10px] animate-bounce text-sky-500"></i> 1-click 15% VAT, quotes to invoices conversion & recurring billing
                                </span>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                3. Invoices, Quotations & PDFs
                            </h3>
                            <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                Create professional tax invoices and quotes in seconds. Convert accepted quotes to invoices in one click, download crisp PDF files, track payment statuses, and configure monthly recurring billing.
                            </p>
                        </div>

                        <div class="flex items-center justify-between pt-1">
                            <button type="button" onclick="app.jumpToGuideSection('${invoicesUrl}')" class="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1.5">
                                <i class="fas fa-external-link-alt text-[10px]"></i> Open Invoices
                            </button>
                            <span class="text-[11px] text-gray-400">Next: Bank CSV Reconciliation ➔</span>
                        </div>
                    </div>

                    <!-- Slide 4: CSV Upload -->
                    <div id="guideSlide4" class="guide-slide space-y-4 hidden">
                        <div class="bg-gradient-to-br from-amber-50 to-orange-50/70 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-100 dark:border-amber-900/40 rounded-xl p-4 shadow-inner">
                            <div class="flex items-center justify-between pb-2 mb-2.5 border-b border-amber-100/80 dark:border-amber-900/40 text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                                <span class="flex items-center gap-1.5"><i class="fas fa-university text-amber-500"></i> Bank CSV Statement Import</span>
                                <span class="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded text-[10px]">Step 4 of 4</span>
                            </div>
                            <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 shadow-xs text-xs space-y-2">
                                <div class="flex items-center justify-between text-[11px] font-medium text-gray-600 dark:text-gray-300">
                                    <span>Supported SA Banks:</span>
                                    <span class="text-amber-600 dark:text-amber-400 font-semibold">FNB • Capitec • Nedbank • Absa • Standard Bank</span>
                                </div>
                                <div class="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/50 rounded p-1.5 text-[11px] text-green-700 dark:text-green-300 flex items-center justify-between font-medium">
                                    <span>⚡ Unpaid Invoices Auto-Matched</span>
                                    <span class="font-bold">Instant Reconciliation</span>
                                </div>
                            </div>
                            <div class="mt-2.5 text-center">
                                <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                    <i class="fas fa-arrow-up text-[10px] animate-bounce text-amber-500"></i> Categorized expenses animate away so you never have to scroll!
                                </span>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                4. Instant Bank Reconciliation
                            </h3>
                            <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                Upload your bank CSV statement. Client deposits automatically reconcile unpaid invoices, and categorized expenses disappear smoothly as you review them.
                            </p>
                        </div>

                        <div class="flex items-center justify-between pt-1">
                            <button type="button" onclick="app.jumpToGuideSection('${csvUrl}')" class="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5">
                                <i class="fas fa-external-link-alt text-[10px]"></i> Open CSV Upload
                            </button>
                            <span class="text-[11px] text-green-600 dark:text-green-400 font-bold">You are all set! 🚀</span>
                        </div>
                    </div>
                </div>

                <!-- Footer with Step Controls -->
                <div class="px-5 sm:px-6 py-3.5 bg-gray-50/80 dark:bg-dark-bg/80 border-t border-gray-100 dark:border-dark-border flex items-center justify-between gap-3">
                    <!-- Dots -->
                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="app.setGuideStep(1)" class="w-6 h-2 rounded-full bg-blue-600 dark:bg-blue-400 transition-all" id="guideDot1"></button>
                        <button type="button" onclick="app.setGuideStep(2)" class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 transition-all" id="guideDot2"></button>
                        <button type="button" onclick="app.setGuideStep(3)" class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 transition-all" id="guideDot3"></button>
                        <button type="button" onclick="app.setGuideStep(4)" class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 transition-all" id="guideDot4"></button>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center gap-2">
                        <button type="button" id="guidePrevBtn" onclick="app.prevGuideStep()" class="hidden px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            ← Back
                        </button>
                        <button type="button" id="guideNextBtn" onclick="app.nextGuideStep()" class="btn-primary px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                            Next <i class="fas fa-arrow-right text-[10px]"></i>
                        </button>
                        <button type="button" id="guideFinishBtn" onclick="app.finishInteractiveGuide()" class="hidden btn-primary px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-xs bg-green-600 hover:bg-green-700 border-green-600">
                            Got it, Let's Go! <i class="fas fa-rocket text-[10px]"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        this._escGuideHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeInteractiveGuide(true);
            } else if (e.key === 'ArrowRight') {
                this.nextGuideStep();
            } else if (e.key === 'ArrowLeft') {
                this.prevGuideStep();
            }
        };
        document.addEventListener('keydown', this._escGuideHandler);

        this.setGuideStep(1);
    },

    setGuideStep(step) {
        this.currentGuideStep = step;
        for (let i = 1; i <= 4; i++) {
            const slide = document.getElementById(`guideSlide${i}`);
            const dot = document.getElementById(`guideDot${i}`);
            const tab = document.getElementById(`guideStepTab${i}`);

            if (slide) {
                if (i === step) slide.classList.remove('hidden');
                else slide.classList.add('hidden');
            }

            if (dot) {
                if (i === step) {
                    dot.className = 'w-6 h-2 rounded-full bg-blue-600 dark:bg-blue-400 transition-all';
                } else {
                    dot.className = 'w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 transition-all';
                }
            }

            if (tab) {
                if (i === step) {
                    tab.className = 'guide-tab-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full transition bg-blue-600 text-white shadow-xs';
                    const badge = tab.querySelector('span:first-child');
                    if (badge) badge.className = 'w-4 h-4 rounded-full bg-white/25 text-[10px] flex items-center justify-center font-bold';
                } else {
                    tab.className = 'guide-tab-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full transition text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800';
                    const badge = tab.querySelector('span:first-child');
                    if (badge) badge.className = 'w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] flex items-center justify-center font-bold';
                }
            }
        }

        const prevBtn = document.getElementById('guidePrevBtn');
        const nextBtn = document.getElementById('guideNextBtn');
        const finishBtn = document.getElementById('guideFinishBtn');

        if (prevBtn) {
            if (step > 1) prevBtn.classList.remove('hidden');
            else prevBtn.classList.add('hidden');
        }

        if (nextBtn) {
            if (step < 4) nextBtn.classList.remove('hidden');
            else nextBtn.classList.add('hidden');
        }

        if (finishBtn) {
            if (step === 4) finishBtn.classList.remove('hidden');
            else finishBtn.classList.add('hidden');
        }
    },

    nextGuideStep() {
        if (!this.currentGuideStep) this.currentGuideStep = 1;
        if (this.currentGuideStep < 4) {
            this.setGuideStep(this.currentGuideStep + 1);
        }
    },

    prevGuideStep() {
        if (!this.currentGuideStep) this.currentGuideStep = 1;
        if (this.currentGuideStep > 1) {
            this.setGuideStep(this.currentGuideStep - 1);
        }
    },

    jumpToGuideSection(url) {
        this.closeInteractiveGuide(true);
        window.location.href = url;
    },

    finishInteractiveGuide() {
        this.closeInteractiveGuide(true);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'You are all set!',
                text: 'You can reopen this guide anytime by clicking the ? icon in the header or from the menu.',
                timer: 3000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
    },

    closeInteractiveGuide(markViewed = true) {
        if (this._escGuideHandler) {
            document.removeEventListener('keydown', this._escGuideHandler);
            this._escGuideHandler = null;
        }
        const modal = document.getElementById('interactiveGuideModal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
            }, 200);
        }
        if (markViewed) {
            localStorage.setItem('portal_guide_viewed', 'true');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.endsWith('index.html')) {
        app.init();

        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => app.saveSettings(e));
        }

        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmNewPassword = document.getElementById('confirmNewPassword').value;

                if (!currentPassword || !newPassword) {
                    Swal.fire('Error', 'Please fill in all password fields.', 'warning');
                    return;
                }

                if (newPassword.length < 6) {
                    Swal.fire('Error', 'New password must be at least 6 characters.', 'warning');
                    return;
                }

                if (newPassword !== confirmNewPassword) {
                    Swal.fire('Error', 'New passwords do not match.', 'warning');
                    return;
                }

                const changeBtn = document.getElementById('changePasswordBtn');
                changeBtn.disabled = true;
                changeBtn.innerHTML = '<span class="animate-spin inline-block mr-2">&#9696;</span> Updating...';

                try {
                    const res = await API.request('/api/change-password', {
                        method: 'POST',
                        body: JSON.stringify({ currentPassword, newPassword })
                    });

                    if (res.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Success!',
                            text: 'Your password has been changed successfully.'
                        });
                        changePasswordForm.reset();
                    }
                } catch (err) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: err.message || 'Current password was incorrect. Please try again.'
                    });
                } finally {
                    changeBtn.disabled = false;
                    changeBtn.innerHTML = 'Update Password';
                }
            });
        }
    }
});

// Close navigation dropdown on outside click
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('nav-dropdown');
    const menuBtn = document.getElementById('menu-button');
    if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!dropdown.contains(e.target) && !menuBtn?.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    }
});

// Add Capacitor App Deep Link Listener to handle payment returns
if (window.Capacitor) {
    const { App } = window.Capacitor.Plugins;
    App.addListener('appUrlOpen', async data => {
        if (data.url.includes('?token=')) {
            // Close the browser if it was opened
            if (window.Capacitor.isNativePlatform()) {
                const { Browser } = window.Capacitor.Plugins;
                await Browser.close();
            }

            // Extract token and verify
            const urlParams = new URL(data.url).searchParams;
            const token = urlParams.get('token');
            if (token) {
                // Update the URL to include the token so checkPaymentStatus will see it
                window.history.replaceState({}, document.title, window.location.pathname + '?payment=success&token=' + token);
                // Trigger check
                window.SubscriptionManager.checkPaymentStatus();
            }
        }
    });
}
