import { createContext, useContext } from 'react';

export const LanguageContext = createContext('hr');
export const useLanguage = () => useContext(LanguageContext);
