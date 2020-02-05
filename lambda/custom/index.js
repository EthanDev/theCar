// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk');
var persistenceAdapter;
var _ = require('lodash');

const ALGOLIA_APP_ID = `5TTBLP003O`;
const ALGOLIA_API_KEY = `22b9df67712d6646fa290c7f4842b0c7`;

const algoliasearch = require('algoliasearch');
const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
const index = algolia.initIndex('talk-search');

const utils = require('./util');
const generalConstants = require('./constants/general');
const helper = require('./helperFunctions');
const menuOptionIntentHandlers = require('./menuOptionIntents');

// IMPORTANT: don't forget to give DynamoDB access to the role you're to run this lambda (IAM)
const {
    DynamoDbPersistenceAdapter
} = require('ask-sdk-dynamodb-persistence-adapter');

persistenceAdapter = new DynamoDbPersistenceAdapter({
    tableName: 'carViewUsers',
    createTable: true
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


// /**
//  * Function: searchIntentHandler
//  * Search functionality that will search the algolia database for the right answer
//  */
// const searchIntentHandler = {
//     canHandle(handlerInput) {

//         return handlerInput.requestEnvelope.request.type === 'LaunchRequest' ||
//             handlerInput.requestEnvelope.request.intent.name === 'SearchIntent';

//     },
//     async handle(handlerInput) {

//         const query = handlerInput.requestEnvelope.request.intent.slots.query.value;

//         const response = await index.search({
//             query,
//             removeStopWords: true,
//             ignorePlurals: true,
//             optionalWords: query
//         });
//         const hits = response.hits;
//         const talk = hit[0];

//         const speechText = `I've got a video, it's titled ${talk.name} and it's by ${talk.speakers.join(',')}. Want to watch?`;

//     },

// }; // end search intent



/**
 * Function: registerIntentHandler
 * Launch of the skill
 */
const registerIntentHandler = {
    canHandle(handlerInput) {

        console.log('Launch check ', handlerInput.requestEnvelope.request);
        console.log('Intent = ', handlerInput.requestEnvelope.request.intent.name);

        // Get the number of questions asked and if 1 then go into the launch process
        //let noOfQuestions = 

        //return handlerInput.requestEnvelope.request.type === 'LaunchRequest' ||
        return handlerInput.requestEnvelope.request.intent.name === 'registerIntent' ||
            (handlerInput.requestEnvelope.request.type === 'LaunchRequest' ||
                handlerInput.requestEnvelope.request.type === 'CanFulfillIntentRequest');

    },
    async handle(handlerInput) {


        // let intro = `<speak><audio src="https://carview.s3.amazonaws.com/lYakQp6T-pre-650i-2.mp3"/></speak>`;

        // await helper.callDirectiveService(handlerInput, intro);

        const attributesManager = handlerInput.attributesManager;
        const persistentAttributes = await attributesManager.getPersistentAttributes();
        let sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes.STATE = " ";
        attributesManager.setSessionAttributes(sessionAttributes);

        // Save the time the skill was accessed
        // persistentAttributes.lastAccessTime = Date.now();
        // attributesManager.setPersistentAttributes(persistentAttributes);
        // await attributesManager.savePersistentAttributes();

        // Check if device is registered - the device id is from the request data pased to 
        // the skill
        let lDeviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
        let lRtnDeviceDetails = await utils.checkRegisteredDevice(lDeviceId);

        console.log('..Returned lRtnDeviceDetails = ', JSON.stringify(lRtnDeviceDetails));

        if (lRtnDeviceDetails.registered) {

            console.log('...Scenario 1.0 - The device is registered to the car ');

            let lVehicleInfo = await utils.getVehicleInformationById(lRtnDeviceDetails.vehicleId);

            // This car has already been registered so ask the dealer if they want to change the car registration
            speakOutput = `This device is already registered to the ${lVehicleInfo.make} ${lVehicleInfo.model}. Would you like to change the registered vehicle?`;
            sessionAttributes.STATE = 'REREGISTER_VEHICLE?';
            sessionAttributes.deviceId = lDeviceId;
            attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .withShouldEndSession(false)
                .getResponse();

            // console.log('...lVehicleInfo = ', JSON.stringify(lVehicleInfo));

            // sessionAttributes.Make = lVehicleInfo.make;
            // sessionAttributes.Model = lVehicleInfo.model;
            // sessionAttributes.location = lVehicleInfo.location;
            // sessionAttributes.vehicleInformation = lVehicleInfo;

            // persistentAttributes.Make = lVehicleInfo.make;
            // persistentAttributes.Model = lVehicleInfo.model;
            // persistentAttributes.location = lVehicleInfo.location;

            // console.log('...');

            // // Now we can speak the main menu
            // let arraySize = _.size(generalConstants.greetings.mainMenu);
            // let pos = helper.randomIntFromInterval(1, arraySize - 1);


            // speakOutput = generalConstants.greetings.mainMenu[0];

            // // replace %s and %t
            // speakOutput = _.replace(speakOutput, /%make/g, lVehicleInfo.make);
            // speakOutput = _.replace(speakOutput, /%model/g, lVehicleInfo.model);
            // console.log('..speakOutput = ', speakOutput);

            // // Save the session variables
            // attributesManager.setSessionAttributes(sessionAttributes);

            // // Save session variables to persistent storage
            // attributesManager.setPersistentAttributes(persistentAttributes);
            // attributesManager.savePersistentAttributes();

            // console.log('..Saved session attributes ', JSON.stringify(sessionAttributes));

            // // Here we are playing the intro and then waiting for the response.
            // return handlerInput.responseBuilder
            //     .speak(speakOutput)
            //     .reprompt(speakOutput)
            //     .withShouldEndSession(false)
            //     .getResponse();


        } else {
            console.log('...Scenario 1.1 - The device is not registered to the car ');


            // Scenario 1.1 - The device is not registered to the car 
            currentIntent = 'vehicleVerificationIntent';

            speakOutput = `Welcome, first things first, we need to link this device to this car.`;
            reprompt = `Welcome, let's get this device setup. What's the vehicle make and model?`;


            console.log('..');


            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'vehicleVerificationIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .speak(speakOutput)
                .getResponse();

        }
        //  default handler for speaker output
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .withShouldEndSession(false)
            .getResponse();
    }
};


/**
 * changeRegisteredVehicle - The dealer has been asked if they would like to change the registered vehicle to the device
 */
const changeRegisteredVehicle = {
    canHandle(handlerInput) {
        console.log('...Checking changeRegisteredVehicle');

        const attributesManager = handlerInput.attributesManager;
        let sessionAttributes = attributesManager.getSessionAttributes();

        return sessionAttributes.STATE === 'REREGISTER_VEHICLE?' &&
            (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent');
    },
    async handle(handlerInput) {

        console.log('...IN changeRegisteredVehicle');

        const attributesManager = handlerInput.attributesManager;
        let sessionAttributes = attributesManager.getSessionAttributes();


        if (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent') {
            // Now we need to delete the registered device entry

            await utils.removeRegisteredDevice(sessionAttributes.deviceId);

            speakOutput = `Ok, I have removed the Alexa device from the vehicle. Now lets put it into another vehicle.`;

            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'vehicleVerificationIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .speak(speakOutput)
                .getResponse();

        } else if (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent') {
            // The the dealer has agreed NOT to register the device to another vehicle

            speakOutput = `Ok, that's fine. Have a great day`;

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();
        }


    },
}

/**
 * Function: customerOnboardingIntentHandler - start the customer experience
 * customer onboarding with introduction by alexa
 * trigger utterance: Alexa ask the car to start the experience
 */
const customerOnboardingIntentHandler = {
    canHandle(handlerInput) {

        console.log('...checking customerOnboardingIntentHandler with request =', JSON.stringify(handlerInput.requestEnvelope.request));

        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
            request.intent.name === 'customerOnboardingIntent' &&
            request.dialogState == 'STARTED';

    },
    async handle(handlerInput) {

        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;

        speakOutput = generalConstants.onboardingSpeechText;

        return handlerInput.responseBuilder
            .addElicitSlotDirective('customerName')
            .speak(speakOutput)
            .reprompt(`Sorry I didn't get that, could you tell me your name?`)
            .getResponse();
    },
};

/**
 * Function: customerOnboardingIntentInProgressHandler - respond after getting the user's name
 * Scenario 1.1: The salesman has started the experience and now the user is answering their name
 * Sample utterance: NONE
 */
const customerOnboardingIntentInProgressHandler = {
    canHandle(handlerInput) {

        console.log('...checking customerOnboardingIntentInProgressHandler with request =', JSON.stringify(handlerInput.requestEnvelope.request));

        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
            request.intent.name === 'customerOnboardingIntent' &&
            request.dialogState === 'IN_PROGRESS';

    },
    async handle(handlerInput) {

        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        const attributesManager = handlerInput.attributesManager;

        let persistentAttributes = await attributesManager.getPersistentAttributes();
        console.log('..persistentAttributes = ', JSON.stringify(persistentAttributes));

        let slotValues = utils.getSlotValues(request.intent.slots);
        console.log('...slots = ', JSON.stringify(slotValues));

        // Get the vehicle information
        let lDeviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
        let lRtnDeviceDetails = await utils.checkRegisteredDevice(lDeviceId);
        let lVehicleInfo = await utils.getVehicleInformationById(lRtnDeviceDetails.vehicleId);
        console.log('...lVehicleInfo = ', JSON.stringify(lVehicleInfo));

        speakOutput = generalConstants.onboardingSpeechTextCompleted;
        speakOutput = speakOutput.replace('{slotValues.customerName.value}', slotValues.customerName.value);

        // Set the location of the vehicle
        //utils.setLocation(lVehicleInfo.vehicleId, handlerInput);

        speakOutput = _.replace(speakOutput, /%name/g, slotValues.customerName.value);
        speakOutput = _.replace(speakOutput, /%make/g, lVehicleInfo.make);
        speakOutput = _.replace(speakOutput, /%model/g, lVehicleInfo.model);

        console.log('..Now look to get the option from the user');

        return responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();
    },
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

        console.log('...IN processVehicleVerificationIntent');

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

        const lAttributesManager = handlerInput.attributesManager;
        const lPersistentAttributes = await lAttributesManager.getPersistentAttributes();
        let lSessionAttributes = lAttributesManager.getSessionAttributes();

        console.log('..IN completedVehicleVerificationHandler');

        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;

        // Get the device id
        let lDeviceId = handlerInput.requestEnvelope.context.System.device.deviceId;

        // Get the slot values
        let slotValues = utils.getSlotValues(request.intent.slots);
        console.log('...slots = ', JSON.stringify(slotValues));

        if (slotValues.carModel.value.toUpperCase() === 'DAMON') {
            slotValues.carModel.value = 'DEMO';
        }

        let vehicleMake = slotValues.carMake.value.toUpperCase();
        let vehicleModel = slotValues.carModel.value.toUpperCase();
        let country = slotValues.country.value.toUpperCase();

        // Get the vehicle ID from the vehicleDetails table
        let lVehicleInfo = await utils.getVehicleInformation(vehicleMake, vehicleModel, country);

        if (lVehicleInfo.found) {

            console.log('...lVehicleInfo = ', JSON.stringify(lVehicleInfo));

            // Register the vehcile to the device ID
            await utils.registerDeviceToVehicle(lDeviceId, lVehicleInfo.item.id);

            // Set the device id and the registered flag in the session persistent data
            lSessionAttributes.deviceId = lDeviceId;
            lSessionAttributes.vehicleId = lVehicleInfo.item.id;
            lSessionAttributes.registered = true;
            lSessionAttributes.vehicleInformation = lVehicleInfo.item;

            console.log('..Setting and saving attributes to session attributes = ', JSON.stringify(lSessionAttributes));
            lAttributesManager.setSessionAttributes(lSessionAttributes);

            console.log('..Now get the completion message');

            // Confirmation of registration
            speakOutput = generalConstants.confirmations.completeVehicleRegistration;
            speakOutput = _.replace(speakOutput, /%make/g, lVehicleInfo.item.make);
            speakOutput = _.replace(speakOutput, /%model/g, lVehicleInfo.item.model);

            console.log('....speak....', speakOutput);

            return responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();

        } else {

            speakOutput = `Unfortunately the ${vehicleMake} ${vehicleModel} does not exist, would you like to choose another make and model ?`;
            console.log(speakOutput);

            lSessionAttributes.STATE = 'RE-ENTER_MAKE_MODEL';

            // Save the session variables
            lAttributesManager.setSessionAttributes(lSessionAttributes);


            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(false)
                .getResponse();
        }

    },
};


const handleRenterMakeAndModel = {
    canHandle(handlerInput) {

        console.log('...Checking handleRenterMakeAndModel');

        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        return sessionAttributes.STATE === 'RE-ENTER_MAKE_MODEL' &&
            (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent');
    },
    async handle(handlerInput) {
        console.log('IN handleRenterMakeAndModel');

        if (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent') {
            // The user wants to re-enter the make and model

            speakOutput = 'Ok';

            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'vehicleVerificationIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .speak(speakOutput)
                .withShouldEndSession(false)
                .getResponse();


        } else {
            // End session here

            speakOutput = `Thank you, have a great day`;


            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();
        }
    },
}




/**
 * fullTourIntentHandler
 * Handle the case where the user has asked for the full tour
 * Note: The device needs to be registered to a vehicle - check the session variable
 */
const fullTourIntentHandler = {
    canHandle(handlerInput) {

        console.log('...Checking fullTourIntentHandler');
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        const request = handlerInput.requestEnvelope.request;
        return (request.type === 'IntentRequest' || request.type === 'CanFulfillIntentRequest') &&
            request.intent.name === 'fullTourIntent';
    },
    async handle(handlerInput) {

        console.log('..IN fullTourIntentHandler');
        const lAttributesManager = handlerInput.attributesManager;
        const lPersistentAttributes = await lAttributesManager.getPersistentAttributes();
        let sessionAttributes = lAttributesManager.getSessionAttributes();

        const lRequestName = handlerInput.requestEnvelope.request.intent.name;

        let lVehicleId = lPersistentAttributes.vehicleId;

        console.log('...calling getResponse with %s and %s', lVehicleId, lRequestName);

        let lRtnJson = await utils.getResponse(lVehicleId, lRequestName);

        if (lRtnJson.responseType === generalConstants.types.mp3) {
            speakOutput = generalConstants.speak.openingTag +
                generalConstants.speak.audioSrcOpen +
                lRtnJson.responseContent +
                generalConstants.speak.audioSrcClose +
                generalConstants.speak.closingTag;
        } else {
            // Normal output using standard alexa voice
            speakOutput = lRtnJson.responseContent[0].responseText;

            console.log('1..speak out will be ', speakOutput);

            // replace %make and %model if it exists in the speakOutput
            if (speakOutput.search("%make") > -1 && speakOutput.search("%model") > -1) {

                // Get the vehicle information
                let lDeviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
                let lRtnDeviceDetails = await utils.checkRegisteredDevice(lDeviceId);
                let lVehicleInfo = await utils.getVehicleInformationById(lRtnDeviceDetails.vehicleId);
                console.log('...lVehicleInfo = ', JSON.stringify(lVehicleInfo));

                speakOutput = _.replace(speakOutput, /%make/g, lVehicleInfo.make);
                speakOutput = _.replace(speakOutput, /%model/g, lVehicleInfo.model);
            }
        }

        console.log('..speak out will be ', speakOutput);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();


    },
};


/**
 * Function: inProgressVehicleVerificationHandler
 * Continue to get the next slot
 */
const seatMaterialIntentHandler = {
    canHandle(handlerInput) {

        console.log('...checking seatMaterialIntent with request =', JSON.stringify(handlerInput.requestEnvelope.request));

        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
            request.intent.name === 'seatMaterialIntent' &&
            request.dialogState !== 'COMPLETED';

    },
    async handle(handlerInput) {

        console.log('..IN seatMaterialIntentHandler');

        speakOutput = `<speak>So you're interested in these comfortable seats?  <break time="200ms"/> Let me tell you more. <break time="100ms"/>  Made from the finest <break time="100ms"/> luxurious Mocha Vernasca leather, <break time="200ms"/>this dynamic, yet uniquely comfortable seat you're sitting in, adjusts to your perfect seating position. <break time="250ms"/> By the way it's only available on the top range M Sport package. What else did you want to know about?</speak>`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();
    },
};


const generalIntentHandler = {
    canHandle(handlerInput) {

        console.log('..Checking generalIntentHandler');

        const request = handlerInput.requestEnvelope.request;

        return (request.type === 'IntentRequest' || request.type === 'CanFulfillIntentRequest') &&
            (request.intent.name === 'topSpeedIntent' ||
                request.intent.name === 'driverAssistanceIntent' ||
                request.intent.name === 'fuelConsumptionIntent' ||
                request.intent.name === 'backSeatHubIntent' ||
                request.intent.name === 'engineIntent' ||
                request.intent.name === 'efficientDynamicsIntent' ||
                request.intent.name === 'luggageCapacityIntent' ||
                request.intent.name === 'depreciationIntent' ||
                request.intent.name === 'entertainmentSystemIntent' ||
                request.intent.name === 'aerodynamicsIntent' ||
                request.intent.name === 'appleCarPlayAsStandardIntent') &&
            request.dialogState !== 'COMPLETED';
    },
    async handle(handlerInput) {

        console.log('..IN generalIntentHandler');

        const lAttributesManager = handlerInput.attributesManager;
        const lPersistentAttributes = await lAttributesManager.getPersistentAttributes();
        let sessionAttributes = lAttributesManager.getSessionAttributes();

        console.log('..IN topSpeedIntentHandler/driverAssistanceIntent/fuelConsumptionIntent');

        const lRequestName = handlerInput.requestEnvelope.request.intent.name;

        let lVehicleId = lPersistentAttributes.vehicleId;

        console.log('...calling getResponse with %s and %s', lVehicleId, lRequestName);


        let lRtnJson = await utils.getResponse(lVehicleId, lRequestName);

        // Get the category from the JSON response 
        let lCategory;
        try {
            lCategory = lRtnJson.responseContent[2].category;
        } catch (error) {
            lCategory = generalConstants.NotSet;
        }

        if (lRtnJson.responseType === generalConstants.types.mp3) {
            speakOutput = generalConstants.speak.openingTag +
                generalConstants.speak.audioSrcOpen +
                lRtnJson.responseContent[0].responseText +
                generalConstants.speak.audioSrcClose +
                lRtnJson.responseContent[1].nextIntentSpeech +
                generalConstants.speak.closingTag;
        } else {
            if (lRtnJson.responseContent[1].nextIntentSpeech === '_') {
                speakOutput = generalConstants.speak.openingTag +
                    lRtnJson.responseContent[0].responseText +
                    'What else can I tell you about?' +
                    generalConstants.speak.closingTag;
            } else {
                // Normal output using standard alexa voice
                speakOutput = generalConstants.speak.openingTag +
                    lRtnJson.responseContent[0].responseText +
                    lRtnJson.responseContent[1].nextIntentSpeech +
                    generalConstants.speak.closingTag;
            }
        }

        // Set the next intent in the ses
        sessionAttributes.nextIntent = lRtnJson.responseContent[1].nextIntent;

        // Set the mode to be followOn
        sessionAttributes.mode = generalConstants.Mode.followOn;

        // Save the session variables
        lAttributesManager.setSessionAttributes(sessionAttributes);

        console.log('..speak out will be ', speakOutput);

        // Log analytics 
        utils.logAnalytics(handlerInput, sessionAttributes.nextIntent, lCategory, sessionAttributes);

        //utils.addToUserProfile(handlerInput, lCategory, sessionAttributes);

        //speakOutput = generalConstants.answers.topSpeedIntent
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();

    },
};

/**
 * driverAssistanceIntent
 */
const driverAssistanceIntentHandler = {
    canHandle(handlerInput) {

        console.log('..Checking driverAssistanceIntentHandler');

        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
            request.intent.name === 'driverAssistanceIntent' &&
            request.dialogState !== 'COMPLETED';
    },
    async handle(handlerInput) {

        console.log('..IN driverAssistanceIntentHandler');

        const attributesManager = handlerInput.attributesManager;
        let persistentAttributes = await attributesManager.getPersistentAttributes();

        console.log('..persistentAttributes = ', JSON.stringify(persistentAttributes));

        speakOutput = generalConstants.answers.driverAssistanceIntent;

        console.log('..speakerOutput = ', JSON.stringify(speakOutput));


        speakOutput = _.replace(speakOutput, /%make/g, persistentAttributes.Make);

        console.log('..speakerOutput = ', JSON.stringify(speakOutput));
        speakOutput = _.replace(speakOutput, /%model/g, persistentAttributes.Model);

        console.log('..speakerOutput = ', JSON.stringify(speakOutput));

        console.log('..output = ', JSON.stringify(speakOutput));


        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();

    },
};



/**
 * pricePacakageIntent
 */
const pricePacakageIntentHandler = {
    canHandle(handlerInput) {

        console.log('..Checking pricePacakageIntentHandler');

        const request = handlerInput.requestEnvelope.request;

        return (request.type === 'IntentRequest' || request.type === 'CanFulfillIntentRequest') &&
            request.intent.name === 'pricePacakageIntent' &&
            request.dialogState !== 'COMPLETED';
    },
    async handle(handlerInput) {

        console.log('..IN pricePacakageIntentHandler');

        let slotValues = utils.getSlotValues(handlerInput.requestEnvelope.request.intent.slots);
        console.log('...slots = ', JSON.stringify(slotValues));

        speakOutput = _.replace(speakOutput, /%packageType/g, slotValues.packageType.value);

        speakOutput = generalConstants.answers.pricePacakageIntent;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();

    },
};


//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 



const HelpIntentHandler = {
    canHandle(handlerInput) {

        console.log('..Checking HelpIntentHandler');

        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {

        console.log('..IN HelpIntentHandler');

        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// Handle the follow on to either accept or reject the 
const followOnHandler = {
    canHandle(handlerInput) {

        console.log('...Checking followOnHandler');
        

        const attributesManager = handlerInput.attributesManager;
        let sessionAttributes = attributesManager.getSessionAttributes();
        let lMode = "";

        try {
            lMode = sessionAttributes.mode;
        } catch (error) {
            // continue
        }

        return lMode === generalConstants.Mode.followOn &&
            (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent');

    },
    async handle(handlerInput) {

        console.log('...IN followOnHandler');

        const lAttributesManager = handlerInput.attributesManager;
        const lPersistentAttributes = await lAttributesManager.getPersistentAttributes();
        let lSessionAttributes = lAttributesManager.getSessionAttributes();
        let lVehicleId = lPersistentAttributes.vehicleId;

        let lNextIntent = lSessionAttributes.nextIntent;

        // if the user accepted the suggestion intent go for it
        if (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent') {

            // Get the response information
            let lRtnJson = await utils.getResponse(lVehicleId, lNextIntent);

            // Get the category from the JSON response 
            let lCategory;
            try {
                lCategory = lRtnJson.responseContent[2].category;
            } catch (error) {
                lCategory = generalConstants.NotSet;
            }

            if (lRtnJson.responseType === generalConstants.types.mp3) {
                speakOutput = generalConstants.speak.openingTag +
                    generalConstants.speak.audioSrcOpen +
                    lRtnJson.responseContent[0].responseText +
                    generalConstants.speak.audioSrcClose +
                    lRtnJson.responseContent[1].nextIntentSpeech +
                    generalConstants.speak.closingTag;
            } else {

                if (lRtnJson.responseContent[1].nextIntentSpeech === '_') {
                    speakOutput = generalConstants.speak.openingTag +
                        lRtnJson.responseContent[0].responseText +
                        'What else can I tell you about?' +
                        generalConstants.speak.closingTag;
                } else {
                    // Normal output using standard alexa voice
                    speakOutput = generalConstants.speak.openingTag +
                        lRtnJson.responseContent[0].responseText +
                        lRtnJson.responseContent[1].nextIntentSpeech +
                        generalConstants.speak.closingTag;
                }
            }

            // Set the next intent in the ses
            lSessionAttributes.nextIntent = lRtnJson.responseContent[1].nextIntent;

            // Set the mode to be followOn
            lSessionAttributes.mode = generalConstants.Mode.followOn;


            console.log('..speak out will be ', speakOutput);

            // Log analytics 
            utils.logAnalytics(handlerInput, lNextIntent, lCategory, lSessionAttributes);


        } else {
            // ask the user what they want instead
            speakOutput = `<speak>Ok, no problem, what else can I tell you about?</speak>`;

            // Clear the modes session variable
            lSessionAttributes.mode = generalConstants.Mode.followOnOff;


        }

        // Save the session variables
        lAttributesManager.setSessionAttributes(lSessionAttributes);

        //speakOutput = generalConstants.answers.topSpeedIntent
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();


    }
};


/**
 * Function: followOnOffHandler
 * Description: When the user says no after saying no to the follow on sugesstion
 * Changes:
 */
const followOnOffHandler = {
    canHandle(handlerInput) {

        console.log('...Checking followOnOffHandler -  Intent is ', handlerInput.requestEnvelope.request.intent.name);


        const attributesManager = handlerInput.attributesManager;
        let sessionAttributes = attributesManager.getSessionAttributes();
        let lMode = "";

        try {
            lMode = sessionAttributes.mode;
        } catch (error) {
            // continue
        }

        return (lMode === generalConstants.Mode.followOnOff &&
                (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent' ||
                    handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
                    handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent')) ||
            (handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
                (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
                    handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent'));

    },
    async handle(handlerInput) {

        const lAttributesManager = handlerInput.attributesManager;
        let lSessionAttributes = lAttributesManager.getSessionAttributes();

        console.log('...IN followOnOffHandler...ask for a rating');

        // Send out a text to the sales team about the type of customer
        // await utils.findTypeOfCustomer();
        //utils.sendMessageToSalesTeam('A customer has just exited a BMW X5 who is interested in performance');

        speakOutput = `Thank you for talking with me about this. Would you like to give a rating for your experience?`;

        lSessionAttributes.STATE = 'RATING_QUESTION';
        lAttributesManager.setSessionAttributes(lSessionAttributes);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();

    }
}

const ratingQuestionHandler = {
    canHandle(handlerInput) {

        console.log('...Checking ratingQuestionHandler');

        const lAttributesManager = handlerInput.attributesManager;
        let lSessionAttributes = lAttributesManager.getSessionAttributes();

        return lSessionAttributes.STATE === 'RATING_QUESTION' &&
            (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent');
    },
    handle(handlerInput) {

        console.log('...IN ratingQuestionHandler');

        const lAttributesManager = handlerInput.attributesManager;
        let lSessionAttributes = lAttributesManager.getSessionAttributes();

        // If the user has accepted the rating question
        if (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent') {

            lSessionAttributes.STATE = " ";
            lAttributesManager.setSessionAttributes(lSessionAttributes);

            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'RatingIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .speak(speakOutput)
                .withShouldEndSession(false)
                .getResponse();

        } else {
            // The user has declined to give a rating

            speakOutput = `Not a problem, thank you for using CarSay and have a great day`;

            lSessionAttributes.STATE = " ";
            lAttributesManager.setSessionAttributes(lSessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();

        }
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {

        console.log('..Checking SessionEndedRequestHandler');

        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {

        console.log('..IN SessionEndedRequestHandler');

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

        console.log('..Checking IntentReflectorHandler');

        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    async handle(handlerInput) {


        console.log('..IN IntentReflectorHandler');
        // const intentName = handlerInput.requestEnvelope.request.intent.name;
        // const speakOutput = `You just triggered ${intentName}`;

        // return handlerInput.responseBuilder
        //     .speak(speakOutput)
        //     //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
        //     .getResponse();

        const responseBuilder = handlerInput.responseBuilder;
        const attributesManager = handlerInput.attributesManager;
        const persistentAttributes = await attributesManager.getPersistentAttributes();
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        // Randomly get a fact about the car
        let lRandomCarFacts = await utils.getRandomCarFacts(sessionAttributes);

        // Get the number of the responses
        let lResponseSize = _.size(lRandomCarFacts);

        // Choose one of the random facts to speak
        let lIndex = _.random(0, lResponseSize);

        console.log('index = ', lIndex);

        if (lIndex == 0) {
            speakOutput = lRandomCarFacts[lIndex].factText;
        } else {
            speakOutput = lRandomCarFacts[lIndex - 1].factText;
        }

        return responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .withShouldEndSession(false)
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
/**
 * Fallback Intent Handler
 * Handles when the user has asked something that is not in the model
 */
const FallbackHandler = {
    canHandle(handlerInput) {

        console.log('..Checking FallbackHandler');

        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' &&
            request.intent.name ===
            'AMAZON.FallbackIntent';
    },
    async handle(handlerInput) {

        console.log('..IN FallbackHandler');

        const responseBuilder = handlerInput.responseBuilder;
        const attributesManager = handlerInput.attributesManager;
        const persistentAttributes = await attributesManager.getPersistentAttributes();
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        // Randomly get a fact about the car
        let lRandomCarFacts = await utils.getRandomCarFacts(sessionAttributes);

        // Get the number of the responses
        let lResponseSize = _.size(lRandomCarFacts);

        // Choose one of the random facts to speak
        let lIndex = _.random(0, lResponseSize);

        speak = lRandomCarFacts[lIndex].factText;

        return responseBuilder
            .speak(speak)
            .reprompt(speak)
            .getResponse();
    },
};



// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        changeRegisteredVehicle,
        handleRenterMakeAndModel,
        registerIntentHandler,
        FallbackHandler,
        //LaunchRequestHandler,
        //searchIntentHandler,
        generalIntentHandler,
        fullTourIntentHandler,
        customerOnboardingIntentHandler,
        customerOnboardingIntentInProgressHandler,
        completedVehicleVerificationHandler,
        inProgressVehicleVerificationHandler,
        seatMaterialIntentHandler,
        menuOptionIntentHandlers.configureCarIntentHandler,
        menuOptionIntentHandlers.askQuestionIntentHandler,
        menuOptionIntentHandlers.RatingIntentHandler,
        //topSpeedIntentHandler,
        //driverAssistanceIntentHandler,
        //fuelConsumptionIntentHandler,
        //efficientDynamicsIntentHandler,
        //luggageCapacityIntentHandler,
        menuOptionIntentHandlers.questionIntentHandler,
        ratingQuestionHandler,
        HelpIntentHandler,
        SessionEndedRequestHandler,
        followOnHandler,
        followOnOffHandler,
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
    .addRequestInterceptors(utils.PersistenceRequestInterceptor,
        utils.processNumberOfQuestions)
    .addResponseInterceptors(utils.PersistenceResponseInterceptor)
    .withPersistenceAdapter(persistenceAdapter)
    .lambda();