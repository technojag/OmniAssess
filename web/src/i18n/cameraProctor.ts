import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  exam: {
    proctor: {
      warnFace: 'Your face is not visible to the camera.',
      warnMulti: 'More than one person is visible to the camera.',
      warnHands: 'Both of your hands are not visible. Keep both hands in front of the camera.',
      noticeOnly: 'This is a notice. It lowers your integrity score but does not use up a warning.',
      camGateTitle: 'Camera required',
      camGateCamera: 'Your camera is off or blocked. The exam timer keeps running. Turn the camera on to continue.',
      camGateChecker: 'The camera checker could not start. Press the button to try again. The exam timer keeps running.',
      camGateHelp: 'If the browser blocked the camera, click the lock icon in the address bar, allow Camera, then press the button.',
      camGateButton: 'Turn on camera',
      camStarting: 'Starting camera…',
      camStatus: 'Faces {{f}} · Hands {{h}}/2',
      camLabel: 'Your camera preview',
    },
  },
  analysis: {
    conductFace: 'Your face was not visible {{n}} time(s).',
    conductMulti: 'More than one person was seen {{n}} time(s).',
    conductHands: 'Both hands were not visible {{n}} time(s).',
  },
}

const hi = {
  exam: {
    proctor: {
      warnFace: 'कैमरे को आपका चेहरा नहीं दिख रहा।',
      warnMulti: 'कैमरे में एक से ज़्यादा व्यक्ति दिख रहे हैं।',
      warnHands: 'आपके दोनों हाथ नहीं दिख रहे हैं। दोनों हाथ कैमरे के सामने रखें।',
      noticeOnly: 'यह एक सूचना है। इससे आपका इंटीग्रिटी स्कोर घटता है, पर कोई चेतावनी खर्च नहीं होती।',
      camGateTitle: 'कैमरा ज़रूरी है',
      camGateCamera: 'आपका कैमरा बंद या ब्लॉक है। परीक्षा का टाइमर चलता रहेगा। आगे बढ़ने के लिए कैमरा चालू करें।',
      camGateChecker: 'कैमरा चेकर शुरू नहीं हो पाया। फिर कोशिश के लिए बटन दबाएँ। परीक्षा का टाइमर चलता रहेगा।',
      camGateHelp: 'अगर ब्राउज़र ने कैमरा ब्लॉक किया है, तो एड्रेस बार में लॉक आइकन दबाकर Camera की अनुमति दें, फिर बटन दबाएँ।',
      camGateButton: 'कैमरा चालू करें',
      camStarting: 'कैमरा शुरू हो रहा है…',
      camStatus: 'चेहरे {{f}} · हाथ {{h}}/2',
      camLabel: 'आपके कैमरे का प्रीव्यू',
    },
  },
  analysis: {
    conductFace: 'आपका चेहरा {{n}} बार नहीं दिखा।',
    conductMulti: 'एक से ज़्यादा व्यक्ति {{n}} बार दिखे।',
    conductHands: 'दोनों हाथ {{n}} बार नहीं दिखे।',
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)