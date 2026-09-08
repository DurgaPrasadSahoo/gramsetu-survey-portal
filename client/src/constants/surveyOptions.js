export const STATES = [
  'Odisha', 'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan',
  'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
];

// All 30 districts of Odisha. Khordha (which contains Bhubaneswar) is the default
// since this survey drive is focused on Bhubaneswar households.
export const ODISHA_DISTRICTS = [
  'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh',
  'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi',
  'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj',
  'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh',
];

// Common Bhubaneswar localities / wards, offered as suggestions on top of free entry.
export const BHUBANESWAR_LOCALITIES = [
  'Old Town', 'Saheed Nagar', 'Nayapalli', 'Patia', 'Chandrasekharpur', 'Jaydev Vihar',
  'Khandagiri', 'Bapuji Nagar', 'Kharavela Nagar', 'Rasulgarh', 'Laxmisagar', 'Sundarpada',
  'Baramunda', 'Damana', 'Tomando', 'Pokhariput', 'Ghatikia', 'Jagamara',
];

// Odisha officially uses "SEBC" (Socially and Educationally Backward Class) for the
// category the rest of India commonly calls "OBC".
export const CATEGORIES = [
  { value: 'General', label: 'General' },
  { value: 'SEBC', label: 'SEBC (Socially & Educationally Backward Class)' },
  { value: 'SC', label: 'SC (Scheduled Caste)' },
  { value: 'ST', label: 'ST (Scheduled Tribe)' },
  { value: 'EWS', label: 'EWS (Economically Weaker Section)' },
];

export const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Sarna / Tribal Faith', 'Other'];

// Odisha's Public Distribution System issues these ration card categories.
export const RATION_CARD_TYPES = [
  { value: 'AAY', label: 'AAY (Antyodaya Anna Yojana)' },
  { value: 'PHH', label: 'PHH (Priority Household - NFSA)' },
  { value: 'SFSS', label: 'SFSS (State Food Security Scheme)' },
  { value: 'APL', label: 'APL / Non-Priority (No Subsidy)' },
  { value: 'None', label: 'No Ration Card' },
];

export const HOUSE_TYPES = ['Pucca', 'Semi-Pucca', 'Kutcha'];

export const HOUSE_OWNERSHIP = ['Owned', 'Rented', 'Provided by Employer', 'Other'];

export const OCCUPATIONS = [
  'Agriculture / Farming', 'Daily Wage Labour', 'Government Service', 'Private Service',
  'Self-Employed / Business', 'Handloom / Handicraft Artisan (Weaving, Pattachitra, etc.)',
  'Fishing / Fisherfolk', 'Skilled Trade (Carpenter, Mason, etc.)', 'Unemployed', 'Retired', 'Other',
];

export const ASSET_FIELDS = [
  { key: 'has_two_wheeler', label: 'Two-Wheeler' },
  { key: 'has_four_wheeler', label: 'Four-Wheeler / Car' },
  { key: 'has_fridge', label: 'Refrigerator' },
  { key: 'has_tv', label: 'Television' },
  { key: 'has_ac', label: 'Air Conditioner' },
  { key: 'has_gas_connection', label: 'LPG Gas Connection' },
  { key: 'has_washing_machine', label: 'Washing Machine' },
  { key: 'has_computer', label: 'Computer / Laptop' },
  { key: 'has_smartphone', label: 'Smartphone' },
  { key: 'has_water_pump', label: 'Water Pump / Motor' },
  { key: 'has_bank_account', label: 'Bank Account' },
];

// Central (Government of India) schemes relevant to a household survey.
export const CENTRAL_SCHEMES = [
  { key: 'PMAY', label: 'PM Awas Yojana (PMAY)', description: 'Financial assistance for pucca housing, rural and urban.' },
  { key: 'PM-KISAN', label: 'PM Kisan Samman Nidhi', description: '₹6,000/year income support to landholding farmer families.' },
  { key: 'AB-PMJAY', label: 'Ayushman Bharat (PM-JAY)', description: 'Health cover up to ₹5 lakh/family/year for hospitalisation.' },
  { key: 'MGNREGA', label: 'MGNREGA', description: '100 days of guaranteed wage employment per rural household per year.' },
  { key: 'PMUY', label: 'PM Ujjwala Yojana', description: 'Free LPG gas connections to women from BPL households.' },
  { key: 'PMJDY', label: 'PM Jan Dhan Yojana', description: 'Zero-balance bank accounts for financial inclusion.' },
  { key: 'APY', label: 'Atal Pension Yojana', description: 'Guaranteed pension scheme for the unorganised sector.' },
  { key: 'PMJJBY-PMSBY', label: 'PM Jeevan Jyoti / Suraksha Bima Yojana', description: 'Low-premium life and accident insurance cover.' },
  { key: 'PMFBY', label: 'PM Fasal Bima Yojana', description: 'Crop insurance against yield loss for farmers.' },
  { key: 'NSAP', label: 'National Social Assistance Programme', description: 'Old age, widow and disability pension support.' },
  { key: 'SBM', label: 'Swachh Bharat Mission', description: 'Assistance for household toilet construction and sanitation.' },
];

// Government of Odisha state schemes.
export const ODISHA_SCHEMES = [
  { key: 'KALIA', label: 'KALIA Yojana', description: 'Financial assistance to cultivators and landless agricultural households.' },
  { key: 'BSKY', label: 'Biju Swasthya Kalyan Yojana (BSKY)', description: 'Cashless health cover up to ₹5-10 lakh/family/year at empanelled hospitals.' },
  { key: 'MBPY', label: 'Madhu Babu Pension Yojana (MBPY)', description: 'Monthly pension for elderly, widows and persons with disabilities.' },
  { key: 'MISSION_SHAKTI', label: 'Mission Shakti', description: 'Support for women’s self-help groups (SHGs) and livelihoods.' },
  { key: 'BIJU_PUCCA_GHAR', label: 'Biju Pucca Ghar Yojana', description: 'State rural housing scheme for pucca houses.' },
  { key: 'AMA_GAON_AMA_BIKASH', label: 'Ama Gaon Ama Bikash', description: 'Village-level infrastructure development scheme.' },
  { key: 'BIJU_GRAM_JYOTI', label: 'Biju Gram Jyoti Yojana', description: 'Rural household electrification scheme.' },
  { key: 'MILLET_MISSION', label: 'Odisha Millet Mission', description: 'Support for millet cultivation, processing and consumption.' },
  { key: 'GOPABANDHU_GRAMIN', label: 'Gopabandhu Gramin Yojana', description: 'Rural connectivity and basic infrastructure scheme.' },
];
