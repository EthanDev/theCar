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

  exports.LocalisationRequestInterceptor = LocalisationRequestInterceptor;