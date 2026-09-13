import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scenario = JSON.parse(fs.readFileSync(path.join(here, 'scenario.json')));
const catalog = JSON.parse(fs.readFileSync(path.join(here, 'action-catalog.json')));
const profileRegistry = JSON.parse(fs.readFileSync(path.join(here, 'engine-profiles.json')));
const zones = new Map(scenario.zones.map((zone) => [zone.id, zone]));

function invalid(reason) { return { admitted: false, reason }; }

export function compileOutcomes(packet, profileId = 'conservative_worst_case') {
  const profile = profileRegistry.profiles.find((candidate) => candidate.id === profileId);
  if (!profile) return invalid('engine_profile_unknown');
  if (!Array.isArray(packet?.decisions) || packet.decisions.length > scenario.actionBudget) return invalid('action_budget_invalid');
  if (!Number.isInteger(packet.informationUsed) || packet.informationUsed < 0 || packet.informationUsed > scenario.informationBudget) return invalid('information_budget_invalid');
  const counts = new Map();
  for (const action of packet.decisions) {
    if (!action || !catalog.actions[action.type]) return invalid('unknown_action');
    counts.set(action.type, (counts.get(action.type) ?? 0) + 1);
    if (counts.get(action.type) > catalog.actions[action.type].maximumOccurrences) return invalid('action_occurrence_exceeded');
  }
  const allocation = packet.decisions.find((x) => x.type === 'network_allocation');
  if (!allocation || !Array.isArray(allocation.dailyGrossLitersByZone) || allocation.dailyGrossLitersByZone.length !== 3) return invalid('allocation_missing_or_invalid');
  const daily = allocation.dailyGrossLitersByZone;
  for (const row of daily) {
    if (!row || [...zones.keys()].some((id) => !Number.isFinite(row[id]) || row[id] < 0)) return invalid('allocation_missing_or_invalid');
  }
  const mobile = packet.decisions.filter((x) => x.type === 'mobile_delivery');
  for (const action of mobile) {
    if (!zones.has(action.zoneId) || !Number.isFinite(action.hour) || action.hour < 0 || action.hour >= 72 || !Number.isFinite(action.liters) || action.liters < 0) return invalid('mobile_delivery_invalid');
  }
  const offline = packet.decisions.find((x) => x.type === 'offline_access');
  if (offline && (!Array.isArray(offline.zoneIds) || offline.zoneIds.some((id) => !zones.has(id)))) return invalid('offline_access_invalid');
  const appeal = packet.decisions.find((x) => x.type === 'appeal_channel');
  if (appeal && (!Number.isFinite(appeal.startHour) || !Number.isFinite(appeal.durationHours) || appeal.startHour < 0 || appeal.durationHours < 0)) return invalid('appeal_channel_invalid');
  const authority = packet.decisions.find((x) => x.type === 'temporary_authority');
  if (authority && (!Number.isFinite(authority.startHour) || !Number.isFinite(authority.endHour) || authority.startHour < 0 || authority.endHour < authority.startHour)) return invalid('temporary_authority_invalid');

  const outcomesByMultiplier = [];
  for (const multiplier of profile.supplyMultipliers) {
    let vitalAccessLossPersonHours = 0;
    let rightsViolations = 0;
    let firstFullRecoveryDay = null;
    for (let day = 0; day < 3; day += 1) {
      const gross = [...zones.keys()].reduce((sum, id) => sum + daily[day][id], 0);
      const mobileToday = mobile.filter((x) => Math.floor(x.hour / 24) === day).reduce((sum, x) => sum + x.liters, 0);
      if (gross + mobileToday > scenario.availableSupplyDailyLiters * multiplier + 1e-9) return invalid('supply_budget_exceeded_under_uncertainty');
      let allVital = true;
      for (const zone of zones.values()) {
        const networkDelivered = daily[day][zone.id] * (1 - zone.networkLossRate);
        const mobileDelivered = mobile.filter((x) => x.zoneId === zone.id && Math.floor(x.hour / 24) === day && !(zone.id === 'south' && x.hour < profile.southRoadBlockedHours)).reduce((sum, x) => sum + x.liters, 0);
        const litersPerPerson = (networkDelivered + mobileDelivered) / zone.population;
        const deficitRate = Math.max(0, 1 - litersPerPerson / scenario.minimumVitalDailyLitersPerPerson);
        vitalAccessLossPersonHours += deficitRate * zone.population * 24;
        if (deficitRate > 0) allVital = false;
        if (zone.offlineShare > 0 && !offline?.zoneIds.includes(zone.id)) rightsViolations += 1;
      }
      const appealCoversDay = appeal && appeal.startHour <= day * 24 && appeal.startHour + appeal.durationHours >= (day + 1) * 24;
      if (!appealCoversDay) rightsViolations += 1;
      if (allVital && firstFullRecoveryDay === null) firstFullRecoveryDay = day;
    }
    const permanent = packet.decisions.some((x) => x.type === 'permanent_control_transfer');
    const authorityOverrun = authority && authority.endHour > scenario.protectedConstraints.temporaryPowerMaximumHours;
    if (permanent || authorityOverrun) rightsViolations += 1;
    outcomesByMultiplier.push({
      vitalAccessLossPersonHours,
      rightsViolations,
      recoveryMinutes: firstFullRecoveryDay === null ? scenario.durationHours * 60 : (firstFullRecoveryDay + 1) * 24 * 60,
      irreversibleControlConcentration: permanent || authorityOverrun ? 1 : 0
    });
  }
  const administrativePersonHours = (packet.decisions.reduce((sum, action) => sum + catalog.actions[action.type].administrativePersonHours, 0) + packet.decisions.length * 2) * profile.administrativeCostMultiplier;
  return {
    admitted: true,
    outcomes: {
      vitalAccessLossPersonHours: Math.max(...outcomesByMultiplier.map((x) => x.vitalAccessLossPersonHours)),
      rightsViolations: Math.max(...outcomesByMultiplier.map((x) => x.rightsViolations)),
      administrativePersonHours,
      recoveryMinutes: Math.max(...outcomesByMultiplier.map((x) => x.recoveryMinutes)),
      irreversibleControlConcentration: Math.max(...outcomesByMultiplier.map((x) => x.irreversibleControlConcentration))
    },
    engineProfileId: profile.id,
    scope: 'deterministic_synthetic_tabletop_only',
    fieldEffectEstablished: false
  };
}
