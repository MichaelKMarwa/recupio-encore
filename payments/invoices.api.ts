// payments/invoices.api.ts
import { api, APIError } from "encore.dev/api";
import { db } from "../shared/db";
import { v4 as uuidv4 } from "uuid";

interface Invoice {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: string;
  invoice_date: Date;
  due_date: Date;
  pdf_url?: string;
}

// GET /api/payments/invoices
export const getInvoices = api(
  { method: "GET", path: "/api/payments/invoices", auth: true },
  async (params: { 
    auth: { userId: string };
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => {    
    const invoices: (Invoice & { plan_id: string })[] = [];
    for await (const invoice of db.query<Invoice & { plan_id: string }>`
      SELECT i.*, s.plan_id
      FROM invoices i
      JOIN subscriptions s ON i.subscription_id = s.id
      WHERE i.user_id = ${params.auth.userId}
      ${params.startDate ? `AND i.invoice_date >= ${params.startDate}` : ''}
      ${params.endDate ? `AND i.invoice_date <= ${params.endDate}` : ''}
      ORDER BY i.invoice_date DESC
      ${params.limit ? `LIMIT ${params.limit}` : ''}
    `) {
      invoices.push(invoice);
    }

    return { invoices };
  }
);

// GET /api/payments/invoices/:id/pdf
export const getInvoicePDF = api(
  { method: "GET", path: "/api/payments/invoices/:id/pdf", auth: true },
  async (params: { auth: { userId: string }; id: string }) => {
    const invoice = await db.queryRow<Invoice>`
      SELECT * FROM invoices
      WHERE id = ${params.id}
      AND user_id = ${params.auth.userId}
    `;

    if (!invoice) {
      throw APIError.notFound("Invoice not found");
    }

    if (invoice.pdf_url) {
      return { url: invoice.pdf_url };
    }

    // Generate PDF if it doesn't exist
    // TODO: Implement PDF generation service
    const pdfUrl = `https://storage.example.com/invoices/${invoice.id}.pdf`;
    
    await db.exec`
      UPDATE invoices
      SET pdf_url = ${pdfUrl}
      WHERE id = ${invoice.id}
    `;

    return { url: pdfUrl };
  }
);

// POST /api/payments/invoices/:id/send
export const sendInvoiceEmail = api(
  { method: "POST", path: "/api/payments/invoices/:id/send", auth: true },
  async (params: { auth: { userId: string }; id: string }) => {
    const invoice = await db.queryRow`
      SELECT i.*, u.email
      FROM invoices i
      JOIN users u ON i.user_id = u.id
      WHERE i.id = ${params.id}
      AND i.user_id = ${params.auth.userId}
    `;

    if (!invoice) {
      throw APIError.notFound("Invoice not found");
    }

    // TODO: Implement email service integration
    // For now, just return success
    return { success: true };
  }
);
