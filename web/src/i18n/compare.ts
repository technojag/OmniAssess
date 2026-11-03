import i18n from 'i18next'

const en = {
  cmp: {
    title: 'Compared with your last attempt',
    loading: 'Loading comparison...',
    error: 'Could not load the comparison.',
    retry: 'Try again',
    first: 'This is your first attempt at this exam. After your next attempt, you will see here how you improved.',
    vs: 'Last attempt: {{date}}',
    headUp: 'Great progress! Your score went up by {{n}} marks.',
    headDown: 'Your score went down by {{n}} marks. Check the review to see where marks were lost.',
    headSame: 'Your score is the same as last time.',
    colMeasure: 'Measure',
    colLast: 'Last attempt',
    colThis: 'This attempt',
    colChange: 'Change',
    colSection: 'Section',
    score: 'Score',
    correct: 'Correct',
    wrong: 'Wrong',
    attempted: 'Attempted',
    skipped: 'Not attempted',
    up: '▲ {{n}} more',
    down: '▼ {{n}} less',
    same: '= Same',
    sectionsTitle: 'Correct answers by section',
  },
}

const hi = {
  cmp: {
    title: 'पिछले प्रयास से तुलना',
    loading: 'तुलना लोड हो रही है...',
    error: 'तुलना लोड नहीं हो सकी।',
    retry: 'फिर कोशिश करें',
    first: 'यह इस परीक्षा का आपका पहला प्रयास है। अगले प्रयास के बाद यहाँ दिखेगा कि आपमें कितना सुधार हुआ।',
    vs: 'पिछला प्रयास: {{date}}',
    headUp: 'बढ़िया प्रगति! आपका स्कोर {{n}} अंक बढ़ा है।',
    headDown: 'आपका स्कोर {{n}} अंक घटा है। समीक्षा में देखें कि अंक कहाँ कटे।',
    headSame: 'आपका स्कोर पिछली बार जितना ही है।',
    colMeasure: 'पैमाना',
    colLast: 'पिछला प्रयास',
    colThis: 'यह प्रयास',
    colChange: 'बदलाव',
    colSection: 'सेक्शन',
    score: 'स्कोर',
    correct: 'सही',
    wrong: 'गलत',
    attempted: 'हल किए',
    skipped: 'छोड़े गए',
    up: '▲ {{n}} ज़्यादा',
    down: '▼ {{n}} कम',
    same: '= बराबर',
    sectionsTitle: 'सेक्शन के अनुसार सही उत्तर',
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)