/**
 * Delivery Configuration & Service Operational Boundaries
 * Central Hub: Mabasa, Balulang, Cagayan de Oro City
 */

export const DISPATCH_HUB = 'Mabasa, Balulang, Cagayan de Oro City';
export const DELIVERY_CITY = 'Cagayan de Oro City';
export const DELIVERY_PROVINCE = 'Misamis Oriental';
export const DELIVERY_POSTAL_CODE = '9000';

/**
 * Official 80 Barangays of Cagayan de Oro City
 */
export const CDO_BARANGAYS = [
  'Agusan',
  'Baikingon',
  'Balubal',
  'Balulang',
  'Barangay 1',
  'Barangay 2',
  'Barangay 3',
  'Barangay 4',
  'Barangay 5',
  'Barangay 6',
  'Barangay 7',
  'Barangay 8',
  'Barangay 9',
  'Barangay 10',
  'Barangay 11',
  'Barangay 12',
  'Barangay 13',
  'Barangay 14',
  'Barangay 15',
  'Barangay 16',
  'Barangay 17',
  'Barangay 18',
  'Barangay 19',
  'Barangay 20',
  'Barangay 21',
  'Barangay 22',
  'Barangay 23',
  'Barangay 24',
  'Barangay 25',
  'Barangay 26',
  'Barangay 27',
  'Barangay 28',
  'Barangay 29',
  'Barangay 30',
  'Barangay 31',
  'Barangay 32',
  'Barangay 33',
  'Barangay 34',
  'Barangay 35',
  'Barangay 36',
  'Barangay 37',
  'Barangay 38',
  'Barangay 39',
  'Barangay 40',
  'Bayabas',
  'Bayanga',
  'Besigan',
  'Bonbon',
  'Bugo',
  'Bulua',
  'Camaman-an',
  'Canitoan',
  'Carmen',
  'Consolacion',
  'Cugman',
  'Dansolihon',
  'F.S. Catanico',
  'Gusa',
  'Indahag',
  'Iponan',
  'Kauswagan',
  'Lapasan',
  'Lumbia',
  'Macabalan',
  'Macasandig',
  'Mambuaya',
  'Nazareth',
  'Pagatpat',
  'Patag',
  'Pigsag-an',
  'Puerto',
  'Puntod',
  'San Simon',
  'Tablon',
  'Taglimao',
  'Tagpangi',
  'Tignapoloan',
  'Tuburan',
  'Tumpagon',
];

/**
 * Checks if an address string or city is within Cagayan de Oro City.
 */
export function isWithinCDO(addressOrCity) {
  if (!addressOrCity || typeof addressOrCity !== 'string') return false;
  const lower = addressOrCity.toLowerCase();
  return (
    lower.includes('cagayan de oro') ||
    lower.includes('cdo') ||
    CDO_BARANGAYS.some((b) => lower.includes(b.toLowerCase()))
  );
}

/**
 * Checks if a barangay name is an official Cagayan de Oro City barangay.
 */
export function isValidCDOBarangay(barangayName) {
  if (!barangayName || typeof barangayName !== 'string') return false;
  const clean = barangayName.trim().toLowerCase();
  return CDO_BARANGAYS.some((b) => b.toLowerCase() === clean);
}

export default {
  DISPATCH_HUB,
  DELIVERY_CITY,
  DELIVERY_PROVINCE,
  DELIVERY_POSTAL_CODE,
  CDO_BARANGAYS,
  isWithinCDO,
  isValidCDOBarangay,
};
