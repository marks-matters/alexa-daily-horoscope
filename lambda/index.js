// There are five sections; imports, definitions, interceptors, skill handlers, and functions.
'use strict';
/* 0. IMPORT MODULES ======================================================================================= */
const Alexa = require("ask-sdk");
const AWS = require("aws-sdk");
var https = require("https");

/* 1. DECLARATIONS ================================================================================ */
const appId = "",
  AWSregion = "us-east-1",
  sessionEventsTableName = "daily_horoscope_users",
  displayTextTitle = "Your Daily Horoscope by marks_matters",
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

var now = new Date(),
  nowUTC = new Date(now),
  compareToDate = new Date(),
  dateOptions = { month: "long", day: "numeric", timeZone: "utc" },
  horoscopeData = {},
  speechOutput = "",
  reprompt = "",
  welcomeOutput = "Which star sign's horoscope would you like to hear?",
  welcomeReprompt =
    "I didn't quite catch that, please request a star sign's horoscope, for example, Scorpio's horoscope, or, ask for help to discover additional horoscope functionality.",
  starSignQueried = "",
  starSignBase = "",
  starSignPartner = "",
  userStarSign = "",
  updatedStarSign = "",
  missingStarSigns = [],
  successStatus = "",
  failedContext = "";

nowUTC.setHours ( now.getHours() - 1 );
nowUTC = nowUTC.toISOString();

var today = nowUTC.substring(0,10);

var paramsQueryAllReadings = {
    TableName :                 "horoscope_daily",
    KeyConditionExpression :    "#dt = :today",
    IndexName :                 'date-index',
    ScanIndexForward :          false,
    ExpressionAttributeNames :  {"#dt" : "date"},
    ExpressionAttributeValues : {":today" : today}
};

var paramsQueryCompatibility = {
    TableName :                 "zodiac_sign_compatibility",
    KeyConditionExpression :    "zodiac_sign_base = :star_sign_base AND zodiac_sign_partner = :star_sign_partner",
    ExpressionAttributeValues : {":star_sign_base" : starSignBase, ":star_sign_partner" : starSignPartner}
};

AWS.config.update({region: AWSregion});

/* 2. INTERCEPTORS ========================================================================================= */
const GetUserDataInterceptor = {
  process(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    if ( Object.keys(sessionAttributes).length === 0 ) {
      return new Promise((resolve, reject) => {
        handlerInput.attributesManager.getPersistentAttributes()
        .then((persistentAttributes) => {
          if (validateStarSign(persistentAttributes["userStarSign"])) {
            userStarSign = persistentAttributes["userStarSign"];
            console.log("Returning user with star sign:", userStarSign);
          }
          resolve();
        })
        .catch((error) => {
          console.log("NEW USER!");
          reject(error);
        })
      });
    } else if (validateStarSign(sessionAttributes["userStarSign"])) {
      userStarSign = sessionAttributes["userStarSign"];
      updatedStarSign = userStarSign;
      console.log("Returning user with star sign:", userStarSign);
    }
  },
};

const SaveUserDataInterceptor = {
  process(handlerInput) {
    return new Promise((resolve, reject) => {
      if(validateStarSign(updatedStarSign)) {
        let attributes = {"userStarSign": updatedStarSign}
        handlerInput.attributesManager.setPersistentAttributes(attributes);
        handlerInput.attributesManager.savePersistentAttributes()
        .then(() => {
          console.log("User star sign updated to:", updatedStarSign);
          updatedStarSign = "";
          resolve();
        })
        .catch((err) => {
          console.log("ERROR: Failed to save user star sign to table daily_horoscope_users.", error);
          reject(err);
        });
      } else {
        resolve();
      }
    });
  }
};

/* 3. HANDLERS ============================================================================================= */
// Handles launch requests
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
  },
  async handle(handlerInput) {
    console.log("Request:", handlerInput.requestEnvelope.request.type);
    // If the user has a stored horoscope.
    if (userStarSign !== "") {
      starSignQueried = userStarSign;
      var reading = await getHoroscope(starSignQueried);
      if (reading) {
        successStatus = "Success";
        speechOutput =
          "Your daily horoscope for " + starSignQueried + " is: " + reading
          + " You can hear other horoscopes, or, change your saved star sign.";
      } else {
        successStatus = "Failure";
        speechOutput = "Oh no, there appears to be a problem today with my crystal ball for " + starSignQueried
          + "! I'll have to give it a polish, please try again later!";
        reprompt =
          "While I'm busy, you can ask for the star sign or horoscope of a specific date, or discover the compatibility between your and your partner's star signs.";
      }
    } else {
      if (isAlphaTextString(starSignQueried)) {
        successStatus = "Failure";
        speechOutput = "Oh no, there appears to be a problem today with my crystal ball for " + starSignQueried
          + "! I'll have to give it a polish, please try again later!";
        reprompt =
          "While I'm busy, you can ask for the star sign or horoscope of a specific date, or discover the compatibility between your and your partner's star signs.";
      } else {
        return handlerInput.responseBuilder
          .speak(welcomeOutput)
          .reprompt(welcomeReprompt)
          .withSimpleCard(displayTextTitle, welcomeOutput)
          .getResponse();
      }
    }
    console.log("STATUS:", successStatus, ", Star sign queried:", starSignQueried);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(reprompt)
      .withSimpleCard(displayTextTitle, speechOutput)
      .getResponse();
  }
};

const CFIRGetSpecificHoroscopeIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "CanFulfillIntentRequest"
      && request.intent.name === "GetSpecificHoroscopeIntent";
  },
  async handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    starSignQueried = request.intent.slots.zodiacSign.value;
    if (validateStarSign(starSignQueried)) {
      var text = await getHoroscope(starSignQueried);
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
  async handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Request:", request.intent.name);
    speechOutput = "";
    reprompt = "";
    starSignQueried = request.intent.slots.zodiacSign.value;
    // if the user is new, or has not set a star sign yet, set this as their star sign
    if (validateStarSign(starSignQueried)) {
      if (userStarSign == "") {
        userStarSign = starSignQueried;
        updatedStarSign = userStarSign;
      }
    }
    // get the horoscope of the star sign
    var text = await getHoroscope(starSignQueried);
    if (text) {
      successStatus = "Success";
      speechOutput = text + " Which other horoscope would you like to hear?";
      reprompt = "You can hear daily horoscopes for all star signs, just ask for, Scorpio's horoscope, or, my horoscope?";
    } else {
      if (isAlphaTextString(starSignQueried)) {
        failedContext = starSignQueried;
      } else {
        failedContext = "that star sign";
      }
      successStatus = "Failure";
      speechOutput = "Oh no, there appears to be a problem today with my crystal ball for " + failedContext
        + "! While I work on a reading for " + failedContext + ", give a different star sign a go!";
      reprompt =
        "While I'm busy, you can ask for the star sign or horoscope of a specific date, or discover the compatibility between your and your partner's star signs.";
    }
    console.log("STATUS:", successStatus, ", Star sign queried:", starSignQueried);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(reprompt)
      .withSimpleCard(displayTextTitle, speechOutput)
      .getResponse();
  }
};

const CFIRGetUserHoroscopeIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "CanFulfillIntentRequest"
      && request.intent.name === "GetUserHoroscopeIntent";
  },
  handle(handlerInput) {
    if (userStarSign == "") {
      console.log("CFIR GetUserHoroscopeIntent: MAYBE, userStarSign: NO");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "MAYBE"
          }
        )
        .getResponse();
    } else {
      console.log("CFIR GetUserHoroscopeIntent: YES, userStarSign: YES");
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
  async handle(handlerInput) {
    console.log("Request:", handlerInput.requestEnvelope.request.intent.name);
    speechOutput = "";
    reprompt = "";
    if (userStarSign !== "") {
      starSignQueried = userStarSign;
      var reading = await getHoroscope(starSignQueried);
      if (reading) {
        successStatus = "Success";
        speechOutput = starSignQueried + ". " + reading
          + " Just ask for any other star sign's horoscope, or, update your saved star sign.";
        console.log("STATUS:", successStatus, ", Star sign queried:", starSignQueried);
        return handlerInput.responseBuilder
          .speak(speechOutput)
          .withSimpleCard(displayTextTitle, speechOutput)
          .getResponse();
      } else {
        successStatus = "Failure";
        speechOutput = "Oh no, there appears to be a problem today with my crystal ball for "
          + starSignQueried + "! Try again later, I'll give my crystal ball a polish!";
        reprompt = "While I'm busy, you can ask for help to discover additional horoscope functionality.";
      }
    } else {
      if (isAlphaTextString(starSignQueried)) {
        failedContext = starSignQueried;
      } else {
        failedContext = "that star sign";
      }
      successStatus = "Failure";
      speechOutput = "Oh no, there appears to be a problem today with my crystal ball for " + failedContext
        + "! Try again later, I'll give my crystal ball a polish!";
      reprompt =
        "While I'm busy, you can ask for help to discover additional horoscope functionality.";
    }
    console.log("STATUS:", successStatus, ", Star sign queried:", starSignQueried);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(reprompt)
      .withSimpleCard(displayTextTitle, speechOutput)
      .getResponse();
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
    if (validateStarSign(dateStarSign)) {
      // if the user is new, or has not set a star sign yet, set this as their star sign
      if (userStarSign == "") {
        userStarSign = dateStarSign;
        updatedStarSign = userStarSign;
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
      .withSimpleCard(displayTextTitle, speechOutput)
      .getResponse();
  }
};

const CFIRGetCompatibleZodiacSignIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "CanFulfillIntentRequest"
      && request.intent.name === "GetCompatibleZodiacSignIntent";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const zodiacSignA = request.intent.slots.zodiacSignA.value;
    const zodiacSignB = request.intent.slots.zodiacSignB.value;
    if (validateStarSign(zodiacSignA) && validateStarSign(zodiacSignB)) {
      console.log("CFIR GetCompatibleZodiacSignIntent: YES, zodiacSignA: YES, zodiacSignB: YES");
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
        console.log("CFIR GetCompatibleZodiacSignIntent: MAYBE, zodiacSignA: YES, zodiacSignB: NO");
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
          console.log("CFIR GetCompatibleZodiacSignIntent: MAYBE, zodiacSignA: NO, zodiacSignB: YES");
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
          console.log("CFIR GetCompatibleZodiacSignIntent: MAYBE, zodiacSignA: NO, zodiacSignB: NO");
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

const GetCompatibleZodiacSignIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type == "IntentRequest"
      && request.intent.name == "GetCompatibleZodiacSignIntent";
  },
  async handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Request:", request.intent.name);
    speechOutput = "";
    reprompt = "";
    const starSignASlot = request.intent.slots.zodiacSignA.value;
    const starSignBSlot = request.intent.slots.zodiacSignB.value;
    // if the user is new, or has not set a star sign yet, set the base star sign as their star sign
    if ( validateStarSign(starSignASlot) ) {
      if (userStarSign == "") {
        userStarSign = starSignASlot;
        updatedStarSign = userStarSign;
      }
    }
    var text = await getCompatibility(starSignASlot, starSignBSlot);
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
      .withSimpleCard(displayTextTitle, speechOutput)
      .getResponse();
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
      // TODO: add a promise here to handle the case that saving the user data fails.
      userStarSign = setStarSign;
      var saveUserReponse = saveUserData(handlerInput, userStarSign);
      successStatus = "Success";
      speechOutput =
        "Your star sign has been updated to " +
        userStarSign +
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
      .withSimpleCard(displayTextTitle, speechOutput)
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
    if ( userStarSign !== "" ) {
      console.log("CFIR GetUserZodiacSignIntent: YES, userStarSign: YES");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "YES"
          }
        )
        .getResponse();
    } else {
      console.log("CFIR GetUserZodiacSignIntent: NO, userStarSign: NO");
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
    if ( userStarSign !== "" ) {
      speechOutput = "Your star sign is set to " + userStarSign +
        ". You're welcome to change it, or, you can hear your horoscope for the day.";
      reprompt = "You can change your saved star sign by asking, for example, set my star sign to Scorpio.";
      successStatus = "Success";
    } else {
      speechOutput =
        "My crystal ball appears faulty, please enlighten me, what would you like to save as your star sign, or, you can ask for the horoscope of any other star sign?";
      reprompt =
        "Save your star sign for convenience, for example, my star sign is Scorpio, and have easy access to your daily, updated horoscope.";
      successStatus = "Failure";
    }
    console.log("STATUS", successStatus, "Retrieved star sign:", userStarSign);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(reprompt)
      // TODO: improve visual response using userStarSign
      .withSimpleCard(displayTextTitle, speechOutput)
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
  async handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Request:", request.intent.name);
    speechOutput = "";
    reprompt = "";
    // collect the date slot value
    compareToDate = new Date(request.intent.slots.dateForHoroscope.value);
    const dateStarSign = starSignFromDate(compareToDate);
    // check that the star sign was returned correctly from the date
    if (validateStarSign(dateStarSign)) {
      // if the user is new, or has not set a star sign yet, set this as their star sign
      if (userStarSign == "") {
        userStarSign = dateStarSign;
        updatedStarSign = userStarSign;
      }
      // get the horoscope for the star sign
      starSignQueried = dateStarSign;
      var text = await getHoroscope(starSignQueried);
        // check that the horoscope was returned correctly for the star sign
      if (text) {
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
      console.log("STATUS", successStatus, ", Date queried:", compareToDate, ", Star sign returned:", starSignQueried);
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt(reprompt)
        .withSimpleCard(displayTextTitle, speechOutput)
        .getResponse();
    } else {
      speechOutput = "Hmmm, I don't quite know that date, please try a Gregorian calendar date.";
      reprompt =
        "Ask for the horoscope of a specific date of birth, for example, someone born today, or, the horoscope for January, the third. Or, you can check out any star sign's horoscope.";
      successStatus = "Failure";
      console.log("STATUS", successStatus, ", Date queried:", compareToDate);
      return (
        handlerInput.responseBuilder
          .speak(speechOutput)
          .reprompt(reprompt)
          // TODO: display error response to user
          .withSimpleCard(displayTextTitle, speechOutput)
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
      .withSimpleCard(displayTextTitle, speechOutput)
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
    speechOutput = getArrayRandomElement([
      "Goodbye",
      "Cheers",
      "Farewell"
    ]);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .withSimpleCard(displayTextTitle, speechOutput)
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("Request:", request.type);
    console.log("Reason:", request.reason);
  }
};

/* 4. FUNCTIONS  =========================================================================================== */
// Check that the supplied string does not contain any characters which may be unconverted HTML.
function isTextString(text) {
  var isText = false;
  if (/^[a-zA-Z][a-zA-Z0-9- !,?:'.();"]*$/.test(text) && typeof text != "undefined") {
    isText = true;
  }
  return isText;
}

// Check that the supplied string is only made up of alphabet characters.
function isAlphaTextString(text) {
  var isAlphaText = false;
  if (isTextString(text) && /^[a-zA-Z][a-zA-Z]*$/.test(text) && typeof text != "undefined") {
    isAlphaText = true;
  }
  return isAlphaText;
}

// Return a random element of a supplied array.
function getArrayRandomElement (arr) {
  if (arr && arr.length) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

function getStoredCompatibility(starSignBase, starSignPartner){
  return new Promise((resolve, reject) => {
    var docClient = new AWS.DynamoDB.DocumentClient();
    paramsQueryCompatibility.ExpressionAttributeValues[":star_sign_base"] = starSignBase;
    paramsQueryCompatibility.ExpressionAttributeValues[":star_sign_partner"] = starSignPartner;
    var params = paramsQueryCompatibility;
    docClient.query(params, (err, data) => {
      if (err) {
        const errorResponse = "Unable to query. Error: " + JSON.stringify(err, null, 2);
        console.error(errorResponse);
        reject(errorResponse);
      } else {
        resolve(data);
      }
    });
  });
}

function getStoredHoroscope() {
  return new Promise((resolve, reject) => {
    var docClient = new AWS.DynamoDB.DocumentClient();
    var params = paramsQueryAllReadings;
    docClient.query(params, (err, data) => {
      if (err) {
        var errorResponse = "Unable to query. Error: " + JSON.stringify(err, null, 2);
        console.error(errorResponse);
        reject(errorResponse);
      } else {
        resolve(data);
      }
    });
  });
}

async function getCompatibility(starSignBase, starSignPartner) {
  if (validateStarSign(starSignBase) && validateStarSign(starSignPartner)) {
    var upperCaseStarSignBase = starSignBase[0].toUpperCase() + starSignBase.substring(1);
    var upperCaseStarSignPartner = starSignPartner[0].toUpperCase() + starSignPartner.substring(1);
    try {
      const compatibilityObject = await getStoredCompatibility(upperCaseStarSignBase, upperCaseStarSignPartner);
      // Assume only one is available, hence select the first occurance
      var compatibilityItems = compatibilityObject.Items[0];
      var compatibility = compatibilityItems.compatibility;
      return compatibility;
    } catch {
      return false;
    }
  }
}

// Iterates through the list of missing star signs and calls a download and then DB update function
async function horoscopeDownloadAndDbUpdate(missingList) {
  var getStarSign = missingList.splice(0, 1)[0];
  try {
    var reading = await downloadHoroscope(getStarSign);
    var updateStatus = await updateDBHoroscope(getStarSign, reading);
    if (missingList.length == 0) {
        return true;
    } else {
      await horoscopeDownloadAndDbUpdate(missingList);
    }
  } catch (exception) {
    return exception;
  }
}

function downloadHoroscope(downloadStarSign) {
  return new Promise((resolve, reject) => {
    console.log("downloadHoroscope with downloadStarSign:", downloadStarSign);
    var hsOptions = {
      method: "GET",
      // Old horoscope source.
      // hostname: "new.theastrologer.com",
      hostname: "astrology.tv",
      port: null,
      // Old horoscope source.
      // path: "/" + downloadStarSign + "/"
      path: "/horoscope/signs/" + downloadStarSign + "/"
    };
    var req = https.request(hsOptions, (res) => {
      res.setEncoding("utf8");
      var body = "";
      if (res.statusCode < 200 || res.statusCode >= 300) {
        console.log(res.statusCode, res.req.getHeader('host') + req.path);
        reject("<error>");
      }
      res.on("data", chunk => {
        body += chunk;
      });
      res.on("end", () => {
        var indexTodayDiv = body.indexOf('day-tabs-content_horoscope', body.indexOf('day-tabs-content_horoscope') + 1);
        var relevantText = body.substring(indexTodayDiv, indexTodayDiv + 2800);
        var indexPStart = relevantText.indexOf('class="ct-span" >');
        var indexPEnd = relevantText.indexOf("</span></div>", indexPStart);
        var reading = relevantText.substring(indexPStart + 17, indexPEnd);
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
          resolve(reading);
        } else {
          console.log("!!! ERROR !!! DOWNLOAD FAILED FOR:", downloadStarSign);
          reject("<error>");
        }
      });
      res.on("error", (err) => {
        console.log("!!! ERROR !!! DOWNLOAD FAILED FOR:", downloadStarSign);
        console.log(err);
        reject("<error>");
      });
    });
    req.end();
  });
}

function updateDBHoroscope(downloadedStarSign, downloadedHoroscope) {
  return new Promise((resolve, reject) => {
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
        reject(false);
      } else {
        resolve(true);
      }
    });
  });
}

// calls a downloader for all star signs, then updates a list of missing star signs
// and passes that list to the download and update dispatcher
async function downloadAndReturnHoroscopes() {
  try {
    var dynamoHoroscopes = await getStoredHoroscope();
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
      return dynamoHoroscopes;
    } else {
      var scrapeStatus = await horoscopeDownloadAndDbUpdate(missingStarSigns);
      dynamoHoroscopes = await getStoredHoroscope();
      return dynamoHoroscopes;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
}

// return the horoscope if in session
// otherwise, fetch db values for horoscopes for today
async function getHoroscope(retrieveStarSign) {
  var reading = "";
  // validate requested star sign
  if (validateStarSign(retrieveStarSign)) {
    // check if there is session level horoscope data
    // TODO: remove
    if (Object.keys(horoscopeData).length === 0) {
      // no session horoscope data
      horoscopeData = await downloadAndReturnHoroscopes();
      horoscopeData.Items.some(function(horoscope) {
        if (horoscope.zodiac_sign.toUpperCase() == retrieveStarSign.toUpperCase()
          && isTextString(horoscope.horoscope_reading)) {
          reading = horoscope.horoscope_reading;
        }
      });
      // replaces invalid XML (< > & " ')
      // reading = Alexa.escapeXmlCharacters(reading);
      return reading;
    } else {
      // all horoscope data is in session
      horoscopeData.Items.some(function(horoscope) {
        if (horoscope.zodiac_sign.toUpperCase() == retrieveStarSign.toUpperCase()
          && isTextString(horoscope.horoscope_reading)) {
          reading = horoscope.horoscope_reading;
      }
    });
      return reading;
    }
  } else {
    return false;
  }
}

function starSignFromDate(dateToCompare) {
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
  return new Promise((resolve, reject) => {
    if (validateStarSign(starSignAttribute)) {
      let attributes = {"userStarSign": starSignAttribute}
      handlerInput.attributesManager.setPersistentAttributes(attributes);
      handlerInput.attributesManager.savePersistentAttributes()
      .then(() => {
        // Clear any other saved star signs so we don't override the star sign we just saved.
        updatedStarSign = "";
        resolve();
      })
      .catch((err) => {
        console.log("ERROR: Failed to save user star sign to table horoscopeUsers_starsign.", error);
        reject(err);
      });
    } else {
      console.log("ERROR: Failed to save user star sign to table horoscopeUsers_starsign.");
      reject();
    }
  });
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
    CFIRGetCompatibleZodiacSignIntent,
    GetCompatibleZodiacSignIntent,
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
  .addResponseInterceptors(
    SaveUserDataInterceptor
  )
  .withSkillId(appId)
  .withTableName(sessionEventsTableName)
  .withAutoCreateTable(true)
  .withPartitionKeyGenerator(Alexa.PartitionKeyGenerators.userId)
  .withDynamoDbClient(new AWS.DynamoDB({apiVersion: "latest", region: AWSregion}))
  .lambda();
