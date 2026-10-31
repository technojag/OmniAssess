import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  dash: {
    recent: {
      seeAll: 'See all attempts',
      latest: 'Latest attempt',
      historyTitle: 'Your attempts',
      back: 'Back to dashboard',
      count: '{{n}} attempt(s)',
    },
  },
}

const hi = {
  dash: {
    recent: {
      seeAll: 'सभी अटेम्प्ट देखें',
      latest: 'सबसे हाल का अटेम्प्ट',
      historyTitle: 'आपके अटेम्प्ट',
      back: 'डैशबोर्ड पर वापस जाएँ',
      count: '{{n}} अटेम्प्ट',
    },
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)