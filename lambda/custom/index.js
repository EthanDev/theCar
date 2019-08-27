// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk');
const Adapter = require('ask-sdk-dynamodb-persistence-adapter');
var _ = require('lodash');

const utils = require('./util');
const generalConstants = require('../custom/constants/general');
const helper = require('./helperFunctions');


// Constants
const ddbTableName = 'theCarPersistantAttributesTable';

// Global variables
let reprompt, speakOutput, currentIntent;

/**
 * Function: LaunchRequestHandler
 * Launch of the skill
 */
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {

        const attributesManager = handlerInput.attributesManager;
        const persistentAttributes = await attributesManager.getPersistentAttributes();
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        // Save the time the skill was accessed
        persistentAttributes.lastAccessTime = Date.now();
        attributesManager.setPersistentAttributes(persistentAttributes);
        await attributesManager.savePersistentAttributes();

        // Check if device is registered - the device id is from the request data pased to 
        // the skill
        let lDeviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
        let lRtnDeviceDetails = await utils.checkRegisteredDevice(lDeviceId);

        if (lRtnDeviceDetails.registered) {
            // Device is registered to a vehicle
            // So set the session attribute, non persistent
            Object.assign(sessionAttributes, {
                "Make": lRtnDeviceDetails.vehicleMake,
                "Model": lRtnDeviceDetails.vehicleModel,
                "Year": lRtnDeviceDetails.vehicleYear,
                "Reg": lRtnDeviceDetails.vehicleReg,
                "Condition": lRtnDeviceDetails.vehicleCondition
            });

            // Save the session variables
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            // Now we can speak the main menu
            let arraySize = _.size(generalConstants.greetings.mainMenu);
            let pos = helper.randomIntFromInterval(1, arraySize);
            speakOutput = generalConstants.greetings.mainMenu[pos];

        } else {
            // Scenario 1.1 - The device is not registered to the car 
            currentIntent = 'vehicleVerificationIntent';

            speakOutput = `Welcome to the car. First things first, we need to link this device to this vehicle. What's the make and the model of the vehicle?`;
            reprompt = `Welcome to the car. Let's get this device setup. What's the vehicle make and model?`;
            // return handlerInput.responseBuilder
            //     .addElicitSlotDirective('carMake', {
            //         name: 'vehicleVerificationIntent',
            //         confirmationStatus: 'NONE',
            //         slots: {}
            //     })
            //     .speak(speakOutput)
            //     .reprompt(reprompt)
            //     .getResponse();

            // Return the Dialog.Delegeate directive
            return handlerInput.responseBuilder
                .addDelegateDirective(currentIntent)
                .getResponse();
        }
        //  default handler for speaker output
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * Function: inProgressVehicleVerificationHandler
 * Continue to get the next slot
 */
const inProgressVehicleVerificationHandler = {
    canHandle(handlerInput){

        console.log('...checking processVehicleVerificationIntent with request =', JSON.stringify(handlerInput.requestEnvelope.request));

        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
        request.intent.name === 'vehicleVerificationIntent' &&
        request.dialogState === 'IN_PROGRESS';
        
    },
    async handle(handlerInput){
        currentIntent = handlerInput.requestEnvelope.request;

        return handlerInput.responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse();
    },  
};


/**
 * Function: completedVehicleVerificationHandler
 * Handles the scenario when all the vehicle details, make and model 
 * have been filled in and the slots are complete
 */
const completedVehicleVerificationHandler ={
    canHandle(handlerInput){
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' &&
            request.intent.name === 'vehicleVerificationIntent' &&
            request.dialogState ==='COMPLETED';
    },
    async handle(handlerInput){
        //To do
    }

};

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello World!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .withPersistenceAdapter(
        new Adapter.DynamoDbPersistenceAdapter({
            tableName: process.env.DYNAMO_TABLE_NAME || '',
        })
    )
    .addRequestHandlers(
        LaunchRequestHandler,
        completedVehicleVerificationHandler,
        inProgressVehicleVerificationHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    // .addRequestInterceptors(
    //     ...require('./interceptors/request')
    // )
    // .addResponseInterceptors(
    //     ...require('./interceptors/response')
    // )
    .lambda();