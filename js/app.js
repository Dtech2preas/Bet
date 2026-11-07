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
        this.checkActiveTour();

        if (window.location.search.includes('tour=complete')) {
            window.history.replaceState({}, document.title, window.location.pathname);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: '🎉 Walkthrough Complete!',
                    text: 'You have seen the core flow! You can reopen this guide anytime from the menu.',
                    timer: 3500,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }
        } else if ((path.includes('dashboard.html') || path === '/' || path.endsWith('/')) && !localStorage.getItem('portal_tour_completed') && !localStorage.getItem('dtech_tour_step')) {
            setTimeout(() => this.startGuidedTour(), 600);
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
            guideBtn.title = 'Interactive Walkthrough';
            guideBtn.setAttribute('aria-label', 'Interactive Walkthrough');
            guideBtn.onclick = () => this.startGuidedTour();
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
                this.startGuidedTour();
            };
            navBtn.innerHTML = '<i class="fas fa-question-circle mr-2 w-4 text-center text-blue-500"></i> Interactive Guide';
            logoutBtn.parentNode.insertBefore(navBtn, logoutBtn);
        }
    },

    getTourSteps() {
        const isPublic = window.location.pathname.includes('public_');
        return [
            {
                step: 1,
                page: isPublic ? 'public_dashboard.html' : 'dashboard.html',
                targetSelector: '#section-dashboard, #stat-monthly-rev, #profile-completeness-widget, main',
                title: 'Step 1: Your Business Command Center',
                desc: 'Welcome! This is your Dashboard. Monitor your today, weekly, and monthly revenue, track active clients, view financial health charts, and see recent activity at a glance.',
                tip: 'Click Next below and we will automatically navigate to Settings so you can configure your business details.',
                nextBtnText: 'Next: Business Profile →'
            },
            {
                step: 2,
                page: isPublic ? 'public_settings.html' : 'financials-config.html',
                targetSelector: isPublic ? '#settingsForm, #settingsLogoFile, #settingsBusinessName' : '#financials-config-rules, main',
                title: 'Step 2: Business Profile & Banking Details',
                desc: isPublic
                    ? 'Here in Settings, upload your company logo, set your South African CIPC registration and SARS VAT numbers, and enter your bank details for EFT payments. Every invoice you generate will automatically use this info.'
                    : 'Here you configure your company rules, VAT settings, and automated transaction mapping rules.',
                tip: 'Click Next below to jump straight to Invoices & Quotations.',
                nextBtnText: 'Next: Invoices & Billing →'
            },
            {
                step: 3,
                page: isPublic ? 'public_invoices.html' : 'invoices.html',
                targetSelector: '#invoicesSearchInput, #section-invoices, #invoices-container',
                title: 'Step 3: Invoicing, Quotes & Instant PDFs',
                desc: 'Create professional tax invoices and quotations with 1-click South African VAT calculation. Download crisp PDFs, track Paid/Overdue statuses, send reminders, and configure monthly recurring retainers.',
                tip: 'Click Next to see how bank statement CSVs are reconciled automatically.',
                nextBtnText: 'Next: Bank Statement Import →'
            },
            {
                step: 4,
                page: isPublic ? 'public_csv-upload.html' : 'csv-upload.html',
                targetSelector: '#reconcile-empty-state, #section-csv-upload',
                title: 'Step 4: Instant Bank Reconciliation',
                desc: 'Drop your FNB, Capitec, Nedbank, Standard Bank, or Absa CSV statement here. Unpaid invoices are auto-matched, and categorized expenses disappear from the review list so you never have to scroll!',
                tip: 'Congratulations! You now know the core flow of your business portal.',
                nextBtnText: 'Finish Walkthrough 🚀'
            }
        ];
    },

    checkActiveTour() {
        const rawStep = localStorage.getItem('dtech_tour_step');
        if (!rawStep) return;

        const stepNum = parseInt(rawStep, 10);
        const steps = this.getTourSteps();
        const currentStepConfig = steps.find(s => s.step === stepNum);
        if (!currentStepConfig) {
            localStorage.removeItem('dtech_tour_step');
            return;
        }

        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        if (!currentPath.includes(currentStepConfig.page)) {
            window.location.href = currentStepConfig.page;
            return;
        }

        setTimeout(() => {
            this.renderTourStepCard(currentStepConfig);
        }, 400);
    },

    renderTourStepCard(stepConfig) {
        if (!document.getElementById('dtech-tour-styles')) {
            const style = document.createElement('style');
            style.id = 'dtech-tour-styles';
            style.innerHTML = `
                .tour-spotlight-target {
                    position: relative !important;
                    z-index: 9998 !important;
                    box-shadow: 0 0 0 4px #0284c7, 0 0 0 9999px rgba(0, 0, 0, 0.65) !important;
                    border-radius: 12px !important;
                    transition: box-shadow 0.3s ease-in-out !important;
                }
                @keyframes tour-bounce-arrow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .tour-bounce-arrow {
                    animation: tour-bounce-arrow 1.4s infinite ease-in-out;
                }
            `;
            document.head.appendChild(style);
        }

        document.querySelectorAll('.tour-spotlight-target').forEach(el => el.classList.remove('tour-spotlight-target'));
        const oldCard = document.getElementById('dtechTourCard');
        if (oldCard) oldCard.remove();

        let targetEl = null;
        const selectors = stepConfig.targetSelector.split(',').map(s => s.trim());
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) {
                targetEl = el;
                break;
            }
        }

        if (targetEl) {
            targetEl.classList.add('tour-spotlight-target');
            try {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) {}
        }

        const card = document.createElement('div');
        card.id = 'dtechTourCard';
        card.className = 'fixed z-[10000] bottom-4 sm:bottom-6 inset-x-3 sm:inset-x-auto sm:right-6 sm:left-auto max-w-lg w-auto bg-white dark:bg-dark-card rounded-2xl shadow-2xl border-2 border-dtech-500 dark:border-dtech-400 p-5 transform transition-all duration-300 animate-fade-in flex flex-col gap-3.5';

        const dotsHtml = [1, 2, 3, 4].map(s => {
            if (s === stepConfig.step) {
                return `<span class="w-6 h-2 rounded-full bg-dtech-600 dark:bg-dtech-400 transition-all"></span>`;
            }
            return `<span class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>`;
        }).join('');

        card.innerHTML = `
            <div class="absolute -top-3.5 left-8 sm:left-10 bg-dtech-600 dark:bg-dtech-500 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-md flex items-center gap-1.5 tour-bounce-arrow">
                <i class="fas fa-arrow-up text-[10px]"></i>
                <span>LOOK HERE</span>
            </div>

            <div class="flex items-center justify-between pt-1">
                <span class="text-xs font-bold uppercase tracking-wider text-dtech-600 dark:text-dtech-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-full">
                    Step ${stepConfig.step} of 4
                </span>
                <button type="button" onclick="app.closeTour(true)" class="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition flex items-center gap-1">
                    <span>Skip Tour</span>
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>

            <div>
                <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    ${stepConfig.title}
                </h3>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                    ${stepConfig.desc}
                </p>
                <div class="mt-2.5 p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] sm:text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <i class="fas fa-info-circle mt-0.5 text-blue-500 flex-shrink-0"></i>
                    <span>${stepConfig.tip}</span>
                </div>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-dark-border gap-2">
                <div class="flex items-center gap-1.5">
                    ${dotsHtml}
                </div>
                <div class="flex items-center gap-2">
                    ${stepConfig.step > 1 ? `
                        <button type="button" onclick="app.prevTourStep()" class="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                            ← Back
                        </button>
                    ` : ''}
                    <button type="button" onclick="app.nextTourStep()" class="btn-primary px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-md">
                        ${stepConfig.nextBtnText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(card);
    },

    startGuidedTour() {
        const isPublic = window.location.pathname.includes('public_');
        const startPage = isPublic ? 'public_dashboard.html' : 'dashboard.html';
        localStorage.setItem('dtech_tour_step', '1');

        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        if (!currentPath.includes(startPage)) {
            window.location.href = startPage;
        } else {
            const steps = this.getTourSteps();
            this.renderTourStepCard(steps[0]);
        }
    },

    nextTourStep() {
        const rawStep = localStorage.getItem('dtech_tour_step') || '1';
        const currentStep = parseInt(rawStep, 10);
        const steps = this.getTourSteps();

        if (currentStep < 4) {
            const nextStepNum = currentStep + 1;
            const nextConfig = steps.find(s => s.step === nextStepNum);
            localStorage.setItem('dtech_tour_step', String(nextStepNum));
            window.location.href = nextConfig.page;
        } else {
            this.closeTour(true);
            const isPublic = window.location.pathname.includes('public_');
            const homePage = isPublic ? 'public_dashboard.html' : 'dashboard.html';
            const currentPath = window.location.pathname.split('/').pop() || 'index.html';

            if (currentPath.includes(homePage)) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: '🎉 Walkthrough Complete!',
                        text: 'You have seen the core flow! You can reopen this guide anytime from the menu.',
                        timer: 3500,
                        showConfirmButton: false,
                        toast: true,
                        position: 'top-end'
                    });
                }
            } else {
                window.location.href = homePage + '?tour=complete';
            }
        }
    },

    prevTourStep() {
        const rawStep = localStorage.getItem('dtech_tour_step') || '1';
        const currentStep = parseInt(rawStep, 10);
        const steps = this.getTourSteps();

        if (currentStep > 1) {
            const prevStepNum = currentStep - 1;
            const prevConfig = steps.find(s => s.step === prevStepNum);
            localStorage.setItem('dtech_tour_step', String(prevStepNum));
            window.location.href = prevConfig.page;
        }
    },

    closeTour(markCompleted = true) {
        localStorage.removeItem('dtech_tour_step');
        if (markCompleted) {
            localStorage.setItem('portal_tour_completed', 'true');
        }
        document.querySelectorAll('.tour-spotlight-target').forEach(el => el.classList.remove('tour-spotlight-target'));
        const card = document.getElementById('dtechTourCard');
        if (card) card.remove();
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
