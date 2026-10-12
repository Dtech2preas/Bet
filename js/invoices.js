// js/invoices.js

const invoicesManager = {
    invoices: [],

    async loadInvoices() {
        const container = document.getElementById('invoices-container');
        container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i></div>';
        try {
            const [iRes, cRes] = await Promise.all([
                API.request('/api/invoices'),
                API.request('/api/clients')
            ]);
            if (iRes.success) {
                this.invoices = iRes.invoices;
                this.clients = cRes.clients;
                this.renderTable();
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load: ${error.message}</div>`;
        }
    },

    renderTable() {
        const container = document.getElementById('invoices-container');
        if (this.invoices.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No invoices found.</div>`;
            return;
        }

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inv #</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700 block md:table-row-group">
        `;
        this.invoices.forEach(inv => {
            const client = this.clients.find(c => c.id === inv.clientId);
            const statusColor = inv.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-medium text-gray-900 dark:text-white">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Inv #:</div>
                        <div class="text-right md:text-left">${inv.reference}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm text-gray-500">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Client:</div>
                        <div class="text-right md:text-left">${client ? client.companyName : 'Unknown'}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-semibold">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Total:</div>
                        <div class="text-right md:text-left">R ${inv.total}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Status:</div>
                        <div class="text-right md:text-left"><span class="px-2 py-1 text-xs rounded-full ${statusColor}">${inv.status}</span></div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="invoicesManager.editInvoice('${inv.id}')" class="text-blue-600 hover:text-blue-900 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                            <button onclick="invoicesManager.download('${inv.id}')" class="text-gray-600 hover:text-gray-900 mr-2" title="Download PDF"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="invoicesManager.deleteInvoice('${inv.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async openModal(invoice = null) {
        if (!this.clients || this.clients.length === 0) return Swal.fire('Error', 'Add a client first', 'error');

        const i = invoice || {};
        const isEdit = !!invoice;
        const title = isEdit ? 'Edit Invoice' : 'Create Invoice';

        const clientOptions = this.clients.map(c => `<option value="${c.id}" ${i.clientId === c.id ? 'selected' : ''}>${c.companyName}</option>`).join('');

        let quotesOptions = '<option value="">No Quotation Linked</option>';
        try {
            const qRes = await API.request('/api/quotations');
            if (qRes.success && qRes.quotations) {
                quotesOptions += qRes.quotations.map(q => `<option value="${q.id}" ${i.quotationId === q.id ? 'selected' : ''}>${q.reference} - ${q.title || 'Untitled'}</option>`).join('');
            }
        } catch (e) { console.warn("Could not load quotes for dropdown", e); }


        const d = new Date();
        d.setDate(d.getDate() + 14); // Due default 14 days
        const dueStr = isEdit && i.dueDate ? i.dueDate.split('T')[0] : d.toISOString().split('T')[0];

        let validStr = '';
        if (isEdit && i.validUntil) {
            try { validStr = new Date(i.validUntil).toISOString().split('T')[0]; } catch(e){}
        }

        let projStartStr = '';
        if (isEdit && i.expectedStartDate) {
            try { projStartStr = new Date(i.expectedStartDate).toISOString().split('T')[0]; } catch(e){}
        }

        const { value: formValues } = await Swal.fire({
            title: title,
            html: `
                <div class="text-left text-sm space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div><label class="font-medium">Client *</label><select id="swal-i-client" class="swal2-input mt-1 w-full m-0"><option value="" disabled ${!isEdit?'selected':''}>Select Client</option>${clientOptions}</select></div>
                        <div><label class="font-medium">Related Quotation</label><select id="swal-i-quote" class="swal2-input mt-1 w-full m-0">${quotesOptions}</select></div>
                    </div>


                    <div class="flex justify-between items-center border-b pb-1 mt-4">
                        <h4 class="font-semibold">Item Details</h4>
                        <button type="button" id="add-i-item-btn" class="text-xs bg-dtech-100 text-dtech-700 px-2 py-1 rounded hover:bg-dtech-200">+ Add Item</button>
                    </div>
                    <div id="swal-i-items-container" class="space-y-2 mt-2"></div>


                    <h4 class="font-semibold border-b pb-1 mt-4">Financials & Terms</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div><label class="font-medium">Discount (%)</label><input id="swal-i-discount" type="number" class="swal2-input mt-1 w-full m-0" value="${i.discount || 0}" placeholder="0"></div>
                        <div><label class="font-medium">VAT (%)</label><input id="swal-i-vat" type="number" class="swal2-input mt-1 w-full m-0" value="${i.vat || 15}" placeholder="15"></div>
                        <div><label class="font-medium">Status</label><select id="swal-i-status" class="swal2-input mt-1 w-full m-0"><option value="Unpaid" ${i.status==='Unpaid'?'selected':''}>Unpaid</option><option value="Paid" ${i.status==='Paid'?'selected':''}>Paid</option><option value="Overdue" ${i.status==='Overdue'?'selected':''}>Overdue</option><option value="Cancelled" ${i.status==='Cancelled'?'selected':''}>Cancelled</option></select></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div><label class="font-medium">Due Date</label><input type="date" id="swal-i-due" class="swal2-input mt-1 w-full m-0" value="${dueStr}"></div>
                        <div><label class="font-medium">Valid Until</label><input type="date" id="swal-i-valid" class="swal2-input mt-1 w-full m-0" value="${validStr}"></div>
                        <div><label class="font-medium">Payment Terms</label><select id="swal-i-terms" class="swal2-input mt-1 w-full m-0">
                            <option value="Due on Receipt" ${i.paymentTerms==='Due on Receipt'?'selected':''}>Due on Receipt</option>
                            <option value="7 Days" ${i.paymentTerms==='7 Days'?'selected':''}>7 Days</option>
                            <option value="14 Days" ${i.paymentTerms==='14 Days'?'selected':''}>14 Days</option>
                            <option value="30 Days" ${i.paymentTerms==='30 Days'?'selected':''}>30 Days</option>
                            <option value="50% Deposit, 50% on Launch" ${i.paymentTerms==='50% Deposit, 50% on Launch'?'selected':''}>50% Deposit, 50% on Launch</option>
                        </select></div>
                    </div>

                    <div id="second-invoice-date-container" class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 hidden">
                        <div><label class="font-medium text-dtech-600">Balance Invoice Date (30 Days)</label><input type="date" id="swal-i-second-date" class="swal2-input mt-1 w-full m-0"></div>
                        <div class="flex items-end pb-2 text-xs text-gray-500">The 50% balance invoice will be automatically created with this date.</div>
                    </div>

                    <h4 class="font-semibold border-b pb-1 mt-4">Logistics & Notes</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div><label class="font-medium">Expected Project Start</label><input type="date" id="swal-i-start" class="swal2-input mt-1 w-full m-0" value="${projStartStr}"></div>
                        <div><label class="font-medium">Delivery Time</label><input id="swal-i-delivery" class="swal2-input mt-1 w-full m-0" value="${i.deliveryTime || ''}" placeholder="e.g. 2 weeks"></div>
                    </div>
                    <div><label class="font-medium">Customer Notes</label><textarea id="swal-i-cnotes" class="swal2-input mt-1 w-full m-0 p-2 text-sm" rows="2" placeholder="Visible on PDF">${i.customerNotes || ''}</textarea></div>

                    <h4 class="font-semibold border-b pb-1 mt-4">Other Info</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div><label class="font-medium">Purchase Order (PO) #</label><input id="swal-i-po" class="swal2-input mt-1 w-full m-0" value="${i.poNumber || ''}" placeholder="PO-12345"></div>
                        <div><label class="font-medium">Salesperson</label><input id="swal-i-sales" class="swal2-input mt-1 w-full m-0" value="${i.salesperson || ''}" placeholder="Name"></div>
                    </div>
                    <div><label class="font-medium">Internal Notes</label><textarea id="swal-i-notes" class="swal2-input mt-1 w-full m-0 p-2 text-sm" rows="2" placeholder="Internal only">${i.notes || ''}</textarea></div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            width: 'min(95%, 700px)',
            didOpen: () => {
                const container = document.getElementById('swal-i-items-container');
                const addBtn = document.getElementById('add-i-item-btn');

                window.removeIItemRow = function(btn) {
                    btn.closest('.invoice-item-row').remove();
                };

                function createRow(desc, price, qty) {
                    const div = document.createElement('div');
                    div.className = 'invoice-item-row grid grid-cols-1 md:grid-cols-12 gap-2 items-center border-b md:border-0 pb-2 md:pb-0 mb-2 md:mb-0';
                    div.innerHTML = `
                        <div class="md:col-span-6 flex"><input type="text" class="i-item-desc swal2-input m-0 flex-1 w-full" placeholder="Description" value="${desc || ''}"></div>
                        <div class="md:col-span-3 flex"><input type="number" class="i-item-price swal2-input m-0 w-full" placeholder="Price" value="${price || ''}"></div>
                        <div class="md:col-span-2 flex"><input type="number" class="i-item-qty swal2-input m-0 w-full" placeholder="Qty" value="${qty || 1}"></div>
                        <div class="md:col-span-1 flex justify-end md:justify-center"><button type="button" onclick="window.removeIItemRow(this)" class="text-red-500 hover:text-red-700 p-2"><i class="fas fa-times"></i></button></div>
                    `;
                    container.appendChild(div);
                }

                if (isEdit && i.items && i.items.length > 0) {
                    i.items.forEach(item => createRow(item.description, item.price, item.quantity));
                } else {
                    createRow('', '', 1);
                }

                addBtn.addEventListener('click', () => createRow('', '', 1));

                // Auto-populate when quotation is selected
                const quoteSelect = document.getElementById('swal-i-quote');
                if (quoteSelect) {
                    quoteSelect.addEventListener('change', async (e) => {
                        const qId = e.target.value;
                        if (!qId) return;

                        try {
                            const qRes = await API.request('/api/quotations');
                            if (qRes.success && qRes.quotations) {
                                const q = qRes.quotations.find(x => x.id == qId);
                                if (q) {
                                    // Clear existing items
                                    container.innerHTML = '';

                                    // Add items from quotation
                                    if (q.items && q.items.length > 0) {
                                        q.items.forEach(item => createRow(item.description, item.price, item.quantity));
                                    } else {
                                        createRow('', '', 1);
                                    }

                                    // Update financial fields
                                    if (q.discountPct !== undefined) {
                                        const discInput = document.getElementById('swal-i-discount');
                                        if (discInput) discInput.value = q.discountPct;
                                    }
                                    if (q.vatPct !== undefined) {
                                        const vatInput = document.getElementById('swal-i-vat');
                                        if (vatInput) vatInput.value = q.vatPct;
                                    }
                                    if (q.paymentTerms !== undefined) {
                                        const termsInput = document.getElementById('swal-i-terms');
                                        if (termsInput) {
                                            termsInput.value = q.paymentTerms;
                                            termsInput.dispatchEvent(new Event('change'));
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.error("Failed to auto-populate from quotation", err);
                        }
                    });
                }

                // Handle toggling of second invoice date for 50% deposit
                const termsSelect = document.getElementById('swal-i-terms');
                const secondDateContainer = document.getElementById('second-invoice-date-container');
                const secondDateInput = document.getElementById('swal-i-second-date');

                // set default date to 30 days from now
                const thirtyDays = new Date();
                thirtyDays.setDate(thirtyDays.getDate() + 30);
                secondDateInput.value = thirtyDays.toISOString().split('T')[0];

                function toggleSecondDate() {
                    if (termsSelect.value === '50% Deposit, 50% on Launch' && !isEdit) {
                        secondDateContainer.classList.remove('hidden');
                    } else {
                        secondDateContainer.classList.add('hidden');
                    }
                }

                if (termsSelect) {
                    termsSelect.addEventListener('change', toggleSecondDate);
                    toggleSecondDate();
                }
            },
            preConfirm: () => {
                const cid = document.getElementById('swal-i-client').value;
                const rowElements = document.querySelectorAll('.invoice-item-row');
                const items = [];
                let subtotal = 0;

                rowElements.forEach(row => {
                    const desc = row.querySelector('.i-item-desc').value;
                    const price = parseFloat(row.querySelector('.i-item-price').value || 0);
                    const qty = parseFloat(row.querySelector('.i-item-qty').value || 1);
                    if (desc) {
                        items.push({ description: desc, price: price, quantity: qty });
                        subtotal += (price * qty);
                    }
                });

                if (!cid || items.length === 0) {
                    Swal.showValidationMessage('Client and at least one Item Description are required');
                    return false;
                }

                const discountPct = parseFloat(document.getElementById('swal-i-discount').value || 0);
                const vatPct = parseFloat(document.getElementById('swal-i-vat').value || 0);
                const discountAmt = subtotal * (discountPct / 100);
                const total = subtotal - discountAmt;
                const vatAmt = total - (total / (1 + (vatPct / 100)));

                const dueDate = document.getElementById('swal-i-due').value;
                const validDate = document.getElementById('swal-i-valid').value;
                const startDate = document.getElementById('swal-i-start').value;
                const secondDate = document.getElementById('swal-i-second-date').value;

                return {
                    clientId: cid,
                    quotationId: document.getElementById('swal-i-quote').value,
                    secondInvoiceDate: secondDate ? new Date(secondDate).toISOString() : null,
                    items: items,
                    subtotal: subtotal.toFixed(2),
                    discountPct: discountPct,
                    discountAmt: discountAmt.toFixed(2),
                    vatPct: vatPct,
                    vatAmt: vatAmt.toFixed(2),
                    total: total.toFixed(2),
                    balanceDue: total.toFixed(2), // Initial balance = total
                    status: document.getElementById('swal-i-status').value,
                    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                    validUntil: validDate ? new Date(validDate).toISOString() : null,
                    paymentTerms: document.getElementById('swal-i-terms').value,
                    expectedStartDate: startDate ? new Date(startDate).toISOString() : null,
                    deliveryTime: document.getElementById('swal-i-delivery').value,
                    customerNotes: document.getElementById('swal-i-cnotes').value,
                    poNumber: document.getElementById('swal-i-po').value,
                    salesperson: document.getElementById('swal-i-sales').value,
                    notes: document.getElementById('swal-i-notes').value,
                }
            }
        });

        if (formValues) {
            try {
                if (isEdit) {
                    // if status is paid, balance should be 0 (simple auto calc for now)
                    if (formValues.status === 'Paid') formValues.balanceDue = '0.00';
                    delete formValues.secondInvoiceDate;
                    await API.request(`/api/invoices/${i.id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'Invoice updated', 'success');
                } else {
                    const is50PercentDeposit = formValues.paymentTerms === '50% Deposit, 50% on Launch';
                    const secondDate = formValues.secondInvoiceDate;
                    delete formValues.secondInvoiceDate;

                    // Capture original full total before applying deposit deduction
                    const originalTotalForPDF = parseFloat(formValues.total);
                    const originalSubtotal = parseFloat(formValues.subtotal);

                    if (is50PercentDeposit) {
                        // The subtotal deduction needs to be half the *subtotal*
                        // so that discounts and VAT scale down correctly.
                        const deduction = originalSubtotal * 0.5;
                        formValues.items.push({
                            description: '50% Balance deferred to Launch',
                            price: -deduction,
                            quantity: 1
                        });

                        // Recompute subtotal, vat, total
                        let newSubtotal = 0;
                        formValues.items.forEach(item => {
                            newSubtotal += (item.price * item.quantity);
                        });

                        const discountAmt = newSubtotal * (formValues.discountPct / 100);
                        const newTotal = newSubtotal - discountAmt;
                        const vatAmt = newTotal - (newTotal / (1 + (formValues.vatPct / 100)));

                        formValues.subtotal = newSubtotal.toFixed(2);
                        formValues.discountAmt = discountAmt.toFixed(2);
                        formValues.vatAmt = vatAmt.toFixed(2);
                        formValues.total = newTotal.toFixed(2);
                        formValues.balanceDue = newTotal.toFixed(2);

                        // Pass along a flag that this invoice *is* the deposit one
                        formValues.isDepositInvoice = true;
                        // Keep original total for PDF text rendering
                        formValues.originalTotal = originalTotalForPDF.toFixed(2);
                    }

                    formValues.reference = 'INV-' + Math.floor(1000 + Math.random() * 9000);
                    formValues.date = new Date().toISOString();

                    const firstQuoteRef = formValues.reference;

                    await API.request('/api/invoices', { method: 'POST', body: JSON.stringify(formValues) });

                    if (is50PercentDeposit) {
                        // Create second invoice for the balance
                        const refForText = formValues.quotationId ? 'Quotation' : `Invoice ${firstQuoteRef}`;

                        // We duplicate the object to avoid reference issues
                        const secondInvoice = JSON.parse(JSON.stringify(formValues));
                        secondInvoice.reference = 'INV-' + Math.floor(1000 + Math.random() * 9000);
                        secondInvoice.date = secondDate || new Date().toISOString();
                        secondInvoice.dueDate = secondInvoice.date; // Due on the created date

                        // We need the raw total balance amount.
                        // The remaining balance is 50% of the *original total* (not the current formValues.total which is already 50%)
                        // However, since we're creating an invoice that has VAT/Discount, we should just insert a subtotal item
                        // that equates to the remaining subtotal, so the math works out perfectly.
                        const balanceSubtotal = originalSubtotal * 0.5;

                        // Overwrite items with just the balance
                        secondInvoice.items = [{
                            description: `50% Balance on Launch for ${refForText}`,
                            price: balanceSubtotal,
                            quantity: 1
                        }];

                        // Recompute with original discount and VAT pcts applied to this new subtotal
                        let newSubtotal2 = balanceSubtotal;
                        const discountAmt2 = newSubtotal2 * (secondInvoice.discountPct / 100);
                        const newTotal2 = newSubtotal2 - discountAmt2;
                        const vatAmt2 = newTotal2 - (newTotal2 / (1 + (secondInvoice.vatPct / 100)));

                        secondInvoice.subtotal = newSubtotal2.toFixed(2);
                        secondInvoice.discountAmt = discountAmt2.toFixed(2);
                        secondInvoice.vatAmt = vatAmt2.toFixed(2);
                        secondInvoice.total = newTotal2.toFixed(2);
                        secondInvoice.balanceDue = newTotal2.toFixed(2);
                        secondInvoice.status = 'Unpaid';
                        delete secondInvoice.isDepositInvoice; // don't add the text for the balance invoice
                        delete secondInvoice.originalTotal;

                        await API.request('/api/invoices', { method: 'POST', body: JSON.stringify(secondInvoice) });
                        Swal.fire('Success', 'Deposit and Balance invoices created successfully', 'success');
                    } else {
                        Swal.fire('Success', 'Invoice created', 'success');
                    }
                }
                this.loadInvoices();
                app.loadDashboardData();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    editInvoice(id) {
        const i = this.invoices.find(x => x.id === id);
        if (i) this.openModal(i);
    },

    async download(id) {
        const inv = this.invoices.find(x => x.id === id);
        inv.client = this.clients.find(c => c.id === inv.clientId);
        pdfEngine.download('Invoice', inv);
    },

    async deleteInvoice(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/invoices/${id}`, { method: 'DELETE' });
            this.loadInvoices();
            app.loadDashboardData();
        }
    }
};