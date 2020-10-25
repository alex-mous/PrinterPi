# PrinterPi
### An automatic web parser and packing list printer using a Raspberry Pi and a thermal printer
<img src="/Assembly/Complete%20printer.JPG" width="40%" alt="Completed PrinterPi project">

### Parts and Materials
- Raspberry Pi Zero W with [Raspbian Jessie Lite](http://downloads.raspberrypi.org/raspbian_lite/images/raspbian_lite-2017-03-03/2017-03-02-raspbian-jessie-lite.zip) installed (this version is important if you want to make the file system read-only; see the optional last step)
- 3D prints of the files in the "3D Files" directory
- Soldering equipment
- A thermal printer and required paper (DP-58C)
- DC power supply (12V 5A) with a corresponding plug for the barrel jack
- Wire
- Some stripboard
- Electronic components as shown in the [wiring diagram](/Assembly/Wiring.pdf) and [BOM](/Assembly/PrinterPi%20BOM.csv) and pin headers and sockets (1-pin width)
- M2.5x12 and M2x6 machine screws
- A sacrificial pencil for the roll holder

### Software Setup
You will need access to the Raspberry Pi (through either SSH or console) to install the software.

After booting up the Raspberry Pi, we need to setup the WiFi; open the WiFi configuration file:
```
sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
```
And then add the following to the bottom:
```
network={
    ssid="YOUR_SSID_HERE"
    psk="YOUR_PSK_HERE"
}
```

Next, get the IP address of the Raspberry Pi (and write it down; we will be using the IP address later to communicate with the extension):
```
sudo ifconfig
```
After this, run `raspi-config` to setup some further settings as shown in the table below

Option | Description
---------- | ----------
Change User Password | Change to something more secure as the Raspberry Pi will be available the network
Hostname | Name your Pi so that it can be addressed without an IP address
Interfacing Options -> SSH | Enable
Interfacing Options -> Serial</td><td>Disable console, enable serial
Boot Options -> Desktop/CLI -> Console Autologin</td><td>Enable this so that the script will run automatically

Now, you can either use the precompiled code from the Releases page. (You may need to install the Java Runtime Environment with `sudo apt-get install default-jre`), or compile the code yourself using the method below:

To compile the code, we need to install Java on the Raspberry Pi.  Run the following commands to do this:
```
sudo apt-get update
sudo apt-get install openjdk-8-jdk -y
```
Finally, download a copy of the code in the "PrinterPiServer" directory in this repository and place the files in the home directory of the Raspberry Pi.

You will need to compile the code before it can run; this can be done with the following command:
```
javac *.java
```

(*continue here if using precompiled code*)
Additionally, we need to make the power button management script executable with the following command:
```
sudo chmod +x power_button.sh
```
To make the Raspberry Pi run the code automatically on boot, add a couple of lines of code to the .bashrc file, which runs when the user logs in (done automatically on boot up with the console autologin selection in raspi-config). Open up the file with:
```
sudo nano ~/.bashrc
```
And add the following lines to the end:
```
/bin/bash /home/pi/power_button.sh&
stty -F /dev/serial0 115200
java -cp /home/pi Main&
```
Finally, we need a logo for the receipt to print. Generate this from any size and color picture with the Python code in the Logo directory with the following steps:
- Take a copy of your logo and place it into the Logo directory (rename it to Logo_in.png)
- Next, open and run the Python program "Image Processing.py"
- This will create a binary file, Logo.bin. You need to copy this file and place it into the directory with the other code on the Raspberry Pi for it to run

If you do not have a logo, just create an empty file called Logo.bin on the Raspberry Pi in the same folder as the PrinterPiServer code.

#### Optional additional steps
- Use HOSTNAME.local instead of an IP address, where HOSTNAME is the hostname set with raspi-config. This should work automatically on Macs and Linux/Unix computers. For Windows machines, you will need to install Bonjour. To implement this system, change the value in IP_ADDRESS.txt to HOSTNAME.local.</li>
- Convert Raspberry Pi to read-only to remove the need for power button and risk of SD card corruption such as at
	https://medium.com/@andreas.schallwig/how-to-make-your-raspberry-pi-file-system-read-only-raspbian-stretch-80c0f7be7353</li>

### Wiring
First, solder together the circuit board as shown below (reference the pictures with the <a href="/Assembly/Wiring.pdf">Wiring diagram</a> (__Note: you will need to cut some of the traces, so please look carefully.__)

<img src="/Assembly/Wiring%20drawing.jpg" width="30%" alt="Drawing of the wiring of the ciruit board"><img src="/Assembly/Circuit%20board%20close-up%20top.JPG" width="30%" alt="Close-up of the components on top of the circuit board">

Next, solder up the power jack and thermal printer cables (power and data; these will need to be spliced) to the wires from the circuit board. The LED and power button also need to be soldered, but in this case to pin headers instead of directly to the circuit board.

<img src="/Assembly/Thermal%20printer%20wiring.JPG" width="50%" alt="Wiring connections to the thermal printer"><img src="/Assembly/LED%20and%20Power%20Button.JPG" width="50%" alt="Close-up of the LED and power button installation">

Finally, connect all corresponding cables and sockets and check that the Raspberry Pi boots and runs successfully.

### Assembly
Now that the circuit is complete, assemble the printer as shown below.
#### Raspberry Pi and Circuit
First, install the Raspberry Pi. Using the M2x6 screws, mount the Raspberry Pi with the GPIO header to the right and ports and connectors to the left. Next, insert the circuit board on top of the Raspberry Pi's GPIO header. You can use tape and/or a mirror to help line up the pins. Now install the power button and LED; the former needs to have the nut screwed on from the back, whereas the latter is just a press fit.

<img src="/Assembly/Circuit%20board%20placement%20with%20mirror.JPG" width="50%" alt="Installation of the Raspberry Pi and circuit board" />

#### Thermal Printer
Before the printer will fit, you will need to remove one screw from each side of the printer as highlighted in the picture below. Then just slot the printer in at an angle. Add the M2.5 screws and the printer is installed.

<img src="/Assembly/Printer%20screw%20removal.JPG" width="28%" alt="Screws that need to be removed from the thermal printer highlighted" /><img src="/Assembly/Printer%20top%20without%20paper.JPG" width="45%" alt="Overview of the top of the printer without the paper roll" />

#### Paper Roll
To keep the paper roll easily accessible, use a pencil as a roll holder. First, you will have to cut it down to the correct length, and (maybe) trim the ends to fit. This is easily done with a craft knife.

<img src="/Assembly/Pencil%20paper%20roll%20support.JPG" width="42%" alt="Pencil used as a paper roll holder for the thermal printer" /><img src="/Assembly/Printer%20top.JPG" width="45%" alt="Overview of the top of the printer with the paper installed" />

#### Final Steps
Place a roll of paper on the pencil and feed it into the printer. ___Note: you may need to install some tape to prevent paper from curling up in the gap between the printer's output and the lid.___ Finally slide on the lid, and it should click into place (if not, sand and trim until it fits).

### Client Setup - Chrome Extension
To install the Chrome Extension, navigate to <a href="chrome://extensions">chrome://extensions</a> and check the box in the upper right corner reading "Developer mode." After this, click the "Load unpacked" button, and select the folder containing the extension. Finally, after the extension appears, you can uncheck the "Developer mode" box. Also, this extension can be installed <a href="https://chrome.google.com/webstore/detail/printerpi/dgmejpjohdfgiolaailhklbbkfchidkl?hl=en-US">from the Chrome Extension Store.</a> *(Note: this extension may be a previous version, so please check the versions before installing)*

### Usage
#### Printing
Click on the extension on Google Chrome, navigate to either the eBay Print a shipping label page or the PayPal Activity page (make sure to open at least one transaction; the data gathered will appear if successful), ensure that the printer is up and running, press the "Parse Data" button to read the data off of the webpage, and finally press the "Print Receipt" button. If all is well, a message "Successfully sent data to the printer" will appear, the printer's light will start flashing and the paper will print. If not, please see Troubleshooting below. Also, there is a "Save Data" button to save the data into the extension, so that when it is reopened, the same settings will show. Finally, you can generate and print #10 size envelopes with the buyer's address, your address, and an optional custom logo by pressing the "Print Envelope" button. *Note: before using the printer for the first time, you will need to set up the options. Navigate to this page by using the button at the very bottom of the Chrome Extension and fill in the fields as directed (including the IP address from earlier [written in the form of IP_ADDRESS:9321, where 9321 is the custom printer network port])*
#### Booting Up and Shutting Down
On boot, the printer will flash its LED slowly to indicate that the printer is ready for use. When you want to shut it down, press and hold the power button until the LED turns off. Then disconnect the power supply.
#### Note
Due to some insufficiencies with the PayPal and eBay GUIs the SKUs cannot currently be parsed nor the quantity on PayPal so these need to be manually entered.

### Troubleshooting
#### LED not flashing after boot
- The SD card might be corrupted, or something may have happened to the code. Please SSH into the Raspberry Pi or re-install the software.
#### Printer not printing
- If the LED light is flashing, that means that there is an issue with the printer. The most likely cause is that it is out of paper.
- Otherwise, the host is probably not connecting properly to the Raspberry Pi.
#### Power button not shutting down the Raspberry Pi
- Check the wiring of the power button and note that you need to hold the power button down until the LED turns off. At this point, it is safe to remove power.
#### Chrome Extension errors
- Try checking the Options, reinstalling the extension (and looking at the JavaScript console) or running the PrinterPiServer code on the Raspberry Pi in a console and watching the output.

### License
Copyright (C) 2020  PolarPiBerry
All work is licensed under the GNU General Public License (see LICENSE)
