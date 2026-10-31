import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  review: {
    filterAll: 'All',
    filterWrong: 'Wrong',
    filterSkipped: 'Skipped',
    filterMarked: 'Marked for review',
    skipped: 'Skipped',
    marked: 'Marked for review',
    markedShort: 'marked',
    time: 'Time {{t}}',
    questionOfSection: '{{section}} · Question {{n}}',
    solution: 'Solution',
    noSolution: 'No solution has been added for this question yet.',
    prev: 'Previous',
    next: 'Next',
    empty: 'No questions in this filter.',
    listLabel: 'Questions',
  },
}

const hi = {
  review: {
    filterAll: 'सभी',
    filterWrong: 'गलत',
    filterSkipped: 'छोड़े गए',
    filterMarked: 'समीक्षा के लिए चिह्नित',
    skipped: 'छोड़ा गया',
    marked: 'समीक्षा के लिए चिह्नित',
    markedShort: 'चिह्नित',
    time: 'समय {{t}}',
    questionOfSection: '{{section}} · प्रश्न {{n}}',
    solution: 'हल',
    noSolution: 'इस प्रश्न का हल अभी जोड़ा नहीं गया है।',
    prev: 'पिछला',
    next: 'अगला',
    empty: 'इस फ़िल्टर में कोई प्रश्न नहीं है।',
    listLabel: 'प्रश्न',
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)