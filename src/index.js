/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

// There are three sections; Text Strings, Skill Code, and Helper Function(s).
// You can copy and paste the contents as the code for a new Lambda function, using the alexa-skill-kit-sdk-factskill template.
// This code includes helper functions for compatibility with versions of the SDK prior to 1.0.9, which includes the dialog directives.


 // 1. Text strings =====================================================================================================
 //    Modify these strings and messages to change the behavior of your Lambda function

var speechOutput = '';
var reprompt;
var welcomeOutput = "Which star sign's horoscope would you like to hear?";
var welcomeReprompt = "I didn't quite catch that, please request a star sign's horoscope, for example, Scorpio's horoscope.";
var starSign;
var existingStarSign;

var APP_ID = "amzn1.ask.skill.d373228d-ef5c-4a0c-a005-583c0d25bf11";

var AWSregion = 'us-east-1';

var params = {
    TableName: 'horoscopeUsers_starsign',
    Key: {"id": '0'}
};
 // 2. Skill Code =======================================================================================================
"use strict";
var Alexa = require('alexa-sdk');
var AWS = require('aws-sdk');

AWS.config.update({
    region: AWSregion
});

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.dynamoDBTableName = 'horoscopeUsers_starsign'; //TODO is this required once table exists?

    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
          this.emit(':ask', welcomeOutput, welcomeReprompt);
    },
	'AMAZON.HelpIntent': function () {
        speechOutput = "Just say the name of the star sign for which horoscope you would like to hear.";
        reprompt = "Try something like, what is scoprio's horoscope?";
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        speechOutput = 'Goodbye';
        this.emit(':tell', speechOutput);
    },
    'AMAZON.StopIntent': function () {
        speechOutput = 'Goodbye';
        this.emit(':tell', speechOutput);
    },
    'SessionEndedRequest': function () {
        speechOutput = 'Goodbye';
        this.emit(':tell', speechOutput);
    },
	'GetSpecificHoroscopeIntent': function () {
		speechOutput = "";
        starSign = this.event.request.intent.slots.zodiacSign.value;

        if ( !this.attributes['existingStarSign'] ) {
            this.attributes['existingStarSign'] = starSign;
            existingStarSign = this.attributes['existingStarSign'];
        }

        getHoroscope( (reading) => {
            speechOutput = reading;
            reprompt = "Which other horoscope would you like to hear, for example, Scorpio's horoscope or my horoscope?";
            this.emit(':ask', speechOutput, reprompt);
        });
    },
    'GetUserHoroscopeIntent': function () {
        speechOutput = "";
        // loading any previous session attributes from Dynamo into the session attributes
        if(this.attributes['existingStarSign']) {   // user has already set their star sign
            starSign = this.attributes['existingStarSign'];
            getHoroscope( (reading) => {
                speechOutput = reading;
                reprompt = "Which other horoscope would you like to hear, for example, Scorpio's horoscope or my horoscope?";
                this.emit(':ask', speechOutput, reprompt);
            });
        } else {    // user does not have their star sign set yet
            speechOutput = "What is your star sign?"
            reprompt = "Save your star sign for convenience, for example, my star sign is Scorpio"
            this.emit(':ask', speechOutput, reprompt);
        }
    },
    'GetZoidicSignFromDateIntent': function () {
        //delegate to Alexa to collect all the required slot values
        var filledSlots = delegateSlotCollection.call(this);
        var speechOutput = "";
        //any intent slot variables are listed here for convenience
        var dateSlot = this.event.request.intent.slots.date.value;
        console.log(dateSlot);

        //Your custom intent handling goes here
        speechOutput = "This is a place holder response for the intent named GetZoidicSignFromDateIntent, which includes dialogs. This intent has one slot, which is date. Anything else?";
        this.emit(":ask",speechOutput);
    },
    'GetCompatibleZodiacSignIntent': function () {
        //delegate to Alexa to collect all the required slot values
        var filledSlots = delegateSlotCollection.call(this);
        var speechOutput = "";
        //any intent slot variables are listed here for convenience
        var zodiacSignASlot = this.event.request.intent.slots.zodiacSignA.value;
        console.log(zodiacSignASlot);
        var zodiacSignBSlot = this.event.request.intent.slots.zodiacSignB.value;
        console.log(zodiacSignBSlot);

        //Your custom intent handling goes here
        speechOutput = "This is a place holder response for the intent named GetCompatibleZodiacSignIntent, which includes dialogs. This intent has 2 slots, which are zodiacSignA, and zodiacSignB. Anything else?";
        this.emit(":ask",speechOutput);
    },
    'SetUserZodiacSignIntent': function () {
        speechOutput = "Your star sign has been updated to ";
        reprompt = "Which star sign's horoscope would you like to hear, for example, Scorpio's horoscope or my horoscope";

        starSign = this.event.request.intent.slots.inputZodiacSign.value;
        this.attributes['existingStarSign'] = starSign;
        existingStarSign = this.attributes['existingStarSign'];

        this.emit(':ask', speechOutput + existingStarSign + '. ', reprompt);
    },
    'GetUserZodiacSignIntent': function () {
        if( starSign ) {
            speechOutput = "Your star sign is set to ";
            reprompt = "Which horoscope would you like to hear, for example, Scorpio's horoscope or my horoscope?";
            this.emit(':ask', speechOutput + starSign, reprompt);
        } else {
            speechOutput = "My crystal ball appears faulty, please enlighten me, what is your name and star sign?";
            reprompt = "Save your star sign for convenience, for example, my star sign is Scorpio";
            this.emit(':ask', speechOutput, reprompt);
        }

    }
};

//    END of Intent Handlers {} ========================================================================================
// 3. Helper Function  =================================================================================================

function getHoroscope(callback) {
    var http = require('http');
    var reading = '';
    var hsOptions = {
        host: 'widgets.fabulously40.com',
        path: `/horoscope.json?sign=${starSign}`,
        method: 'GET'
    };

    var req = http.request(hsOptions, (res) => {
        res.setEncoding('utf8');
        var returnData = "";

        res.on('data', (chunk) => {
            returnData = returnData + chunk;
        });
        res.on('end', () => {
            reading = JSON.parse(returnData).horoscope.horoscope;
            callback(reading);
        });
    });
    req.end();
}

function readUserStarSign(callback) {
    var AWS = require('aws-sdk');
    AWS.config.update({region: AWSregion});

    var docClient = new AWS.DynamoDB.DocumentClient();

    docClient.get(params, (err, data) => {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            callback(data.Item.existingStarSign);
        }
    });
}

function isSlotValid(request, slotName){
        var slot = request.intent.slots[slotName];
        console.log("request = "+JSON.stringify(request)); //uncomment if you want to see the request
        var slotValue;

        //if we have a slot, get the text and store it into speechOutput
        if (slot && slot.value) {
            //we have a value in the slot
            slotValue = slot.value.toLowerCase();
            return slotValue;
        } else {
            //we didn't get a value in the slot.
            return false;
        }
}

function delegateSlotCollection(){
  console.log("in delegateSlotCollection");
  console.log("current dialogState: " + this.event.request.dialogState);
    if (this.event.request.dialogState === "STARTED") {
      console.log("in Beginning");
	  var pdatedIntent = this.event.request.intent;
      //optionally pre-fill slots: update the intent object with slot values for which
      //you have defaults, then return Dialog.Delegate with this updated intent
      // in the updatedIntent property
      this.emit(":delegate", updatedIntent);
    } else if (this.event.request.dialogState !== "COMPLETED") {
      console.log("in not completed");
      // return a Dialog.Delegate directive with no updatedIntent property.
      this.emit(":delegate");
    } else {
      console.log("in completed");
      console.log("returning: "+ JSON.stringify(this.event.request.intent));
      // Dialog is now complete and all required slots should be filled,
      // so call your normal intent handler.
      return this.event.request.intent;
    }
}
