import i18n from 'i18next'

const en = {
  act: {
    title: 'Your activity',
    subtitle: 'A day turns blue when you finish an exam or solve all 5 daily questions.',
    currentStreak: 'Current streak',
    longestStreak: 'Longest streak',
    thisWeek: 'This week',
    days: '{{n}} days',
    day1: '1 day',
    activeOf7: '{{n}} of 7 days active',
    growthUp: '▲ {{n}}% more than last week',
    growthDown: '▼ {{n}}% less than last week',
    growthSame: '= Same as last week',
    growthNew: 'New this week, nice start!',
    growthNone: 'No activity yet this week',
    legendActive: 'Active day',
    legendPartial: 'Daily challenge started',
    legendNone: 'No activity',
    hint: 'Tap a square to see that day.',
    detail: '{{date}} — Exams completed: {{exams}} · Daily challenge: {{done}}/{{total}}',
    statusActive: 'Active day',
    statusPartial: 'Not complete',
    statusNone: 'No activity',
    loading: 'Loading your activity...',
    error: 'Could not load your activity.',
    retry: 'Try again',
  },
}

const hi = {
  act: {
    title: 'आपकी गतिविधि',
    subtitle: 'जिस दिन आप कोई परीक्षा पूरी करते हैं या डेली चैलेंज के सभी 5 सवाल हल करते हैं, वह दिन नीला हो जाता है।',
    currentStreak: 'मौजूदा स्ट्रीक',
    longestStreak: 'सबसे लंबी स्ट्रीक',
    thisWeek: 'इस हफ़्ते',
    days: '{{n}} दिन',
    day1: '1 दिन',
    activeOf7: '7 में से {{n}} दिन सक्रिय',
    growthUp: '▲ पिछले हफ़्ते से {{n}}% ज़्यादा',
    growthDown: '▼ पिछले हफ़्ते से {{n}}% कम',
    growthSame: '= पिछले हफ़्ते जितना',
    growthNew: 'इस हफ़्ते नई शुरुआत, बढ़िया!',
    growthNone: 'इस हफ़्ते अभी कोई गतिविधि नहीं',
    legendActive: 'सक्रिय दिन',
    legendPartial: 'डेली चैलेंज शुरू किया',
    legendNone: 'कोई गतिविधि नहीं',
    hint: 'किसी दिन का विवरण देखने के लिए उस डिब्बे को छुएँ।',
    detail: '{{date}} — पूरी की गई परीक्षाएँ: {{exams}} · डेली चैलेंज: {{done}}/{{total}}',
    statusActive: 'सक्रिय दिन',
    statusPartial: 'अधूरा',
    statusNone: 'कोई गतिविधि नहीं',
    loading: 'आपकी गतिविधि लोड हो रही है...',
    error: 'आपकी गतिविधि लोड नहीं हो सकी।',
    retry: 'फिर कोशिश करें',
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)