try { //Try eBay
	var address = document.getElementById("order.orderDetails.shipToAddress").innerText;
	var shipping = document.getElementsByClassName("buyer_info__secondary")[2].innerText;
	var total = document.getElementsByClassName("buyer_info__secondary")[3].innerText;
	chrome.runtime.sendMessage({address:address, shipping:shipping, total:total}); //Send the first data
	var items = document.getElementsByClassName("item");
	for (var i=0; i<items.length; i++) { //Iterate through the items
		var sku = "I";
		try {
			sku = items[i].getElementsByClassName("item__sku")[0].innerText;
		} catch (TypeError) {} //Try/catch in case there is no SKU
		sku = sku.slice(5);
		qty = items[i].getElementsByClassName("item__quantity")[0].innerText;
		qty = qty.slice(5);
		desc = items[i].getElementsByTagName("a")[0].innerText;
		price = items[i].getElementsByClassName("item__value")[0].innerText;
		chrome.runtime.sendMessage({item: desc, item_sku: sku, item_qty: qty, item_price: price}); //Send an item
	}
} catch (TypeError) {
	try { //Otherwise, try PayPal
		var transaction = document.getElementsByClassName("ppvx_row")[0]; //The main transaction (zero to only get the first transaction in list)
		var trans_sub = transaction.getElementsByClassName("tdPurchaseDetails"); //Sub section containing items and purchase amount

		var total_ele = trans_sub[0].getElementsByTagName("dd")[1];
		var total = total_ele.innerText.includes("Purchase") ? total_ele.getElementsByClassName("ppvx_col-4")[0].innerText : "$0.00";

		var total = "$0.00"; //Defaults
		var shipping = "$0.00";

		var data = trans_sub[0].getElementsByTagName("dd"); //Get the elements containing the purchase amounts
		for (var i=0; i<data.length; i++) { //Iterate over all values, searching for shipping and total
			if (data[i].innerText.includes("Shipping")) {
				shipping = data[i].getElementsByClassName("ppvx_col-4")[0].innerText;
			} else if (data[i].innerText.includes("Purchase")) {
				total = data[i].getElementsByClassName("ppvx_col-4")[0].innerText;
			}
		}

		var addr_block = transaction.getElementsByTagName("dl")[1].getElementsByTagName("dd");
		var addr = addr_block[0].innerText + "\n" + addr_block[1].innerText; //Combine the name and address

		chrome.runtime.sendMessage({address: addr, shipping: shipping, total: total}); //Send the first data

		var items = trans_sub[0].getElementsByTagName("dd")[0].getElementsByClassName("item"); //Items section
		for (var i=0; i<items.length; i++) {
			var sku = "I"; //No SKU field
			var qty = "1"; //No QTY field
			var desc = items[i].getElementsByClassName("ppvx_text--sm")[0].innerText; //Description is first field
			var price = items[i].getElementsByClassName("ppvx_text--sm")[1].innerText; //Price is second field
			chrome.runtime.sendMessage({item: desc, item_sku: sku, item_qty: qty, item_price: price});
		}
	} catch (TypeError) {
		chrome.runtime.sendMessage({error:"Not a valid page to parse"});
	}
}