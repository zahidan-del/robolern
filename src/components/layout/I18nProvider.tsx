'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Messages = Record<string, any>;
const I18nContext = createContext<{ t: (key: string) => string; locale: string }>({
  t: (k) => k,
  locale: 'id',
});

function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? path;
}

export function I18nProvider({
  children,
  messages,
  locale,
}: {
  children: React.ReactNode;
  messages: Messages;
  locale: string;
}) {
  const t = (key: string) => getNestedValue(messages, key);
  return (
    <I18nContext.Provider value={{ t, locale }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
export const useLocale = () => useContext(I18nContext).locale;
export const useTranslations = (ns?: string) => {
  const { t } = useContext(I18nContext);
  return (key: string) => ns ? t(`${ns}.${key}`) : t(key);
};
