import { expect } from 'chai';
import { Point } from '../src/point';

describe('Point tests', () => {
  it('should instantiate', () => {
    const testpoint = new Point(1, 2);

    expect(testpoint).to.not.equal(null);
  });
  
  it('should clone a Point object by creating a new Point object that is not strictly equal to the original', () => {
    const point1 = new Point(1, 2);
    const point2 = point1.clone();

    expect(point1.equals(point2)).equal(true);
    expect(point1 === point2).equal(false);
  });
  
  it('should consider two Point objects with the same XY values to be equal', () => {
    const point1 = new Point(4, 2);
    const point2 = new Point(4, 2);

    expect(point1.equals(point2)).equal(true);
  });
  
  it('should consider two Point objects with differing XY values to be unequal', () => {
    const point1 = new Point(4, 2);
    const point2 = new Point(2, 4);

    expect(point1.equals(point2)).equal(false);
  });
});
