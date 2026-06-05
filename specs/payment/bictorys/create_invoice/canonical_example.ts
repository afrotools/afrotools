/**
 * @provider Bictorys
 * @capability create_invoice
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface InvoiceItem {
  name: string;
  price: number;
  quantity: number;
  reference?: string;
  discount?: number;
  taxRate?: number;
}

interface CreateInvoiceInput {
  currency: string;
  dueDate: string;
  orderDetails: InvoiceItem[];
  customerId?: string;
  reference?: string;
  deliveryCharges?: number;
  deductedAmount?: number;
  enableMultiplePayment?: boolean;
  redirectUrlAfterPayment?: string;
  deviceId?: string;
}

interface CreateInvoiceResponse {
  id: string;
  paymentUrl: string;
  downloadUrl?: string;
  finalAmount?: number;
  status: "opened" | "paid" | "paid_in_cash" | "expired";
  currency: string;
  dueDate?: string;
  reference?: string;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function createInvoice(
  input: CreateInvoiceInput,
  sendNotification: boolean = true
): Promise<CreateInvoiceResponse> {
  const url = "https://api.bictorys.com/invoice-management/v1/invoices"
    + (sendNotification ? "" : "?send_notification=false");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-Key": BICTORYS_SECRET_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  return response.json() as Promise<CreateInvoiceResponse>;
}

/*
Usage example:

const invoice = await createInvoice({
  currency: "XOF",
  dueDate: "2026-07-01",
  customerId: "fbd2053b-638d-4133-957e-3caf63e6b79c",
  reference: "INV-2026-001",
  orderDetails: [
    { name: "Consultation", price: 50000, quantity: 1 },
    { name: "Rapport PDF", price: 15000, quantity: 2, taxRate: 18 },
  ],
  redirectUrlAfterPayment: "https://myapp.com/invoice/paid",
});

console.log("Invoice created:", invoice.id);
console.log("Payment URL:", invoice.paymentUrl);   // share with customer
console.log("Download PDF:", invoice.downloadUrl); // send PDF to customer
console.log("Total:", invoice.finalAmount, invoice.currency);

// To programmatically charge the invoice via API (bypass the paymentUrl redirect):
// await createCharge({ invoiceId: invoice.id, country: "SN" });
*/
