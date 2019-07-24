import { expect } from 'chai';
import { NRXCell } from '../src/cell';
import { Color } from '../src/color';

describe('Cell tests', () => {
  it('should instantiate', () => {
    const testCell = new NRXCell();
    expect(testCell).to.not.equal(null);
  });
  
  it('should handle foreground (character) color lerping correctly', () => {
    const testCell = new NRXCell();
    
    testCell.setFgc(0, 0, 0);
    testCell.lerpFgc(100, 100, 100, 0.75);

    expect(testCell.fgc.equals(new Color(75, 75, 75))).equal(true);
  });
  
  it('should handle background color lerping correctly', () => {
    const testCell = new NRXCell();
    
    testCell.setBgc(0, 0, 0);
    testCell.lerpBgc(128, 128, 128, 0.25);

    expect(testCell.bgc.equals(new Color(32, 32, 32))).equal(true);
  });
});
