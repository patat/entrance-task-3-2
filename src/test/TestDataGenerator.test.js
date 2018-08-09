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

  describe('@generate', function() {
    it('returns value', function test() {
      expect(testDataGenerator.generate()).to.equal('hello schedule');
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
});