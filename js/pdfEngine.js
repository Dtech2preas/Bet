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
        const logoData = await this.getLogoBase64();

        // Standard Colors
        const primaryColor = [37, 99, 235]; // D-TECH Blue
        const grayColor = [107, 114, 128];

        // --- HEADER ---
        if (logoData) {
            doc.addImage(logoData, 'PNG', 14, 15, 40, 15);
        } else {
            doc.setFontSize(22);
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text("D-TECH", 14, 25);
        }

        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        doc.setFont('helvetica', 'normal');
        doc.text("Business Management", 14, 32);

        // Document Type & Meta
        doc.setFontSize(24);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(type.toUpperCase(), 196, 25, { align: 'right' });

        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        doc.setFont('helvetica', 'normal');

        let metaY = 32;
        if (data.reference) {
            doc.text(`Ref: ${data.reference}`, 196, metaY, { align: 'right' });
            metaY += 5;
        }
        if (data.date) {
            doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 196, metaY, { align: 'right' });
        }

        // --- CLIENT DETAILS ---
        doc.setDrawColor(229, 231, 235);
        doc.line(14, 45, 196, 45);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("Prepared For:", 14, 55);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const client = data.client || {};
        doc.text(client.companyName || 'Unknown Client', 14, 62);
        doc.text(client.contactPerson || '', 14, 67);
        doc.text(client.email || '', 14, 72);
        doc.text(client.phone || '', 14, 77);

        // --- DOCUMENT SPECIFIC CONTENT ---
        let finalY = 90;

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

            doc.text("Subtotal:", totalWidth - 60, finalY);
            doc.text(`R ${Number(data.subtotal).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

            if (data.discount) {
                finalY += 6;
                doc.text("Discount:", totalWidth - 60, finalY);
                doc.text(`- R ${Number(data.discount).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
            }

            finalY += 8;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Total Due:", totalWidth - 60, finalY);
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
            doc.text("D-TECH Signature", 120, finalY + 5);
        }

        // --- FOOTER ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(`D-TECH Software Solutions | Generated automatically by CRM`, 14, 285);
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