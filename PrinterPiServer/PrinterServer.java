/*
 *    PrinterServer.java - Manages the network port 9321, listening for incoming connections, and returns the data sent.
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
import java.net.*;
import java.util.*;
import java.lang.Integer;
import java.lang.Character;
import java.lang.Double;

public class PrinterServer {
	private ServerSocket serv;

	public PrinterServer() throws IOException { //Constructor
		serv = new ServerSocket(9321); //Create the server
	}

	public void close() throws IOException { //Destructor
		serv.close();
	}

	public Packet getPacket() { //Waits until client connects and return a Packet object of the data (or null if failed)
		try { //Overall try-catch to prevent exceptions in client - writes to log file instead
			Socket client = serv.accept(); //Wait until there is a connection
			client.setSoTimeout(1000); //Set the timeout to 1000ms
			System.out.println("(PrinterServer) -INFO- Connection received");

			BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
			PrintWriter out = new PrintWriter(client.getOutputStream());

			String response; //Response to request

			String method = in.readLine();
			int dataLen = 0;
			if (method.startsWith("POST")) { //Only accept POST requests
				String header;
				while ((header = in.readLine()) != null && header.length() > 0) { //Read newlines until the end of input or until there is no data
					String headerName = header.substring(0, header.indexOf(":")).toLowerCase();
					String headerContent = header.substring(header.indexOf(":")+2).toLowerCase();
					switch (headerName) {
						case "content-length":
							dataLen = Integer.parseInt(headerContent);
							System.out.println("(PrinterServer) -INFO- Data length to read: " + dataLen);
							break;
						default:
							System.out.println("(PrinterServer) -INFO- Unused header: " + header);
					}
				}
			} else {
				response = "HTTP/1.0 400 Bad Request\r\nContent-Type: application/json\r\n\r\n{\"success\":false,\"error\":\"Method type must be POST\"}\r\n";
				out.print(response);
				out.flush();
				client.close();
				return null;
			}



			/*
				Data format (NOTE: item descs and skus MUST NOT CONTAIN ~ or ` and NO EXTRA SPACES ARE ALLOWED. ` signifies end of transmission):

				To: Line1/n/Line2/n/Line3
				From: Line1/n/Line2/n/Line3
				Subtotal: $5.00
				Shipping: $3.00
				SaveFile: 1
				Item: Item_1~I123~1~$1.00
				Item: Item 2, And 3~I32-+A5~44~$1.00
				Message: Contact me at eikyutsuho@gmail.com if you have any questions/concerns/n/Thank you for your business!
				`
			*/

			//Parse the data Packet
			Packet pkt = new Packet();
			try {
				int i = 0;
				String body = ""; //Body of request
				char curr;
				while ((i++) < dataLen && (curr = (char)in.read()) != '`') {
					body = body + Character.toString(curr);
				}
				String[] params = body.split("\n");
				for (i=0; i<params.length; i++) {
					String key = params[i].substring(0, params[i].indexOf(":")).toLowerCase();
					String value = params[i].substring(params[i].indexOf(":")+2);
					switch (key) {
						case "to":
							pkt.to = value.split("/n/");
							break;
						case "from":
							pkt.from = value.split("/n/");
							break;
						case "subtotal":
							pkt.subtotal = Double.parseDouble(value.substring(1));
							break;
						case "shipping":
							pkt.shipping = Double.parseDouble(value.substring(1));
							break;
						case "item":
							String desc = value.substring(0, value.indexOf("~"));
							value = value.substring(value.indexOf("~")+1);
							String sku = value.substring(0, value.indexOf("~"));
							value = value.substring(value.indexOf("~")+1);
							int qty = Integer.parseInt(value.substring(0, value.indexOf("~")));
							value = value.substring(value.indexOf("~")+1);
							double price = Double.parseDouble(value.substring(1, value.length()));
							Item itm = new Item(desc, sku, qty, price);
							pkt.items.add(itm);
							break;
						case "message":
							pkt.messages = value.split("~");
							break;
						default:
							System.out.println("Unrecognized parameter: " + key);
					}
					pkt.total = pkt.shipping + pkt.subtotal;
				}
				if (pkt.isComplete()) {
					response = "HTTP/1.0 200 OK\r\nContent-Type: application/json\r\n\r\n{\"success\":true}\r\n";
				} else {
					response = "HTTP/1.0 400 Bad Request\r\nContent-Type: application/json\r\n\r\n{\"success\":false,\"error\":\"Incomplete request\"}\r\n";
					System.out.println("(PrinterServer.java) -ERROR- Error while receiving and/or processing data. Incomplete request");
					pkt = null;
				}
			} catch (Exception e) {
				response = "HTTP/1.0 400 Bad Request\r\nContent-Type: application/json\r\n\r\n{\"success\":false,\"error\":'" + e.toString() + "'}\r\n";
				System.out.println("(PrinterServer.java) -ERROR- Error while receiving and/or processing data. " + e.toString());
				pkt = null;
			}

			out.print(response);
			out.flush();
			client.close();
			return pkt;
		} catch (Exception e) {
			System.out.println("(PrinterServer.java) -ERROR- Error while receiving and/or processing data. External loop error: " + e.toString());
		}
		return null;
	}
}
