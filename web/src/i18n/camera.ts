import i18n from 'i18next'
import './index' // make sure i18n is initialised before adding texts

const en = {
  exam: {
    cam: {
      title: 'Camera and microphone check',
      intro:
        'This exam needs your camera and microphone. Your video is checked on your own computer and is never recorded or uploaded. Only warnings are sent to the server.',
      start: 'Start check',
      again: 'Check again',
      loading: 'Starting the camera checker…',
      passed: 'All checks passed. You can start the exam.',
      needAll: 'Complete the camera and microphone check to start the exam.',
      stepCamera: 'Camera is working',
      stepFace: 'Only your face is visible',
      stepVoice: 'Microphone hears your voice',
      stepHands: 'Both hands are visible',
      done: 'Done',
      waiting: 'Waiting',
      hintFace: 'Sit in front of the camera with your face clearly visible and good light. Nobody else should be in the frame.',
      hintVoice: 'Say aloud in a normal voice: "My name is …"',
      hintHands: 'Raise both hands in front of the camera with your fingers open.',
      level: 'Voice level',
      errDenied:
        'Camera or microphone access is blocked. Click the lock icon in the address bar, allow Camera and Microphone, then press Start check again.',
      errNotFound: 'No camera or microphone was found. Connect one and try again.',
      errInsecure: 'The camera needs a secure page (https, or localhost on your own computer).',
      errOther: 'Could not start the camera or microphone. Close other apps that use it and try again.',
      errChecker: 'The camera checker could not load. Reload the page and try again.',
    },
  },
}

const hi = {
  exam: {
    cam: {
      title: 'कैमरा और माइक्रोफ़ोन की जाँच',
      intro:
        'इस परीक्षा के लिए आपका कैमरा और माइक्रोफ़ोन चाहिए। आपका वीडियो आपके अपने कंप्यूटर पर ही जाँचा जाता है, कभी रिकॉर्ड या अपलोड नहीं होता। सर्वर को सिर्फ़ चेतावनियाँ भेजी जाती हैं।',
      start: 'जाँच शुरू करें',
      again: 'फिर से जाँचें',
      loading: 'कैमरा चेकर शुरू हो रहा है…',
      passed: 'सभी जाँचें पूरी हुईं। अब आप परीक्षा शुरू कर सकते हैं।',
      needAll: 'परीक्षा शुरू करने के लिए कैमरा और माइक्रोफ़ोन की जाँच पूरी करें।',
      stepCamera: 'कैमरा चल रहा है',
      stepFace: 'सिर्फ़ आपका चेहरा दिख रहा है',
      stepVoice: 'माइक्रोफ़ोन आपकी आवाज़ सुन रहा है',
      stepHands: 'दोनों हाथ दिख रहे हैं',
      done: 'पूरा',
      waiting: 'इंतज़ार',
      hintFace: 'कैमरे के सामने बैठें, चेहरा साफ़ दिखे और रोशनी अच्छी हो। फ़्रेम में कोई और नहीं होना चाहिए।',
      hintVoice: 'सामान्य आवाज़ में बोलें: "मेरा नाम … है"',
      hintHands: 'दोनों हाथ उँगलियाँ खोलकर कैमरे के सामने उठाएँ।',
      level: 'आवाज़ का स्तर',
      errDenied:
        'कैमरा या माइक्रोफ़ोन की अनुमति बंद है। एड्रेस बार में लॉक आइकन दबाकर Camera और Microphone की अनुमति दें, फिर "जाँच शुरू करें" दबाएँ।',
      errNotFound: 'कोई कैमरा या माइक्रोफ़ोन नहीं मिला। कोई जोड़कर फिर कोशिश करें।',
      errInsecure: 'कैमरे के लिए सुरक्षित पेज चाहिए (https, या अपने कंप्यूटर पर localhost)।',
      errOther: 'कैमरा या माइक्रोफ़ोन शुरू नहीं हो पाया। इन्हें इस्तेमाल करने वाले दूसरे ऐप बंद करके फिर कोशिश करें।',
      errChecker: 'कैमरा चेकर लोड नहीं हो पाया। पेज रीलोड करके फिर कोशिश करें।',
    },
  },
}

i18n.addResourceBundle('en', 'translation', en, true, true)
i18n.addResourceBundle('hi', 'translation', hi, true, true)