import type { LifestyleScoreResult } from "../lib/lifestyleScore";

export interface Listing {
  id: string;
  title: string;
  price: string;
  priceValue: number;
  beds: number;
  baths: number;
  sqft: number;
  location: string;
  city: string;
  area: string;
  // Street / unit line as typed on the form. streetAr/streetLatin are the
  // bilingual canonical forms; UI picks one by language, falling back to street.
  street?: string | null;
  streetAr?: string | null;
  streetLatin?: string | null;
  description: string;
  badge?: string;
  // Finishing level chosen on the listing form. Canonical values:
  // fully_finished | semi_finished | core_shell | furnished | unfurnished.
  finishing?: string | null;
  listingType: "buy" | "rent";
  listingKind?: "residential" | "commercial";
  propertyType: "apartment" | "villa" | "studio" | "duplex" | "penthouse";
  images: string[];
  // Real GPS coordinates for Google Maps pins
  lat: number;
  lng: number;
  // Lifestyle score (calculated once when listing is created)
  lifestyleScore?: LifestyleScoreResult;
  // Amenity keys — see src/data/amenities.ts
  amenities: string[];
  // Payment & completion (Cash=0, Installments=1, Both=2 / Ready=0, OffPlan=1)
  paymentMethod: 0 | 1 | 2;
  completionStatus: 0 | 1 | null;
  // Human-friendly sequential listing reference number
  referenceNumber: number;
  // The real owner of the listing (name, agency, contact). Undefined for the
  // static demo listings below and for any listing the backend didn't enrich.
  lister?: {
    id: string;
    name: string;
    agencyName: string | null;
    phoneNumber: string | null;
    listerType: 0 | 1 | null; // 0=Individual, 1=Agent
    isVerified: boolean;
  };
}

function img(id: string, w = 1200) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
}

export const listings: Listing[] = [
  {
    id: "1",
    title: "Modern Apartment in New Cairo",
    price: "EGP 3,500,000", priceValue: 3500000,
    beds: 3, baths: 2, sqft: 160,
    location: "New Cairo, Cairo", city: "Cairo", area: "New Cairo",
    description: "Bright apartment with a spacious balcony overlooking the compound greenery. Features modern finishes, open-plan kitchen, and ample natural light throughout the day.",
    badge: "New", listingType: "buy", propertyType: "apartment",
    lat: 30.0131, lng: 31.4356,
    images: [img("photo-1502672260266-1c1ef2d93688"), img("photo-1560448204-e02f11c3d0e2"), img("photo-1600585154340-be6161a56a0c")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "2",
    title: "Luxury Villa in Sheikh Zayed",
    price: "EGP 8,500,000", priceValue: 8500000,
    beds: 5, baths: 4, sqft: 420,
    location: "Sheikh Zayed, Giza", city: "Giza", area: "Sheikh Zayed",
    description: "Stunning standalone villa with a private garden and heated swimming pool. Finished to the highest standard with imported marble, smart home system, and a covered garage for two cars.",
    badge: "Hot Home", listingType: "buy", propertyType: "villa",
    lat: 30.0093, lng: 30.9988,
    images: [img("photo-1600585152915-d208bec867a1"), img("photo-1568605114967-8130f3a36994"), img("photo-1572120360610-d971b9d7767c")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "3",
    title: "Studio in Maadi",
    price: "EGP 18,000 / month", priceValue: 18000,
    beds: 1, baths: 1, sqft: 55,
    location: "Maadi, Cairo", city: "Cairo", area: "Maadi",
    description: "Fully furnished studio steps away from Maadi's best cafes and restaurants. Includes high-speed internet, air conditioning, and a fully equipped kitchen.",
    listingType: "rent", propertyType: "studio",
    lat: 29.9602, lng: 31.2569,
    images: [img("photo-1493809842364-78817add7ffb"), img("photo-1507089947368-19c1da9775ae")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "4",
    title: "Duplex in Rehab",
    price: "EGP 6,000,000", priceValue: 6000000,
    beds: 4, baths: 3, sqft: 260,
    location: "Rehab, Cairo", city: "Cairo", area: "Rehab",
    description: "Spacious duplex inside a gated compound with 24/7 security. Enjoy a private rooftop terrace, large living areas, and direct access to compound amenities.",
    listingType: "buy", propertyType: "duplex",
    lat: 30.0606, lng: 31.4953,
    images: [img("photo-1505693416388-ac5ce068fe85"), img("photo-1484154218962-a197022b5858")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "5",
    title: "Apartment in Zamalek",
    price: "EGP 4,200,000", priceValue: 4200000,
    beds: 2, baths: 2, sqft: 120,
    location: "Zamalek, Cairo", city: "Cairo", area: "Zamalek",
    description: "Charming apartment in the heart of Zamalek — Cairo's most prestigious island address. Walking distance to embassies, galleries, and the Nile Corniche.",
    listingType: "buy", propertyType: "apartment",
    lat: 30.0623, lng: 31.2186,
    images: [img("photo-1507089947368-19c1da9775ae"), img("photo-1499951360447-b19be8fe80f5")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "6",
    title: "Apartment in Nasr City",
    price: "EGP 2,800,000", priceValue: 2800000,
    beds: 3, baths: 2, sqft: 150,
    location: "Nasr City, Cairo", city: "Cairo", area: "Nasr City",
    description: "Well-maintained family apartment in a quiet building close to schools, supermarkets, and public transport. Semi-finished with opportunity to personalise.",
    listingType: "buy", propertyType: "apartment",
    lat: 30.0563, lng: 31.3383,
    images: [img("photo-1560448204-e02f11c3d0e2"), img("photo-1502672260266-1c1ef2d93688")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "7",
    title: "Ultra Luxury Villa in New Cairo",
    price: "EGP 12,000,000", priceValue: 12000000,
    beds: 6, baths: 5, sqft: 550,
    location: "New Cairo", city: "Cairo", area: "New Cairo",
    description: "An architectural masterpiece spanning 550 m² across two floors. Features a cinema room, gym, landscaped gardens, and a panoramic rooftop terrace.",
    badge: "Exclusive", listingType: "buy", propertyType: "villa",
    lat: 30.0200, lng: 31.4600,
    images: [img("photo-1600585152915-d208bec867a1"), img("photo-1568605114967-8130f3a36994"), img("photo-1572120360610-d971b9d7767c")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "8",
    title: "Studio in Downtown Cairo",
    price: "EGP 10,000 / month", priceValue: 10000,
    beds: 1, baths: 1, sqft: 50,
    location: "Downtown, Cairo", city: "Cairo", area: "Downtown",
    description: "Affordable and well-located studio in the heart of Downtown. Ideal for young professionals. Utilities included in the monthly rent.",
    listingType: "rent", propertyType: "studio",
    lat: 30.0444, lng: 31.2357,
    images: [img("photo-1493809842364-78817add7ffb"), img("photo-1507089947368-19c1da9775ae")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "9",
    title: "Apartment in Dokki",
    price: "EGP 3,200,000", priceValue: 3200000,
    beds: 3, baths: 2, sqft: 140,
    location: "Dokki, Giza", city: "Giza", area: "Dokki",
    description: "Classic apartment in a central Giza location with easy access to Tahrir Square and Ring Road. Recently renovated bathrooms and new flooring.",
    listingType: "buy", propertyType: "apartment",
    lat: 30.0408, lng: 31.2098,
    images: [img("photo-1560448204-e02f11c3d0e2"), img("photo-1499951360447-b19be8fe80f5")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "10",
    title: "Villa in 6th October",
    price: "EGP 7,800,000", priceValue: 7800000,
    beds: 5, baths: 4, sqft: 380,
    location: "6th October, Giza", city: "Giza", area: "October",
    description: "Modern villa in a secure compound in 6th October City. Features an open-plan ground floor, private garden, and a rooftop for entertaining.",
    listingType: "buy", propertyType: "villa",
    lat: 29.9344, lng: 30.9176,
    images: [img("photo-1568605114967-8130f3a36994"), img("photo-1600585152915-d208bec867a1")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "11",
    title: "Apartment in Heliopolis",
    price: "EGP 3,900,000", priceValue: 3900000,
    beds: 3, baths: 2, sqft: 170,
    location: "Heliopolis, Cairo", city: "Cairo", area: "Heliopolis",
    description: "Classic Heliopolis apartment with high ceilings and original parquet flooring. Walking distance to City Stars mall and Baron Palace.",
    listingType: "buy", propertyType: "apartment",
    lat: 30.0888, lng: 31.3219,
    images: [img("photo-1560448204-e02f11c3d0e2"), img("photo-1502672260266-1c1ef2d93688")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "12",
    title: "Penthouse in Zamalek",
    price: "EGP 11,000,000", priceValue: 11000000,
    beds: 4, baths: 4, sqft: 320,
    location: "Zamalek, Cairo", city: "Cairo", area: "Zamalek",
    description: "Breathtaking Nile-view penthouse atop one of Zamalek's most prestigious buildings. Features a wraparound terrace, private jacuzzi, and floor-to-ceiling windows.",
    badge: "Premium", listingType: "buy", propertyType: "penthouse",
    lat: 30.0650, lng: 31.2220,
    images: [img("photo-1502672260266-1c1ef2d93688"), img("photo-1507089947368-19c1da9775ae"), img("photo-1499951360447-b19be8fe80f5")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "13",
    title: "Apartment in Shorouk",
    price: "EGP 2,500,000", priceValue: 2500000,
    beds: 3, baths: 2, sqft: 140,
    location: "Shorouk City, Cairo", city: "Cairo", area: "Shorouk",
    description: "Affordable family home in a tranquil residential neighbourhood. Close to Shorouk International School and major arterial roads.",
    listingType: "buy", propertyType: "apartment",
    lat: 30.1217, lng: 31.6087,
    images: [img("photo-1560448204-e02f11c3d0e2"), img("photo-1484154218962-a197022b5858")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "14",
    title: "Studio in Sheikh Zayed",
    price: "EGP 12,000 / month", priceValue: 12000,
    beds: 1, baths: 1, sqft: 60,
    location: "Sheikh Zayed, Giza", city: "Giza", area: "Zayed",
    description: "Modern furnished studio in a new building in Sheikh Zayed. Ideal for executives or couples. Includes covered parking and a shared rooftop.",
    listingType: "rent", propertyType: "studio",
    lat: 30.0150, lng: 31.0100,
    images: [img("photo-1493809842364-78817add7ffb"), img("photo-1507089947368-19c1da9775ae")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "15",
    title: "Villa in Fifth Settlement",
    price: "EGP 10,500,000", priceValue: 10500000,
    beds: 6, baths: 5, sqft: 500,
    location: "Fifth Settlement, New Cairo", city: "Cairo", area: "Fifth Settlement",
    description: "Luxury standalone villa in Fifth Settlement's most sought-after compound. Finished with premium materials and boasting a private pool and landscaped garden.",
    badge: "Hot Home", listingType: "buy", propertyType: "villa",
    lat: 30.0050, lng: 31.4700,
    images: [img("photo-1600585152915-d208bec867a1"), img("photo-1568605114967-8130f3a36994"), img("photo-1572120360610-d971b9d7767c")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "16",
    title: "Apartment in Mohandessin",
    price: "EGP 3,600,000", priceValue: 3600000,
    beds: 3, baths: 2, sqft: 150,
    location: "Mohandessin, Giza", city: "Giza", area: "Mohandessin",
    description: "Well-located apartment in Mohandessin — minutes from restaurants, banks, and the metro. Solid building with concierge service.",
    listingType: "buy", propertyType: "apartment",
    lat: 30.0574, lng: 31.2001,
    images: [img("photo-1560448204-e02f11c3d0e2"), img("photo-1499951360447-b19be8fe80f5")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "17",
    title: "Duplex in Sheikh Zayed",
    price: "EGP 6,800,000", priceValue: 6800000,
    beds: 4, baths: 3, sqft: 270,
    location: "Sheikh Zayed, Giza", city: "Giza", area: "Sheikh Zayed",
    description: "Contemporary duplex spread across two floors in a gated compound. Features a private garden entrance and a large family living room with double-height ceilings.",
    listingType: "buy", propertyType: "duplex",
    lat: 30.0050, lng: 30.9900,
    images: [img("photo-1505693416388-ac5ce068fe85"), img("photo-1484154218962-a197022b5858")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "18",
    title: "Apartment in New Mansoura",
    price: "EGP 2,200,000", priceValue: 2200000,
    beds: 3, baths: 2, sqft: 130,
    location: "New Mansoura, Dakahlia", city: "Mansoura", area: "New Mansoura",
    description: "Brand new apartment in New Mansoura's planned coastal city. Excellent investment opportunity with sea-view potential and modern infrastructure.",
    listingType: "buy", propertyType: "apartment",
    lat: 31.0364, lng: 31.3807,
    images: [img("photo-1560448204-e02f11c3d0e2"), img("photo-1502672260266-1c1ef2d93688")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "19",
    title: "Cozy Studio in Maadi",
    price: "EGP 15,000 / month", priceValue: 15000,
    beds: 1, baths: 1, sqft: 45,
    location: "Maadi, Cairo", city: "Cairo", area: "Maadi",
    description: "Cozy and light-filled studio in a quiet Maadi street. Furnished with quality pieces, fast Wi-Fi, and a fully equipped kitchenette.",
    listingType: "rent", propertyType: "studio",
    lat: 29.9580, lng: 31.2530,
    images: [img("photo-1493809842364-78817add7ffb"), img("photo-1507089947368-19c1da9775ae")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
  {
    id: "20",
    title: "Mega Villa in New Administrative Capital",
    price: "EGP 14,000,000", priceValue: 14000000,
    beds: 6, baths: 5, sqft: 600,
    location: "New Administrative Capital", city: "New Capital", area: "New Capital",
    description: "High-end villa in Egypt's brand-new capital city. Smart home automation, private pool, gym, and a 600 m² layout across three floors.",
    badge: "New", listingType: "buy", propertyType: "villa",
    lat: 30.0131, lng: 31.7500,
    images: [img("photo-1600585152915-d208bec867a1"), img("photo-1568605114967-8130f3a36994"), img("photo-1572120360610-d971b9d7767c")],
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
  },
];