// js/public_pdfEngine.js

// Make sure jspdf is loaded in the HTML
const pdfEngine = {
    async getSettings() {
        let settings = {};
        let plan = "Free";
        try {
            const response = await API.request('/api/settings');
            if (response.success && response.settings) {
                settings = response.settings;
            }
            const subData = await API.request('/api/subscription');
            if (subData.success) {
                plan = subData.subscription.plan || "Free";
            }
            settings.userPlan = plan;
        } catch (e) {
            console.warn("Could not load settings or plan", e);
        }
        return settings;
    },

    async getLogoBase64(url) {
        if (!url) return null;
        try {
            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }
        } catch (e) {
            console.warn("Logo not found at URL, using text fallback");
        }
        return null;
    },

    async generateDocument(type, data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const settings = await this.getSettings();

        // Gate custom branding for Free tier
        let logoData = null;
        let primaryColor = [37, 99, 235]; // Default Blue

        if (settings.userPlan === 'Premium' || settings.userPlan === 'Pro') {
            logoData = await this.getLogoBase64(settings.logoUrl);
            if (settings.brandColor && /^#[0-9A-F]{6}$/i.test(settings.brandColor)) {
                const hex = settings.brandColor;
                primaryColor = [
                    parseInt(hex.slice(1, 3), 16),
                    parseInt(hex.slice(3, 5), 16),
                    parseInt(hex.slice(5, 7), 16)
                ];
            }
        }

        const businessName = settings.businessName || "Your Business";
        const contactName = settings.contactName || "";
        const email = settings.email || "";

        const grayColor = [107, 114, 128];

        // --- HEADER ---
        let logoWidth = 40;
        let logoHeight = 15;
        let logoBottomY = 30;

        const isCorporate = settings.userPlan === 'Premium' && settings.pdfTemplate === 'Corporate';
        const isCreative = settings.userPlan === 'Premium' && settings.pdfTemplate === 'Creative';

        if (logoData) {
            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const maxWidth = 50;
                    const maxHeight = 20;
                    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
                    logoWidth = img.width * ratio;
                    logoHeight = img.height * ratio;
                    resolve();
                };
                img.onerror = resolve;
                img.src = logoData;
            });
        }

        let metaY, clientY, finalY;
        const client = data.client || {};

        if (isCorporate) {
            // Corporate Template Header: Full-width banner
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 45, 'F');

            if (logoData) {
                // Try to place logo on the left inside the banner
                doc.addImage(logoData, 'PNG', 14, 12, logoWidth, logoHeight);
            } else {
                doc.setFontSize(22);
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.text(businessName, 14, 25);
            }

            // Doc Type right-aligned inside banner
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text(type.toUpperCase(), 196, 25, { align: 'right' });

            // Meta details right-aligned inside banner below doc type
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            if (data.reference) {
                doc.text(`Ref: ${data.reference}`, 196, 32, { align: 'right' });
            }
            if (data.date) {
                doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 196, 38, { align: 'right' });
            }

            // Client Info Box
            clientY = 55;
            doc.setFillColor(245, 245, 245);
            doc.rect(14, 50, 85, 40, 'F');

            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text("Prepared For:", 18, clientY);

            clientY += 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(client.companyName || 'Unknown Client', 18, clientY);
            clientY += 5;
            if (client.contactPerson) { doc.text(client.contactPerson, 18, clientY); clientY += 5; }
            if (client.email) { doc.text(client.email, 18, clientY); clientY += 5; }
            if (client.phone) { doc.text(client.phone, 18, clientY); clientY += 5; }

            // Details Info Box (if exists)
            if (data.validUntil || data.paymentTerms || data.expectedStartDate || data.deliveryTime) {
                let detailY = 55;
                doc.setFillColor(245, 245, 245);
                doc.rect(111, 50, 85, 40, 'F');

                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text(`${type} Details:`, 115, detailY);

                detailY += 6;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                if (data.validUntil) { doc.text(`Valid Until: ${new Date(data.validUntil).toLocaleDateString()}`, 115, detailY); detailY += 5; }
                if (data.paymentTerms) { doc.text(`Payment Terms: ${data.paymentTerms}`, 115, detailY); detailY += 5; }
                if (data.expectedStartDate) { doc.text(`Project Start: ${new Date(data.expectedStartDate).toLocaleDateString()}`, 115, detailY); detailY += 5; }
                if (data.deliveryTime) { doc.text(`Delivery Time: ${data.deliveryTime}`, 115, detailY); detailY += 5; }
            }

            finalY = 100;

        } else if (isCreative) {
            // Creative Template Header
            if (logoData) {
                doc.addImage(logoData, 'PNG', 14, 15, logoWidth, logoHeight);
                logoBottomY = 15 + logoHeight;
            } else {
                doc.setFontSize(26);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text(businessName, 14, 25);
                logoBottomY = 28;
            }

            // Elegant accent line under logo
            doc.setDrawColor(...primaryColor);
            doc.setLineWidth(1.5);
            doc.line(14, logoBottomY + 5, 50, logoBottomY + 5);

            metaY = logoBottomY + 15;
            doc.setFontSize(28);
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text(type.toUpperCase(), 14, metaY);

            metaY += 8;
            doc.setFontSize(11);
            doc.setTextColor(...grayColor);
            doc.setFont('helvetica', 'normal');
            let metaTxt = "";
            if (data.reference) metaTxt += `Ref: ${data.reference}   |   `;
            if (data.date) metaTxt += `Date: ${new Date(data.date).toLocaleDateString()}`;
            doc.text(metaTxt, 14, metaY);

            // Client Info Box pushed down to give whitespace
            clientY = metaY + 15;
            doc.setFontSize(10);
            doc.setTextColor(...grayColor);
            doc.setFont('helvetica', 'bold');
            doc.text("PREPARED FOR", 14, clientY);

            clientY += 6;
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(client.companyName || 'Unknown Client', 14, clientY);

            clientY += 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...grayColor);
            if (client.contactPerson) { doc.text(client.contactPerson, 14, clientY); clientY += 5; }
            if (client.email) { doc.text(client.email, 14, clientY); clientY += 5; }
            if (client.phone) { doc.text(client.phone, 14, clientY); clientY += 5; }

            if (data.validUntil || data.paymentTerms || data.expectedStartDate || data.deliveryTime) {
                let detailY = metaY + 15;
                doc.setFontSize(10);
                doc.setTextColor(...grayColor);
                doc.setFont('helvetica', 'bold');
                doc.text("DETAILS", 115, detailY);

                detailY += 6;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                if (data.validUntil) { doc.text(`Valid Until: ${new Date(data.validUntil).toLocaleDateString()}`, 115, detailY); detailY += 5; }
                if (data.paymentTerms) { doc.text(`Payment Terms: ${data.paymentTerms}`, 115, detailY); detailY += 5; }
                if (data.expectedStartDate) { doc.text(`Project Start: ${new Date(data.expectedStartDate).toLocaleDateString()}`, 115, detailY); detailY += 5; }
                if (data.deliveryTime) { doc.text(`Delivery Time: ${data.deliveryTime}`, 115, detailY); detailY += 5; }
            }

            finalY = Math.max(clientY, metaY + 40) + 15;

        } else {
            // STANDARD / DEFAULT TEMPLATE
            if (logoData) {
                doc.addImage(logoData, 'PNG', 14, 15, logoWidth, logoHeight);
                logoBottomY = 15 + logoHeight;
            } else {
                doc.setFontSize(22);
                doc.setTextColor(...primaryColor);
                doc.setFont('helvetica', 'bold');
                doc.text(businessName, 14, 25);
                logoBottomY = 28;
            }

            metaY = logoBottomY + 8;
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(type.toUpperCase(), 14, metaY);

            metaY += 6;
            doc.setFontSize(10);
            doc.setTextColor(...grayColor);
            doc.setFont('helvetica', 'normal');

            if (data.reference) { doc.text(`Ref: ${data.reference}`, 14, metaY); metaY += 5; }
            if (data.date) { doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 14, metaY); metaY += 5; }

            clientY = 18;
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text("Prepared For:", 196, clientY, { align: 'right' });

            clientY += 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(client.companyName || 'Unknown Client', 196, clientY, { align: 'right' });
            clientY += 5;
            if (client.contactPerson) { doc.text(client.contactPerson, 196, clientY, { align: 'right' }); clientY += 5; }
            if (client.email) { doc.text(client.email, 196, clientY, { align: 'right' }); clientY += 5; }
            if (client.phone) { doc.text(client.phone, 196, clientY, { align: 'right' }); clientY += 5; }

            if (data.validUntil || data.paymentTerms || data.expectedStartDate || data.deliveryTime) {
                clientY += 4;
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text(`${type} Details:`, 196, clientY, { align: 'right' });
                clientY += 5;

                doc.setFont('helvetica', 'normal');
                if (data.validUntil) { doc.text(`Valid Until: ${new Date(data.validUntil).toLocaleDateString()}`, 196, clientY, { align: 'right' }); clientY += 5; }
                if (data.paymentTerms) { doc.text(`Payment Terms: ${data.paymentTerms}`, 196, clientY, { align: 'right' }); clientY += 5; }
                if (data.expectedStartDate) { doc.text(`Project Start: ${new Date(data.expectedStartDate).toLocaleDateString()}`, 196, clientY, { align: 'right' }); clientY += 5; }
                if (data.deliveryTime) { doc.text(`Delivery Time: ${data.deliveryTime}`, 196, clientY, { align: 'right' }); clientY += 5; }
            }

            doc.setDrawColor(229, 231, 235);
            let headerBottom = Math.max(metaY, clientY) + 5;
            doc.line(14, headerBottom, 196, headerBottom);

            finalY = headerBottom + 10;
        }

        // --- DOCUMENT SPECIFIC CONTENT ---

        if (type === 'Quotation' || type === 'Invoice' || type === 'Receipt') {
            const tableData = data.items.map(item => [
                item.description,
                `R ${Number(item.price).toFixed(2)}`,
                item.quantity,
                `R ${(Number(item.price) * Number(item.quantity)).toFixed(2)}`
            ]);

            let theme = 'striped';
            let headStyles = { fillColor: primaryColor, textColor: 255 };
            let bodyStyles = {};

            if (isCorporate) {
                theme = 'grid';
                headStyles = { fillColor: primaryColor, textColor: 255, lineWidth: 0.1, lineColor: 200 };
            } else if (isCreative) {
                theme = 'plain';
                headStyles = { fillColor: [255, 255, 255], textColor: primaryColor, fontStyle: 'bold', lineWidth: 0 };
                bodyStyles = { lineWidth: 0, borderBottom: [0.5, 'solid', '#eee'] };
            }

            doc.autoTable({
                startY: finalY,
                head: [['Description', 'Unit Price', 'Qty', 'Total']],
                body: tableData,
                theme: theme,
                headStyles: headStyles,
                bodyStyles: bodyStyles,
                alternateRowStyles: isCreative ? {} : { fillColor: [249, 250, 251] },
                margin: { left: 14, right: 14 }
            });

            finalY = doc.lastAutoTable.finalY + 10;

            // Totals
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const totalWidth = doc.internal.pageSize.getWidth();

            const vatAmt = Number(data.vatAmt) || 0;
            const subtotal = Number(data.subtotal) || 0;
            const total = Number(data.total) || 0;

            if (vatAmt === 0) {
                if (data.discount && Number(data.discount) > 0) {
                    doc.text("Discount:", totalWidth - 50, finalY, { align: 'right' });
                    doc.text(`- R ${Number(data.discount).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
                    finalY += 6;
                }

                finalY += 2;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Total:", totalWidth - 50, finalY, { align: 'right' });
                doc.text(`R ${total.toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

                if (type === 'Quotation' && data.paymentTerms === '50% Deposit') {
                    finalY += 7;
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...primaryColor);
                    doc.text("Due Before Project Start (50%):", totalWidth - 50, finalY, { align: 'right' });
                    doc.text(`R ${(total * 0.5).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
                    finalY += 5;
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...grayColor);
                    doc.text("Balance Due on Completion (50%):", totalWidth - 50, finalY, { align: 'right' });
                    doc.text(`R ${(total * 0.5).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                }

                finalY += 8;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.text("Prices are not subject to VAT (Non-VAT vendor).", totalWidth - 14, finalY, { align: 'right' });
            } else {
                const vatPct = Number(data.vatPct) || 15;

                doc.text("Subtotal:", totalWidth - 50, finalY, { align: 'right' });
                doc.text(`R ${subtotal.toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

                if (data.discount) {
                    finalY += 6;
                    doc.text("Discount:", totalWidth - 50, finalY, { align: 'right' });
                    doc.text(`- R ${Number(data.discount).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
                }

                finalY += 6;
                doc.text(`VAT (${vatPct}%):`, totalWidth - 50, finalY, { align: 'right' });
                doc.text(`R ${vatAmt.toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

                finalY += 8;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Total Due:", totalWidth - 50, finalY, { align: 'right' });
                doc.text(`R ${total.toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

                if (type === 'Quotation' && data.paymentTerms === '50% Deposit') {
                    finalY += 7;
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...primaryColor);
                    doc.text("Due Before Project Start (50%):", totalWidth - 50, finalY, { align: 'right' });
                    doc.text(`R ${(total * 0.5).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
                    finalY += 5;
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...grayColor);
                    doc.text("Balance Due on Completion (50%):", totalWidth - 50, finalY, { align: 'right' });
                    doc.text(`R ${(total * 0.5).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                }
            }
        }

        if (type === 'License Agreement') {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const contractText = data.content || "Standard License Terms apply.";

            const splitText = doc.splitTextToSize(contractText, 182);
            doc.text(splitText, 14, finalY);

            finalY += splitText.length * 5 + 20;

            // Signatures
            if (finalY > 250) {
                doc.addPage();
                finalY = 20;
            }

            doc.setDrawColor(0, 0, 0);
            doc.line(14, finalY, 80, finalY);
            doc.text("Client Signature", 14, finalY + 5);

            doc.line(120, finalY, 196, finalY);
            doc.text(`${businessName} Signature`, 120, finalY + 5);
        }

        if (type === 'Quotation' || type === 'Invoice') {
            finalY += 15;

            // Customer Notes (Full Width, Above Banking Details)
            if (data.customerNotes) {
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text("Customer Notes:", 14, finalY);
                finalY += 5;

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...grayColor);
                const splitNotes = doc.splitTextToSize(data.customerNotes, 182);
                doc.text(splitNotes, 14, finalY);
                finalY += (splitNotes.length * 5) + 10;
                doc.setTextColor(0, 0, 0);
            }

            let bottomSectionY = finalY;

            // Banking Details (Bottom Left)
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Banking Details", 14, bottomSectionY);

            let bankY = bottomSectionY + 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Account Holder: ${settings.accountHolder || ''}`, 14, bankY); bankY += 5;
            doc.text(`Bank: ${settings.bank || ''}`, 14, bankY); bankY += 5;
            doc.text(`Account Type: ${settings.accountType || ''}`, 14, bankY); bankY += 5;
            doc.text(`Account Number: ${settings.accountNumber || ''}`, 14, bankY); bankY += 5;
            doc.text(`Branch Code: ${settings.branchCode || ''}`, 14, bankY); bankY += 5;
            doc.text(`Payment Reference: ${data.reference || ''}`, 14, bankY);

            // Business Details (Bottom Right)
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Business Details", 196, bottomSectionY, { align: 'right' });

            let bizY = bottomSectionY + 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            // For business details we show contact, email, whatsapp, phone, website if they exist,
            // similar to admin invoice
            doc.text(`Contact: ${settings.contactName || ''}`, 196, bizY, { align: 'right' }); bizY += 5;
            doc.text(`Email: ${settings.email || ''}`, 196, bizY, { align: 'right' }); bizY += 5;
            doc.text(`WhatsApp: ${settings.whatsapp || ''}`, 196, bizY, { align: 'right' }); bizY += 5;
            doc.text(`Phone: ${settings.phone || ''}`, 196, bizY, { align: 'right' }); bizY += 5;
            doc.text(`Website: ${settings.website || ''}`, 196, bizY, { align: 'right' }); bizY += 5;
        }

        // --- FOOTER ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);

            if (!settings.userPlan || settings.userPlan === 'Free') {
                doc.text(`${businessName} | Generated automatically by CRM`, 14, 285);
            }
            doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });

            // D-TECH Watermark for Free plan only
            if (!settings.userPlan || settings.userPlan === 'Free') {
                doc.setFontSize(7);
                doc.setTextColor(200, 200, 200);
                doc.text("This document was generated by management.dtech-services.co.za", doc.internal.pageSize.getWidth() / 2, 292, { align: 'center' });
            }
        }

        return doc;
    },

    async download(type, data, filename) {
        const doc = await this.generateDocument(type, data);
        const cleanName = filename || `${type}_${data.reference || Date.now()}.pdf`;
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const base64 = doc.output('datauristring').split(',')[1];
            saveFileNative(base64, cleanName);
        } else {
            doc.save(cleanName);
        }
    },

    async preview(type, data) {
        const doc = await this.generateDocument(type, data);
        const pdfDataUri = doc.output('datauristring');

        // Open in new window
        const win = window.open();
        if (win) {
            win.document.write(`<iframe src="${pdfDataUri}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
            alert('Please allow popups for this website to preview PDFs.');
        }
    }
};

pdfEngine.generateIncomeStatementPDF = function(transactions, startDate, endDate) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let businessName = "Business Portal";
    const userStr = localStorage.getItem('dtech_user');
    if (userStr) {
        try {
            const u = JSON.parse(userStr);
            if (u.businessName) businessName = u.businessName;
        } catch(e) {}
    }

    let revenue = 0;
    let cogs = 0;
    let expenses = 0;

    const revData = [];
    const expData = [];
    const cogsData = [];

    // Aggregate by category
    const categoryTotals = {};
    (transactions || []).forEach(t => {
        const cat = t.category || 'Uncategorized';
        if (!categoryTotals[cat]) {
            categoryTotals[cat] = { total: 0, type: t.type };
        }
        categoryTotals[cat].total += parseFloat(t.amount || 0);
    });

    for (const [cat, data] of Object.entries(categoryTotals)) {
        if (data.type === 'Income') {
            revenue += data.total;
            revData.push([cat, `R ${data.total.toFixed(2)}`]);
        } else if (cat === 'Cost of Goods Sold') {
            cogs += data.total;
            cogsData.push([cat, `R ${data.total.toFixed(2)}`]);
        } else if (data.type === 'Expense') {
            expenses += data.total;
            expData.push([cat, `R ${data.total.toFixed(2)}`]);
        }
    }

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;

    // Header styling
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(businessName, 14, 18);
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138);
    doc.text('Income Statement', 14, 28);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`For the period: ${startDate} to ${endDate}`, 14, 35);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 40);
    doc.setTextColor(0, 0, 0);

    let startY = 48;

    // Revenue Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Revenue', 14, startY - 2);
    doc.autoTable({
        startY: startY,
        head: [['Account / Category', 'Amount (ZAR)']],
        body: revData.length > 0 ? revData : [['No Revenue Recorded', 'R 0.00']],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
    });

    // COGS
    if (cogsData.length > 0) {
        startY = doc.lastAutoTable.finalY + 10;
        doc.text('Cost of Goods Sold', 14, startY - 2);
        doc.autoTable({
            startY: startY,
            head: [['Account / Category', 'Amount (ZAR)']],
            body: cogsData,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });
    }

    startY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Gross Profit: R ${grossProfit.toFixed(2)}`, 14, startY);

    // Expenses Section
    startY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Operating Expenses', 14, startY - 2);
    doc.autoTable({
        startY: startY,
        head: [['Account / Category', 'Amount (ZAR)']],
        body: expData.length > 0 ? expData : [['No Expenses Recorded', 'R 0.00']],
        theme: 'grid',
        headStyles: { fillColor: [192, 57, 43] }
    });

    startY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    if (netProfit >= 0) {
        doc.setTextColor(39, 174, 96);
    } else {
        doc.setTextColor(192, 57, 43);
    }
    doc.text(`Net Profit / (Loss): R ${netProfit.toFixed(2)}`, 14, startY);
    doc.setTextColor(0, 0, 0);

    const cleanName = `Income_Statement_${startDate}_to_${endDate}.pdf`;
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const base64 = doc.output('datauristring').split(',')[1];
        saveFileNative(base64, cleanName);
    } else {
        doc.save(cleanName);
    }
};

pdfEngine.generateBalanceSheetPDF = function(transactions, asOfDate) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let businessName = "Business Portal";
    const userStr = localStorage.getItem('dtech_user');
    if (userStr) {
        try {
            const u = JSON.parse(userStr);
            if (u.businessName) businessName = u.businessName;
        } catch(e) {}
    }

    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    let netIncome = 0;

    const assetData = [];
    const liabilityData = [];
    const equityData = [];

    const categoryTotals = {};
    (transactions || []).forEach(t => {
        const cat = t.category || 'Uncategorized';
        let accntType = 'Expense';
        if (typeof financialsManager !== 'undefined' && financialsManager.chartOfAccounts) {
            const accDef = financialsManager.chartOfAccounts.find(a => a.name === cat);
            if (accDef) accntType = accDef.type;
        }

        if (!categoryTotals[cat]) {
            categoryTotals[cat] = { total: 0, type: accntType };
        }

        const amt = parseFloat(t.amount || 0);
        if (accntType === 'Income') categoryTotals[cat].total += amt;
        else if (accntType === 'Expense') categoryTotals[cat].total += amt;
        else if (accntType === 'Asset') {
            if (t.type === 'Income') categoryTotals[cat].total += amt;
            else categoryTotals[cat].total -= amt;
        }
        else if (accntType === 'Liability' || accntType === 'Equity') {
            if (t.type === 'Income') categoryTotals[cat].total += amt;
            else categoryTotals[cat].total -= amt;
        }
    });

    for (const [cat, data] of Object.entries(categoryTotals)) {
        if (data.type === 'Asset') {
            assets += data.total;
            assetData.push([cat, `R ${data.total.toFixed(2)}`]);
        } else if (data.type === 'Liability') {
            liabilities += data.total;
            liabilityData.push([cat, `R ${data.total.toFixed(2)}`]);
        } else if (data.type === 'Equity') {
            equity += data.total;
            equityData.push([cat, `R ${data.total.toFixed(2)}`]);
        } else if (data.type === 'Income') {
            netIncome += data.total;
        } else if (data.type === 'Expense') {
            netIncome -= data.total;
        }
    }

    equity += netIncome;
    equityData.push(['Retained Earnings (Net Income)', `R ${netIncome.toFixed(2)}`]);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(businessName, 14, 18);
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138);
    doc.text('Balance Sheet', 14, 28);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`As of: ${asOfDate}`, 14, 35);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 40);
    doc.setTextColor(0, 0, 0);

    let startY = 48;

    // Assets
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Assets', 14, startY - 2);
    doc.autoTable({
        startY: startY,
        head: [['Account / Asset Category', 'Amount (ZAR)']],
        body: assetData.length > 0 ? assetData : [['No Assets Recorded', 'R 0.00']],
        theme: 'grid',
        headStyles: { fillColor: [39, 174, 96] }
    });

    startY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Assets: R ${assets.toFixed(2)}`, 14, startY);

    // Liabilities
    startY += 15;
    doc.text('Liabilities', 14, startY - 2);
    doc.autoTable({
        startY: startY,
        head: [['Account / Liability Category', 'Amount (ZAR)']],
        body: liabilityData.length > 0 ? liabilityData : [['No Liabilities Recorded', 'R 0.00']],
        theme: 'grid',
        headStyles: { fillColor: [192, 57, 43] }
    });

    startY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Liabilities: R ${liabilities.toFixed(2)}`, 14, startY);

    // Equity
    startY += 15;
    doc.text('Equity', 14, startY - 2);
    doc.autoTable({
        startY: startY,
        head: [['Account / Equity Category', 'Amount (ZAR)']],
        body: equityData,
        theme: 'grid',
        headStyles: { fillColor: [142, 68, 173] }
    });

    startY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Equity: R ${equity.toFixed(2)}`, 14, startY);

    startY += 10;
    doc.text(`Total Liabilities & Equity: R ${(liabilities + equity).toFixed(2)}`, 14, startY);

    const cleanName = `Balance_Sheet_${asOfDate}.pdf`;
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const base64 = doc.output('datauristring').split(',')[1];
        saveFileNative(base64, cleanName);
    } else {
        doc.save(cleanName);
    }
};
async function saveFileNative(base64Data, filename) {
    try {
        const { Filesystem, Share } = window.Capacitor.Plugins;

        const savedFile = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: 'DOCUMENTS' // Capacitor Directory.Documents enum value
        });

        await Share.share({
            title: 'Share PDF',
            text: 'Here is the generated PDF.',
            url: savedFile.uri,
            dialogTitle: 'Share PDF'
        });
    } catch(e) {
        console.error('Error saving native file', e);
        if (window.Swal) Swal.fire('Error', 'Failed to save or share PDF natively', 'error');
    }
}
