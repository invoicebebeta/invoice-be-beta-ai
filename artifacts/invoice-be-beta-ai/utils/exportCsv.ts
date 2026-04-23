import { Platform } from "react-native";
import { Invoice } from "./types";

function esc(v: string | number | undefined): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildInvoiceCsv(invoices: Invoice[]): string {
  const headers = [
    "ID",
    "Customer name",
    "Customer email",
    "Status",
    "Currency",
    "Total",
    "Deposit amount",
    "Remaining balance",
    "Due date",
    "Created at",
    "Notes",
  ];

  const rows = invoices.map((inv) => [
    esc(inv.id),
    esc(inv.customerName),
    esc(inv.customerEmail),
    esc(inv.status),
    esc(inv.currency ?? "USD"),
    esc(inv.total),
    esc(inv.depositAmount),
    esc(inv.remainingBalance),
    esc(inv.dueDate),
    esc(inv.createdAt),
    esc(inv.notes),
  ]);

  return [headers.map(esc).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export async function exportInvoicesCsv(invoices: Invoice[]): Promise<void> {
  const csv = buildInvoiceCsv(invoices);
  const filename = `invoices-export-${new Date().toISOString().slice(0, 10)}.csv`;

  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const FileSystem = await import("expo-file-system");
  const Sharing = await import("expo-sharing");

  const path = (FileSystem.documentDirectory ?? "") + filename;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, {
      mimeType: "text/csv",
      dialogTitle: "Export invoices CSV",
      UTI: "public.comma-separated-values-text",
    });
  }
}
