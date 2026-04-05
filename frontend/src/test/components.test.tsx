import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import JSONViewer from "../components/JSONViewer";
import UploadZone from "../components/UploadZone";

const invoice: any = {
  invoice_number: "INV-1",
  items: [{ description: "Test", quantity: 1, unit_price: 5, total: 5 }],
};

describe("components", () => {
  it("renders upload zone correctly", () => {
    render(
      <UploadZone
        onFileSelect={vi.fn()}
        selectedFile={null}
        isExtracting={false}
      />,
    );
    expect(screen.getByText(/drop your invoice/i)).toBeInTheDocument();
  });

  it("copies json text", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<JSONViewer invoice={invoice} />);
    await user.click(screen.getByRole("button", { name: /copy json/i }));

    expect(writeText).toHaveBeenCalledOnce();
  });
});
