import { useState } from 'react';
import { LanguageContext } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [language, setLanguage] = useState('hr');

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <AppNavigator />
    </LanguageContext.Provider>
  );
}
