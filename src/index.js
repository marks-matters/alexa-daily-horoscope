/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

// There are three sections; Text Strings, Skill Code, and Helper Function(s).
// You can copy and paste the contents as the code for a new Lambda function, using the alexa-skill-kit-sdk-factskill template.
// This code includes helper functions for compatibility with versions of the SDK prior to 1.0.9, which includes the dialog directives.


 // 1. Text strings =====================================================================================================
 //    Modify these strings and messages to change the behavior of your Lambda function

var speechOutput;
var reprompt;
var welcomeOutput = "Which star sign's horoscope would you like to hear";
var welcomeReprompt = "Which star sign's horoscope would you like to hear, for example, Scorpio's horoscope";
var starSign;
console.log("Step 1");
 // 2. Skill Code =======================================================================================================
"use strict";
var Alexa = require('alexa-sdk');
var APP_ID = undefined;  // TODO replace with your app ID (OPTIONAL).
var speechOutput = '';
var handlers = {
    'LaunchRequest': function () {
          this.emit(':ask', welcomeOutput, welcomeReprompt);
    },
	'AMAZON.HelpIntent': function () {
        speechOutput = '';
        reprompt = '';
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        speechOutput = '';
        this.emit(':tell', speechOutput);
    },
    'AMAZON.StopIntent': function () {
        speechOutput = '';
        this.emit(':tell', speechOutput);
    },
    'SessionEndedRequest': function () {
        speechOutput = '';
        this.emit(':tell', speechOutput);
    },
	"GetSpecificHoroscopeIntent": function () {
		var speechOutput = "";
        var starSign = this.event.request.intent.slots.zodiacSign.value;

        var hsDesc = getHoroscope(starSign);

        this.emit(':tell', hsDesc);

    	//Your custom intent handling goes here
    	/*if ( slotValidity ) {
    	    speechOutput = "Your star sign is " + slotValidity;
    	    this.emit(':tell', speechOutput);
    	} else {
    	    speechOutput = "Please choose a valid star sign for it's horoscope, for example, Taurus's horoscope";
            this.emit(':ask',speechOutput);
    	}*/
    },
};

exports.handler = (event, context) => {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    //alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

//    END of Intent Handlers {} ========================================================================================
// 3. Helper Function  =================================================================================================

function delegateSlotCollection(){
  console.log("in delegateSlotCollection");
  console.log("current dialogState: "+this.event.request.dialogState);
    if (this.event.request.dialogState === "STARTED") {
      console.log("in Beginning");
	  var updatedIntent= null;
	  // updatedIntent=this.event.request.intent;
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

function getHoroscope(starSign) {
    var hsDesc = '';
    var http = require('http');
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
            var hsDesc = JSON.parse(returnData).horoscope.horoscope;
        });
    });
    req.end();

    return hsDesc;
}

function randomPhrase(array) {
    // the argument is an array [] of words or phrases
    var i = 0;
    i = Math.floor(Math.random() * array.length);
    return(array[i]);
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
