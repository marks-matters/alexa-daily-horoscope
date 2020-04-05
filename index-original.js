// There are five sections; imports, definitions, interceptors, skill handers, and functions.
'use strict';
/* 0. IMPORT MODULES ======================================================================================= */
const Alexa = require("ask-sdk");
const AWS = require("aws-sdk");

/* 1. DECLARATIONS ================================================================================ */
nowUTC.setHours(now.getHours() - 1);
nowUTC = nowUTC.toISOString();
var today = nowUTC.substring(0, 10),
  compareToDate = new Date(),
  now = new Date(),
  nowUTC = new Date(now),
  dateOptions = { month: "long", day: "numeric", timeZone: "utc" },
  horoscopeData = {},
  speechOutput = "",
  reprompt = "",
  welcomeOutput = "Which star sign's horoscope would you like to hear?",
  welcomeReprompt =
    "I didn't quite catch that, please request a star sign's horoscope, for example, Scorpio's horoscope, or, ask for help to discover additional horoscope functionality.",
  starSign = "",
  starSignBase = "",
  starSignPartner = "",
  existingStarSign = "",
  missingStarSigns = [],
  successStatus = "",
  failedContext = "",
  paramsQueryAllReadings = {
    TableName: "horoscope_daily",
    KeyConditionExpression: "#dt = :today",
    IndexName: "date-index",
    ScanIndexForward: false,
    ExpressionAttributeNames: { "#dt": "date" },
    ExpressionAttributeValues: { ":today": today }
  },
  paramsQueryCompatibility = {
    TableName: "zodiac_sign_compatibility",
    KeyConditionExpression: "zodiac_sign_base = :star_sign_base AND zodiac_sign_partner = :star_sign_partner",
    // TODO Clean up
    // IndexName :                 'date-index',
    // ScanIndexForward :          false,
    ExpressionAttributeValues: {
      ":star_sign_base": starSignBase,
      ":star_sign_partner": starSignPartner
    }
  };

const appId = "",
  AWSregion = "us-east-1",
  sessionEventsTableName = "horoscopeUsers_starsign",
  data = {
    starSignDates: {
      aries: { fromDate: "03-21", toDate: "04-19" },
      taurus: { fromDate: "04-20", toDate: "05-20" },
      gemini: { fromDate: "05-21", toDate: "06-20" },
      cancer: { fromDate: "06-21", toDate: "07-22" },
      leo: { fromDate: "07-23", toDate: "08-22" },
      virgo: { fromDate: "08-23", toDate: "09-22" },
      libra: { fromDate: "09-23", toDate: "10-22" },
      scorpio: { fromDate: "10-23", toDate: "11-21" },
      sagittarius: { fromDate: "11-22", toDate: "12-21" },
      capricorn: { fromDate: "12-22", toDate: "12-31" },
      capricorn: { fromDate: "01-01", toDate: "01-19" },
      aquarius: { fromDate: "01-20", toDate: "02-18" },
      pisces: { fromDate: "02-19", toDate: "03-20" }
    }
  },
  allStarSigns = [
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpio",
    "sagittarius",
    "capricorn",
    "aquarius",
    "pisces"
  ];

/* 2. INTERCEPTORS ========================================================================================= */
const GetUserDataInterceptor = {
  process(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    // TODO: remove log
    console.log("sessionAttributes:", sessionAttributes);
    if (handlerInput.requestEnvelope.request.type === 'LaunchRequest' && Object.keys(sessionAttributes).length === 0) {
      return new Promise((resolve, reject) => {
        handlerInput.attributesManager.getPersistentAttributes()
        .then((persistentAttributes) => {
          existingStarSign = persistentAttributes["existingStarSign"];
          resolve();
        })
        .catch((error) => {
          reject(error);
        })
      });
    }}
};

/* 3. HANDLERS ============================================================================================= */
// function name can be anything, canHandle dictates what it handles
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
  },
  handle(handlerInput) {
    console.log("Request:", handlerInput.requestEnvelope.request.type);
    // if there is no stored horoscope
    if (existingStarSign == "") {
      console.log("STATUS New user!");
      return handlerInput.responseBuilder
        .speak(welcomeOutput)
        .reprompt(welcomeReprompt)
        .withSimpleCard("Daily Horoscope Skill by marks_matters", welcomeOutput)
        .getResponse();
    } else {
      console.log("Returning user with star sign:", existingStarSign);
      getHoroscope(starSign, reading => {
        if (reading) {
          successStatus = "Success";
          speechOutput =
            "Your daily horoscope for " +
            starSign +
            " is. " +
            reading +
            " You can hear other horoscopes, or, change your saved star sign. Just say stop to end.";
          // TODO: remove reprompt
          reprompt =
            "If you enjoy listening to your Daily Horoscope, let us know by reviewing this skill in the Alexa Store!";
        } else if (isAlphaTextString(starSign)) {
          failedContext = starSign;
        } else {
          failedContext = "that star sign";
        }
        successStatus = "Failure";
        speechOutput = "Oh no, there appears to be a problem today with my crystal ball for " + failedContext
          + "! I'll have to give it a polish, please try again later!";
        reprompt =
          "While I'm busy, you can ask for the star sign or horoscope of a specific date, or discover the compatibility between your and your partner's star signs.";
      });
      console.log("STATUS:", successStatus, ", Star sign queried:", starSign);
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt(reprompt)
        .withSimpleCard("Daily Horoscope Skill by marks_matters", speechOutput)
        .getResponse();
    }
  }
};

const CFIRGetSpecificHoroscopeIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "CanFulfillIntentRequest"
      && request.intent.name === "GetSpecificHoroscopeIntent";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    starSign = request.intent.slots.zodiacSign.value;
    if (validateStarSign(starSign)) {
      getHoroscope(starSign, text => {
        if (text) {
          console.log("CFIR GetSpecificHoroscopeIntent, reading: YES, zodiacSign: YES");
          return handlerInput.responseBuilder
            .withCanFulfillIntent({
              canFulfill: "YES",
              slots: {
                zodiacSign: {
                  canUnderstand: "YES",
                  canFulfill: "YES"
                }
              }
            })
            .getResponse();
        } else {
          console.log("CFIR GetSpecificHoroscopeIntent, reading: NO, zodiacSign: YES");
          return handlerInput.responseBuilder
            .withCanFulfillIntent({
              canFulfill: "NO",
              slots: {
                zodiacSign: {
                  canUnderstand: "YES",
                  canFulfill: "NO"
                }
              }
            })
            .getResponse();
        }
      });
    } else {
      console.log("CFIR GetSpecificHoroscopeIntent, zodiacSign: MAYBE");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "MAYBE",
          slots: {
            zodiacSign: {
              canUnderstand: "MAYBE",
              canFulfill: "NO"
            }
          }
        })
        .getResponse();
    }
  }
};

const GetSpecificHoroscopeIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "IntentRequest"
      && request.intent.name === "GetSpecificHoroscopeIntent";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Request:", request.intent.name);
    speechOutput = "";
    reprompt = "";
    starSign = request.intent.slots.zodiacSign.value;
    // if the user is new, or has not set a star sign yet, set this as their star sign
    if (validateStarSign(starSign)) {
      if (Object.keys(this.attributes).length === 0) {
        this.attributes["existingStarSign"] = starSign;
        existingStarSign = this.attributes["existingStarSign"];
        console.log("Star sign set to:", existingStarSign);
      }
    }
    // get the horoscope of the star sign
    getHoroscope(starSign, text => {
      if (text) {
        successStatus = "Success";
        speechOutput = text + " Which other horoscope would you like to hear?";
        reprompt = "You can hear daily horoscopes for all star signs, just ask for, Scorpio's horoscope, or, my horoscope?";
      } else {
        if (isAlphaTextString(starSign)) {
          failedContext = starSign;
        } else {
          failedContext = "that star sign";
        }
        successStatus = "Failure";
        speechOutput = "Oh no, there appears to be a problem today with my crystal ball for " + failedContext
          + "! While I work on a reading for " + failedContext + ", give a different star sign a go!";
        reprompt =
          "While I'm busy, you can ask for the star sign or horoscope of a specific date, or discover the compatibility between your and your partner's star signs.";
      }
      console.log("STATUS:", successStatus, ", Star sign queried:", starSign);
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt(reprompt)
        .withSimpleCard("Daily Horoscope Skill by marks_matters", speechOutput)
        .getResponse();
    });
  }
};

const CFIRGetUserHoroscopeIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "CanFulfillIntentRequest"
      && request.intent.name === "GetUserHoroscopeIntent";
  },
  handle(handlerInput) {
    if (Object.keys(this.attributes).length === 0) {
      console.log("CFIR GetUserHoroscopeIntent: MAYBE, existingStarSign: NO");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "MAYBE"
          }
        )
        .getResponse();
    } else {
      console.log("CFIR GetUserHoroscopeIntent: YES, existingStarSign: YES");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "YES"
          }
        )
        .getResponse();
    }
  }
};

const GetUserHoroscopeIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "IntentRequest"
      && request.intent.name === "GetUserHoroscopeIntent";
  },
  handle(handlerInput) {
    console.log("Request:", handlerInput.requestEnvelope.request.intent.name);
    speechOutput = "";
    reprompt = "";
    // user has not set their star sign yet
    if (Object.keys(this.attributes).length === 0) {
      speechOutput =
        "My crystal ball appears misty! Please enlighten me, what would you like to save as your star sign, or you can ask for the horoscope of any other star sign?";
      reprompt = "Save your star sign for convenience, for example, try saying, save my star sign as Scorpio.";
      console.log("STATUS New User!");
      return handlerInput.getResponse
        .speak(speechOutput)
        .reprompt(reprompt)
        .withSimpleCard("Daily Horoscope Skill by marks_matters", speechOutput)
        .getResponse();
    // user has already set their star sign
    } else {
      starSign = this.attributes["existingStarSign"];
      existingStarSign = this.attributes["existingStarSign"];
      getHoroscope(starSign, reading => {
        if (reading) {
          successStatus = "Success";
          speechOutput = starSign + ". " + reading
            + " Just ask for any other star sign's horoscope, or, update your saved star sign.";
          reprompt = "";
          // reprompt = "Ask for help to discover additional horoscope functionality. Just say stop to end.";
        } else {
          if (isAlphaTextString(starSign)) {
            failedContext = starSign;
          } else {
            failedContext = "that star sign";
          }
          successStatus = "Failure";
          speechOutput = "Oh no, there appears to be a problem today with my crystal ball for "
            + failedContext + "! Try again later, I'll give my crystal ball a polish!";
          reprompt =
            "While I'm busy, you can ask for help to discover additional horoscope functionality.";
        }
        console.log("STATUS", successStatus, ", Star sign queried:", starSign);
        return handlerInput.getResponse
          .speak(speechOutput)
          .reprompt(reprompt)
          .withSimpleCard("Daily Horoscope Skill by marks_matters", speechOutput)
          .getResponse();
      });
    }
  }
};

const CFIRGetZoidicSignFromDateIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "CanFulfillIntentRequest"
      && request.intent.name === "GetZoidicSignFromDateIntent";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Request:", request.intent.name);
    compareToDate = new Date(request.intent.slots.dateForZodiacSign.value);
    const dateStarSign = starSignFromDate(compareToDate);
    if (validateDate(compareToDate) && dateStarSign) {
      console.log("CFIR GetZoidicSignFromDateIntent: YES, dateStarSign: YES");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "YES",
          slots: {
            dateForZodiacSign: {
              canUnderstand: "YES",
              canFulfill: "YES"
            }
          }
        })
        .getResponse();
    } else {
      console.log("CFIR GetZoidicSignFromDateIntent: MAYBE, compareToDate/dateStarSign: NO");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "MAYBE",
          slots: {
            dateForZodiacSign: {
              canUnderstand: "MAYBE",
              canFulfill: "NO"
            }
          }
        })
        .getResponse();
    }
  }
};

const GetZoidicSignFromDateIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "IntentRequest"
      && request.intent.name === "GetZoidicSignFromDateIntent";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Request:", request.intent.name);
    speechOutput = "";
    reprompt = "";
    // collect the date slot value
    compareToDate = new Date(request.intent.slots.dateForZodiacSign.value);
    const dateStarSign = starSignFromDate(compareToDate);
    // check that the star sign was returned correctly from the date
    if (dateStarSign) {
      // if the user is new, or has not set a star sign yet, set this as their star sign
      if (Object.keys(this.attributes).length === 0) {
        this.attributes["existingStarSign"] = dateStarSign;
        existingStarSign = this.attributes["existingStarSign"];
        console.log("Star sign set to:", existingStarSign);
      }
      successStatus = "Success";
      speechOutput = "The star sign for someone born on " + compareToDate.toLocaleString("en-GB", dateOptions)
        + " is " + dateStarSign + ". Which other date, or, which other star sign's horoscope would you like to know?";
      reprompt = "Ask for the star sign of a different date of birth, or, check out any star sign's horoscope.";
    } else {
      successStatus = "Failure";
      speechOutput = "Hmmm, I don't quite know that date, please try a Gregorian calendar date.";
      reprompt =
        "Ask for the star sign of a different date, for example, someone born today, or the star sign for January, the third. Or, ask for help to discover additional horoscope functionality.";
    }
    console.log("STATUS", successStatus, ", Date queried:", compareToDate);
    // emit the response, keep daily horoscope open
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(reprompt)
      .withSimpleCard("Daily Horoscope Skill by marks_matters", speechOutput)
      .getResponse();
  }
};

const CFIRGetCompatibilityIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "CanFulfillIntentRequest"
      && request.intent.name === "GetCompatibilityIntent";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const zodiacSignA = request.intent.slots.zodicSignA.value;
    const zodiacSignB = request.intent.slots.zodicSignB.value;
    if (validateStarSign(zodiacSignA) && validateStarSign(zodiacSignB)) {
      console.log("CFIR GetCompatibilityIntent: YES, zodicSignA: YES, zodicSignB: YES");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "YES",
          slots: {
            zodiacSignA: {
              canUnderstand: "YES",
              canFulfill: "YES"
            },
            zodiacSignB: {
              canUnderstand: "YES",
              canFulfill: "YES"
            }
          }
        })
        .getResponse();
    } else {
      if (validateStarSign(zodiacSignA)) {
        console.log("CFIR GetCompatibilityIntent: MAYBE, zodicSignA: YES, zodicSignB: NO");
        return handlerInput.responseBuilder
          .withCanFulfillIntent({
            canFulfill: "MAYBE",
            slots: {
              zodiacSignA: {
                canUnderstand: "YES",
                canFulfill: "YES"
              },
              zodiacSignB: {
                canUnderstand: "MAYBE",
                canFulfill: "NO"
              }
            }
          })
          .getResponse();
      } else {
        if (validateStarSign(zodiacSignB)) {
          console.log("CFIR GetCompatibilityIntent: MAYBE, zodicSignA: NO, zodicSignB: YES");
          return handlerInput.responseBuilder
            .withCanFulfillIntent({
              canFulfill: "MAYBE",
              slots: {
                zodiacSignA: {
                  canUnderstand: "MAYBE",
                  canFulfill: "NO"
                },
                zodiacSignB: {
                  canUnderstand: "YES",
                  canFulfill: "YES"
                }
              }
            })
            .getResponse();
        } else {
          console.log("CFIR GetCompatibilityIntent: MAYBE, zodicSignA: NO, zodicSignB: NO");
          return handlerInput.responseBuilder
            .withCanFulfillIntent({
              canFulfill: "MAYBE",
              slots: {
                zodiacSignA: {
                  canUnderstand: "MAYBE",
                  canFulfill: "NO"
                },
                zodiacSignB: {
                  canUnderstand: "MAYBE",
                  canFulfill: "NO"
                }
              }
            })
            .getResponse();
        }
      }
    }
  }
};

const GetCompatibilityIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type == "IntentRequest"
      && request.intent.name == "GetCompatibilityIntent";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Request:", request.intent.name);
    speechOutput = "";
    reprompt = "";
    const starSignASlot = request.intent.slots.zodiacSignA.value;
    const starSignBSlot = request.intent.slots.zodiacSignB.value;
    // if the user is new, or has not set a star sign yet, set the base star sign as their star sign
    if ( validateStarSign(starSignASlot) ) {
      if (Object.keys(this.attributes).length === 0) {
        this.attributes["existingStarSign"] = starSignASlot;
        existingStarSign = this.attributes["existingStarSign"];
        console.log("Star sign set to:", existingStarSign);
      }
    }
    // get the horoscope of the star sign
    getCompatibility(starSignASlot, starSignBSlot, text => {
      if (text) {
        speechOutput =
          text +
          " Which other star signs' compatibility would you like to hear, or you can hear the horoscope for a specific star sign?";
        reprompt =
          "You can also hear daily horoscopes for all star signs, just ask for, Scorpio's horoscope, or, my horoscope?";
        successStatus = "Success";
      } else {
        // determine failure context to repond with
        if (isAlphaTextString(starSignASlot)) {
          if (isAlphaTextString(starSignBSlot)) {
            failedContext = " for " + starSignASlot + " and " + starSignBSlot;
          } else {
            failedContext = "for " + starSignASlot + " and the other unknown star sign";
          }
        } else {
          if (isAlphaTextString(starSignBSlot)) {
            failedContext = "for " + starSignBSlot + " and the other unknown star sign";
          } else {
            failedContext = "as both star signs are unknown";
          }
        }
        speechOutput = "There appears to be a problem with my crystal ball " + failedContext + "! Please try again.";
        reprompt = "You can ask for the star sign or horoscope of a specific date, or, hear the horoscope for a specific star sign.";
        successStatus = "Failure, failedContext: " + failedContext;
      }
      console.log("STATUS", successStatus, ", starSignASlot:", starSignASlot, ", starSignBSlot:", starSignBSlot);
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt(reprompt)
        .withSimpleCard("Daily Horoscope Skill by marks_matters", speechOutput)
        .getResponse();
    });
  }
};

const CFIRSetUserZodiacSignIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "CanFulfillIntentRequest"
      && request.intent.name === "SetUserZodiacSignIntent";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const setStarSign = request.intent.slots.inputZodiacSign.value;
    if (validateStarSign(setStarSign)) {
      console.log("CFIR SetUserZodiacSignIntent: YES, inputZodiacSign: YES");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "YES",
          slots: {
            inputZodiacSign: {
              canUnderstand: "YES",
              canFulfill: "YES"
            }
          }
        })
        .getResponse();
    } else {
      console.log("CFIR SetUserZodiacSignIntent: MAYBE, inputZodiacSign: NO");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "MAYBE",
          slots: {
            inputZodiacSign: {
              canUnderstand: "MAYBE",
              canFulfill: "NO"
            }
          }
        })
        .getResponse();
    }
  }
};

const SetUserZodiacSignIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "IntentRequest"
      && request.intent.name === "SetUserZodiacSignIntent";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Request:", request.intent.name);
    speechOutput = "";
    reprompt = "";
    // set setStarSign to the slot value that accompanies the SetUserZodiacSignIntent intent
    const setStarSign = request.intent.slots.inputZodiacSign.value;
    if (validateStarSign(setStarSign)) {
      this.attributes["existingStarSign"] = setStarSign;
      existingStarSign = this.attributes["existingStarSign"];
      successStatus = "Success";
      speechOutput =
        "Your star sign has been updated to " +
        existingStarSign +
        ". Would you like to hear your horoscope, or you can hear any other star sign's horoscope?";
      reprompt =
        "Which star sign's horoscope would you like to hear, for example, Scorpio's horoscope, or, my horoscope.";
    } else {
      if (isAlphaTextString(setStarSign)) {
        failedContext = setStarSign;
      } else {
        failedContext = "that star sign";
      }
      speechOutput =
        "Hmmm... I don't recognize " +
        failedContext +
        ". Please try again by setting one of the 12 signs of the Zodiac as your star sign.";
      reprompt =
        "Set your star sign, for example, say; set my star sign to Scorpio.";
      successStatus = "Failure";
    }
    console.log("STATUS", successStatus, ",Star sign set to:", setStarSign);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(reprompt)
      .withSimpleCard("Daily Horoscope Skill by marks_matters", speechOutput)
      .getResponse();
  }
};

const CFIRGetUserZodiacSignIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "CanFulfillIntentRequest"
      && request.intent.name === "GetUserZodiacSignIntent";
  },
  handle(handlerInput) {
    if (this.attributes["existingStarSign"]) {
      console.log("CFIR GetUserZodiacSignIntent: YES, existingStarSign: YES");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "YES"
          }
        )
        .getResponse();
    } else {
      console.log("CFIR GetUserZodiacSignIntent: NO, existingStarSign: NO");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "MAYBE"
          }
        )
        .getResponse();
    }
  }
};

const GetUserZodiacSignIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "IntentRequest"
      && request.intent.name === "GetUserZodiacSignIntent";
  },
  handle(handlerInput) {
    console.log("Request:", handlerInput.requestEnvelope.request.intent.name);
    speechOutput = "";
    reprompt = "";
    if (this.attributes["existingStarSign"]) {
      console.log("STATUS", successStatus, "Retrieved star sign:", existingStarSign);
      existingStarSign = this.attributes["existingStarSign"];
      speechOutput = "Your star sign is set to " + existingStarSign +
        ". You're welcome to change it, or, you can hear your horoscope for the day.";
      reprompt = "You can change your saved star sign by asking, for example, set my star sign to Scorpio.";
      successStatus = "Success";
    } else {
      console.log("STATUS", successStatus, "Retrieved star sign:", existingStarSign);
      speechOutput =
        "My crystal ball appears faulty, please enlighten me, what would you like to save as your star sign, or, you can ask for the horoscope of any other star sign?";
      reprompt =
        "Save your star sign for convenience, for example, my star sign is Scorpio, and have easy access to your daily, updated horoscope.";
      successStatus = "Failure";
    }
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(reprompt)
      // TODO: improve visual response using existingStarSign
      .withSimpleCard("Daily Horoscope Skill by marks_matters", speechOutput)
      .getResponse();
  }
};

const CFIRGetHoroscopeFromDateIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "CanFulfillIntentRequest"
      && request.intent.name === "GetHoroscopeFromDateIntent";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const compareToDate = request.intent.slots.dateForHoroscope.value;
    if (validateDate(compareToDate)) {
      console.log("CFIR GetHoroscopeFromDateIntent: YES, compareToDate: YES");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "YES",
          slots: {
            dateForHoroscope: {
              canUnderstand: "YES",
              canFulfill: "YES"
            }
          }
        })
        .getResponse();
    // TODO: Could be improved to handle both a date failure or a horoscope failure
    } else {
      console.log("CFIR GetHoroscopeFromDateIntent: NO, compareToDate: NO");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "MAYBE",
          slots: {
            dateForHoroscope: {
              canUnderstand: "MAYBE",
              canFulfill: "NO"
            }
          }
        })
        .getResponse();
    }
  }
};

const GetHoroscopeFromDateIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "IntentRequest"
      && request.intent.name === "GetHoroscopeFromDateIntent";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Request:", request.intent.name);
    speechOutput = "";
    reprompt = "";
    // collect the date slot value
    compareToDate = new Date(request.intent.slots.dateForHoroscope.value);
    const dateStarSign = starSignFromDate(compareToDate);
    // check that the star sign was returned correctly from the date
    if (dateStarSign) {
      // get the horoscope for the star sign
      starSign = dateStarSign;
      getHoroscope(starSign, text => {
        // check that the horoscope was returned correctly for the star sign
        if (text) {
          // if the user is new, or has not set a star sign yet, set this as their star sign
          if (Object.keys(this.attributes).length === 0) {
            this.attributes["existingStarSign"] = dateStarSign;
            existingStarSign = this.attributes["existingStarSign"];
            console.log("Star sign set to:", existingStarSign);
          }
          successStatus = "Success";
          speechOutput = dateStarSign + ". " + text
            + " Would you like to hear the horoscope, or, the star sign for a different date?";
          reprompt = "Ask for the horoscope of a different date of birth, or, check out any star sign's horoscope.";
        } else {
          successStatus = "Success but getHoroscope: Failure";
          speechOutput =
            "There appears to be a problem with my crystal ball! Please try again later, or, ask for the horoscope of a different date of birth.";
          reprompt = "You can ask for the horoscope, or, star sign for a specific birthday.";
        }
        console.log("STATUS", successStatus, ", Date queried:", compareToDate, ", Star sign returned:", starSign);
        return handlerInput.responseBuilder
          .speak(speechOutput)
          .reprompt(reprompt)
          .withSimpleCard("Daily Horoscope Skill by marks_matters", speechOutput)
          .getResponse();
      });
    } else {
      speechOutput = "Hmmm, I don't quite know that date, please try a Gregorian calendar date.";
      reprompt =
        "Ask for the horoscope of a specific date of birth, for example, someone born today, or, the horoscope for January, the third. Or, you can check out any star sign's horoscope.";
      successStatus = "Failure";
      console.log("STATUS", successStatus, ", Date queried:", compareToDate);
      // emit the response, keep daily horoscope open
      return (
        handlerInput.responseBuilder
          .speak(speechOutput)
          .reprompt(reprompt)
          // TODO: display error response to user
          .withSimpleCard(
            "Daily Horoscope Skill by marks_matters",
            speechOutput
          )
          .getResponse()
      );
    }
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    // simplify condition syntax
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      // will handle the standard AMAZON.HelpIntent
      request.intent.name === "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput) {
    console.log("Request:", handlerInput.requestEnvelope.request.intent.name);
    speechOutput =
      "Your Daily Horoscope skill has five, fun functionalities. You can get horoscope readings by star sign, get the star sign or horoscope for someone born on a specific date, find out the relationship compatibility between two star signs, and you can set your star sign and then get a daily horoscope reading by simply asking Daily Horoscope for my daily horoscope!";
    reprompt = "Try something like, set my star sign to Taurus, or what is the horoscope for Scorpio?";
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(reprompt)
      .withSimpleCard("Daily Horoscope Skill by marks_matters", speechOutput)
      .getResponse();
  }
};

const StopIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (request.type === "IntentRequest"
      && (request.intent.name === 'AMAZON.PauseIntent'
        || request.intent.name === "AMAZON.CancelIntent"
        || request.intent.name === "AMAZON.StopIntent"
      )
    );
  },
  handle(handlerInput) {
    console.log("Request:", handlerInput.requestEnvelope.request.intent.name);
    speechOutput = getRandomItem([
      "Goodbye",
      "See you next time",
      "Bye",
      "Cheers",
      ""
    ]);
    // TODO: makes sure this doesn't break anything
    this.emit(':saveState', true);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .withSimpleCard("Daily Horoscope Skill by marks_matters", speechOutput)
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("~~~~~~~~~~~~~~~~~~~");
    console.log(request.type, request.reason);
    console.log("~~~~~~~~~~~~~~~~~~~");
    // this makes sure to save the session data in case of an unexpected end to the session
    this.emit(":saveState", true);
  }
};

/* 4. FUNCTIONS  =========================================================================================== */
function isTextString(text) {
  var isText = false;
  if (/^[a-zA-Z][a-zA-Z0-9- !,?:'.();"]*$/.test(text) && typeof text != "undefined") {
    isText = true;
  }
  return isText;
}

function isAlphaTextString(text) {
  var isAlphaText = false;
  if (isTextString(text) && /^[a-zA-Z][a-zA-Z]*$/.test(text)) {
    isAlphaText = true;
  }
  return isAlphaText;
}

function getStoredCompatibility(callback) {
  var docClient = new AWS.DynamoDB.DocumentClient();
  var params = paramsQueryCompatibility;
  docClient.query(params, (err, data) => {
    if (err) {
      console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      context.fail(JSON.stringify(err, null, 2));
    } else {
      callback(data);
    }
  });
}

function getStoredHoroscope(callback) {
  var docClient = new AWS.DynamoDB.DocumentClient();
  var params = paramsQueryAllReadings;
  docClient.query(params, (err, data) => {
    if (err) {
      console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      context.fail(JSON.stringify(err, null, 2));
    } else {
      callback(data);
    }
  });
}

function getCompatibility(starSignBase, starSignPartner, callback) {
  if (validateStarSign(starSignBase) && validateStarSign(starSignPartner)) {
    var upperCaseStarSignBase = starSignBase[0].toUpperCase() + starSignBase.substring(1);
    var upperCaseStarSignPartner = starSignPartner[0].toUpperCase() + starSignPartner.substring(1);
    paramsQueryCompatibility.ExpressionAttributeValues[":star_sign_base"] = upperCaseStarSignBase;
    paramsQueryCompatibility.ExpressionAttributeValues[":star_sign_partner"] = upperCaseStarSignPartner;
    getStoredCompatibility(compatibilityObject => {
      // Assume only one is available, hence select the first occurance
      var compatibilityItems = compatibilityObject.Items[0];
      var compatibility = compatibilityItems.compatibility;
      callback(compatibility);
    });
  } else {
    callback(false);
  }
}

// Iterates through the list of missing star signs and calls a download and then DB update function
function horoscopeDownloadAndDbUpdate(horoscopeList, callback) {
  var successStatus = false;
  var missingList = horoscopeList;
  (function getNextReading() {
    var getStarSign = missingList.splice(0, 1)[0];
    try {
      downloadHoroscope(getStarSign, (updateStarSign, scrapedHoroscope) => {
        updateDBHoroscope(updateStarSign, scrapedHoroscope, updateStatus => {
          if (missingList.length == 0) {
            successStatus = true;
            callback(successStatus);
          } else {
            getNextReading();
          }
        });
      });
    } catch (exception) {
      callback(exception);
    }
  })();
}

function downloadHoroscope(downloadStarSign, callback) {
  console.log("downloadHoroscope with downloadStarSign:", downloadStarSign);
  var http = require("https");
  var hsOptions = {
    method: "GET",
    hostname: "new.theastrologer.com",
    port: null,
    path: "/" + downloadStarSign + "/"
  };
  var req = http.request(hsOptions, res => {
    res.setEncoding("utf8");
    var body = "";
    res.on("data", chunk => {
      body += chunk;
    });
    res.on("end", () => {
      var indexTodayDiv = body.indexOf('<div class="row daily-meta">', body.indexOf('<div class="row daily-meta">') + 1);
      var relevantText = body.substring(indexTodayDiv - 2800, indexTodayDiv);
      var indexPStart = relevantText.indexOf("<p>");
      var indexPEnd = relevantText.indexOf("</p>", indexPStart);
      var reading = relevantText.substring(indexPStart + 3, indexPEnd);
      var hrefOccrences = (reading.match(new RegExp("<a href", "g")) || []).length;
      if (hrefOccrences > 0) {
        for (var i = 0; i < hrefOccrences; i++) {
          var indexHStart = reading.indexOf("<a href");
          var indexHEnd = reading.indexOf("</a>", indexHStart);
          reading = reading.substring(0, indexHStart) + reading.substring(indexHEnd);
          reading = reading.replace('</a></div>" >', "").replace("</a>", "");
        }
      }
      reading = reading.replace("--", "-");
      if (isTextString(reading)) {
        callback(downloadStarSign, reading);
      } else {
        console.log("!!! ERROR !!! DOWNLOAD FAILED FOR:", downloadStarSign);
        console.log("Reading:", reading);
        callback(downloadStarSign, "<error>");
      }
    });
  });
  req.end();
}

function updateDBHoroscope(downloadedStarSign, downloadedHoroscope, callback) {
  var docClient = new AWS.DynamoDB.DocumentClient();
  var params = {
    TableName: "horoscope_daily",
    Item: {
      zodiac_sign: downloadedStarSign,
      date: today,
      horoscope_reading: downloadedHoroscope
    }
  };
  docClient.put(params, function(err, data) {
    if (err) {
      console.error("ERROR WITH TABLE UPDATE:", JSON.stringify(err, null, 2));
      callback(false);
    } else {
      callback(true); //TODO determine purpose
    }
  });
}

// calls a downloader for all star signs, then updates a list of missing star signs
// and passes that list to the download and update dispatcher
function downloadAndReturnHoroscopes(callback) {
  getStoredHoroscope(dynamoHoroscopes => {
    for (var eachStarSign of allStarSigns) {
      var missing = true;
      dynamoHoroscopes.Items.forEach(function(horoscope) {
        if (horoscope.zodiac_sign.toUpperCase() == eachStarSign.toUpperCase()) {
          missing = false;
        }
      });
      if (missing) {
        missingStarSigns.push(eachStarSign);
      }
    }
    if (Object.keys(missingStarSigns).length === 0) {
      callback(dynamoHoroscopes);
    } else {
      horoscopeDownloadAndDbUpdate(missingStarSigns, scrapeStatus => {
        getStoredHoroscope(completeHoroscopeList => {
          callback(completeHoroscopeList);
        });
      });
    }
  });
}

// return the horoscope if in session
// otherwise, fetch db values for horoscopes for today
function getHoroscope(retrieveStarSign, callback) {
  var reading = "";
  // validate requested star sign
  if (validateStarSign(retrieveStarSign)) {
    // check if there is session level horoscope data
    if (Object.keys(horoscopeData).length === 0) {
      // no session horoscope data
      downloadAndReturnHoroscopes(dynamoDBData => {
        horoscopeData = dynamoDBData;
        horoscopeData.Items.some(function(horoscope) {
          if (
            horoscope.zodiac_sign.toUpperCase() == retrieveStarSign.toUpperCase()
              && isTextString(horoscope.horoscope_reading)
          ) {
            reading = horoscope.horoscope_reading;
            return true;
            // no horoscope reading to return :(
          } else {
            return false;
          }
        });
        // replaces invalid XML (< > & " ')
        reading = encodeXML(reading);
        callback(reading);
      });
    } else {
      // all horoscope data is in session
      horoscopeData.Items.some(function(horoscope) {
        if (
          horoscope.zodiac_sign.toUpperCase() == retrieveStarSign.toUpperCase()
            && isTextString(horoscope.horoscope_reading)
        ) {
          reading = horoscope.horoscope_reading;
          return true;
          // no horoscope reading to return :(
        } else {
          return false;
        }
      });
      // replaces invalid XML (< > & " ')
      reading = encodeXML(reading);
      callback(reading);
    }
  } else {
    callback(false);
  }
}

function starSignFromDate(dateToCompare) {
  console.log("starSignFromDate for date:", JSON.stringify(dateToCompare));
  var starSignForDate = "";
  // checks that the date passed is a valid date
  if (validateDate(dateToCompare)) {
    var compareYear = dateToCompare.getFullYear() || 2020;
    // loop through the star sign dates, if the date lies in the date range then return the relevant star sign
    Object.keys(data.starSignDates).some(function(checkStarSign) {
      var rawFromDate = data.starSignDates[checkStarSign].fromDate;
      var rawToDate = data.starSignDates[checkStarSign].toDate;
      var fromDate = new Date(Date.UTC(compareYear, rawFromDate.substr(0, 2) - 1, rawFromDate.substr(3, 2)));
      var toDate = new Date(Date.UTC(compareYear, rawToDate.substr(0, 2) - 1, rawToDate.substr(3, 2)));
      // check date to see if it lies in the date range of the star sign
      if (dateToCompare >= fromDate && dateToCompare <= toDate) {
        starSignForDate = checkStarSign;
      }
    });
    return starSignForDate;
  } else {
    return false;
  }
}

function saveUserData(handlerInput, starSignAttribute) {
  if(validateStarSign(starSignAttribute)) {
    let mappAttr = {
      "existingStarSign": starSignAttribute
    }
    handlerInput.attributesManager.setPersistentAttributes(mappAttr);
    return new Promise((resolve, reject) => {
      handlerInput.attributesManager.savePersistentAttributes()
        .then(() => {
          console.log("SUCCESS: Saved user star sign to table horoscopeUsers_starsign.");
          resolve();
        })
        .catch((error) => {
          console.log("ERROR: Failed to save user star sign to horoscopeUsers_starsign.", error);
          reject(error);
        });
    });
  }
}

/* STAR SIGN VALIDATION */
function validateStarSign(starSignInQuestion) {
  var legitStarSign = false;
  if (isAlphaTextString(starSignInQuestion)) {
    allStarSigns.forEach(function(starSignToCompare) {
      if (starSignToCompare.toUpperCase() == starSignInQuestion.toUpperCase()) {
        legitStarSign = true;
      }
    });
  }
  return legitStarSign;
}

/* DATE VALIDATION */
function validateDate(dateToCheck) {
  return (
    dateToCheck
      && Object.prototype.toString.call(dateToCheck) === "[object Date]"
      && !isNaN(dateToCheck)
  );
}

/* 5. LAMBDA SETUP ========================================================================================= */
// Alexa Skills Kit (ASK) V2 for Node.js, ask-sdk
// Great article about the differences https://www.talkingtocomputers.com/alexa-skills-kit-ask-sdk-v2
const skillBuilder = Alexa.SkillBuilders.standard();
exports.handler = skillBuilder
  .addRequestHandlers(
    /* Order matters */
    LaunchRequestHandler,
    CFIRGetSpecificHoroscopeIntent,
    GetSpecificHoroscopeIntent,
    CFIRGetUserHoroscopeIntent,
    GetUserHoroscopeIntent,
    CFIRGetZoidicSignFromDateIntent,
    GetZoidicSignFromDateIntent,
    CFIRGetHoroscopeFromDateIntent,
    GetHoroscopeFromDateIntent,
    CFIRGetUserZodiacSignIntent,
    GetUserZodiacSignIntent,
    CFIRSetUserZodiacSignIntent,
    SetUserZodiacSignIntent,
    CFIRGetCompatibilityIntent,
    GetCompatibilityIntent,
    HelpIntentHandler
  )
  .addErrorHandlers(
    /* Order matters */
    StopIntentHandler,
    SessionEndedRequestHandler
  )
  .addRequestInterceptors(
    GetUserDataInterceptor
  )
  .withSkillId(appId)
  .withTableName(sessionEventsTableName)
  // .withPartitionKeyGenerator(userId)
  .withAutoCreateTable(false)
  // .withDynamoDbClient(new AWS.DynamoDB( {apiVersion: "latest", region: AWSregion} ))
  .withDynamoDbClient()
  .lambda();
