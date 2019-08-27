const AWS = require('aws-sdk');

// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config.json');

const s3SigV4Client = new AWS.S3({
    signatureVersion: 'v4'
});

AWS.config.update({region: "us-west-2"});

var docClient = new AWS.DynamoDB.DocumentClient();

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
 * checkRegisteredDevice
 * Check that the device is registered or not
 */
var checkRegisteredDevice = pDeviceId => {
    console.log('..IN checkRegisteredDevice with device id = %s',pDeviceId);
    

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
                reject();
            } else {
                console.log("Query succeeded.");
                data.Items.forEach(function (item) {
                    console.log('Itenm = ', item);
                    resolve(item);
                });
            }
        });

    }); // return

}; // checkRegisteredDevice


exports.checkRegisteredDevice = checkRegisteredDevice;