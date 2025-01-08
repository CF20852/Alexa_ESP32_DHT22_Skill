//init.js
load('api_timer.js'); 
load('api_aws.js'); // aws support
load('api_dht.js'); // helper for the dht22 sensor

// create instance of DHT22 where the data line is the ESP32 Development Board pin labeled 32
let dht = DHT.create(32, DHT.DHT22);

// get a new value every 5 minutes (30,000 milliseconds)
Timer.set(300000, true, function() {
	//the DHT22 outputs the temp in degrees Celsius, but I want Fahrenheit
    let currentTemp = dht.getTemp() * 1.8 + 32.0;
	//the DHT22 outputs relative humidity in percent
    let currentHumidity = dht.getHumidity();
    // update the device shadow with the latest values (MQTT publish operation)
    AWS.Shadow.update(0, {temperature: currentTemp, humidity: currentHumidity});
}, null);
