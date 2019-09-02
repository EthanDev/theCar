// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk');
var persistenceAdapter;
var _ = require('lodash');

const utils = require('./util');
const generalConstants = require('./constants/general');
const helper = require('./helperFunctions');

// IMPORTANT: don't forget to give DynamoDB access to the role you're to run this lambda (IAM)
const {
    DynamoDbPersistenceAdapter
} = require('ask-sdk-dynamodb-persistence-adapter');
persistenceAdapter = new DynamoDbPersistenceAdapter({
    tableName: process.env.DYNAMO_TABLE_NAME || '',
    createTable: true,
    partitionKeyGenerator: keyGenerator
});

// This function establishes the primary key of the database as the skill id (hence you get global persistence, not per user id)
function keyGenerator(requestEnvelope) {
    if (requestEnvelope &&
        requestEnvelope.context &&
        requestEnvelope.context.System &&
        requestEnvelope.context.System.application &&
        requestEnvelope.context.System.application.applicationId) {

        return requestEnvelope.context.System.application.applicationId;
    }
    throw 'Cannot retrieve app id from requets envelope';
} // keyGenerator

// Global variables
let reprompt, speakOutput, currentIntent;

/**
 * Function: LaunchRequestHandler
 * Launch of the skill
 */
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {


        // let intro = `<speak><audio src="https://carview.s3.amazonaws.com/lYakQp6T-pre-650i-2.mp3"/></speak>`;

        // await helper.callDirectiveService(handlerInput, intro);

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

        console.log('..Returned lRtnDeviceDetails = ', JSON.stringify(lRtnDeviceDetails));


        if (lRtnDeviceDetails.registered) {
            console.log('...Scenario 1.0 - The device is registered to the car ');
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
            let pos = helper.randomIntFromInterval(1, arraySize - 1);
            console.log('Pos = ', pos);

            speakOutput = `<speak>` + generalConstants.greetings.mainMenu[pos] + `</speak>`;

            // replace %s and %t
            speakOutput = _.replace(speakOutput, '%s', lRtnDeviceDetails.vehicleMake);
            speakOutput = _.replace(speakOutput, '%t', lRtnDeviceDetails.vehicleModel);
            console.log('..speakOutput = ', speakOutput);


        } else {
            console.log('...Scenario 1.1 - The device is not registered to the car ');


            // Scenario 1.1 - The device is not registered to the car 
            currentIntent = 'vehicleVerificationIntent';

            speakOutput = `Welcome to the car. First things first, we need to link this device to this car. What's the make`;
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

            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'vehicleVerificationIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .speak("Welcome to the car. First things first, we need to link this device to this car.")
                .getResponse();


            // // Return the Dialog.Delegeate directive
            // return handlerInput.responseBuilder
            //     .addDelegateDirective(currentIntent)
            //     .getResponse();
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
    canHandle(handlerInput) {

        console.log('...checking processVehicleVerificationIntent with request =', JSON.stringify(handlerInput.requestEnvelope.request));

        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
            request.intent.name === 'vehicleVerificationIntent' &&
            request.dialogState !== 'COMPLETED';

    },
    async handle(handlerInput) {
        currentIntent = handlerInput.requestEnvelope.request.name;

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
const completedVehicleVerificationHandler = {
    canHandle(handlerInput) {

        console.log('..checking completedVehicleVerificationHandler');

        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' &&
            request.intent.name === 'vehicleVerificationIntent' &&
            request.dialogState === 'COMPLETED';
    },
    async handle(handlerInput) {

        console.log('..IN completedVehicleVerificationHandler');

        const request = handlerInput.requestEnvelope.request;
        console.log('..');
        const attributesManager = handlerInput.attributesManager;
        console.log('..');
        const responseBuilder = handlerInput.responseBuilder;
        console.log('..');
        const attributes = await attributesManager.getPersistentAttributes() || {};

        console.log('..');
        

        let slotValues = utils.getSlotValues(request.intent.slots);
        console.log('...slots = ', JSON.stringify(slotValues));
        

        // Get the vehicle ID from the vehicleDetails table
        let lVehicleInfo = await utils.getVehicleInformation(slotValues.carMake.value,
            slotValues.carModel.value);

        console.log('...lVehicleInfo = ', JSON.stringify(lVehicleInfo));
        


        if (Object.keys(attributes).length === 0) {
            // Set the device id and the registered flag in the session persistent data
            attributes.deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
            attributes.vehicleId = lVehicleInfo.id;
            attributes.registered = true;
            attributesManager.setPersistentAttributes(attributes);
            await attributesManager.savePersistentAttributes() || {};
        }

        // Confirmation of registration
        speakOutput = generalConstants.confirmations.postVehicleRegistration;

        return responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

/**
 * fullTourIntentHandler
 * Handle the case where the user has asked for the full tour
 * Note: The device needs to be registered to a vehicle - check the session variable
 */
const fullTourIntentHandler = {
    canHandle(handlerInput) {
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' &&
            request.intent.name === 'fullTourIntent' &&
            sessionAttributes.Make;
    },
    async handle(handlerInput) {

        console.log('..IN fullTourIntentHandler');
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        // Check the database for the url of the full tour text
        utils.getFullTourSpeech(sess.vehicleMake, sessionAttributes.ve);

    },
};





//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 



const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
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
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
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
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
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
        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = handlerInput.requestEnvelope.request.intent.name;
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
    .addRequestHandlers(
        LaunchRequestHandler,
        completedVehicleVerificationHandler,
        inProgressVehicleVerificationHandler,
        fullTourIntentHandler,
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
    .addRequestInterceptors(utils.PersistenceRequestInterceptor)
    .addResponseInterceptors(utils.PersistenceResponseInterceptor)
    .withPersistenceAdapter(persistenceAdapter)
    .lambda();