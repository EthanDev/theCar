
/**
 * Speak out alexa speech and then return to the calling function
 * @param {*} handlerInput 
 * @param {*} directiveMsg 
 */
var callDirectiveService = (handlerInput, directiveMsg) => {
    // Call Alexa Directive service
    const requestEnvelope = handlerInput.requestEnvelope;
    const directiveServiceClient = handlerInput.serviceClientFactory.getDirectiveServiceClient();

    const requestId = requestEnvelope.request.requestId;
    const endPoint = requestEnvelope.context.System.apiEndPoint;
    const token = requestEnvelope.context.System.apiAccessToken;

    // build the progressive response directive
    const directive = {
        header: {
            requestId
        },
        directive: {
            type: 'VoicePlayer.Speak',
            speech: directiveMsg
        },
    };

    // send directive
    return directiveServiceClient.enqueue(directive, endPoint, token);

};

/**
 * randomIntFromInterval - Geberate a random number between 1 and the max number
 * passed in
 * @param {number} min 
 * @param {number} max 
 */
var randomIntFromInterval = (min, max) => { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
};





exports.callDirectiveService = callDirectiveService;
exports.randomIntFromInterval = randomIntFromInterval;

/*

Object.assign(sessionAttributes, {
    speechOutput: repromptText,
    repromptText,
    currentQuestionIndex,
    correctAnswerIndex: correctAnswerIndex + 1,
    questions: gameQuestions,
    score: currentScore,
    correctAnswerText: translatedQuestion[Object.keys(translatedQuestion)[0]][0]
  });
*/