// js/pdfEngine.js

// Make sure jspdf is loaded in the HTML
const pdfEngine = {
    async getLogoBase64() {
        try {
            const response = await fetch('logo.png');
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
            console.warn("Logo not found, using text fallback");
        }
        return null;
    },

    async generateDocument(type, data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        if (typeof doc.setR2L === 'function') {
            doc.setR2L(false); // Fix potential RTL text reversal bug
        }
        const logoData = await this.getLogoBase64();

        // Standard Colors
        const primaryColor = [37, 99, 235]; // D-TECH Blue
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

            // Add business name under logo
            doc.setFontSize(14);
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text("THE D-TECH ECOSYSTEM (Pty) Ltd", 14, logoBottomY + 6);
            logoBottomY += 8;
        } else {
            doc.setFontSize(22);
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text("THE D-TECH ECOSYSTEM (Pty) Ltd", 14, 25);
            logoBottomY = 28;
        }

        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        doc.setFont('helvetica', 'normal');
        doc.text("Reg No: 2026/697427/07", 14, logoBottomY + 5);
        doc.text("Stand No 762 Kwena Motolo 3, Moletjie, Polokwane, Limpopo, 0709", 14, logoBottomY + 10);
        logoBottomY += 12;

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

            const total = Number(data.total) || 0;
            const vatAmt = Number(data.vatAmt) || 0;
            const exclVat = total - vatAmt;

            if (vatAmt === 0) {
                // When VAT is 0, just show discount if any, and Total
                if (data.discountAmt && Number(data.discountAmt) > 0) {
                    doc.text("Discount:", totalWidth - 50, finalY, { align: 'right' });
                    doc.text(`- R ${Number(data.discountAmt).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
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
                doc.text("Subtotal (Excl. VAT):", totalWidth - 50, finalY, { align: 'right' });
                doc.text(`R ${exclVat.toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

                if (data.discountAmt && Number(data.discountAmt) > 0) {
                    finalY += 6;
                    doc.text("Discount:", totalWidth - 50, finalY, { align: 'right' });
                    doc.text(`- R ${Number(data.discountAmt).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
                }

                finalY += 6;
                doc.text(`VAT (${data.vatPct}%):`, totalWidth - 50, finalY, { align: 'right' });
                doc.text(`R ${vatAmt.toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

                finalY += 8;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Total Due (Incl. VAT):", totalWidth - 50, finalY, { align: 'right' });
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
            doc.text("THE D-TECH ECOSYSTEM (Pty) Ltd Signature", 120, finalY + 5);
        }

        if (type === 'Quotation' || type === 'Invoice') {
            finalY += 15;

            let bottomSectionY = finalY;

            // Banking Details (Bottom Left)
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Banking Details", 14, bottomSectionY);

            let bankY = bottomSectionY + 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text("Account Holder: MR SJ MOCHEBANE", 14, bankY);
            bankY += 5;
            doc.text("Bank: Capitec Bank", 14, bankY);
            bankY += 5;
            doc.text("Account Type: Savings", 14, bankY);
            bankY += 5;
            doc.text("Account Number: 1988749210", 14, bankY);
            bankY += 5;
            doc.text("Branch Code: 470010", 14, bankY);
            bankY += 5;
            doc.text(`Payment Reference: ${data.reference || ''}`, 14, bankY);

            // Business Details (Bottom Right)
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Business Details", 196, bottomSectionY, { align: 'right' });

            let bizY = bottomSectionY + 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text("Email: dtech2services@gmail.com", 196, bizY, { align: 'right' });
            bizY += 5;
            doc.text("WhatsApp: 0670015423", 196, bizY, { align: 'right' });
            bizY += 5;
            doc.text("Website: www.dtech-services.co.za", 196, bizY, { align: 'right' });
        }

        // Thank you note
        finalY = doc.internal.pageSize.getHeight() - 25; // fixed position above footer
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...primaryColor);
        doc.text("Thank you for choosing THE D-TECH ECOSYSTEM (Pty) Ltd", 105, finalY, { align: 'center' });

        // --- FOOTER ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(`THE D-TECH ECOSYSTEM (Pty) Ltd | Generated automatically by CRM`, 14, 285);
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