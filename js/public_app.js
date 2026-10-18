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
            document.getElementById('userNameDisplay').innerText = user.businessName || user.username;
        }

        this.initDarkMode();
        // Load dashboard data (which also initializes charts)
        this.loadDashboardData();
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
        } else {
            exportBtns.forEach(btn => btn.classList.add('hidden'));
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

        const filterProPremium = document.querySelectorAll('.filter-pro-premium');
        if (this.userPlan === 'Pro' || this.userPlan === 'Premium') {
            filterProPremium.forEach(el => el.classList.remove('hidden'));
        } else {
            filterProPremium.forEach(el => el.classList.add('hidden'));
            // Reset to default if current selection is not allowed
            const chartFilter = document.getElementById('chartFilter');
            if(chartFilter && chartFilter.value !== '30_days' && this.userPlan === 'Free') {
                chartFilter.value = '30_days';
            }
        }

        const filterPremium = document.querySelectorAll('.filter-premium');
        if (this.userPlan === 'Premium') {
            filterPremium.forEach(el => el.classList.remove('hidden'));
        } else {
            filterPremium.forEach(el => el.classList.add('hidden'));
            const chartFilter = document.getElementById('chartFilter');
            if (chartFilter && chartFilter.value === 'total' && this.userPlan !== 'Premium') {
                chartFilter.value = '30_days';
            }
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
        // Hide all sections
        const sections = ['dashboard', 'clients', 'products', 'licenses', 'quotations', 'invoices', 'payments', 'contracts', 'plan', 'settings'];
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
        this.checkPaymentStatus();
        if (sectionId === 'settings') this.loadSettingsData();

        // Close sidebar on mobile after navigating
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
                this.toggleSidebar();
            }
        }
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

    renderChart(chartData) {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#9ca3af' : '#4b5563';
        const gridColor = isDark ? '#374151' : '#e5e7eb';

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Revenue (Paid Invoices)',
                    data: chartData.data,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: textColor },
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
                    }
                }
            }
        });
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
            pricePro.innerText = 'R29';
            pricePremium.innerText = 'R79';
            periodPro.innerText = '/mo';
            periodPremium.innerText = '/mo';
            this.currentBillingInterval = 'monthly';
        } else if (interval === 'quarterly') {
            btnQuarterly.className = "px-4 py-2 text-sm font-medium rounded-md bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white transition-all";
            pricePro.innerText = 'R87';
            pricePremium.innerText = 'R237';
            periodPro.innerText = '/3mo';
            periodPremium.innerText = '/3mo';
            this.currentBillingInterval = 'quarterly';
        } else if (interval === 'yearly') {
            btnYearly.className = "px-4 py-2 text-sm font-medium rounded-md bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white transition-all flex items-center";
            btnYearly.innerHTML = 'Yearly <span class="ml-2 bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded">SAVE</span>';
            pricePro.innerText = 'R290';
            pricePremium.innerText = 'R790';
            periodPro.innerText = '/yr';
            periodPremium.innerText = '/yr';
            this.currentBillingInterval = 'yearly';
        }
    },

async paySubscription(planTier) {
        let amount = 0;
        const interval = this.currentBillingInterval || 'monthly';

        if (planTier === 'Pro') {
            if (interval === 'monthly') amount = 29;
            if (interval === 'quarterly') amount = 87;
            if (interval === 'yearly') amount = 290;
        } else if (planTier === 'Premium') {
            if (interval === 'monthly') amount = 79;
            if (interval === 'quarterly') amount = 237;
            if (interval === 'yearly') amount = 790;
        }

        try {
            // Save amount locally so we can update the subscription on return
            localStorage.setItem('dtech_pending_payment', amount);

            const response = await API.request('/api/checkout', {
                method: 'POST',
                body: JSON.stringify({
                    amount: amount,
                    type: 'subscription'
                })
            });

            if (response.success && response.redirectUrl) {
                // Redirect user to Yoco Checkout
                window.location.href = response.redirectUrl;
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

                const btnPlanFree = document.getElementById('btn-plan-free');
                const btnPlanPro = document.getElementById('btn-plan-pro');
                const btnPlanPremium = document.getElementById('btn-plan-premium');

                // Reset all plan buttons
                if(btnPlanFree) {
                    btnPlanFree.disabled = false;
                    btnPlanFree.innerHTML = 'Subscribe Free';
                    btnPlanFree.className = "w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500";
                }
                if(btnPlanPro) {
                    btnPlanPro.disabled = false;
                    btnPlanPro.innerHTML = '<i class="fas fa-lock mr-2"></i> Subscribe Pro';
                    btnPlanPro.className = "w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
                }
                if(btnPlanPremium) {
                    btnPlanPremium.disabled = false;
                    btnPlanPremium.innerHTML = '<i class="fas fa-lock mr-2"></i> Subscribe Premium';
                    btnPlanPremium.className = "w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white";
                }

                if (sub.plan === 'Premium') {
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

                    if(btnPlanPremium) {
                        btnPlanPremium.disabled = true;
                        btnPlanPremium.innerHTML = 'Current Plan';
                        btnPlanPremium.className = "w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-500 bg-gray-200 cursor-not-allowed";
                    }
                } else if (sub.plan === 'Pro') {
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

                    if(btnPlanPro) {
                        btnPlanPro.disabled = true;
                        btnPlanPro.innerHTML = 'Current Plan';
                        btnPlanPro.className = "w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-700 bg-blue-100 cursor-not-allowed";
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

                    if(btnPlanFree) {
                        btnPlanFree.disabled = true;
                        btnPlanFree.innerHTML = 'Current Plan';
                        btnPlanFree.className = "w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 cursor-not-allowed";
                    }
                }
            }
        } catch(e) {
            console.error("Could not fetch subscription", e);
        }
    },

    updateChartFilter() {
        const filter = document.getElementById('chartFilter').value;
        this.loadDashboardData(filter);
    },

    async loadDashboardData(filter = '30_days') {
        try {
            const data = await API.request(`/api/dashboard?filter=${filter}`);
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

                if (data.stats.chartData) {
                    this.renderChart(data.stats.chartData);
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
