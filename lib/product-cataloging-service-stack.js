const { Stack, Duration } = require('aws-cdk-lib');
const productCatalogingService = require('../lib/product-cataloging-service');
// const sqs = require('aws-cdk-lib/aws-sqs');

class ProductCatalogingServiceStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    new productCatalogingService.ProductCatalogingService(this, 'Products');
  }
}

module.exports = { ProductCatalogingServiceStack }
