import type { InvoiceData } from "../types/invoice";
import { downloadCSV, parseCurrency } from "../utils/helpers";

type TableViewProps = {
  invoice: InvoiceData;
};

export default function TableView({ invoice }: TableViewProps) {
  const items = invoice.items ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + parseCurrency(item.total),
    0,
  );
  const tax = parseCurrency(invoice.tax);
  const shipping = parseCurrency(invoice.shipping);
  const total = parseCurrency(invoice.total || subtotal + tax + shipping);
  const calculated = subtotal + tax + shipping;
  const mismatch = Math.abs(calculated - total) > 0.01;

  const meta = [
    invoice.vendor ? `Vendor: ${invoice.vendor}` : "",
    invoice.invoice_number ? `Invoice : ${invoice.invoice_number}` : "",
    invoice.date ? `Date: ${invoice.date}` : "",
    invoice.due_date ? `Due: ${invoice.due_date}` : "",
    invoice.tax_id ? `GST/Tax ID: ${invoice.tax_id}` : "",
  ].filter(Boolean);

  const filename = invoice.invoice_number
    ? `invoice-${invoice.invoice_number}-table.csv`
    : "invoice-table.csv";

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title" style={{ marginBottom: "10px" }}>
            <div className="card-title-icon">
              <svg viewBox="0 0 16 16">
                <path d="M1 3h14v2H1zM1 7h14v2H1zM1 11h14v2H1z" />
              </svg>
            </div>
            Table View
          </div>

          {meta.length > 0 && (
            <div className="meta-column" style={{ display: "flex" }}>
              {meta.map((entry) => {
                const [label, value] = entry.split(": ");
                return (
                  <span className="meta-item" key={entry}>
                    <strong>{label}:</strong> {value}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <button className="btn" onClick={() => downloadCSV(items, filename)}>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M8 2v8M5 7l3 3 3-3" strokeLinecap="round" />
            <path d="M2 13h12" strokeLinecap="round" />
          </svg>
          Download as CSV
        </button>
      </div>

      <div className="table-scroll">
        <table id="tableView">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.description}-${index}`}>
                <td>{item.description || "-"}</td>
                <td>{parseCurrency(item.quantity)}</td>
                <td>{parseCurrency(item.unit_price).toFixed(2)}</td>
                <td>{parseCurrency(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="right">
                Subtotal
              </td>
              <td className="val">{subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="right">
                Tax
              </td>
              <td className="val">{tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="right">
                Shipping
              </td>
              <td className="val">{shipping.toFixed(2)}</td>
            </tr>
            <tr
              className="total-row"
              style={{
                borderTopColor: mismatch ? "var(--red)" : "var(--amber)",
              }}
            >
              <td colSpan={3} className="right">
                Total
                {mismatch && <span className="mismatch-badge"> mismatch</span>}
              </td>
              <td
                className="val"
                style={{ color: mismatch ? "var(--red)" : "var(--amber)" }}
              >
                {total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}