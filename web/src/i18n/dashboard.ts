import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  dash: {
    welcome: 'Welcome, {{name}}!',
    subtitle: 'Practise in real exam conditions.',
    yourTarget: 'Your target exam: {{exam}}',
    noTarget: '{{exam}} practice is not available yet. We will add it soon.',
    emptyForYou: 'No exams are available for your profile yet. We will add them soon.',
    exams: 'Your exams',
    loading: 'Loading exams…',
    error: 'Could not load exams. Please try again.',
    retry: 'Try again',
    view: 'View exam',
    sectionsN: '{{n}} sections',
    minutesN: '{{n}} min',
    questionsN: '{{n}} questions',
    soon: 'Coming soon',
    cards: {
      continue: 'Continue your attempt',
      recent: 'Recent attempts',
      daily: 'Daily challenge',
      countdown: 'Exam countdown',
      compare: 'Compare with last attempt',
    },
    cat: {
      GOVT_COMPETITIVE: 'Government exams',
      SCHOOL: 'School',
      COLLEGE: 'College',
      CORPORATE: 'Corporate',
    },
  },
}

const hi = {
  dash: {
    welcome: 'स्वागत है, {{name}}!',
    subtitle: 'असली परीक्षा जैसे माहौल में प्रैक्टिस करें।',
    yourTarget: 'आपकी लक्ष्य परीक्षा: {{exam}}',
    noTarget: '{{exam}} की प्रैक्टिस अभी उपलब्ध नहीं है। हम इसे जल्द जोड़ेंगे।',
    emptyForYou: 'आपकी प्रोफ़ाइल के लिए अभी कोई परीक्षा उपलब्ध नहीं है। हम इन्हें जल्द जोड़ेंगे।',
    exams: 'आपकी परीक्षाएँ',
    loading: 'परीक्षाएँ लोड हो रही हैं…',
    error: 'परीक्षाएँ लोड नहीं हो पाईं। कृपया फिर कोशिश करें।',
    retry: 'फिर कोशिश करें',
    view: 'परीक्षा देखें',
    sectionsN: '{{n}} सेक्शन',
    minutesN: '{{n}} मिनट',
    questionsN: '{{n}} प्रश्न',
    soon: 'जल्द आ रहा है',
    cards: {
      continue: 'अपना अटेम्प्ट जारी रखें',
      recent: 'हाल के अटेम्प्ट',
      daily: 'डेली चैलेंज',
      countdown: 'परीक्षा काउंटडाउन',
      compare: 'पिछले अटेम्प्ट से तुलना',
    },
    cat: {
      GOVT_COMPETITIVE: 'सरकारी परीक्षाएँ',
      SCHOOL: 'स्कूल',
      COLLEGE: 'कॉलेज',
      CORPORATE: 'कॉरपोरेट',
    },
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)