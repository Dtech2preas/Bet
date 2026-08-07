// js/public_pdfEngine.js

// Make sure jspdf is loaded in the HTML
const pdfEngine = {
    async getSettings() {
        try {
            const response = await API.request('/api/settings');
            if (response.success && response.settings) {
                return response.settings;
            }
        } catch (e) {
            console.warn("Could not load settings");
        }
        return {};
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
        const logoData = await this.getLogoBase64(settings.logoUrl);
        const businessName = settings.businessName || "Your Business";
        const contactName = settings.contactName || "";
        const email = settings.email || "";

        // Standard Colors
        const primaryColor = [37, 99, 235];
        const grayColor = [107, 114, 128];

        // --- HEADER ---
        let logoWidth = 40;
        let logoHeight = 15;
        let logoBottomY = 30;

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
            doc.addImage(logoData, 'PNG', 14, 15, logoWidth, logoHeight);
            logoBottomY = 15 + logoHeight;
        } else {
            doc.setFontSize(22);
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text(businessName, 14, 25);
            logoBottomY = 28;
        }

        // Document Type & Meta (Moved below logo on the left)
        let metaY = logoBottomY + 8;
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(type.toUpperCase(), 14, metaY);

        metaY += 6;
        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        doc.setFont('helvetica', 'normal');

        if (data.reference) {
            doc.text(`Ref: ${data.reference}`, 14, metaY);
            metaY += 5;
        }
        if (data.date) {
            doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 14, metaY);
            metaY += 5;
        }

        // --- CLIENT DETAILS (Moved to Top Right) ---
        let clientY = 18;
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("Prepared For:", 196, clientY, { align: 'right' });

        clientY += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const client = data.client || {};
        doc.text(client.companyName || 'Unknown Client', 196, clientY, { align: 'right' });
        clientY += 5;
        if (client.contactPerson) { doc.text(client.contactPerson, 196, clientY, { align: 'right' }); clientY += 5; }
        if (client.email) { doc.text(client.email, 196, clientY, { align: 'right' }); clientY += 5; }
        if (client.phone) { doc.text(client.phone, 196, clientY, { align: 'right' }); clientY += 5; }

        doc.setDrawColor(229, 231, 235);
        let headerBottom = Math.max(metaY, clientY) + 5;
        doc.line(14, headerBottom, 196, headerBottom);

        // --- DOCUMENT SPECIFIC CONTENT ---
        let finalY = headerBottom + 10;

        if (type === 'Quotation' || type === 'Invoice' || type === 'Receipt') {
            const tableData = data.items.map(item => [
                item.description,
                `R ${Number(item.price).toFixed(2)}`,
                item.quantity,
                `R ${(Number(item.price) * Number(item.quantity)).toFixed(2)}`
            ]);

            doc.autoTable({
                startY: finalY,
                head: [['Description', 'Unit Price', 'Qty', 'Total']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: primaryColor, textColor: 255 },
                alternateRowStyles: { fillColor: [249, 250, 251] },
                margin: { left: 14, right: 14 }
            });

            finalY = doc.lastAutoTable.finalY + 10;

            // Totals
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const totalWidth = doc.internal.pageSize.getWidth();

            doc.text("Subtotal:", totalWidth - 50, finalY, { align: 'right' });
            doc.text(`R ${Number(data.subtotal).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

            if (data.discount) {
                finalY += 6;
                doc.text("Discount:", totalWidth - 50, finalY, { align: 'right' });
                doc.text(`- R ${Number(data.discount).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
            }

            finalY += 8;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Total Due:", totalWidth - 50, finalY, { align: 'right' });
            doc.text(`R ${Number(data.total).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
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
            let bottomSectionY = finalY;

            // Banking Details (Bottom Left)
            let hasBankingDetails = settings.accountHolder || settings.bank || settings.accountType || settings.accountNumber || settings.branchCode;
            if (hasBankingDetails) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Banking Details", 14, bottomSectionY);

                let bankY = bottomSectionY + 6;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                if (settings.accountHolder) { doc.text(`Account Holder: ${settings.accountHolder}`, 14, bankY); bankY += 5; }
                if (settings.bank) { doc.text(`Bank: ${settings.bank}`, 14, bankY); bankY += 5; }
                if (settings.accountType) { doc.text(`Account Type: ${settings.accountType}`, 14, bankY); bankY += 5; }
                if (settings.accountNumber) { doc.text(`Account Number: ${settings.accountNumber}`, 14, bankY); bankY += 5; }
                if (settings.branchCode) { doc.text(`Branch Code: ${settings.branchCode}`, 14, bankY); bankY += 5; }
                doc.text(`Payment Reference: ${data.reference || ''}`, 14, bankY);
            }

            // Business Details (Bottom Right)
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Business Details", 196, bottomSectionY, { align: 'right' });

            let bizY = bottomSectionY + 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            // For business details we only show email, whatsapp, phone, website if they exist,
            // similar to admin invoice
            if (settings.email) {
                doc.text(`Email: ${settings.email}`, 196, bizY, { align: 'right' });
                bizY += 5;
            }
            if (settings.whatsapp) {
                doc.text(`WhatsApp: ${settings.whatsapp}`, 196, bizY, { align: 'right' });
                bizY += 5;
            }
            if (settings.phone) {
                doc.text(`Phone: ${settings.phone}`, 196, bizY, { align: 'right' });
                bizY += 5;
            }
            if (settings.website) {
                doc.text(`Website: ${settings.website}`, 196, bizY, { align: 'right' });
                bizY += 5;
            }
        }

        // --- FOOTER ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(`${businessName} | Generated automatically by CRM`, 14, 285);
            doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
        }

        return doc;
    },

    async download(type, data, filename) {
        const doc = await this.generateDocument(type, data);
        doc.save(filename || `${type}_${data.reference || Date.now()}.pdf`);
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