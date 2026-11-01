import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  search: {
    mine: 'Your exams',
    loading: 'Loading your exams…',
    noneForYou: 'No exam is available for your profile yet. Type an exam name to ask us to add it.',
  },
}

const hi = {
  search: {
    mine: 'आपकी परीक्षाएँ',
    loading: 'आपकी परीक्षाएँ लोड हो रही हैं…',
    noneForYou: 'आपकी प्रोफ़ाइल के लिए अभी कोई परीक्षा उपलब्ध नहीं है। जोड़ने का अनुरोध करने के लिए परीक्षा का नाम लिखें।',
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)