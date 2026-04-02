import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { formatVND, formatKRW, formatVNDRange, setGlobalExchangeRate } from './utils';

describe('Currency Formatting Helpers', () => {
  beforeEach(() => {
    // Reset to default exchange rate before each test
    setGlobalExchangeRate(0.0575);
  });

  describe('formatVND', () => {
    it('should format VND correctly by dividing by 1000 and appending "k"', () => {
      expect(formatVND(10000)).toBe('10k');
      expect(formatVND(50000)).toBe('50k');
      expect(formatVND(1500000)).toBe('1,500k');
    });

    it('should handle zero correctly', () => {
      expect(formatVND(0)).toBe('0k');
    });
  });

  describe('formatKRW', () => {
    it('should format KRW correctly based on the global exchange rate', () => {
      // 10000 * 0.0575 = 575
      expect(formatKRW(10000)).toBe('575원');
      // 50000 * 0.0575 = 2875
      expect(formatKRW(50000)).toBe('2,875원');
    });

    it('should reflect changes when the global exchange rate is updated', () => {
      setGlobalExchangeRate(0.06);
      // 10000 * 0.06 = 600
      expect(formatKRW(10000)).toBe('600원');
    });

    it('should handle zero correctly', () => {
      expect(formatKRW(0)).toBe('0원');
    });
  });

  describe('formatVNDRange', () => {
    it('should return "포함 / 무료" when both min and max are 0', () => {
      expect(formatVNDRange(0, 0)).toBe('포함 / 무료');
    });

    it('should render the correct formatted range for non-zero values', () => {
      const { container } = render(formatVNDRange(50000, 100000) as React.ReactElement);
      
      // Expected VND part: "50k - 100k"
      // Expected KRW part: "(2,875원~5,750원)"
      expect(container.textContent).toBe('50k - 100k(2,875원~5,750원)');
    });

    it('should reflect updated exchange rates in the rendered range', () => {
      setGlobalExchangeRate(0.05); // 1 VND = 0.05 KRW
      const { container } = render(formatVNDRange(50000, 100000) as React.ReactElement);
      
      // 50000 * 0.05 = 2500
      // 100000 * 0.05 = 5000
      expect(container.textContent).toBe('50k - 100k(2,500원~5,000원)');
    });
  });
});
