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

        try {
            localStorage.removeItem('dtech_tour_step');
        } catch (e) {}

        this.initTourUI();
        if ((path.includes('dashboard.html') || path === '/' || path.endsWith('/')) && !localStorage.getItem('portal_guide_viewed')) {
            setTimeout(() => this.showInteractiveGuide(false), 600);
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

    showSection(sectionId) {
        window.location.href = '' + sectionId + '.html';
    },

    highlightActiveNavLink() {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('#nav-dropdown a');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href === currentPath || (currentPath === '' && href.includes('dashboard')))) {
                link.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-800');
                link.classList.add('bg-dtech-50', 'dark:bg-dtech-900/40', 'text-dtech-600', 'dark:text-dtech-400', 'font-semibold', 'rounded-md');
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

    chartInstance: null,
    _lastChartData: null,

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

    async loadDashboardData() {
        try {
            const data = await API.request('/api/dashboard');
            if (data.success && data.stats) {
                const stats = { ...data.stats };

                // Ensure ledger income transactions are counted if current worker hasn't been redeployed
                try {
                    const txRes = await API.request('/api/transactions?limit=1000');
                    if (txRes && txRes.success && txRes.transactions && txRes.transactions.length > 0) {
                        const txs = txRes.transactions;
                        const incomeTxs = txs.filter(t => t.type === 'Income' || (Number(t.amount) > 0 && t.type !== 'Expense'));
                        const totalTxIncome = incomeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

                        if (totalTxIncome > 0 && (stats.totalRevenue || 0) < totalTxIncome) {
                            const now = new Date();
                            const todayStr = now.toDateString();
                            const currentMonth = now.getMonth();
                            const currentYear = now.getFullYear();

                            let txToday = 0, txMonth = 0, txYear = 0, txTotal = 0;
                            incomeTxs.forEach(t => {
                                const amt = Number(t.amount) || 0;
                                const d = new Date(t.date || t.dateAdded);
                                txTotal += amt;
                                if (!isNaN(d.getTime())) {
                                    if (d.toDateString() === todayStr) txToday += amt;
                                    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) txMonth += amt;
                                    if (d.getFullYear() === currentYear) txYear += amt;
                                }
                            });

                            stats.todayRevenue = (stats.todayRevenue || 0) + txToday;
                            stats.monthlyRevenue = (stats.monthlyRevenue || 0) + txMonth;
                            stats.yearRevenue = (stats.yearRevenue || 0) + txYear;
                            stats.totalRevenue = (stats.totalRevenue || 0) + txTotal;
                        }
                    }
                } catch (txErr) {
                    console.warn('Could not cross-check transactions for dashboard stats', txErr);
                }

                if (document.getElementById('stat-clients')) document.getElementById('stat-clients').innerText = stats.totalClients || 0;
                if (document.getElementById('stat-licenses')) document.getElementById('stat-licenses').innerText = stats.activeLicenses || 0;
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
    if (!window.location.pathname.endsWith('admin.html') && !window.location.pathname.endsWith('index.html')) {
        app.init();
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
