export const groupNameToHeb = {
    'group a': 'בית א',
    'group b': 'בית ב',
    'group c': 'בית ג',
    'group d': 'בית ד',
    'group e': 'בית ה',
    'group f': 'בית ו',
    'group g': 'בית ז',
    'group h': 'בית ח',
    'group i': 'בית ט',
    'group j': 'בית י',
    'group k': 'בית כ',
    'group l': 'בית ל',
}

export function getHebGroupName(name: string){
    return groupNameToHeb[name.toLowerCase()] ?? name
}