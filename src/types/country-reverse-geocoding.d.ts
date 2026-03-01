declare module 'country-reverse-geocoding' {
  interface CountryResult {
    code: string
    name: string
  }
  export function country_reverse_geocoding(): {
    get_country(lat: number, lng: number): CountryResult | null
  }
}
