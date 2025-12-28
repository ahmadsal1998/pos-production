/**
 * Silent printing utility for POS system
 * Uses hidden iframe to print without opening new windows/tabs
 */

import { loadSettings } from './settingsStorage';

// Guard to prevent multiple simultaneous print operations
let isPrinting = false;
let currentPrintIframe: HTMLIFrameElement | null = null;

/**
 * Get print settings from preferences with defaults
 */
const getPrintSettings = () => {
  const settings = loadSettings();
  return {
    paperSize: settings?.printPaperSize || 'A4',
    paperWidth: settings?.printPaperWidth || 210,
    paperHeight: settings?.printPaperHeight || 297,
    marginTop: settings?.printMarginTop ?? 0.8,
    marginBottom: settings?.printMarginBottom ?? 0.8,
    marginLeft: settings?.printMarginLeft ?? 0.8,
    marginRight: settings?.printMarginRight ?? 0.8,
    fontSize: settings?.printFontSize ?? 13,
    tableFontSize: settings?.printTableFontSize ?? 12,
    showBorders: settings?.printShowBorders ?? true,
    compactMode: settings?.printCompactMode ?? false,
  };
};

/**
 * Get @page size CSS based on paper size setting
 */
const getPageSize = (paperSize: string, width?: number, height?: number): string => {
  switch (paperSize) {
    case 'A4':
      return 'size: A4;';
    case 'A5':
      return 'size: A5;';
    case '80mm':
      return 'size: 80mm auto;';
    case '58mm':
      return 'size: 58mm auto;';
    case 'custom':
      if (width && height) {
        return `size: ${width}mm ${height}mm;`;
      }
      return 'size: A4;';
    default:
      return 'size: A4;';
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
  
  // Get print settings from preferences
  const printSettings = getPrintSettings();
  
  // Get page size CSS
  const pageSize = getPageSize(printSettings.paperSize, printSettings.paperWidth, printSettings.paperHeight);
  
  // Calculate padding based on compact mode - ensure minimum readable sizes
  const tablePadding = printSettings.compactMode ? '8px 6px' : '12px 10px';
  const tableMargin = printSettings.compactMode ? '12px 0' : '18px 0';
  const summaryMargin = printSettings.compactMode ? '18px' : '24px';
  const summaryPadding = printSettings.compactMode ? '12px' : '18px';
  
  // Ensure minimum font sizes for readability - increased for better print visibility
  const minFontSize = Math.max(printSettings.fontSize, 12);
  const minTableFontSize = Math.max(printSettings.tableFontSize, 11);
  
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
        padding: ${printSettings.compactMode ? '12px' : '16px'};
        background: white;
        page-break-inside: avoid;
      }
      /* Header styles - ensure readable sizes */
      #printable-receipt h2,
      #printable-receipt h3 {
        margin: 0 0 ${printSettings.compactMode ? '10px' : '12px'} 0;
        font-weight: 700;
        font-size: ${printSettings.compactMode ? '18px' : '20px'};
        line-height: 1.3;
        page-break-after: avoid;
      }
      /* Address and store info in header - ensure visible in print */
      #printable-receipt .text-center p {
        margin: ${printSettings.compactMode ? '5px 0' : '7px 0'};
        font-size: ${Math.max(printSettings.compactMode ? 10 : 11, 10)}px;
        color: #6c757d;
        line-height: 1.5;
      }
      /* Table styles for professional appearance - prevent cutoff */
      #printable-receipt table {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        border-spacing: 0 !important;
        margin: ${tableMargin};
        font-size: ${minTableFontSize}px !important;
        background: white !important;
        table-layout: auto;
        page-break-inside: auto;
        border: ${printBorderThick} !important;
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
        text-align: center;
        font-weight: 700 !important;
        border: ${printBorderStyle} !important;
        border-top: ${printBorderThick} !important;
        border-left: ${printBorderStyle} !important;
        border-right: ${printBorderStyle} !important;
        border-bottom: ${printHeaderBorderBottom} !important;
        color: #000000 !important;
        font-size: ${minTableFontSize}px !important;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
        min-width: 0;
        background-color: transparent !important;
        background: transparent !important;
      }
      #printable-receipt table td {
        padding: ${tablePadding} !important;
        border: ${printBorderStyle} !important;
        border-top: ${printBorderBottom} !important;
        border-left: ${printBorderStyle} !important;
        border-right: ${printBorderStyle} !important;
        border-bottom: ${printBorderBottom} !important;
        text-align: center;
        font-size: ${minTableFontSize}px !important;
        color: #000000 !important;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
        min-width: 0;
        line-height: 1.5;
        background-color: white !important;
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
      /* Product name column - allow wrapping for long names */
      #printable-receipt table td:first-child,
      #printable-receipt table th:first-child {
        text-align: right !important;
        max-width: 40%;
        word-break: break-word;
      }
      /* Quantity and price columns - keep compact */
      #printable-receipt table td:nth-child(2),
      #printable-receipt table th:nth-child(2),
      #printable-receipt table td:nth-child(3),
      #printable-receipt table th:nth-child(3) {
        white-space: nowrap;
        width: auto;
        min-width: 60px;
      }
      /* Total column */
      #printable-receipt table td:last-child,
      #printable-receipt table th:last-child {
        white-space: nowrap;
        font-weight: 600;
      }
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
        margin-top: ${summaryMargin};
        padding-top: ${summaryPadding};
        border-top: ${printBorderThick} !important;
        page-break-inside: avoid;
      }
      #printable-receipt .receipt-summary > div {
        display: flex;
        justify-content: space-between;
        padding: ${printSettings.compactMode ? '6px 0' : '8px 0'};
        font-size: ${minFontSize}px;
        line-height: 1.5;
        page-break-inside: avoid;
      }
      #printable-receipt .receipt-summary .grand-total {
        font-weight: 700;
        font-size: ${Math.max(printSettings.compactMode ? 16 : 18, 16)}px !important;
        padding-top: ${printSettings.compactMode ? '10px' : '12px'};
        margin-top: ${printSettings.compactMode ? '10px' : '12px'};
        border-top: ${printBorderThick} !important;
        page-break-inside: avoid;
        color: #000000 !important;
      }
      /* Invoice info section - 2-row layout with larger text */
      #printable-receipt .invoice-info {
        padding: ${printSettings.compactMode ? '12px 0' : '16px 0'};
        border-bottom: ${printBorderThick} !important;
        margin-bottom: ${printSettings.compactMode ? '12px' : '16px'};
        page-break-inside: avoid;
      }
      #printable-receipt .invoice-info > p {
        margin: ${printSettings.compactMode ? '4px 0 8px 0' : '6px 0 12px 0'};
        font-size: ${Math.max(minFontSize, 13)}px !important;
        line-height: 1.5;
        color: #000000 !important;
        text-align: center;
      }
      /* Grid layout for invoice info - 2 columns, 2 rows */
      #printable-receipt .invoice-info .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: ${printSettings.compactMode ? '12px' : '16px'};
        margin-top: ${printSettings.compactMode ? '8px' : '12px'};
      }
      #printable-receipt .invoice-info .grid > div {
        display: flex;
        flex-direction: column;
      }
      #printable-receipt .invoice-info .grid p {
        margin: 0;
        color: #000000 !important;
      }
      #printable-receipt .invoice-info .grid p strong {
        font-size: ${Math.max(minFontSize, 13)}px !important;
        font-weight: 700;
        color: #000000 !important;
        display: block;
        margin-bottom: 4px;
      }
      #printable-receipt .invoice-info .grid p:not(strong) {
        font-size: ${Math.max(minFontSize + 2, 15)}px !important;
        font-weight: 600;
        color: #000000 !important;
        line-height: 1.4;
      }
      #printable-receipt .invoice-info .grid p.text-xs {
        font-size: ${Math.max(minTableFontSize, 10)}px !important;
        font-weight: 400;
        margin-top: 4px;
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
        #printable-receipt .invoice-info .grid p strong {
          font-size: 14px !important;
          font-weight: 700 !important;
        }
        #printable-receipt .invoice-info .grid p:not(strong):not(.text-xs) {
          font-size: 16px !important;
          font-weight: 600 !important;
        }
      }
      /* Footer */
      #printable-receipt .receipt-footer {
        text-align: center;
        margin-top: ${printSettings.compactMode ? '18px' : '24px'};
        padding-top: ${printSettings.compactMode ? '12px' : '16px'};
        border-top: ${printSettings.showBorders ? '1px dashed #dee2e6' : 'none'};
        font-size: ${Math.max(printSettings.compactMode ? 10 : 11, 10)}px;
        color: #6c757d;
        page-break-inside: avoid;
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
        /* Force all text to be black for maximum contrast */
        #printable-receipt * {
          color: #000000 !important;
        }
        #printable-receipt {
          background: white !important;
        }
        /* Force table borders to be visible in print */
        #printable-receipt table,
        #printable-receipt table th,
        #printable-receipt table td {
          border: ${printBorderStyle} !important;
          border-collapse: collapse !important;
        }
        #printable-receipt table th {
          border-bottom: ${printHeaderBorderBottom} !important;
          border-top: ${printBorderThick} !important;
          background-color: transparent !important;
          background: transparent !important;
        }
        #printable-receipt table td {
          border-bottom: ${printBorderBottom} !important;
          background-color: transparent !important;
          background: transparent !important;
        }
        #printable-receipt table tbody tr:last-child td {
          border-bottom: ${printBorderThick} !important;
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

