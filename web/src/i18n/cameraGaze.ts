import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  exam: {
    cam: {
      intro:
        'This exam needs your camera and microphone. Your video is checked on your own computer to see your face, other people, phones, books and where you are looking. It is never recorded or uploaded. Only warnings are sent to the server.',
      stepGaze: 'Looking at the middle of your screen',
      hintGaze: 'Look at the middle of your screen and keep your head still for a few seconds. This sets your normal position.',
    },
    proctor: {
      warnGaze: 'You have been looking away from the screen for a while. Please look at the screen.',
      camAway: 'Looking away',
    },
  },
  analysis: {
    conductGaze: 'You looked away from the screen {{n}} time(s).',
  },
}

const hi = {
  exam: {
    cam: {
      intro:
        'इस परीक्षा के लिए आपका कैमरा और माइक्रोफ़ोन चाहिए। आपका वीडियो आपके अपने कंप्यूटर पर ही जाँचा जाता है, ताकि आपका चेहरा, दूसरे लोग, फ़ोन, किताबें और आप कहाँ देख रहे हैं यह पता चले। यह कभी रिकॉर्ड या अपलोड नहीं होता। सर्वर को सिर्फ़ चेतावनियाँ भेजी जाती हैं।',
      stepGaze: 'आप स्क्रीन के बीच में देख रहे हैं',
      hintGaze: 'स्क्रीन के बीच में देखें और कुछ सेकंड सिर स्थिर रखें। इससे आपकी सामान्य स्थिति तय होती है।',
    },
    proctor: {
      warnGaze: 'आप काफ़ी देर से स्क्रीन से नज़र हटाए हुए हैं। कृपया स्क्रीन की ओर देखें।',
      camAway: 'नज़र हटी है',
    },
  },
  analysis: {
    conductGaze: 'आपने {{n}} बार स्क्रीन से नज़र हटाई।',
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)