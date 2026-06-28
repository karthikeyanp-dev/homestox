import { describe, it, expect } from 'vitest';
import {
  normalizeUnit,
  getBaseUnit,
  calcUnitPrice,
  calcUnitPriceValue,
} from '../services/analyticsService';

describe('normalizeUnit', () => {
  it('converts weight units to kg', () => {
    expect(normalizeUnit(100, 'g')).toEqual({ quantity: 0.1, unit: 'kg' });
    expect(normalizeUnit(100, 'gms')).toEqual({ quantity: 0.1, unit: 'kg' });
    expect(normalizeUnit(1, 'kg')).toEqual({ quantity: 1, unit: 'kg' });
    expect(normalizeUnit(2500, 'g')).toEqual({ quantity: 2.5, unit: 'kg' });
  });

  it('converts volume units to L', () => {
    expect(normalizeUnit(500, 'ml')).toEqual({ quantity: 0.5, unit: 'L' });
    expect(normalizeUnit(1, 'L')).toEqual({ quantity: 1, unit: 'L' });
  });

  it('converts count units to pcs', () => {
    expect(normalizeUnit(1, 'pcs')).toEqual({ quantity: 1, unit: 'pcs' });
    expect(normalizeUnit(1, 'dozen')).toEqual({ quantity: 12, unit: 'pcs' });
    expect(normalizeUnit(2, 'dozen')).toEqual({ quantity: 24, unit: 'pcs' });
  });

  it('leaves standalone units (pack/box) unconverted', () => {
    expect(normalizeUnit(3, 'pack')).toEqual({ quantity: 3, unit: 'pack' });
    expect(normalizeUnit(2, 'box')).toEqual({ quantity: 2, unit: 'box' });
  });

  it('returns unknown units as-is', () => {
    expect(normalizeUnit(5, 'litre')).toEqual({ quantity: 5, unit: 'litre' });
    expect(normalizeUnit(5, 'kgg')).toEqual({ quantity: 5, unit: 'kgg' });
  });

  it('falls back to a lowercase match for known units', () => {
    expect(normalizeUnit(100, 'G')).toEqual({ quantity: 0.1, unit: 'kg' });
    expect(normalizeUnit(100, 'ML')).toEqual({ quantity: 0.1, unit: 'L' });
    expect(normalizeUnit(1, 'KG')).toEqual({ quantity: 1, unit: 'kg' });
  });
});

describe('getBaseUnit', () => {
  it('returns the base unit for known units', () => {
    expect(getBaseUnit('g')).toBe('kg');
    expect(getBaseUnit('gms')).toBe('kg');
    expect(getBaseUnit('kg')).toBe('kg');
    expect(getBaseUnit('ml')).toBe('L');
    expect(getBaseUnit('L')).toBe('L');
    expect(getBaseUnit('pcs')).toBe('pcs');
    expect(getBaseUnit('dozen')).toBe('pcs');
    expect(getBaseUnit('pack')).toBe('pack');
    expect(getBaseUnit('box')).toBe('box');
  });

  it('returns the unit unchanged when unknown', () => {
    expect(getBaseUnit('litre')).toBe('litre');
    expect(getBaseUnit('kgg')).toBe('kgg');
  });
});

describe('calcUnitPrice', () => {
  it('returns the README example: ₹10/100g = ₹100/kg and ₹90/1kg = ₹90/kg', () => {
    const a = calcUnitPrice(10, 100, 'g');
    expect(a).toEqual({ value: 100, unit: 'kg' });

    const b = calcUnitPrice(90, 1, 'kg');
    expect(b).toEqual({ value: 90, unit: 'kg' });
  });

  it('computes normalized price per base unit for volume', () => {
    expect(calcUnitPrice(20, 500, 'ml')).toEqual({ value: 40, unit: 'L' });
    expect(calcUnitPrice(90, 1, 'L')).toEqual({ value: 90, unit: 'L' });
  });

  it('computes price per piece for count units', () => {
    expect(calcUnitPrice(60, 1, 'dozen')).toEqual({ value: 5, unit: 'pcs' });
    expect(calcUnitPrice(5, 1, 'pcs')).toEqual({ value: 5, unit: 'pcs' });
  });

  it('defaults to pcs when no unit is given', () => {
    expect(calcUnitPrice(50, 10)).toEqual({ value: 5, unit: 'pcs' });
  });

  it('returns value 0 when quantity is zero, negative, or missing', () => {
    expect(calcUnitPrice(10, 0, 'kg')).toEqual({ value: 0, unit: 'kg' });
    expect(calcUnitPrice(10, -5, 'kg')).toEqual({ value: 0, unit: 'kg' });
    expect(calcUnitPrice(10, NaN, 'kg')).toEqual({ value: 0, unit: 'kg' });
  });

  it('returns value 0 when price is zero, negative, or missing', () => {
    expect(calcUnitPrice(0, 100, 'g')).toEqual({ value: 0, unit: 'g' });
    expect(calcUnitPrice(-5, 100, 'g')).toEqual({ value: 0, unit: 'g' });
    expect(calcUnitPrice(NaN, 100, 'g')).toEqual({ value: 0, unit: 'g' });
  });

  it('returns "unit" as the fallback unit when price/quantity invalid and no unit given', () => {
    expect(calcUnitPrice(0, 0)).toEqual({ value: 0, unit: 'unit' });
  });

  it('handles unknown units by treating the quantity as-is', () => {
    expect(calcUnitPrice(50, 5, 'litre')).toEqual({ value: 10, unit: 'litre' });
  });
});

describe('calcUnitPriceValue', () => {
  it('returns just the numeric value from calcUnitPrice', () => {
    expect(calcUnitPriceValue(10, 100, 'g')).toBe(100);
    expect(calcUnitPriceValue(90, 1, 'kg')).toBe(90);
    expect(calcUnitPriceValue(60, 1, 'dozen')).toBe(5);
  });

  it('returns 0 for invalid inputs', () => {
    expect(calcUnitPriceValue(10, 0, 'kg')).toBe(0);
    expect(calcUnitPriceValue(0, 10, 'kg')).toBe(0);
  });

  it('enables sorting purchases by ascending unit price', () => {
    // ₹90/1kg (90/kg) is cheaper than ₹10/100g (100/kg)
    const cheaper = calcUnitPriceValue(90, 1, 'kg');
    const pricier = calcUnitPriceValue(10, 100, 'g');
    expect(cheaper).toBeLessThan(pricier);
  });
});
