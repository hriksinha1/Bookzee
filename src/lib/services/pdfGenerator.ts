import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtDate, fmtINR } from '../utils/formatters';

// Bookzee Brand Design Tokens for PDF
const PRIMARY_COLOR: [number, number, number] = [13, 92, 86]; // Forest Teal #0D5C56
const PRIMARY_DARK: [number, number, number] = [9, 63, 59]; // Deep Forest Teal #093F3B
const ACCENT_COLOR: [number, number, number] = [196, 85, 50]; // Warm Terracotta #C45532
const TEXT_DARK: [number, number, number] = [26, 43, 40]; // Deep Charcoal #1A2B28
const TEXT_MUTED: [number, number, number] = [92, 110, 107]; // Muted Sage #5C6E6B
const BORDER_COLOR: [number, number, number] = [216, 210, 197]; // Stone Linen #D8D2C5
const BG_WARM: [number, number, number] = [250, 249, 246]; // Warm Linen #FAF9F6
const BG_TEAL_TINT: [number, number, number] = [232, 243, 241]; // Teal Tint #E8F3F1
const SUCCESS_COLOR: [number, number, number] = [39, 103, 73]; // Sage Green #276749
const WARNING_COLOR: [number, number, number] = [196, 85, 50]; // Warm Terracotta #C45532

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
  doc.text(businessSettings?.name || property?.name || 'Bookzee Stays', 14, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);

  if (property?.name && property.name !== businessSettings?.name) {
    doc.text(property.name, 14, yPos);
    yPos += 5;
  }
  if (property?.address) {
    const splitAddress = doc.splitTextToSize(property.address, 90);
    doc.text(splitAddress, 14, yPos);
    yPos += 5 * splitAddress.length;
  }
  if (property?.city || property?.state || property?.pincode) {
    doc.text(
      `${property.city || ''} ${property.state || ''} ${property.pincode || ''}`.trim(),
      14,
      yPos
    );
    yPos += 5;
  }

  let contactStr = '';
  if (property?.phone) contactStr += property.phone;
  if (property?.phone && property?.email) contactStr += ' | ';
  if (property?.email) contactStr += property.email;
  if (contactStr) {
    doc.text(contactStr, 14, yPos);
    yPos += 5;
  }
  if (property?.gstin || businessSettings?.gstin) {
    doc.text(`GSTIN: ${property.gstin || businessSettings.gstin}`, 14, yPos);
    yPos += 5;
  }

  // Right side header (Invoice details)
  let rightY = 20;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('STAY FOLIO INVOICE', 196, rightY, { align: 'right' });

  rightY += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Invoice Number', 196, rightY, { align: 'right' });
  rightY += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text(`INV-${booking.booking_no}`, 196, rightY, { align: 'right' });

  rightY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Invoice Date', 196, rightY, { align: 'right' });
  rightY += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
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
  if (balanceDue <= 0) statusText = 'PAID IN FULL';
  else if (totalPaid > 0) statusText = 'PARTIALLY PAID';

  if (statusText === 'PAID IN FULL') doc.setTextColor(...SUCCESS_COLOR);
  else if (statusText === 'PARTIALLY PAID') doc.setTextColor(...WARNING_COLOR);
  else doc.setTextColor(...ACCENT_COLOR);

  doc.text(statusText, 196, rightY, { align: 'right' });
  doc.setTextColor(...TEXT_DARK);

  yPos = Math.max(yPos, rightY) + 12;

  // Divider
  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, yPos, 196, yPos);
  yPos += 8;

  // Billed To & Stay
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('GUEST DETAILS', 14, yPos);
  doc.text('STAY ITINERARY', 105, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text(customer.name || 'Valued Guest', 14, yPos);
  doc.text(`${fmtDate(booking.check_in)} — ${fmtDate(booking.check_out)}`, 105, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  if (customer.phone) doc.text(customer.phone, 14, yPos);
  doc.text(
    `${booking.nights} night${booking.nights !== 1 ? 's' : ''}, ${booking.rooms} room${
      booking.rooms !== 1 ? 's' : ''
    }`,
    105,
    yPos
  );

  yPos += 5;
  if (customer.email) doc.text(customer.email, 14, yPos);
  doc.text(`${booking.room_type || 'Standard'} Room`, 105, yPos);

  yPos += 12;

  // CHARGES TABLE
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('TARIFF & CHARGES', 14, yPos);
  yPos += 4;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Units & Nights', 'Total']],
    body: [
      [
        `Accommodation Charges — ${booking.room_type || 'Room'}\n${booking.rooms} room${
          booking.rooms > 1 ? 's' : ''
        } × ${booking.nights} night${booking.nights > 1 ? 's' : ''}`,
        `${booking.rooms} rm × ${booking.nights} nts`,
        fmtINR(booking.base_amount)
      ]
    ],
    theme: 'plain',
    headStyles: {
      fillColor: BG_TEAL_TINT,
      textColor: PRIMARY_COLOR,
      fontStyle: 'bold'
    },
    styles: { fontSize: 10, cellPadding: 5, textColor: TEXT_DARK },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // Totals Breakdown
  const summaryRows = [];
  summaryRows.push(['Base Tariff', fmtINR(booking.base_amount)]);
  if (booking.discount > 0) {
    summaryRows.push(['Special Discount', `-${fmtINR(booking.discount)}`]);
  }
  if (booking.tax_enabled && booking.tax_amount > 0) {
    summaryRows.push([`GST (${booking.tax_rate}%)`, fmtINR(booking.tax_amount)]);
  }

  autoTable(doc, {
    startY: yPos,
    body: summaryRows,
    theme: 'plain',
    styles: { fontSize: 10, halign: 'right', textColor: TEXT_MUTED },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 42 }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  // Total Booking Amount
  doc.setDrawColor(...BORDER_COLOR);
  doc.line(100, yPos, 196, yPos);
  yPos += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Grand Total Amount', 130, yPos);
  doc.text(fmtINR(booking.grand_total), 196, yPos, { align: 'right' });

  yPos += 15;

  // PAYMENT SUMMARY & PROGRESS
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('PAYMENT BALANCE', 14, yPos);
  yPos += 8;

  // Draw simple stats
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  doc.text('Grand Total', 14, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtINR(booking.grand_total), 14, yPos + 5);

  doc.setFont('helvetica', 'normal');
  doc.text('Total Paid', 74, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SUCCESS_COLOR);
  doc.text(fmtINR(totalPaid), 74, yPos + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text('Remaining Due', 134, yPos);
  doc.setFont('helvetica', 'bold');
  if (balanceDue > 0) doc.setTextColor(...ACCENT_COLOR);
  else doc.setTextColor(...SUCCESS_COLOR);
  doc.text(fmtINR(balanceDue), 134, yPos + 5);

  yPos += 14;

  // Progress Bar
  const barWidth = 182;
  const barHeight = 5;
  let percent = 0;
  if (booking.grand_total > 0) {
    percent = Math.min(100, Math.max(0, (totalPaid / booking.grand_total) * 100));
  }

  // Bar background
  doc.setFillColor(...BG_WARM);
  doc.rect(14, yPos, barWidth, barHeight, 'F');

  // Bar fill
  if (percent > 0) {
    if (percent >= 100) doc.setFillColor(...SUCCESS_COLOR);
    else doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(14, yPos, (barWidth * percent) / 100, barHeight, 'F');
  }

  yPos += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  if (percent >= 100) {
    doc.setTextColor(...SUCCESS_COLOR);
    doc.text('✓ FULLY SETTLED', 14, yPos);
  } else if (percent > 0) {
    doc.setTextColor(...ACCENT_COLOR);
    doc.text(`${percent.toFixed(0)}% PAID • ${fmtINR(balanceDue)} PENDING`, 14, yPos);
  } else {
    doc.setTextColor(...ACCENT_COLOR);
    doc.text('PAYMENT PENDING', 14, yPos);
  }

  yPos += 14;

  // PAYMENT TIMELINE
  const validPayments = payments
    .filter((p) => p.status === 'Completed' || p.status === 'Recorded' || p.status === 'Refunded')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (validPayments.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('SETTLEMENT TRANSACTIONS', 14, yPos);
    yPos += 4;

    let cumulative = 0;
    const paymentRows = validPayments.map((p) => {
      const pAmt = p.status === 'Refunded' ? -p.amount : p.amount;
      cumulative += pAmt;
      const remaining = Math.max(0, booking.grand_total - cumulative);
      return [
        fmtDate(p.date),
        p.purpose || (p.status === 'Refunded' ? 'Refund' : 'Advance Payment'),
        p.method,
        fmtINR(pAmt),
        fmtINR(cumulative),
        fmtINR(remaining)
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Purpose', 'Mode', 'Amount', 'Total Paid', 'Balance']],
      body: paymentRows,
      theme: 'striped',
      headStyles: {
        fillColor: BG_TEAL_TINT,
        textColor: PRIMARY_COLOR,
        fontStyle: 'bold'
      },
      styles: { fontSize: 9, cellPadding: 4, textColor: TEXT_DARK },
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

  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, yPos, 196, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Thank you for staying with Bookzee Hospitality.', 105, yPos, { align: 'center' });
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('This folio invoice is electronically generated and fully verified.', 105, yPos, {
    align: 'center'
  });
  if (property?.phone || property?.email) {
    yPos += 4;
    doc.text(
      `Support: ${property.phone || ''} ${property.email ? `| ${property.email}` : ''}`.trim(),
      105,
      yPos,
      { align: 'center' }
    );
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
  doc.text(businessSettings?.name || property?.name || 'Bookzee Stays', 14, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);

  if (property?.name && property.name !== businessSettings?.name) {
    doc.text(property.name, 14, yPos);
    yPos += 5;
  }
  if (property?.address) {
    const splitAddress = doc.splitTextToSize(property.address, 100);
    doc.text(splitAddress, 14, yPos);
    yPos += 5 * splitAddress.length;
  }
  if (property?.city || property?.state || property?.pincode) {
    doc.text(
      `${property.city || ''} ${property.state || ''} ${property.pincode || ''}`.trim(),
      14,
      yPos
    );
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
  doc.setTextColor(...TEXT_DARK);
  doc.text(payment.payment_no, 196, rightY, { align: 'right' });

  rightY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Payment Date', 196, rightY, { align: 'right' });
  rightY += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text(fmtDate(payment.date), 196, rightY, { align: 'right' });

  yPos = Math.max(yPos, rightY) + 12;

  // Divider
  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, yPos, 196, yPos);
  yPos += 15;

  // BIG PAYMENT DISPLAY
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('AMOUNT RECEIVED', 105, yPos, { align: 'center' });
  yPos += 12;

  doc.setFontSize(30);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SUCCESS_COLOR);
  doc.text(fmtINR(payment.amount), 105, yPos, { align: 'center' });
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    `Received via ${payment.method}${payment.ref_id ? ` (Txn / UTR: ${payment.ref_id})` : ''}`,
    105,
    yPos,
    { align: 'center' }
  );

  yPos += 20;

  // Received From & Booking Info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('RECEIVED FROM', 14, yPos);
  doc.text('RESERVATION DETAILS', 105, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text(customer.name || 'Valued Guest', 14, yPos);
  doc.text(booking.booking_no, 105, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  if (customer.phone) doc.text(customer.phone, 14, yPos);
  doc.text(`${fmtDate(booking.check_in)} — ${fmtDate(booking.check_out)}`, 105, yPos);

  yPos += 5;
  if (customer.email) doc.text(customer.email, 14, yPos);
  doc.text(`${property?.name || 'Homestay'}`, 105, yPos);

  yPos += 15;

  // Settlement Breakdown Table
  const totalSettled = previouslyPaid + payment.amount;
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: [
      ['Reservation Total', fmtINR(booking.grand_total)],
      ['Previously Settled', fmtINR(previouslyPaid)],
      ['Current Transaction', fmtINR(payment.amount)],
      ['Cumulative Total Paid', fmtINR(totalSettled)],
      ['Outstanding Balance Due', fmtINR(Math.max(0, balanceDue))]
    ],
    theme: 'plain',
    headStyles: {
      fillColor: BG_TEAL_TINT,
      textColor: PRIMARY_COLOR,
      fontStyle: 'bold'
    },
    styles: { fontSize: 10, cellPadding: 4, textColor: TEXT_DARK },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  yPos = Math.max(yPos, pageHeight - 30);

  doc.setDrawColor(...BORDER_COLOR);
  doc.line(14, yPos, 196, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Payment verified and recorded in Bookzee PMS.', 105, yPos, { align: 'center' });
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('This is an official transaction acknowledgment.', 105, yPos, { align: 'center' });

  return doc;
}
