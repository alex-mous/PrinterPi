/*
 *    ThermalPrinterClient.java - Main program to receive data from the Chrome
 *    extension and transmit it to a remote Raspberry Pi. Data is parsed as JSON,
 *    added to a Packet object, and sent via object serialization. The remote
 *    host is denoted by IP_ADDRESS.txt.
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

/*
 * Data must sent to this program (through stdin) in a certain JSON format
 * as below. Additionally, this program waits for four size bytes before
 * reading in the data.
 *
 * {
 *  address: "ADDRESS FULL",
 *  total: "TOTAL COST",
 *  shipping: "SHIPPING COST",
 *  items: [[desc: "DESCRITPION", price: "PRICE", sku: "I-NO", qty: "QUANTITY"]]
 * }
*/

import java.io.*;
import java.util.*;
import java.net.*;
import java.text.SimpleDateFormat;

public class ThermalPrinterClient {
	public static void main(String[] args) throws IOException, FileNotFoundException {
		try {
			//Read the data
			DataInputStream stdin = new DataInputStream(System.in);
			String raw = ""; //Buffer for the input data
			boolean reading = true;
			while (reading) { //Run until end of data
				char inpt = (char)stdin.read(); //Get a character
				if (inpt != 0) { //Check that it is valid
					int len = (char)inpt & (char)stdin.read() << 8 & (char)stdin.read() << 16 & (char)stdin.read() << 24; //Read the length of the data to be read (not used in calculations)
					char pinpt = '0'; //Previous input
					while (reading) { //Loop until all data read
						inpt = (char)stdin.read();
						reading = (pinpt != ']' || inpt != '}');
						raw += ""+inpt;
						pinpt = inpt;
					}
				}
			}

			//Parse the JSON
			Packet packet = parseData(raw);



			//Generate a copy of the data
			writeFileCopy(packet);

			//Get the IP address of the Raspberry Pi server
			BufferedReader ip = new BufferedReader(new FileReader(new File("IP_ADDRESS.txt"))); //Read the IP address from the file
			String ip_addr = ip.readLine();
			ip.close();

			//Send the data
			sendDataPacket(ip_addr, packet);
	} catch (Exception e) {
			try {
				FileWriter outf = new FileWriter("error.txt");
				outf.write(e.toString());
				outf.close();
			} catch (Exception err) {}

			if (e instanceof ConnectException || e instanceof SocketTimeoutException) {
				System.out.print("\u0003\u0000\u0000\u0000404"); //HTTP Error code (404 Not Found)
			} else if (e instanceof IOException) {
				System.out.print("\u0003\u0000\u0000\u0000400"); //HTTP Error code (400 Bad Request)
			} else {
				System.out.print("\u0003\u0000\u0000\u0000408"); //HTTP Error code (408 Request Timeout)
			}
		}
	}

	public static void sendDataPacket(String ip_address, Packet pkt) throws IOException, SocketTimeoutException {
		InetSocketAddress addr = new InetSocketAddress(ip_address,9321); //Custom port 9321
		//Open a socket connection to the printer
		Socket conn = new Socket();
		conn.connect(addr,1000); //Custom port 9321 - timeout of 1000ms
		ObjectOutputStream output = new ObjectOutputStream(conn.getOutputStream());
		output.writeObject(pkt);
		System.out.print("\u0003\u0000\u0000\u0000200"); //HTTP Success code (200 OK)
		output.close();
		conn.close();
	}

	public static void writeFileCopy(Packet pkt) throws IOException { //Write a copy of pkt to a file with the name of the SKUs of the items or the date if there are none
		String fname = "";
		for (Item i : pkt.items) {
			if (i.sku.length() > 1) { //More that just "I"
				fname += i.sku + ",";
			}
		}

		if (fname.length() > 0) { //If there is data, trim the trailing comma
			fname = fname.substring(0,fname.length()-1);
		} else {
			SimpleDateFormat date = new SimpleDateFormat("-yyyy-MM-dd_HH-mm-ss");
			fname = "I" + date.format(new Date());
		}
		fname += ".json";

		FileWriter outf = new FileWriter(fname);
		outf.write(pkt.toString());
		outf.close();
	}

	public static Packet parseData(String raw) { //Parse the raw data into JSON and return as a Packet
		//Get the JSON from the connection and store it in Maps and Sets
		Map<String,String> json = new TreeMap<>();
		Scanner jparse = new Scanner(raw);
		jparse.useDelimiter("(\\{\"|\"\\}|\",\"|\":\")"); //Delimeter to be used for the first three lines
		//Read the first three lines and add to the map
		for (int i=0; i<3; i++) { //Basic data - address, etc.
			String key = jparse.next();
			String value = jparse.next();
			cleanKey(key);
			json.put(key, value);
		}

		//Now parse the item data
		jparse.useDelimiter("(\":\\[\\{\"|\"\\}\\]\\}|\",\"|\":\"|\"\\},\\{\"|\"\\}|\\{\")"); //Delimeter to be used for the first three lines
		Set<Map<String,String>> items = new LinkedHashSet<>(); //Set of Maps to store the items
		String label = jparse.next(); //Label
		while (jparse.hasNext()) { //Loop until all items found
			Map<String, String> item = new TreeMap<>();
			for (int i=0; i<4; i++) { //Add the key/value pairs to the Map
				String key = jparse.next();
				String value = jparse.next();
				cleanKey(key); //Remove extraneous characters
				item.put(key, value);
			}
			items.add(item);
		}

		//Parse float values of price, shipping, etc.
		double shipping = java.lang.Double.parseDouble(json.get("shipping").substring(1));
		double subtotal = java.lang.Double.parseDouble(json.get("total").substring(1));
		double total = subtotal + shipping;

		String[] addr = json.get("address").split("/n/"); //Get the address in lines

		Packet output = new Packet(addr,subtotal,shipping,total); //Create a data packet

		for (Map<String, String> item : items) { //Add the items to the data packet
			int qty = java.lang.Integer.parseInt(item.get("qty"));
			double price = java.lang.Double.parseDouble(item.get("price").substring(1));
			Item temp = new Item(item.get("desc"), item.get("sku"), qty, price);
			output.items.add(temp);
		}

		return output;
	}

	public static void cleanKey(String key) { //Remove extraneous characters from the key (passed by reference - nothing to return)
		key = key.replace("\"","");
		key = key.replace("\'","");
		key = key.replace("{","");
		key = key.replace("}","");
		key = key.replace("[","");
		key = key.replace("]","");
	}
}
