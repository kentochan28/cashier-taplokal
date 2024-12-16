import path from "path";

const { PosPrinter } = require("@plick/electron-pos-printer");
const { ipcMain } = require("electron");

const removeVowelsAndCapitalize = (itemName) => {
  return itemName
    .split(" ")
    .map((word) => {
      const consonantsOnly = word.replace(/[aeiouAEIOU]/g, "");
      return consonantsOnly.charAt(0).toUpperCase() + consonantsOnly.slice(1);
    })
    .join("");
};

export const setupPrinter = () => {
  const options = {
    preview: false,
    copies: 1,
    printerName: "POS-58",
    pageSize: "58mm",
    silent: true,
    timeOutPerLine: 400,
    margin: "0 0 0 0",
  };

  ipcMain.on("print-receipt", async (event, details) => {
    const {
      items,
      transactionNumber,
      tableNumber,
      dineInOrTakeout,
      newOrderNumber,
      cashierName,
    } = details;

    const products = items.map((item) => {
      const formattedPrice = `₱${(item.price * item.quantity).toFixed(2)}`;
      const abbreviatedName = removeVowelsAndCapitalize(item.name);

      return [
        {
          type: "text",
          value: `${item.quantity}`,
          style: { textAlign: "center" },
        },
        {
          type: "text",
          value: `${abbreviatedName}`,
          style: { textAlign: "left" },
        },
        {
          type: "text",
          value: `₱${item.price}`,
          style: { textAlign: "left" },
        },
        {
          type: "text",
          value: `${formattedPrice}`,
          style: { textAlign: "left" },
        },
      ];
    });

    const total = items
      .reduce((total, item) => total + item.price * item.quantity, 0)
      .toFixed(2);

    const totalDiscount = details.totalDiscount || 0;

    const data = [
      {
        type: "text",
        value: `${newOrderNumber}`,
        style: {
          fontWeight: "bold",
          textAlign: "center",
          fontSize: "42px",
          marginBottom: "10px",
        },
      },
      {
        type: "image",
        path: path.join(__dirname, "images/icon.png"),
        position: "center",
        width: "64px",
        height: "64px",
      },
      {
        type: "text",
        value: "TAPLOKAL BILL",
        style: {
          fontWeight: "bold",
          textAlign: "center",
          fontSize: "14px",
          marginTop: "10px",
        },
      },
      {
        type: "text",
        value: `Trans. No: ${transactionNumber}`,
        style: {
          textAlign: "left",
          fontSize: "10px",
          marginTop: "10px",
          marginBottom: "5px",
          marginLeft: "10px",
        },
      },
      {
        type: "text",
        value: `Table No: ${tableNumber}`,
        style: {
          textAlign: "left",
          fontSize: "10px",
          marginBottom: "5px",
          marginLeft: "10px",
        },
      },
      {
        type: "text",
        value: `Dine-in/Takeout: ${dineInOrTakeout}`,
        style: {
          textAlign: "left",
          fontSize: "10px",
          marginBottom: "5px",
          marginLeft: "10px",
        },
      },
      {
        type: "text",
        value: `Cashier: ${cashierName}`,
        style: {
          textAlign: "left",
          fontSize: "10px",
          marginBottom: "5px",
          marginLeft: "10px",
        },
      },
      {
        type: "divider",
        style: { borderWidth: 1, marginBottom: "10px" },
      },
      {
        type: "table",
        style: { fontSize: "9px", padding: "0 10px" },
        tableHeader: [
          { type: "text", value: "Qty", style: { textAlign: "center" } },
          { type: "text", value: "Item", style: { textAlign: "left" } },
          { type: "text", value: "Price", style: { textAlign: "left" } },
          { type: "text", value: "Subtotal", style: { textAlign: "left" } },
        ],
        tableBody: [
          [
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: "",
            },
          ],
          ...products,
          [
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: "",
            },
          ],
          [
            {
              type: "text",
              value: "VAT",
              style: { fontWeight: "bold", textAlign: "right" },
            },
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: `₱${(total * 0.12).toFixed(2)}`,
              style: { fontWeight: "bold", textAlign: "left" },
            },
          ],
          [
            {
              type: "text",
              value: "Subtotal",
              style: { fontWeight: "bold", textAlign: "right" },
            },
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: `₱${(
                total - parseFloat((total * 0.12).toFixed(2))
              ).toFixed(2)}`,
              style: { fontWeight: "bold", textAlign: "left" },
            },
          ],
          [
            {
              type: "text",
              value: "Discount",
              style: { fontWeight: "bold", textAlign: "right" },
            },
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: `₱${totalDiscount.toFixed(2)}`,
              style: { fontWeight: "bold", textAlign: "left" },
            },
          ],

          // Existing total display
          [
            {
              type: "text",
              value: "Total",
              style: { fontWeight: "bold", textAlign: "right" },
            },
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: "",
            },
            {
              type: "text",
              value: `₱${total}`,
              style: { fontWeight: "bold", textAlign: "left" },
            },
          ],
        ],
        tableFooter: [],
        tableHeaderStyle: { style: { fontWeight: "bold", textAlign: "left" } },
        tableBodyStyle: {},
        tableFooterStyle: {},
      },
      {
        type: "divider",
        style: { borderWidth: 1, marginTop: "5px", marginBottom: "5px" },
      },
      {
        type: "text",
        value: "Payment Method: Cash",
        style: { textAlign: "left", fontSize: "10px", marginLeft: "10px" },
      },
      {
        type: "text",
        value: `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        style: { textAlign: "left", fontSize: "10px", marginLeft: "10px" },
      },
      {
        type: "text",
        value: "Thank you for your purchase!",
        style: {
          textAlign: "center",
          fontSize: "10px",
          fontWeight: "bold",
          marginTop: "10px",
        },
      },
      {
        type: "text",
        value: "Visit us again!",
        style: { textAlign: "center", fontSize: "10px" },
      },
      {
        type: "divider",
        style: { borderWidth: 1, marginTop: "5px", marginBottom: "5px" },
      },
      {
        type: "text",
        value: "Contact us: 09123456789",
        style: { textAlign: "center", fontSize: "10px", fontStyle: "italic" },
      },
    ];

    function delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    PosPrinter.print(data, options)
      .then(() => {
        console.log("First copy printed");

        // Delay before printing the second copy (5 seconds)
        return delay(5000); // 5000ms = 5 seconds
      })
      .then(() => {
        console.log("Printing second copy...");
        // Print the second copy after the delay
        return PosPrinter.print(data, options);
      })
      .catch((error) => {
        console.error(error);
      });
  });
};
