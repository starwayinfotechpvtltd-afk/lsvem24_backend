/**
 * Calculates distance between two lat/lng points in km (Haversine formula).
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Given a user's location, return all active zones that match it.
 * @param {object} location - { country, state, city, lat, lng }
 * @param {Array}  allZones - all active Zone documents from DB
 * @returns {Array} matching zone IDs
 */


function resolveMatchingZones(location, allZones) {
  const { country, state, city, lat, lng } = location;

  return allZones
    .filter((zone) => {
      // Country match
      const countryMatch =
        !zone.countries?.length || zone.countries.includes(country);

      // State match
      const stateMatch =
        !zone.states?.length ||
        zone.states.some((s) => s.toLowerCase() === state?.toLowerCase());

      // City match
      const cityMatch =
        !zone.cities?.length ||
        zone.cities.some((c) => c.toLowerCase() === city?.toLowerCase());

      // Radius match (overrides city/state if set)
      let radiusMatch = true;
      if (zone.radiusTarget?.lat && lat && lng) {
        const dist = haversineDistance(
          lat,
          lng,
          zone.radiusTarget.lat,
          zone.radiusTarget.lng,
        );
        radiusMatch = dist <= zone.radiusTarget.radiusKm;
      }

      return countryMatch && stateMatch && cityMatch && radiusMatch;
    })
    .map((z) => z._id);
}

module.exports = { resolveMatchingZones };
