import i18n from 'i18next'

const en = {
  dcmp: {
    empty: 'Finish an exam to see how you compare with your last attempt.',
    seeAnalysis: 'See full analysis',
  },
}

const hi = {
  dcmp: {
    empty: 'पिछले प्रयास से तुलना देखने के लिए कोई परीक्षा पूरी करें।',
    seeAnalysis: 'पूरा विश्लेषण देखें',
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)