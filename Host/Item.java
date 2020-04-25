/*
 *    Item.java - Data structure to hold one item - its price, description, quantity, and SKU
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

import java.io.Serializable;

public class Item implements Serializable {
	String desc, sku;
	double price;
	int qty;

	public Item(String desc, String sku, int qty, double price) {
		this.desc = desc;
		this.sku = sku;
		this.qty = qty;
		this.price = price;
	}

	public String toString() {
		return "Description: " + this.desc + " SKU: " + this.sku + " QTY: " + this.qty + " Price: " + this.price;
	}
}
