export type DistrictDef = { name: string; lat: number; lng: number }

export type CityRegion = { city: string; districts: DistrictDef[] }
