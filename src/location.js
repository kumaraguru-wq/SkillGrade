import locationConfig from '../shared/locations.json';

export const supportedStates=locationConfig.states;
export const supportedDistricts=supportedStates.flatMap(state=>state.districts.map(district=>({...district,state:state.name})));
export const districtLocations=Object.fromEntries(supportedDistricts.map(item=>[item.name,{city:item.city,district:item.name,state:item.state,latitude:item.latitude,longitude:item.longitude}]));

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
