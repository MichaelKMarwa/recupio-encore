// services/payments/api.ts
import { api, APIError } from "encore.dev/api";
import { mainDB } from "../shared/db";
import { v4 as uuidv4 } from "uuid";
import { auth } from "~encore/clients"; 

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  featureId: string;
}

// POST /payments - Create payment
export const createPayment = api(
  { method: "POST", path: "/payments", auth: true },
  async (params: { auth: { userId: string }, body: Payment }) => {
    const paymentId = uuidv4();
    await mainDB.exec`
      INSERT INTO payments (id, user_id, amount, currency, payment_method, feature_id)
      VALUES (${paymentId}, ${params.auth.userId}, ${params.body.amount}, 
              ${params.body.currency}, ${params.body.paymentMethod}, ${params.body.featureId})
    `;
    return { id: paymentId };
  }
);

// GET /payments - List user payments
export const listPayments = api(
  { method: "GET", path: "/payments", auth: true },
  async (params: { auth: { userId: string } }) => {
    const paymentResults = [];
    // Properly handle async generator
    for await (const payment of mainDB.query`
      SELECT * FROM payments WHERE user_id = ${params.auth.userId}
    `) {
      paymentResults.push(payment);
    }
    return paymentResults;
  }
);