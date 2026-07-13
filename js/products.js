// js/products.js

const productsManager = {
    products: [],

    async loadProducts() {
        const container = document.getElementById('products-container');
        container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i></div>';
        try {
            const response = await API.request('/api/products');
            if (response.success) {
                this.products = response.products;
                this.renderTable();
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load: ${error.message}</div>`;
        }
    },

    renderTable() {
        const container = document.getElementById('products-container');
        if (this.products.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No products found.</div>`;
            return;
        }

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pricing</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700 block md:table-row-group">
        `;
        this.products.forEach(p => {
            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center font-medium text-gray-900 dark:text-white">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Product:</div>
                        <div class="text-right md:text-left">
                            ${p.name} <span class="text-xs ml-2 px-2 py-0.5 rounded-full ${p.status === 'Discontinued' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">${p.status || 'Active'}</span>
                            <div class="text-xs text-gray-500 font-normal">SKU: ${p.sku || '-'} | Cat: ${p.category || '-'} | Ver: ${p.version || '-'}</div>
                            <div class="text-xs text-gray-500 font-normal mt-1 truncate max-w-xs">${p.description || ''}</div>
                        </div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm text-gray-500">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Pricing:</div>
                        <div class="text-right md:text-left">
                            <div>Once-off / Setup: R${p.setupFee || p.onceOffPrice || 0}</div>
                            <div>Monthly: R${p.monthlyFee || 0} | Renewal: R${p.renewalPrice || 0}</div>
                        </div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="productsManager.editProduct('${p.id}')" class="text-blue-600 hover:text-blue-900 mr-3"><i class="fas fa-edit"></i></button>
                            <button onclick="productsManager.deleteProduct('${p.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async openModal(product = null) {
        const title = product ? 'Edit Product' : 'Add Product';
        const p = product || {};

        const { value: formValues } = await Swal.fire({
            title: title,
            html: `
                <div class="text-left text-sm space-y-3">
                    <div><label class="font-medium">Product Name *</label><input id="swal-p-name" class="swal2-input mt-1 w-full m-0" value="${p.name || ''}" placeholder="Product Name"></div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Category</label><input id="swal-p-category" class="swal2-input mt-1 w-full m-0" value="${p.category || ''}" placeholder="Category"></div>
                        <div><label class="font-medium">Version</label><input id="swal-p-version" class="swal2-input mt-1 w-full m-0" value="${p.version || ''}" placeholder="Version"></div>
                        <div><label class="font-medium">SKU / Code</label><input id="swal-p-sku" class="swal2-input mt-1 w-full m-0" value="${p.sku || ''}" placeholder="SKU"></div>
                        <div><label class="font-medium">Status</label><select id="swal-p-status" class="swal2-input mt-1 w-full m-0"><option value="Active" ${p.status==='Active'?'selected':''}>Active</option><option value="Discontinued" ${p.status==='Discontinued'?'selected':''}>Discontinued</option></select></div>
                    </div>
                    <div><label class="font-medium">Description</label><input id="swal-p-desc" class="swal2-input mt-1 w-full m-0" value="${p.description || ''}" placeholder="Description"></div>
                    <div class="grid grid-cols-3 gap-2">
                        <div><label class="font-medium">Once-off/Setup (ZAR)</label><input id="swal-p-setup" type="number" class="swal2-input mt-1 w-full m-0" value="${p.setupFee || p.onceOffPrice || ''}" placeholder="0"></div>
                        <div><label class="font-medium">Monthly (ZAR)</label><input id="swal-p-monthly" type="number" class="swal2-input mt-1 w-full m-0" value="${p.monthlyFee || ''}" placeholder="0"></div>
                        <div><label class="font-medium">Renewal (ZAR)</label><input id="swal-p-renewal" type="number" class="swal2-input mt-1 w-full m-0" value="${p.renewalPrice || ''}" placeholder="0"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Download Link (URL)</label><input id="swal-p-link" class="swal2-input mt-1 w-full m-0" value="${p.downloadLink || ''}" placeholder="https://..."></div>
                        <div><label class="font-medium">Support Period</label><input id="swal-p-support" class="swal2-input mt-1 w-full m-0" value="${p.supportPeriod || ''}" placeholder="e.g. 12 months"></div>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            width: '600px',
            preConfirm: () => {
                const name = document.getElementById('swal-p-name').value;
                if (!name) {
                    Swal.showValidationMessage('Product Name is required');
                    return false;
                }
                return {
                    name: name,
                    category: document.getElementById('swal-p-category').value,
                    version: document.getElementById('swal-p-version').value,
                    sku: document.getElementById('swal-p-sku').value,
                    status: document.getElementById('swal-p-status').value,
                    description: document.getElementById('swal-p-desc').value,
                    setupFee: document.getElementById('swal-p-setup').value,
                    onceOffPrice: document.getElementById('swal-p-setup').value,
                    monthlyFee: document.getElementById('swal-p-monthly').value,
                    renewalPrice: document.getElementById('swal-p-renewal').value,
                    downloadLink: document.getElementById('swal-p-link').value,
                    supportPeriod: document.getElementById('swal-p-support').value
                }
            }
        });

        if (formValues) {
            try {
                if (product && product.id) {
                    await API.request(`/api/products/${product.id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'Product updated', 'success');
                } else {
                    await API.request('/api/products', { method: 'POST', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'Product added', 'success');
                }
                this.loadProducts();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    editProduct(id) {
        const p = this.products.find(x => x.id === id);
        if (p) this.openModal(p);
    },

    async deleteProduct(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/products/${id}`, { method: 'DELETE' });
            this.loadProducts();
        }
    }
};