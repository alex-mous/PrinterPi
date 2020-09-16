/*
 *    Printer.java - Class to control the printer at a low level and provide abstraction to print data Packets and not bother with the formatting
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

import java.io.*;

public class Printer {
	static FileOutputStream fp;

	public Printer() throws IOException {
		fp = new FileOutputStream("/dev/serial0");
	}

	private static void printLogo() throws IOException { //Print the logo
		//Read the logo into an array
		FileInputStream fin = new FileInputStream("Logo.bin");
		byte[] bs = new byte[fin.available()];
		fin.read(bs);
		fin.close();

		//Write the data
		for (int i=0; i<bs.length; i++) { //Write overflow
			fp.write(bs[i]);
		}
		cr();
		newline();
	}


	public static void justify(int set) { //Set the justification
		switch (set) {
			case 0:
				write(new byte[]{0x1b, 0x61, 0x00}); //Left justify
				break;
			case 1:
				write(new byte[]{0x1b, 0x61, 0x01}); //Centered
				break;
			case 2:
				write(new byte[]{0x1b, 0x61, 0x02}); //Right justify
				break;
			default:
				write(new byte[]{0x1b, 0x61, 0x01}); //Centered
		}
	}

	public static void reset() { //Reset the printer
		write(new byte[]{0x1b, 0x40});
	}

	public static void newline() { //New line
		write(new byte[]{0x0a});
	}

	public static void cr() { //Carrige return
		write(new byte[]{0x0d});
	}

	public static void style(int code) { //Set the style
		byte _code = (byte) code;
		write(new byte[]{0x1b, 0x21, _code});
	}

	public static void cut() { //Cut the paper
		newline(); newline(); newline(); newline(); //Feed some paper
		write(new byte[]{0x1b, 0x69});
	}


	public static void print(Packet packet) throws IOException { //String address, String subtotal, String shipping, String total, String[] items) {
		printLogo();
		justify(1);
		style(0x38); //Double height, double width, bold
		write("Packing List");
		cr();newline();
		justify(0);
		style(0x88); //bold, underlined
		write("From:");
		cr();
		style(0x00);
		for (String line: packet.from) {
			write("    ");
			printSplitString(line, 4);
			cr();
		}
		style(0x88);
		write("To:");
		cr();
		style(0x00);
		justify(0);
		for (String line: packet.to) {
			write("    ");
			printSplitString(line, 4);
			cr();
		}
		newline();

		style(0x88); //Bold, underlined
		justify(1);
		//Linespacing? 0x1b 0x32
		write("Items");
		cr(); newline();
		//Linespacing? 0x1b 0x30
		justify(0);
		write("SKU   Unit Price    QTY    Price");
		cr();newline();
		style(0x00); //Clear
		int c = 1;
		for (Item item: packet.items) {
			write(c + ".  ");
			printSplitString(item.desc, 4); //Use helper function to make sure item description fits well
			cr();
			write(padItemSpecs(item.sku, (item.price/item.qty), item.qty, item.price));
			cr(); newline();
			c++;
		}
		cr();newline();
		style(0x88); //Bold, underline
		write("Subtotal:");
		style(0x00); //Clear
		cr();
		write("    $" + String.format("%.2f",packet.subtotal));
		cr();
		style(0x88); //Bold, underline
		write("Shipping:");
		style(0x00); //Clear
		cr();
		write("    $" + String.format("%.2f",packet.shipping));
		cr();
		style(0x88); //Bold, underline
		write("Total:");
		style(0x00); //Clear
		cr();
		write("    $" + String.format("%.2f",packet.total));
		cr();newline();
		for (String line: packet.messages) {
			write(line);
			cr();newline();
		}
		cut();
	}

	private static void write(byte[] data) { //Byte write function
		try {
			fp.write(data);
			Thread.sleep(30); //Delay so as to not overfill print buffer
		} catch (Exception e) {
		}
	}

	private static void write(String data) { //String write function
		try {
			for (int i=0; i<data.length(); i++) { //Iterate over String
				fp.write(data.charAt(i));
			}
			Thread.sleep(10);
		} catch (Exception e) {
		}

	}


	private static void printSplitString(String desc, int start) { //Split the string desc into 32-character or less (minus start for first line) substrings and place return character in between (start is removed from count on first line to account for tabs, etc.) and print the result
		while (desc.length() > 32-start) { //Continue until nothing left to add
			int end = desc.substring(0, 32-start).lastIndexOf(" ") + 1; //Get the last index
			write(desc.substring(0, end)); //Write out the part
			cr();
			desc = desc.substring(end); //Crop of the added part
			start = 0; //Set start to 0 after first loop
		}
		write(desc); //Write the remainder
		cr();
	}

	private static String padItemSpecs(String sku, double unit, int qty, double price) { //Return the padded out (using spaces) specs
		String output = String.format("%-8s",sku);
		output += "$" + String.format("%-11.2f",unit);
		output += String.format("%-5d",qty);
		output += "$" + String.format("%.2f",price); //No need to pad since last item
		return output;
	}
}
