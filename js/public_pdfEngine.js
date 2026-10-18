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

            let logoX = 14;
            if (settings.userPlan === 'Premium' && settings.pdfTemplate === 'Modern') {
                logoX = 196 - logoWidth; // align right
            }

            doc.addImage(logoData, 'PNG', logoX, 15, logoWidth, logoHeight);
            logoBottomY = 15 + logoHeight;
        } else {
            doc.setFontSize(22);
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            let txtX = 14;
            if (settings.userPlan === 'Premium' && settings.pdfTemplate === 'Modern') {
                txtX = 196;
                doc.text(businessName, txtX, 25, { align: 'right' });
            } else {
                doc.text(businessName, txtX, 25);
            }
            logoBottomY = 28;
        }

        // Document Type & Meta (Moved below logo on the left)
        let metaY = logoBottomY + 8;

        let metaAlign = 'left';
        let metaX = 14;

        if (settings.userPlan === 'Premium' && settings.pdfTemplate === 'Modern') {
            metaAlign = 'right';
            metaX = 196;
            metaY = 20;

            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(130, metaY - 8, 80, 12, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(type.toUpperCase(), metaX - 5, metaY, { align: metaAlign });

            metaY += 10;
        } else {
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(type.toUpperCase(), metaX, metaY, { align: metaAlign });
            metaY += 6;
        }

        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        doc.setFont('helvetica', 'normal');

        if (data.reference) {
            doc.text(`Ref: ${data.reference}`, metaX, metaY, { align: metaAlign });
            metaY += 5;
        }
        if (data.date) {
            doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, metaX, metaY, { align: metaAlign });
            metaY += 5;
        }

        // --- CLIENT DETAILS (Moved to Top Right) ---
        let clientY = 18;

        let clientAlign = 'right';
        let clientX = 196;

        if (settings.userPlan === 'Premium' && settings.pdfTemplate === 'Modern') {
            clientAlign = 'left';
            clientX = 14;
            clientY = 50;
        }

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("Prepared For:", clientX, clientY, { align: clientAlign });

        clientY += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const client = data.client || {};
        doc.text(client.companyName || 'Unknown Client', clientX, clientY, { align: clientAlign });
        clientY += 5;
        if (client.contactPerson) { doc.text(client.contactPerson, clientX, clientY, { align: clientAlign }); clientY += 5; }
        if (client.email) { doc.text(client.email, clientX, clientY, { align: clientAlign }); clientY += 5; }
        if (client.phone) { doc.text(client.phone, clientX, clientY, { align: clientAlign }); clientY += 5; }

        // Optional Document Details section (Quote Details / Invoice Details)
        if (data.validUntil || data.paymentTerms || data.expectedStartDate || data.deliveryTime) {
            clientY += 4;
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(`${type} Details:`, clientX, clientY, { align: clientAlign });
            clientY += 5;

            doc.setFont('helvetica', 'normal');
            if (data.validUntil) {
                doc.text(`Valid Until: ${new Date(data.validUntil).toLocaleDateString()}`, clientX, clientY, { align: clientAlign });
                clientY += 5;
            }
            if (data.paymentTerms) {
                doc.text(`Payment Terms: ${data.paymentTerms}`, clientX, clientY, { align: clientAlign });
                clientY += 5;
            }
            if (data.expectedStartDate) {
                doc.text(`Project Start: ${new Date(data.expectedStartDate).toLocaleDateString()}`, clientX, clientY, { align: clientAlign });
                clientY += 5;
            }
            if (data.deliveryTime) {
                doc.text(`Delivery Time: ${data.deliveryTime}`, clientX, clientY, { align: clientAlign });
                clientY += 5;
            }
        }

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

            let theme = 'striped';
            let headStyles = { fillColor: primaryColor, textColor: 255 };

            if (settings.userPlan === 'Premium' && settings.pdfTemplate === 'Modern') {
                theme = 'grid';
                headStyles = { fillColor: [240, 240, 240], textColor: 0, lineWidth: 0.1, lineColor: 200 };
            }

            doc.autoTable({
                startY: finalY,
                head: [['Description', 'Unit Price', 'Qty', 'Total']],
                body: tableData,
                theme: theme,
                headStyles: headStyles,
                alternateRowStyles: { fillColor: [249, 250, 251] },
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

                finalY += 8;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.text("Prices are not subject to VAT (Non-VAT vendor).", totalWidth - 14, finalY, { align: 'right' });
            } else {
                doc.text("Subtotal:", totalWidth - 50, finalY, { align: 'right' });
                doc.text(`R ${subtotal.toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

                if (data.discount) {
                    finalY += 6;
                    doc.text("Discount:", totalWidth - 50, finalY, { align: 'right' });
                    doc.text(`- R ${Number(data.discount).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
                }

                finalY += 8;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Total Due:", totalWidth - 50, finalY, { align: 'right' });
                doc.text(`R ${total.toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
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

            doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });

            // D-TECH Watermark for Free and Pro plans
            if (settings.userPlan !== 'Premium') {
                doc.text(`${businessName} | Generated automatically by CRM`, 14, 285);
                doc.setFontSize(7);
                doc.setTextColor(200, 200, 200);
                doc.text("This document was generated by management.dtech-services.co.za", doc.internal.pageSize.getWidth() / 2, 292, { align: 'center' });
            } else {
                doc.text(`${businessName}`, 14, 285);
            }
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