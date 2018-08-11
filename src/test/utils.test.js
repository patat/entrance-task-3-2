import { expect } from 'chai';

import {
  loadData
} from '../utils';

describe('loadData', function() {
  it('shoud return contents of a .json file', function test() {
    const expected = [
      {
          num: 1,
          word: "One"
      },{
          num: 2,
          word: "Two"
      },{
          num: 3,
          word: "Three"
      },{
          num: 4,
          word: "Four"
      },{
          num: 5,
          word: "Five"
      },{
          num: 0,
          word: "Zero"
      }
    ];
    expect(loadData('ref.json')).to.deep.equal(expected);
  });
});



