/**
 * Unit of Measure (UOM) Definitions and Helpers
 * Supports: Piece (pc), Kilogram (kg), Box, Meter (m), Roll (roll),
 * Bag (bag), Sheet (sheet), Length, Gallon (gal), Tin/Can, Set, Bundle, etc.
 */

export const STANDARD_UOM_OPTIONS = [
  { value: 'piece', label: 'Piece (pc / pcs)', short: 'pc', plural: 'pcs', category: 'General / Discrete' },
  { value: 'box', label: 'Box (boxes)', short: 'box', plural: 'boxes', category: 'Packaged / Fasteners' },
  { value: 'kg', label: 'Kilogram (kg)', short: 'kg', plural: 'kg', category: 'Weight / Bulk' },
  { value: 'meter', label: 'Meter (m)', short: 'm', plural: 'meters', category: 'Length / Piping / Wire' },
  { value: 'roll', label: 'Roll (rolls)', short: 'roll', plural: 'rolls', category: 'Electrical Wire / Insulation' },
  { value: 'bag', label: 'Bag (bags)', short: 'bag', plural: 'bags', category: 'Cement / Sand / Aggregates' },
  { value: 'sheet', label: 'Sheet (sheets)', short: 'sheet', plural: 'sheets', category: 'Roofing / Plywood' },
  { value: 'length', label: 'Length / Tube', short: 'length', plural: 'lengths', category: 'Steel Rebar / PVC Pipe' },
  { value: 'gallon', label: 'Gallon (gal)', short: 'gal', plural: 'gal', category: 'Paint / Solvents' },
  { value: 'can', label: 'Can / Tin', short: 'can', plural: 'cans', category: 'Sealant / Primers' },
  { value: 'set', label: 'Set (sets)', short: 'set', plural: 'sets', category: 'Tool Kits / Fixtures' },
  { value: 'bundle', label: 'Bundle (bundles)', short: 'bundle', plural: 'bundles', category: 'Lumber / Rebars' },
]

/**
 * Formats a quantity value with its appropriate unit of measure.
 * Examples:
 *   formatQuantityWithUnit(50, 'piece')  => "50 pcs"
 *   formatQuantityWithUnit(1, 'piece')   => "1 pc"
 *   formatQuantityWithUnit(10, 'box')    => "10 boxes"
 *   formatQuantityWithUnit(1, 'box')     => "1 box"
 *   formatQuantityWithUnit(25, 'kg')     => "25 kg"
 *   formatQuantityWithUnit(100, 'meter') => "100 meters"
 *   formatQuantityWithUnit(5, 'roll')    => "5 rolls"
 *   formatQuantityWithUnit(40, 'bag')    => "40 bags"
 */
export function formatQuantityWithUnit(qty, rawUnit) {
  const num = Number(qty) || 0
  const u = String(rawUnit || 'piece').toLowerCase().trim()

  switch (u) {
    case 'piece':
    case 'pc':
    case 'pcs':
      return `${num.toLocaleString()} ${num === 1 ? 'pc' : 'pcs'}`

    case 'box':
    case 'boxes':
      return `${num.toLocaleString()} ${num === 1 ? 'box' : 'boxes'}`

    case 'kg':
    case 'kilogram':
    case 'kilograms':
    case 'kgs':
      return `${num.toLocaleString()} kg`

    case 'meter':
    case 'meters':
    case 'm':
      return `${num.toLocaleString()} ${num === 1 ? 'meter' : 'meters'}`

    case 'roll':
    case 'rolls':
      return `${num.toLocaleString()} ${num === 1 ? 'roll' : 'rolls'}`

    case 'bag':
    case 'bags':
      return `${num.toLocaleString()} ${num === 1 ? 'bag' : 'bags'}`

    case 'sheet':
    case 'sheets':
      return `${num.toLocaleString()} ${num === 1 ? 'sheet' : 'sheets'}`

    case 'length':
    case 'lengths':
      return `${num.toLocaleString()} ${num === 1 ? 'length' : 'lengths'}`

    case 'gallon':
    case 'gallons':
    case 'gal':
    case 'gals':
      return `${num.toLocaleString()} ${num === 1 ? 'gal' : 'gals'}`

    case 'can':
    case 'cans':
    case 'tin':
    case 'tins':
      return `${num.toLocaleString()} ${num === 1 ? 'can' : 'cans'}`

    case 'set':
    case 'sets':
      return `${num.toLocaleString()} ${num === 1 ? 'set' : 'sets'}`

    case 'bundle':
    case 'bundles':
      return `${num.toLocaleString()} ${num === 1 ? 'bundle' : 'bundles'}`

    case 'unit':
    case 'units':
      return `${num.toLocaleString()} ${num === 1 ? 'unit' : 'units'}`

    default:
      return `${num.toLocaleString()} ${rawUnit || 'units'}`
  }
}

/**
 * Returns a short unit badge text (e.g. "pcs", "boxes", "kg", "meters", "rolls")
 */
export function getUnitBadgeText(unit, isPlural = true) {
  const u = String(unit || 'piece').toLowerCase().trim()
  switch (u) {
    case 'piece': case 'pc': case 'pcs': return isPlural ? 'pcs' : 'pc'
    case 'box': case 'boxes': return isPlural ? 'boxes' : 'box'
    case 'kg': case 'kilogram': case 'kilograms': case 'kgs': return 'kg'
    case 'meter': case 'meters': case 'm': return isPlural ? 'meters' : 'meter'
    case 'roll': case 'rolls': return isPlural ? 'rolls' : 'roll'
    case 'bag': case 'bags': return isPlural ? 'bags' : 'bag'
    case 'sheet': case 'sheets': return isPlural ? 'sheets' : 'sheet'
    case 'length': case 'lengths': return isPlural ? 'lengths' : 'length'
    case 'gallon': case 'gallons': case 'gal': return 'gal'
    case 'can': case 'cans': case 'tin': return isPlural ? 'cans' : 'can'
    case 'set': case 'sets': return isPlural ? 'sets' : 'set'
    case 'bundle': case 'bundles': return isPlural ? 'bundles' : 'bundle'
    default: return unit || 'units'
  }
}

/**
 * Returns a friendly label for input fields based on product unit
 * e.g. "Quantity to Receive (in Boxes)"
 */
export function getQuantityInputLabel(unit, prefix = 'Quantity') {
  const badge = getUnitBadgeText(unit, true)
  return `${prefix} (in ${badge.charAt(0).toUpperCase() + badge.slice(1)})`
}

/**
 * Returns a clean placeholder for quantity inputs based on product unit
 */
export function getQuantityPlaceholder(unit, sampleValue = 50) {
  const badge = getUnitBadgeText(unit, true)
  return `e.g. ${sampleValue} (${badge})`
}
