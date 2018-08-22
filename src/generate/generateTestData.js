import { expect } from 'chai';
import { appendGeneratedInput } from '../utils';
import DataValidator from '../DataValidator';
import TestDataGenerator from '../TestDataGenerator';

describe('generateTestData', function () {
  it('saves inputData to file without errors', function test () {
    const config = {
      rates: {
        periods: 5,
        priceInterval: [1, 7]
      },
      devices: {
        quantity: 7,
        powerStep: 50
      },
      maxPower: 4200
    };
    const testDataGenerator = new TestDataGenerator(config);
    const dataValidator = new DataValidator();
    for (let i = 0; i < 10; i++) {
      let generatedInput;
      for (let j = 0; j < 10; j++) {
        generatedInput = testDataGenerator.generate();
        if (dataValidator.validateDevices(generatedInput.devices, generatedInput.maxPower)) {
          break;
        }
      }
      appendGeneratedInput('src/generate/generatedInput7.json', generatedInput);
    }
    expect(true).to.equal(true);
  });
});
