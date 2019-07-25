import { expect } from 'chai';
import { Color } from '../src/color';

describe('Color tests', () => {
  it('should instantiate', () => {
    const testColor = new Color(1, 2, 3);

    expect(testColor).to.not.equal(null);
  });
  
  it('should consider two Color objects with equal RGB values to be equal', () => {
    const color1 = new Color(64, 128, 192);
    const color2 = new Color(64, 128, 192);

    expect(color1.equals(color2)).equal(true);
  });
  
  it('should consider two Color objects with differing RGB values to be unequal', () => {
    const color1 = new Color(64, 128, 192);
    const color2 = new Color(192, 128, 64);

    expect(color1.equals(color2)).equal(false);
  });
});
