const Alexa = require('ask-sdk');
var _ = require('lodash');


const utils = require('./util');
const generalConstants = require('./constants/general');
const helper = require('./helperFunctions');
const menuOptionIntentHandlers = require('./menuOptionIntents');


// Global variables
let speakOutput, sessionAttributes;



/**
 * Function: registerIntentHandler
 * Launch of the skill
 */
const registerIntentHandler = {
    canHandle(handlerInput) {

        console.log('...checking registerIntentHandler...');


        return Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.REGISTER_INTENT ||
            (Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.LAUNCH_REQUEST ||
                Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.INTENTS.CAN_FULFILL_INTENT_REQUEST);

    },
    async handle(handlerInput) {

        console.log('> IN registerIntentHandler ');


        sessionAttributes = await utils.getSessionAttributes(handlerInput);
        utils.clearSessionState(handlerInput);

        // Check if device is registered - the device id is from the request data pased to 
        // the skill
        let lDeviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);
        let lRtnDeviceDetails = await utils.checkRegisteredDevice(lDeviceId);

        console.log('..Returned lRtnDeviceDetails = ', JSON.stringify(lRtnDeviceDetails));

        if (lRtnDeviceDetails.registered) {

            console.log('...Scenario 1.0 - The device is registered to the car ');

            let lVehicleInfo = await utils.getVehicleInformationById(lRtnDeviceDetails.vehicleId);

            // This car has already been registered so ask the dealer if they want to change the car registration
            speakOutput = `This device is already registered to the ${lVehicleInfo.make} ${lVehicleInfo.model}. Would you like to change the registered vehicle?`;

            sessionAttributes.deviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);
            sessionAttributes.STATE = generalConstants.STATE.REREGISTER_VEHICLE;
            await utils.setSessionAttributes(handlerInput, sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .withShouldEndSession(false)
                .getResponse();

        } else {
            console.log('...Scenario 1.1 - The device is not registered to the car ');

            // Set the state 
            await utils.setSessionState(handlerInput, generalConstants.STATE.VEHICLE_REGISTRATION);

            // Scenario 1.1 - The device is not registered to the car 
            let vehicleVerificationIntent = generalConstants.INTENTS.VEHICLE_VERIFICATION;

            if (Alexa.getSlotValue(handlerInput.requestEnvelope, 'carMake')) {

                vehicleVerificationIntent.slots['carMake'].value = Alexa.getSlotValue(handlerInput.requestEnvelope, 'carMake');
                
            }

            if (Alexa.getSlotValue(handlerInput.requestEnvelope, 'carModel')) {

                vehicleVerificationIntent.slots['carModel'].value = Alexa.getSlotValue(handlerInput.requestEnvelope, 'carModel');
            }

            // Set a session flag that this is a demo vehicle
            sessionAttributes.VEHICLE_TYPE = generalConstants.VEHICLE_TYPE.DEMO;


            speakOutput = `<speak><audio src="https://carsay.s3.amazonaws.com/carsay_intro.mp3" />Welcome, first things first, we need to link this device to this car.</speak>`;
            let reprompt = `Welcome, let's get this device setup. What's the vehicle make?`;

            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: vehicleVerificationIntent,
                    confirmationStatus: 'NONE',
                    slots: {
                        carMake:{
                            name: 'carMake',
                            value: (Alexa.getSlotValue(handlerInput.requestEnvelope, 'carMake') ? Alexa.getSlotValue(handlerInput.requestEnvelope, 'carMake') : '' ),
                            confirmationStatus: 'NONE'
                        },
                        carModel:{
                            name: 'carModel',
                            value: (Alexa.getSlotValue(handlerInput.requestEnvelope, 'carModel') ? Alexa.getSlotValue(handlerInput.requestEnvelope, 'carModel') : '' ),
                            confirmationStatus: 'NONE'
                        },
                        country:{
                            name: 'country',
                            value: (sessionAttributes.country ? sessionAttributes.country : '' ),
                            confirmationStatus:'NONE'
                        }
                    }
                })
                .speak(speakOutput)
                .withShouldEndSession(false)
                .getResponse();

        }
    }
};


/**
 * Function: inProgressVehicleVerificationHandler
 * Continue to get the next slot
 */
const inProgressVehicleVerificationHandler = {
    canHandle(handlerInput) {

        console.log('------------------------------------------------------------');
        console.log('...checking processVehicleVerificationIntent');
        console.log('------------------------------------------------------------');

        console.log('...STATE =',utils.getSessionState(handlerInput));
        console.log('..REQUEST TYPE =', Alexa.getRequestType(handlerInput.requestEnvelope) );
        console.log('..INTENT NAME = ', Alexa.getIntentName(handlerInput.requestEnvelope) );
        console.log('..DIALOG STATE =', Alexa.getDialogState(handlerInput.requestEnvelope) );
        console.log('------------------------------------------------------------');
        

        return utils.getSessionState(handlerInput) === generalConstants.STATE.VEHICLE_REGISTRATION &&
            Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.VEHICLE_VERIFICATION ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_HELP) &&
            Alexa.getDialogState(handlerInput.requestEnvelope) !== generalConstants.DIALOG_STATE.COMPLETED;

    },
    async handle(handlerInput) {

        const request = handlerInput.requestEnvelope.request;
        const {
            responseBuilder
        } = handlerInput;

        console.log('>... IN inProgressVehicleVerificationHandler');


        sessionAttributes = await utils.getSessionAttributes(handlerInput);

        const currentIntent = handlerInput.requestEnvelope.request.intent; // Get the intent object


        // Check if the user has said that they are confused about the make
        if (!currentIntent.slots['carMake'].value && currentIntent.confirmationStatus === generalConstants.CONFIRMATION_STATUS.DENIED) {

            return responseBuilder
                .speak(generalConstants.answers.whatMakeQuestion)
                .addDelegateDirective(currentIntent)
                .getResponse();
        };


        // If the user has said demo then fill in the slots
        // and ask for the country
        if (Alexa.getSlotValue(handlerInput.requestEnvelope, 'carMake').toLocaleUpperCase() === generalConstants.demo.make) {

            currentIntent.slots['carMake'].value = generalConstants.demo.make
            currentIntent.slots['carModel'].value = generalConstants.demo.model;

            // Set a session flag that this is a demo vehicle
            sessionAttributes.VEHICLE_TYPE = generalConstants.VEHICLE_TYPE.DEMO;

        } else {
            sessionAttributes.VEHICLE_TYPE = generalConstants.VEHICLE_TYPE.NORMAL;
        }

        // Set and save th session attributes
        await utils.setSessionAttributes(handlerInput, sessionAttributes);

        // request for the next required slot 
        return responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse();

    },
};

/**
 * makeQuestionDuringRegistrationIntentHandler
 * Handle when the user asks a question during the registration scenario
 */
const makeQuestionDuringRegistrationIntentHandler = {
    canHandle(handlerInput) {

        console.log('...checking makeQuestionDuringRegistrationIntentHandler');

        return utils.getSessionState(handlerInput) === generalConstants.STATE.VEHICLE_REGISTRATION &&
            Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.QUESTION_DURING_REGISTRATION;
    },
    async handle(handlerInput) {

        console.log('> IN makeQuestionDuringRegistrationIntentHandler');

        const request = handlerInput.requestEnvelope.request;
        const {
            responseBuilder
        } = handlerInput;

        //utils.callDirectiveService(handlerInput,generalConstants.answers.whatMakeQuestion);

        // No go back to where we came from - the vehicle registration intent
        let currentIntent = generalConstants.INTENTS.VEHICLE_VERIFICATION;

        return responseBuilder
            .speak(generalConstants.answers.whatMakeQuestion)
            .addDelegateDirective(currentIntent)
            .getResponse();

    },
}

/**
 * reRegisterIntent
 * Handle the fact that the user wants to change the make and model of the linked vehicle
 */
const reRegisterIntentHandler = {
    canHandle(handlerInput) {

        console.log('...checking reRegisterIntentHandler...');

        return handlerInput.requestEnvelope.request.type === generalConstants.REQUEST_TYPE.INTENT_REQUEST &&
            handlerInput.requestEnvelope.request.intent.name === generalConstants.INTENTS.RE_REGISTER_INTENT;
    },
    async handle(handlerInput) {

        console.log('...IN reRegisterIntent ');

        // Now we need to delete the registered device entry
        let lDeviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);
        await utils.removeRegisteredDevice(lDeviceId);

        speakOutput = `Ok, I have removed the Alexa device from the vehicle. Now lets setup a new car.`;

        return handlerInput.responseBuilder
            .addDelegateDirective({
                name: generalConstants.INTENTS.VEHICLE_VERIFICATION,
                confirmationStatus: 'NONE',
                slots: {}
            })
            .speak(speakOutput)
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

        return utils.getSessionState(handlerInput) === generalConstants.STATE.VEHICLE_REGISTRATION &&
            Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.VEHICLE_VERIFICATION &&
            Alexa.getDialogState(handlerInput.requestEnvelope) === generalConstants.DIALOG_STATE.COMPLETED;
    },
    async handle(handlerInput) {


        sessionAttributes = await utils.getSessionAttributes(handlerInput);

        console.log('..IN completedVehicleVerificationHandler');

        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;

        // Get the device id
        let lDeviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);

        // Get the slot values
        let slotValues = utils.getSlotValues(request.intent.slots);
        console.log('...slots = ', JSON.stringify(slotValues));

        if (slotValues.carModel.value.toUpperCase() === 'DAMON') {
            slotValues.carModel.value = 'DEMO';
        }

        let vehicleMake = slotValues.carMake.value.toUpperCase();
        let vehicleModel = slotValues.carModel.value.toUpperCase();
        let country = slotValues.country.id.toUpperCase();


        console.log('vehicleMake value slot = ', vehicleMake);
        console.log('vehicleModel value slot = ', vehicleModel);
        console.log('country slot id = ', country);


        if (country === 'UNITED KINGDOM' ||
            country === 'ENGLAND' ||
            country === 'GREAT BRITAIN') {
            country = 'UK';
        }

        // Save the country away so that we do not ask for it again
        sessionAttributes.country = country;
        await utils.setSessionAttributes(handlerInput, sessionAttributes);

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

            await utils.setSessionAttributes(handlerInput, sessionAttributes);

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

            console.log('...Make and model does not exist...');

            // Save the country so that we dont get asked again
            sessionAttributes.country = country;
            await utils.setSessionAttributes(handlerInput, sessionAttributes);

            speakOutput = `Unfortunately the ${vehicleMake} ${vehicleModel} does not exist, would you like to choose another make and model ?, or maybe you'd like the demo car?`;

            await utils.setSessionState(handlerInput, generalConstants.STATE.RE_ENTER_MAKE_MODEL);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(false)
                .getResponse();
        }

    },
};

/**
 * handleAcceptDemoCarIntent - Handle when the user accepts the demo car after not finding the vehicle in 
 * from the initial setup attempt
 */
const handleAcceptDemoCarIntent = {
    canHandle(handlerInput) {

        console.log('...Checking handleAcceptDemoCarIntent');

        return utils.getSessionState(handlerInput) === generalConstants.STATE.RE_ENTER_MAKE_MODEL &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.ACCEPT_DEMO_CAR ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.VEHICLE_VERIFICATION);

    },
    async handle(handlerInput) {
        console.log('IN handleAcceptDemoCarIntent');

        let vehicleMake, vehicleModel, country;

        sessionAttributes = await utils.getSessionAttributes(handlerInput);

        country = sessionAttributes.country;

        // Clear the STATE 
        utils.clearSessionState(handlerInput);

        // Get the device id
        let deviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);

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


        await utils.setSessionAttributes(handlerInput, sessionAttributes);

        console.log('..Now get the completion message - Confirmation of registration');

        // Confirmation of registration
        speakOutput = generalConstants.confirmations.completeVehicleRegistration;
        speakOutput = _.replace(speakOutput, /%make/g, vehicleInfo.item.make);
        speakOutput = _.replace(speakOutput, /%model/g, vehicleInfo.item.model);

        console.log('....speak....', speakOutput);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();
    }
}; // function




const errorVehicleVerificationHandler = {
    canHandle(handlerInput) {

        console.log('..checking errorVehicleVerificationHandler');

        return Alexa.getRequestType(handlerInput.requestEnvelope) === generalConstants.REQUEST_TYPE.INTENT_REQUEST &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_HELP;
    },
    async handle(handlerInput) {

        console.log('> IN errorVehicleVerificationHandler');

        switch (utils.getSessionState(handlerInput)) {
            case generalConstants.STATE.VEHICLE_REGISTRATION:

                speakOutput = `Maybe you're a little lost, would you like to ask me a question or take a full tour?`;

                break;

            case generalConstants.STATE.VEHICLE_REGISTRATION:

                speakOutput = `Looks like an error`;

            default:
                break;
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(false)
            .getResponse();

    }
}; // errorVehicleVerificationHandler

/**
 * handleRenterMakeAndModel 
 * - Handle when the user re-enters the make and model
 */
const handleRenterMakeAndModel = {
    async canHandle(handlerInput) {

        console.log('...Checking handleRenterMakeAndModel ');

        sessionAttributes = await utils.getSessionAttributes(handlerInput);

        return sessionAttributes.STATE === generalConstants.STATE.RE_ENTER_MAKE_MODEL &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_YES ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_NO);
    },
    async handle(handlerInput) {
        console.log('IN handleRenterMakeAndModel');

        if (Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_YES) {
            // The user wants to re-enter the make and model

            speakOutput = 'Ok';

            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: generalConstants.INTENTS.VEHICLE_VERIFICATION,
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
}; // Function

/**
 * changeRegisteredVehicle - The dealer has been asked if they would like to change the registered vehicle to the device
 */
const changeRegisteredVehicle = {
    canHandle(handlerInput) {
        console.log('...Checking changeRegisteredVehicle', handlerInput);

        return utils.getSessionState(handlerInput) === generalConstants.STATE.REREGISTER_VEHICLE &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_YES ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_NO);
    },
    async handle(handlerInput) {

        console.log('...IN changeRegisteredVehicle');

        sessionAttributes = await utils.getSessionAttributes(handlerInput);


        if (Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_YES) {
            // Now we need to delete the registered device entry

            await utils.removeRegisteredDevice(Alexa.getDeviceId(handlerInput.requestEnvelope));

            speakOutput = `Ok, I have removed the Alexa device from the vehicle. Now lets put it into another vehicle.`;

            // Change the STATE to be VEHICLE_REGISTRATION
            sessionAttributes.STATE = generalConstants.STATE.VEHICLE_REGISTRATION;
            await utils.setSessionAttributes(handlerInput, sessionAttributes);

            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: generalConstants.INTENTS.VEHICLE_VERIFICATION,
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .speak(speakOutput)
                .getResponse();

        } else if (Alexa.getIntentName(handlerInput.requestEnvelope) === generalConstants.INTENTS.AMAZON_NO) {
            // The the dealer has agreed NOT to register the device to another vehicle

            speakOutput = `Ok, that's fine. Have a great day`;

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();
        }
    },
};




/*
 *    Module exports
 */
module.exports = {
    registerIntentHandler,
    reRegisterIntentHandler,
    inProgressVehicleVerificationHandler,
    completedVehicleVerificationHandler,
    handleRenterMakeAndModel,
    changeRegisteredVehicle,
    handleAcceptDemoCarIntent,
    errorVehicleVerificationHandler,
    makeQuestionDuringRegistrationIntentHandler
};