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
  
  // Try to get printer configuration first (smart mode)
  const printerConfig = getPrintSettingsFromConfig(settings);
  
  // If printer type is explicitly set, use the configuration
  if (settings && (settings as any).printerType) {
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
  
  // Fallback to manual settings if printer type not set
  return {
    ...printerConfig,
    paperSize: settings?.printPaperSize || 'A4',
    paperWidth: settings?.printPaperWidth || printerConfig.paperWidth,
    paperHeight: settings?.printPaperHeight || printerConfig.paperHeight,
    marginTop: settings?.printMarginTop ?? printerConfig.marginTop,
    marginBottom: settings?.printMarginBottom ?? printerConfig.marginBottom,
    marginLeft: settings?.printMarginLeft ?? printerConfig.marginLeft,
    marginRight: settings?.printMarginRight ?? printerConfig.marginRight,
    fontSize: settings?.printFontSize ?? printerConfig.fontSize,
    tableFontSize: settings?.printTableFontSize ?? printerConfig.tableFontSize,
    showBorders: settings?.printShowBorders ?? printerConfig.showBorders,
    compactMode: settings?.printCompactMode ?? printerConfig.compactMode,
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

  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Remove currency symbols only from table cells (product table), but keep them in totals section
  // This function processes only table cells (td), not the receipt-summary section
  const removeCurrencySymbolsFromTable = (node: Node, isInSummary: boolean = false): void => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      
      // Check if we're entering the receipt-summary section (skip processing this section)
      const isSummarySection = element.classList?.contains('receipt-summary') || 
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
  
  // Process the cloned element to remove currency symbols only from table cells
  removeCurrencySymbolsFromTable(clone);
  
  // Get print settings from preferences (with printer type awareness)
  const printSettings = getPrintSettings();
  
  // Get page size CSS with orientation support
  const pageSize = getPageSize(
    printSettings.paperSize, 
    printSettings.paperWidth, 
    printSettings.paperHeight,
    (printSettings as any).orientation
  );
  
  // Detect if this is a thermal printer
  const isThermal = printSettings.paperSize === '80mm' || printSettings.paperSize === '58mm';
  
  // Calculate padding based on compact mode and printer type - ensure minimum readable sizes
  const tablePadding = isThermal 
    ? '4px 3px' 
    : (printSettings.compactMode ? '8px 6px' : '12px 10px');
  const tableMargin = isThermal 
    ? '8px 0' 
    : (printSettings.compactMode ? '12px 0' : '18px 0');
  const summaryMargin = isThermal 
    ? '12px' 
    : (printSettings.compactMode ? '18px' : '24px');
  const summaryPadding = isThermal 
    ? '8px' 
    : (printSettings.compactMode ? '12px' : '18px');
  
  // Ensure minimum font sizes for readability - thermal printers need smaller fonts
  const minFontSize = isThermal 
    ? Math.max(printSettings.fontSize, 8) 
    : Math.max(printSettings.fontSize, 12);
  const minTableFontSize = isThermal 
    ? Math.max(printSettings.tableFontSize, 7) 
    : Math.max(printSettings.tableFontSize, 11);
  
  // Get max columns from printer config (for thermal printers, limit columns)
  const maxColumns = (printSettings as any).maxColumns || 4;
  
  // Border styles for print - always use dark, visible borders for printing
  // Use darker colors that print clearly: black or dark gray
  const printBorderStyle = '1px solid #000000'; // Black borders for maximum visibility
  const printBorderThick = '2px solid #000000'; // Thicker borders for headers
  const printBorderBottom = '1px solid #333333'; // Dark gray for row separators
  const printHeaderBorderBottom = '2px solid #000000'; // Black for header bottom border
  
  // Create a style element with print-specific styles
  const styleContent = `
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
      /* Receipt container - ensure it fits on page */
      #printable-receipt {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 auto;
        padding: ${isThermal ? '12px' : (printSettings.compactMode ? '20px' : '32px')} !important;
        background: white;
        page-break-inside: avoid;
        border-radius: ${isThermal ? '0' : '12px'} !important;
      }
      /* Store Logo - Modern and professional */
      #printable-receipt .receipt-logo {
        width: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
        height: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
        margin: 0 auto ${isThermal ? '16px' : (printSettings.compactMode ? '20px' : '24px')} auto !important;
        border-radius: 16px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        page-break-inside: avoid;
      }
      /* Default logo (gradient background with SVG) */
      #printable-receipt .receipt-logo:has(> div) {
        background: linear-gradient(135deg, #f97316 0%, #f59e0b 50%, #ea580c 100%) !important;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
      }
      #printable-receipt .receipt-logo svg {
        width: ${isThermal ? '24px' : (printSettings.compactMode ? '32px' : '40px')} !important;
        height: ${isThermal ? '24px' : (printSettings.compactMode ? '32px' : '40px')} !important;
        color: #ffffff !important;
        fill: none !important;
        stroke: #ffffff !important;
        stroke-width: 2.5 !important;
      }
      /* Custom uploaded logo (img tag) */
      #printable-receipt .receipt-logo img {
        width: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
        height: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
        max-width: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
        max-height: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
        object-fit: contain !important;
        border-radius: 16px !important;
        background: white !important;
        padding: ${isThermal ? '4px' : '8px'} !important;
        border: 2px solid #e5e7eb !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        page-break-inside: avoid;
      }
      /* Store name header (h1) - Most prominent element */
      #printable-receipt h1 {
        margin: 0 0 ${isThermal ? '8px' : (printSettings.compactMode ? '12px' : '16px')} 0;
        font-weight: 900;
        font-size: ${isThermal ? '20px' : (printSettings.compactMode ? '28px' : '32px')} !important;
        line-height: 1.2;
        text-align: center !important;
        page-break-after: avoid;
        color: #000000 !important;
      }
      /* Header styles - ensure readable sizes */
      #printable-receipt h2,
      #printable-receipt h3 {
        margin: 0 0 ${isThermal ? '6px' : (printSettings.compactMode ? '10px' : '12px')} 0;
        font-weight: 700;
        font-size: ${isThermal ? '14px' : (printSettings.compactMode ? '18px' : '20px')};
        line-height: 1.3;
        page-break-after: avoid;
      }
      /* Store header container - ensure proper spacing and border */
      /* Using a more compatible selector approach */
      #printable-receipt > div.text-center:first-of-type,
      #printable-receipt .text-center.mb-6,
      #printable-receipt .text-center.mb-8 {
        margin-bottom: ${isThermal ? '20px' : (printSettings.compactMode ? '24px' : '32px')} !important;
        padding-bottom: ${isThermal ? '16px' : (printSettings.compactMode ? '20px' : '24px')} !important;
        border-bottom: 3px solid #e5e7eb !important;
        text-align: center !important;
      }
      /* Address below store name */
      #printable-receipt .text-center p {
        margin: ${isThermal ? '4px 0 0 0' : (printSettings.compactMode ? '6px 0 0 0' : '8px 0 0 0')} !important;
        font-size: ${isThermal ? '9px' : Math.max(printSettings.compactMode ? 11 : 12, 11)}px !important;
        color: #000000 !important;
        line-height: 1.5;
        text-align: center !important;
      }
      /* Table styles for professional appearance - prevent cutoff */
      #printable-receipt table {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        border-spacing: 0 !important;
        margin: ${isThermal ? '12px 0' : (printSettings.compactMode ? '16px 0' : '20px 0')} !important;
        font-size: ${minTableFontSize}px !important;
        background: white !important;
        table-layout: auto;
        page-break-inside: auto;
        border: none !important;
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
        padding: ${isThermal ? '8px 4px' : (printSettings.compactMode ? '12px 8px' : '14px 16px')} !important;
        text-align: center !important;
        font-weight: 900 !important;
        border-bottom: 2px solid #e5e7eb !important;
        color: #000000 !important;
        font-size: ${Math.max(minTableFontSize - 1, 10)}px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
        min-width: 0;
        background-color: ${isThermal ? '#ffffff' : '#f9fafb'} !important;
        background: ${isThermal ? '#ffffff' : '#f9fafb'} !important;
      }
      #printable-receipt table td {
        padding: ${isThermal ? '8px 4px' : (printSettings.compactMode ? '12px 8px' : '14px 16px')} !important;
        border-bottom: 1px solid #f3f4f6 !important;
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
      /* First column (product name) - right align */
      #printable-receipt table td:first-child {
        font-weight: 600 !important;
      }
      /* First column (product name) - right align */
      #printable-receipt table td:first-child,
      #printable-receipt table th:first-child {
        text-align: right !important;
      }
      /* Prevent table rows from breaking across pages */
      #printable-receipt table tbody tr {
        page-break-inside: avoid;
        page-break-after: auto;
        border-bottom: ${printBorderBottom} !important;
      }
      #printable-receipt table tbody tr:last-child {
        border-bottom: ${printBorderThick} !important;
      }
      /* Override any inline border styles that might hide borders */
      #printable-receipt table th[style*="border"],
      #printable-receipt table td[style*="border"] {
        border: ${printBorderStyle} !important;
      }
      /* Product name column styling handled above */
      /* Quantity and price columns - keep compact */
      #printable-receipt table td:nth-child(2),
      #printable-receipt table th:nth-child(2),
      #printable-receipt table td:nth-child(3),
      #printable-receipt table th:nth-child(3) {
        white-space: nowrap;
        width: auto;
        min-width: ${isThermal ? '40px' : '60px'};
      }
      /* Total column */
      #printable-receipt table td:last-child,
      #printable-receipt table th:last-child {
        white-space: nowrap;
        font-weight: 600;
      }
      /* Thermal printer specific optimizations */
      ${isThermal ? `
        /* Force table to use fixed layout for thermal printers */
        #printable-receipt table {
          table-layout: fixed !important;
        }
        /* Ensure all columns fit within thermal width */
        #printable-receipt table th,
        #printable-receipt table td {
          padding: 6px 4px !important;
          font-size: ${minTableFontSize}px !important;
        }
        /* Store header for thermal - slightly smaller but still prominent */
        #printable-receipt h1 {
          font-size: 20px !important;
          margin-bottom: 8px !important;
        }
        /* Store header container for thermal */
        #printable-receipt > div.text-center:first-of-type,
        #printable-receipt .text-center.mb-6,
        #printable-receipt .text-center.mb-8 {
          margin-bottom: 16px !important;
          padding-bottom: 10px !important;
        }
        /* Logo for thermal - ensure it fits */
        #printable-receipt .receipt-logo img {
          max-width: 56px !important;
          max-height: 56px !important;
        }
        /* Reduce spacing in thermal receipts */
        #printable-receipt .invoice-info {
          padding: 12px 0 !important;
          margin-bottom: 12px !important;
        }
        #printable-receipt .receipt-summary {
          margin-top: 16px !important;
          padding-top: 12px !important;
        }
        /* Table header - use solid color for thermal (gradients don't print well) */
        #printable-receipt table th {
          background-color: #ffffff !important;
          background: #ffffff !important;
        }
      ` : ''}
      /* Align text in table cells */
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
      /* Summary section - prevent page break */
      #printable-receipt .receipt-summary {
        margin-top: ${isThermal ? '16px' : (printSettings.compactMode ? '20px' : '24px')} !important;
        padding-top: ${isThermal ? '16px' : (printSettings.compactMode ? '20px' : '24px')} !important;
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
        background-color: ${isThermal ? '#ffffff' : '#fff7ed'} !important;
        background: ${isThermal ? '#ffffff' : '#fff7ed'} !important;
        page-break-inside: avoid;
        color: #000000 !important;
        box-shadow: ${isThermal ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.1)'} !important;
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
      /* Invoice info section - Modern clean layout */
      #printable-receipt .invoice-info {
        padding: ${printSettings.compactMode ? '16px 0' : '20px 0'} !important;
        border-bottom: 2px dashed #e5e7eb !important;
        margin-bottom: ${printSettings.compactMode ? '20px' : '24px'} !important;
        page-break-inside: avoid;
      }
      /* Grid layout for invoice info - 2 columns, 2 rows */
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
      /* Label (first span with text-xs) */
      #printable-receipt .invoice-info .grid span.text-xs {
        font-size: ${Math.max(minTableFontSize, 10)}px !important;
        font-weight: 600 !important;
        color: #6b7280 !important;
        margin-bottom: ${isThermal ? '4px' : '8px'} !important;
        line-height: 1.4;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
      }
      /* Value (second span with text-sm) */
      #printable-receipt .invoice-info .grid span.text-sm {
        font-size: ${Math.max(minFontSize, 12)}px !important;
        font-weight: 600 !important;
        color: #000000 !important;
        line-height: 1.5;
      }
      /* Ensure grid layout works in print */
      @media print {
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
      /* Footer */
      #printable-receipt .receipt-footer {
        text-align: center !important;
        margin-top: ${printSettings.compactMode ? '32px' : '40px'} !important;
        padding-top: ${printSettings.compactMode ? '24px' : '24px'} !important;
        border-top: 1px dashed #e5e7eb !important;
        font-size: ${Math.max(printSettings.compactMode ? 11 : 12, 11)}px !important;
        font-weight: 600 !important;
        color: #9ca3af !important;
        page-break-inside: avoid;
        letter-spacing: 0.5px !important;
      }
      #printable-receipt .receipt-footer p:last-child {
        font-size: ${Math.max(printSettings.compactMode ? 9 : 10, 9)}px !important;
        color: #d1d5db !important;
        margin-top: 8px !important;
      }
      /* Ensure all text is visible and readable - force black text */
      #printable-receipt {
        color: #000000 !important;
      }
      #printable-receipt * {
        color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      /* Force all text to be black for maximum contrast */
      #printable-receipt p,
      #printable-receipt span,
      #printable-receipt div,
      #printable-receipt td,
      #printable-receipt th {
        color: #000000 !important;
      }
      /* Prevent overflow and ensure content fits */
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
          padding: ${printSettings.compactMode ? '12px' : '16px'} !important;
          background: white !important;
        }
        .print-hidden {
          display: none !important;
          visibility: hidden !important;
        }
        /* Ensure tables don't break awkwardly */
        #printable-receipt table {
          page-break-inside: auto;
          border: ${printBorderThick} !important;
        }
        #printable-receipt tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        #printable-receipt thead {
          display: table-header-group;
          background-color: transparent !important;
          background: transparent !important;
        }
        #printable-receipt tfoot {
          display: table-footer-group;
        }
        /* Prevent orphans and widows */
        #printable-receipt p, 
        #printable-receipt div {
          orphans: 3;
          widows: 3;
        }
        /* Store Logo - ensure prints well */
        #printable-receipt .receipt-logo {
          width: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
          height: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
          margin: 0 auto ${isThermal ? '16px' : (printSettings.compactMode ? '20px' : '24px')} auto !important;
        }
        /* Default logo (gradient) */
        #printable-receipt .receipt-logo:has(> div) {
          background: linear-gradient(135deg, #f97316 0%, #f59e0b 50%, #ea580c 100%) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
        }
        #printable-receipt .receipt-logo svg {
          width: ${isThermal ? '24px' : (printSettings.compactMode ? '32px' : '40px')} !important;
          height: ${isThermal ? '24px' : (printSettings.compactMode ? '32px' : '40px')} !important;
          color: #ffffff !important;
        }
        /* Custom uploaded logo */
        #printable-receipt .receipt-logo img {
          width: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
          height: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
          max-width: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
          max-height: ${isThermal ? '56px' : (printSettings.compactMode ? '72px' : '96px')} !important;
          object-fit: contain !important;
          background: white !important;
          border: 2px solid #e5e7eb !important;
        }
        /* Store header - ensure prominent in print */
        #printable-receipt h1 {
          font-size: ${isThermal ? '20px' : (printSettings.compactMode ? '28px' : '32px')} !important;
          font-weight: 900 !important;
          text-align: center !important;
          margin-bottom: ${isThermal ? '8px' : (printSettings.compactMode ? '12px' : '16px')} !important;
          color: #000000 !important;
        }
        /* Store header container border */
        #printable-receipt > div.text-center:first-of-type,
        #printable-receipt .text-center.mb-6 {
          border-bottom: 2px solid #000000 !important;
          padding-bottom: ${isThermal ? '10px' : (printSettings.compactMode ? '14px' : '16px')} !important;
          margin-bottom: ${isThermal ? '16px' : (printSettings.compactMode ? '20px' : '24px')} !important;
        }
        /* Force all text to be black for maximum contrast */
        #printable-receipt * {
          color: #000000 !important;
        }
        #printable-receipt {
          background: white !important;
        }
        /* Modern table styling for print - clean borders */
        #printable-receipt table {
          border: none !important;
          border-collapse: collapse !important;
        }
        #printable-receipt table th {
          border-bottom: 2px solid #e5e7eb !important;
          border-top: none !important;
          border-left: none !important;
          border-right: none !important;
          background-color: ${isThermal ? '#ffffff' : '#f9fafb'} !important;
          background: ${isThermal ? '#ffffff' : '#f9fafb'} !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
        }
        #printable-receipt table td {
          border-bottom: 1px solid #f3f4f6 !important;
          border-top: none !important;
          border-left: none !important;
          border-right: none !important;
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
        /* Grand total styling for print */
        #printable-receipt .grand-total {
          background-color: ${isThermal ? '#ffffff' : '#fff7ed'} !important;
          background: ${isThermal ? '#ffffff' : '#fff7ed'} !important;
          border-top: 3px solid #f97316 !important;
        }
        /* Override any inline styles that might hide borders or text */
        #printable-receipt table th[style],
        #printable-receipt table td[style] {
          border: ${printBorderStyle} !important;
          color: #000000 !important;
          background-color: transparent !important;
          background: transparent !important;
        }
        /* Remove all background colors from table cells */
        #printable-receipt table th,
        #printable-receipt table td,
        #printable-receipt table thead,
        #printable-receipt table tbody,
        #printable-receipt table tr {
          background-color: transparent !important;
          background: transparent !important;
        }
        /* Ensure font sizes are readable */
        #printable-receipt table th,
        #printable-receipt table td {
          font-size: ${minTableFontSize}px !important;
        }
      }
    </style>
  `;

  // Get the HTML content
  const content = clone.outerHTML;
  
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Print Receipt</title>
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

