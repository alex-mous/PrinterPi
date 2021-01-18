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
{
	/**
	 * Parse and return an order from eBay regular print a shipping label page
	 */
	const parseEbayRegular = () => {
		let address = document.querySelector("#shipToAddress").innerText;
		let shipping = document.querySelectorAll("._1nhS6BoY")[3].children[1].innerText;
		shipping = parseFloat(shipping.substring(shipping.indexOf("$")+1)); //Shipping as a float
		let grandTotal = document.querySelectorAll("._1nhS6BoY")[2].children[1].innerText; //Shipping+items+tax
		grandTotal = parseFloat(grandTotal.substring(grandTotal.indexOf("$")+1));
		let itemTotal = 0; //Total cost of items
		let items = document.querySelectorAll(".-CkHbnvR");
		let item_arr = [];
		for (let i=0; i<items.length; i++) { //Iterate through the items
			let itm = items[i].children[1];
			let price = itm.children[3].innerText;
			price = parseFloat(price.substring(price.indexOf("$")+1));
			itemTotal += price;
			item_arr.push({
				desc: itm.children[0].innerText,
				sku: itm.children[1].innerText.slice(5),
				qty: itm.children[2].innerText.slice(5),
				price: price
			});
		}
		return {
			to: address,
			shipping: shipping,
			subtotal: itemTotal,
			tax: Math.round((grandTotal-(shipping+itemTotal) + Number.EPSILON) * 100) / 100, //Ensure tax is valid (to ensure not 1e-14 or similar)
			items: item_arr
		}
	}

	/**
	 * Parse and return a list of orders from eBay bulk print shipping labels page
	 */
	const parseEbayBulk = () => {
		let orders = [];
		document.querySelectorAll(".orders-list__item__details").forEach((order) => {
			let address = order.querySelector("address").innerText;
			let items = [];
			order.querySelectorAll(".item__description").forEach(item => {
				items.push({
					desc: item.children[0].innerText,
					sku: item.querySelector(".item__details").children[0].innerText.slice(5),
					qty: item.querySelector(".item__details").children[1].innerText.slice(5),
					price: parseFloat(item.querySelector(".item__details").children[2].innerText.slice(11))
				});
			});
			let shipping = order.querySelector(".buyer-paid-service").children[0].innerText.slice(1);
			
			let itemTotal = items.length > 1 ? items.reduce((a, b) => (a .price|| a) + (b.price || b)) : items[0].price;
			
			orders.push({
				to: address,
				shipping: shipping,
				subtotal: itemTotal,
				tax: 0, //No tax field available
				items: items
			})
		});
		if (orders.length == 0) {
			throw new Error("No orders found");
		}
		return orders;
	}

	/**
	 * Parse and return a list of orders from the PayPal Activity page
	 */
	const parsePayPalRegular = () => {
		let orders  = document.querySelectorAll(".highlightTransactionDetailsPanel > .highlightTransactionPanel") //Get all open orders
		let ordersRes = []; //Store resulting order objects
		orders.forEach((order) => {
			let items = order.querySelectorAll("#td_purchaseDetailsSeller + * > *"); //Select all items
			let itemsArr = [];
			items.forEach((item) => {
				let itemRow = item.querySelectorAll("span");
				let desc, priceNode, qty;
				if (itemRow.length == 2) { //Single item
					desc = itemRow[0].innerText;
					qty = "1";
					priceNode = itemRow[1];
				} else if (itemRow.length == 3) { //Multiple items
					let tmpNode = itemRow[0].firstChild;
					while (tmpNode.nodeType != document.TEXT_NODE) {
						tmpNode = tmpNode.nextSibling;
					}
					desc = tmpNode.data;
					qty = parseInt(itemRow[1].innerText.match(/\d+/)?.[0]);
					priceNode = itemRow[2];
				}
				let itm = {
					desc: desc,
					sku: "I", //No SKU field currently
					qty: qty, //No QTY field currently
					price: parseFloat(priceNode.innerText.replace("$", ""))
				};
				console.log("[PrinterPi] Found Item: ", itm);
				itemsArr.push(itm);
			});

			let tax = 0; //No tax currently

			//Get the total and shipping (if any)
			let subtotal = 0;
			let shipping = 0;
			let details = order.querySelector(".purchaseDetailFields").children; //Items section
			for (let i=0; i<details.length; i++) {
				try {
					let selector = details[i].children[0].children;
					if (selector[0].innerText.includes("Purchase total")) { //Order total
						subtotal = parseFloat(selector[1].innerText.substring(selector[1].innerText.indexOf("$")+1));
						if (isNaN(subtotal)) {
							console.log("ERR: couldn't parse number from total: ", subtotal);
							subtotal = 0;
						}
						console.log("INFO: found total: ", subtotal);
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
			subtotal -= shipping;

			//Get the address
			let addr = order.querySelector("#td_sellerWasShipped + *, #td_sellerShipAddress + *").innerText + "\n" + order.querySelector("#td_sellerWasShipped + * + * > div, #td_sellerShipAddress + * + * > div").innerText; //Combine the name and address

			ordersRes.push({
				to: addr,
				shipping: shipping,
				tax: tax,
				subtotal: subtotal,
				items: itemsArr
			});
		});
		return ordersRes;
	}
	console.log("[PrinterPi] Parsing data...");
	try { //Try eBay Regular
		let data = parseEbayRegular();
		console.log("Data:", data);
		chrome.runtime.sendMessage({
			orders: [data]
		});
	} catch (errA) {
		try { //Otherwise, try eBay Bulk
			let orders = parseEbayBulk();
			console.log("Data:", orders);
			chrome.runtime.sendMessage({
				orders: orders
			});
		} catch (errB) { //Finally, try PayPal
			try {
				let orders = parsePayPalRegular();
				console.log("Data:", orders);
				chrome.runtime.sendMessage({
					orders: orders
				});
			} catch (errC) {
				console.log("[PrinterPi] Error while trying to parse both all pages. eBay Regular:", errA, "eBay Bulk:", errB, "PayPal Regular:", errC);
				chrome.runtime.sendMessage({error: "Not a valid page to parse", errMsg: [errA, errB, errC]});
			}
		}
	}
}