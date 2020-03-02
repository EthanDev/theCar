// i18n dependency
const i18n = require('i18next');


// This request interceptor will bind a translation function 't' to the handlerInput.
var LocalisationRequestInterceptor = {
    process(handlerInput) {
        i18n.init({
            lng: handlerInput.requestEnvelope.request.locale,
            resources: languageStrings
        }).then((t) => {
            handlerInput.t = (...args) => t(...args);
        });
    }
  };


  const DialogManagementStateInterceptor = {
    process(handlerInput) {
    
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        
        if (handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.dialogState !== "COMPLETED") {
            
            const attributesManager = handlerInput.attributesManager;
            const sessionAttributes = attributesManager.getSessionAttributes();
            
            // If there are no session attributes we've never entered dialog management
            // for this intent before.
            
            if (sessionAttributes[currentIntent.name]) {
                let savedSlots = sessionAttributes[currentIntent.name].slots;
            
                for (let key in savedSlots) {
                    // we let the current intent's values override the session attributes
                    // that way the user can override previously given values.
                    // this includes anything we have previously stored in their profile.
                    if (!currentIntent.slots[key].value && savedSlots[key].value) {
                        currentIntent.slots[key] = savedSlots[key];
                    }
                }    
            }
            sessionAttributes[currentIntent.name] = currentIntent;
            attributesManager.setSessionAttributes(sessionAttributes);
        }
    }
};

module.exports ={ 
    LocalisationRequestInterceptor,
    DialogManagementStateInterceptor
};