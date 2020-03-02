const Alexa = require('ask-sdk');
var _ = require('lodash');


const utils = require('./util');
const generalConstants = require('./constants/general');
const helper = require('./helperFunctions');
const menuOptionIntentHandlers = require('./menuOptionIntents');


// Global variables
let speakOutput, sessionAttributes;





/**
 * Function: customerOnboardingIntentHandler - start the customer experience
 * customer onboarding with introduction by alexa
 * trigger utterance: Alexa ask the car to start the experience
 */
const customerOnboardingIntentHandler = {
    canHandle(handlerInput) {

        console.log('...checking customerOnboardingIntentHandler');

        return Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.CUSTOMER_ONBOARDING_INTENT &&
            Alexa.getDialogState(handlerInput.requestEnvelope) == generalConstants.DIALOG_STATE.STARTED;

    },
    async handle(handlerInput) {

        // Check if the device has been registered to a make and model
        let lDeviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);
        let lRtnJson = await utils.checkRegisteredDevice(lDeviceId);

        if (!lRtnJson.registered) {

            console.log('---ERROR---');
            console.log('Device is not setup against a vehicle');
            console.log('-----------');

            speakOutput = generalConstants.errors.alreadyRegistered;

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();

        } else {

            // The device is setup and registered

            let customerName = Alexa.getSlotValue(handlerInput.requestEnvelope, 'customerName');

            if (customerName != null) {

                // The customer name has been said so just comtinue to onboard *WITHOUT* asking for the
                // customer name

                speakOutput = generalConstants.onboardingSpeechTextCompletedName;
                speakOutput = speakOutput.replace('{slotValues.customerName.value}', customerName);
                speakOutput = _.replace(speakOutput, /%name/g, customerName);

                // Get the vehicle information
                let lVehicleInfo = await utils.getVehicleInformationById(lRtnJson.vehicleId);

                speakOutput = _.replace(speakOutput, /%make/g, lVehicleInfo.make);
                speakOutput = _.replace(speakOutput, /%model/g, lVehicleInfo.model);

                // Set the session state here to CUSTOMER_EXPERIENCE
                await utils.setSessionState(handlerInput, generalConstants.STATE.CUSTOMER_EXPERIENCE);

            } else {

                // Ask for the customer's name
                speakOutput = generalConstants.onboardingSpeechText;
                await utils.setSessionState(handlerInput, generalConstants.STATE.CUSTOMER_ONBOARDING);
            }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(`Sorry I didn't get that`)
                .getResponse();
        }
    },
};


/**
 * customerOnboardingIntent_RejectName_Handler
 * - Handle when the user has rejected giving their name when pronpted
 */
const customerOnboardingIntent_RejectName_Handler = {
    canHandle(handlerInput) {

        console.log('...checking customerOnboardingIntent_RejectName_Handler...');

        return utils.getSessionState(handlerInput) === generalConstants.STATE.CUSTOMER_ONBOARDING &&
            Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST &&
            (Alexa.getIntentName(handleHelpIntent.requestEnvelope) === generalConstants.INTENTS.AMAZON_NO);

    },
    async handle(handlerInput) {

        console.log('> IN customerOnboardingIntent_RejectName_Handler');

        speakOutput = generalConstants.onboardingSpeechTextCompleted_NO_NAME;

        // Get the vehicle information
        let lDeviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);
        let lRtnDeviceDetails = await utils.checkRegisteredDevice(lDeviceId);
        let lVehicleInfo = await utils.getVehicleInformationById(lRtnDeviceDetails.vehicleId);

        speakOutput = _.replace(speakOutput, /%make/g, lVehicleInfo.make);
        speakOutput = _.replace(speakOutput, /%model/g, lVehicleInfo.model);

        // Set the session state here to CUSTOMER_EXPERIENCE
        await utils.setSessionState(handlerInput, generalConstants.STATE.CUSTOMER_EXPERIENCE);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(`Sorry I didn't get that, what would you like to do? ask me a question? or maybe you want me to guide you through a full tour of this vehicle?`)
            .getResponse();

    },
};


/**
 * Function: customerOnboarding_NAME_GIVEN_Intent - respond after getting the user's name
 * Scenario 1.1: The salesman has started the experience and now the user is answering their name
 * Sample utterance: NONE
 */
const customerOnboarding_NAME_GIVEN_Intent = {
    canHandle(handlerInput) {

        console.log('...checking customerOnboarding_NAME_GIVEN_Intent ');

        return utils.getSessionState(handlerInput) === generalConstants.STATE.CUSTOMER_ONBOARDING &&
            Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.PROVIDED_CUSTOMER_NAME;

    },
    async handle(handlerInput) {

        console.log('>...IN customerOnboarding_NAME_GIVEN_Intent');

        const responseBuilder = handlerInput.responseBuilder;

        let customerName = Alexa.getSlotValue(handlerInput.requestEnvelope, 'customerName');


        speakOutput = generalConstants.onboardingSpeechTextCompletedName;
        speakOutput = speakOutput.replace('{slotValues.customerName.value}', customerName);
        speakOutput = _.replace(speakOutput, /%name/g, customerName);



        // Get the vehicle information
        let lDeviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);
        let lRtnDeviceDetails = await utils.checkRegisteredDevice(lDeviceId);
        let lVehicleInfo = await utils.getVehicleInformationById(lRtnDeviceDetails.vehicleId);

        speakOutput = _.replace(speakOutput, /%make/g, lVehicleInfo.make);
        speakOutput = _.replace(speakOutput, /%model/g, lVehicleInfo.model);

        // Set the session state here to CUSTOMER_EXPERIENCE
        await utils.setSessionState(handlerInput, generalConstants.STATE.CUSTOMER_EXPERIENCE);

        //sessionAttributes.CUSTOMER_NAME = customerName;
        //utils.setSessionAttributes(handlerInput, sessionAttributes);

        return responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();
    },
};


/**
 * fullTourIntentHandler
 * Handle the case where the user has asked for the full tour
 * Note: The device needs to be registered to a vehicle - check the session variable
 */
const fullTourIntentHandler = {
    canHandle(handlerInput) {

        console.log('...Checking fullTourIntentHandler');
        return Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.FULL_TOUR;
    },
    async handle(handlerInput) {

        console.log('..IN fullTourIntentHandler');

        let lRtnJson = await utils.checkRegisteredDevice(Alexa.getDeviceId(handlerInput.requestEnvelope));
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
        sessionAttributes = await utils.getSessionAttributes(handlerInput);

        const lRequestName = Alexa.getIntentName(handlerInput.requestEnvelope);

        let lVehicleId = persistentAttributes.vehicleId;

        console.log('...calling getResponse with %s and %s', lVehicleId, lRequestName);

        lRtnJson = await utils.getResponse(lVehicleId, lRequestName);

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
                let lDeviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);
                let lRtnDeviceDetails = await utils.checkRegisteredDevice(lDeviceId);
                let lVehicleInfo = await utils.getVehicleInformationById(lRtnDeviceDetails.vehicleId);
                console.log('...lVehicleInfo = ', JSON.stringify(lVehicleInfo));

                speakOutput = _.replace(speakOutput, /%make/g, lVehicleInfo.make);
                speakOutput = _.replace(speakOutput, /%model/g, lVehicleInfo.model);
            }
        }

        // Now we need to output the suggested next question and set the session 
        // variable

        // Now get the suggested intent
        let suggestedIntentSize = _.size(generalConstants.randomFactsIntents) - 1;
        let suggestedIntentPos = _.random(0, suggestedIntentSize);
        let suggestedIntent = generalConstants.randomFactsIntents[suggestedIntentPos];

        console.log('...save the suggestedIntent as', suggestedIntent);


        sessionAttributes.suggestedNextIntent = suggestedIntent;
        sessionAttributes.STATE = generalConstants.suggestedIntentState;

        //Save session attributes
        await utils.setSessionAttributes(handlerInput, sessionAttributes);

        speakOutput = speakOutput + generalConstants.suggestedIntents[suggestedIntent];

        console.log('... full tour + suggested intent speakOutput = ', speakOutput);


        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();
    },
};

/**
 * handleHelpIntent
 * - When in the customer onboarding experience the user can ask for help
 *   after being prompted with the options of what to do
 */
var handleHelpIntent = {
    canHandle(handlerInput) {

        console.log('...checking handleHelpIntent...');


        return utils.getSessionState(handlerInput) === generalConstants.STATE.CUSTOMER_EXPERIENCE &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_HELP;

    },
    async handle(handlerInput) {

        speakOutput = generalConstants.speak.openingTag +
            generalConstants.RESPONSES.HANDLE_HELP_INTENT.UTTERANCE +
            generalConstants.speak.break_short +
            generalConstants.RESPONSES.HANDLE_HELP_INTENT.PROMOPT +
            generalConstants.speak.closingTag;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();

    },
}

module.exports = {
    customerOnboarding_NAME_GIVEN_Intent,
    customerOnboardingIntentHandler,
    fullTourIntentHandler,
    handleHelpIntent,
    customerOnboardingIntent_RejectName_Handler

}