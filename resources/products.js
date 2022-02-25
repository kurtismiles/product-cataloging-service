const AWS = require('aws-sdk');
const dynamoClient = new AWS.DynamoDB.DocumentClient();

//=======================
// POSSIBLE IMPROVEMENTS
//=======================
/*

- Break file into different handlers for GET/POST to improve readability
- Break out utility functions and dynamo connector to help with testing and readability
- Add full automation testing including unit and int tests
- Add GET for all products, POST for multiple products, and add update/delete for full CRUD support

*/

exports.main = async function (event, context) {
  try {
    const method = event.httpMethod;
    const path = event.path;

    // if pathParams are present
    const pathParams = event.pathParameters?.productId;

    // if tags are present as queryParam
    const queryParams = event.queryStringParameters?.tags;

    // the name of the products dynamodb table
    const tableName = process.env.TABLE_NAME;

    if (method === "GET") {

      //==============================
      //       Retrieve Product
      //==============================
      // if tags as query params arent present and path params are
      if (!queryParams && pathParams) {

        // get query on id
        const query = await dynamoClient.get({
          TableName: tableName,
          Key: {
            name: decodeURI(pathParams),
          }
        })
          .promise()

        return response(200, {}, query);

        //====================================
        //       Search Product by Tags
        //====================================
        // if there are tags as query params and path param is exactly "search", perform search query
      } else if (queryParams && pathParams === "search") {

        // if tags are valid
        if (validateTags(queryParams)) {

          queryArray = queryParams.split(",");

          let builtExpression = buildExpression(queryArray);
          let builtAttributeValues = buildAttributeValues(queryArray);

          const query = await dynamoClient.scan({
            TableName: tableName,
            FilterExpression: builtExpression,
            ExpressionAttributeValues: builtAttributeValues
          })
            .promise()

          // normally it would be best to return query but this gives visibility into buildFilter and buildExpression
          let responseObject = {
            FilterExpression: builtExpression,
            ExpressionAttributeValues: builtAttributeValues,
            queryResponse: query,
          }

          return response(200, {}, responseObject)
        }
      };
    }
    else if (method === "POST") {

      //============================
      //       Create Product
      //============================
      if (path === "/products") {

        let productBody = JSON.parse(event.body);

        if (validateProduct(productBody)) {
          const query = await dynamoClient.put({
            TableName: tableName,
            Item: {
              name: productBody.name,
              price: productBody.price,
              tags: productBody.tags
            }
          })
            .promise()

          return response(200, {}, "Created: " + productBody.name);
        }
      }
    }

    // fallthrough that catches requests service is not looking for
    return response(400, {}, "Invalid Message Framing");

  } catch (error) {
    var body = error.stack || JSON.stringify(error, null, 2);

    return response(500, {}, body);
  }
}

//===================
//     UTILITIES
//===================

// builder function for response object
const response = (inputStatusCode, inputHeaders, inputBody) => {
  let res = {
    statusCode: inputStatusCode,
    headers: inputHeaders,
    body: JSON.stringify(inputBody)
  }

  return res;
}

// validation function for tags
const validateTags = (tags) => {
  try {
    let tagsArray = tags.split(",");

    // could also use the following regex
    // let noBlankRegex = /^(?!\s*$).+/;

    // validate all tags to check for empty input
    tagsArray.forEach((tag) => {
      if (tag.length < 1) {
        throw new error;
      }
    })
    return true;
  } catch (error) {
    return error;
  }
}

// validation function for products
const validateProduct = (product) => {
  try {
    // check length of name, needs to be between 1 and 40 characters
    if (!((product.name.length > 0) && (product.name.length <= 40))) {
      throw new error;
    }

    // check if price is formatted correctly and not negative
    if (product.price < 0) {
      throw new error;
    }

    // check if tags are at least 1 character in length
    product.tags.forEach((tag) => {
      if (tag.length < 1) {
        throw new error;
      }
    });

    return true;

  } catch (error) {
    return false
  }
}

// function to build expression attribute values in dynamo scan
const buildAttributeValues = (queryArray) => {

  let buildJSON = {};

  for (let i = 0; i < queryArray.length; i++) {
    buildJSON[':' + queryArray[i]] = queryArray[i];
  }

  return buildJSON;
}

// function to build filter expression in dynamo scan
const buildExpression = (queryArray) => {

  let buildString = "";

  for (let i = 0; i < queryArray.length; i++) {
    if (i > 0) {
      buildString += " OR ";
    }

    buildString += "contains(tags, :" + queryArray[i] + ")";
  }

  return buildString;
}