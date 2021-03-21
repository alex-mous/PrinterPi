/*
 *    main.js - Main code for PrinterPi extension web page
 *
 *    Copyright (C) 2020  PolarPiBerry
 *
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License
 *    along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

 /**
 * Sold Item
 * @typedef {Object} Item
 * @property {string} desc Title of item
 * @property {string} price Price paid (total)
 * @property {string} sku Custom SKU
 * @property {string} qty Quantity purchased
 */

 /**
  * Logo object
  * @typedef {Object} Logo
  * @property {string} data Image data
  * @property {number} width Image width
  * @property {number} height Image height
  */

/**
 * Settings object
 * @typedef {Object} Settings
 * @property {string} ipAddress IP of printer
 * @property {string} from Address of seller
 * @property {Logo} fromLogo Return address logo (if any)
 * @property {string} messages Messages to add to receipt
 * @property {string} saveFiles Save copies of receipts ("Y" for yes, "N" for no)
 * @property {string} saveFilesLocation Path to where to save copies of receipts
 * @property {string} autoParse Automatically parse page if the page is valid ("Y" for yes, "N" for no)
 */

/**
 * Data Packet (containing all information needed to create a recipt, envelope, and saved copy)
 * @typedef {Object} Packet
 * @property {string} to Address of the buyer
 * @property {string} shipping Shipping paid by buyer
 * @property {string} tax Tax paid by buyer
 * @property {string} subtotal Subtotal paid by buyer (not including shipping)
 * @property {Array<Item>} items Items purchased
 * @property {Settings} settings User settings as defined above
 */

 /**
  * General on finish callback for chrome async functions
  *
  * @callback onFinish
  * @param {string} resError Response error (if any)
  */

const VERSION_NO = 7.2; //Current version

let orders = []; //Orders received from background script

/*
  Data format to send to PrinterPi (NOTE: item descs and skus MUST NOT CONTAIN ~ and NO EXTRA SPACES ARE ALLOWED before/after parameters):

  To: Line1/n/Line2/n/Line3
  From: Line1/n/Line2/n/Line3
  Subtotal: $5.00
  Tax: $0.00
  Shipping: $3.00
  SaveFile: 1
  Item: Item_1~I123~1~$1.00
  Item: Item 2, And 3~I32-+A5~44~$1.00
  Message: Contact me at eikyutsuho@gmail.com if you have any questions/concerns/n/Thank you for your business!

*/

/**
 * Read the data from the storage and show it on the page
 *
 * @function readStorageData
 * @param {onFinish} onFinish On finish callback
 */
let readStorageData = (onFinish) => {
  chrome.storage.local.get(["orders"], (res) => {
    if (res.orders) {
      orders = res.orders;
      showOrders();
      selectOrder(0);
      document.getElementById("more-info").innerHTML = "Data read from storage";
    } else {
      document.getElementById("more-info").innerHTML = "No data in storage";
      document.getElementById('print-button').disabled = true;
      document.getElementById('envelope-button').disabled = true;
      document.getElementById('save-button').disabled = true;
    }
    if (onFinish) onFinish();
  });
}

/**
 * Store the data from the page into storage
 *
 * @function setStorageData
 */
let setStorageData = () => {
  if (validateInputs()) {
    chrome.storage.local.set({orders: orders}, () => {
      document.getElementById("more-info").innerHTML = "Data saved";
    });
  }
}

/**
 * Get the settings from memory
 *
 * @function getSettings
 * @returns {Promise} Settings as a Promise
 */
let getSettings = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["settings"], (data) => {
      if (data && data.settings) {
        resolve(data.settings);
      } else {
        reject("No settings");
      }
    });
  });
}

/**
 * Convert a Packet into a message
 *
 * @function convertToMessage
 * @param {Packet} pkt Packet
 * @returns {string} Message
 */
let convertToMessage = (pkt) => {
 /*
    Data format (NOTE: item descs and skus MUST NOT CONTAIN ~ or ` and NO EXTRA SPACES ARE ALLOWED. ` Signifies end of transmission):

    To: Line1/n/Line2/n/Line3
    From: Line1/n/Line2/n/Line3
    Subtotal: $2.00
    Tax: $1.00
    Shipping: $1.00
    Item: Item_1~I123~1~$1.00
    Item: Item 2, And 3~I32-+A5~44~$1.00
    Message: Contact me at eikyutsuho@gmail.com if you have any questions/concerns/n/Thank you for your business!
    `
  */
  let msg = "";
  msg += "To: " + pkt.to.split("\n").join("/n/") + "\r\n";
  msg += "From: " + pkt.settings.from.split("\n").join("/n/") + "\r\n";
  msg += "Subtotal: " + pkt.subtotal + "\r\n";
  msg += "Tax: " + pkt.tax + "\r\n";
  msg += "Shipping: " + pkt.shipping + "\r\n";
  pkt.items.forEach((item) => msg += "Item: " + item.desc.replace("~", " ") + "~" + item.sku.replace("~", " ") + "~" + item.qty + "~" + item.price + "\r\n");
  msg += "Message: " + pkt.settings.messages.split("\n").join("~") + "\r\n";
  msg += "`";
  return msg;
}

/**
 * Create the message from the data Packet and send it
 *
 * @function sendData
 * @param {Packet} pkt Data Packet
 */
let sendData = (pkt) => {
  if (pkt) {
    let done_msg = document.getElementById("done-msg");
    done_msg.innerHTML = "Sending data...";
    done_msg.classList = "text-warning";
    let msg = convertToMessage(pkt);
    console.log(msg);
    fetch("http://" + pkt.settings.ipAddress, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: msg
    }).then((res) => {
      return res.json();
    }).then((res) => {
      console.log(res);
      if (res.success) {
        if (pkt.settings.saveFiles == "Y") {
          downloadFile(pkt, pkt.settings.saveFilesLocation);
        }
        done_msg.innerHTML = "Successfully sent data to the printer";
        done_msg.classList = "text-success";
      } else {
        done_msg.innerHTML = "Error on the printer - possible lack of data or transmission error";
        done_msg.classList = "text-danger";
      }
    }).catch((err) => {
      console.log(err);
      done_msg.innerHTML = "Error while sending data to the printer! Please try again, make sure the printer is on and the server is up, or contact the developer";
      done_msg.classList = "text-danger";
    })
  } else {
    done_msg.innerHTML = "Invalid data supplied. Please check the Settings and the data on the page";
    done_msg.classList = "text-danger";
  }
}


/**
 * Download the data Packet onto the user's OS (only select options [to, shipping, tax, subtotal, items and version] are used)
 *
 * @function downloadFile
 * @param {Packet} pkt
 */
let downloadFile = (pkt, filepath) => {
  let blob = new Blob([JSON.stringify({
    to: pkt.to,
    shipping: pkt.shipping,
    tax: pkt.tax,
    subtotal: pkt.subtotal,
    items: pkt.items,
    version: VERSION_NO
  })], {type: "application/json"});
  let url = URL.createObjectURL(blob);
  let item_skus = pkt.items.filter((item) => item.sku.length > 1);
  let name;
  if (item_skus.length > 1) {
    name = item_skus.reduce((prev, curr, i) => {
      return (i==1 ? prev.sku + "," + curr.sku : prev + "," + curr.sku);
    });
  } else if (item_skus.length == 1) {
    name = item_skus[0].sku
  } else {
    name = "Packing List";
  }
  chrome.downloads.download({
    url: url,
    filename: filepath + "/" + name + ".json",
    saveAs: name=="Packing List"
  }, () => {
    console.log("Download complete");
  })
}

/**
 * Generate a JSPDF PDF document envelope and return as a blob
 *
 * @function printEnvelope
 * @param {Packet} pkt Packet to use for envelope PDF
 * @returns {string} File blob
 */
let printEnvelope = (pkt) => {
  let pdf = new window.jspdf.jsPDF({
    orientation: "landscape",
    format: "a4",
    unit: "mm"
  });

  //To address block is at (170, 110) (approximately)
  //From address block is at (47.5, 63)
  const fromXY = { x: 47.5, y: 63 };
  const toXY = { x: 170, y: 116 };

  let wFrom = 0; //Width of from address
  let wTo = 0; //Width of to address
  let from = pkt.settings.from.split("\n");
  let to = pkt.to.split("\n");
  from.forEach((v) => wFrom = Math.max(wFrom, v.length)); //Find longest line and get width
  to.forEach((v) => wTo = Math.max(wTo, v.length)); //Find longest line and get width

  let hBox = from.length * 5; //Height of enclosing box
  let wBox = wFrom*2+4;
  let hImg = 0; let wImg = 0; //Dimensions of image (if any)

  pdf.setLineWidth(0.5);
  let fromLogo = pkt.settings.fromLogo;
  if (fromLogo && fromLogo.height && fromLogo.width) { //Image to add
    if (fromLogo.height*2 > fromLogo.width) { //Height is larger than half of the width - show next to address as opposed to on top
      wImg = hBox * pkt.settings.fromLogo.width / pkt.settings.fromLogo.height;
      pdf.line(fromXY.x+wImg, fromXY.y, fromXY.x+wImg, fromXY.y+hBox); //Add line under box
      pdf.addImage(pkt.settings.fromLogo.data, "JPEG", fromXY.x+0.25, fromXY.y+0.25, wImg-0.5, hBox-0.5);
    } else {
      hImg = wBox * pkt.settings.fromLogo.height / pkt.settings.fromLogo.width;
      pdf.line(fromXY.x, fromXY.y+hImg, fromXY.x+wBox, fromXY.y+hImg); //Add line under box
      pdf.addImage(pkt.settings.fromLogo.data, "JPEG", fromXY.x+0.25, fromXY.y+0.25, wBox-0.5, hImg-0.5);
    }
  }
  pdf.roundedRect(fromXY.x, fromXY.y, wBox+wImg, hBox+hImg, 1, 1); //Add enclosing box
  pdf.setFontSize(10.5);
  pdf.text(from, fromXY.x+wBox/2+wImg, fromXY.y+5+hImg, {align: "center", lineHeightFactor: "1.1"}); //Add from address

  pdf.setFontSize(12);
  pdf.text(to, toXY.x+wFrom, toXY.y, {align: "center", lineHeightFactor: "1.1"});
  return pdf.output("bloburl"); //Open window and print
}

/**
 * Get the data from the page and return it in as a Packet
 *
 * @function getData
 * @returns {Object} Page data
 */
let getData = () => { //Read the data from the HTML page
  let items = [];
  let raw_items = document.getElementById("items").children;
  for (let i=0; i<raw_items.length; i++) {
    let item = raw_items[i].children;
    if (item[0].children[0].value != "") { //Only run if element's description is not empty
      items.push({
        desc: item[0].children[0].value,
        price: item[1].children[0].value,
        qty: item[2].children[0].value,
        sku: item[3].children[0].value
      });
    }
  }

  let data = {
    to: document.getElementById("Address").value,
    subtotal: document.getElementById("Subtotal").value,
    tax: document.getElementById("Tax").value,
    shipping: document.getElementById("Shipping").value,
    items: items
  }
  return data;
}

/**
 * Update the global orders with any changes
 */
const updateOrders = () => {
  console.log("Updating);")
  if (validateInputs()) {
    console.log(getData());
    orders[document.getElementById("order-select").value] = getData();
  }
}

/**
 * Show a (global) order based on it's index
 * 
 * @param {number} orderIndex 
 */
let selectOrder = (orderIndex) => {
  document.getElementById('order-select').value = orderIndex;
  setData({
      to: orders[orderIndex]?.to || "",
      shipping: orders[orderIndex]?.shipping || "0",
      tax: orders[orderIndex]?.tax || "0",
      subtotal: orders[orderIndex]?.subtotal || "0",
      items: orders[orderIndex]?.items || [],
  });
  validateInputs();
}

/**
 * Remove the current order (from global orders)
 */
const removeCurrentOrder = () => {
  let nextIndex = parseInt(document.getElementById("order-select").value);
  orders.splice(document.getElementById("order-select").value, 1);
  showOrders();
  console.log(orders, nextIndex);
  if (nextIndex >= orders.length) nextIndex -= 1; //Ensure index isn't too large
  if (nextIndex < 0) nextIndex = 0; //Ensure index isn't before first element
  console.log(nextIndex);selectOrder(nextIndex);
}

/**
 * Show the (global) orders in the select
 */
const showOrders = () => {
  document.getElementById('order-select').innerHTML = "";
  orders.forEach((_, i) => {
    let opt = document.createElement("OPTION");
    opt.value = i;
    opt.innerHTML = `${i+1}: ${orders[i].to.split("\n")?.[0] || "Order" + (i+1)}`;
    opt.selected = i==0;
    document.getElementById('order-select').appendChild(opt);
  });
}

/**
 * Get the complete data Packet
 *
 * @param {Object} settings Object containing user settings
 * @returns {Packet} Data Packet
 */
let getPacket = (settings) => {
  if (validateInputs()) {
    let data = getData();
    let pkt = {...data, settings: settings};
    return pkt;
  } else {
    return null;
  }
}

/**
 * Take a data packet and sets the data to show on the page
 *
 * @function setData
 * @param {Packet} pkt Data packet
 */
let setData = (pkt) => {
  document.getElementById("Address").value = pkt.to;
  document.getElementById('Shipping').value = pkt.shipping;
  document.getElementById('Tax').value = pkt.tax;
  document.getElementById('Subtotal').value = pkt.subtotal;
  document.getElementById('items').innerHTML = ""; //Remove existing items
  pkt.items.forEach((item) => addItem(item));
}

/**
 * Take an item and add it to the #items table
 *
 * @function addItem
 * @param {Item} item Object containing desc, price, qty and sku
 */
let addItem = (msg) => {
  var ele = document.createElement("TR");
	ele.appendChild(getTDInput(msg.desc));
  ele.appendChild(getTDInput(msg.price));
  ele.appendChild(getTDInput(msg.qty));
  ele.appendChild(getTDInput(msg.sku));
  ele.appendChild(getXButton());
  document.getElementById('items').appendChild(ele);
}

/**
 * Validate the number/currecy input and convert to currency if it is a number
 *
 * @function validateNumberInput
 * @param {Object} ele Node element to analyze
 * @param {Object} name Name of element to show in error message
 * @returns {string} Returns error (if any)
 */
let validateNumberInput = (ele, name) => {
  const currency_regex = /^\$([0-9]|[1-9][0-9]+)\.[0-9]{2}$/; //Match currency
  if (!ele.value.match(currency_regex) && isNaN(parseFloat(ele.value))) {
    return (name + " must a number or a currency value. ");
  } else if (!isNaN(parseFloat(ele.value))) { //Convert field to currency value
    let str = "" + ele.value;
    let dp = str.indexOf(".");
    if (dp == -1) {
        str += ".00";
    } else {
        let no = 3 - str.substr(dp).length;
        for (let i=0; i<no; i++) {
            str += "0";
        }
        if (no < 0) { //error in price - shouldn't be more than 2 decimal places
            str = str.substr(0, dp+3);
        }
    }
    ele.value = "$"+str;
  }
}

/**
 * Checks all of the fields and sets error message as required
 *
 * @function validateInputs
 * @returns {boolean} Returns if inputs are ready
 */
let validateInputs = () => {
  let err_msg = ""; //Hold the error to be returned to the user

  //Validate the shipping, tax and total
  var values = ["Subtotal", "Tax", "Shipping"];
  values.forEach((id) => {
    let res = validateNumberInput(document.getElementById(id), id)
    if (res)
      err_msg += res;
  });

  //Validate the address
  if (document.getElementById("Address").value.length < 5) { //Must be larger than 5 characters to make an address
    err_msg += "Please enter an address. ";
  }

  //Validate the items
  let items = document.getElementById("items").children;
  let item_err = "";
  for (let i=0; i<items.length; i++) {
    let item = items[i].children;
    if (item[0].children[0].value != "" || item[1].children[0].value != "" || item[2].children[0].value != "" || item[3].children[0].value != "") { //Run if any element is not empty
      let res = validateNumberInput(item[1].children[0], "Item price");
      if (res) { //Price
        err_msg += res;
      }
      if (!item[2].children[0].value || isNaN(+(item[2].children[0].value))) { //QTY - try to parse int and check exists
        item_err += "Item quantity must be an integer";
      }
      if (item[3].children[0].value.length < 1) { //SKU - must be atleast a one character SKU
        item_err += "Please enter SKUs for all of the items";
      }
    }
    if (item_err) {
      break; //Break early so as to prevent many errors
    }
  }
  err_msg += item_err;
  if (items.length == 0) { //No items to read
    err_msg += "No items to send";
  }

  if (err_msg) { //Display any errors and disable the submit button
    document.getElementById("print-button").disabled = true;
    document.getElementById("print-all-button").disabled = true;
    let done_msg = document.getElementById("done-msg");
    done_msg.innerHTML = err_msg;
    done_msg.classList = "text-danger";
    return false;
  } else { //No errors - remove any lock on the submit button
    document.getElementById("print-button").disabled = false;
    document.getElementById("print-all-button").disabled = false;
    let done_msg = document.getElementById("done-msg");
    done_msg.innerHTML = "Not connected";
    done_msg.classList = "text-info";
    return true;
  }
}

/**
 * Create a TD element containing an INPUT element with the value provided
 *
 * @function getTDInput
 * @param {string} data Value of the input element
 * @returns {Object} Returns TD node
 */
let getTDInput = (data) => {
  let c1 = document.createElement("TD");
  c1.classList.add("py-1", "pl-0", "pr-1");
  let inpt = document.createElement("INPUT");
  inpt.classList.add("form-control");
  inpt.setAttribute("value", data);
	inpt.type = "text";
  inpt.addEventListener("change", updateOrders);
	c1.appendChild(inpt);
	return c1;
}

/**
 * Create a BUTTON element with a callback to remove the row
 *
 * @function getXButton
 * @returns {Object} Returns BUTTON node
 */
let getXButton = () => {
  let c1 = document.createElement("TD");
  c1.classList.add("m-0", "p-0");
  let xbtn = document.createElement("BUTTON"); //X button
  xbtn.onclick = (e) => e.target.parentNode.parentNode.remove(); //Delete the row
  xbtn.innerHTML = "&#x2716;";
  xbtn.classList.add("btn", "btn-inline", "btn-secondary", "p-0", "m-2")
  c1.appendChild(xbtn)
  return c1;
}

/**
 * Add an empty row to the table #items
 *
 * @function addRowItems
 */
let addRowItems = () => { //Add an empty row to the table "items"
  var ele = document.createElement("TR");
	for (var i=0; i<4; i++) {
		ele.appendChild(getTDInput(""));
  }
  ele.appendChild(getXButton());
	document.getElementById("items").appendChild(ele);
}

/**
 * Show the Options page in a new tab
 *
 * @function showOptions
 */
let showOptions = () => {
  chrome.tabs.create({'url': "/options.html" } );
}

/**
 * Parse the webpage (run the background script, which triggers runtime.onMessage events - see below)
 *
 * @function parsePage
 */
let parsePage = () => {
  chrome.extension.getBackgroundPage().chrome.tabs.executeScript(null, { file: './js/background.js' }); //Try to run the background script
}
/**
 * Parse the file with receipt data - event listener for file change event
 *
 * @function parseFile
 * @param {Object} ev Event
 */
let parseFile = (ev) => {
  const files = ev.target.files;
  if (files && files[0]) { //User selected a file
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = JSON.parse(event.target.result);
      let tax = 0;
      if (data.version >= 6.0) { //Tax support added in version 6.0
        tax = data.tax
      }
      orders = [];
      orders.push({ //Set the data packet
        to: data.to,
        shipping: data.shipping,
        tax: tax,
        subtotal: data.subtotal,
        items: data.items,
      });
      showOrders();
      selectOrder(0);
      document.getElementById("more-info").innerHTML = "Data loaded from file"; //Show the error message
    }
    reader.readAsText(files[0]);
  }
}



window.onload = () => { //Add event listeners, etc.
  getSettings().then((settings) => { //Read the settings and adjust accordingly
    document.getElementById('print-button').addEventListener('click', () => { //Get the data packet and send it
      let pkt = getPacket(settings);
      if (pkt) sendData(pkt);
    });
    document.getElementById('print-all-button').addEventListener('click', () => { //Get the data packets and send them
      for (let orderIndex in orders) {
        selectOrder(orderIndex);
        let pkt = getPacket(settings);
        if (pkt) sendData(pkt);
      }
    });
    document.getElementById('envelope-button').addEventListener('click', () => { //Get the data packet and print it
      let pkt = getPacket(settings);
      if (pkt) {
          let url = printEnvelope(pkt);
          window.open(url).print();
      }
    });
    document.getElementById('envelope-all-button').addEventListener('click', () => { //Get the data packets and print them
      let urls = [];
      for (let orderIndex in orders) {
        selectOrder(orderIndex);
        let pkt = getPacket(settings);
        if (pkt) {
          chrome.tabs.create({
            url: printEnvelope(pkt)
          })
        }
       
      }
      
    });

    if (settings.autoParse == "Y") {
      parsePage();
    } else {
      readStorageData(); //Read the current data and display it
    }
  }).catch((err) => {
    console.error("Error while getting settings: " + err);
    let done_msg = document.getElementById("done-msg");
    done_msg.innerHTML = "Please configure the printer settings in the Setting page (via the button PrinterPi Settings below)";
    done_msg.classList = "text-danger";
  });

  document.getElementById('order-select').addEventListener("change", (e) => selectOrder(e.target.value));
  document.getElementById('remove-button').addEventListener("click", removeCurrentOrder);
  document.getElementById('parse-button').addEventListener('click', parsePage); //Execute the background parsing script
  document.getElementById('restore-button').addEventListener('click', readStorageData);
  document.getElementById('save-button').addEventListener('click', setStorageData);
  document.getElementById('file-button').addEventListener('click', () => document.getElementById('file-dialog').click()); //Parse a file for the receipt
  document.getElementById('file-dialog').addEventListener('change', parseFile)
  document.getElementById("items-row-btn").addEventListener("click", addRowItems);
  document.getElementById("options-btn").addEventListener("click", showOptions);
  document.getElementById('Shipping').addEventListener("change", updateOrders);
  document.getElementById('Tax').addEventListener("change", updateOrders);
	document.getElementById('Subtotal').addEventListener("change", updateOrders);
  document.getElementById('Address').addEventListener("change", updateOrders);

  $('[data-toggle="tooltip"]').tooltip(); //Setup up tooltips
}

chrome.runtime.onMessage.addListener((msg) => { //Listen for messages and set the data accordingly
  if (msg.error != null || msg.orders?.length == 0) { //Error message from background script
    console.log("ERR: error received from background script: ", msg);
    readStorageData(() => { //Default to storage
      document.getElementById("more-info").innerHTML += ". Not a valid page to parse."; //Show the error message
    });
    document.getElementById('parse-button').disabled = true;
  } else if (msg.orders) {
    document.getElementById("more-info").innerHTML = "Read data from page"; //Show the error message
    console.log("Parsed orders: ", msg.orders);
    if (msg.orders.length >= 1) {
      setData({ //Set the data packet
        to: msg.orders[0].to,
        shipping: msg.orders[0].shipping,
        tax: msg.orders[0].tax,
        subtotal: msg.orders[0].subtotal,
        items: msg.orders[0].items,
      });
      orders = msg.orders;
      showOrders();
      validateInputs();
    }
  }
});