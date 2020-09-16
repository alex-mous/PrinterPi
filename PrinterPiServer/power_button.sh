#!/bin/bash
#
#   power_button.sh - Script to monitor power button (GPIO2) and shutdown if pressed.
#   Also controls LED to indicate shutdown (GPIO4)
#
#   Copyright (C) 2020  PolarPiBerry
#
#   This program is free software: you can redistribute it and/or modify
#   it under the terms of the GNU General Public License as published by
#   the Free Software Foundation, either version 3 of the License, or
#   (at your option) any later version.
#
#   This program is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#   GNU General Public License for more details.
#
#   You should have received a copy of the GNU General Public License
#   along with this program.  If not, see <https://www.gnu.org/licenses/>.
echo "2" > /sys/class/gpio/export
echo "in" > /sys/class/gpio/gpio2/direction

echo "4" > /sys/class/gpio/export
echo "out" > /sys/class/gpio/gpio4/direction

echo "1" > /sys/class/gpio/gpio4/value;
sleep 3;
echo "0" > /sys/class/gpio/gpio4/value;

sleep 20; #Wait at least 20 seconds before taking affect

while true; do
        state=`cat /sys/class/gpio/gpio2/value`;
        if [ $state = "0" ]; then
                echo "1" > /sys/class/gpio/gpio4/value;
                sleep 3;
                state=`cat /sys/class/gpio/gpio2/value`;
                if [ $state = "0" ]; then
                        echo "Shutting down now"
                        sudo shutdown -h now
                fi
        fi
        sleep 1;
done;

