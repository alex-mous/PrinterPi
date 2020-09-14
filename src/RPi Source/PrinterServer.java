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

			ObjectInputStream netin = new ObjectInputStream(client.getInputStream());
			Packet recv = (Packet) netin.readObject();
			netin.close();
			client.close();
			return recv;
		} catch (Exception e) {
			System.out.println("(PrinterServer.java) -ERROR- Error while receiving and/or processing data. " + e.toString());
		}
		return null;
	}
}
