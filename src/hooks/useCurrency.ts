import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CURRENCIES, CurrencyCode } from "@/types";

export const useCurrency = () => {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`currency_${user.id}`);
      if (stored) {
        setCurrency(stored as CurrencyCode);
      }
    }
  }, [user]);

  const updateCurrency = (newCurrency: CurrencyCode) => {
    if (user) {
      localStorage.setItem(`currency_${user.id}`, newCurrency);
      setCurrency(newCurrency);
    }
  };

  const convertAmount = (amount: number, fromCurrency: CurrencyCode = "USD") => {
    const fromRate = CURRENCIES[fromCurrency].rate;
    const toRate = CURRENCIES[currency].rate;
    return (amount / fromRate) * toRate;
  };

  const formatCurrency = (amount: number) => {
    const currencyInfo = CURRENCIES[currency];
    return `${currencyInfo.symbol}${amount.toFixed(2)}`;
  };

  return {
    currency,
    updateCurrency,
    convertAmount,
    formatCurrency,
    currencySymbol: CURRENCIES[currency].symbol,
  };
};
