'use client';
import React, { useState, useMemo } from 'react';
import I18NextContext from '.';

const I18NextProvider = (props) => {
  const [i18Lang, setI18Lang] = useState('en');
  const value = useMemo(() => ({ ...props, i18Lang, setI18Lang }), [props, i18Lang]);
  return <I18NextContext.Provider value={value}>{props.children}</I18NextContext.Provider>;
};

export default I18NextProvider;
