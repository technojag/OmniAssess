import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  exam: {
    proctor: {
      warnPhone: 'A phone is visible to the camera. Take it out of the camera view.',
      warnObject: 'A book or another object is visible to the camera. Take it out of the camera view.',
    },
  },
  analysis: {
    conductPhone: 'A phone was seen {{n}} time(s).',
    conductObject: 'A book or another object was seen {{n}} time(s).',
  },
}

const hi = {
  exam: {
    proctor: {
      warnPhone: 'कैमरे को फ़ोन दिख रहा है। उसे कैमरे के दायरे से हटाएँ।',
      warnObject: 'कैमरे को किताब या कोई और चीज़ दिख रही है। उसे कैमरे के दायरे से हटाएँ।',
    },
  },
  analysis: {
    conductPhone: 'फ़ोन {{n}} बार दिखा।',
    conductObject: 'किताब या कोई और चीज़ {{n}} बार दिखी।',
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)