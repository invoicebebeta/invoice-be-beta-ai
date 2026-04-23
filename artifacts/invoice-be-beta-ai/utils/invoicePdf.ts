import { Platform } from "react-native";
import { Invoice } from "./types";
import {
  calculateDiscountTotal,
  calculateSubtotal,
  calculateTaxTotal,
  formatMoney,
  lineTotal,
} from "./calculations";

export function buildInvoiceHtml(
  invoice: Invoice,
  user: { businessName?: string; email?: string; logoUri?: string } | null
): string {
  const currency = invoice.currency ?? "USD";
  const subtotal = calculateSubtotal(invoice.lineItems);
  const discount = calculateDiscountTotal(invoice.lineItems);
  const tax = calculateTaxTotal(invoice.lineItems);
  const hasAdjustments = discount > 0 || tax > 0;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  const statusLabel: Record<string, string> = {
    draft: "Draft",
    awaiting_deposit: "Awaiting deposit",
    deposit_paid: "Deposit paid",
    fully_paid: "Paid in full",
  };

  const logoHtml = user?.logoUri
    ? `<img src="${user.logoUri}" alt="logo" style="width:56px;height:56px;border-radius:10px;object-fit:cover;" />`
    : "";

  const lineItemRows = invoice.lineItems
    .map((item) => {
      const meta: string[] = [];
      if ((item.discountPercent ?? 0) > 0) meta.push(`-${item.discountPercent}% discount`);
      if ((item.taxRate ?? 0) > 0) meta.push(`+${item.taxRate}% tax`);
      return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:600;color:#111827;">${item.name}</div>
          ${item.description ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${item.description}</div>` : ""}
          ${meta.length ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;">${meta.join("  ·  ")}</div>` : ""}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;color:#6b7280;font-size:13px;">
          ${item.quantity} × ${formatMoney(item.price, currency)}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;white-space:nowrap;">
          ${formatMoney(lineTotal(item), currency)}
        </td>
      </tr>`;
    })
    .join("");

  const totalsHtml = [
    hasAdjustments ? `<tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Subtotal</td><td style="text-align:right;font-size:13px;padding:4px 0;">${formatMoney(subtotal, currency)}</td></tr>` : "",
    discount > 0 ? `<tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Discount</td><td style="text-align:right;font-size:13px;color:#059669;padding:4px 0;">-${formatMoney(discount, currency)}</td></tr>` : "",
    tax > 0 ? `<tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Tax</td><td style="text-align:right;font-size:13px;padding:4px 0;">${formatMoney(tax, currency)}</td></tr>` : "",
    `<tr style="border-top:2px solid #111827;">
      <td style="font-weight:700;font-size:16px;padding-top:10px;">Total</td>
      <td style="text-align:right;font-weight:700;font-size:18px;padding-top:10px;">${formatMoney(invoice.total, currency)}</td>
    </tr>`,
    invoice.requireDeposit ? `<tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Deposit</td><td style="text-align:right;font-size:13px;padding:4px 0;">${formatMoney(invoice.depositAmount, currency)}</td></tr>` : "",
    invoice.requireDeposit ? `<tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Remaining balance</td><td style="text-align:right;font-size:13px;font-weight:600;padding:4px 0;">${formatMoney(invoice.remainingBalance, currency)}</td></tr>` : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111827; padding: 48px; max-width: 720px; margin: 0 auto; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;">
    <div style="display:flex;align-items:center;gap:14px;">
      ${logoHtml}
      <div>
        <div style="font-size:20px;font-weight:700;">${user?.businessName ?? "Your Business"}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:2px;">${user?.email ?? ""}</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:28px;font-weight:800;color:#4a7c59;letter-spacing:-0.5px;">INVOICE</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;">Issued ${formatDate(invoice.createdAt)}</div>
      <div style="display:inline-block;margin-top:8px;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;background:${invoice.status === "fully_paid" ? "#dcfce7" : "#fef9c3"};color:${invoice.status === "fully_paid" ? "#166534" : "#854d0e"};">
        ${statusLabel[invoice.status] ?? invoice.status}
      </div>
    </div>
  </div>

  <div style="display:flex;gap:32px;margin-bottom:36px;">
    <div style="flex:1;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;margin-bottom:6px;">Bill to</div>
      <div style="font-size:16px;font-weight:700;">${invoice.customerName}</div>
      <div style="font-size:13px;color:#6b7280;margin-top:2px;">${invoice.customerEmail}</div>
    </div>
    <div style="flex:1;text-align:right;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;margin-bottom:6px;">Due date</div>
      <div style="font-size:15px;font-weight:600;">${formatDate(invoice.dueDate)}</div>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <thead>
      <tr style="border-bottom:2px solid #111827;">
        <th style="text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;padding-bottom:8px;">Description</th>
        <th style="text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;padding-bottom:8px;white-space:nowrap;">Unit × Qty</th>
        <th style="text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;padding-bottom:8px;">Amount</th>
      </tr>
    </thead>
    <tbody>${lineItemRows}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:36px;">
    <table style="min-width:260px;border-collapse:collapse;">
      <tbody>${totalsHtml}</tbody>
    </table>
  </div>

  ${
    invoice.notes
      ? `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;background:#f9fafb;margin-bottom:24px;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;margin-bottom:8px;">Notes & terms</div>
      <div style="font-size:13px;color:#374151;line-height:1.6;">${invoice.notes}</div>
    </div>`
      : ""
  }

  <div style="margin-top:48px;border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;font-size:11px;color:#9ca3af;">
    Generated by Invoice Be Beta AI
  </div>
</body>
</html>`;
}

export async function downloadInvoicePdf(
  invoice: Invoice,
  user: { businessName?: string; email?: string; logoUri?: string } | null
): Promise<void> {
  const html = buildInvoiceHtml(invoice, user);
  const filename = `invoice-${invoice.customerName.replace(/\s+/g, "-").toLowerCase()}-${invoice.id.slice(-6)}.pdf`;

  if (Platform.OS === "web") {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
    return;
  }

  const Print = await import("expo-print");
  const Sharing = await import("expo-sharing");

  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Share ${filename}`,
      UTI: "com.adobe.pdf",
    });
  } else {
    await Print.printAsync({ html });
  }
}
