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

        if (this.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No transactions found. Upload CSV or Add Manually.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        this.transactions.forEach(t => {
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
        const lines = csvText.split('\n');
        const parsedData = [];

        // Very basic CSV parser. Assuming: Date, Description, Amount (positive or negative)
        // Adjust indices if your bank uses a different format, or prompt user to map columns
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle quotes in CSV if needed, but simple split for now
            const columns = line.split(',');
            if (columns.length >= 3) {
                let dateStr = columns[0].replace(/"/g, '').trim();
                let desc = columns[1].replace(/"/g, '').trim();
                let amtStr = columns[2].replace(/"/g, '').trim();
                let amount = parseFloat(amtStr);

                if (!isNaN(amount)) {
                    // Try to guess type based on amount sign
                    let type = amount < 0 ? 'Expense' : 'Income';

                    parsedData.push({
                        date: dateStr,
                        description: desc,
                        amount: Math.abs(amount),
                        type: type,
                        category: '' // Needs to be categorized
                    });
                }
            }
        }

        if (parsedData.length > 0) {
            this.showReconciliationModal(parsedData);
        } else {
            Swal.fire('Error', 'Could not parse any valid transactions from the CSV.', 'error');
        }
    },

    showReconciliationModal(parsedData) {
        let categoryOptions = '<option value="">Select Category</option>';
        this.chartOfAccounts.forEach(acc => {
            categoryOptions += `<option value="${acc.name}">${acc.name} (${acc.type})</option>`;
        });

        let rowsHTML = '';
        parsedData.forEach((row, index) => {
            const amountColor = row.type === 'Expense' ? 'text-red-500' : 'text-green-500';
            const amountSign = row.type === 'Expense' ? '-' : '+';
            rowsHTML += `
                <tr class="border-b">
                    <td class="p-2 text-sm">${row.date}</td>
                    <td class="p-2 text-sm">${row.description}</td>
                    <td class="p-2 text-sm font-medium ${amountColor}">${amountSign}R${row.amount.toFixed(2)}</td>
                    <td class="p-2">
                        <select id="recon-cat-${index}" class="w-full text-sm rounded border-gray-300">
                            ${categoryOptions}
                        </select>
                    </td>
                </tr>
            `;
        });

        Swal.fire({
            title: 'Reconcile Transactions',
            width: '800px',
            html: `
                <div class="max-h-[60vh] overflow-y-auto">
                    <p class="text-sm text-gray-500 mb-4 text-left">Assign a category to each imported transaction. Uncategorized transactions will not be saved.</p>
                    <table class="min-w-full text-left">
                        <thead>
                            <tr class="bg-gray-100">
                                <th class="p-2 text-sm">Date</th>
                                <th class="p-2 text-sm">Description</th>
                                <th class="p-2 text-sm">Amount</th>
                                <th class="p-2 text-sm">Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHTML}
                        </tbody>
                    </table>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save Reconciled',
            preConfirm: () => {
                const finalData = [];
                parsedData.forEach((row, index) => {
                    const catSelect = document.getElementById(`recon-cat-${index}`);
                    if (catSelect && catSelect.value) {
                        finalData.push({
                            ...row,
                            category: catSelect.value
                        });
                    }
                });
                return finalData;
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value.length > 0) {
                Swal.fire({
                    title: 'Saving...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                let successCount = 0;
                for (const t of result.value) {
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
            }
        });
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
