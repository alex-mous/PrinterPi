try { //Prevent errors with not being the correct tab
	var port = null;
	var address = null;
	var total = null;
	var shipping = null;
	var items = [];
	var host_name = "com.polarpiberry.thermal.printer.system";

	var getKeys = function(obj){
	   var keys = [];
	   for(var key in obj){
		  keys.push(key);
	   }
	   return keys;
	}

	function updateUiState() {
	  if (port) {
		document.getElementById('done-msg').innerHTML = "Sending data...";
	  }
	}

	function sendMSG(message) {
	  if (port) {
		  port.postMessage(message);
	  }
	}

	function onDisconnect() {
	  port = null;
	}

	function onError(msg) {
		document.getElementById("done-msg").innerHTML = "Page does not contain valid data. Error message: " + msg;
		document.getElementById("more-info").innerHTML = "Valid pages are: eBay Print your shipping label (gslbui.ebay.com) and PayPal: Activity (paypal.com/myaccount/transactions";
		document.getElementById("run-button").style.display = "none";
		document.getElementById("main-data").style.display = "none";
	}

	function onMessage(msg) {
		if (msg == "200") {
			document.getElementById("done-msg").innerHTML = "Successfully sent data to the printer.";
		} else {
			document.getElementById("done-msg").innerHTML = "Error while sending data to the printer! Please try again, make sure the printer is on and the server is up, or contact the developer. Code: " + msg;
		} 
	}

	function connectHost() {
	  port = chrome.runtime.connectNative(host_name);
	  port.onDisconnect.addListener(onDisconnect);
	  port.onMessage.addListener(onMessage);
	  updateUiState();
	  sendData();
	}

	function sendData() {
	  var msg = {
		  address: address, 
		  total: total,
		  shipping: shipping,
		  items: items
		};
	  sendMSG(msg);
	}

	function updateHTML() {
		document.getElementById('address').innerHTML = address;
		document.getElementById('shipping').innerHTML = shipping;
		document.getElementById('total').innerHTML = total;
		document.getElementById('items').innerHTML = "";
		for (var i=0; i<items.length; i++) {
			var ele = document.createElement("TR");
			var c1 = document.createElement("TD");
			c1.innerHTML = items[i].desc;
			ele.appendChild(c1);
			c1 = document.createElement("TD");
			c1.innerHTML = items[i].price;
			ele.appendChild(c1);
			c1 = document.createElement("TD");
			c1.innerHTML = items[i].qty;
			ele.appendChild(c1);
			c1 = document.createElement("TD");
			c1.innerHTML = items[i].sku;
			ele.appendChild(c1);
			document.getElementById('items').appendChild(ele);
		}
	}

	document.addEventListener('DOMContentLoaded', function () {
	  document.getElementById('run-button').addEventListener('click', connectHost);
	  updateUiState();
	});


	window.addEventListener('load', function (evt) {
		chrome.extension.getBackgroundPage().chrome.tabs.executeScript(null, {
			file: 'background.js'
		});;
	});

	chrome.runtime.onMessage.addListener(function (message, type) {
		if (message.address != null) {
			address = message.address.split("\n").join("/n/");
		}
		if (message.shipping != null) {
			shipping = message.shipping;
		}
		if (message.total != null) {
			total = message.total;
		}
		if (message.item != null) {
			items.push({desc: message.item, price: message.item_price, sku: message.item_sku, qty: message.item_qty});
		}
		if (message.error != null) {
			onError(message.error);
		}
		updateHTML();
	});
} catch (e) {
	console.log("Error: " + e);
}