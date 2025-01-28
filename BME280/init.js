load('api_timer.js'); 
load('api_aws.js'); // aws support
load('api_gpio.js');
load('api_arduino_bme280.js');

// Sensors address (Usually: 0x76 or 0x77)
let sens_addr = 0x76;

// Initialize Adafruit_BME280 library using the I2C interface
let bme = Adafruit_BME280.createI2C(sens_addr);

let heater_pin = 4;

let key = 'switch_state';
let state = { 'switch_state': 0 };  // device state: shadow metadata

GPIO.set_mode(heater_pin, GPIO.MODE_OUTPUT);
GPIO.setup_output(heater_pin, 0);


// Upon startup, report current actual state, "reported"
// When cloud sends us a command to update state ("desired"), do it
AWS.Shadow.setStateHandler(function(data, event, reported, desired, reported_metadata, desired_metadata) {
  if (event === AWS.Shadow.CONNECTED) {
    AWS.Shadow.update(0, state);  // Report device state
  } else if (event === AWS.Shadow.UPDATE_DELTA) {
    for (let key in state) {
      if (desired[key] !== undefined) {
		state[key] = desired[key];
		GPIO.write(heater_pin, desired[key]);
	  }
    }
    AWS.Shadow.update(0, state);  // Report device state
  }
  print(event);
  print(JSON.stringify(reported), JSON.stringify(desired));
  print();
}, null);

// get new temperature and humidity readings and compute DP every 2.5 minutes
Timer.set(150000, true, function() {
	// repeat until we have valid temp and humidity readings
	let T = bme.readTemperature();
	let RH = bme.readHumidity();
	let P = bme.readPressure();
	
	// Magnus formula for dewpoint
	let log10 = ffi('double log10(double)');
	let H = (log10(RH) - 2) / 0.4343 + (17.62 * T) / (243.12 + T);
	let DP = 243.12 * H / (17.62 - H);
	
	// convert the temperatures to Fahrenheit
	let T = T * 1.8 + 32.0;
	let DP = DP * 1.8 + 32.0;
	
	print(T, RH, DP, P);
   
	// update the device shadow with the latest values
	AWS.Shadow.update(0, {temperature: T, humidity: RH, dewpoint: DP, pressure: P} );
}, null);
