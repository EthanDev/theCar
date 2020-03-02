const Alexa = require('ask-sdk');
var _ = require('lodash');
const lookup = require('country-code-lookup');
const algoliasearch = require('algoliasearch');

const ALGOLIA_APP_ID = `5TTBLP003O`;
const ALGOLIA_API_KEY = `22b9df67712d6646fa290c7f4842b0c7`;

const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
const index = algolia.initIndex('talk-search');


const utils = require('./util');
const generalConstants = require('./constants/general');
const helper = require('./helperFunctions');
const menuOptionIntentHandlers = require('./menuOptionIntents');

var persistenceAdapter, reprompt, speakOutput, currentIntent, sessionAttributes, persistentAttributes, attributesManager;



// IMPORTANT: don't forget to give DynamoDB access to the role you're to run this lambda (IAM)
const {
    DynamoDbPersistenceAdapter
} = require('ask-sdk-dynamodb-persistence-adapter');

persistenceAdapter = new DynamoDbPersistenceAdapter({
    tableName: 'carViewUsers',
    createTable: true
});

/**
 * Function: launchHandler
 * Launch of the skill
 */
const launchHandler = {
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

        attributesManager = handlerInput.attributesManager;
        persistentAttributes = await attributesManager.getPersistentAttributes();
        sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes.STATE = " ";
        attributesManager.setSessionAttributes(sessionAttributes);

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


        } else {
            console.log('...Scenario 1.1 - The device is not registered to the car ');


            // Scenario 1.1 - The device is not registered to the car 
            currentIntent = 'vehicleVerificationIntent';

            speakOutput = `<speak><audio src="https://carsay.s3.amazonaws.com/carsay_intro.mp3" />Welcome, first things first, we need to link this device to this car.</speak>`;
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
    }
};


/**
 * changeRegisteredVehicle - The dealer has been asked if they would like to change the registered vehicle to the device
 */
const changeRegisteredVehicle = {
    canHandle(handlerInput) {
        console.log('...Checking changeRegisteredVehicle');

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        return sessionAttributes.STATE === 'REREGISTER_VEHICLE?' &&
            (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent');
    },
    async handle(handlerInput) {

        console.log('...IN changeRegisteredVehicle');

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();


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
 * handleSuggestedNextQuestion - Handle the user accepting the suggested next question
 */
const handleSuggestedNextQuestion = {
    canHandle(handlerInput) {

        console.log('...checking handleSuggestedNextQuestion ');

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        return sessionAttributes.STATE === generalConstants.suggestedIntentState &&
            handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';

    },
    async handle(handlerInput) {

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();
        persistentAttributes = await attributesManager.getPersistentAttributes();

        console.log('...IN handleSuggestedNextQuestion with intent', sessionAttributes.suggestedNextIntent);

        // Check if this car is registered or not, if it IS then return an error message to the user
        // and end the session
        let lRtnJson = await utils.checkRegisteredDevice(handlerInput.requestEnvelope.context.System.device.deviceId);
        if (!lRtnJson.registered) {
            console.log('---ERROR---');
            console.log('Device is not setup against a vehicle');
            console.log('-----------');


            speakOutput = generalConstants.errors.alreadyRegistered;

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();
        }

        let lVehicleId = persistentAttributes.vehicleId;
        let lRequestName = sessionAttributes.suggestedNextIntent;

        console.log('...calling getResponse with %s and %s', lVehicleId, lRequestName);

        lRtnJson = await utils.getResponse(lVehicleId, lRequestName);

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

        // clear the STATE
        sessionAttributes.STATE = "";

        // Save the session variables
        attributesManager.setSessionAttributes(sessionAttributes);

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
 * reRegisterIntent
 * Handle the fact that the user wants to change the make and model of the linked vehicle
 */
const reRegisterIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'RE_REGISTER_INTENT';
    },
    async handle(handlerInput) {

        console.log('...IN reRegisterIntent');

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        // Now we need to delete the registered device entry
        let lDeviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
        await utils.removeRegisteredDevice(lDeviceId);

        speakOutput = `Ok, I have removed the Alexa device from the vehicle. Now lets put it into another vehicle.`;

        return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'vehicleVerificationIntent',
                confirmationStatus: 'NONE',
                slots: {}
            })
            .speak(speakOutput)
            .getResponse();

    }
};

/**
 * handleAcceptDemoCarIntent - Handle when the user accepts the demo car after not finding the vehicle in 
 * from the initial setup attempt
 */
const handleAcceptDemoCarIntent = {
    canHandle(handlerInput) {

        console.log('...Checking handleAcceptDemoCarIntent');

        sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const request = handlerInput.requestEnvelope.request;

        return sessionAttributes.STATE === 'RE-ENTER_MAKE_MODEL' &&
            request.intent.name === 'acceptDemoCar';

    },
    async handle(handlerInput) {
        console.log('IN handleAcceptDemoCarIntent');

        let vehicleMake, vehicleModel, country;


        const responseBuilder = handlerInput.responseBuilder;
        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        country = sessionAttributes.country;

        // Clear the STATE 
        sessionAttributes.STATE = "";

        // Get the device id
        let deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;

        // Set the make and model to 'DEMO'
        vehicleMake = generalConstants.demo.make;
        vehicleModel = generalConstants.demo.model;

        // Get the vehicle information from the vehicleDetails table
        let vehicleInfo = await utils.getVehicleInformation(vehicleMake, vehicleModel, country);

        console.log('...lVehicleInfo = ', JSON.stringify(vehicleInfo));

        // Register the vehcile to the device ID
        utils.registerDeviceToVehicle(deviceId, vehicleInfo.item.id);

        // Set the device id and the registered flag in the session persistent data
        sessionAttributes.deviceId = deviceId;
        sessionAttributes.vehicleId = vehicleInfo.item.id;
        sessionAttributes.registered = true;
        sessionAttributes.vehicleInformation = vehicleInfo.item;

        console.log('..Setting and saving attributes to session attributes = ', JSON.stringify(sessionAttributes));
        attributesManager.setSessionAttributes(sessionAttributes);

        console.log('..Now get the completion message - Confirmation of registration');

        // Confirmation of registration
        speakOutput = generalConstants.confirmations.completeVehicleRegistration;
        speakOutput = _.replace(speakOutput, /%make/g, vehicleInfo.item.make);
        speakOutput = _.replace(speakOutput, /%model/g, vehicleInfo.item.model);

        console.log('....speak....', speakOutput);

        return responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();


    }
};

/**
 * handleRenterMakeAndModel
 * - Handle if the user accepts to re-enter the make and model or not
 */
const handleRenterMakeAndModel = {
    canHandle(handlerInput) {

        console.log('...Checking handleRenterMakeAndModel');

        sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

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
};

/**
 * fallBackHandler - Fallback Intent Handler
 * Handles when the user has asked something that is not in the model
 */
const fallBackHandler = {
    canHandle(handlerInput) {

        console.log('..Checking FallbackHandler');

        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' &&
            request.intent.name ===
            'AMAZON.FallbackIntent';
    },
    async handle(handlerInput) {

        console.log('..IN FallbackHandler');

        let lRtnJson = await utils.checkRegisteredDevice(handlerInput.requestEnvelope.context.System.device.deviceId);
        if (!lRtnJson.registered) {
            console.log('---ERROR---');
            console.log('Device is not setup against a vehicle');
            console.log('-----------');

            speakOutput = generalConstants.errors.alreadyRegistered;

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();
        }

        const responseBuilder = handlerInput.responseBuilder;
        attributesManager = handlerInput.attributesManager;
        persistentAttributes = await attributesManager.getPersistentAttributes();
        sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        sessionAttributes.mode = generalConstants.Mode.followOn;
        // Save the session variables
        attributesManager.setSessionAttributes(sessionAttributes);

        // Randomly get a fact about the car
        let lRandomCarFacts = await utils.getRandomCarFacts(sessionAttributes);

        // Get the number of the responses
        let lResponseSize = _.size(lRandomCarFacts) - 1;

        // Choose one of the random facts to speak
        let lIndex = _.random(0, lResponseSize);

        speak = lRandomCarFacts[lIndex].factText;

        return responseBuilder
            .speak(speak)
            .reprompt(speak)
            .getResponse();
    },
};

/**
 * generalIntentHandler
 * Handle the general questions
 */
const generalIntentHandler = {
    canHandle(handlerInput) {

        console.log('..Checking generalIntentHandler');

        const request = handlerInput.requestEnvelope.request;

        return (request.type === 'IntentRequest' || request.type === 'CanFulfillIntentRequest') &&
            generalConstants.randomFactsIntents.includes(request.intent.name) &&
            request.dialogState !== 'COMPLETED';
    },
    async handle(handlerInput) {

        console.log('..IN generalIntentHandler');

        // Check if this car is registered or not, if it IS then return an error message to the user
        // and end the session
        let lRtnJson = await utils.checkRegisteredDevice(handlerInput.requestEnvelope.context.System.device.deviceId);
        if (!lRtnJson.registered) {
            console.log('---ERROR---');
            console.log('Device is not setup against a vehicle');
            console.log('-----------');


            speakOutput = generalConstants.errors.alreadyRegistered;

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();
        }

        attributesManager = handlerInput.attributesManager;
        persistentAttributes = await attributesManager.getPersistentAttributes();
        sessionAttributes = attributesManager.getSessionAttributes();

        console.log('..IN generalIntentHandler');

        const lRequestName = handlerInput.requestEnvelope.request.intent.name;

        let lVehicleId = persistentAttributes.vehicleId;

        console.log('...calling getResponse with %s and %s', lVehicleId, lRequestName);


        lRtnJson = await utils.getResponse(lVehicleId, lRequestName);

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
        attributesManager.setSessionAttributes(sessionAttributes);

        console.log('..speak out will be ', speakOutput);

        // Log analytics 
        utils.logAnalytics(handlerInput, sessionAttributes.nextIntent, lCategory, sessionAttributes);

        //utils.addToUserProfile(handlerInput, lCategory, sessionAttributes);

        //speakOutput = generalConstants.answers.topSpeedIntent
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
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

        console.log('...Checking fullTourIntentHandler', handlerInput.requestEnvelope.request);

        const request = handlerInput.requestEnvelope.request;
        console.log('...request intent name ==== ', request.intent.name);
        console.log('...type = ', request.type);

        // let lanswer = request.intent.name ==='fullTourIntent' &&  request.type ==='IntentRequest';
        // console.log(lanswer);
        
        // return lanswer;
        
        // return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        //  && Alexa.getIntentName(handlerInput.requestEnvelope) === 'fullTourIntent';


        return true;
    },
    async handle(handlerInput) {

        console.log('..IN fullTourIntentHandler');

        let lRtnJson = await utils.checkRegisteredDevice(handlerInput.requestEnvelope.context.System.device.deviceId);
        if (!lRtnJson.registered) {
            console.log('---ERROR---');
            console.log('Device is not setup against a vehicle');
            console.log('-----------');

            speakOutput = generalConstants.errors.alreadyRegistered;

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();
        }


        attributesManager = handlerInput.attributesManager;
        persistentAttributes = await attributesManager.getPersistentAttributes();
        sessionAttributes = attributesManager.getSessionAttributes();

        let lVehicleId = persistentAttributes.vehicleId;

        console.log('...calling getFullTour with %s', lVehicleId);

        lRtnJson = await utils.getFullTour(lVehicleId);

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


        console.log('..speak out will be ', speakOutput);

        // Log analytics 
        utils.logAnalytics(handlerInput, lNextIntent, lCategory, sessionAttributes);


        // Save the session variables
        attributesManager.setSessionAttributes(sessionAttributes);

        console.log('...session saved ', JSON.stringify(sessionAttributes));


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

        //speakOutput = generalConstants.answers.topSpeedIntent
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();

        //---------


        // console.log('1..speak out will be ', speakOutput);

        // // replace %make and %model if it exists in the speakOutput
        // if (speakOutput.search("%make") > -1 && speakOutput.search("%model") > -1) {

        //     // Get the vehicle information
        //     let lDeviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
        //     let lRtnDeviceDetails = await utils.checkRegisteredDevice(lDeviceId);
        //     let lVehicleInfo = await utils.getVehicleInformationById(lRtnDeviceDetails.vehicleId);
        //     console.log('...lVehicleInfo = ', JSON.stringify(lVehicleInfo));

        //     speakOutput = _.replace(speakOutput, /%make/g, lVehicleInfo.make);
        //     speakOutput = _.replace(speakOutput, /%model/g, lVehicleInfo.model);
        // }


        // // Now we need to output the suggested next question and set the session 
        // // variable

        // // Now get the suggested intent
        // let suggestedIntentSize = _.size(generalConstants.randomFactsIntents) - 1;
        // let suggestedIntentPos = _.random(0, suggestedIntentSize);
        // let suggestedIntent = generalConstants.randomFactsIntents[suggestedIntentPos];

        // console.log('...save the suggestedIntent as', suggestedIntent);


        // sessionAttributes.suggestedNextIntent = suggestedIntent;
        // sessionAttributes.STATE = generalConstants.suggestedIntentState;

        // attributesManager.setSessionAttributes(sessionAttributes);

        // speakOutput = speakOutput + generalConstants.suggestedIntents[suggestedIntent];

        // console.log('... full tour + suggested intent speakOutput = ', speakOutput);


        // return handlerInput.responseBuilder
        //     .speak(speakOutput)
        //     .withShouldEndSession(false)
        //     .getResponse();
    },
};

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
        attributesManager = handlerInput.attributesManager;

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

        attributesManager = handlerInput.attributesManager;
        persistentAttributes = await attributesManager.getPersistentAttributes();
        sessionAttributes = attributesManager.getSessionAttributes();

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

        if (country === 'UNITED KINGDOM' ||
            country === 'ENGLAND' ||
            country === 'GREAT BRITAIN') {
            country = 'UK';
        }

        if (country === 'NEW ZEALAND') {
            country = 'NZ';
        }

        // Save the country away so that we do not ask for it again
        sessionAttributes.country = country;
        attributesManager.setSessionAttributes(sessionAttributes);

        // Get the vehicle ID from the vehicleDetails table
        let lVehicleInfo = await utils.getVehicleInformation(vehicleMake, vehicleModel, country);

        if (lVehicleInfo.found) {

            console.log('...lVehicleInfo = ', JSON.stringify(lVehicleInfo));

            // Register the vehcile to the device ID
            await utils.registerDeviceToVehicle(lDeviceId, lVehicleInfo.item.id);

            // Set the device id and the registered flag in the session persistent data
            sessionAttributes.deviceId = lDeviceId;
            sessionAttributes.vehicleId = lVehicleInfo.item.id;
            sessionAttributes.registered = true;
            sessionAttributes.vehicleInformation = lVehicleInfo.item;

            console.log('..Setting and saving attributes to session attributes = ', JSON.stringify(sessionAttributes));
            attributesManager.setSessionAttributes(sessionAttributes);

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


            speakOutput = `Unfortunately the ${vehicleMake} ${vehicleModel} does not exist, would you like to choose another make and model ?, or maybe you'd like the demo car?`;
            console.log(speakOutput);

            sessionAttributes.STATE = 'RE-ENTER_MAKE_MODEL';

            // Save the session variables
            attributesManager.setSessionAttributes(sessionAttributes);


            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(false)
                .getResponse();
        }

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

        currentIntent = handlerInput.requestEnvelope.request.name;

        return handlerInput.responseBuilder
            .addDelegateDirective(currentIntent)
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

/**
 * ratingQuestionHandler - Handle the asking for a rating
 */
const ratingQuestionHandler = {
    canHandle(handlerInput) {

        console.log('...Checking ratingQuestionHandler');

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        return sessionAttributes.STATE === 'RATING_QUESTION' &&
            (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent');
    },
    handle(handlerInput) {

        console.log('...IN ratingQuestionHandler');

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        // If the user has accepted the rating question
        if (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent') {

            sessionAttributes.STATE = " ";
            attributesManager.setSessionAttributes(sessionAttributes);

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

            sessionAttributes.STATE = " ";
            attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();

        }
    }
};

/**
 * HelpIntentHandler - Handle when 
 */
const HelpIntentHandler = {
    canHandle(handlerInput) {

        console.log('..Checking HelpIntentHandler');

        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {

        console.log('..IN HelpIntentHandler');

        const speakOutput = '<speak>You can ask me a question about this vehicle and I will try my best to answer. What would you like to know about this vehicle?</speak>';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
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


        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();
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

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        console.log('...IN followOnOffHandler...ask for a rating');

        // Send out a text to the sales team about the type of customer
        // await utils.findTypeOfCustomer();
        //utils.sendMessageToSalesTeam('A customer has just exited a BMW X5 who is interested in performance');

        speakOutput = `Thank you for talking with me about this ${sessionAttributes.vehicleInformation.make}`;


        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();

    }
};

// Handle the follow on to either accept or reject the suggested question
const followOnHandler = {
    canHandle(handlerInput) {

        console.log('...Checking followOnHandler');


        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();
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

        attributesManager = handlerInput.attributesManager;
        persistentAttributes = await attributesManager.getPersistentAttributes();
        sessionAttributes = attributesManager.getSessionAttributes();

        console.log('...session attributes = ', JSON.stringify(sessionAttributes));
        console.log('...persistent attributes = ', JSON.stringify(persistentAttributes));


        let lVehicleId = persistentAttributes.vehicleId;

        let lNextIntent = sessionAttributes.nextIntent;

        // if the user accepted the suggestion intent go for it
        if (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent') {

            console.log('...user chose to accept the follow on suggestion');


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
            sessionAttributes.nextIntent = lRtnJson.responseContent[1].nextIntent;

            // Set the mode to be followOn
            sessionAttributes.mode = generalConstants.Mode.followOn;


            console.log('..speak out will be ', speakOutput);

            // Log analytics 
            utils.logAnalytics(handlerInput, lNextIntent, lCategory, sessionAttributes);


        } else {

            console.log('...user chose NOT to accept the follow on suggestion');

            // ask the user what they want instead
            speakOutput = `<speak>Ok, no problem, thank you and have a great day!</speak>`;


            return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();

            // Clear the modes session variable
            //sessionAttributes.mode = generalConstants.Mode.followOnOff;


        }

        // Save the session variables
        attributesManager.setSessionAttributes(sessionAttributes);

        console.log('...session saved ', JSON.stringify(sessionAttributes));


        //speakOutput = generalConstants.answers.topSpeedIntent
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();


    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {

        console.log('..Checking IntentReflectorHandler');

        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    async handle(handlerInput) {


        console.log('..IN IntentReflectorHandler');


        const responseBuilder = handlerInput.responseBuilder;
        attributesManager = handlerInput.attributesManager;
        persistentAttributes = await attributesManager.getPersistentAttributes();
        sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        // Randomly get a fact about the car
        let lRandomCarFacts = await utils.getRandomCarFacts(sessionAttributes);

        // Get the number of the responses
        let lResponseSize = _.size(lRandomCarFacts) - 1;

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



module.exports = {
    launchHandler,
    changeRegisteredVehicle,
    handleSuggestedNextQuestion,
    reRegisterIntentHandler,
    handleAcceptDemoCarIntent,
    handleRenterMakeAndModel,
    fallBackHandler,
    generalIntentHandler,
    fullTourIntentHandler,
    customerOnboardingIntentHandler,
    customerOnboardingIntentInProgressHandler,
    completedVehicleVerificationHandler,
    inProgressVehicleVerificationHandler,
    seatMaterialIntentHandler,
    ratingQuestionHandler,
    HelpIntentHandler,
    followOnOffHandler,
    followOnHandler,
    IntentReflectorHandler,
    ErrorHandler,
    SessionEndedRequestHandler
}