import { expect } from 'chai';
import TestDataGenerator from '../TestDataGenerator';
import DataValidator from '../DataValidator';

describe('TestDataGenerator', function() {
  let testDataGenerator,
    dataValidator,
    config = {};
  beforeEach(function() {
    testDataGenerator = new TestDataGenerator(config);
    dataValidator = new DataValidator();
  });

  describe('constructor', function() {
    it('throws `invalid config` error', function test() {
      const invalidConfig = {
        devices: {
          powerStep: 100
        },
        maxPower: 2050
      }
      expect(() => new TestDataGenerator(invalidConfig)).to.throw('invalid config');
    });
  });

  describe('@generate', function() {
    it('returns value', function test() {
      const inputData = testDataGenerator.generate();
      //console.log(inputData);
      expect(true).to.equal(false);
    });
  });

  describe('@generateRates', function() {
    beforeEach(function() {
      config = {
        rates: {
          periods: 6,
          priceInterval: [2, 6]
        }
      };
      testDataGenerator = new TestDataGenerator(config);
    });
    it('produces rates that are accepted by DataValidator', function test() {
      const rates = testDataGenerator.generateRates();
      const isRatesValid = dataValidator.validateRates(rates);
      expect(isRatesValid).to.equal(true);
    });

    it('produces rates that contain user devined number of periods', function test() {
      const rates = testDataGenerator.generateRates();
      expect(rates).to.have.length(config.rates.periods);
    });

    describe('@_generateNrndsWithSumM', function() {
      it('generates N random numbers that sum up to M', function test(){
        const randoms = testDataGenerator._generateNrndsWithSumM(5, 24);
        expect(randoms).to.have.length(5);
        expect(randoms.reduce((accum, next) => accum + next, 0)).to.equal(24);
      });

      it('those numbers can\'t contain zeros', function test() {
        const randoms = testDataGenerator._generateNrndsWithSumM(20, 24);
        expect(randoms.includes(0)).to.equal(false);
      });
    });
  });

  describe('@generateDevices', function() {
    beforeEach(function() {
      config = {
        devices: {
          quantity: 10,
          powerStep: 100
        },
        // use max peak consumption per hour
        maxPower: 3000
      };
      testDataGenerator = new TestDataGenerator(config);
    });
    it('generates collection of devices that pass DataValidator@validateDevices', function test() {
      const devices = testDataGenerator.generateDevices();
      //console.log(devices);
      expect(dataValidator.validateDevices(devices, config.maxPower)).to.equal(true);
    });
  });
});