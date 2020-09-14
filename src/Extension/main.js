var port = null;
var host_name = "com.polarpiberry.thermal.printer.system";

function connectHost() { //Connect to the local application and send the data
  port = chrome.runtime.connectNative(host_name);
	port.onDisconnect.addListener(
    function() {
      port = null;
    });
	port.onMessage.addListener(onMessage);
	updateUiState();
	sendData();
}

function sendData() { //Create the message and send it
  var msg = getData();
  if (port) {
	  port.postMessage(msg);
  }
}

function updateUiState() { //Change the message to indicate sending data if the port connected successfully
  if (port) {
	   document.getElementById('done-msg').innerHTML = "Sending data...";
  }
}

function onMessage(msg) { //Function to run on completion of sending data (status code returned)
	if (msg == "200") {
		document.getElementById("done-msg").innerHTML = "Successfully sent data to the printer.";
	} else {
		document.getElementById("done-msg").innerHTML = "Error while sending data to the printer! Please try again, make sure the printer is on and the server is up, or contact the developer. Code: " + msg;
	}
}

function getData() { //Read the data from the HTML page
  /* Returned object:
    {
  	  address: "XX",
  	  total: $II.II,
  	  shipping: $II.II,
  	  items: [{desc: "XX", price: $II.II, sku: I, qty: "XX"}, ...]
  	};
  */
  var _items = [];
  var _raw_items = document.getElementById("items").children;
  for (var i=0; i<_raw_items.length; i++) {
    _item = _raw_items[i].children;
    if (_item[0].children[0].value != "") { //Only run if element's description is not empty
      _items.push({desc: _item[0].children[0].value, price: _item[1].children[0].value, qty: _item[2].children[0].value, sku: _item[3].children[0].value});
    }
  }

  var msg = {
    address: document.getElementById("address").value.split("\n").join("/n/"),
    total: document.getElementById("total").value,
    shipping: document.getElementById("shipping").value,
    items: _items
  }
  return msg;
}

function addItem(msg) { //Takes the item <item> (JSON: desc, price, qty, sku) and adds it to the HTML table
	var ele = document.createElement("TR");
	ele.appendChild(getTDInput(msg.item));
  ele.appendChild(getTDInput(msg.item_price));
  ele.appendChild(getTDInput(msg.item_qty));
  ele.appendChild(getTDInput(msg.item_sku));
	document.getElementById('items').appendChild(ele);
}

function validateInputs() { //Checks all of the fields and provides error messages as required
  var err_msg = ""; //Hold the error to be returned to the user
  var num_regex = /^\$([0-9]|[1-9][0-9]+)\.[0-9]{2}$/; //Match currency

  //Validate the shipping and total
  var values = [document.getElementById("total").value, document.getElementById("shipping").value];
  for (var i=0; i<values.length; i++) {
    if (!values[i].match(num_regex)) {
      err_msg += "Shipping and total must be a currency value. ";
    }
  }

  //Validate the address
  if (document.getElementById("address").value.length < 5) { //Must be larger than 5 characters to make an address
    err_msg += "Please enter an address. ";
  }

  //Validate the items
  var _items = document.getElementById("items").children;
  var item_err = "";
  for (var i=0; i<_items.length; i++) {
    _item = _items[i].children;
    if (_item[0].children[0].value != "") { //Only run if element's description is not empty
      if (!_item[1].children[0].value.match(num_regex)) { //Price
        item_err += "Price in Items not formatted correctly. ";
      }
      if (isNaN(+(_item[2].children[0].value))) { //QTY - try to parse int
        item_err += "Quantity in Items must be an integer";
      }
      if (_item[3].children[0].value.length < 1) { //SKU - must be atleast a one character SKU
        item_err += "Please enter SKUs for all of the items. ";
      }
    }
    if (item_err) {
      break; //Break early so as to prevent many errors
    }
  }
  err_msg += item_err;

  if (err_msg) { //Display any errors and disable the submit button
    document.getElementById("run-button").setAttribute("disabled", true);
    document.getElementById("done-msg").innerHTML = err_msg;
  } else { //No errors - remove any lock on the submit button
    document.getElementById("run-button").removeAttribute("disabled");
    document.getElementById("done-msg").innerHTML = "Not connected - press Send Data above";
  }
}

function getTDInput(data) { //Helper method to return a TD element containing an INPUT element with the value <data> and the id for the callback in <callback_id>
  var c1 = document.createElement("TD");
  var inpt = document.createElement("INPUT");
	inpt.classList.add("input-field");
  inpt.setAttribute("value", data);
	inpt.type = "text";
  inpt.addEventListener("change", validateInputs);
	c1.appendChild(inpt);
	return c1;
}

function addRowItems() { //Add an empty row to the table "items"
	var ele = document.createElement("TR");
	console.log("Adding row to items...");
	for (var i=0; i<4; i++) {
		ele.appendChild(getTDInput(""));
	}
	document.getElementById("items").appendChild(ele);
}

document.addEventListener('DOMContentLoaded', function () { //Add event listeners
  document.getElementById('run-button').addEventListener('click', connectHost);
	document.getElementById("items-row-btn").addEventListener("click", addRowItems);
	document.getElementById('shipping').addEventListener("change", validateInputs);
	document.getElementById('total').addEventListener("change", validateInputs);
  document.getElementById('address').addEventListener("change", validateInputs);
  updateUiState();
});

window.addEventListener('load', function (evt) { //Execute the background script on page load
	chrome.extension.getBackgroundPage().chrome.tabs.executeScript(null, {
		file: 'background.js'
	});;
});

chrome.runtime.onMessage.addListener(function (message, type) { //Takes messages from the background script that parses pages for data
	if (message.address != null) {
		document.getElementById("address").value = message.address;
	}
	if (message.shipping != null) {
		document.getElementById('shipping').value = message.shipping;
	}
	if (message.total != null) {
		document.getElementById('total').value = message.total;
	}
	if (message.item != null) {
		addItem(message);
	}
	if (message.error != null) {
		document.getElementById("more-info").innerHTML = "Manual entry mode - not a valid page to parse"; //Show the error message
	}
});
