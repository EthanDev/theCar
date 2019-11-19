const AWS = require('aws-sdk');
const _ = require('lodash');
const rp = require('request-promise');
var dateFormat = require('dateformat');
const accountSid = 'ACc63ae6c570ca6f01ab5a0556af7d0f03';
const authToken = 'dd146dbdc46c26bdc22e9667ba8d951f';
const client = require('twilio')(accountSid, authToken);

// Load constants
const generalConstants = require('./constants/general');

// Load credentials and set region from JSON file
//AWS.config.loadFromPath('./config.json');

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

module.exports.getS3PreSignedUrl = function getS3PreSignedUrl(s3ObjectKey) {

    const bucketName = process.env.S3_PERSISTENCE_BUCKET;
    const s3PreSignedUrl = s3SigV4Client.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: s3ObjectKey,
        Expires: 60 * 1 // the Expires is capped for 1 minute
    });
    console.log(`Util.s3PreSignedUrl: ${s3ObjectKey} URL ${s3PreSignedUrl}`);
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

    console.log('IN logAnalytics with handlerInput = %s and pIntent = %s, and pCategory = %s ', pHandlerInput, pIntent, pCategory);

    var now = new Date();
    let lTodaysDate = dateFormat(now, "yyyy-mm-dd");

    return new Promise(function (resolve, reject) {

        var lOptions = {
            uri: 'https://1ddac3e8e8fe4234a3f1c050c1785db9.us-east-1.aws.found.io:9243/carsaydata/_doc/',
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic ZWxhc3RpYzpneWhCNG1tbU5pYkFaUVJWM014SzhvQ1g=",
            },
            body: {
                "Intent": pIntent,
                "category": pCategory,
                "make": pSessionAttributes.vehicleInformation.make,
                "location": pSessionAttributes.vehicleInformation.location,
                "date": lTodaysDate,
                "model": pSessionAttributes.vehicleInformation.model,
                "type": "Question_Category"
            },
            json: true // Automatically stringifies the body to JSON
        };


        console.log('lOptions =', lOptions);
        

        rp(lOptions)
            .then((response) => {

                console.log('Record added to Elastic search response = ', response);

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

    console.log('..IN registerDeviceToVehicle with pDeviceId = %s and pVehicleId = %s', pDeviceId, pVehicleId);
    console.log('...params = %s', JSON.stringify(params));


    return new Promise(function (resolve, reject) {

        ddb.putItem(params, function (err, data) {
            if (err) {
                console.log('..Error = ', err);
                reject(err);
            } else {
                console.log('..successful write of data = ', data);

                resolve(data);
            }
        });

    });

}

/**
 * checkRegisteredDevice
 * Check that the device is registered or not
 */
var checkRegisteredDevice = pDeviceId => {
    console.log('..IN checkRegisteredDevice with device id = %s', pDeviceId);

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

    console.log('..checkRegisteredDevice query = ', params);

    return new Promise(function (resolve, reject) {

        docClient.query(params, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                resolve(rtnJsonBlank);
            } else {
                console.log("Query succeeded.");
                console.log('Data = ', data);

                if (data.Count > 0) {
                    data.Items.forEach(function (item) {
                        console.log('Itenm = ', item);
                        resolve(item);
                    });
                } else {
                    resolve(rtnJsonBlank);
                }
            }
        });

    }); // return

}; // checkRegisteredDevice


function getSlotValues(filledSlots) {
    const slotValues = {};

    console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);
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

const getVehicleInformation = (pMake, pModel) => {
    console.log('..IN getVehicleInformation with make = %s and model = %s', pMake, pModel);

    return new Promise(function (resolve, reject) {

        // Set query parameters for db query
        var queryParams = {
            ExpressionAttributeNames: {
                "#make": "make",
                "#model": "model",
                "#id": "id",
                "#location": "location"
            },
            ExpressionAttributeValues: {
                ":make": pMake,
                ":model": pModel
            },
            FilterExpression: "#make = :make AND #model = :model",
            ProjectionExpression: "#make, #model, #id, #location",
            TableName: "vehicleInformation"
        };

        console.log('..getVehicleInformation query = ', queryParams);


        docClient.scan(queryParams, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                resolve(rtnJson);
            } else {
                console.log("Query succeeded.", data);
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
}; // function

/**
 * getVehicleInformationById
 * @param {String} pVehicleId 
 */
var getVehicleInformationById = pVehicleId => {
    console.log('..IN getVehicleInformationById with id = %s', pVehicleId);

    return new Promise(function (resolve, reject) {

        // Set query parameters for db query
        var queryParams = {
            ExpressionAttributeNames: {
                "#make": "make",
                "#model": "model",
                "#id": "id"
            },
            ExpressionAttributeValues: {
                ":id": pVehicleId
            },
            FilterExpression: "#id = :id",
            ProjectionExpression: "#make, #model, #id",
            TableName: "vehicleInformation"
        };

        console.log('..getVehicleInformationById query = ', queryParams);


        docClient.scan(queryParams, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                let rtnJson = err.toString();
                resolve(rtnJson);
            } else {
                console.log("Query succeeded.", data);
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
        console.log('IN processNumberOfQuestions with handlerInput = ', JSON.stringify(handlerInput.requestEnvelope));

        if (handlerInput.requestEnvelope.session['new']) {
            return new Promise((resolve, reject) => {

                handlerInput.attributesManager.getPersistentAttributes()
                    .then((persistentAttributes) => {

                        persistentAttributes = persistentAttributes || {};

                        if (!persistentAttributes['questionCount'])
                            persistentAttributes['questionCount'] = 0;

                        persistentAttributes['questionCount'] += 1;

                        console.log('Setting session attributes = ', persistentAttributes);


                        handlerInput.attributesManager.setSessionAttributes(persistentAttributes);
                        console.log('Session attributes are now ', persistentAttributes);

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

    console.log('- - - - - - - - - - - - - - - ');
    console.log('..IN getResponse with intent = %s', pIntentName);

    return new Promise(function (resolve, reject) {

        // query the database - vehicleInformation for content
        let lRtnJson = {
            responseContent: "",
            responseType: ""
        }

        console.log('...');


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

        console.log('...Query parms = %s', JSON.stringify(lQueryParams));

        docClient.query(lQueryParams, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                reject(err);
            } else {
                console.log("Query succeeded.", data);
                if (data.Items.length !== 0) {
                    data.Items.forEach(function (item) {

                        console.log('..item = ', JSON.stringify(item));


                        lRtnJson.responseContent = item[pIntentName];
                        if (item[pIntentName][0].responseText.includes("cloudfront.net")){
                            lRtnJson.responseType = generalConstants.types.mp3;
                        } else {
                            lRtnJson.responseType = generalConstants.types.words;
                        }

                        console.log('...rtnJson = ', JSON.stringify(lRtnJson));

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

    console.log('-----------------------------');
    console.log('..IN getNextTopic ');

    let lRtnTopic;

    return new Promise(function (resolve, reject) {

        let lRandomTopics = generalConstants.topics;

        // Get the number of the responses
        let lResponseSize = _.size(lRandomTopics);

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
    console.log('- - - - - - - - - - - - - - - ');
    console.log('..IN getRandomCarFacts with SessionAttributes = %s', JSON.stringify(pSessionAttributes));

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

        console.log('...Query parms = %s', JSON.stringify(lQueryParams));

        docClient.query(lQueryParams, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                reject(err);
            } else {
                console.log("Query succeeded.", data);
                if (data.Items.length !== 0) {
                    data.Items.forEach(function (item) {
                        console.log('..item = ', JSON.stringify(item));


                        let randomFacts = item.randomFacts;

                        console.log('Random Fact = ', randomFacts);


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
var setLocation = async (pVehicleId, pHandlerInput)=> {


    const lAttributesManager = handlerInput.attributesManager;
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
                ":vehicleId": pVehicleId.toString()
            }
        };

        console.log('...Query parms = %s', JSON.stringify(lQueryParams));

        docClient.query(lQueryParams, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                reject(err);
            } else {
                console.log("Query succeeded.", data);
                if (data.Items.length !== 0) {
                    data.Items.forEach(function (item) {
                        console.log('..item = ', JSON.stringify(item));

                        let lLocation = item.location;

                        console.log('The loaction is %s', lLocation);

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

exports.callDirectiveService = callDirectiveService;
exports.getResponse = getResponse;
exports.getVehicleInformationById = getVehicleInformationById;
exports.checkRegisteredDevice = checkRegisteredDevice;
exports.getSlotValues = getSlotValues;
exports.PersistenceResponseInterceptor = PersistenceResponseInterceptor;
exports.PersistenceRequestInterceptor = PersistenceRequestInterceptor;
exports.getVehicleInformation = getVehicleInformation;
exports.registerDeviceToVehicle = registerDeviceToVehicle;
exports.processNumberOfQuestions = processNumberOfQuestions;
exports.getRandomCarFacts = getRandomCarFacts;
exports.getNextTopic = getNextTopic;
exports.logAnalytics = logAnalytics;
exports.sendMessageToSalesTeam = sendMessageToSalesTeam;
exports.setLocation = setLocation;
//exports.addToUserProfile = addToUserProfile;