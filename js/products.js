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

    filterProducts() {
        const query = (document.getElementById('productsSearchInput')?.value || '').toLowerCase().trim();
        const clearBtn = document.getElementById('productsSearchClear');
        if (clearBtn) {
            if (query.length > 0) clearBtn.classList.remove('hidden');
            else clearBtn.classList.add('hidden');
        }

        let filtered = this.products || [];
        if (query) {
            filtered = filtered.filter(p => {
                const name = (p.name || '').toLowerCase();
                const desc = (p.description || '').toLowerCase();
                const price = String(p.price || '');
                return name.includes(query) || desc.includes(query) || price.includes(query);
            });
        }
        this.renderTable(filtered);
    },

    clearSearch() {
        const input = document.getElementById('productsSearchInput');
        const clearBtn = document.getElementById('productsSearchClear');
        if (input) input.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');
        this.filterProducts();
    },

    renderTable(list = null) {
        const container = document.getElementById('products-container');
        if (!this.products || this.products.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No products found.</div>`;
            return;
        }

        const dataToRender = list !== null ? list : this.products;
        if (dataToRender.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10"><i class="fas fa-search text-2xl text-gray-400 mb-2 block"></i>No products match your search.</div>`;
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

    ensureDrawer() {
        let modal = document.getElementById('productDrawerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'productDrawerModal';
            modal.className = 'fixed inset-0 z-50 overflow-hidden hidden';
            modal.innerHTML = `
                <div class="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity" id="productDrawerOverlay"></div>
                <div class="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
                    <div class="w-screen max-w-xl bg-white dark:bg-dark-card shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out translate-x-full" id="productDrawerPanel">
                        <div class="p-4 sm:p-6 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-card">
                            <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white" id="productDrawerTitle">Add Product</h3>
                            <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" onclick="productsManager.closeModal()">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <form id="productDrawerForm" class="flex flex-col flex-grow overflow-hidden" onsubmit="productsManager.saveProduct(event)">
                            <div class="p-4 sm:p-6 overflow-y-auto flex-grow space-y-5" id="productDrawerContent">
                                <input id="drawer-p-id" type="hidden">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product / Service Name *</label>
                                    <input type="text" id="drawer-p-name" required placeholder="e.g. Website Maintenance" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                        <input type="text" id="drawer-p-category" placeholder="Software / Service" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version / Edition</label>
                                        <input type="text" id="drawer-p-version" placeholder="v1.0" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU / Code</label>
                                        <input type="text" id="drawer-p-sku" placeholder="SKU-100" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                        <select id="drawer-p-status" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                            <option value="Active">Active</option>
                                            <option value="Discontinued">Discontinued</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                    <textarea id="drawer-p-desc" rows="3" placeholder="Briefly explain what this product or service is..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></textarea>
                                </div>
                                <div class="border-t dark:border-gray-700 pt-4">
                                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pricing Structure (ZAR)</h4>
                                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Setup / Once-off</label>
                                            <input type="number" id="drawer-p-setup" step="any" placeholder="0.00" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Monthly Fee</label>
                                            <input type="number" id="drawer-p-monthly" step="any" placeholder="0.00" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Renewal Price</label>
                                            <input type="number" id="drawer-p-renewal" step="any" placeholder="0.00" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Download Link (URL)</label>
                                        <input type="url" id="drawer-p-link" placeholder="https://..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Support Period</label>
                                        <input type="text" id="drawer-p-support" placeholder="e.g. 12 months" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                </div>
                            </div>
                            <div class="p-4 sm:p-6 border-t dark:border-dark-border flex justify-end space-x-3 bg-gray-50 dark:bg-dark-card flex-shrink-0">
                                <button type="button" onclick="productsManager.closeModal()" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition">Cancel</button>
                                <button type="submit" id="productDrawerSubmitBtn" class="px-5 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-dtech-600 hover:bg-dtech-700 shadow-sm transition">Save Product</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.id === 'productDrawerOverlay') productsManager.closeModal();
            });
        }
        return modal;
    },

    openModal(product = null) {
        const modal = this.ensureDrawer();
        const panel = document.getElementById('productDrawerPanel');
        const form = document.getElementById('productDrawerForm');
        if (form) form.reset();

        const isEdit = !!product;
        document.getElementById('productDrawerTitle').innerText = isEdit ? 'Edit Product' : 'Add New Product';
        document.getElementById('productDrawerSubmitBtn').innerText = isEdit ? 'Save Changes' : 'Save Product';

        document.getElementById('drawer-p-id').value = isEdit ? product.id : '';
        document.getElementById('drawer-p-name').value = isEdit ? (product.name || '') : '';
        document.getElementById('drawer-p-category').value = isEdit ? (product.category || '') : '';
        document.getElementById('drawer-p-version').value = isEdit ? (product.version || '') : '';
        document.getElementById('drawer-p-sku').value = isEdit ? (product.sku || '') : '';
        document.getElementById('drawer-p-status').value = isEdit ? (product.status || 'Active') : 'Active';
        document.getElementById('drawer-p-desc').value = isEdit ? (product.description || '') : '';
        document.getElementById('drawer-p-setup').value = isEdit ? (product.setupFee || product.onceOffPrice || '') : '';
        document.getElementById('drawer-p-monthly').value = isEdit ? (product.monthlyFee || '') : '';
        document.getElementById('drawer-p-renewal').value = isEdit ? (product.renewalPrice || '') : '';
        document.getElementById('drawer-p-link').value = isEdit ? (product.downloadLink || '') : '';
        document.getElementById('drawer-p-support').value = isEdit ? (product.supportPeriod || '') : '';

        modal.classList.remove('hidden');
        setTimeout(() => {
            if (panel) panel.classList.remove('translate-x-full');
        }, 10);
    },

    closeModal() {
        const modal = document.getElementById('productDrawerModal');
        const panel = document.getElementById('productDrawerPanel');
        if (panel) panel.classList.add('translate-x-full');
        setTimeout(() => {
            if (modal) modal.classList.add('hidden');
        }, 300);
    },

    async saveProduct(e) {
        e.preventDefault();
        const id = document.getElementById('drawer-p-id').value;
        const submitBtn = document.getElementById('productDrawerSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';

        const productData = {
            name: document.getElementById('drawer-p-name').value.trim(),
            category: document.getElementById('drawer-p-category').value.trim(),
            version: document.getElementById('drawer-p-version').value.trim(),
            sku: document.getElementById('drawer-p-sku').value.trim(),
            status: document.getElementById('drawer-p-status').value,
            description: document.getElementById('drawer-p-desc').value.trim(),
            setupFee: document.getElementById('drawer-p-setup').value,
            onceOffPrice: document.getElementById('drawer-p-setup').value,
            monthlyFee: document.getElementById('drawer-p-monthly').value,
            renewalPrice: document.getElementById('drawer-p-renewal').value,
            downloadLink: document.getElementById('drawer-p-link').value.trim(),
            supportPeriod: document.getElementById('drawer-p-support').value.trim()
        };

        try {
            if (id) {
                await API.request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(productData) });
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Updated Product: ${productData.name}`);
                Swal.fire({ icon: 'success', title: 'Updated!', text: 'Product updated successfully', timer: 1500, showConfirmButton: false });
            } else {
                await API.request('/api/products', { method: 'POST', body: JSON.stringify(productData) });
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Added Product: ${productData.name}`);
                Swal.fire({ icon: 'success', title: 'Created!', text: 'Product added successfully', timer: 1500, showConfirmButton: false });
            }
            this.closeModal();
            this.loadProducts();
            if (typeof app !== 'undefined' && app.loadDashboardData) app.loadDashboardData();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message });
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = id ? 'Save Changes' : 'Save Product';
        }
    },

    editProduct(id) {
        const p = this.products.find(x => x.id === id);
        if (p) this.openModal(p);
    },

    async deleteProduct(id) {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This product will be permanently deleted.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });
        if (result.isConfirmed) {
            try {
                await API.request(`/api/products/${id}`, { method: 'DELETE' });
                Swal.fire({ icon: 'success', title: 'Deleted', text: 'Product deleted', timer: 1500, showConfirmButton: false });
                this.loadProducts();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    }
};