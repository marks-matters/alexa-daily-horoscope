/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

// There are three sections; Text Strings, Skill Code, and Helper Function(s).
// You can copy and paste the contents as the code for a new Lambda function, using the alexa-skill-kit-sdk-factskill template.
// This code includes helper functions for compatibility with versions of the SDK prior to 1.0.9, which includes the dialog directives.


 // 1. Text strings =====================================================================================================
var data = {
    'starSignDates': {
        'aries':        {'fromDate': '03-21', 'toDate': '04-19'},
        'taurus':       {'fromDate': '04-20', 'toDate': '05-20'},
        'gemini':       {'fromDate': '05-21', 'toDate': '06-20'},
        'cancer':       {'fromDate': '06-21', 'toDate': '07-22'},
        'leo':          {'fromDate': '07-23', 'toDate': '08-22'},
        'virgo':        {'fromDate': '08-23', 'toDate': '09-22'},
        'libra':        {'fromDate': '09-23', 'toDate': '10-22'},
        'scorpio':      {'fromDate': '10-23', 'toDate': '11-21'},
        'sagittarius':  {'fromDate': '11-22', 'toDate': '12-21'},
        'capricorn':    {'fromDate': '12-22', 'toDate': '12-31'},
        'capricorn':    {'fromDate': '01-01', 'toDate': '01-19'},
        'aquarius':     {'fromDate': '01-20', 'toDate': '02-18'},
        'pisces':       {'fromDate': '02-19', 'toDate': '03-20'}
    }
};

var speechOutput = '';
var reprompt;
var welcomeOutput = "Which star sign's horoscope would you like to hear?";
var welcomeReprompt = "I didn't quite catch that, please request a star sign's horoscope, for example, Scorpio's horoscope.";
var starSign;
var existingStarSign;
var dateOptions = {month: 'long', day: 'numeric', timeZone: 'utc'};

const appId = 'amzn1.ask.skill.d373228d-ef5c-4a0c-a005-583c0d25bf11';
const AWSregion = 'us-east-1';
const dbTableName = 'horoscopeUsers_starsign';

 // 2. Skill Code =======================================================================================================
"use strict";
var Alexa = require('alexa-sdk');
var AWS = require('aws-sdk');

AWS.config.update({
    region: AWSregion
});

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
//    alexa.appId = appId;
    alexa.dynamoDBTableName = dbTableName;
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
        // if the user is new, or has not set a star sign yet, set this as their star sign
        if ( Object.keys(this.attributes).length === 0 ) {
            this.attributes['existingStarSign'] = starSign;
            existingStarSign = this.attributes['existingStarSign'];
        }
        // get the horoscope of the star sign
        getHoroscope( (text) => {
            speechOutput = text;
            reprompt = "Which other horoscope would you like to hear, for example, Scorpio's horoscope or my horoscope?";
            this.emit(':ask', speechOutput, reprompt);
        });
    },
    'GetUserHoroscopeIntent': function () {
        speechOutput = "";
        // user has not set their star sign yet
        if( Object.keys(this.attributes).length === 0 ) {
            speechOutput = "What is your star sign?"
            reprompt = "Save your star sign for convenience, for example, my star sign is Scorpio."
            this.emit(':ask', speechOutput, reprompt);
        // user has already set their star sign
        } else {
            starSign = this.attributes['existingStarSign'];
            existingStarSign = this.attributes['existingStarSign'];
            getHoroscope( (reading) => {
                speechOutput = reading;
                reprompt = "Which other horoscope would you like to hear, for example, Cancer's horoscope or my horoscope?";
                this.emit(':ask', speechOutput, reprompt);
            });
        }
    },
    'GetZoidicSignFromDateIntent': function () {
        var speechOutput = "";
        // collect the date slot value
        compareToDate = new Date(this.event.request.intent.slots.date.value);
        var dateStarSign;
        // loop through the star sign dates, if the date lies in the date range then return the relevant star sign
        Object.keys(data.starSignDates).some( function(checkStarSign) {
            if( dateChecker(checkStarSign) ) {
                dateStarSign = checkStarSign;
                return true;    // quit loop
            }
        });

        if ( dateStarSign  ) {
            // if the user is new, or has not set a star sign yet, set this as their star sign
            if ( Object.keys(this.attributes).length === 0 ) {
                this.attributes['existingStarSign'] = dateStarSign;
                existingStarSign = this.attributes['existingStarSign'];
            }
            speechOutput = "The star sign for someone born on " + compareToDate.toLocaleString('en-GB', dateOptions) + " is " + dateStarSign;
            reprompt = "Ask for the star sign of a different date, or, check out your star sign's horoscope.";
        } else {
            speechOutput = "I don't quite know that date, please try a Gregorian calendar date.";
            reprompt = "Ask for the star sign of a different date, or, check out your star sign's horoscope.";
        }
        // emit the response, keep daily horoscope open
        this.emit(':ask', speechOutput, reprompt);
    },
    'GetCompatibleZodiacSignIntent': function () {
        var speechOutput = "";

        var starSignASlot = this.event.request.intent.slots.zodiacSignA.value;
        console.log(starSignASlot);
        var starSignBSlot = this.event.request.intent.slots.zodiacSignB.value;
        console.log(starSignBSlot);

        speechOutput = "This functionality is still being built";
        this.emit(":tell", speechOutput);
    },
    'SetUserZodiacSignIntent': function () {
        speechOutput = "Your star sign has been updated to ";
        reprompt = "Which star sign's horoscope would you like to hear, for example, Scorpio's horoscope or my horoscope.";
        // set setStarSign to the slot value that accompanies the SetUserZodiacSignIntent intent
        var setStarSign = this.event.request.intent.slots.inputZodiacSign.value;
        this.attributes['existingStarSign'] = setStarSign;
        existingStarSign = this.attributes['existingStarSign'];
        // emit the response, keep daily horoscope open
        this.emit(':ask', speechOutput + existingStarSign + '.', reprompt);
    },
    'GetUserZodiacSignIntent': function () {
        if( this.attributes['existingStarSign'] ) {
            speechOutput = "Your star sign is set to ";
            reprompt = "If this is not your star sign, you're welcome to change it, just ask.";
            existingStarSign = this.attributes['existingStarSign'];
            this.emit(':ask', speechOutput + existingStarSign, reprompt);
        } else {
            speechOutput = "My crystal ball appears faulty, please enlighten me, what is your name and star sign?";
            reprompt = "Save your star sign for convenience, for example, my star sign is Scorpio.";
            this.emit(':ask', speechOutput, reprompt);
        }

    }
};

// 3. Functions  =================================================================================================

function getHoroscope(callback) {
    var http = require('https');
    var hsOptions = {
        method: "GET",
        hostname: "new.theastrologer.com",
        port: null,
        path: "/" + starSign + "/"
    };
    var req = http.request(hsOptions, (res) => {
        //res.setEncoding('utf8');
        var body = "";

        res.on('data', (chunk) => {
            body += chunk;
        });
        res.on('end', () => {
            var indexTodayDiv = body.indexOf('<div class="row daily-meta">', body.indexOf('<div class="row daily-meta">') + 1);
            var relevantText = body.substring(indexTodayDiv - 800, indexTodayDiv);
            var indexPStart = relevantText.indexOf('<p>');
            var indexPEnd = relevantText.indexOf('</p>');
            var reading = relevantText.substring(indexPStart + 3, indexPEnd);
            callback(reading);
        });
    });
    req.end();
}

function dateChecker(zodiacSign) {
    var compareYear = compareToDate.getFullYear();
    var rawFromDate = data.starSignDates[zodiacSign].fromDate;
    var rawToDate = data.starSignDates[zodiacSign].toDate;

    var fromDate = new Date(Date.UTC(compareYear, rawFromDate.substr(0,2) - 1, rawFromDate.substr(3,2)));
    var toDate = new Date(Date.UTC(compareYear, rawToDate.substr(0,2) - 1, rawToDate.substr(3,2)));

    var dateRange = data.starSignDates[zodiacSign];
    if (compareToDate >= fromDate && compareToDate <= toDate) {
        return true;
    } else {
        return false;
    }
}
