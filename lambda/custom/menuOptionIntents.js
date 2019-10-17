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
    tableName: process.env.DYNAMO_TABLE_NAME || 'carViewUsers',
    createTable: true
});


// Full Tour Intent Handler
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
exports.configureCarIntentHandler = configureCarIntentHandler;