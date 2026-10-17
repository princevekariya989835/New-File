import { InvoiceRecord, InvoiceItem } from "./types";
import {
  RIOTOUS_LOGO_WIDTH,
  RIOTOUS_LOGO_HEIGHT,
  RIOTOUS_LOGO_ASPECT_RATIO,
  getRiotousLogoBytes,
  getRiotousLogoAlphaBytes,
} from "./logo-data";

/**
 * Approximate character widths for standard Helvetica font at 1000 units.
 */
const HELVETICA_WIDTHS: Record<string, number> = {
  " ": 278,
  "!": 278,
  '"': 355,
  "#": 556,
  $: 556,
  "%": 889,
  "&": 667,
  "'": 191,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  "0": 556,
  "1": 556,
  "2": 556,
  "3": 556,
  "4": 556,
  "5": 556,
  "6": 556,
  "7": 556,
  "8": 556,
  "9": 556,
  ":": 278,
  ";": 278,
  "<": 584,
  "=": 584,
  ">": 584,
  "?": 556,
  "@": 1015,
  A: 667,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 500,
  K: 667,
  L: 556,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  "[": 278,
  "\\": 278,
  "]": 278,
  "^": 469,
  _: 556,
  "`": 333,
  a: 556,
  b: 556,
  c: 500,
  d: 556,
  e: 556,
  f: 278,
  g: 556,
  h: 556,
  i: 222,
  j: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  q: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 500,
  "{": 334,
  "|": 260,
  "}": 334,
  "~": 584,
};

function getCharWidth(char: string, isBold: boolean): number {
  const w = HELVETICA_WIDTHS[char] ?? 500;
  return isBold ? w * 1.05 : w;
}

export function measureTextWidth(text: string, fontSize: number, isBold = false): number {
  const str = String(text ?? "");
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    width += (getCharWidth(str[i], isBold) * fontSize) / 1000;
  }
  return width;
}

export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  isBold = false,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (measureTextWidth(candidate, fontSize, isBold) <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // If a single word exceeds maxWidth, break it by characters
      if (measureTextWidth(word, fontSize, isBold) > maxWidth) {
        let chunk = "";
        for (const char of word) {
          if (measureTextWidth(chunk + char, fontSize, isBold) <= maxWidth) {
            chunk += char;
          } else {
            lines.push(chunk);
            chunk = char;
          }
        }
        currentLine = chunk;
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function escapePdfText(str: string): string {
  // Replace characters not in standard PDF WinAnsi with clean ASCII equivalents
  const sanitized = String(str ?? "")
    .replace(/₹/g, "INR ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");

  return sanitized.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Formats currency values as clean INR representations
 */
function fmtMoney(num: number): string {
  const rounded = Math.round((Number(num) + Number.EPSILON) * 100) / 100;
  return rounded.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Generates an A4 PDF Tax Invoice compliant with PDF 1.4 specifications.
 * Zero external C++ or Node-native dependencies — works on Cloudflare Workers edge.
 */
export function generateInvoicePdf(invoice: InvoiceRecord): Uint8Array {
  // A4 dimensions in points: 595.28 x 841.89
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 36;
  const MARGIN_RIGHT = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 523.28 pt

  interface PageStream {
    ops: string[];
  }

  const pages: PageStream[] = [];
  let currentPageOps: string[] = [];

  function startNewPage() {
    currentPageOps = [];
    pages.push({ ops: currentPageOps });
  }

  // Helper coordinate conversion: converts top-down Y (0 at top of page) to PDF bottom-up Y
  function toPdfY(topY: number): number {
    return Math.round((PAGE_HEIGHT - topY) * 100) / 100;
  }

  // Graphics primitive helpers
  function drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    fillColor?: [number, number, number],
    strokeColor?: [number, number, number],
    lineWidth = 0.5,
  ) {
    if (fillColor) {
      currentPageOps.push(`${fillColor[0]} ${fillColor[1]} ${fillColor[2]} rg`);
      currentPageOps.push(`${x} ${toPdfY(y + h)} ${w} ${h} re f`);
    }
    if (strokeColor) {
      currentPageOps.push(`${strokeColor[0]} ${strokeColor[1]} ${strokeColor[2]} RG`);
      currentPageOps.push(`${lineWidth} w`);
      currentPageOps.push(`${x} ${toPdfY(y + h)} ${w} ${h} re S`);
    }
  }

  function drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeColor: [number, number, number] = [0.8, 0.8, 0.8],
    lineWidth = 0.5,
  ) {
    currentPageOps.push(`${strokeColor[0]} ${strokeColor[1]} ${strokeColor[2]} RG`);
    currentPageOps.push(`${lineWidth} w`);
    currentPageOps.push(`${x1} ${toPdfY(y1)} m ${x2} ${toPdfY(y2)} l S`);
  }

  function drawImage(imgId: string, x: number, topY: number, w: number, h: number) {
    const pdfY = toPdfY(topY + h);
    currentPageOps.push("q");
    currentPageOps.push(
      `${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${pdfY.toFixed(2)} cm`,
    );
    currentPageOps.push(`/${imgId} Do`);
    currentPageOps.push("Q");
  }

  function drawText(
    text: string,
    x: number,
    y: number,
    options: {
      font?: "F1" | "F2" | "F3"; // F1: Helvetica, F2: Helvetica-Bold, F3: Helvetica-Oblique
      size?: number;
      color?: [number, number, number];
      align?: "left" | "right" | "center";
      maxWidth?: number;
    } = {},
  ) {
    const font = options.font || "F1";
    const size = options.size || 9;
    const color = options.color || [0.1, 0.1, 0.1];
    const isBold = font === "F2";

    let renderX = x;
    const textWidth = measureTextWidth(text, size, isBold);

    if (options.align === "right") {
      renderX = x - textWidth;
    } else if (options.align === "center") {
      renderX = x - textWidth / 2;
    }

    const pdfY = toPdfY(y);

    currentPageOps.push("BT");
    currentPageOps.push(`/${font} ${size} Tf`);
    currentPageOps.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    currentPageOps.push(`1 0 0 1 ${renderX.toFixed(2)} ${pdfY.toFixed(2)} Tm`);
    currentPageOps.push(`(${escapePdfText(text)}) Tj`);
    currentPageOps.push("ET");
  }

  // --- RENDER HEADER ON PAGE ---
  function renderPageHeader(isFirstPage: boolean): number {
    let curY = 32;

    // 1. Top Brand Bar with Official Site Logo on solid dark charcoal background for high contrast
    const logoW = 104;
    const logoH = Math.round((logoW / RIOTOUS_LOGO_ASPECT_RATIO) * 100) / 100;
    const padX = 4;
    const padY = 2.5;
    const bgX = MARGIN_LEFT - padX;
    const bgY = curY - 2 - padY;
    const bgW = logoW + padX * 2;
    const bgH = logoH + padY * 2;

    // Solid dark charcoal background (#111111) complementing RIOTOUS branding
    drawRect(bgX, bgY, bgW, bgH, [0.067, 0.067, 0.067], [0.15, 0.15, 0.16], 0.5);
    drawImage("Im1", MARGIN_LEFT, curY - 2, logoW, logoH);

    drawText("WE DON'T FOLLOW TRENDS. WE PRINT THEM.", MARGIN_LEFT, curY + 32, {
      font: "F2",
      size: 6.5,
      color: [0.5, 0.5, 0.55],
    });

    // Right-aligned Document Title Badge
    const titleWidth = measureTextWidth(invoice.invoiceTitle, 13, true) + 24;
    const titleX = MARGIN_LEFT + CONTENT_WIDTH - titleWidth;
    drawRect(titleX, curY + 2, titleWidth, 22, [0.95, 0.95, 0.97], [0.85, 0.85, 0.88], 0.75);

    drawText(invoice.invoiceTitle, titleX + titleWidth / 2, curY + 16, {
      font: "F2",
      size: 11,
      color: [0.88, 0.11, 0.16],
      align: "center",
    });

    drawText("Original for Recipient", MARGIN_LEFT + CONTENT_WIDTH, curY + 32, {
      font: "F1",
      size: 7,
      color: [0.55, 0.55, 0.6],
      align: "right",
    });

    curY += 40;

    // Divider line
    drawLine(MARGIN_LEFT, curY, MARGIN_LEFT + CONTENT_WIDTH, curY, [0.85, 0.85, 0.88], 0.75);
    curY += 8;

    return curY;
  }

  // Start Page 1
  startNewPage();
  let currentY = renderPageHeader(true);

  // --- METADATA STRIP ---
  const metaBoxHeight = 44;
  drawRect(
    MARGIN_LEFT,
    currentY,
    CONTENT_WIDTH,
    metaBoxHeight,
    [0.97, 0.97, 0.99],
    [0.88, 0.88, 0.92],
    0.5,
  );

  const colW = CONTENT_WIDTH / 4;

  // Col 1: Invoice No & Date
  drawText("INVOICE NUMBER", MARGIN_LEFT + 10, currentY + 12, {
    font: "F2",
    size: 6.5,
    color: [0.45, 0.45, 0.5],
  });
  drawText(invoice.invoiceNumber, MARGIN_LEFT + 10, currentY + 25, {
    font: "F2",
    size: 9,
    color: [0.88, 0.11, 0.16],
  });
  drawText(`Date: ${formatDate(invoice.invoiceDate)}`, MARGIN_LEFT + 10, currentY + 37, {
    font: "F1",
    size: 7.5,
    color: [0.3, 0.3, 0.35],
  });

  // Col 2: Order No & Date
  drawText("ORDER DETAILS", MARGIN_LEFT + colW + 10, currentY + 12, {
    font: "F2",
    size: 6.5,
    color: [0.45, 0.45, 0.5],
  });
  drawText(invoice.orderNumber, MARGIN_LEFT + colW + 10, currentY + 25, {
    font: "F2",
    size: 9,
    color: [0.1, 0.1, 0.1],
  });
  drawText(`Order Date: ${formatDate(invoice.orderDate)}`, MARGIN_LEFT + colW + 10, currentY + 37, {
    font: "F1",
    size: 7.5,
    color: [0.3, 0.3, 0.35],
  });

  // Col 3: Place of Supply
  drawText("PLACE OF SUPPLY", MARGIN_LEFT + colW * 2 + 10, currentY + 12, {
    font: "F2",
    size: 6.5,
    color: [0.45, 0.45, 0.5],
  });
  drawText(invoice.customer.state || "Gujarat", MARGIN_LEFT + colW * 2 + 10, currentY + 25, {
    font: "F2",
    size: 8.5,
    color: [0.1, 0.1, 0.1],
  });
  drawText(
    `State Code: ${invoice.customer.stateCode || "24"}`,
    MARGIN_LEFT + colW * 2 + 10,
    currentY + 37,
    { font: "F1", size: 7.5, color: [0.3, 0.3, 0.35] },
  );

  // Col 4: Reverse Charge / Tax Type
  drawText("REVERSE CHARGE", MARGIN_LEFT + colW * 3 + 10, currentY + 12, {
    font: "F2",
    size: 6.5,
    color: [0.45, 0.45, 0.5],
  });
  drawText("No", MARGIN_LEFT + colW * 3 + 10, currentY + 25, {
    font: "F2",
    size: 8.5,
    color: [0.1, 0.1, 0.1],
  });
  const taxNature = !invoice.isTaxInvoice
    ? "Exempt / Bill of Supply"
    : invoice.customer.stateCode === invoice.seller.sellerStateCode
      ? "Intra-State (CGST + SGST)"
      : "Inter-State (IGST)";
  drawText(taxNature, MARGIN_LEFT + colW * 3 + 10, currentY + 37, {
    font: "F1",
    size: 6.5,
    color: [0.4, 0.4, 0.45],
  });

  currentY += metaBoxHeight + 10;

  // --- SELLER & CUSTOMER TWO-COLUMN CARDS ---
  const cardW = (CONTENT_WIDTH - 12) / 2;
  const cardH = 92;

  // Left: Seller Card
  drawRect(MARGIN_LEFT, currentY, cardW, cardH, [1, 1, 1], [0.88, 0.88, 0.92], 0.5);
  drawRect(MARGIN_LEFT, currentY, cardW, 16, [0.96, 0.96, 0.98]);
  drawText("SOLD BY / REGISTERED OFFICE", MARGIN_LEFT + 8, currentY + 11, {
    font: "F2",
    size: 7,
    color: [0.4, 0.4, 0.45],
  });

  let sy = currentY + 26;
  drawText(invoice.seller.legalBusinessName || "RIOTOUS Brandworks", MARGIN_LEFT + 8, sy, {
    font: "F2",
    size: 8.5,
    color: [0.1, 0.1, 0.1],
  });
  sy += 11;

  const sellerAddrLines = wrapText(invoice.seller.storeAddress, cardW - 16, 7.5);
  for (const l of sellerAddrLines.slice(0, 2)) {
    drawText(l, MARGIN_LEFT + 8, sy, { font: "F1", size: 7.5, color: [0.25, 0.25, 0.3] });
    sy += 10;
  }

  if (invoice.seller.isGstRegistered && invoice.seller.businessGstin) {
    drawText(`GSTIN: ${invoice.seller.businessGstin}`, MARGIN_LEFT + 8, sy, {
      font: "F2",
      size: 7.5,
      color: [0.1, 0.1, 0.1],
    });
    if (invoice.seller.sellerPan) {
      drawText(`PAN: ${invoice.seller.sellerPan}`, MARGIN_LEFT + 140, sy, {
        font: "F1",
        size: 7.5,
        color: [0.25, 0.25, 0.3],
      });
    }
  } else {
    drawText("GST Status: Unregistered under GST", MARGIN_LEFT + 8, sy, {
      font: "F3",
      size: 7.5,
      color: [0.4, 0.4, 0.45],
    });
  }
  sy += 10;
  drawText(
    `Support: ${invoice.seller.storeEmail} | ${invoice.seller.storePhone}`,
    MARGIN_LEFT + 8,
    sy,
    { font: "F1", size: 7, color: [0.45, 0.45, 0.5] },
  );

  // Right: Customer Card
  const rightX = MARGIN_LEFT + cardW + 12;
  drawRect(rightX, currentY, cardW, cardH, [1, 1, 1], [0.88, 0.88, 0.92], 0.5);
  drawRect(rightX, currentY, cardW, 16, [0.96, 0.96, 0.98]);
  drawText("BILLING & SHIPPING ADDRESS", rightX + 8, currentY + 11, {
    font: "F2",
    size: 7,
    color: [0.4, 0.4, 0.45],
  });

  let cy = currentY + 26;
  drawText(invoice.customer.name, rightX + 8, cy, {
    font: "F2",
    size: 8.5,
    color: [0.1, 0.1, 0.1],
  });
  cy += 11;

  const custAddrLines = wrapText(invoice.customer.shippingAddress, cardW - 16, 7.5);
  for (const l of custAddrLines.slice(0, 3)) {
    drawText(l, rightX + 8, cy, { font: "F1", size: 7.5, color: [0.25, 0.25, 0.3] });
    cy += 10;
  }

  const contactStr = [invoice.customer.phone, invoice.customer.email].filter(Boolean).join(" · ");
  if (contactStr) {
    drawText(contactStr, rightX + 8, cy, { font: "F1", size: 7, color: [0.45, 0.45, 0.5] });
  }

  currentY += cardH + 12;

  // --- ITEMIZED PRODUCTS TABLE ---
  // Table column specifications
  interface ColDef {
    id: string;
    label: string;
    sublabel?: string;
    width: number;
    align: "left" | "right" | "center";
  }

  const columns: ColDef[] = [
    { id: "sno", label: "S.No", width: 24, align: "center" },
    {
      id: "desc",
      label: "Description of Goods & Services",
      sublabel: "Item, Size, Color & SKU",
      width: 172,
      align: "left",
    },
    { id: "hsn", label: "HSN", width: 38, align: "center" },
    { id: "qty", label: "Qty", width: 24, align: "center" },
    { id: "unit", label: "Gross", sublabel: "Price", width: 44, align: "right" },
    { id: "disc", label: "Disc", width: 38, align: "right" },
    { id: "taxable", label: "Taxable", sublabel: "Value", width: 48, align: "right" },
    { id: "rate", label: "GST %", width: 34, align: "center" },
    {
      id: "taxamt",
      label: invoice.customer.stateCode === invoice.seller.sellerStateCode ? "CGST+SGST" : "IGST",
      width: 50,
      align: "right",
    },
    { id: "total", label: "Total", width: 51.28, align: "right" },
  ];

  function renderTableHeader(y: number) {
    const thH = 22;
    drawRect(MARGIN_LEFT, y, CONTENT_WIDTH, thH, [0.93, 0.94, 0.96], [0.82, 0.83, 0.86], 0.75);

    let curX = MARGIN_LEFT;
    for (const col of columns) {
      const centerX = curX + col.width / 2;
      const rightXPos = curX + col.width - 4;
      const leftXPos = curX + 4;

      if (col.align === "center") {
        drawText(col.label, centerX, y + (col.sublabel ? 10 : 14), {
          font: "F2",
          size: 7,
          color: [0.15, 0.15, 0.18],
          align: "center",
        });
        if (col.sublabel) {
          drawText(col.sublabel, centerX, y + 18, {
            font: "F1",
            size: 5.5,
            color: [0.45, 0.45, 0.5],
            align: "center",
          });
        }
      } else if (col.align === "right") {
        drawText(col.label, rightXPos, y + (col.sublabel ? 10 : 14), {
          font: "F2",
          size: 7,
          color: [0.15, 0.15, 0.18],
          align: "right",
        });
        if (col.sublabel) {
          drawText(col.sublabel, rightXPos, y + 18, {
            font: "F1",
            size: 5.5,
            color: [0.45, 0.45, 0.5],
            align: "right",
          });
        }
      } else {
        drawText(col.label, leftXPos, y + (col.sublabel ? 10 : 14), {
          font: "F2",
          size: 7,
          color: [0.15, 0.15, 0.18],
        });
        if (col.sublabel) {
          drawText(col.sublabel, leftXPos, y + 18, {
            font: "F1",
            size: 5.5,
            color: [0.45, 0.45, 0.5],
          });
        }
      }

      curX += col.width;
      if (curX < MARGIN_LEFT + CONTENT_WIDTH) {
        drawLine(curX, y, curX, y + thH, [0.85, 0.85, 0.88], 0.5);
      }
    }

    return y + thH;
  }

  currentY = renderTableHeader(currentY);

  // Render Line Items
  for (let i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];

    // Compute description lines
    const titleLines = wrapText(item.productName, 164, 8, true);
    const variantParts: string[] = [];
    if (item.size) variantParts.push(`Size: ${item.size}`);
    if (item.color) variantParts.push(`Color: ${item.color}`);
    if (item.sku) variantParts.push(`SKU: ${item.sku}`);
    const variantStr = variantParts.join(" · ");
    const variantLines = variantStr ? wrapText(variantStr, 164, 6.5) : [];

    const totalTextLines = titleLines.length + variantLines.length;
    const rowHeight = Math.max(24, totalTextLines * 10 + 8);

    // Page break check (Leave at least 160pt for totals and footer)
    if (currentY + rowHeight > PAGE_HEIGHT - 170) {
      startNewPage();
      currentY = renderPageHeader(false);
      currentY = renderTableHeader(currentY);
    }

    // Row zebra background
    const bg: [number, number, number] = i % 2 === 0 ? [1, 1, 1] : [0.985, 0.985, 0.99];
    drawRect(MARGIN_LEFT, currentY, CONTENT_WIDTH, rowHeight, bg, [0.88, 0.88, 0.92], 0.5);

    let curX = MARGIN_LEFT;
    for (const col of columns) {
      const centerX = curX + col.width / 2;
      const rightXPos = curX + col.width - 4;
      const leftXPos = curX + 4;
      const midY = currentY + 12;

      if (col.id === "sno") {
        drawText(String(i + 1), centerX, midY, {
          font: "F1",
          size: 7.5,
          align: "center",
          color: [0.35, 0.35, 0.4],
        });
      } else if (col.id === "desc") {
        let textY = currentY + 10;
        for (const tl of titleLines) {
          drawText(tl, leftXPos, textY, { font: "F2", size: 7.5, color: [0.1, 0.1, 0.1] });
          textY += 9;
        }
        for (const vl of variantLines) {
          drawText(vl, leftXPos, textY, { font: "F1", size: 6.5, color: [0.45, 0.45, 0.5] });
          textY += 8;
        }
      } else if (col.id === "hsn") {
        drawText(item.hsnCode || "6109", centerX, midY, {
          font: "F1",
          size: 7,
          align: "center",
          color: [0.3, 0.3, 0.35],
        });
      } else if (col.id === "qty") {
        drawText(String(item.quantity), centerX, midY, {
          font: "F2",
          size: 8,
          align: "center",
          color: [0.1, 0.1, 0.1],
        });
      } else if (col.id === "unit") {
        drawText(fmtMoney(item.grossUnitPrice), rightXPos, midY, {
          font: "F1",
          size: 7.5,
          align: "right",
        });
      } else if (col.id === "disc") {
        const discStr = item.itemDiscount > 0 ? `-${fmtMoney(item.itemDiscount)}` : "—";
        drawText(discStr, rightXPos, midY, {
          font: "F1",
          size: 7.5,
          align: "right",
          color: item.itemDiscount > 0 ? [0.1, 0.6, 0.2] : [0.5, 0.5, 0.5],
        });
      } else if (col.id === "taxable") {
        drawText(fmtMoney(item.taxableAmount), rightXPos, midY, {
          font: "F2",
          size: 7.5,
          align: "right",
        });
      } else if (col.id === "rate") {
        drawText(invoice.isTaxInvoice ? `${item.gstRate}%` : "0%", centerX, midY, {
          font: "F1",
          size: 7.5,
          align: "center",
        });
      } else if (col.id === "taxamt") {
        const taxVal = item.cgstAmount + item.sgstAmount + item.igstAmount;
        drawText(fmtMoney(taxVal), rightXPos, midY, { font: "F1", size: 7.5, align: "right" });
      } else if (col.id === "total") {
        drawText(fmtMoney(item.lineTotal), rightXPos, midY, {
          font: "F2",
          size: 8,
          align: "right",
          color: [0.08, 0.08, 0.09],
        });
      }

      curX += col.width;
      if (curX < MARGIN_LEFT + CONTENT_WIDTH) {
        drawLine(curX, currentY, curX, currentY + rowHeight, [0.9, 0.9, 0.92], 0.5);
      }
    }

    currentY += rowHeight;
  }

  // Check space for totals block (requires ~130pt)
  if (currentY > PAGE_HEIGHT - 170) {
    startNewPage();
    currentY = renderPageHeader(false);
  }

  // --- SUMMARY TOTALS & TAX BREAKDOWN BLOCK ---
  const totalsBlockY = currentY + 8;
  const totalsLeftW = 310;
  const totalsRightW = CONTENT_WIDTH - totalsLeftW;

  // Left Side: Amount in Words & Notes
  drawRect(
    MARGIN_LEFT,
    totalsBlockY,
    totalsLeftW,
    104,
    [0.985, 0.985, 0.99],
    [0.88, 0.88, 0.92],
    0.5,
  );

  drawText("AMOUNT IN WORDS", MARGIN_LEFT + 8, totalsBlockY + 11, {
    font: "F2",
    size: 6.5,
    color: [0.45, 0.45, 0.5],
  });
  const wordsLines = wrapText(invoice.totals.amountInWords, totalsLeftW - 16, 7.5, true);
  let wy = totalsBlockY + 22;
  for (const wl of wordsLines.slice(0, 2)) {
    drawText(wl, MARGIN_LEFT + 8, wy, { font: "F2", size: 7.5, color: [0.08, 0.08, 0.09] });
    wy += 10;
  }

  // Payment Details Inside Left Block
  drawLine(
    MARGIN_LEFT,
    totalsBlockY + 44,
    MARGIN_LEFT + totalsLeftW,
    totalsBlockY + 44,
    [0.88, 0.88, 0.92],
    0.5,
  );
  drawText("PAYMENT INFORMATION", MARGIN_LEFT + 8, totalsBlockY + 54, {
    font: "F2",
    size: 6.5,
    color: [0.45, 0.45, 0.5],
  });
  drawText(`Method: ${invoice.payment.paymentMethod}`, MARGIN_LEFT + 8, totalsBlockY + 66, {
    font: "F2",
    size: 7.5,
  });

  const payStatusStr =
    invoice.payment.paymentStatus.toUpperCase() === "PAID" ? "PAID" : "PENDING (CASH ON DELIVERY)";
  const payColor: [number, number, number] =
    invoice.payment.paymentStatus.toUpperCase() === "PAID" ? [0.1, 0.6, 0.2] : [0.75, 0.35, 0.1];
  drawText(`Status: ${payStatusStr}`, MARGIN_LEFT + 8, totalsBlockY + 77, {
    font: "F2",
    size: 7.5,
    color: payColor,
  });

  if (invoice.payment.transactionId) {
    drawText(`Txn ID: ${invoice.payment.transactionId}`, MARGIN_LEFT + 8, totalsBlockY + 88, {
      font: "F1",
      size: 6.5,
      color: [0.4, 0.4, 0.45],
    });
  }

  // Right Side: Order Totals Table
  const totalsTableX = MARGIN_LEFT + totalsLeftW;
  drawRect(totalsTableX, totalsBlockY, totalsRightW, 104, [1, 1, 1], [0.88, 0.88, 0.92], 0.5);

  let ry = totalsBlockY + 12;
  const lineH = 12;

  function renderTotalRow(label: string, value: string, isBold = false, isAccent = false) {
    const labelColor: [number, number, number] = isBold ? [0.1, 0.1, 0.1] : [0.35, 0.35, 0.4];
    const valColor: [number, number, number] = isAccent
      ? [0.88, 0.11, 0.16]
      : isBold
        ? [0.1, 0.1, 0.1]
        : [0.2, 0.2, 0.25];
    const font = isBold ? "F2" : "F1";

    drawText(label, totalsTableX + 8, ry, { font, size: isBold ? 7.5 : 7, color: labelColor });
    drawText(value, totalsTableX + totalsRightW - 8, ry, {
      font,
      size: isBold ? 8 : 7.5,
      align: "right",
      color: valColor,
    });
    ry += lineH;
  }

  renderTotalRow("Taxable Amount", fmtMoney(invoice.totals.taxableSubtotal));

  if (invoice.isTaxInvoice) {
    if (invoice.totals.totalCgst > 0) {
      renderTotalRow("CGST (Central Tax)", fmtMoney(invoice.totals.totalCgst));
      renderTotalRow("SGST (State Tax)", fmtMoney(invoice.totals.totalSgst));
    } else if (invoice.totals.totalIgst > 0) {
      renderTotalRow("IGST (Integrated Tax)", fmtMoney(invoice.totals.totalIgst));
    }
  }

  if (invoice.totals.totalDiscount > 0) {
    const discLabel = invoice.totals.discountCode
      ? `Discount (${invoice.totals.discountCode})`
      : "Total Discount";
    renderTotalRow(discLabel, `-${fmtMoney(invoice.totals.totalDiscount)}`);
  }

  renderTotalRow(
    "Shipping & Packaging",
    invoice.totals.shippingCharge === 0 ? "FREE" : fmtMoney(invoice.totals.shippingCharge),
  );

  // Grand Total Highlight Bar
  const grandH = 22;
  drawRect(totalsTableX, totalsBlockY + 104 - grandH, totalsRightW, grandH, [0.08, 0.08, 0.09]);
  drawText("TOTAL INCL. TAXES", totalsTableX + 8, totalsBlockY + 104 - 8, {
    font: "F2",
    size: 8,
    color: [1, 1, 1],
  });
  drawText(
    `INR ${fmtMoney(invoice.totals.grandTotal)}`,
    totalsTableX + totalsRightW - 8,
    totalsBlockY + 104 - 8,
    {
      font: "F2",
      size: 10,
      align: "right",
      color: [1, 1, 1],
    },
  );

  currentY = totalsBlockY + 104 + 10;

  // --- FOOTER & SIGNATORY SECTION ---
  const footerH = 46;
  const signW = 160;
  const notesW = CONTENT_WIDTH - signW - 12;

  // Terms and Notes
  drawRect(MARGIN_LEFT, currentY, notesW, footerH, [0.99, 0.99, 1], [0.9, 0.9, 0.94], 0.5);
  drawText("TERMS & CONDITIONS", MARGIN_LEFT + 8, currentY + 10, {
    font: "F2",
    size: 6,
    color: [0.45, 0.45, 0.5],
  });
  let ny = currentY + 19;
  for (const note of invoice.notes.slice(0, 3)) {
    drawText(note, MARGIN_LEFT + 8, ny, { font: "F1", size: 6.5, color: [0.35, 0.35, 0.4] });
    ny += 9;
  }

  // Authorized Signatory
  const signX = MARGIN_LEFT + notesW + 12;
  drawRect(signX, currentY, signW, footerH, [1, 1, 1], [0.88, 0.88, 0.92], 0.5);
  drawText(
    `For ${invoice.seller.legalBusinessName || "RIOTOUS"}`,
    signX + signW / 2,
    currentY + 11,
    {
      font: "F2",
      size: 7,
      align: "center",
      color: [0.2, 0.2, 0.25],
    },
  );

  // Digital Signature Indicator Box
  drawRect(signX + 16, currentY + 16, signW - 32, 16, [0.96, 0.97, 0.99], [0.85, 0.88, 0.94], 0.5);
  drawText("Digitally Signed & Authenticated", signX + signW / 2, currentY + 27, {
    font: "F3",
    size: 6,
    align: "center",
    color: [0.2, 0.4, 0.7],
  });

  drawText(
    invoice.seller.authorizedSignatoryName || "Authorized Signatory",
    signX + signW / 2,
    currentY + 41,
    {
      font: "F2",
      size: 6.5,
      align: "center",
      color: [0.4, 0.4, 0.45],
    },
  );

  // --- FOOTER BRAND TAGLINE & PAGE NUMBERS ON ALL PAGES ---
  const totalPages = pages.length;
  for (let p = 0; p < totalPages; p++) {
    const pageOps = pages[p].ops;

    const bottomY = PAGE_HEIGHT - 20;
    // We append directly to pageOps
    const pageNumText = `Page ${p + 1} of ${totalPages}`;
    const escapedTagline = escapePdfText(
      "Thank you for shopping with RIOTOUS · riotous.store · support@riotous.store",
    );
    const escapedPage = escapePdfText(pageNumText);

    pageOps.push("BT");
    pageOps.push("/F1 6.5 Tf");
    pageOps.push("0.5 0.5 0.55 rg");
    pageOps.push(`1 0 0 1 ${MARGIN_LEFT} 16 Tm`);
    pageOps.push(`(${escapedTagline}) Tj`);
    pageOps.push("ET");

    const pageW = measureTextWidth(pageNumText, 6.5);
    pageOps.push("BT");
    pageOps.push("/F1 6.5 Tf");
    pageOps.push("0.5 0.5 0.55 rg");
    pageOps.push(`1 0 0 1 ${(MARGIN_LEFT + CONTENT_WIDTH - pageW).toFixed(2)} 16 Tm`);
    pageOps.push(`(${escapedPage}) Tj`);
    pageOps.push("ET");
  }

  // --- SERIALIZE COMPLETE PDF 1.4 BINARY ---
  const logoBytes = getRiotousLogoBytes();
  const logoAlphaBytes = getRiotousLogoAlphaBytes();
  return compilePdfDocument(pages, PAGE_WIDTH, PAGE_HEIGHT, logoBytes, logoAlphaBytes);
}

/**
 * Compiles page graphics operations into a valid PDF 1.4 binary.
 */
function compilePdfDocument(
  pages: Array<{ ops: string[] }>,
  width: number,
  height: number,
  logoBytes?: Uint8Array,
  logoAlphaBytes?: Uint8Array,
): Uint8Array {
  const objectBuffers: Uint8Array[] = [];
  const byteOffsets: number[] = [];
  const encoder = new TextEncoder();
  const headerBuf = encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  let currentOffset = headerBuf.length;

  function addStringObject(content: string) {
    const objBuf = encoder.encode(content);
    byteOffsets.push(currentOffset);
    currentOffset += objBuf.length;
    objectBuffers.push(objBuf);
  }

  function addBinaryObject(headerStr: string, binary: Uint8Array, footerStr: string) {
    const hBuf = encoder.encode(headerStr);
    const fBuf = encoder.encode(footerStr);
    const total = hBuf.length + binary.length + fBuf.length;
    const combined = new Uint8Array(total);
    combined.set(hBuf, 0);
    combined.set(binary, hBuf.length);
    combined.set(fBuf, hBuf.length + binary.length);

    byteOffsets.push(currentOffset);
    currentOffset += total;
    objectBuffers.push(combined);
  }

  // Obj 1: Catalog
  const pagesObjNum = 2;
  addStringObject(`1 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj\n`);

  // Obj 3..5: Standard Helvetica Fonts
  const f1Obj = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  const f2Obj = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
  const f3Obj = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>`;

  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const hasAlpha = Boolean(logoAlphaBytes && logoAlphaBytes.length > 0);
  const logoObjNum = hasLogo ? 6 : null;
  const alphaObjNum = hasLogo && hasAlpha ? 7 : null;
  let nextObjNum = hasLogo ? (hasAlpha ? 8 : 7) : 6;

  const pageObjNums: number[] = [];
  const contentStreamNums: number[] = [];

  for (let i = 0; i < pages.length; i++) {
    pageObjNums.push(nextObjNum++);
    contentStreamNums.push(nextObjNum++);
  }

  // Obj 2: Pages tree
  const kidsStr = pageObjNums.map((n) => `${n} 0 R`).join(" ");
  addStringObject(
    `2 0 obj\n<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${pages.length} >>\nendobj\n`,
  );

  // Obj 3..5: Fonts
  addStringObject(`3 0 obj\n${f1Obj}\nendobj\n`);
  addStringObject(`4 0 obj\n${f2Obj}\nendobj\n`);
  addStringObject(`5 0 obj\n${f3Obj}\nendobj\n`);

  // Obj 6: Optional Logo Image XObject
  if (hasLogo && logoBytes && logoObjNum) {
    const smaskEntry = alphaObjNum ? `/SMask ${alphaObjNum} 0 R ` : "";
    const imgStreamHeader = `${logoObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${RIOTOUS_LOGO_WIDTH} /Height ${RIOTOUS_LOGO_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode ${smaskEntry}/Length ${logoBytes.length} >>\nstream\n`;
    const imgStreamFooter = "\nendstream\nendobj\n";
    addBinaryObject(imgStreamHeader, logoBytes, imgStreamFooter);

    // Obj 7: Optional Soft-Mask (Alpha Channel)
    if (hasAlpha && logoAlphaBytes && alphaObjNum) {
      const alphaStreamHeader = `${alphaObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${RIOTOUS_LOGO_WIDTH} /Height ${RIOTOUS_LOGO_HEIGHT} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${logoAlphaBytes.length} >>\nstream\n`;
      const alphaStreamFooter = "\nendstream\nendobj\n";
      addBinaryObject(alphaStreamHeader, logoAlphaBytes, alphaStreamFooter);
    }
  }

  // Page and Content objects
  const xObjectRes = hasLogo && logoObjNum ? `/XObject << /Im1 ${logoObjNum} 0 R >> ` : "";
  for (let i = 0; i < pages.length; i++) {
    const pageNum = pageObjNums[i];
    const streamNum = contentStreamNums[i];
    const streamContent = pages[i].ops.join("\n") + "\n";
    const streamLength = encoder.encode(streamContent).length;

    // Page Object
    addStringObject(
      `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> ${xObjectRes}>> /Contents ${streamNum} 0 R >>\nendobj\n`,
    );

    // Content Stream Object
    addStringObject(
      `${streamNum} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}endstream\nendobj\n`,
    );
  }

  // Xref table
  const startXref = currentOffset;
  let xref = `xref\n0 ${objectBuffers.length + 1}\n0000000000 65535 f \n`;
  for (const offset of byteOffsets) {
    xref += String(offset).padStart(10, "0") + " 00000 n \n";
  }

  const trailer = `trailer\n<< /Size ${objectBuffers.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  const endBuf = encoder.encode(xref + trailer);

  const totalLength =
    headerBuf.length + objectBuffers.reduce((acc, b) => acc + b.length, 0) + endBuf.length;
  const result = new Uint8Array(totalLength);
  result.set(headerBuf, 0);
  let pos = headerBuf.length;
  for (const b of objectBuffers) {
    result.set(b, pos);
    pos += b.length;
  }
  result.set(endBuf, pos);
  return result;
}
