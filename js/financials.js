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

        // Populate month filter dropdown
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

            // If it's the first time rendering and 'all' is selected, default to the most recent month
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

        if (filteredTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No transactions found for this period.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        filteredTransactions.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = 'border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';

            const isExpense = t.type === 'Expense' || t.amount < 0;
            const amountColor = isExpense ? 'text-red-600' : 'text-green-600';
            const displayAmount = `R ${Math.abs(parseFloat(t.amount || 0)).toFixed(2)}`;

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${t.date}</td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">${t.description}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${t.category || 'Uncategorized'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${amountColor}">${isExpense ? '-' : '+'}${displayAmount}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="financialsManager.deleteTransaction('${t.id}')" class="text-red-600 hover:text-red-900 ml-3" title="Delete"><i class="fas fa-trash"></i></button>
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

        Swal.fire({
            title: 'Add Manual Transaction',
            html: `
                <div class="space-y-4 text-left">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                        <input type="date" id="t-date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-dtech-500 focus:ring-dtech-500 dark:bg-dark-card dark:border-dark-border dark:text-white" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <input type="text" id="t-desc" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-dtech-500 focus:ring-dtech-500 dark:bg-dark-card dark:border-dark-border dark:text-white" placeholder="e.g. Office supplies">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (ZAR)</label>
                        <input type="number" id="t-amount" step="0.01" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-dtech-500 focus:ring-dtech-500 dark:bg-dark-card dark:border-dark-border dark:text-white" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                        <select id="t-type" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-dtech-500 focus:ring-dtech-500 dark:bg-dark-card dark:border-dark-border dark:text-white">
                            <option value="Income">Income (Money In)</option>
                            <option value="Expense">Expense (Money Out)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                        <select id="t-category" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-dtech-500 focus:ring-dtech-500 dark:bg-dark-card dark:border-dark-border dark:text-white">
                            ${categoryOptions}
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save Transaction',
            customClass: {
                popup: 'dark:bg-dark-bg dark:text-white'
            },
            preConfirm: () => {
                const date = document.getElementById('t-date').value;
                const desc = document.getElementById('t-desc').value;
                const amount = document.getElementById('t-amount').value;
                const type = document.getElementById('t-type').value;
                const category = document.getElementById('t-category').value;

                if (!date || !desc || !amount || !category) {
                    Swal.showValidationMessage('Please fill all fields');
                    return false;
                }
                return { date, description: desc, amount: parseFloat(amount), type, category };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await API.request('/api/transactions', { method: 'POST', body: JSON.stringify(result.value) });
                    if (response.success) {
                        app.logActivity(`Added manual transaction: ${result.value.description}`);
                        Swal.fire('Saved!', '', 'success');
                        this.loadTransactions();
                    } else {
                        Swal.fire('Error', response.message || 'Failed to save', 'error');
                    }
                } catch (e) {
                    Swal.fire('Error', e.message, 'error');
                }
            }
        });
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

            let autoCategory = '';
            const lowerDesc = desc.toLowerCase();
            if (lowerDesc.includes('fee')) {
                autoCategory = 'Bank Fees';
            }
            // Get saved mappings
            const savedMappings = JSON.parse(localStorage.getItem('dtech_financials_mappings') || '{}');
            for (const [key, cat] of Object.entries(savedMappings)) {
                if (lowerDesc.includes(key.toLowerCase())) {
                    autoCategory = cat;
                    break;
                }
            }
            if (!isNaN(amount) && amount !== 0) {
                parsedData.push({
                    date: dateStr,
                    description: desc,
                    amount: amount,
                    type: type,
                    category: autoCategory
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
        this._pendingReconcileData = parsedData;
        let html = '';
        parsedData.forEach((row, index) => {
            const isExpense = row.type === 'Expense';
            const amountColor = isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
            const amountSign = isExpense ? '-' : '+';

            html += `
                <div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-4 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div class="flex-1 min-w-0 w-full">
                        <div class="flex justify-between md:justify-start items-center gap-2 mb-1">
                            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">${row.date}</span>
                            <span class="text-base font-bold ${amountColor} md:ml-4">${amountSign}R${row.amount.toFixed(2)}</span>
                        </div>
                        <p class="text-gray-900 dark:text-gray-100 font-medium truncate" title="${row.description}">${row.description}</p>
                    </div>
                    <div class="w-full md:w-64 flex-shrink-0">
                        <select id="recon-cat-${index}" class="w-full rounded-md border-gray-300 shadow-sm focus:border-dtech-500 focus:ring-dtech-500 sm:text-sm dark:bg-dark-bg dark:border-dark-border dark:text-white">
                            <option value="">Select Category...</option>
                            ${this.chartOfAccounts.map(acc => `<option value="${acc.name}" ${row.category === acc.name ? 'selected' : ''}>${acc.name} (${acc.type})</option>`).join('')}
                        </select>
                    </div>
                </div>
            `;
        });

        document.getElementById('reconcileContainer').innerHTML = html;
        document.getElementById('reconcileModal').classList.remove('hidden');
        document.getElementById('reconcileModal').classList.add('flex');
    },

    closeReconcileModal() {
        document.getElementById('reconcileModal').classList.add('hidden');
        document.getElementById('reconcileModal').classList.remove('flex');
        this._pendingReconcileData = null;
    },

    async saveReconciled() {
        if (!this._pendingReconcileData) return;

        const finalData = [];
        const newMappings = JSON.parse(localStorage.getItem('dtech_financials_mappings') || '{}');

        this._pendingReconcileData.forEach((row, index) => {
            const catSelect = document.getElementById(`recon-cat-${index}`);
            if (catSelect && catSelect.value) {
                finalData.push({
                    ...row,
                    category: catSelect.value
                });
                const words = row.description.split(' ').slice(0, 3).join(' '); // Use first 3 words as key
                if (words && !newMappings[words.toLowerCase()]) {
                    newMappings[words.toLowerCase()] = catSelect.value;
                }
            }
        });

        if (finalData.length === 0) {
            Swal.fire('Info', 'No transactions were categorized to save.', 'info');
            return;
        }

        localStorage.setItem('dtech_financials_mappings', JSON.stringify(newMappings));

        this.closeReconcileModal();

        Swal.fire({
            title: 'Saving...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

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
        this.loadTransactions();
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

    saveFinancialSettings() {
        const fyMonth = document.getElementById('config-fy-month').value;
        localStorage.setItem('dtech_fy_start_month', fyMonth);
        Swal.fire('Saved', 'Financial settings have been saved successfully.', 'success');
    },

    async generateAnnualReports() {
        const fyStartMonth = parseInt(localStorage.getItem('dtech_fy_start_month') || '3', 10);

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

        let savedReports = JSON.parse(localStorage.getItem('dtech_saved_reports') || '[]');
        savedReports = [...newReports, ...savedReports];
        localStorage.setItem('dtech_saved_reports', JSON.stringify(savedReports));

        this.renderReportsTab();
        Swal.fire('Success', 'Annual reports have been generated and saved.', 'success');
    },

    downloadSavedReport(id) {
        const savedReports = JSON.parse(localStorage.getItem('dtech_saved_reports') || '[]');
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

    deleteSavedReport(id) {
        let savedReports = JSON.parse(localStorage.getItem('dtech_saved_reports') || '[]');
        savedReports = savedReports.filter(r => r.id !== id);
        localStorage.setItem('dtech_saved_reports', JSON.stringify(savedReports));
        this.renderReportsTab();
    },

    renderReportsTab() {
        const tbody = document.getElementById('saved-reports-tbody');
        if (!tbody) return;

        const savedReports = JSON.parse(localStorage.getItem('dtech_saved_reports') || '[]');
        if (savedReports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No saved reports found.</td></tr>';
            return;
        }

        tbody.innerHTML = savedReports.map(r => `
            <tr class="border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    <i class="fas ${r.type === 'IncomeStatement' ? 'fa-file-invoice-dollar text-blue-500' : 'fa-balance-scale text-green-500'} mr-2"></i>
                    ${r.type === 'IncomeStatement' ? 'Income Statement' : 'Balance Sheet'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${r.period}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${r.generatedOn}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="financialsManager.downloadSavedReport('${r.id}')" class="text-dtech-600 hover:text-dtech-900 mr-3" title="Download"><i class="fas fa-download"></i></button>
                    <button onclick="financialsManager.deleteSavedReport('${r.id}')" class="text-red-600 hover:text-red-900" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    renderConfigTab() {
        const fySelect = document.getElementById('config-fy-month');
        if (fySelect) {
            fySelect.value = localStorage.getItem('dtech_fy_start_month') || '3';
        }

        const select = document.getElementById('config-cat-select');
        if (select) {
            select.innerHTML = '<option value="">Select Category</option>' +
                this.chartOfAccounts.map(acc => `<option value="${acc.name}">${acc.name} (${acc.type})</option>`).join('');
        }

        const tbody = document.getElementById('config-mappings-tbody');
        if (!tbody) return;

        const mappings = JSON.parse(localStorage.getItem('dtech_financials_mappings') || '{}');
        const keys = Object.keys(mappings);

        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">No mapping rules configured yet.</td></tr>';
            return;
        }

        tbody.innerHTML = keys.map(k => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${k}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${mappings[k]}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="financialsManager.deleteMappingRule('${k.replace(/'/g, "\'")}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    addMappingRule() {
        const descInput = document.getElementById('config-desc-input');
        const catSelect = document.getElementById('config-cat-select');

        const desc = descInput.value.trim();
        const cat = catSelect.value;

        if (!desc || !cat) {
            Swal.fire('Error', 'Please enter a description match and select a category.', 'error');
            return;
        }

        const mappings = JSON.parse(localStorage.getItem('dtech_financials_mappings') || '{}');
        mappings[desc.toLowerCase()] = cat;
        localStorage.setItem('dtech_financials_mappings', JSON.stringify(mappings));

        descInput.value = '';
        catSelect.value = '';
        this.renderConfigTab();
        app.logActivity('Added a new financial mapping rule');
    },

    deleteMappingRule(key) {
        const mappings = JSON.parse(localStorage.getItem('dtech_financials_mappings') || '{}');
        delete mappings[key];
        localStorage.setItem('dtech_financials_mappings', JSON.stringify(mappings));
        this.renderConfigTab();
    },

    switchTab(tabName) {
        const tabLedger = document.getElementById('financials-ledger-tab');
        const tabConfig = document.getElementById('financials-config-tab');
        const tabReports = document.getElementById('financials-reports-tab');

        const btnLedger = document.getElementById('btn-tab-ledger');
        const btnConfig = document.getElementById('btn-tab-config');
        const btnReports = document.getElementById('btn-tab-reports');

        if(tabLedger) tabLedger.classList.add('hidden');
        if(tabConfig) tabConfig.classList.add('hidden');
        if(tabReports) tabReports.classList.add('hidden');

        if(btnLedger) {
            btnLedger.classList.remove('border-dtech-500', 'text-dtech-600');
            btnLedger.classList.add('border-transparent', 'text-gray-500');
        }
        if(btnReports) {
            btnReports.classList.remove('border-dtech-500', 'text-dtech-600');
            btnReports.classList.add('border-transparent', 'text-gray-500');
        }
        if(btnConfig) {
            btnConfig.classList.remove('border-dtech-500', 'text-dtech-600');
            btnConfig.classList.add('border-transparent', 'text-gray-500');
        }

        if (tabName === 'ledger' && tabLedger && btnLedger) {
            tabLedger.classList.remove('hidden');
            btnLedger.classList.add('border-dtech-500', 'text-dtech-600');
            btnLedger.classList.remove('border-transparent', 'text-gray-500');
        } else if (tabName === 'reports' && tabReports && btnReports) {
            tabReports.classList.remove('hidden');
            btnReports.classList.add('border-dtech-500', 'text-dtech-600');
            btnReports.classList.remove('border-transparent', 'text-gray-500');
            this.renderReportsTab();
        } else if (tabName === 'config' && tabConfig && btnConfig) {
            tabConfig.classList.remove('hidden');
            btnConfig.classList.add('border-dtech-500', 'text-dtech-600');
            btnConfig.classList.remove('border-transparent', 'text-gray-500');
            this.renderConfigTab();
        }
    }
};
