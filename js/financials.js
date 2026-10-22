const financialsManager = {
    transactions: [],
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
        // Set default report dates to current month if they are empty
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Format to YYYY-MM-DD
        const formatDate = (date) => {
            const d = new Date(date);
            let month = '' + (d.getMonth() + 1);
            let day = '' + d.getDate();
            const year = d.getFullYear();

            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;

            return [year, month, day].join('-');
        };

        const startDateInput = document.getElementById('report-start-date');
        const endDateInput = document.getElementById('report-end-date');
        const asOfDateInput = document.getElementById('report-as-of-date');

        if (startDateInput && !startDateInput.value) startDateInput.value = formatDate(firstDay);
        if (endDateInput && !endDateInput.value) endDateInput.value = formatDate(lastDay);
        if (asOfDateInput && !asOfDateInput.value) asOfDateInput.value = formatDate(lastDay);

        const container = document.getElementById('financials-ledger-tbody');
        if (container) {
            container.innerHTML = '<tr><td colspan="5" class="text-center py-4"><i class="fas fa-spinner fa-spin text-2xl text-dtech-500"></i></td></tr>';
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
                container.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Failed to load transactions: ${error.message}</td></tr>`;
            }
        }
    },

    renderLedgerTable() {
        const tbody = document.getElementById('financials-ledger-tbody');
        if (!tbody) return;

        if (this.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No transactions found. Upload CSV or Add Manually.</td></tr>';
            const filterDropdown = document.getElementById('ledger-month-filter');
            if (filterDropdown) filterDropdown.innerHTML = '<option value="all">All Months</option>';
            document.getElementById('ledger-current-month-display').innerText = 'All Months';
            return;
        }

        // Get unique months from transactions
        const months = new Set();
        this.transactions.forEach(t => {
            if (t.date) {
                // assume date is YYYY-MM-DD
                const monthStr = t.date.substring(0, 7); // YYYY-MM
                months.add(monthStr);
            }
        });

        // Sort months descending
        const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));

        const filterDropdown = document.getElementById('ledger-month-filter');
        let selectedMonth = filterDropdown ? filterDropdown.value : null;

        // Setup dropdown if it's not populated or has wrong values
        if (filterDropdown) {
            if (filterDropdown.children.length <= 1) { // Maybe just empty or "all"
                let optionsHtml = '<option value="all">All Months</option>';
                sortedMonths.forEach(m => {
                    // Format YYYY-MM to Month YYYY
                    const dateObj = new Date(m + '-01T00:00:00Z');
                    const label = dateObj.toLocaleDateString('default', { month: 'long', year: 'numeric' });
                    optionsHtml += `<option value="${m}">${label}</option>`;
                });
                filterDropdown.innerHTML = optionsHtml;

                // Default to most recent month if not selected
                if (!selectedMonth || selectedMonth === '') {
                    selectedMonth = sortedMonths[0];
                    filterDropdown.value = selectedMonth;
                }
            } else {
                selectedMonth = filterDropdown.value;
            }
        }

        // Update display text
        const displaySpan = document.getElementById('ledger-current-month-display');
        if (displaySpan) {
            if (selectedMonth === 'all') {
                displaySpan.innerText = 'All Time';
            } else {
                const dateObj = new Date(selectedMonth + '-01T00:00:00Z');
                displaySpan.innerText = dateObj.toLocaleDateString('default', { month: 'long', year: 'numeric' });
            }
        }

        // Filter transactions
        let filteredTransactions = this.transactions;
        if (selectedMonth && selectedMonth !== 'all') {
            filteredTransactions = this.transactions.filter(t => t.date && t.date.startsWith(selectedMonth));
        }

        tbody.innerHTML = '';
        if (filteredTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No transactions found for this month.</td></tr>';
            return;
        }

        filteredTransactions.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = 'border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';

            const isExpense = t.type === 'Expense' || t.amount < 0;
            const amountColor = isExpense ? 'text-red-600' : 'text-green-600';
            const displayAmount = `R ${Math.abs(parseFloat(t.amount || 0)).toFixed(2)}`;

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${t.date}</td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">${t.description}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        ${t.category || 'Uncategorized'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${amountColor}">${isExpense ? '-' : '+'}${displayAmount}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="financialsManager.deleteTransaction('${t.id}')" class="text-red-600 hover:text-red-900 dark:hover:text-red-400 p-1"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    openTransactionModal() {
        let categoryOptions = '<option value="">Select Category</option>';
        this.chartOfAccounts.forEach(acc => {
            categoryOptions += `<option value="${acc.name}">${acc.name} (${acc.type})</option>`;
        });

        const catSelect = document.getElementById('t-category');
        if (catSelect) catSelect.innerHTML = categoryOptions;

        document.getElementById('t-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('t-desc').value = '';
        document.getElementById('t-amount').value = '';
        document.getElementById('t-type').value = 'Expense';

        const modal = document.getElementById('transactionModal');
        if (modal) modal.classList.remove('hidden');
    },

    closeTransactionModal() {
        const modal = document.getElementById('transactionModal');
        if (modal) modal.classList.add('hidden');
    },

    async saveTransaction(e) {
        e.preventDefault();

        const btn = document.getElementById('saveTransactionBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const date = document.getElementById('t-date').value;
        const desc = document.getElementById('t-desc').value;
        const amount = document.getElementById('t-amount').value;
        const type = document.getElementById('t-type').value;
        const category = document.getElementById('t-category').value;

        const payload = {
            date,
            description: desc,
            amount: parseFloat(amount),
            type,
            category
        };

        try {
            const response = await API.request('/api/transactions', { method: 'POST', body: JSON.stringify(payload) });
            if (response.success) {
                app.logActivity(`Added manual transaction: ${payload.description}`);
                Swal.fire({ icon: 'success', title: 'Saved!', showConfirmButton: false, timer: 1500 });
                this.closeTransactionModal();
                this.loadTransactions();
            } else {
                Swal.fire('Error', response.message || 'Failed to save', 'error');
            }
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Save Transaction';
        }
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

    handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            this.parseCSV(text);
        };
        reader.readAsText(file);
        // Reset input so the same file can be uploaded again if needed
        event.target.value = '';
    },

    parseCSV(csvText) {
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

            if (!isNaN(amount) && amount !== 0) {
                parsedData.push({
                    date: dateStr,
                    description: desc,
                    amount: amount,
                    type: type,
                    category: '' // Needs to be categorized
                });
            }
        }

        if (parsedData.length > 0) {
            this.showReconciliationModal(parsedData);
        } else {
            Swal.fire('Error', 'Could not parse any valid transactions from the CSV.', 'error');
        }
    },

    showReconciliationModal(parsedData) {
        this.pendingReconciliationData = parsedData; // Store temporarily

        let categoryOptions = '<option value="">Select Category</option>';
        this.chartOfAccounts.forEach(acc => {
            categoryOptions += `<option value="${acc.name}">${acc.name} (${acc.type})</option>`;
        });

        const tbody = document.getElementById('reconcile-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        parsedData.forEach((row, index) => {
            const amountColor = row.type === 'Expense' ? 'text-red-500' : 'text-green-500';
            const amountSign = row.type === 'Expense' ? '-' : '+';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3 text-sm dark:text-gray-200">${row.date}</td>
                <td class="p-3 text-sm dark:text-gray-200">${row.description}</td>
                <td class="p-3 text-sm font-medium ${amountColor}">${amountSign}R${row.amount.toFixed(2)}</td>
                <td class="p-3">
                    <select id="recon-cat-${index}" class="w-full text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                        ${categoryOptions}
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });

        const modal = document.getElementById('reconcileModal');
        if (modal) modal.classList.remove('hidden');
    },

    closeReconcileModal() {
        const modal = document.getElementById('reconcileModal');
        if (modal) modal.classList.add('hidden');
        this.pendingReconciliationData = null;
    },

    async saveReconciledTransactions() {
        if (!this.pendingReconciliationData) return;

        const finalData = [];
        this.pendingReconciliationData.forEach((row, index) => {
            const catSelect = document.getElementById(`recon-cat-${index}`);
            if (catSelect && catSelect.value) {
                finalData.push({
                    ...row,
                    category: catSelect.value
                });
            }
        });

        if (finalData.length === 0) {
            Swal.fire('Info', 'No transactions were categorized.', 'info');
            this.closeReconcileModal();
            return;
        }

        const btn = document.getElementById('saveReconciledBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        let successCount = 0;
        for (const t of finalData) {
            try {
                const response = await API.request('/api/transactions', { method: 'POST', body: JSON.stringify(t) });
                if (response.success) successCount++;
            } catch (e) {
                console.error('Failed to save transaction', t, e);
            }
        }

        app.logActivity(`Imported and reconciled ${successCount} transactions`);
        Swal.fire('Complete', `Successfully saved ${successCount} transactions.`, 'success');

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Save Reconciled';
        }

        this.closeReconcileModal();
        this.loadTransactions();
    },

    applyFinancialYearDates() {
        const fyStart = document.getElementById('fy-start-date');
        const fyEnd = document.getElementById('fy-end-date');

        if (fyStart && fyEnd && fyStart.value && fyEnd.value) {
            const reportStart = document.getElementById('report-start-date');
            const reportEnd = document.getElementById('report-end-date');
            const reportAsOf = document.getElementById('report-as-of-date');

            if (reportStart) reportStart.value = fyStart.value;
            if (reportEnd) reportEnd.value = fyEnd.value;
            if (reportAsOf) reportAsOf.value = fyEnd.value;

            Swal.fire({
                icon: 'success',
                title: 'Dates Applied',
                text: 'Report dates have been updated to match your financial year.',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            Swal.fire('Warning', 'Please select both start and end dates for the financial year.', 'warning');
        }
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

    switchTab(tabName) {
        document.getElementById('financials-ledger-tab').classList.add('hidden');
        document.getElementById('financials-reports-tab').classList.add('hidden');

        document.getElementById('btn-tab-ledger').classList.remove('border-dtech-500', 'text-dtech-600');
        document.getElementById('btn-tab-reports').classList.remove('border-dtech-500', 'text-dtech-600');
        document.getElementById('btn-tab-ledger').classList.add('border-transparent', 'text-gray-500');
        document.getElementById('btn-tab-reports').classList.add('border-transparent', 'text-gray-500');

        if (tabName === 'ledger') {
            document.getElementById('financials-ledger-tab').classList.remove('hidden');
            document.getElementById('btn-tab-ledger').classList.add('border-dtech-500', 'text-dtech-600');
            document.getElementById('btn-tab-ledger').classList.remove('border-transparent', 'text-gray-500');
        } else {
            document.getElementById('financials-reports-tab').classList.remove('hidden');
            document.getElementById('btn-tab-reports').classList.add('border-dtech-500', 'text-dtech-600');
            document.getElementById('btn-tab-reports').classList.remove('border-transparent', 'text-gray-500');
        }
    }
};
