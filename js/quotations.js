// js/quotations.js

const quotationsManager = {
    quotations: [],

    async loadQuotations() {
        const container = document.getElementById('quotations-container');
        container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i></div>';
        try {
            const [qRes, cRes] = await Promise.all([
                API.request('/api/quotations'),
                API.request('/api/clients')
            ]);
            if (qRes.success) {
                this.quotations = qRes.quotations;
                this.clients = cRes.clients;
                this.renderTable();
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load: ${error.message}</div>`;
        }
    },

    renderTable() {
        const container = document.getElementById('quotations-container');
        if (this.quotations.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No quotations found.</div>`;
            return;
        }

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote #</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700 block md:table-row-group">
        `;
        this.quotations.forEach(q => {
            const client = this.clients.find(c => c.id === q.clientId);
            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-medium text-gray-900 dark:text-white">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Quote #:</div>
                        <div class="text-right md:text-left">${q.reference}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm text-gray-500">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Client:</div>
                        <div class="text-right md:text-left">${client ? client.companyName : 'Unknown'}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-semibold">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Total:</div>
                        <div class="text-right md:text-left">R ${q.total}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Status:</div>
                        <div class="text-right md:text-left"><span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">${q.status}</span></div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="quotationsManager.preview('${q.id}')" class="text-gray-600 hover:text-gray-900 mr-2" title="Preview PDF"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="quotationsManager.sendWhatsApp('${q.id}')" class="text-green-600 hover:text-green-900 mr-2" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
                            <button onclick="quotationsManager.deleteQuote('${q.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
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
            title: 'Create Quotation',
            html: `
                <select id="swal-q-client" class="swal2-input"><option value="" disabled selected>Select Client</option>${clientOptions}</select>
                <input id="swal-q-desc" class="swal2-input" placeholder="Item Description">
                <input id="swal-q-price" type="number" class="swal2-input" placeholder="Unit Price (ZAR)">
                <input id="swal-q-qty" type="number" class="swal2-input" placeholder="Quantity" value="1">
            `,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                const price = parseFloat(document.getElementById('swal-q-price').value || 0);
                const qty = parseFloat(document.getElementById('swal-q-qty').value || 1);
                return {
                    clientId: document.getElementById('swal-q-client').value,
                    items: [{
                        description: document.getElementById('swal-q-desc').value,
                        price: price,
                        quantity: qty
                    }],
                    subtotal: price * qty,
                    total: price * qty,
                }
            }
        });

        if (formValues && formValues.clientId) {
            formValues.reference = 'QT-' + Math.floor(1000 + Math.random() * 9000);
            formValues.status = 'Draft';
            formValues.date = new Date().toISOString();

            try {
                await API.request('/api/quotations', { method: 'POST', body: JSON.stringify(formValues) });
                Swal.fire('Success', 'Quotation created', 'success');
                this.loadQuotations();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    async preview(id) {
        const q = this.quotations.find(x => x.id === id);
        q.client = this.clients.find(c => c.id === q.clientId);
        pdfEngine.preview('Quotation', q);
    },

    sendWhatsApp(id) {
        const q = this.quotations.find(x => x.id === id);
        const client = this.clients.find(c => c.id === q.clientId);
        if (!client || !client.phone) return Swal.fire('Error', 'Client has no phone number', 'error');

        const msg = encodeURIComponent(`Hi ${client.contactPerson || client.companyName},\n\nHere is the summary for Quotation ${q.reference}:\nTotal: R ${q.total}\n\nPlease let us know if you have any questions.\n\nRegards,\nD-TECH`);
        const phone = client.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    },

    async deleteQuote(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/quotations/${id}`, { method: 'DELETE' });
            this.loadQuotations();
        }
    }
};