import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  rev: {
    nav: 'Revision list',
    title: 'Revision list',
    subtitle: 'Questions you saved to practise again.',
    empty: 'Your revision list is empty. Add questions from your exam review.',
    count: '{{n}} question(s)',
    hint: 'Tap an option to check it, or press Show answer.',
    add: 'Add to revision list',
    remove: 'Remove from revision list',
    removeShort: 'Remove',
    addAllWrong: 'Add all my wrong answers',
    addedN: '{{n}} question(s) added to your revision list.',
    nothingToAdd: 'There are no new wrong answers to add.',
    openList: 'Open revision list ({{n}})',
    showAnswer: 'Show answer',
    hideAnswer: 'Hide answer',
    yourChoice: 'Your choice',
    correctAnswer: 'Correct answer',
    solution: 'Solution',
    noSolution: 'No solution has been added for this question yet.',
    fail: 'Could not update your revision list. Please try again.',
    loading: 'Loading your revision list…',
    loadFail: 'Could not load your revision list.',
    retry: 'Try again',
    back: 'Back to dashboard',
  },
}

const hi = {
  rev: {
    nav: 'रिवीज़न लिस्ट',
    title: 'रिवीज़न लिस्ट',
    subtitle: 'वे प्रश्न जो आपने दोबारा अभ्यास के लिए सेव किए।',
    empty: 'आपकी रिवीज़न लिस्ट खाली है। परीक्षा की समीक्षा से प्रश्न जोड़ें।',
    count: '{{n}} प्रश्न',
    hint: 'जाँचने के लिए कोई विकल्प दबाएँ, या "उत्तर दिखाएँ" दबाएँ।',
    add: 'रिवीज़न लिस्ट में जोड़ें',
    remove: 'रिवीज़न लिस्ट से हटाएँ',
    removeShort: 'हटाएँ',
    addAllWrong: 'मेरे सभी गलत उत्तर जोड़ें',
    addedN: '{{n}} प्रश्न आपकी रिवीज़न लिस्ट में जोड़े गए।',
    nothingToAdd: 'जोड़ने के लिए कोई नया गलत उत्तर नहीं है।',
    openList: 'रिवीज़न लिस्ट खोलें ({{n}})',
    showAnswer: 'उत्तर दिखाएँ',
    hideAnswer: 'उत्तर छिपाएँ',
    yourChoice: 'आपका चुनाव',
    correctAnswer: 'सही उत्तर',
    solution: 'हल',
    noSolution: 'इस प्रश्न का हल अभी जोड़ा नहीं गया है।',
    fail: 'आपकी रिवीज़न लिस्ट अपडेट नहीं हो पाई। कृपया फिर कोशिश करें।',
    loading: 'आपकी रिवीज़न लिस्ट लोड हो रही है…',
    loadFail: 'आपकी रिवीज़न लिस्ट लोड नहीं हो पाई।',
    retry: 'फिर कोशिश करें',
    back: 'डैशबोर्ड पर वापस जाएँ',
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)