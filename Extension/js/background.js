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
			qty: itm.children[1].children[0].innerText.slice(5),
			price: itm.children[1].children[1].innerText
		});
	}
	chrome.runtime.sendMessage({ //Send the first data
		address: address,
		shipping: shipping,
		total: total,
		items: item_arr
	});
} catch (TypeError) {
	try { //Otherwise, try PayPal
		var transaction = document.querySelectorAll(".ppvx_row")[0]; //The main transaction (zero to only get the first transaction in list)
		var trans_sub = transaction.querySelectorAll(".tdPurchaseDetails"); //Sub section containing items and purchase amount

		var total_ele = trans_sub[0].getElementsByTagName("dd")[1];
		var total = total_ele.innerText.includes("Purchase") ? total_ele.querySelectorAll(".ppvx_col-4")[0].innerText : "$0.00";

		var total = "$0.00"; //Defaults
		var shipping = "$0.00";

		var data = trans_sub[0].getElementsByTagName("dd"); //Get the elements containing the purchase amounts
		for (var i=0; i<data.length; i++) { //Iterate over all values, searching for shipping and total
			if (data[i].innerText.includes("Shipping")) {
				shipping = data[i].querySelectorAll(".ppvx_col-4")[0].innerText;
			} else if (data[i].innerText.includes("Purchase")) {
				total = data[i].querySelectorAll("ppvx_col-4")[0].innerText;
			}
		}

		var addr_block = transaction.getElementsByTagName("dl")[1].getElementsByTagName("dd");
		var addr = addr_block[0].innerText + "\n" + addr_block[1].innerText; //Combine the name and address

		chrome.runtime.sendMessage({ //Send the first data
			address: addr,
			shipping: shipping,
			total: total
		});

		var items = trans_sub[0].getElementsByTagName("dd")[0].querySelectorAll(".item"); //Items section
		for (var i=0; i<items.length; i++) {
			var sku = "I"; //No SKU field
			var qty = "1"; //No QTY field
			var desc = items[i].querySelectorAll(".ppvx_text--sm")[0].innerText; //Description is first field
			var price = items[i].querySelectorAll(".ppvx_text--sm")[1].innerText; //Price is second field
			chrome.runtime.sendMessage({
				item: {
					desc: desc,
					sku: sku,
					qty: qty,
					price: price
				}
			});
		}
	} catch (TypeError) {
		chrome.runtime.sendMessage({error: "Not a valid page to parse"});
	}
}
