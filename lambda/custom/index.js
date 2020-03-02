// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk');
var persistenceAdapter;
var _ = require('lodash');
const lookup = require('country-code-lookup');

const ALGOLIA_APP_ID = `5TTBLP003O`;
const ALGOLIA_API_KEY = `22b9df67712d6646fa290c7f4842b0c7`;

const algoliasearch = require('algoliasearch');
const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
const index = algolia.initIndex('talk-search');

const utils = require('./util');
//const handlers = require('./handlers');
const generalConstants = require('./constants/general');
const helper = require('./helperFunctions');
const menuOptionIntentHandlers = require('./menuOptionIntents');
const customerOnboardingHandler = require('./customerOnboardings');
const registrationHandler = require('./registrationHandler');
const requestInterceptor = require('./interceptors/request');

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
let reprompt, speakOutput, currentIntent, sessionAttributes, attributesManager;



/**
 * Function: seatMaterialIntentHandler
 * Continue to get the next slot
 */
const seatMaterialIntentHandler = {
    canHandle(handlerInput) {

        console.log('...checking seatMaterialIntent');

        const request = handlerInput.requestEnvelope.request;

        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'seatMaterialIntent' &&
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
 * generalIntentHandler
 * Handle the general questions
 */
const generalIntentHandler = {
    canHandle(handlerInput) {

        console.log('..Checking generalIntentHandler');

        const request = handlerInput.requestEnvelope.request;

        return (Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST || Alexa.getRequestType(handlerInput.requestEnvelope) === 'CanFulfillIntentRequest') &&
            generalConstants.randomFactsIntents.includes(Alexa.getIntentName(handlerInput.requestEnvelope)) &&
            request.dialogState !== generalConstants.DIALOG_STATE.COMPLETED;
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
        sessionAttributes = attributesManager.getSessionAttributes();

        console.log('..IN generalIntentHandler');

        let lRegistrationInfo = await utils.checkRegisteredDevice(Alexa.getDeviceId(handlerInput.requestEnvelope));

        const lRequestName = Alexa.getIntentName(handlerInput.requestEnvelope);

        let lVehicleId = lRegistrationInfo.vehicleId;

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
        await utils.setSessionAttributes(handlerInput, sessionAttributes);

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
 * handleSuggestedNextQuestion - Handle the user accepting the suggested next question
 */
const handleSuggestedNextQuestion = {
    canHandle(handlerInput) {

        console.log('...checking handleSuggestedNextQuestion ');

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        return sessionAttributes.STATE === generalConstants.suggestedIntentState &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent';

    },
    async handle(handlerInput) {

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        let lRegistrationInfo = await utils.checkRegisteredDevice(Alexa.getDeviceId(handlerInput.requestEnvelope));

        console.log('...IN handleSuggestedNextQuestion with intent', sessionAttributes.suggestedNextIntent);

        // Check if this car is registered or not, if it IS then return an error message to the user
        // and end the session
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

        let lVehicleId = lRegistrationInfo.vehicleId;
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
        await utils.setSessionAttributes(handlerInput, sessionAttributes);

        console.log('..speak out will be ', speakOutput);

        // Log analytics 
        //utils.logAnalytics(handlerInput, sessionAttributes.nextIntent, lCategory, sessionAttributes);

        //utils.addToUserProfile(handlerInput, lCategory, sessionAttributes);

        //speakOutput = generalConstants.answers.topSpeedIntent
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();

    },
}


//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 



const HelpIntentHandler = {
    canHandle(handlerInput) {

        console.log('..Checking HelpIntentHandler');

        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
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


        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();
        let lMode = "";

        try {
            lMode = sessionAttributes.mode;
        } catch (error) {
            // continue
        }

        return lMode === generalConstants.Mode.followOn &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent');

    },
    async handle(handlerInput) {

        console.log('...IN followOnHandler');

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        let lRegistrationInfo = await utils.checkRegisteredDevice(Alexa.getDeviceId(handlerInput.requestEnvelope));


        let lVehicleId = lRegistrationInfo.vehicleId;

        let lNextIntent = sessionAttributes.nextIntent;

        // if the user accepted the suggestion intent go for it
        if (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent') {

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
            speakOutput = `<speak>Ok, no problem, what else can I tell you about?</speak>`;

            // Clear the modes session variable
            sessionAttributes.mode = generalConstants.Mode.followOnOff;


        }

        // Save the session variables
        await utils.setSessionAttributes(handlerInput, sessionAttributes);

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
    async canHandle(handlerInput) {

        console.log('...Checking followOnOffHandler -  Intent is ', handlerInput.requestEnvelope.request.intent.name);

        sessionAttributes = await utils.getSessionAttributes(handlerInput);
        let lMode = "";

        try {
            lMode = sessionAttributes.mode;
        } catch (error) {
            // continue
        }

        return (lMode === generalConstants.Mode.followOnOff &&
                (Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_NO ||
                    Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_CANCEL ||
                    Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_STOP)) ||
            (Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST &&
                (Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_CANCEL ||
                    Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_STOP));

    },
    async handle(handlerInput) {

        sessionAttributes = await utils.getSessionAttributes(handlerInput);

        console.log('...IN followOnOffHandler...ask for a rating');

        // Send out a text to the sales team about the type of customer
        // await utils.findTypeOfCustomer();
        //utils.sendMessageToSalesTeam('A customer has just exited a BMW X5 who is interested in performance');

        if (sessionAttributes.vehicleInformation.make === 'DEMO') {
            speakOutput = `Thank you for talking with me about this vehicle`;
        } else {
            speakOutput = `Thank you for talking with me about this ${sessionAttributes.vehicleInformation.make}`;
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();

    }
}

const ratingQuestionHandler = {
    canHandle(handlerInput) {

        console.log('...Checking ratingQuestionHandler');

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        return sessionAttributes.STATE === 'RATING_QUESTION' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent');
    },
    handle(handlerInput) {

        console.log('...IN ratingQuestionHandler');

        attributesManager = handlerInput.attributesManager;
        sessionAttributes = attributesManager.getSessionAttributes();

        // If the user has accepted the rating question
        if (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent') {

            utils.clearSessionState(handlerInput);

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

            utils.clearSessionState(handlerInput);

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

        return Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.SESSION_ENDED;
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

        return Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST;
    },
    async handle(handlerInput) {


        console.log('..IN IntentReflectorHandler');
        // const intentName = handlerInput.requestEnvelope.request.intent.name;
        // const speakOutput = `You just triggered ${intentName}`;

        // return handlerInput.responseBuilder
        //     .speak(speakOutput)
        //     //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
        //     .getResponse();


        sessionAttributes = await utils.getSessionAttributes(handlerInput);

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

        return handlerInput.responseBuilder
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

        return Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_FALLBACK;
    },
    async handle(handlerInput) {


        console.log('..IN FallbackHandler', JSON.stringify(handlerInput.requestEnvelope));

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

        switch (utils.getSessionState(handlerInput)) {

            case generalConstants.STATE.VEHICLE_REGISTRATION:
                // The user is in the vehicle reqistration scenario

                return handlerInput.responseBuilder
                    .speak(generalConstants.FALLBACK_RESPONSES.VEHICLE_REGISTRATION)
                    .addDelegateDirective(generalConstants.INTENTS.VEHICLE_VERIFICATION)
                    .getResponse();

                break;

            case generalConstants.STATE.CUSTOMER_EXPERIENCE:
            // When the user has asked something while in the customer experience

                sessionAttributes = await utils.getSessionAttributes(handlerInput);

                sessionAttributes.mode = generalConstants.Mode.followOn;
                // Save the session variables
                await utils.setSessionAttributes(handlerInput, sessionAttributes);

                // Randomly get a fact about the car
                let lRandomCarFacts = await utils.getRandomCarFacts(sessionAttributes);

                // Get the number of the responses
                let lResponseSize = _.size(lRandomCarFacts) - 1;

                // Choose one of the random facts to speak
                let lIndex = _.random(0, lResponseSize);

                let speak = lRandomCarFacts[lIndex].factText;

                return handlerInput.responseBuilder
                    .speak(speak)
                    .reprompt(speak)
                    .getResponse();

                break;

            default:
                break;
        }
    },
};



// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        registrationHandler.reRegisterIntentHandler,
        handleSuggestedNextQuestion,
        registrationHandler.makeQuestionDuringRegistrationIntentHandler,
        registrationHandler.changeRegisteredVehicle,
        registrationHandler.handleAcceptDemoCarIntent,
        registrationHandler.handleRenterMakeAndModel,
        registrationHandler.registerIntentHandler,
        FallbackHandler,
        generalIntentHandler,
        customerOnboardingHandler.handleHelpIntent, // Handle when the user asks for help at the end of the customer onboarding
        customerOnboardingHandler.fullTourIntentHandler,
        customerOnboardingHandler.customerOnboardingIntent_RejectName_Handler, // The customer has refused to give their name
        customerOnboardingHandler.customerOnboardingIntentHandler,
        customerOnboardingHandler.customerOnboarding_NAME_GIVEN_Intent, // The user was asked for their name and they said their name
        registrationHandler.inProgressVehicleVerificationHandler,
        registrationHandler.errorVehicleVerificationHandler,
        registrationHandler.completedVehicleVerificationHandler,
        seatMaterialIntentHandler,
        menuOptionIntentHandlers.askQuestionIntentHandler,
        menuOptionIntentHandlers.RatingIntentHandler,
        menuOptionIntentHandlers.questionIntentHandler,
        ratingQuestionHandler,
        HelpIntentHandler,
        SessionEndedRequestHandler,
        followOnHandler,
        followOnOffHandler,
        //IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    // .addResponseInterceptors(
    //     ...require('./interceptors/response')
    // )
    .addRequestInterceptors(
        requestInterceptor.DialogManagementStateInterceptor, // https://developer.amazon.com/blogs/alexa/post/114cec18-4a38-4cbe-8c6b-0fa6d8413f4f/build-for-context-switching-don-t-forget-important-information-when-switching-between-intents
        //utils.PersistenceRequestInterceptor,
        utils.processNumberOfQuestions)
    //.addResponseInterceptors(utils.PersistenceResponseInterceptor)
    .withPersistenceAdapter(persistenceAdapter)
    .lambda();