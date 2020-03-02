module.exports = Object.freeze({
    STATE: {
        CUSTOMER_EXPERIENCE: 'CUSTOMER_EXPERIENCE',
        REREGISTER_VEHICLE: 'REREGISTER_VEHICLE?',
        RE_ENTER_MAKE_MODEL: 'RE-ENTER_MAKE_MODEL',
        VEHICLE_REGISTRATION: 'VEHICLE_REGISTRATION',
        CUSTOMER_ONBOARDING: 'CUSTOMER_ONBOARDING',
    },
    DIALOG_STATE: {
        STARTED: 'STARTED',
        IN_PROGRESS: 'IN_PROGRESS',
        COMPLETED: 'COMPLETED',
    },
    CONFIRMATION_STATUS: {
        DENIED: 'DENIED'
    },
    INTENTS: {
        CUSTOMER_ONBOARDING_INTENT: 'customerOnboardingIntent',
        CAN_FULFILL_INTENT_REQUEST: 'CanFulfillIntentRequest',
        RE_REGISTER_INTENT: 'RE_REGISTER_INTENT',
        VEHICLE_VERIFICATION: 'vehicleVerificationIntent',
        AMAZON_YES: 'AMAZON.YesIntent',
        AMAZON_NO: 'AMAZON.NoIntent',
        ACCEPT_DEMO_CAR: 'acceptDemoCar',
        FULL_TOUR: 'fullTourIntent',
        AMAZON_CANCEL: 'AMAZON.CancelIntent',
        AMAZON_STOP: 'AMAZON.StopIntent',
        AMAZON_FALLBACK: 'AMAZON.FallbackIntent',
        REGISTER_INTENT: 'registerIntent',
        AMAZON_HELP: 'AMAZON.HelpIntent',
        PROVIDED_CUSTOMER_NAME: 'providedCustomerName',
        DEMO_CAR_CHOICE: 'demoCarChoiceIntent',
        CONFUSED_USER: 'confusedIntent',
        QUESTION_DURING_REGISTRATION: 'makeQuestionDuringRegistrationIntent',
    },
    REQUEST_TYPE: {
        INTENT_REQUEST: 'IntentRequest',
        SESSION_ENDED: 'SessionEndedRequest',
        LAUNCH_REQUEST: 'LaunchRequest',
    },
    FALLBACK_RESPONSES: {
        VEHICLE_REGISTRATION: `<speak>Apologies but I'm not sure about this, let's get back to the vehicle registration shall we?</speak>`,
        GENERAL: `<speak>Sorry at the moment I'm not sure how to respond. Let's go back to where you left off.</speak>`
    },
    Location: `location`,
    NotSet: 'NOT_SET',
    Mode: {
        followOn: "followOn",
        followOnOff: "StopFollowOn"
    },
    randomFacts: "randomFacts",
    onboardingSpeechText: `<speak><audio src="soundbank://soundlibrary/doors/doors_cars/cars_04"/><audio src="soundbank://soundlibrary/doors/doors_cars/cars_10"/><audio src="soundbank://soundlibrary/vehicles/cars/cars_07"/>Welcome and glad to meet you, <break time="10ms"/> my name's Nikki <break time="50ms"/>and I'm your in-car personal assistant. <break time="30ms"/>what's your name?</speak>`,
    onboardingSpeechTextCompletedName: `<speak><prosody rate="medium">Hi {slotValues.customerName.value}, nice to meet you.<break time="100ms"/>  Let me start off by telling you a few things about this vehicle <break time="20ms"/>and also how I can help you.
    <break time="200ms"/> You're sitting in a brand new <break time="5ms"/>2019 model that was only released 2 months ago.
    This model stands for confidence, functionality and pure experience. 
    <break time="200ms"/>As your in-car assistant<break time="5ms"/>  I can help you find out more about this amazing vehicle <break time="10ms"/> What would you like to do? ask me a question?<break time="5ms"/>or maybe you want me to guide you through a full tour of this vehicle? </prosody></speak>`,
    onboardingSpeechTextCompleted_NO_NAME: `<speak><prosody rate="medium">That's ok, it's still nice to meet you.<break time="100ms"/>  Let me start off by telling you a few things about this vehicle <break time="20ms"/>and also how I can help you.
    <break time="200ms"/> You're sitting in a brand new <break time="5ms"/>2019 model that was only released 2 months ago.
    This model stands for confidence, functionality and pure experience. 
    <break time="200ms"/>As your in-car assistant<break time="5ms"/>  I can help you find out more about this amazing vehicle <break time="10ms"/> What would you like to do? ask me a question?<break time="5ms"/>or maybe you want me to guide you through a full tour of this vehicle? </prosody></speak>`,

    dbTableNames: {
        vehicleInformation: "vehicleInformation",
    },
    suggestedIntentState: 'SUGGESTED_INTENT',
    randomFactsIntents: [
        "driverAssistanceIntent",
        "fuelConsumptionIntent",
        "backSeatHubIntent",
        "efficientDynamicsIntent",
        "luggageCapacityIntent",
        "appleCarPlayAsStandardIntent",
        "entertainmentSystemIntent",
        "depreciationIntent",
        "aerodynamicsIntent",
        "engineIntent",
        "topSpeedIntent",
    ],
    suggestedIntents: {
        topSpeedIntent: `Would you like to know more about this car's top speed?</prosody></speak>`,
        driverAssistanceIntent: `Would you like to know more about this car's driver assistance features?</prosody></speak>`,
        fuelConsumptionIntent: `Would you like to know more about this car's fuel consumption?</prosody></speak>`,
        backSeatHubIntent: `Would you like to know more about this car's back seat entertainment system?</prosody></speak>`,
        efficientDynamicsIntent: `Would you like to know more about this car's efficient dynamic system?</prosody></speak>`,
        luggageCapacityIntent: `Would you like to know more about this car's luggage compartment?</prosody></speak>`,
        appleCarPlayAsStandardIntent: `Would you like to know more about this car's apple car integration?</prosody></speak>`,
        entertainmentSystemIntent: `Would you like to know more about this car's entertainment system?</prosody></speak>`,
        depreciationIntent: `Would you like to know more about this car's depreciation?</prosody></speak>`,
        aerodynamicsIntent: `Would you like to know more about this car's areodynamic rating?</prosody></speak>`,
        engineIntent: `Would you like to know more about this car's engine?</prosody></speak>`
    },
    errors: {
        alreadyRegistered: `<speak>Unfortunately, this car's device has not been linked to a make and model. To link this device try saying "setup this device."</speak>`
    },
    demo: {
        make: "DEMO",
        model: "DEMOMODEL"
    },
    VEHICLE_TYPE: {
        DEMO: 'DEMO_VEHICLE_TYPE',
        NORMAL: 'NORMAL_VEHICLE_TYPE'
    },
    types: {
        mp3: "mp3",
        words: "words"
    },
    speak: {
        break_short: `<break time="500ms"/>`,
        openingTag: `<speak>`,
        closingTag: `</speak>`,
        audioSrcOpen: `<audio src="`,
        audioSrcClose: `" />`
    },
    topics: [
        `fuel consumption`,
        `engine`,
        `interior`,
    ],
    greetings: {
        mainMenu: [
            `<speak><break time="500ms"/> You're sitting in exactly the right spot! I'm sure you can agree this %make %model is amazing! <break time="500ms"/> Nice to meet you, my name is Nikki and I'm your personal guide to this amazing %make %model. <break time="500ms"/> What would you like to do? experience a full tour? or just ask me any question you like.</speak>`,
        ]
    },
    confirmations: {
        postVehicleRegistration: `<speak><audio src="soundbank://soundlibrary/doors/doors_cars/cars_04"/><audio src="soundbank://soundlibrary/doors/doors_cars/cars_10"/><audio src="soundbank://soundlibrary/vehicles/cars/cars_07"/>Great news! You have successfully registered this %make %model to the device. <break time="500ms"/> It's now ready for a buyer to use.<break time="500ms"/> Just tell the buyer to start the experience by saying <break time="250ms"/> "ask the car, and then their question.<break time="250ms"/> Happy exploring this beautiful %model.<audio src="https://carsay.s3.amazonaws.com/carsay_intro.mp3" /> </speak>`,
        completeVehicleRegistration: `<speak><audio src="soundbank://soundlibrary/doors/doors_cars/cars_04"/><audio src="soundbank://soundlibrary/doors/doors_cars/cars_10"/><audio src="soundbank://soundlibrary/vehicles/cars/cars_07"/>Great news! You've successfully registered the device to the %make %model. <break time="500ms"/> It's now ready for a buyer to use.<break time="500ms"/> Start off by telling buyers to start their experience by saying <break time="250ms"/> "ask the car, and then their question.<break time="250ms"/> Happy exploring this beautiful %model.<audio src="https://carsay.s3.amazonaws.com/carsay_intro.mp3" /> </speak>`
    },
    answers: {
        whatMakeQuestion: `<speak>CarSay supports the majority of vehicle makes such as BMW, Toyota, and Ford to name a few. If you want to setup a demo device just say demo. <break time="500ms"/> With this in mind,</speak>`,
        whatModelQuestion: `<speak>CarSay supports the majority of vehicle models such as the X5 from BMW, the Prius from Toyota, and the Focus from Ford to name a few.<break time="500ms"/> With this in mind,</speak>`,
        topSpeedIntent: `<speak><prosody rate="medium">Speaking of speed, you're flying through questions! <break time="250ms"/> It's ok, I don't mind at all. <break time="250ms"/>Getting back, this xDrive 30d M Sport, V-8 model can hit the same 100 kilmeters per hour sprint in 6.2 seconds using the power of 265 horse power. <break time="250ms"/>Wow! <break time="250ms"/>Now that's what I call quick!<break time="250ms"/> What else can I tell you about?</prosody></speak>`,
        driverAssistanceIntent: `<speak><prosody rate="medium">I'm so glad you asked me about this %model's driver assistance features.<break time="250ms"/>With %make driver assistance you can relax throughout your journey. <break time="250ms"/>Feel totally safe as the assistant features manoeuvre you through traffic jams, <break time="250ms"/> always keeping you at a safe distance and<break time="250ms"/> when necessary, <break time="250ms"/> reacting with lightning speed in hazardous situations. <break time="500ms"/> The %make driver assistance includes active cruise control, steering and lane control assistance, and a dedicated lane departure warning system. <break time="250ms"/> Sit back and enjoy the feeling of safety in your %make %model. <break time="250ms"/>  Is there anything elese you like to know about?</prosody></speak>`,
        fuelConsumptionIntent: `<speak><prosody rate="medium">Fuel consumption is so important these days, don't you agree?<break time="250ms"/>Luckily, the %model has average fuel consumption figures for the class. <break time="250ms"/>The diesel 30d gets claimed fuel economy of up to 37.7mpg, with the petrol 40i recording 27.2mpg.<break time="250ms"/> Would you like to know about something else?</prosody></speak>`,
        luggageCapacityIntent: `<speak><prosody rate="medium">Many people have asked me the exact same thing. <break time="250ms"/> Did you know, all X5's have a split tailgate, with the top half being electrically operated. <break time="250ms"/>With this model the boot is big, serving up an impressive space capacity of 1,250 litres. <break time="250ms"/>The rear seats split 40 20 40. <break time="250ms"/> Did you want to ask me something else?</prosody></speak>`,
        efficientDynamicsIntent: `<speak><prosody rate="medium">The new BMW EfficientDynamics strategy is BMW's focus to minimise fuel consumption and CO2 emissions. <break time="250ms"/> The goal is to achieve this while increasing dynamics and driving pleasure at the same time. <break time="500ms"/>It is a package of functions covering the drive system, energy management and vehicle concepts, <break time="250ms"/> and is a standard feature in every BMW.</prosody></speak>`,
        pricePacakageIntent: `<speak>I think you'll find this amazing BMW X5 xDrive 30d is astonishingly great value. <break time="250ms"/>Did you know, that in certain loacations, from as little as one pound per day, you can benefit from the official BMW servicing option.<break time="100ms"/>Make sure you ask your sales representative for this special offer. <break time="500ms"/> Is there anything else I can help you with?</speak>`,
        fullTourIntent: `<speak><prosody rate="medium">Great choice! <break time="20ms"/> Let me tell you all about this %make %model.<break time="150ms"/>  Setting the benchmark for pathbreaking design, the BMW X5 epitomizes your confidence and pure experience.<break time="250ms"/> The new ConnectedDrive features mean that you're more connected than ever before.<break time="250ms"/>
        Included as standard, the BMW <w role="amazon:NN">live</w> Cockpit and the Connected Package enhances the functionality of your Ultimate Driving Machine.<break time="500ms"/>
        Apple CarPlay, Concierge, and Remote Services, are all included in your new BMW X5, meaning,  you're always connected with the outside world. <break time="500ms"/>
        Your BMW has award-winning Efficient Dynamics technology, designed to reduce CO2 emissions and improve fuel economy, without compromising on performance or driving dynamics.<break time="500ms"/>
        
        Embodying the X, your BMW X5 showcases a silhouette that
        speaks superiority. <break time="300ms"/> Continuing its strong heritage, the double
        swage lines, which run from the Air Breather to the rear of
        the car, emphasise the vehicle’s wide, aesthetic look
        whilst the S-curve presents an athletic feel to the exterior.<break time="500ms"/>

        Compelling design flows from the outside inwards. <break time="300ms"/>With high-quality
        Vernasca leather as standard, and optional third-row seating, this BMW combines generous
        space with high-class luxury. <break time="500ms"/>
        
        Coupling the optional Sky Lounge Panoramic glass sunroof with Ambient interior lighting, creates a luxurious atmosphere of light that gracefully flows throughout.
        
        </prosody></speak>`,
        questionIntent: `<speak><prosody rate="medium">That's great, I look forward to answering your questions to help your discover everything about your new vehicle</prosody></speak>`,
        configureCarIntent: `<speak>Thank you for choosing to configure your car. <break time="100ms"/>Unfortunately, at the moment this option is not available.<break time="100ms"/> Maybe you'd like to know about the %topic ?</speak>`

    },
    RESPONSES: {
        HANDLE_HELP_INTENT: {
            PROMOPT: 'You can ask me a question or ask me to start the full tour. Which would you like.',
            UTTERANCE: 'I can help you. At the moment you are starting your journey to discover this vehicle.'
        }
    }



});