const Alexa = require("ask-sdk");
// const AWS = require("aws-sdk");
// const dynamoDb = require("ask-sdk-dynamodb-persistence-adapter");

const appId = "amzn1.ask.skill.d373228d-ef5c-4a0c-a005-583c0d25bf11",
  // AWSregion = "us-east-1",
  sessionEventsTableName = "horoscopeUsers_starsign",
  newStarSign = "Taurus";

var existingStarSign = "";

// const persistentAdapter = new dynamoDb.DynamoDbPersistenceAdapter({ tableName : sessionEventsTableName });

const GetUserDataInterceptor = {
  process(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    // TODO: remove log
    console.log("sessionAttributes:", sessionAttributes);
    if (handlerInput.requestEnvelope.request.type === 'LaunchRequest') {
      return new Promise((resolve, reject) => {
        handlerInput.attributesManager.getPersistentAttributes()
        .then((persistentAttributes) => {
          existingStarSign = persistentAttributes["existingStarSign"];
          console.log("existingStarSign:", existingStarSign);
          resolve();
        })
        .catch((error) => {
          reject(error);
        })
      });
    }}
};

function saveUserData(handlerInput, starSignAttribute) {
  if((starSignAttribute) != "") {
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

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    console.log("Request:", handlerInput.requestEnvelope.request.type);
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
    },
  handle(handlerInput) {
    console.log("LaunchRequestHandler existingStarSign: ", existingStarSign);
    saveUserData(handlerInput, newStarSign);
    const welcomeOutput = "Hope this works!" + " " + newStarSign;
    return handlerInput.responseBuilder
      .speak(welcomeOutput)
      .withSimpleCard("Daily Horoscope Skill by marks_matters", welcomeOutput)
      .getResponse();
  }
};

exports.handler = Alexa.SkillBuilders
  .standard()
  .withSkillId(appId)
  .addRequestHandlers(
      LaunchRequestHandler)
  .addRequestInterceptors(
      GetUserDataInterceptor)
  // .withPersistenceAdapter(persistentAdapter)
  // .withTableName(sessionEventsTableName)
  .withTableName("testUserId")
  .withAutoCreateTable(true)
  // .withPartitionKeyGenerator(this.requestEnvelope)
  .withDynamoDbClient()
  .lambda();
