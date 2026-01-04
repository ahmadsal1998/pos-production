/**
 * Silent printing utility for POS system
 * Uses hidden iframe to print without opening new windows/tabs
 */

import { loadSettings } from './settingsStorage';
import { getPrintSettingsFromConfig, PrinterConfig } from './printerConfig';

// Guard to prevent multiple simultaneous print operations
let isPrinting = false;
let currentPrintIframe: HTMLIFrameElement | null = null;

/**
 * Get print settings from preferences with defaults
 * Uses printer configuration if printer type is set, otherwise falls back to manual settings
 */
const getPrintSettings = (): PrinterConfig & { 
  paperSize: string;
  paperWidth: number;
  paperHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  fontSize: number;
  tableFontSize: number;
  showBorders: boolean;
  compactMode: boolean;
} => {
  const settings = loadSettings();
  
  // If printer type is explicitly set, use the configuration
  if (settings && (settings as any).printerType) {
    const printerConfig = getPrintSettingsFromConfig(settings);
    return {
      ...printerConfig,
      paperSize: printerConfig.paperSize,
      paperWidth: printerConfig.paperWidth,
      paperHeight: printerConfig.paperHeight,
      marginTop: printerConfig.marginTop,
      marginBottom: printerConfig.marginBottom,
      marginLeft: printerConfig.marginLeft,
      marginRight: printerConfig.marginRight,
      fontSize: printerConfig.fontSize,
      tableFontSize: printerConfig.tableFontSize,
      showBorders: printerConfig.showBorders,
      compactMode: printerConfig.compactMode,
    };
  }
  
  // Use manual settings if printer type not set
  // Get default config for fallback values only
  const defaultConfig = getPrintSettingsFromConfig(null);
  
  return {
    ...defaultConfig,
    // Use saved settings with proper fallbacks - ensure we use saved values if they exist
    paperSize: settings?.printPaperSize || defaultConfig.paperSize,
    paperWidth: settings?.printPaperWidth ?? defaultConfig.paperWidth,
    paperHeight: settings?.printPaperHeight ?? defaultConfig.paperHeight,
    marginTop: settings?.printMarginTop ?? defaultConfig.marginTop,
    marginBottom: settings?.printMarginBottom ?? defaultConfig.marginBottom,
    marginLeft: settings?.printMarginLeft ?? defaultConfig.marginLeft,
    marginRight: settings?.printMarginRight ?? defaultConfig.marginRight,
    fontSize: settings?.printFontSize ?? defaultConfig.fontSize,
    tableFontSize: settings?.printTableFontSize ?? defaultConfig.tableFontSize,
    showBorders: settings?.printShowBorders ?? defaultConfig.showBorders,
    compactMode: settings?.printCompactMode ?? defaultConfig.compactMode,
  };
};

/**
 * Get @page size CSS based on paper size setting
 * Enhanced to support A3 and better thermal printer handling
 */
const getPageSize = (paperSize: string, width?: number, height?: number, orientation?: 'portrait' | 'landscape'): string => {
  const orient = orientation === 'landscape' ? 'landscape' : 'portrait';
  
  switch (paperSize) {
    case 'A4':
      return `size: A4 ${orient};`;
    case 'A3':
      return `size: A3 ${orient};`;
    case 'A5':
      return `size: A5 ${orient};`;
    case '80mm':
      // Thermal 80mm - use fixed width, auto height
      return 'size: 80mm auto;';
    case '58mm':
      // Thermal 58mm - use fixed width, auto height
      return 'size: 58mm auto;';
    case 'custom':
      if (width && height) {
        return `size: ${width}mm ${height}mm ${orient};`;
      }
      return `size: A4 ${orient};`;
    default:
      return `size: A4 ${orient};`;
  }
};

/**
 * Remove currency symbols from table cells (but keep in summary)
 */
const removeCurrencySymbolsFromTable = (node: Node, isInSummary: boolean = false): void => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    
    // Check if we're entering the receipt-summary or statement-summary section (skip processing this section)
    const isSummarySection = element.classList?.contains('receipt-summary') || 
                             element.classList?.contains('statement-summary') ||
                             element.classList?.contains('grand-total') ||
                             isInSummary;
    
    // If we're in the summary section, skip processing and just recurse
    if (isSummarySection) {
      const childNodes = Array.from(node.childNodes);
      childNodes.forEach(child => removeCurrencySymbolsFromTable(child, true));
      return;
    }
    
    // Check if this is a table cell (td) - only process these
    if (element.tagName === 'TD') {
      const processTextNode = (textNode: Node) => {
        if (textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || '';
          // Remove currency symbols that appear after numbers (most common format)
          const cleanedText = text
            .replace(/(\d+[.,]?\d*)\s*[\$€£¥₪₹]\s*/g, '$1') // Remove currency symbols after numbers
            .replace(/(\d+[.,]?\d*)\s*ر\.س\s*/g, '$1') // Remove Arabic SAR symbol after numbers
            .replace(/(\d+[.,]?\d*)\s*SAR\s*/gi, '$1') // Remove SAR text after numbers
            .replace(/(\d+[.,]?\d*)\s*ILS\s*/gi, '$1') // Remove ILS text after numbers
            .replace(/(\d+[.,]?\d*)\s*USD\s*/gi, '$1') // Remove USD text after numbers
            .replace(/(\d+[.,]?\d*)\s*EUR\s*/gi, '$1') // Remove EUR text after numbers
            .replace(/(\d+[.,]?\d*)\s*GBP\s*/gi, '$1') // Remove GBP text after numbers
            .replace(/(\d+[.,]?\d*)\s*JPY\s*/gi, '$1') // Remove JPY text after numbers
            .replace(/(\d+[.,]?\d*)\s*[A-Z]{3}\s*/g, '$1') // Remove any 3-letter currency codes after numbers
            // Also handle currency symbols before numbers (less common but possible)
            .replace(/[\$€£¥₪₹]\s*(\d+[.,]?\d*)/g, '$1') // Remove currency symbols before numbers
            .replace(/ر\.س\s*(\d+[.,]?\d*)/g, '$1'); // Remove Arabic SAR symbol before numbers
          textNode.textContent = cleanedText;
        }
      };
      
      // Process all text nodes in this table cell
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );
      let textNode;
      while (textNode = walker.nextNode()) {
        processTextNode(textNode);
      }
    }
    
    // Recursively process child nodes
    const childNodes = Array.from(node.childNodes);
    childNodes.forEach(child => removeCurrencySymbolsFromTable(child, isInSummary));
  } else if (node.nodeType === Node.TEXT_NODE && !isInSummary) {
    // For text nodes, check if parent is a table cell (and not in summary)
    const parent = node.parentElement;
    if (parent && parent.tagName === 'TD') {
      // Check if parent is inside summary section
      let currentParent: HTMLElement | null = parent;
      let insideSummary = false;
      while (currentParent) {
        if (currentParent.classList?.contains('receipt-summary') || 
            currentParent.classList?.contains('statement-summary') ||
            currentParent.classList?.contains('grand-total')) {
          insideSummary = true;
          break;
        }
        currentParent = currentParent.parentElement;
      }
      
      // Only process if not in summary section
      if (!insideSummary) {
        const text = node.textContent || '';
        const cleanedText = text
          .replace(/(\d+[.,]?\d*)\s*[\$€£¥₪₹]\s*/g, '$1')
          .replace(/(\d+[.,]?\d*)\s*ر\.س\s*/g, '$1')
          .replace(/(\d+[.,]?\d*)\s*SAR\s*/gi, '$1')
          .replace(/(\d+[.,]?\d*)\s*ILS\s*/gi, '$1')
          .replace(/(\d+[.,]?\d*)\s*USD\s*/gi, '$1')
          .replace(/(\d+[.,]?\d*)\s*EUR\s*/gi, '$1')
          .replace(/(\d+[.,]?\d*)\s*GBP\s*/gi, '$1')
          .replace(/(\d+[.,]?\d*)\s*JPY\s*/gi, '$1')
          .replace(/(\d+[.,]?\d*)\s*[A-Z]{3}\s*/g, '$1')
          .replace(/[\$€£¥₪₹]\s*(\d+[.,]?\d*)/g, '$1')
          .replace(/ر\.س\s*(\d+[.,]?\d*)/g, '$1');
        node.textContent = cleanedText;
      }
    }
  }
};

/**
 * Generate CSS styles for thermal printer (58mm or 80mm)
 * Uses fixed widths, explicit font sizes, no scaling
 */
const generateThermalStyles = (printSettings: PrinterConfig & { paperSize: string; paperWidth: number; paperHeight: number; marginTop: number; marginBottom: number; marginLeft: number; marginRight: number; fontSize: number; tableFontSize: number; showBorders: boolean; compactMode: boolean }): string => {
  const paperWidth = printSettings.paperWidth; // 58 or 80
  const fontSize = printSettings.fontSize;
  const tableFontSize = printSettings.tableFontSize;
  const pageSize = getPageSize(printSettings.paperSize, printSettings.paperWidth, printSettings.paperHeight, (printSettings as any).orientation);
  
  return `
    <style>
      @page {
        margin: ${printSettings.marginTop}cm ${printSettings.marginRight}cm ${printSettings.marginBottom}cm ${printSettings.marginLeft}cm;
        ${pageSize}
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: 'Courier New', 'Monaco', monospace;
        font-size: ${fontSize}px;
        color: #000;
        background: white;
        line-height: 1.3;
        width: ${paperWidth}mm;
        max-width: ${paperWidth}mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-hidden {
        display: none !important;
      }
      /* Receipt container - fixed width, no responsive */
      #printable-receipt {
        width: ${paperWidth}mm !important;
        max-width: ${paperWidth}mm !important;
        margin: 0 auto;
        padding: 4px 2px !important;
        background: white;
        border-radius: 0 !important;
        overflow: visible !important;
      }
      /* Store Logo - fixed size */
      #printable-receipt .receipt-logo {
        width: 60px !important;
        height: 60px !important;
        margin: 0 auto 8px auto !important;
        border-radius: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      #printable-receipt .receipt-logo:has(> div) {
        background: #000 !important;
        box-shadow: none !important;
      }
      #printable-receipt .receipt-logo svg {
        width: 30px !important;
        height: 30px !important;
        color: #ffffff !important;
        fill: none !important;
        stroke: #ffffff !important;
        stroke-width: 2 !important;
      }
      #printable-receipt .receipt-logo img {
        width: 60px !important;
        height: 60px !important;
        max-width: 60px !important;
        max-height: 60px !important;
        object-fit: contain !important;
        border-radius: 0 !important;
        background: white !important;
        padding: 2px !important;
        border: 1px solid #000 !important;
        box-shadow: none !important;
      }
      /* Store name header */
      #printable-receipt h1 {
        margin: 0 0 6px 0;
        font-weight: 900;
        font-size: ${Math.max(fontSize + 2, 14)}px !important;
        line-height: 1.2;
        text-align: center !important;
        color: #000000 !important;
      }
      #printable-receipt h2,
      #printable-receipt h3 {
        margin: 0 0 4px 0;
        font-weight: 700;
        font-size: ${Math.max(fontSize, 10)}px !important;
        line-height: 1.2;
      }
      /* Store header container */
      #printable-receipt > div.text-center:first-of-type,
      #printable-receipt .text-center.mb-6,
      #printable-receipt .text-center.mb-8 {
        margin-bottom: 6px !important;
        padding-bottom: 4px !important;
        border-bottom: 1px solid #000 !important;
        text-align: center !important;
      }
      /* Address below store name */
      #printable-receipt .text-center p {
        margin: 2px 0 0 0 !important;
        font-size: ${Math.max(fontSize - 2, 8)}px !important;
        color: #000000 !important;
        line-height: 1.3;
        text-align: center !important;
      }
      /* Table - fixed layout, character-based */
      #printable-receipt table {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        border-spacing: 0 !important;
        margin: 8px 0 !important;
        font-size: ${tableFontSize}px !important;
        background: white !important;
        table-layout: fixed !important;
        border: 1px solid #000 !important;
      }
      #printable-receipt table thead {
        background-color: transparent !important;
        display: table-header-group;
      }
      #printable-receipt table th {
        padding: 4px 2px !important;
        text-align: center !important;
        font-weight: 900 !important;
        border: 1px solid #000 !important;
        color: #000000 !important;
        font-size: ${tableFontSize}px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.3px !important;
        word-wrap: break-word;
        overflow-wrap: break-word;
        background-color: #ffffff !important;
      }
      #printable-receipt table td {
        padding: 4px 2px !important;
        border: 1px solid #000 !important;
        text-align: center !important;
        font-size: ${tableFontSize}px !important;
        color: #000000 !important;
        word-wrap: break-word;
        overflow-wrap: break-word;
        line-height: 1.4;
        background-color: white !important;
        height: auto !important;
        max-height: none !important;
      }
      #printable-receipt table td:first-child,
      #printable-receipt table th:first-child {
        text-align: right !important;
      }
      #printable-receipt table td:first-child {
        font-weight: 600 !important;
      }
      #printable-receipt table tbody tr {
        page-break-inside: avoid;
      }
      #printable-receipt table tbody tr:last-child {
        border-bottom: 1px solid #000 !important;
      }
      /* CUSTOMER STATEMENT SPECIFIC STYLES - Distinct from Invoice Layout */
      /* Customer Statement Container - Different from Invoice */
      #printable-receipt.customer-statement-print {
        /* Statement-specific styling - ensure it's distinct from invoices */
      }
      
      /* Statement Summary - Different from Invoice Summary */
      #printable-receipt.customer-statement-print .statement-summary {
        margin-top: 8px !important;
        margin-bottom: 8px !important;
        padding: 6px 0 !important;
        border-top: 1px solid #000 !important;
        border-bottom: 1px solid #000 !important;
      }
      #printable-receipt.customer-statement-print .statement-summary > div {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 3px 0 !important;
        font-size: ${fontSize}px !important;
        line-height: 1.4 !important;
      }
      #printable-receipt.customer-statement-print .statement-summary > div span:first-child {
        color: #000000 !important;
        font-weight: 600 !important;
      }
      #printable-receipt.customer-statement-print .statement-summary > div span:last-child {
        color: #000000 !important;
        font-weight: 700 !important;
      }
      #printable-receipt.customer-statement-print .statement-summary .grand-total {
        font-weight: 900 !important;
        font-size: ${Math.max(fontSize + 1, 12)}px !important;
        padding: 6px 0 !important;
        margin-top: 4px !important;
        border-top: 2px solid #000 !important;
        border-radius: 0 !important;
        background-color: #ffffff !important;
        color: #000000 !important;
      }
      #printable-receipt.customer-statement-print .statement-summary .grand-total span:first-child {
        font-size: ${Math.max(fontSize + 1, 12)}px !important;
        font-weight: 900 !important;
      }
      #printable-receipt.customer-statement-print .statement-summary .grand-total span:last-child {
        font-size: ${Math.max(fontSize + 2, 14)}px !important;
        font-weight: 900 !important;
      }
      
      /* PRINT-ONLY: Statement table column styles for thermal printers - Optimized for narrow paper (58mm/80mm) */
      /* NOTE: These styles are injected into a print-only iframe and do NOT affect on-screen display */
      #printable-receipt .statement-transactions-table {
        width: 100% !important;
        max-width: 100% !important;
        table-layout: fixed !important;
        font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
        border-collapse: collapse !important;
        border-spacing: 0 !important;
        margin: 4px 0 !important;
      }
      /* PRINT-ONLY: Compact column widths for thermal printers - all 4 columns must fit: Date(12%) + Description(28%) + Amount(22%) + Balance(20%) = 82% (leaving room for borders/padding) */
      #printable-receipt .statement-transactions-table .statement-col-date {
        width: 12% !important;
        min-width: 0 !important;
        max-width: 12% !important;
        text-align: right !important;
        color: #000000 !important;
        padding: 1px !important;
        font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        border: 1px solid #000 !important;
      }
      #printable-receipt .statement-transactions-table .statement-col-description {
        width: 28% !important;
        min-width: 0 !important;
        max-width: 28% !important;
        text-align: right !important;
        color: #000000 !important;
        word-wrap: break-word !important;
        padding: 1px !important;
        font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
        overflow-wrap: break-word !important;
        hyphens: auto !important;
        line-height: 1.2 !important;
        border: 1px solid #000 !important;
      }
      #printable-receipt .statement-transactions-table .statement-col-amount {
        width: 22% !important;
        min-width: 0 !important;
        max-width: 22% !important;
        text-align: right !important;
        font-family: 'Courier New', monospace !important;
        color: #000000 !important;
        padding: 1px !important;
        font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        border: 1px solid #000 !important;
      }
      #printable-receipt .statement-transactions-table .print-text-black {
        color: #000000 !important;
      }
      #printable-receipt .statement-transactions-table .statement-col-balance {
        width: 20% !important;
        min-width: 0 !important;
        max-width: 20% !important;
        text-align: right !important;
        font-family: 'Courier New', monospace !important;
        font-weight: 600 !important;
        color: #000000 !important;
        padding: 1px !important;
        font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        border: 1px solid #000 !important;
      }
      /* PRINT-ONLY: Ensure all statement table content (cells and headers) is black for thermal printers */
      /* NOTE: This forces black text in print; on-screen display can use colors */
      #printable-receipt .statement-transactions-table td,
      #printable-receipt .statement-transactions-table th {
        color: #000000 !important;
      }
      /* Ensure table headers also use compact sizing for thermal printers */
      #printable-receipt .statement-transactions-table th.statement-col-date,
      #printable-receipt .statement-transactions-table th.statement-col-description,
      #printable-receipt .statement-transactions-table th.statement-col-amount,
      #printable-receipt .statement-transactions-table th.statement-col-balance {
        padding: 1px !important;
        font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
        font-weight: 700 !important;
        color: #000000 !important;
        text-transform: none !important;
        letter-spacing: 0 !important;
        border: 1px solid #000 !important;
      }
      /* Invoice info section */
      #printable-receipt .invoice-info {
        padding: 4px 0 !important;
        border-bottom: 1px dashed #000 !important;
        margin-bottom: 6px !important;
      }
      #printable-receipt .invoice-info .grid {
        display: block !important;
        margin-top: 0 !important;
      }
      #printable-receipt .invoice-info .grid > div {
        display: block !important;
        margin-bottom: 4px !important;
      }
      #printable-receipt .invoice-info .grid span.text-xs {
        font-size: ${Math.max(tableFontSize - 1, 8)}px !important;
        font-weight: 600 !important;
        color: #000 !important;
        margin-bottom: 2px !important;
        line-height: 1.3;
        display: block;
      }
      #printable-receipt .invoice-info .grid span.text-sm {
        font-size: ${tableFontSize}px !important;
        font-weight: 600 !important;
        color: #000000 !important;
        line-height: 1.3;
        display: block;
      }
      /* Summary section */
      #printable-receipt .receipt-summary {
        margin-top: 6px !important;
        padding-top: 6px !important;
        border-top: 1px dashed #000 !important;
      }
      #printable-receipt .receipt-summary > div {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 4px 0 !important;
        font-size: ${fontSize}px !important;
        line-height: 1.4 !important;
      }
      #printable-receipt .receipt-summary > div span:first-child {
        color: #000000 !important;
        font-weight: 500 !important;
      }
      #printable-receipt .receipt-summary > div span:last-child {
        color: #000000 !important;
        font-weight: 600 !important;
      }
      #printable-receipt .receipt-summary .grand-total {
        font-weight: 900 !important;
        font-size: ${Math.max(fontSize + 1, 12)}px !important;
        padding: 8px 0 !important;
        margin-top: 8px !important;
        border-top: 2px solid #000 !important;
        border-radius: 0 !important;
        background-color: #ffffff !important;
        color: #000000 !important;
        box-shadow: none !important;
      }
      #printable-receipt .receipt-summary .grand-total span:first-child {
        font-size: ${Math.max(fontSize + 1, 12)}px !important;
        font-weight: 900 !important;
        text-transform: uppercase !important;
      }
      #printable-receipt .receipt-summary .grand-total span:last-child {
        font-size: ${Math.max(fontSize + 2, 14)}px !important;
        font-weight: 900 !important;
      }
      /* Footer - hidden in print */
      #printable-receipt .receipt-footer {
        display: none !important;
      }
      #printable-receipt .receipt-footer p:last-child {
        display: none !important;
      }
      /* Force all text to be black */
      #printable-receipt,
      #printable-receipt * {
        color: #000000 !important;
        color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      /* Print media */
      @media print {
        @page {
          margin: ${printSettings.marginTop}cm ${printSettings.marginRight}cm ${printSettings.marginBottom}cm ${printSettings.marginLeft}cm;
          size: ${paperWidth}mm auto;
        }
        body {
          margin: 0;
          padding: 0;
          background: white !important;
          color: #000000 !important;
          width: ${paperWidth}mm !important;
          max-width: ${paperWidth}mm !important;
        }
        #printable-receipt {
          box-shadow: none !important;
          border: none !important;
          max-width: ${paperWidth}mm !important;
          width: ${paperWidth}mm !important;
          margin: 0 !important;
          padding: 8px 4px !important;
          background: white !important;
        }
        .print-hidden {
          display: none !important;
          visibility: hidden !important;
        }
        #printable-receipt table {
          border: 1px solid #000 !important;
        }
        #printable-receipt tr {
          page-break-inside: avoid;
        }
        #printable-receipt * {
          color: #000000 !important;
        }
        #printable-receipt .statement-table-container {
          max-height: none !important;
          overflow: visible !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        /* Statement table column alignment for thermal printers - Ensure all 4 columns fit */
        #printable-receipt .statement-transactions-table {
          width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed !important;
          font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
          border-collapse: collapse !important;
          border-spacing: 0 !important;
        }
        #printable-receipt .statement-transactions-table .statement-col-date {
          width: 12% !important;
          max-width: 12% !important;
          text-align: right !important;
          color: #000000 !important;
          padding: 1px !important;
          font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
          overflow: hidden !important;
        }
        #printable-receipt .statement-transactions-table .statement-col-description {
          width: 28% !important;
          max-width: 28% !important;
          text-align: right !important;
          color: #000000 !important;
          padding: 1px !important;
          font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        #printable-receipt .statement-transactions-table .statement-col-amount {
          width: 22% !important;
          max-width: 22% !important;
          text-align: right !important;
          color: #000000 !important;
          padding: 1px !important;
          font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
          overflow: hidden !important;
        }
        #printable-receipt .statement-transactions-table .statement-col-balance {
          width: 20% !important;
          max-width: 20% !important;
          text-align: right !important;
          color: #000000 !important;
          padding: 1px !important;
          font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
          overflow: hidden !important;
        }
        /* Ensure table headers fit */
        #printable-receipt .statement-transactions-table th {
          padding: 1px !important;
          font-size: ${Math.max(tableFontSize - 2, 7)}px !important;
          font-weight: 700 !important;
        }
        /* Customer Statement - Ensure distinct from Invoice in print */
        #printable-receipt.customer-statement-print {
          /* Statement uses transaction table layout, NOT invoice item layout */
        }
        /* Hide invoice-specific elements in statements */
        #printable-receipt.customer-statement-print .invoice-info,
        #printable-receipt.customer-statement-print .receipt-logo {
          display: none !important;
        }
        /* Statement summary styling in print */
        #printable-receipt.customer-statement-print .statement-summary {
          border-top: 1px solid #000 !important;
          border-bottom: 1px solid #000 !important;
        }
      }
    </style>
  `;
};

/**
 * Generate CSS styles for A4/A3 printers (unchanged from original)
 */
const generateA4Styles = (printSettings: PrinterConfig & { paperSize: string; paperWidth: number; paperHeight: number; marginTop: number; marginBottom: number; marginLeft: number; marginRight: number; fontSize: number; tableFontSize: number; showBorders: boolean; compactMode: boolean }): string => {
  const pageSize = getPageSize(
    printSettings.paperSize, 
    printSettings.paperWidth, 
    printSettings.paperHeight,
    (printSettings as any).orientation
  );
  
  const tablePadding = printSettings.compactMode ? '8px 6px' : '12px 10px';
  const tableMargin = printSettings.compactMode ? '12px 0' : '18px 0';
  const summaryMargin = printSettings.compactMode ? '18px' : '24px';
  const summaryPadding = printSettings.compactMode ? '12px' : '18px';
  const minFontSize = Math.max(printSettings.fontSize, 12);
  const minTableFontSize = Math.max(printSettings.tableFontSize, 11);
  
  const printBorderStyle = '1px solid #000000';
  const printBorderThick = '2px solid #000000';
  const printBorderBottom = '1px solid #333333';
  
  return `
    <style>
      @page {
        margin: ${printSettings.marginTop}cm ${printSettings.marginRight}cm ${printSettings.marginBottom}cm ${printSettings.marginLeft}cm;
        ${pageSize}
      }
      body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif;
        font-size: ${minFontSize}px;
        color: #000;
        background: white;
        line-height: ${printSettings.compactMode ? '1.4' : '1.6'};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      * {
        box-sizing: border-box;
      }
      .print-hidden {
        display: none !important;
      }
      #printable-receipt {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 auto;
        padding: ${printSettings.compactMode ? '8px' : '12px'} !important;
        background: white;
        page-break-inside: avoid;
        border-radius: 12px !important;
      }
      #printable-receipt .receipt-logo {
        width: ${printSettings.compactMode ? '90px' : '120px'} !important;
        height: ${printSettings.compactMode ? '90px' : '120px'} !important;
        margin: 0 auto ${printSettings.compactMode ? '20px' : '24px'} auto !important;
        border-radius: 16px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        page-break-inside: avoid;
      }
      #printable-receipt .receipt-logo:has(> div) {
        background: linear-gradient(135deg, #f97316 0%, #f59e0b 50%, #ea580c 100%) !important;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
      }
      #printable-receipt .receipt-logo svg {
        width: ${printSettings.compactMode ? '40px' : '50px'} !important;
        height: ${printSettings.compactMode ? '40px' : '50px'} !important;
        color: #ffffff !important;
        fill: none !important;
        stroke: #ffffff !important;
        stroke-width: 2.5 !important;
      }
      #printable-receipt .receipt-logo img {
        width: ${printSettings.compactMode ? '90px' : '120px'} !important;
        height: ${printSettings.compactMode ? '90px' : '120px'} !important;
        max-width: ${printSettings.compactMode ? '90px' : '120px'} !important;
        max-height: ${printSettings.compactMode ? '90px' : '120px'} !important;
        object-fit: contain !important;
        border-radius: 16px !important;
        background: white !important;
        padding: 8px !important;
        border: 2px solid #e5e7eb !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        page-break-inside: avoid;
      }
      #printable-receipt h1 {
        margin: 0 0 ${printSettings.compactMode ? '12px' : '16px'} 0;
        font-weight: 900;
        font-size: ${printSettings.compactMode ? '28px' : '32px'} !important;
        line-height: 1.2;
        text-align: center !important;
        page-break-after: avoid;
        color: #000000 !important;
      }
      #printable-receipt h2,
      #printable-receipt h3 {
        margin: 0 0 ${printSettings.compactMode ? '10px' : '12px'} 0;
        font-weight: 700;
        font-size: ${printSettings.compactMode ? '18px' : '20px'};
        line-height: 1.3;
        page-break-after: avoid;
      }
      #printable-receipt > div.text-center:first-of-type,
      #printable-receipt .text-center.mb-6,
      #printable-receipt .text-center.mb-8 {
        margin-bottom: ${printSettings.compactMode ? '8px' : '12px'} !important;
        padding-bottom: ${printSettings.compactMode ? '6px' : '8px'} !important;
        border-bottom: 3px solid #e5e7eb !important;
        text-align: center !important;
      }
      #printable-receipt .text-center p {
        margin: ${printSettings.compactMode ? '6px 0 0 0' : '8px 0 0 0'} !important;
        font-size: ${Math.max(printSettings.compactMode ? 11 : 12, 11)}px !important;
        color: #000000 !important;
        line-height: 1.5;
        text-align: center !important;
      }
      #printable-receipt table {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        border-spacing: 0 !important;
        margin: ${tableMargin} !important;
        font-size: ${minTableFontSize}px !important;
        background: white !important;
        table-layout: auto;
        page-break-inside: auto;
        border: 1px solid #000000 !important;
      }
      #printable-receipt table thead {
        background-color: transparent !important;
        background: transparent !important;
        display: table-header-group;
      }
      #printable-receipt table thead tr {
        page-break-inside: avoid;
        page-break-after: avoid;
      }
      #printable-receipt table th {
        padding: ${tablePadding} !important;
        text-align: center !important;
        font-weight: 900 !important;
        border: 1px solid #000000 !important;
        color: #000000 !important;
        font-size: ${Math.max(minTableFontSize - 1, 10)}px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
        min-width: 0;
        background-color: #f9fafb !important;
        background: #f9fafb !important;
      }
      #printable-receipt table td {
        padding: ${tablePadding} !important;
        border: 1px solid #000000 !important;
        text-align: center !important;
        font-size: ${minTableFontSize}px !important;
        color: #000000 !important;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
        min-width: 0;
        line-height: 1.6;
        background-color: white !important;
      }
      #printable-receipt table td:first-child {
        font-weight: 600 !important;
      }
      #printable-receipt table td:first-child,
      #printable-receipt table th:first-child {
        text-align: right !important;
      }
      #printable-receipt table tbody tr {
        page-break-inside: avoid;
        page-break-after: auto;
        border-bottom: ${printBorderBottom} !important;
      }
      #printable-receipt table tbody tr:last-child {
        border-bottom: ${printBorderThick} !important;
      }
      #printable-receipt table th[style*="border"],
      #printable-receipt table td[style*="border"] {
        border: ${printBorderStyle} !important;
      }
      #printable-receipt table td:nth-child(2),
      #printable-receipt table th:nth-child(2),
      #printable-receipt table td:nth-child(3),
      #printable-receipt table th:nth-child(3) {
        white-space: nowrap;
        width: auto;
        min-width: 60px;
      }
      #printable-receipt table td:last-child,
      #printable-receipt table th:last-child {
        white-space: nowrap;
        font-weight: 600;
      }
      /* CUSTOMER STATEMENT SPECIFIC STYLES FOR A4 - Distinct from Invoice Layout */
      /* Customer Statement Container - Different from Invoice */
      #printable-receipt.customer-statement-print {
        /* Statement-specific styling - ensure it's distinct from invoices */
      }
      
      /* Statement Summary for A4 - Different from Invoice Summary */
      #printable-receipt.customer-statement-print .statement-summary {
        margin-top: ${printSettings.compactMode ? '10px' : '14px'} !important;
        margin-bottom: ${printSettings.compactMode ? '10px' : '14px'} !important;
        padding: ${printSettings.compactMode ? '8px' : '12px'} !important;
        border-top: 2px solid #000000 !important;
        border-bottom: 2px solid #000000 !important;
        page-break-inside: avoid;
        background-color: #ffffff !important;
      }
      #printable-receipt.customer-statement-print .statement-summary > div {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: ${printSettings.compactMode ? '6px 0' : '8px 0'} !important;
        font-size: ${minFontSize}px !important;
        line-height: 1.5 !important;
        page-break-inside: avoid;
      }
      #printable-receipt.customer-statement-print .statement-summary > div span:first-child {
        color: #000000 !important;
        font-weight: 600 !important;
      }
      #printable-receipt.customer-statement-print .statement-summary > div span:last-child {
        color: #000000 !important;
        font-weight: 700 !important;
      }
      #printable-receipt.customer-statement-print .statement-summary .grand-total {
        font-weight: 900 !important;
        font-size: ${Math.max(printSettings.compactMode ? 16 : 18, 16)}px !important;
        padding: ${printSettings.compactMode ? '12px' : '16px'} !important;
        margin-top: ${printSettings.compactMode ? '8px' : '12px'} !important;
        border-top: 3px solid #000000 !important;
        border-radius: 0 !important;
        background-color: #ffffff !important;
        background: #ffffff !important;
        page-break-inside: avoid;
        color: #000000 !important;
        box-shadow: none !important;
      }
      #printable-receipt.customer-statement-print .statement-summary .grand-total span:first-child {
        font-size: ${Math.max(printSettings.compactMode ? 16 : 18, 16)}px !important;
        font-weight: 900 !important;
      }
      #printable-receipt.customer-statement-print .statement-summary .grand-total span:last-child {
        font-size: ${Math.max(printSettings.compactMode ? 18 : 20, 18)}px !important;
        font-weight: 900 !important;
      }
      
      /* PRINT-ONLY: Statement table column styles for A4 printers */
      /* NOTE: These styles are injected into a print-only iframe and do NOT affect on-screen display */
      #printable-receipt .statement-transactions-table {
        width: 100% !important;
        table-layout: auto !important;
      }
      #printable-receipt .statement-transactions-table .statement-col-date {
        width: 12% !important;
        min-width: 80px !important;
        text-align: right !important;
        color: #000000 !important;
      }
      #printable-receipt .statement-transactions-table .statement-col-description {
        width: auto !important;
        min-width: 150px !important;
        text-align: right !important;
        color: #000000 !important;
        word-wrap: break-word !important;
      }
      #printable-receipt .statement-transactions-table .statement-col-amount {
        width: 18% !important;
        min-width: 120px !important;
        text-align: right !important;
        font-family: 'Courier New', monospace !important;
        white-space: nowrap !important;
        color: #000000 !important;
      }
      #printable-receipt .statement-transactions-table .print-text-black {
        color: #000000 !important;
      }
      #printable-receipt .statement-transactions-table .statement-col-balance {
        width: 18% !important;
        min-width: 120px !important;
        text-align: right !important;
        font-family: 'Courier New', monospace !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
        color: #000000 !important;
      }
      #printable-receipt table td[style*="text-right"],
      #printable-receipt table th[style*="text-right"] {
        text-align: right !important;
      }
      #printable-receipt table td[style*="text-left"],
      #printable-receipt table th[style*="text-left"] {
        text-align: left !important;
      }
      #printable-receipt table td[style*="text-center"],
      #printable-receipt table th[style*="text-center"] {
        text-align: center !important;
      }
      #printable-receipt .receipt-summary {
        margin-top: ${printSettings.compactMode ? '8px' : '12px'} !important;
        padding-top: ${printSettings.compactMode ? '8px' : '12px'} !important;
        border-top: 2px dashed #e5e7eb !important;
        page-break-inside: avoid;
      }
      #printable-receipt .receipt-summary > div {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: ${printSettings.compactMode ? '6px 0' : '8px 0'} !important;
        font-size: ${minFontSize}px !important;
        line-height: 1.5 !important;
        page-break-inside: avoid;
      }
      #printable-receipt .receipt-summary > div span:first-child {
        color: #000000 !important;
        font-weight: 500 !important;
      }
      #printable-receipt .receipt-summary > div span:last-child {
        color: #000000 !important;
        font-weight: 600 !important;
      }
      #printable-receipt .receipt-summary .grand-total {
        font-weight: 900 !important;
        font-size: ${Math.max(printSettings.compactMode ? 16 : 18, 16)}px !important;
        padding: ${printSettings.compactMode ? '16px' : '20px'} !important;
        margin-top: ${printSettings.compactMode ? '16px' : '16px'} !important;
        border-top: 3px solid #f97316 !important;
        border-radius: 8px !important;
        background-color: #fff7ed !important;
        background: #fff7ed !important;
        page-break-inside: avoid;
        color: #000000 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
      }
      #printable-receipt .receipt-summary .grand-total span:first-child {
        font-size: ${Math.max(printSettings.compactMode ? 16 : 18, 16)}px !important;
        font-weight: 900 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
      }
      #printable-receipt .receipt-summary .grand-total span:last-child {
        font-size: ${Math.max(printSettings.compactMode ? 18 : 20, 18)}px !important;
        font-weight: 900 !important;
        letter-spacing: -0.5px !important;
      }
      #printable-receipt .invoice-info {
        padding: ${printSettings.compactMode ? '6px 0' : '8px 0'} !important;
        border-bottom: 2px dashed #e5e7eb !important;
        margin-bottom: ${printSettings.compactMode ? '8px' : '12px'} !important;
        page-break-inside: avoid;
      }
      #printable-receipt .invoice-info .grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: ${printSettings.compactMode ? '12px' : '16px'} !important;
        margin-top: 0 !important;
      }
      #printable-receipt .invoice-info .grid > div {
        display: flex !important;
        flex-direction: column !important;
      }
      #printable-receipt .invoice-info .grid span.text-xs {
        font-size: ${Math.max(minTableFontSize, 10)}px !important;
        font-weight: 600 !important;
        color: #6b7280 !important;
        margin-bottom: 8px !important;
        line-height: 1.4;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
      }
      #printable-receipt .invoice-info .grid span.text-sm {
        font-size: ${Math.max(minFontSize, 12)}px !important;
        font-weight: 600 !important;
        color: #000000 !important;
        line-height: 1.5;
      }
      /* Footer - hidden in print */
      #printable-receipt .receipt-footer {
        display: none !important;
      }
      #printable-receipt .receipt-footer p:last-child {
        display: none !important;
      }
      #printable-receipt {
        color: #000000 !important;
      }
      #printable-receipt * {
        color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      #printable-receipt p,
      #printable-receipt span,
      #printable-receipt div,
      #printable-receipt td,
      #printable-receipt th {
        color: #000000 !important;
      }
      #printable-receipt {
        overflow: visible !important;
      }
      #printable-receipt table {
        overflow: visible !important;
      }
      @media print {
        @page {
          margin: ${printSettings.marginTop}cm ${printSettings.marginRight}cm ${printSettings.marginBottom}cm ${printSettings.marginLeft}cm;
        }
        body {
          margin: 0;
          padding: 0;
          background: white !important;
          color: #000000 !important;
        }
        #printable-receipt {
          box-shadow: none !important;
          border: none !important;
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: ${printSettings.compactMode ? '8px' : '12px'} !important;
          background: white !important;
        }
        .print-hidden {
          display: none !important;
          visibility: hidden !important;
        }
        #printable-receipt table {
          page-break-inside: auto;
          border: ${printBorderThick} !important;
        }
        #printable-receipt tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        #printable-receipt .statement-table-container {
          max-height: none !important;
          overflow: visible !important;
        }
        /* PRINT-ONLY: Statement table column alignment for A4 printers */
        /* NOTE: These styles are injected into a print-only iframe and do NOT affect on-screen display */
        #printable-receipt .statement-transactions-table .statement-col-date,
        #printable-receipt .statement-transactions-table .statement-col-description {
          text-align: right !important;
          color: #000000 !important;
        }
        #printable-receipt .statement-transactions-table .statement-col-amount,
        #printable-receipt .statement-transactions-table .statement-col-balance {
          text-align: right !important;
          font-family: 'Courier New', monospace !important;
          color: #000000 !important;
        }
        #printable-receipt .statement-transactions-table .statement-col-balance {
          font-weight: 600 !important;
        }
        /* Ensure all statement table headers are black in A4 print */
        #printable-receipt .statement-transactions-table th {
          color: #000000 !important;
        }
        /* Customer Statement - Ensure distinct from Invoice in A4 print */
        #printable-receipt.customer-statement-print {
          /* Statement uses transaction table layout, NOT invoice item layout */
        }
        /* Hide invoice-specific elements in statements */
        #printable-receipt.customer-statement-print .invoice-info,
        #printable-receipt.customer-statement-print .receipt-logo {
          display: none !important;
        }
        /* Statement summary styling in A4 print */
        #printable-receipt.customer-statement-print .statement-summary {
          border-top: 2px solid #000 !important;
          border-bottom: 2px solid #000 !important;
          background-color: #ffffff !important;
        }
        #printable-receipt thead {
          display: table-header-group;
          background-color: transparent !important;
          background: transparent !important;
        }
        #printable-receipt tfoot {
          display: table-footer-group;
        }
        #printable-receipt p, 
        #printable-receipt div {
          orphans: 3;
          widows: 3;
        }
        #printable-receipt .receipt-logo {
          width: ${printSettings.compactMode ? '90px' : '120px'} !important;
          height: ${printSettings.compactMode ? '90px' : '120px'} !important;
          margin: 0 auto ${printSettings.compactMode ? '20px' : '24px'} auto !important;
        }
        #printable-receipt .receipt-logo:has(> div) {
          background: linear-gradient(135deg, #f97316 0%, #f59e0b 50%, #ea580c 100%) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
        }
        #printable-receipt .receipt-logo svg {
          width: ${printSettings.compactMode ? '40px' : '50px'} !important;
          height: ${printSettings.compactMode ? '40px' : '50px'} !important;
          color: #ffffff !important;
        }
        #printable-receipt .receipt-logo img {
          width: ${printSettings.compactMode ? '90px' : '120px'} !important;
          height: ${printSettings.compactMode ? '90px' : '120px'} !important;
          max-width: ${printSettings.compactMode ? '90px' : '120px'} !important;
          max-height: ${printSettings.compactMode ? '90px' : '120px'} !important;
          object-fit: contain !important;
          background: white !important;
          border: 2px solid #e5e7eb !important;
        }
        #printable-receipt h1 {
          font-size: ${printSettings.compactMode ? '28px' : '32px'} !important;
          font-weight: 900 !important;
          text-align: center !important;
          margin-bottom: ${printSettings.compactMode ? '12px' : '16px'} !important;
          color: #000000 !important;
        }
        #printable-receipt > div.text-center:first-of-type,
        #printable-receipt .text-center.mb-6 {
          border-bottom: 2px solid #000000 !important;
          padding-bottom: ${printSettings.compactMode ? '14px' : '16px'} !important;
          margin-bottom: ${printSettings.compactMode ? '20px' : '24px'} !important;
        }
        #printable-receipt * {
          color: #000000 !important;
        }
        #printable-receipt {
          background: white !important;
        }
        #printable-receipt table {
          border: 1px solid #000000 !important;
          border-collapse: collapse !important;
        }
        #printable-receipt table th {
          border: 1px solid #000000 !important;
          background-color: #f9fafb !important;
          background: #f9fafb !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
        }
        #printable-receipt table td {
          border: 1px solid #000000 !important;
          background-color: white !important;
          background: white !important;
        }
        #printable-receipt table td:first-child,
        #printable-receipt table th:first-child {
          text-align: right !important;
        }
        #printable-receipt table td:first-child {
          font-weight: 600 !important;
        }
        #printable-receipt .grand-total {
          background-color: #fff7ed !important;
          background: #fff7ed !important;
          border-top: 3px solid #f97316 !important;
        }
        #printable-receipt table th[style],
        #printable-receipt table td[style] {
          border: ${printBorderStyle} !important;
          color: #000000 !important;
          background-color: transparent !important;
          background: transparent !important;
        }
        #printable-receipt table th,
        #printable-receipt table td,
        #printable-receipt table thead,
        #printable-receipt table tbody,
        #printable-receipt table tr {
          background-color: transparent !important;
          background: transparent !important;
        }
        #printable-receipt table th,
        #printable-receipt table td {
          font-size: ${minTableFontSize}px !important;
        }
        #printable-receipt .invoice-info .grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 16px !important;
        }
        #printable-receipt .invoice-info .grid > div {
          display: flex !important;
          flex-direction: column !important;
        }
        #printable-receipt .invoice-info .grid span.text-xs {
          font-size: 11px !important;
          font-weight: 500 !important;
        }
        #printable-receipt .invoice-info .grid span.text-sm {
          font-size: 13px !important;
          font-weight: 600 !important;
        }
      }
    </style>
  `;
};

/**
 * Extract invoice data from the receipt element
 */
interface InvoiceData {
  logoUrl: string | null;
  businessName: string;
  storeAddress: string;
  invoiceNumber: string;
  date: string;
  cashier: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  currencySymbol: string;
  paymentMethod?: string;
  paidAmount?: number;
  remainingAmount?: number;
}

const extractInvoiceData = (element: HTMLElement): InvoiceData | null => {
  try {
    const settings = loadSettings();
    const logoUrl = settings?.logoUrl || null;
    const businessName = settings?.businessName || '';
    const storeAddress = settings?.storeAddress || '';
    
    // Extract logo from receipt if available
    const logoImg = element.querySelector('.receipt-logo img') as HTMLImageElement;
    const finalLogoUrl = logoImg?.src || logoUrl;
    
    // Extract business name from header
    const businessNameEl = element.querySelector('h1');
    const finalBusinessName = businessNameEl?.textContent?.trim() || businessName;
    
    // Extract address from header
    const addressEl = element.querySelector('.text-center p');
    const finalAddress = addressEl?.textContent?.trim() || storeAddress;
    
    // Extract invoice info from .invoice-info section
    const invoiceInfoEl = element.querySelector('.invoice-info');
    let invoiceNumber = 'N/A';
    let dateText = new Date().toLocaleString('ar-SA');
    let cashier = 'N/A';
    let customerName = 'N/A';
    
    if (invoiceInfoEl) {
      // Try grid format first (POSPage format: .grid > div with span.text-xs and span.text-sm)
      const gridDivs = invoiceInfoEl.querySelectorAll('.grid > div, [class*="grid"] > div');
      if (gridDivs.length > 0) {
        gridDivs.forEach(div => {
          const labelEl = div.querySelector('span.text-xs, span:first-child');
          const valueEl = div.querySelector('span.text-sm, span:last-child');
          const label = labelEl?.textContent?.trim() || '';
          const value = valueEl?.textContent?.trim() || '';
          
          if (label.includes('رقم الفاتورة') || label.includes('Invoice') || label.includes('INV')) {
            invoiceNumber = value;
          } else if (label.includes('التاريخ') || label.includes('Date')) {
            dateText = value;
          } else if (label.includes('كاشير') || label.includes('Cashier') || label.includes('بائع')) {
            cashier = value;
          } else if (label.includes('عميل') || label.includes('Customer')) {
            customerName = value;
          }
        });
      } else {
        // Try paragraph format (SalesPage format: <p><strong>Label:</strong> Value</p>)
        const paragraphs = invoiceInfoEl.querySelectorAll('p');
        paragraphs.forEach(p => {
          const strongEl = p.querySelector('strong');
          const label = strongEl?.textContent?.trim() || '';
          // Get the full text content of the paragraph
          const fullText = p.textContent?.trim() || '';
          // Extract value by removing the label and colon
          // Handle both "Label: Value" and "Label Value" formats
          let value = fullText;
          if (label) {
            // Remove the label part (with or without colon)
            value = fullText.replace(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:?\\s*`), '').trim();
          }
          
          if (label.includes('رقم الفاتورة') || label.includes('Invoice') || label.includes('INV') || label.includes('Invoice Number')) {
            invoiceNumber = value || 'N/A';
          } else if (label.includes('التاريخ') || label.includes('Date')) {
            dateText = value || new Date().toLocaleString('ar-SA');
          } else if (label.includes('كاشير') || label.includes('Cashier') || label.includes('بائع') || label.includes('Seller')) {
            cashier = value || 'N/A';
          } else if (label.includes('عميل') || label.includes('Customer') || label.includes('Customer Name')) {
            customerName = value || 'N/A';
          }
        });
      }
    }
    
    // Extract items from table - BUT skip statement tables (customer statements have different structure)
    const items: InvoiceData['items'] = [];
    
    // Skip if this is a statement (should not happen due to check in getPrintableContent, but defensive check)
    if (element.classList.contains('customer-statement-print') || 
        element.querySelector('.statement-transactions-table') !== null ||
        element.querySelector('.statement-summary') !== null) {
      return null; // Don't extract invoice data from statements
    }
    
    // Check table headers to identify statement tables (Date, Description, Amount, Balance)
    const allTables = element.querySelectorAll('table');
    let hasStatementTable = false;
    allTables.forEach(table => {
      const headers = Array.from(table.querySelectorAll('thead th, th')).map(th => th.textContent?.trim() || '');
      // Check if this looks like a statement table (has Amount column or old Debit/Credit columns)
      if (headers.some(h => h.includes('المبلغ') || h.includes('مدين') || h.includes('دائن') || h.includes('Amount') || h.includes('Debit') || h.includes('Credit'))) {
        hasStatementTable = true;
      }
    });
    
    if (hasStatementTable) {
      return null; // This is a statement table, not an invoice
    }
    
    const tableRows = element.querySelectorAll('table tbody tr');
    
    tableRows.forEach(row => {
      const cells = row.querySelectorAll('td');
      // Table structure can be:
      // 5 columns (with index): Index | Product | Quantity | Unit Price | Total
      // 4 columns (without index): Product | Quantity | Unit Price | Total
      // 3 columns (fallback): Product | Quantity | Price
      
      if (cells.length >= 5) {
        // 5 columns: Index | Product | Quantity | Unit Price | Total
        const name = cells[1]?.textContent?.trim() || '';
        const quantityText = cells[2]?.textContent?.trim() || '0';
        const quantity = parseFloat(quantityText.replace(/[^\d.-]/g, '')) || 0;
        const unitPriceText = cells[3]?.textContent?.trim() || '0';
        const lineTotalText = cells[4]?.textContent?.trim() || '0';
        // Remove currency symbols and parse
        const unitPrice = parseFloat(unitPriceText.replace(/[^\d.-]/g, '')) || 0;
        const lineTotal = parseFloat(lineTotalText.replace(/[^\d.-]/g, '')) || 0;
        
        if (name && quantity > 0) {
          items.push({ name, quantity, unitPrice, lineTotal });
        }
      } else if (cells.length >= 4) {
        // 4 columns: Product | Quantity | Unit Price | Total
        const name = cells[0]?.textContent?.trim() || '';
        const quantityText = cells[1]?.textContent?.trim() || '0';
        const quantity = parseFloat(quantityText.replace(/[^\d.-]/g, '')) || 0;
        const unitPriceText = cells[2]?.textContent?.trim() || '0';
        const lineTotalText = cells[3]?.textContent?.trim() || '0';
        // Remove currency symbols and parse
        const unitPrice = parseFloat(unitPriceText.replace(/[^\d.-]/g, '')) || 0;
        const lineTotal = parseFloat(lineTotalText.replace(/[^\d.-]/g, '')) || 0;
        
        if (name && quantity > 0) {
          items.push({ name, quantity, unitPrice, lineTotal });
        }
      } else if (cells.length >= 3) {
        // Fallback for 3-column tables: Product | Quantity | Price (assume price is line total)
        const name = cells[0]?.textContent?.trim() || '';
        const quantityText = cells[1]?.textContent?.trim() || '0';
        const quantity = parseFloat(quantityText.replace(/[^\d.-]/g, '')) || 0;
        const lineTotalText = cells[2]?.textContent?.trim() || '0';
        const lineTotal = parseFloat(lineTotalText.replace(/[^\d.-]/g, '')) || 0;
        // Calculate unit price from line total and quantity
        const unitPrice = quantity > 0 ? lineTotal / quantity : 0;
        
        if (name && quantity > 0) {
          items.push({ name, quantity, unitPrice, lineTotal });
        }
      }
    });
    
    // Extract totals from .receipt-summary
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    let grandTotal = 0;
    
    const summaryEl = element.querySelector('.receipt-summary');
    if (summaryEl) {
      const rows = summaryEl.querySelectorAll('div:not(.grand-total)');
      rows.forEach(row => {
        const labelEl = row.querySelector('span:first-child');
        const valueEl = row.querySelector('span:last-child');
        const label = labelEl?.textContent?.trim() || '';
        const valueText = valueEl?.textContent?.trim() || '';
        const value = parseFloat(valueText.replace(/[^\d.-]/g, '')) || 0;
        
        if (label.includes('المجموع الفرعي') || label.includes('Subtotal')) {
          subtotal = Math.abs(value);
        } else if (label.includes('خصم') || label.includes('Discount')) {
          discount = Math.abs(value);
        } else if (label.includes('ضريبة') || label.includes('Tax')) {
          tax = Math.abs(value);
        }
      });
      
      // Extract grand total from .grand-total
      const grandTotalEl = summaryEl.querySelector('.grand-total');
      if (grandTotalEl) {
        const valueEl = grandTotalEl.querySelector('span:last-child');
        const valueText = valueEl?.textContent?.trim() || '';
        grandTotal = Math.abs(parseFloat(valueText.replace(/[^\d.-]/g, '')) || 0);
      }
    }
    
    // If grand total is 0, calculate it
    if (grandTotal === 0) {
      grandTotal = subtotal - discount + tax;
    }
    
    // Get currency symbol from settings
    const currencySymbol = settings?.defaultCurrency || '₪';
    
    // Extract payment information from data attributes or invoice info section
    let paymentMethod: string | undefined;
    let paidAmount: number | undefined;
    let remainingAmount: number | undefined;
    
    // Try to get payment info from data attributes on the receipt element
    const paymentMethodAttr = element.getAttribute('data-payment-method');
    const paidAmountAttr = element.getAttribute('data-paid-amount');
    const remainingAmountAttr = element.getAttribute('data-remaining-amount');
    
    if (paymentMethodAttr) {
      // Normalize payment method: 'card' -> 'visa', keep others as-is
      const normalizedMethod = paymentMethodAttr.toLowerCase();
      paymentMethod = normalizedMethod === 'card' ? 'visa' : normalizedMethod;
      paidAmount = paidAmountAttr ? parseFloat(paidAmountAttr) : undefined;
      remainingAmount = remainingAmountAttr ? parseFloat(remainingAmountAttr) : undefined;
      
      // For Cash and Visa: ensure no remaining balance is shown (full amount is considered paid)
      if (paymentMethod === 'cash' || paymentMethod === 'visa') {
        remainingAmount = undefined; // Don't show remaining balance for Cash/Visa
        // Paid amount should equal grand total for Cash/Visa
        if (paidAmount === undefined) {
          paidAmount = grandTotal;
        }
      }
    }
    
    // Also try to extract from invoice-info section if not found in attributes
    if (!paymentMethod && invoiceInfoEl) {
      const gridDivs = invoiceInfoEl.querySelectorAll('.grid > div, [class*="grid"] > div');
      gridDivs.forEach(div => {
        const labelEl = div.querySelector('span.text-xs, span:first-child');
        const valueEl = div.querySelector('span.text-sm, span:last-child');
        const label = labelEl?.textContent?.trim() || '';
        const value = valueEl?.textContent?.trim() || '';
        
        if (label.includes('طريقة الدفع') || label.includes('Payment') || label.includes('Payment Method')) {
          const normalizedMethod = value.toLowerCase();
          paymentMethod = normalizedMethod === 'card' ? 'visa' : normalizedMethod;
        } else if (label.includes('المدفوع') || label.includes('Paid') || label.includes('Paid Amount')) {
          paidAmount = parseFloat(value.replace(/[^\d.-]/g, '')) || undefined;
        } else if (label.includes('المتبقي') || label.includes('Remaining') || label.includes('Balance')) {
          remainingAmount = parseFloat(value.replace(/[^\d.-]/g, '')) || undefined;
        }
      });
      
      // For Cash and Visa: ensure no remaining balance is shown
      if (paymentMethod && (paymentMethod === 'cash' || paymentMethod === 'visa')) {
        remainingAmount = undefined;
        if (paidAmount === undefined) {
          paidAmount = grandTotal;
        }
      }
    }
    
    // Also try to extract from payment-info section
    const paymentInfoEl = element.querySelector('.payment-info');
    if (!paymentMethod && paymentInfoEl) {
      const paymentMethodEl = paymentInfoEl.querySelector('.payment-method .payment-value, .payment-method span:last-child');
      if (paymentMethodEl) {
        const methodText = paymentMethodEl.textContent?.trim() || '';
        // Map Arabic text back to English
        if (methodText.includes('نقد') || methodText.toLowerCase().includes('cash')) {
          paymentMethod = 'cash';
        } else if (methodText.includes('فيزا') || methodText.toLowerCase().includes('visa') || methodText.toLowerCase().includes('card')) {
          paymentMethod = 'visa';
        } else if (methodText.includes('آجل') || methodText.toLowerCase().includes('credit')) {
          paymentMethod = 'credit';
        }
      }
      
      // Extract paid amount and remaining amount from payment details
      if (paymentMethod === 'credit') {
        const paidAmountEl = paymentInfoEl.querySelector('.payment-details .payment-detail-row:has(.payment-detail-label:contains("المدفوع")) .payment-detail-value');
        const remainingAmountEl = paymentInfoEl.querySelector('.payment-details .payment-detail-row:has(.payment-detail-label:contains("المتبقي")) .payment-detail-value');
        
        if (paidAmountEl) {
          const paidText = paidAmountEl.textContent?.trim() || '';
          paidAmount = parseFloat(paidText.replace(/[^\d.-]/g, '')) || undefined;
        }
        
        if (remainingAmountEl) {
          const remainingText = remainingAmountEl.textContent?.trim() || '';
          remainingAmount = parseFloat(remainingText.replace(/[^\d.-]/g, '')) || undefined;
        }
      }
    }
    
    return {
      logoUrl: finalLogoUrl,
      businessName: finalBusinessName,
      storeAddress: finalAddress,
      invoiceNumber,
      date: dateText,
      cashier,
      customerName,
      items,
      subtotal,
      discount,
      tax,
      grandTotal,
      currencySymbol,
      paymentMethod,
      paidAmount,
      remainingAmount
    };
  } catch (error) {
    console.error('Error extracting invoice data:', error);
    return null;
  }
};

/**
 * Generate invoice HTML based on the universal template
 */
const generateInvoiceHTML = (data: InvoiceData, printSettings: ReturnType<typeof getPrintSettings>): string => {
  const paperSize = printSettings.paperSize;
  const isThermal = paperSize === '80mm' || paperSize === '58mm';
  const widthClass = isThermal 
    ? (paperSize === '58mm' ? 'width-58mm' : 'width-80mm')
    : 'width-std';
  
  // Format currency helper (for totals section only)
  const formatCurrency = (value: number): string => {
    return `${value.toFixed(2)} ${data.currencySymbol}`;
  };
  
  // Format number only (for table cells - no currency symbol)
  // Remove unnecessary .00 for whole numbers, keep decimals when needed
  const formatNumber = (value: number): string => {
    // Check if it's a whole number (no decimal part)
    if (value % 1 === 0) {
      return value.toString();
    }
    // For decimals, format to 2 decimal places then remove trailing zeros
    const formatted = value.toFixed(2);
    // Remove trailing zeros and the decimal point if all zeros
    return formatted.replace(/\.?0+$/, '');
  };
  
  // Generate items table rows (numbers only, no currency)
  const itemsRows = data.items.map((item, idx) => {
    const productIndex = idx + 1; // 1-based index
    return `
    <tr>
      <td class="col-index">${productIndex}</td>
      <td class="col-name">${item.name}</td>
      <td class="col-qty">${item.quantity}</td>
      <td class="col-unit-price">${formatNumber(item.unitPrice)}</td>
      <td class="col-total">${formatNumber(item.lineTotal)}</td>
    </tr>
  `;
  }).join('');
  
  return `
    <div id="invoice" class="invoice-container ${widthClass}">
      <!-- Header -->
      <div class="header">
        ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none';">` : ''}
         ${data.storeAddress ? `<strong>${data.storeAddress}</strong><br>` : ''}
        ${data.businessName ? `<h1 class="store-name">${data.businessName}</h1>` : ''}
      </div>
      
      <!-- Meta Data -->
      <div class="invoice-meta">
        <span> ${data.invoiceNumber}</span>
        <span> ${data.date} </span>
      </div>
      
      <!-- Parties -->
      <div class="parties">
        <div class="party-block">
          ${data.cashier ? `المحاسب: ${data.cashier}` : ''}
        </div>
        <div class="party-block" style="text-align: right;">
          <div class="party-title"> :العميل</div>
          <strong>${data.customerName}</strong>
        </div>
      </div>
      
      <!-- Items Table -->
      <table>
        <thead>
          <tr>
            <th class="col-index">#</th>
            <th class="col-name">المنتج</th>
            <th class="col-qty">الكمية</th>
            <th class="col-unit-price">سعر الوحدة</th>
            <th class="col-total">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
      
      <!-- Totals -->
      <div class="totals">
        <div class="total-row">
          <span>المجموع الفرعي:</span>
          <span>${formatCurrency(data.subtotal)}</span>
        </div>
        ${data.discount > 0 ? `
        <div class="total-row">
          <span>الخصم:</span>
          <span>-${formatCurrency(data.discount)}</span>
        </div>
        ` : ''}
        ${data.tax > 0 ? `
        <div class="total-row">
          <span>الضريبة:</span>
          <span>${formatCurrency(data.tax)}</span>
        </div>
        ` : ''}
      </div>
      
      <!-- Grand Total - Prominent Display -->
      <div class="grand-total">
        <div class="grand-total-label">الإجمالي:</div>
        <div class="grand-total-amount">${formatCurrency(data.grandTotal)}</div>
      </div>
      
      <!-- Payment Information - Clearly Visible Near Totals -->
      ${data.paymentMethod ? `
      <div class="payment-info">
        <div class="payment-method">
          <span class="payment-label">طريقة الدفع:</span>
          <span class="payment-value">${(() => {
            const method = data.paymentMethod.toLowerCase();
            // Normalize: 'card' -> 'visa'
            const normalizedMethod = method === 'card' ? 'visa' : method;
            if (normalizedMethod === 'cash') return 'نقد';
            if (normalizedMethod === 'visa') return 'فيزا';
            if (normalizedMethod === 'credit') return 'آجل';
            return data.paymentMethod;
          })()}</span>
        </div>
        ${(() => {
          const method = data.paymentMethod.toLowerCase();
          const normalizedMethod = method === 'card' ? 'visa' : method;
          // Only show payment details for Credit payments
          return normalizedMethod === 'credit' && (data.paidAmount !== undefined || data.remainingAmount !== undefined);
        })() ? `
        <div class="payment-details">
          ${data.paidAmount !== undefined ? `
          <div class="payment-detail-row">
            <span class="payment-detail-label">المدفوع:</span>
            <span class="payment-detail-value">${formatCurrency(data.paidAmount)}</span>
          </div>
          ` : ''}
          ${data.remainingAmount !== undefined && data.remainingAmount > 0 ? `
          <div class="payment-detail-row">
            <span class="payment-detail-label">المتبقي:</span>
            <span class="payment-detail-value">${formatCurrency(data.remainingAmount)}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <div class="thank-you-message">
        شكراً لتعاملكم معنا!
      </div>
    </div>
  `;
};

/**
 * Generate CSS styles for the universal invoice template
 */
const generateUniversalInvoiceStyles = (printSettings: ReturnType<typeof getPrintSettings>): string => {
  const paperSize = printSettings.paperSize;
  const isThermal = paperSize === '80mm' || paperSize === '58mm';
  const pageSize = getPageSize(printSettings.paperSize, printSettings.paperWidth, printSettings.paperHeight, (printSettings as any).orientation);
  
  return `
    <style>
      /* -------------------------------------
         GLOBAL & RESET
      ------------------------------------- */
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100%;
        height: auto;
      }
      
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        background-color: #f0f0f0;
        color: #000;
        direction: rtl;
      }
      
      /* Ensure all text is dark black */
      .invoice-container,
      .invoice-container * {
        color: #000 !important;
      }
      
      /* -------------------------------------
         INVOICE CONTAINER
      ------------------------------------- */
      .invoice-container {
        background-color: white;
        margin: 20px auto;
        padding: 15px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        max-width: 210mm;
        width: 100%;
      }
      
      /* -------------------------------------
         HEADER & LOGO
      ------------------------------------- */
      .header {
        text-align: center;
        margin-bottom: 10px;
        border-bottom: 2px solid #333;
        padding-bottom: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      
      .logo {
        max-width: 180px;
        max-height: 100px;
        margin-bottom: 10px !important;
        margin-top: 0 !important;
        display: block !important;
        margin-left: auto !important;
        margin-right: auto !important;
        vertical-align: top;
      }
      
      .store-name {
        margin: 0 !important;
        margin-top: 0 !important;
        padding: 0 !important;
        font-size: 1.2em !important;
        font-weight: bold !important;
        color: #000 !important;
        text-align: center !important;
        display: block !important;
        width: 100%;
        line-height: 1.4;
      }
      
      .invoice-meta {
        display: flex;
        justify-content: space-between;
        font-weight: bold;
        font-size: 0.9em;
        margin-bottom: 15px;
        color: #000;
      }
      
      .invoice-meta span {
        color: #000;
      }
      
      /* -------------------------------------
         SELLER & CUSTOMER
      ------------------------------------- */
      .parties {
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
        font-size: 0.9em;
      }
      
      .party-block {
        width: 48%;
      }
      
      .party-title {
        font-weight: bold;
        text-transform: uppercase;
        font-size: 0.8em;
        color: #000;
        border-bottom: 1px solid #eee;
        margin-bottom: 4px;
      }
      
      /* -------------------------------------
         TABLE STYLES
      ------------------------------------- */
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
        border: 1px solid #000;
      }
      
      th {
        background-color: #eee;
        padding: 5px;
        font-size: 0.85em;
        font-weight: bold;
        border: 1px solid #000;
        color: #000;
      }
      
      td {
        padding: 5px;
        border: 1px solid #000;
        font-size: 0.9em;
        color: #000;
      }
      
      /* Column alignment - consistent for headers and data */
      .col-index {
        width: 5%;
        color: #000;
        text-align: center;
        font-weight: 600;
      }
      
      .col-name { 
        width: 45%; 
        color: #000; 
        text-align: right; /* RTL: Arabic text right-aligned */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .col-qty { 
        width: 10%; 
        text-align: center; 
        color: #000; 
      }
      
      .col-unit-price { 
        width: 20%; 
        text-align: right; 
        color: #000; 
      }
      
      .col-total { 
        width: 20%; 
        text-align: right; 
        font-weight: 600; 
        color: #000; 
      }
      
      /* Ensure headers match data cell alignment */
      th.col-index,
      td.col-index {
        text-align: center;
      }
      
      th.col-name,
      td.col-name {
        text-align: right;
      }
      
      th.col-qty,
      td.col-qty {
        text-align: center;
      }
      
      th.col-unit-price,
      td.col-unit-price {
        text-align: right;
      }
      
      th.col-total,
      td.col-total {
        text-align: right;
      }
      
      /* -------------------------------------
         TOTALS SECTION
      ------------------------------------- */
      .totals {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        margin-top: 10px;
      }
      
      .total-row {
        display: flex;
        justify-content: space-between;
        width: 100%;
        max-width: 200px;
        margin-bottom: 4px;
        color: #000;
      }
      
      .total-row span {
        color: #000;
      }
      
      /* Grand Total - Clear and Prominent */
      .grand-total {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 3px solid #000;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        font-weight: bold;
      }
      
      .grand-total-label {
        font-size: 1.2em;
        font-weight: 900;
        color: #000;
        text-transform: uppercase;
      }
      
      .grand-total-amount {
        font-size: 1.3em;
        font-weight: 900;
        color: #000;
        text-align: right;
      }
      
      .center-text { text-align: center; }
      
      /* Ensure all text in invoice is dark black */
      .party-block,
      .party-block strong,
      .party-block * {
        color: #000;
      }
      
      .invoice-meta span {
        color: #000;
      }
      
      /* Ensure all table content is black */
      table th,
      table td,
      table th *,
      table td * {
        color: #000;
      }
      
      .payment-info {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 2px dashed #333;
        color: #000;
      }
      
      .payment-method {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-weight: 600;
        font-size: 0.95em;
      }
      
      .payment-label {
        color: #000;
        font-weight: 600;
      }
      
      .payment-value {
        color: #000;
        font-weight: 700;
        text-transform: uppercase;
      }
      
      .payment-details {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px dashed #999;
      }
      
      .payment-detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        font-size: 0.9em;
      }
      
      .payment-detail-label {
        color: #000;
        font-weight: 500;
      }
      
      .payment-detail-value {
        color: #000;
        font-weight: 600;
      }
      
      .thank-you-message {
        text-align: center;
        margin-top: 15px;
        margin-bottom: 0;
        padding-bottom: 0;
        font-size: 0.8em;
        color: #000;
      }
      
      /* -------------------------------------
         THERMAL 58MM MODE
      ------------------------------------- */
      .width-58mm {
        max-width: 58mm !important;
        padding: 2mm !important;
        font-size: 11px !important;
      }
      
      .width-58mm .invoice-meta, 
      .width-58mm .parties {
        flex-direction: column;
      }
      
      .width-58mm .party-block { width: 100%; margin-bottom: 5px; }
      .width-58mm .header { 
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
      }
      .width-58mm .logo { 
        max-width: 120px !important; 
        margin-bottom: 5px !important;
        margin-top: 0 !important;
        display: block !important;
      }
      .width-58mm .store-name { 
        font-size: 0.9em !important; 
        margin: 0 !important;
        margin-top: 0 !important;
        display: block !important;
        width: 100% !important;
      }
      
      /* Table layout for 58mm thermal - fixed layout but allow cell wrapping */
      .width-58mm table {
        table-layout: fixed !important;
        width: 100% !important;
      }
      
      /* Table columns for 58mm thermal */
      .width-58mm .col-index {
        width: 6% !important;
        font-size: 0.85em !important;
        text-align: center !important;
      }
      .width-58mm .col-name { 
        width: 38% !important;
        font-size: 0.85em !important; 
        text-align: right !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        hyphens: auto !important;
        line-height: 1.3 !important;
        vertical-align: top !important;
        padding: 4px 2px !important;
        overflow: visible !important;
      }
      .width-58mm .col-qty { 
        width: 10% !important;
        font-size: 0.85em !important; 
        text-align: center !important;
        vertical-align: top !important;
        white-space: nowrap !important;
      }
      .width-58mm .col-unit-price { 
        width: 23% !important;
        font-size: 0.85em !important; 
        text-align: right !important;
        vertical-align: top !important;
        white-space: nowrap !important;
      }
      .width-58mm .col-total { 
        width: 23% !important;
        font-size: 0.85em !important; 
        text-align: right !important;
        vertical-align: top !important;
        white-space: nowrap !important;
      }
      
      /* Ensure headers match data alignment for 58mm */
      .width-58mm th.col-index,
      .width-58mm td.col-index {
        text-align: center !important;
      }
      .width-58mm th.col-name,
      .width-58mm td.col-name {
        text-align: right !important;
      }
      .width-58mm th.col-qty,
      .width-58mm td.col-qty {
        text-align: center !important;
      }
      .width-58mm th.col-unit-price,
      .width-58mm td.col-unit-price {
        text-align: right !important;
      }
      .width-58mm th.col-total,
      .width-58mm td.col-total {
        text-align: right !important;
      }
      
      .width-58mm .grand-total {
        margin-top: 10px !important;
        padding-top: 10px !important;
        border-top: 2px solid #000 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      
      .width-58mm .grand-total-label {
        font-size: 0.9em !important;
        font-weight: 900 !important;
        color: #000 !important;
      }
      
      .width-58mm .grand-total-amount {
        font-size: 1.1em !important;
        font-weight: 900 !important;
        color: #000 !important;
      }
      
      .width-58mm .payment-info {
        margin-top: 10px !important;
        padding-top: 10px !important;
        border-top: 1px dashed #000 !important;
        font-size: 0.85em !important;
      }
      
      .width-58mm .payment-method {
        font-size: 0.9em !important;
        margin-bottom: 6px !important;
      }
      
      .width-58mm .payment-details {
        margin-top: 6px !important;
        padding-top: 6px !important;
        font-size: 0.85em !important;
      }
      
      .width-58mm .payment-detail-row {
        font-size: 0.85em !important;
        margin-bottom: 3px !important;
      }
      
      /* -------------------------------------
         THERMAL 80MM MODE
      ------------------------------------- */
      .width-80mm {
        max-width: 80mm !important;
        padding: 4mm !important;
        font-size: 12px !important;
      }
      
      .width-80mm .header { 
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
      }
      .width-80mm .logo { 
        max-width: 150px !important; 
        margin-bottom: 8px !important;
        margin-top: 0 !important;
        display: block !important;
      }
      .width-80mm .store-name { 
        font-size: 1em !important; 
        margin: 0 !important;
        margin-top: 0 !important;
        display: block !important;
        width: 100% !important;
      }
      
      .width-80mm .grand-total {
        margin-top: 12px !important;
        padding-top: 12px !important;
        border-top: 2px solid #000 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      
      .width-80mm .grand-total-label {
        font-size: 1em !important;
        font-weight: 900 !important;
        color: #000 !important;
      }
      
      .width-80mm .grand-total-amount {
        font-size: 1.2em !important;
        font-weight: 900 !important;
        color: #000 !important;
      }
      
      .width-80mm .payment-info {
        margin-top: 12px !important;
        padding-top: 12px !important;
        border-top: 2px dashed #000 !important;
        font-size: 0.9em !important;
      }
      
      .width-80mm .payment-method {
        font-size: 0.95em !important;
        margin-bottom: 8px !important;
      }
      
      .width-80mm .payment-details {
        margin-top: 8px !important;
        padding-top: 8px !important;
        font-size: 0.9em !important;
      }
      
      .width-80mm .payment-detail-row {
        font-size: 0.9em !important;
        margin-bottom: 4px !important;
      }
      
      /* Table layout for 80mm thermal - fixed layout but allow cell wrapping */
      .width-80mm table {
        table-layout: fixed !important;
        width: 100% !important;
      }
      
      /* Table columns for 80mm thermal */
      .width-80mm .col-index {
        width: 5% !important;
        text-align: center !important;
      }
      .width-80mm .col-name { 
        width: 40% !important;
        text-align: right !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        hyphens: auto !important;
        line-height: 1.3 !important;
        vertical-align: top !important;
        padding: 4px 2px !important;
        overflow: visible !important;
      }
      .width-80mm .col-qty { 
        width: 11% !important;
        text-align: center !important;
        vertical-align: top !important;
        white-space: nowrap !important;
      }
      .width-80mm .col-unit-price { 
        width: 22% !important;
        text-align: right !important;
        vertical-align: top !important;
        white-space: nowrap !important;
      }
      .width-80mm .col-total { 
        width: 22% !important;
        text-align: right !important;
        vertical-align: top !important;
        white-space: nowrap !important;
      }
      
      /* Ensure headers match data alignment for 80mm */
      .width-80mm th.col-index,
      .width-80mm td.col-index {
        text-align: center !important;
      }
      .width-80mm th.col-name,
      .width-80mm td.col-name {
        text-align: right !important;
      }
      .width-80mm th.col-qty,
      .width-80mm td.col-qty {
        text-align: center !important;
      }
      .width-80mm th.col-unit-price,
      .width-80mm td.col-unit-price {
        text-align: right !important;
      }
      .width-80mm th.col-total,
      .width-80mm td.col-total {
        text-align: right !important;
      }
      
      /* -------------------------------------
         A4/A3 MODE
      ------------------------------------- */
      .width-std {
        max-width: 210mm !important;
        padding: 10mm !important;
      }
      
      /* -------------------------------------
         PRINT MEDIA QUERIES
      ------------------------------------- */
      @media print {
        /* Remove all browser print headers and footers */
        @page {
          margin: 0 !important;
          size: auto;
        }
        
        /* Remove default browser print headers/footers */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: white !important;
          overflow: visible !important;
        }
        
        body { 
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .invoice-container {
          box-shadow: none !important;
          margin: 0 !important;
          padding: ${paperSize === '80mm' || paperSize === '58mm' ? '2mm' : '5mm'} !important;
          width: 100% !important;
          max-width: 100% !important;
          page-break-inside: avoid;
          min-height: auto !important;
        }
        
        /* Ensure header starts at the very top with no extra space */
        .header {
          margin-top: 0 !important;
          padding-top: 0 !important;
          margin-bottom: 8px !important;
        }
        
        /* Remove any top margin from logo */
        .logo {
          margin-top: 0 !important;
        }
        
        .header {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          margin-bottom: 10px !important;
          border-bottom: 2px solid #333 !important;
          padding-bottom: 10px !important;
        }
        
        .logo {
          display: block !important;
          max-width: 180px !important;
          max-height: 100px !important;
          margin: 0 auto 10px auto !important;
          margin-bottom: 10px !important;
          margin-top: 0 !important;
        }
        
        .store-name {
          display: block !important;
          margin: 0 !important;
          margin-top: 0 !important;
          padding: 0 !important;
          font-size: 1.2em !important;
          font-weight: bold !important;
          color: #000 !important;
          text-align: center !important;
          width: 100% !important;
          line-height: 1.4 !important;
        }
        
        /* Grand Total - Print Styles */
        .grand-total {
          margin-top: 15px !important;
          padding-top: 15px !important;
          border-top: 3px solid #000 !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          width: 100% !important;
          max-width: 100% !important;
          background: transparent !important;
          color: #000 !important;
        }
        
        .grand-total-label {
          font-size: 1.2em !important;
          font-weight: 900 !important;
          color: #000 !important;
          text-transform: uppercase !important;
        }
        
        .grand-total-amount {
          font-size: 1.3em !important;
          font-weight: 900 !important;
          color: #000 !important;
          text-align: right !important;
        }
        
        /* Thank you message - last element, no extra space after */
        .thank-you-message {
          margin-top: 15px !important;
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
          font-size: 0.8em !important;
          color: #000 !important;
        }
        
        /* Force all text to be black in print */
        .invoice-container,
        .invoice-container * {
          color: #000 !important;
        }
        
        /* Ensure table text is black */
        table,
        table * {
          color: #000 !important;
        }
        
        /* Ensure all labels and text are black */
        .invoice-meta,
        .invoice-meta *,
        .parties,
        .parties *,
        .party-title,
        .totals,
        .totals * {
          color: #000 !important;
        }
        
        /* Ensure table alignment is consistent when printing */
        th.col-name,
        td.col-name {
          text-align: right !important;
        }
        
        th.col-qty,
        td.col-qty {
          text-align: center !important;
        }
        
        th.col-unit-price,
        td.col-unit-price {
          text-align: right !important;
        }
        
        th.col-total,
        td.col-total {
          text-align: right !important;
        }
        
        /* Thermal printer specific print styles - ensure wrapping works */
        .width-58mm table,
        .width-80mm table {
          table-layout: fixed !important;
          width: 100% !important;
        }
        
        /* 58mm thermal print - ensure text wrapping */
        .width-58mm .col-name {
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          hyphens: auto !important;
          line-height: 1.3 !important;
          vertical-align: top !important;
          padding: 4px 2px !important;
          overflow: visible !important;
          height: auto !important;
        }
        
        .width-58mm .col-qty,
        .width-58mm .col-unit-price,
        .width-58mm .col-total {
          vertical-align: top !important;
          white-space: nowrap !important;
        }
        
        /* 80mm thermal print - ensure text wrapping */
        .width-80mm .col-name {
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          hyphens: auto !important;
          line-height: 1.3 !important;
          vertical-align: top !important;
          padding: 4px 2px !important;
          overflow: visible !important;
          height: auto !important;
        }
        
        .width-80mm .col-qty,
        .width-80mm .col-unit-price,
        .width-80mm .col-total {
          vertical-align: top !important;
          white-space: nowrap !important;
        }
        
        /* Ensure table rows can expand vertically for wrapped content */
        .width-58mm table tbody tr,
        .width-80mm table tbody tr {
          height: auto !important;
        }
        
        .width-58mm table td,
        .width-80mm table td {
          height: auto !important;
          max-height: none !important;
        }
        
        /* Remove any page breaks that create empty spaces */
        .invoice-container {
          page-break-after: avoid !important;
        }
        
        /* Ensure no extra space at the end */
        .invoice-container > *:last-child {
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        }
        
        /* Set minimal page margins for thermal printers, use settings for standard */
        @page {
          margin: ${paperSize === '80mm' || paperSize === '58mm' ? '2mm' : `${printSettings.marginTop}cm ${printSettings.marginRight}cm ${printSettings.marginBottom}cm ${printSettings.marginLeft}cm`} !important;
          ${pageSize}
          /* Remove browser headers/footers */
          marks: none;
          size: auto;
        }
      }
    </style>
  `;
};

/**
 * Extracts the HTML content of a printable element
 * @param elementId - The ID of the element to print
 * @returns The HTML content as a string
 */
const getPrintableContent = (elementId: string): string => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with id "${elementId}" not found`);
    return '';
  }

  // Get print settings from preferences (with printer type awareness)
  const printSettings = getPrintSettings();
  
  // IMPORTANT: Check if this is a Customer Statement FIRST - statements should NOT use invoice template
  const isCustomerStatement = element.classList.contains('customer-statement-print') || 
                               element.querySelector('.statement-transactions-table') !== null ||
                               element.querySelector('.statement-summary') !== null;
  
  // If this is a customer statement, skip invoice extraction and use statement layout
  if (isCustomerStatement) {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Remove receipt footer elements
    const footerElements = clone.querySelectorAll('.receipt-footer');
    footerElements.forEach(el => el.remove());
    
    // Process the cloned element to remove currency symbols only from table cells (keep summary)
    removeCurrencySymbolsFromTable(clone);
    
    // Detect if this is a thermal printer
    const isThermal = printSettings.paperSize === '80mm' || printSettings.paperSize === '58mm';
    
    // Generate appropriate styles based on printer type
    const styleContent = isThermal 
      ? generateThermalStyles(printSettings)
      : generateA4Styles(printSettings);
    
    // Get the HTML content
    const content = clone.outerHTML;
    
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Customer Statement</title>
        ${styleContent}
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;
  }
  
  // Try to extract invoice data and use new template (only for invoices, not statements)
  const invoiceData = extractInvoiceData(element);
  
  if (invoiceData && invoiceData.items.length > 0) {
    // Use new universal invoice template
    const invoiceHTML = generateInvoiceHTML(invoiceData, printSettings);
    const styleContent = generateUniversalInvoiceStyles(printSettings);
    
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title></title>
        ${styleContent}
      </head>
      <body style="margin: 0; padding: 0;">
        ${invoiceHTML}
      </body>
      </html>
    `;
  }
  
  // Fallback to original method if data extraction fails
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Remove receipt footer elements (site name, etc.)
  const footerElements = clone.querySelectorAll('.receipt-footer');
  footerElements.forEach(el => el.remove());
  
  // Process the cloned element to remove currency symbols only from table cells
  removeCurrencySymbolsFromTable(clone);
  
  // Detect if this is a thermal printer
  const isThermal = printSettings.paperSize === '80mm' || printSettings.paperSize === '58mm';
  
  // Generate appropriate styles based on printer type
  const styleContent = isThermal 
    ? generateThermalStyles(printSettings)
    : generateA4Styles(printSettings);
  
  // Get the HTML content
  const content = clone.outerHTML;
  
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title></title>
      ${styleContent}
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
};

/**
 * Prints content silently using a hidden iframe
 * @param elementId - The ID of the element to print (must have id="printable-receipt" or similar)
 * @param options - Optional print options
 * @returns Promise that resolves when print dialog is shown
 */
export const silentPrint = async (
  elementId: string = 'printable-receipt',
  options?: {
    onBeforePrint?: () => void;
    onAfterPrint?: () => void;
    timeout?: number;
  }
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Prevent multiple simultaneous print operations
      if (isPrinting) {
        console.warn('Print operation already in progress, ignoring duplicate request');
        resolve();
        return;
      }

      // Clean up any existing print iframe
      if (currentPrintIframe && currentPrintIframe.parentNode) {
        currentPrintIframe.parentNode.removeChild(currentPrintIframe);
        currentPrintIframe = null;
      }

      // Set printing flag
      isPrinting = true;

      // Get the printable content
      const content = getPrintableContent(elementId);
      
      if (!content) {
        isPrinting = false;
        reject(new Error(`No printable content found for element: ${elementId}`));
        return;
      }

      // Call onBeforePrint callback if provided
      if (options?.onBeforePrint) {
        options.onBeforePrint();
      }

      // Create a hidden iframe using srcdoc attribute (modern approach, avoids document.write())
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      
      // Use srcdoc attribute to set content without document.write()
      // This is the modern approach and avoids browser warnings
      iframe.srcdoc = content;
      
      // Store reference to current iframe
      currentPrintIframe = iframe;
      
      // Append to body
      document.body.appendChild(iframe);

      // Flag to prevent printIframe from being called multiple times
      let printIframeCalled = false;

      // Wait for iframe to load, then print
      const printIframe = () => {
        // Prevent multiple calls
        if (printIframeCalled) {
          return;
        }
        printIframeCalled = true;

        // Clear fallback timeout since we're printing now
        if ((iframe as any)._fallbackTimeout) {
          clearTimeout((iframe as any)._fallbackTimeout);
          delete (iframe as any)._fallbackTimeout;
        }

        try {
          // Verify iframe is ready
          if (!iframe.contentWindow) {
            throw new Error('Iframe window not available');
          }

          // Wait for content to render, then print
          setTimeout(() => {
            try {
              // Use requestAnimationFrame to ensure content is fully rendered
              requestAnimationFrame(() => {
                setTimeout(() => {
                  // Focus the iframe window and trigger print
                  iframe.contentWindow?.focus();
                  iframe.contentWindow?.print();

                  // Clean up after printing
                  const cleanup = () => {
                    // Reset printing flag
                    isPrinting = false;
                    
                    // Remove iframe if it still exists
                    if (iframe.parentNode) {
                      iframe.parentNode.removeChild(iframe);
                    }
                    
                    // Clear iframe reference
                    if (currentPrintIframe === iframe) {
                      currentPrintIframe = null;
                    }
                    
                    // Call onAfterPrint callback if provided
                    if (options?.onAfterPrint) {
                      options.onAfterPrint();
                    }
                    
                    resolve();
                  };

                  // Listen for print dialog close (approximate)
                  // Note: We can't reliably detect when print dialog closes,
                  // so we use a timeout
                  // Break timeout into smaller chunks to avoid long handler warnings
                  const timeout = options?.timeout || 2000;
                  const chunkSize = 500; // 500ms chunks
                  let elapsed = 0;
                  const checkCleanup = () => {
                    elapsed += chunkSize;
                    if (elapsed >= timeout) {
                      cleanup();
                    } else {
                      setTimeout(checkCleanup, chunkSize);
                    }
                  };
                  setTimeout(checkCleanup, chunkSize);
                }, 50);
              });
            } catch (printError) {
              console.error('Error triggering print:', printError);
              isPrinting = false;
              if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
              }
              if (currentPrintIframe === iframe) {
                currentPrintIframe = null;
              }
              reject(printError);
            }
          }, 200); // Delay to ensure content is rendered
        } catch (error) {
          console.error('Error in printIframe:', error);
          isPrinting = false;
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          if (currentPrintIframe === iframe) {
            currentPrintIframe = null;
          }
          reject(error);
        }
      };

      // Wait for iframe to be ready
      iframe.onload = printIframe;
      
      // Fallback: if onload doesn't fire, try after a short delay
      // Only try fallback if we're still printing (not cancelled)
      const fallbackTimeout = setTimeout(() => {
        if (isPrinting && iframe.contentDocument?.readyState === 'complete') {
          printIframe();
        }
      }, 100);

      // Store timeout for cleanup if needed
      (iframe as any)._fallbackTimeout = fallbackTimeout;
    } catch (error) {
      console.error('Error in silentPrint:', error);
      isPrinting = false;
      if (currentPrintIframe) {
        if (currentPrintIframe.parentNode) {
          currentPrintIframe.parentNode.removeChild(currentPrintIframe);
        }
        currentPrintIframe = null;
      }
      reject(error);
    }
  });
};

/**
 * Direct print function that uses silentPrint by default
 * Falls back to window.print() if element not found
 * @param elementId - The ID of the element to print
 */
export const printReceipt = async (elementId: string = 'printable-receipt'): Promise<void> => {
  try {
    await silentPrint(elementId);
  } catch (error) {
    console.warn('Silent print failed, falling back to window.print():', error);
    // Fallback to window.print() if silent print fails
    window.print();
  }
};

