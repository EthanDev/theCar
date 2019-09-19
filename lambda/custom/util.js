const AWS = require('aws-sdk');

// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config.json');

const s3SigV4Client = new AWS.S3({
    signatureVersion: 'v4'
});

AWS.config.update({
    region: "us-east-1"
});

var docClient = new AWS.DynamoDB.DocumentClient();

var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

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
            "registered":{
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
                "#id": "id"
            },
            ExpressionAttributeValues: {
                ":make": pMake,
                ":model": pModel
            },
            FilterExpression: "#make = :make AND #model = :model",
            ProjectionExpression: "#make, #model, #id",
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

var processNumberOfQuestions ={
    process(handlerInput) {
        console.log('IN processNumberOfQuestions with handlerInput = ', JSON.stringify(handlerInput));
        
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

var getResponse = pIntentName => {

    console.log('..IN getVehicleInformationById with id = %s', pVehicleId);

    return new Promise(function (resolve, reject) {

    }); // end-promise


}; // end-getResponse


exports.getResponse = getResponse;
exports.getVehicleInformationById = getVehicleInformationById;
exports.checkRegisteredDevice = checkRegisteredDevice;
exports.getSlotValues = getSlotValues;
exports.PersistenceResponseInterceptor = PersistenceResponseInterceptor;
exports.PersistenceRequestInterceptor = PersistenceRequestInterceptor;
exports.getVehicleInformation = getVehicleInformation;
exports.registerDeviceToVehicle = registerDeviceToVehicle;
exports.processNumberOfQuestions = processNumberOfQuestions;