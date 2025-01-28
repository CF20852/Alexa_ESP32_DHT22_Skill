# Overview
This Readme is intended to be a tutorial on how to get an ESP32-based temperature and humidity reporting device using a DHT22 sensor up and running on Amazon Alexa.  The user can ask the device for the temperature or humidity in one location, or if several devices are deployed, in each of those locations.

The specific ESP32 board I'm using is the ESP32-DevKitC-32E Development Board.  I bought it from Amazon in the United States for US$10.00.  If you don't use this specific board, you may have to connect the DHT22 sensor data pin to a different ESP32 pin than what I describe below.

I based this project on a tutorial posted by Jens@Comsysto Reply, published on Medium, *available at* https://medium.com/comsystoreply/alexa-ask-the-sensor-for-the-humidity-in-the-basement-9065f30a3739, last downloaded on 6 January 2025.  Jens' Alexa skill backend function code didn't quite work for me as written, but it provided some invaluable hints and suggested some code that the AIs I used to help get the skill up and running (see next paragraph) did not provide.  I will highlight that code in the detailed explanation that follows.

I wrote the Node.js backend function of the Alexa skill for this sensor with a lot of help from free versions of Claude.AI and Bing Copilot, and a paid version of ChatGPT.  Unfortunately, none of those AIs was able to provide a complete, working skill backend function.  Nor could they explain why it didn't work.  This may be due to changes in the Alexa programming environment after those AIs were trained, or it could just reflect limitations in AI technology as it stands at the time of this writing, early January, 2025.

The Amazon Alexa operational environment emphasises security and authentication over ease of design.  None of the AIs I used to help write and debug the Alexa skill backend function fully addressed the security and authentication requirements.  Nor does Amazon provide any useful coding examples or tutorials that I could find for the type of device and associated Alexa skill that I could find on the web.

This project has two major components.  The first component is the ESP32 device code, which reads data from the DHT22 sensor and publishes temperature and humidity data to AWS IoT Device Shadows on Amazon's servers.  The second component is the Alexa skill.  This skill reads the temperature or humidity data from the device shadows when the user asks an Amazon Echo device for the temperature or humidity at a user-specified location.  The skill must be pre-programmed to recognize the names of different locations.  When the skill recognizes a user request for a meansurement at a location, it generates the speech response that addresses the user's request.  If the skill does not recognize the measurement type or location, it generates an error message as a speech response.

The scope of this tutorial is limited to the creation of a skill you can use on your own network.  It does not include the work necessary to market your skill or easily share it with others.
 
I used a Windows 11 laptop for this project.  If you're using Linux or MacOS, you may have to do things a little differently.

Update on 28 Jan 2025:  I modified the DHT22 *init.js* file to work with a BME280.  The *init.js* and *mos.yml* files for that are in the BME280 folder in this repository.  The DHT22 *init.js* and *mos.yml* files are in the DHT22 folder.  You'll need to add the "pressure" Slot Value to your "measurement" slot type and add "pressure" to your Alexa skill backend code to take advantage of the full capabilities of the BME280.

# Connecting the ESP32 Development Board to the DHT22
The connections only require three wires:  +3.3V on the ESP32-DevKitC-32E to Vcc (may be called "+") on the DHT22, 32 on the ESP32 to S (may be called "OUT") on the DHT22, and GND (may be called "-") on the ESP32 to GND on the DHT22.  That's it.

# Programming the ESP32
## Overview
We program the ESP32 using the Mongoose-OS software, available at [the Mongoose-OS Quickstart web page](https://mongoose-os.com/docs/mongoose-os/quickstart/setup.md).
## Installing Mongoose-OS
Just follow the instructions on the [Mongoose-OS Quickstart page](https://mongoose-os.com/docs/mongoose-os/quickstart/setup.md) for your operating system.
## ESP32 Code
The ESP32 code that we upload to the ESP32 is written in Javascript, and is called *init.js*.  The code is very simple, but it takes advantage of the networking features of Mongoose-OS.  Here's the code I am using:
```js
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
```
The Timer.set() function is documented on the [Timers page](https://mongoose-os.com/docs/mongoose-os/api/core/mgos_timers.h.md) of the Mongoose-OS API documentation website.  The AWS.Shadow.update() function is documented on [this page](https://mongoose-os.com/docs/mongoose-os/api/cloud/aws.md).  Read those pages if you want to better understand how the *init.js* code works.

You may want to change the "let currentTemp" line in the *init.js* code to report temperature in degrees Celsius, or in Kelvins, if you so desire.

You'll also need the *mos.yml* file in the same folder as *init.js*.
## Building, Flashing, and Configuring the ESP32 Code
This process is based on [this tutorial](https://aws.amazon.com/blogs/apn/aws-iot-on-mongoose-os-part-1/) on the Amazon AWS website.  But instead of building and flashing *c_mqtt firmware example*, we're building and flashing *init.js*.
Start up MOS by clicking on the MOS icon in the MOS folder on your computer.  On my Windows 11 laptop, the MOS folder is *C:\mos*.  Clicking on the icon opens a tab in my browser and opens a Command Prompt (Windows command window) as well.  After telling MOS what device I am using (ESP32) and what COM port it is connected to on my laptop, I used the browser tab to execute the necessary commands to build and flash the *init.js* software and to configure the ESP32 Wi-Fi and AWS IoT security files.  The commands I used are:
- cd \<directory where init.js is located\>
- mos build
- mos flash
- mos config-set wifi.sta.enable=true wifi.sta.ssid="\<my-wifi-ssid\>" wifi.sta.pass="<my-wifi-password\>"
- mos aws-iot-setup --aws-region us-east-2 --aws-iot-policy mos-default

In the mos cofig-set command, replace the text inside the quotation marks with your Wi-Fi SSID and password.

In the last command, you may have to change the AWS region.  There's a list of AWS regions and an explantion of what the term means [here](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html).  *Note that when you get to the point where you are creating your Alexa skill, not all of those regions can host the skill*.

After the last command executes, look in the MOS output for the following:
```
Certificate info:
  Subject : CN=esp32_XXXXXX
```
The text after "CN=" is the name of your ESP32 device that AWS IoT and your Alexa skill will use to refer to the device.  **Make a note of it**.

All of those commands take a few seconds to a minute to execute.

# Programming the Alexa Skill
## Setting up Amazon AWS and Alexa Accounts
You will need user accounts on both Amazon Web Services (AWS) and an Amazon Developer Account.  You'll need the AWS account for two reasons.  First, you should access the AWS IoT Device Management tools to verify that your device is publishing temperature and humidity data to the Device Shadow on AWS.  Second, you must access the Amazon Identity and Access Management tools to create a role with policies for your Alexa skill to allow the skill to access the Device Shadow.  The Amazon Developer Account is what you use to access the Alexa tools.

If you need to create an AWS account (which you do unless you already have one), [this link](https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-creating.html) will take you to a web page that will explain how to do that.
 
If you already have an Amazon.com account, you currently have the option of using that account's login credentials for your Amazon Developer Account.  Follow [this link](https://developer.amazon.com/en-US/docs/alexa/ask-overviews/create-developer-account.html) to get to the page you need to visit to learn how to set up your Amazon Developer Account. 

## Set Up a New Device ("Thing") in AWS IoT
1. Log into the AWS Console.  
2. Look in the menu on the left side of the window for "Manage".  Click on it.
3. Look under "Manage" for "All devices".  Click on it or click on the arrow to the left of it to expand the "All devices" menu.
4. Click on "Things" under "All devices".
5. If you see the name of your new ESP32 in the list, click on it and skip to Step 9 below.
6. Look for "Create things" in the orange box.  Click on it.
7. Select "Create single thing".  Click on "Next" in the orange box.
8. Enter the "Thing name" that you noted after running "mos config-set" in the "Building, Flashing, and Configuring the ESP32 Code" section above.
9. Select "Unnamed shadow (classic)" (you may have to scroll down).
10. Click on "Next" in the orange box.
11. Select "Skip creating a certificate at this time"; that was taken care of by "mos aws-iot-setup" above.
12. Click on "Create thing" in the orange box.  You should get a new window with a message that says "You successfully created thing esp32_XXXXXX".

Actually, I don't think I had to do steps 9-12, at least for the second and third ESP32 devices I brought on line.  They seem have been automatically set up. ¯\\_(ツ)_/¯

## Verify the ESP32 Data is Getting to Amazon IoT Device Shadow
In the new window that came up after the last step of creating a new thing, click on the name of your new thing.  Then click on the "Device Shadows" tab.  Then click on "Classic Shadow".  Scroll down to the Device Shadow document" pane, and you should see something in the "Device Shadow state" pane that looks like this JSON string:
```
{
  "state": {
    "desired": {
      "welcome": "aws-iot"
    },
    "reported": {
      "humidity": 23,
      "temperature": 47.119999,
      "welcome": "aws-iot"
    }
  }
}
```
but perhaps without the "desired" object.

## Step-by-Step Skill Programming
### Overview
In this section, we create the Alexa skill, set up the name we invoke it with, set up the measurements and locations we want it to report, set up the voice interactions we want to have with the skill, and set up the backend function (Node.js) code for the skill.


### Create Your Skill
1. Log in to the [Alexa Development Console](https://developer.amazon.com/alexa/console/ask).
2. Click on "Create Skill" in the blue box.
3. On the "Name, locale" page, nter a name for your skill, and select your language and country.  Then click "Next".
4. On the "Experience, model, hosting service" page, click on either "Smart Home" or "Other".  When the next page comes up, click on the "Custom" box.  Then click on "Next".
5. Click on he "Start from scratch" box.  Then click "Next".
6. Review your selections, and edit if necessary.  Then click on "Create Skill".

### Building Your Skill
In the black bar at the top of the Alexa Developer Console, you should see the following tab labels:  "Build," "Code," "Test," "Distribution," "Certification," and "Analytics".  This tutorial only covers the first three of those.  We start in the "Build" tab.
 
#### Create an Invocation Name
In the menu in the left-hand pane of the "Build" tab, if "Invocations" is not expanded, click on it, then click on "Skill Invocation Name".  In the "Invocation" pane that comes up on the right, read the instructions associated with "Skill Invocation Name".  Then enter the name that you'll be comforable with when you ask an Amazon Echo device to open your skill.  I used "my esp thirty two," writing out "thirty two" because one of the rules is that the invocation name must contain only lower-case alphabetic characters, spaces and possessive apostrophes, and numbers should be spelled out.

#### Create a Custom Intent, Sample Utterances, Slot Types, and Slots
[This web page](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-intents-utterances-and-slots.html) explains what we'll be doing next, which is, in essence, programming the speech interface for our skill.
1.  In the "Intents" section, click on "+ Add Intent".
2.  On the "Add Intent" page, select "Create custom intent" and type an intent name, such as *GetMeasurementAtLocationIntent* into the box.  Then click on the "Create custom intent" button.
3.  On the "Intents / GetMeasurementAtLocationIntent" page, in the "Sample Utterances" box, type something like "for the {measurement} in the {location}" and then click on the "+" symbol on the right-hand side of the box.  This accomplishes two things:  (1) It tells the skill what a user might say to request the temperature or humidity in one of your locations, and (2) it creates the slots "measurement" and "location".  (You may have to scroll down to see the slots.)
4.  Add some more sample utterances, based on what you think you or someone else might ask the Alexa skill.  For example, "what's the {measurement} in the {location}" and/or "to get the {measurement} for the {location}".  Clock on the "+" symbol after each entry.
5.  In the left-hand pane on the Alexa Development Console, click on "Assets," then click on "Slot Types".
6.  Click on "+ Add Slot Type".  We need to add two slot types:  "measurements" and "locations".  Type each of those type names into the box below the blue "+ Add Slot Type" button, then click on the "+" symbol on the right-hand side of the box.
7.  Now that we've defined the two slot types, we need to add slot values to each of them.  First, click on "measurements".  That should take you to the "Slot types / measurements" page.  On that page, enter "temperature" and "humidity" into the box labeled "Enter a new value for this slot type" (grayed out text), and click on the "+" symbol on the right-hand side of the box after each entry.  Then go back to the "Slot Types" page, click on "locations", which should take you to the "Slot types / locations" page.  Enter the values for the location slot type.  I used "garage," "living room," and "outdoors" as the values for my "locations" slot type.
8.  Once our slot times are defined, we look in the left-hand pane for "Intents," and click on it.  Then we click on the name of the custom intent we created, which in my case was "GetMeasurementAtLocationIntent"  Then we scroll down to Intent Slots, and choose "locations" for the slot type of the "location" slot and "measurements" for  slot type of the "measurement" slot.

We should build our skill ("Build skill" button in the upper-right corner of the windows) after completing the above steps, and fix any errors the Alexa Developer Console points out.

Please note that the names of the intent and slots that I have chosen here are also used in the Node.js backend function, so if you decide to use different names, you'll need to adjust the names in the function code as well.

#### Programming the Backend Function in Node.js
Now we switch from the "Build" tab to the "Code" tab in the Alexa Developer Console.  The deveopment environment has supplied an example *index.js* function.  We need to replace it with a function that implements the backend for our skill.  You can just copy the code below and paste it on top of the example *index.js*, or download it from this repository and copy and paste the downloaded file.

In the "CONFIG" section below, you'll need to change a few things:
1.  Your AWS_REGION, which must be set in the mos aws-iot-setup command and in AWS IoT;
2.  Your IOT_ENDPOINT, which you can get from Connect -> Domain configurations -> Domain details in the AWS IoT Console;
3.  Your IOT_ACCESS_ROLE_ARN, which you can get from Manage -> All devices -> Things -> Device details in the AWS IoT Console;
4.  Your location names in the LOCATION_MAPPING section, which are probably not the same as mine, and you'll also need to change them in the comments and MESSAGES section; and
5.  Your ESP32 names in the LOCATION_MAPPING section, specifically, the six hexadecimal digits following "esp32_".

This is the code:
```js
// index.js

/**
 * This Alexa skill interfaces with an ESP32 IoT device to read temperature and humidity sensors.
 * It uses AWS IoT Device Shadows to get the latest sensor readings and presents them to users
 * through natural language interactions.
 *
 * The skill supports multiple sensor locations (garage, living room, outdoors) and can report
 * both temperature and humidity measurements. It includes comprehensive error handling and
 * provides a natural conversation flow.
 */

const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');

/**
 * Central configuration object that contains all constants and settings.
 * Centralizing configuration makes the skill easier to maintain and modify.
 * It also makes it easier to deploy the skill to different environments
 * or adapt it for different IoT devices.
 */
const CONFIG = {
    // AWS IoT specific configuration
    // You choose what AWS Region to use in MOS and in AWS IoT.
    AWS_REGION: '<your AWS region>',
    // You can get your IOT_ENDPOINT from Connect -> Domain configurations -> Domain details
    // in the AWS IoT console
    IOT_ENDPOINT: '<something>-ats.iot.<your AWS region>.amazonaws.com',
    // You can get your IOT_ACCESS_ROLE_ARN from Manage -> All devices -> Things -> Device details
    // in the AWS IoT console
    IOT_ACCESS_ROLE_ARN: 'arn:aws:iam::<your AWS account number>:role/LambdaIoTRoleCF',
    
    // Maps user-friendly location names to sensor IDs in the device shadow
    // This abstraction allows us to use natural language locations in the Alexa interface
    // while maintaining technical sensor IDs in the backend
    // ** Replace esp32_AAAAAA, esp32_BBBBBB, and esp32_CCCCCC with your esp32 names **
    LOCATION_MAPPING: {
        'garage': 'esp32_AAAAAA',
        'living room': 'esp32_BBBBBB',
        'outdoors': 'esp32_CCCCCC'
    },
    
    // Measurement configurations define valid ranges and display formats
    // These ranges help detect sensor malfunctions or invalid readings
    MEASUREMENTS: {
        temperature: {
            shadowKey: 'temperature',  // Add this to map between Alexa and shadow names
            min: -40,
            max: 140,
            unit: '°F',
            precision: 1
        },
        humidity: {
            shadowKey: 'humidity',  // Direct mapping
            min: 0,
            max: 100,
            unit: '%',
            precision: 0
        }
    },
    
    // Centralized message strings for consistent user interaction
    // Having all messages in one place makes it easier to maintain voice consistency
    // and modify responses without changing code logic
    MESSAGES: {
        LAUNCH: 'Welcome to the ESP32 Sensor Reader. You can ask about temperature or humidity in the garage, living room, or outdoors.',
        HELP: 'You can ask me questions like: What\'s the temperature in the garage? or What\'s the humidity outdoors? I can provide readings from sensors in the garage, living room, and outdoors.',
        ERROR: 'Sorry, I had trouble processing your request. Please try again.',
        GOODBYE: 'Goodbye! Thanks for using ESP32 Sensor Reader.',
        FALLBACK: 'I\'m not sure how to help with that. Try asking about temperature or humidity in a specific location.',
        STOP: 'Goodbye!'
    }
};



/**
 * Validates and formats measurement values from sensors.
 * This function serves multiple purposes:
 * 1. Ensures readings are valid numbers
 * 2. Checks if readings are within reasonable ranges
 * 3. Formats numbers for natural speech output
 *
 * @param {number|string} value - The raw sensor reading
 * @param {string} type - The type of measurement ('temperature' or 'humidity')
 * @returns {string} Formatted measurement value
 * @throws {Error} If the reading is invalid or out of range
 */
function processMeasurementValue(value, type) {
    const measurementConfig = CONFIG.MEASUREMENTS[type];
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
        throw new Error(`Invalid ${type} reading`);
    }
    
    if (numValue < measurementConfig.min || numValue > measurementConfig.max) {
        throw new Error(`${type} reading out of reasonable range`);
    }
    
    return numValue.toFixed(measurementConfig.precision);
}

/**
 * Handles the initial launch of the skill.
 * Provides a welcoming message and examples of what users can ask.
 * The response includes both speech and a card in the Alexa app.
 */
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(CONFIG.MESSAGES.LAUNCH)
            .reprompt(CONFIG.MESSAGES.LAUNCH)
            .withSimpleCard('ESP32 Sensor Reader', CONFIG.MESSAGES.LAUNCH)
            .getResponse();
    }
};

 //AI generated code didn't include this function
async function getCredentials() {
    const STS = new AWS.STS({ apiVersion: '2011-06-15' });
    return STS.assumeRole({
        RoleArn: CONFIG.IOT_ACCESS_ROLE_ARN,
        RoleSessionName: 'Session'
    }).promise();
}

/**
 * Handles the main functionality of getting sensor readings.
 * This is the core handler that:
 * 1. Extracts location and measurement type from the user's request
 * 2. Queries the AWS IoT Device Shadow
 * 3. Processes and validates the sensor reading
 * 4. Returns the formatted response to the user
 */
const GetMeasurementForLocationIntentHandler = {
    canHandle(handlerInput) {
        console.log()
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'GetMeasurementForLocationIntent';
    },
    async handle(handlerInput) {
        // Extract and normalize slot values from the user's request
        const slots = handlerInput.requestEnvelope.request.intent.slots;
        const measurement = slots.measurement.value.toLowerCase();
        const location = slots.location.value.toLowerCase();
        
        // Convert user-friendly location to sensor ID
        const sensorId = CONFIG.LOCATION_MAPPING[location];
        if (!sensorId) {
            const speechText = `I'm sorry, I don't have a sensor configured for the ${location}.`;
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard('Location Not Found', speechText)
                .getResponse();
        }
        
        try {
            // Query the device shadow to get the latest sensor readings
            const credentials = await getCredentials();  //AI generated code didn't include this
            
            /**
             * Initialize the AWS IoT service client with our account-specific endpoint.
             * The IoTDataPlane API provides methods for interacting with device shadows,
             * which store the latest state of our IoT device.
             */
            const iotData = new AWS.IotData({
                endpoint: CONFIG.IOT_ENDPOINT,
                region: CONFIG.AWS_REGION,
                accessKeyId: credentials.Credentials.AccessKeyId,  //AI generated code didn't include this
                secretAccessKey: credentials.Credentials.SecretAccessKey,  //AI generated code didn't include this
                sessionToken: credentials.Credentials.SessionToken  //AI generated code didn't include this
            });
            
            const shadowData = await iotData.getThingShadow({
                thingName: CONFIG.LOCATION_MAPPING[location],
                
            }).promise();
            
            // Parse the shadow state - this contains the actual sensor readings
            const shadowState = JSON.parse(shadowData.payload).state.reported;
            console.log(shadowState);
            
            // Verify we have data for the requested sensor
            /**
            if (!shadowState[sensorId]) {
                throw new Error(`No data available for ${location}`);
            }
            */
            
            // Get and validate the specific measurement requested
            const measurementKey = CONFIG.MEASUREMENTS[measurement].shadowKey;
            const rawValue = shadowState[measurementKey];
            
            if (rawValue === undefined) {
                throw new Error(`No ${measurement} data available`);
            }
            
            const value = processMeasurementValue(rawValue, measurement);
            const unit = CONFIG.MEASUREMENTS[measurement].unit;
            
            const speechText = `The ${measurement} in the ${location} is ${value}${unit}`;
            const cardTitle = `${location} ${measurement}`;
            
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard(cardTitle, speechText)
                .getResponse();
                
        } catch (error) {
            console.error('Error reading sensor data:', error);
            
            // Provide specific error messages based on what went wrong
            let speechText;
            if (error.code === 'ResourceNotFoundException') {
                speechText = `I couldn't find the sensor device. Please check if it's online.`;
            } else if (error.message.includes('reading out of reasonable range')) {
                speechText = `I received an unusual reading from the ${location} sensor. Please check if it's working correctly.`;
            } else {
                speechText = `I'm sorry, I couldn't get the ${measurement} reading for the ${location}. Please try again later.`;
            }
            
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard('Error', speechText)
                .getResponse();
        }
    }
};

/**
 * Handles requests for help by providing examples and guidance.
 * The help message explains what the skill can do and how to use it.
 */
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(CONFIG.MESSAGES.HELP)
            .reprompt(CONFIG.MESSAGES.HELP)
            .withSimpleCard('Help', CONFIG.MESSAGES.HELP)
            .getResponse();
    }
};

/**
 * Handles user requests to stop or cancel the skill.
 * Provides a friendly goodbye message and ends the session.
 */
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(CONFIG.MESSAGES.STOP)
            .withSimpleCard('Goodbye', CONFIG.MESSAGES.STOP)
            .withShouldEndSession(true)  //AI generated code didn't include this
            .getResponse();
    }
};

/**
 * Handles cases where Alexa doesn't understand the user's request.
 * Provides guidance back to supported functionality.
 */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(CONFIG.MESSAGES.FALLBACK)
            .reprompt(CONFIG.MESSAGES.HELP)
            .withSimpleCard('I Didn\'t Understand', CONFIG.MESSAGES.FALLBACK)
            .getResponse();
    }
};

/**
 * Handles the built-in NavigateHome intent by returning to the launch experience.
 * This provides a consistent way for users to reset their interaction with the skill.
 */
const NavigateHomeIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NavigateHomeIntent';
    },
    handle(handlerInput) {
        return LaunchRequestHandler.handle(handlerInput);
    }
};

/**
 * Handles session end requests, performing any necessary cleanup.
 * This is called when the skill session ends for any reason.
 */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

/**
 * Provides centralized error handling for any unhandled errors in the skill.
 * Logs errors for debugging and provides a friendly error message to users.
 */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.error('Error processed:', error);
        
        return handlerInput.responseBuilder
            .speak(CONFIG.MESSAGES.ERROR)
            .reprompt(CONFIG.MESSAGES.ERROR)
            .withSimpleCard('Error', CONFIG.MESSAGES.ERROR)
            .getResponse();
    }
};

/**
 * Request interceptor that logs incoming requests for debugging.
 * This helps track user interactions and troubleshoot issues.
 */
const LoggingRequestInterceptor = {
    process(handlerInput) {
        console.log(`Incoming request: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    }
};

/**
 * Response interceptor that logs outgoing responses for debugging.
 * This helps verify that the skill is responding as expected.
 */
const LoggingResponseInterceptor = {
    process(handlerInput, response) {
        console.log(`Outgoing response: ${JSON.stringify(response)}`);
    }
};

/**
 * Lambda handler configuration that brings together all components of the skill.
 * This exports the handler that AWS Lambda will call when the skill is invoked.
 */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        GetMeasurementForLocationIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        NavigateHomeIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(LoggingRequestInterceptor)
    .addResponseInterceptors(LoggingResponseInterceptor)
    .lambda();
```
#### Setting up the Role and Policies
##### Use Personal AWS Resources with Your Alexa-Hosted Skill
This is the "feature" of AWS that I didn't discover until I had fought to get *index.js* to retrieve the temperature and humidity data from my ESP32 Device Shadow for quite some time.  I eventually discovered [this web page](https://developer.amazon.com/en-US/docs/alexa/hosted-skills/alexa-hosted-skills-personal-aws.html) that explains what you have to do, but not in a way that makes it perfectly clear that it applied to my situation.  However, after reading it a couple of times, I decided I was indeed attempting to enable my Alexa-hosted skill to use resources in my personal AWS account, because the IoT Device Shadow lives in my personal AWS account, while my skill backend Node.js function is hosted by the Alexa environment.  And when I finished, my Alexa skill started responding to requests for temperature and humidity.

##### AWS IAM Role for the Skill
The AWS IAM role for this skill includes three "Permissions policies" and one "Trusted relationship".  The three permissions policies are "AWSIoTDataAccess," "AWSLambdaBasicExecutionRole," and "CloudWatchLogsFullAccess".

To build the IAM role for the skill:
1.  Log into the AWS Console.  Then click on the 3x3 grid of white squares in the upper-left corner of the window, in the black bar, next to the AWS logo.  In the menu that appears, click on "Security, Identity, & Compliance".  Then click on "IAM" in the column that appears to the right of the menu.  That brings up the "Identity and Access Management (IAM) Dashboard".
2.  In the IAM Dashboard, in the menu pane on the left, "Access Management" should be expanded.  If not, click on it.  Then click on "Roles".
3.  Click on "Create role" in the orange button at the upper right of the "Roles" window.
4.  In the "Select trusted entity" window that comes up, select the "AWS service" box under "Trusted entity type".  Then select "Lambda" under "Use case".  Click on Next to continue.
5.  Select the permissions policies "AWSIoTDataAccess," "AWSLambdaBasicExecutionRole," and "CloudWatchLogsFullAccess".  Then click "Next".
6.  In the "Name, review, and create" window, in the "Role name" box, give your role a name.  I chose "MyAlexaSkillRole".
7.  In the "Step 2: Add permissions" section of that page, confirm that you have the three permissions policies you selected in Step 5 above.
8.  Click on the "Create role" button in the bottom-right corner of the page.
9.  You should now be back on a page that lists various roles, including the one you just created.  Click on the link corresponding to the name of that role.
10.  The last step should have taken you to a page whose header is the name of the role you just created.  Click on "Trust relationships" on that page.  That should open a box whose caption is "Trusted entities".
11.  Click on the "Edit trust policy" button.
12.  The trust policy should read as follows, but you'll have to replace the text inside the quotation marks after "AWS":, as I will explain below.
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "<Replace with AWS Lambda Execution Role ARN from your Alexa-hosted skill>",
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

13.  In the Alexa Development Console, in the "Code" tab, click on the "AWS Integrate" icon and copy the "AWS Lambda Execution Role ARN".  Paste that ARN between the quotation marks after "AWS": in the sevent line of the trust policy.
14.  Click on the "Update policy" orange button in the bottom-right corner of the page.

## Testing and Debugging the Skill
You can use console.log() statements in *index.js* to print diagnostic data to the CloudWatch logs.  Use the CloudWatch Logs feature in the Alexa Developer Console "Code" tab, *not* the CloudWatch logs in the AWS Developer Console.

You can use the "Test" tab in the Alexa Developer Console to interact with your skill using speech or text representatives of speech prompts/questions.

