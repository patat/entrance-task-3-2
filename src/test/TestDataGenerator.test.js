import { expect } from 'chai';
import TestDataGenerator from '../TestDataGenerator';

describe('TestDataGenerator', function() {
  let testDataGenerator,
    config = {};
  beforeEach(function() {
    testDataGenerator = new TestDataGenerator(config);
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
          zones: 6,
          priceInterval: [2, 6]
        }
      };
      testDataGenerator = new TestDataGenerator(config);
    });
    it('generates a set of rates', function test() {
      const rates = testDataGenerator.generateRates();
      expect(testDataGenerator.generateRates()).to.have.length(config.rates.zones);
      console.log(JSON.stringify(rates));
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