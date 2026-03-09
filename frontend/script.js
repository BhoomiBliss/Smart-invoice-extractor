const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const extractBtn = document.getElementById("extractBtn");

const loading = document.getElementById("loading");
const result = document.getElementById("result");
const tableBody = document.querySelector("#tableView tbody");
const subtotalCell = document.getElementById("subtotalCell");
const taxCell = document.getElementById("taxCell");
const shippingCell = document.getElementById("shippingCell");
const totalCell = document.getElementById("totalCell");
const copyJsonBtn = document.getElementById("copyJsonBtn");
const fileNameDisplay = document.getElementById("fileName");

// Toggle theme
themeToggle.onclick = () => {
  body.classList.toggle("dark");
  themeToggle.textContent = body.classList.contains("dark")
    ? "☀️ Light Mode"
    : "🌙 Dark Mode";
};

// Show selected file name
fileInput.addEventListener("change", () => {
  fileNameDisplay.textContent = fileInput.files[0]?.name || "No file selected";
});

// Drag & drop
uploadArea.addEventListener("click", () => fileInput.click());
uploadArea.addEventListener("dragover", e => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});
uploadArea.addEventListener("dragleave", e => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
});
uploadArea.addEventListener("drop", e => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    fileNameDisplay.textContent = e.dataTransfer.files[0].name;
  }
});

function parseCurrency(value) {
  if (!value) return 0;
  return Number(value.toString().replace(/[^0-9.-]+/g, "")) || 0;
}

extractBtn.onclick = async () => {
  if (!fileInput.files[0]) return;

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async () => {
    const base64 = reader.result.split(",")[1];

    loading.style.display = "block";
    extractBtn.disabled = true;
    result.textContent = "";
    tableBody.innerHTML = "";
    subtotalCell.textContent = taxCell.textContent = shippingCell.textContent = totalCell.textContent = "0";

    try {
      const res = await fetch("http://localhost:5000/extract-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: base64 }),
      });

      if (!res.ok) {
        const text = await res.text();
        result.textContent = `❌ Extraction failed! Status ${res.status}\n${text}`;
        return;
      }

      const data = await res.json();
      if (!data.success) {
        result.textContent = `❌ Extraction failed: ${data.error || "Unknown"}`;
        return;
      }

      const invoice = data.data;
      invoice.items = invoice.items || [];

      result.textContent = JSON.stringify(invoice, null, 2);

      copyJsonBtn.onclick = () => {
        navigator.clipboard.writeText(JSON.stringify(invoice, null, 2));
        copyJsonBtn.textContent = "✅ Copied!";
        setTimeout(() => copyJsonBtn.textContent = "📋 Copy JSON", 1500);
      };

      let subtotal = 0;
      tableBody.innerHTML = "";

      invoice.items.forEach(item => {
        const qty = parseCurrency(item.quantity);
        const price = parseCurrency(item.unit_price);
        const total = parseCurrency(item.total);
        subtotal += total;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.description || "-"}</td>
          <td>${qty}</td>
          <td>${price}</td>
          <td>${total}</td>
        `;
        tableBody.appendChild(row);
      });

      const tax = parseCurrency(invoice.tax || 0);
      const shipping = parseCurrency(invoice.shipping || 0);
      const total = parseCurrency(invoice.total || subtotal + tax + shipping);

      subtotalCell.textContent = subtotal.toFixed(2);
      taxCell.textContent = tax.toFixed(2);
      shippingCell.textContent = shipping.toFixed(2);
      totalCell.textContent = total.toFixed(2);

      if ((subtotal + tax + shipping).toFixed(2) !== total.toFixed(2)) {
        totalCell.classList.add("highlight");
      } else {
        totalCell.classList.remove("highlight");
      }

    } catch (err) {
      result.textContent = "❌ Extraction failed: " + err;
    } finally {
      loading.style.display = "none";
      extractBtn.disabled = false;
    }
  };

  reader.readAsDataURL(file);

};
