/*
 *    Main.java - Main Java program; runs and controls all classes to create fully working printer system
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

import java.util.*;
import java.io.*;

public class Main {
	static Queue<Packet> print_queue;
	static Printer printer;
	static Hardware hardware;
	static Pin led;

	public static void main(String[] args) throws IOException {
		PrinterServer server = new PrinterServer(); //Create the server
		printer = new Printer(); //Create the printer
		hardware = new Hardware();
		led = new Pin(4, 1); //BCM 4, output
		boolean stat = hardware.setup(led);
		System.out.println(stat);

		hardware.readyLEDFlash(led);

		System.out.println("-INFO- Server started. Waiting for print jobs...");
		print_queue = new LinkedList<Packet>();

		Thread mng = new Thread() {
			public void run() {
				try {
					while (true) {
						queueManager();
					}
				} catch (InterruptedException e) {
				}
			}
		}; //Start the print queue manager thread
		mng.start();

		while (true) { //Main loop - adds print jobs to queue
			Packet res = server.getPacket();
			if (res != null) {
				System.out.println("-INFO- New print job - adding to queue. Current queue size: " + (print_queue.size() + 1));
				print_queue.add(res); //Add job to print queue - automatically popped by queueManager() thread
			} else {
				System.out.println("-ERROR- Error recieving data from server. Please check the log file.");
				hardware.errorLEDFlash(led);
			}
		}
	}

	public static void queueManager() throws InterruptedException { //Queue manager; releases one print job - designed to be run in infinite loop by a separate thread
		if (print_queue.size() > 0) { //Run if more than one print job to be released
			hardware.printingLEDFlash(led);
			Packet job = print_queue.remove();
			try {
				System.out.println("-INFO- Releasing print job...");
				printer.print(job);
				Thread.sleep(1000); //Delay in between print jobs
			} catch (IOException e) {
				System.out.println("-ERROR- Error in releasing print job.");
			}
			System.out.println("-INFO- Print job complete. Current print queue size: " + (print_queue.size() + 1));
		}
		Thread.sleep(100); //Only need to check every second
	}
}
