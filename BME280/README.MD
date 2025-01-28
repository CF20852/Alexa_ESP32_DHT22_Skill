To implement this gadget with a BME280 sensor instead of a DHT22 sensor, use the code in this folder.  Connect the BME280 SDA and SCL lines to GPIO pins 21 and 22 respectively.  Connect ESP32 3.3V to BME280 VCC and ESP32 GND to BME280 GND.

If you can't read anything from your BME280, try address 0x77 instead of 0x76.  And if it still doesn't work, check your connections or suspect your devices.
