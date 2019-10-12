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
    tableName: process.env.DYNAMO_TABLE_NAME || 'carViewUsers',
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


/**
 * Function: searchIntentHandler
 * Search functionality that will search the algolia database for the right answer
 */
const searchIntentHandler = {
    canHandle(handlerInput) {

        return handlerInput.requestEnvelope.request.type === 'LaunchRequest' ||
            handlerInput.requestEnvelope.request.intent.name === 'SearchIntent';

    },
    async handle(handlerInput) {

        const query = handlerInput.requestEnvelope.request.intent.slots.query.value;

        const response = await index.search({
            query,
            removeStopWords: true,
            ignorePlurals: true,
            optionalWords: query
        });
        const hits = response.hits;
        const talk = hit[0];

        const speechText = `I've got a video, it's titled ${talk.name} and it's by ${talk.speakers.join(',')}. Want to watch?`;

    },

}; // end search intent



/**
 * Function: LaunchRequestHandler
 * Launch of the skill
 */
const LaunchRequestHandler = {
    canHandle(handlerInput) {

        console.log('Launch check ', handlerInput.requestEnvelope.request);
        console.log('Intent = ', handlerInput.requestEnvelope.request.intent.name);

        // Get the number of questions asked and if 1 then go into the launch process
        //let noOfQuestions = 

        return handlerInput.requestEnvelope.request.type === 'LaunchRequest' ||
            handlerInput.requestEnvelope.request.intent.name === 'registerIntent';

    },
    async handle(handlerInput) {


        // let intro = `<speak><audio src="https://carview.s3.amazonaws.com/lYakQp6T-pre-650i-2.mp3"/></speak>`;

        // await helper.callDirectiveService(handlerInput, intro);

        const attributesManager = handlerInput.attributesManager;
        const persistentAttributes = await attributesManager.getPersistentAttributes();
        let sessionAttributes = attributesManager.getSessionAttributes();

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
            console.log('...lVehicleInfo = ', JSON.stringify(lVehicleInfo));

            sessionAttributes.Make = lVehicleInfo.make;
            sessionAttributes.Model = lVehicleInfo.model;

            persistentAttributes.Make = lVehicleInfo.make;
            persistentAttributes.Model = lVehicleInfo.model;

            console.log('...');

            // Now we can speak the main menu
            let arraySize = _.size(generalConstants.greetings.mainMenu);
            console.log('...');
            let pos = helper.randomIntFromInterval(1, arraySize - 1);
            console.log('...');
            console.log('Pos = ', pos);

            speakOutput = generalConstants.greetings.mainMenu[0];

            // replace %s and %t
            speakOutput = _.replace(speakOutput, /%make/g, lVehicleInfo.make);
            speakOutput = _.replace(speakOutput, /%model/g, lVehicleInfo.model);
            console.log('..speakOutput = ', speakOutput);

            // Save the session variables
            attributesManager.setSessionAttributes(sessionAttributes);

            // Save session variables to persistent storage
            attributesManager.setPersistentAttributes(persistentAttributes);
            attributesManager.savePersistentAttributes();

            console.log('..Saved session attributes ', JSON.stringify(sessionAttributes));

            // Here we are playing the intro and then waiting for the response.
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .withShouldEndSession(false)
                .getResponse();


        } else {
            console.log('...Scenario 1.1 - The device is not registered to the car ');


            // Scenario 1.1 - The device is not registered to the car 
            currentIntent = 'vehicleVerificationIntent';

            speakOutput = `Welcome, first things first, we need to link this device to this car. What's the make?`;
            reprompt = `Welcome, let's get this device setup. What's the vehicle make and model?`;
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
                .speak(speakOutput)
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
            .withShouldEndSession(false)
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
        const responseBuilder = handlerInput.responseBuilder;

        let lDeviceId = handlerInput.requestEnvelope.context.System.device.deviceId;

        let slotValues = utils.getSlotValues(request.intent.slots);
        console.log('...slots = ', JSON.stringify(slotValues));


        // Get the vehicle ID from the vehicleDetails table
        let lVehicleInfo = await utils.getVehicleInformation(slotValues.carMake.value,
            slotValues.carModel.value);

        console.log('...lVehicleInfo = ', JSON.stringify(lVehicleInfo));

        console.log('..Saving persistent attributes...');

        let attributes = handlerInput.attributesManager.getPersistentAttributes();

        // Register the vehcile to the device ID
        await utils.registerDeviceToVehicle(lDeviceId, lVehicleInfo.id);

        // Set the device id and the registered flag in the session persistent data
        attributes.deviceId = lDeviceId;
        attributes.vehicleId = lVehicleInfo.id;
        attributes.registered = true;

        console.log('..Setting and saving attributes to session attributes = ', JSON.stringify(attributes));

        handlerInput.attributesManager.setSessionAttributes(attributes);

        console.log('..Now get the completion message');

        // Confirmation of registration
        speakOutput = generalConstants.confirmations.completeVehicleRegistration;
        speakOutput = _.replace(speakOutput, /%make/g, lVehicleInfo.make);
        speakOutput = _.replace(speakOutput, /%model/g, lVehicleInfo.model);

        console.log('....speak....', speakOutput);


        return responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
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
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' &&
            request.intent.name === 'fullTourIntent' &&
            sessionAttributes.Make;
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
            speakOutput = lRtnJson.responseContent;
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
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
            (request.intent.name === 'topSpeedIntent' ||
                request.intent.name === 'driverAssistanceIntent' ||
                request.intent.name === 'fuelConsumptionIntent' ||
                request.intent.name === 'backSeatHubIntent' ||
                request.intent.name === 'engineIntent' ||
                request.intent.name === 'efficientDynamicsIntent' ||
                request.intent.name === 'luggageCapacityIntent' ||
                request.intent.name === 'depreciationIntent' ||
                request.intent.name === 'appleCarPlayAsStandardIntent') &&
            request.dialogState !== 'COMPLETED';
    },
    async handle(handlerInput) {

        const lAttributesManager = handlerInput.attributesManager;
        const lPersistentAttributes = await lAttributesManager.getPersistentAttributes();
        let sessionAttributes = lAttributesManager.getSessionAttributes();

        console.log('..IN topSpeedIntentHandler/driverAssistanceIntent/fuelConsumptionIntent');

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
            speakOutput = lRtnJson.responseContent;
        }

        console.log('..speak out will be ', speakOutput);


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
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
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
        const speakOutput = `Thank you for asking about the BMW X5. <break time="250ms"/> I hope that you've had a great experience`;
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
    async handle(handlerInput) {
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

        if (lIndex==0){
            speakOutput = lRandomCarFacts[lIndex].factText;
        } else {
            speakOutput = lRandomCarFacts[lIndex-1].factText;
        }G

        return responseBuilder
            .speak(speak)
            .reprompt(speak)
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
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' &&
            request.intent.name ===
            'AMAZON.FallbackIntent';
    },
    async handle(handlerInput) {

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
        FallbackHandler,
        searchIntentHandler,
        LaunchRequestHandler,
        completedVehicleVerificationHandler,
        inProgressVehicleVerificationHandler,
        generalIntentHandler,
        seatMaterialIntentHandler,
        //topSpeedIntentHandler,
        //driverAssistanceIntentHandler,
        //fuelConsumptionIntentHandler,
        //efficientDynamicsIntentHandler,
        //luggageCapacityIntentHandler,
        menuOptionIntentHandlers.fullTourIntentHandler,
        menuOptionIntentHandlers.questionIntentHandler,
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
    .addRequestInterceptors(utils.PersistenceRequestInterceptor,
        utils.processNumberOfQuestions)
    .addResponseInterceptors(utils.PersistenceResponseInterceptor)
    .withPersistenceAdapter(persistenceAdapter)
    .lambda();