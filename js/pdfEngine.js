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

        const template = (data && data.pdfTemplate) || this.getAdminTemplate() || 'Corporate';
        const isCorporate = template === 'Corporate';
        const isExecutive = template === 'Executive';
        const isCreative = template === 'Creative';

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
        }

        let metaY, clientY, finalY;
        const client = data.client || {};

        if (isCorporate) {
            // Corporate Template Header: Full-width banner
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 45, 'F');

            if (logoData) {
                doc.addImage(logoData, 'PNG', 14, 10, logoWidth, logoHeight);
                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'normal');
                doc.text("THE D-TECH ECOSYSTEM (Pty) Ltd | Reg: 2026/697427/07", 14, 38);
            } else {
                doc.setFontSize(18);
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.text("THE D-TECH ECOSYSTEM (Pty) Ltd", 14, 22);
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'normal');
                doc.text("Reg: 2026/697427/07", 14, 28);
                doc.text("Stand No 762 Kwena Motolo 3, Moletjie, Polokwane, 0709", 14, 34);
            }

            // Doc Type right-aligned inside banner
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text(type.toUpperCase(), 196, 22, { align: 'right' });

            // Meta details right-aligned inside banner below doc type
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'normal');
            if (data.reference) {
                doc.text(`Ref: ${data.reference}`, 196, 29, { align: 'right' });
            }
            if (data.date) {
                doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 196, 35, { align: 'right' });
            }

            // Client Info Box
            clientY = 55;
            doc.setFillColor(245, 245, 245);
            doc.rect(14, 50, 85, 40, 'F');

            doc.setFontSize(10.5);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text("Prepared For:", 18, clientY);

            clientY += 6;
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'normal');
            doc.text(client.companyName || 'Unknown Client', 18, clientY);
            clientY += 5;
            if (client.contactPerson) { doc.text(client.contactPerson, 18, clientY); clientY += 5; }
            if (client.email) { doc.text(client.email, 18, clientY); clientY += 5; }
            if (client.phone) { doc.text(client.phone, 18, clientY); clientY += 5; }

            // Details Info Box (if exists)
            if (data.validUntil || data.dueDate || data.paymentTerms || data.expectedStartDate || data.deliveryTime) {
                let detailY = 55;
                doc.setFillColor(245, 245, 245);
                doc.rect(111, 50, 85, 40, 'F');

                doc.setFontSize(10.5);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text(`${type} Details:`, 115, detailY);

                detailY += 6;
                doc.setFontSize(9.5);
                doc.setFont('helvetica', 'normal');
                const dueVal = type === 'Invoice' ? (data.dueDate || data.validUntil) : data.validUntil;
                if (dueVal) {
                    const deadlineLabel = type === 'Invoice' ? 'Due Date:' : 'Valid Until:';
                    doc.text(`${deadlineLabel} ${new Date(dueVal).toLocaleDateString()}`, 115, detailY);
                    detailY += 5;
                }
                if (data.paymentTerms) { doc.text(`Payment Terms: ${data.paymentTerms}`, 115, detailY); detailY += 5; }
                if (data.expectedStartDate) { doc.text(`Project Start: ${new Date(data.expectedStartDate).toLocaleDateString()}`, 115, detailY); detailY += 5; }
                if (data.deliveryTime) { doc.text(`Delivery Time: ${data.deliveryTime}`, 115, detailY); detailY += 5; }
            }

            finalY = 98;

        } else if (isExecutive) {
            // Executive (Elite Modern) Header: Sleek top brand strip + dark slate doc badge + 2-tone card
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 3.5, 'F');

            if (logoData) {
                doc.addImage(logoData, 'PNG', 14, 12, logoWidth, logoHeight);
                let compY = 12 + logoHeight + 5;
                doc.setFontSize(12);
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'bold');
                doc.text("THE D-TECH ECOSYSTEM (Pty) Ltd", 14, compY);
                doc.setFontSize(8.5);
                doc.setTextColor(...grayColor);
                doc.setFont('helvetica', 'normal');
                doc.text("Reg No: 2026/697427/07", 14, compY + 4.5);
                doc.text("Stand No 762 Kwena Motolo 3, Polokwane, Limpopo, 0709", 14, compY + 9);
            } else {
                doc.setFontSize(18);
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'bold');
                doc.text("THE D-TECH ECOSYSTEM (Pty) Ltd", 14, 20);
                doc.setFontSize(8.5);
                doc.setTextColor(...grayColor);
                doc.setFont('helvetica', 'normal');
                doc.text("Reg No: 2026/697427/07", 14, 26);
                doc.text("Stand No 762 Kwena Motolo 3, Polokwane, Limpopo, 0709", 14, 31);
            }

            // Dark Charcoal Type Pill Badge
            doc.setFillColor(30, 41, 59); // slate-800
            doc.roundedRect(136, 12, 60, 11, 2, 2, 'F');
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text(type.toUpperCase(), 166, 19.5, { align: 'center' });

            let mY = 30;
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text("Reference:", 136, mY);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(data.reference || 'N/A', 196, mY, { align: 'right' });
            mY += 5;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text("Issue Date:", 136, mY);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(data.date ? new Date(data.date).toLocaleDateString() : 'N/A', 196, mY, { align: 'right' });
            mY += 5;

            const dueVal = type === 'Invoice' ? (data.dueDate || data.validUntil) : data.validUntil;
            if (dueVal) {
                const deadlineLabel = type === 'Invoice' ? 'Due Date:' : 'Valid Until:';
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(deadlineLabel, 136, mY);
                doc.setTextColor(...primaryColor);
                doc.setFont('helvetica', 'bold');
                doc.text(new Date(dueVal).toLocaleDateString(), 196, mY, { align: 'right' });
            }

            // Executive 2-Column Info Card
            clientY = 50;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(14, clientY, 182, 34, 2, 2, 'FD');

            // Left: Billed To
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text("BILLED TO", 19, clientY + 6);
            doc.setFontSize(10.5);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(client.companyName || 'Unknown Client', 19, clientY + 12);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            let cp = clientY + 17;
            if (client.contactPerson) { doc.text(`Attn: ${client.contactPerson}`, 19, cp); cp += 4.5; }
            if (client.email) { doc.text(client.email, 19, cp); cp += 4.5; }
            if (client.phone) { doc.text(client.phone, 19, cp); cp += 4.5; }

            // Right: Terms & Logistics
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text("TERMS & LOGISTICS", 110, clientY + 6);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            let tp = clientY + 12;
            if (data.paymentTerms) { doc.text(`Terms: ${data.paymentTerms}`, 110, tp); tp += 4.5; }
            if (data.expectedStartDate) { doc.text(`Project Start: ${new Date(data.expectedStartDate).toLocaleDateString()}`, 110, tp); tp += 4.5; }
            if (data.deliveryTime) { doc.text(`Delivery Time: ${data.deliveryTime}`, 110, tp); tp += 4.5; }

            finalY = clientY + 40;

        } else if (isCreative) {
            // Creative Template Header
            if (logoData) {
                doc.addImage(logoData, 'PNG', 14, 15, logoWidth, logoHeight);
                logoBottomY = 15 + logoHeight;
                doc.setFontSize(10);
                doc.setTextColor(...grayColor);
                doc.setFont('helvetica', 'normal');
                doc.text("THE D-TECH ECOSYSTEM (Pty) Ltd | Reg: 2026/697427/07", 14, logoBottomY + 5);
                logoBottomY += 7;
            } else {
                doc.setFontSize(24);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text("THE D-TECH ECOSYSTEM (Pty) Ltd", 14, 25);
                doc.setFontSize(9);
                doc.setTextColor(...grayColor);
                doc.setFont('helvetica', 'normal');
                doc.text("Reg: 2026/697427/07", 14, 31);
                logoBottomY = 33;
            }

            // Elegant accent line under logo
            doc.setDrawColor(...primaryColor);
            doc.setLineWidth(1.5);
            doc.line(14, logoBottomY + 4, 55, logoBottomY + 4);

            metaY = logoBottomY + 14;
            doc.setFontSize(26);
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text(type.toUpperCase(), 14, metaY);

            metaY += 7;
            doc.setFontSize(10);
            doc.setTextColor(...grayColor);
            doc.setFont('helvetica', 'normal');
            let metaTxt = "";
            if (data.reference) metaTxt += `Ref: ${data.reference}   |   `;
            if (data.date) metaTxt += `Date: ${new Date(data.date).toLocaleDateString()}`;
            doc.text(metaTxt, 14, metaY);

            // Client Info Box pushed down to give whitespace
            clientY = metaY + 12;
            doc.setFontSize(9.5);
            doc.setTextColor(...grayColor);
            doc.setFont('helvetica', 'bold');
            doc.text("PREPARED FOR", 14, clientY);

            clientY += 6;
            doc.setFontSize(13);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(client.companyName || 'Unknown Client', 14, clientY);

            clientY += 5;
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...grayColor);
            if (client.contactPerson) { doc.text(client.contactPerson, 14, clientY); clientY += 4.5; }
            if (client.email) { doc.text(client.email, 14, clientY); clientY += 4.5; }
            if (client.phone) { doc.text(client.phone, 14, clientY); clientY += 4.5; }

            let detailY = 0;
            if (data.validUntil || data.dueDate || data.paymentTerms || data.expectedStartDate || data.deliveryTime) {
                detailY = metaY + 12;
                doc.setFontSize(9.5);
                doc.setTextColor(...grayColor);
                doc.setFont('helvetica', 'bold');
                doc.text("DETAILS", 115, detailY);

                detailY += 6;
                doc.setFontSize(9.5);
                doc.setFont('helvetica', 'normal');
                const dueVal = type === 'Invoice' ? (data.dueDate || data.validUntil) : data.validUntil;
                if (dueVal) {
                    const deadlineLabel = type === 'Invoice' ? 'Due Date:' : 'Valid Until:';
                    doc.text(`${deadlineLabel} ${new Date(dueVal).toLocaleDateString()}`, 115, detailY);
                    detailY += 4.5;
                }
                if (data.paymentTerms) { doc.text(`Payment Terms: ${data.paymentTerms}`, 115, detailY); detailY += 4.5; }
                if (data.expectedStartDate) { doc.text(`Project Start: ${new Date(data.expectedStartDate).toLocaleDateString()}`, 115, detailY); detailY += 4.5; }
                if (data.deliveryTime) { doc.text(`Delivery Time: ${data.deliveryTime}`, 115, detailY); detailY += 4.5; }
            }

            finalY = Math.max(clientY, detailY || 0, metaY + 35) + 8;

        } else {
            // STANDARD / DEFAULT TEMPLATE
            if (logoData) {
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
            metaY = logoBottomY + 8;
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

            // Optional Document Details section (Quote Details / Invoice Details)
            if (data.validUntil || data.dueDate || data.paymentTerms || data.expectedStartDate || data.deliveryTime) {
                clientY += 4;
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text(`${type} Details:`, 196, clientY, { align: 'right' });
                clientY += 5;

                doc.setFont('helvetica', 'normal');
                if (type === 'Invoice') {
                    const dueVal = data.dueDate || data.validUntil;
                    if (dueVal) {
                        doc.text(`Due Date: ${new Date(dueVal).toLocaleDateString()}`, 196, clientY, { align: 'right' });
                        clientY += 5;
                    }
                } else if (data.validUntil) {
                    doc.text(`Valid Until: ${new Date(data.validUntil).toLocaleDateString()}`, 196, clientY, { align: 'right' });
                    clientY += 5;
                }
                if (data.paymentTerms) {
                    doc.text(`Payment Terms: ${data.paymentTerms}`, 196, clientY, { align: 'right' });
                    clientY += 5;
                }
                if (data.expectedStartDate) {
                    doc.text(`Project Start: ${new Date(data.expectedStartDate).toLocaleDateString()}`, 196, clientY, { align: 'right' });
                    clientY += 5;
                }
                if (data.deliveryTime) {
                    doc.text(`Delivery Time: ${data.deliveryTime}`, 196, clientY, { align: 'right' });
                    clientY += 5;
                }
            }

            doc.setDrawColor(229, 231, 235);
            let headerBottom = Math.max(metaY, clientY) + 5;
            doc.line(14, headerBottom, 196, headerBottom);

            finalY = headerBottom + 10;
        }

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
            let alternateRowStyles = { fillColor: [249, 250, 251] };

            if (isCorporate) {
                theme = 'grid';
                headStyles = { fillColor: primaryColor, textColor: 255, lineWidth: 0.1, lineColor: 200 };
            } else if (isExecutive) {
                theme = 'grid';
                headStyles = { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] };
                bodyStyles = { lineColor: [226, 232, 240], lineWidth: 0.1 };
                alternateRowStyles = { fillColor: [248, 250, 252] };
            } else if (isCreative) {
                theme = 'plain';
                headStyles = { fillColor: [255, 255, 255], textColor: primaryColor, fontStyle: 'bold', lineWidth: 0 };
                bodyStyles = { lineWidth: 0, borderBottom: [0.5, 'solid', '#eee'] };
                alternateRowStyles = {};
            }

            doc.autoTable({
                startY: finalY,
                head: [['Description', 'Unit Price', 'Qty', 'Total']],
                body: tableData,
                theme: theme,
                headStyles: headStyles,
                bodyStyles: bodyStyles,
                alternateRowStyles: alternateRowStyles,
                columnStyles: {
                    0: { halign: 'left' },
                    1: { halign: 'right' },
                    2: { halign: 'center' },
                    3: { halign: 'right' }
                },
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

            const isNPO = data.paymentTerms === 'D-TECH NPO Program';
            const itemsSum = (data.items || []).reduce((acc, it) => acc + (Number(it.price) * Number(it.quantity || 1)), 0);
            const standardSubtotal = Number(data.standardTotal) || Number(data.subtotal) || itemsSum;
            const npoTotal = Number(data.total) || (standardSubtotal >= 1000 ? 1000 : standardSubtotal);
            const npoSubsidy = Number(data.npoSubsidy) || (standardSubtotal > npoTotal ? (standardSubtotal - npoTotal) : 0);

            if (isNPO) {
                // When D-TECH NPO Program is selected:
                if (npoSubsidy > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...grayColor);
                    doc.text("Standard Market Value:", totalWidth - 65, finalY, { align: 'right' });
                    doc.text(`R ${standardSubtotal.toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
                    finalY += 6;

                    doc.setTextColor(5, 150, 105); // emerald-600
                    doc.setFont('helvetica', 'bold');
                    doc.text("D-TECH NPO Subsidy Contribution:", totalWidth - 65, finalY, { align: 'right' });
                    doc.text(`- R ${npoSubsidy.toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });
                    finalY += 7;
                }

                finalY += 2;
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...primaryColor);
                doc.text("Total Due (NPO Flat Rate):", totalWidth - 65, finalY, { align: 'right' });
                doc.text(`R ${npoTotal.toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

                finalY += 7;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...primaryColor);
                doc.text("Due Before Project Start (50% Deposit):", totalWidth - 65, finalY, { align: 'right' });
                doc.text(`R ${(npoTotal * 0.5).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

                finalY += 5;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...grayColor);
                doc.text("Balance Due on Website Approval (50%):", totalWidth - 65, finalY, { align: 'right' });
                doc.text(`R ${(npoTotal * 0.5).toFixed(2)}`, totalWidth - 14, finalY, { align: 'right' });

                finalY += 6;
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(5, 150, 105);
                doc.text("Level 2 Web Development NPO Program flat rate applied.", totalWidth - 14, finalY, { align: 'right' });

                finalY += 5;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(...grayColor);
                doc.text("Prices are not subject to VAT (Non-VAT vendor).", totalWidth - 14, finalY, { align: 'right' });
                doc.setTextColor(0, 0, 0);
            } else if (vatAmt === 0) {
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

                if ((type === 'Quotation' || type === 'Invoice') && data.paymentTerms === '50% Deposit') {
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

                if ((type === 'Quotation' || type === 'Invoice') && data.paymentTerms === '50% Deposit') {
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
            doc.text("THE D-TECH ECOSYSTEM (Pty) Ltd Signature", 120, finalY + 5);
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
            doc.text("Account Holder: THE D-TECH ECOSYSTEM (PTY) LTD", 14, bankY);
            bankY += 5;
            doc.text("Bank: Capitec Business", 14, bankY);
            bankY += 5;
            doc.text("Account Type: Current", 14, bankY);
            bankY += 5;
            doc.text("Account Number: 1056046651", 14, bankY);
            bankY += 5;
            doc.text("Branch Code: 450105", 14, bankY);
            bankY += 5;
            doc.text(`Payment Reference: ${data.reference || ''}`, 14, bankY);
            bankY += 4.5;
            doc.setFontSize(8);
            doc.setTextColor(...grayColor);
            const refPrompt = type === 'Invoice'
                ? "(Please use invoice reference as bank payment reference)"
                : "(Please use quote reference as bank payment reference)";
            doc.text(refPrompt, 14, bankY);
            doc.setTextColor(0, 0, 0);

            // Business Details (Bottom Right)
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Business Details", 196, bottomSectionY, { align: 'right' });

            let bizY = bottomSectionY + 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text("Email: info@dtech-services.co.za", 196, bizY, { align: 'right' });
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
        const cleanName = filename || `${type}_${data.reference || Date.now()}.pdf`;
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const base64 = doc.output('datauristring').split(',')[1];
            saveFileNative(base64, cleanName);
        } else {
            doc.save(cleanName);
        }
    },

    getAdminTemplate() {
        return localStorage.getItem('dtech_admin_pdf_template') || 'Corporate';
    },

    setAdminTemplate(tpl) {
        localStorage.setItem('dtech_admin_pdf_template', tpl);
        document.querySelectorAll('.admin-pdf-template-select').forEach(sel => {
            if (sel.value !== tpl) sel.value = tpl;
        });
    },

    initTemplateSelect() {
        const current = this.getAdminTemplate();
        document.querySelectorAll('.admin-pdf-template-select').forEach(sel => {
            sel.value = current;
        });
    },

    async previewSample(templateName) {
        const currentTpl = templateName || this.getAdminTemplate();
        const sampleData = {
            reference: 'INV-2026-001',
            date: new Date().toISOString(),
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
            paymentTerms: '50% Deposit',
            pdfTemplate: currentTpl,
            client: {
                companyName: 'Acme Enterprises (Pty) Ltd',
                contactPerson: 'Thabo Mokoena',
                email: 'finance@acme-enterprises.co.za',
                phone: '082 555 1234'
            },
            items: [
                { description: 'Cloud Infrastructure & High Availability Setup', price: 6500, quantity: 1 },
                { description: 'Custom SaaS Portal Development (Sprint 1)', price: 12500, quantity: 1 },
                { description: 'Automated Tax & Financial Module Integration', price: 3800, quantity: 1 }
            ],
            subtotal: 22800,
            vatPct: 15,
            vatAmt: 3420,
            total: 26220,
            customerNotes: 'Payment is due within 14 days of invoice issue. Thank you for your business!'
        };
        return this.preview('Invoice', sampleData);
    },

    async preview(type, data) {
        const doc = await this.generateDocument(type, data);
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
            if (typeof Swal !== 'undefined') {
                const tplName = (data && data.pdfTemplate) || this.getAdminTemplate();
                Swal.fire({
                    title: `${type} Preview (${tplName})`,
                    html: `<iframe src="${blobUrl}" style="width:100%; height:75vh; border:none; border-radius:8px;"></iframe>`,
                    width: '900px',
                    showCloseButton: true,
                    showConfirmButton: false
                });
            } else {
                window.location.href = blobUrl;
            }
        }
    }
};

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { if (typeof pdfEngine !== 'undefined') pdfEngine.initTemplateSelect(); });
    } else {
        if (typeof pdfEngine !== 'undefined') pdfEngine.initTemplateSelect();
    }
}
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

pdfEngine.generateIncomeStatementPDF = function(transactions, startDate, endDate) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let revenue = 0;
        let cogs = 0;
        let expenses = 0;

        const revData = [];
        const expData = [];
        const cogsData = [];

        // Aggregate by category
        const categoryTotals = {};
        transactions.forEach(t => {
            const cat = t.category || 'Uncategorized';
            if (!categoryTotals[cat]) {
                categoryTotals[cat] = { total: 0, type: t.type };
            }
            categoryTotals[cat].total += parseFloat(t.amount);
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

        doc.setFontSize(20);
        doc.text('Income Statement', 14, 20);
        doc.setFontSize(10);
        doc.text(`For the period: ${startDate} to ${endDate}`, 14, 28);

        let startY = 40;

        // Revenue Section
        doc.setFontSize(12);
        doc.text('Revenue', 14, startY - 2);
        doc.autoTable({
            startY: startY,
            head: [['Account', 'Amount']],
            body: revData.length > 0 ? revData : [['No Revenue', 'R 0.00']],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // COGS
        if (cogsData.length > 0) {
            startY = doc.lastAutoTable.finalY + 10;
            doc.text('Cost of Goods Sold', 14, startY - 2);
            doc.autoTable({
                startY: startY,
                head: [['Account', 'Amount']],
                body: cogsData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] }
            });
        }

        startY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Gross Profit: R ${grossProfit.toFixed(2)}`, 14, startY);

        // Expenses Section
        startY += 15;
        doc.text('Operating Expenses', 14, startY - 2);
        doc.autoTable({
            startY: startY,
            head: [['Account', 'Amount']],
            body: expData.length > 0 ? expData : [['No Expenses', 'R 0.00']],
            theme: 'grid',
            headStyles: { fillColor: [192, 57, 43] }
        });

        startY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Net Profit: R ${netProfit.toFixed(2)}`, 14, startY);


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

        let assets = 0;
        let liabilities = 0;
        let equity = 0;
        let netIncome = 0; // Accumulated net income to date

        const assetData = [];
        const liabilityData = [];
        const equityData = [];

        // Aggregate by category
        const categoryTotals = {};
        transactions.forEach(t => {
            const cat = t.category || 'Uncategorized';
            let accntType = t.type === 'Income' ? 'Income' : 'Expense';
            if (typeof financialsManager !== 'undefined' && financialsManager.chartOfAccounts) {
                const accDef = financialsManager.chartOfAccounts.find(a => a.name.toLowerCase() === cat.toLowerCase());
                if (accDef) accntType = accDef.type;
            }

            if (!categoryTotals[cat]) {
                categoryTotals[cat] = { total: 0, type: accntType };
            }

            // Adjust balances based on debits/credits basic logic
            if (accntType === 'Income') categoryTotals[cat].total += parseFloat(t.amount);
            else if (accntType === 'Expense') categoryTotals[cat].total += parseFloat(t.amount);
            else if (accntType === 'Asset') {
                if (t.type === 'Income') categoryTotals[cat].total += parseFloat(t.amount); // Increase asset
                else categoryTotals[cat].total -= parseFloat(t.amount); // Decrease asset
            }
            else if (accntType === 'Liability' || accntType === 'Equity') {
                if (t.type === 'Income') categoryTotals[cat].total += parseFloat(t.amount); // Increase liability/equity
                else categoryTotals[cat].total -= parseFloat(t.amount); // Decrease liability/equity
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

        // If no explicit Cash in Bank asset transaction was recorded, the accumulated net income/cashflow is represented as Cash & Cash Equivalents
        const hasCashAsset = assetData.some(([name]) => name.toLowerCase().includes('cash') || name.toLowerCase().includes('bank'));
        if (!hasCashAsset && netIncome !== 0) {
            const bankCash = Math.max(0, netIncome);
            assets += bankCash;
            assetData.push(['Cash & Cash Equivalents (Bank Balance)', `R ${bankCash.toFixed(2)}`]);
        }

        // Retained Earnings (Net Income) goes to Equity
        equity += netIncome;
        equityData.push(['Retained Earnings (Net Income)', `R ${netIncome.toFixed(2)}`]);

        doc.setFontSize(20);
        doc.text('Balance Sheet', 14, 20);
        doc.setFontSize(10);
        doc.text(`As of: ${asOfDate}`, 14, 28);

        let startY = 40;

        // Assets
        doc.setFontSize(12);
        doc.text('Assets', 14, startY - 2);
        doc.autoTable({
            startY: startY,
            head: [['Account', 'Amount']],
            body: assetData.length > 0 ? assetData : [['No Assets', 'R 0.00']],
            theme: 'grid',
            headStyles: { fillColor: [39, 174, 96] }
        });

        startY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Assets: R ${assets.toFixed(2)}`, 14, startY);

        // Liabilities
        startY += 15;
        doc.setFont('helvetica', 'normal');
        doc.text('Liabilities', 14, startY - 2);
        doc.autoTable({
            startY: startY,
            head: [['Account', 'Amount']],
            body: liabilityData.length > 0 ? liabilityData : [['No Liabilities', 'R 0.00']],
            theme: 'grid',
            headStyles: { fillColor: [192, 57, 43] }
        });

        startY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Liabilities: R ${liabilities.toFixed(2)}`, 14, startY);

        // Equity
        startY += 15;
        doc.setFont('helvetica', 'normal');
        doc.text('Equity', 14, startY - 2);
        doc.autoTable({
            startY: startY,
            head: [['Account', 'Amount']],
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
