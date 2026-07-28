// Service zones — mirrors the `service_zones` and `service_zone_zips` D1 tables.
// Production zone checks geocode the exact address and test it against zone
// polygons plus mileage rules. This module provides the zone data and a
// ZIP-based pre-check for the demo; final eligibility is always confirmed
// server-side in production.

export interface ServiceZone {
  id: string;
  name: string;
  fee: number;
  description: string;
  active: boolean;
}

export const zones: ServiceZone[] = [
  {
    id: 'zone-core',
    name: 'Core Zone',
    fee: 0,
    description: 'Midland, Auburn, Freeland, and selected nearby communities. Standard delivery included.',
    active: true,
  },
  {
    id: 'zone-2',
    name: 'Zone 2',
    fee: 25,
    description: 'Saginaw, Bay City, Sanford, Coleman, and other moderate-distance routes. Zone fee applies.',
    active: true,
  },
  {
    id: 'zone-3',
    name: 'Zone 3',
    fee: 49,
    description: 'Outer Great Lakes Bay Region, custom routes, and nonstandard two-address moves. Custom review may apply.',
    active: true,
  },
];

export interface CityInfo {
  name: string;
  slug: string;
  zoneId: string;
  zips: string[];
  blurb: string;
  localTips: string[];
}

export const cities: CityInfo[] = [
  {
    name: 'Midland',
    slug: 'midland',
    zoneId: 'zone-core',
    zips: ['48640', '48641', '48642'],
    blurb:
      'Our home base. Tote delivery and pickup in Midland runs on our most frequent route schedule, from downtown condos near the Tridge to family homes out by Midland City Forest.',
    localTips: [
      'Popular for Dow corporate relocations and apartment moves along Saginaw Road.',
      'Two-address service covers moves between Midland and any other zone we serve.',
      'Remodeling rentals are common in established neighborhoods where flooring and kitchen projects need rooms cleared fast.',
    ],
  },
  {
    name: 'Saginaw',
    slug: 'saginaw',
    zoneId: 'zone-2',
    zips: ['48601', '48602', '48603', '48604', '48607', '48609', '48638'],
    blurb:
      'Regular delivery routes into Saginaw and Saginaw Township cover apartment moves, office relocations, and estate transitions across the city.',
    localTips: [
      'Common for multi-unit apartment moves near SVSU and along Bay Road.',
      'Office and nonprofit moves can be scheduled with recurring rental terms.',
      'Zone 2 fee applies; shown upfront before you book.',
    ],
  },
  {
    name: 'Bay City',
    slug: 'bay-city',
    zoneId: 'zone-2',
    zips: ['48706', '48708'],
    blurb:
      'From historic homes on the east side to new builds near Hampton Township, Bay City rentals cover moves, remodels, and downsizing projects.',
    localTips: [
      'Senior downsizing rentals pair well with our longer 14-day packages.',
      'Two-address pickup works well for moves between Bay City and Midland.',
      'Zone 2 fee applies; shown upfront before you book.',
    ],
  },
  {
    name: 'Auburn',
    slug: 'auburn',
    zoneId: 'zone-core',
    zips: ['48611'],
    blurb:
      'Auburn sits inside our Core Zone, so delivery and pickup are included in every package with no zone fee.',
    localTips: [
      'Quick turnaround on deliveries along the US-10 corridor.',
      'Great fit for garage organization and decluttering projects.',
    ],
  },
  {
    name: 'Freeland',
    slug: 'freeland',
    zoneId: 'zone-core',
    zips: ['48623'],
    blurb:
      'Freeland is Core Zone territory — standard delivery included, with easy scheduling for moves along the Tittabawassee Road corridor.',
    localTips: [
      'Popular for new-construction move-ins.',
      'Frequent two-address moves between Freeland and Saginaw Township.',
    ],
  },
  {
    name: 'Sanford',
    slug: 'sanford',
    zoneId: 'zone-2',
    zips: ['48657'],
    blurb:
      'Sanford routes run several times a week, serving lake-area homes, rebuild projects, and moves throughout the Village of Sanford.',
    localTips: [
      'Restoration and rebuild pack-outs are a common rental use here.',
      'Zone 2 fee applies; shown upfront before you book.',
    ],
  },
  {
    name: 'Coleman',
    slug: 'coleman',
    zoneId: 'zone-2',
    zips: ['48618'],
    blurb:
      'Coleman deliveries cover moves and projects across western Midland County, scheduled on our regular Zone 2 routes.',
    localTips: [
      'Rural addresses are no problem — just note driveway or access details at booking.',
      'Zone 2 fee applies; shown upfront before you book.',
    ],
  },
  {
    name: 'Outer Region',
    slug: 'outer-region',
    zoneId: 'zone-3',
    zips: [],
    blurb:
      'Communities beyond our standard routes — including Mount Pleasant, Clare, Gladwin, and Caro — may be serviceable through Zone 3 custom routing.',
    localTips: [
      'Zone 3 rentals require a quick availability review before confirmation.',
      'Nonstandard two-address moves can often be accommodated with advance notice.',
    ],
  },
];

export function findCityByZip(zip: string): CityInfo | undefined {
  return cities.find((c) => c.zips.includes(zip));
}

export function getZone(zoneId: string): ServiceZone | undefined {
  return zones.find((z) => z.id === zoneId);
}
