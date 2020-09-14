/*
 *    Pin.java - Data structure to hold information on one GPIO pin: its BCM number and direction
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

public class Pin {
	private int number;
	private int direction; //0 for input, 1 for output

	public Pin(int number, int direction) { //Construct with pin number (BCM) and direction (0 or 1)
		if (number >= 1 && number <= 26)
			this.number = number;
		else
			throw new IllegalArgumentException("Pin (BCM number) " + number + " does not exist. The number must be between 1 and 26");

		if (direction == 0 || direction == 1) //Must be between 0 and 1
			this.direction = direction;
		else
			throw new IllegalArgumentException("Pin " + number + " does not have a valid direction: " + direction + ". Direction must be either 0 or 1 for input or output, respectively");
	}

	public int getNumber() {
		return this.number;
	}

	public int getDirection() {
		return this.direction;
	}

	public boolean equals(Object o) { //General equals method
		if (o instanceof Pin) {
			Pin po = (Pin) o;
			return po.number == this.number && po.direction == this.direction;
		}
		return false;
	}
}
