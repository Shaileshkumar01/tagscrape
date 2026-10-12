export const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    let str = String(dateStr);
    if (!str.includes('GMT') && !str.includes('Z') && !str.includes('+')) {
        str += ' UTC';
    }
    return new Date(str).toLocaleString();
};

export const formatDateOnly = (dateStr) => {
    if (!dateStr) return '';
    let str = String(dateStr);
    if (!str.includes('GMT') && !str.includes('Z') && !str.includes('+')) {
        str += ' UTC';
    }
    return new Date(str).toLocaleDateString();
};
