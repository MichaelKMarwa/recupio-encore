// drop-offs/drop-offs.api.ts
import { api, APIError } from "encore.dev/api";
import { mainDB } from "../shared/db";
import { v4 as uuidv4 } from "uuid";
import { receiptStorage } from "../storage/objects";

export interface DropOff {
  id: string;
  user_id?: string;
  guest_session_id?: string;
  facility_id: string;
  drop_off_date: Date;
  notes?: string;
  created_at: Date;
}

export interface DropOffItem {
  id: string;
  drop_off_id: string;
  item_id: string;
  quantity: number;
  condition: 'new' | 'used' | 'refurbished';
  estimated_value: number;
  carbon_offset: number;
}

export interface TaxReceipt {
  id: string;
  drop_off_id: string;
  user_id: string;
  receipt_number: string;
  receipt_date: Date;
  tax_year: number;
  total_value: number;
  receipt_url: string;
  created_at: Date;
}

interface CreateDropOffParams {
  auth: { userID: string };
  body: {
    facility_id: string;
    items: Array<{
      item_id: string;
      quantity: number;
      condition: 'new' | 'used' | 'refurbished';
      estimated_value: number;
    }>;
  };
}

// Updated API Endpoints with Validation
export const createDropOff = api(
  { 
    method: "POST", 
    path: "/api/drop-offs",
    auth: true
  },
  async (params: CreateDropOffParams): Promise<{ drop_off_id: string }> => {
    // Validate item conditions
    for (const item of params.body.items) {
      if (!['new', 'used', 'refurbished'].includes(item.condition)) {
        throw APIError.invalidArgument("Invalid item condition");
      }
    }

    const dropOffId = uuidv4();
    
    await mainDB.exec`
      INSERT INTO drop_offs (id, user_id, facility_id)
      VALUES (${dropOffId}, ${params.auth.userID}, ${params.body.facility_id})
    `;

    for (const item of params.body.items) {
      await mainDB.exec`
        INSERT INTO drop_off_items (
          id, drop_off_id, item_id, quantity, condition, 
          estimated_value, carbon_offset
        ) VALUES (
          ${uuidv4()}, ${dropOffId}, ${item.item_id}, 
          ${item.quantity}, ${item.condition}, 
          ${item.estimated_value}, 0.0
        )
      `;
    }

    return { drop_off_id: dropOffId };
  }
);

interface GetUserDropOffsParams {
  auth: { userID: string };
  userId: string; // Path parameter at root level
}

// GET /api/drop-offs/user/:userId
export const getUserDropOffs = api(
  { method: "GET", path: "/api/drop-offs/user/:userId", auth: true },
  async (ctx: GetUserDropOffsParams): Promise<{ drop_offs: DropOff[] }> => {
    // Verify user can only access their own drop-offs
    if (ctx.auth.userID !== ctx.userId) {
      throw APIError.permissionDenied("Cannot access other users' drop-offs");
    }

    const dropOffs: DropOff[] = [];
    for await (const row of mainDB.query<DropOff>`
      SELECT * FROM drop_offs 
      WHERE user_id = ${ctx.userId}
      ORDER BY drop_off_date DESC
    `) {
      dropOffs.push(row);
    }

    return { drop_offs: dropOffs };
  }
);

interface GetDropOffDetailsParams {
  id: string; // Path parameter at root level
}

// GET /api/drop-offs/:id
export const getDropOffDetails = api(
  { method: "GET", path: "/api/drop-offs/:id" },
  async (ctx: GetDropOffDetailsParams): Promise<{ 
    drop_off: DropOff;
    items: DropOffItem[];
  }> => {
    const dropOff = await mainDB.queryRow<DropOff>`
      SELECT * FROM drop_offs WHERE id = ${ctx.id}
    `;
    
    if (!dropOff) {
      throw APIError.notFound("Drop-off not found");
    }

    const items: DropOffItem[] = [];
    for await (const item of mainDB.query<DropOffItem>`
      SELECT * FROM drop_off_items WHERE drop_off_id = ${ctx.id}
    `) {
      items.push(item);
    }

    return { drop_off: dropOff, items };
  }
);

interface GenerateTaxReceiptParams {
  auth: { userID: string };
  dropOffId: string; // Path parameter at root level
}

// Receipt Generation Service
export const generateTaxReceipt = api(
  { 
    method: "POST", 
    path: "/api/tax-receipts/generate/:dropOffId",
    auth: true
  },
  async (ctx: GenerateTaxReceiptParams): Promise<{ receipt_url: string }> => {
    const dropOff = await mainDB.queryRow<DropOff>`
      SELECT * FROM drop_offs 
      WHERE id = ${ctx.dropOffId} 
      AND user_id = ${ctx.auth.userID}
    `;
    
    if (!dropOff) {
      throw APIError.notFound("Drop-off not found or unauthorized access");
    }

    const totalValue = await mainDB.queryRow<{ total: number }>`
      SELECT SUM(estimated_value) as total 
      FROM drop_off_items 
      WHERE drop_off_id = ${ctx.dropOffId}
    `;
    
    if (!totalValue?.total) {
      throw APIError.internal("Failed to calculate total value");
    }

    const receiptId = uuidv4();
    const receiptNumber = `RECEIPT-${Date.now()}`;
    const receiptContent = await generateReceiptPDF(dropOff, totalValue.total);

    const receiptPath = `${receiptNumber}.pdf`;
    await receiptStorage.upload(
      receiptPath,
      receiptContent,
      { contentType: "application/pdf" }
    );

    const publicUrl = receiptStorage.publicUrl(receiptPath);

    await mainDB.exec`
      INSERT INTO tax_receipts (
        id, drop_off_id, user_id, receipt_number, 
        tax_year, total_value, receipt_url
      ) VALUES (
        ${receiptId}, ${ctx.dropOffId}, ${ctx.auth.userID},
        ${receiptNumber}, ${new Date().getFullYear()}, 
        ${totalValue.total}, ${publicUrl}
      )
    `;

    return { receipt_url: publicUrl };
  }
);

interface GetUserTaxReceiptsParams {
  auth: { userID: string };
  userId: string;
}

// GET /api/tax-receipts/user/:userId
export const getUserTaxReceipts = api(
  { method: "GET", path: "/api/tax-receipts/user/:userId", auth: true },
  async (ctx: GetUserTaxReceiptsParams): Promise<{ receipts: TaxReceipt[] }> => {
    // Verify user can only access their own receipts
    if (ctx.auth.userID !== ctx.userId) {
      throw APIError.permissionDenied("Cannot access other users' receipts");
    }

    const receipts: TaxReceipt[] = [];
    for await (const row of mainDB.query<TaxReceipt>`
      SELECT * FROM tax_receipts 
      WHERE user_id = ${ctx.userId}
      ORDER BY receipt_date DESC
    `) {
      receipts.push(row);
    }

    return { receipts };
  }
);

// Helper function for PDF generation
async function generateReceiptPDF(dropOff: DropOff, total: number): Promise<Buffer> {
  // TODO: Implement using pdfkit or similar library
  // For now, return a placeholder buffer
  return Buffer.from("PDF_CONTENT");
}