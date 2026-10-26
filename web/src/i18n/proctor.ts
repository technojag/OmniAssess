import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  exam: {
    proctor: {
      warnTitle: 'Warning',
      warnTab: 'You left the exam window or switched tabs.',
      warnFullscreen: 'You exited fullscreen.',
      count: 'Warning {{n}} of {{max}}',
      left: 'Your exam will end after {{n}} more warning(s).',
      integrity: 'Integrity score: {{n}}',
      gateTitle: 'Fullscreen required',
      gateBody: 'The exam runs in fullscreen. Click below to continue. Your timer keeps running.',
      enter: 'Enter fullscreen',
      back: 'Return to fullscreen',
      ok: 'OK, continue',
    },
  },
}

const hi = {
  exam: {
    proctor: {
      warnTitle: 'चेतावनी',
      warnTab: 'आपने परीक्षा की विंडो छोड़ी या टैब बदला।',
      warnFullscreen: 'आप फ़ुलस्क्रीन से बाहर निकले।',
      count: 'चेतावनी {{n}} / {{max}}',
      left: '{{n}} और चेतावनी के बाद आपकी परीक्षा खत्म हो जाएगी।',
      integrity: 'इंटीग्रिटी स्कोर: {{n}}',
      gateTitle: 'फ़ुलस्क्रीन ज़रूरी है',
      gateBody: 'परीक्षा फ़ुलस्क्रीन में चलती है। आगे बढ़ने के लिए नीचे दबाएँ। आपका टाइमर चलता रहेगा।',
      enter: 'फ़ुलस्क्रीन में जाएँ',
      back: 'फ़ुलस्क्रीन में वापस जाएँ',
      ok: 'ठीक है, जारी रखें',
    },
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)