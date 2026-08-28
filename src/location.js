export const districtLocations = {
  Chennai: { city:'Chennai', district:'Chennai', state:'Tamil Nadu', latitude:13.0827, longitude:80.2707 },
  Coimbatore: { city:'Coimbatore', district:'Coimbatore', state:'Tamil Nadu', latitude:11.0168, longitude:76.9558 },
  Madurai: { city:'Madurai', district:'Madurai', state:'Tamil Nadu', latitude:9.9252, longitude:78.1198 },
  Tiruchirappalli: { city:'Tiruchirappalli', district:'Tiruchirappalli', state:'Tamil Nadu', latitude:10.7905, longitude:78.7047 },
  Salem: { city:'Salem', district:'Salem', state:'Tamil Nadu', latitude:11.6643, longitude:78.146 },
  Dharmapuri: { city:'Dharmapuri', district:'Dharmapuri', state:'Tamil Nadu', latitude:12.1211, longitude:78.1582 },
};

export function distanceKm(aLat, aLng, bLat, bLng) {
  const values = [aLat,aLng,bLat,bLng].map(Number);
  if (!values.every(Number.isFinite)) return null;
  const [lat1,lng1,lat2,lng2] = values;
  const rad = value => value * Math.PI / 180;
  const dLat = rad(lat2-lat1), dLng = rad(lng2-lng1);
  const h = Math.sin(dLat/2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng/2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h),Math.sqrt(1-h)) * 10) / 10;
}

export function nearestPilotDistrict(latitude, longitude) {
  return Object.values(districtLocations).map(item => ({...item,distanceKm:distanceKm(latitude,longitude,item.latitude,item.longitude)})).sort((a,b) => a.distanceKm-b.distanceKm)[0];
}
