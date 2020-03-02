const AWS = require('aws-sdk');
const _ = require('lodash');
const rp = require('request-promise');
var dateFormat = require('dateformat');
const accountSid = 'ACc63ae6c570ca6f01ab5a0556af7d0f03';
const authToken = 'dd146dbdc46c26bdc22e9667ba8d951f';
const client = require('twilio')(accountSid, authToken);
const moment = require('moment-timezone');
moment().tz("Europe/London").utc().format();

var randomstring = require("randomstring");

// Load constants
const generalConstants = require('./constants/general');


const s3SigV4Client = new AWS.S3({
    signatureVersion: 'v4'
});

AWS.config.update({
    region: "us-east-1"
});

var docClient = new AWS.DynamoDB.DocumentClient();

var ddb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
});

var getS3PreSignedUrl = (s3ObjectKey) => {

    const bucketName = process.env.S3_PERSISTENCE_BUCKET;
    const s3PreSignedUrl = s3SigV4Client.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: s3ObjectKey,
        Expires: 60 * 1 // the Expires is capped for 1 minute
    });
    return s3PreSignedUrl;

}


var sendMessageToSalesTeam = async (pBody) => {

    return new Promise(function (resolve, reject) {

        client.messages
            .create({
                body: pBody,
                from: '+16466031727',
                to: '+40726709929'
            })
            .then(message => console.log(message.sid));

    }); // end-promise

}; // end-function

/**
 * logAnalytics - Log the category to elastic search analytics
 * @param {JSON} pSession 
 * @param {String} pCategory 
 */
var logAnalytics = (pHandlerInput, pIntent, pCategory, pSessionAttributes) => {
    var now = new Date();
    let lTodaysDate = dateFormat(now, "yyyy-mm-dd");
    let lDateTime = moment().utc().format();

    return new Promise(function (resolve, reject) {

        var lOptions = {
            uri: 'https://a885c98eca654cde8e07d54c9147961b.us-west-2.aws.found.io:9243/carsay/_doc/',
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic ZWxhc3RpYzpGbWlhREhsQ1A1cUhsYlFMTVRObmFXajM=",
            },
            body: {
                "sessionId": pSessionAttributes.sessionId,
                "deviceId": pSessionAttributes.deviceId,
                "vehicleId": pSessionAttributes.vehicleInformation.vehicleId,
                "Intent": pIntent,
                "category": pCategory,
                "make": pSessionAttributes.vehicleInformation.make,
                "location": pSessionAttributes.vehicleInformation.location,
                "date": lTodaysDate,
                "model": pSessionAttributes.vehicleInformation.model,
                "type": "Question_Category",
                "dateTime": lDateTime
            },
            json: true // Automatically stringifies the body to JSON
        };


        rp(lOptions)
            .then((response) => {


                resolve();

            })
            .catch(function (err) {


            }); // end-rp
    }); // end-promise

}; // End logAnalytics function



/**
 * Regigster the device
 * @param {string} pDeviceId 
 */
var registerDeviceToVehicle = (pDeviceId, pVehicleId) => {

    var params = {
        TableName: "theCarRegisteredDevices",
        Item: {
            "deviceId": {
                S: pDeviceId
            },
            "vehicleId": {
                S: pVehicleId
            },
            "registered": {
                BOOL: true
            }
        }
    };

    return new Promise(function (resolve, reject) {

        ddb.putItem(params, function (err, data) {
            if (err) {
                reject(err);
            } else {

                resolve();
            }
        });

    });

}

/**
 * checkRegisteredDevice
 * Check that the device is registered or not
 */
var checkRegisteredDevice = pDeviceId => {

    let rtnJsonBlank = {
        registered: false
    }

    // Set query parameters for db query
    var params = {
        TableName: "theCarRegisteredDevices",
        KeyConditionExpression: "#id = :deviceId",
        ExpressionAttributeNames: {
            "#id": "deviceId"
        },
        ExpressionAttributeValues: {
            ":deviceId": pDeviceId
        }
    };


    return new Promise(function (resolve, reject) {

        docClient.query(params, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                resolve(rtnJsonBlank);
            } else {

                if (data.Count > 0) {
                    data.Items.forEach(function (item) {
                        resolve(item);
                    });
                } else {

                    resolve(rtnJsonBlank);
                }
            }
        });

    }); // return

}; // checkRegisteredDevice


/**
 * removeRegisteredDevice
 * Check that the device is registered or not
 */
var removeRegisteredDevice = pDeviceId => {


    // Set query parameters for db query
    var params = {
        TableName: "theCarRegisteredDevices",
        Key: {
            "deviceId": pDeviceId
        }
    };


    return new Promise(function (resolve, reject) {

        docClient.delete(params, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                reject();
            } else {
                resolve();
            }
        });

    }); // return

}; // removeRegisteredDevice


function getSlotValues(filledSlots) {
    const slotValues = {};

    Object.keys(filledSlots).forEach((item) => {
        const name = filledSlots[item].name;

        if (filledSlots[item] &&
            filledSlots[item].resolutions &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
            switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
                case 'ER_SUCCESS_MATCH':
                    slotValues[name] = {
                        synonym: filledSlots[item].value,
                        value: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
                        id: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.id,
                        isValidated: true,
                        canUnderstand: true,
                        canFulfill: true,
                    };
                    break;
                case 'ER_SUCCESS_NO_MATCH':
                    slotValues[name] = {
                        synonym: filledSlots[item].value,
                        value: filledSlots[item].value,
                        id: null,
                        isValidated: false,
                        canUnderstand: false,
                        canFulfill: null,
                    };
                    break;
                default:
                    break;
            }
        } else {
            slotValues[name] = {
                synonym: filledSlots[item].value,
                value: filledSlots[item].value,
                id: filledSlots[item].id,
                isValidated: false,
                canUnderstand: false,
                canFulfill: false,
            };
        }
    }, this);
    return slotValues;
}; // getSlotValues

/**
 * getSessionState - Get the current session state
 * @param {*} handlerInput 
 */
var getSessionState = (handlerInput) => {

    let attributesManager = handlerInput.attributesManager;
    let sessionAttributes = attributesManager.getSessionAttributes();
    return sessionAttributes.STATE;
};

/**
 * setSessionState - Set the session state
 * @param {object} handlerInput 
 * @param {string} pStateValue
 */
var setSessionState = (handlerInput, pStateValue) => {

    return new Promise(function (resolve, reject) {

        let attributesManager = handlerInput.attributesManager;
        let sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes.STATE = pStateValue;

        attributesManager.setSessionAttributes(sessionAttributes);

        resolve;
    });

}

/**
 * clearSessionState - clear the session state 
 * @param {*} handlerInput 
 */
var clearSessionState = (handlerInput) => {

    let attributesManager = handlerInput.attributesManager;
    let sessionAttributes = attributesManager.getSessionAttributes();

    sessionAttributes.STATE = " ";

    attributesManager.setSessionAttributes(sessionAttributes);
    return;

};

/**
 * getSessionAttributes - Get the session attributes object
 * @param {*} handlerInput 
 */
var getSessionAttributes = handlerInput => {

    return new Promise(function (resolve, reject) {
        let attributesManager = handlerInput.attributesManager;
        resolve(attributesManager.getSessionAttributes());
    });

};

/**
 * setSessionAttributes
 * @param {*} handlerInput 
 * @param {*} sessionAttributes 
 */
var setSessionAttributes = (handlerInput, sessionAttributes) => {

    return new Promise(function (resolve, reject) {
        let attributesManager = handlerInput.attributesManager;
        attributesManager.setSessionAttributes(sessionAttributes);
        resolve();
    });

}




// This response interceptor stores all session attributes into global persistent attributes
// when the session ends and it stores the skill last used timestamp
const PersistenceResponseInterceptor = {
    process(handlerInput, responseOutput) {
        const ses = (typeof responseOutput.shouldEndSession === "undefined" ? true : responseOutput.shouldEndSession);
        if (ses || handlerInput.requestEnvelope.request.type === 'SessionEndedRequest') { // skill was stopped or timed out 
            let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            sessionAttributes['lastUseTimestamp'] = new Date(handlerInput.requestEnvelope.request.timestamp).getTime();
            handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);
            return new Promise((resolve, reject) => {
                handlerInput.attributesManager.savePersistentAttributes()
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
    }
};

// This request interceptor with each new session loads all global persistent attributes
// into the session attributes and increments a launch counter
const PersistenceRequestInterceptor = {
    process(handlerInput) {
        if (handlerInput.requestEnvelope.session['new']) {
            return new Promise((resolve, reject) => {
                handlerInput.attributesManager.getPersistentAttributes()
                    .then((persistentAttributes) => {
                        persistentAttributes = persistentAttributes || {};
                        if (!persistentAttributes['launchCount'])
                            persistentAttributes['launchCount'] = 0;
                        persistentAttributes['launchCount'] += 1;
                        handlerInput.attributesManager.setSessionAttributes(persistentAttributes);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        } // end session['new'] 
    }
};

/**
 * getVehicleInformation - Get the vehicle information using the make and model as a search
 * @param {string} pMake 
 * @param {string} pModel 
 */
const getVehicleInformation = (pMake, pModel, pCountry) => {

    let lRtnJson = {
        item: "",
        found: false
    }

    return new Promise(function (resolve, reject) {

        // Set query parameters for db query
        var queryParams = {
            ExpressionAttributeNames: {
                "#make": "make",
                "#model": "model",
                "#id": "id",
                "#location": "location",
                "#country": "country"
            },
            ExpressionAttributeValues: {
                ":make": pMake,
                ":model": pModel,
                ":country": pCountry
            },
            FilterExpression: "#make = :make AND #model = :model AND #country = :country",
            ProjectionExpression: "#make, #model, #id, #location",
            TableName: "vehicleInformation"
        };


        docClient.scan(queryParams, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                const reason = new Error(JSON.stringify(err, null, 2));
                resolve(reason);
            } else {
                if (data.Items.length !== 0) {
                    data.Items.forEach(function (item) {

                        lRtnJson.item = item;
                        lRtnJson.found = true;
                        resolve(lRtnJson);
                    }); // for each
                } else {
                    resolve(lRtnJson);
                }
            } // end-if
        }); // query

    }); // promise
}; // function

/**
 * getVehicleInformationById
 * @param {String} pVehicleId 
 */
var getVehicleInformationById = pVehicleId => {

    return new Promise(function (resolve, reject) {

        // Set query parameters for db query
        var queryParams = {
            ExpressionAttributeNames: {
                "#make": "make",
                "#model": "model",
                "#id": "id",
                "#country": "country"
            },
            ExpressionAttributeValues: {
                ":id": pVehicleId
            },
            FilterExpression: "#id = :id",
            ProjectionExpression: "#make, #model, #id, #country",
            TableName: "vehicleInformation"
        };



        docClient.scan(queryParams, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                let rtnJson = err.toString();
                resolve(rtnJson);
            } else {

                if (data.Items.length !== 0) {
                    data.Items.forEach(function (item) {
                        resolve(item);
                    }); // for each
                } else {
                    resolve();
                }
            } // end-if
        }); // query

    }); // promise

};

var processNumberOfQuestions = {
    process(handlerInput) {

        if (handlerInput.requestEnvelope.session['new']) {


            return new Promise((resolve, reject) => {

                handlerInput.attributesManager.getPersistentAttributes()
                    .then((persistentAttributes) => {

                        persistentAttributes = persistentAttributes || {};

                        if (!persistentAttributes['questionCount'])
                            persistentAttributes['questionCount'] = 0;

                        persistentAttributes['questionCount'] += 1;

                        // Generate new id for the session
                        persistentAttributes['sessionId'] = randomstring.generate();

                        handlerInput.attributesManager.setSessionAttributes(persistentAttributes);

                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });

            });
        } // end session['new'] 
    }
};

/**
 * Get resposne from database file vehicleInformation
 * @param {String} pVehicleId 
 * @param {String} pIntentName 
 */
var getResponse = (pVehicleId, pIntentName) => {

    return new Promise(function (resolve, reject) {

        // query the database - vehicleInformation for content
        let lRtnJson = {
            responseContent: "",
            responseType: ""
        }


        let lQueryParams = {
            TableName: generalConstants.dbTableNames.vehicleInformation,
            ProjectionExpression: "#pIntentName[0].responseText, #pIntentName[1].nextIntent, #pIntentName[1].nextIntentSpeech, #pIntentName[2].category",
            KeyConditionExpression: "id = :vehicleId",
            ExpressionAttributeNames: {
                "#pIntentName": pIntentName
            },
            ExpressionAttributeValues: {
                ":vehicleId": pVehicleId.toString()
            }
        };


        docClient.query(lQueryParams, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                reject(err);
            } else {

                if (data.Items.length !== 0) {
                    data.Items.forEach(function (item) {


                        lRtnJson.responseContent = item[pIntentName];
                        if (item[pIntentName][0].responseText.includes("cloudfront.net")) {
                            lRtnJson.responseType = generalConstants.types.mp3;
                        } else {
                            lRtnJson.responseType = generalConstants.types.words;
                        }


                        resolve(lRtnJson);
                    }); // for each
                } else {
                    reject('No data exists for vehicle');
                };

            } // end-if
        }); // end-query

    }); // end-promise

}; // end-getResponse

var getNextTopic = pSessionAttributes => {


    let lRtnTopic;

    return new Promise(function (resolve, reject) {

        let lRandomTopics = generalConstants.topics;

        // Get the number of the responses
        let lResponseSize = _.size(lRandomTopics) - 1;

        // Choose one of the random facts to speak
        let lIndex = _.random(0, lResponseSize);


        if (lIndex == 0) {
            lRtnTopic = lRandomTopics[lIndex];
        } else {
            lRtnTopic = lRandomTopics[lIndex - 1];
        }

        resolve(lRtnTopic);
    });
};

var getRandomCarFacts = pSessionAttributes => {
    let lVehicleId = pSessionAttributes.vehicleId;

    return new Promise(function (resolve, reject) {

        let lQueryParams = {
            TableName: generalConstants.dbTableNames.vehicleInformation,
            ProjectionExpression: "#randomFacts",
            KeyConditionExpression: "id = :vehicleId",
            ExpressionAttributeNames: {
                "#randomFacts": generalConstants.randomFacts
            },
            ExpressionAttributeValues: {
                ":vehicleId": pSessionAttributes.vehicleId.toString()
            }
        };


        docClient.query(lQueryParams, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                reject(err);
            } else {
                if (data.Items.length !== 0) {
                    data.Items.forEach(function (item) {

                        let randomFacts = item.randomFacts;

                        resolve(randomFacts);
                    });
                } else {
                    reject('No random facts exists for vehicle');
                };

            }
        });

    }); // end-promise

}; // end getRandomCarFacts

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

}


/**
 * setLocation - Set the location of the vehicle top the 
 *               persistent storage
 * @param {*} pVehicleId 
 * @param {*} pHandlerInput 
 */
var setLocation = async (pVehicleId, pHandlerInput) => {

    const lAttributesManager = pHandlerInput.attributesManager;
    const lPersistentAttributes = await lAttributesManager.getPersistentAttributes();
    let lSessionAttributes = lAttributesManager.getSessionAttributes();

    return new Promise(function (resolve, reject) {

        let lQueryParams = {
            TableName: generalConstants.dbTableNames.vehicleInformation,
            ProjectionExpression: "#Location",
            KeyConditionExpression: "id = :vehicleId",
            ExpressionAttributeNames: {
                "#Location": generalConstants.location
            },
            ExpressionAttributeValues: {
                ":vehicleId": pVehicleId
            }
        };

        docClient.query(lQueryParams, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                reject(err);
            } else {

                if (data.Items.length !== 0) {
                    data.Items.forEach(function (item) {

                        let lLocation = item.location;

                        lPersistentAttributes.location = lLocation;
                        lSessionAttributes.location = lLocation;

                        // Save the session variables
                        lAttributesManager.setSessionAttributes(lSessionAttributes);

                        // Save session variables to persistent storage
                        lAttributesManager.setPersistentAttributes(lPersistentAttributes);
                        lAttributesManager.savePersistentAttributes();

                        resolve();
                    });
                } else {
                    reject('No random facts exists for vehicle');
                };

            }
        });


    }); // end-promise

}; // End-Func


/**
 * Get resposne from database file vehicleInformation
 * @param {String} pVehicleId 
 * @param {String} pIntentName 
 */
var getFullTour = (pVehicleId) => {


    return new Promise(function (resolve, reject) {

        // query the database - vehicleInformation for content
        let lRtnJson = {
            responseContent: "",
            responseType: ""
        }


        let lQueryParams = {
            TableName: generalConstants.dbTableNames.vehicleInformation,
            ProjectionExpression: "fullTourIntent",
            KeyConditionExpression: "id = :vehicleId",
            ExpressionAttributeValues: {
                ":vehicleId": pVehicleId.toString()
            }
        };


        docClient.query(lQueryParams, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                reject(err);
            } else {

                if (data.Items.length !== 0) {
                    data.Items.forEach(function (item) {


                        lRtnJson.responseContent = item['fullTourIntent'];
                        if (item['fullTourIntent'][0].responseText.includes("cloudfront.net")) {
                            lRtnJson.responseType = generalConstants.types.mp3;
                        } else {
                            lRtnJson.responseType = generalConstants.types.words;
                        }

                        resolve(lRtnJson);
                    }); // for each
                } else {
                    reject('No data exists for vehicle');
                };

            } // end-if
        }); // end-query

    }); // end-promise

}; // end-getFullTour


module.exports = {
    getFullTour,
    callDirectiveService,
    getResponse,
    getVehicleInformationById,
    checkRegisteredDevice,
    getSlotValues,
    PersistenceResponseInterceptor,
    PersistenceRequestInterceptor,
    getVehicleInformation,
    registerDeviceToVehicle,
    processNumberOfQuestions,
    getRandomCarFacts,
    getNextTopic,
    logAnalytics,
    sendMessageToSalesTeam,
    setLocation,
    removeRegisteredDevice,
    getS3PreSignedUrl,
    getSessionState,
    setSessionState,
    clearSessionState,
    getSessionAttributes,
    setSessionAttributes
}
//exports.addToUserProfile = addToUserProfile;