const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");

class ProductCatalogingService extends Construct {
  constructor(scope, id) {
    super(scope, id);

    // define dynamodDB table in PAY_PER_REQUEST billing mode
    const dynamoTable = new dynamodb.Table(this, 'Products', {
      partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // lambda function to process requests
    const handler = new lambda.Function(this, "ProductHandler", {
      runtime: lambda.Runtime.NODEJS_14_X, // So we can use async in widget.js
      code: lambda.Code.fromAsset("resources"),
      handler: "products.main",
      environment: {
        TABLE_NAME: dynamoTable.tableName,
      }
    });

    // grant dynamo table Read/Write permissions to handler
    dynamoTable.grantReadWriteData(handler);

    // gateway to route restful requests to lambda
    const api = new apigateway.RestApi(this, "products-api", {
      restApiName: "Product Service",
      description: "This service catalogs products."
    });

    // connect api gateway and lambda
    const getProductsIntegration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    // adds /products route to api
    const products = api.root.addResource('products');
    const search = products.addResource('{productId}');

    // methods supported by /products route
    products.addMethod("GET", getProductsIntegration); // GET /
    products.addMethod("POST", getProductsIntegration); // POST /

    // method for get on /products/search route
    search.addMethod("GET", getProductsIntegration);
  }
}

module.exports = { ProductCatalogingService }