/*
 *   Hardware.java - Provides a way to control the GPIO pins through the sysfs interface
 *
 *   Copyright (C) 2020  PolarPiBerry
 *
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/


import java.io.FileWriter;
import java.io.FileReader;
import java.io.File;
import java.io.IOException;
import java.util.LinkedList;


public class Hardware {
	LinkedList<Pin> pins;

	public Hardware() {
		pins = new LinkedList<>();
	}

	public boolean setup(Pin p) { //Setup the BCM pin <pin> for reading/writing (<direction> is 0 for reading, 1 for writing))
		try {
			FileWriter gpio; //Used to point to sysfs GPIO files
			File temp = new File("/sys/class/gpio/gpio" + p.getNumber());
			if (!temp.exists()) { //Only export if the pin doesn't exist
				gpio = new FileWriter(new File("/sys/class/gpio/export"));
				gpio.write("" + p.getNumber());
				gpio.close();
			}
			gpio = new FileWriter(new File("/sys/class/gpio/gpio" + p.getNumber() + "/direction"));
			if (p.getDirection() == 0) { //Set input pin
				gpio.write("in");
			} else if (p.getDirection() == 1) { //Set output pin
				gpio.write("out");
			} else {
				throw new IllegalArgumentException("Direction must be either 0 or 1 for input or output, respectively");
			}
			gpio.close();
			pins.add(p); //Add for error checking when writing
			return true;
		} catch (IOException e) {
			e.printStackTrace();
			return false;
		}
	}

	public void close() { //General destructor method - closes all open GPIO pins
		try {
			for (Pin pin : pins) {
				FileWriter gpio = new FileWriter(new File("/sys/class/gpio/unexport"));
				gpio.write(pin.getNumber());
				gpio.close();
			}
		} catch (IOException e) {} //Nothing to do
	}

	private void _LEDFlash(Pin led, int loops, int duration) { //Helper method - to be run with a separate thread
		Thread thr = new Thread() {
			public void run() {
				try {
					for (int i=0; i<loops; i++) {
						write(led, 1);
						Thread.sleep(duration);
						write(led, 0);
						Thread.sleep(duration);
				}
				} catch (Exception e) {}
			}
		};
		thr.start();
	}


	public void readyLEDFlash(Pin led) { //Flash the LED to indicate status
		_LEDFlash(led, 10, 250);
	}

	public void errorLEDFlash(Pin led) {
		_LEDFlash(led, 75, 50);
	}

	public void printingLEDFlash(Pin led) {
		_LEDFlash(led, 25, 100);
	}

	public boolean write(Pin pin, int level) { //Write the pin <pin> value level (must be either 0 or 1)
		if (pins.contains(pin)) { //Uses Pin equals method to test that the pin exists and is in the correct direction
			try {
				FileWriter gpio = new FileWriter(new File("/sys/class/gpio/gpio" + pin.getNumber() + "/value"));
				if (level == 0 || level == 1) {
					gpio.write("" + level);
				} else {
					throw new IllegalArgumentException("Pin value must be either 0 or 1 for low or high, respectively");
				}
				gpio.close();
				return true;
			} catch (IOException e) {};
		}
		return false;
	}

	public int read(Pin pin) { //Read the pin <pin> value
		if (pins.contains(pin)) { //Uses Pin equals method to test that the pin exists and is in the correct direction
			try {
				FileReader gpio = new FileReader(new File("/sys/class/gpio/gpio" + pin.getNumber() + "/value"));
				String level = "" + gpio.read();
				gpio.close();
				return Integer.parseInt(level); //All successful, so return the value
			} catch (IOException e) {};
		}
		return -1; //Return -1 if failed
	}
}
