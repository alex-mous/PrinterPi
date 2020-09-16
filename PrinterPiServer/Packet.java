/*
 *    Packet.java - Data structure to hold a single print job. Contains the address, subtotal, total, shipping, and a set of items
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

import java.util.Set;
import java.util.HashSet;
import java.util.Arrays;

public class Packet {
	public String[] to; //Address stored in separate lines
	public String[] from;
	public double subtotal;
	public double shipping;
	public double total;
	public Set<Item> items;
	public String[] messages;

	public Packet() {
		this.items = new HashSet<Item>();
	}

	public boolean isComplete() { //Check if the packet is complete
		return to != null && from != null && total != 0 && this.items.size() != 0 && this.messages != null;
	}

	public String toString() {
		return "From: " + Arrays.toString(this.from) +  "\nTo: " + Arrays.toString(this.to) + "\nSubtotal: " + this.subtotal + "\nShipping: " + this.shipping + "\nTotal: " + this.total + "\nItems: " + items;
	}
}
