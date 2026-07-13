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
                            <button onclick="invoicesManager.preview('${inv.id}')" class="text-gray-600 hover:text-gray-900 mr-2" title="Preview PDF"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="invoicesManager.deleteInvoice('${inv.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async openModal() {
        if (!this.clients || this.clients.length === 0) return Swal.fire('Error', 'Add a client first', 'error');

        const clientOptions = this.clients.map(c => `<option value="${c.id}">${c.companyName}</option>`).join('');

        const { value: formValues } = await Swal.fire({
            title: 'Create Invoice',
            html: `
                <select id="swal-i-client" class="swal2-input"><option value="" disabled selected>Select Client</option>${clientOptions}</select>
                <input id="swal-i-desc" class="swal2-input" placeholder="Item Description">
                <input id="swal-i-price" type="number" class="swal2-input" placeholder="Unit Price (ZAR)">
                <input id="swal-i-qty" type="number" class="swal2-input" placeholder="Quantity" value="1">
            `,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                const price = parseFloat(document.getElementById('swal-i-price').value || 0);
                const qty = parseFloat(document.getElementById('swal-i-qty').value || 1);
                return {
                    clientId: document.getElementById('swal-i-client').value,
                    items: [{
                        description: document.getElementById('swal-i-desc').value,
                        price: price,
                        quantity: qty
                    }],
                    subtotal: price * qty,
                    total: price * qty,
                }
            }
        });

        if (formValues && formValues.clientId) {
            formValues.reference = 'INV-' + Math.floor(1000 + Math.random() * 9000);
            formValues.status = 'Unpaid';
            formValues.date = new Date().toISOString();

            try {
                await API.request('/api/invoices', { method: 'POST', body: JSON.stringify(formValues) });
                Swal.fire('Success', 'Invoice created', 'success');
                this.loadInvoices();
                app.loadDashboardData();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    async preview(id) {
        const inv = this.invoices.find(x => x.id === id);
        inv.client = this.clients.find(c => c.id === inv.clientId);
        pdfEngine.preview('Invoice', inv);
    },

    async deleteInvoice(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/invoices/${id}`, { method: 'DELETE' });
            this.loadInvoices();
            app.loadDashboardData();
        }
    }
};