// storage/objects.ts
import { Bucket } from "encore.dev/storage/objects";

export const receiptStorage = new Bucket("tax-receipts", {
    versioned: false,
    public: true
});