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
    tableName: 'carViewUsers',
    createTable: true
});
/**
 * function: askQuestionIntentHandler
 * Scenario: When the user selects that they want to ask a question
 * Action: Prompt the user for the question
 */
const askQuestionIntentHandler ={
    canHandle(handlerInput){
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
            request.intent.name === 'askQuestionIntent' &&
            request.dialogState !== 'COMPLETED';
    },
    async handle(handlerInput){

        console.log('..IN askQuestionIntentHandler');


        speakOutput = `<speak>Sure thing, what would you like to know?</speak>`;
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false) // keep the mic open for the user response 
            .getResponse();

    },

}; // 


/**
 * function: configureCarIntentHandler
 * Handle when the user wants to configure their car
 */
const configureCarIntentHandler ={
    canHandle(handlerInput){
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
            request.intent.name === 'configureCarIntent' &&
            request.dialogState !== 'COMPLETED';
    },
    async handle(handlerInput){

        console.log('..IN configureCarIntentHandler');

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        

        speakOutput = generalConstants.answers.configureCarIntent;

        // Get the next topic randomly
        let lTopic = await utils.getNextTopic(sessionAttributes);
        speakOutput = _.replace(speakOutput, /%topic/g, lTopic);

        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false) // keep the mic open for the user response 
            .getResponse();

    },
};

// Rating Intent Handler
const RatingIntentHandler ={
    canHandle(handlerInput){
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
            request.intent.name === 'RatingIntent' &&
            request.intent.confirmationStatus ==='NONE' &&
            request.dialogState === 'COMPLETED';
    },
    async handle(handlerInput){

        console.log('..IN RatingIntentHandler');

        let lSlotValues = utils.getSlotValues(handlerInput.requestEnvelope.request.intent.slots);

        let lUserRating = lSlotValues.rating.value;
        // Check the rating and respond accordingly
        if (lUserRating >= 3) {
            speakOutput = `<speak>Thank you for the great feedback, have a great day</speak>`;
        } else {
            speakOutput = `<speak>I'm sorry that the experience could have been better.<break time="50ms"/> I'll try better next time. <break time="200ms"/>Either way, I hope you have a good day.</speak>`;
        }
        
        // End the session here
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();

    },
};


// Full Tour Intent Handler
const questionIntentHandler ={
    canHandle(handlerInput){
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' &&
            request.intent.name === 'questionIntent' &&
            request.dialogState !== 'COMPLETED';
    },
    async handle(handlerInput){

        console.log('..IN questionIntentHandler');
        

        speakOutput = generalConstants.answers.questionIntent;
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();

    },
};

exports.questionIntentHandler = questionIntentHandler;
//exports.configureCarIntentHandler = configureCarIntentHandler;
exports.askQuestionIntentHandler = askQuestionIntentHandler;
exports.RatingIntentHandler = RatingIntentHandler;