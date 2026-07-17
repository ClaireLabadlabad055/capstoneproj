export function getRedirectRouteForRole(role?: string | null) {
  switch (role) {
    case 'admin':
      return '/admin/home';
    case 'merchant':
      return '/vendor/home';
    case 'customer':
    default:
      return '/customer/home';
  }
}
