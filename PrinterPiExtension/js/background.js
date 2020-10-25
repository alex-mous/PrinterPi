/*
 *    background.js - Background code for PrinterPi extension web page
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

 try { //Try eBay
	let address = document.querySelector("#shipToAddress").innerText;
	let shipping = document.querySelectorAll(".BuyerPurchaseDetails--1nhS6")[3].children[1].innerText;
	let total = document.querySelectorAll(".BuyerPurchaseDetails--1nhS6")[2].children[1].innerText;
	let items = document.querySelectorAll(".PurchasedItem---CkHb");
	let item_arr = [];
	for (let i=0; i<items.length; i++) { //Iterate through the items
		let itm = items[i].children[1];
		item_arr.push({
			desc: itm.children[0].innerText,
			sku: "I",
			qty: itm.children[1].innerText.slice(5),
			price: itm.children[2].innerText
		});
	}
	chrome.runtime.sendMessage({ //Send the first data
		to: address,
		shipping: shipping,
		subtotal: total,
		items: item_arr
	});
} catch (errA) {
	try { //Otherwise, try PayPal

		//Get the items
		let transaction = document.querySelector("#td_purchaseDetailsSeller").parentElement; //The main transaction purchase details
		let items_arr = [];
		let items = transaction.children;
		for (let i=1; i<items.length && !items[i].classList.contains("purchaseDetailFields"); i++) {
			try {
				let desc = items[i].children[0].children[0].children[0].innerText; //Description is first field
				let price = items[i].children[0].children[0].children[1].innerText; //Price is second field
				items_arr.push({
					desc: desc,
					sku: "I", //No SKU field currently
					qty: "1", //No QTY field currently
					price: price
				});
			} catch (err) {
				console.log("ERR: found an invalid coin entry, index: ", i);
			}
		}

		//Get the total and shipping (if any)
		let total = 0;
		let shipping = 0;
		let details = transaction.querySelector(".purchaseDetailFields").children; //Items section
		for (let i=0; i<details.length; i++) {
			try {
				let selector = details[i].children[0].children;
				if (selector[0].innerText.includes("Purchase total")) { //Order total
					total = parseFloat(selector[1].innerText.substring(selector[1].innerText.indexOf("$")+1));
					if (isNaN(total)) {
						console.log("ERR: couldn't parse number from total: ", total);
						total = 0;
					}
					console.log("INFO: found total: ", total);
				} else if (selector[0].innerText.includes("Shipping")) { //Order total
					shipping = parseFloat(selector[1].innerText.substring(selector[1].innerText.indexOf("$")+1));
					if (isNaN(shipping)) {
						console.log("ERR: couldn't parse number from shipping: ", shipping);
						shipping = 0;
					}
					console.log("INFO: found shipping: ", shipping);
				}
			} catch (err) {
				console.log("ERR: found an invalid data entry, index: ", i, "Error: ", err);
			}
		}
		total = total - shipping;

		//Get the address
		let addr_block = document.querySelector("#td_sellerWasShipped").parentElement;
		let addr = addr_block.children[1].innerText + "\n" + addr_block.children[2].children[1].innerText; //Combine the name and address

		chrome.runtime.sendMessage({
			to: addr,
			shipping: shipping,
			subtotal: total,
			items: items_arr
		});
	} catch (errB) {
		console.log("Error while trying to parse both eBay and PayPal pages. eBay:", errA, "PayPal:", errB);
		chrome.runtime.sendMessage({error: "Not a valid page to parse", errMsg: [errA, errB]});
	}
}
