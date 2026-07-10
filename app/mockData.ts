// Lightweight mock data used as a temporary fallback for the customer UI
export const MOCK_VENDORS = [
  {
    id: 'mock-1',
    name: 'Toledo Snacks House',
    category: 'Snacks',
    rating: '4.6',
    distance: '1.0km',
    image: require('../assets/images/cstbg.jpg'),
    coverImage: require('../assets/images/cstbg.jpg'),
    description: 'Delicious local snacks and treats.',
    location: 'Toledo City, Cebu',
    meetupPoint: 'Market Square',
    meetupDetails: 'Look for the blue umbrella',
    mobile: '09171234567',
  },
  {
    id: 'mock-2',
    name: 'Sweet Corner',
    category: 'Sweets',
    rating: '4.8',
    distance: '2.3km',
    image: require('../assets/images/cstbg.jpg'),
    coverImage: require('../assets/images/cstbg.jpg'),
    description: 'Cakes, pastries and more.',
    location: 'Toledo City, Cebu',
    meetupPoint: 'Town Center',
    meetupDetails: 'Near the fountain',
    mobile: '09179876543',
  },
  {
    id: 'mock-3',
    name: 'Meals on Wheels',
    category: 'Meals',
    rating: '4.4',
    distance: '3.1km',
    image: require('../assets/images/cstbg.jpg'),
    coverImage: require('../assets/images/cstbg.jpg'),
    description: 'Hearty meals for the hungry.',
    location: 'Toledo City, Cebu',
    meetupPoint: 'Bus Stop',
    meetupDetails: 'Opposite the bakery',
    mobile: '09170001111',
  }
];

export const MOCK_PRODUCTS = [
  { id: 'p-mock-1', name: 'Mock Pancit', price: 120, img: require('../assets/images/cstbg.jpg'), vendor_id: 'mock-1', vendorName: 'Toledo Snacks House' },
  { id: 'p-mock-2', name: 'Mock Cake Slice', price: 80, img: require('../assets/images/cstbg.jpg'), vendor_id: 'mock-2', vendorName: 'Sweet Corner' },
  { id: 'p-mock-3', name: 'Mock Rice Meal', price: 150, img: require('../assets/images/cstbg.jpg'), vendor_id: 'mock-3', vendorName: 'Meals on Wheels' }
];

export default { MOCK_VENDORS, MOCK_PRODUCTS };
