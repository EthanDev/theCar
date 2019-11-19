module.exports = Object.freeze({
    Location:`location`,
    NotSet: 'NOT_SET',
    Mode:{
        followOn: "followOn",
        followOnOff: "StopFollowOn"
    },
    randomFacts: "randomFacts",
    onboardingSpeechText: `<speak><audio src="soundbank://soundlibrary/doors/doors_cars/cars_04"/><audio src="soundbank://soundlibrary/doors/doors_cars/cars_10"/><audio src="soundbank://soundlibrary/vehicles/cars/cars_07"/><audio src="https://carview.s3.amazonaws.com/CpdzOkQH-2018-bmw-x5-official-video-1.mp3"/>Welcome and glad to meet you, <break time="10ms"/> my name's Nikki <break time="50ms"/>and I'm your in-car personal assistant. <break time="30ms"/>what's your name?</speak>`,
    onboardingSpeechTextCompleted: `<speak><prosody rate="medium">Hi Ethan, nice to meet you.<break time="100ms"/>  Let me start off by telling you a few things about the BMW x5 <break time="20ms"/>and also how I can help you.
    <break time="200ms"/> You're sitting in a brandnew <break time="5ms"/>2019 x5 that was only released 2 months ago.
    The BMW x5 stands for confidence, functionality and pure experience. 
    Boldly combining powerful elegance with poised dynamics, the BMW x5 introduces a new interpretation of the letter X. 
    <break time="200ms"/>As your in-car assistant<break time="5ms"/>  I can help you find out more about this amazing x5. <break time="10ms"/> What would you like to do? ask me a question?<break time="5ms"/> let me guide you through a full tour? or<break time="5ms"/> maybe you'd like to have a chat to configure your perfect x5.</prosody></speak>`,
    dbTableNames:{
        vehicleInformation: "vehicleInformation",
    },
    types:{
        mp3: "mp3",
        words: "words"
    },
    speak:{
        openingTag: `<speak>`,
        closingTag: `</speak>`,
        audioSrcOpen: `<audio src="`,
        audioSrcClose: `" />`
    },
    topics:[
            `fuel consumption`,
            `engine`,
            `interior`,
    ],
    greetings:{
        mainMenu:[
            `<speak><audio src="https://carview.s3.amazonaws.com/CpdzOkQH-2018-bmw-x5-official-video-1.mp3"/><break time="500ms"/> You're sitting in exactly the right spot! I'm sure you can agree this %make %model is amazing! <break time="500ms"/> Nice to meet you, my name is Nikki and I'm your personal guide to this amazing %make %model. <break time="500ms"/> What would you like to do? experience a full tour? or just ask me any question you like.</speak>`,
        ]
    },
    confirmations:{
        postVehicleRegistration: `<speak><audio src="soundbank://soundlibrary/doors/doors_cars/cars_04"/><audio src="soundbank://soundlibrary/doors/doors_cars/cars_10"/><audio src="soundbank://soundlibrary/vehicles/cars/cars_07"/>Great news! You have successfully registered this %make %model to the device. <break time="500ms"/> It's now ready for a buyer to use.<break time="500ms"/> Just tell the buyer to start the experience by saying <break time="250ms"/> "Alexa ask the car, and then their question.<break time="250ms"/> Happy exploring this beautiful %model.</speak>`,
        completeVehicleRegistration: `<speak><audio src="soundbank://soundlibrary/doors/doors_cars/cars_04"/><audio src="soundbank://soundlibrary/doors/doors_cars/cars_10"/><audio src="soundbank://soundlibrary/vehicles/cars/cars_07"/><audio src="https://carview.s3.amazonaws.com/CpdzOkQH-2018-bmw-x5-official-video-1.mp3"/>Great news! You've successfully registered the device to the %make %model. <break time="500ms"/> It's now ready for a buyer to use.<break time="500ms"/> Start off by telling buyers to start their experience by saying <break time="250ms"/> "Alexa ask the car, and then their question.<break time="250ms"/> Happy exploring this beautiful %model.</speak>`
    },
    answers:{
        topSpeedIntent: `<speak><prosody rate="medium">Speaking of speed, you're flying through questions! <break time="250ms"/> It's ok, I don't mind at all. <break time="250ms"/>Getting back, this xDrive 30d M Sport, V-8 model can hit the same 100 kilmeters per hour sprint in 6.2 seconds using the power of 265 horse power. <break time="250ms"/>Wow! <break time="250ms"/>Now that's what I call quick!<break time="250ms"/> What else can I tell you about?</prosody></speak>`,
        driverAssistanceIntent: `<speak><prosody rate="medium">I'm so glad you asked me about this %model's driver assistance features.<break time="250ms"/>With %make driver assistance you can relax throughout your journey. <break time="250ms"/>Feel totally safe as the assistant features manoeuvre you through traffic jams, <break time="250ms"/> always keeping you at a safe distance and<break time="250ms"/> when necessary, <break time="250ms"/> reacting with lightning speed in hazardous situations. <break time="500ms"/> The %make driver assistance includes active cruise control, steering and lane control assistance, and a dedicated lane departure warning system. <break time="250ms"/> Sit back and enjoy the feeling of safety in your %make %model. <break time="250ms"/>  Is there anything elese you like to know about?</prosody></speak>`,
        fuelConsumptionIntent: `<speak><prosody rate="medium">Fuel consumption is so important these days, don't you agree?<break time="250ms"/>Luckily, the %model has average fuel consumption figures for the class. <break time="250ms"/>The diesel 30d gets claimed fuel economy of up to 37.7mpg, with the petrol 40i recording 27.2mpg.<break time="250ms"/> Would you like to know about something else?</prosody></speak>`,
        luggageCapacityIntent:  `<speak><prosody rate="medium">Many people have asked me the exact same thing. <break time="250ms"/> Did you know, all X5's have a split tailgate, with the top half being electrically operated. <break time="250ms"/>With this model the boot is big, serving up an impressive space capacity of 1,250 litres. <break time="250ms"/>The rear seats split 40 20 40. <break time="250ms"/> Did you want to ask me something else?</prosody></speak>`,
        efficientDynamicsIntent: `<speak><prosody rate="medium">The new BMW EfficientDynamics strategy is BMW's focus to minimise fuel consumption and CO2 emissions. <break time="250ms"/> The goal is to achieve this while increasing dynamics and driving pleasure at the same time. <break time="500ms"/>It is a package of functions covering the drive system, energy management and vehicle concepts, <break time="250ms"/> and is a standard feature in every BMW.</prosody></speak>`,
        pricePacakageIntent: `<speak>I think you'll find this amazing BMW X5 xDrive 30d is astonishingly great value. <break time="250ms"/>Did you know, that in certain loacations, from as little as one pound per day, you can benefit from the official BMW servicing option.<break time="100ms"/>Make sure you ask your sales representative for this special offer. <break time="500ms"/> Is there anything else I can help you with?</speak>`,
        fullTourIntent:`<speak><prosody rate="medium">Great choice! <break time="20ms"/> Let me tell you all about this %make %model.<break time="150ms"/>  Setting the benchmark for pathbreaking design, the BMW X5 epitomizes your confidence and pure experience.<break time="250ms"/> The new ConnectedDrive features mean that you're more connected than ever before.<break time="250ms"/>
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
        questionIntent: `<speak><prosody rate="medium">That's great, I look forward to answering your questions to help your discover everything about your new BMW X5</prosody></speak>`,
        configureCarIntent: `<speak>Thank you for choosing to cofigure your car. <break time="100ms"/>Unfortunately, at the moment this option is not available.<break time="100ms"/> Maybe you'd like to know about about the %topic ?</speak>`
    
    }



});