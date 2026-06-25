/**
 * QUICKDELIVER GOOGLE APPS SCRIPT BACKEND
 * 
 * INSTRUCTIONS:
 * 1. Open Google Sheets (sheets.google.com).
 * 2. Create a new Spreadsheet and name it "QuickDeliver Orders".
 * 3. In the menu, go to Extensions -> Apps Script.
 * 4. Delete any code in the editor and paste this entire script.
 * 5. Replace 'YOUR_FOLDER_ID' below with your Google Drive Folder ID if you want file uploads to go to a specific folder.
 *    (Otherwise, leave it empty or delete that line to save directly to root Drive).
 * 6. Click the Save icon (floppy disk).
 * 7. Click "Deploy" -> "New deployment".
 * 8. Select type: "Web app".
 * 9. Set Configuration:
 *    - Description: "QuickDeliver PWA Backend"
 *    - Execute as: "Me" (your-email@gmail.com)
 *    - Who has access: "Anyone" (CRITICAL: Select "Anyone" to allow customers to submit orders without signing in!)
 * 10. Click "Deploy".
 * 11. Copy the "Web app" URL (looks like https://script.google.com/macros/s/.../exec).
 * 12. Paste this Web App URL into the App settings / .env.example or configure it in the web app's Admin settings panel.
 */

// Global Config
const DRIVE_FOLDER_ID = ""; // Optional: Paste a Google Drive folder ID to keep uploads organized. E.g., "1abc123xyz..."

/**
 * Handle GET Requests: Used by the hidden Admin panel to fetch real-time orders from Google Sheets.
 */
function doGet(e) {
  const sheet = getOrCreateSheet();
  const action = e.parameter.action;
  
  // Set CORS headers so the React app can retrieve data directly
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    if (action === "getOrders") {
      const data = getOrdersList(sheet);
      output.setContent(JSON.stringify({ success: true, orders: data }));
    } else {
      output.setContent(JSON.stringify({ 
        success: true, 
        message: "QuickDeliver Apps Script API is active. Use action=getOrders to read data." 
      }));
    }
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }
  
  return output;
}

/**
 * Handle POST Requests: Used to submit new orders or update existing order statuses.
 */
function doPost(e) {
  // Set CORS headers
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    const postData = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();
    
    // CASE A: UPDATE ORDER STATUS (From Admin Panel)
    if (postData.action === "updateStatus") {
      const orderId = postData.orderId;
      const newStatus = postData.status;
      
      if (!orderId || !newStatus) {
        throw new Error("Missing orderId or status in updateStatus action");
      }
      
      const success = updateOrderStatusInSheet(sheet, orderId, newStatus);
      if (success) {
        return output.setContent(JSON.stringify({ success: true, message: "Order " + orderId + " updated to " + newStatus }));
      } else {
        throw new Error("Order ID not found: " + orderId);
      }
    }

    // CASE A1: UPDATE PAYMENT STATUS (From Admin Panel)
    if (postData.action === "updatePaymentStatus") {
      const orderId = postData.orderId;
      const newPaymentStatus = postData.paymentStatus;
      
      if (!orderId || !newPaymentStatus) {
        throw new Error("Missing orderId or paymentStatus in updatePaymentStatus action");
      }
      
      const success = updateOrderPaymentStatusInSheet(sheet, orderId, newPaymentStatus);
      if (success) {
        return output.setContent(JSON.stringify({ success: true, message: "Order " + orderId + " payment updated to " + newPaymentStatus }));
      } else {
        throw new Error("Order ID not found: " + orderId);
      }
    }
    
    // CASE B: CREATE NEW ORDER (From customer order page)
    const orderId = postData.id;
    const timestamp = postData.timestamp || new Date().toISOString();
    const name = postData.customerName;
    const phone = postData.phone;
    const department = postData.department;
    const location = postData.deliveryLocation;
    const serviceType = postData.serviceType;
    const details = postData.details;
    const status = postData.status || "Pending";
    const estimatedPrice = parseFloat(postData.estimatedPrice || 0);
    
    let fileUrl = "";
    
    // If a file is uploaded as base64, save it to Google Drive
    if (postData.fileData && postData.fileName) {
      fileUrl = saveFileToDrive(postData.fileData, postData.fileName, postData.fileType, orderId);
    }
    
    // Append the row to Google Sheets:
    // Columns: Order ID, Timestamp, Customer Name, Phone, Department, Delivery Location, Service Type, Details, Status, Estimated Price, File URL, Payment Method, Payment Status, Payment Reference
    sheet.appendRow([
      orderId,
      timestamp,
      name,
      phone,
      department,
      location,
      serviceType,
      details,
      status,
      estimatedPrice,
      fileUrl,
      postData.paymentMethod || "Cash on Delivery",
      postData.paymentStatus || "Pending",
      postData.paymentReference || ""
    ]);
    
    return output.setContent(JSON.stringify({ 
      success: true, 
      orderId: orderId,
      fileUrl: fileUrl,
      message: "Order stored successfully in Google Sheets!" 
    }));
    
  } catch (err) {
    return output.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }
}

/**
 * Helper to open or initialize the order sheet
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Orders");
  
  const headers = [
    "Order ID",
    "Timestamp",
    "Customer Name",
    "Phone",
    "Department",
    "Delivery Location",
    "Service Type",
    "Order Details",
    "Status",
    "Estimated Price",
    "File URL",
    "Payment Method",
    "Payment Status",
    "Payment Reference"
  ];

  if (!sheet) {
    sheet = ss.insertSheet("Orders");
    // Write headers
    sheet.appendRow(headers);
    
    // Format headers
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight("bold");
    range.setBackground("#e8521a");
    range.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  } else {
    // Backward compatibility: check if headers need expansion
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (currentHeaders.length < headers.length) {
      // Append missing headers
      for (let j = currentHeaders.length; j < headers.length; j++) {
        sheet.getRange(1, j + 1).setValue(headers[j]);
        // style newly added header
        const cell = sheet.getRange(1, j + 1);
        cell.setFontWeight("bold");
        cell.setBackground("#e8521a");
        cell.setFontColor("#ffffff");
      }
    }
  }
  return sheet;
}

/**
 * Save Base64 file attachment to Google Drive and return its sharable view link
 */
function saveFileToDrive(base64String, fileName, fileType, orderId) {
  try {
    // Clean up base64 header if present (e.g. "data:application/pdf;base64,")
    const commaIndex = base64String.indexOf(",");
    let pureBase64 = base64String;
    if (commaIndex > -1) {
      pureBase64 = base64String.substring(commaIndex + 1);
    }
    
    const decodedBlob = Utilities.newBlob(Utilities.base64Decode(pureBase64), fileType || "application/octet-stream", orderId + "_" + fileName);
    
    let folder;
    if (DRIVE_FOLDER_ID) {
      folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    } else {
      folder = DriveApp.getRootFolder();
    }
    
    const file = folder.createFile(decodedBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (err) {
    console.error("Error saving file: " + err.toString());
    return "Error uploading file: " + err.toString();
  }
}

/**
 * Retrieve all orders from Google Sheets as an Array of Objects
 */
function getOrdersList(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return []; // Only headers
  
  const headers = values[0];
  const orders = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const order = {};
    
    // Map sheet columns to order object keys
    order.id = row[0];
    order.timestamp = row[1];
    order.customerName = row[2];
    order.phone = row[3];
    order.department = row[4];
    order.deliveryLocation = row[5];
    order.serviceType = row[6];
    order.details = row[7];
    order.status = row[8];
    order.estimatedPrice = row[9];
    order.fileUrl = row[10];
    order.paymentMethod = row[11] || "Cash on Delivery";
    order.paymentStatus = row[12] || "Pending";
    order.paymentReference = row[13] || "";
    
    orders.push(order);
  }
  
  // Return reversed to put newest orders at the top
  return orders.reverse();
}

/**
 * Find order by ID and update its status
 */
function updateOrderStatusInSheet(sheet, orderId, status) {
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === orderId) {
      const rowNum = i + 1; // 1-indexed for sheets, +1 for 0-indexed values array
      sheet.getRange(rowNum, 9).setValue(status); // Column 9 is Status
      return true;
    }
  }
  return false;
}

/**
 * Find order by ID and update its payment status
 */
function updateOrderPaymentStatusInSheet(sheet, orderId, paymentStatus) {
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === orderId) {
      const rowNum = i + 1; // 1-indexed for sheets
      sheet.getRange(rowNum, 13).setValue(paymentStatus); // Column 13 is Payment Status
      return true;
    }
  }
  return false;
}
