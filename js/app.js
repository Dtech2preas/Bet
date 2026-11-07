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

        this.initTourUI();
        if ((path.includes('dashboard.html') || path === '/' || path.endsWith('/')) && !localStorage.getItem('portal_tour_completed')) {
            setTimeout(() => this.showWelcomeTour(false), 500);
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
                if (document.getElementById('stat-clients')) document.getElementById('stat-clients').innerText = data.stats.totalClients;
                if (document.getElementById('stat-licenses')) document.getElementById('stat-licenses').innerText = data.stats.activeLicenses;
                // Formatting currency
                if (document.getElementById('stat-today-rev')) document.getElementById('stat-today-rev').innerText = 'R ' + (data.stats.todayRevenue || 0).toLocaleString();
                if (document.getElementById('stat-week-rev')) document.getElementById('stat-week-rev').innerText = 'R ' + (data.stats.weekRevenue || 0).toLocaleString();
                if (document.getElementById('stat-monthly-rev')) document.getElementById('stat-monthly-rev').innerText = 'R ' + (data.stats.monthlyRevenue || 0).toLocaleString();
                if (document.getElementById('stat-last-month-rev')) document.getElementById('stat-last-month-rev').innerText = 'R ' + (data.stats.lastMonthRevenue || 0).toLocaleString();
                if (document.getElementById('stat-year-rev')) document.getElementById('stat-year-rev').innerText = 'R ' + (data.stats.yearRevenue || 0).toLocaleString();
                if (document.getElementById('stat-total-rev')) document.getElementById('stat-total-rev').innerText = 'R ' + (data.stats.totalRevenue || 0).toLocaleString();

                const chartData = data.chartData || (data.stats && data.stats.chartData);
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
            guideBtn.title = 'Quick Guide / How to use';
            guideBtn.setAttribute('aria-label', 'Quick Guide / How to use');
            guideBtn.onclick = () => this.showWelcomeTour(true);
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
                this.showWelcomeTour(true);
            };
            navBtn.innerHTML = '<i class="fas fa-question-circle mr-2 w-4 text-center text-blue-500"></i> Quick Guide';
            logoutBtn.parentNode.insertBefore(navBtn, logoutBtn);
        }
    },

    showWelcomeTour(force = false) {
        if (!force && localStorage.getItem('portal_tour_completed') === 'true') {
            return;
        }

        let modal = document.getElementById('welcomeTourModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'welcomeTourModal';
            modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 opacity-0';
            modal.innerHTML = `
                <div class="relative w-full max-w-lg bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border overflow-hidden transform transition-all duration-300 scale-95 flex flex-col" id="tourModalCard">
                    <!-- Top Bar -->
                    <div class="flex items-center justify-between px-6 pt-5 pb-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-dtech-600 dark:text-dtech-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full" id="tourStepBadge">
                            Step 1 of 3
                        </span>
                        <div class="flex items-center gap-3">
                            <button type="button" onclick="app.closeWelcomeTour(true)" class="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                                Skip Tour
                            </button>
                            <button type="button" onclick="app.closeWelcomeTour(true)" class="w-7 h-7 inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                                <i class="fas fa-times text-sm"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Slide Content Area -->
                    <div class="px-6 py-4 flex-1">
                        <!-- Slide 1 -->
                        <div id="tourSlide1" class="tour-slide space-y-4">
                            <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl">
                                <i class="fas fa-store"></i>
                            </div>
                            <div>
                                <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">1. Set Up Your Business Profile</h3>
                                <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Head over to <strong class="text-gray-800 dark:text-gray-200">Settings</strong> to configure your South African business details:
                                </p>
                            </div>
                            <div class="space-y-2.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-bg/60 p-4 rounded-xl border border-gray-100 dark:border-dark-border">
                                <div class="flex items-start gap-2.5">
                                    <i class="fas fa-check-circle text-green-500 mt-0.5 text-xs flex-shrink-0"></i>
                                    <span><strong>Upload Company Logo:</strong> Automatically placed on all generated invoices, statements, and quotes.</span>
                                </div>
                                <div class="flex items-start gap-2.5">
                                    <i class="fas fa-check-circle text-green-500 mt-0.5 text-xs flex-shrink-0"></i>
                                    <span><strong>Add Banking Details:</strong> Bank name, account number &amp; branch code for EFT payments.</span>
                                </div>
                                <div class="flex items-start gap-2.5">
                                    <i class="fas fa-check-circle text-green-500 mt-0.5 text-xs flex-shrink-0"></i>
                                    <span><strong>Tax &amp; VAT Compliant:</strong> Add your CIPC registration number and SARS VAT number.</span>
                                </div>
                            </div>
                        </div>

                        <!-- Slide 2 -->
                        <div id="tourSlide2" class="tour-slide space-y-4 hidden">
                            <div class="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl">
                                <i class="fas fa-file-invoice-dollar"></i>
                            </div>
                            <div>
                                <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">2. Invoices &amp; Quotes in 60s</h3>
                                <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Quickly bill your clients and download high-resolution PDF documents:
                                </p>
                            </div>
                            <div class="space-y-2.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-bg/60 p-4 rounded-xl border border-gray-100 dark:border-dark-border">
                                <div class="flex items-start gap-2.5">
                                    <i class="fas fa-check-circle text-green-500 mt-0.5 text-xs flex-shrink-0"></i>
                                    <span><strong>Clients &amp; Products:</strong> Save client profiles and pricing once to generate invoices in seconds.</span>
                                </div>
                                <div class="flex items-start gap-2.5">
                                    <i class="fas fa-check-circle text-green-500 mt-0.5 text-xs flex-shrink-0"></i>
                                    <span><strong>Instant PDF Engine:</strong> 1-click download of South African VAT-compliant PDF invoices.</span>
                                </div>
                                <div class="flex items-start gap-2.5">
                                    <i class="fas fa-check-circle text-green-500 mt-0.5 text-xs flex-shrink-0"></i>
                                    <span><strong>Recurring Billing:</strong> Mark as Paid, track overdue balances, and set monthly retainers.</span>
                                </div>
                            </div>
                        </div>

                        <!-- Slide 3 -->
                        <div id="tourSlide3" class="tour-slide space-y-4 hidden">
                            <div class="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl">
                                <i class="fas fa-cloud-arrow-up"></i>
                            </div>
                            <div>
                                <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">3. Smart Bank Reconciliation</h3>
                                <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Import bank statement CSVs without tedious manual ledger entries:
                                </p>
                            </div>
                            <div class="space-y-2.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-bg/60 p-4 rounded-xl border border-gray-100 dark:border-dark-border">
                                <div class="flex items-start gap-2.5">
                                    <i class="fas fa-check-circle text-green-500 mt-0.5 text-xs flex-shrink-0"></i>
                                    <span><strong>SA Bank Statements:</strong> Supports FNB, Capitec, Nedbank, Standard Bank, and Absa CSV files.</span>
                                </div>
                                <div class="flex items-start gap-2.5">
                                    <i class="fas fa-check-circle text-green-500 mt-0.5 text-xs flex-shrink-0"></i>
                                    <span><strong>Auto-Disappearing Rows:</strong> Selecting a category auto-removes items so you never have to scroll.</span>
                                </div>
                                <div class="flex items-start gap-2.5">
                                    <i class="fas fa-check-circle text-green-500 mt-0.5 text-xs flex-shrink-0"></i>
                                    <span><strong>CIPC &amp; SARS Financials:</strong> Export automated Income Statements and Balance Sheets anytime.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Controls -->
                    <div class="px-6 py-4 bg-gray-50 dark:bg-dark-bg/80 border-t border-gray-100 dark:border-dark-border flex items-center justify-between gap-3">
                        <!-- Step Indicator Dots -->
                        <div class="flex items-center gap-1.5" id="tourDotsContainer">
                            <button type="button" onclick="app.setTourStep(1)" class="w-6 h-2 rounded-full bg-dtech-600 dark:bg-dtech-500 transition-all" id="tourDot1"></button>
                            <button type="button" onclick="app.setTourStep(2)" class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition-all hover:bg-gray-400" id="tourDot2"></button>
                            <button type="button" onclick="app.setTourStep(3)" class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition-all hover:bg-gray-400" id="tourDot3"></button>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex items-center gap-2">
                            <button type="button" id="tourPrevBtn" onclick="app.prevTourStep()" class="hidden px-3.5 py-2 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                                Back
                            </button>
                            <button type="button" id="tourNextBtn" onclick="app.nextTourStep()" class="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                                Next <i class="fas fa-arrow-right text-[10px]"></i>
                            </button>
                            <button type="button" id="tourFinishBtn" onclick="app.finishWelcomeTour()" class="hidden btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                                Start Exploring <i class="fas fa-rocket text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            const card = document.getElementById('tourModalCard');
            if (card) card.classList.remove('scale-95');
        });

        this.setTourStep(1);
    },

    setTourStep(step) {
        this.currentTourStep = step;
        for (let i = 1; i <= 3; i++) {
            const slide = document.getElementById(`tourSlide${i}`);
            const dot = document.getElementById(`tourDot${i}`);
            if (slide) {
                if (i === step) slide.classList.remove('hidden');
                else slide.classList.add('hidden');
            }
            if (dot) {
                if (i === step) {
                    dot.className = 'w-6 h-2 rounded-full bg-dtech-600 dark:bg-dtech-500 transition-all';
                } else {
                    dot.className = 'w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition-all hover:bg-gray-400';
                }
            }
        }

        const badge = document.getElementById('tourStepBadge');
        if (badge) badge.textContent = `Step ${step} of 3`;

        const prevBtn = document.getElementById('tourPrevBtn');
        const nextBtn = document.getElementById('tourNextBtn');
        const finishBtn = document.getElementById('tourFinishBtn');

        if (prevBtn) {
            if (step > 1) prevBtn.classList.remove('hidden');
            else prevBtn.classList.add('hidden');
        }

        if (nextBtn) {
            if (step < 3) nextBtn.classList.remove('hidden');
            else nextBtn.classList.add('hidden');
        }

        if (finishBtn) {
            if (step === 3) finishBtn.classList.remove('hidden');
            else finishBtn.classList.add('hidden');
        }
    },

    nextTourStep() {
        if (!this.currentTourStep) this.currentTourStep = 1;
        if (this.currentTourStep < 3) {
            this.setTourStep(this.currentTourStep + 1);
        }
    },

    prevTourStep() {
        if (!this.currentTourStep) this.currentTourStep = 1;
        if (this.currentTourStep > 1) {
            this.setTourStep(this.currentTourStep - 1);
        }
    },

    closeWelcomeTour(saveCompleted = true) {
        const modal = document.getElementById('welcomeTourModal');
        if (modal) {
            modal.classList.add('opacity-0');
            const card = document.getElementById('tourModalCard');
            if (card) card.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
        if (saveCompleted) {
            localStorage.setItem('portal_tour_completed', 'true');
        }
    },

    finishWelcomeTour() {
        this.closeWelcomeTour(true);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'You are all set!',
                text: 'You can reopen this Quick Guide anytime from the menu or header.',
                timer: 2500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
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
