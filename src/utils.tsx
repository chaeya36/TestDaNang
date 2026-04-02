import React from 'react';

export let globalExchangeRate = 0.0575; // 1 VND = 0.0575 KRW (approx default)

export const setGlobalExchangeRate = (rate: number) => {
  globalExchangeRate = rate;
};

export const formatVND = (amount: number) => {
  return `${(amount/1000).toLocaleString()}k`;
};

export const formatKRW = (amount: number) => {
  return `${Math.round(amount * globalExchangeRate).toLocaleString()}원`;
};

export const formatVNDRange = (min: number, max: number) => {
  if (min === 0 && max === 0) return "포함 / 무료";
  return (
    <span>
      {formatVND(min)} - {formatVND(max)}
      <span className="text-gray-400 text-[10px] ml-1">
        ({formatKRW(min)}~{formatKRW(max)})
      </span>
    </span>
  );
};
