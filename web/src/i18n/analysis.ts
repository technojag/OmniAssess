import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  analysis: {
    loading: 'Loading your analysis…',
    loadFail: 'Could not load the analysis. Please try again.',
    retry: 'Try again',
    compareSoon: 'This will show how you did compared with your last attempt.',
    avgTitle: 'Average time per attempted question',
    longestTitle: 'Questions that took the longest',
    conductTitle: 'Exam conduct',
    warnings: 'warning(s)',
    integrity: 'Integrity score {{n}}%.',
    conductClean: 'You stayed in full screen and did not switch tabs during the exam.',
    conductFullscreen: 'You left full screen {{n}} time(s).',
    conductTab: 'You switched tabs or windows {{n}} time(s).',
    conductTerminated: 'The exam was ended because the warning limit was reached.',
    dur: '{{m}} m {{s}} s',
    durS: '{{s}} s',
    noData: 'Not enough data yet.',
    seeReview: 'See question-by-question review',
  },
}

const hi = {
  analysis: {
    loading: 'आपका विश्लेषण लोड हो रहा है…',
    loadFail: 'विश्लेषण लोड नहीं हो पाया। कृपया फिर कोशिश करें।',
    retry: 'फिर कोशिश करें',
    compareSoon: 'यहाँ दिखेगा कि पिछले अटेम्प्ट की तुलना में आपका प्रदर्शन कैसा रहा।',
    avgTitle: 'हल किए गए प्रश्न पर औसत समय',
    longestTitle: 'सबसे ज़्यादा समय लेने वाले प्रश्न',
    conductTitle: 'परीक्षा में आचरण',
    warnings: 'चेतावनी',
    integrity: 'इंटीग्रिटी स्कोर {{n}}%।',
    conductClean: 'आप पूरी परीक्षा में फ़ुलस्क्रीन में रहे और टैब नहीं बदला।',
    conductFullscreen: 'आप {{n}} बार फ़ुलस्क्रीन से बाहर निकले।',
    conductTab: 'आपने {{n}} बार टैब या विंडो बदली।',
    conductTerminated: 'चेतावनी की सीमा पूरी होने के कारण परीक्षा समाप्त कर दी गई।',
    dur: '{{m}} मि {{s}} से',
    durS: '{{s}} से',
    noData: 'अभी पर्याप्त डेटा नहीं है।',
    seeReview: 'प्रश्न-दर-प्रश्न समीक्षा देखें',
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)