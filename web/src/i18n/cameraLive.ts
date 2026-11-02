import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  exam: {
    proctor: {
      camLive: 'Faces {{f}} · People {{p}}',
      camPhone: 'Phone',
      camBook: 'Book',
    },
  },
}

const hi = {
  exam: {
    proctor: {
      camLive: 'चेहरे {{f}} · व्यक्ति {{p}}',
      camPhone: 'फ़ोन',
      camBook: 'किताब',
    },
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)