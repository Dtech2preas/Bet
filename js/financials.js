const financialsManager = {
    transactions: [],
    settings: {
        fyStartMonth: '3',
        mappings: {},
        savedReports: []
    },
    _reconcileTab: 'review',
    _pendingReconcileData: null,
    chartOfAccounts: [
        { name: "Sales Revenue", type: "Income" },
        { name: "Service Revenue", type: "Income" },
        { name: "Cost of Goods Sold", type: "Expense" },
        { name: "Rent", type: "Expense" },
        { name: "Salaries & Wages", type: "Expense" },
        { name: "Software Subscriptions", type: "Expense" },
        { name: "Bank Fees", type: "Expense" },
        { name: "Marketing", type: "Expense" },
        { name: "Office Supplies", type: "Expense" },
        { name: "Utilities", type: "Expense" },
        { name: "Travel", type: "Expense" },
        { name: "Taxes", type: "Expense" },
        { name: "Owner's Equity", type: "Equity" },
        { name: "Director Loan", type: "Liability" },
        { name: "Cash in Bank", type: "Asset" },
        { name: "Accounts Receivable", type: "Asset" }
    ],

    async loadTransactions() {
        await this.loadFinancialSettings();

        const container = document.getElementById('financials-ledger-tbody');
        if (container) {
            container.innerHTML = '<tr><td colspan="6" class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-dtech-500"></i></td></tr>';
        }

        try {
            const response = await API.request('/api/transactions?limit=1000');
            if (response.success) {
                this.transactions = response.transactions || [];
                // Sort by date descending
                this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                this.renderLedgerTable();
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
            if (container) {
                container.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">Failed to load transactions: ${error.message}</td></tr>`;
            }
        }
    },

    async loadFinancialSettings() {
        try {
            const response = await API.request('/api/settings');
            if (response.success && response.settings) {
                if (response.settings.financials) {
                    this.settings = { ...this.settings, ...response.settings.financials };
                }
            }
        } catch (e) {
            console.error('Failed to load financial settings', e);
        }
        this.initCSVUpload();
    },

    async syncFinancialSettings() {
        try {
            const response = await API.request('/api/settings', {
                method: 'PUT',
                body: JSON.stringify({ financials: this.settings })
            });
            return response.success;
        } catch (e) {
            console.error('Failed to sync financial settings', e);
            return false;
        }
    },

    toggleSelectAll(source) {
        const checkboxes = document.querySelectorAll('.transaction-checkbox');
        checkboxes.forEach(cb => cb.checked = source.checked);
        this.updateBulkActionsState();
    },

    updateBulkActionsState() {
        const checkboxes = document.querySelectorAll('.transaction-checkbox:checked');
        const bulkBtn = document.getElementById('btn-bulk-delete-transactions');
        if (bulkBtn) {
            if (checkboxes.length > 0) {
                bulkBtn.classList.remove('hidden');
                bulkBtn.innerHTML = `<i class="fas fa-trash mr-1.5"></i> Delete Selected (${checkboxes.length})`;
            } else {
                bulkBtn.classList.add('hidden');
            }
        }
    },

    async bulkDeleteTransactions() {
        const selected = Array.from(document.querySelectorAll('.transaction-checkbox:checked')).map(cb => cb.value);
        if (selected.length === 0) return Swal.fire('Info', 'No transactions selected', 'info');

        if (await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete ${selected.length} transactions. This cannot be undone!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete them!'
        }).then(res => res.isConfirmed)) {
            Swal.fire({ title: 'Deleting...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() }});
            try {
                let successCount = 0;
                for (const id of selected) {
                    const response = await API.request(`/api/transactions/${id}`, { method: 'DELETE' });
                    if (response.success) successCount++;
                }
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Bulk deleted ${successCount} transactions`);
                Swal.fire('Success', `Deleted ${successCount} transactions`, 'success');
                this.loadTransactions();

                const selectAll = document.getElementById('selectAllTransactions');
                if (selectAll) selectAll.checked = false;
                this.updateBulkActionsState();

            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    renderFinancialSummary(transactions) {
        let totalIn = 0;
        let totalOut = 0;
        let uncategorizedCount = 0;

        (transactions || []).forEach(t => {
            const amt = Math.abs(parseFloat(t.amount || 0));
            const isExpense = t.type === 'Expense' || parseFloat(t.amount || 0) < 0;
            if (isExpense) {
                totalOut += amt;
            } else {
                totalIn += amt;
            }
            if (!t.category || t.category === 'Uncategorized') {
                uncategorizedCount++;
            }
        });

        const netProfit = totalIn - totalOut;

        const elIn = document.getElementById('summary-total-in');
        if (elIn) elIn.textContent = `R ${totalIn.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const elOut = document.getElementById('summary-total-out');
        if (elOut) elOut.textContent = `R ${totalOut.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const elNet = document.getElementById('summary-net-profit');
        if (elNet) {
            elNet.textContent = `${netProfit >= 0 ? '+' : '-'}R ${Math.abs(netProfit).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            elNet.className = netProfit >= 0 ? 'text-2xl font-bold text-green-600 dark:text-green-400' : 'text-2xl font-bold text-red-600 dark:text-red-400';
        }

        const elCount = document.getElementById('summary-tx-count');
        if (elCount) {
            elCount.textContent = (transactions || []).length;
        }

        const elUncatBadge = document.getElementById('summary-uncat-badge');
        if (elUncatBadge) {
            if (uncategorizedCount > 0) {
                elUncatBadge.textContent = `${uncategorizedCount} uncategorized`;
                elUncatBadge.classList.remove('hidden');
            } else {
                elUncatBadge.classList.add('hidden');
            }
        }
    },

    renderLedgerTable() {
        const tbody = document.getElementById('financials-ledger-tbody');
        if (!tbody) return;

        // Month filter dropdown
        const monthFilter = document.getElementById('financials-month-filter');
        let selectedMonth = monthFilter ? monthFilter.value : 'all';

        if (monthFilter && this.transactions.length > 0) {
            const uniqueMonths = new Set();
            this.transactions.forEach(t => {
                if (t.date) {
                    const dateParts = t.date.split('-');
                    if (dateParts.length >= 2) {
                        uniqueMonths.add(`${dateParts[0]}-${dateParts[1]}`);
                    }
                }
            });

            const sortedMonths = Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));

            if (monthFilter.options.length <= 1 && sortedMonths.length > 0) {
                selectedMonth = sortedMonths[0];
            }

            monthFilter.innerHTML = '<option value="all">All Months</option>' + sortedMonths.map(m => {
                const dateObj = new Date(`${m}-01`);
                const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
                return `<option value="${m}" ${selectedMonth === m ? 'selected' : ''}>${monthName}</option>`;
            }).join('');
        }

        let filteredTransactions = this.transactions;
        if (selectedMonth && selectedMonth !== 'all') {
            filteredTransactions = this.transactions.filter(t => t.date && t.date.startsWith(selectedMonth));
        }

        // Live Search Filter
        const searchInput = document.getElementById('financials-search-input');
        if (searchInput && searchInput.value.trim() !== '') {
            const q = searchInput.value.trim().toLowerCase();
            filteredTransactions = filteredTransactions.filter(t => {
                return (t.description && t.description.toLowerCase().includes(q)) ||
                       (t.category && t.category.toLowerCase().includes(q)) ||
                       (t.reference && t.reference.toLowerCase().includes(q)) ||
                       (t.amount && String(t.amount).includes(q));
            });
        }

        // Update financial health summary cards
        this.renderFinancialSummary(filteredTransactions);

        if (filteredTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500 dark:text-gray-400"><i class="fas fa-receipt text-3xl mb-2 text-gray-300 dark:text-gray-600 block"></i>No transactions found for this period.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        filteredTransactions.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = 'border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors';

            const isExpense = t.type === 'Expense' || parseFloat(t.amount || 0) < 0;
            const amountColor = isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
            const displayAmount = `R ${Math.abs(parseFloat(t.amount || 0)).toFixed(2)}`;

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-10">
                    <input type="checkbox" class="transaction-checkbox rounded border-gray-300 text-dtech-600 focus:ring-dtech-500 cursor-pointer" value="${t.id}" onchange="financialsManager.updateBulkActionsState()">
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">${t.date || ''}</td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    <div class="font-medium text-gray-900 dark:text-gray-100">${t.description || ''}</div>
                    ${t.reference ? `<div class="text-xs text-gray-500 dark:text-gray-400">Ref: ${t.reference}</div>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.category && t.category !== 'Uncategorized' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'}">
                        ${t.category || 'Uncategorized'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${amountColor}">${isExpense ? '-' : '+'}${displayAmount}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onclick="financialsManager.editTransaction('${t.id}')" class="text-dtech-600 hover:text-dtech-900 dark:hover:text-dtech-400 transition" title="Edit Transaction">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="financialsManager.deleteTransaction('${t.id}')" class="text-red-600 hover:text-red-900 dark:hover:text-red-400 transition" title="Delete Transaction">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    ensureTransactionDrawer() {
        let modal = document.getElementById('transactionDrawerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'transactionDrawerModal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden z-50 overflow-hidden';
            modal.innerHTML = `
                <div class="absolute inset-y-0 right-0 max-w-full flex">
                    <div class="w-screen max-w-xl bg-white dark:bg-dark-card shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out translate-x-full" id="transactionDrawerPanel">
                        <div class="px-6 py-4 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                            <div>
                                <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white" id="transactionDrawerTitle">Add Transaction</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Record an income, expense, or journal entry</p>
                            </div>
                            <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" onclick="financialsManager.closeTransactionDrawer()">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <form id="transactionDrawerForm" class="flex flex-col flex-grow overflow-hidden" onsubmit="financialsManager.saveTransactionDrawer(event)">
                            <div class="p-4 sm:p-6 overflow-y-auto flex-grow space-y-5" id="transactionDrawerContent">
                                <!-- Type Selector Pills -->
                                <div>
                                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Transaction Type</label>
                                    <div class="grid grid-cols-3 gap-2" id="t-drawer-type-group">
                                        <button type="button" class="t-type-btn py-2 px-3 text-sm font-semibold rounded-lg border text-center transition flex items-center justify-center gap-1.5 border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 ring-2 ring-green-500" data-type="Income" onclick="financialsManager.selectTransactionType('Income')">
                                            <i class="fas fa-arrow-down text-xs"></i> Income
                                        </button>
                                        <button type="button" class="t-type-btn py-2 px-3 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-center transition flex items-center justify-center gap-1.5" data-type="Expense" onclick="financialsManager.selectTransactionType('Expense')">
                                            <i class="fas fa-arrow-up text-xs"></i> Expense
                                        </button>
                                        <button type="button" class="t-type-btn py-2 px-3 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-center transition flex items-center justify-center gap-1.5" data-type="Asset" onclick="financialsManager.selectTransactionType('Asset')">
                                            <i class="fas fa-landmark text-xs"></i> Asset / Other
                                        </button>
                                    </div>
                                    <input type="hidden" id="t-drawer-type" value="Income">
                                </div>

                                <!-- Date & Amount Row -->
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                                        <input type="date" id="t-drawer-date" required class="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm p-2.5 shadow-sm focus:border-dtech-500 focus:ring-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (ZAR) *</label>
                                        <div class="relative rounded-md shadow-sm">
                                            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <span class="text-gray-500 sm:text-sm font-semibold">R</span>
                                            </div>
                                            <input type="number" step="0.01" min="0.01" id="t-drawer-amount" required placeholder="0.00" class="block w-full rounded-md border-gray-300 pl-8 pr-3 dark:border-gray-600 dark:bg-gray-700 text-sm p-2.5 shadow-sm focus:border-dtech-500 focus:ring-dtech-500 font-semibold">
                                        </div>
                                    </div>
                                </div>

                                <!-- Description -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description / Narration *</label>
                                    <input type="text" id="t-drawer-desc" required placeholder="e.g. Website development deposit, Monthly office rent" class="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm p-2.5 shadow-sm focus:border-dtech-500 focus:ring-dtech-500">
                                </div>

                                <!-- Category Dropdown -->
                                <div>
                                    <div class="flex justify-between items-center mb-1">
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Category *</label>
                                        <span class="text-xs text-dtech-600 dark:text-dtech-400 cursor-pointer hover:underline" onclick="financialsManager.openRuleDrawer()">+ Manage Rules</span>
                                    </div>
                                    <select id="t-drawer-category" required class="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm p-2.5 shadow-sm focus:border-dtech-500 focus:ring-dtech-500">
                                        <!-- Populated dynamically with optgroups -->
                                    </select>
                                </div>

                                <!-- Reference / Notes -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference / Note (Optional)</label>
                                    <input type="text" id="t-drawer-ref" placeholder="e.g. INV-1002, Tax Invoice #, Bank statement ref" class="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm p-2.5 shadow-sm focus:border-dtech-500 focus:ring-dtech-500">
                                </div>

                                <!-- Hidden transaction ID for edit -->
                                <input type="hidden" id="t-drawer-id" value="">
                            </div>
                            <div class="px-6 py-4 border-t dark:border-dark-border bg-gray-50 dark:bg-gray-800 flex justify-between items-center sticky bottom-0 z-10">
                                <button type="button" onclick="financialsManager.closeTransactionDrawer()" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition">Cancel</button>
                                <button type="submit" id="transactionDrawerSubmitBtn" class="px-5 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-dtech-600 hover:bg-dtech-700 shadow-sm transition">Save Transaction</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) financialsManager.closeTransactionDrawer();
            });
        }
        return modal;
    },

    selectTransactionType(type) {
        const typeInput = document.getElementById('t-drawer-type');
        if (typeInput) typeInput.value = type;

        const buttons = document.querySelectorAll('#t-drawer-type-group .t-type-btn');
        buttons.forEach(btn => {
            const btnType = btn.getAttribute('data-type');
            if (btnType === type) {
                if (type === 'Income') {
                    btn.className = 't-type-btn py-2 px-3 text-sm font-semibold rounded-lg border text-center transition flex items-center justify-center gap-1.5 border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 ring-2 ring-green-500';
                } else if (type === 'Expense') {
                    btn.className = 't-type-btn py-2 px-3 text-sm font-semibold rounded-lg border text-center transition flex items-center justify-center gap-1.5 border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 ring-2 ring-red-500';
                } else {
                    btn.className = 't-type-btn py-2 px-3 text-sm font-semibold rounded-lg border text-center transition flex items-center justify-center gap-1.5 border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-500';
                }
            } else {
                btn.className = 't-type-btn py-2 px-3 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-center transition flex items-center justify-center gap-1.5';
            }
        });
    },

    populateCategoryOptions(selectedCategory = '') {
        const catSelect = document.getElementById('t-drawer-category');
        if (!catSelect) return;

        const groups = {
            'Income': [],
            'Expense': [],
            'Asset': [],
            'Liability': [],
            'Equity': []
        };

        this.chartOfAccounts.forEach(acc => {
            const grp = groups[acc.type] || groups['Expense'];
            grp.push(acc.name);
        });

        let html = '<option value="">Select a Category...</option>';
        for (const [groupName, accounts] of Object.entries(groups)) {
            if (accounts.length > 0) {
                html += `<optgroup label="${groupName}">`;
                accounts.forEach(name => {
                    html += `<option value="${name}" ${selectedCategory === name ? 'selected' : ''}>${name}</option>`;
                });
                html += '</optgroup>';
            }
        }
        catSelect.innerHTML = html;
    },

    openTransactionDrawer(transaction = null) {
        const modal = this.ensureTransactionDrawer();
        const panel = document.getElementById('transactionDrawerPanel');
        const isEdit = !!(transaction && transaction.id);

        document.getElementById('transactionDrawerTitle').textContent = isEdit ? 'Edit Transaction' : 'Add Transaction';
        document.getElementById('transactionDrawerSubmitBtn').textContent = isEdit ? 'Save Changes' : 'Save Transaction';

        document.getElementById('t-drawer-id').value = isEdit ? transaction.id : '';
        document.getElementById('t-drawer-date').value = isEdit && transaction.date ? transaction.date : new Date().toISOString().split('T')[0];
        document.getElementById('t-drawer-amount').value = isEdit && transaction.amount !== undefined ? Math.abs(parseFloat(transaction.amount)) : '';
        document.getElementById('t-drawer-desc').value = isEdit && transaction.description ? transaction.description : '';
        document.getElementById('t-drawer-ref').value = isEdit && transaction.reference ? transaction.reference : '';

        const type = isEdit && transaction.type ? transaction.type : 'Income';
        this.selectTransactionType(type);
        this.populateCategoryOptions(isEdit ? transaction.category : '');

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            panel.classList.remove('translate-x-full');
        });
    },

    closeTransactionDrawer() {
        const modal = document.getElementById('transactionDrawerModal');
        const panel = document.getElementById('transactionDrawerPanel');
        if (!modal || !panel) return;
        panel.classList.add('translate-x-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    async saveTransactionDrawer(e) {
        e.preventDefault();

        const id = document.getElementById('t-drawer-id').value;
        const date = document.getElementById('t-drawer-date').value;
        const amount = parseFloat(document.getElementById('t-drawer-amount').value);
        const description = document.getElementById('t-drawer-desc').value.trim();
        const category = document.getElementById('t-drawer-category').value;
        const type = document.getElementById('t-drawer-type').value;
        const reference = document.getElementById('t-drawer-ref').value.trim();

        if (!date || !description || isNaN(amount) || amount <= 0 || !category) {
            return Swal.fire('Error', 'Please fill in all required fields with valid values.', 'warning');
        }

        const payload = {
            date,
            description,
            amount: type === 'Expense' ? -Math.abs(amount) : Math.abs(amount),
            category,
            type,
            reference
        };

        const submitBtn = document.getElementById('transactionDrawerSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Saving...';

        try {
            if (id) {
                // Update
                const response = await API.request(`/api/transactions/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                if (response.success) {
                    if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Updated transaction: ${description}`);
                    Swal.fire({ icon: 'success', title: 'Transaction Updated', timer: 1500, showConfirmButton: false });
                } else {
                    throw new Error(response.message || 'Failed to update transaction');
                }
            } else {
                // Create
                const response = await API.request('/api/transactions', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (response.success) {
                    if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Added manual transaction: ${description}`);
                    Swal.fire({ icon: 'success', title: 'Transaction Saved', timer: 1500, showConfirmButton: false });
                } else {
                    throw new Error(response.message || 'Failed to save transaction');
                }
            }
            this.closeTransactionDrawer();
            this.loadTransactions();
        } catch (err) {
            Swal.fire('Error', err.message || 'Failed to save transaction', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = id ? 'Save Changes' : 'Save Transaction';
        }
    },

    editTransaction(id) {
        const transaction = this.transactions.find(t => t.id === id);
        if (!transaction) return Swal.fire('Error', 'Transaction not found', 'error');
        this.openTransactionDrawer(transaction);
    },

    // Backward-compatible alias for existing buttons
    openTransactionModal(t) {
        this.openTransactionDrawer(t);
    },

    ensureRuleDrawer() {
        let modal = document.getElementById('ruleDrawerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ruleDrawerModal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden z-50 overflow-hidden';
            modal.innerHTML = `
                <div class="absolute inset-y-0 right-0 max-w-full flex">
                    <div class="w-screen max-w-md bg-white dark:bg-dark-card shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out translate-x-full" id="ruleDrawerPanel">
                        <div class="px-6 py-4 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                            <div>
                                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Auto-Categorization Rule</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automatically map bank descriptions</p>
                            </div>
                            <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" onclick="financialsManager.closeRuleDrawer()">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <form id="ruleDrawerForm" class="flex flex-col flex-grow overflow-hidden" onsubmit="financialsManager.saveRuleDrawer(event)">
                            <div class="p-4 sm:p-6 overflow-y-auto flex-grow space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description Keyword (Match) *</label>
                                    <p class="text-xs text-gray-500 mb-2">When a bank line contains this phrase (e.g. "Capitec Fee", "Uber", "Vodacom").</p>
                                    <input type="text" id="rule-drawer-match" required placeholder="e.g. Monthly Service Fee" class="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm p-2.5 shadow-sm focus:border-dtech-500 focus:ring-dtech-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Category *</label>
                                    <select id="rule-drawer-cat" required class="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm p-2.5 shadow-sm focus:border-dtech-500 focus:ring-dtech-500">
                                    </select>
                                </div>
                            </div>
                            <div class="px-6 py-4 border-t dark:border-dark-border bg-gray-50 dark:bg-gray-800 flex justify-between items-center sticky bottom-0 z-10">
                                <button type="button" onclick="financialsManager.closeRuleDrawer()" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition">Cancel</button>
                                <button type="submit" class="px-5 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-dtech-600 hover:bg-dtech-700 shadow-sm transition">Save Rule</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) financialsManager.closeRuleDrawer();
            });
        }
        return modal;
    },

    openRuleDrawer() {
        const modal = this.ensureRuleDrawer();
        const panel = document.getElementById('ruleDrawerPanel');
        const catSelect = document.getElementById('rule-drawer-cat');

        if (catSelect) {
            catSelect.innerHTML = '<option value="">Select Category</option>' +
                this.chartOfAccounts.map(acc => `<option value="${acc.name}">${acc.name} (${acc.type})</option>`).join('');
        }

        document.getElementById('rule-drawer-match').value = '';

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            panel.classList.remove('translate-x-full');
        });
    },

    closeRuleDrawer() {
        const modal = document.getElementById('ruleDrawerModal');
        const panel = document.getElementById('ruleDrawerPanel');
        if (!modal || !panel) return;
        panel.classList.add('translate-x-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    async saveRuleDrawer(e) {
        e.preventDefault();
        const descInput = document.getElementById('rule-drawer-match');
        const catSelect = document.getElementById('rule-drawer-cat');

        const desc = descInput.value.trim();
        const cat = catSelect.value;

        if (!desc || !cat) {
            return Swal.fire('Error', 'Please fill in both fields.', 'error');
        }

        const mappings = this.settings.mappings || {};
        mappings[desc.toLowerCase()] = cat;
        this.settings.mappings = mappings;
        await this.syncFinancialSettings();

        this.closeRuleDrawer();
        this.renderConfigTab();
        if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Added mapping rule: "${desc}" -> ${cat}`);
        Swal.fire({ icon: 'success', title: 'Rule Saved', timer: 1500, showConfirmButton: false });
    },

    async deleteTransaction(id) {
        if (await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then(res => res.isConfirmed)) {
            try {
                const response = await API.request(`/api/transactions/${id}`, { method: 'DELETE' });
                if (response.success) {
                    app.logActivity('Deleted a transaction record');
                    this.loadTransactions();
                }
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    triggerCSVUpload() {
        document.getElementById('csvFileInput').click();
    },

    initCSVUpload() {
        const dropzone = document.getElementById('reconcile-empty-state');
        if (!dropzone) return;

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                const card = dropzone.querySelector('.border-dashed');
                if (card) {
                    card.classList.add('border-dtech-500', 'bg-blue-50/30', 'dark:bg-blue-950/20');
                }
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                const card = dropzone.querySelector('.border-dashed');
                if (card) {
                    card.classList.remove('border-dtech-500', 'bg-blue-50/30', 'dark:bg-blue-950/20');
                }
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt ? dt.files : null;
            if (files && files.length > 0) {
                this.handleCSVUpload({ target: { files: files, value: '' } });
            }
        }, false);
    },

    extractVendorKey(description) {
        if (!description) return '';
        let clean = description
            .replace(/^(POS PURCHASE|DEBIT CARD|CARD PURCHASE|PURCHASE|PAYMENT TO|TRANSFER TO|EFT TO|EFT|ACB DEBIT|DIRECT DEBIT)\s*[:-]?\s*/i, '')
            .replace(/[*#]\d+/g, '')
            .replace(/\b\d{4,}\b/g, '') // remove large reference numbers
            .replace(/[^a-zA-Z0-9\s]/g, ' ')
            .trim();
        
        const words = clean.split(/\s+/).filter(w => w.length > 1);
        if (words.length >= 2) {
            return words.slice(0, 2).join(' ').toLowerCase();
        }
        return (words[0] || clean).toLowerCase();
    },

    showReconcileToast(message) {
        const container = document.getElementById('reconcile-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = "pointer-events-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 transform translate-y-2 opacity-0 transition-all duration-200 border border-white/10 dark:border-black/10";
        toast.innerHTML = `<i class="fas fa-bolt text-amber-400"></i> <span>${message}</span>`;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 250);
        }, 3500);
    },

    updateParseProgress(stepIndex, title, subtitle, percent) {
        const titleEl = document.getElementById('parse-progress-title');
        const subEl = document.getElementById('parse-progress-subtitle');
        const barEl = document.getElementById('parse-progress-bar');
        const pctEl = document.getElementById('parse-progress-percent');

        if (title && titleEl) titleEl.textContent = title;
        if (subtitle && subEl) subEl.textContent = subtitle;
        if (percent !== undefined) {
            if (barEl) barEl.style.width = `${percent}%`;
            if (pctEl) pctEl.textContent = `${percent}%`;
        }

        for (let i = 1; i <= 4; i++) {
            const stepEl = document.getElementById(`parse-step-${i}`);
            const statusEl = document.getElementById(`parse-step-${i}-status`);
            if (!stepEl || !statusEl) continue;

            if (i < stepIndex) {
                stepEl.className = "flex items-center justify-between text-green-600 dark:text-green-400";
                const icon = stepEl.querySelector('i');
                if (icon) icon.className = "fas fa-check-circle w-4 text-center";
                statusEl.textContent = "Done";
                statusEl.className = "text-[11px] font-semibold text-green-600 dark:text-green-400";
            } else if (i === stepIndex) {
                stepEl.className = "flex items-center justify-between font-medium text-gray-900 dark:text-white";
                const icon = stepEl.querySelector('i');
                if (icon) icon.className = "fas fa-spinner fa-spin text-dtech-500 w-4 text-center";
                statusEl.textContent = "Processing";
                statusEl.className = "text-[11px] font-semibold text-dtech-600 dark:text-dtech-400";
            } else {
                stepEl.className = "flex items-center justify-between text-gray-400";
                const icon = stepEl.querySelector('i');
                if (icon) icon.className = "far fa-circle w-4 text-center";
                statusEl.textContent = "Pending";
                statusEl.className = "text-[11px] text-gray-400";
            }
        }
    },

    handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const overlay = document.getElementById('csv-loading-overlay');
        if (overlay) overlay.classList.remove('hidden');
        this.updateParseProgress(1, 'Reading Bank Statement...', `Analyzing ${file.name} lines & headers`, 15);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            try {
                await this.parseCSV(text);
            } finally {
                if (overlay) overlay.classList.add('hidden');
            }
        };
        reader.readAsText(file);
        // Reset input so the same file can be uploaded again if needed
        event.target.value = '';
    },

    async parseCSV(csvText) {
        // Parse CSV with support for quoted strings
        function parseCSVRow(str) {
            const arr = [];
            let quote = false;
            let col = '';
            for (let i = 0; i < str.length; i++) {
                let cc = str[i], nc = str[i+1];
                if (cc === '"' && quote && nc === '"') {
                    col += cc; ++i; continue;
                }
                if (cc === '"') {
                    quote = !quote; continue;
                }
                if (cc === ',' && !quote) {
                    arr.push(col); col = ''; continue;
                }
                if (cc === '\r' && nc === '\n' && !quote) {
                    arr.push(col); col = ''; ++i; continue;
                }
                if (cc === '\n' && !quote) {
                    arr.push(col); col = ''; continue;
                }
                if (cc === '\r' && !quote) continue;
                col += cc;
            }
            arr.push(col);
            return arr;
        }

        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
            Swal.fire('Error', 'CSV file appears to be empty or invalid.', 'error');
            return;
        }

        const headers = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase());

        // Find indices
        const dateIdx = headers.findIndex(h => h.includes('posting date') || h.includes('transaction date') || h === 'date');
        const descIdx = headers.findIndex(h => h === 'description' || h === 'original description');
        const moneyInIdx = headers.findIndex(h => h === 'money in' || h === 'credit');
        const moneyOutIdx = headers.findIndex(h => h === 'money out' || h === 'debit');
        const amountIdx = headers.findIndex(h => h === 'amount');
        const feeIdx = headers.findIndex(h => h === 'fee');

        if (dateIdx === -1 || descIdx === -1) {
            Swal.fire('Error', 'Could not detect required columns (Date, Description) in the CSV.', 'error');
            return;
        }

        this.updateParseProgress(2, 'Matching Invoices...', `Checking unpaid invoices against ${lines.length - 1} statement rows...`, 45);
        await new Promise(r => setTimeout(r, 120));

        // Fetch existing invoices and transactions for smart cross-referencing
        let existingInvoices = [];
        try {
            const invRes = await API.request('/api/invoices');
            if (invRes && invRes.success) existingInvoices = invRes.invoices || [];
        } catch (e) {
            console.warn("Could not pre-load invoices for reconciliation", e);
        }

        this.updateParseProgress(3, 'Checking Duplicates...', 'Cross-referencing historical ledger entries to prevent duplicates...', 70);
        await new Promise(r => setTimeout(r, 100));

        let existingTransactions = this.transactions || [];
        if (!existingTransactions || existingTransactions.length === 0) {
            try {
                const txRes = await API.request('/api/transactions?limit=1000');
                if (txRes && txRes.success) {
                    this.transactions = txRes.transactions || [];
                    existingTransactions = this.transactions;
                }
            } catch (e) {
                console.warn("Could not pre-load transactions for reconciliation", e);
            }
        }

        this.updateParseProgress(4, 'Applying Categorization Rules...', 'Applying automated vendor categorization rules...', 85);
        const parsedData = [];

        for (let i = 1; i < lines.length; i++) {
            const columns = parseCSVRow(lines[i]);
            if (columns.length <= Math.max(dateIdx, descIdx)) continue;

            let dateStr = columns[dateIdx] ? columns[dateIdx].trim() : '';
            // Strip time if present (e.g. 2026-09-01 06:47 -> 2026-09-01)
            dateStr = dateStr.split(' ')[0];

            let desc = columns[descIdx] ? columns[descIdx].trim() : '';
            if (!desc) continue; // Skip empty rows

            let amount = 0;
            let type = '';

            // Handle specific formats with Money In / Money Out
            if (moneyInIdx !== -1 || moneyOutIdx !== -1) {
                let mIn = moneyInIdx !== -1 && columns[moneyInIdx] ? parseFloat(columns[moneyInIdx].replace(/[^\d.-]/g, '')) : NaN;
                let mOut = moneyOutIdx !== -1 && columns[moneyOutIdx] ? parseFloat(columns[moneyOutIdx].replace(/[^\d.-]/g, '')) : NaN;
                let fee = feeIdx !== -1 && columns[feeIdx] ? parseFloat(columns[feeIdx].replace(/[^\d.-]/g, '')) : NaN;

                if (!isNaN(mIn) && mIn !== 0) {
                    amount = Math.abs(mIn);
                    type = 'Income';
                } else if (!isNaN(mOut) && mOut !== 0) {
                    amount = Math.abs(mOut);
                    type = 'Expense';
                } else if (!isNaN(fee) && fee !== 0) {
                    amount = Math.abs(fee);
                    type = 'Expense';
                    desc += ' (Fee)';
                }
            } else if (amountIdx !== -1) {
                // Simple Amount column
                const amtStr = columns[amountIdx] ? columns[amountIdx].replace(/[^\d.-]/g, '') : '';
                amount = parseFloat(amtStr);
                if (!isNaN(amount)) {
                    type = amount < 0 ? 'Expense' : 'Income';
                    amount = Math.abs(amount);
                }
            } else {
                // Fallback: try to guess standard 3 column format (Date, Description, Amount)
                const amtStrFallback = columns.length >= 3 ? columns[2].replace(/[^\d.-]/g, '') : '';
                amount = parseFloat(amtStrFallback);
                if (!isNaN(amount)) {
                    type = amount < 0 ? 'Expense' : 'Income';
                    amount = Math.abs(amount);
                }
            }

            // Smart Reference & Invoice Matching
            let matchedInvoice = null;
            const descUpper = desc.toUpperCase();

            if (existingInvoices.length > 0) {
                matchedInvoice = existingInvoices.find(inv => {
                    if (!inv.reference) return false;
                    return descUpper.includes(inv.reference.toUpperCase());
                });
            }

            if (!matchedInvoice) {
                const invMatch = descUpper.match(/INV-\d+/i);
                if (invMatch) {
                    matchedInvoice = existingInvoices.find(inv => inv.reference && inv.reference.toUpperCase() === invMatch[0]);
                }
            }

            let autoCategory = '';
            let isDuplicate = false;
            let duplicateReason = '';

            if (matchedInvoice) {
                autoCategory = 'Sales / Services Revenue';
                type = 'Income';

                // Check if a transaction for this invoice already exists in ledger
                const existingTx = existingTransactions.find(t =>
                    (t.reference && matchedInvoice.reference && t.reference.toUpperCase().includes(matchedInvoice.reference.toUpperCase())) ||
                    (t.description && matchedInvoice.reference && t.description.toUpperCase().includes(matchedInvoice.reference.toUpperCase()))
                );

                if (existingTx) {
                    isDuplicate = true;
                    duplicateReason = `Already in ledger (${matchedInvoice.reference})`;
                } else if (matchedInvoice.status === 'Paid') {
                    duplicateReason = `Invoice ${matchedInvoice.reference} already marked Paid`;
                }
            } else {
                // Check if identical date, description, and amount already exists in ledger
                const existingTx = existingTransactions.find(t =>
                    t.date === dateStr &&
                    Math.abs(Number(t.amount) - amount) < 0.01 &&
                    t.description && t.description.toLowerCase().trim() === desc.toLowerCase().trim()
                );
                if (existingTx) {
                    isDuplicate = true;
                    duplicateReason = 'Exact duplicate already in ledger';
                }
            }

            const lowerDesc = desc.toLowerCase();
            if (!autoCategory) {
                if (lowerDesc.includes('fee')) {
                    autoCategory = 'Bank Fees';
                }
                // Get saved mappings
                const savedMappings = this.settings.mappings || {};
                for (const [key, cat] of Object.entries(savedMappings)) {
                    if (lowerDesc.includes(key.toLowerCase())) {
                        autoCategory = cat;
                        break;
                    }
                }
            }

            if (!isNaN(amount) && amount !== 0) {
                parsedData.push({
                    date: dateStr,
                    description: desc,
                    amount: amount,
                    type: type,
                    category: autoCategory,
                    matchedInvoice: matchedInvoice ? matchedInvoice.reference : null,
                    matchedInvoiceId: matchedInvoice ? matchedInvoice.id : null,
                    isDuplicate: isDuplicate,
                    duplicateReason: duplicateReason,
                    skip: isDuplicate
                });
            }
        }

        if (parsedData.length > 0) {
            this.updateParseProgress(5, 'Reconciliation Ready!', `Successfully processed ${parsedData.length} transactions.`, 100);
            await new Promise(r => setTimeout(r, 220));
            this.renderCSVReconciliation(parsedData);
        } else {
            Swal.fire('Error', 'Could not parse any valid transactions from the CSV.', 'error');
        }
    },

    renderCSVReconciliation(parsedData) {
        this._pendingReconcileData = parsedData;

        // Auto pick default tab: review if there are unassigned items, else auto, else all
        const unassigned = parsedData.filter(r => !r.skip && (!r.category || !r.category.trim()));
        const autoCount = parsedData.filter(r => r.category && r.category.trim() && !r.isDuplicate).length;
        if (unassigned.length > 0) {
            this._reconcileTab = 'review';
        } else if (autoCount > 0) {
            this._reconcileTab = 'auto';
        } else {
            this._reconcileTab = 'all';
        }

        const emptyState = document.getElementById('reconcile-empty-state');
        const splitView = document.getElementById('reconcile-split-view');
        if (emptyState) emptyState.classList.add('hidden');
        if (splitView) {
            splitView.classList.remove('hidden');
            splitView.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        this.updateReconcileKPIs();
        this.renderDedicatedReconcileList();
    },

    updateReconcileKPIs() {
        if (!this._pendingReconcileData) return;

        const data = this._pendingReconcileData;
        const total = data.length;
        let net = 0;
        let manualCount = 0;
        let autoCount = 0;
        let dupCount = 0;
        let readyCount = 0;

        data.forEach(r => {
            const amt = Number(r.amount) || 0;
            if (r.type === 'Income') net += amt;
            else net -= amt;

            if (r.isDuplicate) dupCount++;

            const hasCat = r.category && r.category.trim() !== '';
            if (!hasCat && !r.skip) {
                manualCount++;
            } else if (hasCat && !r.isDuplicate) {
                autoCount++;
            }

            if (!r.skip && hasCat) {
                readyCount++;
            }
        });

        const elTotal = document.getElementById('recon-kpi-total');
        const elNet = document.getElementById('recon-kpi-net');
        const elManual = document.getElementById('recon-kpi-manual');
        const elAuto = document.getElementById('recon-kpi-auto');
        const elDup = document.getElementById('recon-kpi-dup');

        const bReview = document.getElementById('badge-recon-review');
        const bAuto = document.getElementById('badge-recon-auto');
        const bDup = document.getElementById('badge-recon-dup');
        const bAll = document.getElementById('badge-recon-all');
        const elReady = document.getElementById('recon-ready-count');

        if (elTotal) elTotal.textContent = total;
        if (elNet) elNet.textContent = `Net: ${net >= 0 ? '+' : '-'}R${Math.abs(net).toFixed(2)}`;
        if (elManual) elManual.textContent = manualCount;
        if (elAuto) elAuto.textContent = autoCount;
        if (elDup) elDup.textContent = dupCount;

        if (bReview) bReview.textContent = manualCount;
        if (bAuto) bAuto.textContent = autoCount;
        if (bDup) bDup.textContent = dupCount;
        if (bAll) bAll.textContent = total;
        if (elReady) elReady.textContent = readyCount;
    },

    setReconcileTab(tab) {
        this._reconcileTab = tab;
        this.renderDedicatedReconcileList();
    },

    renderDedicatedReconcileList() {
        if (!this._pendingReconcileData) return;

        const container = document.getElementById('reconcile-list-container');
        if (!container) return;

        // 1. Update Tab button styles
        const tabBtns = {
            'review': document.getElementById('tab-btn-recon-review'),
            'auto': document.getElementById('tab-btn-recon-auto'),
            'duplicates': document.getElementById('tab-btn-recon-dup'),
            'all': document.getElementById('tab-btn-recon-all')
        };

        const activeClasses = ['bg-white', 'dark:bg-dark-card', 'shadow-sm', 'text-dtech-600', 'dark:text-dtech-400', 'font-semibold', 'ring-1', 'ring-black/5', 'dark:ring-white/10'];
        const inactiveClasses = ['text-gray-600', 'dark:text-gray-400', 'hover:text-gray-900', 'dark:hover:text-white', 'font-medium'];

        Object.keys(tabBtns).forEach(tabKey => {
            const btn = tabBtns[tabKey];
            if (!btn) return;
            if (tabKey === this._reconcileTab) {
                btn.classList.add(...activeClasses);
                btn.classList.remove(...inactiveClasses);
            } else {
                btn.classList.remove(...activeClasses);
                btn.classList.add(...inactiveClasses);
            }
        });

        // 2. Filter data for the active dedicated tab
        const searchQuery = (document.getElementById('recon-search-filter')?.value || '').toLowerCase().trim();
        const itemsWithIndex = this._pendingReconcileData.map((row, idx) => ({ row, idx }));

        // Count similar unassigned payees across pending data to display smart count badges
        const vendorCounts = {};
        this._pendingReconcileData.forEach(r => {
            const k = this.extractVendorKey(r.description);
            if (k && k.length >= 3) {
                vendorCounts[k] = (vendorCounts[k] || 0) + 1;
            }
        });

        const filtered = itemsWithIndex.filter(item => {
            const { row } = item;
            const hasCat = row.category && row.category.trim() !== '';

            if (this._reconcileTab === 'review') {
                if (hasCat && !row.isDuplicate) return false;
                if (row.skip && row.isDuplicate) return false;
            } else if (this._reconcileTab === 'auto') {
                if (!hasCat || row.isDuplicate) return false;
            } else if (this._reconcileTab === 'duplicates') {
                if (!row.isDuplicate) return false;
            }

            if (searchQuery) {
                const searchStr = `${row.date} ${row.description} ${row.amount} ${row.category || ''} ${row.matchedInvoice || ''}`.toLowerCase();
                if (!searchStr.includes(searchQuery)) return false;
            }

            return true;
        });

        // 3. Render empty states or list
        if (filtered.length === 0) {
            let emptyHtml = '';
            if (this._reconcileTab === 'review') {
                emptyHtml = `
                    <div class="text-center py-12 px-4 bg-white dark:bg-dark-card rounded-2xl border border-dashed border-gray-200 dark:border-dark-border">
                        <div class="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/40 text-green-500 flex items-center justify-center mx-auto mb-3 text-2xl">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3 class="text-base font-bold text-gray-900 dark:text-white">All Transactions Categorized!</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">Zero transactions currently need manual review in this statement.</p>
                        <div class="mt-4 flex items-center justify-center gap-3">
                            <button type="button" onclick="financialsManager.setReconcileTab('auto')" class="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200">
                                View Auto-Matched <i class="fas fa-arrow-right ml-1"></i>
                            </button>
                            <button type="button" onclick="financialsManager.saveReconciled()" class="btn-primary px-4 py-2 text-xs font-semibold shadow">
                                <i class="fas fa-check-double mr-1"></i> Save to Ledger
                            </button>
                        </div>
                    </div>
                `;
            } else if (this._reconcileTab === 'auto') {
                emptyHtml = `
                    <div class="text-center py-10 px-4 bg-white dark:bg-dark-card rounded-2xl border border-dashed border-gray-200 dark:border-dark-border">
                        <i class="fas fa-info-circle text-gray-400 text-3xl mb-2"></i>
                        <h3 class="text-sm font-bold text-gray-800 dark:text-white">No Auto-Matched Transactions</h3>
                        <p class="text-xs text-gray-500 mt-1">None of the transactions matched existing rules or invoice numbers automatically.</p>
                    </div>
                `;
            } else if (this._reconcileTab === 'duplicates') {
                emptyHtml = `
                    <div class="text-center py-10 px-4 bg-white dark:bg-dark-card rounded-2xl border border-dashed border-gray-200 dark:border-dark-border">
                        <i class="fas fa-copy text-green-500 text-3xl mb-2"></i>
                        <h3 class="text-sm font-bold text-gray-800 dark:text-white">No Duplicates Found</h3>
                        <p class="text-xs text-gray-500 mt-1">Great! All statement lines are unique and do not conflict with previous imports.</p>
                    </div>
                `;
            } else {
                emptyHtml = `
                    <div class="text-center py-10 px-4 bg-white dark:bg-dark-card rounded-2xl border border-dashed border-gray-200 dark:border-dark-border">
                        <i class="fas fa-search text-gray-400 text-3xl mb-2"></i>
                        <h3 class="text-sm font-bold text-gray-800 dark:text-white">No Transactions Found</h3>
                        <p class="text-xs text-gray-500 mt-1">No transactions match your current search query.</p>
                    </div>
                `;
            }

            container.innerHTML = emptyHtml;
            return;
        }

        // Build Chart of Accounts optgroups
        const groups = {};
        this.chartOfAccounts.forEach(acc => {
            const groupName = acc.type || 'Other';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(acc);
        });

        // 4. Render transaction cards
        const cardsHtml = filtered.map(item => {
            const { row, idx } = item;
            const isExpense = row.type === 'Expense';
            const amountColor = isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
            const amountSign = isExpense ? '-' : '+';
            const hasCategory = row.category && row.category.trim() !== '';

            let borderClass = 'border-gray-200 dark:border-dark-border';
            if (!hasCategory) {
                borderClass = 'border-amber-300 dark:border-amber-700/80 bg-amber-50/15 dark:bg-amber-950/10 ring-1 ring-amber-300/40';
            } else if (row.isDuplicate) {
                borderClass = 'border-gray-200 dark:border-dark-border opacity-75 bg-gray-50/50 dark:bg-dark-card/50';
            }

            const vendorKey = this.extractVendorKey(row.description);
            const similarCount = vendorCounts[vendorKey] || 0;

            const catOptions = Object.keys(groups).map(grp => `
                <optgroup label="${grp}">
                    ${groups[grp].map(acc => `<option value="${acc.name}" ${row.category === acc.name ? 'selected' : ''}>${acc.name}</option>`).join('')}
                </optgroup>
            `).join('');

            return `
                <div id="recon-card-${idx}" class="bg-white dark:bg-dark-card border rounded-xl p-4 sm:p-5 shadow-sm transition hover:shadow-md flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${borderClass}">
                    <div class="flex-1 min-w-0 w-full">
                        <div class="flex items-center gap-2 flex-wrap mb-1.5">
                            <span class="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
                                <i class="far fa-calendar-alt text-[10px]"></i> ${row.date}
                            </span>
                            <span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${isExpense ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'}">
                                <i class="fas ${isExpense ? 'fa-arrow-up text-[10px]' : 'fa-arrow-down text-[10px]'}"></i> ${row.type}
                            </span>
                            ${row.matchedInvoice ? `
                                <span class="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/60 font-mono">
                                    <i class="fas fa-file-invoice-dollar text-[10px]"></i> ${row.matchedInvoice}
                                </span>
                            ` : ''}
                            ${row.isDuplicate ? `
                                <span class="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/60">
                                    <i class="fas fa-copy text-[10px]"></i> ${row.duplicateReason || 'Duplicate'}
                                </span>
                            ` : ''}
                            ${similarCount > 1 ? `
                                <span class="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/60" title="${similarCount} transactions share payee &quot;${vendorKey.toUpperCase()}&quot; and will auto-sync category">
                                    <i class="fas fa-layer-group text-[10px]"></i> ${similarCount} in statement (auto-syncs)
                                </span>
                            ` : ''}
                            <span id="recon-status-badge-${idx}" class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${hasCategory ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'}">
                                <i class="fas ${hasCategory ? 'fa-check' : 'fa-exclamation-triangle'} text-[10px]"></i> ${hasCategory ? 'Categorized' : 'Needs Category'}
                            </span>
                        </div>

                        <p class="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate ${row.skip ? 'line-through text-gray-400' : ''}" id="recon-desc-${idx}" title="${row.description}">
                            ${row.description}
                        </p>

                        <div class="mt-2.5 flex items-center gap-4">
                            <label class="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                                <input type="checkbox" id="recon-skip-${idx}" onchange="financialsManager.toggleSkipReconcile(${idx}, this.checked)" ${row.skip ? 'checked' : ''} class="rounded border-gray-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5">
                                <span class="${row.skip ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}">${row.isDuplicate ? 'Skip duplicate (Do not import)' : 'Skip this transaction'}</span>
                            </label>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center gap-3 w-full md:w-auto flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-dark-border">
                        <div class="text-right sm:text-left md:text-right">
                            <span class="text-base sm:text-lg font-bold font-mono ${amountColor}">
                                ${amountSign}R${Number(row.amount).toFixed(2)}
                            </span>
                        </div>
                        <div class="w-full sm:w-64 md:w-60">
                            <select id="recon-cat-${idx}" onchange="financialsManager.onReconcileCatChange(${idx}, this.value)" class="w-full text-xs sm:text-sm rounded-lg border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-white shadow-sm focus:border-dtech-500 focus:ring-dtech-500 py-2 ${!hasCategory ? 'border-amber-400 ring-1 ring-amber-400/50 bg-amber-50/20 dark:bg-amber-950/20' : ''}">
                                <option value="">Select Category...</option>
                                ${catOptions}
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = cardsHtml;
    },

    onReconcileCatChange(idx, newCategory, isAutoPropagated = false) {
        if (!this._pendingReconcileData || !this._pendingReconcileData[idx]) return;

        const row = this._pendingReconcileData[idx];
        const oldCategory = row.category;
        row.category = newCategory;

        this.updateReconcileKPIs();

        const card = document.getElementById(`recon-card-${idx}`);
        const badge = document.getElementById(`recon-status-badge-${idx}`);
        const select = document.getElementById(`recon-cat-${idx}`);

        if (newCategory) {
            if (badge) {
                badge.className = "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
                badge.innerHTML = '<i class="fas fa-check text-[10px]"></i> Categorized';
            }
            if (select) {
                select.classList.remove('border-amber-400', 'ring-1', 'ring-amber-400/50', 'bg-amber-50/20', 'dark:bg-amber-950/20');
            }
            if (card && !row.isDuplicate) {
                card.classList.remove('border-amber-300', 'dark:border-amber-700/80', 'bg-amber-50/15', 'dark:bg-amber-950/10', 'ring-1', 'ring-amber-300/40');
                card.classList.add('border-gray-200', 'dark:border-dark-border');
            }
        } else {
            if (badge) {
                badge.className = "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200";
                badge.innerHTML = '<i class="fas fa-exclamation-triangle text-[10px]"></i> Needs Category';
            }
            if (select) {
                select.classList.add('border-amber-400', 'ring-1', 'ring-amber-400/50', 'bg-amber-50/20', 'dark:bg-amber-950/20');
            }
            if (card && !row.isDuplicate) {
                card.classList.add('border-amber-300', 'dark:border-amber-700/80', 'bg-amber-50/15', 'dark:bg-amber-950/10', 'ring-1', 'ring-amber-300/40');
                card.classList.remove('border-gray-200', 'dark:border-dark-border');
            }
        }

        // Auto-propagate to matching vendor rows in the statement (unless user explicitly edits an individual transaction)
        if (newCategory && !isAutoPropagated) {
            const vendorKey = this.extractVendorKey(row.description);
            if (vendorKey && vendorKey.length >= 3) {
                let propagatedCount = 0;
                this._pendingReconcileData.forEach((otherRow, otherIdx) => {
                    // Only propagate to other unassigned rows or rows with identical previous category
                    if (otherIdx !== idx && !otherRow.skip && (!otherRow.category || otherRow.category === oldCategory)) {
                        const otherKey = this.extractVendorKey(otherRow.description);
                        if (otherKey === vendorKey || otherRow.description.toLowerCase().includes(vendorKey)) {
                            otherRow.category = newCategory;
                            propagatedCount++;

                            const otherCard = document.getElementById(`recon-card-${otherIdx}`);
                            const otherBadge = document.getElementById(`recon-status-badge-${otherIdx}`);
                            const otherSelect = document.getElementById(`recon-cat-${otherIdx}`);

                            if (otherSelect) otherSelect.value = newCategory;
                            if (otherBadge) {
                                otherBadge.className = "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
                                otherBadge.innerHTML = '<i class="fas fa-check text-[10px]"></i> Categorized';
                            }
                            if (otherCard && !otherRow.isDuplicate) {
                                otherCard.classList.remove('border-amber-300', 'dark:border-amber-700/80', 'bg-amber-50/15', 'dark:bg-amber-950/10', 'ring-1', 'ring-amber-300/40');
                                otherCard.classList.add('border-gray-200', 'dark:border-dark-border');
                            }
                        }
                    }
                });

                if (propagatedCount > 0) {
                    this.updateReconcileKPIs();
                    this.showReconcileToast(`⚡ Auto-applied "${newCategory}" to ${propagatedCount} matching "${vendorKey.toUpperCase()}" transaction(s)!`);
                }
            }
        }
    },

    toggleSkipReconcile(idx, isChecked) {
        if (!this._pendingReconcileData || !this._pendingReconcileData[idx]) return;

        const row = this._pendingReconcileData[idx];
        row.skip = isChecked;

        this.updateReconcileKPIs();

        const desc = document.getElementById(`recon-desc-${idx}`);
        if (desc) {
            if (isChecked) {
                desc.classList.add('line-through', 'text-gray-400');
            } else {
                desc.classList.remove('line-through', 'text-gray-400');
            }
        }
    },

    filterReconcileList() {
        this.renderDedicatedReconcileList();
    },

    closeReconciliationView() {
        this._pendingReconcileData = null;
        const emptyState = document.getElementById('reconcile-empty-state');
        const splitView = document.getElementById('reconcile-split-view');
        const listContainer = document.getElementById('reconcile-list-container');
        const fileInput = document.getElementById('csvFileInput');

        if (listContainer) listContainer.innerHTML = '';
        if (fileInput) fileInput.value = '';
        if (splitView) splitView.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');

        const isPublic = window.location.pathname.includes('public_');
        window.location.href = isPublic ? 'public_financials.html' : 'financials.html';
    },

    async saveReconciled() {
        if (!this._pendingReconcileData || this._pendingReconcileData.length === 0) {
            Swal.fire('Info', 'No statement data to save.', 'info');
            return;
        }

        const readyData = this._pendingReconcileData.filter(r => !r.skip && r.category && r.category.trim() !== '');

        if (readyData.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Transactions Selected',
                text: 'Please select a category for at least one transaction to import, or uncheck "Skip".'
            });
            return;
        }

        const unassignedCount = this._pendingReconcileData.filter(r => !r.skip && (!r.category || !r.category.trim())).length;
        if (unassignedCount > 0) {
            const result = await Swal.fire({
                title: 'Uncategorized Transactions',
                html: `<b>${unassignedCount} transaction(s)</b> have no category assigned and will be skipped.<br><br>Do you want to proceed and import the <b>${readyData.length} categorized transaction(s)</b>?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#0284c7',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Yes, Import Now',
                cancelButtonText: 'Review More'
            });
            if (!result.isConfirmed) {
                this.setReconcileTab('review');
                return;
            }
        }

        // Save learned word mappings
        const newMappings = { ...(this.settings.mappings || {}) };
        readyData.forEach(row => {
            if (row.description) {
                const words = row.description.split(' ').slice(0, 3).join(' ').trim();
                if (words && words.length > 2 && !newMappings[words.toLowerCase()]) {
                    newMappings[words.toLowerCase()] = row.category;
                }
            }
        });
        this.settings.mappings = newMappings;

        // Interactive Live Progress Modal
        Swal.fire({
            title: 'Posting to Financials Ledger',
            html: `
                <div class="text-left mt-2">
                    <div class="flex justify-between items-center text-xs text-gray-500 mb-1.5 font-medium">
                        <span id="post-step-status">Initializing posting sequence...</span>
                        <span id="post-percent" class="font-bold text-dtech-600">0%</span>
                    </div>
                    <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-3 overflow-hidden">
                        <div id="post-progress-bar" class="bg-dtech-600 h-2.5 rounded-full transition-all duration-300 ease-out" style="width: 5%"></div>
                    </div>
                    <div class="bg-gray-50 dark:bg-dark-bg/80 border border-gray-200 dark:border-dark-border rounded-xl p-3 max-h-40 overflow-y-auto font-mono text-[11px] text-gray-700 dark:text-gray-300 space-y-1.5" id="post-activity-log">
                        <div class="text-gray-400 flex items-center gap-1.5"><i class="fas fa-circle-notch fa-spin text-dtech-500"></i> Preparing ${readyData.length} transactions for ledger...</div>
                    </div>
                </div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {}
        });

        const updateProgress = (pct, statusText, logMessage, logIcon = 'fas fa-check text-green-500') => {
            const bar = document.getElementById('post-progress-bar');
            const pctEl = document.getElementById('post-percent');
            const statusEl = document.getElementById('post-step-status');
            const logEl = document.getElementById('post-activity-log');

            if (bar) bar.style.width = `${pct}%`;
            if (pctEl) pctEl.textContent = `${pct}%`;
            if (statusEl && statusText) statusEl.textContent = statusText;
            if (logEl && logMessage) {
                const item = document.createElement('div');
                item.className = "flex items-center gap-1.5 animate-fade-in";
                item.innerHTML = `<i class="${logIcon} text-[10px] w-3.5 text-center"></i> <span>${logMessage}</span>`;
                logEl.appendChild(item);
                logEl.scrollTop = logEl.scrollHeight;
            }
        };

        // 1. Sync learned vendor categorization rules
        updateProgress(15, 'Saving vendor rules...', `Saved automated categorization rules for learned payees`, 'fas fa-brain text-purple-500');
        await this.syncFinancialSettings();
        await new Promise(r => setTimeout(r, 120));

        // 2. Prepare payload
        const txPayload = readyData.map(t => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
            category: t.category,
            reference: t.matchedInvoice || ''
        }));

        updateProgress(35, 'Posting transactions to Cloudflare KV...', `Committing batch of ${txPayload.length} transactions...`, 'fas fa-database text-blue-500');

        let successCount = 0;
        let invoiceUpdates = 0;

        try {
            const batchResponse = await API.request('/api/transactions', {
                method: 'POST',
                body: JSON.stringify(txPayload)
            });

            if (batchResponse && batchResponse.success) {
                successCount = txPayload.length;
                updateProgress(65, 'Transactions stored in ledger!', `Committed all ${successCount} transactions cleanly in 1 KV write`, 'fas fa-check-circle text-green-500');
            } else {
                // Fallback to sequential if batch not accepted
                for (let i = 0; i < txPayload.length; i++) {
                    const t = txPayload[i];
                    try {
                        const r = await API.request('/api/transactions', { method: 'POST', body: JSON.stringify(t) });
                        if (r && r.success) successCount++;
                        const p = 35 + Math.round(((i + 1) / txPayload.length) * 35);
                        updateProgress(p, `Posting ${i + 1}/${txPayload.length}...`, `Recorded: "${t.description.slice(0, 24)}..."`);
                    } catch (err) {}
                }
            }
        } catch (e) {
            console.error('Batch save failed, falling back', e);
        }
        await new Promise(r => setTimeout(r, 150));

        // 3. Reconcile matched invoices
        const matchedItems = readyData.filter(t => t.matchedInvoiceId);
        if (matchedItems.length > 0) {
            updateProgress(70, `Reconciling ${matchedItems.length} matched invoice(s)...`, `Cross-referencing payment records against client invoices...`, 'fas fa-link text-blue-500');
            for (let i = 0; i < matchedItems.length; i++) {
                const t = matchedItems[i];
                try {
                    await API.request(`/api/invoices/${t.matchedInvoiceId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ status: 'Paid', balanceDue: '0.00' })
                    });
                    invoiceUpdates++;
                    const pct = 70 + Math.round(((i + 1) / matchedItems.length) * 25);
                    updateProgress(pct, `Reconciling invoice ${i + 1}/${matchedItems.length}...`, `Invoice ${t.matchedInvoice || ''} marked as Paid`, 'fas fa-file-invoice-dollar text-green-500');
                    await new Promise(r => setTimeout(r, 80));
                } catch (invErr) {
                    console.warn("Could not mark invoice paid", invErr);
                }
            }
        }

        // 4. Wrap up
        updateProgress(100, 'Reconciliation Complete!', `Posted ${successCount} transactions and updated ${invoiceUpdates} invoice(s).`, 'fas fa-check-double text-green-500');
        await new Promise(r => setTimeout(r, 350));

        if (typeof app !== 'undefined' && app.logActivity) {
            app.logActivity(`Imported and reconciled ${successCount} transactions`);
        }

        this._pendingReconcileData = null;

        await Swal.fire({
            icon: 'success',
            title: 'Reconciliation Complete!',
            html: `Successfully posted <b>${successCount}</b> transactions to your Financial Ledger.<br>${invoiceUpdates > 0 ? `Updated <b>${invoiceUpdates}</b> matched invoice(s) to Paid.` : ''}`,
            confirmButtonText: 'Go to Financials',
            confirmButtonColor: '#0284c7'
        });

        const isPublic = window.location.pathname.includes('public_');
        window.location.href = isPublic ? 'public_financials.html' : 'financials.html';
    },

    generateIncomeStatement() {
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;

        if (!startDate || !endDate) {
            Swal.fire('Error', 'Please select a start and end date', 'warning');
            return;
        }

        const filtered = this.transactions.filter(t => {
            const d = new Date(t.date);
            return d >= new Date(startDate) && d <= new Date(endDate);
        });

        if (typeof pdfEngine !== 'undefined' && pdfEngine.generateIncomeStatementPDF) {
            pdfEngine.generateIncomeStatementPDF(filtered, startDate, endDate);
        } else {
            Swal.fire('Error', 'PDF Engine not updated for Income Statement yet', 'error');
        }
    },

    generateBalanceSheet() {
        const asOfDate = document.getElementById('report-as-of-date').value;

        if (!asOfDate) {
            Swal.fire('Error', 'Please select an "As Of" date', 'warning');
            return;
        }

        const filtered = this.transactions.filter(t => {
            const d = new Date(t.date);
            return d <= new Date(asOfDate);
        });

        if (typeof pdfEngine !== 'undefined' && pdfEngine.generateBalanceSheetPDF) {
            pdfEngine.generateBalanceSheetPDF(filtered, asOfDate);
        } else {
            Swal.fire('Error', 'PDF Engine not updated for Balance Sheet yet', 'error');
        }
    },

    async saveFinancialSettings() {
        const fyMonth = document.getElementById('config-fy-month').value;
        this.settings.fyStartMonth = fyMonth;
        const success = await this.syncFinancialSettings();
        if (success) {
            Swal.fire('Saved', 'Financial settings have been saved successfully.', 'success');
        }
    },

    async generateAnnualReports() {
        const fyStartMonth = parseInt(this.settings.fyStartMonth || '3', 10);

        // Determine the current financial year based on today's date
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1; // 1-12

        let startYear, endYear;
        if (currentMonth >= fyStartMonth) {
            // We are currently IN the new financial year
            startYear = currentYear;
            endYear = currentYear + 1;
        } else {
            // We are still in the previous financial year
            startYear = currentYear - 1;
            endYear = currentYear;
        }

        const startDateStr = `${startYear}-${String(fyStartMonth).padStart(2, '0')}-01`;
        // End date is the day before the next start date
        const nextStartDate = new Date(`${endYear}-${String(fyStartMonth).padStart(2, '0')}-01`);
        const endDate = new Date(nextStartDate.getTime() - 86400000); // minus 1 day
        const endDateStr = endDate.toISOString().split('T')[0];

        const periodStr = `${startDateStr} to ${endDateStr}`;
        const generatedOn = new Date().toISOString().split('T')[0];

        // Create report records
        const newReports = [
            { id: Date.now().toString(), type: 'IncomeStatement', startDate: startDateStr, endDate: endDateStr, period: periodStr, generatedOn },
            { id: (Date.now() + 1).toString(), type: 'BalanceSheet', asOfDate: endDateStr, period: `As of ${endDateStr}`, generatedOn }
        ];

        let savedReports = this.settings.savedReports || [];
        savedReports = [...newReports, ...savedReports];
        this.settings.savedReports = savedReports;
        await this.syncFinancialSettings();

        this.renderReportsTab();
        Swal.fire('Success', 'Annual reports have been generated and saved.', 'success');
    },

    downloadSavedReport(id) {
        const savedReports = this.settings.savedReports || [];
        const report = savedReports.find(r => r.id === id);
        if (!report) return Swal.fire('Error', 'Report not found.', 'error');

        if (report.type === 'IncomeStatement') {
            const filtered = this.transactions.filter(t => {
                const d = new Date(t.date);
                return d >= new Date(report.startDate) && d <= new Date(report.endDate);
            });
            if (typeof pdfEngine !== 'undefined' && pdfEngine.generateIncomeStatementPDF) {
                pdfEngine.generateIncomeStatementPDF(filtered, report.startDate, report.endDate);
            }
        } else if (report.type === 'BalanceSheet') {
            const filtered = this.transactions.filter(t => {
                const d = new Date(t.date);
                return d <= new Date(report.asOfDate);
            });
            if (typeof pdfEngine !== 'undefined' && pdfEngine.generateBalanceSheetPDF) {
                pdfEngine.generateBalanceSheetPDF(filtered, report.asOfDate);
            }
        }
    },

    async deleteSavedReport(id) {
        let savedReports = this.settings.savedReports || [];
        savedReports = savedReports.filter(r => r.id !== id);
        this.settings.savedReports = savedReports;
        await this.syncFinancialSettings();
        this.renderReportsTab();
    },

    renderReportsTab() {
        const tbody = document.getElementById('saved-reports-tbody');
        if (!tbody) return;

        const savedReports = this.settings.savedReports || [];
        if (savedReports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No saved reports found.</td></tr>';
            return;
        }

        tbody.innerHTML = savedReports.map(r => `
            <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Type:</div>
                    <div class="text-right md:text-left">
                        <i class="fas ${r.type === 'IncomeStatement' ? 'fa-file-invoice-dollar text-blue-500' : 'fa-balance-scale text-green-500'} mr-2"></i>
                        ${r.type === 'IncomeStatement' ? 'Income Statement' : 'Balance Sheet'}
                    </div>
                </td>
                <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap text-sm text-gray-500">
                    <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Period:</div>
                    <div class="text-right md:text-left">${r.period}</div>
                </td>
                <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap text-sm text-gray-500">
                    <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Generated On:</div>
                    <div class="text-right md:text-left">${r.generatedOn}</div>
                </td>
                <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap text-right text-sm font-medium">
                    <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                    <div>
                        <button onclick="financialsManager.downloadSavedReport('${r.id}')" class="text-dtech-600 hover:text-dtech-900 mr-3" title="Download"><i class="fas fa-download"></i></button>
                        <button onclick="financialsManager.deleteSavedReport('${r.id}')" class="text-red-600 hover:text-red-900" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    closeReconcileModal() {
        const modal = document.getElementById('reconcileModal');
        if (modal) modal.classList.add('hidden');
    },

    renderConfigTab() {
        const fySelect = document.getElementById('config-fy-month');
        if (fySelect) {
            fySelect.value = this.settings.fyStartMonth || '3';
        }

        const select = document.getElementById('config-cat-select');
        if (select) {
            select.innerHTML = '<option value="">Select Category</option>' +
                this.chartOfAccounts.map(acc => `<option value="${acc.name}">${acc.name} (${acc.type})</option>`).join('');
        }

        const tbody = document.getElementById('config-mappings-tbody') || document.getElementById('config-rules-tbody');
        if (!tbody) return;

        const mappings = this.settings.mappings || {};
        const keys = Object.keys(mappings);

        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-6 text-gray-500">No mapping rules configured yet.</td></tr>';
            return;
        }

        tbody.innerHTML = keys.map(k => `
            <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Match:</div>
                    <div class="text-right md:text-left"><code class="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">${k}</code></div>
                </td>
                <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Category:</div>
                    <div class="text-right md:text-left"><span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">${mappings[k]}</span></div>
                </td>
                <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap text-right text-sm font-medium">
                    <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                    <button onclick="financialsManager.deleteMappingRule('${k.replace(/'/g, "\\'")}')" class="text-red-600 hover:text-red-900 dark:hover:text-red-400 p-1" title="Delete Rule"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    async addMappingRule() {
        const descInput = document.getElementById('config-desc-input');
        const catSelect = document.getElementById('config-cat-select');

        if (!descInput || !catSelect) return;

        const desc = descInput.value.trim();
        const cat = catSelect.value;

        if (!desc || !cat) {
            Swal.fire('Error', 'Please enter a description match and select a category.', 'error');
            return;
        }

        const mappings = this.settings.mappings || {};
        mappings[desc.toLowerCase()] = cat;
        this.settings.mappings = mappings;
        await this.syncFinancialSettings();

        descInput.value = '';
        catSelect.value = '';
        this.renderConfigTab();
        if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Added mapping rule: "${desc}" -> ${cat}`);
        Swal.fire({ icon: 'success', title: 'Rule Added', timer: 1500, showConfirmButton: false });
    },

    async deleteMappingRule(key) {
        const mappings = this.settings.mappings || {};
        delete mappings[key];
        this.settings.mappings = mappings;
        await this.syncFinancialSettings();
        this.renderConfigTab();
    },

    switchTab(tabName) {
        const tabLedger = document.getElementById('financials-ledger-tab');
        const tabReports = document.getElementById('financials-reports-tab');
        const tabConfig = document.getElementById('financials-config-tab');

        const btnLedger = document.getElementById('btn-tab-ledger');
        const btnReports = document.getElementById('btn-tab-reports');
        const btnConfig = document.getElementById('btn-tab-config');

        if (tabLedger) tabLedger.classList.add('hidden');
        if (tabReports) tabReports.classList.add('hidden');
        if (tabConfig) tabConfig.classList.add('hidden');

        [btnLedger, btnReports, btnConfig].forEach(btn => {
            if (btn) {
                btn.classList.remove('border-dtech-500', 'text-dtech-600', 'dark:text-dtech-400');
                btn.classList.add('border-transparent', 'text-gray-500');
            }
        });

        if (tabName === 'ledger' && tabLedger && btnLedger) {
            tabLedger.classList.remove('hidden');
            btnLedger.classList.add('border-dtech-500', 'text-dtech-600', 'dark:text-dtech-400');
            btnLedger.classList.remove('border-transparent', 'text-gray-500');
            this.renderLedgerTable();
        } else if (tabName === 'reports' && tabReports && btnReports) {
            tabReports.classList.remove('hidden');
            btnReports.classList.add('border-dtech-500', 'text-dtech-600', 'dark:text-dtech-400');
            btnReports.classList.remove('border-transparent', 'text-gray-500');
            if (this.renderReportsTab) this.renderReportsTab();
        } else if (tabName === 'config' && tabConfig && btnConfig) {
            tabConfig.classList.remove('hidden');
            btnConfig.classList.add('border-dtech-500', 'text-dtech-600', 'dark:text-dtech-400');
            btnConfig.classList.remove('border-transparent', 'text-gray-500');
            if (this.renderConfigTab) this.renderConfigTab();
        }
    },

    switchCsvTab(tabName) {
        const tabCsv = document.getElementById('csv-importer-tab');
        const tabConfig = document.getElementById('financials-config-tab');

        const btnCsv = document.getElementById('btn-tab-csv');
        const btnConfig = document.getElementById('btn-tab-csv-config');

        if (tabCsv) tabCsv.classList.add('hidden');
        if (tabConfig) tabConfig.classList.add('hidden');

        if (btnCsv) {
            btnCsv.classList.remove('border-dtech-500', 'text-dtech-600', 'dark:text-dtech-400');
            btnCsv.classList.add('border-transparent', 'text-gray-500');
        }
        if (btnConfig) {
            btnConfig.classList.remove('border-dtech-500', 'text-dtech-600', 'dark:text-dtech-400');
            btnConfig.classList.add('border-transparent', 'text-gray-500');
        }

        if (tabName === 'csv' && tabCsv && btnCsv) {
            tabCsv.classList.remove('hidden');
            btnCsv.classList.add('border-dtech-500', 'text-dtech-600', 'dark:text-dtech-400');
            btnCsv.classList.remove('border-transparent', 'text-gray-500');
        } else if (tabName === 'config' && tabConfig && btnConfig) {
            tabConfig.classList.remove('hidden');
            btnConfig.classList.add('border-dtech-500', 'text-dtech-600', 'dark:text-dtech-400');
            btnConfig.classList.remove('border-transparent', 'text-gray-500');
            if (this.renderConfigTab) this.renderConfigTab();
        }
    }
};
