'use client'

import i18next from 'i18next'
import { useEffect, useState } from 'react'
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next'
import { getOptions, languages } from './settings'
import common from './locales/en/common.json'

const runsOnServerSide = typeof window === 'undefined'

// on client side the normal singleton is ok
i18next
  .use(initReactI18next)
  .init({
    ...getOptions(),
    resources: {
      en: { translation: common }
    },
    lng: 'en', 
    preload: runsOnServerSide ? languages : []
  })

export function useTranslation(lng, ns, options) {
  const ret = useTranslationOrg(ns, options)
  const { i18n } = ret
  if (runsOnServerSide && lng && i18n.resolvedLanguage !== lng) {
    i18n.changeLanguage(lng)
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (activeLng === i18n.resolvedLanguage) return
      setActiveLng(i18n.resolvedLanguage)
    }, [activeLng, i18n.resolvedLanguage])
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (!lng || i18n.resolvedLanguage === lng) return
      i18n.changeLanguage(lng)
    }, [lng, i18n])
  }
  return ret
}
