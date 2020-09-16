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
 * @property {string} from Address of the seller
 * @property {string} to Address of the buyer
 * @property {string} shipping Shipping paid by buyer
 * @property {string} subtotal Subtotal paid by buyer (not including shipping)
 * @property {Array<Item>} items Items purchased
 * @property {Array<Item>} messages Messages to print out at bottom of receipt
 */

 /**
 * Item object
 * @typedef {Object} Item
 * @property {string} desc Title of item
 * @property {string} price Price paid (total)
 * @property {string} sku Custom SKU
 * @property {string} qty Quantity purchased
 */

/*
  Data format to send to PrinterPi (NOTE: item descs and skus MUST NOT CONTAIN ~ and NO EXTRA SPACES ARE ALLOWED):

  To: Line1/n/Line2/n/Line3
  From: Line1/n/Line2/n/Line3
  Subtotal: $5.00
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
 * Get the settings from memory
 * 
 * @function getSettings
 * @returns {Promise} Settings as a Promise
 */
let getSettings = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["settings"], (data) => {
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
    Subtotal: $5.00
    Shipping: $3.00
    Item: Item_1~I123~1~$1.00
    Item: Item 2, And 3~I32-+A5~44~$1.00
    Message: Contact me at eikyutsuho@gmail.com if you have any questions/concerns/n/Thank you for your business!
    `
  */
  if (pkt.to != undefined && pkt.from != undefined && pkt.subtotal != undefined && pkt.shipping != undefined && pkt.messages != undefined && pkt.items != undefined) {
    let msg = "";
    msg += "To: " + pkt.to.split("\n").join("/n/") + "\r\n";
    msg += "From: " + pkt.from.split("\n").join("/n/") + "\r\n";
    msg += "Subtotal: " + pkt.subtotal + "\r\n";
    msg += "Shipping: " + pkt.shipping + "\r\n";
    pkt.items.forEach((item) => msg += "Item: " + item.desc.replace("~", " ") + "~" + item.sku.replace("~", " ") + "~" + item.qty + "~" + item.price + "\r\n");
    msg += "Message: " + pkt.messages.split("\n").join("~") + "\r\n";
    msg += "`";
    return msg;
  } else {
    return null;
  }
}

/**
 * Create the message from the data on the page and send it
 * 
 * @function sendData
 */
let sendData = () => {
  let pkt = getData();
  let done_msg = document.getElementById("done-msg");
  done_msg.innerHTML = "Sending data...";
  done_msg.classList = "text-warning";
  getSettings().then((settings) => {
    pkt = {...pkt, ...settings};
    let msg = convertToMessage(pkt);
    if (msg) {
      fetch("http://" + settings.ipAddress, {
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
          if (settings.saveFiles == "Y") {
            downloadFile(pkt, settings.saveFilesLocation);
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
      done_msg.innerHTML = "Please configure the printer settings in the Setting page below";
      done_msg.classList = "text-danger";
    }
  });
}


/**
 * Download the data Packet onto the user's OS
 * 
 * @param {Packet} pkt
 */
let downloadFile = (pkt, filepath) => {
  let blob = new Blob([JSON.stringify(pkt)], {type: "application/json"});
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
    to: document.getElementById("Address").value,
    subtotal: document.getElementById("Subtotal").value,
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
  document.getElementById("Address").value = pkt.to;
  document.getElementById('Shipping').value = pkt.shipping;
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

let showOptions = () => {
  chrome.tabs.create({'url': "/options.html" } );
}


window.onload = () => { //Add event listeners
  document.getElementById('run-button').addEventListener('click', sendData);
  document.getElementById('save-button').addEventListener('click', setStorageData);
  document.getElementById('parse-button').addEventListener('click', () => chrome.extension.getBackgroundPage().chrome.tabs.executeScript(null, { file: './js/background.js' })); //Execute the background parsing script
  document.getElementById("items-row-btn").addEventListener("click", addRowItems);
  document.getElementById("options-btn").addEventListener("click", showOptions);
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
      to: msg.to,
      shipping: msg.shipping,
      subtotal: msg.subtotal,
      items: msg.items,
    });
    validateInputs();
  }
});