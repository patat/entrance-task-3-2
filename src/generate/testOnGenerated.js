import { expect } from 'chai';
import {
  loadData,
  appendGeneratedInput
} from '../utils';
import PowerScheduler from '../PowerScheduler';

describe('test on generated input', function () {
  // it('bf works', function test() {
  //      this.timeout(50000);
  //   const output = [];
  //   const generatedData = loadData('src/generate/generatedInput5.json');
  //   // generatedData.forEach(sample => {
  //     const powerScheduler = new PowerScheduler(generatedData[6]);
  //     const currPutput = powerScheduler.bruteForce();
  //     //output.push(currPutput);
  //     console.log(currPutput);
  //     console.log(powerScheduler._totalMinCost);
  //     console.log(powerScheduler._calcScheduleMostBusyHourUsage(currPutput.schedule));

  //   // });
  //   appendGeneratedInput('src/generate/generatedOutputBF5.json', currPutput);
  //   expect(true).to.equal(true);
  // });

  // it('ga works', function test() {
  //   this.timeout(10000);
  //   const output = [];
  //   const generatedData = loadData('src/generate/generatedInput5.json');
  //   // generatedData.forEach(sample => {
  //     const powerScheduler = new PowerScheduler(generatedData[0]);
  //     const currPutput = powerScheduler.schedule();
  //     //output.push(currPutput);
  //     console.log(currPutput);
  //     console.log(powerScheduler._totalMinCost);
  //     console.log(powerScheduler._calcScheduleMostBusyHourUsage(currPutput.schedule));

  //   // });
  //   appendGeneratedInput('src/generate/generatedOutputGA5.json', currPutput);
  //   expect(true).to.equal(true);
  // });

  it('bf2 works', function test () {
    this.timeout(10000);
    const output = [];
    const generatedData = loadData('src/generate/generatedInput5.json');
    // generatedData.forEach(sample => {
    const powerScheduler = new PowerScheduler(generatedData[7]);
    const currPutput = powerScheduler.bruteForce2();
    // output.push(currPutput);
    console.log(currPutput);
    console.log(powerScheduler._totalMinCost);
    console.log(powerScheduler._calcScheduleMostBusyHourUsage(currPutput.schedule));

    // });
    appendGeneratedInput('src/generate/generatedOutputBF25.json', currPutput);
    expect(true).to.equal(true);
  });
});
