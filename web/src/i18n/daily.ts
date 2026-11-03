import i18n from 'i18next'

const en = {
  daily: {
    title: 'Daily challenge',
    subtitle: '5 quick questions, new ones every day.',
    questionN: 'Question {{n}} of {{total}}',
    check: 'Check answer',
    checking: 'Checking...',
    next: 'Next question',
    seeResult: 'See result',
    correctMsg: 'Correct!',
    wrongMsg: 'Not quite.',
    correctLabel: 'Correct answer',
    yourLabel: 'Your answer',
    explanation: 'Explanation',
    done: 'Done for today!',
    score: 'You got {{score}} out of {{total}} right.',
    comeBack: 'Come back tomorrow for new questions.',
    loading: "Loading today's questions...",
    error: 'Could not load the daily challenge.',
    retry: 'Try again',
    checkError: 'Could not check your answer. Please try again.',
    empty: 'No questions are available yet. Please check back soon.',
  },
}

const hi = {
  daily: {
    title: 'डेली चैलेंज',
    subtitle: '5 छोटे सवाल, हर दिन नए।',
    questionN: 'प्रश्न {{n}} / {{total}}',
    check: 'उत्तर जाँचें',
    checking: 'जाँच हो रही है...',
    next: 'अगला प्रश्न',
    seeResult: 'नतीजा देखें',
    correctMsg: 'सही!',
    wrongMsg: 'सही नहीं।',
    correctLabel: 'सही उत्तर',
    yourLabel: 'आपका उत्तर',
    explanation: 'समाधान',
    done: 'आज के लिए पूरा!',
    score: 'आपके {{total}} में से {{score}} सही रहे।',
    comeBack: 'नए सवालों के लिए कल फिर आइए।',
    loading: 'आज के सवाल लोड हो रहे हैं...',
    error: 'डेली चैलेंज लोड नहीं हो सका।',
    retry: 'फिर कोशिश करें',
    checkError: 'उत्तर जाँचा नहीं जा सका। कृपया फिर कोशिश करें।',
    empty: 'अभी कोई सवाल उपलब्ध नहीं है। कृपया थोड़ी देर बाद देखें।',
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)