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
 * Data packet
 * @typedef {Object} Packet
 * @property {string} address Address of the buyer
 * @property {string} shipping Shipping paid by buyer
 * @property {string} total Subtotal paid by buyer (not including shipping)
 * @property {Array<Item>} items Items purchased
 */

 /**
 * Item object
 * @typedef {Object} Item
 * @property {string} desc Title of item
 * @property {string} price Price paid (total)
 * @property {string} sku Custom SKU
 * @property {string} qty Quantity purchased
 */

let port = null;
let host_name = "com.polarpiberry.thermal.printer.system";

/**
 * Connect to the local application and send the data on the page if the inputs are valid
 * 
 * @function connectHost
 */
let connectHost = () => {
  if (validateInputs()) {
    port = chrome.runtime.connectNative(host_name);
    let done_msg = document.getElementById("done-msg");
    port.onDisconnect.addListener(() => {
      //done_msg.innerHTML = "Error while connecting to local messaging host."; //Default error message
      //done_msg.classList = "text-danger";
      port = null;
    });
    port.onMessage.addListener(onMessage);
    done_msg.innerHTML = "Sending data...";
    done_msg.classList = "text-warning";
    sendData();
  }
}

/**
 * Read the data from the storage and show it on the page
 * 
 * @function readStorageData
 */
let readStorageData = () => {
  chrome.storage.sync.get(["data"], (res) => {
    if (res.data) {
      setData(res.data);
      document.getElementById("more-info").innerHTML = "Data read from storage";
    }
  });
}

/**
 * Store the data from the page into storage
 * 
 * @function setStorageData
 */
let setStorageData = () => {
  if (validateInputs()) {
    chrome.storage.sync.set({data: getData()}, () => {
      document.getElementById("more-info").innerHTML = "Data saved";
    });
  }
}

/**
 * Create the message from the data on the page and send it
 * 
 * @function sendData
 */
let sendData = () => {
  let pkt = getData();
  pkt.address = pkt.address.split("\n").join("/n/"); //Replace newline characters with custom notation
  if (port) {
	  port.postMessage(pkt);
  }
}

/**
 * Event handler for the message returned by the local host after data is sent
 * 
 * @function onMessage
 * @param {string} msg Message - status code
 */
let onMessage = (msg) => {
	if (msg == "200") {
    let done_msg = document.getElementById("done-msg");
    done_msg.innerHTML = "Successfully sent data to the printer.";
    done_msg.classList = "text-success";
	} else {
    let done_msg = document.getElementById("done-msg");
    done_msg.innerHTML = "Error while sending data to the printer! Please try again, make sure the printer is on and the server is up, or contact the developer. Code: " + msg;
    done_msg.classList = "text-danger";
	}
}

/**
 * Get the data from the page and return it in as a Packet
 * 
 * @function getData
 * @returns {Packet} Data packet
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

  let pkt = {
    address: document.getElementById("Address").value,
    total: document.getElementById("Subtotal").value,
    shipping: document.getElementById("Shipping").value,
    items: items
  }
  return pkt;
}

/**
 * Take a data packet and sets the data to show on the page
 *  
 * @function setData
 * @param {Packet} pkt Data packet
 */
let setData = (pkt) => {
  document.getElementById("Address").value = pkt.address;
  document.getElementById('Shipping').value = pkt.shipping;
  document.getElementById('Subtotal').value = pkt.total;
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

  //Validate the shipping and total
  var values = ["Subtotal", "Shipping"];
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
    document.getElementById("run-button").disabled = true;
    let done_msg = document.getElementById("done-msg");
    done_msg.innerHTML = err_msg;
    done_msg.classList = "text-danger";
    return false;
  } else { //No errors - remove any lock on the submit button
    document.getElementById("run-button").disabled = false;
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
  inpt.addEventListener("change", validateInputs);
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
 *  //Add an empty row to the table #items
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

window.onload = () => { //Add event listeners
  document.getElementById('run-button').addEventListener('click', connectHost);
  document.getElementById('save-button').addEventListener('click', setStorageData);
  document.getElementById('parse-button').addEventListener('click', () => chrome.extension.getBackgroundPage().chrome.tabs.executeScript(null, { file: './js/background.js' })); //Execute the background parsing script
	document.getElementById("items-row-btn").addEventListener("click", addRowItems);
	document.getElementById('Shipping').addEventListener("change", validateInputs);
	document.getElementById('Subtotal').addEventListener("change", validateInputs);
  document.getElementById('Address').addEventListener("change", validateInputs);
  readStorageData(); //Read the current data and display it
}

chrome.runtime.onMessage.addListener((msg) => { //Listen for messages and set the data accordingly
  if (msg.error != null) { //Error message from background script
    document.getElementById("more-info").innerHTML = "Manual entry mode - not a valid page to parse"; //Show the error message
  } else {
    setData({ //Set the data packet
      address: msg.address,
      shipping: msg.shipping,
      total: msg.total,
      items: msg.items,
    });
    validateInputs();
  }
});