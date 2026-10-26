import { parseCheckoutAmount } from './checkout-amount';

describe('parseCheckoutAmount', () => {
  it('converts whole and decimal major-unit amounts to cents', () => {
    expect(parseCheckoutAmount('25')).toBe(2500);
    expect(parseCheckoutAmount('25.50')).toBe(2550);
  });

  it('rejects amounts below the checkout minimum', () => {
    expect(parseCheckoutAmount('1.99')).toBeNull();
  });

  it.each([null, '', 'abc', '2.001', '-5', '1e2', 'Infinity'])('rejects invalid amount %s', (value) => {
    expect(parseCheckoutAmount(value)).toBeNull();
  });
});
