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
  repromptOutput = "",
  spokenStarSign = "",
  starSignQueried = "",
  starSignBase = "",
  starSignPartner = "",
  userStarSign = "",
  updatedStarSign = "",
  missingStarSigns = [],
  persistentStarSign = {"userStarSign": ""},
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
    // Fetch the user's star sign from session or stored data
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    // TODO: fix this, for some reason we are checking session attributes and making fetching persistent dependent on that outcome.
    if ( Object.keys(sessionAttributes).length === 0 || sessionAttributes.userStarSign === undefined) {
      return new Promise((resolve, reject) => {
        handlerInput.attributesManager.getPersistentAttributes()
        .then((persistentAttributes) => {
          if (validateStarSign(persistentAttributes.userStarSign)) {
            userStarSign = persistentAttributes.userStarSign;
            console.log(`RETURNING USER with star sign: ${userStarSign}`);
          } else {
            console.log(`Dodgy saved star sign: ${persistentAttributes.userStarSign}`);
          }
          resolve();
        })
        .catch((error) => {
          console.log("NEW USER!");
          resolve();
        })
      });
    } else if (validateStarSign(sessionAttributes["userStarSign"])) {
      userStarSign = sessionAttributes["userStarSign"];
      // updatedStarSign = userStarSign;
      console.log(`Returning user with star sign: ${userStarSign}`);
    } else {
      console.log(`User launching skill is not identified as new or returning with a valid existing star sign, ${sessionAttributes.userStarSign}`);
    }
  }
};

const SaveUserDataInterceptor = {
  process(handlerInput) {
    saveUserData();
  }
};

/* 3. HANDLERS ============================================================================================= */
// Handles launch requests
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
  },
  async handle(handlerInput) {
    console.log(`Request: ${handlerInput.requestEnvelope.request.type}`);
    // If the user has a stored horoscope.
    if (userStarSign) {
      starSignQueried = userStarSign;
      await getHoroscope(starSignQueried)
      .then((reading) => {
        if (reading) {
          successStatus = "Success";
          speechOutput =
            `Your daily horoscope for ${starSignQueried} is:
            ${reading}`;
        } else {
          successStatus = "Failure";
          speechOutput = `Oh no, there appears to be a problem today with my crystal ball for ${starSignQueried}! I'll have to give it a polish.
          While I work on that, you can ask for the star sign or horoscope of a specific date, or discover the compatibility between your and your partner's star signs.`;
        }
      })
      .catch((error) => {
        successStatus = "Failure";
        speechOutput = `Oh no, there appears to be a problem today with my crystal ball for ${starSignQueried}! I'll have to give it a polish.
        While I work on that, you can ask for the star sign or horoscope of a specific date, or discover the compatibility between your and your partner's star signs.`;
      });
      // let reading = await getHoroscope(starSignQueried);
      // if (reading) {
      //   successStatus = "Success";
      //   speechOutput =
      //     `Your daily horoscope for ${starSignQueried} is:
      //     ${reading}`;
      // } else {
      //   successStatus = "Failure";
      //   speechOutput = `Oh no, there appears to be a problem today with my crystal ball for ${starSignQueried}! I'll have to give it a polish.
      //   While I work on that, you can ask for the star sign or horoscope of a specific date, or discover the compatibility between your and your partner's star signs.`;
      // }
      console.log(`STATUS: ${successStatus}, star sign queried: ${starSignQueried}`);
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withSimpleCard(displayTextTitle, speechOutput)
        .getResponse();
    } else {
      successStatus = "Success";
      speechOutput = "I can provide readings for any of the 12 signs of the zodiac. Which star sign's horoscope would you like to hear?";
      repromptOutput = "I didn't quite catch that, please request a star sign's horoscope, for example, Scorpio's horoscope, or, ask for help to discover additional horoscope functionality."
      starSignQueried = "None, welcomed instead";
    }
    console.log(`STATUS: ${successStatus}, star sign queried: ${starSignQueried}`);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(repromptOutput)
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
    let starSignQueried = request.intent.slots.zodiacSign.value;
    console.log(`Request: CFIR ${request.intent.name}, star sign queried: ${starSignQueried}`);
    if (validateStarSign(starSignQueried)) {
      var text = await getHoroscope(starSignQueried);
      if (text) {
        console.log("CFIR: YES, reading: YES, zodiacSign: YES");
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
        console.log("CFIR: NO, reading: NO, zodiacSign: YES");
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
      console.log("CFIR: NO, zodiacSign: MAYBE");
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
    console.log(`Request: ${request.intent.name}`);
    speechOutput = "";
    repromptOutput = "";
    let spokenStarSign = request.intent.slots.zodiacSign.value;
    let starSignQueried = spokenStarSign;
    // Check the response to determine if there are any mapped values
    if (typeof request.intent.slots.zodiacSign.resolutions !== undefined
    && request.intent.slots.zodiacSign.resolutions.resolutionsPerAuthority[0].status.code == "ER_SUCCESS_MATCH") {
      starSignQueried = request.intent.slots.zodiacSign.resolutions.resolutionsPerAuthority[0].values[0].value.name;
    }
    // if the user is new, or has not set a star sign yet, set this as their star sign
    if (validateStarSign(starSignQueried)) {
      if (userStarSign == "") {
        userStarSign = starSignQueried;
        updatedStarSign = userStarSign;
        persistentStarSign.userStarSign = updatedStarSign;
        handlerInput.attributesManager.setPersistentAttributes(persistentStarSign);
      }
    }
    // get the horoscope of the star sign
    var text = await getHoroscope(starSignQueried);
    if (text) {
      successStatus = "Success";
      speechOutput = `${spokenStarSign}. ${text}
      Which other horoscope would you like to hear?`;
      repromptOutput = "You can hear daily horoscopes for all star signs, just ask for, Scorpio's horoscope, or, my horoscope?";
    } else {
      if (isAlphaTextString(spokenStarSign)) {
        failedContext = spokenStarSign;
      } else {
        failedContext = "that star sign";
      }
      successStatus = "Failure";
      speechOutput = `Oh no, there appears to be a problem today with my crystal ball for ${failedContext}!
        While I work on a reading for ${failedContext}, give a different star sign a go!`;
      repromptOutput =
        "While I'm busy, you can ask for the star sign or horoscope of a specific date, or discover the compatibility between your and your partner's star signs.";
    }
    console.log(`STATUS: ${successStatus}, spoken star sign: ${spokenStarSign}, star sign queried: ${starSignQueried}`);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(repromptOutput)
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
    console.log(`Request: CFIR ${handlerInput.requestEnvelope.request.intent.name}, user star sign: ${userStarSign}`);
    if (userStarSign == "") {
      console.log("CFIR: MAYBE, userStarSign: NO");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "MAYBE"
          }
        )
        .getResponse();
    } else {
      console.log("CFIR: YES, userStarSign: YES");
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
    console.log(`Request: ${handlerInput.requestEnvelope.request.intent.name}`);
    speechOutput = "";
    repromptOutput = "";
    if (userStarSign) {
      let starSignQueried = userStarSign;
      let reading = await getHoroscope(starSignQueried);
      if (reading) {
        successStatus = "Success";
        speechOutput = `${starSignQueried}. ${reading} Just ask for any other star sign's horoscope, or, update your saved star sign.`;
        console.log(`STATUS: ${successStatus}, star sign queried: ${starSignQueried}`);
        return handlerInput.responseBuilder
          .speak(speechOutput)
          .withSimpleCard(displayTextTitle, speechOutput)
          .getResponse();
      } else {
        successStatus = "Failure";
        speechOutput = `Oh no, there appears to be a problem today with my crystal ball for ${starSignQueried}!
        Try again later, I'll give my crystal ball a polish!`;
        repromptOutput = "While I'm busy, you can ask for help to discover additional horoscope functionality.";
      }
    } else {
      successStatus = "Failure";
      speechOutput =
        "Oh, I don't appear to have a saved star sign for you. Please save a star sign, and I will remember it for next time!";
      repromptOutput =
        "You can save a star sign by saying, save star sign as Aries, or, you can ask for the horoscope of any star sign.";
    }
    console.log(`STATUS: ${successStatus}, star sign queried: ${userStarSign}`);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(repromptOutput)
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
    compareToDate = new Date(request.intent.slots.dateForZodiacSign.value);
    console.log(`Request: CFIR ${request.intent.name}, date: ${compareToDate}`);
    const dateStarSign = starSignFromDate(compareToDate);
    if (validateDate(compareToDate) && dateStarSign) {
      console.log("CFIR: YES, dateStarSign: YES");
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
      console.log("CFIR: MAYBE, compareToDate/dateStarSign: NO");
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
    console.log(`Request: ${request.intent.name}`);
    speechOutput = "";
    repromptOutput = "";
    // collect the date slot value
    compareToDate = new Date(request.intent.slots.dateForZodiacSign.value);
    const dateStarSign = starSignFromDate(compareToDate);
    // check that the star sign was returned correctly from the date
    if (validateStarSign(dateStarSign)) {
      // if the user is new, or has not set a star sign yet, set this as their star sign
      if (userStarSign == "") {
        userStarSign = dateStarSign;
        updatedStarSign = userStarSign;
        persistentStarSign.userStarSign = updatedStarSign;
        handlerInput.attributesManager.setPersistentAttributes(persistentStarSign);
      }
      successStatus = "Success";
      speechOutput = `The star sign for someone born on ${compareToDate.toLocaleString("en-GB", dateOptions)} is ${dateStarSign}.
      Which other date, or, which other star sign's horoscope would you like to know?`;
      repromptOutput = "Ask for the star sign of a different date of birth, or, check out any star sign's horoscope.";
    } else {
      console.log(`Failure with dateStarSign: ${validateStarSign(dateStarSign)}, or with compareToDate: ${compareToDate}`);
      successStatus = "Failure";
      speechOutput = "Hmmm, I don't quite know that date, please try a Gregorian calendar date.";
      repromptOutput =
        "Ask for the star sign of a different date, for example, someone born today, or the star sign for January, the third. Or, ask for help to discover additional horoscope functionality.";
    }
    console.log(`STATUS: ${successStatus}, date queried: ${compareToDate}`);
    // emit the response, keep daily horoscope open
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(repromptOutput)
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
    console.log(`Request: CFIR ${request.intent.name}, zodiacSignA: ${zodiacSignA}, zodiacSignB: ${zodiacSignB}`);
    if (validateStarSign(zodiacSignA) && validateStarSign(zodiacSignB)) {
      console.log("CFIR: YES, zodiacSignA: YES, zodiacSignB: YES");
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
        console.log("CFIR: MAYBE, zodiacSignA: YES, zodiacSignB: NO");
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
          console.log("CFIR: MAYBE, zodiacSignA: NO, zodiacSignB: YES");
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
          console.log("CFIR: MAYBE, zodiacSignA: NO, zodiacSignB: NO");
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
    console.log(`Request: ${request.intent.name}`);
    speechOutput = "";
    repromptOutput = "";
    const spokenStarSignA = request.intent.slots.zodiacSignA.value;
    const spokenStarSignB = request.intent.slots.zodiacSignB.value;
    var starSignASlot = spokenStarSignA;
    var starSignBSlot = spokenStarSignB;
    if (typeof request.intent.slots.zodiacSignA.resolutions !== undefined
    && request.intent.slots.zodiacSignA.resolutions.resolutionsPerAuthority[0].status.code == "ER_SUCCESS_MATCH") {
      starSignASlot = request.intent.slots.zodiacSignA.resolutions.resolutionsPerAuthority[0].values[0].value.name;
    }
    if (typeof request.intent.slots.zodiacSignB.resolutions !== undefined
    && request.intent.slots.zodiacSignB.resolutions.resolutionsPerAuthority[0].status.code == "ER_SUCCESS_MATCH") {
      starSignBSlot = request.intent.slots.zodiacSignB.resolutions.resolutionsPerAuthority[0].values[0].value.name;
    }
    // if the user is new, or has not set a star sign yet, set the base star sign as their star sign
    if ( validateStarSign(starSignASlot) ) {
      if (userStarSign == "") {
        userStarSign = starSignASlot;
        updatedStarSign = userStarSign;
        persistentStarSign.userStarSign = updatedStarSign;
        handlerInput.attributesManager.setPersistentAttributes(persistentStarSign);
      }
    }
    var text = await getCompatibility(starSignASlot, starSignBSlot);
    if (text) {
      speechOutput = `${text}
      Which other star signs' compatibility would you like to hear, or you can hear the horoscope for a specific star sign?`;
      repromptOutput =
        "You can also hear daily horoscopes for all star signs, just ask for, Scorpio's horoscope, or, my horoscope?";
      successStatus = "Success";
    } else {
      console.log(`Failure with compatibility: ${text}`);
      // determine failure context to repond with
      if (isAlphaTextString(spokenStarSignA)) {
        if (isAlphaTextString(spokenStarSignB)) {
          failedContext = `for ${spokenStarSignA} and ${spokenStarSignB}`;
        } else {
          failedContext = `for ${spokenStarSignA} and the other unknown star sign`;
        }
      } else {
        if (isAlphaTextString(spokenStarSignB)) {
          failedContext = `for ${spokenStarSignB} and the other unknown star sign`;
        } else {
          failedContext = "as both star signs are unknown";
        }
      }
      speechOutput = `There appears to be a problem with my crystal ball ${failedContext}. Please try again.`;
      repromptOutput = "You can ask for the star sign or horoscope of a specific date, or, hear the horoscope for a specific star sign.";
      successStatus = `Failure, failedContext: ${failedContext}`;
    }
    console.log(`STATUS: ${successStatus}, spokenStarSignA: ${spokenStarSignA}, spokenStarSignB: ${spokenStarSignB}, starSignASlot: ${starSignASlot}, starSignBSlot: ${starSignBSlot}`);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(repromptOutput)
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
    let spokenStarSign = request.intent.slots.inputZodiacSign.value;
    console.log(`Request: CFIR ${request.intent.name}, spoken star sing: ${spokenStarSign}`);
    if (validateStarSign(spokenStarSign)) {
      console.log("CFIR: YES, inputZodiacSign: YES");
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
      console.log("CFIR: MAYBE, inputZodiacSign: NO");
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
    console.log(`Request: ${request.intent.name}`);
    const confirmationStatus = request.intent.confirmationStatus;
    let spokenStarSign = request.intent.slots.inputZodiacSign.value;
    var setStarSign = spokenStarSign;
    // set setStarSign to the validated slot value that accompanies the SetUserZodiacSignIntent intent
    if (typeof request.intent.slots.inputZodiacSign.resolutions !== undefined
    && request.intent.slots.inputZodiacSign.resolutions.resolutionsPerAuthority[0].status.code == "ER_SUCCESS_MATCH") {
      setStarSign = request.intent.slots.inputZodiacSign.resolutions.resolutionsPerAuthority[0].values[0].value.name;
    }
    speechOutput = "";
    if (confirmationStatus == "DENIED") {
      successStatus = "Success";
      speechOutput = "Alright, your star sign will not be updated."
    } else {
      if (validateStarSign(setStarSign)) {
        userStarSign = setStarSign;
        persistentStarSign.userStarSign = userStarSign;
        handlerInput.attributesManager.setPersistentAttributes(persistentStarSign);
        var saveUserReponse = saveUserData();
        if(saveUserReponse) {
          successStatus = "Success";
          speechOutput = `Your star sign has been updated to ${userStarSign}.`;
          repromptOutput =
            `Would you like to hear the horoscope for ${userStarSign}, or, you can hear the horoscope for any other star sign?`;
            console.log(`STATUS: ${successStatus}, confirmationStatus: ${confirmationStatus}, spoken star sing: ${spokenStarSign}, star sign: ${setStarSign}`);
            return handlerInput.responseBuilder
              .speak(speechOutput)
              .withSimpleCard(displayTextTitle, speechOutput)
              .reprompt(repromptOutput)
              .getResponse();
        } else {
          successStatus = "Failure";
          speechOutput =
            `Hmmm... I seem to be having difficulty saving ${userStarSign} as your star sign.
            I will give my crystal ball a polish. Please try again later.`;
        }
      } else {
        if (isAlphaTextString(setStarSign)) {
          failedContext = setStarSign;
        } else {
          failedContext = "that star sign";
        }
        speechOutput =
          `Hmmm... I don't recognize ${failedContext}.
          Please try again by setting one of the 12 signs of the Zodiac as your star sign.`;
        successStatus = "Failure";
      }
    }
    console.log(`STATUS: ${successStatus}, confirmationStatus: ${confirmationStatus}, spoken star sing: ${spokenStarSign}, star sign: ${setStarSign}`);
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .withSimpleCard(displayTextTitle, speechOutput);
  }
};

const CFIRGetUserZodiacSignIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "CanFulfillIntentRequest"
      && request.intent.name === "GetUserZodiacSignIntent";
  },
  handle(handlerInput) {
    console.log(`Request: CFIR ${handlerInput.requestEnvelope.request.intent.name}, user star sign: ${userStarSign}`);
    if ( userStarSign ) {
      console.log("CFIR: YES, userStarSign: YES");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "YES"
          }
        )
        .getResponse();
    } else {
      console.log("CFIR: NO, userStarSign: NO");
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
    console.log(`Request: ${handlerInput.requestEnvelope.request.intent.name}`);
    speechOutput = "";
    if ( userStarSign ) {
      speechOutput = `Your star sign is set to ${userStarSign}.
      You're welcome to change it, or, you can hear your horoscope for the day.`;
      successStatus = "Success";
    } else {
      speechOutput =
        "My crystal ball appears faulty, please enlighten me, what would you like to save as your star sign, or, you can ask for the horoscope of any other star sign?";
      successStatus = "Failure";
    }
    console.log(`STATUS: ${successStatus}, retrieved star sign: ${userStarSign}`);
    return handlerInput.responseBuilder
      .speak(speechOutput)
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
    console.log(`Request: CFIR ${request.intent.name}, date: ${compareToDate}`);
    if (validateDate(compareToDate)) {
      console.log("CFIR: YES, compareToDate: YES");
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
      console.log("CFIR: NO, compareToDate: NO");
      return handlerInput.responseBuilder
        .withCanFulfillIntent({
          canFulfill: "NO",
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
    console.log(`Request: ${request.intent.name}`);
    speechOutput = "";
    repromptOutput = "";
    // collect the date slot value
    compareToDate = new Date(request.intent.slots.dateForHoroscope.value);
    const dateStarSign = starSignFromDate(compareToDate);
    // check that the star sign was returned correctly from the date
    if (validateStarSign(dateStarSign)) {
      // if the user is new, or has not set a star sign yet, set this as their star sign
      if (userStarSign == "") {
        userStarSign = dateStarSign;
        updatedStarSign = userStarSign;
        persistentStarSign.userStarSign = updatedStarSign;
        handlerInput.attributesManager.setPersistentAttributes(persistentStarSign);
      }
      // get the horoscope for the star sign
      let starSignQueried = dateStarSign;
      var text = await getHoroscope(starSignQueried);
        // check that the horoscope was returned correctly for the star sign
      if (text) {
        successStatus = "Success";
        speechOutput = `${dateStarSign}. ${text}
        You can also ask for someone's star sign, based on their birthday.`;
      } else {
        successStatus = "Failure as reading from getHoroscope";
        speechOutput =
          "There appears to be a problem with my crystal ball! Please try again later, or, ask for the horoscope of a different date of birth.";
      }
      console.log(`STATUS: ${successStatus}, date queried: ${compareToDate}, star sign returned: ${starSignQueried}`);
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withSimpleCard(displayTextTitle, speechOutput)
        .getResponse();
    } else {
      speechOutput = "Hmmm, I don't quite know that date, please try a Gregorian calendar date.";
      repromptOutput =
        "Ask for the horoscope of a specific date of birth, for example, someone born today, or, the horoscope for January, the third. Or, you can check out any star sign's horoscope.";
      successStatus = "Failure";
      console.log(`STATUS: ${successStatus}, date queried: ${compareToDate}`);
      return (
        handlerInput.responseBuilder
          .speak(speechOutput)
          .reprompt(repromptOutput)
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
    console.log(`Request: ${handlerInput.requestEnvelope.request.intent.name}`);
    speechOutput =
      "Your Daily Horoscope skill has five, fun functionalities. You can get horoscope readings by star sign, get the star sign or horoscope for someone born on a specific date, find out the relationship compatibility between two star signs, and you can set your star sign and then get a daily horoscope reading by simply asking Daily Horoscope for my daily horoscope!";
    repromptOutput = "Try something like, set my star sign to Taurus, or what is the horoscope for Scorpio?";
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(repromptOutput)
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
    console.log(`Request: ${handlerInput.requestEnvelope.request.intent.name}`);
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
    console.log(`Request: ${request.type}, session ended reason: ${request.reason}`);
  }
};

/* 4. FUNCTIONS  =========================================================================================== */
// Check that the supplied string does not contain any characters which may be unconverted HTML.
function isTextString(text) {
  var isText = false;
  if (typeof text !== undefined && /^[a-zA-Z][a-zA-Z0-9- !,?:'.();"]*$/.test(text)) {
    isText = true;
  }
  return isText;
}

// Check that the supplied string is only made up of alphabet characters.
function isAlphaTextString(text) {
  var isAlphaText = false;
  if (isTextString(text) && /^[a-zA-Z][a-zA-Z ]*$/.test(text)) {
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
        const errorResponse = `Unable to query. Error: ${JSON.stringify(err, null, 2)}`;
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
        var errorResponse = `Unable to query. Error: ${JSON.stringify(err, null, 2)}`;
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
    let reading = await downloadHoroscope(getStarSign);
    let updateStatus = await updateDBHoroscope(getStarSign, reading);
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
    console.log(`downloadHoroscope with downloadStarSign: ${downloadStarSign}`);
    var hsOptions = {
      method: "GET",
      // Old horoscope source.
      // hostname: "new.theastrologer.com",
      hostname: "astrology.tv",
      port: null,
      // Old horoscope source.
      // path: "/" + downloadStarSign + "/"
      path: `/horoscope/signs/${downloadStarSign}/`
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
        let reading = relevantText.substring(indexPStart + 17, indexPEnd);
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
          console.log(`!!! ERROR !!! DOWNLOAD FAILED FOR: ${downloadStarSign}`);
          reject("<error>");
        }
      });
      res.on("error", (err) => {
        console.log(`!!! ERROR !!! DOWNLOAD FAILED FOR: ${downloadStarSign}`);
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
        console.error(`ERROR WITH TABLE UPDATE: ${JSON.stringify(err, null, 2)}`);
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
// if reading does not exist, return an empty string
async function getHoroscope(retrieveStarSign) {
  let reading = "";
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

function saveUserData() {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  return new Promise((resolve, reject) => {
    handlerInput.attributesManager.savePersistentAttributes()
    .then(() => {
      console.log(`User star sign updated to: ${sessionAttributes}`);
      new Promise((resolve, reject) => {
        handlerInput.attributesManager.deletePersistentAttributes()
        .then(() => {
          console.log(`PersistentAttributes successfully cleared.`);
          resolve();
        })
        .catch((error) => {
          console.log(`ERROR: Failed to clear persistent attributes. ${error}`);
          reject(error);
        });
      });
      resolve();
    })
    .catch((error) => {
      console.log(`ERROR: Failed to save user star sign to table daily_horoscope_users. ${error}`);
      reject(error);
    });
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
