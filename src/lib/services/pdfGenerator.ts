import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtDate, fmtINR } from '../utils/formatters';

// Brand colors
const PRIMARY_COLOR: [number, number, number] = [15, 23, 42]; // Slate 900
const TEXT_MUTED: [number, number, number] = [100, 116, 139]; // Slate 500
const SUCCESS_COLOR: [number, number, number] = [22, 163, 74]; // Green 600
const WARNING_COLOR: [number, number, number] = [217, 119, 6]; // Amber 600

export async function generateBookingInvoicePDF(
  booking: any,
  payments: any[],
  property: any,
  customer: any,
  businessSettings: any,
  totalPaid: number,
  balanceDue: number
) {
  const doc = new jsPDF();
  let yPos = 20;

  // Header / Property Info
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(businessSettings.name || 'Hotel/Homestay', 14, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  
  if (property.name) {
    doc.text(property.name, 14, yPos);
    yPos += 5;
  }
  if (property.address) {
    const splitAddress = doc.splitTextToSize(property.address, 90);
    doc.text(splitAddress, 14, yPos);
    yPos += 5 * splitAddress.length;
  }
  if (property.city || property.state || property.pincode) {
    doc.text(`${property.city || ''} ${property.state || ''} ${property.pincode || ''}`.trim(), 14, yPos);
    yPos += 5;
  }
  
  let contactStr = '';
  if (property.phone) contactStr += property.phone;
  if (property.phone && property.email) contactStr += ' | ';
  if (property.email) contactStr += property.email;
  if (contactStr) {
    doc.text(contactStr, 14, yPos);
    yPos += 5;
  }
  if (property.gstin || businessSettings.gstin) {
    doc.text(`GSTIN: ${property.gstin || businessSettings.gstin}`, 14, yPos);
    yPos += 5;
  }

  // Right side header (Invoice details)
  let rightY = 20;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('INVOICE', 196, rightY, { align: 'right' });
  
  rightY += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Invoice Number', 196, rightY, { align: 'right' });
  rightY += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`INV-${booking.booking_no}`, 196, rightY, { align: 'right' });
  
  rightY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Invoice Date', 196, rightY, { align: 'right' });
  rightY += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(fmtDate(new Date().toISOString()), 196, rightY, { align: 'right' });
  
  rightY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Payment Status', 196, rightY, { align: 'right' });
  rightY += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  let statusText = 'UNPAID';
  if (balanceDue <= 0) statusText = 'PAID';
  else if (totalPaid > 0) statusText = 'PARTIALLY PAID';
  
  if (statusText === 'PAID') doc.setTextColor(...SUCCESS_COLOR);
  else if (statusText === 'PARTIALLY PAID') doc.setTextColor(...WARNING_COLOR);
  else doc.setTextColor(220, 38, 38); // Red
  
  doc.text(statusText, 196, rightY, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  yPos = Math.max(yPos, rightY) + 12;

  // Divider
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(14, yPos, 196, yPos);
  yPos += 8;

  // Billed To & Stay
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Billed To', 14, yPos);
  doc.text('Stay', 105, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(customer.name || 'N/A', 14, yPos);
  doc.text(`${fmtDate(booking.check_in)} — ${fmtDate(booking.check_out)}`, 105, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  if (customer.phone) doc.text(customer.phone, 14, yPos);
  doc.text(`${booking.nights} night${booking.nights !== 1 ? 's' : ''}, ${booking.rooms} room${booking.rooms !== 1 ? 's' : ''}`, 105, yPos);
  
  yPos += 5;
  if (customer.email) doc.text(customer.email, 14, yPos);
  doc.text(`${booking.room_type || 'Standard'} Room`, 105, yPos);
  
  yPos += 12;

  // CHARGES TABLE
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('CHARGES', 14, yPos);
  yPos += 4;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Rate', 'Total']],
    body: [
      [
        `Accommodation Charges\n${booking.rooms} room${booking.rooms > 1 ? 's' : ''} × ${booking.nights} night${booking.nights > 1 ? 's' : ''}`,
        '—', // We don't store daily rate directly, so we'll just dash it out
        fmtINR(booking.base_amount)
      ]
    ],
    theme: 'plain',
    headStyles: { fillColor: [247, 249, 252], textColor: [71, 85, 105], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // Totals Breakdown
  const summaryRows = [];
  summaryRows.push(['Subtotal', fmtINR(booking.base_amount)]);
  if (booking.discount > 0) {
    summaryRows.push(['Discount', `-${fmtINR(booking.discount)}`]);
  }
  if (booking.tax_enabled && booking.tax_amount > 0) {
    summaryRows.push([`GST (${booking.tax_rate}%)`, fmtINR(booking.tax_amount)]);
  }
  
  autoTable(doc, {
    startY: yPos,
    body: summaryRows,
    theme: 'plain',
    styles: { fontSize: 10, halign: 'right', textColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 42 }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  // Total Booking Amount
  doc.setDrawColor(226, 232, 240);
  doc.line(100, yPos, 196, yPos);
  yPos += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Total Booking Amount', 140, yPos);
  doc.text(fmtINR(booking.grand_total), 196, yPos, { align: 'right' });
  
  yPos += 15;

  // PAYMENT SUMMARY & PROGRESS
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('PAYMENT SUMMARY', 14, yPos);
  yPos += 8;

  // Draw simple stats
  doc.setFontSize(10);
  doc.setTextColor(0,0,0);
  doc.setFont('helvetica', 'normal');
  doc.text('Booking Total', 14, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtINR(booking.grand_total), 14, yPos + 5);

  doc.setFont('helvetica', 'normal');
  doc.text('Total Paid', 74, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtINR(totalPaid), 74, yPos + 5);

  doc.setFont('helvetica', 'normal');
  doc.text('Amount Due', 134, yPos);
  doc.setFont('helvetica', 'bold');
  if (balanceDue > 0) doc.setTextColor(...WARNING_COLOR);
  else doc.setTextColor(...SUCCESS_COLOR);
  doc.text(fmtINR(balanceDue), 134, yPos + 5);
  
  yPos += 12;

  // Progress Bar
  const barWidth = 182;
  const barHeight = 6;
  let percent = 0;
  if (booking.grand_total > 0) {
    percent = Math.min(100, Math.max(0, (totalPaid / booking.grand_total) * 100));
  }
  
  // Bar background
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.rect(14, yPos, barWidth, barHeight, 'F');
  
  // Bar fill
  if (percent > 0) {
    if (percent >= 100) doc.setFillColor(...SUCCESS_COLOR);
    else doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(14, yPos, (barWidth * percent) / 100, barHeight, 'F');
  }

  yPos += 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  if (percent >= 100) {
    doc.setTextColor(...SUCCESS_COLOR);
    doc.text('PAID IN FULL', 14, yPos);
  } else if (percent > 0) {
    doc.setTextColor(...WARNING_COLOR);
    doc.text(`${percent.toFixed(0)}% PAID`, 14, yPos);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text('UNPAID', 14, yPos);
  }
  
  yPos += 15;

  // PAYMENT TIMELINE
  const validPayments = payments
    .filter(p => p.status === 'Completed' || p.status === 'Recorded' || p.status === 'Refunded')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (validPayments.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('PAYMENT HISTORY', 14, yPos);
    yPos += 4;

    let cumulative = 0;
    const paymentRows = validPayments.map(p => {
      const pAmt = p.status === 'Refunded' ? -p.amount : p.amount;
      cumulative += pAmt;
      const remaining = Math.max(0, booking.grand_total - cumulative);
      return [
        fmtDate(p.date),
        p.purpose || (p.status === 'Refunded' ? 'Refund' : 'Payment'),
        p.method,
        fmtINR(pAmt),
        fmtINR(cumulative),
        fmtINR(remaining)
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Purpose', 'Method', 'Amount', 'Total Paid', 'Remaining Due']],
      body: paymentRows,
      theme: 'striped',
      headStyles: { fillColor: [247, 249, 252], textColor: [71, 85, 105], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos > pageHeight - 30) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos = pageHeight - 30;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(14, yPos, 196, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Thank you for staying with us.', 105, yPos, { align: 'center' });
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('This invoice is computer-generated and does not require a signature.', 105, yPos, { align: 'center' });
  if (property.phone || property.email) {
    yPos += 4;
    doc.text(`For queries, contact: ${property.phone || ''} ${property.email ? `| ${property.email}` : ''}`.trim(), 105, yPos, { align: 'center' });
  }

  return doc;
}

export async function generatePaymentReceiptPDF(
  booking: any,
  payment: any,
  property: any,
  customer: any,
  businessSettings: any,
  previouslyPaid: number,
  balanceDue: number
) {
  const doc = new jsPDF();
  let yPos = 20;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(businessSettings.name || 'Hotel/Homestay', 14, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  
  if (property.name) {
    doc.text(property.name, 14, yPos);
    yPos += 5;
  }
  if (property.address) {
    const splitAddress = doc.splitTextToSize(property.address, 100);
    doc.text(splitAddress, 14, yPos);
    yPos += 5 * splitAddress.length;
  }
  if (property.city || property.state || property.pincode) {
    doc.text(`${property.city || ''} ${property.state || ''} ${property.pincode || ''}`.trim(), 14, yPos);
    yPos += 5;
  }
  
  // Right side header (Receipt details)
  let rightY = 20;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('PAYMENT RECEIPT', 196, rightY, { align: 'right' });
  
  rightY += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Receipt Number', 196, rightY, { align: 'right' });
  rightY += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(payment.payment_no, 196, rightY, { align: 'right' });

  rightY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Payment Date', 196, rightY, { align: 'right' });
  rightY += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(fmtDate(payment.date), 196, rightY, { align: 'right' });

  yPos = Math.max(yPos, rightY) + 12;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, yPos, 196, yPos);
  yPos += 15;

  // BIG PAYMENT DISPLAY
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('PAYMENT RECEIVED', 105, yPos, { align: 'center' });
  yPos += 12;

  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(fmtINR(payment.amount), 105, yPos, { align: 'center' });
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`via ${payment.method}${payment.ref_id ? ` (Ref: ${payment.ref_id})` : ''}`, 105, yPos, { align: 'center' });
  
  yPos += 20;

  // Billed To & Booking Info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Received From', 14, yPos);
  doc.text('Booking Details', 105, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(customer.name || 'N/A', 14, yPos);
  doc.text(booking.booking_no, 105, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  if (customer.phone) doc.text(customer.phone, 14, yPos);
  doc.text(`${fmtDate(booking.check_in)} — ${fmtDate(booking.check_out)}`, 105, yPos);
  
  yPos += 15;

  // SUMMARY TABLE (Visual representation)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('PAYMENT SUMMARY', 14, yPos);
  yPos += 4;

  const totalPaidAfter = previouslyPaid + payment.amount;

  autoTable(doc, {
    startY: yPos,
    body: [
      ['Total Booking Amount', fmtINR(booking.grand_total)],
      ['Previously Paid', fmtINR(previouslyPaid)],
      ['This Payment', fmtINR(payment.amount)],
      ['Total Paid', fmtINR(totalPaidAfter)],
      ['Amount Due', fmtINR(balanceDue)]
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 140, textColor: [71, 85, 105] },
      1: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: function(data) {
      if (data.row.index === 2) { // This Payment
        data.cell.styles.textColor = [15, 23, 42]; // Darker
        data.cell.styles.fontSize = 11;
      }
      if (data.row.index === 4) { // Amount Due
        data.cell.styles.textColor = balanceDue > 0 ? WARNING_COLOR : SUCCESS_COLOR;
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  if (balanceDue <= 0) {
    doc.setTextColor(...SUCCESS_COLOR);
    doc.text('PAID IN FULL', 105, yPos, { align: 'center' });
  } else {
    doc.setTextColor(...WARNING_COLOR);
    doc.text('PARTIALLY PAID', 105, yPos, { align: 'center' });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  yPos = pageHeight - 30;

  doc.setDrawColor(226, 232, 240);
  doc.line(14, yPos, 196, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Thank you for your payment.', 105, yPos, { align: 'center' });
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('This receipt is computer-generated and does not require a signature.', 105, yPos, { align: 'center' });

  return doc;
}
