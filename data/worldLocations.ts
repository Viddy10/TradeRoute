export interface WorldData {
  [key: string]: {
    [key: string]: string[];
  };
}

export const worldLocations: WorldData = {
  "Asia": {
    "South-Eastern Asia": ["Indonesia", "Malaysia", "Singapore", "Thailand", "Vietnam", "Philippines", "Myanmar", "Cambodia", "Laos", "Brunei", "Timor-Leste"],
    "Eastern Asia": ["China", "Japan", "South Korea", "Taiwan", "Mongolia", "North Korea", "Hong Kong", "Macau"],
    "Southern Asia": ["India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Maldives", "Bhutan", "Afghanistan"],
    "Western Asia": ["United Arab Emirates", "Saudi Arabia", "Turkey", "Israel", "Qatar", "Kuwait", "Iraq", "Iran", "Oman", "Jordan", "Lebanon", "Bahrain", "Yemen", "Syria", "Cyprus", "Georgia", "Armenia", "Azerbaijan"],
    "Central Asia": ["Kazakhstan", "Uzbekistan", "Turkmenistan", "Kyrgyzstan", "Tajikistan"]
  },
  "Europe": {
    "Western Europe": ["Germany", "France", "Netherlands", "Belgium", "Austria", "Switzerland", "Luxembourg", "Liechtenstein", "Monaco"],
    "Northern Europe": ["United Kingdom", "Sweden", "Denmark", "Finland", "Norway", "Ireland", "Lithuania", "Latvia", "Estonia", "Iceland"],
    "Southern Europe": ["Italy", "Spain", "Greece", "Portugal", "Croatia", "Serbia", "Slovenia", "Malta", "Albania", "Bosnia and Herzegovina", "Montenegro", "North Macedonia"],
    "Eastern Europe": ["Russia", "Poland", "Ukraine", "Romania", "Czech Republic", "Hungary", "Bulgaria", "Slovakia", "Belarus", "Moldova"]
  },
  "Americas": {
    "North America": ["United States", "Canada", "Mexico"],
    "Central America": ["Panama", "Costa Rica", "Guatemala", "Honduras", "El Salvador", "Nicaragua", "Belize"],
    "Caribbean": ["Cuba", "Dominican Republic", "Haiti", "Jamaica", "Trinidad and Tobago", "Bahamas", "Barbados", "Saint Lucia", "Puerto Rico"],
    "South America": ["Brazil", "Argentina", "Chile", "Colombia", "Peru", "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Guyana", "Suriname"]
  },
  "Africa": {
    "Northern Africa": ["Egypt", "Morocco", "Algeria", "Tunisia", "Libya", "Sudan"],
    "Western Africa": ["Nigeria", "Ghana", "Ivory Coast", "Senegal", "Mali", "Burkina Faso", "Benin", "Niger", "Togo", "Liberia", "Sierra Leone", "Guinea"],
    "Eastern Africa": ["Kenya", "Ethiopia", "Tanzania", "Uganda", "Rwanda", "Madagascar", "Mozambique", "Zimbabwe", "Mauritius", "Somalia", "Seychelles"],
    "Southern Africa": ["South Africa", "Namibia", "Botswana", "Lesotho", "Eswatini"],
    "Middle Africa": ["Angola", "Cameroon", "DR Congo", "Congo", "Gabon", "Chad", "Equatorial Guinea"]
  },
  "Oceania": {
    "Australia and New Zealand": ["Australia", "New Zealand"],
    "Melanesia": ["Papua New Guinea", "Fiji", "Solomon Islands", "Vanuatu", "New Caledonia"],
    "Micronesia": ["Guam", "Kiribati", "Marshall Islands", "Micronesia", "Nauru", "Palau"],
    "Polynesia": ["Samoa", "Tonga", "Tuvalu", "American Samoa", "French Polynesia", "Cook Islands"]
  }
};