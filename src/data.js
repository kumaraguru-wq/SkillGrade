import locationConfig from '../shared/locations.json';

export const districts = locationConfig.states.flatMap(state => state.districts.map(district => district.name));

export const districtDetails = {
  Chennai: { blocks: ['Tondiarpet', 'Alandur', 'Sholinganallur'], demand: ['retail', 'healthcare', 'digital', 'electrical', 'tailoring'] },
  Coimbatore: { blocks: ['Pollachi North', 'Annur', 'Periyanaickenpalayam'], demand: ['tailoring', 'manufacturing', 'electrical', 'food', 'plumbing'] },
  Madurai: { blocks: ['Madurai East', 'Melur', 'Thirumangalam'], demand: ['healthcare', 'food', 'tailoring', 'retail', 'agriculture'] },
  Tiruchirappalli: { blocks: ['Manikandam', 'Lalgudi', 'Thuraiyur'], demand: ['electrical', 'plumbing', 'retail', 'agriculture', 'digital'] },
  Salem: { blocks: ['Omalur', 'Mecheri', 'Ayothiapattinam'], demand: ['tailoring', 'food', 'manufacturing', 'agriculture', 'retail'] },
  Dharmapuri: { blocks: ['Harur', 'Pennagaram', 'Palacode'], demand: ['agriculture', 'food', 'tailoring', 'electrical', 'self-employment'] },
};

export const courses = [
  { id: 'APP-03', name: 'Self Employed Tailor', ta: 'சுயதொழில் தையல்காரர்', hi: 'स्वरोज़गार दर्ज़ी', level: 3, duration: '380 hrs', skill: ['tailoring', 'stitching', 'sewing', 'clothes'], goals: ['self', 'income', 'job'], districts: ['Coimbatore', 'Madurai', 'Salem', 'Dharmapuri'], distance: 6 },
  { id: 'AMH-02', name: 'Sewing Machine Operator', ta: 'தையல் இயந்திர இயக்குபவர்', hi: 'सिलाई मशीन ऑपरेटर', level: 2, duration: '300 hrs', skill: ['tailoring', 'stitching', 'sewing', 'manufacturing'], goals: ['job', 'income'], districts: ['Chennai', 'Coimbatore', 'Salem'], distance: 9 },
  { id: 'AGR-04', name: 'Organic Grower', ta: 'இயற்கை விவசாயி', hi: 'जैविक उत्पादक', level: 4, duration: '420 hrs', skill: ['farming', 'agriculture', 'gardening', 'crops'], goals: ['self', 'income'], districts: ['Madurai', 'Tiruchirappalli', 'Salem', 'Dharmapuri'], distance: 7 },
  { id: 'AGR-03', name: 'Dairy Farmer', ta: 'பால் பண்ணை விவசாயி', hi: 'डेयरी किसान', level: 3, duration: '360 hrs', skill: ['farming', 'animals', 'dairy', 'agriculture'], goals: ['self', 'income'], districts: ['Coimbatore', 'Madurai', 'Dharmapuri'], distance: 11 },
  { id: 'ELE-03', name: 'Assistant Electrician', ta: 'உதவி மின்சார தொழிலாளர்', hi: 'सहायक इलेक्ट्रीशियन', level: 3, duration: '440 hrs', skill: ['electrical', 'repair', 'wiring', 'electrician'], goals: ['job', 'self', 'income'], districts: ['Chennai', 'Coimbatore', 'Tiruchirappalli', 'Dharmapuri'], distance: 8 },
  { id: 'CON-03', name: 'Plumber General', ta: 'பொது குழாய் தொழிலாளர்', hi: 'सामान्य प्लंबर', level: 3, duration: '360 hrs', skill: ['plumbing', 'repair', 'construction', 'pipes'], goals: ['job', 'self', 'income'], districts: ['Chennai', 'Coimbatore', 'Tiruchirappalli'], distance: 10 },
  { id: 'FIC-03', name: 'Food Processing Assistant', ta: 'உணவு பதப்படுத்தும் உதவியாளர்', hi: 'खाद्य प्रसंस्करण सहायक', level: 3, duration: '320 hrs', skill: ['cooking', 'food', 'baking', 'pickle'], goals: ['job', 'self', 'income'], districts: ['Coimbatore', 'Madurai', 'Salem', 'Dharmapuri'], distance: 5 },
  { id: 'HSS-03', name: 'General Duty Assistant', ta: 'பொது பணி உதவியாளர்', hi: 'जनरल ड्यूटी असिस्टेंट', level: 3, duration: '460 hrs', skill: ['care', 'healthcare', 'nursing', 'helping'], goals: ['job', 'income'], districts: ['Chennai', 'Coimbatore', 'Madurai'], distance: 7 },
  { id: 'IT-03', name: 'Domestic Data Entry Operator', ta: 'தரவு உள்ளீட்டு இயக்குபவர்', hi: 'डेटा एंट्री ऑपरेटर', level: 3, duration: '400 hrs', skill: ['computer', 'typing', 'digital', 'office'], goals: ['job', 'income'], districts: ['Chennai', 'Coimbatore', 'Tiruchirappalli'], distance: 4 },
  { id: 'IT-04', name: 'Junior Software Developer', ta: 'இளநிலை மென்பொருள் உருவாக்குநர்', hi: 'जूनियर सॉफ्टवेयर डेवलपर', level: 4, duration: '510 hrs', skill: ['computer', 'coding', 'programming', 'software', 'website', 'developer'], goals: ['job', 'self', 'income'], districts: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli'], distance: 7 },
  { id: 'RET-03', name: 'Retail Sales Associate', ta: 'சில்லறை விற்பனை உதவியாளர்', hi: 'रिटेल सेल्स एसोसिएट', level: 3, duration: '320 hrs', skill: ['selling', 'retail', 'people', 'shop'], goals: ['job', 'income'], districts: ['Chennai', 'Madurai', 'Tiruchirappalli', 'Salem'], distance: 6 },
];

export const languageOptions = [
  { code: 'en-IN', key: 'en', label: 'English', native: 'English', sample: 'Continue in English' },
  { code: 'hi-IN', key: 'hi', label: 'Hindi', native: 'हिन्दी', sample: 'हिन्दी में जारी रखें' },
  { code: 'ta-IN', key: 'ta', label: 'Tamil', native: 'தமிழ்', sample: 'தமிழில் தொடரவும்' },
];

export const copy = {
  en: {
    eyebrow: 'Tamil Nadu Skill Guidance', welcome: 'Your skills. Your next step.',
    intro: 'A voice-first guide to discover nearby government-recognised courses and submit your interest.',
    choose: 'Choose your language', start: 'Start voice guidance', beneficiary: 'Beneficiary', officer: 'Officer view',
    listening: 'Listening…', tapSpeak: 'Tap to answer', heard: 'I heard', correct: 'Is this correct?', yes: 'Yes, continue', no: 'No, try again', repeat: 'Repeat question', back: 'Back', demo: 'Use demo answer',
    voiceTip: 'Speak naturally in your chosen language', unsupported: 'Voice recognition is unavailable in this browser. Use Chrome or the demo controls.',
    reviewTitle: 'Review your application', reviewSub: 'We will read this back before submission.', edit: 'Edit', submit: 'Submit interest', submitting: 'Submitting…',
    recommendations: 'Recommended for you', recommendationsSub: 'Matched using your skills, goal and local demand.', select: 'Choose this course', selected: 'Selected', match: 'match', near: 'approx. nearby', why: 'Why this matches',
    complete: 'Application submitted', ref: 'Reference number', doneText: 'Your interest has been recorded for the demo. A skill guidance officer can follow up.', newApp: 'Start another application',
    dashboard: 'Guidance dashboard', dashboardSub: 'Transparent matching and application summary for officials.', noData: 'Complete an interview to see the application dashboard.', applicant: 'Applicant profile', extracted: 'Extracted needs', scoring: 'Recommendation scoring', status: 'Ready for review', offline: 'Works with cached course data',
    consentText: 'I agree to share my answers for course guidance and a simulated government application.',
    levels: { school: 'Up to Class 10', higher: 'Class 12', diploma: 'Diploma / ITI', graduate: 'Graduate' },
    goals: { income: 'Increase my income', job: 'Find a job', self: 'Start my own work' },
    genders: { female: 'Woman', male: 'Man', other: 'Other / prefer not to say' },
  },
  hi: {
    eyebrow: 'तमिलनाडु कौशल मार्गदर्शन', welcome: 'आपका हुनर। आपका अगला कदम।',
    intro: 'आस-पास के सरकारी मान्यता प्राप्त कोर्स खोजने और रुचि दर्ज करने के लिए आवाज़ आधारित साथी।',
    choose: 'अपनी भाषा चुनें', start: 'आवाज़ मार्गदर्शन शुरू करें', beneficiary: 'लाभार्थी', officer: 'अधिकारी दृश्य',
    listening: 'सुन रहा हूँ…', tapSpeak: 'जवाब देने के लिए दबाएँ', heard: 'मैंने सुना', correct: 'क्या यह सही है?', yes: 'हाँ, आगे बढ़ें', no: 'नहीं, फिर बोलें', repeat: 'सवाल दोहराएँ', back: 'पीछे', demo: 'डेमो उत्तर',
    voiceTip: 'चुनी हुई भाषा में स्वाभाविक रूप से बोलें', unsupported: 'इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है। Chrome या डेमो नियंत्रण इस्तेमाल करें।',
    reviewTitle: 'अपना आवेदन जाँचें', reviewSub: 'जमा करने से पहले हम इसे पढ़कर सुनाएँगे।', edit: 'बदलें', submit: 'रुचि जमा करें', submitting: 'जमा हो रहा है…',
    recommendations: 'आपके लिए सुझाव', recommendationsSub: 'आपके कौशल, लक्ष्य और स्थानीय माँग के आधार पर।', select: 'यह कोर्स चुनें', selected: 'चुना गया', match: 'मेल', near: 'लगभग पास', why: 'यह क्यों उपयुक्त है',
    complete: 'आवेदन जमा हो गया', ref: 'संदर्भ संख्या', doneText: 'डेमो के लिए आपकी रुचि दर्ज हो गई है। कौशल अधिकारी आपसे संपर्क कर सकते हैं।', newApp: 'नया आवेदन शुरू करें',
    dashboard: 'मार्गदर्शन डैशबोर्ड', dashboardSub: 'अधिकारियों के लिए पारदर्शी मिलान और आवेदन सारांश।', noData: 'डैशबोर्ड देखने के लिए साक्षात्कार पूरा करें।', applicant: 'आवेदक प्रोफ़ाइल', extracted: 'पहचानी गई ज़रूरतें', scoring: 'सुझाव स्कोर', status: 'समीक्षा के लिए तैयार', offline: 'कोर्स डेटा ऑफलाइन उपलब्ध',
    consentText: 'मैं कोर्स मार्गदर्शन और नकली सरकारी आवेदन के लिए अपने उत्तर साझा करने से सहमत हूँ।',
    levels: { school: 'कक्षा 10 तक', higher: 'कक्षा 12', diploma: 'डिप्लोमा / आईटीआई', graduate: 'स्नातक' },
    goals: { income: 'आय बढ़ाना', job: 'नौकरी पाना', self: 'अपना काम शुरू करना' },
    genders: { female: 'महिला', male: 'पुरुष', other: 'अन्य / बताना नहीं चाहते' },
  },
  ta: {
    eyebrow: 'தமிழ்நாடு திறன் வழிகாட்டி', welcome: 'உங்கள் திறமை. உங்கள் அடுத்த படி.',
    intro: 'அருகிலுள்ள அரசு அங்கீகரித்த படிப்புகளைக் கண்டறிந்து விருப்பத்தைப் பதிவு செய்யும் குரல் வழிகாட்டி.',
    choose: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்', start: 'குரல் வழிகாட்டலைத் தொடங்கவும்', beneficiary: 'பயனாளி', officer: 'அதிகாரி பார்வை',
    listening: 'கேட்கிறது…', tapSpeak: 'பதில் சொல்ல தட்டவும்', heard: 'நான் கேட்டது', correct: 'இது சரியா?', yes: 'ஆம், தொடரவும்', no: 'இல்லை, மீண்டும் முயலவும்', repeat: 'கேள்வியை மீண்டும் கேட்க', back: 'பின்னால்', demo: 'மாதிரி பதில்',
    voiceTip: 'தேர்ந்தெடுத்த மொழியில் இயல்பாகப் பேசுங்கள்', unsupported: 'இந்த உலாவியில் குரல் அறிதல் இல்லை. Chrome அல்லது மாதிரி கட்டுப்பாடுகளைப் பயன்படுத்தவும்.',
    reviewTitle: 'உங்கள் விண்ணப்பத்தை சரிபார்க்கவும்', reviewSub: 'சமர்ப்பிக்கும் முன் இதைப் படித்துக் காட்டுவோம்.', edit: 'திருத்து', submit: 'விருப்பத்தை சமர்ப்பிக்கவும்', submitting: 'சமர்ப்பிக்கிறது…',
    recommendations: 'உங்களுக்கான பரிந்துரைகள்', recommendationsSub: 'உங்கள் திறன், இலக்கு மற்றும் உள்ளூர் தேவையின் அடிப்படையில்.', select: 'இந்தப் படிப்பைத் தேர்வு செய்', selected: 'தேர்ந்தெடுக்கப்பட்டது', match: 'பொருத்தம்', near: 'அருகில் சுமார்', why: 'ஏன் இது பொருந்துகிறது',
    complete: 'விண்ணப்பம் சமர்ப்பிக்கப்பட்டது', ref: 'குறிப்பு எண்', doneText: 'மாதிரிக்காக உங்கள் விருப்பம் பதிவு செய்யப்பட்டுள்ளது. திறன் வழிகாட்டி அலுவலர் தொடர்பு கொள்ளலாம்.', newApp: 'புதிய விண்ணப்பம்',
    dashboard: 'வழிகாட்டல் பலகை', dashboardSub: 'அதிகாரிகளுக்கான வெளிப்படையான பொருத்தம் மற்றும் விண்ணப்ப சுருக்கம்.', noData: 'விண்ணப்ப பலகையைப் பார்க்க நேர்காணலை முடிக்கவும்.', applicant: 'விண்ணப்பதாரர் விவரம்', extracted: 'கண்டறிந்த தேவைகள்', scoring: 'பரிந்துரை மதிப்பீடு', status: 'சரிபார்க்க தயார்', offline: 'பாடத்தரவு சேமிக்கப்பட்டுள்ளது',
    consentText: 'பயிற்சி வழிகாட்டல் மற்றும் மாதிரி அரசு விண்ணப்பத்திற்காக என் பதில்களைப் பகிர ஒப்புக்கொள்கிறேன்.',
    levels: { school: '10ஆம் வகுப்பு வரை', higher: '12ஆம் வகுப்பு', diploma: 'டிப்ளமா / ஐடிஐ', graduate: 'பட்டதாரி' },
    goals: { income: 'வருமானத்தை உயர்த்த', job: 'வேலை பெற', self: 'சொந்த தொழில் தொடங்க' },
    genders: { female: 'பெண்', male: 'ஆண்', other: 'மற்றவை / சொல்ல விரும்பவில்லை' },
  },
};

export const questions = {
  en: [
    { id: 'consent', prompt: 'Before we begin, do you agree to share your answers for skill guidance?', type: 'consent', demo: 'yes' },
    { id: 'name', prompt: 'What is your full name?', helper: 'Say your name slowly and clearly', demo: 'Kavitha Selvam' },
    { id: 'age', prompt: 'How old are you?', helper: 'Say your age in years', demo: '28' },
    { id: 'gender', prompt: 'How do you describe your gender?', type: 'gender', demo: 'female' },
    { id: 'phone', prompt: 'What is your ten digit mobile number?', helper: 'Say one digit at a time', demo: '9876543210' },
    { id: 'district', prompt: 'Which district in Tamil Nadu do you live in?', type: 'district', demo: 'Madurai' },
    { id: 'block', prompt: 'What is your block or area?', type: 'block', demo: 'Madurai East' },
    { id: 'village', prompt: 'What is your village or locality?', demo: 'Othakadai' },
    { id: 'education', prompt: 'What is your highest education level?', type: 'education', demo: 'higher' },
    { id: 'skill', prompt: 'What work do you already know or enjoy doing?', helper: 'For example: tailoring, farming, cooking or electrical repair', demo: 'Cooking and making pickles' },
    { id: 'goal', prompt: 'What is your main goal?', type: 'goal', demo: 'self' },
  ],
  hi: [
    { id: 'consent', prompt: 'शुरू करने से पहले, क्या आप कौशल मार्गदर्शन के लिए अपने उत्तर साझा करने को सहमत हैं?', type: 'consent', demo: 'हाँ' },
    { id: 'name', prompt: 'आपका पूरा नाम क्या है?', helper: 'अपना नाम धीरे और साफ़ बोलें', demo: 'कविता सेल्वम' },
    { id: 'age', prompt: 'आपकी उम्र कितनी है?', helper: 'उम्र वर्षों में बताएँ', demo: '28' },
    { id: 'gender', prompt: 'अपना लिंग बताएँ।', type: 'gender', demo: 'female' },
    { id: 'phone', prompt: 'आपका दस अंकों का मोबाइल नंबर क्या है?', helper: 'एक-एक अंक बोलें', demo: '9876543210' },
    { id: 'district', prompt: 'आप तमिलनाडु के किस ज़िले में रहते हैं?', type: 'district', demo: 'Madurai' },
    { id: 'block', prompt: 'आपका ब्लॉक या क्षेत्र कौन सा है?', type: 'block', demo: 'Madurai East' },
    { id: 'village', prompt: 'आपका गाँव या मोहल्ला कौन सा है?', demo: 'ओथाकडाई' },
    { id: 'education', prompt: 'आपकी सबसे ऊँची शिक्षा क्या है?', type: 'education', demo: 'higher' },
    { id: 'skill', prompt: 'आप कौन सा काम जानते हैं या करना पसंद करते हैं?', helper: 'जैसे सिलाई, खेती, खाना बनाना या बिजली मरम्मत', demo: 'खाना बनाना और अचार बनाना' },
    { id: 'goal', prompt: 'आपका मुख्य लक्ष्य क्या है?', type: 'goal', demo: 'self' },
  ],
  ta: [
    { id: 'consent', prompt: 'தொடங்குவதற்கு முன், திறன் வழிகாட்டலுக்காக உங்கள் பதில்களைப் பகிர ஒப்புக்கொள்கிறீர்களா?', type: 'consent', demo: 'ஆம்' },
    { id: 'name', prompt: 'உங்கள் முழுப் பெயர் என்ன?', helper: 'பெயரை மெதுவாகத் தெளிவாகச் சொல்லுங்கள்', demo: 'கவிதா செல்வம்' },
    { id: 'age', prompt: 'உங்கள் வயது என்ன?', helper: 'வயதை ஆண்டுகளில் சொல்லுங்கள்', demo: '28' },
    { id: 'gender', prompt: 'உங்கள் பாலினம் என்ன?', type: 'gender', demo: 'female' },
    { id: 'phone', prompt: 'உங்கள் பத்து இலக்க கைபேசி எண் என்ன?', helper: 'ஒவ்வொரு எண்ணாகச் சொல்லுங்கள்', demo: '9876543210' },
    { id: 'district', prompt: 'தமிழ்நாட்டில் எந்த மாவட்டத்தில் வசிக்கிறீர்கள்?', type: 'district', demo: 'Madurai' },
    { id: 'block', prompt: 'உங்கள் வட்டாரம் அல்லது பகுதி எது?', type: 'block', demo: 'Madurai East' },
    { id: 'village', prompt: 'உங்கள் கிராமம் அல்லது ஊர் எது?', demo: 'ஒத்தக்கடை' },
    { id: 'education', prompt: 'உங்கள் உயர்ந்த கல்வித் தகுதி என்ன?', type: 'education', demo: 'higher' },
    { id: 'skill', prompt: 'உங்களுக்கு ஏற்கனவே தெரிந்த அல்லது விருப்பமான வேலை என்ன?', helper: 'உதாரணம்: தையல், விவசாயம், சமையல் அல்லது மின் பழுது', demo: 'சமையல் மற்றும் ஊறுகாய் தயாரித்தல்' },
    { id: 'goal', prompt: 'உங்கள் முக்கிய இலக்கு என்ன?', type: 'goal', demo: 'self' },
  ],
};
