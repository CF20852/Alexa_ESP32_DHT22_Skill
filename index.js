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
    AWS_REGION: 'us-east-2',
    IOT_ENDPOINT: '<something>-ats.iot.<your AWS region>.amazonaws.com',
    IOT_ACCESS_ROLE_ARN: 'arn:aws:iam::<your AWS account number>:role/LambdaIoTRoleCF',
    
    // Maps user-friendly location names to sensor IDs in the device shadow
    // This abstraction allows us to use natural language locations in the Alexa interface
    // while maintaining technical sensor IDs in the backend
    // ** Replace AAAAAA, BBBBBB, and CCCCCC with your ESP32 names **
    LOCATION_MAPPING: {
        'garage': 'esp32_AAAAAA',
        //'living room': 'esp32_BBBBBB',
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
