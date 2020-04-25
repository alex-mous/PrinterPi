###
#    Image Processing.py - Program to create a small logo that can be
#    printed on a thermal printer
#
#    Copyright (C) 2020  PolarPiBerry
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.
#
#    You should have received a copy of the GNU General Public License
#    along with this program.  If not, see <https://www.gnu.org/licenses/>.
###

from PIL import Image, ImageOps
import struct

fn = "Logo_in.png"

fno = "Logo.bin"

print("Processes logos for printing on a thermal printer")
print("Converts to black/white with dithering and a fixed width of 384 pixels")
print()
print("Processing image: " + fn + " and saving to " + fno)

im = Image.open(fn);

print("Image loaded, now processing...")

im = im.convert("L") #convert to greyscale

print("Converted to greyscale")

im = im.resize((384,int(384*im.height/im.width)))

print("Resized")

pixels = im.load()

print("Commencing dithering...")

def getClosest(px):
    if (px > 128):
        return 255
    else:
        return 0

for y in range(0,im.height-2): #Jarvis, Judice, and Ninke dithering
    for x in range(0,im.width-2):
        opx = pixels[x,y]
        npx = getClosest(opx)
        dx = opx - npx
        im.putpixel((x,y),npx)
        im.putpixel((x+1,y  ),int(pixels[x+1,y  ] + (dx * 7/48)))
        im.putpixel((x+2,y  ),int(pixels[x+2,y  ] + (dx * 5/48)))

        im.putpixel((x-2,y+1),int(pixels[x-2,y+1] + (dx * 3/48)))
        im.putpixel((x-1,y+1),int(pixels[x-1,y+1] + (dx * 5/48)))
        im.putpixel((x  ,y+1),int(pixels[x  ,y+1] + (dx * 7/48)))
        im.putpixel((x+1,y+1),int(pixels[x+1,y+1] + (dx * 5/48)))
        im.putpixel((x+2,y+1),int(pixels[x+2,y+1] + (dx * 3/48)))

        im.putpixel((x-2,y+2),int(pixels[x-2,y+2] + (dx * 1/48)))
        im.putpixel((x-1,y+2),int(pixels[x-1,y+2] + (dx * 3/48)))
        im.putpixel((x  ,y+2),int(pixels[x  ,y+2] + (dx * 5/48)))
        im.putpixel((x+1,y+2),int(pixels[x+1,y+2] + (dx * 3/48)))
        im.putpixel((x+2,y+2),int(pixels[x+2,y+2] + (dx * 1/48)))

print("Done dithering. Result shown.")

im.show("Result")

im = ImageOps.invert(im) #Invert all of the pixels
im = im.convert("1") #Convert to one-bit image

print("Inverted image and converted to one-bit")

#Used for pixel doubling on printer to create larger images
double_width = False
double_height = False

#Check for double height and width and adjust parameter accordingly
code = 0
if double_width:
        code += 1
if double_height:
        code += 2

xL = int(im.width/8) % 256 #width is in bytes, so divide by 8
xH = int(im.width/2048)

yL = im.height % 256 #height is in pixels - no action needed
yH = int(im.height / 256)

with open(fno,"wb") as f:
    f.write(b"\x1d\x76\x30" + struct.pack('B', code) + struct.pack('B', xL) + struct.pack('B', xH) + struct.pack('B', yL) + struct.pack('B', yH))
    f.write(im.tobytes())
