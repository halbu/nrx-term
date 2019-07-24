import { expect } from 'chai';
import { Lerp } from '../src/lerp';
import { Color } from '../src/color';

describe('Lerp tests', () => {
  it('should correctly linearly interpolate two sets of RGB values', () => {
    const lerped = Lerp.lerp(0, 0, 0, 8, 8, 8, 0.75);
    const expectedLerpResult = new Color(6, 6, 6);

    expect(lerped.equals(expectedLerpResult)).equal(true);
  }); 

  it('should correctly linearly interpolate two Color objects', () => {
    const color1 = new Color(0, 0, 0);
    const color2 = new Color(64, 64, 64);

    const lerped = Lerp.lerpColor(color1, color2, 0.25);

    const expectedLerpResult = new Color(16, 16, 16);

    expect(lerped.equals(expectedLerpResult)).equal(true);
  }); 
});
