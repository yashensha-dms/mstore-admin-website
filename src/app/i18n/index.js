import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next/initReactI18next'
import { getOptions } from './settings'
import common from './locales/en/common.json'

const initI18next = async (lng, ns) => {
  const i18nInstance = createInstance()
  await i18nInstance
    .use(initReactI18next)
    .init({
      ...getOptions(lng, ns),
      resources: {
        en: { translation: common }
      }
    })
  return i18nInstance
}

// export async function useTranslation(lng, ns, options = {}) {
//   const i18nextInstance = await initI18next(lng, ns)
//   return {
//     t: i18nextInstance.getFixedT(lng, Array.isArray(ns) ? ns[0] : ns, options.keyPrefix),
//     i18n: i18nextInstance
//   }
// }