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
  
  // Get print settings from preferences
  const printSettings = getPrintSettings();
  
  // Get page size CSS
  const pageSize = getPageSize(printSettings.paperSize, printSettings.paperWidth, printSettings.paperHeight);
  
  // Calculate padding based on compact mode
  const tablePadding = printSettings.compactMode ? '6px 4px' : '10px 8px';
  const tableMargin = printSettings.compactMode ? '10px 0' : '15px 0';
  const summaryMargin = printSettings.compactMode ? '15px' : '20px';
  const summaryPadding = printSettings.compactMode ? '10px' : '15px';
  
  // Border styles based on showBorders setting
  const borderStyle = printSettings.showBorders ? '1px solid #dee2e6' : 'none';
  const borderBottomStyle = printSettings.showBorders ? '1px solid #dee2e6' : 'none';
  const borderTopStyle = printSettings.showBorders ? '2px solid #dee2e6' : 'none';
  const headerBorderBottom = printSettings.showBorders ? '2px solid #495057' : 'none';
  
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
        font-size: ${printSettings.fontSize}px;
        color: #000;
        background: white;
        line-height: ${printSettings.compactMode ? '1.3' : '1.5'};
      }
      * {
        box-sizing: border-box;
      }
      .print-hidden {
        display: none !important;
      }
      /* Receipt container */
      #printable-receipt {
        max-width: 100% !important;
        margin: 0 auto;
        padding: ${printSettings.compactMode ? '10px' : '20px'};
        background: white;
      }
      /* Header styles */
      #printable-receipt h2,
      #printable-receipt h3 {
        margin: 0 0 ${printSettings.compactMode ? '8px' : '10px'} 0;
        font-weight: 700;
      }
      /* Table styles for professional appearance */
      #printable-receipt table {
        width: 100%;
        border-collapse: collapse;
        margin: ${tableMargin};
        font-size: ${printSettings.tableFontSize}px;
        background: white;
      }
      #printable-receipt table thead {
        background-color: ${printSettings.showBorders ? '#f8f9fa' : 'transparent'};
      }
      #printable-receipt table th {
        padding: ${tablePadding};
        text-align: center;
        font-weight: 700;
        border: ${borderStyle};
        border-bottom: ${headerBorderBottom};
        color: #212529;
        font-size: ${printSettings.tableFontSize}px;
      }
      #printable-receipt table td {
        padding: ${tablePadding};
        border: ${borderStyle};
        text-align: center;
        font-size: ${printSettings.tableFontSize}px;
        color: #212529;
      }
      #printable-receipt table tbody tr {
        border-bottom: ${borderBottomStyle};
      }
      #printable-receipt table tbody tr:last-child {
        border-bottom: none;
      }
      #printable-receipt table tbody tr:hover {
        background-color: ${printSettings.showBorders ? '#f8f9fa' : 'transparent'};
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
      /* Summary section */
      #printable-receipt .receipt-summary {
        margin-top: ${summaryMargin};
        padding-top: ${summaryPadding};
        border-top: ${printSettings.showBorders ? '2px solid #dee2e6' : 'none'};
      }
      #printable-receipt .receipt-summary > div {
        display: flex;
        justify-content: space-between;
        padding: ${printSettings.compactMode ? '4px 0' : '6px 0'};
        font-size: ${printSettings.fontSize}px;
      }
      #printable-receipt .receipt-summary .grand-total {
        font-weight: 700;
        font-size: ${printSettings.compactMode ? '14px' : '16px'};
        padding-top: ${printSettings.compactMode ? '8px' : '10px'};
        margin-top: ${printSettings.compactMode ? '8px' : '10px'};
        border-top: ${printSettings.showBorders ? '2px solid #495057' : 'none'};
      }
      /* Invoice info section */
      #printable-receipt .invoice-info {
        padding: ${printSettings.compactMode ? '10px 0' : '15px 0'};
        border-bottom: ${printSettings.showBorders ? '2px solid #dee2e6' : 'none'};
        margin-bottom: ${printSettings.compactMode ? '10px' : '15px'};
      }
      #printable-receipt .invoice-info p {
        margin: ${printSettings.compactMode ? '3px 0' : '5px 0'};
        font-size: ${printSettings.tableFontSize}px;
      }
      /* Footer */
      #printable-receipt .receipt-footer {
        text-align: center;
        margin-top: ${printSettings.compactMode ? '15px' : '25px'};
        padding-top: ${printSettings.compactMode ? '10px' : '15px'};
        border-top: ${printSettings.showBorders ? '1px dashed #dee2e6' : 'none'};
        font-size: ${printSettings.compactMode ? '10px' : '11px'};
        color: #6c757d;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        #printable-receipt {
          box-shadow: none;
          border: none;
        }
        .print-hidden {
          display: none !important;
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

      // Create a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      
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
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          
          if (!iframeDoc) {
            throw new Error('Could not access iframe document');
          }

          // Write content to iframe
          iframeDoc.open();
          iframeDoc.write(content);
          iframeDoc.close();

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
                  // Use a longer timeout to ensure dialog has closed
                  const timeout = options?.timeout || 2000;
                  setTimeout(cleanup, timeout);
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

